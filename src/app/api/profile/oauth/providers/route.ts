import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/config'
import { validateSession } from '@/lib/auth/session'
import { rateLimit } from '@/lib/rate-limit'
import { OAuthProviderData } from '@/types/auth'

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, {
      maxRequests: 10,
      windowMs: 60 * 1000 // 1 minute
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }

    // Validate session
    const sessionResult = await validateSession(request)
    if (!sessionResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()

    // Get linked OAuth providers for the user
    const { data: providers, error } = await supabase
      .from('user_oauth_providers')
      .select('provider, provider_user_id, created_at')
      .eq('user_id', sessionResult.session.userId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching OAuth providers:', error)
      return NextResponse.json(
        { error: 'Failed to fetch OAuth providers' },
        { status: 500 }
      )
    }

    // Transform data to match OAuthProviderData interface
    const oauthProviders: OAuthProviderData[] = providers?.map(provider => ({
      provider: provider.provider as any,
      provider_user_id: provider.provider_user_id,
      created_at: new Date(provider.created_at)
    })) || []

    return NextResponse.json({
      providers: oauthProviders
    })

  } catch (error) {
    console.error('Error in GET /api/profile/oauth/providers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
