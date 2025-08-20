import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/config'
import { validateSession } from '@/lib/auth/session'
import { rateLimit } from '@/lib/rate-limit'
import { OIDCProvider } from '@/types/auth'

export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, {
      maxRequests: 5,
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

    // Get provider from query parameters
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider') as OIDCProvider

    if (!provider || !['google', 'facebook', 'microsoft'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      )
    }

    // Check if user has at least one other OAuth provider linked
    const { data: linkedProviders, error: countError } = await supabase
      .from('user_oauth_providers')
      .select('provider')
      .eq('user_id', sessionResult.session.userId)

    if (countError) {
      console.error('Error checking linked providers:', countError)
      return NextResponse.json(
        { error: 'Failed to check linked providers' },
        { status: 500 }
      )
    }

    // Don't allow unlinking if this is the only OAuth provider and user has no password
    const { data: user } = await supabase
      .from('users')
      .select('oauth_provider')
      .eq('id', sessionResult.session.userId)
      .single()

    const hasPassword = user?.oauth_provider !== provider // Simplified check
    const otherProviders = linkedProviders?.filter(p => p.provider !== provider) || []

    if (otherProviders.length === 0 && !hasPassword) {
      return NextResponse.json(
        { error: 'Cannot unlink the only authentication method. Please add another login method first.' },
        { status: 400 }
      )
    }

    // Unlink the OAuth provider
    const { error: unlinkError } = await supabase
      .from('user_oauth_providers')
      .delete()
      .eq('user_id', sessionResult.session.userId)
      .eq('provider', provider)

    if (unlinkError) {
      console.error('Error unlinking OAuth provider:', unlinkError)
      return NextResponse.json(
        { error: 'Failed to unlink OAuth provider' },
        { status: 500 }
      )
    }

    // Update user's primary OAuth provider if needed
    if (user?.oauth_provider === provider && otherProviders.length > 0) {
      await supabase
        .from('users')
        .update({
          oauth_provider: otherProviders[0].provider,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionResult.session.userId)
    }

    return NextResponse.json({
      message: `${provider} account unlinked successfully`
    })

  } catch (error) {
    console.error('Error in DELETE /api/profile/oauth/unlink:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
