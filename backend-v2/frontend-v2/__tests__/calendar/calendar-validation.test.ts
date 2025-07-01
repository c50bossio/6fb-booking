import { 
  validateAppointment, 
  sanitizeAppointment, 
  validateTimeSlotAvailability,
  generateAppointmentSuggestions
} from '@/lib/calendar-validation'
import { addDays, addHours, addMinutes, format } from 'date-fns'
import type { AppointmentCreate, Appointment } from '@/types/calendar'

describe('Calendar Validation', () => {
  const baseAppointment: AppointmentCreate = {
    service_name: 'Haircut',
    start_time: addHours(new Date(), 2).toISOString(),
    duration_minutes: 60,
    client_name: 'John Doe',
    client_email: 'john@example.com',
    client_phone: '+1234567890',
    barber_id: 1,
    status: 'pending',
    price: 50,
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '10:00'
  }

  describe('validateAppointment', () => {
    it('validates a correct appointment', () => {
      const result = validateAppointment(baseAppointment)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('requires service name', () => {
      const appointment = { ...baseAppointment, service_name: '' }
      const result = validateAppointment(appointment)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Service name is required')
    })

    it('requires start time', () => {
      const appointment = { ...baseAppointment, start_time: '' }
      const result = validateAppointment(appointment)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Start time is required')
    })

    it('rejects invalid date format', () => {
      const appointment = { ...baseAppointment, start_time: 'invalid-date' }
      const result = validateAppointment(appointment)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid appointment date/time')
    })

    it('rejects appointments too far in the past', () => {
      const appointment = { 
        ...baseAppointment, 
        start_time: addMinutes(new Date(), -10).toISOString() 
      }
      const result = validateAppointment(appointment)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('advance'))).toBe(true)
    })

    it('rejects appointments too far in the future', () => {
      const appointment = { 
        ...baseAppointment, 
        start_time: addDays(new Date(), 400).toISOString() 
      }
      const result = validateAppointment(appointment)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('1 year'))).toBe(true)
    })

    it('validates duration constraints', () => {
      const shortAppointment = { ...baseAppointment, duration_minutes: 5 }
      const longAppointment = { ...baseAppointment, duration_minutes: 500 }
      
      expect(validateAppointment(shortAppointment).isValid).toBe(false)
      expect(validateAppointment(longAppointment).isValid).toBe(false)
    })

    it('validates client name length', () => {
      const shortName = { ...baseAppointment, client_name: 'A' }
      const longName = { ...baseAppointment, client_name: 'A'.repeat(60) }
      
      expect(validateAppointment(shortName).isValid).toBe(false)
      expect(validateAppointment(longName).isValid).toBe(false)
    })

    it('validates email format', () => {
      const invalidEmail = { ...baseAppointment, client_email: 'invalid-email' }
      const result = validateAppointment(invalidEmail)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid email format')
    })

    it('validates phone format', () => {
      const invalidPhone = { ...baseAppointment, client_phone: 'abc123' }
      const result = validateAppointment(invalidPhone)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid phone number format')
    })

    it('validates price constraints', () => {
      const negativePrice = { ...baseAppointment, price: -10 }
      const result = validateAppointment(negativePrice)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Price cannot be negative')
    })

    it('warns about business hours', () => {
      const earlyAppointment = { 
        ...baseAppointment, 
        start_time: new Date().setHours(5, 0, 0, 0).toString() 
      }
      const result = validateAppointment(earlyAppointment)
      
      expect(result.warnings?.some(warning => warning.includes('business hours'))).toBe(true)
    })

    it('detects scheduling conflicts', () => {
      const existingAppointments: Appointment[] = [{
        id: 1,
        start_time: addHours(new Date(), 2).toISOString(),
        service_name: 'Existing Service',
        barber_id: 1,
        status: 'confirmed',
        duration_minutes: 60
      }]

      const conflictingAppointment = {
        ...baseAppointment,
        start_time: addMinutes(addHours(new Date(), 2), 30).toISOString() // 30 min overlap
      }

      const result = validateAppointment(conflictingAppointment, existingAppointments)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('overlaps'))).toBe(true)
    })
  })

  describe('sanitizeAppointment', () => {
    it('trims and limits string fields', () => {
      const dirtyAppointment = {
        ...baseAppointment,
        service_name: '  Haircut with extra spaces  ',
        client_name: '  John Doe  ',
        client_email: '  JOHN@EXAMPLE.COM  ',
        notes: 'A'.repeat(600) // Exceeds 500 char limit
      }

      const sanitized = sanitizeAppointment(dirtyAppointment)

      expect(sanitized.service_name).toBe('Haircut with extra spaces')
      expect(sanitized.client_name).toBe('John Doe')
      expect(sanitized.client_email).toBe('john@example.com')
      expect(sanitized.notes?.length).toBeLessThanOrEqual(500)
    })

    it('cleans phone numbers', () => {
      const appointment = {
        ...baseAppointment,
        client_phone: '(123) 456-7890'
      }

      const sanitized = sanitizeAppointment(appointment)
      expect(sanitized.client_phone).toBe('1234567890')
    })

    it('constrains numeric fields', () => {
      const appointment = {
        ...baseAppointment,
        duration_minutes: 5, // Below minimum
        price: 123.456 // Should round to 2 decimals
      }

      const sanitized = sanitizeAppointment(appointment)
      expect(sanitized.duration_minutes).toBeGreaterThanOrEqual(15)
      expect(sanitized.price).toBe(123.46)
    })
  })

  describe('validateTimeSlotAvailability', () => {
    const testDate = new Date()
    const existingAppointments: Appointment[] = [{
      id: 1,
      start_time: new Date(testDate).setHours(10, 0, 0, 0).toString(),
      service_name: 'Existing',
      barber_id: 1,
      status: 'confirmed',
      duration_minutes: 60
    }]

    it('validates available time slot', () => {
      const result = validateTimeSlotAvailability(
        testDate, 
        '12:00', 
        60, 
        1, 
        existingAppointments
      )

      expect(result.isValid).toBe(true)
    })

    it('rejects conflicting time slot', () => {
      const result = validateTimeSlotAvailability(
        testDate, 
        '10:30', // Conflicts with 10:00-11:00 appointment
        60, 
        1, 
        existingAppointments
      )

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Time slot conflicts with existing appointments')
    })

    it('rejects slots outside business hours', () => {
      const earlyResult = validateTimeSlotAvailability(testDate, '05:00', 60, 1, [])
      const lateResult = validateTimeSlotAvailability(testDate, '23:00', 60, 1, [])

      expect(earlyResult.isValid).toBe(false)
      expect(lateResult.isValid).toBe(false)
    })

    it('rejects invalid time format', () => {
      const result = validateTimeSlotAvailability(testDate, '25:00', 60, 1, [])

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid time format')
    })
  })

  describe('generateAppointmentSuggestions', () => {
    it('generates alternative time suggestions', () => {
      const failedAppointment = {
        ...baseAppointment,
        start_time: new Date().setHours(10, 0, 0, 0).toString()
      }

      const existingAppointments: Appointment[] = [{
        id: 1,
        start_time: new Date().setHours(10, 0, 0, 0).toString(),
        service_name: 'Existing',
        barber_id: 1,
        status: 'confirmed',
        duration_minutes: 60
      }]

      const suggestions = generateAppointmentSuggestions(
        failedAppointment, 
        existingAppointments
      )

      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.length).toBeLessThanOrEqual(5)
      
      suggestions.forEach(suggestion => {
        expect(suggestion.time).toMatch(/\d{1,2}:\d{2} [AP]M/)
        expect(suggestion.reason).toBe('Available time slot')
      })
    })

    it('returns empty array for invalid appointment data', () => {
      const invalidAppointment = {
        ...baseAppointment,
        start_time: '',
        barber_id: undefined
      }

      const suggestions = generateAppointmentSuggestions(invalidAppointment as any, [])
      expect(suggestions).toHaveLength(0)
    })
  })
})