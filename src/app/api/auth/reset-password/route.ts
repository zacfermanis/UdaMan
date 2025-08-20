import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/config'
import { validatePasswordStrength } from '@/lib/auth/validation'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password)
    if (!passwordValidation.isStrong) {
      return NextResponse.json(
        { error: passwordValidation.feedback[0] || 'Password is too weak' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createServerClient()

    // Find and validate the reset token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Get user information
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', tokenData.user_id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update the user's password in Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userData.id,
      { password: password }
    )

    if (authError) {
      console.error('Failed to update password in Supabase Auth:', authError)
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      )
    }

    // Mark the token as used
    const { error: updateTokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .update({
        used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', tokenData.id)

    if (updateTokenError) {
      console.error('Failed to mark token as used:', updateTokenError)
      // Don't fail the password reset if this step fails
    }

    // Update user's last login and login count
    const { error: updateUserError } = await supabaseAdmin
      .from('users')
      .update({
        last_login: new Date().toISOString(),
        login_count: userData.login_count + 1
      })
      .eq('id', userData.id)

    if (updateUserError) {
      console.error('Failed to update user login info:', updateUserError)
      // Don't fail the password reset if this step fails
    }

    return NextResponse.json(
      { message: 'Password reset successfully. You can now log in with your new password.' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Password reset error:', error)
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
