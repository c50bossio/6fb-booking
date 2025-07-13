/**
 * Calendar API Client
 * 
 * Provides comprehensive calendar management functionality including:
 * - Google Calendar integration and OAuth2 flow
 * - Calendar connection management
 * - Availability checking and time slot management
 * - Calendar sync operations and conflict detection
 * - Free/busy time management
 * - Appointment synchronization with external calendars
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ===============================
// TypeScript Interfaces
// ===============================

export interface CalendarConnectionStatus {
  connected: boolean
  valid?: boolean
  calendar_count?: number
  error?: string
}

export interface CalendarItem {
  id: string
  summary: string
  primary?: boolean
  accessRole: string
  description?: string
  timezone?: string
}

export interface CalendarListResponse {
  calendars: CalendarItem[]
}

export interface CalendarSelectRequest {
  calendar_id: string
}

export interface CalendarEventResponse {
  message: string
  google_event_id?: string
}

export interface CalendarAvailabilityRequest {
  start_time: string
  end_time: string
}

export interface CalendarAvailabilityResponse {
  available: boolean
  start_time: string
  end_time: string
  conflicts?: Array<{
    start: string
    end: string
    title?: string
  }>
}

export interface BusyPeriod {
  start: string
  end: string
}

export interface CalendarFreeBusyResponse {
  start_time: string
  end_time: string
  calendar_id: string
  busy_periods: BusyPeriod[]
}

export interface CalendarSyncRequest {
  start_date: string
  end_date: string
  force_sync?: boolean
}

export interface CalendarSyncResponse {
  message: string
  results: {
    synced?: number
    skipped?: number
    errors?: number
    failed?: Array<{
      appointment_id: number
      error: string
    }>
  }
}

export interface CalendarValidationResponse {
  connected: boolean
  valid_credentials: boolean
  can_list_calendars: boolean
  can_create_events: boolean
  selected_calendar?: string
  errors?: string[]
  warnings?: string[]
}

export interface CalendarConflictCheck {
  appointment_id: number
  conflicts: Array<{
    start: string
    end: string
    title: string
    event_id: string
  }>
  has_conflicts: boolean
}

export interface CalendarCleanupResponse {
  message: string
  results: {
    cleaned: number
    errors: number
    orphaned_events?: string[]
  }
}

export interface CalendarEvent {
  id?: string
  title: string
  start: string
  end: string
  description?: string
  location?: string
  attendees?: Array<{
    email: string
    name?: string
  }>
}

export interface CalendarTimeSlot {
  start_time: string
  end_time: string
  available: boolean
  duration_minutes: number
  conflicts?: Array<{
    title: string
    start: string
    end: string
  }>
}

export interface CalendarSettings {
  default_calendar_id?: string
  sync_enabled: boolean
  sync_direction: 'one_way' | 'two_way'
  reminder_minutes: number[]
  privacy_level: 'public' | 'private' | 'busy_only'
  auto_accept_bookings: boolean
}

// ===============================
// Utility Functions
// ===============================

/**
 * Get authorization headers with current JWT token
 */
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

/**
 * Handle API response and extract data
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(errorData.detail || `Request failed with status ${response.status}`)
  }
  return response.json()
}

/**
 * Build query string from parameters
 */
function buildQueryString(params: Record<string, any>): string {
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  
  return filtered.length > 0 ? `?${filtered.join('&')}` : ''
}

/**
 * Format date for API requests
 */
function formatDateForAPI(date: Date): string {
  return date.toISOString()
}

/**
 * Parse API date response
 */
function parseAPIDate(dateString: string): Date {
  return new Date(dateString)
}

// ===============================
// Calendar API Client
// ===============================

export const calendarApi = {
  // ===============================
  // OAuth2 Authentication
  // ===============================

  /**
   * Initiate Google Calendar OAuth2 authentication
   */
  async initiateAuth(): Promise<{ authorization_url: string }> {
    const response = await fetch(`${API_BASE_URL}/api/calendar/auth`, {
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  /**
   * Disconnect Google Calendar integration
   */
  async disconnectCalendar(): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/calendar/disconnect`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  // ===============================
  // Connection Management
  // ===============================

  /**
   * Get Google Calendar connection status
   */
  async getConnectionStatus(): Promise<CalendarConnectionStatus> {
    const response = await fetch(`${API_BASE_URL}/api/calendar/status`, {
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  /**
   * Validate calendar integration setup
   */
  async validateIntegration(): Promise<CalendarValidationResponse> {
    const response = await fetch(`${API_BASE_URL}/api/calendar/validate`, {
      method: 'POST',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  /**
   * Get calendar sync status
   */
  async getSyncStatus(): Promise<{
    connected: boolean
    total_appointments: number
    synced_appointments?: number
    unsynced_appointments?: number
    sync_percentage?: number
    last_sync?: string
    sync_enabled: boolean
    error?: string
  }> {
    const response = await fetch(`${API_BASE_URL}/api/calendar/sync-status`, {
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  // ===============================
  // Calendar Management
  // ===============================

  /**
   * List available Google Calendars
   */
  async listCalendars(): Promise<CalendarListResponse> {
    const response = await fetch(`${API_BASE_URL}/api/calendar/list`, {
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  /**
   * Select which calendar to use for syncing
   */
  async selectCalendar(calendarId: string): Promise<CalendarEventResponse> {
    const response = await fetch(`${API_BASE_URL}/api/calendar/select-calendar`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ calendar_id: calendarId })
    })

    return handleResponse(response)
  },

  // ===============================
  // Availability Management
  // ===============================

  /**
   * Check availability for a specific time slot
   */
  async checkAvailability(startTime: Date, endTime: Date): Promise<CalendarAvailabilityResponse> {
    const params = {
      start_time: formatDateForAPI(startTime),
      end_time: formatDateForAPI(endTime)
    }

    const response = await fetch(
      `${API_BASE_URL}/api/calendar/availability${buildQueryString(params)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Get free/busy information for a date range
   */
  async getFreeBusyTimes(startDate: Date, endDate: Date): Promise<CalendarFreeBusyResponse> {
    const params = {
      start_date: formatDateForAPI(startDate),
      end_date: formatDateForAPI(endDate)
    }

    const response = await fetch(
      `${API_BASE_URL}/api/calendar/free-busy${buildQueryString(params)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Get available time slots for a specific date
   */
  async getAvailableTimeSlots(
    date: Date,
    duration: number = 60,
    buffer: number = 15
  ): Promise<CalendarTimeSlot[]> {
    const startDate = new Date(date)
    startDate.setHours(0, 0, 0, 0)
    
    const endDate = new Date(date)
    endDate.setHours(23, 59, 59, 999)

    try {
      const freeBusy = await this.getFreeBusyTimes(startDate, endDate)
      
      // Generate time slots based on business hours (9 AM to 6 PM)
      const slots: CalendarTimeSlot[] = []
      const businessStart = new Date(date)
      businessStart.setHours(9, 0, 0, 0)
      
      const businessEnd = new Date(date)
      businessEnd.setHours(18, 0, 0, 0)
      
      let currentTime = new Date(businessStart)
      
      while (currentTime.getTime() + (duration * 60 * 1000) <= businessEnd.getTime()) {
        const slotEnd = new Date(currentTime.getTime() + (duration * 60 * 1000))
        
        // Check if this slot conflicts with busy periods
        const hasConflict = freeBusy.busy_periods.some(busy => {
          const busyStart = parseAPIDate(busy.start)
          const busyEnd = parseAPIDate(busy.end)
          
          return (currentTime < busyEnd && slotEnd > busyStart)
        })
        
        slots.push({
          start_time: formatDateForAPI(currentTime),
          end_time: formatDateForAPI(slotEnd),
          available: !hasConflict,
          duration_minutes: duration,
          conflicts: hasConflict ? freeBusy.busy_periods.filter(busy => {
            const busyStart = parseAPIDate(busy.start)
            const busyEnd = parseAPIDate(busy.end)
            return (currentTime < busyEnd && slotEnd > busyStart)
          }).map(busy => ({
            title: 'Busy',
            start: busy.start,
            end: busy.end
          })) : undefined
        })
        
        // Move to next slot (add buffer time)
        currentTime = new Date(currentTime.getTime() + ((duration + buffer) * 60 * 1000))
      }
      
      return slots
    } catch (error) {
      // Return empty slots if calendar not connected
      return []
    }
  },

  // ===============================
  // Appointment Synchronization
  // ===============================

  /**
   * Sync specific appointment to Google Calendar
   */
  async syncAppointment(appointmentId: number): Promise<CalendarEventResponse> {
    const response = await fetch(`${API_BASE_URL}/api/calendar/sync-appointment/${appointmentId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  /**
   * Sync multiple appointments to Google Calendar
   */
  async syncAppointments(
    startDate: Date,
    endDate: Date,
    forceSync: boolean = false
  ): Promise<CalendarSyncResponse> {
    const response = await fetch(`${API_BASE_URL}/api/calendar/sync-appointments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        start_date: formatDateForAPI(startDate),
        end_date: formatDateForAPI(endDate),
        force_sync: forceSync
      })
    })

    return handleResponse(response)
  },

  /**
   * Unsync appointment from Google Calendar
   */
  async unsyncAppointment(appointmentId: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/calendar/unsync-appointment/${appointmentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  /**
   * Bulk sync appointments with conflict detection
   */
  async bulkSyncAppointments(
    startDate: Date,
    endDate: Date
  ): Promise<CalendarSyncResponse> {
    const response = await fetch(`${API_BASE_URL}/api/calendar/bulk-sync`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        start_date: formatDateForAPI(startDate),
        end_date: formatDateForAPI(endDate)
      })
    })

    return handleResponse(response)
  },

  // ===============================
  // Conflict Detection
  // ===============================

  /**
   * Check for calendar conflicts for specific appointment
   */
  async checkAppointmentConflicts(appointmentId: number): Promise<CalendarConflictCheck> {
    const response = await fetch(`${API_BASE_URL}/api/calendar/check-conflicts/${appointmentId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  // ===============================
  // Maintenance Operations
  // ===============================

  /**
   * Clean up orphaned Google Calendar events
   */
  async cleanupOrphanedEvents(): Promise<CalendarCleanupResponse> {
    const response = await fetch(`${API_BASE_URL}/api/calendar/cleanup-orphaned`, {
      method: 'POST',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  // ===============================
  // Utility Methods
  // ===============================

  /**
   * Check if calendar is connected
   */
  async isConnected(): Promise<boolean> {
    try {
      const status = await this.getConnectionStatus()
      return status.connected && (status.valid !== false)
    } catch (error) {
      return false
    }
  },

  /**
   * Get OAuth authorization URL for reconnection
   */
  async getAuthURL(): Promise<string> {
    const authResponse = await this.initiateAuth()
    return authResponse.authorization_url
  },

  /**
   * Format time slot for display
   */
  formatTimeSlot(slot: CalendarTimeSlot): string {
    const start = parseAPIDate(slot.start_time)
    const end = parseAPIDate(slot.end_time)
    
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
    
    return `${formatTime(start)} - ${formatTime(end)}`
  },

  /**
   * Get time slot duration in minutes
   */
  getSlotDuration(slot: CalendarTimeSlot): number {
    const start = parseAPIDate(slot.start_time)
    const end = parseAPIDate(slot.end_time)
    
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60))
  },

  /**
   * Check if time slot is in business hours
   */
  isBusinessHours(slot: CalendarTimeSlot, businessStart: number = 9, businessEnd: number = 18): boolean {
    const start = parseAPIDate(slot.start_time)
    const hour = start.getHours()
    
    return hour >= businessStart && hour < businessEnd
  },

  /**
   * Filter available slots only
   */
  filterAvailableSlots(slots: CalendarTimeSlot[]): CalendarTimeSlot[] {
    return slots.filter(slot => slot.available)
  },

  /**
   * Group slots by date
   */
  groupSlotsByDate(slots: CalendarTimeSlot[]): Record<string, CalendarTimeSlot[]> {
    return slots.reduce((groups, slot) => {
      const date = parseAPIDate(slot.start_time).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(slot)
      return groups
    }, {} as Record<string, CalendarTimeSlot[]>)
  },

  /**
   * Get next available slot after given time
   */
  getNextAvailableSlot(
    slots: CalendarTimeSlot[],
    afterTime: Date = new Date()
  ): CalendarTimeSlot | null {
    const availableSlots = this.filterAvailableSlots(slots)
    
    const futureSlots = availableSlots.filter(slot => {
      const slotStart = parseAPIDate(slot.start_time)
      return slotStart > afterTime
    })
    
    if (futureSlots.length === 0) return null
    
    // Return earliest available slot
    return futureSlots.reduce((earliest, current) => {
      const earliestTime = parseAPIDate(earliest.start_time)
      const currentTime = parseAPIDate(current.start_time)
      return currentTime < earliestTime ? current : earliest
    })
  },

  /**
   * Calculate total available hours for a date range
   */
  calculateAvailableHours(slots: CalendarTimeSlot[]): number {
    const availableSlots = this.filterAvailableSlots(slots)
    
    return availableSlots.reduce((total, slot) => {
      return total + (slot.duration_minutes / 60)
    }, 0)
  },

  /**
   * Get calendar connection status display text
   */
  getConnectionStatusDisplay(status: CalendarConnectionStatus): string {
    if (!status.connected) {
      return 'Not Connected'
    } else if (status.valid === false) {
      return 'Connection Error'
    } else {
      return 'Connected'
    }
  },

  /**
   * Get connection status color for UI
   */
  getConnectionStatusColor(status: CalendarConnectionStatus): string {
    if (!status.connected) {
      return 'gray'
    } else if (status.valid === false) {
      return 'red'
    } else {
      return 'green'
    }
  },

  /**
   * Format busy period for display
   */
  formatBusyPeriod(period: BusyPeriod): string {
    const start = parseAPIDate(period.start)
    const end = parseAPIDate(period.end)
    
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    }
    
    // Same day
    if (start.toDateString() === end.toDateString()) {
      return `${formatDate(start)} ${formatTime(start)} - ${formatTime(end)}`
    } else {
      return `${formatDate(start)} ${formatTime(start)} - ${formatDate(end)} ${formatTime(end)}`
    }
  },

  /**
   * Calculate sync percentage
   */
  calculateSyncPercentage(synced: number, total: number): number {
    if (total === 0) return 100
    return Math.round((synced / total) * 100)
  },

  /**
   * Get sync status display text
   */
  getSyncStatusDisplay(syncData: {
    connected: boolean
    total_appointments: number
    synced_appointments?: number
    sync_percentage?: number
  }): string {
    if (!syncData.connected) {
      return 'Calendar not connected'
    }
    
    if (syncData.total_appointments === 0) {
      return 'No appointments to sync'
    }
    
    const synced = syncData.synced_appointments || 0
    const percentage = syncData.sync_percentage || this.calculateSyncPercentage(synced, syncData.total_appointments)
    
    return `${synced}/${syncData.total_appointments} synced (${percentage}%)`
  }
}

export default calendarApi