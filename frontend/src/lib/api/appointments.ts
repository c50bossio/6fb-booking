/**
 * Enhanced Appointments API service with calendar integration
 */
import apiClient from './client'
import type { Appointment, ApiResponse, PaginatedResponse } from './client'

// Enhanced interfaces for calendar integration
export interface AppointmentCreate {
  barber_id: number
  service_id: number
  client_id?: number
  client_name: string
  client_email?: string
  client_phone?: string
  appointment_date: string // ISO date format
  appointment_time: string // HH:MM format
  duration_minutes?: number
  notes?: string
  source?: 'website' | 'phone' | 'walk_in' | 'staff' | 'app'
  send_confirmation?: boolean
  timezone?: string
}

export interface AppointmentUpdate {
  appointment_date?: string
  appointment_time?: string
  duration_minutes?: number
  barber_id?: number
  service_id?: number
  client_name?: string
  client_email?: string
  client_phone?: string
  status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  service_revenue?: number
  tip_amount?: number
  product_revenue?: number
  payment_status?: 'paid' | 'pending' | 'failed' | 'refunded'
  notes?: string
}

export interface AppointmentFilter {
  skip?: number
  limit?: number
  barber_id?: number
  location_id?: number
  client_id?: number
  status?: string | string[]
  start_date?: string
  end_date?: string
  service_id?: number
  payment_status?: string
  source?: string
  search?: string // Client name/email search
}

export interface BarberAvailability {
  barber_id: number
  barber_name: string
  date: string
  timezone: string
  slots: Array<{
    time: string
    end_time: string
    available: boolean
    reason?: string
    conflicting_appointment_id?: number
  }>
  total_slots: number
  available_slots: number
  working_hours: {
    start: string
    end: string
    break_start?: string
    break_end?: string
  }
}

export interface AppointmentStats {
  total_appointments: number
  confirmed_appointments: number
  completed_appointments: number
  cancelled_appointments: number
  no_shows: number
  total_revenue: number
  average_service_time: number
  most_popular_service: string
  busiest_day: string
  utilization_rate: number
}

export interface AppointmentConflict {
  has_conflicts: boolean
  conflicts: Array<{
    type: 'overlap' | 'unavailable' | 'closed' | 'booking_rule'
    message: string
    appointment_id?: number
    severity: 'error' | 'warning' | 'info'
  }>
  alternative_slots?: Array<{
    date: string
    time: string
    barber_id?: number
  }>
}

export interface RescheduleSuggestion {
  original_appointment_id: number
  suggested_slots: Array<{
    date: string
    time: string
    barber_id: number
    barber_name: string
    score: number // 0-100, how good the match is
    reasons: string[]
  }>
}

export interface AppointmentReminder {
  id: number
  appointment_id: number
  type: 'sms' | 'email' | 'push'
  scheduled_for: string
  sent_at?: string
  status: 'pending' | 'sent' | 'failed'
  content: string
}

export const appointmentsService = {
  /**
   * Get list of appointments with enhanced filtering
   */
  async getAppointments(filters?: AppointmentFilter): Promise<PaginatedResponse<Appointment>> {
    const params = new URLSearchParams()
    if (filters?.skip) params.append('skip', filters.skip.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.barber_id) params.append('barber_id', filters.barber_id.toString())
    if (filters?.location_id) params.append('location_id', filters.location_id.toString())
    if (filters?.client_id) params.append('client_id', filters.client_id.toString())
    if (filters?.service_id) params.append('service_id', filters.service_id.toString())
    if (filters?.payment_status) params.append('payment_status', filters.payment_status)
    if (filters?.source) params.append('source', filters.source)
    if (filters?.search) params.append('search', filters.search)
    if (filters?.start_date) params.append('start_date', filters.start_date)
    if (filters?.end_date) params.append('end_date', filters.end_date)
    
    if (Array.isArray(filters?.status)) {
      filters.status.forEach(status => params.append('status', status))
    } else if (filters?.status) {
      params.append('status', filters.status)
    }

    const response = await apiClient.get<PaginatedResponse<Appointment>>(`/appointments?${params.toString()}`)
    return response.data
  },

  /**
   * Get appointments for a specific date range
   */
  async getAppointmentsByDateRange(
    startDate: string,
    endDate: string,
    filters?: Omit<AppointmentFilter, 'start_date' | 'end_date'>
  ): Promise<Appointment[]> {
    const response = await this.getAppointments({
      ...filters,
      start_date: startDate,
      end_date: endDate,
      limit: 1000 // Get all appointments in range
    })
    return response.data
  },

  /**
   * Get specific appointment with detailed information
   */
  async getAppointment(appointmentId: number): Promise<ApiResponse<Appointment>> {
    const response = await apiClient.get<Appointment>(`/appointments/${appointmentId}`)
    return { data: response.data }
  },

  /**
   * Create new appointment with conflict checking
   */
  async createAppointment(data: AppointmentCreate): Promise<ApiResponse<Appointment>> {
    const response = await apiClient.post<Appointment>('/appointments', {
      ...data,
      timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    })
    return { data: response.data }
  },

  /**
   * Update appointment with validation
   */
  async updateAppointment(appointmentId: number, data: AppointmentUpdate): Promise<ApiResponse<Appointment>> {
    const response = await apiClient.patch<Appointment>(`/appointments/${appointmentId}`, data)
    return { data: response.data }
  },

  /**
   * Cancel appointment with reason
   */
  async cancelAppointment(appointmentId: number, reason?: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/appointments/${appointmentId}`, {
      data: { reason }
    })
    return { data: response.data }
  },

  /**
   * Reschedule appointment to new date/time
   */
  async rescheduleAppointment(
    appointmentId: number,
    newDate: string,
    newTime: string,
    reason?: string
  ): Promise<ApiResponse<Appointment>> {
    const response = await apiClient.post<Appointment>(`/appointments/${appointmentId}/reschedule`, {
      appointment_date: newDate,
      appointment_time: newTime,
      reason
    })
    return { data: response.data }
  },

  /**
   * Get barber availability with enhanced details
   */
  async getBarberAvailability(
    barberId: number,
    date: string,
    serviceId?: number,
    duration?: number
  ): Promise<ApiResponse<BarberAvailability>> {
    const params = new URLSearchParams({ date })
    if (serviceId) params.append('service_id', serviceId.toString())
    if (duration) params.append('duration', duration.toString())

    const response = await apiClient.get<BarberAvailability>(
      `/appointments/availability/${barberId}?${params.toString()}`
    )
    return { data: response.data }
  },

  /**
   * Get availability for multiple barbers
   */
  async getMultiBarberAvailability(
    barberIds: number[],
    startDate: string,
    endDate: string,
    serviceId?: number
  ): Promise<ApiResponse<BarberAvailability[]>> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      barber_ids: barberIds.join(',')
    })
    if (serviceId) params.append('service_id', serviceId.toString())

    const response = await apiClient.get<BarberAvailability[]>(`/appointments/availability?${params.toString()}`)
    return { data: response.data }
  },

  /**
   * Check for appointment conflicts
   */
  async checkConflicts(data: AppointmentCreate): Promise<ApiResponse<AppointmentConflict>> {
    const response = await apiClient.post<AppointmentConflict>('/appointments/check-conflicts', data)
    return { data: response.data }
  },

  /**
   * Get rescheduling suggestions
   */
  async getRescheduleSuggestions(
    appointmentId: number,
    preferredDates?: string[],
    maxDaysOut?: number
  ): Promise<ApiResponse<RescheduleSuggestion>> {
    const params = new URLSearchParams()
    if (preferredDates?.length) {
      preferredDates.forEach(date => params.append('preferred_dates', date))
    }
    if (maxDaysOut) params.append('max_days_out', maxDaysOut.toString())

    const response = await apiClient.get<RescheduleSuggestion>(
      `/appointments/${appointmentId}/reschedule-suggestions?${params.toString()}`
    )
    return { data: response.data }
  },

  /**
   * Get appointment statistics
   */
  async getStats(
    startDate: string,
    endDate: string,
    filters?: Pick<AppointmentFilter, 'barber_id' | 'location_id' | 'service_id'>
  ): Promise<ApiResponse<AppointmentStats>> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate
    })
    if (filters?.barber_id) params.append('barber_id', filters.barber_id.toString())
    if (filters?.location_id) params.append('location_id', filters.location_id.toString())
    if (filters?.service_id) params.append('service_id', filters.service_id.toString())

    const response = await apiClient.get<AppointmentStats>(`/appointments/stats?${params.toString()}`)
    return { data: response.data }
  },

  /**
   * Bulk operations on appointments
   */
  async bulkUpdate(
    appointmentIds: number[],
    updates: Partial<AppointmentUpdate>
  ): Promise<ApiResponse<Appointment[]>> {
    const response = await apiClient.post<Appointment[]>('/appointments/bulk-update', {
      appointment_ids: appointmentIds,
      updates
    })
    return { data: response.data }
  },

  async bulkCancel(
    appointmentIds: number[],
    reason?: string
  ): Promise<ApiResponse<void>> {
    const response = await apiClient.post('/appointments/bulk-cancel', {
      appointment_ids: appointmentIds,
      reason
    })
    return { data: response.data }
  },

  /**
   * Quick status update helpers
   */
  async confirmAppointment(appointmentId: number): Promise<ApiResponse<Appointment>> {
    return this.updateAppointment(appointmentId, { status: 'confirmed' })
  },

  async completeAppointment(
    appointmentId: number,
    data: {
      service_revenue?: number
      tip_amount?: number
      product_revenue?: number
    }
  ): Promise<ApiResponse<Appointment>> {
    return this.updateAppointment(appointmentId, {
      status: 'completed',
      payment_status: 'paid',
      ...data
    })
  },

  async markNoShow(appointmentId: number): Promise<ApiResponse<Appointment>> {
    return this.updateAppointment(appointmentId, { status: 'no_show' })
  },

  async checkInClient(appointmentId: number): Promise<ApiResponse<Appointment>> {
    const response = await apiClient.post<Appointment>(`/appointments/${appointmentId}/check-in`)
    return { data: response.data }
  },

  /**
   * Reminder management
   */
  async getReminders(appointmentId: number): Promise<ApiResponse<AppointmentReminder[]>> {
    const response = await apiClient.get<AppointmentReminder[]>(`/appointments/${appointmentId}/reminders`)
    return { data: response.data }
  },

  async sendReminder(
    appointmentId: number,
    type: 'sms' | 'email' | 'push',
    customMessage?: string
  ): Promise<ApiResponse<AppointmentReminder>> {
    const response = await apiClient.post<AppointmentReminder>(`/appointments/${appointmentId}/send-reminder`, {
      type,
      custom_message: customMessage
    })
    return { data: response.data }
  },

  async scheduleReminder(
    appointmentId: number,
    type: 'sms' | 'email' | 'push',
    scheduledFor: string,
    customMessage?: string
  ): Promise<ApiResponse<AppointmentReminder>> {
    const response = await apiClient.post<AppointmentReminder>(`/appointments/${appointmentId}/schedule-reminder`, {
      type,
      scheduled_for: scheduledFor,
      custom_message: customMessage
    })
    return { data: response.data }
  },

  /**
   * Search and filtering helpers
   */
  async searchAppointments(
    query: string,
    filters?: Omit<AppointmentFilter, 'search'>
  ): Promise<PaginatedResponse<Appointment>> {
    return this.getAppointments({
      ...filters,
      search: query
    })
  },

  async getUpcomingAppointments(
    days: number = 7,
    filters?: Omit<AppointmentFilter, 'start_date' | 'end_date'>
  ): Promise<Appointment[]> {
    const today = new Date()
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)
    
    const response = await this.getAppointmentsByDateRange(
      today.toISOString().split('T')[0],
      futureDate.toISOString().split('T')[0],
      {
        ...filters,
        status: ['scheduled', 'confirmed']
      }
    )
    
    return response
  },

  async getTodaysAppointments(
    filters?: Omit<AppointmentFilter, 'start_date' | 'end_date'>
  ): Promise<Appointment[]> {
    const today = new Date().toISOString().split('T')[0]
    return this.getAppointmentsByDateRange(today, today, filters)
  },

  /**
   * Utility methods
   */
  formatAppointmentTime(appointment: Appointment): string {
    const date = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
    return date.toLocaleString()
  },

  calculateDuration(appointment: Appointment): number {
    return appointment.service_duration || 60
  },

  getAppointmentEndTime(appointment: Appointment): Date {
    const start = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
    const duration = this.calculateDuration(appointment)
    return new Date(start.getTime() + duration * 60000)
  },

  isAppointmentUpcoming(appointment: Appointment): boolean {
    const appointmentTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
    return appointmentTime > new Date()
  },

  getAppointmentStatus(appointment: Appointment): {
    color: string
    label: string
    icon: string
  } {
    switch (appointment.status) {
      case 'scheduled':
        return { color: 'blue', label: 'Scheduled', icon: 'calendar' }
      case 'confirmed':
        return { color: 'green', label: 'Confirmed', icon: 'check' }
      case 'completed':
        return { color: 'gray', label: 'Completed', icon: 'check-circle' }
      case 'cancelled':
        return { color: 'red', label: 'Cancelled', icon: 'x-circle' }
      case 'no_show':
        return { color: 'orange', label: 'No Show', icon: 'alert-circle' }
      default:
        return { color: 'gray', label: 'Unknown', icon: 'help-circle' }
    }
  }
}