#!/usr/bin/env node

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔍 Database Password Extractor');
console.log('==============================\n');

console.log('This script helps you extract your database password from the Supabase connection string.\n');

console.log('📋 Steps:');
console.log('1. Go to your Supabase Dashboard > Settings > Database');
console.log('2. Copy the connection string (starts with "postgresql://")');
console.log('3. Paste it below\n');

rl.question('Paste your connection string here: ', (connectionString) => {
  try {
    // Extract password from connection string
    // Format: postgresql://postgres:password@db.project-ref.supabase.co:5432/postgres
    const passwordMatch = connectionString.match(/postgresql:\/\/postgres:([^@]+)@/);
    
    if (passwordMatch && passwordMatch[1]) {
      const password = passwordMatch[1];
      console.log('\n✅ Database password extracted successfully!');
      console.log('\n📋 Add this to your .env.local file:');
      console.log(`SUPABASE_DB_PASSWORD=${password}`);
      console.log('\n💡 The password is now ready to use with npm run supabase:link');
    } else {
      console.log('\n❌ Could not extract password from connection string');
      console.log('Make sure the connection string is in the correct format:');
      console.log('postgresql://postgres:password@db.project-ref.supabase.co:5432/postgres');
    }
  } catch (error) {
    console.log('\n❌ Error processing connection string:', error.message);
  }
  
  rl.close();
});
