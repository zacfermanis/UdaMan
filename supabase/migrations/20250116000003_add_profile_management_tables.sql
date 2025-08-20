-- Profile Management Database Schema Updates
-- Migration: 20250116000003_add_profile_management_tables.sql

-- Add new columns to users table for enhanced profile information
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50);

-- Create user_settings table for account preferences
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  theme_preference VARCHAR(10) DEFAULT 'auto' CHECK (theme_preference IN ('light', 'dark', 'auto')),
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  profile_visibility VARCHAR(10) DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private')),
  data_sharing BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_oauth_providers table for OAuth provider linking
CREATE TABLE IF NOT EXISTS user_oauth_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'facebook', 'microsoft')),
  provider_user_id VARCHAR(255) NOT NULL,
  access_token_hash VARCHAR(255),
  refresh_token_hash VARCHAR(255),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add database indexes for performance optimization
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_oauth_providers_user_provider ON user_oauth_providers(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_user_oauth_providers_provider_user_id ON user_oauth_providers(provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location);

-- Set up database triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_user_settings_updated_at 
  BEFORE UPDATE ON user_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_oauth_providers_updated_at 
  BEFORE UPDATE ON user_oauth_providers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add Row Level Security (RLS) policies
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_oauth_providers ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_settings
CREATE POLICY "Users can view their own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" ON user_settings
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for user_oauth_providers
CREATE POLICY "Users can view their own OAuth providers" ON user_oauth_providers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own OAuth providers" ON user_oauth_providers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own OAuth providers" ON user_oauth_providers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own OAuth providers" ON user_oauth_providers
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to get or create user settings
CREATE OR REPLACE FUNCTION get_or_create_user_settings(user_uuid UUID)
RETURNS user_settings AS $$
DECLARE
  user_setting user_settings;
BEGIN
  -- Try to get existing settings
  SELECT * INTO user_setting FROM user_settings WHERE user_id = user_uuid;
  
  -- If no settings exist, create default ones
  IF user_setting IS NULL THEN
    INSERT INTO user_settings (user_id)
    VALUES (user_uuid)
    RETURNING * INTO user_setting;
  END IF;
  
  RETURN user_setting;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user OAuth providers
CREATE OR REPLACE FUNCTION get_user_oauth_providers(user_uuid UUID)
RETURNS TABLE (
  provider VARCHAR(20),
  provider_user_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uop.provider,
    uop.provider_user_id,
    uop.created_at
  FROM user_oauth_providers uop
  WHERE uop.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to link OAuth provider
CREATE OR REPLACE FUNCTION link_oauth_provider(
  user_uuid UUID,
  provider_name VARCHAR(20),
  provider_user_id_val VARCHAR(255),
  access_token_hash_val VARCHAR(255),
  refresh_token_hash_val VARCHAR(255),
  expires_at_val TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO user_oauth_providers (
    user_id, 
    provider, 
    provider_user_id, 
    access_token_hash, 
    refresh_token_hash, 
    expires_at
  ) VALUES (
    user_uuid,
    provider_name,
    provider_user_id_val,
    access_token_hash_val,
    refresh_token_hash_val,
    expires_at_val
  )
  ON CONFLICT (user_id, provider) 
  DO UPDATE SET
    provider_user_id = EXCLUDED.provider_user_id,
    access_token_hash = EXCLUDED.access_token_hash,
    refresh_token_hash = EXCLUDED.refresh_token_hash,
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW();
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to unlink OAuth provider
CREATE OR REPLACE FUNCTION unlink_oauth_provider(user_uuid UUID, provider_name VARCHAR(20))
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM user_oauth_providers 
  WHERE user_id = user_uuid AND provider = provider_name;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
