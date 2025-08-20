'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { validatePasswordStrength } from '@/lib/auth/validation'
import { cn } from '@/lib/utils'
import { AuthErrorType } from '@/types/auth'
import type { AuthError } from '@/types/auth'

interface ResetPasswordFormProps {
  token: string
  email?: string
  onSuccess?: () => void
  onError?: (error: AuthError) => void
  className?: string
}

interface ResetPasswordFormState {
  password: string
  confirmPassword: string
  isLoading: boolean
  errors: {
    password?: string
    confirmPassword?: string
    general?: string
  }
}

export default function ResetPasswordForm({
  token,
  email,
  onSuccess,
  onError,
  className = ''
}: ResetPasswordFormProps) {
  const router = useRouter()
  
  const [formState, setFormState] = useState<ResetPasswordFormState>({
    password: '',
    confirmPassword: '',
    isLoading: false,
    errors: {}
  })

  const validateForm = (): boolean => {
    const errors: ResetPasswordFormState['errors'] = {}

    // Validate password
    const passwordValidation = validatePasswordStrength(formState.password)
    if (!passwordValidation.isStrong) {
      errors.password = passwordValidation.feedback[0] || 'Password is too weak'
    }

    // Validate password confirmation
    if (formState.password !== formState.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    setFormState(prev => ({ ...prev, errors }))
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (field: 'password' | 'confirmPassword') => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormState(prev => ({
      ...prev,
      [field]: e.target.value,
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

    setFormState(prev => ({ ...prev, isLoading: true, errors: {} }))

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formState.password
        }),
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

      // Success - redirect to login
      setFormState(prev => ({ ...prev, isLoading: false }))
      onSuccess?.()
      
      // Redirect to login with success message
      router.push('/auth/login?reset=success')
      
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

  const getPasswordStrengthColor = (): string => {
    if (!formState.password) return 'border-gray-300'
    
    const validation = validatePasswordStrength(formState.password)
    if (validation.score >= 4) return 'border-green-500'
    if (validation.score >= 2) return 'border-yellow-500'
    return 'border-red-500'
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {email && (
        <div className="bg-muted/50 border border-border rounded-md p-4">
          <p className="text-sm text-muted-foreground">
            Resetting password for: <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>
      )}

      {/* Password Field */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
          New Password
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
              : getPasswordStrengthColor()
          )}
          placeholder="Enter your new password"
          disabled={formState.isLoading}
          autoComplete="new-password"
          required
        />
        {formState.errors.password && (
          <p className="mt-1 text-sm text-destructive">{formState.errors.password}</p>
        )}
        {formState.password && !formState.errors.password && (
          <div className="mt-2">
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((level) => {
                const validation = validatePasswordStrength(formState.password)
                const isActive = level <= validation.score
                return (
                  <div
                    key={level}
                    className={cn(
                      'h-1 flex-1 rounded transition-colors duration-200',
                      isActive 
                        ? validation.score >= 4 
                          ? 'bg-green-500' 
                          : validation.score >= 2 
                            ? 'bg-yellow-500' 
                            : 'bg-red-500'
                        : 'bg-gray-300'
                    )}
                  />
                )
              })}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {(() => {
                const validation = validatePasswordStrength(formState.password)
                if (validation.score >= 4) return 'Strong password'
                if (validation.score >= 2) return 'Medium strength password'
                return 'Weak password'
              })()}
            </p>
          </div>
        )}
      </div>

      {/* Confirm Password Field */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
          Confirm New Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={formState.confirmPassword}
          onChange={handleInputChange('confirmPassword')}
          className={cn(
            'w-full px-3 py-2 border rounded-md shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
            'bg-background text-foreground placeholder:text-muted-foreground',
            'transition-colors duration-200',
            formState.errors.confirmPassword 
              ? 'border-destructive focus:ring-destructive' 
              : 'border-border hover:border-border/80'
          )}
          placeholder="Confirm your new password"
          disabled={formState.isLoading}
          autoComplete="new-password"
          required
        />
        {formState.errors.confirmPassword && (
          <p className="mt-1 text-sm text-destructive">{formState.errors.confirmPassword}</p>
        )}
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
            Resetting...
          </div>
        ) : (
          'Reset Password'
        )}
      </button>

      {/* Back to Login Link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Remember your password?{' '}
          <a
            href="/auth/login"
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Sign in here
          </a>
        </p>
      </div>
    </form>
  )
}
