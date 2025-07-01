import { addDays, addHours, addMinutes, startOfWeek, setHours, setMinutes, format, subDays, subMonths } from 'date-fns'

export interface MockClient {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  created_at: string
  last_visit?: string
  total_visits: number
  total_spent: number
  notes?: string
}

export interface MockBarber {
  id: number
  first_name: string
  last_name: string
  email: string
  phone?: string
  role: string
  specialties: string[]
  rating: number
  availability?: any
}

export interface MockService {
  id: number
  name: string
  description?: string
  duration_minutes: number
  price: number
  category: string
}

export interface MockAppointment {
  id: number
  client_id: number
  client_name: string
  client_email: string
  client_phone?: string
  barber_id: number
  barber_name: string
  service_id: number
  service_name: string
  start_time: string
  end_time: string
  duration_minutes: number
  price: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no-show'
  notes?: string
  recurring_pattern_id?: number
}

export interface MockRecurringPattern {
  id: number
  client_id: number
  pattern_type: 'weekly' | 'biweekly' | 'monthly'
  preferred_time: string
  duration_minutes: number
  service_id: number
  barber_id: number
  start_date: string
  end_date?: string
  is_active: boolean
}

export function generateMockData() {
  // Mock Barbers
  const barbers: MockBarber[] = [
    {
      id: 1,
      first_name: "Marcus",
      last_name: "Johnson",
      email: "marcus@bookedbarber.com",
      phone: "(555) 123-4567",
      role: "barber",
      specialties: ["Fades", "Beard Sculpting", "Hair Design"],
      rating: 4.9
    },
    {
      id: 2,
      first_name: "David",
      last_name: "Chen",
      email: "david@bookedbarber.com",
      phone: "(555) 234-5678",
      role: "barber",
      specialties: ["Classic Cuts", "Hot Towel Shaves", "Hair Color"],
      rating: 4.8
    },
    {
      id: 3,
      first_name: "Tyrell",
      last_name: "Washington",
      email: "tyrell@bookedbarber.com",
      phone: "(555) 345-6789",
      role: "barber",
      specialties: ["Locs", "Braids", "Natural Hair"],
      rating: 4.9
    },
    {
      id: 4,
      first_name: "Carlos",
      last_name: "Rodriguez",
      email: "carlos@bookedbarber.com",
      phone: "(555) 456-7890",
      role: "barber",
      specialties: ["Designs", "Kids Cuts", "Beard Grooming"],
      rating: 4.7
    },
    {
      id: 5,
      first_name: "Jamal",
      last_name: "Williams",
      email: "jamal@bookedbarber.com",
      phone: "(555) 567-8901",
      role: "barber",
      specialties: ["Razor Work", "Tapers", "Line Ups"],
      rating: 4.8
    }
  ]

  // Mock Services
  const services: MockService[] = [
    { id: 1, name: "Classic Cut", duration_minutes: 30, price: 35, category: "haircut" },
    { id: 2, name: "Fade Cut", duration_minutes: 45, price: 45, category: "haircut" },
    { id: 3, name: "Premium Cut & Style", duration_minutes: 60, price: 65, category: "haircut" },
    { id: 4, name: "Beard Trim", duration_minutes: 20, price: 25, category: "beard" },
    { id: 5, name: "Beard Sculpting", duration_minutes: 30, price: 35, category: "beard" },
    { id: 6, name: "Hot Towel Shave", duration_minutes: 45, price: 50, category: "shave" },
    { id: 7, name: "Kids Cut (12 & under)", duration_minutes: 25, price: 25, category: "kids" },
    { id: 8, name: "Hair Design", duration_minutes: 90, price: 85, category: "specialty" },
    { id: 9, name: "Loc Maintenance", duration_minutes: 120, price: 120, category: "specialty" },
    { id: 10, name: "Edge Up", duration_minutes: 15, price: 20, category: "quick" }
  ]

  // Mock Clients
  const clients: MockClient[] = [
    {
      id: 1,
      first_name: "John",
      last_name: "Davis",
      email: "john.davis@email.com",
      phone: "(555) 111-1111",
      created_at: subMonths(new Date(), 6).toISOString(),
      last_visit: subDays(new Date(), 2).toISOString(),
      total_visits: 24,
      total_spent: 1080,
      notes: "Prefers appointments after 5pm. Weekly regular."
    },
    {
      id: 2,
      first_name: "Michael",
      last_name: "Brown",
      email: "m.brown@email.com",
      phone: "(555) 222-2222",
      created_at: subMonths(new Date(), 3).toISOString(),
      last_visit: subDays(new Date(), 7).toISOString(),
      total_visits: 12,
      total_spent: 540
    },
    {
      id: 3,
      first_name: "Robert",
      last_name: "Wilson",
      email: "robert.w@email.com",
      phone: "(555) 333-3333",
      created_at: subMonths(new Date(), 9).toISOString(),
      last_visit: subDays(new Date(), 1).toISOString(),
      total_visits: 36,
      total_spent: 1620,
      notes: "VIP client. Bi-weekly appointments."
    },
    {
      id: 4,
      first_name: "James",
      last_name: "Taylor",
      email: "james.taylor@email.com",
      phone: "(555) 444-4444",
      created_at: subMonths(new Date(), 1).toISOString(),
      last_visit: subDays(new Date(), 14).toISOString(),
      total_visits: 2,
      total_spent: 90
    },
    {
      id: 5,
      first_name: "William",
      last_name: "Anderson",
      email: "w.anderson@email.com",
      phone: "(555) 555-5555",
      created_at: subMonths(new Date(), 4).toISOString(),
      last_visit: subDays(new Date(), 3).toISOString(),
      total_visits: 16,
      total_spent: 800,
      notes: "Allergic to certain hair products. Use hypoallergenic only."
    },
    // Add more clients...
    ...Array.from({ length: 15 }, (_, i) => ({
      id: i + 6,
      first_name: ["Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Paul", "Steven", "Kevin", "Brian", "George", "Edward", "Ronald", "Timothy", "Jason", "Jeffrey"][i],
      last_name: ["Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Garcia", "Martinez", "Robinson", "Clark", "Rodriguez", "Lewis", "Lee", "Walker", "Hall"][i],
      email: `client${i + 6}@email.com`,
      phone: `(555) ${String(i + 6).padStart(3, '0')}-${String(i + 6).padStart(4, '0')}`,
      created_at: subMonths(new Date(), Math.floor(Math.random() * 12)).toISOString(),
      last_visit: subDays(new Date(), Math.floor(Math.random() * 30)).toISOString(),
      total_visits: Math.floor(Math.random() * 20) + 1,
      total_spent: (Math.floor(Math.random() * 20) + 1) * 45
    }))
  ]

  // Generate appointments for the current month and surrounding days
  const appointments: MockAppointment[] = []
  const today = new Date()
  
  // Get the current month's first and last day
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
  
  // Also include a week before and after for better navigation
  const startDate = subDays(firstDayOfMonth, 7)
  const endDate = addDays(lastDayOfMonth, 7)
  
  let appointmentId = 1

  // Generate appointments for each day in the range
  let currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay()
    
    // Skip Sundays (closed)
    if (dayOfWeek === 0) {
      currentDate = addDays(currentDate, 1)
      continue
    }
    
    // Determine number of appointments based on day
    const isWeekend = dayOfWeek === 6
    const isPast = currentDate < today
    const isToday = currentDate.toDateString() === today.toDateString()
    
    // Vary appointment count for more realistic data
    const baseCount = isWeekend ? 20 : 30
    const variance = Math.floor(Math.random() * 10) - 5 // +/- 5 appointments
    const appointmentCount = Math.max(10, baseCount + variance) // At least 10 appointments
    
    // Generate appointments for this day
    for (let i = 0; i < appointmentCount; i++) {
      const barber = barbers[Math.floor(Math.random() * barbers.length)]
      const client = clients[Math.floor(Math.random() * clients.length)]
      const service = services[Math.floor(Math.random() * services.length)]
      
      // Generate appointment time (9 AM - 8 PM)
      const hour = 9 + Math.floor(Math.random() * 11)
      const minute = Math.random() > 0.5 ? 0 : 30
      const startTime = setMinutes(setHours(currentDate, hour), minute)
      const endTime = addMinutes(startTime, service.duration_minutes)
      
      // Determine status
      let status: MockAppointment['status'] = 'confirmed'
      if (isPast) {
        status = Math.random() > 0.1 ? 'completed' : 'no-show'
      } else if (isToday) {
        // Today's appointments
        const currentHour = new Date().getHours()
        if (hour < currentHour) {
          status = Math.random() > 0.05 ? 'completed' : 'no-show'
        } else if (hour === currentHour) {
          status = 'confirmed'
        } else {
          status = Math.random() > 0.9 ? 'pending' : 'confirmed'
        }
      } else {
        // Future appointments
        const rand = Math.random()
        if (rand > 0.95) status = 'cancelled'
        else if (rand > 0.85) status = 'pending'
      }
      
      appointments.push({
        id: appointmentId++,
        client_id: client.id,
        client_name: `${client.first_name} ${client.last_name}`,
        client_email: client.email,
        client_phone: client.phone,
        barber_id: barber.id,
        barber_name: `${barber.first_name} ${barber.last_name}`,
        service_id: service.id,
        service_name: service.name,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: service.duration_minutes,
        price: service.price,
        status,
        notes: Math.random() > 0.8 ? "Regular client - likes fade extra high" : undefined,
        recurring_pattern_id: Math.random() > 0.7 ? Math.floor(Math.random() * 5) + 1 : undefined
      })
    }
    
    // Move to the next day
    currentDate = addDays(currentDate, 1)
  }

  // Sort appointments by start time
  appointments.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  // Generate recurring patterns
  const recurringPatterns: MockRecurringPattern[] = [
    {
      id: 1,
      client_id: 1,
      pattern_type: 'weekly',
      preferred_time: '17:00',
      duration_minutes: 45,
      service_id: 2,
      barber_id: 1,
      start_date: subMonths(new Date(), 3).toISOString(),
      is_active: true
    },
    {
      id: 2,
      client_id: 3,
      pattern_type: 'biweekly',
      preferred_time: '10:00',
      duration_minutes: 60,
      service_id: 3,
      barber_id: 2,
      start_date: subMonths(new Date(), 6).toISOString(),
      is_active: true
    },
    {
      id: 3,
      client_id: 5,
      pattern_type: 'monthly',
      preferred_time: '14:00',
      duration_minutes: 30,
      service_id: 1,
      barber_id: 3,
      start_date: subMonths(new Date(), 2).toISOString(),
      is_active: true
    },
    {
      id: 4,
      client_id: 2,
      pattern_type: 'weekly',
      preferred_time: '18:30',
      duration_minutes: 20,
      service_id: 4,
      barber_id: 1,
      start_date: subMonths(new Date(), 1).toISOString(),
      is_active: true
    },
    {
      id: 5,
      client_id: 7,
      pattern_type: 'biweekly',
      preferred_time: '11:00',
      duration_minutes: 45,
      service_id: 2,
      barber_id: 4,
      start_date: subMonths(new Date(), 4).toISOString(),
      end_date: addMonths(new Date(), 2).toISOString(),
      is_active: true
    }
  ]

  // Generate analytics data
  const analyticsData = {
    revenue: {
      today: appointments
        .filter(apt => apt.status === 'completed' && isSameDay(new Date(apt.start_time), today))
        .reduce((sum, apt) => sum + apt.price, 0),
      thisWeek: appointments
        .filter(apt => apt.status === 'completed' && isThisWeek(new Date(apt.start_time)))
        .reduce((sum, apt) => sum + apt.price, 0),
      thisMonth: appointments
        .filter(apt => apt.status === 'completed' && isThisMonth(new Date(apt.start_time)))
        .reduce((sum, apt) => sum + apt.price, 0),
      growth: 12.5 // percentage
    },
    appointments: {
      today: appointments.filter(apt => isSameDay(new Date(apt.start_time), today)).length,
      thisWeek: appointments.filter(apt => isThisWeek(new Date(apt.start_time))).length,
      completed: appointments.filter(apt => apt.status === 'completed').length,
      noShows: appointments.filter(apt => apt.status === 'no-show').length
    },
    topServices: services
      .map(service => ({
        ...service,
        count: appointments.filter(apt => apt.service_id === service.id).length,
        revenue: appointments
          .filter(apt => apt.service_id === service.id && apt.status === 'completed')
          .reduce((sum, apt) => sum + apt.price, 0)
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    clientRetention: {
      returningClients: 78,
      newClients: 22,
      averageVisitsPerClient: 4.5
    }
  }

  return {
    barbers,
    clients,
    services,
    appointments,
    recurringPatterns,
    analyticsData
  }
}

// Helper functions
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.toDateString() === date2.toDateString()
}

function isThisWeek(date: Date): boolean {
  const now = new Date()
  const weekStart = startOfWeek(now)
  const weekEnd = addDays(weekStart, 7)
  return date >= weekStart && date < weekEnd
}

function isThisMonth(date: Date): boolean {
  const now = new Date()
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
}

function addMonths(date: Date, months: number): Date {
  const newDate = new Date(date)
  newDate.setMonth(newDate.getMonth() + months)
  return newDate
}