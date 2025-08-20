'use client'

import { useState, useEffect, useCallback } from 'react'
import { getCSRFTokenFromCookie, addCSRFTokenToHeaders } from '@/lib/auth/csrf'

interface UseCSRFOptions {
  cookieName?: string
  headerName?: string
  formFieldName?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

interface CSRFState {
  token: string | null
  isLoading: boolean
  error: string | null
  expiresAt: number | null
}

export function useCSRF(options: UseCSRFOptions = {}) {
  const {
    cookieName,
    headerName,
    formFieldName = '_csrf',
    autoRefresh = true,
    refreshInterval = 30 * 60 * 1000 // 30 minutes
  } = options

  const [state, setState] = useState<CSRFState>({
    token: null,
    isLoading: true,
    error: null,
    expiresAt: null
  })

  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      // Try to get token from cookie
      const token = getCSRFTokenFromCookie(cookieName)
      
      if (token) {
        // Parse token to get expiration
        try {
          const tokenData = JSON.parse(atob(token.replace(/-/g, '+').replace(/_/g, '/')))
          const expiresAt = tokenData.expiresAt || (Date.now() + 60 * 60 * 1000)
          
          setState(prev => ({
            ...prev,
            token,
            isLoading: false,
            error: null,
            expiresAt
          }))
          
          return token
        } catch (parseError) {
          console.warn('Failed to parse CSRF token:', parseError)
        }
      }
      
      // If no token in cookie, request a new one
      const response = await fetch('/api/auth/csrf-token', {
        method: 'GET',
        credentials: 'include'
      })
      
      if (response.ok) {
        const { token: newToken, expiresAt } = await response.json()
        
        setState(prev => ({
          ...prev,
          token: newToken,
          isLoading: false,
          error: null,
          expiresAt
        }))
        
        return newToken
      } else {
        throw new Error('Failed to get CSRF token')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))
      
      return null
    }
  }, [cookieName])

  const refreshToken = useCallback(async (): Promise<string | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    return await getToken()
  }, [getToken])

  const addTokenToHeaders = useCallback((headers: HeadersInit = {}): HeadersInit => {
    return addCSRFTokenToHeaders(headers, cookieName)
  }, [cookieName])

  const getFormField = useCallback(() => {
    if (!state.token) return null
    
    return {
      name: formFieldName,
      value: state.token
    }
  }, [state.token, formFieldName])

  // Initialize token on mount
  useEffect(() => {
    getToken()
  }, [getToken])

  // Auto-refresh token
  useEffect(() => {
    if (!autoRefresh || !state.expiresAt) return

    const timeUntilExpiry = state.expiresAt - Date.now()
    const refreshTime = Math.max(refreshInterval, timeUntilExpiry - 5 * 60 * 1000) // Refresh 5 minutes before expiry

    const timer = setTimeout(() => {
      refreshToken()
    }, refreshTime)

    return () => clearTimeout(timer)
  }, [autoRefresh, state.expiresAt, refreshInterval, refreshToken])

  // Check if token is expired or will expire soon
  const isExpired = state.expiresAt ? Date.now() > state.expiresAt : true
  const isExpiringSoon = state.expiresAt ? (state.expiresAt - Date.now()) < (5 * 60 * 1000) : true

  return {
    token: state.token,
    isLoading: state.isLoading,
    error: state.error,
    expiresAt: state.expiresAt,
    isExpired,
    isExpiringSoon,
    refreshToken,
    addTokenToHeaders,
    getFormField
  }
}

/**
 * Hook for making authenticated requests with CSRF protection
 */
export function useAuthenticatedRequest() {
  const { token, addTokenToHeaders, refreshToken } = useCSRF()

  const makeRequest = useCallback(async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    // Add CSRF token to headers
    const headers = addTokenToHeaders(options.headers)
    
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    })

    // If we get a 403 CSRF error, try to refresh token and retry once
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}))
      
      if (errorData.error?.includes('CSRF')) {
        const newToken = await refreshToken()
        
        if (newToken) {
          // Retry with new token
          const retryHeaders = addTokenToHeaders(options.headers)
          return await fetch(url, {
            ...options,
            headers: retryHeaders,
            credentials: 'include'
          })
        }
      }
    }

    return response
  }, [token, addTokenToHeaders, refreshToken])

  return {
    makeRequest,
    token,
    isReady: !!token
  }
}

/**
 * Hook for form submission with CSRF protection
 */
export function useCSRFProtectedForm() {
  const { token, getFormField, addTokenToHeaders, refreshToken } = useCSRF()

  const submitForm = useCallback(async (
    url: string,
    formData: FormData | Record<string, any>,
    options: RequestInit = {}
  ): Promise<Response> => {
    // Add CSRF token to headers
    const headers = addTokenToHeaders(options.headers)
    
    let body: string | FormData
    
    if (formData instanceof FormData) {
      // For FormData, add CSRF token to form data
      const csrfField = getFormField()
      if (csrfField) {
        formData.append(csrfField.name, csrfField.value)
      }
      body = formData
    } else {
      // For JSON data, only send CSRF token in headers (not in body)
      body = JSON.stringify(formData)
    }
    
    const response = await fetch(url, {
      ...options,
      method: options.method || 'POST',
      headers: {
        'Content-Type': formData instanceof FormData ? 'multipart/form-data' : 'application/json',
        ...headers
      },
      body,
      credentials: 'include'
    })

    // Handle CSRF errors
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}))
      
      if (errorData.error?.includes('CSRF')) {
        const newToken = await refreshToken()
        
        if (newToken) {
          // Retry with new token
          const retryHeaders = addTokenToHeaders(options.headers)
          let retryBody: string | FormData
          
          if (formData instanceof FormData) {
            retryBody = formData
          } else {
            retryBody = JSON.stringify(formData)
          }
          
          return await fetch(url, {
            ...options,
            method: options.method || 'POST',
            headers: {
              'Content-Type': formData instanceof FormData ? 'multipart/form-data' : 'application/json',
              ...retryHeaders
            },
            body: retryBody,
            credentials: 'include'
          })
        }
      }
    }

    return response
  }, [token, getFormField, addTokenToHeaders, refreshToken])

  return {
    submitForm,
    token,
    getFormField,
    isReady: !!token
  }
}
