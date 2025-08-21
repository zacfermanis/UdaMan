'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ParticipantService } from '@/lib/competition/participant-service';
import { PermissionService } from '@/lib/competition/permission-service';
import { 
  Participant, 
  ParticipantRole, 
  ParticipantStatus,
  UpdateParticipantData,
  PermissionMatrix
} from '@/types/competition';

interface PermissionManagerProps {
  competitionId: string;
  currentUserId: string;
  onSuccess?: (updatedParticipant: Participant) => void;
  onCancel?: () => void;
  className?: string;
}

interface ParticipantWithPermissions extends Participant {
  canBeModified: boolean;
  modificationReason?: string;
}

interface FormErrors {
  [key: string]: string;
}

const ROLE_OPTIONS: { value: ParticipantRole; label: string; description: string; color: string }[] = [
  { 
    value: 'creator', 
    label: 'Creator', 
    description: 'Full control over the competition',
    color: 'bg-purple-100 text-purple-800'
  },
  { 
    value: 'admin', 
    label: 'Admin', 
    description: 'Can manage events, participants, and settings',
    color: 'bg-blue-100 text-blue-800'
  },
  { 
    value: 'participant', 
    label: 'Participant', 
    description: 'Can participate in events and view details',
    color: 'bg-green-100 text-green-800'
  },
  { 
    value: 'spectator', 
    label: 'Spectator', 
    description: 'Can view competition details but cannot participate',
    color: 'bg-gray-100 text-gray-800'
  }
];

const STATUS_OPTIONS: { value: ParticipantStatus; label: string; color: string }[] = [
  { value: 'invited', label: 'Invited', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-800' },
  { value: 'declined', label: 'Declined', color: 'bg-red-100 text-red-800' },
  { value: 'removed', label: 'Removed', color: 'bg-gray-100 text-gray-800' }
];

const PERMISSION_MATRIX: PermissionMatrix = {
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
    can_edit_settings: true,
    can_view_leaderboard: true,
    can_send_messages: true,
    can_view_audit_logs: true,
    can_manage_scoring: true,
    can_manage_event_types: true,
  },
  admin: {
    can_edit_competition: true,
    can_delete_competition: false,
    can_manage_events: true,
    can_create_events: true,
    can_edit_events: true,
    can_delete_events: true,
    can_manage_participants: true,
    can_invite_participants: true,
    can_remove_participants: true,
    can_change_roles: true,
    can_edit_settings: true,
    can_view_leaderboard: true,
    can_send_messages: true,
    can_view_audit_logs: true,
    can_manage_scoring: true,
    can_manage_event_types: true,
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
    can_edit_settings: false,
    can_view_leaderboard: true,
    can_send_messages: true,
    can_view_audit_logs: false,
    can_manage_scoring: false,
    can_manage_event_types: false,
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
    can_edit_settings: false,
    can_view_leaderboard: true,
    can_send_messages: false,
    can_view_audit_logs: false,
    can_manage_scoring: false,
    can_manage_event_types: false,
  },
};

export default function PermissionManager({
  competitionId,
  currentUserId,
  onSuccess,
  onCancel,
  className = ""
}: PermissionManagerProps) {
  const [participants, setParticipants] = useState<ParticipantWithPermissions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantWithPermissions | null>(null);
  const [showPermissionMatrix, setShowPermissionMatrix] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<ParticipantRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ParticipantStatus | 'all'>('all');
  
  const participantService = new ParticipantService();
  const permissionService = new PermissionService();

  // Load participants on component mount
  useEffect(() => {
    loadParticipants();
  }, [competitionId]);

  const loadParticipants = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await participantService.getCompetitionParticipants(competitionId);
      
      // Process participants to determine if they can be modified
      const processedParticipants: ParticipantWithPermissions[] = await Promise.all(
        response.participants.map(async (participant) => {
          const canBeModified = await permissionService.canPerformActionOnUser(
            currentUserId,
            participant.user_id,
            competitionId,
            'can_change_roles'
          );
          
          let modificationReason: string | undefined;
          if (!canBeModified) {
            if (participant.user_id === currentUserId) {
              modificationReason = "You cannot modify your own role";
            } else if (participant.role === 'creator') {
              modificationReason = "Creators cannot have their role changed";
            } else {
              modificationReason = "You don't have permission to modify this participant";
            }
          }
          
          return {
            ...participant,
            canBeModified,
            modificationReason
          };
        })
      );
      
      setParticipants(processedParticipants);
    } catch (error) {
      console.error('Failed to load participants:', error);
      setErrors({ load: 'Failed to load participants' });
    } finally {
      setIsLoading(false);
    }
  }, [competitionId, currentUserId, participantService, permissionService]);

  const handleParticipantSelect = useCallback((participant: ParticipantWithPermissions) => {
    setSelectedParticipant(participant);
    setShowPermissionMatrix(false);
  }, []);

  const handleRoleChange = useCallback(async (participantId: string, newRole: ParticipantRole) => {
    if (!selectedParticipant || selectedParticipant.id !== participantId) return;
    
    setIsUpdating(true);
    try {
      const updatedParticipant = await participantService.updateParticipant(
        participantId,
        { role: newRole },
        currentUserId
      );
      
      // Update the participants list
      setParticipants(prev => prev.map(p => 
        p.id === participantId ? { ...p, role: newRole } : p
      ));
      
      // Update selected participant
      setSelectedParticipant(prev => prev ? { ...prev, role: newRole } : null);
      
      if (onSuccess) {
        onSuccess(updatedParticipant);
      }
    } catch (error) {
      console.error('Failed to update participant role:', error);
      setErrors({ update: error instanceof Error ? error.message : 'Failed to update role' });
    } finally {
      setIsUpdating(false);
    }
  }, [selectedParticipant, participantService, currentUserId, onSuccess]);

  const handleStatusChange = useCallback(async (participantId: string, newStatus: ParticipantStatus) => {
    if (!selectedParticipant || selectedParticipant.id !== participantId) return;
    
    setIsUpdating(true);
    try {
      const updatedParticipant = await participantService.updateParticipant(
        participantId,
        { status: newStatus },
        currentUserId
      );
      
      // Update the participants list
      setParticipants(prev => prev.map(p => 
        p.id === participantId ? { ...p, status: newStatus } : p
      ));
      
      // Update selected participant
      setSelectedParticipant(prev => prev ? { ...prev, status: newStatus } : null);
      
      if (onSuccess) {
        onSuccess(updatedParticipant);
      }
    } catch (error) {
      console.error('Failed to update participant status:', error);
      setErrors({ update: error instanceof Error ? error.message : 'Failed to update status' });
    } finally {
      setIsUpdating(false);
    }
  }, [selectedParticipant, participantService, currentUserId, onSuccess]);

  const handleRemoveParticipant = useCallback(async (participantId: string) => {
    if (!selectedParticipant || selectedParticipant.id !== participantId) return;
    
    if (!confirm('Are you sure you want to remove this participant from the competition?')) {
      return;
    }
    
    setIsUpdating(true);
    try {
      await participantService.removeParticipant(participantId, currentUserId);
      
      // Remove from participants list
      setParticipants(prev => prev.filter(p => p.id !== participantId));
      setSelectedParticipant(null);
    } catch (error) {
      console.error('Failed to remove participant:', error);
      setErrors({ remove: error instanceof Error ? error.message : 'Failed to remove participant' });
    } finally {
      setIsUpdating(false);
    }
  }, [selectedParticipant, participantService, currentUserId]);

  const filteredParticipants = participants.filter(participant => {
    const matchesSearch = !searchTerm || 
      participant.user_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.user_profile?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || participant.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || participant.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleInfo = (role: ParticipantRole) => {
    return ROLE_OPTIONS.find(option => option.value === role);
  };

  const getStatusInfo = (status: ParticipantStatus) => {
    return STATUS_OPTIONS.find(option => option.value === status);
  };

  const renderPermissionMatrix = () => {
    if (!selectedParticipant) return null;
    
    const rolePermissions = PERMISSION_MATRIX[selectedParticipant.role];
    
    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Permissions for {selectedParticipant.user_profile?.full_name || 'Participant'}
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(rolePermissions).map(([permission, hasPermission]) => (
            <div key={permission} className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${hasPermission ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-gray-600">
                {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderParticipantList = () => (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {filteredParticipants.map((participant) => {
        const roleInfo = getRoleInfo(participant.role);
        const statusInfo = getStatusInfo(participant.status);
        const isSelected = selectedParticipant?.id === participant.id;
        
        return (
          <div
            key={participant.id}
            onClick={() => handleParticipantSelect(participant)}
            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
              isSelected 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-gray-900">
                    {participant.user_profile?.full_name || 'Unknown User'}
                  </h4>
                  {participant.user_id === currentUserId && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      You
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {participant.user_profile?.email || 'No email'}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`text-xs px-2 py-1 rounded ${roleInfo?.color}`}>
                  {roleInfo?.label}
                </span>
                <span className={`text-xs px-2 py-1 rounded ${statusInfo?.color}`}>
                  {statusInfo?.label}
                </span>
              </div>
            </div>
            
            {!participant.canBeModified && participant.modificationReason && (
              <p className="text-xs text-red-600 mt-1">{participant.modificationReason}</p>
            )}
          </div>
        );
      })}
      
      {filteredParticipants.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {isLoading ? 'Loading participants...' : 'No participants found'}
        </div>
      )}
    </div>
  );

  const renderParticipantDetails = () => {
    if (!selectedParticipant) {
      return (
        <div className="text-center py-8 text-gray-500">
          Select a participant to manage their permissions
        </div>
      );
    }

    const roleInfo = getRoleInfo(selectedParticipant.role);
    const statusInfo = getStatusInfo(selectedParticipant.status);

    return (
      <div className="space-y-4">
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {selectedParticipant.user_profile?.full_name || 'Unknown User'}
          </h3>
          <p className="text-sm text-gray-500">
            {selectedParticipant.user_profile?.email || 'No email'}
          </p>
        </div>

        <div className="space-y-4">
          {/* Role Management */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={selectedParticipant.role}
              onChange={(e) => handleRoleChange(selectedParticipant.id, e.target.value as ParticipantRole)}
              disabled={!selectedParticipant.canBeModified || isUpdating}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {ROLE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description}
                </option>
              ))}
            </select>
            {!selectedParticipant.canBeModified && (
              <p className="mt-1 text-sm text-red-600">{selectedParticipant.modificationReason}</p>
            )}
          </div>

          {/* Status Management */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={selectedParticipant.status}
              onChange={(e) => handleStatusChange(selectedParticipant.id, e.target.value as ParticipantStatus)}
              disabled={!selectedParticipant.canBeModified || isUpdating}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Permission Matrix Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowPermissionMatrix(!showPermissionMatrix)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {showPermissionMatrix ? 'Hide' : 'Show'} Permission Matrix
            </button>
          </div>

          {/* Permission Matrix */}
          {showPermissionMatrix && renderPermissionMatrix()}

          {/* Remove Participant */}
          {selectedParticipant.canBeModified && selectedParticipant.role !== 'creator' && (
            <div className="pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => handleRemoveParticipant(selectedParticipant.id)}
                disabled={isUpdating}
                className="w-full px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Removing...' : 'Remove from Competition'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Permission Manager</h2>
        <p className="text-gray-600">Manage participant roles and permissions for this competition</p>
      </div>

      {/* Error Display */}
      {errors.load && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{errors.load}</p>
        </div>
      )}

      {errors.update && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{errors.update}</p>
        </div>
      )}

      {errors.remove && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{errors.remove}</p>
        </div>
      )}

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Participant List */}
          <div className="lg:col-span-1">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Participants</h3>
              
              {/* Search and Filters */}
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Search participants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as ParticipantRole | 'all')}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Roles</option>
                    {ROLE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as ParticipantStatus | 'all')}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    {STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {renderParticipantList()}
          </div>

          {/* Participant Details */}
          <div className="lg:col-span-2">
            <div className="bg-gray-50 p-4 rounded-lg">
              {renderParticipantDetails()}
            </div>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
