'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { validateEmail, validatePasswordStrength } from '@/lib/auth/validation'
import { cn } from '@/lib/utils'
import { AuthErrorType } from '@/types/auth'
import type { AuthError } from '@/types/auth'
import { useCSRFProtectedForm } from '@/hooks/useCSRF'

interface LoginFormProps {
  onSuccess?: () => void
  onError?: (error: AuthError) => void
  redirectTo?: string
  className?: string
}

interface LoginFormState {
  email: string
  password: string
  rememberMe: boolean
  isLoading: boolean
  errors: {
    email?: string
    password?: string
    general?: string
  }
}

export default function LoginForm({
  onSuccess,
  onError,
  redirectTo = '/dashboard',
  className = ''
}: LoginFormProps) {
  const router = useRouter()
  const { submitForm, isReady } = useCSRFProtectedForm()
  const [formState, setFormState] = useState<LoginFormState>({
    email: '',
    password: '',
    rememberMe: false,
    isLoading: false,
    errors: {}
  })

  const validateForm = (): boolean => {
    const errors: LoginFormState['errors'] = {}

    // Validate email
    const emailValidation = validateEmail(formState.email)
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error
    }

    // Validate password (basic check for login)
    if (!formState.password.trim()) {
      errors.password = 'Password is required'
    }

    setFormState(prev => ({ ...prev, errors }))
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (field: keyof Pick<LoginFormState, 'email' | 'password' | 'rememberMe'>) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'rememberMe' ? e.target.checked : e.target.value
    setFormState(prev => ({
      ...prev,
      [field]: value,
      errors: {
        ...prev.errors,
        [field]: undefined,
        general: undefined
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    if (!isReady) {
      setFormState(prev => ({
        ...prev,
        errors: {
          general: 'Security token not ready. Please try again.'
        }
      }))
      return
    }

    setFormState(prev => ({ ...prev, isLoading: true, errors: {} }))

    try {
      // Use CSRF-protected form submission
      const response = await submitForm('/api/auth/login', {
        email: formState.email.trim(),
        password: formState.password,
        rememberMe: formState.rememberMe
      })

      const result = await response.json()

      if (!response.ok) {
        const authError: AuthError = {
          type: AuthErrorType.INVALID_CREDENTIALS,
          message: result.error,
          code: response.status.toString()
        }

        setFormState(prev => ({
          ...prev,
          isLoading: false,
          errors: {
            general: result.error
          }
        }))

        onError?.(authError)
        return
      }

      // Success - redirect to dashboard
      setFormState(prev => ({ ...prev, isLoading: false }))
      onSuccess?.()
      router.push(redirectTo)
    } catch (error) {
      const authError: AuthError = {
        type: AuthErrorType.NETWORK_ERROR,
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR'
      }

      setFormState(prev => ({
        ...prev,
        isLoading: false,
        errors: {
          general: 'An unexpected error occurred. Please try again.'
        }
      }))

      onError?.(authError)
    }
  }

  const getErrorMessage = (message: string): string => {
    // Map Supabase error messages to user-friendly messages
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Invalid email or password. Please check your credentials and try again.',
      'Email not confirmed': 'Please verify your email address before signing in.',
      'Too many requests': 'Too many login attempts. Please wait a moment before trying again.',
      'User not found': 'No account found with this email address.',
      'Invalid email or password': 'Invalid email or password. Please check your credentials and try again.'
    }

    return errorMap[message] || message
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={formState.email}
          onChange={handleInputChange('email')}
          className={cn(
            'w-full px-3 py-2 border rounded-md shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
            'bg-background text-foreground placeholder:text-muted-foreground',
            'transition-colors duration-200',
            formState.errors.email 
              ? 'border-destructive focus:ring-destructive' 
              : 'border-border hover:border-border/80'
          )}
          placeholder="Enter your email address"
          disabled={formState.isLoading}
          autoComplete="email"
          required
        />
        {formState.errors.email && (
          <p className="mt-1 text-sm text-destructive">{formState.errors.email}</p>
        )}
      </div>

      {/* Password Field */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={formState.password}
          onChange={handleInputChange('password')}
          className={cn(
            'w-full px-3 py-2 border rounded-md shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
            'bg-background text-foreground placeholder:text-muted-foreground',
            'transition-colors duration-200',
            formState.errors.password 
              ? 'border-destructive focus:ring-destructive' 
              : 'border-border hover:border-border/80'
          )}
          placeholder="Enter your password"
          disabled={formState.isLoading}
          autoComplete="current-password"
          required
        />
        {formState.errors.password && (
          <p className="mt-1 text-sm text-destructive">{formState.errors.password}</p>
        )}
      </div>

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="remember-me"
            type="checkbox"
            checked={formState.rememberMe}
            onChange={handleInputChange('rememberMe')}
            className={cn(
              'h-4 w-4 rounded border-border',
              'focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'bg-background text-primary',
              'transition-colors duration-200'
            )}
            disabled={formState.isLoading}
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-foreground">
            Remember me
          </label>
        </div>
        <a
          href="/auth/forgot-password"
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Forgot your password?
        </a>
      </div>

      {/* General Error Message */}
      {formState.errors.general && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
          <p className="text-sm text-destructive">{formState.errors.general}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={formState.isLoading}
        className={cn(
          'w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm',
          'text-sm font-medium text-primary-foreground',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring',
          'transition-all duration-200',
          formState.isLoading
            ? 'bg-primary/60 cursor-not-allowed'
            : 'bg-primary hover:bg-primary/90 active:scale-[0.98]'
        )}
      >
        {formState.isLoading ? (
          <div className="flex items-center">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-foreground"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Signing in...
          </div>
        ) : (
          'Sign In'
        )}
      </button>

      {/* Sign Up Link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{' '}
          <a
            href="/auth/register"
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Sign up here
          </a>
        </p>
      </div>
    </form>
  )
}
