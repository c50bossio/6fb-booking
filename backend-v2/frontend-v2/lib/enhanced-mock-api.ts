/**
 * Enhanced Mock API - Realistic Barbershop Business Logic
 * 
 * This provides a sophisticated mock API that simulates real barbershop operations
 * including business hours, barber availability, booking conflicts, and realistic
 * user flows. Perfect for polishing UX without external dependencies.
 */

import { format, addDays, startOfDay, addMinutes, parseISO, isAfter, isBefore, isWeekend } from 'date-fns'

// ===============================
// TYPES & INTERFACES
// ===============================

export interface Service {
  id: string
  name: string
  price: number
  duration: number // minutes
  description: string
  category: 'haircut' | 'beard' | 'combo' | 'specialty'
}

export interface Barber {
  id: string
  name: string
  specialties: string[]
  rating: number
  avatar?: string
  bio: string
}

export interface TimeSlot {
  time: string
  available: boolean
  barber_id?: string
  barber_name?: string
  is_next_available?: boolean
  reason?: 'booked' | 'break' | 'closed' | 'blocked'
}

export interface BusinessHours {
  day: string
  open: string
  close: string
  closed: boolean
}

export interface BookingData {
  service_id: string
  barber_id?: string
  date: string
  time: string
  client_info: {
    first_name: string
    last_name: string
    email: string
    phone: string
    notes?: string
  }
}

export interface BookingConfirmation {
  id: string
  confirmation_number: string
  service: Service
  barber: Barber
  date: string
  time: string
  end_time: string
  client_info: BookingData['client_info']
  total_price: number
  status: 'confirmed' | 'pending' | 'cancelled'
  created_at: string
}

// ===============================
// MOCK DATA STORE
// ===============================

class MockDataStore {
  private bookings: Map<string, BookingConfirmation> = new Map()
  private blockedSlots: Set<string> = new Set()

  constructor() {
    this.initializeRealisticBookings()
  }

  private initializeRealisticBookings() {
    // Add some existing bookings to make calendar feel realistic
    const today = new Date()
    
    // Today's bookings
    this.addMockBooking(format(today, 'yyyy-MM-dd'), '10:00', 'haircut', 'alex-thompson')
    this.addMockBooking(format(today, 'yyyy-MM-dd'), '14:30', 'combo', 'alex-thompson')
    
    // Tomorrow's bookings
    const tomorrow = addDays(today, 1)
    this.addMockBooking(format(tomorrow, 'yyyy-MM-dd'), '09:30', 'beard', 'alex-thompson')
    this.addMockBooking(format(tomorrow, 'yyyy-MM-dd'), '15:00', 'haircut', 'alex-thompson')
    
    // Block some lunch hours
    this.blockedSlots.add(`${format(today, 'yyyy-MM-dd')}-12:00`)
    this.blockedSlots.add(`${format(today, 'yyyy-MM-dd')}-12:30`)
    this.blockedSlots.add(`${format(today, 'yyyy-MM-dd')}-13:00`)
  }

  private addMockBooking(date: string, time: string, serviceId: string, barberId: string) {
    const service = SERVICES.find(s => s.id === serviceId)!
    const barber = BARBERS.find(b => b.id === barberId)!
    
    const booking: BookingConfirmation = {
      id: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      confirmation_number: `BKD${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      service,
      barber,
      date,
      time,
      end_time: format(addMinutes(parseISO(`${date}T${time}:00`), service.duration), 'HH:mm'),
      client_info: {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '(555) 123-4567'
      },
      total_price: service.price,
      status: 'confirmed',
      created_at: new Date().toISOString()
    }
    
    this.bookings.set(`${date}-${time}`, booking)
  }

  isSlotBooked(date: string, time: string): boolean {
    return this.bookings.has(`${date}-${time}`) || this.blockedSlots.has(`${date}-${time}`)
  }

  addBooking(booking: BookingConfirmation): void {
    this.bookings.set(`${booking.date}-${booking.time}`, booking)
  }

  getBooking(date: string, time: string): BookingConfirmation | undefined {
    return this.bookings.get(`${date}-${time}`)
  }

  getAllBookings(): BookingConfirmation[] {
    return Array.from(this.bookings.values())
  }
}

// ===============================
// BUSINESS DATA
// ===============================

export const SERVICES: Service[] = [
  {
    id: 'haircut',
    name: 'Classic Haircut',
    price: 35,
    duration: 30,
    description: 'Professional haircut with wash and style',
    category: 'haircut'
  },
  {
    id: 'beard',
    name: 'Beard Trim & Shape',
    price: 25,
    duration: 20,
    description: 'Precision beard trimming and shaping',
    category: 'beard'
  },
  {
    id: 'combo',
    name: 'Haircut + Beard Combo',
    price: 55,
    duration: 45,
    description: 'Complete grooming package',
    category: 'combo'
  },
  {
    id: 'wash-style',
    name: 'Wash & Style',
    price: 30,
    duration: 25,
    description: 'Professional wash and styling',
    category: 'haircut'
  },
  {
    id: 'hot-towel',
    name: 'Hot Towel Treatment',
    price: 45,
    duration: 35,
    description: 'Luxurious hot towel shave experience',
    category: 'specialty'
  }
]

export const BARBERS: Barber[] = [
  {
    id: 'alex-thompson',
    name: 'Alex Thompson',
    specialties: ['Classic cuts', 'Beard styling', 'Hot towel shaves'],
    rating: 4.9,
    bio: 'Master barber with 12+ years experience. Specialist in classic and modern cuts.'
  },
  {
    id: 'mike-rodriguez',
    name: 'Mike Rodriguez',
    specialties: ['Fades', 'Modern styles', 'Color'],
    rating: 4.8,
    bio: 'Creative stylist focused on contemporary trends and precision fades.'
  }
]

export const BUSINESS_HOURS: BusinessHours[] = [
  { day: 'monday', open: '09:00', close: '18:00', closed: false },
  { day: 'tuesday', open: '09:00', close: '18:00', closed: false },
  { day: 'wednesday', open: '09:00', close: '18:00', closed: false },
  { day: 'thursday', open: '09:00', close: '20:00', closed: false },
  { day: 'friday', open: '09:00', close: '20:00', closed: false },
  { day: 'saturday', open: '08:00', close: '17:00', closed: false },
  { day: 'sunday', open: '10:00', close: '16:00', closed: false }
]

// ===============================
// BUSINESS LOGIC
// ===============================

const dataStore = new MockDataStore()

// Simulate realistic API delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Get day of week for business hours
const getDayOfWeek = (date: string): string => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[new Date(date).getDay()]
}

// Check if time is within business hours
const isWithinBusinessHours = (date: string, time: string): boolean => {
  const dayOfWeek = getDayOfWeek(date)
  const businessDay = BUSINESS_HOURS.find(h => h.day === dayOfWeek)
  
  if (!businessDay || businessDay.closed) return false
  
  const timeNum = parseInt(time.replace(':', ''))
  const openNum = parseInt(businessDay.open.replace(':', ''))
  const closeNum = parseInt(businessDay.close.replace(':', ''))
  
  return timeNum >= openNum && timeNum < closeNum
}

// Generate time slots for a day
const generateTimeSlots = (date: string, serviceDuration: number): TimeSlot[] => {
  const slots: TimeSlot[] = []
  const dayOfWeek = getDayOfWeek(date)
  const businessDay = BUSINESS_HOURS.find(h => h.day === dayOfWeek)
  
  if (!businessDay || businessDay.closed) {
    return slots
  }
  
  // Generate 30-minute slots during business hours
  const startTime = businessDay.open
  const endTime = businessDay.close
  
  let currentTime = startTime
  
  while (currentTime < endTime) {
    const isBooked = dataStore.isSlotBooked(date, currentTime)
    const isValidTime = isWithinBusinessHours(date, currentTime)
    
    // Skip lunch break (12:00 - 13:30)
    const isLunchBreak = currentTime >= '12:00' && currentTime <= '13:30'
    
    slots.push({
      time: currentTime,
      available: !isBooked && isValidTime && !isLunchBreak,
      barber_id: 'alex-thompson',
      barber_name: 'Alex Thompson',
      reason: isBooked ? 'booked' : isLunchBreak ? 'break' : undefined
    })
    
    // Add 30 minutes
    const [hours, minutes] = currentTime.split(':').map(Number)
    const nextMinutes = minutes + 30
    if (nextMinutes >= 60) {
      currentTime = `${(hours + 1).toString().padStart(2, '0')}:${(nextMinutes - 60).toString().padStart(2, '0')}`
    } else {
      currentTime = `${hours.toString().padStart(2, '0')}:${nextMinutes.toString().padStart(2, '0')}`
    }
  }
  
  return slots
}

// Find next available slot
const findNextAvailableSlot = (startDate: string, serviceDuration: number): { date: string, time: string } | null => {
  let checkDate = new Date(startDate)
  
  // Check next 30 days
  for (let i = 0; i < 30; i++) {
    const dateStr = format(checkDate, 'yyyy-MM-dd')
    const slots = generateTimeSlots(dateStr, serviceDuration)
    const available = slots.find(slot => slot.available)
    
    if (available) {
      return { date: dateStr, time: available.time }
    }
    
    checkDate = addDays(checkDate, 1)
  }
  
  return null
}

// ===============================
// ENHANCED MOCK API
// ===============================

export const enhancedMockAPI = {
  // Get available services
  getServices: async (): Promise<Service[]> => {
    await delay(150) // Realistic API delay
    return SERVICES
  },

  // Get available barbers
  getBarbers: async (): Promise<Barber[]> => {
    await delay(200)
    return BARBERS
  },

  // Get available slots for a specific date and service
  getAvailableSlots: async (date: string, serviceId?: string): Promise<{
    slots: TimeSlot[]
    next_available?: { date: string, time: string }
    business_hours: BusinessHours
  }> => {
    await delay(300) // Simulate more complex calculation
    
    const service = serviceId ? SERVICES.find(s => s.id === serviceId) : SERVICES[0]
    const serviceDuration = service?.duration || 30
    
    const slots = generateTimeSlots(date, serviceDuration)
    const businessDay = BUSINESS_HOURS.find(h => h.day === getDayOfWeek(date))!
    
    // Find next available if no slots today
    let nextAvailable
    if (!slots.some(slot => slot.available)) {
      nextAvailable = findNextAvailableSlot(date, serviceDuration)
    }
    
    return {
      slots,
      next_available: nextAvailable,
      business_hours: businessDay
    }
  },

  // Create a booking
  createBooking: async (bookingData: BookingData): Promise<BookingConfirmation> => {
    await delay(800) // Simulate booking processing
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('This time slot was just booked by another customer. Please select a different time.')
    }
    
    const service = SERVICES.find(s => s.id === bookingData.service_id)!
    const barber = BARBERS.find(b => b.id === bookingData.barber_id) || BARBERS[0]
    
    const booking: BookingConfirmation = {
      id: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      confirmation_number: `BKD${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      service,
      barber,
      date: bookingData.date,
      time: bookingData.time,
      end_time: format(addMinutes(parseISO(`${bookingData.date}T${bookingData.time}:00`), service.duration), 'HH:mm'),
      client_info: bookingData.client_info,
      total_price: service.price,
      status: 'confirmed',
      created_at: new Date().toISOString()
    }
    
    // Add to our mock store
    dataStore.addBooking(booking)
    
    return booking
  },

  // Get booking by confirmation number
  getBooking: async (confirmationNumber: string): Promise<BookingConfirmation | null> => {
    await delay(200)
    
    const booking = dataStore.getAllBookings().find(b => b.confirmation_number === confirmationNumber)
    return booking || null
  },

  // Get all bookings (for calendar view)
  getAllBookings: async (): Promise<BookingConfirmation[]> => {
    await delay(250)
    return dataStore.getAllBookings()
  },

  // Simulate payment processing
  processPayment: async (bookingId: string, paymentMethod: string): Promise<{
    success: boolean
    payment_intent_id?: string
    error?: string
  }> => {
    await delay(1200) // Realistic payment processing time
    
    // Simulate payment failures occasionally
    if (Math.random() < 0.03) { // 3% failure rate
      return {
        success: false,
        error: 'Your payment method was declined. Please try a different card.'
      }
    }
    
    return {
      success: true,
      payment_intent_id: `pi_${Math.random().toString(36).substr(2, 24)}`
    }
  },

  // Get business information
  getBusinessInfo: async (): Promise<{
    name: string
    address: string
    phone: string
    email: string
    business_hours: BusinessHours[]
  }> => {
    await delay(100)
    
    return {
      name: 'Six Figure Barber Studio',
      address: '123 Main Street, Downtown, NY 10001',
      phone: '(555) 123-CUTS',
      email: 'info@sixfigurebarber.com',
      business_hours: BUSINESS_HOURS
    }
  }
}

// Legacy API compatibility (for existing components)
export const appointmentsAPI = {
  getSlots: enhancedMockAPI.getAvailableSlots
}

export default enhancedMockAPI