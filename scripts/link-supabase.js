#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

console.log('🔗 Linking Supabase project...\n');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL not found in .env.local');
  console.log('Please configure your .env.local file first.');
  process.exit(1);
}

// Extract project reference from URL
const projectRefMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!projectRefMatch) {
  console.error('❌ Invalid Supabase URL format');
  console.log('Expected format: https://[PROJECT-REF].supabase.co');
  process.exit(1);
}

const projectRef = projectRefMatch[1];
console.log(`📋 Project Reference: ${projectRef}`);
console.log(`🔗 Project URL: ${supabaseUrl}`);

// Check if we have the service role key for linking
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
  console.log('Please add your service role key to .env.local');
  console.log('You can find it in your Supabase dashboard under Settings > API');
  process.exit(1);
}

// Check if we have the database password
const dbPassword = process.env.SUPABASE_DB_PASSWORD;
if (!dbPassword) {
  console.error('❌ SUPABASE_DB_PASSWORD not found in .env.local');
  console.log('Please add your database password to .env.local');
  console.log('You can find it in your Supabase dashboard under Settings > Database > Connection string');
  console.log('\n📝 To link manually, run:');
  console.log(`npx supabase link --project-ref ${projectRef} --password [YOUR_DB_PASSWORD]`);
  process.exit(1);
}

console.log('\n✅ Environment variables are configured correctly!');
console.log('\n🚀 Linking project automatically...');

try {
  // Execute the supabase link command with the password
  const command = `npx supabase link --project-ref ${projectRef} --password "${dbPassword}"`;
  console.log(`Executing: ${command.replace(dbPassword, '[PASSWORD_HIDDEN]')}`);
  
  execSync(command, { stdio: 'inherit' });
  
  console.log('\n✅ Project linked successfully!');
  console.log('\n🚀 Next steps:');
  console.log('1. Push the database migration: npm run supabase:db:push');
  console.log('2. Check project status: npm run supabase:status');
  
} catch (error) {
  console.error('\n❌ Failed to link project automatically');
  console.log('\n📝 You can try linking manually:');
  console.log(`npx supabase link --project-ref ${projectRef} --password "${dbPassword}"`);
  console.log('\n💡 Make sure your database password is correct');
  console.log('   You can find it in: Supabase Dashboard > Settings > Database > Connection string');
  process.exit(1);
}
