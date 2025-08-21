'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { EventTypeService } from '@/lib/competition/event-type-service';
import { 
  EventTypeSuggestion, 
  EventTypeCategory, 
  CreateEventTypeData 
} from '@/types/competition';

interface EventTypeSelectorProps {
  value: string;
  onChange: (eventType: string) => void;
  onCustomTypeCreated?: (eventType: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  showCreateOption?: boolean;
  maxSuggestions?: number;
}

interface CreateEventTypeFormData {
  name: string;
  description: string;
  category: EventTypeCategory;
}

interface FormErrors {
  [key: string]: string;
}

const CATEGORY_OPTIONS: { value: EventTypeCategory; label: string; description: string }[] = [
  { value: 'sports', label: 'Sports', description: 'Physical activities and games' },
  { value: 'outdoor', label: 'Outdoor', description: 'Nature and adventure activities' },
  { value: 'indoor', label: 'Indoor', description: 'Indoor games and activities' },
  { value: 'creative', label: 'Creative', description: 'Artistic and creative pursuits' },
  { value: 'physical', label: 'Physical', description: 'Fitness and physical challenges' },
  { value: 'technical', label: 'Technical', description: 'Technology and skill-based activities' }
];

export default function EventTypeSelector({
  value,
  onChange,
  onCustomTypeCreated,
  placeholder = "Search or type event type",
  required = false,
  disabled = false,
  error,
  className = "",
  showCreateOption = true,
  maxSuggestions = 10
}: EventTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<EventTypeSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreateEventTypeFormData>({
    name: '',
    description: '',
    category: 'sports'
  });
  const [createErrors, setCreateErrors] = useState<FormErrors>({});
  const [isCreating, setIsCreating] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const eventTypeService = new EventTypeService();

  // Load initial suggestions
  useEffect(() => {
    loadInitialSuggestions();
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCreateForm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle escape key to close dropdown
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setShowCreateForm(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const loadInitialSuggestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const initialSuggestions = await eventTypeService.getEventTypeSuggestions('', maxSuggestions);
      setSuggestions(initialSuggestions);
    } catch (error) {
      console.error('Failed to load event type suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventTypeService, maxSuggestions]);

  const searchEventTypes = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await eventTypeService.searchEventTypes('', searchTerm, true);
      setSuggestions(results.slice(0, maxSuggestions));
    } catch (error) {
      console.error('Failed to search event types:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventTypeService, maxSuggestions]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setValue(newValue);
    
    if (newValue.length >= 2) {
      searchEventTypes(newValue);
    } else if (newValue.length === 0) {
      loadInitialSuggestions();
    }
    
    setIsOpen(true);
    setShowCreateForm(false);
  }, [searchEventTypes, loadInitialSuggestions]);

  const setValue = useCallback((newValue: string) => {
    onChange(newValue);
  }, [onChange]);

  const handleSuggestionSelect = useCallback((eventType: string) => {
    setValue(eventType);
    setSearchTerm(eventType);
    setIsOpen(false);
    setShowCreateForm(false);
    
    // Increment usage count for the selected event type
    eventTypeService.incrementUsageCount(eventType, '').catch(console.error);
  }, [setValue, eventTypeService]);

  const handleCreateNew = useCallback(() => {
    setShowCreateForm(true);
    setCreateFormData({
      name: searchTerm,
      description: '',
      category: 'sports'
    });
  }, [searchTerm]);

  const validateCreateForm = useCallback((): boolean => {
    const errors: FormErrors = {};

    if (!createFormData.name.trim()) {
      errors.name = 'Event type name is required';
    } else if (createFormData.name.length > 255) {
      errors.name = 'Event type name must be 255 characters or less';
    }

    if (createFormData.description.length > 1000) {
      errors.description = 'Description must be 1000 characters or less';
    }

    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  }, [createFormData]);

  const handleCreateSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCreateForm()) {
      return;
    }

    setIsCreating(true);
    try {
      const eventTypeData: CreateEventTypeData = {
        name: createFormData.name.trim(),
        description: createFormData.description.trim() || undefined,
        category: createFormData.category
      };

      const newEventType = await eventTypeService.createEventType(eventTypeData, '');
      
      // Update the selector value
      setValue(newEventType.name);
      setSearchTerm(newEventType.name);
      
      // Notify parent component
      if (onCustomTypeCreated) {
        onCustomTypeCreated(newEventType.name);
      }
      
      // Close the form and dropdown
      setShowCreateForm(false);
      setIsOpen(false);
      
      // Clear form data
      setCreateFormData({
        name: '',
        description: '',
        category: 'sports'
      });
    } catch (error) {
      console.error('Failed to create event type:', error);
      setCreateErrors({ submit: error instanceof Error ? error.message : 'Failed to create event type' });
    } finally {
      setIsCreating(false);
    }
  }, [createFormData, validateCreateForm, eventTypeService, setValue, onCustomTypeCreated]);

  const handleInputFocus = useCallback(() => {
    if (!disabled) {
      setIsOpen(true);
      if (searchTerm.length === 0) {
        loadInitialSuggestions();
      }
    }
  }, [disabled, searchTerm, loadInitialSuggestions]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    }
  }, [isOpen]);

  const renderSuggestions = () => {
    if (isLoading) {
      return (
        <div className="p-4 text-center text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm">Loading...</p>
        </div>
      );
    }

    if (suggestions.length === 0 && searchTerm.length >= 2) {
      return (
        <div className="p-4 text-center text-gray-500">
          <p className="text-sm">No event types found</p>
          {showCreateOption && (
            <button
              type="button"
              onClick={handleCreateNew}
              className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Create "{searchTerm}"
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="max-h-60 overflow-auto">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleSuggestionSelect(suggestion.name)}
            className="w-full px-4 py-3 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
          >
            <div className="font-medium text-gray-900">{suggestion.name}</div>
            <div className="text-sm text-gray-500 capitalize">
              {suggestion.category} • {suggestion.source}
              {suggestion.usageCount > 0 && ` • ${suggestion.usageCount} uses`}
            </div>
          </button>
        ))}
        
        {showCreateOption && searchTerm.length >= 2 && suggestions.length > 0 && (
          <div className="border-t border-gray-200">
            <button
              type="button"
              onClick={handleCreateNew}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-blue-600 hover:text-blue-700"
            >
              <div className="font-medium">Create "{searchTerm}"</div>
              <div className="text-sm">Add as new event type</div>
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderCreateForm = () => (
    <div className="p-4 border-t border-gray-200 bg-gray-50">
      <form onSubmit={handleCreateSubmit} className="space-y-4">
        <div>
          <label htmlFor="create-name" className="block text-sm font-medium text-gray-700 mb-1">
            Event Type Name *
          </label>
          <input
            type="text"
            id="create-name"
            value={createFormData.name}
            onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              createErrors.name ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter event type name"
            maxLength={255}
            required
          />
          {createErrors.name && <p className="mt-1 text-sm text-red-600">{createErrors.name}</p>}
        </div>

        <div>
          <label htmlFor="create-category" className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <select
            id="create-category"
            value={createFormData.category}
            onChange={(e) => setCreateFormData(prev => ({ ...prev, category: e.target.value as EventTypeCategory }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            {CATEGORY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="create-description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="create-description"
            value={createFormData.description}
            onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              createErrors.description ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Describe this event type (optional)"
            maxLength={1000}
          />
          {createErrors.description && <p className="mt-1 text-sm text-red-600">{createErrors.description}</p>}
          <p className="mt-1 text-sm text-gray-500">
            {createFormData.description.length}/1000 characters
          </p>
        </div>

        {createErrors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{createErrors.submit}</p>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => setShowCreateForm(false)}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCreating}
            className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create Event Type'}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleInputKeyDown}
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
          error ? 'border-red-300' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete="off"
      />
      
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      
      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          {showCreateForm ? renderCreateForm() : renderSuggestions()}
        </div>
      )}
    </div>
  );
}
