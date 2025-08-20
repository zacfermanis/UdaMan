-- Add OAuth provider information to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider_data JSONB;

-- Add indexes for OAuth lookups
CREATE INDEX IF NOT EXISTS idx_users_oauth_provider ON users(oauth_provider);
CREATE INDEX IF NOT EXISTS idx_users_oauth_provider_id ON users(oauth_provider, oauth_provider_id);

-- Create OAuth sessions table for security tracking
CREATE TABLE IF NOT EXISTS oauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL,
  provider_session_id VARCHAR(255),
  access_token_hash VARCHAR(255),
  refresh_token_hash VARCHAR(255),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for OAuth sessions
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_user_id ON oauth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_provider ON oauth_sessions(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_expires_at ON oauth_sessions(expires_at);

-- Add constraint to ensure oauth_provider_id is unique per provider
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth_provider_unique 
ON users(oauth_provider, oauth_provider_id) 
WHERE oauth_provider IS NOT NULL AND oauth_provider_id IS NOT NULL;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_oauth_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_oauth_sessions_updated_at
  BEFORE UPDATE ON oauth_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_oauth_sessions_updated_at();

-- Add RLS policies for oauth_sessions table
ALTER TABLE oauth_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own OAuth sessions
CREATE POLICY "Users can view own oauth sessions" ON oauth_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Only the application can insert/update/delete OAuth sessions
CREATE POLICY "Application can manage oauth sessions" ON oauth_sessions
  FOR ALL USING (auth.role() = 'service_role');
