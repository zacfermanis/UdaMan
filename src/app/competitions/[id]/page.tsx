'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CompetitionDashboard from '@/components/competition/CompetitionDashboard';
import { Competition } from '@/types/competition';

export default function CompetitionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const competitionId = params.id as string;

  useEffect(() => {
    const fetchCompetition = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/competitions/${competitionId}`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 404) {
            setError('Competition not found');
          } else if (response.status === 401) {
            router.push('/auth/login');
            return;
          } else {
            throw new Error('Failed to fetch competition');
          }
        }

        const data = await response.json();
        // Convert date strings to Date objects
        const competitionWithDates = {
          ...data.competition,
          start_date: new Date(data.competition.start_date),
          end_date: new Date(data.competition.end_date),
          created_at: new Date(data.competition.created_at),
          updated_at: new Date(data.competition.updated_at)
        };
        setCompetition(competitionWithDates);
      } catch (err) {
        console.error('Error fetching competition:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch competition');
      } finally {
        setLoading(false);
      }
    };

    if (competitionId) {
      fetchCompetition();
    }
  }, [competitionId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-6"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="text-center">
                <div className="text-red-500 text-6xl mb-4">⚠️</div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Competition Not Found
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {error}
                </p>
                <button
                  onClick={() => router.push('/competitions')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Back to Competitions
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!competition) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {competition.name}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  {competition.description || 'No description provided'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(competition.status)}`}>
                  {competition.status.charAt(0).toUpperCase() + competition.status.slice(1)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Start Date</h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {competition.start_date.toLocaleDateString()}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">End Date</h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {competition.end_date.toLocaleDateString()}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Created</h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {competition.created_at.toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Competition Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <span className={`w-3 h-3 rounded-full ${competition.settings.allowSpectators ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-gray-700 dark:text-gray-300">
                    Spectators: {competition.settings.allowSpectators ? 'Allowed' : 'Not Allowed'}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`w-3 h-3 rounded-full ${competition.settings.publicLeaderboard ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-gray-700 dark:text-gray-300">
                    Public Leaderboard: {competition.settings.publicLeaderboard ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`w-3 h-3 rounded-full ${competition.settings.autoStartEvents ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-gray-700 dark:text-gray-300">
                    Auto-start Events: {competition.settings.autoStartEvents ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <span className="text-gray-700 dark:text-gray-300">
                    Scoring System: {competition.settings.scoringSystem.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => router.push(`/competitions/${competitionId}/events`)}
                  className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <div className="text-blue-600 dark:text-blue-400 font-medium">Manage Events</div>
                  <div className="text-sm text-blue-500 dark:text-blue-300">Add and organize events</div>
                </button>
                <button
                  onClick={() => router.push(`/competitions/${competitionId}/participants`)}
                  className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  <div className="text-green-600 dark:text-green-400 font-medium">Manage Participants</div>
                  <div className="text-sm text-green-500 dark:text-green-300">Invite and manage people</div>
                </button>
                <button
                  onClick={() => router.push(`/competitions/${competitionId}/settings`)}
                  className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                >
                  <div className="text-purple-600 dark:text-purple-400 font-medium">Settings</div>
                  <div className="text-sm text-purple-500 dark:text-purple-300">Configure competition</div>
                </button>
                <button
                  onClick={() => router.push('/competitions')}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="text-gray-600 dark:text-gray-400 font-medium">Back to List</div>
                  <div className="text-sm text-gray-500 dark:text-gray-500">View all competitions</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'completed':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  }
}
