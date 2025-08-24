import { NextRequest, NextResponse } from 'next/server';
import { EventTypeService } from '@/lib/competition/event-type-service';
import { validateSession } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/config';

export async function GET(request: NextRequest) {
  try {
    // Get session token from cookie
    const sessionToken = request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate user session
    const sessionResult = await validateSession(sessionToken);
    if (!sessionResult.isValid || !sessionResult.session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    const includePredefined = searchParams.get('includePredefined') !== 'false';

    const supabase = createServerClient();
    const eventTypeService = new EventTypeService(supabase);
    
    if (searchTerm) {
      // Search event types
      const results = await eventTypeService.searchEventTypes(sessionResult.session.userId, searchTerm, includePredefined);
      return NextResponse.json({
        success: true,
        suggestions: results
      });
    } else {
      // Get suggestions
      const suggestions = await eventTypeService.getEventTypeSuggestions(sessionResult.session.userId, '', limit);
      return NextResponse.json({
        success: true,
        suggestions
      });
    }

  } catch (error) {
    console.error('Error fetching event types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event types' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get session token from cookie
    const sessionToken = request.cookies.get('session_token')?.value;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate user session
    const sessionResult = await validateSession(sessionToken);
    if (!sessionResult.isValid || !sessionResult.session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = createServerClient();
    const eventTypeService = new EventTypeService(supabase);
    
    const eventType = await eventTypeService.createEventType(body, sessionResult.session.userId);

    return NextResponse.json({
      success: true,
      eventType
    });

  } catch (error) {
    console.error('Error creating event type:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create event type' },
      { status: 500 }
    );
  }
}
