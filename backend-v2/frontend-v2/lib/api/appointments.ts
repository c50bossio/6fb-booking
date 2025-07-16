/**
 * Appointments API Client
 * 
 * Provides comprehensive appointment management functionality including:
 * - Appointment creation and scheduling
 * - Availability checking and time slot management
 * - Appointment updates, rescheduling, and cancellation
 * - Guest booking capabilities
 * - Enhanced appointment options with full service integration
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ===============================
// TypeScript Interfaces
// ===============================

export interface AppointmentCreate {
  date: string // YYYY-MM-DD format
  time: string // HH:MM format (e.g., "14:30")
  service: string
  notes?: string
  barber_id?: number
}

export interface QuickAppointmentCreate {
  service: string
  notes?: string
}

export interface EnhancedAppointmentCreate {
  service_id?: number
  service_name?: string
  barber_id?: number
  client_id?: number
  appointment_date: string // YYYY-MM-DD format
  appointment_time: string // HH:MM format
  duration_minutes?: number
  price?: number
  notes?: string
}

export interface AppointmentUpdate {
  date?: string
  time?: string
  service?: string
  notes?: string
  status?: string
}

export interface AppointmentReschedule {
  date: string
  time: string
}

export interface AppointmentValidationRequest {
  service_id?: number
  barber_id?: number
  appointment_date: string
  appointment_time: string
  duration_minutes: number
  client_id?: number
}

export interface GuestBookingCreate {
  // Guest information
  guest_name: string
  guest_email: string
  guest_phone: string
  
  // Appointment details
  service: string
  date: string
  time: string
  barber_id?: number
  notes?: string
  
  // Captcha verification
  captcha_token?: string
}

export interface GuestQuickBookingCreate {
  guest_name: string
  guest_email: string
  guest_phone: string
  service: string
  notes?: string
  captcha_token?: string
}

export interface Appointment {
  id: number
  user_id?: number
  barber_id?: number
  client_id?: number
  service_id?: number
  service_name: string
  start_time: string // ISO datetime
  duration_minutes: number
  price: number
  status: string
  notes?: string
  created_at: string
  updated_at: string
  cancellation_reason?: string
  is_recurring_instance?: boolean
  recurring_series_id?: number
}

export interface AppointmentResponse {
  appointment: Appointment
  message?: string
}

export interface AppointmentListResponse {
  appointments: Appointment[]
  total: number
}

export interface TimeSlot {
  time: string // HH:MM format
  available: boolean
  barber_id?: number
  barber_name?: string
  duration_minutes?: number
}

export interface SlotsResponse {
  date: string
  slots: TimeSlot[]
  business_hours: {
    open_time: string
    close_time: string
  }
  total_available: number
}

export interface NextAvailableSlot {
  date: string
  time: string
  barber_id?: number
  barber_name?: string
  service_duration: number
}

export interface AppointmentValidationResponse {
  is_valid: boolean
  violations: string[]
  appointment_allowed: boolean
}

export interface BookingSettings {
  advance_booking_days: number
  min_booking_notice_hours: number
  max_daily_bookings: number
  allow_weekend_bookings: boolean
  allow_holiday_bookings: boolean
  auto_confirm_bookings: boolean
  require_phone_verification: boolean
  send_confirmation_email: boolean
  send_reminder_notifications: boolean
  business_hours: Record<string, any>
}

export interface BookingSettingsResponse {
  settings: BookingSettings
}

export interface BookingSettingsUpdate {
  advance_booking_days?: number
  min_booking_notice_hours?: number
  max_daily_bookings?: number
  allow_weekend_bookings?: boolean
  allow_holiday_bookings?: boolean
  auto_confirm_bookings?: boolean
  require_phone_verification?: boolean
  send_confirmation_email?: boolean
  send_reminder_notifications?: boolean
}

export interface GuestBookingResponse {
  appointment: Appointment
  confirmation_code: string
  message: string
}

export interface CaptchaStatusResponse {
  required: boolean
  site_key?: string
}

export interface AppointmentFilters {
  skip?: number
  limit?: number
  status?: string
  start_date?: string
  end_date?: string
  barber_id?: number
  service_id?: number
}

// ===============================
// Utility Functions
// ===============================

import { getAccessToken } from '../tokenManager'

/**
 * Get authorization headers with current JWT token
 * UPDATED: Now uses Token Manager for consistent token handling
 */
function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken()
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

// ===============================
// Appointments API Client
// ===============================

export const appointmentsApi = {
  /**
   * Test appointments router connectivity
   */
  async testConnection(): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/appointments/debug-test`)
    return handleResponse(response)
  },

  /**
   * Get available time slots for a specific date
   */
  async getAvailableSlots(
    appointmentDate: string,
    barberId?: number,
    serviceId?: number,
    timezone?: string
  ): Promise<SlotsResponse> {
    const params = {
      appointment_date: appointmentDate,
      ...(barberId && { barber_id: barberId }),
      ...(serviceId && { service_id: serviceId }),
      ...(timezone && { timezone })
    }

    const response = await fetch(
      `${API_BASE_URL}/api/v1/appointments/slots${buildQueryString(params)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Get next available appointment slot
   */
  async getNextAvailableSlot(
    serviceId?: number,
    barberId?: number
  ): Promise<NextAvailableSlot> {
    const params = {
      ...(serviceId && { service_id: serviceId }),
      ...(barberId && { barber_id: barberId })
    }

    const response = await fetch(
      `${API_BASE_URL}/api/v1/appointments/slots/next-available${buildQueryString(params)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Create a new appointment
   */
  async createAppointment(appointmentData: AppointmentCreate): Promise<AppointmentResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/appointments/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(appointmentData)
    })

    return handleResponse(response)
  },

  /**
   * Create a quick appointment (next available slot)
   */
  async createQuickAppointment(appointmentData: QuickAppointmentCreate): Promise<AppointmentResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/appointments/quick`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(appointmentData)
    })

    return handleResponse(response)
  },

  /**
   * Create an enhanced appointment with full options
   */
  async createEnhancedAppointment(appointmentData: EnhancedAppointmentCreate): Promise<AppointmentResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/appointments/enhanced`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(appointmentData)
    })

    return handleResponse(response)
  },

  /**
   * Get user's appointments with optional filtering
   */
  async getUserAppointments(filters: AppointmentFilters = {}): Promise<AppointmentListResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/appointments/${buildQueryString(filters)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Get all appointments (admin/enterprise owner only)
   */
  async getAllAppointments(filters: AppointmentFilters = {}): Promise<AppointmentListResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/appointments/all/list${buildQueryString(filters)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Get specific appointment by ID
   */
  async getAppointment(appointmentId: number): Promise<AppointmentResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/appointments/${appointmentId}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Update appointment details
   */
  async updateAppointment(
    appointmentId: number, 
    updates: AppointmentUpdate
  ): Promise<AppointmentResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/appointments/${appointmentId}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      }
    )

    return handleResponse(response)
  },

  /**
   * Reschedule appointment to new date/time
   */
  async rescheduleAppointment(
    appointmentId: number,
    rescheduleData: AppointmentReschedule
  ): Promise<AppointmentResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/appointments/${appointmentId}/reschedule`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(rescheduleData)
      }
    )

    return handleResponse(response)
  },

  /**
   * Cancel appointment
   */
  async cancelAppointment(
    appointmentId: number,
    reason?: string
  ): Promise<{ message: string }> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/appointments/${appointmentId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason })
      }
    )

    return handleResponse(response)
  },

  /**
   * Cancel appointment (alternative endpoint)
   */
  async cancelAppointmentAlt(
    appointmentId: number,
    reason?: string
  ): Promise<AppointmentResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/appointments/${appointmentId}/cancel`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason })
      }
    )

    return handleResponse(response)
  },

  /**
   * Validate appointment before creation
   */
  async validateAppointment(
    validationRequest: AppointmentValidationRequest
  ): Promise<AppointmentValidationResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/appointments/validate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(validationRequest)
    })

    return handleResponse(response)
  },

  /**
   * Get booking settings
   */
  async getBookingSettings(): Promise<BookingSettingsResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/appointments/settings`, {
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  /**
   * Update booking settings
   */
  async updateBookingSettings(updates: BookingSettingsUpdate): Promise<BookingSettingsResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/appointments/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    })

    return handleResponse(response)
  },

  // ===============================
  // Guest Booking Methods
  // ===============================

  /**
   * Check if CAPTCHA is required for guest bookings
   */
  async getGuestCaptchaStatus(): Promise<CaptchaStatusResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/appointments/guest/captcha-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    return handleResponse(response)
  },

  /**
   * Create guest appointment (no account required)
   */
  async createGuestAppointment(guestBooking: GuestBookingCreate): Promise<GuestBookingResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/appointments/guest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(guestBooking)
    })

    return handleResponse(response)
  },

  /**
   * Create guest quick appointment (next available slot)
   */
  async createGuestQuickAppointment(guestBooking: GuestQuickBookingCreate): Promise<GuestBookingResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/appointments/guest/quick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(guestBooking)
    })

    return handleResponse(response)
  },

  // ===============================
  // Utility Methods
  // ===============================

  /**
   * Format date for API calls (YYYY-MM-DD)
   */
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  },

  /**
   * Format time for API calls (HH:MM)
   */
  formatTime(date: Date): string {
    return date.toTimeString().slice(0, 5)
  },

  /**
   * Parse appointment datetime
   */
  parseAppointmentTime(appointment: Appointment): Date {
    return new Date(appointment.start_time)
  },

  /**
   * Check if appointment is upcoming
   */
  isUpcoming(appointment: Appointment): boolean {
    return new Date(appointment.start_time) > new Date()
  },

  /**
   * Check if appointment can be cancelled
   */
  canCancel(appointment: Appointment, minHoursNotice: number = 24): boolean {
    const appointmentTime = new Date(appointment.start_time)
    const now = new Date()
    const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    return hoursUntilAppointment >= minHoursNotice && 
           appointment.status !== 'cancelled' && 
           appointment.status !== 'completed'
  },

  /**
   * Check if appointment can be rescheduled
   */
  canReschedule(appointment: Appointment, minHoursNotice: number = 24): boolean {
    return this.canCancel(appointment, minHoursNotice)
  },

  /**
   * Get appointment status display text
   */
  getStatusDisplay(status: string): string {
    const statusMap: Record<string, string> = {
      'confirmed': 'Confirmed',
      'pending': 'Pending',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'no_show': 'No Show',
      'rescheduled': 'Rescheduled'
    }
    
    return statusMap[status] || status
  }
}

export default appointmentsApi