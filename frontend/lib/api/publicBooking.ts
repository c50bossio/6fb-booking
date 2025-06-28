/**
 * Public booking API service
 * For public-facing booking endpoints that don't require authentication
 */

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ApiResponse<T> {
  data: T
  status: number
  message?: string
}

// Public location/shop types
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
  operating_hours: Record<string, string> | null
  is_active: boolean
  timezone?: string
}

// Public barber profile types
export interface PublicBarberProfile {
  id: number
  first_name: string
  last_name: string
  business_name?: string
  average_rating?: number
  total_reviews: number
  bio?: string
  profile_image?: string
  specialties?: string[]
}

// Public service types
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

// Time slot types
export interface TimeSlot {
  time: string
  available: boolean
  reason?: string
}

export interface AvailabilityResponse {
  barber_id: number
  service_id: number
  timezone: string
  slots: TimeSlot[]
}

// Booking request/response types
export interface CreateBookingRequest {
  barber_id?: number | null
  service_id: number
  appointment_date: string
  appointment_time: string
  location_id?: number | null
  client_info: {
    name: string
    email: string
    phone: string
  }
  notes?: string
  payment_method?: string
  payment_type?: string
}

export interface BookingConfirmationResponse {
  booking_token: string
  appointment_id: number
  confirmation_message: string
  appointment_details: Record<string, any>
  assigned_barber?: Record<string, any>
}

class PublicBookingService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}/api/v1/booking/public${endpoint}`

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      data,
      status: response.status,
      message: 'Success'
    }
  }

  /**
   * Get all active shops/locations
   */
  async getShops(filters?: {
    is_active?: boolean
    city?: string
    state?: string
  }): Promise<ApiResponse<PublicLocationInfo[]>> {
    const params = new URLSearchParams()
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString())
    if (filters?.city) params.append('city', filters.city)
    if (filters?.state) params.append('state', filters.state)

    const query = params.toString() ? `?${params.toString()}` : ''
    return this.makeRequest<PublicLocationInfo[]>(`/shops${query}`)
  }

  /**
   * Get specific shop information
   */
  async getShop(shopId: number): Promise<ApiResponse<PublicLocationInfo>> {
    return this.makeRequest<PublicLocationInfo>(`/shops/${shopId}`)
  }

  /**
   * Get all barbers (optionally filtered by location)
   */
  async getBarbers(filters?: {
    location_id?: number
  }): Promise<ApiResponse<PublicBarberProfile[]>> {
    const params = new URLSearchParams()
    if (filters?.location_id) params.append('location_id', filters.location_id.toString())

    const query = params.toString() ? `?${params.toString()}` : ''
    return this.makeRequest<PublicBarberProfile[]>(`/barbers${query}`)
  }

  /**
   * Get barbers for a specific shop
   */
  async getShopBarbers(shopId: number): Promise<ApiResponse<PublicBarberProfile[]>> {
    return this.makeRequest<PublicBarberProfile[]>(`/shops/${shopId}/barbers`)
  }

  /**
   * Get services for a specific shop
   */
  async getShopServices(
    shopId: number,
    filters?: {
      category_id?: number
      is_addon?: boolean
    }
  ): Promise<ApiResponse<PublicServiceInfo[]>> {
    const params = new URLSearchParams()
    if (filters?.category_id) params.append('category_id', filters.category_id.toString())
    if (filters?.is_addon !== undefined) params.append('is_addon', filters.is_addon.toString())

    const query = params.toString() ? `?${params.toString()}` : ''
    return this.makeRequest<PublicServiceInfo[]>(`/shops/${shopId}/services${query}`)
  }

  /**
   * Get services for a specific barber
   */
  async getBarberServices(
    barberId: number,
    filters?: {
      category_id?: number
      is_addon?: boolean
    }
  ): Promise<ApiResponse<PublicServiceInfo[]>> {
    const params = new URLSearchParams()
    if (filters?.category_id) params.append('category_id', filters.category_id.toString())
    if (filters?.is_addon !== undefined) params.append('is_addon', filters.is_addon.toString())

    const query = params.toString() ? `?${params.toString()}` : ''
    return this.makeRequest<PublicServiceInfo[]>(`/barbers/${barberId}/services${query}`)
  }

  /**
   * Get availability for a barber
   */
  async getBarberAvailability(
    barberId: number,
    serviceId: number,
    startDate: string,
    endDate?: string
  ): Promise<ApiResponse<AvailabilityResponse>> {
    const params = new URLSearchParams()
    params.append('service_id', serviceId.toString())
    params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)

    return this.makeRequest<AvailabilityResponse>(`/barbers/${barberId}/availability?${params.toString()}`)
  }

  /**
   * Get "Any Professional" availability for a location
   */
  async getAnyProfessionalAvailability(
    locationId: number,
    serviceId: number,
    date: string
  ): Promise<ApiResponse<any>> {
    const params = new URLSearchParams()
    params.append('service_id', serviceId.toString())
    params.append('date', date)

    return this.makeRequest<any>(`/locations/${locationId}/any-professional-availability?${params.toString()}`)
  }

  /**
   * Create a new booking
   */
  async createBooking(bookingData: CreateBookingRequest): Promise<ApiResponse<BookingConfirmationResponse>> {
    return this.makeRequest<BookingConfirmationResponse>('/bookings/create', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    })
  }

  /**
   * Confirm a booking using token
   */
  async confirmBooking(token: string): Promise<ApiResponse<any>> {
    return this.makeRequest<any>(`/bookings/confirm/${token}`)
  }

  /**
   * Get payment settings for a shop
   */
  async getShopPaymentSettings(shopId: number): Promise<ApiResponse<any>> {
    return this.makeRequest<any>(`/shops/${shopId}/payment-settings`)
  }
}

// Export singleton instance
export const publicBookingService = new PublicBookingService()

// Export aliases for backward compatibility
export const locationsService = {
  getLocations: (filters?: { is_active?: boolean }) => publicBookingService.getShops(filters)
}

export const servicesService = {
  getServices: (params?: { location_id?: number; barber_id?: number; is_active?: boolean }) => {
    if (params?.barber_id) {
      return publicBookingService.getBarberServices(params.barber_id)
    } else if (params?.location_id) {
      return publicBookingService.getShopServices(params.location_id)
    }
    throw new Error('Either location_id or barber_id must be provided')
  }
}

export const barbersService = {
  getBarbers: (filters?: { location_id?: number; service_id?: number; is_active?: boolean }) => {
    if (filters?.location_id) {
      return publicBookingService.getShopBarbers(filters.location_id)
    }
    return publicBookingService.getBarbers(filters)
  },

  getAvailability: (
    barberId: number,
    startDate: string,
    endDate: string,
    serviceId: number,
    durationMinutes: number
  ) => {
    return publicBookingService.getBarberAvailability(barberId, serviceId, startDate, endDate)
  }
}

export const bookingService = {
  createBooking: (bookingData: any) => {
    // Transform the data format if needed
    const transformed: CreateBookingRequest = {
      service_id: bookingData.service_id,
      barber_id: bookingData.barber_id,
      appointment_date: bookingData.appointment_date,
      appointment_time: bookingData.appointment_time,
      location_id: bookingData.location_id,
      client_info: bookingData.client_info,
      notes: bookingData.notes
    }
    return publicBookingService.createBooking(transformed)
  }
}
