'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ParticipantService } from '@/lib/competition/participant-service';
import { PermissionService } from '@/lib/competition/permission-service';
import { 
  Participant, 
  ParticipantRole,
  ParticipantStatus
} from '@/types/competition';

interface ParticipantListProps {
  competitionId: string;
  currentUserId: string;
  onInviteParticipants?: () => void;
  onViewParticipant?: (participantId: string) => void;
  onRemoveParticipant?: (participantId: string) => void;
  onResendInvitation?: (participantId: string) => void;
  className?: string;
}

interface FormErrors {
  [key: string]: string;
}

const PARTICIPANT_STATUS_COLORS = {
  invited: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  pending: 'bg-gray-100 text-gray-800'
};

const PARTICIPANT_STATUS_LABELS = {
  invited: 'Invited',
  accepted: 'Accepted',
  declined: 'Declined',
  pending: 'Pending'
};

const ROLE_COLORS = {
  creator: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  participant: 'bg-green-100 text-green-800',
  spectator: 'bg-gray-100 text-gray-800'
};

const ROLE_LABELS = {
  creator: 'Creator',
  admin: 'Admin',
  participant: 'Participant',
  spectator: 'Spectator'
};

export default function ParticipantList({
  competitionId,
  currentUserId,
  onInviteParticipants,
  onViewParticipant,
  onRemoveParticipant,
  onResendInvitation,
  className = ""
}: ParticipantListProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ParticipantStatus | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<ParticipantRole | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'status' | 'joined'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
  const [updatingParticipant, setUpdatingParticipant] = useState<string | null>(null);

  const participantService = new ParticipantService();
  const permissionService = new PermissionService();

  // Load participants on component mount
  useEffect(() => {
    loadParticipants();
    loadPermissions();
  }, [competitionId]);

  // Update filtered participants when participants, search, or filters change
  useEffect(() => {
    filterAndSortParticipants();
  }, [participants, searchTerm, statusFilter, roleFilter, sortBy, sortOrder]);

  const loadParticipants = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await participantService.getCompetitionParticipants(competitionId);
      setParticipants(response.participants);
    } catch (error) {
      console.error('Failed to load participants:', error);
      setErrors({ load: 'Failed to load participants' });
    } finally {
      setIsLoading(false);
    }
  }, [competitionId, participantService]);

  const loadPermissions = useCallback(async () => {
    try {
      const permissions = await permissionService.getUserPermissions(currentUserId, competitionId);
      setUserPermissions(permissions);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  }, [currentUserId, competitionId, permissionService]);

  const filterAndSortParticipants = useCallback(() => {
    let filtered = [...participants];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(participant =>
        participant.user_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        participant.user_profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        participant.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(participant => participant.status === statusFilter);
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(participant => participant.role === roleFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          const nameA = a.user_profile?.full_name || '';
          const nameB = b.user_profile?.full_name || '';
          comparison = nameA.localeCompare(nameB);
          break;
        case 'role':
          comparison = a.role.localeCompare(b.role);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'joined':
          const dateA = new Date(a.accepted_at || a.created_at);
          const dateB = new Date(b.accepted_at || b.created_at);
          comparison = dateA.getTime() - dateB.getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredParticipants(filtered);
  }, [participants, searchTerm, statusFilter, roleFilter, sortBy, sortOrder]);

  const handleRoleChange = useCallback(async (participantId: string, newRole: ParticipantRole) => {
    if (!userPermissions.can_change_roles) return;

    // Check if user is trying to change their own role
    const participant = participants.find(p => p.id === participantId);
    if (participant?.user_id === currentUserId) {
      setErrors({ role: 'You cannot change your own role' });
      return;
    }

    // Check if user is trying to change creator's role
    if (participant?.role === 'creator') {
      setErrors({ role: 'Creator role cannot be changed' });
      return;
    }

    setUpdatingParticipant(participantId);
    try {
      const updatedParticipant = await participantService.updateParticipantRole(
        participantId,
        newRole,
        currentUserId
      );

      setParticipants(prev => prev.map(p => p.id === participantId ? updatedParticipant : p));
      setErrors({}); // Clear any previous errors
    } catch (error) {
      console.error('Failed to update participant role:', error);
      setErrors({ role: 'Failed to update participant role' });
    } finally {
      setUpdatingParticipant(null);
    }
  }, [userPermissions.can_change_roles, participants, currentUserId, participantService]);

  const handleStatusChange = useCallback(async (participantId: string, newStatus: ParticipantStatus) => {
    if (!userPermissions.can_change_roles) return;

    // Check if user is trying to change their own status
    const participant = participants.find(p => p.id === participantId);
    if (participant?.user_id === currentUserId) {
      setErrors({ status: 'You cannot change your own status' });
      return;
    }

    // Check if user is trying to change creator's status
    if (participant?.role === 'creator') {
      setErrors({ status: 'Creator status cannot be changed' });
      return;
    }

    setUpdatingParticipant(participantId);
    try {
      const updatedParticipant = await participantService.updateParticipantStatus(
        participantId,
        newStatus,
        currentUserId
      );

      setParticipants(prev => prev.map(p => p.id === participantId ? updatedParticipant : p));
      setErrors({}); // Clear any previous errors
    } catch (error) {
      console.error('Failed to update participant status:', error);
      setErrors({ status: 'Failed to update participant status' });
    } finally {
      setUpdatingParticipant(null);
    }
  }, [userPermissions.can_change_roles, participants, currentUserId, participantService]);

  const handleRemoveParticipant = useCallback(async (participantId: string) => {
    if (!userPermissions.can_remove_participants) return;

    // Check if user is trying to remove themselves
    const participant = participants.find(p => p.id === participantId);
    if (participant?.user_id === currentUserId) {
      setErrors({ remove: 'You cannot remove yourself from the competition' });
      return;
    }

    // Check if user is trying to remove the creator
    if (participant?.role === 'creator') {
      setErrors({ remove: 'Creator cannot be removed from the competition' });
      return;
    }

    if (!confirm('Are you sure you want to remove this participant? This action cannot be undone.')) {
      return;
    }

    setUpdatingParticipant(participantId);
    try {
      await participantService.removeParticipant(participantId, currentUserId);
      setParticipants(prev => prev.filter(p => p.id !== participantId));
      
      if (onRemoveParticipant) {
        onRemoveParticipant(participantId);
      }
      setErrors({}); // Clear any previous errors
    } catch (error) {
      console.error('Failed to remove participant:', error);
      setErrors({ remove: 'Failed to remove participant' });
    } finally {
      setUpdatingParticipant(null);
    }
  }, [userPermissions.can_remove_participants, participants, currentUserId, participantService, onRemoveParticipant]);

  const handleResendInvitation = useCallback(async (participantId: string) => {
    if (!userPermissions.can_invite_participants) return;

    setUpdatingParticipant(participantId);
    try {
      await participantService.resendInvitation(participantId, currentUserId);
      
      if (onResendInvitation) {
        onResendInvitation(participantId);
      }
      setErrors({}); // Clear any previous errors
    } catch (error) {
      console.error('Failed to resend invitation:', error);
      setErrors({ resend: 'Failed to resend invitation' });
    } finally {
      setUpdatingParticipant(null);
    }
  }, [userPermissions.can_invite_participants, participantService, currentUserId, onResendInvitation]);

  const formatDate = useCallback((date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const formatDateTime = useCallback((date: Date | string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const getStatusColor = useCallback((status: ParticipantStatus) => {
    return PARTICIPANT_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  }, []);

  const getStatusLabel = useCallback((status: ParticipantStatus) => {
    return PARTICIPANT_STATUS_LABELS[status] || status;
  }, []);

  const getRoleColor = useCallback((role: ParticipantRole) => {
    return ROLE_COLORS[role] || 'bg-gray-100 text-gray-800';
  }, []);

  const getRoleLabel = useCallback((role: ParticipantRole) => {
    return ROLE_LABELS[role] || role;
  }, []);

  const canModifyParticipant = useCallback((participant: Participant) => {
    // Cannot modify self
    if (participant.user_id === currentUserId) return false;
    
    // Cannot modify creator
    if (participant.role === 'creator') return false;
    
    return true;
  }, [currentUserId]);

  const renderParticipantCard = useCallback((participant: Participant) => {
    const isUpdating = updatingParticipant === participant.id;
    const canModify = canModifyParticipant(participant);
    const canChangeRoles = userPermissions.can_change_roles && canModify;
    const canRemove = userPermissions.can_remove_participants && canModify;
    const canResend = userPermissions.can_invite_participants && participant.status === 'invited';

    return (
      <div
        key={participant.id}
        className={`
          bg-white border border-gray-200 rounded-lg p-4 mb-3 transition-all duration-200
          ${isUpdating ? 'opacity-75' : 'hover:shadow-md'}
        `}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1 min-w-0">
            {/* Avatar */}
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              {participant.user_profile?.avatar_url ? (
                <img
                  src={participant.user_profile.avatar_url}
                  alt={participant.user_profile.full_name || 'User'}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <span className="text-lg font-medium text-gray-600">
                  {participant.user_profile?.full_name?.charAt(0) || '?'}
                </span>
              )}
            </div>

            {/* Participant Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {participant.user_profile?.full_name || 'Unknown User'}
                </h3>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(participant.status)}`}>
                  {getStatusLabel(participant.status)}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${getRoleColor(participant.role)}`}>
                  {getRoleLabel(participant.role)}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-2">
                {participant.user_profile?.email || 'No email available'}
              </p>
              
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                {participant.invited_at && (
                  <span>📧 Invited {formatDate(participant.invited_at)}</span>
                )}
                {participant.accepted_at && (
                  <span>✅ Joined {formatDate(participant.accepted_at)}</span>
                )}
                {participant.declined_at && (
                  <span>❌ Declined {formatDate(participant.declined_at)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center space-x-2 ml-4">
            {/* Role Change Dropdown */}
            {canChangeRoles && (
              <select
                value={participant.role}
                onChange={(e) => handleRoleChange(participant.id, e.target.value as ParticipantRole)}
                disabled={isUpdating}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            )}

            {/* Status Change Dropdown */}
            {canChangeRoles && (
              <select
                value={participant.status}
                onChange={(e) => handleStatusChange(participant.id, e.target.value as ParticipantStatus)}
                disabled={isUpdating}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              >
                {Object.entries(PARTICIPANT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            )}

            {/* Action Buttons */}
            <div className="flex items-center space-x-1">
              {onViewParticipant && (
                <button
                  onClick={() => onViewParticipant(participant.id)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="View Participant"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              )}

              {canResend && (
                <button
                  onClick={() => handleResendInvitation(participant.id)}
                  disabled={isUpdating}
                  className="p-1 text-gray-400 hover:text-yellow-600 transition-colors disabled:opacity-50"
                  title="Resend Invitation"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </button>
              )}

              {canRemove && (
                <button
                  onClick={() => handleRemoveParticipant(participant.id)}
                  disabled={isUpdating}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                  title="Remove Participant"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Loading Indicator */}
        {isUpdating && (
          <div className="mt-3 flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">Updating...</span>
          </div>
        )}
      </div>
    );
  }, [
    updatingParticipant,
    canModifyParticipant,
    userPermissions,
    handleRoleChange,
    handleStatusChange,
    handleRemoveParticipant,
    handleResendInvitation,
    getStatusColor,
    getStatusLabel,
    getRoleColor,
    getRoleLabel,
    formatDate,
    onViewParticipant
  ]);

  const renderFilters = () => (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search Participants
          </label>
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ParticipantStatus | 'all')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            {Object.entries(PARTICIPANT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Role Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as ParticipantRole | 'all')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Roles</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'role' | 'status' | 'joined')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="name">Name</option>
            <option value="role">Role</option>
            <option value="status">Status</option>
            <option value="joined">Joined Date</option>
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Order
          </label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderHeader = () => {
    const acceptedCount = participants.filter(p => p.status === 'accepted').length;
    const invitedCount = participants.filter(p => p.status === 'invited').length;
    const declinedCount = participants.filter(p => p.status === 'declined').length;

    return (
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Participants</h2>
          <p className="text-gray-600">
            {filteredParticipants.length} of {participants.length} participants
            {searchTerm && ` matching "${searchTerm}"`}
          </p>
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
            <span>✅ {acceptedCount} accepted</span>
            <span>📧 {invitedCount} invited</span>
            <span>❌ {declinedCount} declined</span>
          </div>
        </div>

        {userPermissions.can_invite_participants && onInviteParticipants && (
          <button
            onClick={onInviteParticipants}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Invite Participants
          </button>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading participants...</span>
        </div>
      </div>
    );
  }

  if (errors.load) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{errors.load}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {renderHeader()}
      {renderFilters()}

      {/* Error Messages */}
      {errors.role && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{errors.role}</p>
        </div>
      )}

      {errors.status && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{errors.status}</p>
        </div>
      )}

      {errors.remove && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{errors.remove}</p>
        </div>
      )}

      {errors.resend && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{errors.resend}</p>
        </div>
      )}

      {/* Participants List */}
      <div className="space-y-3">
        {filteredParticipants.length > 0 ? (
          filteredParticipants.map((participant) => renderParticipantCard(participant))
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No participants found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all' || roleFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by inviting participants to your competition'
              }
            </p>
            {userPermissions.can_invite_participants && onInviteParticipants && (
              <button
                onClick={onInviteParticipants}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Invite First Participant
              </button>
            )}
          </div>
        )}
      </div>

      {/* Permission Information */}
      {!userPermissions.can_change_roles && !userPermissions.can_remove_participants && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-700">
              You have view-only access to participants. Contact an admin to manage roles and permissions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
