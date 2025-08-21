import { createServerClient } from '@/lib/supabase/config';
import { 
  UserEventType, 
  CreateEventTypeData, 
  UpdateEventTypeData, 
  EventTypeFilters,
  EventTypeListResponse,
  ValidationError,
  EventTypeCategory,
  EventTypeSuggestion
} from '@/types/competition';

export class EventTypeService {
  private supabase = createServerClient();

  // Predefined event type categories with popular types
  private readonly predefinedCategories: Record<EventTypeCategory, string[]> = {
    sports: [
      'Basketball',
      'Soccer',
      'Tennis',
      'Volleyball',
      'Baseball',
      'Football',
      'Swimming',
      'Track & Field',
      'Golf',
      'Hockey',
      'Cricket',
      'Rugby',
      'Badminton',
      'Table Tennis',
      'Ultimate Frisbee'
    ],
    outdoor: [
      'Hiking',
      'Rock Climbing',
      'Kayaking',
      'Cycling',
      'Running',
      'Camping',
      'Fishing',
      'Archery',
      'Paintball',
      'Zip Lining',
      'Mountain Biking',
      'Sailing',
      'Surfing',
      'Snowboarding',
      'Skiing'
    ],
    indoor: [
      'Chess',
      'Poker',
      'Board Games',
      'Darts',
      'Bowling',
      'Pool',
      'Table Tennis',
      'Indoor Climbing',
      'Escape Room',
      'Karaoke',
      'Dance Competition',
      'Cooking Challenge',
      'Art Contest',
      'Quiz Bowl',
      'Debate'
    ],
    creative: [
      'Photography Contest',
      'Art Exhibition',
      'Poetry Slam',
      'Music Performance',
      'Dance Showcase',
      'Film Festival',
      'Cooking Competition',
      'Fashion Show',
      'Craft Fair',
      'Writing Contest',
      'Design Challenge',
      'Comedy Night',
      'Talent Show',
      'Storytelling',
      'Improv'
    ],
    physical: [
      'Obstacle Course',
      'Fitness Challenge',
      'Yoga Competition',
      'Dance Battle',
      'Martial Arts',
      'Boxing Match',
      'Wrestling',
      'Gymnastics',
      'Parkour',
      'CrossFit Games',
      'Strongman Competition',
      'Endurance Race',
      'Relay Race',
      'Triathlon',
      'Iron Man'
    ],
    technical: [
      'Coding Challenge',
      'Hackathon',
      'Robotics Competition',
      'Science Fair',
      'Engineering Design',
      'Math Olympiad',
      'Physics Contest',
      'Chemistry Lab',
      'Computer Science',
      'Data Analysis',
      'AI Competition',
      'Cybersecurity',
      'Game Development',
      'Web Design',
      'Mobile App Development'
    ]
  };

  /**
   * Create a new custom event type
   */
  async createEventType(data: CreateEventTypeData, userId: string): Promise<UserEventType> {
    try {
      // Validate event type data
      const validationErrors = this.validateEventTypeData(data);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
      }

      // Check for duplicate event type name for this user
      const existingType = await this.getEventTypeByName(data.name, userId);
      if (existingType) {
        throw new Error('An event type with this name already exists');
      }

      // Prepare event type data
      const eventTypeData = {
        user_id: userId,
        name: data.name,
        description: data.description || null,
        category: data.category,
        usage_count: 0
      };

      // Insert event type
      const { data: eventType, error } = await this.supabase
        .from('user_event_types')
        .insert(eventTypeData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create event type: ${error.message}`);
      }

      return this.mapDatabaseEventType(eventType);
    } catch (error) {
      throw new Error(`Event type creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's event types
   */
  async getUserEventTypes(
    userId: string, 
    filters?: EventTypeFilters
  ): Promise<EventTypeListResponse> {
    try {
      let query = this.supabase
        .from('user_event_types')
        .select('*')
        .eq('user_id', userId);

      // Apply filters
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters?.minUsageCount) {
        query = query.gte('usage_count', filters.minUsageCount);
      }

      // Get total count
      const { count } = await this.supabase
        .from('user_event_types')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get event types with pagination
      const { data: eventTypes, error } = await query
        .order('usage_count', { ascending: false })
        .order('name', { ascending: true })
        .range(0, 49); // Default limit of 50

      if (error) {
        throw new Error(`Failed to fetch event types: ${error.message}`);
      }

      return {
        eventTypes: eventTypes.map(this.mapDatabaseEventType),
        total: count || 0,
        page: 1,
        limit: 50
      };
    } catch (error) {
      throw new Error(`Failed to get user event types: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get event type by ID
   */
  async getEventType(id: string, userId: string): Promise<UserEventType | null> {
    try {
      const { data: eventType, error } = await this.supabase
        .from('user_event_types')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch event type: ${error.message}`);
      }

      return this.mapDatabaseEventType(eventType);
    } catch (error) {
      throw new Error(`Failed to get event type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update event type
   */
  async updateEventType(
    id: string, 
    data: UpdateEventTypeData, 
    userId: string
  ): Promise<UserEventType> {
    try {
      // Check if event type exists and belongs to user
      const existingType = await this.getEventType(id, userId);
      if (!existingType) {
        throw new Error('Event type not found or access denied');
      }

      // Validate update data
      const validationErrors = this.validateUpdateData(data);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
      }

      // Check for name conflicts if name is being updated
      if (data.name && data.name !== existingType.name) {
        const duplicateType = await this.getEventTypeByName(data.name, userId);
        if (duplicateType) {
          throw new Error('An event type with this name already exists');
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.category) updateData.category = data.category;

      // Update event type
      const { data: eventType, error } = await this.supabase
        .from('user_event_types')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update event type: ${error.message}`);
      }

      return this.mapDatabaseEventType(eventType);
    } catch (error) {
      throw new Error(`Failed to update event type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete event type
   */
  async deleteEventType(id: string, userId: string): Promise<void> {
    try {
      // Check if event type exists and belongs to user
      const existingType = await this.getEventType(id, userId);
      if (!existingType) {
        throw new Error('Event type not found or access denied');
      }

      // Check if event type is in use
      if (existingType.usage_count > 0) {
        throw new Error('Cannot delete event type that is currently in use');
      }

      const { error } = await this.supabase
        .from('user_event_types')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to delete event type: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`Failed to delete event type: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get event type suggestions based on user's history and popular types
   */
  async getEventTypeSuggestions(
    userId: string, 
    searchTerm?: string,
    limit: number = 10
  ): Promise<EventTypeSuggestion[]> {
    try {
      const suggestions: EventTypeSuggestion[] = [];

      // Get user's frequently used event types
      const { data: userTypes, error: userError } = await this.supabase
        .from('user_event_types')
        .select('name, category, usage_count')
        .eq('user_id', userId)
        .gte('usage_count', 1)
        .order('usage_count', { ascending: false })
        .limit(5);

      if (!userError && userTypes) {
        userTypes.forEach(type => {
          suggestions.push({
            name: type.name,
            category: type.category,
            source: 'user_frequent',
            usageCount: type.usage_count
          });
        });
      }

      // Get popular predefined types that match search term
      if (searchTerm) {
        const matchingPredefined = this.getMatchingPredefinedTypes(searchTerm);
        matchingPredefined.forEach(type => {
          suggestions.push({
            name: type,
            category: this.getCategoryForPredefinedType(type),
            source: 'predefined',
            usageCount: 0
          });
        });
      } else {
        // Get popular predefined types from all categories
        Object.entries(this.predefinedCategories).forEach(([category, types]) => {
          types.slice(0, 2).forEach(type => {
            suggestions.push({
              name: type,
              category: category as EventTypeCategory,
              source: 'predefined',
              usageCount: 0
            });
          });
        });
      }

      // Remove duplicates and limit results
      const uniqueSuggestions = this.removeDuplicateSuggestions(suggestions);
      return uniqueSuggestions.slice(0, limit);
    } catch (error) {
      console.error('Failed to get event type suggestions:', error);
      return [];
    }
  }

  /**
   * Search event types across user types and predefined types
   */
  async searchEventTypes(
    userId: string, 
    searchTerm: string, 
    includePredefined: boolean = true
  ): Promise<EventTypeSuggestion[]> {
    try {
      const results: EventTypeSuggestion[] = [];

      // Search user's event types
      const { data: userTypes, error } = await this.supabase
        .from('user_event_types')
        .select('name, category, usage_count')
        .eq('user_id', userId)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('usage_count', { ascending: false });

      if (!error && userTypes) {
        userTypes.forEach(type => {
          results.push({
            name: type.name,
            category: type.category,
            source: 'user',
            usageCount: type.usage_count
          });
        });
      }

      // Search predefined types if requested
      if (includePredefined) {
        const matchingPredefined = this.getMatchingPredefinedTypes(searchTerm);
        matchingPredefined.forEach(type => {
          results.push({
            name: type,
            category: this.getCategoryForPredefinedType(type),
            source: 'predefined',
            usageCount: 0
          });
        });
      }

      // Remove duplicates and return results
      return this.removeDuplicateSuggestions(results);
    } catch (error) {
      console.error('Failed to search event types:', error);
      return [];
    }
  }

  /**
   * Get all predefined event types by category
   */
  getPredefinedEventTypes(category?: EventTypeCategory): Record<EventTypeCategory, string[]> | string[] {
    if (category) {
      return this.predefinedCategories[category] || [];
    }
    return this.predefinedCategories;
  }

  /**
   * Get available categories
   */
  getAvailableCategories(): EventTypeCategory[] {
    return Object.keys(this.predefinedCategories) as EventTypeCategory[];
  }

  /**
   * Increment usage count for an event type
   */
  async incrementUsageCount(eventTypeName: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_event_types')
        .update({ usage_count: this.supabase.sql`usage_count + 1` })
        .eq('user_id', userId)
        .eq('name', eventTypeName);

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows affected
        console.warn(`Failed to increment usage count for ${eventTypeName}: ${error.message}`);
      }
    } catch (error) {
      console.error(`Failed to increment usage count for ${eventTypeName}:`, error);
    }
  }

  /**
   * Get event type statistics for a user
   */
  async getEventTypeStats(userId: string): Promise<{
    totalTypes: number;
    totalUsage: number;
    mostUsed: UserEventType | null;
    categoryBreakdown: Record<EventTypeCategory, number>;
  }> {
    try {
      const { data: eventTypes, error } = await this.supabase
        .from('user_event_types')
        .select('name, category, usage_count')
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to get event type stats: ${error.message}`);
      }

      const totalTypes = eventTypes.length;
      const totalUsage = eventTypes.reduce((sum, type) => sum + type.usage_count, 0);
      
      const mostUsed = eventTypes.length > 0 
        ? eventTypes.reduce((max, type) => type.usage_count > max.usage_count ? type : max)
        : null;

      const categoryBreakdown = eventTypes.reduce((acc, type) => {
        acc[type.category] = (acc[type.category] || 0) + 1;
        return acc;
      }, {} as Record<EventTypeCategory, number>);

      return {
        totalTypes,
        totalUsage,
        mostUsed: mostUsed ? this.mapDatabaseEventType(mostUsed) : null,
        categoryBreakdown
      };
    } catch (error) {
      throw new Error(`Failed to get event type stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate event type data
   */
  private validateEventTypeData(data: CreateEventTypeData): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Event type name is required' });
    } else if (data.name.length > 255) {
      errors.push({ field: 'name', message: 'Event type name must be 255 characters or less' });
    }

    if (data.description && data.description.length > 1000) {
      errors.push({ field: 'description', message: 'Description must be 1000 characters or less' });
    }

    if (!data.category || !this.isValidCategory(data.category)) {
      errors.push({ field: 'category', message: 'Valid category is required' });
    }

    return errors;
  }

  /**
   * Validate update data
   */
  private validateUpdateData(data: UpdateEventTypeData): ValidationError[] {
    const errors: ValidationError[] = [];

    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        errors.push({ field: 'name', message: 'Event type name is required' });
      } else if (data.name.length > 255) {
        errors.push({ field: 'name', message: 'Event type name must be 255 characters or less' });
      }
    }

    if (data.description !== undefined && data.description && data.description.length > 1000) {
      errors.push({ field: 'description', message: 'Description must be 1000 characters or less' });
    }

    if (data.category !== undefined && !this.isValidCategory(data.category)) {
      errors.push({ field: 'category', message: 'Valid category is required' });
    }

    return errors;
  }

  /**
   * Validate category
   */
  private isValidCategory(category: string): boolean {
    return Object.keys(this.predefinedCategories).includes(category);
  }

  /**
   * Get event type by name for a user
   */
  private async getEventTypeByName(name: string, userId: string): Promise<UserEventType | null> {
    try {
      const { data: eventType, error } = await this.supabase
        .from('user_event_types')
        .select('*')
        .eq('user_id', userId)
        .eq('name', name)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to get event type: ${error.message}`);
      }

      return this.mapDatabaseEventType(eventType);
    } catch (error) {
      console.error('Failed to get event type by name:', error);
      return null;
    }
  }

  /**
   * Get matching predefined types for search term
   */
  private getMatchingPredefinedTypes(searchTerm: string): string[] {
    const matches: string[] = [];
    const lowerSearchTerm = searchTerm.toLowerCase();

    Object.values(this.predefinedCategories).flat().forEach(type => {
      if (type.toLowerCase().includes(lowerSearchTerm)) {
        matches.push(type);
      }
    });

    return matches;
  }

  /**
   * Get category for a predefined type
   */
  private getCategoryForPredefinedType(typeName: string): EventTypeCategory {
    for (const [category, types] of Object.entries(this.predefinedCategories)) {
      if (types.includes(typeName)) {
        return category as EventTypeCategory;
      }
    }
    return 'sports'; // Default fallback
  }

  /**
   * Remove duplicate suggestions
   */
  private removeDuplicateSuggestions(suggestions: EventTypeSuggestion[]): EventTypeSuggestion[] {
    const seen = new Set<string>();
    return suggestions.filter(suggestion => {
      const key = suggestion.name.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Map database event type to UserEventType interface
   */
  private mapDatabaseEventType(dbEventType: any): UserEventType {
    return {
      id: dbEventType.id,
      user_id: dbEventType.user_id,
      name: dbEventType.name,
      description: dbEventType.description,
      category: dbEventType.category,
      usage_count: dbEventType.usage_count,
      created_at: new Date(dbEventType.created_at)
    };
  }
}
