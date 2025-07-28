/**
 * Real-time Calendar WebSocket Service
 * 
 * Provides production-ready WebSocket connections for real-time calendar updates
 * with automatic reconnection, offline handling, and optimized performance.
 */

export interface AppointmentEvent {
  id: string;
  type: 'created' | 'updated' | 'cancelled' | 'rescheduled' | 'check_in' | 'completed' | 'no_show';
  appointmentId: number;
  barberId?: number;
  clientId?: number;
  barberName: string;
  clientName: string;
  serviceName: string;
  serviceId: number;
  originalDate?: string;
  originalTime?: string;
  newDate?: string;
  newTime?: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

export interface CalendarConflict {
  id: string;
  type: 'time_overlap' | 'double_booking' | 'availability_conflict' | 'resource_conflict';
  appointmentIds: number[];
  barberId: number;
  conflictTime: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestedResolutions: Array<{
    type: 'reschedule' | 'reassign' | 'cancel';
    description: string;
    appointmentId?: number;
    newTime?: string;
    newBarberId?: number;
  }>;
  timestamp: string;
}

export interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';
  lastPing?: Date;
  reconnectAttempts: number;
  connectionId?: string;
  serverTime?: Date;
}

export interface RealtimeCalendarConfig {
  wsUrl?: string;
  barberId?: number;
  userId?: number;
  authToken?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
  enableDebouncing?: boolean;
  debounceMs?: number;
  enableBatching?: boolean;
  batchSize?: number;
  batchIntervalMs?: number;
  enableOfflineQueue?: boolean;
  maxOfflineEvents?: number;
}

type EventCallback<T> = (event: T) => void;
type StatusCallback = (status: ConnectionStatus) => void;

export class RealtimeCalendarService {
  private ws: WebSocket | null = null;
  private config: Required<RealtimeCalendarConfig>;
  private connectionStatus: ConnectionStatus;
  private eventCallbacks: Map<string, EventCallback<any>[]> = new Map();
  private statusCallbacks: StatusCallback[] = [];
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastActivity: Date = new Date();
  private offlineQueue: AppointmentEvent[] = [];
  private pendingBatch: AppointmentEvent[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private isReconnecting = false;
  private heartbeatTimeout: NodeJS.Timeout | null = null;

  constructor(config: RealtimeCalendarConfig = {}) {
    this.config = {
      wsUrl: config.wsUrl || this.getWebSocketUrl(),
      barberId: config.barberId || 0,
      userId: config.userId || 0,
      authToken: config.authToken || '',
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      pingInterval: config.pingInterval || 30000,
      enableDebouncing: config.enableDebouncing ?? true,
      debounceMs: config.debounceMs || 300,
      enableBatching: config.enableBatching ?? true,
      batchSize: config.batchSize || 10,
      batchIntervalMs: config.batchIntervalMs || 1000,
      enableOfflineQueue: config.enableOfflineQueue ?? true,
      maxOfflineEvents: config.maxOfflineEvents || 100,
    };

    this.connectionStatus = {
      status: 'disconnected',
      reconnectAttempts: 0,
    };

    // Start connection if in browser environment
    if (typeof window !== 'undefined') {
      this.connect();
      this.setupOfflineHandling();
    }
  }

  private getWebSocketUrl(): string {
    if (typeof window === 'undefined') return '';
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = process.env.NODE_ENV === 'development' ? ':8000' : '';
    
    return `${protocol}//${host}${port}/ws/calendar`;
  }

  private setupOfflineHandling(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('Network connection restored, reconnecting...');
      this.handleNetworkReconnect();
    });

    window.addEventListener('offline', () => {
      console.log('Network connection lost, entering offline mode');
      this.handleNetworkDisconnect();
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseConnection();
      } else {
        this.resumeConnection();
      }
    });
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.updateStatus({ status: 'connecting', reconnectAttempts: 0 });

        // In development, simulate WebSocket connection
        if (process.env.NODE_ENV === 'development') {
          this.simulateConnection();
          resolve();
          return;
        }

        const wsUrl = new URL(this.config.wsUrl);
        if (this.config.authToken) {
          wsUrl.searchParams.set('token', this.config.authToken);
        }
        if (this.config.barberId) {
          wsUrl.searchParams.set('barberId', this.config.barberId.toString());
        }

        this.ws = new WebSocket(wsUrl.toString());

        this.ws.onopen = () => {
          console.log('WebSocket connected to calendar service');
          this.updateStatus({
            status: 'connected',
            reconnectAttempts: 0,
            lastPing: new Date(),
            connectionId: this.generateConnectionId(),
          });

          this.startPing();
          this.processOfflineQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          this.handleDisconnect(event.code !== 1000); // Reconnect if not a normal closure
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.updateStatus({ status: 'error', reconnectAttempts: this.connectionStatus.reconnectAttempts + 1 });
          reject(error);
        };

        // Connection timeout
        setTimeout(() => {
          if (this.connectionStatus.status === 'connecting') {
            this.ws?.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        console.error('Failed to establish WebSocket connection:', error);
        this.updateStatus({ status: 'error', reconnectAttempts: this.connectionStatus.reconnectAttempts + 1 });
        reject(error);
      }
    });
  }

  private simulateConnection(): void {
    // Simulate successful connection in development
    setTimeout(() => {
      this.updateStatus({
        status: 'connected',
        reconnectAttempts: 0,
        lastPing: new Date(),
        connectionId: this.generateConnectionId(),
      });

      this.startPing();
      this.startSimulation();
    }, 1000);
  }

  private startSimulation(): void {
    // Simulate periodic events for development
    const simulateEvent = () => {
      if (this.connectionStatus.status !== 'connected') return;

      if (Math.random() > 0.7) { // 30% chance every 15 seconds
        const mockEvent = this.generateMockEvent();
        this.handleAppointmentEvent(mockEvent);
      }

      // Check for conflicts periodically
      if (Math.random() > 0.9) { // 10% chance
        const mockConflict = this.generateMockConflict();
        this.handleConflictEvent(mockConflict);
      }

      setTimeout(simulateEvent, 15000);
    };

    setTimeout(simulateEvent, 5000);
  }

  private generateMockEvent(): AppointmentEvent {
    const types: AppointmentEvent['type'][] = ['created', 'updated', 'cancelled', 'rescheduled', 'check_in', 'completed'];
    const barbers = ['Marcus Johnson', 'Diego Rivera', 'Aisha Thompson'];
    const clients = ['John Smith', 'Sarah Wilson', 'Mike Chen', 'Lisa Rodriguez', 'David Park'];
    const services = ['Premium Haircut', 'Beard Trim & Style', 'Hot Towel Treatment', 'Straight Razor Shave'];

    const type = types[Math.floor(Math.random() * types.length)];
    const barberName = barbers[Math.floor(Math.random() * barbers.length)];
    const clientName = clients[Math.floor(Math.random() * clients.length)];
    const serviceName = services[Math.floor(Math.random() * services.length)];

    const baseEvent: AppointmentEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      appointmentId: Math.floor(Math.random() * 1000) + 1,
      barberId: Math.floor(Math.random() * 3) + 1,
      clientId: Math.floor(Math.random() * 100) + 1,
      barberName,
      clientName,
      serviceName,
      serviceId: Math.floor(Math.random() * 10) + 1,
      timestamp: new Date().toISOString(),
      priority: type === 'cancelled' || type === 'no_show' ? 'high' : 'medium',
    };

    if (type === 'rescheduled') {
      const now = new Date();
      const originalTime = new Date(now.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
      const newTime = new Date(originalTime.getTime() + (Math.random() - 0.5) * 4 * 60 * 60 * 1000);

      baseEvent.originalDate = originalTime.toISOString().split('T')[0];
      baseEvent.originalTime = originalTime.toTimeString().slice(0, 5);
      baseEvent.newDate = newTime.toISOString().split('T')[0];
      baseEvent.newTime = newTime.toTimeString().slice(0, 5);
    }

    return baseEvent;
  }

  private generateMockConflict(): CalendarConflict {
    const types: CalendarConflict['type'][] = ['time_overlap', 'double_booking', 'availability_conflict'];
    const type = types[Math.floor(Math.random() * types.length)];

    const now = new Date();
    const conflictTime = new Date(now.getTime() + Math.random() * 24 * 60 * 60 * 1000);

    return {
      id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      appointmentIds: [
        Math.floor(Math.random() * 1000) + 1,
        Math.floor(Math.random() * 1000) + 1,
      ],
      barberId: Math.floor(Math.random() * 3) + 1,
      conflictTime: conflictTime.toISOString(),
      severity: 'medium',
      description: `${type.replace('_', ' ')} detected at ${conflictTime.toLocaleTimeString()}`,
      suggestedResolutions: [
        {
          type: 'reschedule',
          description: 'Reschedule one appointment to next available slot',
          appointmentId: Math.floor(Math.random() * 1000) + 1,
          newTime: new Date(conflictTime.getTime() + 60 * 60 * 1000).toISOString(),
        },
      ],
      timestamp: new Date().toISOString(),
    };
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      this.lastActivity = new Date();
      this.resetHeartbeat();

      switch (data.type) {
        case 'appointment_event':
          this.handleAppointmentEvent(data.payload);
          break;
        case 'conflict_event':
          this.handleConflictEvent(data.payload);
          break;
        case 'ping':
          this.handlePing(data);
          break;
        case 'pong':
          this.handlePong(data);
          break;
        case 'server_time':
          this.updateStatus({ serverTime: new Date(data.timestamp) });
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private handleAppointmentEvent(event: AppointmentEvent): void {
    if (this.config.enableBatching) {
      this.addToBatch(event);
    } else if (this.config.enableDebouncing) {
      this.debounceEvent('appointment_event', event);
    } else {
      this.emitEvent('appointment_event', event);
    }
  }

  private handleConflictEvent(conflict: CalendarConflict): void {
    // Conflicts are always processed immediately due to their critical nature
    this.emitEvent('conflict_event', conflict);
  }

  private addToBatch(event: AppointmentEvent): void {
    this.pendingBatch.push(event);

    if (this.pendingBatch.length >= this.config.batchSize) {
      this.processBatch();
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.processBatch();
      }, this.config.batchIntervalMs);
    }
  }

  private processBatch(): void {
    if (this.pendingBatch.length === 0) return;

    const batch = [...this.pendingBatch];
    this.pendingBatch = [];

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    this.emitEvent('appointment_batch', batch);

    // Also emit individual events for compatibility
    batch.forEach(event => {
      this.emitEvent('appointment_event', event);
    });
  }

  private debounceEvent(eventType: string, data: any): void {
    const key = `${eventType}_${data.appointmentId || data.id}`;
    
    // Clear existing timeout for this specific event
    if (this.debounceTimeouts.has(key)) {
      clearTimeout(this.debounceTimeouts.get(key)!);
    }

    const timeout = setTimeout(() => {
      this.emitEvent(eventType, data);
      this.debounceTimeouts.delete(key);
    }, this.config.debounceMs);

    this.debounceTimeouts.set(key, timeout);
  }

  private debounceTimeouts: Map<string, NodeJS.Timeout> = new Map();

  private emitEvent<T>(eventType: string, data: T): void {
    const callbacks = this.eventCallbacks.get(eventType) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event callback for ${eventType}:`, error);
      }
    });
  }

  private handlePing(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
    }
  }

  private handlePong(data: any): void {
    const now = Date.now();
    const latency = now - data.timestamp;
    console.debug(`WebSocket latency: ${latency}ms`);
    
    this.updateStatus({ lastPing: new Date() });
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, this.config.pingInterval);

    this.resetHeartbeat();
  }

  private resetHeartbeat(): void {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
    }

    this.heartbeatTimeout = setTimeout(() => {
      console.warn('WebSocket heartbeat timeout, reconnecting...');
      this.handleDisconnect(true);
    }, this.config.pingInterval * 2);
  }

  private handleDisconnect(shouldReconnect: boolean = true): void {
    this.cleanup();

    if (shouldReconnect && !this.isReconnecting) {
      this.attemptReconnect();
    } else {
      this.updateStatus({ status: 'disconnected' });
    }
  }

  private attemptReconnect(): void {
    if (this.connectionStatus.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.updateStatus({ status: 'error' });
      return;
    }

    this.isReconnecting = true;
    this.updateStatus({ 
      status: 'reconnecting',
      reconnectAttempts: this.connectionStatus.reconnectAttempts + 1
    });

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.connectionStatus.reconnectAttempts),
      30000 // Max 30 seconds
    );

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.connectionStatus.reconnectAttempts + 1})`);

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect();
        this.isReconnecting = false;
      } catch (error) {
        console.error('Reconnection failed:', error);
        this.isReconnecting = false;
        this.attemptReconnect();
      }
    }, delay);
  }

  private handleNetworkReconnect(): void {
    if (this.connectionStatus.status !== 'connected') {
      this.attemptReconnect();
    }
  }

  private handleNetworkDisconnect(): void {
    this.updateStatus({ status: 'disconnected' });
  }

  private pauseConnection(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private resumeConnection(): void {
    if (this.connectionStatus.status === 'connected' && !this.pingInterval) {
      this.startPing();
    }
  }

  private processOfflineQueue(): void {
    if (!this.config.enableOfflineQueue || this.offlineQueue.length === 0) return;

    console.log(`Processing ${this.offlineQueue.length} offline events`);
    
    const queuedEvents = [...this.offlineQueue];
    this.offlineQueue = [];

    queuedEvents.forEach(event => {
      this.handleAppointmentEvent(event);
    });
  }

  private addToOfflineQueue(event: AppointmentEvent): void {
    if (!this.config.enableOfflineQueue) return;

    this.offlineQueue.push(event);

    // Limit queue size
    if (this.offlineQueue.length > this.config.maxOfflineEvents) {
      this.offlineQueue = this.offlineQueue.slice(-this.config.maxOfflineEvents);
    }
  }

  private cleanup(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Clear debounce timeouts
    this.debounceTimeouts.forEach(timeout => clearTimeout(timeout));
    this.debounceTimeouts.clear();
  }

  private updateStatus(updates: Partial<ConnectionStatus>): void {
    this.connectionStatus = { ...this.connectionStatus, ...updates };
    this.statusCallbacks.forEach(callback => {
      try {
        callback(this.connectionStatus);
      } catch (error) {
        console.error('Error in status callback:', error);
      }
    });
  }

  private generateConnectionId(): string {
    return `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods
  public on<T>(eventType: string, callback: EventCallback<T>): () => void {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, []);
    }
    
    this.eventCallbacks.get(eventType)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.eventCallbacks.get(eventType) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  public onStatusChange(callback: StatusCallback): () => void {
    this.statusCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  public disconnect(): void {
    this.cleanup();
    this.updateStatus({ status: 'disconnected', reconnectAttempts: 0 });
  }

  public reconnect(): Promise<void> {
    this.disconnect();
    return this.connect();
  }

  public getStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  public isConnected(): boolean {
    return this.connectionStatus.status === 'connected';
  }

  public sendEvent(event: Partial<AppointmentEvent>): void {
    if (!this.isConnected()) {
      if (this.config.enableOfflineQueue) {
        console.log('Connection offline, queueing event');
        this.addToOfflineQueue(event as AppointmentEvent);
      }
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'client_event',
        payload: event,
        timestamp: new Date().toISOString(),
      }));
    }
  }

  public destroy(): void {
    this.cleanup();
    this.eventCallbacks.clear();
    this.statusCallbacks = [];
    
    // Process any remaining batch
    if (this.pendingBatch.length > 0) {
      this.processBatch();
    }
  }
}

// Export singleton instance for global use
export const realtimeCalendar = new RealtimeCalendarService();

// Helper functions for toast notifications
export const getEventMessage = (event: AppointmentEvent): string => {
  switch (event.type) {
    case 'created':
      return `New appointment with ${event.barberName}`;
    case 'updated':
      return `Appointment updated for ${event.clientName}`;
    case 'cancelled':
      return `${event.clientName} cancelled their appointment`;
    case 'rescheduled':
      return `${event.clientName} rescheduled to ${event.newTime}`;
    case 'check_in':
      return `${event.clientName} checked in`;
    case 'completed':
      return `${event.clientName}'s appointment completed`;
    case 'no_show':
      return `${event.clientName} marked as no-show`;
    default:
      return `Appointment event: ${event.type}`;
  }
};

export const getConflictMessage = (conflict: CalendarConflict): string => {
  return `${conflict.type.replace('_', ' ')} detected - ${conflict.description}`;
};

export const getEventIcon = (type: AppointmentEvent['type']): string => {
  switch (type) {
    case 'created': return '📅';
    case 'updated': return '✏️';
    case 'cancelled': return '❌';
    case 'rescheduled': return '🔄';
    case 'check_in': return '✅';
    case 'completed': return '🎉';
    case 'no_show': return '⚠️';
    default: return '📋';
  }
};

export const getEventColor = (type: AppointmentEvent['type']): string => {
  switch (type) {
    case 'created': return 'text-blue-600 bg-blue-50';
    case 'updated': return 'text-orange-600 bg-orange-50';
    case 'cancelled': return 'text-red-600 bg-red-50';
    case 'rescheduled': return 'text-purple-600 bg-purple-50';
    case 'check_in': return 'text-green-600 bg-green-50';
    case 'completed': return 'text-emerald-600 bg-emerald-50';
    case 'no_show': return 'text-red-600 bg-red-50';
    default: return 'text-gray-600 bg-gray-50';
  }
};