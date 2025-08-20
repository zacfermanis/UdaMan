import { NextRequest, NextResponse } from 'next/server'
import { EmailService } from '@/lib/email/service'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

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

    // Send a test email
    await EmailService.sendSimpleEmail({
      to: email,
      subject: 'Test Email from Udaman',
      text: 'This is a test email to verify that Resend is working correctly with your Udaman application.'
    })

    return NextResponse.json(
      { message: 'Test email sent successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error sending test email:', error)
    
    return NextResponse.json(
      { error: 'Failed to send test email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
