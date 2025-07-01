/**
 * Comprehensive data validation and sanitization for calendar appointments
 */

import { addMinutes, parseISO, isValid, isAfter, isBefore, startOfDay, endOfDay, format } from 'date-fns'
import type { 
  Appointment, 
  AppointmentCreate, 
  AppointmentUpdate, 
  ValidationResult,
  CalendarError 
} from '@/types/calendar'

// Business rules configuration
const BUSINESS_RULES = {
  APPOINTMENT: {
    MIN_DURATION: 15, // minutes
    MAX_DURATION: 480, // 8 hours
    MIN_ADVANCE_BOOKING: 30, // minutes
    MAX_ADVANCE_BOOKING: 365 * 24 * 60, // 1 year in minutes
    BUFFER_TIME: 15, // minutes between appointments
  },
  BUSINESS_HOURS: {
    START_HOUR: 6,
    END_HOUR: 22,
    WORKING_DAYS: [1, 2, 3, 4, 5, 6], // Monday to Saturday
  },
  CLIENT: {
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 50,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_REGEX: /^[\+]?[1-9][\d]{0,15}$/,
  }
}

/**
 * Validate appointment data before creation or update
 */
export function validateAppointment(
  appointment: AppointmentCreate | AppointmentUpdate,
  existingAppointments: Appointment[] = [],
  isUpdate: boolean = false
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    // Basic required field validation
    if (!appointment.service_name?.trim()) {
      errors.push('Service name is required')
    }

    if (!appointment.start_time) {
      errors.push('Start time is required')
    }

    // Date and time validation
    if (appointment.start_time) {
      const appointmentDate = parseISO(appointment.start_time)
      
      if (!isValid(appointmentDate)) {
        errors.push('Invalid appointment date/time')
      } else {
        // Check if appointment is in the past
        const now = new Date()
        const minAdvanceTime = addMinutes(now, BUSINESS_RULES.APPOINTMENT.MIN_ADVANCE_BOOKING)
        
        if (!isUpdate && isBefore(appointmentDate, minAdvanceTime)) {
          errors.push(`Appointments must be scheduled at least ${BUSINESS_RULES.APPOINTMENT.MIN_ADVANCE_BOOKING} minutes in advance`)
        }

        // Check if appointment is too far in the future
        const maxAdvanceTime = addMinutes(now, BUSINESS_RULES.APPOINTMENT.MAX_ADVANCE_BOOKING)
        if (isAfter(appointmentDate, maxAdvanceTime)) {
          errors.push('Appointments cannot be scheduled more than 1 year in advance')
        }

        // Check business hours
        const hour = appointmentDate.getHours()
        if (hour < BUSINESS_RULES.BUSINESS_HOURS.START_HOUR || hour >= BUSINESS_RULES.BUSINESS_HOURS.END_HOUR) {
          warnings.push(`Appointment is outside business hours (${BUSINESS_RULES.BUSINESS_HOURS.START_HOUR}:00 - ${BUSINESS_RULES.BUSINESS_HOURS.END_HOUR}:00)`)
        }

        // Check working days
        const dayOfWeek = appointmentDate.getDay()
        if (!BUSINESS_RULES.BUSINESS_HOURS.WORKING_DAYS.includes(dayOfWeek)) {
          warnings.push('Appointment is scheduled on a non-working day')
        }
      }
    }

    // Duration validation
    if (appointment.duration_minutes) {
      if (appointment.duration_minutes < BUSINESS_RULES.APPOINTMENT.MIN_DURATION) {
        errors.push(`Appointment duration must be at least ${BUSINESS_RULES.APPOINTMENT.MIN_DURATION} minutes`)
      }
      if (appointment.duration_minutes > BUSINESS_RULES.APPOINTMENT.MAX_DURATION) {
        errors.push(`Appointment duration cannot exceed ${BUSINESS_RULES.APPOINTMENT.MAX_DURATION} minutes`)
      }
    }

    // Client validation
    if (appointment.client_name) {
      const trimmedName = appointment.client_name.trim()
      if (trimmedName.length < BUSINESS_RULES.CLIENT.NAME_MIN_LENGTH) {
        errors.push(`Client name must be at least ${BUSINESS_RULES.CLIENT.NAME_MIN_LENGTH} characters`)
      }
      if (trimmedName.length > BUSINESS_RULES.CLIENT.NAME_MAX_LENGTH) {
        errors.push(`Client name cannot exceed ${BUSINESS_RULES.CLIENT.NAME_MAX_LENGTH} characters`)
      }
    }

    if (appointment.client_email) {
      if (!BUSINESS_RULES.CLIENT.EMAIL_REGEX.test(appointment.client_email)) {
        errors.push('Invalid email format')
      }
    }

    if (appointment.client_phone) {
      const cleanPhone = appointment.client_phone.replace(/[\s\-\(\)]/g, '')
      if (!BUSINESS_RULES.CLIENT.PHONE_REGEX.test(cleanPhone)) {
        errors.push('Invalid phone number format')
      }
    }

    // Price validation
    if (appointment.price !== undefined) {
      if (appointment.price < 0) {
        errors.push('Price cannot be negative')
      }
      if (appointment.price > 10000) {
        warnings.push('Price seems unusually high')
      }
    }

    // Status validation
    if (appointment.status) {
      const validStatuses = ['pending', 'confirmed', 'scheduled', 'completed', 'cancelled', 'no_show']
      if (!validStatuses.includes(appointment.status)) {
        errors.push('Invalid appointment status')
      }
    }

    // Conflict detection with existing appointments
    if (appointment.start_time && appointment.barber_id && existingAppointments.length > 0) {
      const conflicts = detectAppointmentConflicts(appointment, existingAppointments, isUpdate)
      if (conflicts.length > 0) {
        conflicts.forEach(conflict => {
          if (conflict.severity === 'critical') {
            errors.push(conflict.message)
          } else {
            warnings.push(conflict.message)
          }
        })
      }
    }

  } catch (error) {
    errors.push('Validation error: ' + (error as Error).message)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Sanitize appointment data before processing
 */
export function sanitizeAppointment(
  appointment: AppointmentCreate | AppointmentUpdate
): AppointmentCreate | AppointmentUpdate {
  const sanitized = { ...appointment }

  // Trim and sanitize string fields
  if (sanitized.service_name) {
    sanitized.service_name = sanitized.service_name.trim().slice(0, 100)
  }

  if (sanitized.client_name) {
    sanitized.client_name = sanitized.client_name.trim().slice(0, BUSINESS_RULES.CLIENT.NAME_MAX_LENGTH)
  }

  if (sanitized.client_email) {
    sanitized.client_email = sanitized.client_email.trim().toLowerCase()
  }

  if (sanitized.client_phone) {
    // Remove common phone formatting characters
    sanitized.client_phone = sanitized.client_phone.replace(/[\s\-\(\)\.]/g, '')
  }

  if (sanitized.notes) {
    sanitized.notes = sanitized.notes.trim().slice(0, 500) // Limit notes to 500 chars
  }

  // Ensure numeric fields are valid
  if (sanitized.duration_minutes !== undefined) {
    sanitized.duration_minutes = Math.max(
      BUSINESS_RULES.APPOINTMENT.MIN_DURATION,
      Math.min(BUSINESS_RULES.APPOINTMENT.MAX_DURATION, Math.round(sanitized.duration_minutes))
    )
  }

  if (sanitized.price !== undefined) {
    sanitized.price = Math.max(0, Math.round(sanitized.price * 100) / 100) // Round to 2 decimal places
  }

  return sanitized
}

/**
 * Detect conflicts with existing appointments
 */
function detectAppointmentConflicts(
  newAppointment: AppointmentCreate | AppointmentUpdate,
  existingAppointments: Appointment[],
  isUpdate: boolean = false
): Array<{ severity: 'critical' | 'warning' | 'info'; message: string }> {
  const conflicts: Array<{ severity: 'critical' | 'warning' | 'info'; message: string }> = []

  if (!newAppointment.start_time || !newAppointment.barber_id) {
    return conflicts
  }

  try {
    const newStart = parseISO(newAppointment.start_time)
    const newDuration = newAppointment.duration_minutes || 60
    const newEnd = addMinutes(newStart, newDuration)
    const bufferTime = BUSINESS_RULES.APPOINTMENT.BUFFER_TIME

    // Filter relevant appointments (same barber, not the appointment being updated)
    const relevantAppointments = existingAppointments.filter(apt => {
      if (apt.barber_id !== newAppointment.barber_id) return false
      if (isUpdate && 'id' in newAppointment && apt.id === newAppointment.id) return false
      if (apt.status === 'cancelled') return false
      return true
    })

    relevantAppointments.forEach(existing => {
      try {
        const existingStart = parseISO(existing.start_time)
        const existingDuration = existing.duration_minutes || 60
        const existingEnd = addMinutes(existingStart, existingDuration)

        // Check for direct overlap
        if (
          (isAfter(newStart, existingStart) && isBefore(newStart, existingEnd)) ||
          (isAfter(newEnd, existingStart) && isBefore(newEnd, existingEnd)) ||
          (isBefore(newStart, existingStart) && isAfter(newEnd, existingEnd))
        ) {
          conflicts.push({
            severity: 'critical',
            message: `Appointment overlaps with existing appointment for ${existing.client_name || 'client'} at ${format(existingStart, 'MMM d, h:mm a')}`
          })
        }

        // Check for insufficient buffer time
        const timeBetween = Math.abs(newStart.getTime() - existingEnd.getTime()) / (1000 * 60)
        const timeBetween2 = Math.abs(existingStart.getTime() - newEnd.getTime()) / (1000 * 60)
        const minTimeBetween = Math.min(timeBetween, timeBetween2)

        if (minTimeBetween > 0 && minTimeBetween < bufferTime) {
          conflicts.push({
            severity: 'warning',
            message: `Appointment is too close to existing appointment (${Math.round(minTimeBetween)} minutes gap, ${bufferTime} minutes recommended)`
          })
        }

      } catch (error) {
        // Skip invalid existing appointments
        console.warn('Invalid existing appointment date:', existing.start_time)
      }
    })

  } catch (error) {
    conflicts.push({
      severity: 'critical',
      message: 'Unable to validate appointment time conflicts'
    })
  }

  return conflicts
}

/**
 * Validate appointment time slots availability
 */
export function validateTimeSlotAvailability(
  date: Date,
  time: string, // HH:MM format
  duration: number,
  barberId: number,
  existingAppointments: Appointment[]
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    // Parse the time
    const [hours, minutes] = time.split(':').map(Number)
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      errors.push('Invalid time format')
      return { isValid: false, errors, warnings }
    }

    // Create the appointment datetime
    const appointmentStart = new Date(date)
    appointmentStart.setHours(hours, minutes, 0, 0)
    const appointmentEnd = addMinutes(appointmentStart, duration)

    // Check business hours
    if (hours < BUSINESS_RULES.BUSINESS_HOURS.START_HOUR) {
      errors.push(`Time slot is before business hours (${BUSINESS_RULES.BUSINESS_HOURS.START_HOUR}:00)`)
    }

    const endHour = appointmentEnd.getHours()
    if (endHour > BUSINESS_RULES.BUSINESS_HOURS.END_HOUR) {
      errors.push(`Appointment would end after business hours (${BUSINESS_RULES.BUSINESS_HOURS.END_HOUR}:00)`)
    }

    // Check for conflicts
    const conflictingAppointments = existingAppointments.filter(apt => {
      if (apt.barber_id !== barberId || apt.status === 'cancelled') return false

      try {
        const existingStart = parseISO(apt.start_time)
        const existingDuration = apt.duration_minutes || 60
        const existingEnd = addMinutes(existingStart, existingDuration)

        // Check if the dates are on the same day
        if (!isSameDay(appointmentStart, existingStart)) return false

        // Check for overlap
        return (
          (isAfter(appointmentStart, existingStart) && isBefore(appointmentStart, existingEnd)) ||
          (isAfter(appointmentEnd, existingStart) && isBefore(appointmentEnd, existingEnd)) ||
          (isBefore(appointmentStart, existingStart) && isAfter(appointmentEnd, existingEnd))
        )
      } catch {
        return false
      }
    })

    if (conflictingAppointments.length > 0) {
      errors.push('Time slot conflicts with existing appointments')
    }

  } catch (error) {
    errors.push('Error validating time slot: ' + (error as Error).message)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Generate safe appointment suggestions based on validation errors
 */
export function generateAppointmentSuggestions(
  failedAppointment: AppointmentCreate,
  existingAppointments: Appointment[]
): Array<{ time: string; reason: string }> {
  const suggestions: Array<{ time: string; reason: string }> = []

  if (!failedAppointment.start_time || !failedAppointment.barber_id) {
    return suggestions
  }

  try {
    const originalDate = parseISO(failedAppointment.start_time)
    const duration = failedAppointment.duration_minutes || 60

    // Try to find alternative times on the same day
    for (let hour = BUSINESS_RULES.BUSINESS_HOURS.START_HOUR; hour < BUSINESS_RULES.BUSINESS_HOURS.END_HOUR; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const suggestedTime = new Date(originalDate)
        suggestedTime.setHours(hour, minute, 0, 0)
        
        // Skip if this would end after business hours
        const suggestedEnd = addMinutes(suggestedTime, duration)
        if (suggestedEnd.getHours() > BUSINESS_RULES.BUSINESS_HOURS.END_HOUR) {
          continue
        }

        const timeString = format(suggestedTime, 'HH:mm')
        const validation = validateTimeSlotAvailability(
          originalDate,
          timeString,
          duration,
          failedAppointment.barber_id,
          existingAppointments
        )

        if (validation.isValid) {
          suggestions.push({
            time: format(suggestedTime, 'h:mm a'),
            reason: 'Available time slot'
          })
          
          if (suggestions.length >= 5) break // Limit suggestions
        }
      }
      if (suggestions.length >= 5) break
    }

  } catch (error) {
    console.error('Error generating appointment suggestions:', error)
  }

  return suggestions
}

/**
 * Create a custom calendar error with context
 */
export function createCalendarError(
  message: string,
  code: string,
  context?: Record<string, any>,
  recoverable: boolean = true
): CalendarError {
  const error = new Error(message) as CalendarError
  error.code = code
  error.context = {
    timestamp: new Date().toISOString(),
    ...context
  }
  error.recoverable = recoverable
  
  return error
}

// Helper function that was referenced but not defined
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.toDateString() === date2.toDateString()
}