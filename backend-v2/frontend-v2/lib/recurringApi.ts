import { API_URL } from './api'

// Types
export interface Service {
  id: number
  name: string
  price: number
  duration: number
}

export interface Barber {
  id: number
  name: string
  email: string
}

// Recurring pattern types
export interface RecurringPattern {
  id: number
  user_id: number
  barber_id: number | null
  client_id: number | null
  service_id: number | null
  pattern_type: string
  days_of_week: number[] | null
  day_of_month: number | null
  week_of_month: number | null
  preferred_time: string
  duration_minutes: number
  start_date: string
  end_date: string | null
  occurrences: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  service?: {
    id: number
    name: string
    price: number
  }
  barber?: {
    id: number
    name: string
    email: string
  }
}

export interface RecurringPatternCreate {
  pattern_type: string
  preferred_time: string
  duration_minutes: number
  start_date: string
  end_date: string | null
  occurrences: number | null
  days_of_week: number[] | null
  day_of_month: number | null
  week_of_month: number | null
  barber_id: number
  service_id: number
}

export interface RecurringPatternUpdate {
  pattern_type?: string
  preferred_time?: string
  duration_minutes?: number
  start_date?: string
  end_date?: string | null
  occurrences?: number | null
  days_of_week?: number[] | null
  day_of_month?: number | null
  week_of_month?: number | null
  barber_id?: number
  service_id?: number
  is_active?: boolean
}

export interface AppointmentOccurrence {
  id: number
  pattern_id?: number
  user_id: number
  barber_id: number
  service_id: number
  start_time: string
  end_time: string
  status: string
  service?: {
    id: number
    name: string
    price: number
  }
  barber?: {
    id: number
    name: string
  }
}

export interface PatternPreview {
  pattern_id: number
  pattern_type: string
  occurrences: Array<{
    date: string
    time: string
    duration_minutes: number
    hasConflict?: boolean
  }>
  total_shown: number
  conflicts: number
}

export interface GenerateAppointmentsResult {
  pattern_id: number
  preview_only: boolean
  appointments: AppointmentOccurrence[]
  total_generated: number
  total_conflicts: number
}

export interface UpcomingAppointmentsResult {
  user_id: number
  days_ahead: number
  appointments: AppointmentOccurrence[]
  total_upcoming: number
}

// Helper function for auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  if (!token) throw new Error('No access token found')
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

// API Functions
export async function createRecurringPattern(pattern: RecurringPatternCreate): Promise<RecurringPattern> {
  const response = await fetch(`${API_URL}/recurring-appointments/patterns`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(pattern)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to create recurring pattern')
  }

  return response.json()
}

export async function getRecurringPatterns(isActive?: boolean): Promise<RecurringPattern[]> {
  const params = new URLSearchParams()
  if (isActive !== undefined) params.append('is_active', isActive.toString())

  const response = await fetch(`${API_URL}/recurring-appointments/patterns?${params}`, {
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    throw new Error('Failed to fetch recurring patterns')
  }

  return response.json()
}

export async function getRecurringPattern(patternId: number): Promise<RecurringPattern> {
  const response = await fetch(`${API_URL}/recurring-appointments/patterns/${patternId}`, {
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    throw new Error('Failed to fetch recurring pattern')
  }

  return response.json()
}

export async function updateRecurringPattern(
  patternId: number,
  update: RecurringPatternUpdate
): Promise<RecurringPattern> {
  const response = await fetch(`${API_URL}/recurring-appointments/patterns/${patternId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(update)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to update recurring pattern')
  }

  return response.json()
}

export async function deleteRecurringPattern(patternId: number): Promise<void> {
  const response = await fetch(`${API_URL}/recurring-appointments/patterns/${patternId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to delete recurring pattern')
  }
}

export async function generateAppointments(
  patternId: number,
  previewOnly = false,
  maxAppointments = 50
): Promise<GenerateAppointmentsResult> {
  const params = new URLSearchParams({
    preview_only: previewOnly.toString(),
    max_appointments: maxAppointments.toString()
  })

  const response = await fetch(
    `${API_URL}/recurring-appointments/patterns/${patternId}/generate?${params}`,
    {
      method: 'POST',
      headers: getAuthHeaders()
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to generate appointments')
  }

  return response.json()
}

export async function getUpcomingAppointments(
  patternId?: number,
  daysAhead = 30
): Promise<UpcomingAppointmentsResult> {
  const params = new URLSearchParams({
    days_ahead: daysAhead.toString()
  })

  const response = await fetch(`${API_URL}/recurring-appointments/upcoming?${params}`, {
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    throw new Error('Failed to fetch upcoming appointments')
  }

  const data = await response.json()
  
  // Filter by pattern ID if provided
  if (patternId) {
    data.appointments = data.appointments.filter((apt: any) => 
      apt.recurring_pattern_id === patternId
    )
    data.total_upcoming = data.appointments.length
  }

  return data
}

export async function cancelRecurringSeries(
  patternId: number,
  cancelFutureOnly = true
): Promise<any> {
  const params = new URLSearchParams({
    cancel_future_only: cancelFutureOnly.toString()
  })

  const response = await fetch(
    `${API_URL}/recurring-appointments/patterns/${patternId}/cancel?${params}`,
    {
      method: 'POST',
      headers: getAuthHeaders()
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to cancel recurring series')
  }

  return response.json()
}

export async function modifySingleOccurrence(
  appointmentId: number,
  newDate: string | null,
  newTime: string | null,
  newBarberId: number | null,
  cancel: boolean
): Promise<any> {
  const params = new URLSearchParams()
  if (newDate) params.append('new_date', newDate)
  if (newTime) params.append('new_time', newTime)
  if (newBarberId) params.append('new_barber_id', newBarberId.toString())
  params.append('cancel', cancel.toString())

  const response = await fetch(
    `${API_URL}/recurring-appointments/appointments/${appointmentId}/modify?${params}`,
    {
      method: 'PUT',
      headers: getAuthHeaders()
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to modify occurrence')
  }

  return response.json()
}

export async function previewPatternOccurrences(
  pattern: RecurringPatternCreate,
  limit = 20
): Promise<PatternPreview> {
  // This is a simplified preview that doesn't require creating the pattern first
  // In a real implementation, you might have a dedicated preview endpoint
  
  const occurrences = []
  const startDate = new Date(pattern.start_date)
  const endDate = pattern.end_date ? new Date(pattern.end_date) : null
  const currentDate = new Date(startDate)
  let count = 0

  while (count < limit && (!endDate || currentDate <= endDate)) {
    let shouldAdd = false

    switch (pattern.pattern_type) {
      case 'daily':
        shouldAdd = true
        break
      case 'weekly':
        if (pattern.days_of_week?.includes(currentDate.getDay())) {
          shouldAdd = true
        }
        break
      case 'biweekly':
        const weeksDiff = Math.floor((currentDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
        if (weeksDiff % 2 === 0 && pattern.days_of_week?.includes(currentDate.getDay())) {
          shouldAdd = true
        }
        break
      case 'monthly':
        if (pattern.day_of_month && currentDate.getDate() === pattern.day_of_month) {
          shouldAdd = true
        }
        break
    }

    if (shouldAdd) {
      occurrences.push({
        date: currentDate.toISOString().split('T')[0],
        time: pattern.preferred_time,
        duration_minutes: pattern.duration_minutes,
        hasConflict: false // Would need to check against existing appointments
      })
      count++
    }

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return {
    pattern_id: 0, // Temporary ID for preview
    pattern_type: pattern.pattern_type,
    occurrences,
    total_shown: occurrences.length,
    conflicts: 0
  }
}

// Fetch services from the API
export async function getServices(): Promise<Service[]> {
  try {
    const response = await fetch(`${API_URL}/services`, {
      headers: getAuthHeaders()
    })

    if (!response.ok) {
      console.error('Failed to fetch services:', response.status)
      return []
    }

    const services = await response.json()
    return services.map((service: any) => ({
      id: service.id,
      name: service.name,
      price: service.price,
      duration: service.duration_minutes || 30
    }))
  } catch (error) {
    console.error('Error fetching services:', error)
    return []
  }
}

// Fetch barbers from the API
export async function getBarbers(): Promise<Barber[]> {
  try {
    const response = await fetch(`${API_URL}/barbers`, {
      headers: getAuthHeaders()
    })

    if (!response.ok) {
      console.error('Failed to fetch barbers:', response.status)
      return []
    }

    const barbers = await response.json()
    return barbers.map((barber: any) => ({
      id: barber.id,
      name: `${barber.first_name} ${barber.last_name}`.trim() || barber.email,
      email: barber.email
    }))
  } catch (error) {
    console.error('Error fetching barbers:', error)
    return []
  }
}