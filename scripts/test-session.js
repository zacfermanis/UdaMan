const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSession() {
  try {
    console.log('Testing session validation...\n');

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
    console.log(`Found active session: ${session.id}`);
    console.log(`User ID: ${session.user_id}`);
    console.log(`Session token: ${session.session_token}`);
    console.log(`Expires: ${session.expires_at}`);
    console.log(`Is active: ${session.is_active}\n`);

    // Test the session token validation logic
    console.log('--- Testing Session Token Validation ---');
    
    // Check if session exists and is active in database
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', session.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !sessionData) {
      console.error('Session validation failed:', sessionError?.message);
      return;
    }

    console.log('✓ Session validation successful');
    console.log(`  Session ID: ${sessionData.id}`);
    console.log(`  User ID: ${sessionData.user_id}`);
    console.log(`  Is active: ${sessionData.is_active}`);
    console.log(`  Expires at: ${sessionData.expires_at}`);

    // Test the permission service with this user
    console.log('\n--- Testing Permission Service with Session User ---');
    
    const userId = sessionData.user_id;
    const competitionId = '65c33575-8a5a-4e3c-8c6b-02cb55b55107';

    // Check if user is a participant
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('role, permissions')
      .eq('competition_id', competitionId)
      .eq('user_id', userId)
      .single();

    if (participantError || !participant) {
      console.error('Permission check failed:', participantError?.message);
      return;
    }

    console.log('✓ Permission check successful');
    console.log(`  Role: ${participant.role}`);
    console.log(`  Permissions:`, participant.permissions);

    // Test the permission matrix
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
    if (basePermissions) {
      const customPermissions = participant.permissions || {};
      const finalPermissions = {
        ...basePermissions,
        ...customPermissions
      };

      console.log('✓ Final permissions calculated successfully');
      console.log(`  Can manage events: ${finalPermissions.can_manage_events}`);
      console.log(`  Can create events: ${finalPermissions.can_create_events}`);
      console.log(`  Can edit events: ${finalPermissions.can_edit_events}`);
      console.log(`  Can delete events: ${finalPermissions.can_delete_events}`);
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

testSession();
