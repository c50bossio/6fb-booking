/**
 * Public Booking API service - No authentication required
 * Complete frontend API service for the 6FB Booking public booking system
 *
 * This service provides access to all public booking endpoints without authentication.
 * It matches the backend API structure exactly and includes proper TypeScript types.
 */

// Environment configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || ''

if (!API_BASE_URL) {
  console.warn('NEXT_PUBLIC_API_URL not set, API calls may fail')
}

// Generic API response wrapper
interface ApiResponse<T> {
  data: T
  status: number
  message?: string
}

// API Error handling
export class PublicBookingApiError extends Error {
  status: number
  details?: any

  constructor(message: string, status: number, details?: any) {
    super(message)
    this.name = 'PublicBookingApiError'
    this.status = status
    this.details = details
  }
}

// =============================================================================
// TYPE DEFINITIONS - Based on backend Pydantic models
// =============================================================================

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
  operating_hours: Record<string, any> | null
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
  date: string  // ISO date format
  start_time: string  // HH:MM format
  end_time: string    // HH:MM format
  available: boolean
  reason?: string     // If not available, why
}

export interface AvailabilityResponse {
  barber_id: number
  service_id: number
  timezone: string
  slots: TimeSlot[]
}

export interface AnyProfessionalAvailabilityResponse {
  location_id: number
  service_id: number
  timezone: string
  date: string
  slots: TimeSlot[]
  total_available_slots: number
  message: string
}

export interface CreateBookingRequest {
  barber_id?: number  // Optional for "Any Professional" selection
  service_id: number
  appointment_date: string  // YYYY-MM-DD format
  appointment_time: string  // HH:MM format
  client_first_name: string
  client_last_name: string
  client_email: string
  client_phone: string
  notes?: string
  timezone?: string
  location_id?: number  // Required for "Any Professional" selection
  payment_method?: string  // "online" | "in_person"
  payment_type?: string    // "full" | "deposit" | "in_person"
}

export interface BookingConfirmationResponse {
  booking_token: string
  appointment_id: number
  confirmation_message: string
  appointment_details: Record<string, any>
  assigned_barber?: {
    id: number
    name: string
    business_name?: string
    message: string
  }
}

export interface LocationPaymentSettings {
  pay_in_person_enabled: boolean
  pay_in_person_message?: string
  accepts_cash: boolean
  accepts_credit_card: boolean
  accepts_digital_wallet: boolean
  requires_deposit: boolean
  deposit_percentage?: number
  deposit_fixed_amount?: number
}

// Payment-related types
export interface PublicPaymentIntentCreate {
  appointment_id: number
  amount: number  // Amount in cents
  metadata?: Record<string, any>
}

export interface PublicPaymentIntentResponse {
  client_secret: string
  payment_intent_id: string
  amount: number
  requires_action: boolean
  status: string
}

export interface PublicPaymentConfirm {
  payment_intent_id: string
  payment_method_id?: string
}

export interface PublicPaymentResponse {
  payment_id: number
  status: string
  amount: number
  paid_at?: string
}

export interface PaymentStatusResponse {
  payment_required: boolean
  payment_status: string
  appointment_id: number
  amount?: number
  payment_intent?: string
  payment_id?: number
}

// =============================================================================
// MAIN API SERVICE CLASS
// =============================================================================

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
      let errorDetails
      try {
        errorDetails = await response.json()
      } catch {
        errorDetails = { message: response.statusText }
      }

      throw new PublicBookingApiError(
        errorDetails.detail || errorDetails.message || `HTTP ${response.status}`,
        response.status,
        errorDetails
      )
    }

    const data = await response.json()
    return {
      data,
      status: response.status,
    }
  }

  // ========================================================================
  // SHOPS/LOCATIONS ENDPOINTS
  // ========================================================================

  /**
   * GET /api/v1/booking/public/shops
   * Get all public shops/locations
   */
  async getShops(filters?: {
    is_active?: boolean
    city?: string
    state?: string
  }): Promise<PublicLocationInfo[]> {
    const params = new URLSearchParams()

    if (filters?.is_active !== undefined) {
      params.append('is_active', filters.is_active.toString())
    }
    if (filters?.city) {
      params.append('city', filters.city)
    }
    if (filters?.state) {
      params.append('state', filters.state)
    }

    const queryString = params.toString()
    const endpoint = `/shops${queryString ? `?${queryString}` : ''}`

    const response = await this.makeRequest<PublicLocationInfo[]>(endpoint)
    return response.data
  }

  /**
   * GET /api/v1/booking/public/shops/{shop_id}
   * Get public information about a specific shop/location
   */
  async getShopInfo(shopId: number): Promise<PublicLocationInfo> {
    const response = await this.makeRequest<PublicLocationInfo>(`/shops/${shopId}`)
    return response.data
  }

  /**
   * GET /api/v1/booking/public/shops/{shop_id}/payment-settings
   * Get payment settings for a specific shop/location
   */
  async getShopPaymentSettings(shopId: number): Promise<LocationPaymentSettings> {
    const response = await this.makeRequest<LocationPaymentSettings>(`/shops/${shopId}/payment-settings`)
    return response.data
  }

  // ========================================================================
  // BARBERS ENDPOINTS
  // ========================================================================

  /**
   * GET /api/v1/booking/public/barbers
   * Get all active barbers or filter by location
   */
  async getBarbers(filters?: {
    location_id?: number
    is_active?: boolean
  }): Promise<PublicBarberProfile[]> {
    const params = new URLSearchParams()

    if (filters?.location_id) {
      params.append('location_id', filters.location_id.toString())
    }
    if (filters?.is_active !== undefined) {
      params.append('is_active', filters.is_active.toString())
    }

    const queryString = params.toString()
    const endpoint = `/barbers${queryString ? `?${queryString}` : ''}`

    const response = await this.makeRequest<PublicBarberProfile[]>(endpoint)
    return response.data
  }

  /**
   * GET /api/v1/booking/public/shops/{shop_id}/barbers
   * Get all barbers for a specific shop/location
   */
  async getShopBarbers(shopId: number): Promise<PublicBarberProfile[]> {
    const response = await this.makeRequest<PublicBarberProfile[]>(`/shops/${shopId}/barbers`)
    return response.data
  }

  // ========================================================================
  // SERVICES ENDPOINTS
  // ========================================================================

  /**
   * GET /api/v1/booking/public/shops/{shop_id}/services
   * Get all services for a specific shop/location
   */
  async getShopServices(
    shopId: number,
    filters?: {
      category_id?: number
      is_addon?: boolean
    }
  ): Promise<PublicServiceInfo[]> {
    const params = new URLSearchParams()

    if (filters?.category_id) {
      params.append('category_id', filters.category_id.toString())
    }
    if (filters?.is_addon !== undefined) {
      params.append('is_addon', filters.is_addon.toString())
    }

    const queryString = params.toString()
    const endpoint = `/shops/${shopId}/services${queryString ? `?${queryString}` : ''}`

    const response = await this.makeRequest<PublicServiceInfo[]>(endpoint)
    return response.data
  }

  /**
   * GET /api/v1/booking/public/barbers/{barber_id}/services
   * Get services offered by a specific barber
   */
  async getBarberServices(
    barberId: number,
    filters?: {
      category_id?: number
      is_addon?: boolean
    }
  ): Promise<PublicServiceInfo[]> {
    const params = new URLSearchParams()

    if (filters?.category_id) {
      params.append('category_id', filters.category_id.toString())
    }
    if (filters?.is_addon !== undefined) {
      params.append('is_addon', filters.is_addon.toString())
    }

    const queryString = params.toString()
    const endpoint = `/barbers/${barberId}/services${queryString ? `?${queryString}` : ''}`

    const response = await this.makeRequest<PublicServiceInfo[]>(endpoint)
    return response.data
  }

  // ========================================================================
  // AVAILABILITY ENDPOINTS
  // ========================================================================

  /**
   * GET /api/v1/booking/public/barbers/{barber_id}/availability
   * Get available booking slots for a specific barber
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

    if (endDate) {
      params.append('end_date', endDate)
    }

    const endpoint = `/barbers/${barberId}/availability?${params.toString()}`
    const response = await this.makeRequest<AvailabilityResponse>(endpoint)
    return response.data
  }

  /**
   * GET /api/v1/booking/public/locations/{location_id}/any-professional-availability
   * Get availability for "Any Professional" at a location for a specific service and date
   */
  async getAnyProfessionalAvailability(
    locationId: number,
    serviceId: number,
    date: string,
    timezone: string = 'America/New_York'
  ): Promise<AnyProfessionalAvailabilityResponse> {
    const params = new URLSearchParams({
      service_id: serviceId.toString(),
      date,
      timezone
    })

    const endpoint = `/locations/${locationId}/any-professional-availability?${params.toString()}`
    const response = await this.makeRequest<AnyProfessionalAvailabilityResponse>(endpoint)
    return response.data
  }

  // ========================================================================
  // BOOKING ENDPOINTS
  // ========================================================================

  /**
   * POST /api/v1/booking/public/bookings/create
   * Create a new booking
   */
  async createBooking(bookingData: CreateBookingRequest): Promise<BookingConfirmationResponse> {
    const response = await this.makeRequest<BookingConfirmationResponse>(
      '/bookings/create',
      {
        method: 'POST',
        body: JSON.stringify({
          ...bookingData,
          timezone: bookingData.timezone || 'America/New_York',
          payment_method: bookingData.payment_method || 'online',
          payment_type: bookingData.payment_type || 'full'
        })
      }
    )
    return response.data
  }

  /**
   * GET /api/v1/booking/public/bookings/confirm/{booking_token}
   * Confirm a booking using the token
   */
  async confirmBooking(bookingToken: string): Promise<any> {
    const response = await this.makeRequest(`/bookings/confirm/${bookingToken}`)
    return response.data
  }

  // ========================================================================
  // PAYMENT ENDPOINTS
  // ========================================================================

  /**
   * POST /api/v1/booking/public/payments/create-intent
   * Create a payment intent for public booking (no authentication required)
   */
  async createPaymentIntent(paymentData: PublicPaymentIntentCreate): Promise<PublicPaymentIntentResponse> {
    const response = await this.makeRequest<PublicPaymentIntentResponse>(
      '/payments/create-intent',
      {
        method: 'POST',
        body: JSON.stringify(paymentData)
      }
    )
    return response.data
  }

  /**
   * POST /api/v1/booking/public/payments/confirm
   * Confirm a payment for public booking
   */
  async confirmPayment(confirmData: PublicPaymentConfirm): Promise<PublicPaymentResponse> {
    const response = await this.makeRequest<PublicPaymentResponse>(
      '/payments/confirm',
      {
        method: 'POST',
        body: JSON.stringify(confirmData)
      }
    )
    return response.data
  }

  /**
   * GET /api/v1/booking/public/payments/status/{appointment_id}
   * Get payment status for an appointment
   */
  async getPaymentStatus(appointmentId: number): Promise<PaymentStatusResponse> {
    const response = await this.makeRequest<PaymentStatusResponse>(`/payments/status/${appointmentId}`)
    return response.data
  }
}

// =============================================================================
// EXPORT SERVICE INSTANCE
// =============================================================================

export const publicBookingService = new PublicBookingService()

// =============================================================================
// BACKWARD COMPATIBILITY LAYER
// =============================================================================
// Export aliases for existing code that might use the old service names

export const locationsService = {
  getAll: (filters?: { is_active?: boolean; city?: string; state?: string }) =>
    publicBookingService.getShops(filters)
}

export const servicesService = {
  getByLocation: (shopId: number, filters?: { category_id?: number; is_addon?: boolean }) =>
    publicBookingService.getShopServices(shopId, filters)
}

export const barbersService = {
  getByLocation: (shopId: number) =>
    publicBookingService.getShopBarbers(shopId),

  getAll: (filters?: { location_id?: number; is_active?: boolean }) =>
    publicBookingService.getBarbers(filters)
}

export const bookingService = {
  create: (bookingData: CreateBookingRequest) =>
    publicBookingService.createBooking(bookingData),

  confirm: (bookingToken: string) =>
    publicBookingService.confirmBooking(bookingToken)
}

export const paymentService = {
  createIntent: (paymentData: PublicPaymentIntentCreate) =>
    publicBookingService.createPaymentIntent(paymentData),

  confirm: (confirmData: PublicPaymentConfirm) =>
    publicBookingService.confirmPayment(confirmData),

  getStatus: (appointmentId: number) =>
    publicBookingService.getPaymentStatus(appointmentId)
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default publicBookingService
