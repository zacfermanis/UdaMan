'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { CreateCompetitionData, CompetitionStatus } from '@/types/competition';

interface CompetitionFormProps {
  onSuccess?: (competitionId: string) => void;
  onCancel?: () => void;
}

interface FormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: CompetitionStatus;
  settings: {
    allowSpectators: boolean;
    publicLeaderboard: boolean;
    autoStartEvents: boolean;
    tieBreakingRules: string;
    scoringSystem: 'position_based' | 'custom';
  };
}

interface FormErrors {
  [key: string]: string;
}

const STEPS = [
  { id: 'basic', title: 'Basic Information', description: 'Set up the basic competition details' },
  { id: 'dates', title: 'Schedule', description: 'Define competition dates and timeline' },
  { id: 'settings', title: 'Settings', description: 'Configure competition behavior and options' },
  { id: 'review', title: 'Review', description: 'Review and create your competition' }
];

export default function CompetitionForm({ onSuccess, onCancel }: CompetitionFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'draft',
    settings: {
      allowSpectators: true,
      publicLeaderboard: true,
      autoStartEvents: false,
      tieBreakingRules: '',
      scoringSystem: 'position_based'
    }
  });



  const validateStep = useCallback((step: number): boolean => {
    const newErrors: FormErrors = {};

    switch (step) {
      case 0: // Basic Information
        if (!formData.name.trim()) {
          newErrors.name = 'Competition name is required';
        } else if (formData.name.length > 255) {
          newErrors.name = 'Competition name must be 255 characters or less';
        }
        if (formData.description.length > 1000) {
          newErrors.description = 'Description must be 1000 characters or less';
        }
        break;

      case 1: // Schedule
        if (!formData.startDate) {
          newErrors.startDate = 'Start date is required';
        }
        if (!formData.endDate) {
          newErrors.endDate = 'End date is required';
        }
        if (formData.startDate && formData.endDate) {
          const startDate = new Date(formData.startDate);
          const endDate = new Date(formData.endDate);
          const now = new Date();

          if (startDate < now) {
            newErrors.startDate = 'Start date cannot be in the past';
          }
          if (endDate <= startDate) {
            newErrors.endDate = 'End date must be after start date';
          }
          if (endDate < now) {
            newErrors.endDate = 'End date cannot be in the past';
          }
        }
        break;

      case 2: // Settings
        if (formData.settings.tieBreakingRules.length > 500) {
          newErrors.tieBreakingRules = 'Tie-breaking rules must be 500 characters or less';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  }, [currentStep, validateStep]);

  const handlePrevious = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const handleSettingsChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value
      }
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const competitionData: CreateCompetitionData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        start_date: new Date(formData.startDate),
        end_date: new Date(formData.endDate),
        status: formData.status,
        settings: formData.settings
      };

      const response = await fetch('/api/competitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(competitionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create competition');
      }

      const competition = await response.json();
      
      if (onSuccess) {
        onSuccess(competition.id);
      } else {
        router.push(`/competitions/${competition.id}`);
      }
    } catch (error) {
      console.error('Failed to create competition:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create competition' });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, currentStep, validateStep, onSuccess, router]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Competition Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter competition name"
                maxLength={255}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe your competition (optional)"
                maxLength={1000}
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              <p className="mt-1 text-sm text-gray-500">
                {formData.description.length}/1000 characters
              </p>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="datetime-local"
                id="startDate"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 ${
                  errors.startDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="datetime-local"
                id="endDate"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 ${
                  errors.endDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Initial Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as CompetitionStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Draft competitions are not visible to participants until activated
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowSpectators"
                  checked={formData.settings.allowSpectators}
                  onChange={(e) => handleSettingsChange('allowSpectators', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="allowSpectators" className="ml-2 block text-sm text-gray-700">
                  Allow spectators to view the competition
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="publicLeaderboard"
                  checked={formData.settings.publicLeaderboard}
                  onChange={(e) => handleSettingsChange('publicLeaderboard', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="publicLeaderboard" className="ml-2 block text-sm text-gray-700">
                  Make leaderboard public to all participants
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoStartEvents"
                  checked={formData.settings.autoStartEvents}
                  onChange={(e) => handleSettingsChange('autoStartEvents', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="autoStartEvents" className="ml-2 block text-sm text-gray-700">
                  Automatically start events at scheduled times
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="scoringSystem" className="block text-sm font-medium text-gray-700 mb-2">
                Scoring System
              </label>
              <select
                id="scoringSystem"
                value={formData.settings.scoringSystem}
                onChange={(e) => handleSettingsChange('scoringSystem', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
              >
                <option value="position_based">Position-based scoring</option>
                <option value="custom">Custom scoring</option>
              </select>
            </div>

            <div>
              <label htmlFor="tieBreakingRules" className="block text-sm font-medium text-gray-700 mb-2">
                Tie-breaking Rules
              </label>
              <textarea
                id="tieBreakingRules"
                value={formData.settings.tieBreakingRules}
                onChange={(e) => handleSettingsChange('tieBreakingRules', e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 ${
                  errors.tieBreakingRules ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe how ties will be broken (optional)"
                maxLength={500}
              />
              {errors.tieBreakingRules && <p className="mt-1 text-sm text-red-600">{errors.tieBreakingRules}</p>}
              <p className="mt-1 text-sm text-gray-500">
                {formData.settings.tieBreakingRules.length}/500 characters
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Competition Summary</h3>
              
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">Name:</span>
                  <span className="ml-2 text-gray-900">{formData.name}</span>
                </div>
                
                {formData.description && (
                  <div>
                    <span className="font-medium text-gray-700">Description:</span>
                    <p className="mt-1 text-gray-900">{formData.description}</p>
                  </div>
                )}
                
                <div>
                  <span className="font-medium text-gray-700">Start Date:</span>
                  <span className="ml-2 text-gray-900">
                    {formData.startDate ? new Date(formData.startDate).toLocaleString() : 'Not set'}
                  </span>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">End Date:</span>
                  <span className="ml-2 text-gray-900">
                    {formData.endDate ? new Date(formData.endDate).toLocaleString() : 'Not set'}
                  </span>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className="ml-2 text-gray-900 capitalize">{formData.status}</span>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Settings:</span>
                  <ul className="mt-1 ml-4 text-gray-900">
                    <li>• Spectators: {formData.settings.allowSpectators ? 'Allowed' : 'Not allowed'}</li>
                    <li>• Public Leaderboard: {formData.settings.publicLeaderboard ? 'Yes' : 'No'}</li>
                    <li>• Auto-start Events: {formData.settings.autoStartEvents ? 'Yes' : 'No'}</li>
                    <li>• Scoring System: {formData.settings.scoringSystem.replace('_', ' ')}</li>
                  </ul>
                </div>
              </div>
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step Indicator */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {STEPS.map((step, index) => (
              <li key={step.id} className={`flex-1 ${index !== STEPS.length - 1 ? 'pr-8' : ''}`}>
                <div className="flex items-center">
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      index <= currentStep
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {index < currentStep ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  {index !== STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 ml-4 ${
                        index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
                <div className="mt-2">
                  <p className={`text-sm font-medium ${
                    index <= currentStep ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-400">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </div>

             {/* Step Content */}
       <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
         {renderStepContent()}
       </div>

      {/* Navigation Buttons */}
      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <div className="flex space-x-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
          )}

          {currentStep === STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Competition'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
