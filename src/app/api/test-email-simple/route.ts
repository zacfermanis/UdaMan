import { NextRequest, NextResponse } from 'next/server'
import { EmailService } from '@/lib/email/service'

export async function POST(request: NextRequest) {
  try {
    const { email, displayName = 'Test User' } = await request.json()

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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const verificationUrl = `${appUrl}/auth/verify-email?email=${encodeURIComponent(email)}&token=test_token&type=signup`

    // Send verification email
    await EmailService.sendVerificationEmail({
      to: email,
      displayName,
      verificationUrl
    })

    return NextResponse.json(
      { message: 'Test verification email sent successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error sending test verification email:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to send test verification email', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
