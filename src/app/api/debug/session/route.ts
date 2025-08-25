import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    // Get session token from cookie
    const sessionToken = request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'No session token found' }, { status: 401 });
    }

    // Validate user session
    const sessionResult = await validateSession(sessionToken);
    
    if (!sessionResult.isValid || !sessionResult.session) {
      return NextResponse.json({ 
        error: 'Invalid session',
        sessionError: sessionResult.error 
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      session: {
        id: sessionResult.session.id,
        userId: sessionResult.session.userId,
        expiresAt: sessionResult.session.expiresAt,
        isActive: sessionResult.session.isActive
      }
    });

  } catch (error) {
    console.error('Session debug error:', error);
    return NextResponse.json(
      { error: 'Session debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

