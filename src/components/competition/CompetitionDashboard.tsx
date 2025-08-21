'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { CompetitionService } from '@/lib/competition/competition-service';
import { EventService } from '@/lib/competition/event-service';
import { ParticipantService } from '@/lib/competition/participant-service';
import { PermissionService } from '@/lib/competition/permission-service';
import { 
  Competition, 
  Event, 
  Participant, 
  CompetitionStatus,
  EventStatus,
  ParticipantRole,
  ParticipantStatus
} from '@/types/competition';

interface CompetitionDashboardProps {
  competitionId: string;
  currentUserId: string;
  onEditCompetition?: () => void;
  onAddEvent?: () => void;
  onInviteParticipants?: () => void;
  onManagePermissions?: () => void;
  onViewEvents?: () => void;
  onViewParticipants?: () => void;
  onViewSettings?: () => void;
  className?: string;
}

interface DashboardMetrics {
  totalParticipants: number;
  acceptedParticipants: number;
  pendingInvitations: number;
  totalEvents: number;
  upcomingEvents: number;
  completedEvents: number;
  daysUntilStart: number;
  daysUntilEnd: number;
  progressPercentage: number;
}

interface RecentActivity {
  id: string;
  type: 'event_created' | 'event_updated' | 'event_completed' | 'participant_joined' | 'participant_left' | 'role_changed' | 'competition_updated';
  title: string;
  description: string;
  timestamp: Date;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface FormErrors {
  [key: string]: string;
}

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800'
};

const EVENT_STATUS_COLORS = {
  scheduled: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const ROLE_COLORS = {
  creator: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  participant: 'bg-green-100 text-green-800',
  spectator: 'bg-gray-100 text-gray-800'
};

export default function CompetitionDashboard({
  competitionId,
  currentUserId,
  onEditCompetition,
  onAddEvent,
  onInviteParticipants,
  onManagePermissions,
  onViewEvents,
  onViewParticipants,
  onViewSettings,
  className = ""
}: CompetitionDashboardProps) {
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [userRole, setUserRole] = useState<ParticipantRole | null>(null);
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});

  const competitionService = new CompetitionService();
  const eventService = new EventService();
  const participantService = new ParticipantService();
  const permissionService = new PermissionService();

  // Load dashboard data on component mount
  useEffect(() => {
    loadDashboardData();
  }, [competitionId]);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load competition details
      const competitionData = await competitionService.getCompetition(competitionId);
      setCompetition(competitionData);

      // Load events
      const eventsResponse = await eventService.getCompetitionEvents(competitionId);
      setEvents(eventsResponse.events);

      // Load participants
      const participantsResponse = await participantService.getCompetitionParticipants(competitionId);
      setParticipants(participantsResponse.participants);

      // Calculate metrics
      const calculatedMetrics = calculateMetrics(competitionData, eventsResponse.events, participantsResponse.participants);
      setMetrics(calculatedMetrics);

      // Determine user role and permissions
      const currentParticipant = participantsResponse.participants.find(p => p.user_id === currentUserId);
      if (currentParticipant) {
        setUserRole(currentParticipant.role);
        const permissions = await permissionService.getUserPermissions(currentUserId, competitionId);
        setUserPermissions(permissions);
      }

      // Generate recent activity (mock data for now)
      const activity = generateRecentActivity(competitionData, eventsResponse.events, participantsResponse.participants);
      setRecentActivity(activity);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setErrors({ load: 'Failed to load competition data' });
    } finally {
      setIsLoading(false);
    }
  }, [competitionId, currentUserId, competitionService, eventService, participantService, permissionService]);

  const calculateMetrics = useCallback((
    comp: Competition, 
    evts: Event[], 
    parts: Participant[]
  ): DashboardMetrics => {
    const now = new Date();
    const startDate = new Date(comp.start_date);
    const endDate = new Date(comp.end_date);

    const totalParticipants = parts.length;
    const acceptedParticipants = parts.filter(p => p.status === 'accepted').length;
    const pendingInvitations = parts.filter(p => p.status === 'invited').length;
    
    const totalEvents = evts.length;
    const upcomingEvents = evts.filter(e => new Date(e.scheduled_date) > now && e.status === 'scheduled').length;
    const completedEvents = evts.filter(e => e.status === 'completed').length;

    const daysUntilStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate progress percentage based on time elapsed
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    const progressPercentage = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);

    return {
      totalParticipants,
      acceptedParticipants,
      pendingInvitations,
      totalEvents,
      upcomingEvents,
      completedEvents,
      daysUntilStart,
      daysUntilEnd,
      progressPercentage
    };
  }, []);

  const generateRecentActivity = useCallback((
    comp: Competition, 
    evts: Event[], 
    parts: Participant[]
  ): RecentActivity[] => {
    const activities: RecentActivity[] = [];

    // Add competition creation
    activities.push({
      id: 'comp-created',
      type: 'competition_updated',
      title: 'Competition Created',
      description: `${comp.name} was created`,
      timestamp: new Date(comp.created_at),
      user: { id: comp.creator_id, name: 'Creator' }
    });

    // Add recent events
    evts.slice(0, 3).forEach(event => {
      activities.push({
        id: `event-${event.id}`,
        type: 'event_created',
        title: 'Event Created',
        description: `${event.name} was added to the competition`,
        timestamp: new Date(event.created_at)
      });
    });

    // Add recent participants
    parts.slice(0, 3).forEach(participant => {
      if (participant.status === 'accepted') {
        activities.push({
          id: `participant-${participant.id}`,
          type: 'participant_joined',
          title: 'Participant Joined',
          description: `${participant.user_profile?.full_name || 'A participant'} joined the competition`,
          timestamp: new Date(participant.accepted_at || participant.created_at),
          user: participant.user_profile ? {
            id: participant.user_id,
            name: participant.user_profile.full_name || 'Unknown',
            avatar: participant.user_profile.avatar_url
          } : undefined
        });
      }
    });

    // Sort by timestamp and return recent 10
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }, []);

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

  const getStatusColor = useCallback((status: CompetitionStatus) => {
    return STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  }, []);

  const getEventStatusColor = useCallback((status: EventStatus) => {
    return EVENT_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  }, []);

  const getRoleColor = useCallback((role: ParticipantRole) => {
    return ROLE_COLORS[role] || 'bg-gray-100 text-gray-800';
  }, []);

  const renderMetrics = () => {
    if (!metrics) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Participants</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalParticipants}</p>
              <p className="text-xs text-gray-500">{metrics.acceptedParticipants} accepted</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Events</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalEvents}</p>
              <p className="text-xs text-gray-500">{metrics.upcomingEvents} upcoming</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Time Left</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.daysUntilEnd > 0 ? `${metrics.daysUntilEnd}d` : 'Ended'}
              </p>
              <p className="text-xs text-gray-500">
                {metrics.daysUntilStart > 0 ? `Starts in ${metrics.daysUntilStart}d` : 'In progress'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Progress</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(metrics.progressPercentage)}%</p>
              <p className="text-xs text-gray-500">{metrics.completedEvents} completed</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderQuickActions = () => {
    if (!userPermissions) return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {userPermissions.can_edit_competition && onEditCompetition && (
            <button
              onClick={onEditCompetition}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-6 h-6 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Edit Competition</span>
            </button>
          )}

          {userPermissions.can_create_events && onAddEvent && (
            <button
              onClick={onAddEvent}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-6 h-6 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Add Event</span>
            </button>
          )}

          {userPermissions.can_invite_participants && onInviteParticipants && (
            <button
              onClick={onInviteParticipants}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-6 h-6 text-purple-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Invite Participants</span>
            </button>
          )}

          {userPermissions.can_change_roles && onManagePermissions && (
            <button
              onClick={onManagePermissions}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-6 h-6 text-orange-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Manage Permissions</span>
            </button>
          )}

          {onViewEvents && (
            <button
              onClick={onViewEvents}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-6 h-6 text-indigo-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-sm font-medium text-gray-700">View Events</span>
            </button>
          )}

          {onViewParticipants && (
            <button
              onClick={onViewParticipants}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-6 h-6 text-teal-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">View Participants</span>
            </button>
          )}

          {userPermissions.can_edit_settings && onViewSettings && (
            <button
              onClick={onViewSettings}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Settings</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderEventTimeline = () => {
    const upcomingEvents = events
      .filter(e => new Date(e.scheduled_date) > new Date())
      .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
      .slice(0, 5);

    return (
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Upcoming Events</h3>
          {onViewEvents && (
            <button
              onClick={onViewEvents}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All
            </button>
          )}
        </div>
        
        {upcomingEvents.length > 0 ? (
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{event.name}</h4>
                  <p className="text-sm text-gray-500">{event.event_type}</p>
                  <p className="text-xs text-gray-400">{formatDateTime(event.scheduled_date)}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 rounded ${getEventStatusColor(event.status)}`}>
                    {event.status.replace('_', ' ')}
                  </span>
                  {event.location && (
                    <span className="text-xs text-gray-500">
                      📍 {event.location.city || 'Location'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p>No upcoming events</p>
          </div>
        )}
      </div>
    );
  };

  const renderParticipantSummary = () => {
    const acceptedParticipants = participants.filter(p => p.status === 'accepted');
    const pendingParticipants = participants.filter(p => p.status === 'invited');

    return (
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Participants</h3>
          {onViewParticipants && (
            <button
              onClick={onViewParticipants}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Accepted ({acceptedParticipants.length})</h4>
            <div className="space-y-2">
              {acceptedParticipants.slice(0, 3).map((participant) => (
                <div key={participant.id} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {participant.user_profile?.full_name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {participant.user_profile?.full_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-gray-500">{participant.user_profile?.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${getRoleColor(participant.role)}`}>
                    {participant.role}
                  </span>
                </div>
              ))}
              {acceptedParticipants.length > 3 && (
                <p className="text-xs text-gray-500">
                  +{acceptedParticipants.length - 3} more participants
                </p>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Pending Invitations ({pendingParticipants.length})</h4>
            {pendingParticipants.length > 0 ? (
              <div className="space-y-2">
                {pendingParticipants.slice(0, 3).map((participant) => (
                  <div key={participant.id} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {participant.user_profile?.full_name || 'Unknown User'}
                      </p>
                      <p className="text-xs text-gray-500">{participant.user_profile?.email}</p>
                    </div>
                    <span className="text-xs text-yellow-600">Invited</span>
                  </div>
                ))}
                {pendingParticipants.length > 3 && (
                  <p className="text-xs text-gray-500">
                    +{pendingParticipants.length - 3} more pending
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No pending invitations</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderRecentActivity = () => {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
        
        {recentActivity.length > 0 ? (
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <p className="text-sm text-gray-500">{activity.description}</p>
                  <p className="text-xs text-gray-400">{formatDateTime(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No recent activity</p>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading competition dashboard...</span>
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

  if (!competition) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="text-center py-8 text-gray-500">
          <p>Competition not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Competition Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{competition.name}</h1>
              <span className={`text-sm px-3 py-1 rounded-full ${getStatusColor(competition.status)}`}>
                {competition.status.charAt(0).toUpperCase() + competition.status.slice(1)}
              </span>
            </div>
            {competition.description && (
              <p className="text-gray-600 mb-4">{competition.description}</p>
            )}
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <span>📅 {formatDate(competition.start_date)} - {formatDate(competition.end_date)}</span>
              <span>👤 {userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'Unknown Role'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      {renderMetrics()}

      {/* Quick Actions */}
      {renderQuickActions()}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Timeline */}
        {renderEventTimeline()}

        {/* Participant Summary */}
        {renderParticipantSummary()}
      </div>

      {/* Recent Activity */}
      {renderRecentActivity()}
    </div>
  );
}
