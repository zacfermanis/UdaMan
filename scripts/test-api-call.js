const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Copy the session token functions from the auth module
function createSignedSessionToken(sessionId, userId, expiresAt) {
  const payload = {
    sessionId,
    userId,
    expiresAt
  };
  
  const payloadString = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'fallback-secret')
    .update(payloadString)
    .digest('hex');
  
  const tokenPayload = {
    ...payload,
    signature
  };
  
  return Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
}

async function testAPICall() {
  try {
    console.log('Testing API call with session token...\n');

    // Get the active session
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    if (sessionsError || !sessions || sessions.length === 0) {
      console.error('No active sessions found:', sessionsError?.message);
      return;
    }

    const session = sessions[0];
    console.log(`Using session: ${session.id}`);
    console.log(`User ID: ${session.user_id}`);

    // Create a signed session token
    const sessionToken = createSignedSessionToken(
      session.id,
      session.user_id,
      new Date(session.expires_at).getTime()
    );

    console.log(`Generated session token: ${sessionToken.substring(0, 50)}...`);

    // Now test the permission service logic that the API would use
    console.log('\n--- Testing API Logic ---');
    
    const userId = session.user_id;
    const competitionId = '65c33575-8a5a-4e3c-8c6b-02cb55b55107';

    // Step 1: Check if competition exists
    const { data: competition, error: competitionError } = await supabase
      .from('competitions')
      .select('*')
      .eq('id', competitionId)
      .single();

    if (competitionError || !competition) {
      console.error('Competition not found:', competitionError?.message);
      return;
    }

    console.log(`✓ Competition found: ${competition.name}`);

    // Step 2: Get user permissions
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('role, permissions')
      .eq('competition_id', competitionId)
      .eq('user_id', userId)
      .single();

    if (participantError || !participant) {
      console.error('User not found in competition:', participantError?.message);
      return;
    }

    console.log(`✓ User is participant with role: ${participant.role}`);

    // Step 3: Calculate permissions
    const permissionMatrix = {
      creator: {
        can_edit_competition: true,
        can_delete_competition: true,
        can_manage_events: true,
        can_create_events: true,
        can_edit_events: true,
        can_delete_events: true,
        can_manage_participants: true,
        can_invite_participants: true,
        can_remove_participants: true,
        can_change_roles: true,
        can_enter_scores: true,
        can_edit_scores: true,
        can_view_leaderboard: true,
        can_send_messages: true,
        can_view_analytics: true,
        can_export_data: true,
        can_manage_settings: true
      }
    };

    const basePermissions = permissionMatrix[participant.role];
    if (!basePermissions) {
      console.error(`No permissions found for role: ${participant.role}`);
      return;
    }

    const customPermissions = participant.permissions || {};
    const finalPermissions = {
      ...basePermissions,
      ...customPermissions
    };

    console.log('✓ Permissions calculated successfully');
    console.log(`  Can manage events: ${finalPermissions.can_manage_events}`);
    console.log(`  Can create events: ${finalPermissions.can_create_events}`);

    // Step 4: Get events (this is what the API would do)
    console.log('\n--- Testing Events Retrieval ---');
    
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('competition_id', competitionId)
      .order('scheduled_date', { ascending: true });

    if (eventsError) {
      console.error('Error fetching events:', eventsError.message);
      return;
    }

    console.log(`✓ Events retrieved successfully: ${events.length} events`);
    
    // Step 5: Simulate the API response
    console.log('\n--- Simulating API Response ---');
    
    const apiResponse = {
      success: true,
      events: events,
      total: events.length,
      permissions: finalPermissions
    };

    console.log('✓ API would return success response');
    console.log(`  Events count: ${apiResponse.total}`);
    console.log(`  Permissions count: ${Object.keys(apiResponse.permissions).length}`);

  } catch (error) {
    console.error('Test error:', error);
  }
}

testAPICall();
