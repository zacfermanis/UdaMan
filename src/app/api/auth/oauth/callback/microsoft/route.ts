import { NextRequest, NextResponse } from 'next/server'
import { OAuthService } from '@/lib/auth/oauth-service'
import { OAuthError, OAuthErrorCode } from '@/types/auth'
import { rateLimit } from '@/lib/rate-limit'

const oauthService = new OAuthService()

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
    const { success } = await rateLimit(ip, 'oauth_callback', 5, 60) // 5 requests per minute
    if (!success) {
      return NextResponse.json(
        { error: 'Too many OAuth callback requests' },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Handle OAuth errors
    if (error) {
      console.error('Microsoft OAuth error:', error, errorDescription)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=oauth_error&provider=microsoft&message=${encodeURIComponent(errorDescription || error)}`
      )
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=invalid_oauth_params&provider=microsoft`
      )
    }

    // Handle OAuth callback
    const { user, sessionToken } = await oauthService.handleOAuthCallback('microsoft', code, state)

    // Set session cookie
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`)
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    })

    return response
  } catch (error) {
    console.error('Microsoft OAuth callback error:', error)
    
    let errorMessage = 'Authentication failed'
    let errorCode = 'oauth_error'
    
    if (error && typeof error === 'object' && 'code' in error && 'provider' in error) {
      const oauthError = error as OAuthError
      switch (oauthError.code) {

        case OAuthErrorCode.INVALID_STATE:
          errorMessage = 'Invalid or expired authentication session. Please try again.'
          errorCode = 'invalid_state'
          break
        case OAuthErrorCode.PERMISSION_DENIED:
          errorMessage = 'Email permission required. Please grant email access or use email registration.'
          errorCode = 'permission_denied'
          break
        default:
          errorMessage = oauthError.message
      }
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=${errorCode}&provider=microsoft&message=${encodeURIComponent(errorMessage)}`
    )
  }
}
