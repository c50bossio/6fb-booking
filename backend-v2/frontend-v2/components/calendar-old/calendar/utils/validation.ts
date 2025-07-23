// Time validation regex
const TIME_REGEX = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/

// Date validation regex
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Phone validation regex
const PHONE_REGEX = /^\+?[\d\s()-]+$/

// Validation types
export interface ValidationResult {
  isValid: boolean
  error?: string
}

export interface AppointmentFormData {
  client?: {
    id: string
    first_name: string
    last_name: string
    email: string
  } | null
  service?: {
    id: string
    name: string
    base_price: number
    duration_minutes: number
  } | null
  barber?: {
    id: string
    name: string
    role: string
  } | null
  date: Date | null
  time: string | null
  notes?: string
  isRecurring: boolean
  recurringPattern: 'weekly' | 'biweekly' | 'monthly'
  sendNotification: boolean
}

export interface ClientFormData {
  first_name: string
  last_name: string
  email: string
  phone?: string
}

// Validation functions
export const validateTimeFormat = (time: string): boolean => {
  return TIME_REGEX.test(time)
}

export const validateDateFormat = (date: string): boolean => {
  return DATE_REGEX.test(date) && !isNaN(Date.parse(date))
}

export const validateEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email)
}

export const validatePhone = (phone: string): boolean => {
  return !phone || PHONE_REGEX.test(phone)
}

// Business hour validation
export const isWithinBusinessHours = (time: string, startHour: number = 7, endHour: number = 21): boolean => {
  const [hours] = time.split(':').map(Number)
  return hours >= startHour && hours < endHour
}

// Date availability validation
export const isDateAvailable = (date: Date, blockedDates: Date[] = []): boolean => {
  const dateString = date.toDateString()
  return !blockedDates.some(blocked => blocked.toDateString() === dateString)
}

// Appointment form validation
export const validateAppointmentForm = (data: AppointmentFormData): ValidationResult => {
  // Service is required
  if (!data.service) {
    return { isValid: false, error: 'Service is required' }
  }

  // Date is required and must be in the future
  if (!data.date) {
    return { isValid: false, error: 'Date is required' }
  }
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (data.date < today) {
    return { isValid: false, error: 'Date cannot be in the past' }
  }

  // Time is required and must be valid format
  if (!data.time) {
    return { isValid: false, error: 'Time is required' }
  }
  
  if (!validateTimeFormat(data.time)) {
    return { isValid: false, error: 'Invalid time format (HH:MM)' }
  }

  // Notes validation (optional but has max length)
  if (data.notes && data.notes.length > 500) {
    return { isValid: false, error: 'Notes cannot exceed 500 characters' }
  }

  return { isValid: true }
}

// Client form validation
export const validateClientForm = (data: ClientFormData): ValidationResult => {
  // First name is required
  if (!data.first_name || data.first_name.trim().length === 0) {
    return { isValid: false, error: 'First name is required' }
  }
  
  if (data.first_name.length > 50) {
    return { isValid: false, error: 'First name cannot exceed 50 characters' }
  }

  // Last name is required
  if (!data.last_name || data.last_name.trim().length === 0) {
    return { isValid: false, error: 'Last name is required' }
  }
  
  if (data.last_name.length > 50) {
    return { isValid: false, error: 'Last name cannot exceed 50 characters' }
  }

  // Email is required and must be valid
  if (!data.email || data.email.trim().length === 0) {
    return { isValid: false, error: 'Email is required' }
  }
  
  if (!validateEmail(data.email)) {
    return { isValid: false, error: 'Invalid email address' }
  }

  // Phone is optional but must be valid if provided
  if (data.phone && !validatePhone(data.phone)) {
    return { isValid: false, error: 'Invalid phone number' }
  }

  return { isValid: true }
}

// Field-specific validators
export const validateField = (field: string, value: any): ValidationResult => {
  switch (field) {
    case 'email':
      return validateEmail(value) 
        ? { isValid: true } 
        : { isValid: false, error: 'Invalid email address' }
    
    case 'phone':
      return validatePhone(value)
        ? { isValid: true }
        : { isValid: false, error: 'Invalid phone number' }
    
    case 'time':
      return validateTimeFormat(value)
        ? { isValid: true }
        : { isValid: false, error: 'Invalid time format (HH:MM)' }
    
    case 'date':
      const date = new Date(value)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return date >= today
        ? { isValid: true }
        : { isValid: false, error: 'Date cannot be in the past' }
    
    default:
      return { isValid: true }
  }
}