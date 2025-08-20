-- Create PKCE state table for OAuth security
CREATE TABLE IF NOT EXISTS pkce_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state VARCHAR(255) UNIQUE NOT NULL,
  code_verifier VARCHAR(255) NOT NULL,
  code_challenge VARCHAR(255) NOT NULL,
  provider VARCHAR(20) NOT NULL,
  redirect_to TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for PKCE state lookups
CREATE INDEX IF NOT EXISTS idx_pkce_states_state ON pkce_states(state);
CREATE INDEX IF NOT EXISTS idx_pkce_states_expires_at ON pkce_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_pkce_states_provider ON pkce_states(provider);

-- Add RLS policies for pkce_states table
ALTER TABLE pkce_states ENABLE ROW LEVEL SECURITY;

-- Only the application can manage PKCE states
CREATE POLICY "Application can manage pkce states" ON pkce_states
  FOR ALL USING (auth.role() = 'service_role');

-- Create a function to clean up expired PKCE states
CREATE OR REPLACE FUNCTION cleanup_expired_pkce_states()
RETURNS void AS $$
BEGIN
  DELETE FROM pkce_states WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired PKCE states (optional)
-- This would require pg_cron extension which may not be available in all environments
-- SELECT cron.schedule('cleanup-pkce-states', '*/15 * * * *', 'SELECT cleanup_expired_pkce_states();');
