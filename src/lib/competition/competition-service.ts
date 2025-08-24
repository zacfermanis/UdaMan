import { SupabaseClient } from '@supabase/supabase-js';
import { 
  Competition, 
  CreateCompetitionData, 
  UpdateCompetitionData, 
  CompetitionFilters,
  CompetitionListResponse,
  CompetitionDetailsResponse,
  CompetitionError,
  ValidationError
} from '@/types/competition';

export class CompetitionService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new competition
   */
  async createCompetition(data: CreateCompetitionData, creatorId: string): Promise<Competition> {
    try {
      // Validate competition data
      const validationErrors = this.validateCompetitionData(data);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
      }

      // Check name uniqueness per creator
      const nameExists = await this.checkNameUniqueness(data.name, creatorId);
      if (nameExists) {
        throw new Error('A competition with this name already exists');
      }

      // Prepare competition data
      const competitionData = {
        creator_id: creatorId,
        name: data.name,
        description: data.description || null,
        start_date: data.start_date.toISOString(),
        end_date: data.end_date.toISOString(),
        status: 'draft' as const,
        settings: data.settings || {},
        metadata: {
          total_participants: 0,
          total_events: 0,
          current_round: 0,
          last_activity: new Date().toISOString()
        }
      };

      // Insert competition
      const { data: competition, error } = await this.supabase
        .from('competitions')
        .insert(competitionData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create competition: ${error.message}`);
      }

      // Add creator as participant with creator role
      await this.addCreatorAsParticipant(competition.id, creatorId);

      return this.mapDatabaseCompetition(competition);
    } catch (error) {
      throw new Error(`Competition creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get competition by ID
   */
  async getCompetition(id: string, userId: string): Promise<Competition> {
    try {
      const { data: competition, error } = await this.supabase
        .from('competitions')
        .select(`
          *,
          participants!inner(user_id)
        `)
        .eq('id', id)
        .eq('participants.user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Competition not found or access denied');
        }
        throw new Error(`Failed to fetch competition: ${error.message}`);
      }

      return this.mapDatabaseCompetition(competition);
    } catch (error) {
      throw new Error(`Failed to get competition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get competition details with related data
   */
  async getCompetitionDetails(id: string, userId: string): Promise<CompetitionDetailsResponse> {
    try {
      // Get competition with participants check
      const competition = await this.getCompetition(id, userId);

      // Get events
      const { data: events, error: eventsError } = await this.supabase
        .from('events')
        .select('*')
        .eq('competition_id', id)
        .order('scheduled_date', { ascending: true });

      if (eventsError) {
        throw new Error(`Failed to fetch events: ${eventsError.message}`);
      }

      // Get participants
      const { data: participants, error: participantsError } = await this.supabase
        .from('participants')
        .select(`
          *,
          users!inner(id, display_name, email, avatar_url)
        `)
        .eq('competition_id', id)
        .order('role', { ascending: true });

      if (participantsError) {
        throw new Error(`Failed to fetch participants: ${participantsError.message}`);
      }

      // Get user event types
      const { data: eventTypes, error: eventTypesError } = await this.supabase
        .from('user_event_types')
        .select('*')
        .eq('user_id', userId)
        .order('usage_count', { ascending: false });

      if (eventTypesError) {
        throw new Error(`Failed to fetch event types: ${eventTypesError.message}`);
      }

      return {
        competition,
        events: events.map(this.mapDatabaseEvent),
        participants: participants.map(this.mapDatabaseParticipant),
        event_types: eventTypes.map(this.mapDatabaseUserEventType)
      };
    } catch (error) {
      throw new Error(`Failed to get competition details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's competitions
   */
  async getUserCompetitions(userId: string, filters?: CompetitionFilters): Promise<CompetitionListResponse> {
    try {
      let query = this.supabase
        .from('competitions')
        .select(`
          *,
          participants!inner(user_id, role)
        `)
        .eq('participants.user_id', userId);

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.dateRange) {
        query = query
          .gte('start_date', filters.dateRange.start.toISOString())
          .lte('end_date', filters.dateRange.end.toISOString());
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Get total count
      const { count } = await this.supabase
        .from('competitions')
        .select('*', { count: 'exact', head: true })
        .eq('participants.user_id', userId);

      // Get competitions with pagination
      const { data: competitions, error } = await query
        .order('created_at', { ascending: false })
        .range(0, 49); // Default limit of 50

      if (error) {
        throw new Error(`Failed to fetch competitions: ${error.message}`);
      }

      return {
        competitions: competitions.map(this.mapDatabaseCompetition),
        total: count || 0,
        page: 1,
        limit: 50
      };
    } catch (error) {
      throw new Error(`Failed to get user competitions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update competition
   */
  async updateCompetition(id: string, data: UpdateCompetitionData, userId: string): Promise<Competition> {
    try {
      // Check if user has permission to update
      const canUpdate = await this.checkUpdatePermission(id, userId);
      if (!canUpdate) {
        throw new Error('You do not have permission to update this competition');
      }

      // Validate update data
      const validationErrors = this.validateUpdateData(data);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
      }

      // Check name uniqueness if name is being updated
      if (data.name) {
        const nameExists = await this.checkNameUniqueness(data.name, userId, id);
        if (nameExists) {
          throw new Error('A competition with this name already exists');
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.start_date) updateData.start_date = data.start_date.toISOString();
      if (data.end_date) updateData.end_date = data.end_date.toISOString();
      if (data.status) updateData.status = data.status;
      if (data.settings) updateData.settings = data.settings;

      // Update competition
      const { data: competition, error } = await this.supabase
        .from('competitions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update competition: ${error.message}`);
      }

      return this.mapDatabaseCompetition(competition);
    } catch (error) {
      throw new Error(`Failed to update competition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete competition
   */
  async deleteCompetition(id: string, userId: string): Promise<void> {
    try {
      // Check if user has permission to delete
      const canDelete = await this.checkDeletePermission(id, userId);
      if (!canDelete) {
        throw new Error('You do not have permission to delete this competition');
      }

      const { error } = await this.supabase
        .from('competitions')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete competition: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`Failed to delete competition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate competition data
   */
  private validateCompetitionData(data: CreateCompetitionData): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Competition name is required' });
    } else if (data.name.length > 255) {
      errors.push({ field: 'name', message: 'Competition name must be 255 characters or less' });
    }

    if (!data.start_date) {
      errors.push({ field: 'start_date', message: 'Start date is required' });
    }

    if (!data.end_date) {
      errors.push({ field: 'end_date', message: 'End date is required' });
    }

    if (data.start_date && data.end_date && data.start_date >= data.end_date) {
      errors.push({ field: 'end_date', message: 'End date must be after start date' });
    }

    if (data.start_date && data.start_date < new Date()) {
      errors.push({ field: 'start_date', message: 'Start date cannot be in the past' });
    }

    return errors;
  }

  /**
   * Validate update data
   */
  private validateUpdateData(data: UpdateCompetitionData): ValidationError[] {
    const errors: ValidationError[] = [];

    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        errors.push({ field: 'name', message: 'Competition name is required' });
      } else if (data.name.length > 255) {
        errors.push({ field: 'name', message: 'Competition name must be 255 characters or less' });
      }
    }

    if (data.start_date && data.end_date && data.start_date >= data.end_date) {
      errors.push({ field: 'end_date', message: 'End date must be after start date' });
    }

    return errors;
  }

  /**
   * Check name uniqueness per creator
   */
  private async checkNameUniqueness(name: string, creatorId: string, excludeId?: string): Promise<boolean> {
    let query = this.supabase
      .from('competitions')
      .select('id')
      .eq('creator_id', creatorId)
      .eq('name', name);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to check name uniqueness: ${error.message}`);
    }

    return data.length > 0;
  }

  /**
   * Add creator as participant
   */
  private async addCreatorAsParticipant(competitionId: string, creatorId: string): Promise<void> {
    const { error } = await this.supabase
      .from('participants')
      .insert({
        competition_id: competitionId,
        user_id: creatorId,
        role: 'creator',
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        permissions: {
          can_edit_competition: true,
          can_manage_events: true,
          can_manage_participants: true,
          can_enter_scores: true,
          can_view_leaderboard: true,
          can_send_messages: true
        }
      });

    if (error) {
      throw new Error(`Failed to add creator as participant: ${error.message}`);
    }
  }

  /**
   * Check update permission
   */
  private async checkUpdatePermission(competitionId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('participants')
      .select('role')
      .eq('competition_id', competitionId)
      .eq('user_id', userId)
      .in('role', ['creator', 'admin'])
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  }

  /**
   * Check delete permission
   */
  private async checkDeletePermission(competitionId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('participants')
      .select('role')
      .eq('competition_id', competitionId)
      .eq('user_id', userId)
      .eq('role', 'creator')
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  }

  /**
   * Get competition by ID (without user access check)
   */
  async getCompetitionById(competitionId: string): Promise<Competition | null> {
    try {
      const { data: competition, error } = await this.supabase
        .from('competitions')
        .select('*')
        .eq('id', competitionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch competition: ${error.message}`);
      }

      return this.mapDatabaseCompetition(competition);
    } catch (error) {
      throw new Error(`Failed to get competition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if user has access to competition
   */
  async userHasAccessToCompetition(
    userId: string, 
    competitionId: string, 
    requiredRole?: 'creator' | 'admin' | 'participant' | 'spectator'
  ): Promise<boolean> {
    try {
      let query = this.supabase
        .from('participants')
        .select('role')
        .eq('competition_id', competitionId)
        .eq('user_id', userId);

      if (requiredRole) {
        // Define role hierarchy
        const roleHierarchy = {
          'creator': ['creator'],
          'admin': ['creator', 'admin'],
          'participant': ['creator', 'admin', 'participant'],
          'spectator': ['creator', 'admin', 'participant', 'spectator']
        };

        const allowedRoles = roleHierarchy[requiredRole];
        query = query.in('role', allowedRoles);
      }

      const { data, error } = await query.single();

      if (error || !data) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking competition access:', error);
      return false;
    }
  }

  /**
   * Update competition
   */
  async updateCompetition(competitionId: string, data: Partial<UpdateCompetitionData>): Promise<Competition> {
    try {
      // Validate competition data
      const validationErrors = this.validateCompetitionData(data as CreateCompetitionData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
      }

      // Prepare update data
      const updateData: any = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.start_date !== undefined) updateData.start_date = data.start_date.toISOString();
      if (data.end_date !== undefined) updateData.end_date = data.end_date.toISOString();
      if (data.status !== undefined) updateData.status = data.status;
      if (data.settings !== undefined) updateData.settings = data.settings;
      if (data.metadata !== undefined) updateData.metadata = data.metadata;

      updateData.updated_at = new Date().toISOString();

      // Update competition
      const { data: competition, error } = await this.supabase
        .from('competitions')
        .update(updateData)
        .eq('id', competitionId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update competition: ${error.message}`);
      }

      return this.mapDatabaseCompetition(competition);
    } catch (error) {
      throw new Error(`Competition update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete competition
   */
  async deleteCompetition(competitionId: string): Promise<void> {
    try {
      // Delete related data first (participants, events)
      await this.supabase
        .from('participants')
        .delete()
        .eq('competition_id', competitionId);

      await this.supabase
        .from('events')
        .delete()
        .eq('competition_id', competitionId);

      // Delete competition
      const { error } = await this.supabase
        .from('competitions')
        .delete()
        .eq('id', competitionId);

      if (error) {
        throw new Error(`Failed to delete competition: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`Competition deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map database competition to Competition interface
   */
  private mapDatabaseCompetition(dbCompetition: any): Competition {
    return {
      id: dbCompetition.id,
      creator_id: dbCompetition.creator_id,
      name: dbCompetition.name,
      description: dbCompetition.description,
      start_date: new Date(dbCompetition.start_date),
      end_date: new Date(dbCompetition.end_date),
      status: dbCompetition.status,
      created_at: new Date(dbCompetition.created_at),
      updated_at: new Date(dbCompetition.updated_at),
      settings: dbCompetition.settings || {},
      metadata: dbCompetition.metadata || {}
    };
  }

  /**
   * Map database event to Event interface
   */
  private mapDatabaseEvent(dbEvent: any): any {
    return {
      id: dbEvent.id,
      competition_id: dbEvent.competition_id,
      name: dbEvent.name,
      description: dbEvent.description,
      event_type: dbEvent.event_type,
      location: dbEvent.location,
      scheduled_date: new Date(dbEvent.scheduled_date),
      duration_minutes: dbEvent.duration_minutes,
      max_participants: dbEvent.max_participants,
      rules: dbEvent.rules,
      requirements: dbEvent.requirements,
      scoring_config: dbEvent.scoring_config || {},
      status: dbEvent.status,
      created_at: new Date(dbEvent.created_at),
      updated_at: new Date(dbEvent.updated_at)
    };
  }

  /**
   * Map database participant to Participant interface
   */
  private mapDatabaseParticipant(dbParticipant: any): any {
    return {
      id: dbParticipant.id,
      competition_id: dbParticipant.competition_id,
      user_id: dbParticipant.user_id,
      role: dbParticipant.role,
      status: dbParticipant.status,
      invited_at: new Date(dbParticipant.invited_at),
      accepted_at: dbParticipant.accepted_at ? new Date(dbParticipant.accepted_at) : undefined,
      declined_at: dbParticipant.declined_at ? new Date(dbParticipant.declined_at) : undefined,
      permissions: dbParticipant.permissions || {}
    };
  }

  /**
   * Map database user event type to UserEventType interface
   */
  private mapDatabaseUserEventType(dbEventType: any): any {
    return {
      id: dbEventType.id,
      user_id: dbEventType.user_id,
      name: dbEventType.name,
      description: dbEventType.description,
      category: dbEventType.category,
      created_at: new Date(dbEventType.created_at),
      usage_count: dbEventType.usage_count
    };
  }
}
