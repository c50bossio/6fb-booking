/**
 * React Hook for Real-time Calendar Integration
 * 
 * Provides easy integration with React components for real-time calendar updates
 * with state management, toast notifications, and conflict handling.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from '@/components/ui/use-toast';
import {
  RealtimeCalendarService,
  AppointmentEvent,
  CalendarConflict,
  ConnectionStatus,
  RealtimeCalendarConfig,
  getEventMessage,
  getConflictMessage,
  getEventIcon,
  getEventColor,
} from '@/lib/realtime-calendar';

export interface UseRealtimeCalendarOptions extends RealtimeCalendarConfig {
  enableToasts?: boolean;
  enableConflictAlerts?: boolean;
  enableSoundNotifications?: boolean;
  autoConnect?: boolean;
  persistEvents?: boolean;
  eventHistoryLimit?: number;
}

export interface CalendarState {
  events: AppointmentEvent[];
  conflicts: CalendarConflict[];
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  eventCount: number;
  conflictCount: number;
  lastEventTime: Date | null;
  pendingUpdates: number;
}

export interface RealtimeCalendarActions {
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  clearEvents: () => void;
  clearConflicts: () => void;
  sendEvent: (event: Partial<AppointmentEvent>) => void;
  markConflictResolved: (conflictId: string) => void;
  updateCalendarView: () => void;
  exportEvents: () => AppointmentEvent[];
  getEventsByType: (type: AppointmentEvent['type']) => AppointmentEvent[];
  getEventsByBarber: (barberId: number) => AppointmentEvent[];
  getRecentEvents: (minutes: number) => AppointmentEvent[];
}

export interface UseRealtimeCalendarReturn {
  state: CalendarState;
  actions: RealtimeCalendarActions;
  service: RealtimeCalendarService;
}

// Default configuration
const DEFAULT_OPTIONS: UseRealtimeCalendarOptions = {
  enableToasts: true,
  enableConflictAlerts: true,
  enableSoundNotifications: false,
  autoConnect: true,
  persistEvents: true,
  eventHistoryLimit: 100,
  enableDebouncing: true,
  enableBatching: true,
  enableOfflineQueue: true,
  debounceMs: 300,
  batchSize: 10,
  batchIntervalMs: 1000,
};

export function useRealtimeCalendar(
  options: UseRealtimeCalendarOptions = {}
): UseRealtimeCalendarReturn {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  // Service instance - created once and reused
  const serviceRef = useRef<RealtimeCalendarService | null>(null);
  const unsubscribeRef = useRef<(() => void)[]>([]);
  
  // State management
  const [events, setEvents] = useState<AppointmentEvent[]>(
    config.persistEvents ? loadPersistedEvents() : []
  );
  const [conflicts, setConflicts] = useState<CalendarConflict[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
    reconnectAttempts: 0,
  });
  const [pendingUpdates, setPendingUpdates] = useState(0);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);

  // Audio context for sound notifications
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize service
  useEffect(() => {
    if (!serviceRef.current) {
      serviceRef.current = new RealtimeCalendarService(config);
    }

    const service = serviceRef.current;

    // Subscribe to events
    const unsubscribeAppointment = service.on<AppointmentEvent>('appointment_event', handleAppointmentEvent);
    const unsubscribeBatch = service.on<AppointmentEvent[]>('appointment_batch', handleAppointmentBatch);
    const unsubscribeConflict = service.on<CalendarConflict>('conflict_event', handleConflictEvent);
    const unsubscribeStatus = service.onStatusChange(handleStatusChange);

    unsubscribeRef.current = [
      unsubscribeAppointment,
      unsubscribeBatch,
      unsubscribeConflict,
      unsubscribeStatus,
    ];

    return () => {
      unsubscribeRef.current.forEach(unsubscribe => unsubscribe());
      unsubscribeRef.current = [];
    };
  }, []);

  // Auto-connect when enabled
  useEffect(() => {
    if (config.autoConnect && serviceRef.current) {
      serviceRef.current.connect().catch(error => {
        console.error('Auto-connect failed:', error);
      });
    }

    return () => {
      if (serviceRef.current) {
        serviceRef.current.destroy();
      }
    };
  }, [config.autoConnect]);

  // Persist events when they change
  useEffect(() => {
    if (config.persistEvents) {
      persistEvents(events);
    }
  }, [events, config.persistEvents]);

  // Event handlers
  const handleAppointmentEvent = useCallback((event: AppointmentEvent) => {
    setEvents(prevEvents => {
      const newEvents = [event, ...prevEvents];
      
      // Apply history limit
      if (config.eventHistoryLimit && newEvents.length > config.eventHistoryLimit) {
        return newEvents.slice(0, config.eventHistoryLimit);
      }
      
      return newEvents;
    });

    setLastEventTime(new Date());
    setPendingUpdates(prev => prev + 1);

    // Show toast notification
    if (config.enableToasts) {
      showEventToast(event);
    }

    // Play sound notification
    if (config.enableSoundNotifications) {
      playNotificationSound(event.priority);
    }

    // Debounce pending updates reset
    setTimeout(() => {
      setPendingUpdates(prev => Math.max(0, prev - 1));
    }, 2000);

  }, [config.enableToasts, config.enableSoundNotifications, config.eventHistoryLimit]);

  const handleAppointmentBatch = useCallback((eventBatch: AppointmentEvent[]) => {
    setEvents(prevEvents => {
      const newEvents = [...eventBatch, ...prevEvents];
      
      // Apply history limit
      if (config.eventHistoryLimit && newEvents.length > config.eventHistoryLimit) {
        return newEvents.slice(0, config.eventHistoryLimit);
      }
      
      return newEvents;
    });

    setLastEventTime(new Date());
    setPendingUpdates(prev => prev + eventBatch.length);

    // Show batch notification
    if (config.enableToasts && eventBatch.length > 1) {
      toast({
        title: `📊 ${eventBatch.length} Calendar Updates`,
        description: 'Multiple appointments updated simultaneously',
        duration: 3000,
      });
    }

    // Debounce pending updates reset
    setTimeout(() => {
      setPendingUpdates(prev => Math.max(0, prev - eventBatch.length));
    }, 2000);

  }, [config.enableToasts, config.eventHistoryLimit]);

  const handleConflictEvent = useCallback((conflict: CalendarConflict) => {
    setConflicts(prevConflicts => [conflict, ...prevConflicts]);

    // Show conflict alert
    if (config.enableConflictAlerts) {
      showConflictAlert(conflict);
    }

    // Play urgent sound for high-severity conflicts
    if (config.enableSoundNotifications && conflict.severity === 'high') {
      playNotificationSound('high');
    }

  }, [config.enableConflictAlerts, config.enableSoundNotifications]);

  const handleStatusChange = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);

    // Show connection status toasts
    if (config.enableToasts) {
      if (status.status === 'connected' && connectionStatus.status !== 'connected') {
        toast({
          title: '🟢 Calendar Connected',
          description: 'Real-time updates are now active',
          duration: 2000,
        });
      } else if (status.status === 'disconnected' && connectionStatus.status === 'connected') {
        toast({
          title: '🔴 Calendar Disconnected',
          description: 'Attempting to reconnect...',
          duration: 3000,
        });
      } else if (status.status === 'error') {
        toast({
          title: '⚠️ Connection Error',
          description: 'Unable to connect to calendar service',
          duration: 5000,
          variant: 'destructive',
        });
      }
    }
  }, [config.enableToasts, connectionStatus.status]);

  // Toast and notification helpers
  const showEventToast = useCallback((event: AppointmentEvent) => {
    const icon = getEventIcon(event.type);
    const message = getEventMessage(event);
    
    toast({
      title: `${icon} ${message}`,
      description: `${event.serviceName} • ${new Date(event.timestamp).toLocaleTimeString()}`,
      duration: event.priority === 'high' ? 5000 : 3000,
      variant: event.type === 'cancelled' || event.type === 'no_show' ? 'destructive' : 'default',
    });
  }, []);

  const showConflictAlert = useCallback((conflict: CalendarConflict) => {
    const message = getConflictMessage(conflict);
    
    toast({
      title: '⚠️ Scheduling Conflict',
      description: message,
      duration: 10000,
      variant: 'destructive'
    });
  }, []);

  const playNotificationSound = useCallback(async (priority: 'low' | 'medium' | 'high') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const context = audioContextRef.current;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      // Different frequencies for different priorities
      const frequency = priority === 'high' ? 800 : priority === 'medium' ? 600 : 400;
      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);

      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.2);

    } catch (error) {
      console.warn('Sound notification failed:', error);
    }
  }, []);

  // Actions
  const connect = useCallback(async () => {
    if (serviceRef.current) {
      await serviceRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.disconnect();
    }
  }, []);

  const reconnect = useCallback(async () => {
    if (serviceRef.current) {
      await serviceRef.current.reconnect();
    }
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setPendingUpdates(0);
    setLastEventTime(null);
    
    if (config.persistEvents) {
      persistEvents([]);
    }
  }, [config.persistEvents]);

  const clearConflicts = useCallback(() => {
    setConflicts([]);
  }, []);

  const markConflictResolved = useCallback((conflictId: string) => {
    setConflicts(prevConflicts => 
      prevConflicts.filter(conflict => conflict.id !== conflictId)
    );

    if (config.enableToasts) {
      toast({
        title: '✅ Conflict Resolved',
        description: 'The scheduling conflict has been resolved',
        duration: 2000,
      });
    }
  }, [config.enableToasts]);

  const sendEvent = useCallback((event: Partial<AppointmentEvent>) => {
    if (serviceRef.current) {
      serviceRef.current.sendEvent(event);
    }
  }, []);

  const updateCalendarView = useCallback(() => {
    // Trigger a calendar refresh - this would be used by calendar components
    // to know when to refetch data after real-time updates
    const updateEvent = new CustomEvent('calendar-update', {
      detail: { timestamp: new Date(), eventCount: events.length }
    });
    window.dispatchEvent(updateEvent);
  }, [events.length]);

  const exportEvents = useCallback(() => {
    return [...events];
  }, [events]);

  const getEventsByType = useCallback((type: AppointmentEvent['type']) => {
    return events.filter(event => event.type === type);
  }, [events]);

  const getEventsByBarber = useCallback((barberId: number) => {
    return events.filter(event => event.barberId === barberId);
  }, [events]);

  const getRecentEvents = useCallback((minutes: number) => {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return events.filter(event => new Date(event.timestamp) > cutoff);
  }, [events]);

  // Computed state
  const state: CalendarState = useMemo(() => ({
    events,
    conflicts,
    connectionStatus,
    isConnected: connectionStatus.status === 'connected',
    eventCount: events.length,
    conflictCount: conflicts.length,
    lastEventTime,
    pendingUpdates,
  }), [events, conflicts, connectionStatus, lastEventTime, pendingUpdates]);

  const actions: RealtimeCalendarActions = useMemo(() => ({
    connect,
    disconnect,
    reconnect,
    clearEvents,
    clearConflicts,
    sendEvent,
    markConflictResolved,
    updateCalendarView,
    exportEvents,
    getEventsByType,
    getEventsByBarber,
    getRecentEvents,
  }), [
    connect,
    disconnect,
    reconnect,
    clearEvents,
    clearConflicts,
    sendEvent,
    markConflictResolved,
    updateCalendarView,
    exportEvents,
    getEventsByType,
    getEventsByBarber,
    getRecentEvents,
  ]);

  return {
    state,
    actions,
    service: serviceRef.current!,
  };
}

// Persistence helper functions
function loadPersistedEvents(): AppointmentEvent[] {
  try {
    if (typeof window === 'undefined') return [];
    
    const stored = localStorage.getItem('realtime-calendar-events');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Only return events from the last 24 hours
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return parsed.filter((event: AppointmentEvent) => 
        new Date(event.timestamp) > cutoff
      );
    }
  } catch (error) {
    console.warn('Failed to load persisted events:', error);
  }
  return [];
}

function persistEvents(events: AppointmentEvent[]): void {
  try {
    if (typeof window === 'undefined') return;
    
    // Only persist events from the last 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEvents = events.filter(event => 
      new Date(event.timestamp) > cutoff
    );
    
    localStorage.setItem('realtime-calendar-events', JSON.stringify(recentEvents));
  } catch (error) {
    console.warn('Failed to persist events:', error);
  }
}

// Additional hook for simplified usage in calendar views
export function useRealtimeCalendarView(barberId?: number) {
  const { state, actions } = useRealtimeCalendar({
    barberId,
    enableToasts: true,
    enableConflictAlerts: true,
    autoConnect: true,
  });

  // Filter events for specific barber if provided
  const filteredEvents = useMemo(() => {
    if (!barberId) return state.events;
    return state.events.filter(event => event.barberId === barberId);
  }, [state.events, barberId]);

  const filteredConflicts = useMemo(() => {
    if (!barberId) return state.conflicts;
    return state.conflicts.filter(conflict => conflict.barberId === barberId);
  }, [state.conflicts, barberId]);

  return {
    ...state,
    events: filteredEvents,
    conflicts: filteredConflicts,
    eventCount: filteredEvents.length,
    conflictCount: filteredConflicts.length,
    actions,
  };
}

// Hook for conflict management
export function useConflictManagement() {
  const { state, actions } = useRealtimeCalendar({
    enableConflictAlerts: true,
    enableToasts: false, // Handle toasts manually for conflicts
  });

  const activeConflicts = useMemo(() => 
    state.conflicts.filter(conflict => 
      // Consider conflicts active if they're within the next 24 hours
      new Date(conflict.conflictTime) > new Date() &&
      new Date(conflict.conflictTime) < new Date(Date.now() + 24 * 60 * 60 * 1000)
    ), 
    [state.conflicts]
  );

  const highPriorityConflicts = useMemo(() =>
    activeConflicts.filter(conflict => conflict.severity === 'high'),
    [activeConflicts]
  );

  return {
    allConflicts: state.conflicts,
    activeConflicts,
    highPriorityConflicts,
    conflictCount: state.conflictCount,
    hasActiveConflicts: activeConflicts.length > 0,
    hasHighPriorityConflicts: highPriorityConflicts.length > 0,
    resolveConflict: actions.markConflictResolved,
    clearAllConflicts: actions.clearConflicts,
  };
}