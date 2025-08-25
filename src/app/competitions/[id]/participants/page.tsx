'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ParticipantList from '@/components/competition/ParticipantList';
import ParticipantInvite from '@/components/competition/ParticipantInvite';
import { Competition, Participant } from '@/types/competition';

interface ParticipantManagementPageProps {
  // Props will be passed from the parent component
}

export default function ParticipantManagementPage({}: ParticipantManagementPageProps) {
  const params = useParams();
  const router = useRouter();
  const competitionId = params.id as string;
  
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);



  // Load competition and user data on component mount
  useEffect(() => {
    loadCompetitionData();
  }, [competitionId]);

  const loadCompetitionData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load competition details and permissions via API
      const response = await fetch(`/api/competitions/${competitionId}/participants`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login');
          return;
        } else if (response.status === 404) {
          setError('Competition not found');
          return;
        } else if (response.status === 403) {
          setError('Access denied');
          return;
        } else {
          throw new Error('Failed to fetch competition data');
        }
      }

      const data = await response.json();
      
      // For now, we'll create a minimal competition object from the participants data
      // In a real implementation, you might want a separate API endpoint for competition details
      setCompetition({
        id: competitionId,
        creator_id: '', // This should come from a proper competition API
        name: `Competition ${competitionId}`, // This should come from a proper competition API
        description: '',
        start_date: new Date(),
        end_date: new Date(),
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
        settings: {
          allow_spectators: true,
          public_leaderboard: true,
          auto_start_events: false,
          scoring_system: 'position_based'
        },
        metadata: {}
      });

      // Get current user ID from session
      const userId = await getCurrentUserId();
      setCurrentUserId(userId);

      // Set permissions from API response
      setUserPermissions(data.permissions);

    } catch (error) {
      console.error('Failed to load competition data:', error);
      setError('Failed to load competition data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [competitionId, router]);

  const getCurrentUserId = useCallback(async (): Promise<string> => {
    // This should be replaced with actual session management
    // For now, we'll use a placeholder implementation
    try {
      const response = await fetch('/api/auth/validate-session');
      if (response.ok) {
        const data = await response.json();
        return data.user?.id || '';
      }
    } catch (error) {
      console.error('Failed to get current user:', error);
    }
    return '';
  }, []);

  const handleInviteParticipants = useCallback(() => {
    setShowInviteForm(true);
  }, []);

  const handleInviteSuccess = useCallback((invitedParticipants: any[]) => {
    setShowInviteForm(false);
    
    // Optionally refresh the participant list or show success message
    console.log('Participants invited successfully:', invitedParticipants);
  }, []);

  const handleInviteCancel = useCallback(() => {
    setShowInviteForm(false);
  }, []);

  const handleBackToCompetition = useCallback(() => {
    router.push(`/competitions/${competitionId}`);
  }, [router, competitionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading participant management...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={loadCompetitionData}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">Competition not found</p>
            <button
              onClick={() => router.push('/competitions')}
              className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              Back to Competitions
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!userPermissions.can_view_participants) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-sm text-red-600 dark:text-red-400">You don't have permission to view participants for this competition.</p>
            <button
              onClick={handleBackToCompetition}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Back to Competition
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={handleBackToCompetition}
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-2"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Competition
              </button>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Participant Management</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Managing participants for "{competition.name}"
              </p>
            </div>
            
            {userPermissions.can_invite_participants && !showInviteForm && (
              <button
                onClick={handleInviteParticipants}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Invite Participants
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        {showInviteForm ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <ParticipantInvite
              competitionId={competitionId}
              onSuccess={handleInviteSuccess}
              onCancel={handleInviteCancel}
            />
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
            <ParticipantList
              competitionId={competitionId}
              currentUserId={currentUserId}
              userPermissions={userPermissions}
            />
          </div>
        )}

        {/* Permission Info */}
        {!userPermissions.can_invite_participants && (
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                You can view participants but don't have permission to invite or manage them. 
                Contact the competition creator for additional permissions.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
