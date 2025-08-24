import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get session token from cookie
    const sessionToken = request.cookies.get('session_token')?.value;

    return NextResponse.json({
      success: true,
      debug: {
        hasSessionToken: !!sessionToken,
        tokenLength: sessionToken?.length || 0,
        cookieNames: Array.from(request.cookies.keys())
      }
    });

  } catch (error) {
    console.error('Simple debug error:', error);
    return NextResponse.json(
      { 
        error: 'Simple debug endpoint error',
        debug: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}
