/**
 * Calendar-Booking System Integration Layer
 *
 * This service bridges the calendar component with the existing booking system,
 * providing seamless integration between:
 * - Public booking API (availability, service selection)
 * - Authenticated appointments API (CRUD operations)
 * - Real-time conflict detection
 * - Automatic availability updates
 */

import { appointmentsService } from './appointments'
import { bookingService } from './bookings'
import { barbersService } from './barbers'
import { servicesService } from './services'
import type { ApiResponse } from './client'
import type {
  Appointment,
  AppointmentCreate,
  AppointmentUpdate,
  AppointmentFilter
} from './appointments'
import type {
  BookingRequest,
  AvailabilityRequest,
  BarberAvailability,
  Service
} from './bookings'

// Enhanced calendar appointment interface
export interface CalendarAppointment {
  id: string
  title: string
  client: string
  clientId?: number
  barber: string
  barberId: number
  startTime: string
  endTime: string
  service: string
  serviceId?: number
  price: number
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  date: string
  clientEmail?: string
  clientPhone?: string
  notes?: string
  confirmationNumber?: string
  serviceRevenue?: number
  tipAmount?: number
  productRevenue?: number
  canReschedule?: boolean
  canCancel?: boolean
  canComplete?: boolean
  paymentStatus?: 'paid' | 'pending' | 'failed' | 'refunded'
  bookingSource?: string
  backgroundColor?: string
  borderColor?: string
  textColor?: string
}

// Availability slot with enhanced information
export interface AvailabilitySlot {
  time: string
  available: boolean
  barberId: number
  barberName: string
  conflictReason?: string
  suggestedAlternatives?: Array<{
    time: string
    barberId: number
    barberName: string
  }>
  canForceBook?: boolean
  advanceBookingRequired?: number // hours
}

// Calendar view configuration
export interface CalendarViewConfig {
  startDate: string
  endDate: string
  barberIds?: number[]
  locationId?: number
  showOnlyAvailable?: boolean
  includeBlockedTimes?: boolean
  timezone?: string
}

// Conflict resolution options
export interface ConflictResolution {
  type: 'reschedule' | 'force_book' | 'suggest_alternative'
  suggestedSlots?: AvailabilitySlot[]
  requiresConfirmation?: boolean
  message?: string
}

export class CalendarBookingIntegration {
  /**
   * Get calendar appointments with enhanced booking system integration
   */
  async getCalendarAppointments(config: CalendarViewConfig): Promise<CalendarAppointment[]> {
    try {
      // Use existing appointments API with calendar formatting
      const filters: AppointmentFilter = {
        start_date: config.startDate,
        end_date: config.endDate,
        limit: 1000 // Get all appointments in range
      }

      if (config.barberIds?.length) {
        // For multiple barbers, we'll need to make separate calls or modify the API
        // For now, we'll use the first barber or remove the filter for all barbers
        if (config.barberIds.length === 1) {
          filters.barber_id = config.barberIds[0]
        }
      }

      if (config.locationId) {
        filters.location_id = config.locationId
      }

      const appointments = await appointmentsService.getAppointmentsByDateRange(
        config.startDate,
        config.endDate,
        filters
      )

      // Transform to calendar format with booking system enhancements
      return appointments.map(apt => this.transformToCalendarAppointment(apt))
    } catch (error) {
      console.error('Error fetching calendar appointments:', error)
      throw new Error('Failed to load calendar appointments')
    }
  }

  /**
   * Get real-time availability for calendar time slots
   */
  async getAvailabilityForDate(
    date: string,
    barberIds: number[],
    serviceId?: number,
    duration: number = 60
  ): Promise<AvailabilitySlot[]> {
    try {
      const slots: AvailabilitySlot[] = []

      // Get availability for each barber using the booking system
      for (const barberId of barberIds) {
        try {
          const barber = await barbersService.getBarber(barberId)
          const availabilityRequest: AvailabilityRequest & { barber_id: number } = {
            date,
            service_id: serviceId || 1, // Default service ID
            duration,
            barber_id: barberId
          }

          const availability = await bookingService.getAvailability(availabilityRequest)

          // Transform booking availability to calendar slots
          if (availability.data && availability.data.length > 0) {
            const barberAvailability = availability.data[0]
            for (const timeSlot of barberAvailability.time_slots) {
              slots.push({
                time: timeSlot.time,
                available: timeSlot.available,
                barberId,
                barberName: barber.data.first_name + ' ' + barber.data.last_name,
                conflictReason: !timeSlot.available ? 'Already booked' : undefined
              })
            }
          }
        } catch (error) {
          console.warn(`Failed to get availability for barber ${barberId}:`, error)
          // Continue with other barbers
        }
      }

      return slots
    } catch (error) {
      console.error('Error getting availability:', error)
      throw new Error('Failed to check availability')
    }
  }

  /**
   * Create appointment through calendar with full booking system validation
   */
  async createCalendarAppointment(appointmentData: {
    barberId: number
    serviceId: number
    date: string
    time: string
    clientInfo: {
      name: string
      email?: string
      phone?: string
    }
    notes?: string
    duration?: number
    timezone?: string
  }): Promise<CalendarAppointment> {
    try {
      // First, check for conflicts using booking system
      const conflicts = await this.checkBookingConflicts({
        barberId: appointmentData.barberId,
        serviceId: appointmentData.serviceId,
        date: appointmentData.date,
        time: appointmentData.time,
        duration: appointmentData.duration || 60
      })

      if (conflicts.has_conflicts) {
        throw new Error(`Booking conflict: ${conflicts.conflicts.map(c => c.message).join(', ')}`)
      }

      // Get service details for pricing
      const service = await servicesService.getService(appointmentData.serviceId)

      // Create appointment using the appointments API
      const createData: AppointmentCreate = {
        barber_id: appointmentData.barberId,
        client_name: appointmentData.clientInfo.name,
        client_email: appointmentData.clientInfo.email,
        client_phone: appointmentData.clientInfo.phone,
        appointment_date: appointmentData.date,
        appointment_time: appointmentData.time,
        service_id: appointmentData.serviceId,
        service_name: service.data.name,
        service_duration: appointmentData.duration || service.data.duration || 60,
        service_price: service.data.price,
        notes: appointmentData.notes,
        timezone: appointmentData.timezone || 'America/New_York',
        send_confirmation: true
      }

      const response = await appointmentsService.createAppointment(createData)
      return this.transformToCalendarAppointment(response.data)
    } catch (error) {
      console.error('Error creating calendar appointment:', error)
      throw error
    }
  }

  /**
   * Update appointment with conflict detection
   */
  async updateCalendarAppointment(
    appointmentId: string,
    updates: Partial<CalendarAppointment>
  ): Promise<CalendarAppointment> {
    try {
      // If date/time is being changed, check for conflicts
      if (updates.date || updates.startTime) {
        const currentAppointment = await appointmentsService.getAppointment(parseInt(appointmentId))

        const conflictCheckData = {
          barberId: updates.barberId || currentAppointment.data.barber_id,
          serviceId: updates.serviceId || currentAppointment.data.service_id || 1,
          date: updates.date || currentAppointment.data.appointment_date.toString(),
          time: updates.startTime || currentAppointment.data.appointment_time?.toString() || '09:00',
          duration: this.calculateDurationFromEndTime(updates.startTime || '09:00', updates.endTime || '10:00')
        }

        const conflicts = await this.checkBookingConflicts(conflictCheckData)
        if (conflicts.has_conflicts) {
          // Try to suggest alternatives
          const suggestions = await this.getSuggestedAlternatives(conflictCheckData)
          const error = new Error(`Schedule conflict detected: ${conflicts.conflicts.map(c => c.message).join(', ')}`)
          ;(error as any).suggestions = suggestions
          throw error
        }
      }

      // Transform calendar updates to appointment updates
      const updateData: AppointmentUpdate = {
        appointment_date: updates.date ? new Date(updates.date).toISOString().split('T')[0] as any : undefined,
        appointment_time: updates.startTime ? updates.startTime as any : undefined,
        status: updates.status as any,
        service_name: updates.service,
        service_revenue: updates.serviceRevenue,
        tip_amount: updates.tipAmount,
        product_revenue: updates.productRevenue,
        notes: updates.notes,
        barber_id: updates.barberId
      }

      const response = await appointmentsService.updateAppointment(parseInt(appointmentId), updateData)
      return this.transformToCalendarAppointment(response.data)
    } catch (error) {
      console.error('Error updating calendar appointment:', error)
      throw error
    }
  }

  /**
   * Cancel appointment through calendar
   */
  async cancelCalendarAppointment(appointmentId: string, reason?: string): Promise<void> {
    try {
      await appointmentsService.cancelAppointment(parseInt(appointmentId), reason)
    } catch (error) {
      console.error('Error cancelling calendar appointment:', error)
      throw new Error('Failed to cancel appointment')
    }
  }

  /**
   * Reschedule appointment with automatic conflict resolution
   */
  async rescheduleAppointment(
    appointmentId: string,
    newDate: string,
    newTime: string,
    reason?: string
  ): Promise<CalendarAppointment> {
    try {
      // Check if new slot is available
      const currentAppointment = await appointmentsService.getAppointment(parseInt(appointmentId))

      const conflicts = await this.checkBookingConflicts({
        barberId: currentAppointment.data.barber_id,
        serviceId: currentAppointment.data.service_id || 1,
        date: newDate,
        time: newTime,
        duration: currentAppointment.data.service_duration || 60
      })

      if (conflicts.has_conflicts) {
        const suggestions = await this.getSuggestedAlternatives({
          barberId: currentAppointment.data.barber_id,
          serviceId: currentAppointment.data.service_id || 1,
          date: newDate,
          time: newTime,
          duration: currentAppointment.data.service_duration || 60
        })

        const error = new Error(`Cannot reschedule to selected time: ${conflicts.conflicts.map(c => c.message).join(', ')}`)
        ;(error as any).suggestions = suggestions
        throw error
      }

      const response = await appointmentsService.rescheduleAppointment(
        parseInt(appointmentId),
        newDate,
        newTime,
        reason
      )

      return this.transformToCalendarAppointment(response.data)
    } catch (error) {
      console.error('Error rescheduling appointment:', error)
      throw error
    }
  }

  /**
   * Check for booking conflicts using the enhanced appointments API
   */
  private async checkBookingConflicts(data: {
    barberId: number
    serviceId: number
    date: string
    time: string
    duration: number
  }) {
    try {
      // Use the corsAwareFetch helper to properly construct URLs
      const { corsAwareFetch } = await import('./corsHelper')
      const response = await corsAwareFetch('/appointments/check-conflicts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          barberId: data.barberId,
          serviceId: data.serviceId,
          date: data.date,
          time: data.time,
          duration: data.duration
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.warn('Conflict checking failed:', error)
      return { has_conflicts: false, conflicts: [], suggested_alternatives: [] }
    }
  }

  /**
   * Get authentication token from local storage or session
   */
  private getAuthToken(): string | null {
    // This should be implemented based on your auth system
    // For now, return null and handle unauthenticated requests
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
    }
    return null
  }

  /**
   * Get suggested alternative time slots
   */
  private async getSuggestedAlternatives(data: {
    barberId: number
    serviceId: number
    date: string
    time: string
    duration: number
  }): Promise<AvailabilitySlot[]> {
    try {
      // Check conflicts which will return suggested alternatives
      const conflictResponse = await this.checkBookingConflicts(data)

      if (conflictResponse.suggested_alternatives?.length > 0) {
        // Transform the suggested alternatives to AvailabilitySlot format
        return conflictResponse.suggested_alternatives.map((alt: any) => ({
          time: alt.time,
          available: true,
          barberId: alt.barber_id,
          barberName: `Barber ${alt.barber_id}`, // You might want to fetch actual names
          suggestedAlternatives: []
        }))
      }

      // Fallback: Get availability for the same day and next few days
      const suggestions: AvailabilitySlot[] = []
      const startDate = new Date(data.date)

      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(startDate)
        checkDate.setDate(startDate.getDate() + i)
        const dateStr = checkDate.toISOString().split('T')[0]

        const availability = await this.getAvailabilityForDate(
          dateStr,
          [data.barberId],
          data.serviceId,
          data.duration
        )

        // Add available slots as suggestions
        suggestions.push(...availability.filter(slot => slot.available))

        // Limit to 10 suggestions
        if (suggestions.length >= 10) break
      }

      return suggestions.slice(0, 10)
    } catch (error) {
      console.warn('Failed to get alternative suggestions:', error)
      return []
    }
  }

  /**
   * Transform appointment data to calendar format
   */
  private transformToCalendarAppointment(appointment: Appointment): CalendarAppointment {
    // Calculate end time
    const startTime = appointment.appointment_time?.toString() || '09:00'
    const duration = appointment.service_duration || 60
    const endTime = this.calculateEndTime(startTime, duration)

    // Determine appointment colors based on status
    const statusColors = this.getStatusColors(appointment.status)

    return {
      id: appointment.id.toString(),
      title: `${appointment.client_name} - ${appointment.service_name}`,
      client: appointment.client_name,
      clientId: appointment.client_id,
      barber: appointment.barber_name || 'Unknown',
      barberId: appointment.barber_id,
      startTime,
      endTime,
      service: appointment.service_name,
      serviceId: appointment.service_id,
      price: appointment.service_price || 0,
      status: this.mapAppointmentStatus(appointment.status),
      date: appointment.appointment_date.toString(),
      clientEmail: appointment.client_email,
      clientPhone: appointment.client_phone,
      notes: appointment.notes,
      confirmationNumber: `BK${appointment.id.toString().padStart(6, '0')}`,
      serviceRevenue: appointment.service_revenue,
      tipAmount: appointment.tip_amount,
      productRevenue: appointment.product_revenue,
      canReschedule: ['scheduled', 'confirmed'].includes(appointment.status),
      canCancel: ['scheduled', 'confirmed'].includes(appointment.status),
      canComplete: ['confirmed', 'in_progress'].includes(appointment.status),
      paymentStatus: appointment.payment_status as any,
      bookingSource: appointment.source,
      backgroundColor: statusColors.backgroundColor,
      borderColor: statusColors.borderColor,
      textColor: statusColors.textColor
    }
  }

  /**
   * Calculate end time from start time and duration
   */
  private calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`
  }

  /**
   * Calculate duration from start and end times
   */
  private calculateDurationFromEndTime(startTime: string, endTime: string): number {
    const [startHours, startMinutes] = startTime.split(':').map(Number)
    const [endHours, endMinutes] = endTime.split(':').map(Number)

    const startDate = new Date()
    startDate.setHours(startHours, startMinutes, 0, 0)

    const endDate = new Date()
    endDate.setHours(endHours, endMinutes, 0, 0)

    return Math.round((endDate.getTime() - startDate.getTime()) / 60000)
  }

  /**
   * Map appointment status to calendar status
   */
  private mapAppointmentStatus(status: string): CalendarAppointment['status'] {
    const statusMap: Record<string, CalendarAppointment['status']> = {
      'scheduled': 'scheduled',
      'confirmed': 'confirmed',
      'in_progress': 'in_progress',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'no_show': 'no_show'
    }
    return statusMap[status] || 'scheduled'
  }

  /**
   * Get colors for appointment status
   */
  private getStatusColors(status: string): {
    backgroundColor: string
    borderColor: string
    textColor: string
  } {
    const colorMap: Record<string, { backgroundColor: string; borderColor: string; textColor: string }> = {
      'scheduled': {
        backgroundColor: '#3B82F6',
        borderColor: '#2563EB',
        textColor: '#FFFFFF'
      },
      'confirmed': {
        backgroundColor: '#10B981',
        borderColor: '#059669',
        textColor: '#FFFFFF'
      },
      'in_progress': {
        backgroundColor: '#F59E0B',
        borderColor: '#D97706',
        textColor: '#FFFFFF'
      },
      'completed': {
        backgroundColor: '#6B7280',
        borderColor: '#4B5563',
        textColor: '#FFFFFF'
      },
      'cancelled': {
        backgroundColor: '#EF4444',
        borderColor: '#DC2626',
        textColor: '#FFFFFF'
      },
      'no_show': {
        backgroundColor: '#991B1B',
        borderColor: '#7F1D1D',
        textColor: '#FFFFFF'
      }
    }

    return colorMap[status] || colorMap['scheduled']
  }
}

// Export singleton instance
export const calendarBookingIntegration = new CalendarBookingIntegration()

// Helper functions for calendar components
export const CalendarHelpers = {
  /**
   * Format appointment time for display
   */
  formatAppointmentTime(appointment: CalendarAppointment): string {
    return `${appointment.startTime} - ${appointment.endTime}`
  },

  /**
   * Get appointment duration in minutes
   */
  getAppointmentDuration(appointment: CalendarAppointment): number {
    const [startHours, startMinutes] = appointment.startTime.split(':').map(Number)
    const [endHours, endMinutes] = appointment.endTime.split(':').map(Number)

    const startDate = new Date()
    startDate.setHours(startHours, startMinutes, 0, 0)

    const endDate = new Date()
    endDate.setHours(endHours, endMinutes, 0, 0)

    return Math.round((endDate.getTime() - startDate.getTime()) / 60000)
  },

  /**
   * Check if appointment can be modified
   */
  canModifyAppointment(appointment: CalendarAppointment): {
    canEdit: boolean
    canCancel: boolean
    canReschedule: boolean
    canComplete: boolean
    reason?: string
  } {
    const now = new Date()
    const appointmentDate = new Date(`${appointment.date}T${appointment.startTime}`)
    const isInPast = appointmentDate < now
    const isCompleted = appointment.status === 'completed'
    const isCancelled = appointment.status === 'cancelled'

    if (isCompleted || isCancelled) {
      return {
        canEdit: false,
        canCancel: false,
        canReschedule: false,
        canComplete: false,
        reason: `Appointment is ${appointment.status}`
      }
    }

    if (isInPast && appointment.status !== 'in_progress') {
      return {
        canEdit: false,
        canCancel: false,
        canReschedule: false,
        canComplete: appointment.status === 'in_progress',
        reason: 'Appointment is in the past'
      }
    }

    return {
      canEdit: true,
      canCancel: true,
      canReschedule: true,
      canComplete: ['confirmed', 'in_progress'].includes(appointment.status)
    }
  },

  /**
   * Generate appointment title for calendar display
   */
  generateAppointmentTitle(appointment: CalendarAppointment): string {
    return `${appointment.client} - ${appointment.service}`
  },

  /**
   * Get appointment tooltip text
   */
  getAppointmentTooltip(appointment: CalendarAppointment): string {
    const duration = CalendarHelpers.getAppointmentDuration(appointment)
    return [
      `Client: ${appointment.client}`,
      `Service: ${appointment.service}`,
      `Time: ${CalendarHelpers.formatAppointmentTime(appointment)}`,
      `Duration: ${duration} minutes`,
      `Barber: ${appointment.barber}`,
      `Status: ${appointment.status}`,
      appointment.notes ? `Notes: ${appointment.notes}` : null
    ].filter(Boolean).join('\n')
  }
}
