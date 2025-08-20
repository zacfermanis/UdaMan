# Manual Migration Guide

Since the Supabase CLI linking encountered permission issues, you can apply the migration manually through the Supabase Dashboard.

## Step 1: Access SQL Editor

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `jdrftwvkotizpltzvpxi`
3. Navigate to **SQL Editor** in the left sidebar

## Step 2: Apply Migration

1. Click **"New query"** in the SQL Editor
2. Copy the entire contents of `supabase/migrations/20250816032430_create_auth_tables.sql`
3. Paste it into the SQL Editor
4. Click **"Run"** to execute the migration

## Step 3: Verify Migration

After running the migration, you can verify it worked by:

1. Go to **Table Editor** in the left sidebar
2. You should see three new tables:
   - `users`
   - `sessions` 
   - `consent_records`

## Step 4: Test Connection

You can test that your application can connect to Supabase by running:

```bash
npm run dev
```

Then check the browser console for any connection errors.

## Alternative: Use Supabase CLI with Different Authentication

If you want to try the CLI approach again:

1. **Login to Supabase CLI:**
   ```bash
   npx supabase login
   ```

2. **Try linking again:**
   ```bash
   npm run supabase:link
   ```

3. **If still having issues, try with access token:**
   - Go to Supabase Dashboard > Account > Access Tokens
   - Create a new access token
   - Use it with the CLI

## Migration Content

The migration file contains:
- Users table with all required fields
- Sessions table for session management
- Consent records table for GDPR compliance
- Database indexes for performance
- Row Level Security (RLS) policies
- Database triggers for updated_at timestamps

## Next Steps

After successfully applying the migration:

1. **Test the connection** by running your development server
2. **Move to Phase 2** of the authentication implementation
3. **Start building the authentication components**

The manual approach is often more reliable than CLI linking for projects with complex permission structures.
