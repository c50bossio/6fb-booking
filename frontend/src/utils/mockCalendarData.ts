// Mock data generator for demo calendar
import { CalendarAppointment } from '../components/calendar/PremiumCalendar'

interface MockClient {
  name: string
  phone: string
  email: string
}

interface MockService {
  name: string
  duration: number
  price: number
  description: string
}

// Realistic client names for demo data
const MOCK_CLIENTS: MockClient[] = [
  { name: 'Marcus Thompson', phone: '+1-555-0123', email: 'marcus.t@email.com' },
  { name: 'David Rodriguez', phone: '+1-555-0124', email: 'david.r@email.com' },
  { name: 'James Wilson', phone: '+1-555-0125', email: 'james.w@email.com' },
  { name: 'Michael Brown', phone: '+1-555-0126', email: 'michael.b@email.com' },
  { name: 'Chris Johnson', phone: '+1-555-0127', email: 'chris.j@email.com' },
  { name: 'Alex Parker', phone: '+1-555-0128', email: 'alex.p@email.com' },
  { name: 'Tyler Davis', phone: '+1-555-0129', email: 'tyler.d@email.com' },
  { name: 'Jordan Martinez', phone: '+1-555-0130', email: 'jordan.m@email.com' },
  { name: 'Ryan Garcia', phone: '+1-555-0131', email: 'ryan.g@email.com' },
  { name: 'Brandon Lee', phone: '+1-555-0132', email: 'brandon.l@email.com' },
  { name: 'Kevin White', phone: '+1-555-0133', email: 'kevin.w@email.com' },
  { name: 'Daniel Harris', phone: '+1-555-0134', email: 'daniel.h@email.com' }
]

// Professional barbershop services
const MOCK_SERVICES: MockService[] = [
  { name: 'Signature Fade', duration: 45, price: 45, description: 'Our signature skin fade with styling' },
  { name: 'Classic Cut', duration: 30, price: 35, description: 'Traditional scissors cut' },
  { name: 'Beard Trim', duration: 20, price: 25, description: 'Professional beard shaping' },
  { name: 'Hot Towel Shave', duration: 30, price: 40, description: 'Traditional straight razor shave' },
  { name: 'Cut & Beard Combo', duration: 60, price: 65, description: 'Full grooming experience' },
  { name: 'Buzz Cut', duration: 15, price: 25, description: 'Quick and clean buzz cut' },
  { name: 'Skin Fade', duration: 40, price: 42, description: 'Clean skin fade with blend' },
  { name: 'Mustache Trim', duration: 15, price: 20, description: 'Precision mustache grooming' },
  { name: 'Line Up', duration: 20, price: 30, description: 'Edge up and line work' },
  { name: 'Premium Cut & Style', duration: 75, price: 85, description: 'Complete cut with premium styling' }
]

// Barber profiles for demo
const MOCK_BARBERS = [
  { id: 1, name: 'Marcus Johnson', specialties: ['Fades', 'Beard Styling'], rating: 4.9 },
  { id: 2, name: 'Sarah Mitchell', specialties: ['Classic Cuts', 'Kids Cuts'], rating: 4.8 },
  { id: 3, name: 'Tony Rivera', specialties: ['Straight Razor', 'Hot Towel'], rating: 4.7 },
  { id: 4, name: 'Lisa Chen', specialties: ['Modern Styles', 'Color'], rating: 4.9 }
]

// Appointment statuses with realistic distribution
const APPOINTMENT_STATUSES: CalendarAppointment['status'][] = [
  'confirmed', 'confirmed', 'confirmed', 'confirmed', 'confirmed', // 50% confirmed
  'pending', 'pending', // 20% pending
  'completed', 'completed', 'completed', // 30% completed
  'cancelled' // 10% cancelled
]

// Generate a random date within the next 30 days
function getRandomFutureDate(): string {
  const today = new Date()
  const futureDate = new Date(today.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000)
  return futureDate.toISOString().split('T')[0]
}

// Generate random time during business hours (9 AM - 7 PM)
function getRandomBusinessTime(): string {
  const hours = Math.floor(Math.random() * 10) + 9 // 9-18 (6 PM)
  const minutes = Math.random() < 0.5 ? 0 : 30 // Either :00 or :30
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

// Calculate end time based on start time and duration
function calculateEndTime(startTime: string, duration: number): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const startDate = new Date()
  startDate.setHours(hours, minutes, 0, 0)

  const endDate = new Date(startDate.getTime() + duration * 60000)
  return endDate.toTimeString().slice(0, 5)
}

// Generate random notes for appointments
function getRandomNotes(): string {
  const notes = [
    'First time client',
    'Regular customer',
    'Prefers shorter on sides',
    'Wedding next week',
    'Job interview tomorrow',
    'Special occasion',
    'Usually gets #2 fade',
    'Sensitive skin',
    'Bring photo reference',
    ''
  ]
  return notes[Math.floor(Math.random() * notes.length)]
}

// Generate a single mock appointment
function generateMockAppointment(id: string): CalendarAppointment {
  const client = MOCK_CLIENTS[Math.floor(Math.random() * MOCK_CLIENTS.length)]
  const service = MOCK_SERVICES[Math.floor(Math.random() * MOCK_SERVICES.length)]
  const barber = MOCK_BARBERS[Math.floor(Math.random() * MOCK_BARBERS.length)]
  const status = APPOINTMENT_STATUSES[Math.floor(Math.random() * APPOINTMENT_STATUSES.length)]
  const date = getRandomFutureDate()
  const startTime = getRandomBusinessTime()
  const endTime = calculateEndTime(startTime, service.duration)

  return {
    id,
    title: service.name,
    client: client.name,
    clientId: parseInt(id) + 1000,
    barber: barber.name,
    barberId: barber.id,
    startTime,
    endTime,
    service: service.name,
    serviceId: MOCK_SERVICES.indexOf(service) + 1,
    price: service.price,
    status,
    date,
    notes: getRandomNotes(),
    duration: service.duration,
    clientPhone: client.phone,
    clientEmail: client.email
  }
}

// Generate multiple mock appointments for the demo
export function generateMockCalendarData(count: number = 25): CalendarAppointment[] {
  const appointments: CalendarAppointment[] = []

  for (let i = 1; i <= count; i++) {
    appointments.push(generateMockAppointment(i.toString()))
  }

  // Sort by date and time for better UX
  return appointments.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) return dateCompare
    return a.startTime.localeCompare(b.startTime)
  })
}

// Generate specific appointments for today to make demo more engaging
export function generateTodayAppointments(): CalendarAppointment[] {
  const today = new Date().toISOString().split('T')[0]
  const todayTimes = ['09:00', '10:30', '13:00', '15:30', '17:00']

  return todayTimes.map((time, index) => {
    const client = MOCK_CLIENTS[index % MOCK_CLIENTS.length]
    const service = MOCK_SERVICES[index % MOCK_SERVICES.length]
    const barber = MOCK_BARBERS[index % MOCK_BARBERS.length]

    return {
      id: `today-${index + 1}`,
      title: service.name,
      client: client.name,
      clientId: 2000 + index,
      barber: barber.name,
      barberId: barber.id,
      startTime: time,
      endTime: calculateEndTime(time, service.duration),
      service: service.name,
      serviceId: index + 1,
      price: service.price,
      status: index < 2 ? 'completed' : index < 4 ? 'confirmed' : 'pending',
      date: today,
      notes: index === 0 ? 'VIP client' : index === 2 ? 'First time visit' : '',
      duration: service.duration,
      clientPhone: client.phone,
      clientEmail: client.email
    }
  })
}

// Check if we're in demo mode
export function isDemoMode(): boolean {
  // Check if we're on demo routes or if no real user is authenticated
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname
    return pathname.includes('/demo') || pathname.includes('/calendar-demo')
  }
  return false
}

// Get mock barbers for demo
export function getMockBarbers() {
  return MOCK_BARBERS
}

// Get mock services for demo
export function getMockServices() {
  return MOCK_SERVICES.map((service, index) => ({
    id: index + 1,
    ...service
  }))
}
