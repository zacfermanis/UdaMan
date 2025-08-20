import { useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../supabase/client'
import { UserProfile, AuthState, AuthError, AuthErrorType } from '../../types/auth'

// Custom hook for authentication state management
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    error: null
  })

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          setAuthState(prev => ({
            ...prev,
            error: {
              type: AuthErrorType.NETWORK_ERROR,
              message: error.message,
              code: error.name
            },
            isLoading: false
          }))
          return
        }

        if (session?.user) {
          const userProfile = await getUserProfile(session.user.id)
          setAuthState({
            user: userProfile,
            session: {
              user_id: session.user.id,
              session_token: session.access_token,
              expires_at: new Date(session.expires_at! * 1000),
              created_at: new Date(session.created_at),
              ip_address: '', // Will be set by server
              user_agent: navigator.userAgent,
              is_active: true
            },
            isLoading: false,
            error: null
          })
        } else {
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            error: null
          })
        }
      } catch (error) {
        setAuthState(prev => ({
          ...prev,
          error: {
            type: AuthErrorType.NETWORK_ERROR,
            message: 'Failed to get initial session',
            code: 'INIT_SESSION_ERROR'
          },
          isLoading: false
        }))
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setAuthState(prev => ({ ...prev, isLoading: true }))

        if (event === 'SIGNED_IN' && session?.user) {
          try {
            const userProfile = await getUserProfile(session.user.id)
            setAuthState({
              user: userProfile,
              session: {
                user_id: session.user.id,
                session_token: session.access_token,
                expires_at: new Date(session.expires_at! * 1000),
                created_at: new Date(session.created_at),
                ip_address: '',
                user_agent: navigator.userAgent,
                is_active: true
              },
              isLoading: false,
              error: null
            })
          } catch (error) {
            setAuthState(prev => ({
              ...prev,
              error: {
                type: AuthErrorType.NETWORK_ERROR,
                message: 'Failed to get user profile',
                code: 'PROFILE_ERROR'
              },
              isLoading: false
            }))
          }
        } else if (event === 'SIGNED_OUT') {
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            error: null
          })
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }))
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return authState
}

// Hook for accessing current user
export function useUser() {
  const { user, isLoading, error } = useAuth()
  return { user, isLoading, error }
}

// Hook for accessing current session
export function useSession() {
  const { session, isLoading, error } = useAuth()
  return { session, isLoading, error }
}

// Helper function to get user profile from database
async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data as UserProfile
  } catch (error) {
    console.error('Error in getUserProfile:', error)
    return null
  }
}

// Hook for checking authentication status
export function useRequireAuth() {
  const { user, isLoading, error } = useAuth()
  
  return {
    isAuthenticated: !!user,
    isLoading,
    error,
    user
  }
}

// Hook for checking if user is verified
export function useRequireVerified() {
  const { user, isLoading, error } = useAuth()
  
  return {
    isVerified: user?.email_verified ?? false,
    isLoading,
    error,
    user
  }
}

// Hook for checking premium status
export function useRequirePremium() {
  const { user, isLoading, error } = useAuth()
  
  return {
    isPremium: user?.subscription_tier === 'premium',
    isLoading,
    error,
    user
  }
}
