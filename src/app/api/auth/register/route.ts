import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/config'
import { EmailService } from '@/lib/email/service'
import { validateEmail, validatePasswordStrength } from '@/lib/auth/validation'
import { authRateLimiters, addRateLimitHeaders, createRateLimitError } from '@/lib/rate-limit'
import { verifyCSRFToken } from '@/lib/auth/csrf'

export async function POST(request: NextRequest) {
  let rateLimitResult: any = null
  
  try {
    // Check rate limit
    rateLimitResult = await authRateLimiters.registration.checkLimit(request)
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

    const { email, password, displayName, consentGiven } = await request.json()

    // Validate input
    if (!email || !password || !displayName) {
      const response = NextResponse.json(
        { error: 'Email, password, and display name are required' },
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

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password)
    if (!passwordValidation.isStrong) {
      const response = NextResponse.json(
        { error: passwordValidation.feedback[0] || 'Password is too weak' },
        { status: 400 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Validate display name
    if (displayName.trim().length < 2 || displayName.trim().length > 50) {
      const response = NextResponse.json(
        { error: 'Display name must be between 2 and 50 characters' },
        { status: 400 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Validate consent
    if (!consentGiven) {
      const response = NextResponse.json(
        { error: 'Consent is required to create an account' },
        { status: 400 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const supabaseAdmin = createServerClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: false, // We'll handle email confirmation manually
      user_metadata: {
        display_name: displayName.trim(),
        consent_given: consentGiven,
        consent_date: new Date().toISOString()
      }
    })

    if (authError) {
      console.error('Supabase Auth error:', authError)
      
      // Handle specific auth errors
      if (authError.message.includes('User already registered')) {
        const response = NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 409 }
        )
        return addRateLimitHeaders(response, rateLimitResult)
      }
      
      const response = NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    if (!authData.user) {
      const response = NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Step 2: Store user data in our custom users table
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: email.trim(),
        display_name: displayName.trim(),
        email_verified: false,
        subscription_tier: 'free',
        consent_given: consentGiven,
        consent_date: new Date().toISOString(),
        login_count: 0
      })

    if (userError) {
      console.error('Database error:', userError)
      
      // If user table insert fails, we should clean up the auth user
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      } catch (cleanupError) {
        console.error('Failed to cleanup auth user after database error:', cleanupError)
      }
      
      const response = NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Step 3: Create consent record
    const { error: consentError } = await supabaseAdmin
      .from('consent_records')
      .insert({
        user_id: authData.user.id,
        consent_type: 'data_processing',
        granted: consentGiven,
        granted_at: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })

    if (consentError) {
      console.error('Consent record error:', consentError)
      // Don't fail the registration for consent record errors
    }

    // Step 4: Send verification email
    try {
      const verificationUrl = `${appUrl}/auth/verify-email?email=${encodeURIComponent(email)}&user_id=${authData.user.id}&custom_verification=true`
      
      await EmailService.sendVerificationEmail({
        to: email,
        displayName: displayName.trim(),
        verificationUrl
      })
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      // Don't fail the registration for email errors
    }

    const response = NextResponse.json(
      { 
        message: 'Account created successfully. Please check your email to verify your account.',
        user: {
          id: authData.user.id,
          email: email.trim(),
          display_name: displayName.trim(),
          email_verified: false
        }
      },
      { status: 201 }
    )
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Registration error:', error)
    
    const response = NextResponse.json(
      { error: 'An unexpected error occurred during registration' },
      { status: 500 }
    )
    return addRateLimitHeaders(response, rateLimitResult)
  }
}
