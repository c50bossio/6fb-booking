/**
 * Enhanced Calendar API with Request Deduplication and Optimistic Updates
 * Wraps existing API functions to provide better reliability and user experience
 */

import { requestDeduplicationManager } from './request-deduplication'
import { calendarOptimisticManager } from './calendar-optimistic-updates'
import { batchCalendarData, requestBatcher } from './requestBatcher'
import { 
  getMyBookings, 
  cancelBooking, 
  rescheduleBooking,
  type BookingResponse 
} from './api'
import type { Appointment } from '@/types/calendar'

/**
 * Enhanced API wrapper that provides:
 * - Request deduplication
 * - Optimistic updates
 * - Automatic retries
 * - Cache management
 */
export class CalendarApiEnhanced {
  private static instance: CalendarApiEnhanced

  private constructor() {}

  static getInstance(): CalendarApiEnhanced {
    if (!CalendarApiEnhanced.instance) {
      CalendarApiEnhanced.instance = new CalendarApiEnhanced()
    }
    return CalendarApiEnhanced.instance
  }

  /**
   * Get appointments with caching and deduplication
   */
  async getAppointments(forceRefresh = false): Promise<{ bookings: BookingResponse[] }> {
    if (forceRefresh) {
      requestDeduplicationManager.clearCache('my-bookings')
    }

    return requestDeduplicationManager.executeRequest(
      {
        key: 'get-my-bookings',
        endpoint: '/my-bookings',
        method: 'GET'
      },
      () => getMyBookings()
    )
  }

  /**
   * Create appointment with optimistic updates
   */
  async createAppointment(appointmentData: {
    service_id: number
    barber_id: number
    client_name: string
    client_email: string
    client_phone: string
    date: string
    time: string
    notes?: string
    price?: number
  }): Promise<BookingResponse> {
    return calendarOptimisticManager.createAppointment(
      {
        ...appointmentData,
        start_time: `${appointmentData.date}T${appointmentData.time}:00`,
        end_time: this.calculateEndTime(appointmentData.date, appointmentData.time, 60), // Default 60 minutes
        service_name: 'New Service', // Would be resolved from service_id
        barber_name: 'Barber', // Would be resolved from barber_id
        status: 'pending'
      },
      () => this.callCreateAppointmentAPI(appointmentData)
    )
  }

  /**
   * Update appointment with optimistic updates
   */
  async updateAppointment(
    appointmentId: number, 
    updates: Partial<Appointment>
  ): Promise<BookingResponse> {
    return calendarOptimisticManager.updateAppointment(
      appointmentId,
      updates,
      () => this.callUpdateAppointmentAPI(appointmentId, updates)
    )
  }

  /**
   * Cancel appointment with optimistic updates
   */
  async cancelAppointment(appointmentId: number): Promise<BookingResponse> {
    return calendarOptimisticManager.cancelAppointment(
      appointmentId,
      () => this.callCancelAppointmentAPI(appointmentId)
    )
  }

  /**
   * Reschedule appointment with optimistic updates
   */
  async rescheduleAppointment(
    appointmentId: number,
    newDate: string,
    newTime: string
  ): Promise<BookingResponse> {
    const newStartTime = `${newDate}T${newTime}:00`
    const newEndTime = this.calculateEndTime(newDate, newTime, 60) // Default duration

    return calendarOptimisticManager.rescheduleAppointment(
      appointmentId,
      newStartTime,
      () => this.callRescheduleAppointmentAPI(appointmentId, newDate, newTime),
      newEndTime
    )
  }

  /**
   * Delete appointment with optimistic updates
   */
  async deleteAppointment(appointmentId: number): Promise<void> {
    return calendarOptimisticManager.deleteAppointment(
      appointmentId,
      () => this.callDeleteAppointmentAPI(appointmentId)
    )
  }

  /**
   * Batch fetch appointments for multiple dates/criteria
   */
  async batchFetchAppointments(requests: Array<{
    dateRange?: { start: string; end: string }
    barberId?: number
    status?: string
    priority?: number
  }>): Promise<any[]> {
    const calendarRequests = requests.map((req, index) => {
      let endpoint = '/api/v2/appointments/'
      const params = new URLSearchParams()
      
      if (req.dateRange) {
        params.append('start_date', req.dateRange.start)
        params.append('end_date', req.dateRange.end)
      }
      if (req.barberId) {
        params.append('barber_id', req.barberId.toString())
      }
      if (req.status) {
        params.append('status', req.status)
      }
      
      if (params.toString()) {
        endpoint += `?${params.toString()}`
      }

      return {
        endpoint,
        priority: req.priority || 5
      }
    })

    return batchCalendarData(calendarRequests)
  }

  /**
   * Batch operations for multiple appointments
   */
  async batchUpdateAppointments(operations: Array<{
    type: 'create' | 'update' | 'delete' | 'cancel' | 'reschedule'
    appointmentId?: number
    data?: any
  }>): Promise<any[]> {
    const apiOperations = operations.map(op => ({
      type: op.type as 'create' | 'update' | 'delete',
      appointmentId: op.appointmentId,
      data: op.data,
      apiCall: () => {
        switch (op.type) {
          case 'create':
            return this.callCreateAppointmentAPI(op.data)
          case 'update':
            return this.callUpdateAppointmentAPI(op.appointmentId!, op.data)
          case 'delete':
            return this.callDeleteAppointmentAPI(op.appointmentId!)
          case 'cancel':
            return this.callCancelAppointmentAPI(op.appointmentId!)
          case 'reschedule':
            return this.callRescheduleAppointmentAPI(
              op.appointmentId!, 
              op.data.date, 
              op.data.time
            )
          default:
            throw new Error(`Unknown operation type: ${op.type}`)
        }
      }
    }))

    return calendarOptimisticManager.batchOperations(apiOperations)
  }

  /**
   * Refresh appointments and clear all optimistic updates
   */
  async refreshAppointments(): Promise<void> {
    // Clear cache to force fresh data
    requestDeduplicationManager.clearCache('my-bookings')
    
    // Refresh through optimistic manager
    await calendarOptimisticManager.refreshAppointments(() => this.getAppointments(true))
  }

  /**
   * Move appointment to different time slot (drag & drop)
   */
  async moveAppointment(
    appointmentId: number, 
    newStartTime: string,
    newEndTime?: string
  ): Promise<BookingResponse> {
    const startDate = new Date(newStartTime)
    const date = startDate.toISOString().split('T')[0]
    const time = startDate.toTimeString().split(' ')[0].substring(0, 5)

    return this.rescheduleAppointment(appointmentId, date, time)
  }

  /**
   * Bulk reschedule appointments (useful for barber availability changes)
   */
  async bulkReschedule(reschedules: Array<{
    appointmentId: number
    newDate: string
    newTime: string
  }>): Promise<BookingResponse[]> {
    const operations = reschedules.map(r => ({
      type: 'reschedule' as const,
      appointmentId: r.appointmentId,
      data: { date: r.newDate, time: r.newTime }
    }))

    return this.batchUpdateAppointments(operations)
  }

  /**
   * Get appointment conflicts for a specific time slot
   */
  async checkAppointmentConflicts(
    barberId: number,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: number
  ): Promise<BookingResponse[]> {
    return requestDeduplicationManager.executeRequest(
      {
        key: `check-conflicts-${barberId}-${startTime}-${endTime}`,
        endpoint: '/appointments/conflicts',
        method: 'POST',
        data: { barberId, startTime, endTime, excludeAppointmentId }
      },
      () => this.callCheckConflictsAPI(barberId, startTime, endTime, excludeAppointmentId)
    )
  }

  /**
   * Get available time slots for a barber on a specific date
   */
  async getAvailableSlots(
    barberId: number,
    date: string,
    duration: number = 60
  ): Promise<string[]> {
    return requestDeduplicationManager.executeRequest(
      {
        key: `available-slots-${barberId}-${date}-${duration}`,
        endpoint: '/barbers/available-slots',
        method: 'GET',
        data: { barberId, date, duration }
      },
      () => this.callGetAvailableSlotsAPI(barberId, date, duration)
    )
  }

  /**
   * Preload calendar data for adjacent dates (smart preloading)
   */
  async preloadAdjacentDates(
    currentDate: string,
    barberId?: number,
    daysAhead: number = 3,
    daysBehind: number = 1
  ): Promise<void> {
    const requests = []
    const baseDate = new Date(currentDate)

    // Generate date ranges for preloading
    for (let i = -daysBehind; i <= daysAhead; i++) {
      if (i === 0) continue // Skip current date as it's likely already loaded
      
      const targetDate = new Date(baseDate)
      targetDate.setDate(baseDate.getDate() + i)
      const dateStr = targetDate.toISOString().split('T')[0]

      requests.push({
        dateRange: { start: dateStr, end: dateStr },
        barberId,
        priority: Math.abs(i) === 1 ? 7 : 4 // Higher priority for adjacent days
      })
    }

    // Execute batch preload in background
    try {
      await this.batchFetchAppointments(requests)
    } catch (error) {
      console.warn('Preloading failed:', error)
      // Preloading failures should not impact the main calendar functionality
    }
  }

  /**
   * Smart refresh that only fetches what's actually needed
   */
  async smartRefresh(options: {
    currentDate?: string
    barberId?: number
    priority?: number
    includeAdjacentDays?: boolean
  } = {}): Promise<void> {
    const { currentDate, barberId, priority = 8, includeAdjacentDays = true } = options

    const requests = []

    // Current date/view
    if (currentDate) {
      requests.push({
        dateRange: { start: currentDate, end: currentDate },
        barberId,
        priority
      })

      // Include adjacent days for smoother navigation
      if (includeAdjacentDays) {
        const baseDate = new Date(currentDate)
        
        // Previous day
        const prevDate = new Date(baseDate)
        prevDate.setDate(baseDate.getDate() - 1)
        requests.push({
          dateRange: { 
            start: prevDate.toISOString().split('T')[0], 
            end: prevDate.toISOString().split('T')[0] 
          },
          barberId,
          priority: priority - 2
        })

        // Next day
        const nextDate = new Date(baseDate)
        nextDate.setDate(baseDate.getDate() + 1)
        requests.push({
          dateRange: { 
            start: nextDate.toISOString().split('T')[0], 
            end: nextDate.toISOString().split('T')[0] 
          },
          barberId,
          priority: priority - 2
        })
      }
    } else {
      // Default to current bookings
      requests.push({
        priority
      })
    }

    await this.batchFetchAppointments(requests)
  }

  /**
   * Batch calendar refresh optimized for calendar view changes
   */
  async batchCalendarRefresh(config: {
    viewType: 'day' | 'week' | 'month'
    currentDate: string
    barberId?: number
    includeMetrics?: boolean
  }): Promise<{
    appointments: any[]
    metrics?: any
    availability?: any
  }> {
    const requests = []
    let dateRange: { start: string; end: string }

    const baseDate = new Date(config.currentDate)

    switch (config.viewType) {
      case 'day':
        dateRange = {
          start: config.currentDate,
          end: config.currentDate
        }
        break
      case 'week':
        const startOfWeek = new Date(baseDate)
        startOfWeek.setDate(baseDate.getDate() - baseDate.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        dateRange = {
          start: startOfWeek.toISOString().split('T')[0],
          end: endOfWeek.toISOString().split('T')[0]
        }
        break
      case 'month':
        const startOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
        const endOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0)
        dateRange = {
          start: startOfMonth.toISOString().split('T')[0],
          end: endOfMonth.toISOString().split('T')[0]
        }
        break
    }

    // Primary appointments request
    requests.push({
      endpoint: `/api/v2/appointments?start_date=${dateRange.start}&end_date=${dateRange.end}${config.barberId ? `&barber_id=${config.barberId}` : ''}`,
      priority: 9
    })

    // Include metrics if requested
    if (config.includeMetrics) {
      requests.push({
        endpoint: `/api/v2/analytics/calendar-metrics?start_date=${dateRange.start}&end_date=${dateRange.end}`,
        priority: 6
      })
    }

    // Include availability data for the period
    requests.push({
      endpoint: `/api/v2/barbers/availability?start_date=${dateRange.start}&end_date=${dateRange.end}${config.barberId ? `&barber_id=${config.barberId}` : ''}`,
      priority: 7
    })

    const results = await batchCalendarData(requests)

    return {
      appointments: results[0]?.appointments || results[0] || [],
      metrics: config.includeMetrics ? results[1] : undefined,
      availability: results[config.includeMetrics ? 2 : 1]
    }
  }

  /**
   * Private methods for actual API calls
   */
  private async callCreateAppointmentAPI(data: any): Promise<BookingResponse> {
    // This would call the actual API endpoint
    // For now, simulating with the existing API structure
    const response = await fetch('/api/v2/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to create appointment: ${response.statusText}`)
    }
    
    return response.json()
  }

  private async callUpdateAppointmentAPI(id: number, data: any): Promise<BookingResponse> {
    const response = await fetch(`/api/v2/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to update appointment: ${response.statusText}`)
    }
    
    return response.json()
  }

  private async callCancelAppointmentAPI(id: number): Promise<BookingResponse> {
    // Use existing cancelBooking function
    await cancelBooking(id)
    
    // Return updated appointment object
    const appointments = await getMyBookings()
    const cancelledAppointment = appointments.bookings.find(apt => apt.id === id)
    
    if (!cancelledAppointment) {
      throw new Error('Appointment not found after cancellation')
    }
    
    return cancelledAppointment
  }

  private async callRescheduleAppointmentAPI(
    id: number, 
    date: string, 
    time: string
  ): Promise<BookingResponse> {
    // Use existing rescheduleBooking function
    await rescheduleBooking(id, date, time)
    
    // Return updated appointment object
    const appointments = await getMyBookings()
    const rescheduledAppointment = appointments.bookings.find(apt => apt.id === id)
    
    if (!rescheduledAppointment) {
      throw new Error('Appointment not found after rescheduling')
    }
    
    return rescheduledAppointment
  }

  private async callDeleteAppointmentAPI(id: number): Promise<void> {
    const response = await fetch(`/api/v2/appointments/${id}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) {
      throw new Error(`Failed to delete appointment: ${response.statusText}`)
    }
  }

  private async callCheckConflictsAPI(
    barberId: number,
    startTime: string,
    endTime: string,
    excludeId?: number
  ): Promise<BookingResponse[]> {
    const response = await fetch('/api/v2/appointments/conflicts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barberId, startTime, endTime, excludeId })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to check conflicts: ${response.statusText}`)
    }
    
    return response.json()
  }

  private async callGetAvailableSlotsAPI(
    barberId: number,
    date: string,
    duration: number
  ): Promise<string[]> {
    const response = await fetch(
      `/api/v2/barbers/${barberId}/available-slots?date=${date}&duration=${duration}`
    )
    
    if (!response.ok) {
      throw new Error(`Failed to get available slots: ${response.statusText}`)
    }
    
    return response.json()
  }

  /**
   * Helper to calculate end time
   */
  private calculateEndTime(date: string, time: string, durationMinutes: number): string {
    const startDateTime = new Date(`${date}T${time}:00`)
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000)
    return endDateTime.toISOString()
  }

  /**
   * Clear all caches and pending requests
   */
  clearAllCaches(): void {
    requestDeduplicationManager.clearCache()
  }

  /**
   * Abort all pending requests
   */
  abortAllRequests(): void {
    requestDeduplicationManager.abortPendingRequests()
  }

  /**
   * Get debug statistics
   */
  getDebugStats() {
    return {
      requestManager: requestDeduplicationManager.getStats(),
      optimisticManager: calendarOptimisticManager.getState()
    }
  }
}

// Export singleton instance
export const calendarApiEnhanced = CalendarApiEnhanced.getInstance()

// React hook for enhanced calendar API
export function useCalendarApiEnhanced() {
  return {
    getAppointments: calendarApiEnhanced.getAppointments.bind(calendarApiEnhanced),
    createAppointment: calendarApiEnhanced.createAppointment.bind(calendarApiEnhanced),
    updateAppointment: calendarApiEnhanced.updateAppointment.bind(calendarApiEnhanced),
    cancelAppointment: calendarApiEnhanced.cancelAppointment.bind(calendarApiEnhanced),
    rescheduleAppointment: calendarApiEnhanced.rescheduleAppointment.bind(calendarApiEnhanced),
    deleteAppointment: calendarApiEnhanced.deleteAppointment.bind(calendarApiEnhanced),
    moveAppointment: calendarApiEnhanced.moveAppointment.bind(calendarApiEnhanced),
    refreshAppointments: calendarApiEnhanced.refreshAppointments.bind(calendarApiEnhanced),
    batchUpdateAppointments: calendarApiEnhanced.batchUpdateAppointments.bind(calendarApiEnhanced),
    bulkReschedule: calendarApiEnhanced.bulkReschedule.bind(calendarApiEnhanced),
    checkConflicts: calendarApiEnhanced.checkAppointmentConflicts.bind(calendarApiEnhanced),
    getAvailableSlots: calendarApiEnhanced.getAvailableSlots.bind(calendarApiEnhanced),
    clearCaches: calendarApiEnhanced.clearAllCaches.bind(calendarApiEnhanced),
    abortRequests: calendarApiEnhanced.abortAllRequests.bind(calendarApiEnhanced),
    getDebugStats: calendarApiEnhanced.getDebugStats.bind(calendarApiEnhanced)
  }
}