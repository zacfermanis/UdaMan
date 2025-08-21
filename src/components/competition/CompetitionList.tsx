'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Competition, CompetitionStatus } from '@/types/competition';

interface CompetitionListProps {
  userId: string;
  className?: string;
}

interface FormErrors {
  [key: string]: string;
}

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  active: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200'
};

const STATUS_LABELS = {
  draft: 'Draft',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

export default function CompetitionList({ 
  userId, 
  className = "" 
}: CompetitionListProps) {
  const router = useRouter();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    loadCompetitions();
  }, [userId]);

  const loadCompetitions = async () => {
    try {
      setIsLoading(true);
      setErrors({});
      
      const response = await fetch('/api/competitions', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCompetitions(data.competitions || []);
    } catch (error) {
      console.error('Error loading competitions:', error);
      setErrors({ general: error instanceof Error ? error.message : 'Failed to load competitions' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (errors.general) {
    return (
      <div className={`p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 ${className}`}>
        <p className="text-red-800 dark:text-red-200">{errors.general}</p>
      </div>
    );
  }

  if (competitions.length === 0) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No competitions yet</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Get started by creating your first competition
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid gap-4">
        {competitions.map((competition) => (
          <div
            key={competition.id}
            onClick={() => router.push(`/competitions/${competition.id}`)}
            className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {competition.name}
                  </h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[competition.status]}`}>
                    {STATUS_LABELS[competition.status]}
                  </span>
                </div>
                
                {competition.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {competition.description}
                  </p>
                )}
                
                <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Starts {formatDate(competition.start_date)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Ends {formatDate(competition.end_date)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>{competition.metadata?.total_participants || 0} participants</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <span>{competition.metadata?.total_events || 0} events</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
