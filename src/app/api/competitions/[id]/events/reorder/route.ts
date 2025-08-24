import { NextRequest, NextResponse } from 'next/server';
import { EventService } from '@/lib/competition/event-service';
import { PermissionService } from '@/lib/competition/permission-service';
import { validateSession } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/config';

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
    const { eventIds } = body;

    if (!eventIds || !Array.isArray(eventIds)) {
      return NextResponse.json({ error: 'Invalid event IDs' }, { status: 400 });
    }

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

    // Reorder events
    const eventService = new EventService(supabase);
    await eventService.updateEventOrder(competitionId, eventIds, userId);

    return NextResponse.json({
      success: true,
      message: 'Events reordered successfully'
    });

  } catch (error) {
    console.error('Error reordering events:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reorder events' },
      { status: 500 }
    );
  }
}
