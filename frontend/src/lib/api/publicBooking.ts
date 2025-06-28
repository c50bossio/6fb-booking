/**
 * Public Booking API service - No authentication required
 * Used for guest checkout and public booking flow
 */

import axios from 'axios'
import { getApiBaseUrl } from './corsHelper'

// Create a separate axios instance for public endpoints
// This instance doesn't include authentication tokens
const publicApiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for public API
publicApiClient.interceptors.request.use(
  (config) => {
    // Set dynamic base URL
    config.baseURL = getApiBaseUrl()

    // Add request ID for debugging
    config.headers['X-Request-ID'] = Date.now().toString()

    // Log outgoing requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Public API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        timestamp: new Date().toISOString()
      })
    }

    return config
  },
  (error) => {
    console.error('Public request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
publicApiClient.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Public API Success:', response.config.method?.toUpperCase(), response.config.url, response.status)
    }
    return response
  },
  (error) => {
    const errorInfo = {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      details: error.response?.data?.detail || null,
      timestamp: new Date().toISOString()
    }

    console.error('Public API Error:', errorInfo)
    return Promise.reject(error)
  }
)

// Type definitions
export interface PublicLocationInfo {
  id: number
  name: string
  location_code: string
  address: string
  city: string
  state: string
  zip_code: string
  phone: string
  email: string
  operating_hours: Record<string, any>
  is_active: boolean
  timezone: string
}

export interface PublicBarberProfile {
  id: number
  first_name: string
  last_name: string
  business_name?: string
  average_rating?: number
  total_reviews: number
  bio?: string
  profile_image?: string
}

export interface PublicServiceInfo {
  id: number
  name: string
  description?: string
  category_id: number
  category_name: string
  base_price: number
  min_price?: number
  max_price?: number
  duration_minutes: number
  requires_deposit: boolean
  deposit_amount?: number
  deposit_type?: string
  is_addon: boolean
  tags?: string[]
}

export interface TimeSlot {
  date: string
  start_time: string
  end_time: string
  available: boolean
  reason?: string
}

export interface AvailabilityResponse {
  barber_id: number
  service_id: number
  timezone: string
  slots: TimeSlot[]
}

export interface CreateBookingRequest {
  barber_id: number
  service_id: number
  appointment_date: string
  appointment_time: string
  client_first_name: string
  client_last_name: string
  client_email: string
  client_phone: string
  notes?: string
  timezone?: string
}

export interface BookingConfirmationResponse {
  booking_token: string
  appointment_id: number
  confirmation_message: string
  appointment_details: {
    barber: string
    service: string
    date: string
    time: string
    duration: string
    price: string
    location: string
    payment?: {
      payment_method: string
      payment_status: string
      amount?: string
      deposit_amount?: string
      remaining_amount?: string
      payment_instructions?: string
    }
  }
  assigned_barber?: {
    id: number
    name: string
    business_name?: string
    message: string
  }
}

export interface PublicPaymentIntent {
  client_secret: string
  payment_intent_id: string
  amount: number
  requires_action: boolean
  status: string
}

export interface PublicPaymentConfirm {
  payment_id: number
  status: string
  amount: number
  paid_at?: string
}

// Public Booking API Service
export const publicBookingService = {
  /**
   * Get public shop/location information
   */
  async getShopInfo(shopId: number): Promise<PublicLocationInfo> {
    const response = await publicApiClient.get<PublicLocationInfo>(`/api/v1/booking/public/shops/${shopId}`)
    return response.data
  },

  /**
   * Get all barbers for a shop
   */
  async getShopBarbers(shopId: number): Promise<PublicBarberProfile[]> {
    const response = await publicApiClient.get<PublicBarberProfile[]>(`/api/v1/booking/public/shops/${shopId}/barbers`)
    return response.data
  },

  /**
   * Get all services for a shop
   */
  async getShopServices(
    shopId: number,
    categoryId?: number,
    isAddon?: boolean
  ): Promise<PublicServiceInfo[]> {
    const params = new URLSearchParams()
    if (categoryId) params.append('category_id', categoryId.toString())
    if (isAddon !== undefined) params.append('is_addon', isAddon.toString())

    const response = await publicApiClient.get<PublicServiceInfo[]>(
      `/api/v1/booking/public/shops/${shopId}/services${params.toString() ? '?' + params.toString() : ''}`
    )
    return response.data
  },

  /**
   * Get all barbers (no shop filter)
   */
  async getAllBarbers(locationId?: number): Promise<PublicBarberProfile[]> {
    const params = locationId ? `?location_id=${locationId}` : ''
    const response = await publicApiClient.get<PublicBarberProfile[]>(`/api/v1/booking/public/barbers${params}`)
    return response.data
  },

  /**
   * Get services offered by a specific barber
   */
  async getBarberServices(
    barberId: number,
    categoryId?: number,
    isAddon?: boolean
  ): Promise<PublicServiceInfo[]> {
    const params = new URLSearchParams()
    if (categoryId) params.append('category_id', categoryId.toString())
    if (isAddon !== undefined) params.append('is_addon', isAddon.toString())

    const response = await publicApiClient.get<PublicServiceInfo[]>(
      `/api/v1/booking/public/barbers/${barberId}/services${params.toString() ? '?' + params.toString() : ''}`
    )
    return response.data
  },

  /**
   * Get barber availability
   */
  async getBarberAvailability(
    barberId: number,
    serviceId: number,
    startDate: string,
    endDate?: string,
    timezone: string = 'America/New_York'
  ): Promise<AvailabilityResponse> {
    const params = new URLSearchParams({
      service_id: serviceId.toString(),
      start_date: startDate,
      timezone
    })
    if (endDate) params.append('end_date', endDate)

    const response = await publicApiClient.get<AvailabilityResponse>(
      `/api/v1/booking/public/barbers/${barberId}/availability?${params.toString()}`
    )
    return response.data
  },

  /**
   * Create a booking
   */
  async createBooking(data: CreateBookingRequest): Promise<BookingConfirmationResponse> {
    const response = await publicApiClient.post<BookingConfirmationResponse>(
      '/api/v1/booking/public/bookings/create',
      data
    )
    return response.data
  },

  /**
   * Confirm booking with token
   */
  async confirmBooking(bookingToken: string): Promise<any> {
    const response = await publicApiClient.get(`/api/v1/booking/public/bookings/confirm/${bookingToken}`)
    return response.data
  },

  /**
   * Create payment intent for public booking (no auth required)
   */
  async createPaymentIntent(data: {
    appointment_id: number
    amount: number
    metadata?: Record<string, any>
  }): Promise<PublicPaymentIntent> {
    const response = await publicApiClient.post<PublicPaymentIntent>(
      '/api/v1/booking/public/payments/create-intent',
      data
    )
    return response.data
  },

  /**
   * Confirm payment for public booking
   */
  async confirmPayment(data: {
    payment_intent_id: string
    payment_method_id?: string
  }): Promise<PublicPaymentConfirm> {
    const response = await publicApiClient.post<PublicPaymentConfirm>(
      '/api/v1/booking/public/payments/confirm',
      data
    )
    return response.data
  },

  /**
   * Get payment status for appointment
   */
  async getPaymentStatus(appointmentId: number): Promise<{
    payment_required: boolean
    payment_status: string
    amount?: number
    payment_intent?: string
  }> {
    const response = await publicApiClient.get(
      `/api/v1/booking/public/payments/status/${appointmentId}`
    )
    return response.data
  }
}
