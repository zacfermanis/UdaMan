import { SupabaseClient } from '@supabase/supabase-js';
import { EmailService } from '@/lib/email/service';
import { 
  Participant, 
  InviteParticipantData, 
  ParticipantFilters,
  ParticipantListResponse,
  ValidationError,
  ParticipantRole,
  ParticipantStatus
} from '@/types/competition';

export class ParticipantService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Invite participants to a competition
   */
  async inviteParticipants(
    competitionId: string, 
    invitations: InviteParticipantData[], 
    inviterId: string
  ): Promise<Participant[]> {
    try {
      // Check if user has permission to invite participants
      const canInvite = await this.checkInvitePermission(competitionId, inviterId);
      if (!canInvite) {
        throw new Error('You do not have permission to invite participants to this competition');
      }

      // Validate invitations
      const validationErrors = this.validateInvitations(invitations);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
      }

      // Get competition details for email
      const competition = await this.getCompetitionDetails(competitionId);
      if (!competition) {
        throw new Error('Competition not found');
      }

      const invitedParticipants: Participant[] = [];

      // Process each invitation
      for (const invitation of invitations) {
        try {
          // Check if user already exists
          const existingUser = await this.findUserByEmail(invitation.email);
          
          if (existingUser) {
            // User exists - check if already a participant
            const existingParticipant = await this.getParticipantByUserId(competitionId, existingUser.id);
            
            if (existingParticipant) {
              // Already a participant - skip or update role
              if (invitation.role && invitation.role !== existingParticipant.role) {
                const updatedParticipant = await this.updateParticipantRole(
                  existingParticipant.id, 
                  invitation.role, 
                  inviterId
                );
                invitedParticipants.push(updatedParticipant);
              } else {
                invitedParticipants.push(existingParticipant);
              }
              continue;
            }

            // User exists but not a participant - add them
            const participant = await this.addExistingUserAsParticipant(
              competitionId, 
              existingUser.id, 
              invitation.role || 'participant',
              inviterId
            );
            invitedParticipants.push(participant);
          } else {
            // User doesn't exist - create invitation record
            const participant = await this.createInvitationRecord(
              competitionId, 
              invitation, 
              inviterId
            );
            invitedParticipants.push(participant);
          }

          // Send invitation email
          await this.sendInvitationEmail(
            invitation.email,
            competition,
            invitation.role || 'participant',
            invitation.custom_message
          );

        } catch (error) {
          console.error(`Failed to process invitation for ${invitation.email}:`, error);
          // Continue with other invitations even if one fails
        }
      }

      return invitedParticipants;
    } catch (error) {
      throw new Error(`Failed to invite participants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get participants for a competition
   */
  async getCompetitionParticipants(
    competitionId: string, 
    userId: string, 
    filters?: ParticipantFilters
  ): Promise<ParticipantListResponse> {
    try {
      // Check if user has access to competition
      const hasAccess = await this.checkCompetitionAccess(competitionId, userId);
      if (!hasAccess) {
        throw new Error('You do not have access to this competition');
      }

      let query = this.supabase
        .from('participants')
        .select(`
          *,
          users!inner(id, display_name, email, avatar_url)
        `)
        .eq('competition_id', competitionId);

      // Apply filters
      if (filters?.role && filters.role.length > 0) {
        query = query.in('role', filters.role);
      }

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.search) {
        query = query.or(`users.display_name.ilike.%${filters.search}%,users.email.ilike.%${filters.search}%`);
      }

      // Get total count
      const { count } = await this.supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('competition_id', competitionId);

      // Get participants with pagination
      const { data: participants, error } = await query
        .order('role', { ascending: true })
        .order('users.display_name', { ascending: true })
        .range(0, 49); // Default limit of 50

      if (error) {
        throw new Error(`Failed to fetch participants: ${error.message}`);
      }

      return {
        participants: participants.map(this.mapDatabaseParticipant),
        total: count || 0,
        page: 1,
        limit: 50
      };
    } catch (error) {
      throw new Error(`Failed to get competition participants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update participant role
   */
  async updateParticipantRole(
    participantId: string, 
    newRole: ParticipantRole, 
    updaterId: string
  ): Promise<Participant> {
    try {
      // Check if user has permission to update roles
      const canUpdate = await this.checkRoleUpdatePermission(participantId, updaterId);
      if (!canUpdate) {
        throw new Error('You do not have permission to update participant roles');
      }

      // Validate role change
      const validationError = this.validateRoleChange(participantId, newRole);
      if (validationError) {
        throw new Error(validationError);
      }

      // Update participant role
      const { data: participant, error } = await this.supabase
        .from('participants')
        .update({ 
          role: newRole,
          permissions: this.getDefaultPermissionsForRole(newRole)
        })
        .eq('id', participantId)
        .select(`
          *,
          users!inner(id, display_name, email, avatar_url)
        `)
        .single();

      if (error) {
        throw new Error(`Failed to update participant role: ${error.message}`);
      }

      return this.mapDatabaseParticipant(participant);
    } catch (error) {
      throw new Error(`Failed to update participant role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(competitionId: string, userId: string): Promise<Participant> {
    try {
      const { data: participant, error } = await this.supabase
        .from('participants')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('competition_id', competitionId)
        .eq('user_id', userId)
        .eq('status', 'invited')
        .select(`
          *,
          users!inner(id, display_name, email, avatar_url)
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('No pending invitation found for this competition');
        }
        throw new Error(`Failed to accept invitation: ${error.message}`);
      }

      return this.mapDatabaseParticipant(participant);
    } catch (error) {
      throw new Error(`Failed to accept invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decline invitation
   */
  async declineInvitation(competitionId: string, userId: string): Promise<Participant> {
    try {
      const { data: participant, error } = await this.supabase
        .from('participants')
        .update({ 
          status: 'declined',
          declined_at: new Date().toISOString()
        })
        .eq('competition_id', competitionId)
        .eq('user_id', userId)
        .eq('status', 'invited')
        .select(`
          *,
          users!inner(id, display_name, email, avatar_url)
        `)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('No pending invitation found for this competition');
        }
        throw new Error(`Failed to decline invitation: ${error.message}`);
      }

      return this.mapDatabaseParticipant(participant);
    } catch (error) {
      throw new Error(`Failed to decline invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove participant from competition
   */
  async removeParticipant(participantId: string, removerId: string): Promise<void> {
    try {
      // Check if user has permission to remove participants
      const canRemove = await this.checkRemovePermission(participantId, removerId);
      if (!canRemove) {
        throw new Error('You do not have permission to remove participants');
      }

      const { error } = await this.supabase
        .from('participants')
        .delete()
        .eq('id', participantId);

      if (error) {
        throw new Error(`Failed to remove participant: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`Failed to remove participant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resend invitation
   */
  async resendInvitation(participantId: string, resenderId: string): Promise<void> {
    try {
      // Check if user has permission to resend invitations
      const canResend = await this.checkInvitePermission(participantId, resenderId);
      if (!canResend) {
        throw new Error('You do not have permission to resend invitations');
      }

      // Get participant details
      const { data: participant, error } = await this.supabase
        .from('participants')
        .select(`
          *,
          competitions!inner(name, description),
          users!inner(email, display_name)
        `)
        .eq('id', participantId)
        .eq('status', 'invited')
        .single();

      if (error) {
        throw new Error(`Failed to get participant details: ${error.message}`);
      }

      // Send invitation email
      await this.sendInvitationEmail(
        participant.users.email,
        {
          id: participant.competition_id,
          name: participant.competitions.name,
          description: participant.competitions.description
        },
        participant.role,
        undefined // No custom message for resend
      );
    } catch (error) {
      throw new Error(`Failed to resend invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get participant by user ID
   */
  async getParticipantByUserId(competitionId: string, userId: string): Promise<Participant | null> {
    try {
      const { data: participant, error } = await this.supabase
        .from('participants')
        .select(`
          *,
          users!inner(id, display_name, email, avatar_url)
        `)
        .eq('competition_id', competitionId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to get participant: ${error.message}`);
      }

      return this.mapDatabaseParticipant(participant);
    } catch (error) {
      throw new Error(`Failed to get participant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate invitations
   */
  private validateInvitations(invitations: InviteParticipantData[]): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!invitations || invitations.length === 0) {
      errors.push({ field: 'invitations', message: 'At least one invitation is required' });
      return errors;
    }

    // Check for duplicate emails
    const emails = invitations.map(inv => inv.email.toLowerCase());
    const uniqueEmails = new Set(emails);
    if (emails.length !== uniqueEmails.size) {
      errors.push({ field: 'invitations', message: 'Duplicate email addresses are not allowed' });
    }

    // Validate each invitation
    invitations.forEach((invitation, index) => {
      if (!invitation.email || !this.isValidEmail(invitation.email)) {
        errors.push({ field: `invitations[${index}].email`, message: 'Valid email address is required' });
      }

      if (invitation.role && !['creator', 'admin', 'participant', 'spectator'].includes(invitation.role)) {
        errors.push({ field: `invitations[${index}].role`, message: 'Invalid role specified' });
      }
    });

    return errors;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Find user by email
   */
  private async findUserByEmail(email: string): Promise<any | null> {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, email, display_name')
      .eq('email', email.toLowerCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find user: ${error.message}`);
    }

    return user;
  }

  /**
   * Add existing user as participant
   */
  private async addExistingUserAsParticipant(
    competitionId: string, 
    userId: string, 
    role: ParticipantRole, 
    inviterId: string
  ): Promise<Participant> {
    const { data: participant, error } = await this.supabase
      .from('participants')
      .insert({
        competition_id: competitionId,
        user_id: userId,
        role,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        permissions: this.getDefaultPermissionsForRole(role)
      })
      .select(`
        *,
        users!inner(id, display_name, email, avatar_url)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to add user as participant: ${error.message}`);
    }

    return this.mapDatabaseParticipant(participant);
  }

  /**
   * Create invitation record for non-existent user
   */
  private async createInvitationRecord(
    competitionId: string, 
    invitation: InviteParticipantData, 
    inviterId: string
  ): Promise<Participant> {
    const { data: participant, error } = await this.supabase
      .from('participants')
      .insert({
        competition_id: competitionId,
        user_id: null, // Will be set when user registers
        role: invitation.role || 'participant',
        status: 'invited',
        permissions: this.getDefaultPermissionsForRole(invitation.role || 'participant')
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create invitation record: ${error.message}`);
    }

    // Create a mock participant object for non-existent users
    return {
      id: participant.id,
      competition_id: participant.competition_id,
      user_id: null,
      role: participant.role,
      status: participant.status,
      invited_at: new Date(participant.invited_at),
      accepted_at: participant.accepted_at ? new Date(participant.accepted_at) : undefined,
      declined_at: participant.declined_at ? new Date(participant.declined_at) : undefined,
      permissions: participant.permissions || {}
    } as Participant;
  }

  /**
   * Send invitation email
   */
  private async sendInvitationEmail(
    email: string, 
    competition: any, 
    role: ParticipantRole, 
    customMessage?: string
  ): Promise<void> {
    try {
      await EmailService.sendCompetitionInvitation({
        to: email,
        competitionName: competition.name,
        competitionDescription: competition.description,
        role,
        customMessage,
        invitationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/competitions/${competition.id}/join`
      });
    } catch (error) {
      console.error(`Failed to send invitation email to ${email}:`, error);
      // Don't throw error - invitation record is still created
    }
  }

  /**
   * Get competition details
   */
  private async getCompetitionDetails(competitionId: string): Promise<any | null> {
    const { data: competition, error } = await this.supabase
      .from('competitions')
      .select('id, name, description')
      .eq('id', competitionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get competition details: ${error.message}`);
    }

    return competition;
  }

  /**
   * Get default permissions for role
   */
  private getDefaultPermissionsForRole(role: ParticipantRole): any {
    switch (role) {
      case 'creator':
        return {
          can_edit_competition: true,
          can_manage_events: true,
          can_manage_participants: true,
          can_enter_scores: true,
          can_view_leaderboard: true,
          can_send_messages: true
        };
      case 'admin':
        return {
          can_edit_competition: false,
          can_manage_events: true,
          can_manage_participants: true,
          can_enter_scores: true,
          can_view_leaderboard: true,
          can_send_messages: true
        };
      case 'participant':
        return {
          can_edit_competition: false,
          can_manage_events: false,
          can_manage_participants: false,
          can_enter_scores: false,
          can_view_leaderboard: true,
          can_send_messages: true
        };
      case 'spectator':
        return {
          can_edit_competition: false,
          can_manage_events: false,
          can_manage_participants: false,
          can_enter_scores: false,
          can_view_leaderboard: true,
          can_send_messages: false
        };
      default:
        return {};
    }
  }

  /**
   * Validate role change
   */
  private async validateRoleChange(participantId: string, newRole: ParticipantRole): Promise<string | null> {
    // Get current participant
    const { data: participant, error } = await this.supabase
      .from('participants')
      .select('role, user_id')
      .eq('id', participantId)
      .single();

    if (error) {
      return 'Participant not found';
    }

    // Prevent changing creator role
    if (participant.role === 'creator') {
      return 'Cannot change the role of the competition creator';
    }

    // Prevent changing to creator role (only one creator allowed)
    if (newRole === 'creator') {
      return 'Cannot assign creator role to participants';
    }

    return null;
  }

  /**
   * Check if user has permission to invite participants
   */
  private async checkInvitePermission(competitionId: string, userId: string): Promise<boolean> {
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
   * Check if user has permission to update roles
   */
  private async checkRoleUpdatePermission(participantId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('participants')
      .select(`
        role,
        competitions!inner(
          participants!inner(user_id, role)
        )
      `)
      .eq('id', participantId)
      .eq('competitions.participants.user_id', userId)
      .in('competitions.participants.role', ['creator', 'admin'])
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  }

  /**
   * Check if user has permission to remove participants
   */
  private async checkRemovePermission(participantId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('participants')
      .select(`
        role,
        competitions!inner(
          participants!inner(user_id, role)
        )
      `)
      .eq('id', participantId)
      .eq('competitions.participants.user_id', userId)
      .in('competitions.participants.role', ['creator', 'admin'])
      .single();

    if (error || !data) {
      return false;
    }

    // Only creator can remove admins
    if (data.role === 'admin') {
      const { data: removerData } = await this.supabase
        .from('participants')
        .select('role')
        .eq('competition_id', data.competition_id)
        .eq('user_id', userId)
        .eq('role', 'creator')
        .single();

      return !!removerData;
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
   * Update participant role
   */
  async updateParticipantRole(participantId: string, newRole: ParticipantRole, userId: string): Promise<Participant> {
    try {
      // Check if user has permission to update roles
      const canUpdate = await this.checkRoleUpdatePermission(participantId, userId);
      if (!canUpdate) {
        throw new Error('You do not have permission to update participant roles');
      }

      // Get current participant
      const currentParticipant = await this.getParticipant(participantId, userId);
      if (!currentParticipant) {
        throw new Error('Participant not found');
      }

      // Validate role change
      if (currentParticipant.role === 'creator') {
        throw new Error('Creator role cannot be changed');
      }

      // Update role
      const { data: participant, error } = await this.supabase
        .from('participants')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', participantId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update participant role: ${error.message}`);
      }

      return this.mapDatabaseParticipant(participant);
    } catch (error) {
      throw new Error(`Failed to update participant role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update participant status
   */
  async updateParticipantStatus(participantId: string, newStatus: ParticipantStatus, userId: string): Promise<Participant> {
    try {
      // Check if user has permission to update roles
      const canUpdate = await this.checkRoleUpdatePermission(participantId, userId);
      if (!canUpdate) {
        throw new Error('You do not have permission to update participant status');
      }

      // Get current participant
      const currentParticipant = await this.getParticipant(participantId, userId);
      if (!currentParticipant) {
        throw new Error('Participant not found');
      }

      // Validate status change
      if (currentParticipant.role === 'creator') {
        throw new Error('Creator status cannot be changed');
      }

      // Prepare update data
      const updateData: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // Set appropriate timestamps based on status
      if (newStatus === 'accepted') {
        updateData.accepted_at = new Date().toISOString();
      } else if (newStatus === 'declined') {
        updateData.declined_at = new Date().toISOString();
      }

      // Update status
      const { data: participant, error } = await this.supabase
        .from('participants')
        .update(updateData)
        .eq('id', participantId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update participant status: ${error.message}`);
      }

      return this.mapDatabaseParticipant(participant);
    } catch (error) {
      throw new Error(`Failed to update participant status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove participant from competition
   */
  async removeParticipant(participantId: string, userId: string): Promise<void> {
    try {
      // Check if user has permission to remove participants
      const canRemove = await this.checkRemovePermission(participantId, userId);
      if (!canRemove) {
        throw new Error('You do not have permission to remove participants');
      }

      // Get current participant
      const currentParticipant = await this.getParticipant(participantId, userId);
      if (!currentParticipant) {
        throw new Error('Participant not found');
      }

      // Validate removal
      if (currentParticipant.role === 'creator') {
        throw new Error('Creator cannot be removed from the competition');
      }

      // Remove participant
      const { error } = await this.supabase
        .from('participants')
        .delete()
        .eq('id', participantId);

      if (error) {
        throw new Error(`Failed to remove participant: ${error.message}`);
      }
    } catch (error) {
      throw new Error(`Failed to remove participant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resend invitation to participant
   */
  async resendInvitation(participantId: string, userId: string): Promise<void> {
    try {
      // Check if user has permission to invite participants
      const canInvite = await this.checkInvitePermission(participantId, userId);
      if (!canInvite) {
        throw new Error('You do not have permission to resend invitations');
      }

      // Get participant details
      const participant = await this.getParticipant(participantId, userId);
      if (!participant) {
        throw new Error('Participant not found');
      }

      // Check if participant is in invited status
      if (participant.status !== 'invited') {
        throw new Error('Can only resend invitations to participants with invited status');
      }

      // Get competition details
      const competition = await this.getCompetitionDetails(participant.competition_id);
      if (!competition) {
        throw new Error('Competition not found');
      }

      // Get user email
      const userEmail = await this.getUserEmail(participant.user_id);
      if (!userEmail) {
        throw new Error('User email not found');
      }

      // Update invitation timestamp
      const { error: updateError } = await this.supabase
        .from('participants')
        .update({ 
          invited_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', participantId);

      if (updateError) {
        throw new Error(`Failed to update invitation timestamp: ${updateError.message}`);
      }

      // Send invitation email
      await this.sendInvitationEmail(
        userEmail,
        competition,
        participant.role,
        undefined // No custom message for resend
      );
    } catch (error) {
      throw new Error(`Failed to resend invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get participant by ID
   */
  async getParticipant(participantId: string, userId: string): Promise<Participant | null> {
    try {
      const { data: participant, error } = await this.supabase
        .from('participants')
        .select(`
          *,
          competitions!inner(
            participants!inner(user_id)
          )
        `)
        .eq('id', participantId)
        .eq('competitions.participants.user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch participant: ${error.message}`);
      }

      return this.mapDatabaseParticipant(participant);
    } catch (error) {
      throw new Error(`Failed to get participant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user email by user ID
   */
  private async getUserEmail(userId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.email;
  }

  /**
   * Map database participant to Participant interface
   */
  private mapDatabaseParticipant(dbParticipant: any): Participant {
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
}
