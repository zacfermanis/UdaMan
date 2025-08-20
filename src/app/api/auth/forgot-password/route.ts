import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/config'
import { EmailService } from '@/lib/email/service'
import { validateEmail } from '@/lib/auth/validation'
import { randomBytes } from 'crypto'
import { authRateLimiters, addRateLimitHeaders, createRateLimitError } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimitResult = await authRateLimiters.passwordReset.checkLimit(request)
    if (!rateLimitResult.success) {
      return createRateLimitError(rateLimitResult)
    }

    const { email } = await request.json()

    if (!email) {
      const response = NextResponse.json(
        { error: 'Email is required' },
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Check if user exists
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .eq('email', email.trim())
      .single()

    if (userError || !userData) {
      // Don't reveal if user exists or not for security
      const response = NextResponse.json(
        { message: 'If an account with that email exists, a password reset link has been sent.' },
        { status: 200 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Generate a secure reset token
    const resetToken = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    // Store the reset token in the database
    const { error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .insert({
        user_id: userData.id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
        used: false,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })

    if (tokenError) {
      console.error('Failed to store reset token:', tokenError)
      const response = NextResponse.json(
        { error: 'Failed to process password reset request' },
        { status: 500 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    // Send password reset email
    try {
      const resetUrl = `${appUrl}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`
      
      await EmailService.sendPasswordResetEmail({
        to: email,
        displayName: userData.display_name || email.split('@')[0],
        resetUrl
      })
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError)
      
      // Clean up the token if email fails
      await supabaseAdmin
        .from('password_reset_tokens')
        .delete()
        .eq('token', resetToken)
      
      const response = NextResponse.json(
        { error: 'Failed to send password reset email' },
        { status: 500 }
      )
      return addRateLimitHeaders(response, rateLimitResult)
    }

    const response = NextResponse.json(
      { message: 'If an account with that email exists, a password reset link has been sent.' },
      { status: 200 }
    )
    return addRateLimitHeaders(response, rateLimitResult)

  } catch (error) {
    console.error('Password reset error:', error)
    
    const response = NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
    return addRateLimitHeaders(response, rateLimitResult)
  }
}
