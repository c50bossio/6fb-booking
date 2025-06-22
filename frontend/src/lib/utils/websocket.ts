/**
 * WebSocket Service for Real-time Updates
 * Handles calendar events, appointment changes, and live notifications
 */

type WebSocketEventType =
  | 'appointment_created'
  | 'appointment_updated'
  | 'appointment_cancelled'
  | 'appointment_confirmed'
  | 'appointment_completed'
  | 'appointment_no_show'
  | 'availability_updated'
  | 'schedule_changed'
  | 'location_status_changed'
  | 'barber_status_changed'
  | 'service_updated'
  | 'booking_conflict'
  | 'reminder_sent'
  | 'payment_processed'
  | 'system_notification'

interface WebSocketMessage {
  type: WebSocketEventType
  payload: any
  timestamp: string
  id: string
}

interface WebSocketConfig {
  url?: string
  reconnectAttempts?: number
  reconnectDelay?: number
  heartbeatInterval?: number
  enableLogging?: boolean
}

type EventCallback<T = any> = (data: T) => void
type ConnectionCallback = () => void
type ErrorCallback = (error: Event | Error) => void

export class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private messageQueue: WebSocketMessage[] = []
  private isConnecting = false

  // Event listeners
  private eventListeners = new Map<WebSocketEventType, EventCallback[]>()
  private connectionListeners: ConnectionCallback[] = []
  private disconnectionListeners: ConnectionCallback[] = []
  private errorListeners: ErrorCallback[] = []

  // Configuration
  private config: Required<WebSocketConfig>

  constructor(config: WebSocketConfig = {}) {
    this.config = {
      url: config.url || this.getWebSocketUrl(),
      reconnectAttempts: config.reconnectAttempts || 5,
      reconnectDelay: config.reconnectDelay || 1000,
      heartbeatInterval: config.heartbeatInterval || 30000,
      enableLogging: config.enableLogging ?? true
    }
  }

  /**
   * Get WebSocket URL from environment or construct default
   */
  private getWebSocketUrl(): string {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL
    if (wsUrl) return wsUrl

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return apiUrl.replace(/^https?/, 'ws') + '/ws'
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.log('Already connected')
      return Promise.resolve()
    }

    if (this.isConnecting) {
      this.log('Connection already in progress')
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      try {
        this.isConnecting = true
        const token = this.getAuthToken()
        const wsUrl = token ? `${this.config.url}?token=${token}` : this.config.url

        this.log(`Connecting to ${wsUrl}`)
        this.ws = new WebSocket(wsUrl)

        const onOpen = () => {
          this.log('WebSocket connected')
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.startHeartbeat()
          this.flushMessageQueue()
          this.notifyConnectionListeners()
          resolve()
        }

        const onError = (error: Event) => {
          this.log('WebSocket error:', error)
          this.isConnecting = false
          this.notifyErrorListeners(error)
          reject(error)
        }

        const onClose = (event: CloseEvent) => {
          this.log(`WebSocket closed: ${event.code} - ${event.reason}`)
          this.isConnecting = false
          this.stopHeartbeat()
          this.notifyDisconnectionListeners()

          if (!event.wasClean && this.reconnectAttempts < this.config.reconnectAttempts) {
            this.scheduleReconnect()
          }
        }

        const onMessage = (event: MessageEvent) => {
          this.handleMessage(event.data)
        }

        // Set up event listeners
        this.ws.addEventListener('open', onOpen)
        this.ws.addEventListener('error', onError)
        this.ws.addEventListener('close', onClose)
        this.ws.addEventListener('message', onMessage)

      } catch (error) {
        this.isConnecting = false
        this.log('Failed to create WebSocket connection:', error)
        reject(error)
      }
    })
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.log('Disconnecting WebSocket')

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.stopHeartbeat()

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting')
      this.ws = null
    }

    this.reconnectAttempts = this.config.reconnectAttempts
  }

  /**
   * Send message to server
   */
  send(type: WebSocketEventType, payload: any): void {
    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      id: this.generateMessageId()
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
      this.log('Sent message:', message)
    } else {
      this.log('WebSocket not connected, queuing message:', message)
      this.messageQueue.push(message)
    }
  }

  /**
   * Subscribe to specific event type
   */
  on<T = any>(eventType: WebSocketEventType, callback: EventCallback<T>): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, [])
    }

    this.eventListeners.get(eventType)!.push(callback)
    this.log(`Subscribed to ${eventType}`)

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(eventType) || []
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
        this.log(`Unsubscribed from ${eventType}`)
      }
    }
  }

  /**
   * Subscribe to connection events
   */
  onConnect(callback: ConnectionCallback): () => void {
    this.connectionListeners.push(callback)
    return () => {
      const index = this.connectionListeners.indexOf(callback)
      if (index > -1) {
        this.connectionListeners.splice(index, 1)
      }
    }
  }

  /**
   * Subscribe to disconnection events
   */
  onDisconnect(callback: ConnectionCallback): () => void {
    this.disconnectionListeners.push(callback)
    return () => {
      const index = this.disconnectionListeners.indexOf(callback)
      if (index > -1) {
        this.disconnectionListeners.splice(index, 1)
      }
    }
  }

  /**
   * Subscribe to error events
   */
  onError(callback: ErrorCallback): () => void {
    this.errorListeners.push(callback)
    return () => {
      const index = this.errorListeners.indexOf(callback)
      if (index > -1) {
        this.errorListeners.splice(index, 1)
      }
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    if (this.isConnecting) return 'connecting'
    if (!this.ws) return 'disconnected'

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting'
      case WebSocket.OPEN:
        return 'connected'
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected'
      default:
        return 'error'
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Get connection stats
   */
  getStats(): {
    status: string
    reconnectAttempts: number
    queuedMessages: number
    uptime: number
  } {
    return {
      status: this.getStatus(),
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      uptime: this.ws ? Date.now() - (this.ws as any)._connectTime || 0 : 0
    }
  }

  // === PRIVATE METHODS ===

  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data)
      this.log('Received message:', message)

      // Handle heartbeat responses
      if (message.type === 'heartbeat' as WebSocketEventType) {
        return
      }

      // Notify event listeners
      const listeners = this.eventListeners.get(message.type) || []
      listeners.forEach(callback => {
        try {
          callback(message.payload)
        } catch (error) {
          this.log('Error in event callback:', error)
        }
      })

    } catch (error) {
      this.log('Failed to parse WebSocket message:', error)
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return

    this.reconnectAttempts++
    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    this.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect().catch(error => {
        this.log('Reconnection failed:', error)
      })
    }, delay)
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) return

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send('heartbeat' as WebSocketEventType, { timestamp: Date.now() })
      }
    }, this.config.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift()!
      this.ws.send(JSON.stringify(message))
      this.log('Sent queued message:', message)
    }
  }

  private getAuthToken(): string | null {
    try {
      return localStorage.getItem('access_token')
    } catch {
      return null
    }
  }

  private generateMessageId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private notifyConnectionListeners(): void {
    this.connectionListeners.forEach(callback => {
      try {
        callback()
      } catch (error) {
        this.log('Error in connection callback:', error)
      }
    })
  }

  private notifyDisconnectionListeners(): void {
    this.disconnectionListeners.forEach(callback => {
      try {
        callback()
      } catch (error) {
        this.log('Error in disconnection callback:', error)
      }
    })
  }

  private notifyErrorListeners(error: Event | Error): void {
    this.errorListeners.forEach(callback => {
      try {
        callback(error)
      } catch (err) {
        this.log('Error in error callback:', err)
      }
    })
  }

  private log(message: string, ...args: any[]): void {
    if (this.config.enableLogging) {
      console.log(`[WebSocket] ${message}`, ...args)
    }
  }
}

// === CALENDAR-SPECIFIC WEBSOCKET SERVICE ===

export class CalendarWebSocketService extends WebSocketService {
  constructor(config?: WebSocketConfig) {
    super({
      ...config,
      url: config?.url || `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws'}/calendar`
    })
  }

  /**
   * Join calendar room for specific location/barber
   */
  joinRoom(locationId?: number, barberId?: number): void {
    this.send('join_room' as WebSocketEventType, {
      location_id: locationId,
      barber_id: barberId
    })
  }

  /**
   * Leave calendar room
   */
  leaveRoom(locationId?: number, barberId?: number): void {
    this.send('leave_room' as WebSocketEventType, {
      location_id: locationId,
      barber_id: barberId
    })
  }

  /**
   * Subscribe to appointment updates
   */
  onAppointmentUpdate(callback: EventCallback<{
    appointment_id: number
    action: 'created' | 'updated' | 'cancelled' | 'confirmed' | 'completed'
    appointment: any
    changes?: Record<string, any>
  }>): () => void {
    const unsubscribers = [
      this.on('appointment_created', callback),
      this.on('appointment_updated', callback),
      this.on('appointment_cancelled', callback),
      this.on('appointment_confirmed', callback),
      this.on('appointment_completed', callback)
    ]

    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }

  /**
   * Subscribe to availability updates
   */
  onAvailabilityUpdate(callback: EventCallback<{
    barber_id: number
    date: string
    availability: any
  }>): () => void {
    return this.on('availability_updated', callback)
  }

  /**
   * Subscribe to schedule changes
   */
  onScheduleChange(callback: EventCallback<{
    barber_id: number
    schedule: any
    effective_date: string
  }>): () => void {
    return this.on('schedule_changed', callback)
  }

  /**
   * Subscribe to booking conflicts
   */
  onBookingConflict(callback: EventCallback<{
    appointment_id: number
    conflict_type: string
    message: string
    suggested_times?: Array<{ date: string; time: string }>
  }>): () => void {
    return this.on('booking_conflict', callback)
  }

  /**
   * Notify about appointment change (for optimistic updates)
   */
  notifyAppointmentChange(
    appointmentId: number,
    action: 'creating' | 'updating' | 'cancelling',
    data: any
  ): void {
    this.send('appointment_change_notification' as WebSocketEventType, {
      appointment_id: appointmentId,
      action,
      data,
      timestamp: new Date().toISOString()
    })
  }
}

// === SINGLETON INSTANCES ===

let globalWebSocketService: WebSocketService | null = null
let calendarWebSocketService: CalendarWebSocketService | null = null

/**
 * Get global WebSocket service instance
 */
export function getWebSocketService(): WebSocketService {
  if (!globalWebSocketService) {
    globalWebSocketService = new WebSocketService()
  }
  return globalWebSocketService
}

/**
 * Get calendar WebSocket service instance
 */
export function getCalendarWebSocketService(): CalendarWebSocketService {
  if (!calendarWebSocketService) {
    calendarWebSocketService = new CalendarWebSocketService()
  }
  return calendarWebSocketService
}

/**
 * Initialize WebSocket services
 */
export function initWebSocketServices(): Promise<void[]> {
  const globalWS = getWebSocketService()
  const calendarWS = getCalendarWebSocketService()

  return Promise.all([
    globalWS.connect(),
    calendarWS.connect()
  ])
}

/**
 * Cleanup WebSocket services
 */
export function cleanupWebSocketServices(): void {
  if (globalWebSocketService) {
    globalWebSocketService.disconnect()
    globalWebSocketService = null
  }

  if (calendarWebSocketService) {
    calendarWebSocketService.disconnect()
    calendarWebSocketService = null
  }
}

// === REACT HOOK ===

import { useEffect, useRef, useCallback, useState } from 'react'

export interface UseWebSocketOptions {
  enabled?: boolean
  autoConnect?: boolean
  reconnectOnMount?: boolean
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { enabled = true, autoConnect = true, reconnectOnMount = true } = options
  const [status, setStatus] = useState<string>('disconnected')
  const [error, setError] = useState<Error | null>(null)
  const wsRef = useRef<WebSocketService | null>(null)

  const connect = useCallback(async () => {
    if (!enabled) return

    try {
      const ws = getWebSocketService()
      wsRef.current = ws
      await ws.connect()
      setStatus(ws.getStatus())
      setError(null)
    } catch (err) {
      setError(err as Error)
      setStatus('error')
    }
  }, [enabled])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect()
      setStatus('disconnected')
    }
  }, [])

  const subscribe = useCallback((eventType: WebSocketEventType, callback: EventCallback) => {
    if (!wsRef.current) return () => {}
    return wsRef.current.on(eventType, callback)
  }, [])

  const send = useCallback((type: WebSocketEventType, payload: any) => {
    if (wsRef.current) {
      wsRef.current.send(type, payload)
    }
  }, [])

  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      if (!reconnectOnMount) {
        disconnect()
      }
    }
  }, [autoConnect, connect, disconnect, reconnectOnMount])

  // Set up status monitoring
  useEffect(() => {
    if (!wsRef.current) return

    const ws = wsRef.current

    const updateStatus = () => setStatus(ws.getStatus())
    const handleError = (error: Error | Event) => setError(error as Error)

    const unsubscribeConnect = ws.onConnect(updateStatus)
    const unsubscribeDisconnect = ws.onDisconnect(updateStatus)
    const unsubscribeError = ws.onError(handleError)

    return () => {
      unsubscribeConnect()
      unsubscribeDisconnect()
      unsubscribeError()
    }
  }, [wsRef.current])

  return {
    status,
    error,
    isConnected: status === 'connected',
    connect,
    disconnect,
    subscribe,
    send,
    service: wsRef.current
  }
}

export function useCalendarWebSocket(options: UseWebSocketOptions = {}) {
  const { enabled = true, autoConnect = true, reconnectOnMount = true } = options
  const [status, setStatus] = useState<string>('disconnected')
  const [error, setError] = useState<Error | null>(null)
  const wsRef = useRef<CalendarWebSocketService | null>(null)

  const connect = useCallback(async () => {
    if (!enabled) return

    try {
      const ws = getCalendarWebSocketService()
      wsRef.current = ws
      await ws.connect()
      setStatus(ws.getStatus())
      setError(null)
    } catch (err) {
      setError(err as Error)
      setStatus('error')
    }
  }, [enabled])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect()
      setStatus('disconnected')
    }
  }, [])

  const joinRoom = useCallback((locationId?: number, barberId?: number) => {
    if (wsRef.current) {
      wsRef.current.joinRoom(locationId, barberId)
    }
  }, [])

  const leaveRoom = useCallback((locationId?: number, barberId?: number) => {
    if (wsRef.current) {
      wsRef.current.leaveRoom(locationId, barberId)
    }
  }, [])

  const onAppointmentUpdate = useCallback((callback: EventCallback) => {
    if (!wsRef.current) return () => {}
    return wsRef.current.onAppointmentUpdate(callback)
  }, [])

  const onAvailabilityUpdate = useCallback((callback: EventCallback) => {
    if (!wsRef.current) return () => {}
    return wsRef.current.onAvailabilityUpdate(callback)
  }, [])

  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      if (!reconnectOnMount) {
        disconnect()
      }
    }
  }, [autoConnect, connect, disconnect, reconnectOnMount])

  return {
    status,
    error,
    isConnected: status === 'connected',
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    onAppointmentUpdate,
    onAvailabilityUpdate,
    service: wsRef.current
  }
}
