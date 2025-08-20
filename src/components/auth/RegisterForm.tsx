'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { validateEmail, validatePasswordStrength } from '@/lib/auth/validation'
import { cn } from '@/lib/utils'
import { AuthErrorType } from '@/types/auth'
import type { AuthError } from '@/types/auth'
import { useCSRFProtectedForm } from '@/hooks/useCSRF'

interface RegisterFormProps {
  onSuccess?: () => void
  onError?: (error: AuthError) => void
  redirectTo?: string
  className?: string
}

interface RegisterFormState {
  email: string
  password: string
  confirmPassword: string
  displayName: string
  consentGiven: boolean
  isLoading: boolean
  errors: {
    email?: string
    password?: string
    confirmPassword?: string
    displayName?: string
    consent?: string
    general?: string
  }
}

export default function RegisterForm({
  onSuccess,
  onError,
  redirectTo = '/auth/verify-email',
  className = ''
}: RegisterFormProps) {
  const router = useRouter()
  const { submitForm, isReady } = useCSRFProtectedForm()

  const [formState, setFormState] = useState<RegisterFormState>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    consentGiven: false,
    isLoading: false,
    errors: {}
  })

  const validateForm = (): boolean => {
    const errors: RegisterFormState['errors'] = {}

    // Validate email
    const emailValidation = validateEmail(formState.email)
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error
    }

    // Validate display name
    if (!formState.displayName.trim()) {
      errors.displayName = 'Display name is required'
    } else if (formState.displayName.trim().length < 2) {
      errors.displayName = 'Display name must be at least 2 characters'
    } else if (formState.displayName.trim().length > 50) {
      errors.displayName = 'Display name must be less than 50 characters'
    }

    // Validate password
    const passwordValidation = validatePasswordStrength(formState.password)
    if (!passwordValidation.isStrong) {
      errors.password = passwordValidation.feedback[0] || 'Password is too weak'
    }

    // Validate password confirmation
    if (formState.password !== formState.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    // Validate consent
    if (!formState.consentGiven) {
      errors.consent = 'You must agree to the terms and conditions'
    }

    setFormState(prev => ({ ...prev, errors }))
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (field: keyof Pick<RegisterFormState, 'email' | 'password' | 'confirmPassword' | 'displayName' | 'consentGiven'>) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'consentGiven' ? e.target.checked : e.target.value
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
      const response = await submitForm('/api/auth/register', {
        email: formState.email.trim(),
        password: formState.password,
        displayName: formState.displayName.trim(),
        consentGiven: formState.consentGiven
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

      // Registration successful
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
      'User already registered': 'An account with this email already exists. Please sign in instead.',
      'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
      'Invalid email': 'Please enter a valid email address.',
      'Email rate limit exceeded': 'Too many registration attempts. Please wait a moment before trying again.',
      'Signup disabled': 'Registration is currently disabled. Please try again later.'
    }

    return errorMap[message] || message
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
      {/* Display Name Field */}
      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-foreground mb-2">
          Display Name
        </label>
        <input
          id="displayName"
          type="text"
          value={formState.displayName}
          onChange={handleInputChange('displayName')}
          className={cn(
            'w-full px-3 py-2 border rounded-md shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring',
            'bg-background text-foreground placeholder:text-muted-foreground',
            'transition-colors duration-200',
            formState.errors.displayName 
              ? 'border-destructive focus:ring-destructive' 
              : 'border-border hover:border-border/80'
          )}
          placeholder="Enter your display name"
          disabled={formState.isLoading}
          autoComplete="name"
          required
        />
        {formState.errors.displayName && (
          <p className="mt-1 text-sm text-destructive">{formState.errors.displayName}</p>
        )}
      </div>

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
              : getPasswordStrengthColor()
          )}
          placeholder="Create a strong password"
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
          Confirm Password
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
          placeholder="Confirm your password"
          disabled={formState.isLoading}
          autoComplete="new-password"
          required
        />
        {formState.errors.confirmPassword && (
          <p className="mt-1 text-sm text-destructive">{formState.errors.confirmPassword}</p>
        )}
      </div>

      {/* Consent Checkbox */}
      <div>
        <div className="flex items-start">
          <input
            id="consent"
            type="checkbox"
            checked={formState.consentGiven}
            onChange={handleInputChange('consentGiven')}
            className={cn(
              'h-4 w-4 rounded border-border mt-1',
              'focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'bg-background text-primary',
              'transition-colors duration-200'
            )}
            disabled={formState.isLoading}
            required
          />
          <label htmlFor="consent" className="ml-2 block text-sm text-foreground">
            I agree to the{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 underline"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 underline"
            >
              Privacy Policy
            </a>
            . I consent to the processing of my personal data for account creation and service provision.
          </label>
        </div>
        {formState.errors.consent && (
          <p className="mt-1 text-sm text-destructive">{formState.errors.consent}</p>
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
            Creating account...
          </div>
        ) : (
          'Create Account'
        )}
      </button>

      {/* Sign In Link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
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
