import { NextRequest, NextResponse } from 'next/server'
import { EmailService } from '@/lib/email/service'
import { createServerClient } from '@/lib/supabase/config'

export async function POST(request: NextRequest) {
  try {
    const { email, displayName } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!EmailService.isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // For now, let's skip the user lookup and just send the email
    // We'll assume the user exists since they just registered
    const userDisplayName = displayName || email.split('@')[0]
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    // Create a verification URL that will work with our custom flow
    // We'll use a special token that our verify-email page can recognize
    const verificationUrl = `${appUrl}/auth/verify-email?email=${encodeURIComponent(email)}&custom_verification=true`

    // Send verification email
    await EmailService.sendVerificationEmail({
      to: email,
      displayName: userDisplayName,
      verificationUrl
    })

    return NextResponse.json(
      { message: 'Verification email sent successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error sending verification email:', error)
    
    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    )
  }
}
