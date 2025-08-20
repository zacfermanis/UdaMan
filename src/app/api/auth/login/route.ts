import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/config'
import { validateEmail } from '@/lib/auth/validation'
import { createSession, createSignedSessionToken } from '@/lib/auth/session'
import { authRateLimiters, addRateLimitHeaders, createRateLimitError } from '@/lib/rate-limit'
import { verifyCSRFToken } from '@/lib/auth/csrf'

export async function POST(request: NextRequest) {
  let rateLimitResult: any = null
  
  try {
    // Check rate limit
    rateLimitResult = await authRateLimiters.login.checkLimit(request)
    if (!rateLimitResult.success) {
      return createRateLimitError(rateLimitResult)
    }

    // Verify CSRF token
    const csrfResult = await verifyCSRFToken(request)
    if (!csrfResult.valid) {
      const response = NextResponse.json(
        { error: csrfResult.error || 'CSRF validation failed' },
        { status: 403 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const { email, password, rememberMe = false } = await request.json()

    // Validate input
    if (!email || !password) {
      const response = NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Validate email format
    const emailValidation = validateEmail(email)
    if (!emailValidation.isValid) {
      const response = NextResponse.json(
        { error: emailValidation.error },
        { status: 400 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const supabaseAdmin = createServerClient()

    // Step 1: Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: email.trim(),
      password: password
    })

    if (authError) {
      console.error('Login authentication error:', authError)
      
      // Handle specific auth errors
      let errorMessage = 'Invalid email or password'
      let statusCode = 401
      
      if (authError.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password'
      } else if (authError.message.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email address before signing in'
        statusCode = 403
      } else if (authError.message.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please try again later'
        statusCode = 429
      }
      
      const response = NextResponse.json(
        { error: errorMessage },
        { status: statusCode }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    if (!authData.user) {
      const response = NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Step 2: Check if user exists in our custom users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name, email_verified, subscription_tier, login_count')
      .eq('id', authData.user.id)
      .single()

    if (userError || !userData) {
      console.error('User not found in custom table:', userError)
      const response = NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Step 3: Create a session
    const session = await createSession({
      userId: authData.user.id,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      rememberMe
    })

    if (!session) {
      console.error('Failed to create session')
      const response = NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Step 4: Create signed session token
    const sessionToken = createSignedSessionToken(
      session.id,
      session.userId,
      session.expiresAt.getTime()
    )

    // Step 5: Update user's last login and login count
    try {
      await supabaseAdmin
        .from('users')
        .update({
          last_login: new Date().toISOString(),
          login_count: (userData.login_count || 0) + 1
        })
        .eq('id', authData.user.id)
    } catch (updateError) {
      console.error('Failed to update user login info:', updateError)
      // Don't fail the login if this step fails
    }

    // Step 6: Return success response with session token
    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: userData.id,
          email: userData.email,
          display_name: userData.display_name,
          email_verified: userData.email_verified,
          subscription_tier: userData.subscription_tier
        },
        session: {
          token: sessionToken,
          expiresAt: session.expiresAt.toISOString(),
          expiresIn: getSessionExpirationText(session)
        }
      },
      { status: 200 }
    )

    // Set session token as HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60, // 30 days or 24 hours
      path: '/'
    }

    response.cookies.set('session_token', sessionToken, cookieOptions)

    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Login error:', error)
    
    const response = NextResponse.json(
      { error: 'An unexpected error occurred during login' },
      { status: 500 }
    )
    return addRateLimitHeaders(response, rateLimitResult)
  }
}

// Helper function to get session expiration text
function getSessionExpirationText(session: any): string {
  const now = new Date()
  const timeLeft = session.expiresAt.getTime() - now.getTime()
  
  if (timeLeft <= 0) {
    return 'Expired'
  }
  
  const hours = Math.floor(timeLeft / (1000 * 60 * 60))
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days} day${days !== 1 ? 's' : ''}`
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  } else {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }
}
