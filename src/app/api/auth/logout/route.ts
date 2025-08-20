import { NextRequest, NextResponse } from 'next/server'
import { validateSignedSessionToken, revokeSession } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    // Get session token from cookie
    const sessionToken = request.cookies.get('session_token')?.value

    if (sessionToken) {
      // Validate and decode the session token
      const tokenPayload = validateSignedSessionToken(sessionToken)
      
      if (tokenPayload) {
        // Revoke the session in the database
        await revokeSession(tokenPayload.sessionId)
      }
    }

    // Create response
    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    )

    // Clear the session cookie
    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    })

    // Clear the CSRF token cookie
    response.cookies.set('csrf_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Logout error:', error)
    
    // Even if there's an error, clear the cookie
    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    )

    response.cookies.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    })

    response.cookies.set('csrf_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    })

    return response
  }
}

export async function GET(request: NextRequest) {
  // Handle GET requests for logout (useful for logout links)
  return POST(request)
}
