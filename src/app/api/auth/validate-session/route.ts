import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth/session'
import { createServerClient } from '@/lib/supabase/config'

export async function GET(request: NextRequest) {
  try {
    // Get session token from cookie
    const sessionToken = request.cookies.get('session_token')?.value
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No session token found' },
        { status: 401 }
      )
    }

    // Validate the session
    const validationResult = await validateSession(sessionToken)
    
    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: validationResult.error || 'Invalid session' },
        { status: 401 }
      )
    }

    const session = validationResult.session!
    const supabaseAdmin = createServerClient()

    // Get user data from our custom users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name, email_verified, subscription_tier, login_count, last_login')
      .eq('id', session.userId)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: userData.id,
        email: userData.email,
        display_name: userData.display_name,
        email_verified: userData.email_verified,
        subscription_tier: userData.subscription_tier,
        login_count: userData.login_count,
        last_login: userData.last_login
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt.toISOString(),
        isActive: session.isActive
      }
    })

  } catch (error) {
    console.error('Session validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
