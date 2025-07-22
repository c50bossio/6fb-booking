/**
 * Comprehensive Booking Validation Library
 * 
 * Implements Six Figure Barber methodology validation rules:
 * - Premium service validation and pricing alignment
 * - Business hours and scheduling constraints
 * - Client information validation
 * - Service duration and combination rules
 * - Double-booking prevention
 * - Quality assurance checks
 */

import { format, isAfter, isBefore, startOfDay, endOfDay, parseISO, addMinutes, differenceInMinutes, isWeekend } from 'date-fns'
import { toast } from 'sonner'

// Types
export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning' | 'info'
  code: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  suggestions: string[]
}

export interface BookingData {
  date: Date | string
  time: string
  service: string
  clientInfo?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
  }
  barberId?: number
  notes?: string
  isRecurring?: boolean
  recurringPattern?: 'weekly' | 'biweekly' | 'monthly'
}

export interface BusinessHours {
  start: string // "09:00"
  end: string   // "18:00"
}

export interface ServiceInfo {
  name: string
  duration: number // minutes
  price: number
  category: 'signature' | 'premium' | 'standard' | 'maintenance'
  requiresConsultation?: boolean
  minimumInterval?: number // days between bookings
}

// Six Figure Barber Service Definitions
const SERVICES: Record<string, ServiceInfo> = {
  "Haircut": {
    name: "Haircut",
    duration: 45,
    price: 85,
    category: 'signature',
    requiresConsultation: false
  },
  "Signature Cut": {
    name: "Signature Cut", 
    duration: 60,
    price: 120,
    category: 'signature',
    requiresConsultation: true
  },
  "Beard Service": {
    name: "Beard Service",
    duration: 30,
    price: 65,
    category: 'premium',
    requiresConsultation: false
  },
  "Haircut & Shave": {
    name: "Haircut & Shave",
    duration: 75,
    price: 140,
    category: 'signature',
    requiresConsultation: false
  },
  "Grooming Package": {
    name: "Grooming Package",
    duration: 90,
    price: 220,
    category: 'premium',
    requiresConsultation: true
  },
  "Executive Package": {
    name: "Executive Package",
    duration: 120,
    price: 300,
    category: 'premium',
    requiresConsultation: true
  },
  "Shave": {
    name: "Shave",
    duration: 30,
    price: 50,
    category: 'standard'
  }
}

// Business Configuration
const BUSINESS_CONFIG = {
  // Six Figure Barber methodology: Premium positioning
  minimumBookingNotice: 2, // hours
  maximumAdvanceBooking: 60, // days
  slotDuration: 30, // minutes
  bufferBetweenAppointments: 15, // minutes
  
  // Quality standards
  minimumServiceDuration: 30, // minutes
  maximumServiceDuration: 180, // minutes
  
  // Premium experience standards
  consultationDuration: 15, // minutes for new clients
  premiumServiceBufferTime: 30, // minutes before/after premium services
  
  // Business hours (can be overridden by API data)
  defaultBusinessHours: {
    start: "09:00",
    end: "18:00"
  },
  
  // Weekend policies
  weekendBookingAllowed: true,
  weekendPremiumRequired: true // Premium services only on weekends
}

/**
 * Main booking validation function
 * Validates all aspects of a booking request according to Six Figure Barber methodology
 */
export function validateBooking(
  bookingData: BookingData,
  businessHours?: BusinessHours,
  existingBookings?: Array<{date: string, time: string, duration: number}>
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []
  const suggestions: string[] = []

  try {
    // 1. Validate basic booking data
    validateBasicBookingData(bookingData, errors)
    
    // 2. Validate date and time constraints
    validateDateTimeConstraints(bookingData, errors, warnings, businessHours)
    
    // 3. Validate service selection and Six Figure Barber rules
    validateServiceSelection(bookingData, errors, warnings, suggestions)
    
    // 4. Validate client information
    validateClientInformation(bookingData, errors, warnings)
    
    // 5. Check for conflicts with existing bookings
    if (existingBookings) {
      validateBookingConflicts(bookingData, existingBookings, errors)
    }
    
    // 6. Validate premium service requirements
    validatePremiumServiceRequirements(bookingData, warnings, suggestions)
    
    // 7. Validate recurring appointment settings
    if (bookingData.isRecurring) {
      validateRecurringSettings(bookingData, errors, warnings)
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    }
    
  } catch (error) {
    console.error('Booking validation error:', error)
    return {
      isValid: false,
      errors: [{
        field: 'general',
        message: 'Validation system error. Please try again.',
        severity: 'error',
        code: 'VALIDATION_ERROR'
      }],
      warnings: [],
      suggestions: []
    }
  }
}

/**
 * Validate basic required booking data
 */
function validateBasicBookingData(bookingData: BookingData, errors: ValidationError[]) {
  // Date validation
  if (!bookingData.date) {
    errors.push({
      field: 'date',
      message: 'Appointment date is required',
      severity: 'error',
      code: 'REQUIRED_FIELD'
    })
  }
  
  // Time validation
  if (!bookingData.time) {
    errors.push({
      field: 'time',
      message: 'Appointment time is required',
      severity: 'error',
      code: 'REQUIRED_FIELD'
    })
  } else if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(bookingData.time)) {
    errors.push({
      field: 'time',
      message: 'Please enter a valid time in HH:MM format',
      severity: 'error',
      code: 'INVALID_FORMAT'
    })
  }
  
  // Service validation
  if (!bookingData.service) {
    errors.push({
      field: 'service',
      message: 'Service selection is required',
      severity: 'error',
      code: 'REQUIRED_FIELD'
    })
  }
}

/**
 * Validate date and time constraints according to business rules
 */
function validateDateTimeConstraints(
  bookingData: BookingData,
  errors: ValidationError[],
  warnings: ValidationError[],
  businessHours?: BusinessHours
) {
  if (!bookingData.date || !bookingData.time) return

  const appointmentDate = typeof bookingData.date === 'string' 
    ? parseISO(bookingData.date) 
    : bookingData.date
  
  const now = new Date()
  const [hours, minutes] = bookingData.time.split(':').map(Number)
  const appointmentDateTime = new Date(appointmentDate)
  appointmentDateTime.setHours(hours, minutes, 0, 0)
  
  // Past date validation
  if (isBefore(startOfDay(appointmentDate), startOfDay(now))) {
    errors.push({
      field: 'date',
      message: 'Cannot book appointments in the past',
      severity: 'error',
      code: 'PAST_DATE'
    })
  }
  
  // Minimum advance booking time (Six Figure Barber: Quality preparation time)
  const minAdvanceTime = addMinutes(now, BUSINESS_CONFIG.minimumBookingNotice * 60)
  if (isBefore(appointmentDateTime, minAdvanceTime)) {
    errors.push({
      field: 'time',
      message: `Appointments must be booked at least ${BUSINESS_CONFIG.minimumBookingNotice} hours in advance for proper preparation`,
      severity: 'error',
      code: 'INSUFFICIENT_NOTICE'
    })
  }
  
  // Maximum advance booking
  const maxAdvanceDate = new Date()
  maxAdvanceDate.setDate(now.getDate() + BUSINESS_CONFIG.maximumAdvanceBooking)
  if (isAfter(appointmentDate, maxAdvanceDate)) {
    errors.push({
      field: 'date',
      message: `Appointments can only be booked up to ${BUSINESS_CONFIG.maximumAdvanceBooking} days in advance`,
      severity: 'error',
      code: 'TOO_FAR_ADVANCE'
    })
  }
  
  // Business hours validation
  const hours_config = businessHours || BUSINESS_CONFIG.defaultBusinessHours
  const [startHour, startMin] = hours_config.start.split(':').map(Number)
  const [endHour, endMin] = hours_config.end.split(':').map(Number)
  
  const serviceInfo = SERVICES[bookingData.service]
  const serviceDuration = serviceInfo?.duration || 30
  const appointmentEndTime = addMinutes(appointmentDateTime, serviceDuration)
  
  // Check start time is within business hours
  if (hours < startHour || (hours === startHour && minutes < startMin)) {
    errors.push({
      field: 'time',
      message: `Appointments must be scheduled after ${hours_config.start}`,
      severity: 'error',
      code: 'BEFORE_BUSINESS_HOURS'
    })
  }
  
  // Check end time is within business hours
  const endHours = appointmentEndTime.getHours()
  const endMinutes = appointmentEndTime.getMinutes()
  if (endHours > endHour || (endHours === endHour && endMinutes > endMin)) {
    errors.push({
      field: 'time',
      message: `Appointment must end before ${hours_config.end}. This service requires ${serviceDuration} minutes.`,
      severity: 'error',
      code: 'AFTER_BUSINESS_HOURS'
    })
  }
  
  // Weekend validation for premium positioning
  if (isWeekend(appointmentDate) && BUSINESS_CONFIG.weekendPremiumRequired) {
    const serviceInfo = SERVICES[bookingData.service]
    if (serviceInfo && serviceInfo.category === 'standard') {
      warnings.push({
        field: 'date',
        message: 'Weekend appointments are recommended for premium services to maintain exclusive positioning',
        severity: 'warning',
        code: 'WEEKEND_PREMIUM_SUGGESTED'
      })
    }
  }
}

/**
 * Validate service selection according to Six Figure Barber methodology
 */
function validateServiceSelection(
  bookingData: BookingData,
  errors: ValidationError[],
  warnings: ValidationError[],
  suggestions: string[]
) {
  if (!bookingData.service) return
  
  const serviceInfo = SERVICES[bookingData.service]
  
  if (!serviceInfo) {
    errors.push({
      field: 'service',
      message: 'Please select a valid service from our premium menu',
      severity: 'error',
      code: 'INVALID_SERVICE'
    })
    return
  }
  
  // Duration validation
  if (serviceInfo.duration < BUSINESS_CONFIG.minimumServiceDuration) {
    warnings.push({
      field: 'service',
      message: 'This service duration may not allow for the full Six Figure Barber experience',
      severity: 'warning',
      code: 'SHORT_SERVICE'
    })
  }
  
  // Premium service consultation requirement
  if (serviceInfo.requiresConsultation) {
    warnings.push({
      field: 'service',
      message: 'This premium service includes a consultation to ensure exceptional results',
      severity: 'info',
      code: 'CONSULTATION_INCLUDED'
    })
    
    suggestions.push(`${serviceInfo.name} includes a personalized consultation to understand your style goals and preferences`)
  }
  
  // Service category recommendations
  if (serviceInfo.category === 'signature') {
    suggestions.push('Signature services include premium styling techniques and personalized finishing')
  } else if (serviceInfo.category === 'premium') {
    suggestions.push('Premium services feature the complete Six Figure Barber experience with luxury amenities')
  }
  
  // Upselling suggestions based on Six Figure Barber methodology
  generateUpsellingSuggestions(serviceInfo, suggestions)
}

/**
 * Validate client information for quality service delivery
 */
function validateClientInformation(
  bookingData: BookingData,
  errors: ValidationError[],
  warnings: ValidationError[]
) {
  if (!bookingData.clientInfo) return
  
  const { firstName, lastName, email, phone } = bookingData.clientInfo
  
  // Name validation
  if (firstName && firstName.trim().length < 2) {
    errors.push({
      field: 'firstName',
      message: 'Please enter a valid first name',
      severity: 'error',
      code: 'INVALID_NAME'
    })
  }
  
  if (lastName && lastName.trim().length < 2) {
    errors.push({
      field: 'lastName',
      message: 'Please enter a valid last name',
      severity: 'error',
      code: 'INVALID_NAME'
    })
  }
  
  // Email validation
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      errors.push({
        field: 'email',
        message: 'Please enter a valid email address',
        severity: 'error',
        code: 'INVALID_EMAIL'
      })
    }
  }
  
  // Phone validation
  if (phone) {
    const phoneRegex = /^[\+]?[\(\)]?[\d\s\-\(\)]{10,}$/
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      errors.push({
        field: 'phone',
        message: 'Please enter a valid phone number',
        severity: 'error',
        code: 'INVALID_PHONE'
      })
    }
  }
  
  // Recommend contact information for premium service experience
  if (!email && !phone) {
    warnings.push({
      field: 'clientInfo',
      message: 'Contact information helps us provide appointment reminders and premium service updates',
      severity: 'info',
      code: 'CONTACT_RECOMMENDED'
    })
  }
}

/**
 * Check for booking conflicts and double-booking prevention
 */
function validateBookingConflicts(
  bookingData: BookingData,
  existingBookings: Array<{date: string, time: string, duration: number}>,
  errors: ValidationError[]
) {
  if (!bookingData.date || !bookingData.time || !bookingData.service) return
  
  const serviceInfo = SERVICES[bookingData.service]
  if (!serviceInfo) return
  
  const appointmentDate = typeof bookingData.date === 'string' 
    ? parseISO(bookingData.date) 
    : bookingData.date
  
  const appointmentDateStr = format(appointmentDate, 'yyyy-MM-dd')
  const [newHours, newMinutes] = bookingData.time.split(':').map(Number)
  const newStartTime = newHours * 60 + newMinutes
  const newEndTime = newStartTime + serviceInfo.duration + BUSINESS_CONFIG.bufferBetweenAppointments
  
  // Check for conflicts with existing bookings
  const conflicts = existingBookings.filter(existing => {
    if (existing.date !== appointmentDateStr) return false
    
    const [existingHours, existingMinutes] = existing.time.split(':').map(Number)
    const existingStartTime = existingHours * 60 + existingMinutes
    const existingEndTime = existingStartTime + existing.duration + BUSINESS_CONFIG.bufferBetweenAppointments
    
    // Check for overlap
    return !(newEndTime <= existingStartTime || newStartTime >= existingEndTime)
  })
  
  if (conflicts.length > 0) {
    const conflictTime = conflicts[0].time
    errors.push({
      field: 'time',
      message: `This time conflicts with an existing appointment at ${conflictTime}. Please select a different time.`,
      severity: 'error',
      code: 'BOOKING_CONFLICT'
    })
  }
}

/**
 * Validate premium service requirements according to Six Figure Barber standards
 */
function validatePremiumServiceRequirements(
  bookingData: BookingData,
  warnings: ValidationError[],
  suggestions: string[]
) {
  if (!bookingData.service) return
  
  const serviceInfo = SERVICES[bookingData.service]
  if (!serviceInfo) return
  
  // Premium service experience validation
  if (serviceInfo.category === 'premium' || serviceInfo.category === 'signature') {
    if (!bookingData.notes || bookingData.notes.trim().length < 10) {
      warnings.push({
        field: 'notes',
        message: 'Premium services benefit from detailed style preferences and special requests',
        severity: 'info',
        code: 'NOTES_RECOMMENDED'
      })
      
      suggestions.push('Share your style goals, hair concerns, or special occasion details to ensure exceptional results')
    }
  }
  
  // Minimum interval validation for premium services
  if (serviceInfo.minimumInterval) {
    suggestions.push(`For optimal results, ${serviceInfo.name} is recommended every ${serviceInfo.minimumInterval} days`)
  }
  
  // Premium experience suggestions
  if (serviceInfo.category === 'premium') {
    suggestions.push('Arrive 10 minutes early to enjoy our premium amenities and consultation process')
  }
}

/**
 * Validate recurring appointment settings
 */
function validateRecurringSettings(
  bookingData: BookingData,
  errors: ValidationError[],
  warnings: ValidationError[]
) {
  if (!bookingData.isRecurring) return
  
  if (!bookingData.recurringPattern) {
    errors.push({
      field: 'recurringPattern',
      message: 'Please select a recurring pattern',
      severity: 'error',
      code: 'REQUIRED_FIELD'
    })
  }
  
  const validPatterns = ['weekly', 'biweekly', 'monthly']
  if (bookingData.recurringPattern && !validPatterns.includes(bookingData.recurringPattern)) {
    errors.push({
      field: 'recurringPattern',
      message: 'Please select a valid recurring pattern',
      severity: 'error',
      code: 'INVALID_PATTERN'
    })
  }
  
  // Six Figure Barber methodology: Recommend optimal intervals
  const serviceInfo = SERVICES[bookingData.service]
  if (serviceInfo) {
    if (serviceInfo.category === 'signature' && bookingData.recurringPattern === 'weekly') {
      warnings.push({
        field: 'recurringPattern',
        message: 'Signature cuts typically maintain their style for 2-3 weeks. Consider biweekly appointments.',
        severity: 'info',
        code: 'PATTERN_SUGGESTION'
      })
    } else if (serviceInfo.category === 'maintenance' && bookingData.recurringPattern === 'monthly') {
      warnings.push({
        field: 'recurringPattern',
        message: 'Maintenance services are most effective with weekly or biweekly scheduling.',
        severity: 'info',
        code: 'PATTERN_SUGGESTION'
      })
    }
  }
}

/**
 * Generate upselling suggestions based on Six Figure Barber methodology
 */
function generateUpsellingSuggestions(serviceInfo: ServiceInfo, suggestions: string[]) {
  const serviceName = serviceInfo.name
  
  // Service-specific upselling recommendations
  if (serviceName === 'Haircut') {
    suggestions.push('Enhance your experience with our Signature Cut for personalized styling and finishing')
    suggestions.push('Add a premium beard service for a complete grooming experience')
  } else if (serviceName === 'Shave') {
    suggestions.push('Combine with a haircut for our popular Haircut & Shave package')
    suggestions.push('Upgrade to our Beard Service for ongoing maintenance and styling')
  } else if (serviceName === 'Beard Service') {
    suggestions.push('Complete your look with a precision haircut')
    suggestions.push('Consider our Grooming Package for the full luxury experience')
  }
  
  // Category-based suggestions
  if (serviceInfo.category === 'standard') {
    suggestions.push('Upgrade to a premium service for enhanced techniques and luxury amenities')
  } else if (serviceInfo.category === 'signature') {
    suggestions.push('Explore our Executive Package for the ultimate Six Figure Barber experience')
  }
  
  // Seasonal and special occasion suggestions
  const month = new Date().getMonth()
  if (month === 11 || month === 0) { // December or January
    suggestions.push('New Year special: Book a premium service to start the year looking your absolute best')
  } else if (month >= 4 && month <= 6) { // May to July - wedding season
    suggestions.push('Wedding season special: Our Executive Package ensures you look perfect for special occasions')
  }
}

/**
 * Real-time validation as user types/selects
 */
export function validateField(fieldName: string, value: any, bookingData: Partial<BookingData>): ValidationError[] {
  const errors: ValidationError[] = []
  
  switch (fieldName) {
    case 'date':
      if (value) {
        const appointmentDate = typeof value === 'string' ? parseISO(value) : value
        const now = new Date()
        
        if (isBefore(startOfDay(appointmentDate), startOfDay(now))) {
          errors.push({
            field: 'date',
            message: 'Cannot book appointments in the past',
            severity: 'error',
            code: 'PAST_DATE'
          })
        }
      }
      break
      
    case 'time':
      if (value && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
        errors.push({
          field: 'time',
          message: 'Please enter a valid time in HH:MM format',
          severity: 'error',
          code: 'INVALID_FORMAT'
        })
      }
      break
      
    case 'email':
      if (value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          errors.push({
            field: 'email',
            message: 'Please enter a valid email address',
            severity: 'error',
            code: 'INVALID_EMAIL'
          })
        }
      }
      break
  }
  
  return errors
}

/**
 * Show user-friendly validation messages
 */
export function showValidationErrors(validationResult: ValidationResult) {
  // Show errors as error toasts
  validationResult.errors.forEach(error => {
    toast.error(error.message, {
      description: getFieldDescription(error.field),
      duration: 5000
    })
  })
  
  // Show warnings as warning toasts
  validationResult.warnings.forEach(warning => {
    if (warning.severity === 'warning') {
      toast.warning(warning.message, {
        description: getFieldDescription(warning.field),
        duration: 4000
      })
    } else {
      toast.info(warning.message, {
        description: getFieldDescription(warning.field),
        duration: 3000
      })
    }
  })
  
  // Show suggestions as info toasts
  validationResult.suggestions.forEach(suggestion => {
    toast.info(suggestion, {
      description: 'Six Figure Barber Experience',
      duration: 4000
    })
  })
}

/**
 * Get user-friendly field descriptions for error messages
 */
function getFieldDescription(field: string): string {
  const descriptions: Record<string, string> = {
    date: 'Please select a valid appointment date',
    time: 'Please choose an available time slot',
    service: 'Please select from our premium service menu',
    firstName: 'Required for personalized service',
    lastName: 'Required for appointment confirmation',
    email: 'Used for appointment reminders and confirmations',
    phone: 'Used for appointment confirmations and updates',
    notes: 'Help us prepare for your premium experience',
    recurringPattern: 'Choose how often you\'d like to schedule appointments'
  }
  
  return descriptions[field] || 'Please review this field'
}

/**
 * Get available time slots with validation
 */
export async function getValidatedTimeSlots(
  date: Date,
  serviceId: string,
  barberId?: number
): Promise<string[]> {
  try {
    // This would normally call your API
    const response = await fetch(`/api/v1/appointments/slots?date=${format(date, 'yyyy-MM-dd')}&service_id=${serviceId}&barber_id=${barberId || ''}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch time slots')
    }
    
    const data = await response.json()
    return data.slots?.filter((slot: any) => slot.available)?.map((slot: any) => slot.time) || []
    
  } catch (error) {
    console.error('Error fetching time slots:', error)
    toast.error('Unable to load available times. Please try again.')
    return []
  }
}

export default validateBooking