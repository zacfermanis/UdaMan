const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkParticipants() {
  try {
    console.log('Checking competitions and participants...\n');

    // Get all competitions
    const { data: competitions, error: compError } = await supabase
      .from('competitions')
      .select('*');

    if (compError) {
      console.error('Error fetching competitions:', compError);
      return;
    }

    console.log(`Found ${competitions.length} competitions:\n`);

    for (const competition of competitions) {
      console.log(`Competition: ${competition.name} (${competition.id})`);
      console.log(`Creator ID: ${competition.creator_id}`);
      
      // Get participants for this competition
      const { data: participants, error: partError } = await supabase
        .from('participants')
        .select('*')
        .eq('competition_id', competition.id);

      if (partError) {
        console.error('Error fetching participants:', partError);
        continue;
      }

      console.log(`Participants: ${participants.length}`);
      
      // Check if creator is in participants
      const creatorParticipant = participants.find(p => p.user_id === competition.creator_id);
      if (creatorParticipant) {
        console.log(`✓ Creator is participant with role: ${creatorParticipant.role}`);
      } else {
        console.log(`✗ Creator is NOT in participants table!`);
        
        // Try to add creator as participant
        console.log('Attempting to add creator as participant...');
        const { error: insertError } = await supabase
          .from('participants')
          .insert({
            competition_id: competition.id,
            user_id: competition.creator_id,
            role: 'creator',
            status: 'accepted',
            accepted_at: new Date().toISOString(),
            permissions: {}
          });

        if (insertError) {
          console.error('Failed to add creator as participant:', insertError);
        } else {
          console.log('✓ Successfully added creator as participant');
        }
      }
      
      console.log('');
    }

  } catch (error) {
    console.error('Script error:', error);
  }
}

checkParticipants();
