import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/config';

export async function GET(request: NextRequest) {
  try {
    // Get session token from cookie
    const sessionToken = request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ 
        error: 'No session token found',
        debug: {
          cookies: Object.fromEntries(request.cookies.entries()),
          hasSessionToken: false
        }
      }, { status: 401 });
    }

    // Validate user session
    const sessionResult = await validateSession(sessionToken);
    if (!sessionResult.isValid || !sessionResult.session) {
      return NextResponse.json({ 
        error: 'Invalid session',
        debug: {
          sessionResult,
          hasSessionToken: true,
          tokenLength: sessionToken.length
        }
      }, { status: 401 });
    }

    const userId = sessionResult.session.userId;
    const supabase = createServerClient();

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, display_name')
      .eq('id', userId)
      .single();

    if (userError) {
      return NextResponse.json({ 
        error: 'User not found',
        debug: {
          userId,
          userError: userError.message
        }
      }, { status: 404 });
    }

    // Get user's competitions
    const { data: competitions, error: compError } = await supabase
      .from('participants')
      .select(`
        competition_id,
        role,
        status,
        competitions!inner(id, name, description)
      `)
      .eq('user_id', userId);

    if (compError) {
      return NextResponse.json({ 
        error: 'Failed to fetch competitions',
        debug: {
          userId,
          compError: compError.message
        }
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name
      },
      session: {
        id: sessionResult.session.id,
        userId: sessionResult.session.userId,
        expiresAt: sessionResult.session.expiresAt,
        isActive: sessionResult.session.isActive
      },
      competitions: competitions || [],
      debug: {
        hasSessionToken: true,
        tokenLength: sessionToken.length,
        userFound: true,
        competitionsCount: competitions?.length || 0
      }
    });

  } catch (error) {
    console.error('Debug session error:', error);
    return NextResponse.json(
      { 
        error: 'Debug endpoint error',
        debug: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}
