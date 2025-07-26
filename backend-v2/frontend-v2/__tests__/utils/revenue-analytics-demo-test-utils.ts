/**
 * Test Utilities for Revenue Analytics Demo
 * 
 * Provides:
 * - Mock data factories for consistent testing
 * - Six Figure Barber business logic helpers
 * - Performance measurement utilities
 * - Accessibility testing helpers
 * - Calendar integration test utilities
 * - Common test scenarios and workflows
 */

import { format, addDays, subDays } from 'date-fns'

// Types for test data
export interface MockClient {
  id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  created_at: string
  last_appointment: string
  total_appointments: number
  total_revenue: number
  average_rating: number
  is_vip: boolean
  is_favorite: boolean
  lifetime_value: number
  referral_count: number
  tags: string[]
  status: string
}

export interface MockAppointment {
  id: number
  client_id: number
  client_name: string
  barber_id: number
  start_time: string
  end_time: string
  service_name: string
  service_id: number
  status: string
  price: number
  duration_minutes: number
  notes: string
  is_premium: boolean
  add_ons: string[]
  tips: number
  client?: MockClient
}

export interface MockBarber {
  id: number
  name: string
  first_name: string
  last_name: string
  email: string
  avatar?: string
}

export interface RevenueMetrics {
  todaysRevenue: number
  sixFigureProgress: number
  averageTicket: number
  premiumServiceRatio: number
  vipClientRatio: number
}

/**
 * Factory for creating consistent mock client data
 */
export const createMockClient = (overrides: Partial<MockClient> = {}): MockClient => ({
  id: 1,
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@email.com',
  phone: '+1 (555) 123-4567',
  created_at: '2024-01-15T10:30:00Z',
  last_appointment: '2024-07-25T14:00:00Z',
  total_appointments: 12,
  total_revenue: 1200.00,
  average_rating: 4.8,
  is_vip: false,
  is_favorite: false,
  lifetime_value: 1200.00,
  referral_count: 1,
  tags: ['Regular'],
  status: 'active',
  ...overrides
})

/**
 * Factory for creating VIP clients with premium characteristics
 */
export const createVIPClient = (overrides: Partial<MockClient> = {}): MockClient => 
  createMockClient({
    total_appointments: 24,
    total_revenue: 2640.00,
    average_rating: 5.0,
    is_vip: true,
    is_favorite: true,
    lifetime_value: 2640.00,
    referral_count: 3,
    tags: ['VIP', 'Premium Client', 'Regular'],
    ...overrides
  })

/**
 * Factory for creating mock appointments
 */
export const createMockAppointment = (overrides: Partial<MockAppointment> = {}): MockAppointment => ({
  id: 1,
  client_id: 1,
  client_name: 'John Doe',
  barber_id: 1,
  start_time: '2024-07-25T09:00:00Z',
  end_time: '2024-07-25T10:00:00Z',
  service_name: 'Standard Haircut',
  service_id: 1,
  status: 'completed',
  price: 65.00,
  duration_minutes: 60,
  notes: 'Standard service',
  is_premium: false,
  add_ons: [],
  tips: 8.00,
  ...overrides
})

/**
 * Factory for creating premium appointments
 */
export const createPremiumAppointment = (overrides: Partial<MockAppointment> = {}): MockAppointment =>
  createMockAppointment({
    service_name: 'Signature Executive Cut',
    price: 120.00,
    duration_minutes: 90,
    notes: 'Executive client - premium experience',
    is_premium: true,
    add_ons: ['Executive Shampoo', 'Styling', 'Beard Grooming'],
    tips: 25.00,
    ...overrides
  })

/**
 * Factory for creating mock barber data
 */
export const createMockBarber = (overrides: Partial<MockBarber> = {}): MockBarber => ({
  id: 1,
  name: 'Alex Martinez',
  first_name: 'Alex',
  last_name: 'Martinez',
  email: 'alex@sixfigurebarbershop.com',
  avatar: '/avatars/alex.jpg',
  ...overrides
})

/**
 * Generate comprehensive demo dataset
 */
export const generateDemoData = () => {
  const clients = [
    createVIPClient({
      id: 1,
      first_name: 'Michael',
      last_name: 'Rodriguez',
      email: 'michael.rodriguez@email.com',
      total_appointments: 24,
      total_revenue: 2640.00
    }),
    createVIPClient({
      id: 2,
      first_name: 'Jennifer',
      last_name: 'Chen',
      email: 'jennifer.chen@email.com',
      total_appointments: 16,
      total_revenue: 1520.00
    }),
    createMockClient({
      id: 3,
      first_name: 'David',
      last_name: 'Thompson',
      email: 'david.thompson@email.com',
      total_appointments: 8,
      total_revenue: 520.00
    })
  ]

  const appointments = [
    createPremiumAppointment({
      id: 1,
      client_id: 1,
      client_name: 'Michael Rodriguez',
      price: 120.00,
      client: clients[0]
    }),
    createPremiumAppointment({
      id: 2,
      client_id: 2,
      client_name: 'Jennifer Chen',
      service_name: 'VIP Cut & Style Package',
      price: 150.00,
      client: clients[1]
    }),
    createMockAppointment({
      id: 3,
      client_id: 3,
      client_name: 'David Thompson',
      client: clients[2]
    })
  ]

  const barbers = [
    createMockBarber()
  ]

  return { clients, appointments, barbers }
}

/**
 * Calculate Six Figure Barber metrics from data
 */
export const calculateRevenueMetrics = (
  appointments: MockAppointment[], 
  clients: MockClient[]
): RevenueMetrics => {
  const today = format(new Date(), 'yyyy-MM-dd')
  const todaysAppointments = appointments.filter(apt => 
    apt.start_time.includes(today)
  )
  
  const todaysRevenue = todaysAppointments.reduce((sum, apt) => sum + apt.price, 0)
  
  // Assume annual goal of $100,000
  const annualGoal = 100000
  const sixFigureProgress = (todaysRevenue * 365) / annualGoal * 100
  
  const totalRevenue = appointments.reduce((sum, apt) => sum + apt.price, 0)
  const averageTicket = totalRevenue / appointments.length
  
  const premiumAppointments = appointments.filter(apt => apt.is_premium).length
  const premiumServiceRatio = (premiumAppointments / appointments.length) * 100
  
  const vipClients = clients.filter(client => client.is_vip).length
  const vipClientRatio = (vipClients / clients.length) * 100
  
  return {
    todaysRevenue,
    sixFigureProgress: Math.min(sixFigureProgress, 100),
    averageTicket,
    premiumServiceRatio,
    vipClientRatio
  }
}

/**
 * Generate time-based appointment data for testing
 */
export const generateTimeBasedAppointments = (baseDate: Date, count: number): MockAppointment[] => {
  const appointments: MockAppointment[] = []
  
  for (let i = 0; i < count; i++) {
    const appointmentDate = addDays(baseDate, Math.floor(i / 8)) // 8 appointments per day
    const hour = 9 + (i % 8) // 9 AM to 4 PM
    
    appointments.push(createMockAppointment({
      id: i + 1,
      start_time: format(appointmentDate.setHours(hour, 0, 0, 0), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      end_time: format(appointmentDate.setHours(hour + 1, 0, 0, 0), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      price: 65 + (i % 3) * 25, // Varying prices
      is_premium: i % 3 === 0 // Every 3rd appointment is premium
    }))
  }
  
  return appointments
}

/**
 * Performance measurement utilities
 */
export const performanceUtils = {
  measureRenderTime: async (renderFn: () => void): Promise<number> => {
    const startTime = performance.now()
    renderFn()
    return performance.now() - startTime
  },
  
  measureMemoryUsage: (): number => {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize
    }
    return 0
  },
  
  expectPerformanceWithinBudget: (actualTime: number, budget: number) => {
    expect(actualTime).toBeLessThan(budget)
  }
}

/**
 * Accessibility testing utilities
 */
export const accessibilityUtils = {
  expectMinimumTouchTarget: (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    expect(rect.width).toBeGreaterThanOrEqual(44)
    expect(rect.height).toBeGreaterThanOrEqual(44)
  },
  
  expectAriaLabel: (element: HTMLElement) => {
    expect(element).toHaveAttribute('aria-label')
    expect(element.getAttribute('aria-label')).toBeTruthy()
  },
  
  expectKeyboardAccessible: (element: HTMLElement) => {
    expect(element.tabIndex).toBeGreaterThanOrEqual(0)
  }
}

/**
 * Business logic validation utilities
 */
export const businessLogicUtils = {
  validateSixFigureMethodology: (metrics: RevenueMetrics) => {
    // Six Figure Barber targets
    expect(metrics.averageTicket).toBeGreaterThan(50) // Premium pricing
    expect(metrics.premiumServiceRatio).toBeGreaterThan(30) // 30%+ premium services
    expect(metrics.vipClientRatio).toBeGreaterThan(20) // 20%+ VIP clients
  },
  
  validateRevenueProgression: (appointments: MockAppointment[]) => {
    const sortedAppointments = appointments.sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )
    
    // Revenue should generally trend upward
    const earlyRevenue = sortedAppointments.slice(0, 3).reduce((sum, apt) => sum + apt.price, 0)
    const lateRevenue = sortedAppointments.slice(-3).reduce((sum, apt) => sum + apt.price, 0)
    
    expect(lateRevenue).toBeGreaterThanOrEqual(earlyRevenue * 0.8) // Allow some variation
  },
  
  validateClientLifetimeValue: (clients: MockClient[]) => {
    clients.forEach(client => {
      const expectedLTV = client.total_appointments * (client.total_revenue / client.total_appointments)
      expect(Math.abs(client.lifetime_value - expectedLTV)).toBeLessThan(1) // Allow rounding
    })
  }
}

/**
 * Common test scenarios
 */
export const testScenarios = {
  // High-volume successful barbershop
  highVolumeSuccess: () => generateDemoData(),
  
  // Growing barbershop with mixed client base
  growingBusiness: () => {
    const data = generateDemoData()
    // Modify to show growth patterns
    data.clients = data.clients.map(client => ({
      ...client,
      total_appointments: Math.floor(client.total_appointments * 0.7),
      total_revenue: client.total_revenue * 0.7
    }))
    return data
  },
  
  // Premium-focused barbershop
  premiumFocused: () => {
    const data = generateDemoData()
    data.appointments = data.appointments.map(apt => ({
      ...apt,
      is_premium: true,
      price: apt.price * 1.5
    }))
    return data
  }
}

/**
 * Mock interaction utilities
 */
export const mockInteractions = {
  appointmentClick: (appointment: MockAppointment) => ({
    type: 'appointment_click',
    payload: appointment
  }),
  
  clientClick: (client: MockClient) => ({
    type: 'client_click', 
    payload: client
  }),
  
  viewChange: (view: string) => ({
    type: 'view_change',
    payload: view
  }),
  
  barberSelect: (barberId: number | 'all') => ({
    type: 'barber_select',
    payload: barberId
  })
}

/**
 * Calendar integration test utilities
 */
export const calendarTestUtils = {
  expectCalendarProps: (element: HTMLElement, expectedProps: Record<string, any>) => {
    Object.entries(expectedProps).forEach(([key, value]) => {
      expect(element).toHaveAttribute(`data-${key}`, String(value))
    })
  },
  
  simulateCalendarInteraction: async (
    type: 'appointment' | 'client' | 'timeSlot',
    id: number,
    userEvent: any
  ) => {
    const element = document.querySelector(`[data-testid="${type}-${id}"]`)
    if (element) {
      await userEvent.click(element)
    }
    return element
  }
}

/**
 * Export all utilities as default object
 */
export default {
  createMockClient,
  createVIPClient,
  createMockAppointment,
  createPremiumAppointment,
  createMockBarber,
  generateDemoData,
  calculateRevenueMetrics,
  generateTimeBasedAppointments,
  performanceUtils,
  accessibilityUtils,
  businessLogicUtils,
  testScenarios,
  mockInteractions,
  calendarTestUtils
}