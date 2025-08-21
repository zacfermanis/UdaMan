import { NextRequest, NextResponse } from 'next/server';
import { CompetitionService } from '@/lib/competition/competition-service';
import { validateSession } from '@/lib/auth/session';

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

    const competitionService = new CompetitionService();
    const response = await competitionService.getUserCompetitions(sessionResult.session.userId);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching competitions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch competitions' },
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
    
    // Convert string dates to Date objects
    const competitionData = {
      ...body,
      start_date: new Date(body.start_date),
      end_date: new Date(body.end_date)
    };
    
    const competitionService = new CompetitionService();
    const competition = await competitionService.createCompetition(competitionData, sessionResult.session.userId);

    return NextResponse.json(competition, { status: 201 });
  } catch (error) {
    console.error('Error creating competition:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create competition' },
      { status: 500 }
    );
  }
}
