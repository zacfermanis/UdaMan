import { NextRequest, NextResponse } from 'next/server'
import { OAuthService } from '@/lib/auth/oauth-service'
import { OIDCProvider } from '@/types/auth'
import { rateLimit } from '@/lib/rate-limit'

const oauthService = new OAuthService()

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown'
    const { success } = await rateLimit(ip, 'oauth_initiate', 10, 60) // 10 requests per minute
    if (!success) {
      return NextResponse.json(
        { error: 'Too many OAuth initiation requests' },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider') as OIDCProvider
    const redirectTo = searchParams.get('redirect_to') || undefined

    // Validate provider
    if (!provider || !['google', 'facebook', 'microsoft'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid OAuth provider' },
        { status: 400 }
      )
    }

    // Initiate OAuth flow
    try {
      const { authorizationUrl, state } = await oauthService.initiateOAuth(provider, redirectTo)

      return NextResponse.json({
        success: true,
        authorizationUrl,
        state
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('Missing OAuth configuration')) {
        return NextResponse.json(
          { 
            error: 'OAuth not configured',
            message: 'OAuth providers are not configured. Please check your .env.local file.',
            details: error.message
          },
          { status: 503 }
        )
      }
      throw error
    }
  } catch (error) {
    console.error('OAuth initiation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to initiate OAuth flow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
