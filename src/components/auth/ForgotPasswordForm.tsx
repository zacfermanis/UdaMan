'use client'

import { useState } from 'react'
import { validateEmail } from '@/lib/auth/validation'
import { cn } from '@/lib/utils'
import { AuthErrorType } from '@/types/auth'
import type { AuthError } from '@/types/auth'

interface ForgotPasswordFormProps {
  onSuccess?: () => void
  onError?: (error: AuthError) => void
  className?: string
}

interface ForgotPasswordFormState {
  email: string
  isLoading: boolean
  errors: {
    email?: string
    general?: string
  }
}

export default function ForgotPasswordForm({
  onSuccess,
  onError,
  className = ''
}: ForgotPasswordFormProps) {
  const [formState, setFormState] = useState<ForgotPasswordFormState>({
    email: '',
    isLoading: false,
    errors: {}
  })

  const validateForm = (): boolean => {
    const errors: ForgotPasswordFormState['errors'] = {}

    // Validate email
    const emailValidation = validateEmail(formState.email)
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error
    }

    setFormState(prev => ({ ...prev, errors }))
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState(prev => ({
      ...prev,
      email: e.target.value,
      errors: {
        ...prev.errors,
        email: undefined,
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
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formState.email.trim()
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        const authError: AuthError = {
          type: AuthErrorType.NETWORK_ERROR,
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

      // Success - show success message
      setFormState(prev => ({ ...prev, isLoading: false }))
      onSuccess?.()
      
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

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={formState.email}
          onChange={handleInputChange}
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
            Sending...
          </div>
        ) : (
          'Send Reset Link'
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
