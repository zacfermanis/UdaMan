// Competition Management Types
// Based on database schema and design specifications

export interface Competition {
  id: string;
  creator_id: string;
  name: string;
  description?: string;
  start_date: Date;
  end_date: Date;
  status: CompetitionStatus;
  created_at: Date;
  updated_at: Date;
  settings: CompetitionSettings;
  metadata: CompetitionMetadata;
}

export type CompetitionStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export interface CompetitionSettings {
  allow_spectators?: boolean;
  public_leaderboard?: boolean;
  auto_start_events?: boolean;
  tie_breaking_rules?: string;
  scoring_system?: 'position_based' | 'custom';
}

export interface CompetitionMetadata {
  total_participants?: number;
  total_events?: number;
  current_round?: number;
  last_activity?: Date;
}

export interface Event {
  id: string;
  competition_id: string;
  name: string;
  description?: string;
  event_type: string;
  location: EventLocation;
  scheduled_date: Date;
  duration_minutes: number;
  max_participants?: number;
  rules?: string;
  requirements?: string;
  scoring_config: ScoringConfig;
  status: EventStatus;
  created_at: Date;
  updated_at: Date;
}

export type EventStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface EventLocation {
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  coordinates?: { lat: number; lng: number };
}

export interface ScoringConfig {
  type: 'position_based' | 'points_based' | 'time_based';
  rules: Record<string, any>;
  tie_breaker?: string;
}

export interface Participant {
  id: string;
  competition_id: string;
  user_id: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  invited_at: Date;
  accepted_at?: Date;
  declined_at?: Date;
  permissions: ParticipantPermissions;
}

export type ParticipantRole = 'creator' | 'admin' | 'participant' | 'spectator';
export type ParticipantStatus = 'invited' | 'accepted' | 'declined' | 'pending';

export interface ParticipantPermissions {
  can_edit_competition?: boolean;
  can_manage_events?: boolean;
  can_manage_participants?: boolean;
  can_enter_scores?: boolean;
  can_view_leaderboard?: boolean;
  can_send_messages?: boolean;
}

export interface UserEventType {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  category: string;
  created_at: Date;
  usage_count: number;
}

// Form and API Types
export interface CreateCompetitionData {
  name: string;
  description?: string;
  start_date: Date;
  end_date: Date;
  settings?: CompetitionSettings;
}

export interface UpdateCompetitionData {
  name?: string;
  description?: string;
  start_date?: Date;
  end_date?: Date;
  status?: CompetitionStatus;
  settings?: CompetitionSettings;
}

export interface CreateEventData {
  name: string;
  description?: string;
  event_type: string;
  location: EventLocation;
  scheduled_date: Date;
  duration_minutes: number;
  max_participants?: number;
  rules?: string;
  requirements?: string;
  scoring_config?: ScoringConfig;
}

export interface UpdateEventData {
  name?: string;
  description?: string;
  event_type?: string;
  location?: EventLocation;
  scheduled_date?: Date;
  duration_minutes?: number;
  max_participants?: number;
  rules?: string;
  requirements?: string;
  scoring_config?: ScoringConfig;
  status?: EventStatus;
}

export interface InviteParticipantData {
  email: string;
  role?: ParticipantRole;
  custom_message?: string;
}

// API Response Types
export interface CompetitionListResponse {
  competitions: Competition[];
  total: number;
  page: number;
  limit: number;
}

export interface CompetitionDetailsResponse {
  competition: Competition;
  events: Event[];
  participants: Participant[];
  event_types: UserEventType[];
}

export interface EventListResponse {
  events: Event[];
  total: number;
  page: number;
  limit: number;
}

export interface ParticipantListResponse {
  participants: Participant[];
  total: number;
  page: number;
  limit: number;
}

// Error Types
export interface CompetitionError {
  code: string;
  message: string;
  field?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Permission Types
export interface PermissionCheck {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageParticipants: boolean;
  canManageEvents: boolean;
  canEnterScores: boolean;
  canViewLeaderboard: boolean;
}

// Filter and Search Types
export interface CompetitionFilters {
  status?: CompetitionStatus[];
  dateRange?: { start: Date; end: Date };
  creator_id?: string;
  search?: string;
}

export interface EventFilters {
  status?: EventStatus[];
  event_type?: string;
  dateRange?: { start: Date; end: Date };
  search?: string;
}

export interface ParticipantFilters {
  role?: ParticipantRole[];
  status?: ParticipantStatus[];
  search?: string;
}
