import { NextRequest, NextResponse } from 'next/server';
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

    const userId = sessionResult.session.userId;
    const { searchParams } = new URL(request.url);
    const competitionId = searchParams.get('competitionId');

    if (!competitionId) {
      return NextResponse.json({ error: 'Competition ID required' }, { status: 400 });
    }

    // Create server-side Supabase client
    const supabase = createServerClient();
    
    // Check if competition exists
    const { data: competition, error: competitionError } = await supabase
      .from('competitions')
      .select('*')
      .eq('id', competitionId)
      .single();

    if (competitionError || !competition) {
      return NextResponse.json({ 
        error: 'Competition not found',
        competitionError: competitionError?.message 
      }, { status: 404 });
    }

    // Check if user is a participant
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('*')
      .eq('competition_id', competitionId)
      .eq('user_id', userId)
      .single();

    // Get all participants for this competition
    const { data: allParticipants, error: allParticipantsError } = await supabase
      .from('participants')
      .select('*')
      .eq('competition_id', competitionId);

    // Get current user info
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, email, display_name')
      .eq('id', userId)
      .single();

    return NextResponse.json({
      success: true,
      userId,
      competitionId,
      currentUser: currentUser || null,
      userError: userError?.message,
      competition: {
        id: competition.id,
        name: competition.name,
        creator_id: competition.creator_id
      },
      isCreator: competition.creator_id === userId,
      participant: participant || null,
      participantError: participantError?.message,
      allParticipants: allParticipants || [],
      allParticipantsError: allParticipantsError?.message
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
