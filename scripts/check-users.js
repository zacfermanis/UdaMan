const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsers() {
  try {
    console.log('Checking users and their relationships...\n');

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    console.log(`Found ${users.length} users:\n`);

    for (const user of users) {
      console.log(`User: ${user.email || user.display_name} (${user.id})`);
      
      // Get competitions this user created
      const { data: createdCompetitions, error: createdError } = await supabase
        .from('competitions')
        .select('*')
        .eq('creator_id', user.id);

      if (createdError) {
        console.error('Error fetching created competitions:', createdError);
        continue;
      }

      console.log(`  Created competitions: ${createdCompetitions.length}`);
      
      // Get competitions this user participates in
      const { data: participations, error: partError } = await supabase
        .from('participants')
        .select(`
          *,
          competitions!inner(*)
        `)
        .eq('user_id', user.id);

      if (partError) {
        console.error('Error fetching participations:', partError);
        continue;
      }

      console.log(`  Participates in: ${participations.length} competitions`);
      
      for (const participation of participations) {
        console.log(`    - ${participation.competitions.name} (role: ${participation.role})`);
      }
      
      console.log('');
    }

    // Check sessions
    console.log('Checking active sessions...\n');
    
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
    } else {
      console.log(`Found ${sessions.length} active sessions:\n`);
      
      for (const session of sessions) {
        console.log(`Session: ${session.id}`);
        console.log(`  User ID: ${session.user_id}`);
        console.log(`  Expires: ${session.expires_at}`);
        console.log(`  Created: ${session.created_at}`);
        console.log('');
      }
    }

  } catch (error) {
    console.error('Script error:', error);
  }
}

checkUsers();
