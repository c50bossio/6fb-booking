const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Simple fetch wrapper
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  }

  const response = await fetch(`${API_URL}${endpoint}`, config)
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }

  return response.json()
}

// Auth functions
export async function login(email: string, password: string) {
  return fetchAPI('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function logout() {
  localStorage.removeItem('token')
}

// Basic API functions
export async function getProfile() {
  return fetchAPI('/api/v1/users/me')
}

export async function getAppointments() {
  return fetchAPI('/api/v1/appointments')
}

export async function createAppointment(data: any) {
  return fetchAPI('/api/v1/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// Booking functions
export async function getAvailableSlots(date: string) {
  return fetchAPI(`/api/v1/bookings/slots?booking_date=${date}`)
}

export async function createBooking(date: string, time: string, service: string) {
  return fetchAPI('/api/v1/bookings', {
    method: 'POST',
    body: JSON.stringify({ date, time, service }),
  })
}

export async function getMyBookings() {
  return fetchAPI('/api/v1/bookings')
}