import apiClient from './client'
import type { ApiResponse, PaginatedResponse } from './client'

export interface BookingRequest {
  service_id: number
  barber_id: number
  appointment_date: string
  appointment_time: string
  location_id?: number
  client_info: {
    name: string
    email: string
    phone?: string
  }
  notes?: string
}

export interface Booking {
  id: string
  confirmation_number: string
  service: {
    id: number
    name: string
    duration: number
    price: number
    category: string
  }
  barber: {
    id: number
    name: string
    email: string
    phone?: string
  }
  location: {
    id: number
    name: string
    address: string
    city: string
    state: string
    zip: string
    phone: string
  }
  appointment_date: string
  appointment_time: string
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed'
  payment_status: 'paid' | 'pending' | 'not_required'
  client_info: {
    name: string
    email: string
    phone?: string
  }
  notes?: string
  created_at: string
  updated_at: string
}

export interface ServiceCategory {
  id: number
  name: string
  description?: string
  sort_order: number
}

export interface Service {
  id: number
  name: string
  description?: string
  category: string
  category_id: number
  duration: number
  price: number
  is_active: boolean
  popular?: boolean
  barber_ids?: number[]
  location_ids?: number[]
  available_addons?: ServiceAddon[]
  timeOfDay?: ('morning' | 'afternoon' | 'evening')[]
}

export interface ServiceAddon {
  id: number
  name: string
  price: number
  duration?: number
}

export interface AvailabilitySlot {
  time: string
  available: boolean
  barber?: {
    id: number
    name: string
    rating?: number
  }
}

export interface BarberAvailability {
  barber: {
    id: number
    name: string
    rating?: number
    location_id: number
  }
  time_slots: AvailabilitySlot[]
}

export interface AvailabilityRequest {
  date: string
  service_id: number
  duration: number
  barber_id?: number
  location_id?: number
}

export const bookingService = {
  // Get services for a specific barber (using correct backend endpoint)
  async getServices(params?: {
    location_id?: number
    barber_id?: number
    category_id?: number
    active_only?: boolean
  }): Promise<ApiResponse<Service[]>> {
    // Use the actual backend endpoint pattern
    if (params?.barber_id) {
      const response = await apiClient.get(`/booking/public/barbers/${params.barber_id}/services`)
      return { data: response.data }
    }
    // Fallback to a general services endpoint if we implement it
    const response = await apiClient.get('/booking/services', { params })
    return { data: response.data }
  },

  // Get service by ID
  async getService(id: number): Promise<ApiResponse<Service>> {
    const response = await apiClient.get(`/booking/services/${id}`)
    return { data: response.data }
  },

  // Get service categories
  async getServiceCategories(): Promise<ApiResponse<ServiceCategory[]>> {
    const response = await apiClient.get('/booking/categories')
    return { data: response.data }
  },

  // Get barbers for a specific location (using correct backend endpoint)
  async getBarbers(locationId: number): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get(`/booking/public/shops/${locationId}/barbers`)
    return { data: response.data }
  },

  // Get availability for a specific barber and date
  async getAvailability(params: AvailabilityRequest & { barber_id: number }): Promise<ApiResponse<BarberAvailability[]>> {
    const queryParams = new URLSearchParams({
      start_date: params.date,  // Use correct parameter name
      service_id: params.service_id.toString()
    })
    const response = await apiClient.get(`/booking/public/barbers/${params.barber_id}/availability?${queryParams}`)
    return { data: response.data }
  },

  // Create a new booking
  async createBooking(bookingData: BookingRequest): Promise<ApiResponse<Booking>> {
    const response = await apiClient.post('/booking/public/bookings/create', bookingData)
    return { data: response.data }
  },

  // Get booking by confirmation number
  async getBooking(confirmationNumber: string): Promise<ApiResponse<Booking>> {
    const response = await apiClient.get(`/booking/public/bookings/confirm/${confirmationNumber}`)
    return { data: response.data }
  },

  // Get user's bookings
  async getUserBookings(params?: {
    status?: string
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<Booking>> {
    const response = await apiClient.get('/bookings/user', { params })
    return response.data
  },

  // Update booking
  async updateBooking(
    confirmationNumber: string,
    updates: Partial<BookingRequest>
  ): Promise<ApiResponse<Booking>> {
    const response = await apiClient.patch(`/bookings/${confirmationNumber}`, updates)
    return response.data
  },

  // Cancel booking
  async cancelBooking(confirmationNumber: string): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/bookings/${confirmationNumber}`)
    return response.data
  },

  // Get barber details for booking
  async getBarberDetails(barberId: number): Promise<ApiResponse<{
    id: number
    name: string
    email: string
    phone?: string
    bio?: string
    years_experience?: number
    specialties?: string[]
    location: {
      id: number
      name: string
      address: string
      city: string
      state: string
      zip: string
    }
    rating: number
    total_reviews: number
    services: Service[]
    availability: {
      [key: string]: {
        start: string
        end: string
        breaks?: Array<{ start: string; end: string }>
      }
    }
    gallery?: Array<{
      id: number
      url: string
      caption?: string
    }>
    certifications?: Array<{
      id: number
      name: string
      issuer: string
      date: string
    }>
  }>> {
    const response = await apiClient.get(`/barbers/${barberId}`)
    return response.data
  },

  // Get barber reviews
  async getBarberReviews(
    barberId: number,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedResponse<{
    id: number
    client_name: string
    rating: number
    comment: string
    service_name: string
    created_at: string
  }>> {
    const response = await apiClient.get(`/barbers/${barberId}/reviews`, { params })
    return response.data
  },

  // Send booking confirmation email
  async sendConfirmationEmail(confirmationNumber: string): Promise<ApiResponse<void>> {
    const response = await apiClient.post(`/bookings/${confirmationNumber}/send-confirmation`)
    return response.data
  },

  // Get booking conflicts
  async checkBookingConflicts(bookingData: BookingRequest): Promise<ApiResponse<{
    has_conflicts: boolean
    conflicts: Array<{
      type: 'barber_unavailable' | 'service_unavailable' | 'location_closed'
      message: string
    }>
  }>> {
    const response = await apiClient.post('/bookings/check-conflicts', bookingData)
    return response.data
  }
}
