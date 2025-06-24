import { z } from 'zod'

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings?: ValidationError[]
}

// Zod schemas for appointment validation
export const appointmentValidationSchema = z.object({
  client_name: z.string()
    .min(2, 'Client name must be at least 2 characters')
    .max(100, 'Client name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Client name can only contain letters, spaces, apostrophes, and hyphens'),

  client_email: z.string()
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters')
    .optional(),

  client_phone: z.string()
    .regex(/^\+?[\d\s\-\(\)\.]+$/, 'Please enter a valid phone number')
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must be less than 20 characters'),

  barberId: z.number()
    .positive('Please select a barber'),

  serviceId: z.number()
    .positive('Please select a service'),

  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((date) => {
      const appointmentDate = new Date(date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return appointmentDate >= today
    }, 'Appointment date cannot be in the past'),

  time: z.string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
    .refine((time) => {
      const [hours, minutes] = time.split(':').map(Number)
      return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
    }, 'Please enter a valid time'),

  duration: z.number()
    .min(15, 'Appointment duration must be at least 15 minutes')
    .max(480, 'Appointment duration cannot exceed 8 hours'),

  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional()
})

export const timeSlotValidationSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  barberId: z.number().positive(),
  duration: z.number().min(15).max(480)
})

// Business rules validation
export class AppointmentValidator {
  private businessHours = {
    start: '08:00',
    end: '20:00',
    closedDays: [0] // Sunday = 0
  }

  private holidays = [
    '2024-12-25', // Christmas
    '2025-01-01', // New Year
    '2025-07-04', // Independence Day
    '2025-11-28', // Thanksgiving
  ]

  validateAppointment(data: any): ValidationResult {
    try {
      // Basic schema validation
      appointmentValidationSchema.parse(data)

      const errors: ValidationError[] = []
      const warnings: ValidationError[] = []

      // Business hours validation
      if (!this.isWithinBusinessHours(data.time)) {
        errors.push({
          field: 'time',
          message: `Appointments are only available between ${this.businessHours.start} and ${this.businessHours.end}`,
          code: 'OUTSIDE_BUSINESS_HOURS'
        })
      }

      // Weekend/holiday validation
      const appointmentDate = new Date(data.date)
      if (this.businessHours.closedDays.includes(appointmentDate.getDay())) {
        errors.push({
          field: 'date',
          message: 'We are closed on Sundays. Please select a different date.',
          code: 'CLOSED_DAY'
        })
      }

      if (this.holidays.includes(data.date)) {
        errors.push({
          field: 'date',
          message: 'We are closed on this holiday. Please select a different date.',
          code: 'HOLIDAY_CLOSED'
        })
      }

      // Advanced time validation
      if (this.isLastMinuteBooking(data.date, data.time)) {
        warnings.push({
          field: 'time',
          message: 'This is a last-minute booking. Please confirm availability by calling us.',
          code: 'LAST_MINUTE_BOOKING'
        })
      }

      if (this.isWeekendEvening(data.date, data.time)) {
        warnings.push({
          field: 'time',
          message: 'Weekend evening slots are in high demand. Book early to secure your spot.',
          code: 'HIGH_DEMAND_SLOT'
        })
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: 'VALIDATION_ERROR'
        }))

        return {
          isValid: false,
          errors
        }
      }

      return {
        isValid: false,
        errors: [{
          field: 'general',
          message: 'An unexpected validation error occurred',
          code: 'UNKNOWN_ERROR'
        }]
      }
    }
  }

  validateTimeSlot(data: any): ValidationResult {
    try {
      timeSlotValidationSchema.parse(data)

      const errors: ValidationError[] = []

      // Check if time slot is available (this would typically call an API)
      if (!this.isWithinBusinessHours(data.time)) {
        errors.push({
          field: 'time',
          message: 'Selected time is outside business hours',
          code: 'OUTSIDE_BUSINESS_HOURS'
        })
      }

      return {
        isValid: errors.length === 0,
        errors
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: 'VALIDATION_ERROR'
        }))

        return {
          isValid: false,
          errors
        }
      }

      return {
        isValid: false,
        errors: [{
          field: 'general',
          message: 'Time slot validation failed',
          code: 'UNKNOWN_ERROR'
        }]
      }
    }
  }

  private isWithinBusinessHours(time: string): boolean {
    const appointmentTime = this.timeToMinutes(time)
    const startTime = this.timeToMinutes(this.businessHours.start)
    const endTime = this.timeToMinutes(this.businessHours.end)

    return appointmentTime >= startTime && appointmentTime <= endTime
  }

  private isLastMinuteBooking(date: string, time: string): boolean {
    const appointmentDateTime = new Date(`${date}T${time}:00`)
    const now = new Date()
    const timeDiff = appointmentDateTime.getTime() - now.getTime()
    const hoursDiff = timeDiff / (1000 * 60 * 60)

    return hoursDiff < 2 // Less than 2 hours notice
  }

  private isWeekendEvening(date: string, time: string): boolean {
    const appointmentDate = new Date(date)
    const dayOfWeek = appointmentDate.getDay()
    const appointmentTime = this.timeToMinutes(time)
    const eveningStart = this.timeToMinutes('17:00')

    return (dayOfWeek === 5 || dayOfWeek === 6) && appointmentTime >= eveningStart // Friday or Saturday evening
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  // Get user-friendly error messages
  getErrorMessage(error: ValidationError): string {
    const errorMessages: Record<string, string> = {
      'OUTSIDE_BUSINESS_HOURS': 'Please select a time during our business hours.',
      'CLOSED_DAY': 'We are closed on this day. Please choose a different date.',
      'HOLIDAY_CLOSED': 'We are closed for this holiday. Please select another date.',
      'LAST_MINUTE_BOOKING': 'Last-minute bookings require phone confirmation.',
      'HIGH_DEMAND_SLOT': 'This is a popular time slot. Book early!',
      'VALIDATION_ERROR': error.message,
      'UNKNOWN_ERROR': 'Something went wrong. Please try again.'
    }

    return errorMessages[error.code] || error.message
  }

  // Get suggested alternative times for failed validations
  getSuggestedAlternatives(date: string, time: string, duration: number = 60): string[] {
    const suggestions: string[] = []
    const requestedTime = this.timeToMinutes(time)

    // Suggest times within 2 hours of requested time
    for (let offset = -120; offset <= 120; offset += 30) {
      const alternativeTime = requestedTime + offset
      const alternativeTimeStr = this.minutesToTime(alternativeTime)

      if (this.isWithinBusinessHours(alternativeTimeStr) && alternativeTimeStr !== time) {
        suggestions.push(alternativeTimeStr)
      }
    }

    return suggestions.slice(0, 4) // Return top 4 suggestions
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }
}

export const appointmentValidator = new AppointmentValidator()
