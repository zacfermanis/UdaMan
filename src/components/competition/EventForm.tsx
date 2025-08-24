'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { 
  CreateEventData, 
  UpdateEventData, 
  Event, 
  EventStatus,
  EventLocation,
  ScoringConfig,
  EventTypeSuggestion,
  EventTypeCategory
} from '@/types/competition';

interface EventFormProps {
  competitionId: string;
  event?: Event; // For editing existing events
  onSuccess?: (eventId: string) => void;
  onCancel?: () => void;
}

interface FormData {
  name: string;
  description: string;
  eventType: string;
  location: EventLocation;
  scheduledDate: string;
  durationMinutes: number;
  maxParticipants: number;
  rules: string;
  requirements: string;
  scoringConfig: ScoringConfig;
  status: EventStatus;
}

interface FormErrors {
  [key: string]: string;
}

const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
  { value: 300, label: '5 hours' },
  { value: 480, label: '8 hours' },
  { value: 720, label: '12 hours' },
  { value: 1440, label: '24 hours' }
];

const MAX_PARTICIPANTS_OPTIONS = [
  { value: 2, label: '2 participants' },
  { value: 4, label: '4 participants' },
  { value: 8, label: '8 participants' },
  { value: 16, label: '16 participants' },
  { value: 32, label: '32 participants' },
  { value: 64, label: '64 participants' },
  { value: 128, label: '128 participants' },
  { value: 256, label: '256 participants' },
  { value: 512, label: '512 participants' },
  { value: 1000, label: '1000 participants' },
  { value: 0, label: 'Unlimited' }
];

export default function EventForm({ competitionId, event, onSuccess, onCancel }: EventFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [eventTypeSuggestions, setEventTypeSuggestions] = useState<EventTypeSuggestion[]>([]);
  const [showEventTypeSuggestions, setShowEventTypeSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    name: event?.name || '',
    description: event?.description || '',
    eventType: event?.event_type || '',
    location: event?.location || {
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      coordinates: null
    },
    scheduledDate: event?.scheduled_date ? new Date(event.scheduled_date).toISOString().slice(0, 16) : '',
    durationMinutes: event?.duration_minutes || 60,
    maxParticipants: event?.max_participants || 16,
    rules: event?.rules || '',
    requirements: event?.requirements || '',
    scoringConfig: event?.scoring_config || {
      type: 'position_based',
      points: {
        first: 10,
        second: 8,
        third: 6,
        fourth: 4,
        fifth: 2,
        participation: 1
      },
      customRules: ''
    },
    status: event?.status || 'scheduled'
  });



  // Load event type suggestions on component mount
  useEffect(() => {
    loadEventTypeSuggestions();
  }, []);

  const loadEventTypeSuggestions = useCallback(async () => {
    setIsLoadingSuggestions(true);
    try {
      const response = await fetch('/api/event-types?limit=20', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load event type suggestions');
      }

      const data = await response.json();
      setEventTypeSuggestions(data.suggestions);
    } catch (error) {
      console.error('Failed to load event type suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  const searchEventTypes = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setShowEventTypeSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const response = await fetch(`/api/event-types?search=${encodeURIComponent(searchTerm)}&includePredefined=true`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to search event types');
      }

      const data = await response.json();
      setEventTypeSuggestions(data.suggestions);
      setShowEventTypeSuggestions(true);
    } catch (error) {
      console.error('Failed to search event types:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Basic validation
    if (!formData.name.trim()) {
      newErrors.name = 'Event name is required';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Event name must be 255 characters or less';
    }

    if (formData.description.length > 1000) {
      newErrors.description = 'Description must be 1000 characters or less';
    }

    if (!formData.eventType.trim()) {
      newErrors.eventType = 'Event type is required';
    }

    // Location validation
    if (!formData.location.address.trim()) {
      newErrors.locationAddress = 'Address is required';
    }

    // Date validation
    if (!formData.scheduledDate) {
      newErrors.scheduledDate = 'Scheduled date is required';
    } else {
      const scheduledDate = new Date(formData.scheduledDate);
      const now = new Date();
      if (scheduledDate < now) {
        newErrors.scheduledDate = 'Scheduled date cannot be in the past';
      }
    }

    // Duration validation
    if (formData.durationMinutes <= 0) {
      newErrors.durationMinutes = 'Duration must be greater than 0';
    }

    // Max participants validation
    if (formData.maxParticipants < 0) {
      newErrors.maxParticipants = 'Max participants cannot be negative';
    }

    // Rules and requirements validation
    if (formData.rules.length > 2000) {
      newErrors.rules = 'Rules must be 2000 characters or less';
    }

    if (formData.requirements.length > 2000) {
      newErrors.requirements = 'Requirements must be 2000 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Special handling for event type search
    if (field === 'eventType') {
      searchEventTypes(value);
    }
  }, [errors, searchEventTypes]);

  const handleLocationChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value
      }
    }));
    
    // Clear location error when user starts typing
    if (errors[`location${field.charAt(0).toUpperCase() + field.slice(1)}`]) {
      setErrors(prev => ({ ...prev, [`location${field.charAt(0).toUpperCase() + field.slice(1)}`]: '' }));
    }
  }, [errors]);

  const handleScoringConfigChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      scoringConfig: {
        ...prev.scoringConfig,
        [field]: value
      }
    }));
  }, []);

  const handlePointsChange = useCallback((position: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      scoringConfig: {
        ...prev.scoringConfig,
        points: {
          ...prev.scoringConfig.points,
          [position]: value
        }
      }
    }));
  }, []);

  const handleEventTypeSelect = useCallback((eventType: string) => {
    setFormData(prev => ({ ...prev, eventType }));
    setShowEventTypeSuggestions(false);
    
    // Note: Usage count increment is now handled server-side when creating events
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const eventData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        event_type: formData.eventType.trim(),
        location: formData.location,
        scheduled_date: new Date(formData.scheduledDate),
        duration_minutes: formData.durationMinutes,
        max_participants: formData.maxParticipants,
        rules: formData.rules.trim() || undefined,
        requirements: formData.requirements.trim() || undefined,
        scoring_config: formData.scoringConfig,
        status: formData.status
      };

      let response: Response;
      
      if (event) {
        // Update existing event
        response = await fetch(`/api/competitions/${competitionId}/events/${event.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(eventData),
        });
      } else {
        // Create new event
        response = await fetch(`/api/competitions/${competitionId}/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(eventData),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save event');
      }

      const data = await response.json();
      const createdEvent = data.event;
      
      if (onSuccess) {
        onSuccess(createdEvent.id);
      }
    } catch (error) {
      console.error('Failed to save event:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to save event' });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, event, competitionId, onSuccess]);

  const renderEventTypeSelector = () => (
    <div className="relative">
      <label htmlFor="eventType" className="block text-sm font-medium text-gray-700 mb-2">
        Event Type *
      </label>
      <input
        type="text"
        id="eventType"
        value={formData.eventType}
        onChange={(e) => handleInputChange('eventType', e.target.value)}
        onFocus={() => setShowEventTypeSuggestions(true)}
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          errors.eventType ? 'border-red-300' : 'border-gray-300'
        }`}
        placeholder="Search or type event type"
      />
      {errors.eventType && <p className="mt-1 text-sm text-red-600">{errors.eventType}</p>}
      
      {/* Event Type Suggestions Dropdown */}
      {showEventTypeSuggestions && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {isLoadingSuggestions ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : eventTypeSuggestions.length > 0 ? (
            <div>
              {eventTypeSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleEventTypeSelect(suggestion.name)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                >
                  <div className="font-medium">{suggestion.name}</div>
                  <div className="text-sm text-gray-500 capitalize">
                    {suggestion.category} • {suggestion.source}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">No event types found</div>
          )}
        </div>
      )}
    </div>
  );

  const renderLocationSection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Location</h3>
      
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
          Address *
        </label>
        <input
          type="text"
          id="address"
          value={formData.location.address}
          onChange={(e) => handleLocationChange('address', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.locationAddress ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Enter full address"
        />
        {errors.locationAddress && <p className="mt-1 text-sm text-red-600">{errors.locationAddress}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
            City
          </label>
          <input
            type="text"
            id="city"
            value={formData.location.city}
            onChange={(e) => handleLocationChange('city', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="City"
          />
        </div>

        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
            State/Province
          </label>
          <input
            type="text"
            id="state"
            value={formData.location.state}
            onChange={(e) => handleLocationChange('state', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="State"
          />
        </div>

        <div>
          <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-2">
            ZIP/Postal Code
          </label>
          <input
            type="text"
            id="zipCode"
            value={formData.location.zipCode}
            onChange={(e) => handleLocationChange('zipCode', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="ZIP Code"
          />
        </div>
      </div>

      <div>
        <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
          Country
        </label>
        <input
          type="text"
          id="country"
          value={formData.location.country}
          onChange={(e) => handleLocationChange('country', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Country"
        />
      </div>
    </div>
  );

  const renderScoringSection = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Scoring Configuration</h3>
      
      <div>
        <label htmlFor="scoringType" className="block text-sm font-medium text-gray-700 mb-2">
          Scoring Type
        </label>
        <select
          id="scoringType"
          value={formData.scoringConfig.type}
          onChange={(e) => handleScoringConfigChange('type', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="position_based">Position-based scoring</option>
          <option value="custom">Custom scoring</option>
        </select>
      </div>

      {formData.scoringConfig.type === 'position_based' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(formData.scoringConfig.points).map(([position, points]) => (
            <div key={position}>
              <label htmlFor={`points-${position}`} className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                {position} Place
              </label>
              <input
                type="number"
                id={`points-${position}`}
                value={points}
                onChange={(e) => handlePointsChange(position, parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
              />
            </div>
          ))}
        </div>
      )}

      {formData.scoringConfig.type === 'custom' && (
        <div>
          <label htmlFor="customRules" className="block text-sm font-medium text-gray-700 mb-2">
            Custom Scoring Rules
          </label>
          <textarea
            id="customRules"
            value={formData.scoringConfig.customRules}
            onChange={(e) => handleScoringConfigChange('customRules', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe your custom scoring rules..."
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {event ? 'Edit Event' : 'Create New Event'}
        </h2>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Event Name *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter event name"
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
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe the event (optional)"
                maxLength={1000}
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
              <p className="mt-1 text-sm text-gray-500">
                {formData.description.length}/1000 characters
              </p>
            </div>

            {renderEventTypeSelector()}
          </div>

          {/* Scheduling */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Scheduling</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled Date & Time *
                </label>
                <input
                  type="datetime-local"
                  id="scheduledDate"
                  value={formData.scheduledDate}
                  onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.scheduledDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.scheduledDate && <p className="mt-1 text-sm text-red-600">{errors.scheduledDate}</p>}
              </div>

              <div>
                <label htmlFor="durationMinutes" className="block text-sm font-medium text-gray-700 mb-2">
                  Duration
                </label>
                <select
                  id="durationMinutes"
                  value={formData.durationMinutes}
                  onChange={(e) => handleInputChange('durationMinutes', parseInt(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.durationMinutes ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  {DURATION_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.durationMinutes && <p className="mt-1 text-sm text-red-600">{errors.durationMinutes}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="maxParticipants" className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Participants
              </label>
              <select
                id="maxParticipants"
                value={formData.maxParticipants}
                onChange={(e) => handleInputChange('maxParticipants', parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.maxParticipants ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                {MAX_PARTICIPANTS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.maxParticipants && <p className="mt-1 text-sm text-red-600">{errors.maxParticipants}</p>}
            </div>
          </div>

          {/* Location */}
          {renderLocationSection()}

          {/* Rules and Requirements */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Rules & Requirements</h3>
            
            <div>
              <label htmlFor="rules" className="block text-sm font-medium text-gray-700 mb-2">
                Event Rules
              </label>
              <textarea
                id="rules"
                value={formData.rules}
                onChange={(e) => handleInputChange('rules', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.rules ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe the rules for this event..."
                maxLength={2000}
              />
              {errors.rules && <p className="mt-1 text-sm text-red-600">{errors.rules}</p>}
              <p className="mt-1 text-sm text-gray-500">
                {formData.rules.length}/2000 characters
              </p>
            </div>

            <div>
              <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 mb-2">
                Requirements
              </label>
              <textarea
                id="requirements"
                value={formData.requirements}
                onChange={(e) => handleInputChange('requirements', e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.requirements ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="List any requirements for participants..."
                maxLength={2000}
              />
              {errors.requirements && <p className="mt-1 text-sm text-red-600">{errors.requirements}</p>}
              <p className="mt-1 text-sm text-gray-500">
                {formData.requirements.length}/2000 characters
              </p>
            </div>
          </div>

          {/* Scoring Configuration */}
          {renderScoringSection()}

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Event Status
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value as EventStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Error Display */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : (event ? 'Update Event' : 'Create Event')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
