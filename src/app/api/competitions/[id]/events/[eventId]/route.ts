import { NextRequest, NextResponse } from 'next/server';
import { EventService } from '@/lib/competition/event-service';
import { PermissionService } from '@/lib/competition/permission-service';
import { validateSession } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/config';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
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

    const { id: competitionId, eventId } = await params;
    const userId = sessionResult.session.userId;

    // Create server-side Supabase client
    const supabase = createServerClient();
    
    // Check permissions
    const permissionService = new PermissionService(supabase);
    const permissions = await permissionService.getUserPermissions(userId, competitionId);
    if (!permissions) {
      return NextResponse.json({ error: 'Access denied - User not found in competition' }, { status: 403 });
    }
    if (!permissions.can_view_events) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get event
    const eventService = new EventService(supabase);
    const event = await eventService.getEventById(eventId, userId);

    return NextResponse.json({
      success: true,
      event
    });

  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
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

    const { id: competitionId, eventId } = await params;
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
    if (!permissions.can_manage_events) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update event
    const eventService = new EventService(supabase);
    const event = await eventService.updateEvent(eventId, body, userId);

    return NextResponse.json({
      success: true,
      event
    });

  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update event' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
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

    const { id: competitionId, eventId } = await params;
    const userId = sessionResult.session.userId;

    // Create server-side Supabase client
    const supabase = createServerClient();
    
    // Check permissions
    const permissionService = new PermissionService(supabase);
    const permissions = await permissionService.getUserPermissions(userId, competitionId);
    if (!permissions) {
      return NextResponse.json({ error: 'Access denied - User not found in competition' }, { status: 403 });
    }
    if (!permissions.can_delete_events) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete event
    const eventService = new EventService(supabase);
    await eventService.deleteEvent(eventId, userId);

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete event' },
      { status: 500 }
    );
  }
}
