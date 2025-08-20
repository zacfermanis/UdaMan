'use client'

import { useState } from 'react'
import { OIDCProvider, OAuthError } from '@/types/auth'

interface SocialLoginButtonsProps {
  onSuccess?: (user: any) => void
  onError?: (error: OAuthError) => void
  redirectTo?: string
  className?: string
  disabled?: boolean
}

// Client-side provider configuration (no server dependencies)
const getProviderConfig = (provider: OIDCProvider) => {
  const configs = {
    google: {
      name: 'Google',
      color: '#4285F4',
      icon: '🔍'
    },
    facebook: {
      name: 'Facebook',
      color: '#1877F2',
      icon: '📘'
    },
    microsoft: {
      name: 'Microsoft',
      color: '#00A4EF',
      icon: '🪟'
    }
  }
  
  return configs[provider]
}

export default function SocialLoginButtons({
  onSuccess,
  onError,
  redirectTo,
  className = '',
  disabled = false
}: SocialLoginButtonsProps) {
  const [isLoading, setIsLoading] = useState<OIDCProvider | null>(null)

  const handleOAuthLogin = async (provider: OIDCProvider) => {
    if (disabled || isLoading) return

    setIsLoading(provider)
    
    try {
      // Initiate OAuth flow
      const response = await fetch(`/api/auth/oauth/initiate?provider=${provider}${redirectTo ? `&redirect_to=${encodeURIComponent(redirectTo)}` : ''}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        if (response.status === 503 && errorData.error === 'OAuth not configured') {
          const oauthError: OAuthError = {
            code: 'provider_unavailable' as any,
            provider,
            message: 'OAuth is not configured. Please contact the administrator.'
          }
          onError?.(oauthError)
          setIsLoading(null)
          return
        }
        
        throw new Error(errorData.message || 'Failed to initiate OAuth flow')
      }

      const { authorizationUrl } = await response.json()
      
      // Redirect to OAuth provider
      window.location.href = authorizationUrl
    } catch (error) {
      console.error(`${provider} OAuth error:`, error)
      
      const oauthError: OAuthError = {
        code: 'provider_unavailable' as any,
        provider,
        message: `Failed to initiate ${provider} authentication`
      }
      
      onError?.(oauthError)
      setIsLoading(null)
    }
  }

  const providers: OIDCProvider[] = ['google', 'facebook', 'microsoft']

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white dark:bg-gray-900 px-2 text-gray-500 dark:text-gray-400">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {providers.map((provider) => {
          const config = getProviderConfig(provider)
          const isProviderLoading = isLoading === provider
          
          return (
            <button
              key={provider}
              onClick={() => handleOAuthLogin(provider)}
              disabled={disabled || isProviderLoading}
              className={`
                relative flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 
                rounded-md shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200
                hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors
              `}
              style={{ '--provider-color': config.color } as React.CSSProperties}
            >
              {isProviderLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  Connecting...
                </div>
              ) : (
                <>
                  <span className="mr-2 text-lg">{config.icon}</span>
                  <span>Continue with {config.name}</span>
                </>
              )}
            </button>
          )
        })}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  )
}
