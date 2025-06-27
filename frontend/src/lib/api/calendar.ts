/**
 * Premium Calendar API Service
 * Comprehensive calendar integration with real-time updates, caching, and WebSocket support
 */

import apiClient from './client'
import type { ApiResponse, PaginatedResponse } from './client'
import { TimezoneHelper } from '../utils/datetime'

// === TYPE DEFINITIONS ===

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  allDay: boolean
  type: 'appointment' | 'availability' | 'blocked' | 'break'
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  color?: string
  backgroundColor?: string
  borderColor?: string
  textColor?: string

  // Appointment-specific data
  appointment?: CalendarAppointment

  // Availability-specific data
  availability?: CalendarAvailability

  // UI properties
  editable?: boolean
  deletable?: boolean
  resizable?: boolean
  movable?: boolean
}

export interface CalendarAppointment {
  id: number
  appointmentId?: number // Legacy support
  barberId: number
  barberName: string
  clientId?: number
  clientName: string
  clientEmail?: string
  clientPhone?: string
  serviceId: number
  serviceName: string
  serviceDuration: number
  servicePrice: number
  serviceCategory?: string
  locationId?: number
  locationName?: string
  notes?: string
  confirmationNumber?: string
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded'
  source: 'website' | 'phone' | 'walk_in' | 'staff' | 'app'
  createdAt: string
  updatedAt: string
}

export interface CalendarAvailability {
  id: number
  barberId: number
  barberName: string
  dayOfWeek: number // 0-6 (Sunday-Saturday)
  startTime: string // HH:MM format
  endTime: string
  breakStart?: string
  breakEnd?: string
  isAvailable: boolean
  maxBookings?: number
  locationId: number
  effectiveFrom?: string
  effectiveUntil?: string
}

export interface TimeSlot {
  date: string // ISO date string
  startTime: string // HH:MM format
  endTime: string
  available: boolean
  barberId: number
  barberName?: string
  reason?: string // If not available
  conflictsWith?: string[] // Appointment IDs that conflict
}

export interface CalendarViewOptions {
  view: 'month' | 'week' | 'day' | 'agenda'
  date: Date
  barberId?: number
  locationId?: number
  serviceId?: number
  timezone?: string
}

export interface CalendarFilters {
  barberIds?: number[]
  locationIds?: number[]
  serviceIds?: number[]
  statuses?: string[]
  types?: string[]
  clientSearch?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

export interface CreateAppointmentRequest {
  barberId: number
  serviceId?: number
  clientId?: number
  clientName: string
  clientEmail?: string
  clientPhone?: string
  appointmentDate: string // ISO date
  appointmentTime: string // HH:MM
  serviceName?: string
  duration?: number
  price?: number
  notes?: string
  source?: string
  sendConfirmation?: boolean
  timezone?: string
}

export interface UpdateAppointmentRequest {
  appointmentDate?: string
  appointmentTime?: string
  duration?: number
  barberId?: number
  serviceId?: number
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  notes?: string
  status?: string
  paymentStatus?: string
}

export interface CreateAvailabilityRequest {
  barberId: number
  locationId: number
  dayOfWeek: number
  startTime: string
  endTime: string
  breakStart?: string
  breakEnd?: string
  isAvailable?: boolean
  maxBookings?: number
  effectiveFrom?: string
  effectiveUntil?: string
}

export interface BulkOperationRequest {
  operation: 'create' | 'update' | 'delete'
  appointments?: Array<CreateAppointmentRequest | UpdateAppointmentRequest>
  availabilities?: Array<CreateAvailabilityRequest>
  appointmentIds?: number[]
  availabilityIds?: number[]
  reason?: string
}

export interface CalendarStats {
  totalAppointments: number
  confirmedAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  noShows: number
  totalRevenue: number
  averageServiceTime: number
  utilizationRate: number
  topServices: Array<{
    serviceId: number
    serviceName: string
    count: number
    revenue: number
  }>
  topBarbers: Array<{
    barberId: number
    barberName: string
    appointmentCount: number
    revenue: number
    rating: number
  }>
}

export interface ConflictCheck {
  hasConflicts: boolean
  conflicts: Array<{
    type: 'overlap' | 'unavailable' | 'closed' | 'booking_rule'
    message: string
    appointmentId?: number
    severity: 'error' | 'warning' | 'info'
  }>
  suggestions?: Array<{
    date: string
    time: string
    barberId?: number
    message: string
  }>
}

// === CACHE MANAGER ===

class CalendarCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

  set(key: string, data: any, ttl = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  clear(): void {
    this.cache.clear()
  }
}

// === WEBSOCKET MANAGER ===

export type WebSocketConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting'

export interface WebSocketStatusEvent {
  status: WebSocketConnectionStatus
  message?: string
  attempts?: number
}

class CalendarWebSocket {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private maxReconnectDelay = 30000
  private reconnectTimeout: NodeJS.Timeout | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private listeners = new Map<string, ((data: any) => void)[]>()
  private connectionStatus: WebSocketConnectionStatus = 'disconnected'
  private isManuallyDisconnected = false

  connect(): void {
    // Check if we're in a browser environment first
    if (typeof window === 'undefined') return

    // Don't connect if manually disconnected
    if (this.isManuallyDisconnected) return

    // Don't reconnect if already connected or connecting
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return

    this.setConnectionStatus('connecting')

    const token = localStorage.getItem('access_token')
    if (!token) {
      console.warn('No access token found, cannot connect to WebSocket')
      this.setConnectionStatus('error', 'No authentication token')
      return
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws'

    try {
      this.ws = new WebSocket(`${wsUrl}/calendar?token=${token}`)

      this.ws.onopen = () => {
        console.log('Calendar WebSocket connected')
        this.reconnectAttempts = 0
        this.isManuallyDisconnected = false
        this.setConnectionStatus('connected')
        this.startHeartbeat()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Handle heartbeat/ping messages
          if (data.type === 'ping') {
            this.send('pong', { timestamp: Date.now() })
            return
          }

          this.handleMessage(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      this.ws.onclose = (event) => {
        console.log('Calendar WebSocket disconnected', { code: event.code, reason: event.reason })
        this.stopHeartbeat()

        if (!this.isManuallyDisconnected) {
          this.setConnectionStatus('disconnected', `Connection closed: ${event.reason || 'Unknown reason'}`)
          this.attemptReconnect()
        }
      }

      this.ws.onerror = (error) => {
        console.error('Calendar WebSocket error:', error)
        this.setConnectionStatus('error', 'Connection error occurred')
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      this.setConnectionStatus('error', 'Failed to create connection')
    }
  }

  disconnect(): void {
    this.isManuallyDisconnected = true
    this.clearReconnectTimeout()
    this.stopHeartbeat()

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect')
      this.ws = null
    }

    this.setConnectionStatus('disconnected', 'Manually disconnected')
  }

  reconnect(): void {
    this.isManuallyDisconnected = false
    this.reconnectAttempts = 0
    this.disconnect()
    setTimeout(() => this.connect(), 100)
  }

  private setConnectionStatus(status: WebSocketConnectionStatus, message?: string): void {
    this.connectionStatus = status
    this.emit('connection_status', {
      status,
      message,
      attempts: this.reconnectAttempts
    } as WebSocketStatusEvent)
  }

  getConnectionStatus(): WebSocketConnectionStatus {
    return this.connectionStatus
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.connectionStatus === 'connected'
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send('ping', { timestamp: Date.now() })
      }
    }, 30000) // Send ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private attemptReconnect(): void {
    if (this.isManuallyDisconnected) return

    this.clearReconnectTimeout()

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max WebSocket reconnection attempts reached')
      this.setConnectionStatus('error', 'Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay)

    this.setConnectionStatus('reconnecting', `Reconnecting in ${delay/1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    this.reconnectTimeout = setTimeout(() => {
      console.log(`Attempting WebSocket reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      this.connect()
    }, delay)
  }

  private handleMessage(data: any): void {
    const { type, payload } = data
    const listeners = this.listeners.get(type) || []
    listeners.forEach(listener => {
      try {
        listener(payload)
      } catch (error) {
        console.error(`Error in WebSocket event listener for ${type}:`, error)
      }
    })
  }

  subscribe(eventType: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }
    this.listeners.get(eventType)!.push(callback)

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType) || []
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event) || []
    listeners.forEach(listener => {
      try {
        listener(data)
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error)
      }
    })
  }

  send(type: string, payload: any): void {
    if (this.isConnected()) {
      try {
        this.ws!.send(JSON.stringify({ type, payload }))
      } catch (error) {
        console.error('Failed to send WebSocket message:', error)
      }
    } else {
      console.warn(`Cannot send WebSocket message, connection status: ${this.connectionStatus}`)
    }
  }
}


// === MAIN SERVICE ===

class CalendarService {
  private cache = new CalendarCache()
  private websocket = new CalendarWebSocket()
  private eventListeners = new Map<string, ((data: any) => void)[]>()
  private isInitialized = false

  constructor() {
    // Initialize only in browser environment
    if (typeof window !== 'undefined') {
      this.initialize()
    }
  }

  private initialize(): void {
    if (this.isInitialized) return

    // Auto-connect WebSocket
    this.websocket.connect()

    // Set up real-time event handlers for appointments
    this.websocket.subscribe('appointment_created', (data) => {
      console.log('Real-time: Appointment created', data)
      this.cache.invalidate('appointments')
      this.cache.invalidate('calendar_events')
      this.emit('appointment_created', data)
      this.emit('calendar_update', { type: 'appointment_created', data })
    })

    this.websocket.subscribe('appointment_updated', (data) => {
      console.log('Real-time: Appointment updated', data)
      this.cache.invalidate('appointments')
      this.cache.invalidate('calendar_events')
      this.emit('appointment_updated', data)
      this.emit('calendar_update', { type: 'appointment_updated', data })
    })

    this.websocket.subscribe('appointment_deleted', (data) => {
      console.log('Real-time: Appointment deleted', data)
      this.cache.invalidate('appointments')
      this.cache.invalidate('calendar_events')
      this.emit('appointment_deleted', data)
      this.emit('calendar_update', { type: 'appointment_deleted', data })
    })

    this.websocket.subscribe('appointment_cancelled', (data) => {
      console.log('Real-time: Appointment cancelled', data)
      this.cache.invalidate('appointments')
      this.cache.invalidate('calendar_events')
      this.emit('appointment_cancelled', data)
      this.emit('calendar_update', { type: 'appointment_cancelled', data })
    })

    this.websocket.subscribe('appointment_status_changed', (data) => {
      console.log('Real-time: Appointment status changed', data)
      this.cache.invalidate('appointments')
      this.cache.invalidate('calendar_events')
      this.emit('appointment_status_changed', data)
      this.emit('calendar_update', { type: 'appointment_status_changed', data })
    })

    // Set up real-time event handlers for availability
    this.websocket.subscribe('availability_created', (data) => {
      console.log('Real-time: Availability created', data)
      this.cache.invalidate('availability')
      this.cache.invalidate('calendar_events')
      this.emit('availability_created', data)
      this.emit('calendar_update', { type: 'availability_created', data })
    })

    this.websocket.subscribe('availability_updated', (data) => {
      console.log('Real-time: Availability updated', data)
      this.cache.invalidate('availability')
      this.cache.invalidate('calendar_events')
      this.emit('availability_updated', data)
      this.emit('calendar_update', { type: 'availability_updated', data })
    })

    this.websocket.subscribe('availability_deleted', (data) => {
      console.log('Real-time: Availability deleted', data)
      this.cache.invalidate('availability')
      this.cache.invalidate('calendar_events')
      this.emit('availability_deleted', data)
      this.emit('calendar_update', { type: 'availability_deleted', data })
    })

    // Handle connection status changes
    this.websocket.subscribe('connection_status', (statusEvent: WebSocketStatusEvent) => {
      console.log('WebSocket connection status changed:', statusEvent)
      this.emit('connection_status', statusEvent)
    })

    this.isInitialized = true
  }

  // === EVENT MANAGEMENT ===

  on(event: string, callback: (data: any) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)

    return () => {
      const listeners = this.eventListeners.get(event) || []
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || []
    listeners.forEach(listener => listener(data))
  }

  // === CALENDAR EVENTS ===

  async getCalendarEvents(
    startDate: Date,
    endDate: Date,
    filters?: CalendarFilters,
    options?: CalendarViewOptions & { includeGoogleEvents?: boolean }
  ): Promise<ApiResponse<CalendarEvent[]>> {
    const cacheKey = `calendar_events_${startDate.toISOString()}_${endDate.toISOString()}_${JSON.stringify(filters)}_${options?.includeGoogleEvents}`
    const cached = this.cache.get<CalendarEvent[]>(cacheKey)
    if (cached) {
      return { data: cached }
    }

    const params = new URLSearchParams({
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      timezone: options?.timezone || TimezoneHelper.getUserTimezone()
    })

    if (filters?.barberIds?.length) {
      params.append('barber_ids', filters.barberIds.join(','))
    }
    if (filters?.locationIds?.length) {
      params.append('location_ids', filters.locationIds.join(','))
    }
    if (filters?.serviceIds?.length) {
      params.append('service_ids', filters.serviceIds.join(','))
    }
    if (filters?.statuses?.length) {
      params.append('statuses', filters.statuses.join(','))
    }
    if (filters?.types?.length) {
      params.append('types', filters.types.join(','))
    }
    if (filters?.clientSearch) {
      params.append('client_search', filters.clientSearch)
    }

    const response = await apiClient.get(`/calendar/events?${params}`)

    // The response should already be in CalendarEvent format from the backend
    let events = response.data

    // If includeGoogleEvents is true, fetch and merge Google Calendar events
    if (options?.includeGoogleEvents) {
      try {
        const googleEvents = await this.getGoogleCalendarEvents(startDate, endDate)
        events = this.mergeGoogleEvents(events, googleEvents.data)
      } catch (error) {
        console.warn('Failed to fetch Google Calendar events:', error)
        // Continue with regular events even if Google Calendar fails
      }
    }

    this.cache.set(cacheKey, events)
    return { data: events }
  }

  private transformToCalendarEvent(item: any): CalendarEvent {
    if (item.type === 'appointment') {
      const start = new Date(`${item.appointment_date}T${item.appointment_time}`)
      const end = new Date(start.getTime() + (item.duration_minutes || 60) * 60000)

      return {
        id: `appointment_${item.id}`,
        title: `${item.service_name} - ${item.client_name}`,
        description: item.notes,
        start,
        end,
        allDay: false,
        type: 'appointment',
        status: item.status,
        color: this.getEventColor(item.status, 'appointment'),
        backgroundColor: this.getEventColor(item.status, 'appointment'),
        appointment: {
          id: item.id,
          barberId: item.barber_id,
          barberName: item.barber_name,
          clientId: item.client_id,
          clientName: item.client_name,
          clientEmail: item.client_email,
          clientPhone: item.client_phone,
          serviceId: item.service_id || 0,
          serviceName: item.service_name,
          serviceDuration: item.duration_minutes || 60,
          servicePrice: item.service_revenue || 0,
          serviceCategory: item.service_category,
          locationId: item.location_id,
          locationName: item.location_name,
          notes: item.notes,
          confirmationNumber: item.confirmation_number,
          paymentStatus: item.payment_status || 'pending',
          source: item.source || 'staff',
          createdAt: item.created_at,
          updatedAt: item.updated_at
        },
        editable: item.status === 'scheduled',
        deletable: ['scheduled', 'confirmed'].includes(item.status),
        resizable: item.status === 'scheduled',
        movable: item.status === 'scheduled'
      }
    } else {
      // Availability block
      const start = new Date(`${item.date}T${item.start_time}`)
      const end = new Date(`${item.date}T${item.end_time}`)

      return {
        id: `availability_${item.id}`,
        title: item.is_available ? 'Available' : 'Unavailable',
        description: item.reason,
        start,
        end,
        allDay: false,
        type: 'availability',
        status: 'scheduled',
        color: item.is_available ? '#10b981' : '#ef4444',
        backgroundColor: item.is_available ? '#d1fae5' : '#fee2e2',
        availability: {
          id: item.id,
          barberId: item.barber_id,
          barberName: item.barber_name,
          dayOfWeek: start.getDay(),
          startTime: item.start_time,
          endTime: item.end_time,
          breakStart: item.break_start,
          breakEnd: item.break_end,
          isAvailable: item.is_available,
          maxBookings: item.max_bookings,
          locationId: item.location_id,
          effectiveFrom: item.effective_from,
          effectiveUntil: item.effective_until
        },
        editable: true,
        deletable: true,
        resizable: true,
        movable: true
      }
    }
  }

  private getEventColor(status: string, type: string): string {
    if (type === 'appointment') {
      switch (status) {
        case 'scheduled': return '#3b82f6'
        case 'confirmed': return '#10b981'
        case 'completed': return '#6b7280'
        case 'cancelled': return '#ef4444'
        case 'no_show': return '#f59e0b'
        default: return '#6b7280'
      }
    }
    return '#10b981'
  }

  // === APPOINTMENTS ===

  async createAppointment(data: CreateAppointmentRequest): Promise<ApiResponse<CalendarAppointment>> {
    const response = await apiClient.post('/calendar/appointments', {
      barber_id: data.barberId,
      service_id: data.serviceId,
      client_id: data.clientId,
      client_name: data.clientName,
      client_email: data.clientEmail,
      client_phone: data.clientPhone,
      appointment_date: data.appointmentDate,
      appointment_time: data.appointmentTime,
      service_name: data.serviceName || 'Service',
      service_duration: data.duration || 60,
      service_price: data.price || 0,
      notes: data.notes,
      send_confirmation: data.sendConfirmation,
      sync_to_google_calendar: true
    })

    this.cache.invalidate('appointments')
    this.cache.invalidate('calendar_events')

    return { data: response.data }
  }

  async updateAppointment(
    appointmentId: number,
    data: UpdateAppointmentRequest
  ): Promise<ApiResponse<CalendarAppointment>> {
    const response = await apiClient.patch(`/calendar/appointments/${appointmentId}`, data)

    this.cache.invalidate('appointments')
    this.cache.invalidate('calendar_events')

    return { data: response.data }
  }

  async deleteAppointment(appointmentId: number, reason?: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/calendar/appointments/${appointmentId}`, {
      data: { reason }
    })

    this.cache.invalidate('appointments')
    this.cache.invalidate('calendar_events')

    return response.data
  }

  async getAppointment(appointmentId: number): Promise<ApiResponse<CalendarAppointment>> {
    const cacheKey = `appointment_${appointmentId}`
    const cached = this.cache.get<CalendarAppointment>(cacheKey)
    if (cached) {
      return { data: cached }
    }

    const response = await apiClient.get(`/calendar/appointments/${appointmentId}`)
    this.cache.set(cacheKey, response.data)

    return { data: response.data }
  }

  // === AVAILABILITY ===

  async getAvailability(
    barberId: number,
    startDate: Date,
    endDate: Date,
    serviceId?: number
  ): Promise<ApiResponse<TimeSlot[]>> {
    const cacheKey = `availability_${barberId}_${startDate.toISOString()}_${endDate.toISOString()}_${serviceId}`
    const cached = this.cache.get<TimeSlot[]>(cacheKey)
    if (cached) {
      return { data: cached }
    }

    const params = new URLSearchParams({
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    })

    if (serviceId) {
      params.append('service_id', serviceId.toString())
    }

    const response = await apiClient.get(`/calendar/barbers/${barberId}/availability?${params}`)
    this.cache.set(cacheKey, response.data, 2 * 60 * 1000) // 2 minute cache for availability

    return { data: response.data }
  }

  async createAvailability(data: CreateAvailabilityRequest): Promise<ApiResponse<CalendarAvailability>> {
    const response = await apiClient.post('/calendar/availability', data)

    this.cache.invalidate('availability')
    this.cache.invalidate('calendar_events')

    return { data: response.data }
  }

  async updateAvailability(
    availabilityId: number,
    data: Partial<CreateAvailabilityRequest>
  ): Promise<ApiResponse<CalendarAvailability>> {
    const response = await apiClient.patch(`/calendar/availability/${availabilityId}`, data)

    this.cache.invalidate('availability')
    this.cache.invalidate('calendar_events')

    return { data: response.data }
  }

  async deleteAvailability(availabilityId: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/calendar/availability/${availabilityId}`)

    this.cache.invalidate('availability')
    this.cache.invalidate('calendar_events')

    return response.data
  }

  // === BULK OPERATIONS ===

  async bulkOperation(data: BulkOperationRequest): Promise<ApiResponse<any>> {
    const response = await apiClient.post('/calendar/bulk', data)

    // Clear all relevant caches
    this.cache.invalidate('appointments')
    this.cache.invalidate('availability')
    this.cache.invalidate('calendar_events')

    return { data: response.data }
  }

  // === CONFLICT CHECKING ===

  async checkConflicts(data: CreateAppointmentRequest): Promise<ApiResponse<ConflictCheck>> {
    const response = await apiClient.post('/calendar/check-conflicts', data)
    return { data: response.data }
  }

  // === STATISTICS ===

  async getStats(
    startDate: Date,
    endDate: Date,
    filters?: CalendarFilters
  ): Promise<ApiResponse<CalendarStats>> {
    const cacheKey = `stats_${startDate.toISOString()}_${endDate.toISOString()}_${JSON.stringify(filters)}`
    const cached = this.cache.get<CalendarStats>(cacheKey)
    if (cached) {
      return { data: cached }
    }

    const params = new URLSearchParams({
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    })

    if (filters?.barberIds?.length) {
      params.append('barber_ids', filters.barberIds.join(','))
    }
    if (filters?.locationIds?.length) {
      params.append('location_ids', filters.locationIds.join(','))
    }

    const response = await apiClient.get(`/calendar/stats?${params}`)
    this.cache.set(cacheKey, response.data, 10 * 60 * 1000) // 10 minute cache for stats

    return { data: response.data }
  }

  // === WEBSOCKET METHODS ===

  getConnectionStatus(): WebSocketConnectionStatus {
    return this.websocket.getConnectionStatus()
  }

  isWebSocketConnected(): boolean {
    return this.websocket.isConnected()
  }

  reconnectWebSocket(): void {
    this.websocket.reconnect()
  }

  disconnectWebSocket(): void {
    this.websocket.disconnect()
  }

  // === GOOGLE CALENDAR INTEGRATION ===

  async getGoogleCalendarEvents(
    startDate: Date,
    endDate: Date
  ): Promise<ApiResponse<CalendarEvent[]>> {
    const params = new URLSearchParams({
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    })

    const response = await apiClient.get(`/google-calendar/events?${params}`)

    // Transform Google Calendar events to CalendarEvent format
    const events: CalendarEvent[] = response.data.map((event: any) => {
      const start = new Date(event.start)
      const end = new Date(event.end)

      // Parse event summary to extract client and service info if available
      const summaryMatch = event.summary?.match(/^(.*?) - (.*)$/)
      const clientName = summaryMatch ? summaryMatch[1] : event.summary || 'Google Event'
      const serviceName = summaryMatch ? summaryMatch[2] : 'External Event'

      return {
        id: `google_${event.id}`,
        title: event.summary || 'Google Calendar Event',
        description: event.description,
        start,
        end,
        allDay: false,
        type: 'appointment' as const,
        status: 'confirmed' as const,
        color: '#4285f4', // Google blue
        backgroundColor: '#e8f0fe',
        borderColor: '#4285f4',
        textColor: '#1a73e8',
        appointment: {
          id: 0, // Google events don't have appointment IDs
          barberId: 0,
          barberName: 'External',
          clientName,
          clientEmail: event.attendees?.[0] || '',
          serviceId: 0,
          serviceName,
          serviceDuration: Math.round((end.getTime() - start.getTime()) / 60000),
          servicePrice: 0,
          paymentStatus: 'paid' as const,
          source: 'app' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        editable: false, // Google events are read-only in our system
        deletable: false,
        resizable: false,
        movable: false
      }
    })

    return { data: events }
  }

  private mergeGoogleEvents(
    localEvents: CalendarEvent[],
    googleEvents: CalendarEvent[]
  ): CalendarEvent[] {
    // Create a map of local appointments by their Google event ID (if synced)
    const syncedGoogleIds = new Set<string>()

    localEvents.forEach(event => {
      if (event.appointment && 'googleEventId' in event.appointment) {
        const googleId = (event.appointment as any).googleEventId
        if (googleId) {
          syncedGoogleIds.add(googleId)
        }
      }
    })

    // Filter out Google events that are already synced as appointments
    const uniqueGoogleEvents = googleEvents.filter(event => {
      const googleId = event.id.replace('google_', '')
      return !syncedGoogleIds.has(googleId)
    })

    // Merge and sort all events
    const allEvents = [...localEvents, ...uniqueGoogleEvents]
    allEvents.sort((a, b) => a.start.getTime() - b.start.getTime())

    return allEvents
  }

  async getGoogleCalendarStatus(): Promise<ApiResponse<{
    connected: boolean
    status: string
    message: string
    google_email?: string
    last_sync_date?: string
  }>> {
    try {
      const response = await apiClient.get('/google-calendar/status')
      return { data: response.data }
    } catch (error) {
      return {
        data: {
          connected: false,
          status: 'error',
          message: 'Failed to check Google Calendar connection'
        }
      }
    }
  }

  // === UTILITY METHODS ===

  clearCache(): void {
    this.cache.clear()
  }

  disconnect(): void {
    this.websocket.disconnect()
  }

  getEventById(eventId: string, events: CalendarEvent[]): CalendarEvent | undefined {
    return events.find(event => event.id === eventId)
  }

  filterEvents(events: CalendarEvent[], filters: CalendarFilters): CalendarEvent[] {
    return events.filter(event => {
      // Apply filters
      if (filters.barberIds?.length && event.appointment) {
        if (!filters.barberIds.includes(event.appointment.barberId)) return false
      }

      if (filters.statuses?.length) {
        if (!filters.statuses.includes(event.status)) return false
      }

      if (filters.types?.length) {
        if (!filters.types.includes(event.type)) return false
      }

      if (filters.clientSearch && event.appointment) {
        const search = filters.clientSearch.toLowerCase()
        const clientName = event.appointment.clientName.toLowerCase()
        const clientEmail = event.appointment.clientEmail?.toLowerCase() || ''
        if (!clientName.includes(search) && !clientEmail.includes(search)) return false
      }

      return true
    })
  }

  groupEventsByDate(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
    return events.reduce((groups, event) => {
      const date = event.start.toISOString().split('T')[0]
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(event)
      return groups
    }, {} as Record<string, CalendarEvent[]>)
  }

  getEventsForDate(date: Date, events: CalendarEvent[]): CalendarEvent[] {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(event => {
      const eventDate = event.start.toISOString().split('T')[0]
      return eventDate === dateStr
    })
  }
}

// Export singleton instance
export const calendarService = new CalendarService()
