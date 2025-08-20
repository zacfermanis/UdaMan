import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from './session'
import { createServerClient } from '@/lib/supabase/config'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    display_name: string
    email_verified: boolean
    subscription_tier: string
  }
  session?: {
    id: string
    userId: string
    expiresAt: Date
  }
}

export interface AuthMiddlewareOptions {
  requireAuth?: boolean
  requireVerified?: boolean
  requirePremium?: boolean
  redirectTo?: string
}

/**
 * Middleware to validate authentication and session
 */
export async function authMiddleware(
  request: NextRequest,
  options: AuthMiddlewareOptions = {}
): Promise<AuthenticatedRequest | NextResponse> {
  const {
    requireAuth = true,
    requireVerified = false,
    requirePremium = false,
    redirectTo = '/auth/login'
  } = options

  try {
    // Get session token from cookie
    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      if (requireAuth) {
        return redirectToLogin(redirectTo, request.url)
      }
      return request as AuthenticatedRequest
    }

    // Validate session
    const sessionResult = await validateSession(sessionToken)
    
    if (!sessionResult.isValid) {
      // Clear invalid session cookie
      const response = redirectToLogin(redirectTo, request.url)
      response.cookies.set('session_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      })
      return response
    }

    const session = sessionResult.session!
    
    // Get user data from database
    const supabaseAdmin = createServerClient()
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name, email_verified, subscription_tier')
      .eq('id', session.userId)
      .single()

    if (userError || !userData) {
      return redirectToLogin(redirectTo, request.url)
    }

    // Check email verification requirement
    if (requireVerified && !userData.email_verified) {
      return redirectToLogin('/auth/verify-email', request.url)
    }

    // Check premium subscription requirement
    if (requirePremium && userData.subscription_tier !== 'premium') {
      return redirectToLogin('/auth/upgrade', request.url)
    }

    // Add user and session data to request
    const authenticatedRequest = request as AuthenticatedRequest
    authenticatedRequest.user = {
      id: userData.id,
      email: userData.email,
      display_name: userData.display_name,
      email_verified: userData.email_verified,
      subscription_tier: userData.subscription_tier
    }
    authenticatedRequest.session = {
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt
    }

    return authenticatedRequest

  } catch (error) {
    console.error('Auth middleware error:', error)
    return redirectToLogin(redirectTo, request.url)
  }
}

/**
 * Helper function to redirect to login
 */
function redirectToLogin(redirectTo: string, currentUrl: string): NextResponse {
  const loginUrl = new URL(redirectTo, currentUrl)
  loginUrl.searchParams.set('redirect', currentUrl)
  
  return NextResponse.redirect(loginUrl)
}

/**
 * Middleware to check if user is already authenticated (for login/register pages)
 */
export async function guestMiddleware(
  request: NextRequest,
  redirectTo: string = '/dashboard'
): Promise<NextRequest | NextResponse> {
  try {
    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      return request
    }

    const sessionResult = await validateSession(sessionToken)
    
    if (sessionResult.isValid) {
      // User is already authenticated, redirect to dashboard
      return NextResponse.redirect(new URL(redirectTo, request.url))
    }

    // Invalid session, clear cookie and allow access
    const response = NextResponse.next()
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    })
    
    return response

  } catch (error) {
    console.error('Guest middleware error:', error)
    return request
  }
}

/**
 * Utility function to get current user from request
 */
export function getCurrentUser(request: AuthenticatedRequest) {
  return request.user
}

/**
 * Utility function to get current session from request
 */
export function getCurrentSession(request: AuthenticatedRequest) {
  return request.session
}

/**
 * Utility function to check if user has premium subscription
 */
export function isPremiumUser(request: AuthenticatedRequest): boolean {
  return request.user?.subscription_tier === 'premium'
}

/**
 * Utility function to check if user email is verified
 */
export function isEmailVerified(request: AuthenticatedRequest): boolean {
  return request.user?.email_verified === true
}
