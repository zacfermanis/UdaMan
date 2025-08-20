'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const handleEmailVerification = async () => {
      const token = searchParams.get('token')
      const type = searchParams.get('type')
      const accessToken = searchParams.get('access_token')
      const refreshToken = searchParams.get('refresh_token')
      const customVerification = searchParams.get('custom_verification')
      const userId = searchParams.get('user_id')

      // Handle Supabase's automatic email verification (from their default emails)
      if (accessToken && refreshToken) {
        setIsVerifying(true)
        try {
          // Set the session manually
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (error) {
            console.error('Session setting error:', error)
            setVerificationStatus('error')
            setErrorMessage(error.message)
          } else {
            setVerificationStatus('success')
            // Redirect to login after a short delay
            setTimeout(() => {
              router.push('/auth/login?verified=true')
            }, 3000)
          }
        } catch (error) {
          console.error('Verification exception:', error)
          setVerificationStatus('error')
          setErrorMessage('An unexpected error occurred during verification.')
        } finally {
          setIsVerifying(false)
        }
        return
      }

      // Handle our custom verification flow
      if (customVerification === 'true') {
        setIsVerifying(true)
        try {
          const email = searchParams.get('email')
          const userId = searchParams.get('user_id')
          
          if (!email && !userId) {
            setVerificationStatus('error')
            setErrorMessage('Invalid verification link. Missing email or user ID.')
            return
          }

          // Call our confirm-user API to verify the user
          const response = await fetch('/api/auth/confirm-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              email: email || undefined,
              userId: userId || undefined
            }),
          })

          const result = await response.json()

          if (!response.ok) {
            setVerificationStatus('error')
            setErrorMessage(result.error || 'Failed to verify email address.')
          } else {
            setVerificationStatus('success')
            // Redirect to login after a short delay
            setTimeout(() => {
              router.push('/auth/login?verified=true')
            }, 3000)
          }
        } catch (error) {
          console.error('Custom verification exception:', error)
          setVerificationStatus('error')
          setErrorMessage('An unexpected error occurred during verification.')
        } finally {
          setIsVerifying(false)
        }
        return
      }

      // Handle manual token verification (for our custom emails)
      if (token && type === 'signup') {
        setIsVerifying(true)
        try {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup'
          })

          if (error) {
            console.error('Email verification error:', error)
            setVerificationStatus('error')
            setErrorMessage(error.message)
          } else {
            setVerificationStatus('success')
            // Redirect to login after a short delay
            setTimeout(() => {
              router.push('/auth/login?verified=true')
            }, 3000)
          }
        } catch (error) {
          console.error('Verification exception:', error)
          setVerificationStatus('error')
          setErrorMessage('An unexpected error occurred during verification.')
        } finally {
          setIsVerifying(false)
        }
      }
    }

    handleEmailVerification()
  }, [searchParams, router])

  const handleResendEmail = async () => {
    setIsVerifying(true)
    try {
      const email = searchParams.get('email') || ''
      
      if (!email) {
        setErrorMessage('Email address not found. Please try registering again.')
        return
      }

      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.error || 'Failed to resend verification email.')
      } else {
        setErrorMessage('')
        alert('Verification email sent! Please check your inbox.')
      }
    } catch (error) {
      console.error('Error resending email:', error)
      setErrorMessage('Failed to resend verification email. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Verify Your Email
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            We've sent a verification link to your email address
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
          {verificationStatus === 'pending' && !isVerifying && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Check Your Email
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  We've sent a verification link to your email address. Click the link to verify your account.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Didn't receive the email? Check your spam folder or try resending.
                </p>
              </div>
              <button
                onClick={handleResendEmail}
                disabled={isVerifying}
                className={cn(
                  'w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm',
                  'text-sm font-medium text-white',
                  'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                  'transition-all duration-200',
                  isVerifying
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
                )}
              >
                {isVerifying ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>
          )}

          {isVerifying && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <svg
                  className="animate-spin w-8 h-8 text-blue-600 dark:text-blue-400"
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
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Verifying your email...
              </p>
            </div>
          )}

          {verificationStatus === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
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
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Email Verified!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Your email has been successfully verified. You'll be redirected to login shortly.
                </p>
              </div>
            </div>
          )}

          {verificationStatus === 'error' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-600 dark:text-red-400"
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
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Verification Failed
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  {errorMessage || 'There was an error verifying your email address.'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  The verification link may have expired or is invalid.
                </p>
              </div>
              <div className="space-y-2">
                <button
                  onClick={handleResendEmail}
                  disabled={isVerifying}
                  className={cn(
                    'w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm',
                    'text-sm font-medium text-white',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                    'transition-all duration-200',
                    isVerifying
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
                  )}
                >
                  {isVerifying ? 'Sending...' : 'Resend Verification Email'}
                </button>
                <button
                  onClick={() => router.push('/auth/login')}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  Go to Login
                </button>
              </div>
            </div>
          )}

          {errorMessage && verificationStatus === 'pending' && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Already verified?{' '}
            <a
              href="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Sign in here
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
