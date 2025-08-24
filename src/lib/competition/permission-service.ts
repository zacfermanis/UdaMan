import { SupabaseClient } from '@supabase/supabase-js';
import { 
  ParticipantRole, 
  PermissionMatrix, 
  PermissionCheck, 
  PermissionAudit,
  PermissionError
} from '@/types/competition';

export class PermissionService {
  constructor(private supabase: SupabaseClient) {}

  // Permission matrix defining what each role can do
  private readonly permissionMatrix: PermissionMatrix = {
    creator: {
      can_edit_competition: true,
      can_delete_competition: true,
      can_manage_events: true,
      can_create_events: true,
      can_edit_events: true,
      can_delete_events: true,
      can_manage_participants: true,
      can_invite_participants: true,
      can_remove_participants: true,
      can_change_roles: true,
      can_enter_scores: true,
      can_edit_scores: true,
      can_view_leaderboard: true,
      can_send_messages: true,
      can_view_analytics: true,
      can_export_data: true,
      can_manage_settings: true
    },
    admin: {
      can_edit_competition: false,
      can_delete_competition: false,
      can_manage_events: true,
      can_create_events: true,
      can_edit_events: true,
      can_delete_events: true,
      can_manage_participants: true,
      can_invite_participants: true,
      can_remove_participants: true,
      can_change_roles: true,
      can_enter_scores: true,
      can_edit_scores: true,
      can_view_leaderboard: true,
      can_send_messages: true,
      can_view_analytics: true,
      can_export_data: true,
      can_manage_settings: false
    },
    participant: {
      can_edit_competition: false,
      can_delete_competition: false,
      can_manage_events: false,
      can_create_events: false,
      can_edit_events: false,
      can_delete_events: false,
      can_manage_participants: false,
      can_invite_participants: false,
      can_remove_participants: false,
      can_change_roles: false,
      can_enter_scores: false,
      can_edit_scores: false,
      can_view_leaderboard: true,
      can_send_messages: true,
      can_view_analytics: false,
      can_export_data: false,
      can_manage_settings: false
    },
    spectator: {
      can_edit_competition: false,
      can_delete_competition: false,
      can_manage_events: false,
      can_create_events: false,
      can_edit_events: false,
      can_delete_events: false,
      can_manage_participants: false,
      can_invite_participants: false,
      can_remove_participants: false,
      can_change_roles: false,
      can_enter_scores: false,
      can_edit_scores: false,
      can_view_leaderboard: true,
      can_send_messages: false,
      can_view_analytics: false,
      can_export_data: false,
      can_manage_settings: false
    }
  };

  /**
   * Check if user has permission for a specific action
   */
  async checkPermission(
    competitionId: string, 
    userId: string, 
    permission: keyof PermissionMatrix[ParticipantRole]
  ): Promise<boolean> {
    try {
      // Get user's role in the competition
      const { data: participant, error } = await this.supabase
        .from('participants')
        .select('role, permissions')
        .eq('competition_id', competitionId)
        .eq('user_id', userId)
        .single();

      if (error || !participant) {
        return false;
      }

      // Check role-based permission
      const rolePermission = this.permissionMatrix[participant.role]?.[permission];
      if (rolePermission === undefined) {
        return false;
      }

      // Check custom permissions (override role-based permissions)
      const customPermissions = participant.permissions || {};
      if (customPermissions[permission] !== undefined) {
        return customPermissions[permission];
      }

      return rolePermission;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  /**
   * Check multiple permissions at once
   */
  async checkPermissions(
    competitionId: string, 
    userId: string, 
    permissions: (keyof PermissionMatrix[ParticipantRole])[]
  ): Promise<PermissionCheck> {
    try {
      const results: PermissionCheck = {
        hasAll: true,
        hasAny: false,
        permissions: {}
      };

      for (const permission of permissions) {
        const hasPermission = await this.checkPermission(competitionId, userId, permission);
        results.permissions[permission] = hasPermission;
        
        if (!hasPermission) {
          results.hasAll = false;
        } else {
          results.hasAny = true;
        }
      }

      return results;
    } catch (error) {
      console.error('Multiple permission check failed:', error);
      return {
        hasAll: false,
        hasAny: false,
        permissions: {}
      };
    }
  }

  /**
   * Get user's role in a competition
   */
  async getUserRole(competitionId: string, userId: string): Promise<ParticipantRole | null> {
    try {
      const { data: participant, error } = await this.supabase
        .from('participants')
        .select('role')
        .eq('competition_id', competitionId)
        .eq('user_id', userId)
        .single();

      if (error || !participant) {
        return null;
      }

      return participant.role;
    } catch (error) {
      console.error('Failed to get user role:', error);
      return null;
    }
  }

  /**
   * Get user's permissions in a competition
   */
  async getUserPermissions(
    competitionId: string, 
    userId: string
  ): Promise<PermissionMatrix[ParticipantRole] | null> {
    try {
      const { data: participant, error } = await this.supabase
        .from('participants')
        .select('role, permissions')
        .eq('competition_id', competitionId)
        .eq('user_id', userId)
        .single();

      if (error || !participant) {
        return null;
      }

      // Get base permissions for role
      const basePermissions = this.permissionMatrix[participant.role];
      if (!basePermissions) {
        return null;
      }

      // Merge with custom permissions
      const customPermissions = participant.permissions || {};
      return {
        ...basePermissions,
        ...customPermissions
      };
    } catch (error) {
      console.error('Failed to get user permissions:', error);
      return null;
    }
  }

  /**
   * Update user's custom permissions
   */
  async updateUserPermissions(
    competitionId: string, 
    userId: string, 
    permissions: Partial<PermissionMatrix[ParticipantRole]>,
    updaterId: string
  ): Promise<void> {
    try {
      // Check if updater has permission to change permissions
      const canChangePermissions = await this.checkPermission(competitionId, updaterId, 'can_change_roles');
      if (!canChangePermissions) {
        throw new Error('You do not have permission to change user permissions');
      }

      // Get current participant
      const { data: participant, error } = await this.supabase
        .from('participants')
        .select('role, permissions')
        .eq('competition_id', competitionId)
        .eq('user_id', userId)
        .single();

      if (error || !participant) {
        throw new Error('User not found in competition');
      }

      // Prevent changing creator permissions
      if (participant.role === 'creator') {
        throw new Error('Cannot change creator permissions');
      }

      // Merge with existing custom permissions
      const currentPermissions = participant.permissions || {};
      const updatedPermissions = {
        ...currentPermissions,
        ...permissions
      };

      // Update permissions
      const { error: updateError } = await this.supabase
        .from('participants')
        .update({ permissions: updatedPermissions })
        .eq('competition_id', competitionId)
        .eq('user_id', userId);

      if (updateError) {
        throw new Error(`Failed to update permissions: ${updateError.message}`);
      }

      // Log permission change
      await this.logPermissionChange(competitionId, userId, updaterId, permissions);
    } catch (error) {
      throw new Error(`Failed to update user permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reset user's permissions to role defaults
   */
  async resetUserPermissions(
    competitionId: string, 
    userId: string, 
    resetterId: string
  ): Promise<void> {
    try {
      // Check if resetter has permission to change permissions
      const canChangePermissions = await this.checkPermission(competitionId, resetterId, 'can_change_roles');
      if (!canChangePermissions) {
        throw new Error('You do not have permission to reset user permissions');
      }

      // Get current participant
      const { data: participant, error } = await this.supabase
        .from('participants')
        .select('role')
        .eq('competition_id', competitionId)
        .eq('user_id', userId)
        .single();

      if (error || !participant) {
        throw new Error('User not found in competition');
      }

      // Prevent resetting creator permissions
      if (participant.role === 'creator') {
        throw new Error('Cannot reset creator permissions');
      }

      // Reset to empty permissions (will use role defaults)
      const { error: updateError } = await this.supabase
        .from('participants')
        .update({ permissions: {} })
        .eq('competition_id', competitionId)
        .eq('user_id', userId);

      if (updateError) {
        throw new Error(`Failed to reset permissions: ${updateError.message}`);
      }

      // Log permission reset
      await this.logPermissionChange(competitionId, userId, resetterId, {}, 'reset');
    } catch (error) {
      throw new Error(`Failed to reset user permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get permission audit trail for a competition
   */
  async getPermissionAuditTrail(
    competitionId: string, 
    userId: string,
    filters?: {
      targetUserId?: string;
      action?: string;
      dateRange?: { start: Date; end: Date };
      limit?: number;
    }
  ): Promise<PermissionAudit[]> {
    try {
      // Check if user has permission to view audit trail
      const canViewAnalytics = await this.checkPermission(competitionId, userId, 'can_view_analytics');
      if (!canViewAnalytics) {
        throw new Error('You do not have permission to view audit trail');
      }

      let query = this.supabase
        .from('permission_audit_log')
        .select(`
          *,
          target_user:users!permission_audit_log_target_user_id_fkey(display_name, email),
          actor:users!permission_audit_log_actor_id_fkey(display_name, email)
        `)
        .eq('competition_id', competitionId);

      // Apply filters
      if (filters?.targetUserId) {
        query = query.eq('target_user_id', filters.targetUserId);
      }

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start.toISOString())
          .lte('created_at', filters.dateRange.end.toISOString());
      }

      const limit = filters?.limit || 50;

      const { data: auditLogs, error } = await query
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch audit trail: ${error.message}`);
      }

      return auditLogs.map(this.mapDatabaseAuditLog);
    } catch (error) {
      throw new Error(`Failed to get permission audit trail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate permission changes
   */
  validatePermissionChanges(
    currentRole: ParticipantRole,
    newPermissions: Partial<PermissionMatrix[ParticipantRole]>
  ): PermissionError[] {
    const errors: PermissionError[] = [];

    // Prevent changing creator permissions
    if (currentRole === 'creator') {
      errors.push({
        field: 'role',
        message: 'Cannot modify creator permissions'
      });
      return errors;
    }

    // Validate individual permissions
    for (const [permission, value] of Object.entries(newPermissions)) {
      if (typeof value !== 'boolean') {
        errors.push({
          field: permission,
          message: 'Permission values must be boolean'
        });
      }

      // Check for invalid permission names
      if (!this.isValidPermission(permission)) {
        errors.push({
          field: permission,
          message: `Invalid permission: ${permission}`
        });
      }
    }

    return errors;
  }

  /**
   * Get available permissions for a role
   */
  getAvailablePermissions(role: ParticipantRole): (keyof PermissionMatrix[ParticipantRole])[] {
    const permissions = this.permissionMatrix[role];
    if (!permissions) {
      return [];
    }

    return Object.keys(permissions) as (keyof PermissionMatrix[ParticipantRole])[];
  }

  /**
   * Get permission matrix for all roles
   */
  getPermissionMatrix(): PermissionMatrix {
    return this.permissionMatrix;
  }

  /**
   * Check if user can perform action on another user
   */
  async canPerformActionOnUser(
    competitionId: string,
    actorId: string,
    targetUserId: string,
    action: keyof PermissionMatrix[ParticipantRole]
  ): Promise<boolean> {
    try {
      // Get both users' roles
      const [actorRole, targetRole] = await Promise.all([
        this.getUserRole(competitionId, actorId),
        this.getUserRole(competitionId, targetUserId)
      ]);

      if (!actorRole || !targetRole) {
        return false;
      }

      // Check if actor has the required permission
      const hasPermission = await this.checkPermission(competitionId, actorId, action);
      if (!hasPermission) {
        return false;
      }

      // Special rules for role hierarchy
      if (targetRole === 'creator') {
        // Only creator can perform actions on creator
        return actorRole === 'creator';
      }

      if (targetRole === 'admin' && actorRole !== 'creator') {
        // Only creator can perform actions on admins
        return false;
      }

      return true;
    } catch (error) {
      console.error('Action permission check failed:', error);
      return false;
    }
  }

  /**
   * Log permission change for audit trail
   */
  private async logPermissionChange(
    competitionId: string,
    targetUserId: string,
    actorId: string,
    changes: Partial<PermissionMatrix[ParticipantRole]>,
    action: string = 'update'
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('permission_audit_log')
        .insert({
          competition_id: competitionId,
          target_user_id: targetUserId,
          actor_id: actorId,
          action,
          changes: JSON.stringify(changes),
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to log permission change:', error);
      }
    } catch (error) {
      console.error('Failed to log permission change:', error);
    }
  }

  /**
   * Validate permission name
   */
  private isValidPermission(permission: string): boolean {
    const validPermissions = [
      'can_edit_competition',
      'can_delete_competition',
      'can_manage_events',
      'can_create_events',
      'can_edit_events',
      'can_delete_events',
      'can_manage_participants',
      'can_invite_participants',
      'can_remove_participants',
      'can_change_roles',
      'can_enter_scores',
      'can_edit_scores',
      'can_view_leaderboard',
      'can_send_messages',
      'can_view_analytics',
      'can_export_data',
      'can_manage_settings'
    ];

    return validPermissions.includes(permission);
  }

  /**
   * Map database audit log to PermissionAudit interface
   */
  private mapDatabaseAuditLog(dbAuditLog: any): PermissionAudit {
    return {
      id: dbAuditLog.id,
      competition_id: dbAuditLog.competition_id,
      target_user_id: dbAuditLog.target_user_id,
      actor_id: dbAuditLog.actor_id,
      action: dbAuditLog.action,
      changes: dbAuditLog.changes ? JSON.parse(dbAuditLog.changes) : {},
      created_at: new Date(dbAuditLog.created_at),
      target_user: dbAuditLog.target_user ? {
        display_name: dbAuditLog.target_user.display_name,
        email: dbAuditLog.target_user.email
      } : null,
      actor: dbAuditLog.actor ? {
        display_name: dbAuditLog.actor.display_name,
        email: dbAuditLog.actor.email
      } : null
    };
  }
}
