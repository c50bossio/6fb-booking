/**
 * Recurring Bookings API service
 * Handles recurring appointment series creation and management
 */
import apiClient from './client'
import type { ApiResponse, PaginatedResponse } from './client'

// Enums matching backend
export enum RecurrencePattern {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom'
}

export enum SeriesStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

// Core interfaces
export interface RecurringBookingSeries {
  id: number
  series_token: string
  series_name?: string
  recurrence_pattern: RecurrencePattern
  preferred_time: string
  start_date: string
  end_date?: string
  max_appointments?: number
  status: SeriesStatus
  series_discount_percent: number
  total_appointments_created: number
  total_appointments_completed: number
  next_appointment_date?: string
  client_name: string
  barber_name: string
  service_name: string
  service_price: number
  discounted_price: number
  created_at: string
  updated_at?: string
}

export interface CreateSeriesRequest {
  client_first_name: string
  client_last_name: string
  client_email: string
  client_phone: string
  barber_id: number
  service_id: number
  location_id: number
  recurrence_pattern: RecurrencePattern
  preferred_time: string // HH:MM format
  start_date: string // YYYY-MM-DD format
  end_date?: string
  max_appointments?: number
  series_discount_percent?: number
  series_name?: string
  interval_weeks?: number // For custom patterns
  is_flexible_time?: boolean
  advance_booking_days?: number
  notes?: string
}

export interface SeriesAppointment {
  id: number
  appointment_date: string
  appointment_time: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  service_name: string
  service_revenue: number
  duration_minutes: number
  client_notes?: string
}

export interface SeriesSavings {
  appointments_in_period: number
  regular_price_per_appointment: number
  discounted_price_per_appointment: number
  regular_total: number
  discounted_total: number
  total_savings: number
  savings_per_appointment: number
}

export interface SeriesExclusion {
  exclusion_date: string
  reason: string
  reschedule_to_date?: string
}

export interface SeriesFilter {
  skip?: number
  limit?: number
  status?: SeriesStatus | SeriesStatus[]
  client_email?: string
  barber_id?: number
  service_id?: number
  recurrence_pattern?: RecurrencePattern
  start_date?: string
  end_date?: string
  search?: string
}

export interface RecurrenceOptionConfig {
  id: RecurrencePattern
  name: string
  description: string
  frequency: string
  defaultDiscount: number
  popular?: boolean
  intervalWeeks: number
  minInterval?: number
  maxInterval?: number
  customizable?: boolean
}

// Pre-defined recurrence options
export const RECURRENCE_OPTIONS: RecurrenceOptionConfig[] = [
  {
    id: RecurrencePattern.WEEKLY,
    name: 'Weekly',
    description: 'Premium maintenance for the sharpest look',
    frequency: 'Every week',
    defaultDiscount: 20,
    popular: true,
    intervalWeeks: 1
  },
  {
    id: RecurrencePattern.BIWEEKLY,
    name: 'Bi-Weekly',
    description: 'Stay fresh with regular grooming',
    frequency: 'Every 2 weeks',
    defaultDiscount: 15,
    popular: true,
    intervalWeeks: 2
  },
  {
    id: RecurrencePattern.MONTHLY,
    name: 'Monthly',
    description: 'Perfect for regular maintenance',
    frequency: 'Every 4 weeks',
    defaultDiscount: 12,
    popular: true,
    intervalWeeks: 4
  },
  {
    id: RecurrencePattern.CUSTOM,
    name: 'Custom Schedule',
    description: 'Set your own interval',
    frequency: 'Custom',
    defaultDiscount: 10,
    intervalWeeks: 4,
    minInterval: 1,
    maxInterval: 12,
    customizable: true
  }
]

export const recurringBookingsService = {
  /**
   * Create a new recurring appointment series
   */
  async createSeries(data: CreateSeriesRequest): Promise<ApiResponse<RecurringBookingSeries>> {
    const response = await apiClient.post<RecurringBookingSeries>('/recurring-bookings/series/create', data)
    return { data: response.data }
  },

  /**
   * Get series by token (public access)
   */
  async getSeriesByToken(token: string): Promise<ApiResponse<RecurringBookingSeries>> {
    const response = await apiClient.get<RecurringBookingSeries>(`/recurring-bookings/series/${token}`)
    return { data: response.data }
  },

  /**
   * Get all series with filtering (admin access)
   */
  async getAllSeries(filters?: SeriesFilter): Promise<PaginatedResponse<RecurringBookingSeries>> {
    const params = new URLSearchParams()
    if (filters?.skip) params.append('skip', filters.skip.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.client_email) params.append('client_email', filters.client_email)
    if (filters?.barber_id) params.append('barber_id', filters.barber_id.toString())
    if (filters?.service_id) params.append('service_id', filters.service_id.toString())
    if (filters?.recurrence_pattern) params.append('recurrence_pattern', filters.recurrence_pattern)
    if (filters?.start_date) params.append('start_date', filters.start_date)
    if (filters?.end_date) params.append('end_date', filters.end_date)
    if (filters?.search) params.append('search', filters.search)

    if (Array.isArray(filters?.status)) {
      filters.status.forEach(status => params.append('status', status))
    } else if (filters?.status) {
      params.append('status', filters.status)
    }

    const response = await apiClient.get<PaginatedResponse<RecurringBookingSeries>>(`/recurring-bookings/series?${params.toString()}`)
    return response.data
  },

  /**
   * Get appointments for a specific series
   */
  async getSeriesAppointments(
    token: string,
    includePast: boolean = false
  ): Promise<ApiResponse<SeriesAppointment[]>> {
    const params = new URLSearchParams()
    if (includePast) params.append('include_past', 'true')

    const response = await apiClient.get<SeriesAppointment[]>(
      `/recurring-bookings/series/${token}/appointments?${params.toString()}`
    )
    return { data: response.data }
  },

  /**
   * Pause a series
   */
  async pauseSeries(token: string, reason?: string): Promise<ApiResponse<{ message: string; status: SeriesStatus }>> {
    const params = new URLSearchParams()
    if (reason) params.append('reason', reason)

    const response = await apiClient.post<{ message: string; status: SeriesStatus }>(
      `/recurring-bookings/series/${token}/pause?${params.toString()}`
    )
    return { data: response.data }
  },

  /**
   * Resume a paused series
   */
  async resumeSeries(token: string, reason?: string): Promise<ApiResponse<{ message: string; status: SeriesStatus }>> {
    const params = new URLSearchParams()
    if (reason) params.append('reason', reason)

    const response = await apiClient.post<{ message: string; status: SeriesStatus }>(
      `/recurring-bookings/series/${token}/resume?${params.toString()}`
    )
    return { data: response.data }
  },

  /**
   * Cancel a series
   */
  async cancelSeries(token: string, reason?: string): Promise<ApiResponse<{ message: string; status: SeriesStatus }>> {
    const params = new URLSearchParams()
    if (reason) params.append('reason', reason)

    const response = await apiClient.post<{ message: string; status: SeriesStatus }>(
      `/recurring-bookings/series/${token}/cancel?${params.toString()}`
    )
    return { data: response.data }
  },

  /**
   * Add exclusion date to series
   */
  async addSeriesExclusion(
    token: string,
    exclusionData: SeriesExclusion
  ): Promise<ApiResponse<{ message: string; exclusion_date: string; reason: string }>> {
    const response = await apiClient.post<{ message: string; exclusion_date: string; reason: string }>(
      `/recurring-bookings/series/${token}/exclusions`,
      exclusionData
    )
    return { data: response.data }
  },

  /**
   * Calculate savings for a potential series
   */
  async calculateSavings(
    serviceId: number,
    recurrencePattern: RecurrencePattern,
    discountPercent: number,
    durationMonths: number = 12
  ): Promise<ApiResponse<SeriesSavings>> {
    const params = new URLSearchParams({
      service_id: serviceId.toString(),
      recurrence_pattern: recurrencePattern,
      discount_percent: discountPercent.toString(),
      duration_months: durationMonths.toString()
    })

    const response = await apiClient.get<SeriesSavings>(
      `/recurring-bookings/series/calculate-savings?${params.toString()}`
    )
    return { data: response.data }
  },

  /**
   * Generate upcoming appointments for a series
   */
  async generateUpcomingAppointments(
    token: string,
    lookaheadDays: number = 60
  ): Promise<ApiResponse<{ message: string; appointments_created: number; next_appointment_date?: string }>> {
    const params = new URLSearchParams({
      lookahead_days: lookaheadDays.toString()
    })

    const response = await apiClient.post<{ message: string; appointments_created: number; next_appointment_date?: string }>(
      `/recurring-bookings/series/${token}/generate-appointments?${params.toString()}`
    )
    return { data: response.data }
  },

  /**
   * Utility functions
   */
  getRecurrenceOption(pattern: RecurrencePattern): RecurrenceOptionConfig | undefined {
    return RECURRENCE_OPTIONS.find(option => option.id === pattern)
  },

  getRecurrenceOptions(): RecurrenceOptionConfig[] {
    return RECURRENCE_OPTIONS
  },

  calculateEstimatedSavings(
    basePrice: number,
    pattern: RecurrencePattern,
    discountPercent: number,
    months: number = 12
  ): SeriesSavings {
    const option = this.getRecurrenceOption(pattern)
    const appointmentsPerYear = 52 / (option?.intervalWeeks || 4)
    const appointmentsInPeriod = (appointmentsPerYear * months) / 12

    const regularPricePerAppointment = basePrice
    const discountedPricePerAppointment = basePrice * (1 - discountPercent / 100)
    const regularTotal = regularPricePerAppointment * appointmentsInPeriod
    const discountedTotal = discountedPricePerAppointment * appointmentsInPeriod

    return {
      appointments_in_period: appointmentsInPeriod,
      regular_price_per_appointment: regularPricePerAppointment,
      discounted_price_per_appointment: discountedPricePerAppointment,
      regular_total: regularTotal,
      discounted_total: discountedTotal,
      total_savings: regularTotal - discountedTotal,
      savings_per_appointment: regularPricePerAppointment - discountedPricePerAppointment
    }
  },

  formatRecurrenceFrequency(pattern: RecurrencePattern, intervalWeeks?: number): string {
    switch (pattern) {
      case RecurrencePattern.DAILY:
        return 'Every day'
      case RecurrencePattern.WEEKLY:
        return 'Every week'
      case RecurrencePattern.BIWEEKLY:
        return 'Every 2 weeks'
      case RecurrencePattern.MONTHLY:
        return 'Every 4 weeks'
      case RecurrencePattern.CUSTOM:
        return intervalWeeks ? `Every ${intervalWeeks} week${intervalWeeks > 1 ? 's' : ''}` : 'Custom schedule'
      default:
        return 'Unknown pattern'
    }
  },

  getNextAppointmentDate(
    lastDate: string,
    pattern: RecurrencePattern,
    intervalWeeks: number = 4
  ): Date {
    const lastAppointment = new Date(lastDate)
    const option = this.getRecurrenceOption(pattern)
    const weeksToAdd = pattern === RecurrencePattern.CUSTOM ? intervalWeeks : (option?.intervalWeeks || 4)

    return new Date(lastAppointment.getTime() + (weeksToAdd * 7 * 24 * 60 * 60 * 1000))
  },

  validateSeriesData(data: Partial<CreateSeriesRequest>): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.client_first_name?.trim()) errors.push('First name is required')
    if (!data.client_last_name?.trim()) errors.push('Last name is required')
    if (!data.client_email?.trim()) errors.push('Email is required')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.client_email)) errors.push('Invalid email format')
    if (!data.client_phone?.trim()) errors.push('Phone number is required')
    if (!data.barber_id) errors.push('Barber selection is required')
    if (!data.service_id) errors.push('Service selection is required')
    if (!data.location_id) errors.push('Location is required')
    if (!data.recurrence_pattern) errors.push('Recurrence pattern is required')
    if (!data.preferred_time?.trim()) errors.push('Preferred time is required')
    else if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.preferred_time)) errors.push('Invalid time format')
    if (!data.start_date?.trim()) errors.push('Start date is required')
    else if (new Date(data.start_date) <= new Date()) errors.push('Start date must be in the future')

    if (data.end_date && new Date(data.end_date) <= new Date(data.start_date || '')) {
      errors.push('End date must be after start date')
    }

    if (data.series_discount_percent !== undefined) {
      if (data.series_discount_percent < 0 || data.series_discount_percent > 50) {
        errors.push('Discount must be between 0% and 50%')
      }
    }

    if (data.max_appointments !== undefined) {
      if (data.max_appointments < 1 || data.max_appointments > 100) {
        errors.push('Max appointments must be between 1 and 100')
      }
    }

    return { valid: errors.length === 0, errors }
  }
}
