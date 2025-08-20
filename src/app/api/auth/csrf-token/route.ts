import { NextRequest, NextResponse } from 'next/server'
import { createSignedCSRFToken, setCSRFTokenCookie } from '@/lib/auth/csrf'

export async function GET(request: NextRequest) {
  try {
    // Create a new CSRF token
    const signedToken = createSignedCSRFToken()
    
    // Parse token to get expiration
    const tokenData = JSON.parse(Buffer.from(signedToken, 'base64url').toString('utf-8'))
    
    // Create response
    const response = NextResponse.json({
      token: signedToken,
      expiresAt: tokenData.expiresAt,
      message: 'CSRF token generated successfully'
    })
    
    // Set token in cookie
    return setCSRFTokenCookie(response)
    
  } catch (error) {
    console.error('CSRF token generation error:', error)
    
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Allow POST requests for token refresh
  return GET(request)
}
