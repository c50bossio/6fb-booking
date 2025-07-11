import { format, addDays, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns'
import type { BookingResponse, Client, Service, TimeSlot } from '@/lib/api'

/**
 * Get smart time slot suggestions based on appointment history
 */
export function getSmartTimeSuggestions(
  availableSlots: TimeSlot[],
  appointmentHistory: BookingResponse[],
  maxSuggestions: number = 3
): TimeSlot[] {
  if (availableSlots.length === 0) return []
  
  // Extract preferred times from history
  const preferredTimes = new Map<string, number>()
  
  appointmentHistory.forEach(appointment => {
    const time = format(parseISO(appointment.start_time), 'HH:mm')
    preferredTimes.set(time, (preferredTimes.get(time) || 0) + 1)
  })
  
  // Sort available slots by preference
  const sortedSlots = [...availableSlots].sort((a, b) => {
    const aPreference = preferredTimes.get(a.time) || 0
    const bPreference = preferredTimes.get(b.time) || 0
    
    // Prioritize next available
    if (a.is_next_available && !b.is_next_available) return -1
    if (!a.is_next_available && b.is_next_available) return 1
    
    // Then by preference count
    return bPreference - aPreference
  })
  
  return sortedSlots.slice(0, maxSuggestions)
}

/**
 * Get frequent clients from appointment history
 */
export function getFrequentClients(
  appointmentHistory: BookingResponse[],
  maxClients: number = 5
): Array<{ client: string; count: number; lastVisit: string }> {
  const clientMap = new Map<string, { count: number; lastVisit: string }>()
  
  appointmentHistory.forEach(appointment => {
    const key = appointment.client_name
    const existing = clientMap.get(key)
    
    if (existing) {
      existing.count++
      if (appointment.start_time > existing.lastVisit) {
        existing.lastVisit = appointment.start_time
      }
    } else {
      clientMap.set(key, {
        count: 1,
        lastVisit: appointment.start_time
      })
    }
  })
  
  return Array.from(clientMap.entries())
    .map(([client, data]) => ({ client, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxClients)
}

/**
 * Get popular services from appointment history
 */
export function getPopularServices(
  services: Service[],
  appointmentHistory: BookingResponse[]
): Service[] {
  const serviceCount = new Map<string, number>()
  
  appointmentHistory.forEach(appointment => {
    const count = serviceCount.get(appointment.service_name) || 0
    serviceCount.set(appointment.service_name, count + 1)
  })
  
  return services.sort((a, b) => {
    const aCount = serviceCount.get(a.name) || 0
    const bCount = serviceCount.get(b.name) || 0
    return bCount - aCount
  })
}

/**
 * Generate quick date options relative to a base date
 */
export function getQuickDateOptions(
  baseDate: Date = new Date(),
  includeToday: boolean = false
): Array<{ label: string; date: Date }> {
  const options: Array<{ label: string; date: Date }> = []
  
  if (includeToday) {
    options.push({ label: 'Today', date: baseDate })
  }
  
  options.push(
    { label: 'Tomorrow', date: addDays(baseDate, 1) },
    { label: format(addDays(baseDate, 2), 'EEEE'), date: addDays(baseDate, 2) },
    { label: format(addDays(baseDate, 3), 'EEEE'), date: addDays(baseDate, 3) },
    { label: 'Next Week', date: addDays(baseDate, 7) },
    { label: 'In 2 Weeks', date: addDays(baseDate, 14) }
  )
  
  return options
}

/**
 * Check if a client has a preferred barber based on history
 */
export function getPreferredBarber(
  clientName: string,
  appointmentHistory: BookingResponse[]
): { barberId?: number; barberName?: string; appointmentCount: number } | null {
  const barberMap = new Map<string, { id?: number; count: number }>()
  
  appointmentHistory
    .filter(apt => apt.client_name === clientName && apt.barber_name)
    .forEach(apt => {
      const key = apt.barber_name!
      const existing = barberMap.get(key)
      
      if (existing) {
        existing.count++
      } else {
        barberMap.set(key, {
          id: apt.barber_id,
          count: 1
        })
      }
    })
  
  if (barberMap.size === 0) return null
  
  // Find most frequent barber
  let preferredBarber: string | null = null
  let maxCount = 0
  
  barberMap.forEach((data, barberName) => {
    if (data.count > maxCount) {
      maxCount = data.count
      preferredBarber = barberName
    }
  })
  
  if (!preferredBarber) return null
  
  const data = barberMap.get(preferredBarber)!
  return {
    barberId: data.id,
    barberName: preferredBarber,
    appointmentCount: data.count
  }
}

/**
 * Format appointment duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`
  }
  
  return `${hours} hr ${remainingMinutes} min`
}

/**
 * Get appointment suggestions for rebooking
 */
export function getRebookingSuggestions(
  lastAppointment: BookingResponse,
  services: Service[]
): {
  service?: Service
  suggestedInterval: number // days
  nextSuggestedDate: Date
} {
  const service = services.find(s => s.name === lastAppointment.service_name)
  
  // Default intervals based on service type (could be configured)
  const defaultIntervals: Record<string, number> = {
    'Haircut': 14,
    'Premium Haircut': 14,
    'Beard Trim': 7,
    'Hair & Beard': 14,
    'Kids Cut': 21,
    'Senior Cut': 21,
    'Buzz Cut': 14,
    'Design': 7,
    'Color': 28,
    'Shave': 3
  }
  
  const suggestedInterval = service 
    ? defaultIntervals[service.name] || 14 
    : 14
  
  const lastDate = parseISO(lastAppointment.start_time)
  const nextSuggestedDate = addDays(lastDate, suggestedInterval)
  
  return {
    service,
    suggestedInterval,
    nextSuggestedDate
  }
}

/**
 * Check if appointment can be rescheduled based on business rules
 */
export function canRescheduleAppointment(
  appointment: BookingResponse,
  minHoursNotice: number = 24
): { canReschedule: boolean; reason?: string } {
  const appointmentTime = parseISO(appointment.start_time)
  const now = new Date()
  const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  if (appointment.status === 'cancelled') {
    return { canReschedule: false, reason: 'Appointment is already cancelled' }
  }
  
  if (appointment.status === 'completed') {
    return { canReschedule: false, reason: 'Appointment has already been completed' }
  }
  
  if (hoursUntilAppointment < minHoursNotice) {
    return { 
      canReschedule: false, 
      reason: `Appointments must be rescheduled at least ${minHoursNotice} hours in advance` 
    }
  }
  
  return { canReschedule: true }
}

/**
 * Group appointments by date for calendar display
 */
export function groupAppointmentsByDate(
  appointments: BookingResponse[]
): Map<string, BookingResponse[]> {
  const grouped = new Map<string, BookingResponse[]>()
  
  appointments.forEach(appointment => {
    const dateKey = format(parseISO(appointment.start_time), 'yyyy-MM-dd')
    const existing = grouped.get(dateKey) || []
    existing.push(appointment)
    grouped.set(dateKey, existing)
  })
  
  // Sort appointments within each day
  grouped.forEach((dayAppointments, key) => {
    dayAppointments.sort((a, b) => 
      parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime()
    )
  })
  
  return grouped
}

/**
 * Get availability summary for a date range
 */
export async function getAvailabilitySummary(
  startDate: Date,
  endDate: Date,
  getSlotsFn: (date: string) => Promise<{ slots: TimeSlot[] }>
): Promise<Map<string, { available: number; total: number }>> {
  const summary = new Map<string, { available: number; total: number }>()
  const current = new Date(startDate)
  
  while (current <= endDate) {
    try {
      const dateStr = format(current, 'yyyy-MM-dd')
      const response = await getSlotsFn(dateStr)
      const slots = response.slots || []
      
      summary.set(dateStr, {
        available: slots.filter(s => s.available).length,
        total: slots.length
      })
    } catch (err) {
      console.error(`Failed to get slots for ${format(current, 'yyyy-MM-dd')}:`, err)
    }
    
    current.setDate(current.getDate() + 1)
  }
  
  return summary
}