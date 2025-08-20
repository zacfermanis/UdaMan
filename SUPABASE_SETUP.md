# Supabase Setup Guide

This guide will help you set up Supabase for the Udaman authentication system.

## Prerequisites

1. A Supabase account (sign up at [supabase.com](https://supabase.com))
2. A Supabase project created
3. Node.js and npm installed

## Step 1: Environment Configuration

### Automatic Setup
Run the setup script to create your `.env.local` file:

```bash
npm run supabase:setup
```

### Manual Setup
If you prefer to set up manually:

1. Copy `env.local.template` to `.env.local`
2. Fill in your Supabase credentials (see Step 2)

## Step 2: Get Supabase Credentials

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings > API**
4. Copy the following values to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_DB_PASSWORD=your-database-password-here
```

## Step 3: Link Your Project

### Check Configuration
Verify your environment variables are set correctly:

```bash
npm run supabase:link
```

### Link Project
Link your local project to Supabase:

```bash
npm run supabase:link
```

This will automatically link your project using the environment variables. If you prefer to link manually:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF --password YOUR_DB_PASSWORD
```

Replace `YOUR_PROJECT_REF` with your actual project reference (found in your Supabase URL) and `YOUR_DB_PASSWORD` with your database password.

**💡 Finding your database password:**
- Go to your Supabase Dashboard > Settings > Database
- Look for the "Connection string" section
- The password is the part after `postgres:` and before `@db.`
- Example: `postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres`

**🔧 Helper script:** You can use `npm run supabase:extract-password` to automatically extract the password from your connection string.

## Step 4: Apply Database Migration

Push the authentication schema to your Supabase database:

```bash
npm run supabase:db:push
```

This will create:
- `users` table with all required fields
- `sessions` table for session management
- `consent_records` table for GDPR compliance
- Database indexes for performance
- Row Level Security (RLS) policies
- Database triggers for `updated_at` timestamps

## Step 5: Verify Setup

Check that everything is working:

```bash
npm run supabase:status
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run supabase:setup` | Create `.env.local` from template |
| `npm run supabase:link` | Link project to Supabase automatically |
| `npm run supabase:extract-password` | Extract database password from connection string |
| `npm run supabase:status` | Check Supabase project status |
| `npm run supabase:db:push` | Push migrations to database |
| `npm run supabase:db:reset` | Reset database (⚠️ destructive) |
| `npm run supabase:db:diff` | Show differences between local and remote |
| `npm run supabase:start` | Start local Supabase instance |
| `npm run supabase:stop` | Stop local Supabase instance |

## Database Schema

The migration creates the following tables:

### Users Table
- `id`: UUID primary key
- `email`: Unique email address
- `display_name`: User's display name
- `avatar_url`: Profile picture URL
- `email_verified`: Email verification status
- `subscription_tier`: Free or premium
- `consent_given`: GDPR consent status
- `last_login`: Last login timestamp
- `login_count`: Number of logins

### Sessions Table
- `id`: UUID primary key
- `user_id`: Reference to users table
- `session_token`: Secure session token
- `expires_at`: Session expiration
- `ip_address`: Client IP address
- `user_agent`: Browser information
- `is_active`: Session status

### Consent Records Table
- `id`: UUID primary key
- `user_id`: Reference to users table
- `consent_type`: Type of consent
- `granted`: Consent status
- `granted_at`: When consent was given
- `revoked_at`: When consent was revoked

## Security Features

- **Row Level Security (RLS)**: Users can only access their own data
- **Secure Session Management**: Cryptographically secure tokens
- **GDPR Compliance**: Consent tracking and data portability
- **Input Validation**: Comprehensive client and server-side validation

## Troubleshooting

### Environment Variables Not Found
Make sure your `.env.local` file exists and contains the correct values.

### Migration Fails
1. Check that your project is linked correctly
2. Verify you have the correct database password
3. Ensure you have admin privileges on the project

### RLS Policies Not Working
1. Make sure RLS is enabled on all tables
2. Verify the `auth.uid()` function is available
3. Check that users are properly authenticated

## Next Steps

After completing this setup:

1. **Configure OAuth Providers** (Google, Facebook, Microsoft)
2. **Set up Email Templates** for verification and password reset
3. **Test Authentication Flow** with the login/register components
4. **Configure Email Service** for notifications

## Security Notes

- Never commit `.env.local` to version control
- Keep your service role key secure
- Regularly rotate your API keys
- Monitor your Supabase usage and logs

## Support

If you encounter issues:

1. Check the [Supabase Documentation](https://supabase.com/docs)
2. Review the [Supabase Discord](https://discord.supabase.com)
3. Check the project's memory bank for specific implementation details
