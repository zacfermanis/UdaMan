import { NextRequest, NextResponse } from 'next/server';
import { CompetitionService } from '@/lib/competition/competition-service';
import { validateSession } from '@/lib/auth/session';

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
    const competitionService = new CompetitionService();
    
    // Get the competition and check if user has access
    const competition = await competitionService.getCompetitionById(competitionId);
    
    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    }

    // Check if user has permission to view this competition
    const hasAccess = await competitionService.userHasAccessToCompetition(
      sessionResult.session.userId,
      competitionId
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ competition });
  } catch (error) {
    console.error('Error fetching competition:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch competition' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const body = await request.json();
    
    const competitionService = new CompetitionService();
    
    // Check if user has permission to update this competition
    const hasAccess = await competitionService.userHasAccessToCompetition(
      sessionResult.session.userId,
      competitionId,
      'admin'
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Convert string dates to Date objects if they exist
    const updateData = {
      ...body,
      ...(body.start_date && { start_date: new Date(body.start_date) }),
      ...(body.end_date && { end_date: new Date(body.end_date) })
    };

    const updatedCompetition = await competitionService.updateCompetition(
      competitionId,
      updateData
    );

    return NextResponse.json({ competition: updatedCompetition });
  } catch (error) {
    console.error('Error updating competition:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update competition' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const competitionService = new CompetitionService();
    
    // Check if user has permission to delete this competition (creator only)
    const hasAccess = await competitionService.userHasAccessToCompetition(
      sessionResult.session.userId,
      competitionId,
      'creator'
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await competitionService.deleteCompetition(competitionId);

    return NextResponse.json({ message: 'Competition deleted successfully' });
  } catch (error) {
    console.error('Error deleting competition:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete competition' },
      { status: 500 }
    );
  }
}
