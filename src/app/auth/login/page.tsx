'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import LoginForm from '@/components/auth/LoginForm'
import SocialLoginButtons from '@/components/auth/SocialLoginButtons'
import { AuthHeader } from '@/components/layout/Header'
import { GradientBackground } from '@/components/ui/GradientBackground'
import { cn } from '@/lib/utils'
import { OAuthError } from '@/types/auth'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [oauthError, setOAuthError] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setShowSuccessMessage(true)
      // Hide the message after 5 seconds
      const timer = setTimeout(() => setShowSuccessMessage(false), 5000)
      return () => clearTimeout(timer)
    }
    
    if (searchParams.get('reset') === 'success') {
      setShowSuccessMessage(true)
      // Hide the message after 5 seconds
      const timer = setTimeout(() => setShowSuccessMessage(false), 5000)
      return () => clearTimeout(timer)
    }

    // Handle OAuth errors
    const error = searchParams.get('error')
    const provider = searchParams.get('provider')
    const message = searchParams.get('message')
    
    if (error && provider) {
      setOAuthError(message || `Authentication failed with ${provider}`)
      // Hide the error after 10 seconds
      const timer = setTimeout(() => setOAuthError(null), 10000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  return (
    <GradientBackground>
      <AuthHeader />
      
      <div className="flex flex-col justify-center py-12 sm:px-6 lg:px-8 min-h-screen">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <img
              className="h-12 w-auto"
              src="/Udaman_Logo.webp"
              alt="Udaman"
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Welcome back to Udaman
          </p>
        </div>

        {showSuccessMessage && (
          <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    {searchParams.get('reset') === 'success' 
                      ? 'Password reset successfully! You can now sign in with your new password.'
                      : 'Email verified successfully! You can now sign in to your account.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {oauthError && (
          <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {oauthError}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className={cn(
            'py-8 px-4 shadow-lg sm:rounded-lg sm:px-10',
            'bg-surface/80 backdrop-blur-sm border border-border/50'
          )}>
            <LoginForm 
              onSuccess={() => console.log('Login successful!')}
              onError={(error) => console.error('Login error:', error)}
              redirectTo="/dashboard"
            />
            
            <div className="mt-6">
              <SocialLoginButtons
                onSuccess={() => console.log('OAuth login successful!')}
                onError={(error: OAuthError) => {
                  console.error('OAuth error:', error)
                  setOAuthError(error.message)
                }}
                redirectTo="/dashboard"
                disabled={false}
              />
            </div>
          </div>
        </div>
      </div>
    </GradientBackground>
  )
}
