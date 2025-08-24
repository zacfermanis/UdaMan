import { NextRequest, NextResponse } from 'next/server';
import { EventService } from '@/lib/competition/event-service';
import { CompetitionService } from '@/lib/competition/competition-service';
import { PermissionService } from '@/lib/competition/permission-service';
import { validateSession } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: competitionId } = await params;
    const userId = sessionResult.session.userId;

    // Create server-side Supabase client
    const supabase = createServerClient();
    
    // Check if user has access to the competition
    const competitionService = new CompetitionService(supabase);
    const permissionService = new PermissionService(supabase);
    
    try {
      await competitionService.getCompetitionById(competitionId);
    } catch (error) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    }

    // Get user permissions
    const permissions = await permissionService.getUserPermissions(userId, competitionId);
    if (!permissions) {
      return NextResponse.json({ error: 'Access denied - User not found in competition' }, { status: 403 });
    }
    if (!permissions.can_view_events) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get events for the competition
    const eventService = new EventService(supabase);
    const events = await eventService.getCompetitionEvents(competitionId, userId);

    return NextResponse.json({
      success: true,
      events: events.events,
      total: events.total,
      permissions
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: competitionId } = await params;
    const userId = sessionResult.session.userId;
    const body = await request.json();

    // Create server-side Supabase client
    const supabase = createServerClient();
    
    // Check permissions
    const permissionService = new PermissionService(supabase);
    const permissions = await permissionService.getUserPermissions(userId, competitionId);
    if (!permissions) {
      return NextResponse.json({ error: 'Access denied - User not found in competition' }, { status: 403 });
    }
    if (!permissions.can_create_events) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create event
    const eventService = new EventService(supabase);
    const event = await eventService.createEvent(body, competitionId, userId);

    return NextResponse.json({
      success: true,
      event
    });

  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create event' },
      { status: 500 }
    );
  }
}
