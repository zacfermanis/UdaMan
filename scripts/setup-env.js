#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Supabase environment configuration...\n');

// Check if .env.local already exists
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env.local already exists. Backing up to .env.local.backup');
  fs.copyFileSync(envPath, envPath + '.backup');
}

// Read the template
const templatePath = path.join(process.cwd(), 'env.local.template');
if (!fs.existsSync(templatePath)) {
  console.error('❌ env.local.template not found!');
  process.exit(1);
}

const template = fs.readFileSync(templatePath, 'utf8');

// Create .env.local from template
fs.writeFileSync(envPath, template);

console.log('✅ Created .env.local from template');
console.log('\n📋 Next steps:');
console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
console.log('2. Select your project');
console.log('3. Go to Settings > API');
console.log('4. Copy the following values to .env.local:');
console.log('   - Project URL → NEXT_PUBLIC_SUPABASE_URL');
console.log('   - anon public → NEXT_PUBLIC_SUPABASE_ANON_KEY');
console.log('   - service_role secret → SUPABASE_SERVICE_ROLE_KEY');
console.log('   - Database password → SUPABASE_DB_PASSWORD');
console.log('\n🔗 Project URL format: https://[YOUR-PROJECT-REF].supabase.co');
console.log('🔑 Keys are long strings starting with "eyJ..."');
console.log('\n⚠️  Important: Never commit .env.local to version control!');
console.log('   It\'s already in .gitignore for security.');
