'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { EventService } from '@/lib/competition/event-service';
import { PermissionService } from '@/lib/competition/permission-service';
import { 
  Event, 
  EventStatus,
  UpdateEventData
} from '@/types/competition';

interface EventListProps {
  competitionId: string;
  currentUserId: string;
  onEditEvent?: (eventId: string) => void;
  onViewEvent?: (eventId: string) => void;
  onAddEvent?: () => void;
  onDeleteEvent?: (eventId: string) => void;
  onReorderEvents?: (eventIds: string[]) => void;
  className?: string;
}

interface FormErrors {
  [key: string]: string;
}

interface DragItem {
  id: string;
  index: number;
}

const EVENT_STATUS_COLORS = {
  scheduled: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const EVENT_STATUS_LABELS = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

export default function EventList({
  competitionId,
  currentUserId,
  onEditEvent,
  onViewEvent,
  onAddEvent,
  onDeleteEvent,
  onReorderEvents,
  className = ""
}: EventListProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'type'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const eventService = new EventService();
  const permissionService = new PermissionService();
  const dragRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Load events on component mount
  useEffect(() => {
    loadEvents();
    loadPermissions();
  }, [competitionId]);

  // Update filtered events when events, search, or filters change
  useEffect(() => {
    filterAndSortEvents();
  }, [events, searchTerm, statusFilter, sortBy, sortOrder]);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await eventService.getCompetitionEvents(competitionId);
      setEvents(response.events);
    } catch (error) {
      console.error('Failed to load events:', error);
      setErrors({ load: 'Failed to load events' });
    } finally {
      setIsLoading(false);
    }
  }, [competitionId, eventService]);

  const loadPermissions = useCallback(async () => {
    try {
      const permissions = await permissionService.getUserPermissions(currentUserId, competitionId);
      setUserPermissions(permissions);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  }, [currentUserId, competitionId, permissionService]);

  const filterAndSortEvents = useCallback(() => {
    let filtered = [...events];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.event_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(event => event.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'type':
          comparison = a.event_type.localeCompare(b.event_type);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredEvents(filtered);
  }, [events, searchTerm, statusFilter, sortBy, sortOrder]);

  const handleDragStart = useCallback((e: React.DragEvent, event: Event, index: number) => {
    if (!userPermissions.can_manage_events) return;
    
    setDraggedItem({ id: event.id, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', event.id);
    
    // Add visual feedback
    if (dragRefs.current[event.id]) {
      dragRefs.current[event.id]!.style.opacity = '0.5';
    }
  }, [userPermissions.can_manage_events]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.index === targetIndex) return;
    
    // Add visual feedback for drop target
    const targetElement = e.currentTarget as HTMLElement;
    targetElement.style.borderTop = '2px solid #3b82f6';
  }, [draggedItem]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const targetElement = e.currentTarget as HTMLElement;
    targetElement.style.borderTop = '';
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedItem || !userPermissions.can_manage_events) return;

    // Remove visual feedback
    const targetElement = e.currentTarget as HTMLElement;
    targetElement.style.borderTop = '';
    
    if (dragRefs.current[draggedItem.id]) {
      dragRefs.current[draggedItem.id]!.style.opacity = '1';
    }

    if (draggedItem.index === targetIndex) {
      setDraggedItem(null);
      return;
    }

    setIsReordering(true);
    try {
      // Create new order
      const newOrder = [...filteredEvents];
      const [draggedEvent] = newOrder.splice(draggedItem.index, 1);
      newOrder.splice(targetIndex, 0, draggedEvent);

      // Update local state immediately for responsive UI
      setEvents(prev => {
        const updated = [...prev];
        const originalIndex = updated.findIndex(e => e.id === draggedItem.id);
        if (originalIndex !== -1) {
          const [movedEvent] = updated.splice(originalIndex, 1);
          const newIndex = updated.findIndex(e => e.id === newOrder[targetIndex].id);
          updated.splice(newIndex, 0, movedEvent);
        }
        return updated;
      });

      // Call callback for parent component
      if (onReorderEvents) {
        onReorderEvents(newOrder.map(e => e.id));
      }

      // Update order in database
      await eventService.updateEventOrder(competitionId, newOrder.map(e => e.id), currentUserId);

    } catch (error) {
      console.error('Failed to reorder events:', error);
      setErrors({ reorder: 'Failed to reorder events' });
      // Revert local state on error
      await loadEvents();
    } finally {
      setIsReordering(false);
      setDraggedItem(null);
    }
  }, [draggedItem, userPermissions.can_manage_events, filteredEvents, onReorderEvents, eventService, competitionId, currentUserId, loadEvents]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (dragRefs.current[draggedItem?.id || '']) {
      dragRefs.current[draggedItem?.id || '']!.style.opacity = '1';
    }
    setDraggedItem(null);
  }, [draggedItem]);

  const handleStatusChange = useCallback(async (eventId: string, newStatus: EventStatus) => {
    if (!userPermissions.can_manage_events) return;

    try {
      const updatedEvent = await eventService.updateEvent(
        eventId,
        { status: newStatus },
        currentUserId
      );

      setEvents(prev => prev.map(e => e.id === eventId ? updatedEvent : e));
    } catch (error) {
      console.error('Failed to update event status:', error);
      setErrors({ status: 'Failed to update event status' });
    }
  }, [userPermissions.can_manage_events, eventService, currentUserId]);

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    if (!userPermissions.can_delete_events) return;

    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      await eventService.deleteEvent(eventId, currentUserId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
      
      if (onDeleteEvent) {
        onDeleteEvent(eventId);
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
      setErrors({ delete: 'Failed to delete event' });
    }
  }, [userPermissions.can_delete_events, eventService, currentUserId, onDeleteEvent]);

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

  const getStatusColor = useCallback((status: EventStatus) => {
    return EVENT_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  }, []);

  const getStatusLabel = useCallback((status: EventStatus) => {
    return EVENT_STATUS_LABELS[status] || status;
  }, []);

  const renderEventCard = useCallback((event: Event, index: number) => {
    const isDragging = draggedItem?.id === event.id;
    const canManage = userPermissions.can_manage_events;
    const canDelete = userPermissions.can_delete_events;

    return (
      <div
        key={event.id}
        ref={el => dragRefs.current[event.id] = el}
        draggable={canManage}
        onDragStart={(e) => handleDragStart(e, event, index)}
        onDragOver={handleDragOver}
        onDragEnter={(e) => handleDragEnter(e, index)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, index)}
        onDragEnd={handleDragEnd}
        className={`
          bg-white border border-gray-200 rounded-lg p-4 mb-3 transition-all duration-200
          ${isDragging ? 'opacity-50 shadow-lg' : 'hover:shadow-md'}
          ${canManage ? 'cursor-move' : ''}
        `}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {event.name}
              </h3>
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(event.status)}`}>
                {getStatusLabel(event.status)}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {event.description || 'No description provided'}
            </p>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>📅 {formatDateTime(event.scheduled_date)}</span>
              <span>⏱️ {event.duration_minutes} min</span>
              <span>🏷️ {event.event_type}</span>
              {event.location && (
                <span>📍 {event.location.city || 'Location'}</span>
              )}
              {event.max_participants && (
                <span>👥 Max {event.max_participants}</span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {/* Status Change Dropdown */}
            {canManage && (
              <select
                value={event.status}
                onChange={(e) => handleStatusChange(event.id, e.target.value as EventStatus)}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            )}

            {/* Action Buttons */}
            <div className="flex items-center space-x-1">
              {onViewEvent && (
                <button
                  onClick={() => onViewEvent(event.id)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="View Event"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              )}

              {canManage && onEditEvent && (
                <button
                  onClick={() => onEditEvent(event.id)}
                  className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                  title="Edit Event"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}

              {canDelete && (
                <button
                  onClick={() => handleDeleteEvent(event.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete Event"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Drag Handle */}
        {canManage && (
          <div className="mt-3 flex items-center justify-center">
            <div className="w-8 h-1 bg-gray-300 rounded-full cursor-move">
              <div className="w-2 h-1 bg-gray-400 rounded-full mx-auto"></div>
            </div>
          </div>
        )}
      </div>
    );
  }, [
    draggedItem,
    userPermissions,
    handleDragStart,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    handleStatusChange,
    handleDeleteEvent,
    getStatusColor,
    getStatusLabel,
    formatDateTime,
    onViewEvent,
    onEditEvent
  ]);

  const renderFilters = () => (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search Events
          </label>
          <input
            type="text"
            placeholder="Search by name, description, or type..."
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
            onChange={(e) => setStatusFilter(e.target.value as EventStatus | 'all')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
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
            onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'type')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="date">Date</option>
            <option value="name">Name</option>
            <option value="type">Type</option>
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

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Events</h2>
        <p className="text-gray-600">
          {filteredEvents.length} of {events.length} events
          {searchTerm && ` matching "${searchTerm}"`}
        </p>
      </div>

      {userPermissions.can_create_events && onAddEvent && (
        <button
          onClick={onAddEvent}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Event
        </button>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className={`bg-white shadow rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading events...</span>
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
      {errors.reorder && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{errors.reorder}</p>
        </div>
      )}

      {errors.status && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{errors.status}</p>
        </div>
      )}

      {errors.delete && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{errors.delete}</p>
        </div>
      )}

      {/* Events List */}
      <div className="space-y-3">
        {isReordering && (
          <div className="text-center py-4 text-blue-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm">Updating event order...</p>
          </div>
        )}

        {filteredEvents.length > 0 ? (
          filteredEvents.map((event, index) => renderEventCard(event, index))
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first event'
              }
            </p>
            {userPermissions.can_create_events && onAddEvent && (
              <button
                onClick={onAddEvent}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Create First Event
              </button>
            )}
          </div>
        )}
      </div>

      {/* Drag and Drop Instructions */}
      {userPermissions.can_manage_events && filteredEvents.length > 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-700">
              Drag and drop events to reorder them. The order will be saved automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
