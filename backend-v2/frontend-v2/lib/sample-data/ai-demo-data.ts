/**
 * Sample Data for AI Optimization Engine Demo
 * Realistic barbershop appointment data for testing and demonstration
 */

import { addDays, subDays, format, setHours, setMinutes } from 'date-fns'

// Sample appointment data with realistic patterns
export const sampleAppointments = [
  // Client 1: Regular VIP client - consistent pattern
  {
    id: 1,
    client_id: 1,
    client_name: 'Marcus Johnson',
    service_name: 'Signature Haircut',
    service_id: 1,
    start_time: format(setHours(setMinutes(subDays(new Date(), 7), 0), 10), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    duration_minutes: 60,
    price: 85,
    status: 'completed' as const,
    barber_id: 1,
    created_at: format(subDays(new Date(), 10), 'yyyy-MM-dd\'T\'HH:mm:ss')
  },
  {
    id: 2,
    client_id: 1,
    client_name: 'Marcus Johnson',
    service_name: 'Signature Haircut',
    service_id: 1,
    start_time: format(setHours(setMinutes(subDays(new Date(), 21), 0), 10), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    duration_minutes: 60,
    price: 85,
    status: 'completed' as const,
    barber_id: 1,
    created_at: format(subDays(new Date(), 24), 'yyyy-MM-dd\'T\'HH:mm:ss')
  },
  {
    id: 3,
    client_id: 1,
    client_name: 'Marcus Johnson',
    service_name: 'Beard Trim',
    service_id: 2,
    start_time: format(setHours(setMinutes(subDays(new Date(), 35), 0), 14), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    duration_minutes: 30,
    price: 45,
    status: 'completed' as const,
    barber_id: 1,
    created_at: format(subDays(new Date(), 38), 'yyyy-MM-dd\'T\'HH:mm:ss')
  },

  // Client 2: New client - evaluation stage
  {
    id: 4,
    client_id: 2,
    client_name: 'David Chen',
    service_name: 'Haircut',
    service_id: 3,
    start_time: format(setHours(setMinutes(subDays(new Date(), 3), 30), 16), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    duration_minutes: 45,
    price: 55,
    status: 'completed' as const,
    barber_id: 2,
    created_at: format(subDays(new Date(), 5), 'yyyy-MM-dd\'T\'HH:mm:ss')
  },
  {
    id: 5,
    client_id: 2,
    client_name: 'David Chen',
    service_name: 'Haircut',
    service_id: 3,
    start_time: format(setHours(setMinutes(subDays(new Date(), 17), 30), 16), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    duration_minutes: 45,
    price: 55,
    status: 'completed' as const,
    barber_id: 2,
    created_at: format(subDays(new Date(), 19), 'yyyy-MM-dd\'T\'HH:mm:ss')
  },

  // Client 3: High-value regular with upsell potential
  {
    id: 6,
    client_id: 3,
    client_name: 'Robert Williams',
    service_name: 'Premium Haircut',
    service_id: 4,
    start_time: format(setHours(setMinutes(subDays(new Date(), 5), 0), 11), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    duration_minutes: 75,
    price: 95,
    status: 'completed' as const,
    barber_id: 1,
    created_at: format(subDays(new Date(), 12), 'yyyy-MM-dd\'T\'HH:mm:ss')
  },
  {
    id: 7,
    client_id: 3,
    client_name: 'Robert Williams',
    service_name: 'Premium Haircut',
    service_id: 4,
    start_time: format(setHours(setMinutes(subDays(new Date(), 19), 0), 11), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    duration_minutes: 75,
    price: 95,
    status: 'completed' as const,
    barber_id: 1,
    created_at: format(subDays(new Date(), 26), 'yyyy-MM-dd\'T\'HH:mm:ss')
  },
  {
    id: 8,
    client_id: 3,
    client_name: 'Robert Williams',
    service_name: 'Hot Towel Shave',
    service_id: 5,
    start_time: format(setHours(setMinutes(subDays(new Date(), 33), 15), 12), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    duration_minutes: 45,
    price: 65,
    status: 'completed' as const,
    barber_id: 1,
    created_at: format(subDays(new Date(), 40), 'yyyy-MM-dd\'T\'HH:mm:ss')
  },

  // Client 4: At-risk regular (long gap since last visit)
  {
    id: 9,
    client_id: 4,
    client_name: 'James Rodriguez',
    service_name: 'Haircut',
    service_id: 3,
    start_time: format(setHours(setMinutes(subDays(new Date(), 45), 0), 14), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    duration_minutes: 45,
    price: 55,
    status: 'completed' as const,
    barber_id: 2,
    created_at: format(subDays(new Date(), 48), 'yyyy-MM-dd\'T\'HH:mm:ss')
  },
  {
    id: 10,
    client_id: 4,
    client_name: 'James Rodriguez',
    service_name: 'Haircut',
    service_id: 3,
    start_time: format(setHours(setMinutes(subDays(new Date(), 75), 0), 14), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    duration_minutes: 45,
    price: 55,
    status: 'completed' as const,
    barber_id: 2,
    created_at: format(subDays(new Date(), 78), 'yyyy-MM-dd\'T\'HH:mm:ss')
  },

  // Client 5: Price-sensitive regular
  {
    id: 11,
    client_id: 5,
    client_name: 'Michael Brown',
    service_name: 'Basic Haircut',
    service_id: 6,
    start_time: format(setHours(setMinutes(subDays(new Date(), 2), 0), 9), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    duration_minutes: 30,
    price: 35,
    status: 'completed' as const,
    barber_id: 3,
    created_at: format(subDays(new Date(), 4), 'yyyy-MM-dd\'T\'HH:mm:ss')
  },
  {
    id: 12,
    client_id: 5,
    client_name: 'Michael Brown',
    service_name: 'Basic Haircut',
    service_id: 6,
    start_time: format(setHours(setMinutes(subDays(new Date(), 16), 0), 9), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    duration_minutes: 30,
    price: 35,
    status: 'completed' as const,
    barber_id: 3,
    created_at: format(subDays(new Date(), 18), 'yyyy-MM-dd\'T\'HH:mm:ss')
  },

  // Client 6: Weekend regular with premium preferences
  {
    id: 13,
    client_id: 6,
    client_name: 'Anthony Davis',
    service_name: 'Signature Haircut',
    service_id: 1,
    start_time: format(setHours(setMinutes(subDays(new Date(), 1), 0), 11), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    duration_minutes: 60,
    price: 85,
    status: 'completed' as const,
    barber_id: 1,
    created_at: format(subDays(new Date(), 3), 'yyyy-MM-dd\'T\'HH:mm:ss')
  },
  {
    id: 14,
    client_id: 6,
    client_name: 'Anthony Davis',
    service_name: 'Signature Haircut',
    service_id: 1,
    start_time: format(setHours(setMinutes(subDays(new Date(), 15), 0), 12), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    duration_minutes: 60,
    price: 85,
    status: 'completed' as const,
    barber_id: 1,
    created_at: format(subDays(new Date(), 17), 'yyyy-MM-dd\'T\'HH:mm:ss')
  },

  // Future appointments for testing
  {
    id: 15,
    client_id: 7,
    client_name: 'Christopher Wilson',
    service_name: 'Haircut',
    service_id: 3,
    start_time: format(setHours(setMinutes(addDays(new Date(), 1), 0), 14), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    duration_minutes: 45,
    price: 55,
    status: 'confirmed' as const,
    barber_id: 2,
    created_at: format(subDays(new Date(), 2), 'yyyy-MM-dd\'T\'HH:mm:ss')
  },
  {
    id: 16,
    client_id: 8,
    client_name: 'Daniel Garcia',
    service_name: 'Premium Haircut',
    service_id: 4,
    start_time: format(setHours(setMinutes(addDays(new Date(), 2), 30), 10), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    duration_minutes: 75,
    price: 95,
    status: 'confirmed' as const,
    barber_id: 1,
    created_at: format(subDays(new Date(), 1), 'yyyy-MM-dd\'T\'HH:mm:ss')
  },

  // Cancelled appointments for analysis
  {
    id: 17,
    client_id: 4,
    client_name: 'James Rodriguez',
    service_name: 'Haircut',
    service_id: 3,
    start_time: format(setHours(setMinutes(subDays(new Date(), 8), 0), 14), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    duration_minutes: 45,
    price: 55,
    status: 'cancelled' as const,
    barber_id: 2,
    created_at: format(subDays(new Date(), 10), 'yyyy-MM-dd\'T\'HH:mm:ss')
  },

  // No-show for risk analysis
  {
    id: 18,
    client_id: 9,
    client_name: 'Matthew Martinez',
    service_name: 'Basic Haircut',
    service_id: 6,
    start_time: format(setHours(setMinutes(subDays(new Date(), 12), 0), 16), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    duration_minutes: 30,
    price: 35,
    status: 'no_show' as const,
    barber_id: 3,
    created_at: format(subDays(new Date(), 14), 'yyyy-MM-dd\'T\'HH:mm:ss')
  },

  // Additional appointments for revenue analysis
  {
    id: 19,
    client_id: 10,
    client_name: 'Kevin Anderson',
    service_name: 'Beard Trim',
    service_id: 2,
    start_time: format(setHours(setMinutes(subDays(new Date(), 4), 30), 15), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    duration_minutes: 30,
    price: 45,
    status: 'completed' as const,
    barber_id: 2,
    created_at: format(subDays(new Date(), 6), 'yyyy-MM-dd\'T\'HH:mm:ss')
  },
  {
    id: 20,
    client_id: 11,
    client_name: 'Brian Taylor',
    service_name: 'Hot Towel Shave',
    service_id: 5,
    start_time: format(setHours(setMinutes(subDays(new Date(), 6), 0), 17), 'yyyy-MM-dd\'T\'HH:mm:ss'),
    duration_minutes: 45,
    price: 65,
    status: 'completed' as const,
    barber_id: 1,
    created_at: format(subDays(new Date(), 8), 'yyyy-MM-dd\'T\'HH:mm:ss')
  }
]

// Sample barber availability data
export const sampleAvailability = [
  // Barber 1: Senior barber with premium hours
  { barber_id: 1, day_of_week: 1, start_time: '09:00', end_time: '18:00', is_available: true }, // Monday
  { barber_id: 1, day_of_week: 2, start_time: '09:00', end_time: '18:00', is_available: true }, // Tuesday
  { barber_id: 1, day_of_week: 3, start_time: '09:00', end_time: '18:00', is_available: true }, // Wednesday
  { barber_id: 1, day_of_week: 4, start_time: '09:00', end_time: '18:00', is_available: true }, // Thursday
  { barber_id: 1, day_of_week: 5, start_time: '09:00', end_time: '19:00', is_available: true }, // Friday
  { barber_id: 1, day_of_week: 6, start_time: '08:00', end_time: '17:00', is_available: true }, // Saturday
  { barber_id: 1, day_of_week: 0, start_time: '10:00', end_time: '16:00', is_available: true }, // Sunday

  // Barber 2: Mid-level barber with standard hours
  { barber_id: 2, day_of_week: 1, start_time: '10:00', end_time: '18:00', is_available: true }, // Monday
  { barber_id: 2, day_of_week: 2, start_time: '10:00', end_time: '18:00', is_available: true }, // Tuesday
  { barber_id: 2, day_of_week: 3, start_time: '10:00', end_time: '18:00', is_available: true }, // Wednesday
  { barber_id: 2, day_of_week: 4, start_time: '10:00', end_time: '18:00', is_available: true }, // Thursday
  { barber_id: 2, day_of_week: 5, start_time: '10:00', end_time: '19:00', is_available: true }, // Friday
  { barber_id: 2, day_of_week: 6, start_time: '09:00', end_time: '17:00', is_available: true }, // Saturday
  { barber_id: 2, day_of_week: 0, start_time: '12:00', end_time: '17:00', is_available: true }, // Sunday

  // Barber 3: Entry-level barber with limited premium hours
  { barber_id: 3, day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true }, // Monday
  { barber_id: 3, day_of_week: 2, start_time: '09:00', end_time: '17:00', is_available: true }, // Tuesday
  { barber_id: 3, day_of_week: 3, start_time: '09:00', end_time: '17:00', is_available: true }, // Wednesday
  { barber_id: 3, day_of_week: 4, start_time: '09:00', end_time: '17:00', is_available: true }, // Thursday
  { barber_id: 3, day_of_week: 5, start_time: '09:00', end_time: '18:00', is_available: true }, // Friday
  { barber_id: 3, day_of_week: 6, start_time: '08:00', end_time: '16:00', is_available: true }, // Saturday
  { barber_id: 3, day_of_week: 0, start_time: '10:00', end_time: '14:00', is_available: true }  // Sunday
]

// Sample barber data
export const sampleBarbers = [
  {
    id: 1,
    name: 'Alex Martinez',
    first_name: 'Alex',
    last_name: 'Martinez',
    email: 'alex@bookedbarber.com',
    avatar: '/avatars/alex.jpg',
    specialties: ['Signature Cuts', 'Premium Services', 'Hot Towel Shaves'],
    role: 'Senior Barber'
  },
  {
    id: 2,
    name: 'Jordan Thompson',
    first_name: 'Jordan',
    last_name: 'Thompson',
    email: 'jordan@bookedbarber.com',
    avatar: '/avatars/jordan.jpg',
    specialties: ['Classic Cuts', 'Beard Trims', 'Styling'],
    role: 'Barber'
  },
  {
    id: 3,
    name: 'Casey Williams',
    first_name: 'Casey',
    last_name: 'Williams',
    email: 'casey@bookedbarber.com',
    avatar: '/avatars/casey.jpg',
    specialties: ['Basic Cuts', 'Quick Trims', 'Walk-ins'],
    role: 'Junior Barber'
  }
]

// Sample services data
export const sampleServices = [
  {
    id: 1,
    name: 'Signature Haircut',
    duration: 60,
    price: 85,
    description: 'Premium haircut with consultation, wash, cut, and styling',
    category: 'Premium'
  },
  {
    id: 2,
    name: 'Beard Trim',
    duration: 30,
    price: 45,
    description: 'Professional beard shaping and trimming',
    category: 'Grooming'
  },
  {
    id: 3,
    name: 'Haircut',
    duration: 45,
    price: 55,
    description: 'Standard haircut with wash and basic styling',
    category: 'Standard'
  },
  {
    id: 4,
    name: 'Premium Haircut',
    duration: 75,
    price: 95,
    description: 'Luxury experience with hot towel, scalp massage, and premium styling',
    category: 'Premium'
  },
  {
    id: 5,
    name: 'Hot Towel Shave',
    duration: 45,
    price: 65,
    description: 'Traditional hot towel shave with premium products',
    category: 'Premium'
  },
  {
    id: 6,
    name: 'Basic Haircut',
    duration: 30,
    price: 35,
    description: 'Quick, simple haircut',
    category: 'Basic'
  }
]

// Test scenarios for AI demonstrations
export const aiTestScenarios = {
  // High-value client with consistent pattern
  vipClientBooking: {
    clientId: 1,
    preferredBarber: 1,
    lastAppointmentDays: 7,
    averageSpend: 85,
    appointmentFrequency: 14
  },
  
  // New client in evaluation stage
  newClientFollowUp: {
    clientId: 2,
    lastAppointmentDays: 3,
    appointmentCount: 2,
    conversionRisk: 'medium'
  },
  
  // At-risk client needing retention
  atRiskClient: {
    clientId: 4,
    lastAppointmentDays: 45,
    normalFrequency: 21,
    riskLevel: 'high'
  },
  
  // Premium upselling opportunity
  upsellOpportunity: {
    clientId: 3,
    currentService: 'Premium Haircut',
    upsellServices: ['Hot Towel Shave', 'Beard Trim'],
    successProbability: 85
  },
  
  // Peak hour optimization
  peakHourAnalysis: {
    peakHours: [10, 11, 16, 17],
    offPeakHours: [9, 13, 14, 18],
    revenueOpportunity: 1200
  },
  
  // Service mix optimization
  serviceMixOptimization: {
    underutilizedServices: ['Hot Towel Shave', 'Premium Haircut'],
    highMarginServices: ['Signature Haircut', 'Premium Haircut'],
    potentialIncrease: 25
  }
}

// Function to generate additional sample data for larger datasets
export const generateExtendedSampleData = (multiplier: number = 1) => {
  const extendedAppointments = []
  const baseData = sampleAppointments

  for (let i = 0; i < multiplier; i++) {
    baseData.forEach((apt, index) => {
      extendedAppointments.push({
        ...apt,
        id: apt.id + (i * 1000),
        client_id: apt.client_id ? apt.client_id + (i * 100) : undefined,
        client_name: `${apt.client_name} ${i > 0 ? `(${i})` : ''}`,
        start_time: format(
          addDays(new Date(apt.start_time), i * 30), // Spread across months
          'yyyy-MM-dd\'T\'HH:mm:ss'
        ),
        created_at: apt.created_at ? format(
          addDays(new Date(apt.created_at), i * 30),
          'yyyy-MM-dd\'T\'HH:mm:ss'
        ) : undefined
      })
    })
  }

  return extendedAppointments
}

// Export all sample data
export const sampleData = {
  appointments: sampleAppointments,
  availability: sampleAvailability,
  barbers: sampleBarbers,
  services: sampleServices,
  testScenarios: aiTestScenarios
}

export default sampleData