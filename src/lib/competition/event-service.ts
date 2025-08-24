import { SupabaseClient } from '@supabase/supabase-js';
import { 
  Event, 
  CreateEventData, 
  UpdateEventData, 
  EventFilters,
  EventListResponse,
  ValidationError,
  EventLocation,
  ScoringConfig
} from '@/types/competition';

export class EventService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new event
   */
  async createEvent(data: CreateEventData, competitionId: string, userId: string): Promise<Event> {
    try {
      // Check if user has permission to create events
      const canCreate = await this.checkEventCreatePermission(competitionId, userId);
      if (!canCreate) {
        throw new Error('You do not have permission to create events in this competition');
      }

      // Validate event data
      const validationErrors = this.validateEventData(data);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
      }

      // Check for scheduling conflicts
      const hasConflict = await this.checkSchedulingConflict(competitionId, data.scheduled_date, data.duration_minutes);
      if (hasConflict) {
        throw new Error('This event conflicts with an existing event schedule');
      }

      // Prepare event data
      const eventData = {
        competition_id: competitionId,
        name: data.name,
        description: data.description || null,
        event_type: data.event_type,
        location: data.location,
        scheduled_date: data.scheduled_date.toISOString(),
        duration_minutes: data.duration_minutes,
        max_participants: data.max_participants || null,
        rules: data.rules || null,
        requirements: data.requirements || null,
        scoring_config: data.scoring_config || this.getDefaultScoringConfig(),
        status: 'scheduled' as const
      };

      // Insert event
      const { data: event, error } = await this.supabase
        .from('events')
        .insert(eventData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create event: ${error.message}`);
      }

      // Update event type usage count
      await this.updateEventTypeUsage(data.event_type, userId);

      return this.mapDatabaseEvent(event);
    } catch (error) {
      throw new Error(`Event creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get event by ID
   */
  async getEvent(id: string, userId: string): Promise<Event> {
    try {
      const { data: event, error } = await this.supabase
        .from('events')
        .select(`
          *,
          competitions!inner(
            participants!inner(user_id)
          )
        `)
        .eq('id', id)
        .eq('competitions.participants.user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Event not found or access denied');
        }
        throw new Error(`Failed to fetch event: ${error.message}`);
      }

      return this.mapDatabaseEvent(event);
    } catch (error) {
      throw new Error(`Failed to get event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get event by ID (alias for getEvent for consistency)
   */
  async getEventById(id: string, userId?: string): Promise<Event> {
    try {
      // If userId is provided, use the secure getEvent method
      if (userId) {
        return await this.getEvent(id, userId);
      }

      // Otherwise, fetch without user validation (for admin/internal use)
      const { data: event, error } = await this.supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Event not found');
        }
        throw new Error(`Failed to fetch event: ${error.message}`);
      }

      return this.mapDatabaseEvent(event);
    } catch (error) {
      throw new Error(`Failed to get event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get events for a competition
   */
  async getCompetitionEvents(competitionId: string, userId: string, filters?: EventFilters): Promise<EventListResponse> {
    try {
      // Check if user has access to competition
      const hasAccess = await this.checkCompetitionAccess(competitionId, userId);
      if (!hasAccess) {
        throw new Error('You do not have access to this competition');
      }

      let query = this.supabase
        .from('events')
        .select('*')
        .eq('competition_id', competitionId);

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.event_type) {
        query = query.eq('event_type', filters.event_type);
      }

      if (filters?.dateRange) {
        query = query
          .gte('scheduled_date', filters.dateRange.start.toISOString())
          .lte('scheduled_date', filters.dateRange.end.toISOString());
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Get total count
      const { count } = await this.supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('competition_id', competitionId);

      // Get events with pagination
      const { data: events, error } = await query
        .order('scheduled_date', { ascending: true })
        .range(0, 49); // Default limit of 50

      if (error) {
        throw new Error(`Failed to fetch events: ${error.message}`);
      }

      return {
        events: events.map(this.mapDatabaseEvent),
        total: count || 0,
        page: 1,
        limit: 50
      };
    } catch (error) {
      throw new Error(`Failed to get competition events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update event
   */
  async updateEvent(id: string, data: UpdateEventData, userId: string): Promise<Event> {
    try {
      // Check if user has permission to update events
      const canUpdate = await this.checkEventUpdatePermission(id, userId);
      if (!canUpdate) {
        throw new Error('You do not have permission to update this event');
      }

      // Validate update data
      const validationErrors = this.validateUpdateData(data);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
      }

      // Check for scheduling conflicts if date/time is being updated
      if (data.scheduled_date || data.duration_minutes) {
        const currentEvent = await this.getEvent(id, userId);
        const newDate = data.scheduled_date || currentEvent.scheduled_date;
        const newDuration = data.duration_minutes || currentEvent.duration_minutes;
        
        const hasConflict = await this.checkSchedulingConflict(
          currentEvent.competition_id, 
          newDate, 
          newDuration, 
          id
        );
        if (hasConflict) {
          throw new Error('This event conflicts with an existing event schedule');
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.event_type) updateData.event_type = data.event_type;
      if (data.location) updateData.location = data.location;
      if (data.scheduled_date) updateData.scheduled_date = data.scheduled_date.toISOString();
      if (data.duration_minutes) updateData.duration_minutes = data.duration_minutes;
      if (data.max_participants !== undefined) updateData.max_participants = data.max_participants;
      if (data.rules !== undefined) updateData.rules = data.rules;
      if (data.requirements !== undefined) updateData.requirements = data.requirements;
      if (data.scoring_config) updateData.scoring_config = data.scoring_config;
      if (data.status) updateData.status = data.status;

      // Update event
      const { data: event, error } = await this.supabase
        .from('events')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update event: ${error.message}`);
      }

      return this.mapDatabaseEvent(event);
    } catch (error) {
      throw new Error(`Failed to update event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete event
   */
  async deleteEvent(id: string, userId: string): Promise<void> {
    try {
      // Check if user has permission to delete events
      const canDelete = await this.checkEventDeletePermission(id, userId);
      if (!canDelete) {
        throw new Error('You do not have permission to delete this event');
      }

      const { error } = await this.supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete event: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update event status
   */
  async updateEventStatus(id: string, status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled', userId: string): Promise<Event> {
    try {
      // Check if user has permission to update events
      const canUpdate = await this.checkEventUpdatePermission(id, userId);
      if (!canUpdate) {
        throw new Error('You do not have permission to update this event');
      }

      const { data: event, error } = await this.supabase
        .from('events')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update event status: ${error.message}`);
      }

      return this.mapDatabaseEvent(event);
    } catch (error) {
      throw new Error(`Failed to update event status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reorder events
   */
  async reorderEvents(competitionId: string, eventIds: string[], userId: string): Promise<void> {
    try {
      // Check if user has permission to manage events
      const canManage = await this.checkEventManagePermission(competitionId, userId);
      if (!canManage) {
        throw new Error('You do not have permission to reorder events in this competition');
      }

      // Update event order (this would require an order field in the database)
      // For now, we'll update the scheduled_date to reflect the new order
      const now = new Date();
      for (let i = 0; i < eventIds.length; i++) {
        const scheduledDate = new Date(now.getTime() + i * 60000); // 1 minute apart
        
        const { error } = await this.supabase
          .from('events')
          .update({ scheduled_date: scheduledDate.toISOString() })
          .eq('id', eventIds[i])
          .eq('competition_id', competitionId);

        if (error) {
          throw new Error(`Failed to reorder event ${eventIds[i]}: ${error.message}`);
        }
      }
    } catch (error) {
      throw new Error(`Failed to reorder events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate event data
   */
  private validateEventData(data: CreateEventData): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Event name is required' });
    } else if (data.name.length > 255) {
      errors.push({ field: 'name', message: 'Event name must be 255 characters or less' });
    }

    if (!data.event_type || data.event_type.trim().length === 0) {
      errors.push({ field: 'event_type', message: 'Event type is required' });
    }

    if (!data.scheduled_date) {
      errors.push({ field: 'scheduled_date', message: 'Scheduled date is required' });
    } else if (data.scheduled_date < new Date()) {
      errors.push({ field: 'scheduled_date', message: 'Scheduled date cannot be in the past' });
    }

    if (!data.duration_minutes || data.duration_minutes <= 0) {
      errors.push({ field: 'duration_minutes', message: 'Duration must be greater than 0' });
    } else if (data.duration_minutes > 1440) { // 24 hours
      errors.push({ field: 'duration_minutes', message: 'Duration cannot exceed 24 hours' });
    }

    if (data.max_participants && data.max_participants <= 0) {
      errors.push({ field: 'max_participants', message: 'Max participants must be greater than 0' });
    }

    if (!this.validateLocation(data.location)) {
      errors.push({ field: 'location', message: 'Valid location information is required' });
    }

    return errors;
  }

  /**
   * Validate update data
   */
  private validateUpdateData(data: UpdateEventData): ValidationError[] {
    const errors: ValidationError[] = [];

    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        errors.push({ field: 'name', message: 'Event name is required' });
      } else if (data.name.length > 255) {
        errors.push({ field: 'name', message: 'Event name must be 255 characters or less' });
      }
    }

    if (data.event_type !== undefined) {
      if (!data.event_type || data.event_type.trim().length === 0) {
        errors.push({ field: 'event_type', message: 'Event type is required' });
      }
    }

    if (data.scheduled_date && data.scheduled_date < new Date()) {
      errors.push({ field: 'scheduled_date', message: 'Scheduled date cannot be in the past' });
    }

    if (data.duration_minutes !== undefined) {
      if (data.duration_minutes <= 0) {
        errors.push({ field: 'duration_minutes', message: 'Duration must be greater than 0' });
      } else if (data.duration_minutes > 1440) {
        errors.push({ field: 'duration_minutes', message: 'Duration cannot exceed 24 hours' });
      }
    }

    if (data.max_participants !== undefined && data.max_participants <= 0) {
      errors.push({ field: 'max_participants', message: 'Max participants must be greater than 0' });
    }

    if (data.location && !this.validateLocation(data.location)) {
      errors.push({ field: 'location', message: 'Valid location information is required' });
    }

    return errors;
  }

  /**
   * Validate location data
   */
  private validateLocation(location: EventLocation): boolean {
    return !!(location.address && location.city && location.state && location.zip_code && location.country);
  }

  /**
   * Check for scheduling conflicts
   */
  private async checkSchedulingConflict(
    competitionId: string, 
    scheduledDate: Date, 
    durationMinutes: number, 
    excludeEventId?: string
  ): Promise<boolean> {
    const startTime = scheduledDate;
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    let query = this.supabase
      .from('events')
      .select('id, scheduled_date, duration_minutes')
      .eq('competition_id', competitionId)
      .neq('status', 'cancelled');

    if (excludeEventId) {
      query = query.neq('id', excludeEventId);
    }

    const { data: events, error } = await query;

    if (error) {
      throw new Error(`Failed to check scheduling conflicts: ${error.message}`);
    }

    return events.some(event => {
      const eventStart = new Date(event.scheduled_date);
      const eventEnd = new Date(eventStart.getTime() + event.duration_minutes * 60000);

      // Check for overlap
      return (startTime < eventEnd && endTime > eventStart);
    });
  }

  /**
   * Update event type usage count
   */
  private async updateEventTypeUsage(eventType: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_event_types')
      .update({ usage_count: this.supabase.sql`usage_count + 1` })
      .eq('user_id', userId)
      .eq('name', eventType);

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows affected
      console.warn(`Failed to update event type usage: ${error.message}`);
    }
  }

  /**
   * Get default scoring configuration
   */
  private getDefaultScoringConfig(): ScoringConfig {
    return {
      type: 'position_based',
      rules: {
        winner_gets_n_points: true,
        tie_breaker: 'total_points'
      },
      tie_breaker: 'total_points'
    };
  }

  /**
   * Check if user can create events in competition
   */
  private async checkEventCreatePermission(competitionId: string, userId: string): Promise<boolean> {
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
   * Check if user can update events
   */
  private async checkEventUpdatePermission(eventId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('events')
      .select(`
        competition_id,
        participants!inner(user_id, role)
      `)
      .eq('id', eventId)
      .eq('participants.user_id', userId)
      .in('participants.role', ['creator', 'admin'])
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  }

  /**
   * Check if user can delete events
   */
  private async checkEventDeletePermission(eventId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('events')
      .select(`
        competition_id,
        participants!inner(user_id, role)
      `)
      .eq('id', eventId)
      .eq('participants.user_id', userId)
      .in('participants.role', ['creator', 'admin'])
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  }

  /**
   * Check if user can manage events in competition
   */
  private async checkEventManagePermission(competitionId: string, userId: string): Promise<boolean> {
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
   * Check if user has access to competition
   */
  private async checkCompetitionAccess(competitionId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('participants')
      .select('id')
      .eq('competition_id', competitionId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  }

  /**
   * Update event order for a competition
   */
  async updateEventOrder(competitionId: string, eventIds: string[], userId: string): Promise<void> {
    try {
      // Check if user has permission to manage events
      const canManage = await this.checkEventManagePermission(competitionId, userId);
      if (!canManage) {
        throw new Error('You do not have permission to reorder events in this competition');
      }

      // Validate that all events belong to the competition
      const { data: events, error: fetchError } = await this.supabase
        .from('events')
        .select('id')
        .eq('competition_id', competitionId)
        .in('id', eventIds);

      if (fetchError) {
        throw new Error(`Failed to fetch events: ${fetchError.message}`);
      }

      if (events.length !== eventIds.length) {
        throw new Error('Some events do not belong to this competition');
      }

      // Update event order using a transaction
      const { error: updateError } = await this.supabase.rpc('update_event_order', {
        p_competition_id: competitionId,
        p_event_ids: eventIds
      });

      if (updateError) {
        throw new Error(`Failed to update event order: ${updateError.message}`);
      }
    } catch (error) {
      throw new Error(`Event order update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map database event to Event interface
   */
  private mapDatabaseEvent(dbEvent: any): Event {
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
      scoring_config: dbEvent.scoring_config || this.getDefaultScoringConfig(),
      status: dbEvent.status,
      created_at: new Date(dbEvent.created_at),
      updated_at: new Date(dbEvent.updated_at)
    };
  }
}
