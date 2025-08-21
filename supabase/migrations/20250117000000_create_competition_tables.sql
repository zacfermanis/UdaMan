-- Competition Management Database Schema
-- Migration: 20250117000000_create_competition_tables.sql

-- Competitions Table (Task 1.1)
CREATE TABLE IF NOT EXISTS competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

-- Events Table (Task 1.2)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(100) NOT NULL,
  location JSONB NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  max_participants INTEGER,
  rules TEXT,
  requirements TEXT,
  scoring_config JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Participants Table (Task 1.3)
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID REFERENCES competitions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'participant' CHECK (role IN ('creator', 'admin', 'participant', 'spectator')),
  status VARCHAR(20) DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'pending')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,
  permissions JSONB DEFAULT '{}',
  UNIQUE(competition_id, user_id)
);

-- User Event Types Table (Task 1.4)
CREATE TABLE IF NOT EXISTS user_event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'custom',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usage_count INTEGER DEFAULT 0
);

-- Database indexes for performance optimization (Task 1.5)
CREATE INDEX IF NOT EXISTS idx_competitions_creator_id ON competitions(creator_id);
CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(status);
CREATE INDEX IF NOT EXISTS idx_competitions_dates ON competitions(start_date, end_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_competitions_creator_name ON competitions(creator_id, name);

CREATE INDEX IF NOT EXISTS idx_events_competition_id ON events(competition_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_scheduled_date ON events(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

CREATE INDEX IF NOT EXISTS idx_participants_competition_id ON participants(competition_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);
CREATE INDEX IF NOT EXISTS idx_participants_role ON participants(role);

CREATE INDEX IF NOT EXISTS idx_user_event_types_user_id ON user_event_types(user_id);
CREATE INDEX IF NOT EXISTS idx_user_event_types_category ON user_event_types(category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_event_types_user_name ON user_event_types(user_id, name);

-- Database triggers for updated_at timestamps (Task 1.6)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_competitions_updated_at 
    BEFORE UPDATE ON competitions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies for competition data protection
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_event_types ENABLE ROW LEVEL SECURITY;

-- RLS policies for competitions
CREATE POLICY "Users can view competitions they participate in" ON competitions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM participants 
            WHERE participants.competition_id = competitions.id 
            AND participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create competitions" ON competitions
    FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Competition creators can update their competitions" ON competitions
    FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "Competition creators can delete their competitions" ON competitions
    FOR DELETE USING (creator_id = auth.uid());

-- RLS policies for events
CREATE POLICY "Users can view events in competitions they participate in" ON events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM participants 
            WHERE participants.competition_id = events.competition_id 
            AND participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Competition creators and admins can create events" ON events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM participants 
            WHERE participants.competition_id = events.competition_id 
            AND participants.user_id = auth.uid()
            AND participants.role IN ('creator', 'admin')
        )
    );

CREATE POLICY "Competition creators and admins can update events" ON events
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM participants 
            WHERE participants.competition_id = events.competition_id 
            AND participants.user_id = auth.uid()
            AND participants.role IN ('creator', 'admin')
        )
    );

CREATE POLICY "Competition creators and admins can delete events" ON events
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM participants 
            WHERE participants.competition_id = events.competition_id 
            AND participants.user_id = auth.uid()
            AND participants.role IN ('creator', 'admin')
        )
    );

-- RLS policies for participants
CREATE POLICY "Users can view participants in competitions they participate in" ON participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM participants p2
            WHERE p2.competition_id = participants.competition_id 
            AND p2.user_id = auth.uid()
        )
    );

CREATE POLICY "Competition creators and admins can manage participants" ON participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM participants p2
            WHERE p2.competition_id = participants.competition_id 
            AND p2.user_id = auth.uid()
            AND p2.role IN ('creator', 'admin')
        )
    );

-- RLS policies for user_event_types
CREATE POLICY "Users can view their own event types" ON user_event_types
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own event types" ON user_event_types
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own event types" ON user_event_types
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own event types" ON user_event_types
    FOR DELETE USING (user_id = auth.uid());

-- Helper functions for competition management

-- Function to get user's competitions
CREATE OR REPLACE FUNCTION get_user_competitions(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20),
  role VARCHAR(20),
  participant_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description,
    c.start_date,
    c.end_date,
    c.status,
    p.role,
    (SELECT COUNT(*) FROM participants WHERE competition_id = c.id AND status = 'accepted') as participant_count
  FROM competitions c
  JOIN participants p ON c.id = p.competition_id
  WHERE p.user_id = user_uuid
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get competition details with participant count
CREATE OR REPLACE FUNCTION get_competition_details(competition_uuid UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20),
  settings JSONB,
  metadata JSONB,
  participant_count BIGINT,
  event_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description,
    c.start_date,
    c.end_date,
    c.status,
    c.settings,
    c.metadata,
    (SELECT COUNT(*) FROM participants WHERE competition_id = c.id AND status = 'accepted') as participant_count,
    (SELECT COUNT(*) FROM events WHERE competition_id = c.id) as event_count
  FROM competitions c
  WHERE c.id = competition_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's event types
CREATE OR REPLACE FUNCTION get_user_event_types(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  description TEXT,
  category VARCHAR(50),
  usage_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uet.id,
    uet.name,
    uet.description,
    uet.category,
    uet.usage_count,
    uet.created_at
  FROM user_event_types uet
  WHERE uet.user_id = user_uuid
  ORDER BY uet.usage_count DESC, uet.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
