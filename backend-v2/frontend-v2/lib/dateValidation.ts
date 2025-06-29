/**
 * Date and time validation utilities to ensure consistency between frontend and backend
 */

export interface DateValidationResult {
  isValid: boolean
  error?: string
  formatted?: string
}

export interface TimeValidationResult {
  isValid: boolean
  error?: string
  formatted?: string
  hour?: number
  minute?: number
}

/**
 * Validates a date string in YYYY-MM-DD format
 */
export function validateDateString(dateString: string): DateValidationResult {
  if (!dateString) {
    return { isValid: false, error: 'Date is required' }
  }

  // Check format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateString)) {
    return { isValid: false, error: 'Date must be in YYYY-MM-DD format' }
  }

  const date = new Date(dateString + 'T00:00:00.000Z')
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Invalid date' }
  }

  // Check if the formatted date matches the input (catches invalid dates like 2023-02-30)
  const formatted = date.toISOString().split('T')[0]
  if (formatted !== dateString) {
    return { isValid: false, error: 'Invalid date' }
  }

  return { isValid: true, formatted: dateString }
}

/**
 * Validates a time string in HH:MM format (24-hour)
 */
export function validateTimeString(timeString: string): TimeValidationResult {
  if (!timeString) {
    return { isValid: false, error: 'Time is required' }
  }

  // Check format HH:MM
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  if (!timeRegex.test(timeString)) {
    return { isValid: false, error: 'Time must be in HH:MM format (24-hour)' }
  }

  const [hourStr, minuteStr] = timeString.split(':')
  const hour = parseInt(hourStr, 10)
  const minute = parseInt(minuteStr, 10)

  // Validate hour and minute ranges
  if (hour < 0 || hour > 23) {
    return { isValid: false, error: 'Hour must be between 00 and 23' }
  }

  if (minute < 0 || minute > 59) {
    return { isValid: false, error: 'Minute must be between 00 and 59' }
  }

  // Format to ensure leading zeros
  const formatted = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

  return { 
    isValid: true, 
    formatted, 
    hour, 
    minute 
  }
}

/**
 * Validates an ISO datetime string
 */
export function validateISODateTimeString(dateTimeString: string): DateValidationResult {
  if (!dateTimeString) {
    return { isValid: false, error: 'DateTime is required' }
  }

  const date = new Date(dateTimeString)
  
  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Invalid datetime format' }
  }

  return { isValid: true, formatted: date.toISOString() }
}

/**
 * Validates a date is not in the past
 */
export function validateDateNotInPast(dateString: string, timeString?: string): DateValidationResult {
  const dateValidation = validateDateString(dateString)
  if (!dateValidation.isValid) {
    return dateValidation
  }

  const now = new Date()
  let dateToCheck: Date

  if (timeString) {
    const timeValidation = validateTimeString(timeString)
    if (!timeValidation.isValid) {
      return { isValid: false, error: timeValidation.error }
    }
    
    dateToCheck = new Date(`${dateString}T${timeString}:00.000Z`)
  } else {
    dateToCheck = new Date(dateString + 'T00:00:00.000Z')
  }

  if (dateToCheck < now) {
    return { isValid: false, error: 'Date cannot be in the past' }
  }

  return { isValid: true, formatted: dateString }
}

/**
 * Validates a time range (start time before end time)
 */
export function validateTimeRange(startTime: string, endTime: string): DateValidationResult {
  const startValidation = validateTimeString(startTime)
  if (!startValidation.isValid) {
    return { isValid: false, error: `Start time: ${startValidation.error}` }
  }

  const endValidation = validateTimeString(endTime)
  if (!endValidation.isValid) {
    return { isValid: false, error: `End time: ${endValidation.error}` }
  }

  const startDate = new Date(`1970-01-01T${startTime}:00.000Z`)
  const endDate = new Date(`1970-01-01T${endTime}:00.000Z`)

  if (startDate >= endDate) {
    return { isValid: false, error: 'Start time must be before end time' }
  }

  return { isValid: true }
}

/**
 * Formats a Date object to YYYY-MM-DD string
 */
export function formatDateToAPI(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Formats a Date object to HH:MM string
 */
export function formatTimeToAPI(date: Date): string {
  return date.toTimeString().split(' ')[0].substring(0, 5)
}

/**
 * Parses an API date string (YYYY-MM-DD) to Date object
 */
export function parseAPIDate(dateString: string): Date {
  const validation = validateDateString(dateString)
  if (!validation.isValid) {
    throw new Error(validation.error)
  }
  return new Date(dateString + 'T00:00:00.000Z')
}

/**
 * Parses an API time string (HH:MM) to a Date object (using current date)
 */
export function parseAPITime(timeString: string): Date {
  const validation = validateTimeString(timeString)
  if (!validation.isValid) {
    throw new Error(validation.error!)
  }
  
  const today = new Date()
  const [hour, minute] = timeString.split(':').map(Number)
  
  const date = new Date(today)
  date.setHours(hour, minute, 0, 0)
  
  return date
}

/**
 * Validates booking data structure matches backend expectations
 */
export interface BookingValidationData {
  date: string
  time: string
  service: string
}

export function validateBookingData(data: BookingValidationData): DateValidationResult {
  // Validate date
  const dateValidation = validateDateString(data.date)
  if (!dateValidation.isValid) {
    return { isValid: false, error: `Date: ${dateValidation.error}` }
  }

  // Validate time
  const timeValidation = validateTimeString(data.time)
  if (!timeValidation.isValid) {
    return { isValid: false, error: `Time: ${timeValidation.error}` }
  }

  // Validate service
  if (!data.service || data.service.trim().length === 0) {
    return { isValid: false, error: 'Service is required' }
  }

  const validServices = ['Haircut', 'Shave', 'Haircut & Shave']
  if (!validServices.includes(data.service)) {
    return { isValid: false, error: `Service must be one of: ${validServices.join(', ')}` }
  }

  // Validate not in past
  const pastValidation = validateDateNotInPast(data.date, data.time)
  if (!pastValidation.isValid) {
    return pastValidation
  }

  return { isValid: true }
}

/**
 * Validates user data structure matches backend expectations
 */
export interface UserValidationData {
  email: string
  name: string
  password?: string
}

export function validateUserData(data: UserValidationData): DateValidationResult {
  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!data.email || !emailRegex.test(data.email)) {
    return { isValid: false, error: 'Valid email is required' }
  }

  // Validate name
  if (!data.name || data.name.trim().length === 0) {
    return { isValid: false, error: 'Name is required' }
  }

  if (data.name.trim().length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' }
  }

  // Validate password if provided
  if (data.password !== undefined) {
    if (data.password.length < 8) {
      return { isValid: false, error: 'Password must be at least 8 characters' }
    }
    
    if (!/[A-Z]/.test(data.password)) {
      return { isValid: false, error: 'Password must contain at least one uppercase letter' }
    }
    
    if (!/[a-z]/.test(data.password)) {
      return { isValid: false, error: 'Password must contain at least one lowercase letter' }
    }
    
    if (!/\d/.test(data.password)) {
      return { isValid: false, error: 'Password must contain at least one digit' }
    }
  }

  return { isValid: true }
}

/**
 * Ensures date/time consistency across the application
 */
export class DateTimeValidator {
  static validateAndFormat(data: any): { isValid: boolean; errors: string[]; formatted?: any } {
    const errors: string[] = []
    const formatted: any = { ...data }

    // Validate and format dates
    if (data.date) {
      const dateValidation = validateDateString(data.date)
      if (!dateValidation.isValid) {
        errors.push(`Date: ${dateValidation.error}`)
      } else {
        formatted.date = dateValidation.formatted
      }
    }

    // Validate and format times
    if (data.time) {
      const timeValidation = validateTimeString(data.time)
      if (!timeValidation.isValid) {
        errors.push(`Time: ${timeValidation.error}`)
      } else {
        formatted.time = timeValidation.formatted
      }
    }

    // Validate and format start_time and end_time
    if (data.start_time && data.end_time) {
      const rangeValidation = validateTimeRange(data.start_time, data.end_time)
      if (!rangeValidation.isValid) {
        errors.push(rangeValidation.error!)
      }
    }

    // Validate ISO datetime strings
    if (data.created_at) {
      const createdValidation = validateISODateTimeString(data.created_at)
      if (!createdValidation.isValid) {
        errors.push(`Created at: ${createdValidation.error}`)
      } else {
        formatted.created_at = createdValidation.formatted
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      formatted: errors.length === 0 ? formatted : undefined
    }
  }
}