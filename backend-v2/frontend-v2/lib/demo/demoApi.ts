import { generateMockData, MockClient, MockAppointment, MockService, MockRecurringPattern } from './mockData'

// Get mock data instance
let mockData = generateMockData()

// Helper to simulate API delay
const simulateDelay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms))

// Helper to generate IDs
const generateId = () => Date.now() + Math.floor(Math.random() * 1000)

// Demo API that mirrors the real API structure
export const demoApi = {
  // Auth endpoints (demo mode bypasses these)
  auth: {
    login: async () => {
      await simulateDelay(500)
      return {
        access_token: 'demo-token',
        user: mockData.barbers[0]
      }
    },
    logout: async () => {
      await simulateDelay(100)
      return { success: true }
    },
    getProfile: async () => {
      await simulateDelay(200)
      return mockData.barbers[0]
    }
  },

  // Appointments
  appointments: {
    list: async (params?: any) => {
      await simulateDelay(300)
      let appointments = [...mockData.appointments]
      
      // Filter by date if provided
      if (params?.date) {
        appointments = appointments.filter(apt => 
          new Date(apt.start_time).toDateString() === new Date(params.date).toDateString()
        )
      }
      
      // Filter by barber if provided
      if (params?.barber_id) {
        appointments = appointments.filter(apt => apt.barber_id === params.barber_id)
      }
      
      return {
        appointments,
        total: appointments.length
      }
    },
    
    create: async (data: any) => {
      await simulateDelay(500)
      const newAppointment: MockAppointment = {
        id: generateId(),
        client_id: data.client_id,
        client_name: mockData.clients.find(c => c.id === data.client_id)?.first_name + ' ' + 
                     mockData.clients.find(c => c.id === data.client_id)?.last_name || 'Unknown',
        client_email: mockData.clients.find(c => c.id === data.client_id)?.email || '',
        barber_id: data.barber_id || mockData.barbers[0].id,
        barber_name: mockData.barbers.find(b => b.id === data.barber_id)?.first_name + ' ' +
                     mockData.barbers.find(b => b.id === data.barber_id)?.last_name || 'Demo Barber',
        service_id: data.service_id,
        service_name: mockData.services.find(s => s.id === data.service_id)?.name || 'Service',
        start_time: data.start_time,
        end_time: data.end_time || new Date(new Date(data.start_time).getTime() + 60 * 60 * 1000).toISOString(),
        duration_minutes: data.duration_minutes || 60,
        price: mockData.services.find(s => s.id === data.service_id)?.price || 50,
        status: 'confirmed',
        notes: data.notes
      }
      
      mockData.appointments.push(newAppointment)
      return newAppointment
    },
    
    update: async (id: number, data: any) => {
      await simulateDelay(400)
      const index = mockData.appointments.findIndex(apt => apt.id === id)
      if (index !== -1) {
        mockData.appointments[index] = { ...mockData.appointments[index], ...data }
        return mockData.appointments[index]
      }
      throw new Error('Appointment not found')
    },
    
    cancel: async (id: number) => {
      await simulateDelay(300)
      const appointment = mockData.appointments.find(apt => apt.id === id)
      if (appointment) {
        appointment.status = 'cancelled'
        return appointment
      }
      throw new Error('Appointment not found')
    },
    
    getAvailableSlots: async (params: { date: string; service_id?: number }) => {
      await simulateDelay(300)
      
      // Generate mock time slots for the demo
      const slots = []
      const startHour = 9 // 9 AM
      const endHour = 17 // 5 PM
      const interval = 30 // 30 minute intervals
      
      // Parse the date
      const requestedDate = new Date(params.date)
      const now = new Date()
      const isToday = requestedDate.toDateString() === now.toDateString()
      
      // Generate time slots
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += interval) {
          // Skip past times if it's today
          if (isToday) {
            const slotTime = new Date(requestedDate)
            slotTime.setHours(hour, minute, 0, 0)
            if (slotTime <= now) continue
          }
          
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          
          // Randomly make some slots unavailable to simulate booked appointments
          const isAvailable = Math.random() > 0.3
          
          slots.push({
            time: timeString,
            available: isAvailable,
            is_next_available: false
          })
        }
      }
      
      // Mark the first available slot
      const firstAvailable = slots.find(slot => slot.available)
      if (firstAvailable) {
        firstAvailable.is_next_available = true
      }
      
      return {
        date: params.date,
        slots,
        next_available: firstAvailable ? {
          date: params.date,
          time: firstAvailable.time,
          datetime: `${params.date}T${firstAvailable.time}:00`
        } : null,
        business_hours: {
          start: '09:00',
          end: '17:00'
        },
        slot_duration_minutes: 30
      }
    }
  },

  // Clients
  clients: {
    search: async (query: string) => {
      await simulateDelay(200)
      const clients = mockData.clients.filter(client => 
        client.first_name.toLowerCase().includes(query.toLowerCase()) ||
        client.last_name.toLowerCase().includes(query.toLowerCase()) ||
        client.email.toLowerCase().includes(query.toLowerCase())
      )
      return { clients }
    },
    
    create: async (data: any) => {
      await simulateDelay(400)
      const newClient: MockClient = {
        id: generateId(),
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone || '',
        created_at: new Date().toISOString(),
        total_visits: 0,
        total_spent: 0
      }
      mockData.clients.push(newClient)
      return newClient
    },
    
    list: async () => {
      await simulateDelay(300)
      return { clients: mockData.clients }
    },
    
    get: async (id: number) => {
      await simulateDelay(200)
      const client = mockData.clients.find(c => c.id === id)
      if (!client) throw new Error('Client not found')
      return client
    }
  },

  // Services
  services: {
    list: async () => {
      await simulateDelay(200)
      return mockData.services
    },
    
    get: async (id: number) => {
      await simulateDelay(100)
      const service = mockData.services.find(s => s.id === id)
      if (!service) throw new Error('Service not found')
      return service
    }
  },

  // Bookings (client-facing)
  bookings: {
    getSlots: async (params: { date: string, service_id?: number }) => {
      await simulateDelay(300)
      const slots = []
      const date = new Date(params.date)
      
      // Generate available slots (9 AM to 7 PM)
      for (let hour = 9; hour < 19; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const slotTime = new Date(date)
          slotTime.setHours(hour, minute, 0, 0)
          
          // Check if slot is available (random for demo)
          if (Math.random() > 0.3) { // 70% availability
            slots.push(slotTime.toTimeString().slice(0, 5))
          }
        }
      }
      
      return { slots }
    },
    
    create: async (data: any) => {
      // Reuse appointment creation
      return demoApi.appointments.create(data)
    }
  },

  // Recurring appointments
  recurring: {
    list: async () => {
      await simulateDelay(300)
      return { patterns: mockData.recurringPatterns }
    },
    
    create: async (data: any) => {
      await simulateDelay(500)
      const newPattern: MockRecurringPattern = {
        id: generateId(),
        client_id: data.client_id,
        pattern_type: data.pattern_type,
        preferred_time: data.preferred_time,
        duration_minutes: data.duration_minutes,
        service_id: data.service_id,
        barber_id: data.barber_id || mockData.barbers[0].id,
        start_date: data.start_date,
        end_date: data.end_date,
        is_active: true
      }
      mockData.recurringPatterns.push(newPattern)
      return newPattern
    },
    
    update: async (id: number, data: any) => {
      await simulateDelay(400)
      const index = mockData.recurringPatterns.findIndex(p => p.id === id)
      if (index !== -1) {
        mockData.recurringPatterns[index] = { ...mockData.recurringPatterns[index], ...data }
        return mockData.recurringPatterns[index]
      }
      throw new Error('Pattern not found')
    },
    
    delete: async (id: number) => {
      await simulateDelay(300)
      const index = mockData.recurringPatterns.findIndex(p => p.id === id)
      if (index !== -1) {
        mockData.recurringPatterns.splice(index, 1)
        return { success: true }
      }
      throw new Error('Pattern not found')
    }
  },

  // Analytics
  analytics: {
    getOverview: async () => {
      await simulateDelay(400)
      return mockData.analyticsData
    },
    
    getRevenue: async (period: string) => {
      await simulateDelay(300)
      // Generate revenue data for charts
      const data = []
      const days = period === 'week' ? 7 : period === 'month' ? 30 : 90
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        data.push({
          date: date.toISOString().split('T')[0],
          revenue: Math.floor(Math.random() * 1000) + 500,
          appointments: Math.floor(Math.random() * 20) + 10
        })
      }
      
      return { data }
    }
  },

  // Barbers
  barbers: {
    list: async () => {
      await simulateDelay(200)
      return { barbers: mockData.barbers }
    },
    
    get: async (id: number) => {
      await simulateDelay(100)
      const barber = mockData.barbers.find(b => b.id === id)
      if (!barber) throw new Error('Barber not found')
      return barber
    },
    
    getAvailability: async (barberId: number, date: string) => {
      await simulateDelay(300)
      // Return mock availability
      return {
        available: true,
        workingHours: { start: '09:00', end: '19:00' },
        breaks: [{ start: '13:00', end: '14:00' }],
        bookedSlots: mockData.appointments
          .filter(apt => apt.barber_id === barberId && apt.start_time.includes(date))
          .map(apt => ({
            start: new Date(apt.start_time).toTimeString().slice(0, 5),
            end: new Date(apt.end_time).toTimeString().slice(0, 5)
          }))
      }
    }
  }
}

// Reset function for demo
export function resetDemoData() {
  mockData = generateMockData()
}

// Export the demo API as the main API for demo components
export const api = demoApi