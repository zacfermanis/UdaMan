'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export default function TestEmailPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [testType, setTestType] = useState<'simple' | 'verification'>('simple')

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')
    setError('')

    try {
      const endpoint = testType === 'simple' ? '/api/test-email' : '/api/test-email-simple'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email,
          displayName: 'Test User'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to send test email')
      } else {
        setMessage(`${testType === 'simple' ? 'Simple test' : 'Verification'} email sent successfully! Check your inbox.`)
        setEmail('')
      }
    } catch (error) {
      console.error('Error sending test email:', error)
      setError('Failed to send test email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Test Email Functionality
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Test that Resend is working correctly
          </p>
        </div>

                 <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
           <form onSubmit={handleTestEmail} className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                 Test Type
               </label>
               <div className="flex space-x-4">
                 <label className="flex items-center">
                   <input
                     type="radio"
                     value="simple"
                     checked={testType === 'simple'}
                     onChange={(e) => setTestType(e.target.value as 'simple' | 'verification')}
                     className="mr-2"
                   />
                   <span className="text-sm text-gray-700 dark:text-gray-300">Simple Test Email</span>
                 </label>
                 <label className="flex items-center">
                   <input
                     type="radio"
                     value="verification"
                     checked={testType === 'verification'}
                     onChange={(e) => setTestType(e.target.value as 'simple' | 'verification')}
                     className="mr-2"
                   />
                   <span className="text-sm text-gray-700 dark:text-gray-300">Verification Email</span>
                 </label>
               </div>
             </div>
             <div>
               <label htmlFor="email" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                 Email Address
               </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(
                  'w-full px-3 py-2 border rounded-md shadow-sm',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                  'bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
                  'placeholder:text-gray-500 dark:placeholder:text-gray-400'
                )}
                placeholder="Enter your email address"
                disabled={isLoading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className={cn(
                'w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm',
                'text-sm font-medium text-white',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                'transition-all duration-200',
                isLoading || !email
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
              )}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                'Send Test Email'
              )}
            </button>
          </form>

          {message && (
            <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
              <p className="text-sm text-green-800 dark:text-green-200">{message}</p>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <a
              href="/auth/register"
              className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Back to Registration
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
