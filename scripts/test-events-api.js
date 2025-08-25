const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testEventsAPI() {
  try {
    console.log('Testing events API logic...\n');

    const competitionId = '65c33575-8a5a-4e3c-8c6b-02cb55b55107';
    const userId = '4bb8ebab-6cfc-44bf-b856-f255f647d95b'; // Creator user ID

    console.log(`Testing with competition ID: ${competitionId}`);
    console.log(`Testing with user ID: ${userId}\n`);

    // Check if competition exists
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
    console.log(`  Creator ID: ${competition.creator_id}`);
    console.log(`  Is current user creator: ${competition.creator_id === userId}\n`);

    // Check if user is a participant
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('*')
      .eq('competition_id', competitionId)
      .eq('user_id', userId)
      .single();

    if (participantError) {
      console.error('Error checking participant:', participantError.message);
      return;
    }

    if (!participant) {
      console.log('✗ User is NOT a participant in this competition');
      
      // Check if user is the creator
      if (competition.creator_id === userId) {
        console.log('  But user IS the creator - this is a data inconsistency');
        console.log('  Attempting to add creator as participant...');
        
        const { error: insertError } = await supabase
          .from('participants')
          .insert({
            competition_id: competitionId,
            user_id: userId,
            role: 'creator',
            status: 'accepted',
            accepted_at: new Date().toISOString(),
            permissions: {}
          });

        if (insertError) {
          console.error('Failed to add creator as participant:', insertError.message);
        } else {
          console.log('✓ Successfully added creator as participant');
        }
      }
    } else {
      console.log(`✓ User is a participant with role: ${participant.role}`);
      console.log(`  Status: ${participant.status}`);
      console.log(`  Permissions:`, participant.permissions);
    }

    // Test permission service logic
    console.log('\n--- Testing Permission Service Logic ---');
    
    // Get base permissions for role
    const rolePermissions = {
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

    if (participant) {
      const basePermissions = rolePermissions[participant.role];
      if (basePermissions) {
        console.log(`✓ Base permissions for role '${participant.role}':`, Object.keys(basePermissions).length, 'permissions');
        
        // Merge with custom permissions
        const customPermissions = participant.permissions || {};
        const finalPermissions = {
          ...basePermissions,
          ...customPermissions
        };
        
        console.log(`✓ Final permissions:`, Object.keys(finalPermissions).length, 'permissions');
        console.log(`  Can manage events: ${finalPermissions.can_manage_events}`);
        console.log(`  Can create events: ${finalPermissions.can_create_events}`);
        console.log(`  Can edit events: ${finalPermissions.can_edit_events}`);
        console.log(`  Can delete events: ${finalPermissions.can_delete_events}`);
      } else {
        console.log(`✗ No base permissions found for role '${participant.role}'`);
      }
    }

  } catch (error) {
    console.error('Test error:', error);
  }
}

testEventsAPI();
