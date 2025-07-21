import { validateAPIRequest, validateAPIResponse, APIPerformanceMonitor, retryOperation, defaultRetryConfigs } from './apiUtils'
import { toast } from '@/hooks/use-toast'
import { getEnhancedErrorMessage, formatErrorForToast, ErrorContext } from './error-messages'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Service categories for pricing validation
export enum ServiceCategoryEnum {
  HAIRCUT = 'haircut',
  BEARD = 'beard',
  HAIRCUT_BEARD = 'haircut_beard',
  STYLING = 'styling',
  WASH = 'wash',
  TREATMENT = 'treatment',
  CONSULTATION = 'consultation',
  PACKAGE = 'package',
  ADDON = 'addon'
}

// Webhook types
export interface WebhookEndpoint {
  id: string
  url: string
  name: string
  description?: string
  events: string[]
  auth_type: 'none' | 'bearer' | 'basic' | 'hmac' | 'api_key'
  auth_config?: Record<string, any>
  headers?: Record<string, string>
  is_active: boolean
  max_retries: number
  retry_delay_seconds: number
  timeout_seconds: number
  created_at: string
  updated_at: string
  total_deliveries: number
  successful_deliveries: number
  failed_deliveries: number
  success_rate: number
  last_triggered_at?: string
  last_success_at?: string
  last_failure_at?: string
}

export interface WebhookLog {
  id: string
  endpoint_id: string
  event_type: string
  event_id?: string
  status: 'pending' | 'success' | 'failed' | 'retrying'
  status_code?: number
  request_url: string
  request_method: string
  request_headers?: Record<string, string>
  request_body?: any
  response_headers?: Record<string, string>
  response_body?: string
  response_time_ms?: number
  error_message?: string
  retry_count: number
  next_retry_at?: string
  created_at: string
  delivered_at?: string
  completed_at?: string
}

export interface WebhookEvent {
  value: string
  name: string
  category: string
  description: string
}

export interface WebhookStats {
  total_endpoints: number
  active_endpoints: number
  last_24h: {
    total_deliveries: number
    successful_deliveries: number
    failed_deliveries: number
    success_rate: number
  }
  recent_failures: Array<{
    id: string
    endpoint_id: string
    event_type: string
    error_message?: string
    created_at: string
  }>
}

// Enhanced fetch wrapper with validation, monitoring, and automatic token refresh
async function fetchAPI(endpoint: string, options: RequestInit = {}, retry = true): Promise<any> {
  // Start performance monitoring
  const endTiming = APIPerformanceMonitor.startTiming(endpoint)
  
  // Validate request data if present
  if (options.body && typeof options.body === 'string') {
    try {
      const requestData = JSON.parse(options.body)
      const validation = validateAPIRequest(endpoint, requestData)
      if (!validation.isValid) {
        const error = new Error(`Request validation failed: ${validation.errors.join(', ')}`)
        APIPerformanceMonitor.recordError(endpoint)
        endTiming()
        throw error
      }
    } catch (parseError) {
      // If JSON parsing fails, continue (might be form data or other format)
    }
  }
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...(!(options.body instanceof FormData) && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  }

  let response: Response
  const fullUrl = `${API_URL}${endpoint}`
  console.log('🌐 Making API request to:', fullUrl)
  console.log('🔧 API_URL:', API_URL)
  console.log('🔧 endpoint:', endpoint)
  
  try {
    response = await fetch(fullUrl, config)
    console.log('✅ Response status:', response.status)
  } catch (error) {
    // Network error or CORS issue
    console.error(`Network error calling ${endpoint}:`, error)
    console.error('API URL:', API_URL)
    console.error('Full URL:', fullUrl)
    console.error('Token present:', !!token)
    const errorMessage = 'Failed to connect to server. Please check your connection and try again.'
    // Note: Toast should be called from components, not here in the API layer
    throw new Error(`${errorMessage} (${error})`)
  }
  
  // Handle 401 with automatic token refresh
  if (response.status === 401 && retry && endpoint !== '/api/v2/auth/refresh') {
    try {
      // Try to refresh token
      const refresh_token = localStorage.getItem('refresh_token')
      if (refresh_token) {
        const refreshResponse = await fetch(`${API_URL}/api/v2/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token }),
        })
        
        if (refreshResponse.ok) {
          const data = await refreshResponse.json()
          localStorage.setItem('token', data.access_token)
          // Also update the cookie
          document.cookie = `token=${data.access_token}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=strict`
          if (data.refresh_token) {
            localStorage.setItem('refresh_token', data.refresh_token)
          }
          // Retry original request with new token
          return fetchAPI(endpoint, options, false)
        }
      }
    } catch (error) {
      // If refresh fails, redirect to login
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      // Remove the cookie
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=strict'
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
  }
  
  if (!response.ok) {
    let errorData: APIError
    try {
      errorData = await response.json()
    } catch {
      // Network or parsing error - use enhanced error messaging
      const context: ErrorContext = { endpoint }
      const enhancedError = getEnhancedErrorMessage(response.status, {}, context)
      
      // Show user-friendly toast notification
      toast(formatErrorForToast(enhancedError))
      
      // Record error for monitoring
      APIPerformanceMonitor.recordError(endpoint)
      endTiming()
      
      const error = new Error(enhancedError.message)
      ;(error as any).status = response.status
      ;(error as any).enhancedError = enhancedError
      throw error
    }
    
    // Create context for enhanced error messaging
    const context: ErrorContext = { 
      endpoint,
      action: endpoint.includes('/login') ? 'login' : 
             endpoint.includes('/register') ? 'registration' :
             endpoint.includes('/appointment') ? 'booking' :
             endpoint.includes('/payment') ? 'payment' : undefined
    }
    
    // Generate enhanced error message
    const enhancedError = getEnhancedErrorMessage(response.status, errorData, context)
    
    // Show user-friendly toast notification
    toast(formatErrorForToast(enhancedError))
    
    // Record error for monitoring with additional context
    APIPerformanceMonitor.recordError(endpoint)
    endTiming()
    
    // Create enhanced error object
    const error = new Error(enhancedError.message)
    ;(error as any).status = response.status
    ;(error as any).enhancedError = enhancedError
    ;(error as any).originalData = errorData
    
    // Handle automatic redirects for auth errors
    if (response.status === 401 && !retry) {
      // If refresh already failed, redirect to login
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=strict'
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/login'
        }, 2000) // Give user time to read the error message
      }
    }
    
    throw error
  }

  const responseData = await response.json()
  
  // Validate response data structure
  const responseValidation = validateAPIResponse(endpoint, responseData)
  if (!responseValidation.isValid) {
    console.warn(`Response validation failed for ${endpoint}:`, responseValidation.errors)
    // Don't throw error for response validation - just log warning
  }
  
  endTiming()
  return responseData
}

// Auth functions with retry logic for critical operations
export async function login(email: string, password: string) {
  const requestBody = { email, password };
  console.log('🚀 Login request body:', requestBody);
  console.log('🚀 Login request body JSON:', JSON.stringify(requestBody));
  
  const response = await retryOperation(
    () => fetchAPI('/api/v2/auth/login', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    }),
    defaultRetryConfigs.critical,
    (error) => {
      // Don't retry auth errors
      return !error.message?.includes('401') && !error.message?.includes('Invalid')
    }
  )
  
  // Note: Token storage is now handled by useAuth hook via setAuthTokens()
  
  return response
}

export async function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('refresh_token')
  // Remove the cookie by setting it with an expired date
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=strict'
}

// @deprecated - Use registerComplete() instead. This old function uses a single "name" field.
// export async function register(email: string, password: string, name: string, createTestData: boolean = false, userType: string = 'client') {
//   return fetchAPI('/api/v2/auth/register', {
//     method: 'POST',
//     body: JSON.stringify({ email, password, name, role: userType }),
//   })
// }

export interface CompleteRegistrationData {
  firstName: string
  lastName: string
  email: string
  password: string
  user_type: 'barber' | 'barbershop'
  businessName: string
  businessType: 'individual' | 'studio' | 'enterprise' | 'salon'
  address: {
    street: string
    city: string
    state: string
    zipCode: string
  }
  phone?: string
  website?: string
  chairCount: number
  barberCount: number
  description?: string
  pricingInfo?: {
    chairs: number
    monthlyTotal: number
    tier: string
  }
  consent: {
    terms: boolean
    privacy: boolean
    marketing: boolean
    testData: boolean
  }
}

export async function registerComplete(registrationData: CompleteRegistrationData) {
  return fetchAPI('/api/v2/auth/register-complete', {
    method: 'POST',
    body: JSON.stringify(registrationData),
  })
}

export interface ClientRegistrationData {
  first_name: string
  last_name: string
  email: string
  password: string
  phone?: string
  marketing_consent: boolean
}

export interface ClientRegistrationResponse {
  message: string
  user: {
    id: number
    email: string
    name: string
    unified_role: string
    created_at: string
  }
  access_token: string
  refresh_token: string
  token_type: string
}

export async function registerClient(registrationData: ClientRegistrationData): Promise<ClientRegistrationResponse> {
  return fetchAPI('/api/v2/auth/register-client', {
    method: 'POST',
    body: JSON.stringify(registrationData),
  })
}

// Trial status functions
export interface TrialStatus {
  organization_id: number
  organization_name: string
  subscription_status: string
  trial_active: boolean
  trial_started_at: string | null
  trial_expires_at: string | null
  days_remaining: number
  chairs_count: number
  monthly_cost: number
  pricing_breakdown: {
    monthly_total: number
    chair_cost: number
    base_fee: number
    savings?: number
  }
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  features_enabled: Record<string, any>
  billing_plan: string
}

export async function getTrialStatus(organizationId: number): Promise<TrialStatus> {
  return fetchAPI(`/api/v2/organizations/${organizationId}/trial-status`)
}

export async function forgotPassword(email: string) {
  return fetchAPI('/api/v2/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(token: string, newPassword: string) {
  return fetchAPI('/api/v2/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, new_password: newPassword }),
  })
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return fetchAPI('/api/v2/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
}

// Email verification functions
export async function verifyEmail(token: string) {
  return fetchAPI(`/api/v2/auth/verify-email?token=${encodeURIComponent(token)}`, {
    method: 'GET',
  })
}

export async function resendVerification(email: string) {
  return fetchAPI('/api/v2/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function getVerificationStatus() {
  return fetchAPI('/api/v2/auth/verification-status', {
    method: 'GET',
    requireAuth: true,
  })
}

export async function refreshToken() {
  const refresh_token = localStorage.getItem('refresh_token')
  if (!refresh_token) {
    throw new Error('No refresh token available')
  }
  
  const response = await fetchAPI('/api/v2/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token }),
  })
  
  // Update tokens
  if (response.access_token) {
    localStorage.setItem('token', response.access_token)
    // Also update the cookie
    document.cookie = `token=${response.access_token}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=strict`
  }
  if (response.refresh_token) {
    localStorage.setItem('refresh_token', response.refresh_token)
  }
  
  return response
}

// Basic API functions
export async function getProfile(): Promise<User> {
  return retryOperation(
    () => fetchAPI('/api/v2/auth/me'),
    defaultRetryConfigs.standard
  )
}

export async function getAppointments() {
  return fetchAPI('/api/v2/appointments/')
}

export async function createAppointment(data: any) {
  return fetchAPI('/api/v2/appointments/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// Enhanced error handling interfaces
export interface APIError {
  detail: string | ValidationError[]
  message?: string
  retry_after?: number
}

export interface ValidationError {
  loc: (string | number)[]
  msg: string
  type: string
  ctx?: Record<string, any>
}

// TypeScript interfaces matching backend schemas
// Unified Role System Types
export type UnifiedUserRole = 
  | 'super_admin'
  | 'platform_admin'
  | 'enterprise_owner'
  | 'shop_owner'
  | 'individual_barber'
  | 'shop_manager'
  | 'barber'
  | 'receptionist'
  | 'client'
  | 'viewer'

export interface User {
  id: number
  email: string
  name: string
  first_name?: string
  last_name?: string
  email_verified?: boolean
  
  // Unified Role System
  unified_role: UnifiedUserRole
  role_migrated?: boolean
  
  // Legacy fields (deprecated, kept for backwards compatibility)
  role?: string // DEPRECATED: user, barber, admin
  user_type?: string // DEPRECATED: client, barber, barbershop
  
  // Core user fields
  timezone?: string // User's preferred timezone
  created_at: string
  updated_at?: string
  
  // Organization fields (for new organization system)
  primary_organization_id?: number
  primary_organization?: {
    id: number
    name: string
    billing_plan: string
    subscription_status: string
  }
  
  // Trial and subscription fields (legacy - prefer organization-based)
  trial_started_at?: string
  trial_expires_at?: string
  trial_active?: boolean
  subscription_status?: string // trial, active, expired, cancelled
  is_trial_active?: boolean
  trial_days_remaining?: number
  
  // Onboarding fields
  onboarding_completed?: boolean
  onboarding_status?: {
    completed_steps: string[]
    current_step: number
    skipped?: boolean
  }
  is_new_user?: boolean
  
  // Permission helpers (computed on frontend)
  is_business_owner?: boolean
  is_staff_member?: boolean
  is_system_admin?: boolean
  can_manage_billing?: boolean
  can_manage_staff?: boolean
  can_view_analytics?: boolean
}

export interface TimeSlot {
  time: string
  available: boolean
  is_next_available?: boolean
}

export interface NextAvailableSlot {
  date: string
  time: string
  datetime: string
}

export interface BusinessHours {
  start: string
  end: string
}

export interface SlotsResponse {
  date: string
  slots: TimeSlot[]
  next_available?: NextAvailableSlot
  business_hours: BusinessHours
  slot_duration_minutes: number
}

export interface BookingSettings {
  id: number
  business_id: number
  business_name: string
  min_lead_time_minutes: number
  max_advance_days: number
  same_day_cutoff_time?: string
  business_start_time: string
  business_end_time: string
  slot_duration_minutes: number
  show_soonest_available: boolean
  allow_same_day_booking: boolean
  require_advance_booking: boolean
  business_type: string
  business_hours?: string
  holidays?: string
  timezone?: string
  buffer_time_minutes?: number
  created_at: string
  updated_at: string
}

export interface BookingSettingsUpdate {
  business_name?: string
  min_lead_time_minutes?: number
  max_advance_days?: number
  same_day_cutoff_time?: string
  business_start_time?: string
  business_end_time?: string
  slot_duration_minutes?: number
  show_soonest_available?: boolean
  allow_same_day_booking?: boolean
  require_advance_booking?: boolean
  business_type?: string
  business_hours?: string
  holidays?: string
  timezone?: string
  buffer_time_minutes?: number
}

export interface QuickBookingData {
  service: string
  notes?: string
}

export interface BookingResponse {
  id: number
  user_id: number
  service_name: string
  start_time: string
  duration_minutes: number
  price: number
  status: string
  created_at: string
  
  // Critical fields required for calendar display (now guaranteed by normalization)
  end_time: string
  client_name: string
  barber_name: string
  
  // Optional fields
  barber_id?: number
  client_id?: number
  client_email?: string
  client_phone?: string
  notes?: string
  service_id?: number
  recurring_pattern_id?: number
  google_event_id?: string
}

export interface BookingListResponse {
  bookings: BookingResponse[]
  total: number
}

// Enhanced client interfaces
export interface Client {
  id: number
  first_name: string
  last_name: string
  email: string
  phone?: string
  date_of_birth?: string
  notes?: string
  tags?: string
  preferred_barber_id?: number
  customer_type: string
  total_visits: number
  total_spent: number
  average_ticket: number
  visit_frequency_days?: number
  no_show_count: number
  cancellation_count: number
  referral_count: number
  first_visit_date?: string
  last_visit_date?: string
  created_at: string
  updated_at: string
}

export interface ClientCreate {
  first_name: string
  last_name: string
  email: string
  phone?: string
  date_of_birth?: string
  notes?: string
  tags?: string
  preferred_barber_id?: number
  preferred_services?: string[]
  communication_preferences?: {
    sms: boolean
    email: boolean
    marketing: boolean
  }
}

export interface ClientUpdate {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  date_of_birth?: string
  notes?: string
  tags?: string
  preferred_barber_id?: number
  preferred_services?: string[]
  communication_preferences?: {
    sms: boolean
    email: boolean
    marketing: boolean
  }
}

export interface ClientListResponse {
  clients: Client[]
  total: number
  page: number
  page_size: number
}

// Booking functions (migrated to use standardized /appointments endpoints)
export async function getAvailableSlots(params: { date: string; service_id?: number; barber_id?: number }): Promise<SlotsResponse> {
  const queryParams = new URLSearchParams()
  // Backend expects 'appointment_date' as the parameter name
  queryParams.append('appointment_date', params.date)
  if (params.service_id) {
    queryParams.append('service_id', params.service_id.toString())
  }
  if (params.barber_id) {
    queryParams.append('barber_id', params.barber_id.toString())
  }
  console.log('🔗 Calling slots API:', `/api/v2/appointments/slots?${queryParams.toString()}`)
  return fetchAPI(`/api/v2/appointments/slots?${queryParams.toString()}`)
}

export async function getNextAvailableSlot(): Promise<NextAvailableSlot> {
  return fetchAPI('/api/v2/appointments/slots/next-available')
}

export async function getBookingSettings(): Promise<BookingSettings> {
  return fetchAPI('/api/v2/appointments/settings')
}

export async function updateBookingSettings(updates: BookingSettingsUpdate): Promise<BookingSettings> {
  return fetchAPI('/api/v2/appointments/settings', {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
}

export async function createBooking(date: string, time: string, service: string): Promise<BookingResponse> {
  return retryOperation(
    () => fetchAPI('/api/v2/appointments/', {
      method: 'POST',
      body: JSON.stringify({ date, time, service }),
    }),
    defaultRetryConfigs.critical,
    (error) => {
      // Don't retry validation errors or conflicts
      return !error.message?.includes('422') && !error.message?.includes('already booked')
    }
  )
}

// Unified data normalization function to ensure consistent appointment data
function normalizeAppointmentData(rawData: any): BookingResponse {
  // Validate required fields
  if (!rawData || typeof rawData !== 'object') {
    throw new Error('Invalid appointment data: expected object')
  }
  
  if (!rawData.id) {
    throw new Error('Invalid appointment data: missing id')
  }
  
  if (!rawData.start_time) {
    throw new Error('Invalid appointment data: missing start_time')
  }
  
  // Validate start_time format
  try {
    new Date(rawData.start_time)
  } catch {
    throw new Error('Invalid appointment data: invalid start_time format')
  }
  // Calculate end_time if missing
  const calculateEndTime = (startTime: string, duration: number): string => {
    try {
      const start = new Date(startTime)
      const end = new Date(start.getTime() + (duration * 60 * 1000))
      return end.toISOString()
    } catch {
      // Fallback to 30 minutes if calculation fails
      const start = new Date(startTime)
      const end = new Date(start.getTime() + (30 * 60 * 1000))
      return end.toISOString()
    }
  }

  // Normalize client name from various possible formats
  const normalizeClientName = (data: any): string => {
    if (data.client_name) return data.client_name
    if (data.client) {
      const firstName = data.client.first_name || ''
      const lastName = data.client.last_name || ''
      const fullName = `${firstName} ${lastName}`.trim()
      return fullName || 'Guest'
    }
    return 'Guest'
  }

  // Normalize barber name from various possible formats
  const normalizeBarberName = (data: any): string => {
    if (data.barber_name) return data.barber_name
    if (data.barber?.name) return data.barber.name
    if (data.barber?.first_name && data.barber?.last_name) {
      return `${data.barber.first_name} ${data.barber.last_name}`.trim()
    }
    if (data.barber?.email) {
      return data.barber.email.split('@')[0]
    }
    return 'Staff'
  }

  return {
    id: rawData.id,
    user_id: rawData.user_id || 0,
    service_name: rawData.service_name || 'Service',
    start_time: rawData.start_time,
    duration_minutes: rawData.duration_minutes || 30,
    price: rawData.price || 0,
    status: rawData.status || 'pending',
    created_at: rawData.created_at || new Date().toISOString(),
    
    // Ensure these critical fields are always present for calendar views
    end_time: rawData.end_time || calculateEndTime(rawData.start_time, rawData.duration_minutes || 30),
    client_name: normalizeClientName(rawData),
    barber_name: normalizeBarberName(rawData),
    
    // Optional fields with safe defaults
    barber_id: rawData.barber_id || rawData.barber?.id,
    client_id: rawData.client_id || rawData.client?.id,
    client_email: rawData.client_email || rawData.client?.email,
    client_phone: rawData.client_phone || rawData.client?.phone,
    service_id: rawData.service_id,
    notes: rawData.notes,
    recurring_pattern_id: rawData.recurring_pattern_id,
    google_event_id: rawData.google_event_id
  }
}

export async function quickBooking(bookingData: QuickBookingData): Promise<BookingResponse> {
  const appointment = await retryOperation(
    () => fetchAPI('/api/v2/appointments/quick', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    }),
    defaultRetryConfigs.critical,
    (error) => {
      // Don't retry validation errors
      return !error.message?.includes('422') && !error.message?.includes('Invalid')
    }
  )
  
  return normalizeAppointmentData(appointment)
}

export async function getMyBookings(): Promise<BookingListResponse> {
  // Check user role to determine which endpoint to use
  let response
  try {
    const userProfile = await getProfile()
    
    // For admin/barber users, fetch all appointments for calendar view
    if (userProfile.role === 'admin' || userProfile.role === 'super_admin' || userProfile.role === 'barber') {
      response = await fetchAPI('/api/v2/appointments/all/list')
    } else {
      // For regular users, fetch only their appointments
      response = await fetchAPI('/api/v2/appointments/')
    }
  } catch (error) {
    // Fallback to user appointments if profile fetch fails
    console.warn('Failed to get user profile, falling back to user appointments:', error)
    response = await fetchAPI('/api/v2/appointments/')
  }
  
  // Map AppointmentResponse to BookingResponse format with error handling
  const bookings: BookingResponse[] = (response.appointments || [])
    .map((appointment, index) => {
      try {
        return normalizeAppointmentData(appointment)
      } catch (error) {
        console.warn(`Failed to normalize appointment at index ${index}:`, error, appointment)
        return null // Filter out invalid appointments
      }
    })
    .filter((booking): booking is BookingResponse => booking !== null)
  
  return {
    bookings,
    total: response.total || 0
  }
}

export async function cancelBooking(bookingId: number): Promise<BookingResponse> {
  const appointment = await retryOperation(
    () => fetchAPI(`/api/v2/appointments/${bookingId}/cancel`, {
      method: 'PUT',
    }),
    defaultRetryConfigs.critical, // Critical retry config for cancellations
    (error) => {
      // Don't retry if appointment not found (404) or already canceled
      const shouldRetry = !error.message?.includes('404') && 
                         !error.message?.includes('already') &&
                         !error.message?.includes('canceled')
      console.log(`Cancel booking error retry decision: ${shouldRetry}`, error.message)
      return shouldRetry
    }
  )
  return normalizeAppointmentData(appointment)
}

export async function updateBooking(bookingId: number, data: {
  date?: string
  time?: string
  service?: string
  notes?: string
}): Promise<BookingResponse> {
  const appointment = await fetchAPI(`/api/v2/appointments/${bookingId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return normalizeAppointmentData(appointment)
}

export async function rescheduleBooking(bookingId: number, date: string, time: string): Promise<BookingResponse> {
  const appointment = await retryOperation(
    () => fetchAPI(`/api/v2/appointments/${bookingId}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ date, time }),
    }),
    defaultRetryConfigs.critical, // Critical retry config for rescheduling
    (error) => {
      // Don't retry validation errors (422) or appointment not found (404)
      const shouldRetry = !error.message?.includes('422') && 
                         !error.message?.includes('404') &&
                         !error.message?.includes('unavailable')
      console.log(`Reschedule booking error retry decision: ${shouldRetry}`, error.message)
      return shouldRetry
    }
  )
  return normalizeAppointmentData(appointment)
}

// Client management functions
export async function createClient(clientData: ClientCreate): Promise<Client> {
  return fetchAPI('/api/v2/clients/', {
    method: 'POST',
    body: JSON.stringify(clientData),
  })
}

export async function getClients(params?: {
  page?: number
  page_size?: number
  search?: string
  customer_type?: string
  tags?: string
}): Promise<ClientListResponse> {
  const queryParams = new URLSearchParams()
  if (params?.page) queryParams.append('page', params.page.toString())
  if (params?.page_size) queryParams.append('page_size', params.page_size.toString())
  if (params?.search) queryParams.append('search', params.search)
  if (params?.customer_type) queryParams.append('customer_type', params.customer_type)
  if (params?.tags) queryParams.append('tags', params.tags)
  
  const query = queryParams.toString()
  return fetchAPI(`/api/v2/clients/${query ? '?' + query : ''}`)
}

export async function getClient(clientId: number): Promise<Client> {
  return fetchAPI(`/api/v2/clients/${clientId}`)
}

export async function updateClient(clientId: number, updates: ClientUpdate): Promise<Client> {
  return fetchAPI(`/api/v2/clients/${clientId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
}

export async function deleteClient(clientId: number) {
  return fetchAPI(`/api/v2/clients/${clientId}`, {
    method: 'DELETE',
  })
}

export async function getClientHistory(clientId: number) {
  return fetchAPI(`/api/v2/clients/${clientId}/history`)
}

export async function updateCustomerType(clientId: number, customerType: string) {
  return fetchAPI(`/api/v2/clients/${clientId}/customer-type`, {
    method: 'PUT',
    body: JSON.stringify({ customer_type: customerType }),
  })
}

export async function searchClients(query: string, limit = 10) {
  return fetchAPI('/api/v2/clients/search', {
    method: 'POST',
    body: JSON.stringify({ query, limit }),
  })
}

export async function importClients(clients: any[]) {
  return fetchAPI('/api/v2/clients/import', {
    method: 'POST',
    body: JSON.stringify({ clients }),
  })
}

export async function exportClients(params: {
  format: 'csv' | 'excel' | 'json' | 'pdf'
  fields?: string[]
  filters?: Record<string, any>
  date_range?: { start: string; end: string }
}) {
  const queryParams = new URLSearchParams({
    format: params.format,
    ...(params.date_range?.start && { date_from: params.date_range.start }),
    ...(params.date_range?.end && { date_to: params.date_range.end }),
  })
  
  // Add filters as query params
  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value))
      }
    })
  }
  
  return fetchAPI(`/api/v2/exports/clients?${queryParams.toString()}`, {
    method: 'GET',
  })
}

export async function exportAppointments(params: {
  format: 'csv' | 'excel' | 'json' | 'pdf'
  fields?: string[]
  date_range?: { start: string; end: string }
  status?: string[]
}) {
  const queryParams = new URLSearchParams({
    format: params.format,
    ...(params.date_range?.start && { date_from: params.date_range.start }),
    ...(params.date_range?.end && { date_to: params.date_range.end }),
  })
  
  // Add status array as query params
  if (params.status) {
    params.status.forEach(s => queryParams.append('status', s))
  }
  
  return fetchAPI(`/api/v2/exports/appointments?${queryParams.toString()}`, {
    method: 'GET',
  })
}

export async function exportTransactions(params: {
  format: 'csv' | 'excel' | 'json' | 'pdf'
  fields?: string[]
  date_range?: { start: string; end: string }
  status?: string[]
}) {
  // Note: The backend exports router doesn't have a specific transactions endpoint
  // We'll need to use the appointments endpoint with payment data included
  const queryParams = new URLSearchParams({
    format: params.format,
    include_details: 'true',
    ...(params.date_range?.start && { date_from: params.date_range.start }),
    ...(params.date_range?.end && { date_to: params.date_range.end }),
  })
  
  if (params.status) {
    params.status.forEach(s => queryParams.append('status', s))
  }
  
  return fetchAPI(`/api/v2/exports/appointments?${queryParams.toString()}`, {
    method: 'GET',
  })
}

export async function exportAnalytics(params: {
  format: 'csv' | 'excel' | 'json' | 'pdf'
  metrics?: string[]
  date_range?: { start: string; end: string }
  group_by?: 'day' | 'week' | 'month'
}) {
  const queryParams = new URLSearchParams({
    format: params.format,
    include_charts: 'true',
    ...(params.date_range?.start && { date_from: params.date_range.start }),
    ...(params.date_range?.end && { date_to: params.date_range.end }),
  })
  
  return fetchAPI(`/api/v2/exports/analytics?${queryParams.toString()}`, {
    method: 'GET',
  })
}

// Enhanced client management functions
export async function getClientAnalytics(clientId: number) {
  return fetchAPI(`/api/v2/clients/${clientId}/analytics`)
}

export async function getClientRecommendations(clientId: number) {
  return fetchAPI(`/api/v2/clients/${clientId}/recommendations`)
}

export async function getClientCommunicationPreferences(clientId: number) {
  return fetchAPI(`/api/v2/clients/${clientId}/communication-preferences`)
}

export async function updateClientCommunicationPreferences(clientId: number, preferences: any) {
  return fetchAPI(`/api/v2/clients/${clientId}/communication-preferences`, {
    method: 'PUT',
    body: JSON.stringify(preferences),
  })
}

export async function addClientNote(clientId: number, note: string, noteType: string = 'general') {
  return fetchAPI(`/api/v2/clients/${clientId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ note, note_type: noteType }),
  })
}

export async function updateClientTags(clientId: number, tags: string[]) {
  return fetchAPI(`/api/v2/clients/${clientId}/tags`, {
    method: 'PUT',
    body: JSON.stringify({ tags }),
  })
}

export async function getClientDashboardMetrics() {
  return fetchAPI('/api/v2/clients/dashboard/metrics')
}

export async function advancedClientSearch(params: {
  query?: string
  customer_type?: string
  tags?: string
  min_visits?: number
  max_days_since_visit?: number
  limit?: number
}) {
  const queryParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      queryParams.append(key, value.toString())
    }
  })
  
  const query = queryParams.toString()
  return fetchAPI(`/api/v2/clients/advanced-search${query ? '?' + query : ''}`)
}

// Quick booking function for next available slot (legacy - use quickBooking instead)
export async function bookNextAvailableSlot(service: string): Promise<BookingResponse> {
  const nextSlot = await getNextAvailableSlot()
  return createBooking(nextSlot.date, nextSlot.time, service)
}

// Timezone functions
export async function updateUserTimezone(timezone: string): Promise<User> {
  return fetchAPI('/api/v2/auth/timezone', {
    method: 'PUT',
    body: JSON.stringify({ timezone }),
  })
}

export async function updateUserProfile(profileData: { name?: string; email?: string }): Promise<User> {
  return fetchAPI('/api/v2/users/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  })
}

export async function updateOnboardingStatus(onboardingData: {
  completed?: boolean
  completed_steps?: string[]
  current_step?: number
  skipped?: boolean
}): Promise<User> {
  return fetchAPI('/api/v2/users/onboarding', {
    method: 'PUT',
    body: JSON.stringify(onboardingData),
  })
}

export async function updateUserRole(userId: number, role: string): Promise<User> {
  return fetchAPI(`/api/v2/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  })
}

export async function getAllUsers(role?: string): Promise<User[]> {
  const params = role ? `?role=${encodeURIComponent(role)}` : ''
  return fetchAPI(`/api/v2/users${params}`)
}

export async function getBarbers(): Promise<User[]> {
  return fetchAPI('/api/v2/barbers')
}

export interface Timezone {
  value: string
  label: string
  offset: string
  abbrev: string
}

export async function getTimezones(): Promise<Timezone[]> {
  return fetchAPI('/api/v2/timezones')
}

// Payment functions
export interface PaymentIntentRequest {
  booking_id: number
  gift_certificate_code?: string
}

export interface PaymentIntentResponse {
  client_secret?: string
  payment_intent_id?: string
  amount: number
  original_amount: number
  gift_certificate_used: number
  payment_id: number
}

export interface PaymentConfirmRequest {
  payment_intent_id?: string
  booking_id: number
}

export async function createPaymentIntent(data: PaymentIntentRequest): Promise<PaymentIntentResponse> {
  return fetchAPI('/api/v2/payments/create-intent', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function confirmPayment(data: PaymentConfirmRequest) {
  return fetchAPI('/api/v2/payments/confirm', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ============================================================================
// ANALYTICS API
// ============================================================================

export interface SixFigureBarberMetrics {
  current_performance: {
    monthly_revenue: number
    annual_revenue_projection: number
    average_ticket: number
    utilization_rate: number
    average_visits_per_client: number
    total_active_clients: number
  }
  targets: {
    annual_income_target: number
    monthly_revenue_target: number
    daily_revenue_target: number
    daily_clients_target: number
    revenue_gap: number
    on_track: boolean
  }
  recommendations: {
    price_optimization: {
      current_average_ticket: number
      recommended_increase_percentage: number
      recommended_average_ticket: number
    }
    client_acquisition: {
      current_monthly_clients: number
      target_monthly_clients: number
      additional_clients_needed: number
    }
    time_optimization: {
      current_utilization_rate: number
      target_utilization_rate: number
      additional_hours_needed: number
    }
  }
  action_items: (string | ActionItem)[]
}

export interface DashboardAnalytics {
  revenue_summary: {
    total_revenue: number
    revenue_growth: number
    average_ticket: number
    ticket_growth: number
  }
  appointment_summary: {
    total_appointments: number
    appointment_growth: number
    cancellation_rate: number
    no_show_rate: number
  }
  client_summary: {
    total_clients: number
    new_clients: number
    returning_clients: number
    retention_rate: number
  }
  trends: {
    revenue_trend: Array<{date: string, revenue: number}>
    appointment_trend: Array<{date: string, appointments: number}>
  }
}

export interface RevenueAnalytics {
  total_revenue: number
  revenue_by_period: Array<{
    period: string
    revenue: number
    appointments: number
    average_ticket: number
  }>
  revenue_by_service: Array<{
    service_name: string
    revenue: number
    percentage: number
  }>
  growth_metrics: {
    revenue_growth: number
    ticket_growth: number
    volume_growth: number
  }
}

export interface PerformanceAnalytics {
  efficiency_metrics: {
    utilization_rate: number
    average_appointment_duration: number
    daily_capacity: number
    daily_utilization: number
  }
  client_metrics: {
    new_clients_count: number
    returning_clients_count: number
    client_retention_rate: number
    average_visits_per_client: number
  }
  financial_metrics: {
    revenue_per_hour: number
    revenue_per_client: number
    cost_per_acquisition: number
  }
}

// ============================================================================
// COMPREHENSIVE ANALYTICS INTERFACES
// ============================================================================

/**
 * Appointment Analytics Response Interface
 */
export interface AppointmentAnalytics {
  total_appointments: number
  completed_appointments: number
  cancelled_appointments: number
  no_show_appointments: number
  completion_rate: number
  cancellation_rate: number
  no_show_rate: number
  average_duration: number
  appointment_trends: Array<{
    date: string
    total: number
    completed: number
    cancelled: number
    no_shows: number
  }>
  service_breakdown: Array<{
    service_name: string
    count: number
    percentage: number
    revenue: number
  }>
  time_patterns: {
    busiest_hours: Array<{ hour: number; count: number }>
    busiest_days: Array<{ day: string; count: number }>
    seasonal_trends: Array<{ month: string; count: number }>
  }
}

/**
 * Appointment Patterns Analysis Interface
 */
export interface AppointmentPatterns {
  booking_patterns: {
    advance_booking_days: number
    peak_booking_hours: Array<{ hour: number; count: number }>
    booking_frequency: Array<{ day_of_week: string; count: number }>
  }
  no_show_analysis: {
    no_show_rate: number
    no_show_patterns: Array<{
      pattern: string
      rate: number
      description: string
    }>
    risk_factors: Array<{
      factor: string
      impact: number
      description: string
    }>
  }
  client_behavior: {
    repeat_booking_rate: number
    average_booking_interval: number
    preferred_times: Array<{ time_slot: string; preference_score: number }>
  }
  recommendations: Array<{
    category: string
    suggestion: string
    expected_impact: string
  }>
}

/**
 * Client Retention Analytics Interface
 */
export interface ClientRetentionAnalytics {
  overall_retention_rate: number
  retention_by_period: {
    month_1: number
    month_3: number
    month_6: number
    month_12: number
  }
  retention_cohorts: Array<{
    cohort_month: string
    initial_clients: number
    retained_clients: Array<number>
    retention_rates: Array<number>
  }>
  churn_analysis: {
    churn_rate: number
    churn_reasons: Array<{
      reason: string
      percentage: number
    }>
    at_risk_clients: number
  }
  segmentation: {
    new_clients: { count: number; retention_rate: number }
    returning_clients: { count: number; retention_rate: number }
    vip_clients: { count: number; retention_rate: number }
  }
  improvement_opportunities: Array<{
    opportunity: string
    potential_impact: string
    implementation_effort: 'low' | 'medium' | 'high'
  }>
}

/**
 * Client Lifetime Value Analytics Interface
 */
export interface ClientLifetimeValueAnalytics {
  average_clv: number
  clv_by_segment: Array<{
    segment: string
    clv: number
    client_count: number
    contribution_percentage: number
  }>
  clv_distribution: {
    quartiles: Array<{ quartile: string; min_clv: number; max_clv: number; client_count: number }>
    top_10_percent: { min_clv: number; avg_clv: number; client_count: number }
  }
  predictive_clv: Array<{
    client_id: number
    predicted_clv: number
    confidence_score: number
    risk_level: 'low' | 'medium' | 'high'
  }>
  revenue_impact: {
    total_lifetime_revenue: number
    monthly_recurring_revenue: number
    revenue_concentration: number
  }
  optimization_recommendations: Array<{
    strategy: string
    target_segment: string
    expected_clv_increase: number
    implementation_timeline: string
  }>
}

/**
 * Barber Performance Metrics Interface
 */
export interface BarberPerformanceMetrics {
  basic_metrics: {
    total_appointments: number
    completed_appointments: number
    revenue_generated: number
    average_ticket: number
    client_satisfaction: number
  }
  efficiency: {
    utilization_rate: number
    appointment_duration_variance: number
    schedule_optimization_score: number
    time_between_appointments: number
  }
  client_relationship: {
    client_retention_rate: number
    repeat_booking_rate: number
    referral_count: number
    cancellation_rate: number
  }
  growth_metrics: {
    revenue_growth: number
    client_growth: number
    productivity_score: number
    goal_achievement_rate: number
  }
  comparison_data: {
    vs_previous_period: {
      revenue_change: number
      appointment_change: number
      efficiency_change: number
    }
    vs_team_average: {
      revenue_rank: number
      efficiency_rank: number
      satisfaction_rank: number
    }
  }
}

/**
 * Service Analytics Interface
 */
export interface ServiceAnalytics {
  totalRevenue: number
  totalBookings: number
  serviceMetrics: Array<{
    service_id: number
    service_name: string
    bookings: number
    revenue: number
    average_rating: number
    utilization_rate: number
  }>
  categoryBreakdown: Array<{
    category: string
    services_count: number
    total_bookings: number
    total_revenue: number
    percentage_of_total: number
  }>
  performanceTrends: Array<{
    date: string
    revenue: number
    bookings: number
  }>
}

/**
 * Service Metrics Interface
 */
export interface ServiceMetrics {
  service_id: number
  bookings_count: number
  revenue_total: number
  average_duration: number
  completion_rate: number
  client_satisfaction: number
  rebooking_rate: number
  revenue_per_hour: number
}

/**
 * Comparative Analytics Interface
 */
export interface ComparativeAnalytics {
  comparison_period: string
  current_period: {
    start_date: string
    end_date: string
    revenue: number
    appointments: number
    clients: number
    avg_ticket: number
  }
  previous_period: {
    start_date: string
    end_date: string
    revenue: number
    appointments: number
    clients: number
    avg_ticket: number
  }
  changes: {
    revenue_change: number
    revenue_change_percentage: number
    appointments_change: number
    appointments_change_percentage: number
    clients_change: number
    clients_change_percentage: number
    avg_ticket_change: number
    avg_ticket_change_percentage: number
  }
  trend_analysis: {
    trend_direction: 'improving' | 'declining' | 'stable'
    growth_rate: number
    seasonality_factor: number
    market_position: string
  }
  insights: Array<{
    metric: string
    insight: string
    recommendation: string
    priority: 'high' | 'medium' | 'low'
  }>
}

/**
 * Business Insights Interface
 */
export interface BusinessInsights {
  insights: Array<{
    id: string
    category: string
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    impact_analysis: string
    data_source: string
    confidence_level: number
  }>
  quick_actions: Array<{
    action: string
    expected_impact: string
    implementation_effort: 'low' | 'medium' | 'high'
    timeline: string
  }>
  performance_score: {
    overall_score: number
    max_score: number
    percentage: number
    grade: 'A' | 'B' | 'C' | 'D' | 'F'
    factors: Array<{
      factor: string
      score: number
      max: number
    }>
  }
  recommendations: Array<{
    category: string
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    expected_impact: string
    implementation_time: string
    resources_needed: string[]
  }>
  benchmarks: {
    appointment_completion_rate: { excellent: number; good: number; average: number; poor: number }
    client_retention_rate: { excellent: number; good: number; average: number; poor: number }
    average_clv: { excellent: number; good: number; average: number; poor: number }
    utilization_rate: { excellent: number; good: number; average: number; poor: number }
    revenue_growth_monthly: { excellent: number; good: number; average: number; poor: number }
  }
  generated_at: string
}

/**
 * Analytics Export Response Interface
 */
export interface AnalyticsExportResponse {
  export_type: string
  format: string
  generated_at: string
  date_range: {
    start: string | null
    end: string | null
  }
  user_id: number
  data: any
  note?: string
}

// ============================================================================
// 6FB AI COACH INTERFACES
// ============================================================================

export interface CoachingInsight {
  id: string
  category: 'revenue' | 'efficiency' | 'client_retention' | 'growth' | 'optimization'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: string
  actionable: boolean
  data_points: Record<string, any>
  created_at: string
}

export interface ActionItem {
  id: string
  category: string
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  expected_impact: string
  implementation_time: string
  resources_needed: string[]
  completed: boolean
  due_date?: string
  created_at: string
}

export interface HealthScoreFactor {
  factor: string
  score: number
  max_score: number
  description: string
  improvement_suggestions: string[]
}

export interface HealthScore {
  overall_score: number
  max_score: number
  percentage: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  factors: HealthScoreFactor[]
  trend: 'improving' | 'stable' | 'declining'
  last_updated: string
}

export interface CoachingData {
  health_score: HealthScore
  insights: CoachingInsight[]
  action_items: ActionItem[]
  motivational_message: string
  six_figure_progress: {
    current_annual_projection: number
    target_annual_income: number
    progress_percentage: number
    monthly_gap: number
    on_track: boolean
  }
  key_recommendations: {
    pricing_optimization: string[]
    client_acquisition: string[]
    retention_improvement: string[]
    efficiency_gains: string[]
  }
  performance_trends: {
    revenue_trend: 'up' | 'down' | 'stable'
    client_trend: 'up' | 'down' | 'stable'
    efficiency_trend: 'up' | 'down' | 'stable'
  }
  generated_at: string
}

export async function getSixFigureBarberMetrics(
  targetAnnualIncome: number = 100000, 
  userId?: number
): Promise<SixFigureBarberMetrics> {
  const params = new URLSearchParams()
  params.append('target_annual_income', targetAnnualIncome.toString())
  if (userId) params.append('user_id', userId.toString())
  
  return fetchAPI(`/api/v2/analytics/six-figure-barber?${params.toString()}`)
}

export async function getDashboardAnalytics(
  userId?: number,
  startDate?: string,
  endDate?: string
): Promise<DashboardAnalytics> {
  const params = new URLSearchParams()
  if (userId) params.append('user_id', userId.toString())
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  
  const queryString = params.toString()
  return fetchAPI(`/api/v2/analytics/dashboard${queryString ? `?${queryString}` : ''}`)
}

// Enterprise Analytics Interfaces
export interface LocationPerformance {
  id: number
  name: string
  revenue: number
  appointments: number
  clients: number
  average_rating: number
  chair_occupancy: number
  growth_percentage: number
}

export interface EnterpriseMetrics {
  total_revenue: number
  total_appointments: number
  total_clients: number
  average_ticket: number
  chair_utilization: number
  staff_retention: number
  nps_score: number
  revenue_growth: number
}

export interface EnterpriseAnalytics {
  metrics: EnterpriseMetrics
  locations: LocationPerformance[]
  revenue_trend: Array<{
    date: string
    revenue: number
    location_id?: number
  }>
  top_performers: Array<{
    id: number
    name: string
    revenue: number
    rating: number
  }>
  alerts: Array<{
    type: 'warning' | 'info' | 'success'
    message: string
    location?: string
  }>
}

export async function getEnterpriseAnalytics(
  startDate?: string,
  endDate?: string,
  locationIds?: number[]
): Promise<EnterpriseAnalytics> {
  const params = new URLSearchParams()
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  if (locationIds?.length) {
    locationIds.forEach(id => params.append('location_ids', id.toString()))
  }
  
  const queryString = params.toString()
  
  try {
    return await fetchAPI(`/api/v2/enterprise/dashboard${queryString ? `?${queryString}` : ''}`)
  } catch (error) {
    // If API is not yet implemented, return mock data for development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Enterprise analytics API not available, using mock data')
      return {
        metrics: {
          total_revenue: 185750,
          total_appointments: 2456,
          total_clients: 1823,
          average_ticket: 75.65,
          chair_utilization: 82.5,
          staff_retention: 88.9,
          nps_score: 84,
          revenue_growth: 12.5
        },
        locations: [
          {
            id: 1,
            name: 'Downtown Location',
            revenue: 68500,
            appointments: 890,
            clients: 623,
            average_rating: 4.8,
            chair_occupancy: 85,
            growth_percentage: 15.3
          },
          {
            id: 2,
            name: 'Uptown Location',
            revenue: 52300,
            appointments: 712,
            clients: 498,
            average_rating: 4.7,
            chair_occupancy: 78,
            growth_percentage: 8.2
          },
          {
            id: 3,
            name: 'Westside Location',
            revenue: 41200,
            appointments: 545,
            clients: 402,
            average_rating: 4.6,
            chair_occupancy: 72,
            growth_percentage: -2.5
          },
          {
            id: 4,
            name: 'Eastside Location',
            revenue: 23750,
            appointments: 309,
            clients: 300,
            average_rating: 4.9,
            chair_occupancy: 88,
            growth_percentage: 22.1
          }
        ],
        revenue_trend: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          revenue: Math.floor(5000 + Math.random() * 3000 + (i * 50))
        })),
        top_performers: [
          { id: 1, name: 'Mike Johnson', revenue: 28500, rating: 4.9 },
          { id: 2, name: 'Sarah Williams', revenue: 26200, rating: 4.8 },
          { id: 3, name: 'James Brown', revenue: 24800, rating: 4.7 },
          { id: 4, name: 'Emily Davis', revenue: 22300, rating: 4.9 },
          { id: 5, name: 'Robert Wilson', revenue: 21100, rating: 4.6 }
        ],
        alerts: [
          {
            type: 'warning',
            message: 'Chair utilization below 70% at Westside Location',
            location: 'Westside Location'
          },
          {
            type: 'success',
            message: 'Eastside Location showing strong growth momentum',
            location: 'Eastside Location'
          },
          {
            type: 'info',
            message: 'Monthly staff meeting scheduled for next Tuesday',
            location: undefined
          }
        ]
      }
    }
    throw error
  }
}

export async function getRevenueAnalytics(
  userId?: number,
  startDate?: string,
  endDate?: string,
  groupBy: string = 'day'
): Promise<RevenueAnalytics> {
  const params = new URLSearchParams()
  if (userId) params.append('user_id', userId.toString())
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  params.append('group_by', groupBy)
  
  return fetchAPI(`/api/v2/analytics/revenue?${params.toString()}`)
}

export interface RevenueBreakdown {
  summary: {
    total_revenue: number
    transaction_count: number
    average_transaction: number
    highest_transaction: number
    lowest_transaction: number
  }
  by_service?: {
    [category: string]: {
      total: number
      count: number
      services: {
        [serviceName: string]: {
          revenue: number
          count: number
          average: number
        }
      }
    }
  }
  by_time?: {
    by_hour: { [hour: string]: { revenue: number; count: number } }
    by_day_of_week: { [day: string]: { revenue: number; count: number } }
    by_month: { [month: string]: { revenue: number; count: number } }
    peak_hours: Array<{ hour: string; revenue: number }>
    peak_days: Array<{ day: string; revenue: number }>
  }
  by_client_type?: {
    new_clients: { revenue: number; count: number }
    returning_clients: { revenue: number; count: number }
    client_segments: {
      [segment: string]: {
        revenue: number
        count: number
        average: number
      }
    }
  }
  premium_analysis?: {
    premium_revenue: number
    standard_revenue: number
    premium_count: number
    standard_count: number
    premium_percentage: number
    premium_services: Array<{
      name: string
      revenue: number
      count: number
      base_price: number
    }>
    upsell_opportunities: Array<{
      opportunity: string
      recommendation: string
      potential_impact: string
    }>
  }
  six_figure_metrics: {
    financial_metrics: {
      current_annual_run_rate: number
      progress_to_six_figures: number
      daily_revenue_gap: number
      current_daily_average: number
      required_daily_average: number
      current_average_ticket: number
      additional_daily_clients_needed?: number
      recommended_price_increase_percentage?: number
    }
    milestones: {
      reached_50k: boolean
      reached_75k: boolean
      reached_100k: boolean
      reached_150k: boolean
      next_milestone: {
        target: number
        remaining: number
        percentage_complete: number
      }
    }
    recommendations: Array<{
      priority: string
      category: string
      title: string
      description: string
      action: string
    }>
  }
  date_range: {
    start: string | null
    end: string | null
  }
}

export async function getRevenueBreakdown(
  startDate?: string,
  endDate?: string,
  breakdownBy: string = 'all'
): Promise<RevenueBreakdown> {
  const params = new URLSearchParams()
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  params.append('breakdown_by', breakdownBy)
  
  return fetchAPI(`/api/v2/analytics/revenue-breakdown?${params.toString()}`)
}

// Location-specific analytics
export interface LocationAnalytics extends DashboardAnalytics {
  location_id: number
  location_name: string
  barber_performance: Array<{
    id: number
    name: string
    revenue: number
    appointments: number
    rating: number
    utilization_rate: number
    compensation_type: string
    compensation_details?: any
  }>
  chair_inventory: Array<{
    id: number
    name: string
    barber_id?: number
    barber_name?: string
    status: 'occupied' | 'available' | 'maintenance'
    utilization_rate: number
  }>
  compensation_summary: {
    commission_count: number
    booth_rental_count: number
    salary_count: number
    total_compensation_cost: number
  }
}

export async function getLocationAnalytics(
  locationId: number,
  startDate?: string,
  endDate?: string
): Promise<LocationAnalytics> {
  const params = new URLSearchParams()
  params.append('location_id', locationId.toString())
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  
  const queryString = params.toString()
  
  try {
    return await fetchAPI(`/api/v2/analytics/location/${locationId}?${queryString}`)
  } catch (error) {
    // If API is not yet implemented, return mock data for development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Location analytics API not available, using mock data')
      const dashboardData = await getDashboardAnalytics()
      
      return {
        ...dashboardData,
        location_id: locationId,
        location_name: `Location ${locationId}`,
        barber_performance: [
          { id: 1, name: 'Mike Johnson', revenue: 8500, appointments: 120, rating: 4.9, utilization_rate: 85, compensation_type: 'commission' },
          { id: 2, name: 'Sarah Williams', revenue: 7200, appointments: 98, rating: 4.8, utilization_rate: 78, compensation_type: 'commission' },
          { id: 3, name: 'James Brown', revenue: 6800, appointments: 92, rating: 4.7, utilization_rate: 72, compensation_type: 'booth_rental' },
          { id: 4, name: 'Emily Davis', revenue: 5300, appointments: 78, rating: 4.9, utilization_rate: 68, compensation_type: 'salary' }
        ],
        chair_inventory: [
          { id: 1, name: 'Chair 1', barber_id: 1, barber_name: 'Mike Johnson', status: 'occupied', utilization_rate: 85 },
          { id: 2, name: 'Chair 2', barber_id: 2, barber_name: 'Sarah Williams', status: 'occupied', utilization_rate: 78 },
          { id: 3, name: 'Chair 3', barber_id: 3, barber_name: 'James Brown', status: 'occupied', utilization_rate: 72 },
          { id: 4, name: 'Chair 4', barber_id: 4, barber_name: 'Emily Davis', status: 'occupied', utilization_rate: 68 },
          { id: 5, name: 'Chair 5', status: 'available', utilization_rate: 0 },
          { id: 6, name: 'Chair 6', status: 'maintenance', utilization_rate: 0 }
        ],
        compensation_summary: {
          commission_count: 2,
          booth_rental_count: 1,
          salary_count: 1,
          total_compensation_cost: 18500
        }
      }
    }
    throw error
  }
}


// ============================================================================
// SERVICES API
// ============================================================================







export interface ServicePricingRuleCreate {
  rule_type: string
  priority: number
  start_date?: string
  end_date?: string
  start_time?: string
  end_time?: string
  day_of_week?: number
  price_modifier_type: string
  price_modifier_value: number
}


export interface BarberService {
  id: number
  name: string
  description?: string
  category: string
  base_price: number
  duration_minutes: number
  custom_price?: number
  custom_duration?: number
  effective_price: number
  effective_duration: number
  is_available: boolean
}

export interface ServicePriceCalculation {
  service_id: number
  base_price: number
  calculated_price: number
  barber_id?: number
  booking_date?: string
  booking_time?: string
}

// Services endpoints
export async function getServiceCategories(): Promise<ServiceCategory[]> {
  return fetchAPI('/api/v2/services/categories')
}

export async function getServices(params?: {
  category?: string
  barber_id?: number
  is_active?: boolean
  is_bookable_online?: boolean
  skip?: number
  limit?: number
}): Promise<Service[]> {
  const queryParams = new URLSearchParams()
  if (params?.category) queryParams.append('category', params.category)
  if (params?.barber_id) queryParams.append('barber_id', params.barber_id.toString())
  if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString())
  if (params?.is_bookable_online !== undefined) queryParams.append('is_bookable_online', params.is_bookable_online.toString())
  if (params?.skip) queryParams.append('skip', params.skip.toString())
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  
  const query = queryParams.toString()
  return fetchAPI(`/api/v2/services/${query ? '?' + query : ''}`)
}

export async function getPublicServices(params?: {
  category?: string
  skip?: number
  limit?: number
}): Promise<Service[]> {
  const queryParams = new URLSearchParams()
  if (params?.category) queryParams.append('category', params.category)
  if (params?.skip) queryParams.append('skip', params.skip.toString())
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  
  const query = queryParams.toString()
  return fetchAPI(`/api/v2/public/services/${query ? '?' + query : ''}`)
}

export async function getService(serviceId: number, barberId?: number): Promise<Service> {
  const params = new URLSearchParams()
  if (barberId) params.append('barber_id', barberId.toString())
  
  const query = params.toString()
  return fetchAPI(`/api/v2/services/${serviceId}${query ? '?' + query : ''}`)
}

export async function createService(serviceData: ServiceCreate): Promise<Service> {
  return fetchAPI('/api/v2/services/', {
    method: 'POST',
    body: JSON.stringify(serviceData),
  })
}

export async function updateService(serviceId: number, updates: ServiceUpdate): Promise<Service> {
  return fetchAPI(`/api/v2/services/${serviceId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
}

export async function deleteService(serviceId: number) {
  return fetchAPI(`/api/v2/services/${serviceId}`, {
    method: 'DELETE',
  })
}

export async function createServicePricingRule(serviceId: number, ruleData: ServicePricingRuleCreate) {
  return fetchAPI(`/api/v2/services/${serviceId}/pricing-rules`, {
    method: 'POST',
    body: JSON.stringify(ruleData),
  })
}

export async function getServicePricingRules(serviceId: number): Promise<ServicePricingRule[]> {
  return fetchAPI(`/api/v2/services/${serviceId}/pricing-rules`)
}

export async function deleteServicePricingRule(serviceId: number, ruleId: number) {
  return fetchAPI(`/api/v2/services/${serviceId}/pricing-rules/${ruleId}`, {
    method: 'DELETE',
  })
}

export async function createServiceBookingRule(serviceId: number, ruleData: ServiceBookingRuleCreate) {
  return fetchAPI(`/api/v2/services/${serviceId}/booking-rules`, {
    method: 'POST',
    body: JSON.stringify(ruleData),
  })
}

export async function getServiceBookingRules(serviceId: number): Promise<ServiceBookingRule[]> {
  return fetchAPI(`/api/v2/services/${serviceId}/booking-rules`)
}

export async function deleteServiceBookingRule(serviceId: number, ruleId: number) {
  return fetchAPI(`/api/v2/services/${serviceId}/booking-rules/${ruleId}`, {
    method: 'DELETE',
  })
}

export async function assignServiceToBarber(
  serviceId: number, 
  barberId: number, 
  customPrice?: number, 
  customDuration?: number
) {
  const body: any = {}
  if (customPrice !== undefined) body.custom_price = customPrice
  if (customDuration !== undefined) body.custom_duration = customDuration
  
  return fetchAPI(`/api/v2/services/${serviceId}/barbers/${barberId}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function removeServiceFromBarber(serviceId: number, barberId: number) {
  return fetchAPI(`/api/v2/services/${serviceId}/barbers/${barberId}`, {
    method: 'DELETE',
  })
}

export async function getBarberServices(barberId: number, isAvailable?: boolean): Promise<BarberService[]> {
  const params = new URLSearchParams()
  if (isAvailable !== undefined) params.append('is_available', isAvailable.toString())
  
  const query = params.toString()
  return fetchAPI(`/api/v2/services/barbers/${barberId}${query ? '?' + query : ''}`)
}

export async function calculateServicePrice(
  serviceId: number,
  barberId?: number,
  bookingDate?: string,
  bookingTime?: string
): Promise<ServicePriceCalculation> {
  const params = new URLSearchParams()
  if (barberId) params.append('barber_id', barberId.toString())
  if (bookingDate) params.append('booking_date', bookingDate)
  if (bookingTime) params.append('booking_time', bookingTime)
  
  const query = params.toString()
  return fetchAPI(`/api/v2/services/${serviceId}/calculate-price${query ? '?' + query : ''}`)
}

// Service Analytics functions
export async function getServiceAnalytics(params?: {
  dateRange?: string
  startDate?: string
  endDate?: string
  barberId?: number
}): Promise<ServiceAnalytics> {
  const queryParams = new URLSearchParams()
  if (params?.dateRange) queryParams.append('date_range', params.dateRange)
  if (params?.startDate) queryParams.append('start_date', params.startDate)
  if (params?.endDate) queryParams.append('end_date', params.endDate)
  if (params?.barberId) queryParams.append('barber_id', params.barberId.toString())
  
  const query = queryParams.toString()
  return fetchAPI(`/api/v2/analytics/services${query ? '?' + query : ''}`)
}

export async function getServiceMetrics(serviceId: number, params?: {
  dateRange?: string
  startDate?: string
  endDate?: string
}): Promise<ServiceMetrics> {
  const queryParams = new URLSearchParams()
  if (params?.dateRange) queryParams.append('date_range', params.dateRange)
  if (params?.startDate) queryParams.append('start_date', params.startDate)
  if (params?.endDate) queryParams.append('end_date', params.endDate)
  
  const query = queryParams.toString()
  return fetchAPI(`/api/v2/analytics/services/${serviceId}/metrics${query ? '?' + query : ''}`)
}

// ============================================================================
// BARBER AVAILABILITY API
// ============================================================================










export interface AvailabilityCheck {
  barber_id: number
  date: string
  start_time: string
  end_time: string
  is_available: boolean
}

// Barber availability endpoints
export async function getBarberSchedule(
  barberId: number,
  startDate: string,
  endDate: string,
  timezone?: string
): Promise<BarberSchedule> {
  const params = new URLSearchParams()
  params.append('start_date', startDate)
  params.append('end_date', endDate)
  if (timezone) params.append('timezone', timezone)
  
  return fetchAPI(`/api/v2/barber-availability/schedule/${barberId}?${params.toString()}`)
}

export async function getBarberAvailability(barberId: number, dayOfWeek?: number): Promise<BarberAvailability[]> {
  const params = new URLSearchParams()
  if (dayOfWeek !== undefined) params.append('day_of_week', dayOfWeek.toString())
  
  const query = params.toString()
  return fetchAPI(`/api/v2/barber-availability/availability/${barberId}${query ? '?' + query : ''}`)
}

export async function createBarberAvailability(
  barberId: number,
  availabilityData: BarberAvailabilityCreate
): Promise<BarberAvailability> {
  return fetchAPI(`/api/v2/barber-availability/availability/${barberId}`, {
    method: 'POST',
    body: JSON.stringify(availabilityData),
  })
}

export async function updateBarberAvailability(
  availabilityId: number,
  updates: BarberAvailabilityUpdate
): Promise<BarberAvailability> {
  return fetchAPI(`/api/v2/barber-availability/availability/${availabilityId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
}

export async function deleteBarberAvailability(availabilityId: number) {
  return fetchAPI(`/api/v2/barber-availability/availability/${availabilityId}`, {
    method: 'DELETE',
  })
}

export async function getBarberTimeOff(
  barberId: number,
  startDate?: string,
  endDate?: string
): Promise<BarberTimeOff[]> {
  const params = new URLSearchParams()
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  
  const query = params.toString()
  return fetchAPI(`/api/v2/barber-availability/time-off/${barberId}${query ? '?' + query : ''}`)
}

export async function createTimeOffRequest(
  barberId: number,
  timeOffData: BarberTimeOffCreate
): Promise<BarberTimeOff> {
  return fetchAPI(`/api/v2/barber-availability/time-off/${barberId}`, {
    method: 'POST',
    body: JSON.stringify(timeOffData),
  })
}

export async function getSpecialAvailability(
  barberId: number,
  date?: string
): Promise<BarberSpecialAvailability[]> {
  const params = new URLSearchParams()
  if (date) params.append('date', date)
  
  const query = params.toString()
  return fetchAPI(`/api/v2/barber-availability/special/${barberId}${query ? '?' + query : ''}`)
}

export async function createSpecialAvailability(
  barberId: number,
  specialData: BarberSpecialAvailabilityCreate
): Promise<BarberSpecialAvailability> {
  return fetchAPI(`/api/v2/barber-availability/special/${barberId}`, {
    method: 'POST',
    body: JSON.stringify(specialData),
  })
}

export async function checkBarberAvailability(
  barberId: number,
  checkDate: string,
  startTime: string,
  endTime: string,
  excludeAppointmentId?: number
): Promise<AvailabilityCheck> {
  const params = new URLSearchParams()
  params.append('check_date', checkDate)
  params.append('start_time', startTime)
  params.append('end_time', endTime)
  if (excludeAppointmentId) params.append('exclude_appointment_id', excludeAppointmentId.toString())
  
  return fetchAPI(`/api/v2/barber-availability/check/${barberId}?${params.toString()}`)
}

export async function getAvailableBarbersForSlot(
  checkDate: string,
  startTime: string,
  endTime: string,
  serviceId?: number
): Promise<{ date: string; available_barbers: AvailableBarber[] }> {
  const params = new URLSearchParams()
  params.append('check_date', checkDate)
  params.append('start_time', startTime)
  params.append('end_time', endTime)
  if (serviceId) params.append('service_id', serviceId.toString())
  
  return fetchAPI(`/api/v2/barber-availability/available-barbers?${params.toString()}`)
}

// ============================================================================
// RECURRING APPOINTMENTS API
// ============================================================================

export interface RecurringPattern {
  id: number
  user_id: number
  pattern_type: string
  preferred_time: string
  duration_minutes: number
  start_date: string
  end_date?: string
  occurrences?: number
  days_of_week?: number[]
  day_of_month?: number
  week_of_month?: number
  barber_id?: number
  service_id?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RecurringPatternCreate {
  pattern_type: string
  preferred_time: string
  duration_minutes: number
  start_date: string
  end_date?: string
  occurrences?: number
  days_of_week?: number[]
  day_of_month?: number
  week_of_month?: number
  barber_id?: number
  service_id?: number
}

export interface RecurringPatternUpdate {
  pattern_type?: string
  preferred_time?: string
  duration_minutes?: number
  start_date?: string
  end_date?: string
  occurrences?: number
  days_of_week?: number[]
  day_of_month?: number
  week_of_month?: number
  barber_id?: number
  service_id?: number
  is_active?: boolean
}

export interface GeneratedAppointment {
  date: string
  time: string
  duration_minutes: number
  status: string
  conflict_reason?: string
}

export interface UpcomingRecurringAppointment {
  id: number
  start_time: string
  service_name: string
  barber_name: string
  pattern_id: number
}

// Recurring appointments endpoints
export async function createRecurringPattern(patternData: RecurringPatternCreate): Promise<RecurringPattern> {
  return fetchAPI('/api/v2/recurring-appointments/patterns', {
    method: 'POST',
    body: JSON.stringify(patternData),
  })
}

export async function getRecurringPatterns(isActive?: boolean): Promise<RecurringPattern[]> {
  const params = new URLSearchParams()
  if (isActive !== undefined) params.append('is_active', isActive.toString())
  
  const query = params.toString()
  return fetchAPI(`/api/v2/recurring-appointments/patterns${query ? '?' + query : ''}`)
}

export async function getRecurringPattern(patternId: number): Promise<RecurringPattern> {
  return fetchAPI(`/api/v2/recurring-appointments/patterns/${patternId}`)
}

export async function updateRecurringPattern(
  patternId: number,
  updates: RecurringPatternUpdate
): Promise<RecurringPattern> {
  return fetchAPI(`/api/v2/recurring-appointments/patterns/${patternId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
}

export async function deleteRecurringPattern(patternId: number) {
  return fetchAPI(`/api/v2/recurring-appointments/patterns/${patternId}`, {
    method: 'DELETE',
  })
}

export async function generateAppointmentsFromPattern(
  patternId: number,
  previewOnly: boolean = false,
  maxAppointments: number = 50
) {
  const params = new URLSearchParams()
  params.append('preview_only', previewOnly.toString())
  params.append('max_appointments', maxAppointments.toString())
  
  return fetchAPI(`/api/v2/recurring-appointments/patterns/${patternId}/generate?${params.toString()}`, {
    method: 'POST',
  })
}

export async function getUpcomingRecurringAppointments(daysAhead: number = 30) {
  const params = new URLSearchParams()
  params.append('days_ahead', daysAhead.toString())
  
  return fetchAPI(`/api/v2/recurring-appointments/upcoming?${params.toString()}`)
}

export async function cancelRecurringSeries(patternId: number, cancelFutureOnly: boolean = true) {
  const params = new URLSearchParams()
  params.append('cancel_future_only', cancelFutureOnly.toString())
  
  return fetchAPI(`/api/v2/recurring-appointments/patterns/${patternId}/cancel?${params.toString()}`, {
    method: 'POST',
  })
}

export async function modifySingleOccurrence(
  appointmentId: number,
  newDate?: string,
  newTime?: string,
  newBarberId?: number,
  cancel: boolean = false
) {
  const params = new URLSearchParams()
  if (newDate) params.append('new_date', newDate)
  if (newTime) params.append('new_time', newTime)
  if (newBarberId) params.append('new_barber_id', newBarberId.toString())
  params.append('cancel', cancel.toString())
  
  return fetchAPI(`/api/v2/recurring-appointments/appointments/${appointmentId}/modify?${params.toString()}`, {
    method: 'PUT',
  })
}

export async function previewPatternOccurrences(patternId: number, limit: number = 20) {
  const params = new URLSearchParams()
  params.append('limit', limit.toString())
  
  return fetchAPI(`/api/v2/recurring-appointments/patterns/${patternId}/preview?${params.toString()}`)
}

// ============================================================================
// NOTIFICATIONS API
// ============================================================================

export interface NotificationPreference {
  id: number
  user_id: number
  email_enabled: boolean
  sms_enabled: boolean
  email_appointment_confirmation: boolean
  sms_appointment_confirmation: boolean
  email_appointment_reminder: boolean
  sms_appointment_reminder: boolean
  email_appointment_changes: boolean
  sms_appointment_changes: boolean
  reminder_hours: number[]
  created_at: string
  updated_at: string
}

export interface NotificationPreferenceUpdate {
  email_enabled?: boolean
  sms_enabled?: boolean
  email_appointment_confirmation?: boolean
  sms_appointment_confirmation?: boolean
  email_appointment_reminder?: boolean
  sms_appointment_reminder?: boolean
  email_appointment_changes?: boolean
  sms_appointment_changes?: boolean
  reminder_hours?: number[]
}




// Notifications endpoints
export async function getNotificationPreferences(): Promise<NotificationPreference> {
  return fetchAPI('/api/v2/notifications/preferences')
}

export async function updateNotificationPreferences(
  preferences: NotificationPreferenceUpdate
): Promise<NotificationPreference> {
  return fetchAPI('/api/v2/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify(preferences),
  })
}

export async function getNotificationTemplates(
  templateType?: string,
  activeOnly: boolean = true
): Promise<NotificationTemplate[]> {
  const params = new URLSearchParams()
  if (templateType) params.append('template_type', templateType)
  params.append('active_only', activeOnly.toString())
  
  const query = params.toString()
  return fetchAPI(`/api/v2/notifications/templates${query ? '?' + query : ''}`)
}

export async function getNotificationHistory(
  limit: number = 50,
  appointmentId?: number,
  notificationType?: string,
  status?: string
): Promise<NotificationHistory[]> {
  const params = new URLSearchParams()
  params.append('limit', limit.toString())
  if (appointmentId) params.append('appointment_id', appointmentId.toString())
  if (notificationType) params.append('notification_type', notificationType)
  if (status) params.append('status', status)
  
  const query = params.toString()
  return fetchAPI(`/api/v2/notifications/history${query ? '?' + query : ''}`)
}

export async function getNotificationStats(days: number = 7): Promise<NotificationStats> {
  const params = new URLSearchParams()
  params.append('days', days.toString())
  
  return fetchAPI(`/api/v2/notifications/stats?${params.toString()}`)
}

export async function sendTestEmail() {
  return fetchAPI('/api/v2/notifications/test-email', {
    method: 'POST',
  })
}

export async function sendTestSms() {
  return fetchAPI('/api/v2/notifications/test-sms', {
    method: 'POST',
  })
}

export async function processNotificationQueue(batchSize: number = 50) {
  const params = new URLSearchParams()
  params.append('batch_size', batchSize.toString())
  
  return fetchAPI(`/api/v2/notifications/process-queue?${params.toString()}`, {
    method: 'POST',
  })
}

export async function cancelNotification(notificationId: number) {
  return fetchAPI(`/api/v2/notifications/history/${notificationId}`, {
    method: 'DELETE',
  })
}

// ============================================================================
// BARBER AVAILABILITY API
// ============================================================================

export interface BarberAvailability {
  id: number
  barber_id: number
  day_of_week: number
  start_time: string
  end_time: string
  created_at: string
  updated_at: string
}

export interface BarberAvailabilityCreate {
  day_of_week: number
  start_time: string
  end_time: string
}

export interface BarberAvailabilityUpdate {
  day_of_week?: number
  start_time?: string
  end_time?: string
}

export interface BarberTimeOff {
  id: number
  barber_id: number
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  reason: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface BarberTimeOffCreate {
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  reason: string
  notes?: string
}

export interface BarberSpecialAvailability {
  id: number
  barber_id: number
  date: string
  start_time: string
  end_time: string
  availability_type: 'available' | 'unavailable'
  notes?: string
  created_at: string
  updated_at: string
}

export interface BarberSpecialAvailabilityCreate {
  date: string
  start_time: string
  end_time: string
  availability_type: 'available' | 'unavailable'
  notes?: string
}

export interface BarberSchedule {
  date: string
  regular_availability: BarberAvailability[]
  special_availability: BarberSpecialAvailability[]
  time_off: BarberTimeOff[]
  appointments: any[]
  slots: Array<{
    time: string
    status: 'available' | 'booked' | 'blocked' | 'unavailable'
    booking_id?: number
  }>
}

export interface AvailableBarber {
  barber_id: number
  barber_name: string
  available_slots: Array<{
    time: string
    available: boolean
    is_next_available: boolean
  }>
}

export interface AvailableBarbersResponse {
  date: string
  available_barbers: AvailableBarber[]
}

// Get comprehensive schedule for a barber
export async function getBarberScheduleAvailability(
  barberId: number,
  startDate: string,
  endDate: string,
  timezone: string = 'UTC'
): Promise<BarberSchedule> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    timezone
  })
  return fetchAPI(`/barber-availability/schedule/${barberId}?${params.toString()}`)
}

// Get regular weekly availability for a barber (alternative endpoint)
export async function getBarberWeeklyAvailability(
  barberId: number,
  dayOfWeek?: number
): Promise<BarberAvailability[]> {
  const params = new URLSearchParams()
  if (dayOfWeek !== undefined) params.append('day_of_week', dayOfWeek.toString())
  
  const queryString = params.toString()
  return fetchAPI(`/barber-availability/availability/${barberId}${queryString ? `?${queryString}` : ''}`)
}

// Create or update regular availability for a barber (alternative endpoint)
export async function createBarberWeeklyAvailability(
  barberId: number,
  availabilityData: BarberAvailabilityCreate
): Promise<BarberAvailability> {
  return fetchAPI(`/barber-availability/availability/${barberId}`, {
    method: 'POST',
    body: JSON.stringify(availabilityData),
  })
}

// Update barber availability (alternative endpoint)
export async function updateBarberWeeklyAvailability(
  availabilityId: number,
  availabilityData: BarberAvailabilityUpdate
): Promise<BarberAvailability> {
  return fetchAPI(`/barber-availability/availability/${availabilityId}`, {
    method: 'PUT',
    body: JSON.stringify(availabilityData),
  })
}

// Delete barber availability (alternative endpoint)
export async function deleteBarberWeeklyAvailability(availabilityId: number) {
  return fetchAPI(`/barber-availability/availability/${availabilityId}`, {
    method: 'DELETE',
  })
}




// Create special availability for a specific date
export async function createSpecialAvailabilityV2(
  barberId: number,
  specialData: BarberSpecialAvailabilityCreate
): Promise<BarberSpecialAvailability> {
  return fetchAPI(`/barber-availability/special/${barberId}`, {
    method: 'POST',
    body: JSON.stringify(specialData),
  })
}

// Check if a barber is available during a specific time slot
export async function checkBarberAvailabilityV2(
  barberId: number,
  checkDate: string,
  startTime: string,
  endTime: string,
  excludeAppointmentId?: number
): Promise<{
  barber_id: number
  date: string
  start_time: string
  end_time: string
  is_available: boolean
}> {
  const params = new URLSearchParams({
    check_date: checkDate,
    start_time: startTime,
    end_time: endTime
  })
  if (excludeAppointmentId) params.append('exclude_appointment_id', excludeAppointmentId.toString())
  
  return fetchAPI(`/barber-availability/check/${barberId}?${params.toString()}`)
}

// Get all barbers available for a specific time slot
export async function getAvailableBarbers(
  checkDate: string,
  startTime: string,
  endTime: string,
  serviceId?: number
): Promise<AvailableBarbersResponse> {
  const params = new URLSearchParams({
    check_date: checkDate,
    start_time: startTime,
    end_time: endTime
  })
  if (serviceId) params.append('service_id', serviceId.toString())
  
  return fetchAPI(`/barber-availability/available-barbers?${params.toString()}`)
}

// Bulk operations for availability management
export async function bulkUpdateAvailability(
  barberId: number,
  operations: Array<{
    action: 'create' | 'update' | 'delete'
    availability_id?: number
    availability_data?: BarberAvailabilityCreate | BarberAvailabilityUpdate
  }>
) {
  return fetchAPI(`/barber-availability/bulk/${barberId}`, {
    method: 'POST',
    body: JSON.stringify({ operations }),
  })
}

// Copy availability from one week to another
export async function copyWeeklyAvailability(
  barberId: number,
  sourceWeek: string,
  targetWeek: string
) {
  return fetchAPI(`/barber-availability/copy-week/${barberId}`, {
    method: 'POST',
    body: JSON.stringify({
      source_week: sourceWeek,
      target_week: targetWeek
    }),
  })
}

// ============================================================================
// SERVICES API
// ============================================================================

export interface Service {
  id: number
  name: string
  description?: string
  category: string
  sku?: string
  base_price: number
  min_price?: number
  max_price?: number
  duration_minutes: number
  buffer_time_minutes: number
  is_active: boolean
  is_bookable_online: boolean
  max_advance_booking_days?: number
  min_advance_booking_hours?: number
  is_package: boolean
  package_discount_percent?: number
  package_discount_amount?: number
  display_order: number
  image_url?: string
  created_at: string
  updated_at: string
  created_by_id?: number
  package_items?: Service[]
  pricing_rules?: ServicePricingRule[]
  booking_rules?: ServiceBookingRule[]
  // Analytics fields
  booking_count?: number
  average_rating?: number
  growth_percentage?: number
  is_featured?: boolean
}

export interface ServiceCreate {
  name: string
  description?: string
  category: string
  sku?: string
  base_price: number
  min_price?: number
  max_price?: number
  duration_minutes: number
  buffer_time_minutes?: number
  is_active?: boolean
  is_bookable_online?: boolean
  max_advance_booking_days?: number
  min_advance_booking_hours?: number
  is_package?: boolean
  package_discount_percent?: number
  package_discount_amount?: number
  display_order?: number
  image_url?: string
  package_item_ids?: number[]
}

export interface ServiceUpdate {
  name?: string
  description?: string
  category?: string
  sku?: string
  base_price?: number
  min_price?: number
  max_price?: number
  duration_minutes?: number
  buffer_time_minutes?: number
  is_active?: boolean
  is_bookable_online?: boolean
  max_advance_booking_days?: number
  min_advance_booking_hours?: number
  is_package?: boolean
  package_discount_percent?: number
  package_discount_amount?: number
  display_order?: number
  image_url?: string
  package_item_ids?: number[]
}

export interface ServiceCategory {
  value: string
  name: string
  label: string
}

export enum ServiceCategoryEnum {
  HAIRCUT = 'haircut',
  BEARD = 'beard',
  STYLING = 'styling',
  TREATMENT = 'treatment',
  PACKAGE = 'package',
  ADDON = 'addon'
}

export interface ServicePricingRule {
  id: number
  service_id: number
  rule_type: string
  start_time?: string
  end_time?: string
  day_of_week?: number
  start_date?: string
  end_date?: string
  price_adjustment_type: string
  price_adjustment_value: number
  priority: number
  is_active: boolean
  created_at: string
}


export interface ServiceListParams {
  category?: string
  barber_id?: number
  is_active?: boolean
  is_bookable_online?: boolean
  skip?: number
  limit?: number
}

// Notification API functions
export interface NotificationPreferences {
  id: number
  user_id: number
  email_enabled: boolean
  email_appointment_confirmation: boolean
  email_appointment_reminder: boolean
  email_appointment_changes: boolean
  email_marketing: boolean
  sms_enabled: boolean
  sms_appointment_confirmation: boolean
  sms_appointment_reminder: boolean
  sms_appointment_changes: boolean
  sms_marketing: boolean
  reminder_hours: number[]
  created_at: string
  updated_at: string
}

export interface NotificationTemplate {
  id: number
  name: string
  template_type: string
  subject?: string
  variables: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface NotificationHistory {
  id: number
  notification_type: string
  template_name: string
  recipient: string
  subject?: string
  status: string
  scheduled_for: string
  sent_at?: string
  attempts: number
  error_message?: string
  created_at: string
}

export interface NotificationStats {
  period_days: number
  since_date: string
  email: { [key: string]: number }
  sms: { [key: string]: number }
  service_stats?: { [key: string]: any }
  user_specific?: boolean
}

export interface NotificationPreferencesUpdate {
  email_enabled?: boolean
  email_appointment_confirmation?: boolean
  email_appointment_reminder?: boolean
  email_appointment_changes?: boolean
  email_marketing?: boolean
  sms_enabled?: boolean
  sms_appointment_confirmation?: boolean
  sms_appointment_reminder?: boolean
  sms_appointment_changes?: boolean
  sms_marketing?: boolean
  reminder_hours?: number[]
}

export async function getNotificationPreferencesV2(): Promise<NotificationPreferences> {
  return fetchAPI('/notifications/preferences')
}

export async function updateNotificationPreferencesV2(
  preferences: NotificationPreferencesUpdate
): Promise<NotificationPreferences> {
  return fetchAPI('/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify(preferences),
  })
}

// ============================================================================
// BOOKING RULES API
// ============================================================================

export interface BookingRule {
  id: number
  rule_name: string
  rule_type: string
  rule_params: Record<string, any>
  applies_to: string
  service_ids?: number[]
  barber_ids?: number[]
  client_types?: string[]
  priority: number
  is_active: boolean
  created_by_id: number
  created_at: string
  updated_at: string
}

export interface BookingRuleCreate {
  rule_name: string
  rule_type: string
  rule_params: Record<string, any>
  applies_to: string
  service_ids?: number[]
  barber_ids?: number[]
  client_types?: string[]
  priority?: number
}

export interface BookingRuleUpdate {
  rule_name?: string
  rule_type?: string
  rule_params?: Record<string, any>
  applies_to?: string
  service_ids?: number[]
  barber_ids?: number[]
  client_types?: string[]
  priority?: number
  is_active?: boolean
}

export interface BookingValidation {
  service_id: number
  barber_id?: number
  booking_date: string
  booking_time: string
  duration_minutes: number
  client_id?: number
}

export interface BookingValidationResponse {
  is_valid: boolean
  violations: string[]
  booking_allowed: boolean
}

export interface ServiceBookingRule {
  id: number
  service_id: number
  rule_type: string
  is_active: boolean
  min_age?: number
  max_age?: number
  requires_consultation?: boolean
  requires_patch_test?: boolean
  patch_test_hours_before?: number
  max_bookings_per_day?: number
  min_days_between_bookings?: number
  blocked_days_of_week?: number[]
}

export interface ServiceBookingRuleCreate {
  rule_type: string
  min_age?: number
  max_age?: number
  requires_consultation?: boolean
  requires_patch_test?: boolean
  patch_test_hours_before?: number
  max_bookings_per_day?: number
  min_days_between_bookings?: number
  blocked_days_of_week?: number[]
}

// Booking rules endpoints
export async function getBookingRules(
  ruleType?: string,
  isActive?: boolean
): Promise<BookingRule[]> {
  const params = new URLSearchParams()
  if (ruleType) params.append('rule_type', ruleType)
  if (isActive !== undefined) params.append('is_active', isActive.toString())
  
  const query = params.toString()
  return fetchAPI(`/api/v2/booking-rules/${query ? '?' + query : ''}`)
}

export async function createBookingRule(ruleData: BookingRuleCreate): Promise<BookingRule> {
  return fetchAPI('/api/v2/booking-rules/', {
    method: 'POST',
    body: JSON.stringify(ruleData),
  })
}

export async function getBookingRule(ruleId: number): Promise<BookingRule> {
  return fetchAPI(`/api/v2/booking-rules/${ruleId}`)
}

export async function updateBookingRule(ruleId: number, updates: BookingRuleUpdate): Promise<BookingRule> {
  return fetchAPI(`/api/v2/booking-rules/${ruleId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
}

export async function deleteBookingRule(ruleId: number) {
  return fetchAPI(`/api/v2/booking-rules/${ruleId}`, {
    method: 'DELETE',
  })
}

export async function validateBooking(bookingData: BookingValidation): Promise<BookingValidationResponse> {
  return fetchAPI('/api/v2/booking-rules/validate', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  })
}

export async function getServiceBookingRulesAdvanced(serviceId: number): Promise<ServiceBookingRule[]> {
  return fetchAPI(`/api/v2/booking-rules/services/${serviceId}/rules`)
}

export async function createServiceBookingRuleAdvanced(
  serviceId: number,
  ruleData: ServiceBookingRuleCreate
): Promise<ServiceBookingRule> {
  return fetchAPI(`/api/v2/booking-rules/services/${serviceId}/rules`, {
    method: 'POST',
    body: JSON.stringify(ruleData),
  })
}

export async function getRuleTypes() {
  return fetchAPI('/api/v2/booking-rules/rule-types')
}

// ============================================================================
// WEBHOOKS API
// ============================================================================

export async function webhookHealth() {
  return fetchAPI('/api/v2/webhooks/health')
}


// ============================================================================
// TIMEZONES API
// ============================================================================

export interface TimezoneInfo {
  name: string
  offset: string
  display_name: string
}

export interface TimezoneListResponse {
  timezones: TimezoneInfo[]
  total: number
}

// Timezone endpoints
export async function getAllTimezones(
  search?: string,
  limit: number = 100,
  offset: number = 0
): Promise<TimezoneListResponse> {
  const params = new URLSearchParams()
  if (search) params.append('search', search)
  params.append('limit', limit.toString())
  params.append('offset', offset.toString())
  
  return fetchAPI(`/api/v2/timezones?${params.toString()}`)
}

export async function getCommonTimezones(): Promise<TimezoneListResponse> {
  return fetchAPI('/api/v2/timezones/common')
}

export async function getTimezoneDetails(timezoneName: string): Promise<TimezoneInfo> {
  // Encode timezone name for URL
  const encodedName = encodeURIComponent(timezoneName)
  return fetchAPI(`/api/v2/timezones/${encodedName}`)
}

// ============================================================================
// COMPREHENSIVE ANALYTICS API
// ============================================================================

/**
 * ANALYTICS API INTEGRATION SUMMARY
 * 
 * This section provides complete integration with the Six Figure Barber analytics backend.
 * All analytics endpoints from the backend routers/analytics.py are now fully integrated
 * with proper TypeScript interfaces and comprehensive error handling.
 * 
 * AVAILABLE ENDPOINTS:
 * 
 * 1. Dashboard Analytics (/analytics/dashboard)
 *    - Comprehensive dashboard metrics and KPIs
 *    - Revenue summary, appointment summary, client summary
 *    - Trend data and growth metrics
 * 
 * 2. Revenue Analytics (/analytics/revenue) 
 *    - Detailed revenue breakdown by period
 *    - Service revenue analysis
 *    - Growth metrics and comparisons
 *    - Supports grouping by day/week/month/year
 * 
 * 3. Appointment Analytics (/analytics/appointments)
 *    - Completion rates, cancellation rates, no-show analysis
 *    - Service breakdown and time pattern analysis
 *    - Booking trends and seasonal data
 * 
 * 4. Appointment Patterns (/analytics/appointment-patterns)
 *    - Booking behavior and advance booking patterns
 *    - No-show risk factors and mitigation strategies
 *    - Client preferences and optimization recommendations
 * 
 * 5. Client Retention (/analytics/client-retention)
 *    - Retention rates by time period (1m, 3m, 6m, 12m)
 *    - Cohort analysis and churn insights
 *    - Client segmentation and improvement opportunities
 * 
 * 6. Client Lifetime Value (/analytics/client-lifetime-value)
 *    - CLV calculation and distribution analysis
 *    - Predictive CLV with confidence scoring
 *    - Revenue impact and optimization strategies
 * 
 * 7. Barber Performance (/analytics/barber-performance)
 *    - Individual performance metrics and efficiency scoring
 *    - Client relationship metrics and growth tracking
 *    - Comparative performance vs team averages
 * 
 * 8. Six Figure Barber Methodology (/analytics/six-figure-barber)
 *    - Goal tracking and income projection
 *    - Methodology-specific KPIs and recommendations
 *    - Progress tracking toward six-figure targets
 * 
 * 9. Comparative Analytics (/analytics/comparative)
 *    - Period-over-period comparisons
 *    - Trend analysis and seasonality detection
 *    - Growth rate calculations and insights
 * 
 * 10. Business Insights (/analytics/insights)
 *     - AI-powered business recommendations
 *     - Performance scoring and benchmarking
 *     - Actionable insights with implementation guidance
 * 
 * 11. Export Analytics (/analytics/export)
 *     - Data export in JSON/CSV formats
 *     - Customizable date ranges and metrics
 *     - Bulk data extraction for reporting
 * 
 * USAGE PATTERNS:
 * 
 * Individual Functions:
 *   const dashboardData = await getDashboardAnalytics(userId, startDate, endDate)
 *   const revenueData = await getRevenueAnalytics(userId, startDate, endDate, 'month')
 * 
 * Organized API Object:
 *   const dashboardData = await analyticsAPI.dashboard({ userId, startDate, endDate })
 *   const revenueData = await analyticsAPI.revenue({ userId, startDate, endDate, groupBy: 'month' })
 * 
 * Batch Requests:
 *   const batchData = await analyticsAPI.batch([
 *     { type: 'dashboard', params: { userId } },
 *     { type: 'revenue', params: { userId, groupBy: 'month' } },
 *     { type: 'insights', params: { userId } }
 *   ])
 * 
 * ERROR HANDLING:
 * All functions include comprehensive error handling with:
 * - Request validation
 * - Response validation  
 * - Performance monitoring
 * - Automatic retry logic for transient failures
 * - Detailed error logging and reporting
 * 
 * TYPESCRIPT SUPPORT:
 * Complete TypeScript interfaces are provided for:
 * - All request parameters
 * - All response data structures
 * - Error handling and validation
 * - Optional parameters and default values
 */

/**
 * Get comprehensive appointment analytics including completion rates, 
 * no-shows, service breakdown, and time patterns
 * 
 * @param userId - User ID to filter analytics (admin only)
 * @param startDate - Start date for analytics range (YYYY-MM-DD)
 * @param endDate - End date for analytics range (YYYY-MM-DD)
 * @returns Promise<AppointmentAnalytics>
 */
export async function getAppointmentAnalytics(
  userId?: number,
  startDate?: string,
  endDate?: string
): Promise<AppointmentAnalytics> {
  const params = new URLSearchParams()
  if (userId) params.append('user_id', userId.toString())
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  
  const query = params.toString()
  return fetchAPI(`/api/v2/analytics/appointments${query ? '?' + query : ''}`)
}

/**
 * Get detailed appointment booking patterns and no-show analysis
 * 
 * @param userId - User ID to filter analytics (admin only)
 * @param startDate - Start date for analytics range (YYYY-MM-DD)
 * @param endDate - End date for analytics range (YYYY-MM-DD)
 * @returns Promise<AppointmentPatterns>
 */
export async function getAppointmentPatterns(
  userId?: number,
  startDate?: string,
  endDate?: string
): Promise<AppointmentPatterns> {
  const params = new URLSearchParams()
  if (userId) params.append('user_id', userId.toString())
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  
  const query = params.toString()
  return fetchAPI(`/api/v2/analytics/appointment-patterns${query ? '?' + query : ''}`)
}

/**
 * Get client retention metrics and segmentation analysis
 * 
 * @param userId - User ID to filter analytics (admin only)
 * @param startDate - Start date for analytics range (YYYY-MM-DD)
 * @param endDate - End date for analytics range (YYYY-MM-DD)
 * @returns Promise<ClientRetentionAnalytics>
 */
export async function getClientRetentionAnalytics(
  userId?: number,
  startDate?: string,
  endDate?: string
): Promise<ClientRetentionAnalytics> {
  const params = new URLSearchParams()
  if (userId) params.append('user_id', userId.toString())
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  
  const query = params.toString()
  return fetchAPI(`/api/v2/analytics/client-retention${query ? '?' + query : ''}`)
}

/**
 * Get comprehensive client lifetime value analytics and segmentation
 * 
 * @param userId - User ID to filter analytics (admin only)
 * @param startDate - Start date for analytics range (YYYY-MM-DD)
 * @param endDate - End date for analytics range (YYYY-MM-DD)
 * @returns Promise<ClientLifetimeValueAnalytics>
 */
export async function getClientLifetimeValueAnalytics(
  userId?: number,
  startDate?: string,
  endDate?: string
): Promise<ClientLifetimeValueAnalytics> {
  const params = new URLSearchParams()
  if (userId) params.append('user_id', userId.toString())
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  
  const query = params.toString()
  return fetchAPI(`/api/v2/analytics/client-lifetime-value${query ? '?' + query : ''}`)
}

/**
 * Get comprehensive barber/user performance metrics
 * 
 * @param userId - User ID to analyze (defaults to current user)
 * @param startDate - Start date for analytics range (YYYY-MM-DD)
 * @param endDate - End date for analytics range (YYYY-MM-DD)
 * @returns Promise<BarberPerformanceMetrics>
 */
export async function getBarberPerformanceMetrics(
  userId?: number,
  startDate?: string,
  endDate?: string
): Promise<BarberPerformanceMetrics> {
  const params = new URLSearchParams()
  if (userId) params.append('user_id', userId.toString())
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  
  const query = params.toString()
  return fetchAPI(`/api/v2/analytics/barber-performance${query ? '?' + query : ''}`)
}

/**
 * Get comparative analytics between current and previous periods
 * 
 * @param comparisonPeriod - Comparison period: 'previous_month', 'previous_quarter', 'previous_year'
 * @param userId - User ID to filter analytics (admin only)
 * @returns Promise<ComparativeAnalytics>
 */
export async function getComparativeAnalytics(
  comparisonPeriod: 'previous_month' | 'previous_quarter' | 'previous_year' = 'previous_month',
  userId?: number
): Promise<ComparativeAnalytics> {
  const params = new URLSearchParams()
  params.append('comparison_period', comparisonPeriod)
  if (userId) params.append('user_id', userId.toString())
  
  return fetchAPI(`/api/v2/analytics/comparative?${params.toString()}`)
}

/**
 * Export analytics data in various formats
 * 
 * @param exportType - Type of data to export: 'dashboard', 'revenue', 'appointments', 'clients', 'barber_performance'
 * @param format - Export format: 'json', 'csv'
 * @param startDate - Start date for export range (YYYY-MM-DD)
 * @param endDate - End date for export range (YYYY-MM-DD)
 * @param userId - User ID to filter analytics (admin only)
 * @returns Promise<AnalyticsExportResponse>
 */
export async function exportAnalyticsData(
  exportType: 'dashboard' | 'revenue' | 'appointments' | 'clients' | 'barber_performance' = 'dashboard',
  format: 'json' | 'csv' = 'json',
  startDate?: string,
  endDate?: string,
  userId?: number
): Promise<AnalyticsExportResponse> {
  const params = new URLSearchParams()
  params.append('export_type', exportType)
  params.append('format', format)
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  if (userId) params.append('user_id', userId.toString())
  
  return fetchAPI(`/api/v2/analytics/export?${params.toString()}`)
}

/**
 * Get AI-powered business insights and recommendations
 * 
 * @param userId - User ID to filter analytics (admin only)
 * @param startDate - Start date for analytics range (YYYY-MM-DD)
 * @param endDate - End date for analytics range (YYYY-MM-DD)
 * @returns Promise<BusinessInsights>
 */
export async function getBusinessInsights(
  userId?: number,
  startDate?: string,
  endDate?: string
): Promise<BusinessInsights> {
  const params = new URLSearchParams()
  if (userId) params.append('user_id', userId.toString())
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)
  
  const query = params.toString()
  return fetchAPI(`/api/v2/analytics/insights${query ? '?' + query : ''}`)
}

// ============================================================================
// COMPREHENSIVE ANALYTICS API OBJECT
// ============================================================================

/**
 * Comprehensive Analytics API Object
 * 
 * Provides organized access to all Six Figure Barber analytics endpoints
 * with proper TypeScript interfaces and error handling.
 */
export const analyticsAPI = {
  /**
   * Get comprehensive dashboard analytics
   */
  dashboard: async (params?: {
    userId?: number
    startDate?: string
    endDate?: string
  }): Promise<DashboardAnalytics> => {
    return getDashboardAnalytics(params?.userId, params?.startDate, params?.endDate)
  },

  /**
   * Get detailed revenue analytics with grouping options
   */
  revenue: async (params?: {
    userId?: number
    startDate?: string
    endDate?: string
    groupBy?: 'day' | 'week' | 'month' | 'year'
  }): Promise<RevenueAnalytics> => {
    return getRevenueAnalytics(
      params?.userId, 
      params?.startDate, 
      params?.endDate, 
      params?.groupBy || 'month'
    )
  },

  /**
   * Get appointment analytics and metrics
   */
  appointments: async (params?: {
    userId?: number
    startDate?: string
    endDate?: string
  }): Promise<AppointmentAnalytics> => {
    return getAppointmentAnalytics(params?.userId, params?.startDate, params?.endDate)
  },

  /**
   * Get appointment booking patterns and no-show analysis
   */
  appointmentPatterns: async (params?: {
    userId?: number
    startDate?: string
    endDate?: string
  }): Promise<AppointmentPatterns> => {
    return getAppointmentPatterns(params?.userId, params?.startDate, params?.endDate)
  },

  /**
   * Get client retention metrics and analysis
   */
  clientRetention: async (params?: {
    userId?: number
    startDate?: string
    endDate?: string
  }): Promise<ClientRetentionAnalytics> => {
    return getClientRetentionAnalytics(params?.userId, params?.startDate, params?.endDate)
  },

  /**
   * Get client lifetime value analytics
   */
  clientLifetimeValue: async (params?: {
    userId?: number
    startDate?: string
    endDate?: string
  }): Promise<ClientLifetimeValueAnalytics> => {
    return getClientLifetimeValueAnalytics(params?.userId, params?.startDate, params?.endDate)
  },

  /**
   * Get barber/user performance metrics
   */
  barberPerformance: async (params?: {
    userId?: number
    startDate?: string
    endDate?: string
  }): Promise<BarberPerformanceMetrics> => {
    return getBarberPerformanceMetrics(params?.userId, params?.startDate, params?.endDate)
  },

  /**
   * Get Six Figure Barber methodology metrics
   */
  sixFigureBarber: async (params?: {
    targetAnnualIncome?: number
    userId?: number
  }): Promise<SixFigureBarberMetrics> => {
    return getSixFigureBarberMetrics(
      params?.targetAnnualIncome || 100000, 
      params?.userId
    )
  },

  /**
   * Get comparative analytics between periods
   */
  comparative: async (params?: {
    comparisonPeriod?: 'previous_month' | 'previous_quarter' | 'previous_year'
    userId?: number
  }): Promise<ComparativeAnalytics> => {
    return getComparativeAnalytics(
      params?.comparisonPeriod || 'previous_month',
      params?.userId
    )
  },

  /**
   * Get AI-powered business insights and recommendations
   */
  insights: async (params?: {
    userId?: number
    startDate?: string
    endDate?: string
  }): Promise<BusinessInsights> => {
    return getBusinessInsights(params?.userId, params?.startDate, params?.endDate)
  },

  /**
   * Export analytics data in various formats
   */
  export: async (params?: {
    exportType?: 'dashboard' | 'revenue' | 'appointments' | 'clients' | 'barber_performance'
    format?: 'json' | 'csv'
    startDate?: string
    endDate?: string
    userId?: number
  }): Promise<AnalyticsExportResponse> => {
    return exportAnalyticsData(
      params?.exportType || 'dashboard',
      params?.format || 'json',
      params?.startDate,
      params?.endDate,
      params?.userId
    )
  },

  /**
   * Performance analytics (legacy alias for barberPerformance)
   * @deprecated Use barberPerformance instead
   */
  performance: async (params?: {
    userId?: number
    startDate?: string
    endDate?: string
  }): Promise<PerformanceAnalytics> => {
    return getPerformanceAnalytics({
      barber_id: params?.userId,
      start_date: params?.startDate,
      end_date: params?.endDate
    })
  },

  /**
   * Batch analytics request - get multiple analytics in one call
   */
  batch: async (requests: Array<{
    type: 'dashboard' | 'revenue' | 'appointments' | 'clientRetention' | 'barberPerformance' | 'insights'
    params?: any
  }>): Promise<{ [key: string]: any }> => {
    const results: { [key: string]: any } = {}
    
    // Execute all requests in parallel
    const promises = requests.map(async (request, index) => {
      try {
        let result
        switch (request.type) {
          case 'dashboard':
            result = await analyticsAPI.dashboard(request.params)
            break
          case 'revenue':
            result = await analyticsAPI.revenue(request.params)
            break
          case 'appointments':
            result = await analyticsAPI.appointments(request.params)
            break
          case 'clientRetention':
            result = await analyticsAPI.clientRetention(request.params)
            break
          case 'barberPerformance':
            result = await analyticsAPI.barberPerformance(request.params)
            break
          case 'insights':
            result = await analyticsAPI.insights(request.params)
            break
          default:
            throw new Error(`Unknown analytics type: ${request.type}`)
        }
        results[`${request.type}_${index}`] = result
      } catch (error) {
        console.error(`Error fetching ${request.type} analytics:`, error)
        results[`${request.type}_${index}`] = { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })
    
    await Promise.all(promises)
    return results
  }
}

// ============================================================================
// 6FB AI COACH API FUNCTIONS
// ============================================================================

/**
 * Get comprehensive coaching data for the 6FB AI Coach component
 */
export async function getSixFigureCoachingData(userId: number): Promise<CoachingData> {
  try {
    // Get multiple analytics data points for comprehensive coaching
    const [
      dashboardData,
      sixFigureMetrics,
      businessInsights,
      performanceData
    ] = await Promise.all([
      getDashboardAnalytics(userId),
      getSixFigureBarberMetrics(100000, userId),
      getBusinessInsights(userId),
      getPerformanceAnalytics({ barber_id: userId })
    ])

    // Calculate business health score from the aggregated data
    const healthScore = _calculateBusinessHealthScore({
      dashboard: dashboardData,
      sixFigure: sixFigureMetrics,
      performance: performanceData
    })

    // Generate coaching insights based on performance data
    const insights = _generateCoachingInsights({
      dashboard: dashboardData,
      sixFigure: sixFigureMetrics,
      performance: performanceData,
      businessInsights: businessInsights
    })

    // Create actionable items from insights
    const actionItems = _generateActionItems(insights, sixFigureMetrics)

    // Generate motivational message based on progress
    const motivationalMessage = _generateMotivationalMessage(sixFigureMetrics, healthScore)

    const coachingData: CoachingData = {
      health_score: healthScore,
      insights: insights,
      action_items: actionItems,
      motivational_message: motivationalMessage,
      six_figure_progress: {
        current_annual_projection: sixFigureMetrics.current_performance.annual_revenue_projection,
        target_annual_income: sixFigureMetrics.targets.annual_income_target,
        progress_percentage: (sixFigureMetrics.current_performance.annual_revenue_projection / sixFigureMetrics.targets.annual_income_target) * 100,
        monthly_gap: sixFigureMetrics.targets.revenue_gap / 12,
        on_track: sixFigureMetrics.targets.on_track
      },
      key_recommendations: {
        pricing_optimization: sixFigureMetrics.recommendations.price_optimization ? [
          `Increase average ticket from $${sixFigureMetrics.recommendations.price_optimization.current_average_ticket} to $${sixFigureMetrics.recommendations.price_optimization.recommended_average_ticket}`,
          `Implement ${sixFigureMetrics.recommendations.price_optimization.recommended_increase_percentage}% price increase strategy`
        ] : [],
        client_acquisition: sixFigureMetrics.recommendations.client_acquisition ? [
          `Acquire ${sixFigureMetrics.recommendations.client_acquisition.additional_clients_needed} additional clients monthly`,
          `Focus on converting leads to reach ${sixFigureMetrics.recommendations.client_acquisition.target_monthly_clients} monthly clients`
        ] : [],
        retention_improvement: dashboardData.client_summary ? [
          `Improve retention rate to reduce churn`,
          `Implement loyalty programs for repeat bookings`
        ] : [],
        efficiency_gains: sixFigureMetrics.recommendations.time_optimization ? [
          `Optimize schedule to reach ${sixFigureMetrics.recommendations.time_optimization.target_utilization_rate}% utilization`,
          `Add ${sixFigureMetrics.recommendations.time_optimization.additional_hours_needed} productive hours weekly`
        ] : []
      },
      performance_trends: {
        revenue_trend: dashboardData.revenue_summary?.revenue_growth > 0 ? 'up' : dashboardData.revenue_summary?.revenue_growth < 0 ? 'down' : 'stable',
        client_trend: dashboardData.client_summary?.new_clients > 0 ? 'up' : 'stable',
        efficiency_trend: performanceData.efficiency_metrics?.utilization_rate > 70 ? 'up' : performanceData.efficiency_metrics?.utilization_rate < 60 ? 'down' : 'stable'
      },
      generated_at: new Date().toISOString()
    }

    return coachingData
  } catch (error) {
    console.error('Error fetching coaching data:', error)
    throw new Error('Failed to load coaching data. Please try again.')
  }
}

/**
 * Get business health score calculation
 */
export async function getBusinessHealthScore(userId: number): Promise<HealthScore> {
  try {
    const [dashboardData, performanceData, sixFigureMetrics] = await Promise.all([
      getDashboardAnalytics(userId),
      getPerformanceAnalytics({ barber_id: userId }),
      getSixFigureBarberMetrics(100000, userId)
    ])

    return _calculateBusinessHealthScore({
      dashboard: dashboardData,
      sixFigure: sixFigureMetrics,
      performance: performanceData
    })
  } catch (error) {
    console.error('Error calculating health score:', error)
    throw new Error('Failed to calculate business health score. Please try again.')
  }
}

/**
 * Get coaching insights based on analytics data
 */
export async function getCoachingInsights(metrics: any): Promise<CoachingInsight[]> {
  try {
    // If metrics object is provided, use it directly, otherwise fetch fresh data
    let analyticsData = metrics
    
    if (!analyticsData || !analyticsData.dashboard) {
      const userId = metrics?.userId || undefined
      analyticsData = {
        dashboard: await getDashboardAnalytics(userId),
        sixFigure: await getSixFigureBarberMetrics(100000, userId),
        performance: await getPerformanceAnalytics(userId),
        businessInsights: await getBusinessInsights(userId)
      }
    }

    return _generateCoachingInsights(analyticsData)
  } catch (error) {
    console.error('Error generating coaching insights:', error)
    throw new Error('Failed to generate coaching insights. Please try again.')
  }
}

// ============================================================================
// PRIVATE HELPER FUNCTIONS FOR COACHING
// ============================================================================

function _calculateBusinessHealthScore(data: {
  dashboard: DashboardAnalytics
  sixFigure: SixFigureBarberMetrics
  performance: PerformanceAnalytics
}): HealthScore {
  let totalScore = 0
  const maxScore = 100
  const factors: HealthScoreFactor[] = []

  // Revenue Performance (25 points)
  const revenueGrowth = data.dashboard.revenue_summary?.revenue_growth || 0
  let revenueScore = 0
  if (revenueGrowth >= 15) revenueScore = 25
  else if (revenueGrowth >= 10) revenueScore = 20
  else if (revenueGrowth >= 5) revenueScore = 15
  else if (revenueGrowth >= 0) revenueScore = 10
  else revenueScore = 5

  totalScore += revenueScore
  factors.push({
    factor: 'Revenue Growth',
    score: revenueScore,
    max_score: 25,
    description: `Current growth: ${revenueGrowth.toFixed(1)}%`,
    improvement_suggestions: revenueGrowth < 10 ? [
      'Implement dynamic pricing strategy',
      'Focus on premium service offerings',
      'Optimize appointment scheduling'
    ] : ['Maintain current growth trajectory']
  })

  // Six Figure Progress (25 points)
  const progressToTarget = (data.sixFigure.current_performance.annual_revenue_projection / data.sixFigure.targets.annual_income_target) * 100
  let progressScore = 0
  if (progressToTarget >= 90) progressScore = 25
  else if (progressToTarget >= 75) progressScore = 20
  else if (progressToTarget >= 50) progressScore = 15
  else if (progressToTarget >= 25) progressScore = 10
  else progressScore = 5

  totalScore += progressScore
  factors.push({
    factor: 'Six Figure Progress',
    score: progressScore,
    max_score: 25,
    description: `${progressToTarget.toFixed(1)}% to six-figure goal`,
    improvement_suggestions: progressToTarget < 75 ? [
      'Increase service prices strategically',
      'Expand service offerings',
      'Improve client acquisition'
    ] : ['Stay focused on current strategy']
  })

  // Client Performance (25 points)
  const clientRetention = data.performance.client_metrics?.client_retention_rate || 0
  let clientScore = 0
  if (clientRetention >= 80) clientScore = 25
  else if (clientRetention >= 70) clientScore = 20
  else if (clientRetention >= 60) clientScore = 15
  else if (clientRetention >= 50) clientScore = 10
  else clientScore = 5

  totalScore += clientScore
  factors.push({
    factor: 'Client Retention',
    score: clientScore,
    max_score: 25,
    description: `${clientRetention.toFixed(1)}% retention rate`,
    improvement_suggestions: clientRetention < 70 ? [
      'Implement loyalty programs',
      'Improve service quality',
      'Enhance client communication'
    ] : ['Maintain excellent client relationships']
  })

  // Operational Efficiency (25 points)
  const utilization = data.performance.efficiency_metrics?.utilization_rate || 0
  let efficiencyScore = 0
  if (utilization >= 80 && utilization <= 90) efficiencyScore = 25
  else if (utilization >= 70 && utilization <= 95) efficiencyScore = 20
  else if (utilization >= 60) efficiencyScore = 15
  else if (utilization >= 50) efficiencyScore = 10
  else efficiencyScore = 5

  totalScore += efficiencyScore
  factors.push({
    factor: 'Schedule Efficiency',
    score: efficiencyScore,
    max_score: 25,
    description: `${utilization.toFixed(1)}% utilization rate`,
    improvement_suggestions: utilization < 70 ? [
      'Optimize booking patterns',
      'Reduce appointment gaps',
      'Implement online booking'
    ] : utilization > 90 ? [
      'Consider expanding availability',
      'Add team members if needed',
      'Prevent burnout with breaks'
    ] : ['Maintain optimal efficiency']
  })

  const percentage = (totalScore / maxScore) * 100
  let grade: 'A' | 'B' | 'C' | 'D' | 'F'
  if (percentage >= 90) grade = 'A'
  else if (percentage >= 80) grade = 'B'
  else if (percentage >= 70) grade = 'C'
  else if (percentage >= 60) grade = 'D'
  else grade = 'F'

  return {
    overall_score: totalScore,
    max_score: maxScore,
    percentage: percentage,
    grade: grade,
    factors: factors,
    trend: percentage >= 75 ? 'improving' : percentage >= 60 ? 'stable' : 'declining',
    last_updated: new Date().toISOString()
  }
}

function _generateCoachingInsights(data: any): CoachingInsight[] {
  const insights: CoachingInsight[] = []
  const timestamp = new Date().toISOString()

  // Revenue insights
  if (data.dashboard?.revenue_summary) {
    const revenueGrowth = data.dashboard.revenue_summary.revenue_growth || 0
    if (revenueGrowth < 5) {
      insights.push({
        id: `revenue_${Date.now()}`,
        category: 'revenue',
        priority: 'high',
        title: 'Revenue Growth Opportunity',
        description: 'Your revenue growth is below the 5% monthly target. Consider implementing pricing strategies and premium services.',
        impact: 'Could increase monthly revenue by 15-25%',
        actionable: true,
        data_points: { current_growth: revenueGrowth, target_growth: 5 },
        created_at: timestamp
      })
    }
  }

  // Six Figure Progress insights
  if (data.sixFigure?.targets) {
    if (!data.sixFigure.targets.on_track) {
      insights.push({
        id: `sixfigure_${Date.now()}`,
        category: 'growth',
        priority: 'high',
        title: 'Six Figure Goal Adjustment Needed',
        description: 'You are not on track to reach your six-figure goal. Focus on the key recommendations provided.',
        impact: 'Critical for reaching annual income target',
        actionable: true,
        data_points: { 
          current_projection: data.sixFigure.current_performance.annual_revenue_projection,
          target: data.sixFigure.targets.annual_income_target,
          gap: data.sixFigure.targets.revenue_gap
        },
        created_at: timestamp
      })
    }
  }

  // Client retention insights
  if (data.performance?.client_metrics) {
    const retention = data.performance.client_metrics.client_retention_rate || 0
    if (retention < 70) {
      insights.push({
        id: `retention_${Date.now()}`,
        category: 'client_retention',
        priority: 'medium',
        title: 'Client Retention Improvement Needed',
        description: 'Your client retention rate is below industry standards. Focus on building stronger client relationships.',
        impact: 'Could reduce marketing costs by 20-30%',
        actionable: true,
        data_points: { current_retention: retention, target_retention: 75 },
        created_at: timestamp
      })
    }
  }

  // Efficiency insights
  if (data.performance?.efficiency_metrics) {
    const utilization = data.performance.efficiency_metrics.utilization_rate || 0
    if (utilization < 60) {
      insights.push({
        id: `efficiency_${Date.now()}`,
        category: 'efficiency',
        priority: 'medium',
        title: 'Schedule Optimization Opportunity',
        description: 'Your schedule utilization is low. Consider optimizing your booking patterns and availability.',
        impact: 'Could increase daily capacity by 20-30%',
        actionable: true,
        data_points: { current_utilization: utilization, target_utilization: 75 },
        created_at: timestamp
      })
    } else if (utilization > 90) {
      insights.push({
        id: `burnout_${Date.now()}`,
        category: 'optimization',
        priority: 'medium',
        title: 'Prevent Burnout Risk',
        description: 'Your utilization rate is very high. Consider adding breaks or expanding your team to prevent burnout.',
        impact: 'Maintains service quality and personal wellness',
        actionable: true,
        data_points: { current_utilization: utilization, recommended_max: 85 },
        created_at: timestamp
      })
    }
  }

  return insights
}

function _generateActionItems(insights: CoachingInsight[], sixFigureMetrics: SixFigureBarberMetrics): ActionItem[] {
  const actionItems: ActionItem[] = []
  const timestamp = new Date().toISOString()

  // Generate action items from insights
  insights.forEach((insight, index) => {
    if (insight.actionable) {
      actionItems.push({
        id: `action_${insight.category}_${Date.now()}_${index}`,
        category: insight.category,
        priority: insight.priority,
        title: `Address: ${insight.title}`,
        description: insight.description,
        expected_impact: insight.impact,
        implementation_time: insight.priority === 'high' ? '1-2 weeks' : '2-4 weeks',
        resources_needed: _getResourcesForCategory(insight.category),
        completed: false,
        created_at: timestamp
      })
    }
  })

  // Add specific action items from Six Figure recommendations
  if (sixFigureMetrics.recommendations) {
    const recs = sixFigureMetrics.recommendations
    
    if (recs.price_optimization) {
      actionItems.push({
        id: `action_pricing_${Date.now()}`,
        category: 'revenue',
        priority: 'high',
        title: 'Implement Price Optimization',
        description: `Increase average ticket by ${recs.price_optimization.recommended_increase_percentage}%`,
        expected_impact: `Additional $${((recs.price_optimization.recommended_average_ticket - recs.price_optimization.current_average_ticket) * 30).toFixed(0)} monthly revenue`,
        implementation_time: '1-2 weeks',
        resources_needed: ['Price analysis', 'Client communication', 'Menu updates'],
        completed: false,
        created_at: timestamp
      })
    }

    if (recs.client_acquisition && recs.client_acquisition.additional_clients_needed > 0) {
      actionItems.push({
        id: `action_acquisition_${Date.now()}`,
        category: 'growth',
        priority: 'high',
        title: 'Boost Client Acquisition',
        description: `Acquire ${recs.client_acquisition.additional_clients_needed} additional clients monthly`,
        expected_impact: 'Meet six-figure revenue targets',
        implementation_time: '2-4 weeks',
        resources_needed: ['Marketing budget', 'Referral program', 'Social media strategy'],
        completed: false,
        created_at: timestamp
      })
    }
  }

  return actionItems.slice(0, 8) // Limit to 8 action items to avoid overwhelming
}

function _generateMotivationalMessage(sixFigureMetrics: SixFigureBarberMetrics, healthScore: HealthScore): string {
  const progressPercentage = (sixFigureMetrics.current_performance.annual_revenue_projection / sixFigureMetrics.targets.annual_income_target) * 100
  
  if (progressPercentage >= 90) {
    return "🚀 Outstanding! You're almost at your six-figure goal. Stay focused and maintain this momentum!"
  } else if (progressPercentage >= 75) {
    return "🎯 Great progress! You're three-quarters of the way to your six-figure goal. Keep pushing forward!"
  } else if (progressPercentage >= 50) {
    return "💪 You're halfway there! Your six-figure journey is gaining momentum. Focus on the key recommendations."
  } else if (progressPercentage >= 25) {
    return "📈 Solid foundation! You're building towards your six-figure goal. Implement the action items to accelerate growth."
  } else {
    return "🌟 Every expert was once a beginner! Your six-figure journey starts with implementing the right strategies. You've got this!"
  }
}

function _getResourcesForCategory(category: string): string[] {
  const resourceMap: Record<string, string[]> = {
    revenue: ['Pricing analysis', 'Service menu review', 'Market research'],
    efficiency: ['Schedule optimization', 'Booking system', 'Time tracking'],
    client_retention: ['CRM system', 'Loyalty program', 'Follow-up protocols'],
    growth: ['Marketing budget', 'Social media tools', 'Referral system'],
    optimization: ['Analytics tools', 'Process documentation', 'Training materials']
  }
  
  return resourceMap[category] || ['Planning', 'Implementation', 'Monitoring']
}

// ============================================================================
// EXTENDED PAYMENTS API
// ============================================================================




export interface GiftCertificateResponse {
  id: number
  code: string
  amount: number
  balance: number
  purchaser_name: string
  recipient_name?: string
  status: string
  valid_until: string
  created_at: string
}

export interface GiftCertificateValidate {
  code: string
}




export interface PayoutCreate {
  barber_id: number
  start_date: string
  end_date: string
}

export interface PayoutResponse {
  id: number
  barber_id: number
  amount: number
  status: string
  stripe_transfer_id?: string
  created_at: string
  processed_at?: string
}

export interface StripeConnectOnboardingResponse {
  account_id: string
  onboarding_url: string
  expires_at: string
}

export interface StripeConnectStatusResponse {
  connected: boolean
  account_id?: string
  charges_enabled: boolean
  payouts_enabled: boolean
  requirements?: string[]
}

// Extended payment endpoints
export async function processRefund(refundData: RefundCreate): Promise<RefundResponse> {
  return fetchAPI('/api/v2/payments/refund', {
    method: 'POST',
    body: JSON.stringify(refundData),
  })
}

export async function createGiftCertificate(giftCertData: GiftCertificateCreate): Promise<GiftCertificateResponse> {
  return fetchAPI('/api/v2/payments/gift-certificates', {
    method: 'POST',
    body: JSON.stringify(giftCertData),
  })
}

export async function validateGiftCertificate(validationData: GiftCertificateValidate) {
  return fetchAPI('/api/v2/payments/gift-certificates/validate', {
    method: 'POST',
    body: JSON.stringify(validationData),
  })
}


export async function generatePaymentReport(reportRequest: PaymentReportRequest): Promise<PaymentReportResponse> {
  return fetchAPI('/api/v2/payments/reports', {
    method: 'POST',
    body: JSON.stringify(reportRequest),
  })
}

export async function processPayout(payoutData: PayoutCreate): Promise<PayoutResponse> {
  return fetchAPI('/api/v2/payments/payouts', {
    method: 'POST',
    body: JSON.stringify(payoutData),
  })
}

export async function listGiftCertificates(): Promise<GiftCertificateResponse[]> {
  return fetchAPI('/api/v2/payments/gift-certificates')
}

export async function createStripeConnectAccount(): Promise<StripeConnectOnboardingResponse> {
  return fetchAPI('/api/v2/payments/stripe-connect/onboard', {
    method: 'POST',
  })
}

export async function getStripeConnectStatus(): Promise<StripeConnectStatusResponse> {
  return fetchAPI('/api/v2/payments/stripe-connect/status')
}

// SMS Conversation Types
export interface SMSMessage {
  id: number
  conversation_id: number
  body: string
  direction: 'inbound' | 'outbound'
  from_phone: string
  to_phone: string
  status: string
  twilio_sid?: string
  sent_by_user_id?: number
  sent_at?: string
  delivered_at?: string
  read_at?: string
  failed_at?: string
  error_code?: string
  error_message?: string
  created_at: string
  updated_at: string
}

export interface SMSConversation {
  id: number
  customer_phone: string
  customer_name?: string
  client_id?: number
  barber_id?: number
  status: string
  last_message_at?: string
  last_message_from?: string
  total_messages: number
  unread_customer_messages: number
  tags?: string[]
  notes?: string
  created_at: string
  updated_at: string
  messages?: SMSMessage[]
  client?: any
  barber?: any
}

export interface SMSMessageCreate {
  body: string
  from_phone: string
}

export interface SMSConversationCreate {
  customer_phone: string
  customer_name?: string
}

export interface SMSConversationUpdate {
  customer_name?: string
  barber_id?: number
  status?: string
  tags?: string[]
  notes?: string
}

// SMS API Functions - For Real Customer Text Messaging
export async function getSMSConversations(
  limit: number = 50,
  status?: string,
  unread_only: boolean = false,
  search?: string
): Promise<SMSConversation[]> {
  const params = new URLSearchParams()
  params.append('limit', limit.toString())
  if (status) params.append('status', status)
  if (unread_only) params.append('unread_only', 'true')
  if (search) params.append('search', search)
  
  return fetchAPI(`/api/v2/sms/conversations?${params.toString()}`)
}

export async function getSMSConversation(conversationId: number): Promise<SMSConversation> {
  return fetchAPI(`/api/v2/sms/conversations/${conversationId}`)
}

export async function getConversationMessages(
  conversationId: number,
  limit: number = 100,
  offset: number = 0
): Promise<SMSMessage[]> {
  const params = new URLSearchParams()
  params.append('limit', limit.toString())
  params.append('offset', offset.toString())
  
  return fetchAPI(`/api/v2/sms/conversations/${conversationId}/messages?${params.toString()}`)
}

export async function sendSMSMessage(
  conversationId: number,
  messageData: SMSMessageCreate
): Promise<SMSMessage> {
  return fetchAPI(`/api/v2/sms/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(messageData),
  })
}

export async function createSMSConversation(
  conversationData: SMSConversationCreate
): Promise<SMSConversation> {
  return fetchAPI('/api/v2/sms/conversations', {
    method: 'POST',
    body: JSON.stringify(conversationData),
  })
}

export async function updateSMSConversation(
  conversationId: number,
  updateData: SMSConversationUpdate
): Promise<SMSConversation> {
  return fetchAPI(`/api/v2/sms/conversations/${conversationId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  })
}

export async function archiveSMSConversation(conversationId: number): Promise<{ message: string }> {
  return fetchAPI(`/api/v2/sms/conversations/${conversationId}`, {
    method: 'DELETE',
  })
}

export async function getSMSStats(): Promise<{
  conversations: {
    total: number
    active: number
    unread: number
    recent_week: number
  }
  messages: {
    total: number
    inbound: number
    outbound: number
    ratio: number
  }
  user_context: {
    role: string
    user_id: number
  }
}> {
  return fetchAPI('/api/v2/sms/stats')
}

// ============================================================================
// ENHANCED PAYMENT API
// ============================================================================

export interface PaymentHistoryFilter {
  user_id?: number
  barber_id?: number
  start_date?: string
  end_date?: string
  status?: string
  page?: number
  page_size?: number
}

export interface PaymentHistoryResponse {
  payments: Payment[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface Payment {
  id: number
  amount: number
  status: string
  stripe_payment_intent_id?: string
  platform_fee: number
  barber_amount: number
  commission_rate: number
  refund_amount: number
  gift_certificate_amount_used: number
  created_at: string
  appointment?: {
    id: number
    service_name: string
    start_time: string
    duration_minutes?: number
    user?: {
      id: number
      first_name: string
      last_name: string
      email: string
      phone?: string
    }
    barber?: {
      id: number
      first_name: string
      last_name: string
      email?: string
    }
  }
}

export interface RefundCreate {
  payment_id: number
  amount: number
  reason: string
}

export interface RefundResponse {
  id: number
  payment_id: number
  amount: number
  reason: string
  status: string
  stripe_refund_id?: string
  initiated_by_id: number
  created_at: string
  processed_at?: string
}

export interface GiftCertificateCreate {
  amount: number
  purchaser_name: string
  purchaser_email: string
  recipient_name?: string
  recipient_email?: string
  message?: string
  validity_months?: number
}

export interface GiftCertificate {
  id: number
  code: string
  amount: number
  balance: number
  status: string
  purchaser_name: string
  purchaser_email: string
  recipient_name?: string
  recipient_email?: string
  message?: string
  valid_from: string
  valid_until: string
  created_at: string
  used_at?: string
}

export interface PaymentReportRequest {
  start_date: string
  end_date: string
  barber_id?: number
}

export interface PaymentReportResponse {
  period: {
    start: string
    end: string
  }
  revenue: {
    total: number
    credit_card: number
    gift_certificates_used: number
    refunds: number
    net: number
  }
  commissions: {
    platform_fees: number
    barber_payouts: number
    average_commission_rate: number
  }
  transactions: {
    total: number
    succeeded: number
    failed: number
    refunded: number
    partially_refunded: number
  }
  averages: {
    transaction_amount: number
    daily_revenue: number
    transactions_per_day: number
  }
  daily_breakdown?: Array<{
    date: string
    revenue: number
    transactions: number
    refunds: number
  }>
  barber_breakdown?: Array<{
    barber_id: number
    barber_name: string
    revenue: number
    transactions: number
    commission_earned: number
  }>
  service_breakdown?: Array<{
    service_name: string
    revenue: number
    transactions: number
  }>
}

// Payment History
export async function getPaymentHistory(filters?: PaymentHistoryFilter): Promise<PaymentHistoryResponse> {
  const params = new URLSearchParams()
  if (filters?.user_id) params.append('user_id', filters.user_id.toString())
  if (filters?.barber_id) params.append('barber_id', filters.barber_id.toString())
  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.page_size) params.append('page_size', filters.page_size.toString())
  
  const query = params.toString()
  return fetchAPI(`/api/v2/payments/history${query ? '?' + query : ''}`)
}

// Refunds
export async function createRefund(refundData: RefundCreate): Promise<RefundResponse> {
  return fetchAPI('/api/v2/payments/refund', {
    method: 'POST',
    body: JSON.stringify(refundData),
  })
}

// Gift Certificates

export async function getGiftCertificates(): Promise<GiftCertificate[]> {
  return fetchAPI('/api/v2/payments/gift-certificates')
}


export async function sendGiftCertificateEmail(certificateId: number): Promise<{ message: string }> {
  return fetchAPI(`/api/v2/payments/gift-certificates/${certificateId}/send`, {
    method: 'POST',
  })
}

// Payment Reports
export async function getPaymentReport(request: PaymentReportRequest): Promise<PaymentReportResponse> {
  return fetchAPI('/api/v2/payments/reports', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

// Stripe Connect (simple version)
export async function createStripeConnectAccountSimple(): Promise<{
  account_id: string
  onboarding_url: string
}> {
  return fetchAPI('/api/v2/payments/stripe-connect/onboard', {
    method: 'POST',
  })
}

export async function getStripeConnectStatusDetail(): Promise<{
  has_account: boolean
  account_id?: string
  charges_enabled: boolean
  payouts_enabled: boolean
  details_submitted: boolean
  requirements?: string[]
}> {
  return fetchAPI('/api/v2/payments/stripe-connect/status')
}

// Payment Receipt
export async function sendPaymentReceipt(paymentId: number): Promise<{ message: string }> {
  return fetchAPI(`/api/v2/payments/${paymentId}/receipt`, {
    method: 'POST',
  })
}

// Notification endpoints
export async function sendRefundNotification(data: {
  payment_id: number
  email: string
  amount: number
  reason: string
}): Promise<{ message: string }> {
  return fetchAPI('/api/v2/notifications/refund', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ============================================================================
// CALENDAR API
// ============================================================================

export interface CalendarConnectionStatus {
  connected: boolean
  valid?: boolean
  calendar_count?: number
  selected_calendar_id?: string
  error?: string
}

export interface GoogleCalendar {
  id: string
  summary: string
  primary: boolean
  accessRole: string
  timeZone?: string
}

export interface CalendarListResponse {
  calendars: GoogleCalendar[]
}

export interface CalendarAvailabilityRequest {
  start_time: string
  end_time: string
}

export interface CalendarAvailabilityResponse {
  available: boolean
  start_time: string
  end_time: string
}

export interface CalendarFreeBusyRequest {
  start_date: string
  end_date: string
}

export interface BusyPeriod {
  start: string
  end: string
}

export interface CalendarFreeBusyResponse {
  start_time: string
  end_time: string
  calendar_id: string
  busy_periods: BusyPeriod[]
}

export interface CalendarSyncRequest {
  start_date: string
  end_date: string
}

export interface CalendarSyncResponse {
  message: string
  results: {
    synced?: number
    failed?: number
    conflicts?: number
    errors?: string[]
    deleted?: number
  }
}

export interface CalendarSyncStatus {
  connected: boolean
  total_appointments: number
  synced_appointments: number
  unsynced_appointments: number
  sync_percentage: number
  last_sync?: string
  error?: string
}

// Calendar API endpoints
export const calendarAPI = {
  // Authentication
  initiateAuth: async (): Promise<{ authorization_url: string }> => {
    return fetchAPI('/api/calendar/auth')
  },

  // Status and connection management
  getStatus: async (): Promise<CalendarConnectionStatus> => {
    return fetchAPI('/api/calendar/status')
  },

  disconnect: async (): Promise<{ message: string }> => {
    return fetchAPI('/api/calendar/disconnect', { method: 'DELETE' })
  },

  // Calendar management
  listCalendars: async (): Promise<CalendarListResponse> => {
    return fetchAPI('/api/calendar/list')
  },

  selectCalendar: async (calendarId: string): Promise<{ message: string }> => {
    return fetchAPI('/api/calendar/select-calendar', {
      method: 'POST',
      body: JSON.stringify({ calendar_id: calendarId }),
    })
  },

  // Availability checking
  checkAvailability: async (request: CalendarAvailabilityRequest): Promise<CalendarAvailabilityResponse> => {
    const params = new URLSearchParams({
      start_time: request.start_time,
      end_time: request.end_time,
    })
    return fetchAPI(`/api/calendar/availability?${params.toString()}`)
  },

  getFreeBusy: async (request: CalendarFreeBusyRequest): Promise<CalendarFreeBusyResponse> => {
    const params = new URLSearchParams({
      start_date: request.start_date,
      end_date: request.end_date,
    })
    return fetchAPI(`/api/calendar/free-busy?${params.toString()}`)
  },

  // Sync operations
  syncAppointment: async (appointmentId: number): Promise<{ message: string; google_event_id?: string }> => {
    return fetchAPI(`/api/calendar/sync-appointment/${appointmentId}`, { method: 'POST' })
  },

  bulkSync: async (request: CalendarSyncRequest): Promise<CalendarSyncResponse> => {
    return fetchAPI('/api/calendar/bulk-sync', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  getSyncStatus: async (): Promise<CalendarSyncStatus> => {
    return fetchAPI('/api/calendar/sync-status')
  },

  // Conflict management
  checkConflicts: async (appointmentId: number): Promise<{
    appointment_id: number
    conflicts: any[]
    has_conflicts: boolean
  }> => {
    return fetchAPI(`/api/calendar/check-conflicts/${appointmentId}`, { method: 'POST' })
  },

  cleanupOrphaned: async (): Promise<{ message: string; results: any }> => {
    return fetchAPI('/api/calendar/cleanup-orphaned', { method: 'POST' })
  },

  // Validation
  validateIntegration: async (): Promise<{
    connected: boolean
    valid_credentials: boolean
    can_list_calendars: boolean
    can_create_events: boolean
    selected_calendar: GoogleCalendar | null
    errors: string[]
  }> => {
    return fetchAPI('/api/calendar/validate', { method: 'POST' })
  },
}

// Note: appointmentsAPI is defined later in the file with full functionality

// Webhook Management API
export const webhooksAPI = {
  // List webhooks
  list: async (params?: {
    is_active?: boolean
    event_type?: string
    skip?: number
    limit?: number
  }): Promise<WebhookEndpoint[]> => {
    const searchParams = new URLSearchParams()
    if (params?.is_active !== undefined) searchParams.append('is_active', params.is_active.toString())
    if (params?.event_type) searchParams.append('event_type', params.event_type)
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString())
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString())
    
    const query = searchParams.toString()
    return fetchAPI(`/api/v2/webhooks${query ? '?' + query : ''}`)
  },

  // Get webhook details
  get: async (id: string): Promise<WebhookEndpoint> => {
    return fetchAPI(`/api/v2/webhooks/${id}`)
  },

  // Create webhook
  create: async (data: {
    url: string
    name: string
    description?: string
    events: string[]
    auth_type?: 'none' | 'bearer' | 'basic' | 'hmac' | 'api_key'
    auth_config?: Record<string, any>
    headers?: Record<string, string>
    max_retries?: number
    retry_delay_seconds?: number
    timeout_seconds?: number
  }): Promise<WebhookEndpoint> => {
    return fetchAPI('/api/v2/webhooks', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Update webhook
  update: async (id: string, data: Partial<{
    url: string
    name: string
    description: string
    events: string[]
    auth_type: 'none' | 'bearer' | 'basic' | 'hmac' | 'api_key'
    auth_config: Record<string, any>
    headers: Record<string, string>
    is_active: boolean
    max_retries: number
    retry_delay_seconds: number
    timeout_seconds: number
  }>): Promise<WebhookEndpoint> => {
    return fetchAPI(`/api/v2/webhooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Delete webhook
  delete: async (id: string): Promise<void> => {
    return fetchAPI(`/api/v2/webhooks/${id}`, {
      method: 'DELETE',
    })
  },

  // Get webhook logs
  getLogs: async (id: string, params?: {
    status?: 'pending' | 'success' | 'failed' | 'retrying'
    event_type?: string
    start_date?: string
    end_date?: string
    skip?: number
    limit?: number
  }): Promise<WebhookLog[]> => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)
    if (params?.event_type) searchParams.append('event_type', params.event_type)
    if (params?.start_date) searchParams.append('start_date', params.start_date)
    if (params?.end_date) searchParams.append('end_date', params.end_date)
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString())
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString())
    
    const query = searchParams.toString()
    return fetchAPI(`/api/v2/webhooks/${id}/logs${query ? '?' + query : ''}`)
  },

  // Test webhook
  test: async (id: string, eventType: string): Promise<WebhookLog> => {
    return fetchAPI(`/api/v2/webhooks/${id}/test`, {
      method: 'POST',
      body: JSON.stringify({ event_type: eventType }),
    })
  },

  // Retry webhook delivery
  retryDelivery: async (id: string, logId: string): Promise<WebhookLog> => {
    return fetchAPI(`/api/v2/webhooks/${id}/logs/${logId}/retry`, {
      method: 'POST',
    })
  },

  // Get available events
  getEvents: async (): Promise<WebhookEvent[]> => {
    return fetchAPI('/api/v2/webhooks/events')
  },

  // Get webhook statistics
  getStats: async (): Promise<WebhookStats> => {
    return fetchAPI('/api/v2/webhooks/stats/summary')
  },
}

// Import types
export interface ImportUploadResponse {
  import_id: string
  filename: string
  source_type: string
  import_type: string
  file_size: number
  status: string
  message: string
  uploaded_at: string
}

export interface ImportStatusResponse {
  import_id: string
  filename?: string
  source_type?: string
  import_type?: string
  status: string
  progress: number
  total_records: number
  processed_records: number
  successful_imports: number
  failed_imports: number
  errors: string[]
  warnings: string[]
  uploaded_at?: string
  started_at?: string
  completed_at?: string
  estimated_completion?: string
}

export interface ImportPreviewRequest {
  field_mapping?: Record<string, string>
  max_preview_records?: number
  validation_level?: 'strict' | 'moderate' | 'lenient'
}

export interface ImportPreviewRecord {
  row_number: number
  data: Record<string, any>
  validation_status: string
  validation_messages: string[]
  is_duplicate: boolean
  suggested_action: string
}

export interface ImportValidationResult {
  total_records: number
  valid_records: number
  warning_records: number
  error_records: number
  validation_errors: string[]
  field_mapping_issues: string[]
}

export interface ImportPreviewResponse {
  import_id: string
  preview_records: ImportPreviewRecord[]
  total_records: number
  field_mapping: Record<string, string>
  validation_results: ImportValidationResult
  potential_duplicates: number
  data_quality_issues: string[]
  import_recommendations: string[]
  estimated_duration: string
}

export interface ImportExecutionRequest {
  field_mapping: Record<string, string>
  duplicate_handling?: 'skip' | 'update' | 'merge'
  validation_level?: 'strict' | 'moderate' | 'lenient'
  rollback_on_error?: boolean
  error_threshold?: number
  notify_on_completion?: boolean
  batch_size?: number
}

export interface ImportExecutionResponse {
  import_id: string
  status: string
  message: string
  started_at: string
  execution_options: Record<string, any>
}

export interface ImportRollbackRequest {
  rollback_type: 'soft_delete' | 'hard_delete' | 'deactivate'
  reason: string
  selective_criteria?: Record<string, any>
  confirm_rollback: boolean
}

export interface ImportRollbackResponse {
  import_id: string
  rollback_id: string
  status: string
  message: string
  rollback_type: string
  started_at: string
}

export interface ImportHistoryItem {
  import_id: string
  filename: string
  source_type: string
  import_type: string
  status: string
  total_records: number
  successful_imports: number
  failed_imports: number
  uploaded_at: string
  completed_at?: string
  uploaded_by: number
}

export interface ImportHistoryResponse {
  imports: ImportHistoryItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export type ImportSourceType = 'booksy' | 'square' | 'acuity' | 'mindbody' | 'csv' | 'json'
export type ImportType = 'clients' | 'appointments' | 'services' | 'barbers' | 'payments'

// Export types
export interface ExportFilters {
  date_from?: string
  date_to?: string
}

export interface ClientExportFilters extends ExportFilters {
  customer_type?: string
  preferred_barber_id?: number
  tags?: string
  min_visits?: number
  min_spent?: number
}

export interface AppointmentExportFilters extends ExportFilters {
  status?: string[]
  barber_id?: number
  service_name?: string
  min_price?: number
  max_price?: number
}

export interface CustomExportConfig {
  table: string
  fields: string[]
  filters?: Record<string, any>
  joins?: string[]
  order_by?: string
  limit?: number
}

export interface ExportResponse {
  content: string
  filename: string
  mime_type: string
  encoding?: string
  size_bytes?: number
  record_count?: number
}

export interface ExportProgress {
  export_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress_percent: number
  message?: string
  created_at: string
  completed_at?: string
  download_url?: string
}

export interface ExportFormat {
  name: string
  display_name: string
  description: string
  mime_type: string
  supports_charts: boolean
  max_records: number
}

export interface ExportFormatsResponse {
  formats: ExportFormat[]
  max_export_records: number
}

// Import API
export const importsAPI = {
  // Upload file for import
  upload: async (
    file: File,
    sourceType: ImportSourceType,
    importType: ImportType,
    onProgress?: (progress: number) => void
  ): Promise<ImportUploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const params = new URLSearchParams({
      source_type: sourceType,
      import_type: importType,
    })
    
    // If progress tracking is needed, use XMLHttpRequest
    if (onProgress) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100
            onProgress(progress)
          }
        })
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText)
              resolve(response)
            } catch (e) {
              reject(new Error('Failed to parse response'))
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        })
        
        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'))
        })
        
        xhr.open('POST', `${API_URL}/imports/upload?${params.toString()}`)
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        }
        xhr.send(formData)
      })
    }
    
    // Otherwise use standard fetch
    return fetchAPI(`/imports/upload?${params.toString()}`, {
      method: 'POST',
      body: formData,
    })
  },

  // Get import status
  getStatus: async (importId: string): Promise<ImportStatusResponse> => {
    return fetchAPI(`/imports/${importId}/status`)
  },

  // Preview import data
  preview: async (
    importId: string,
    request: ImportPreviewRequest
  ): Promise<ImportPreviewResponse> => {
    return fetchAPI(`/imports/${importId}/preview`, {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  // Execute import
  execute: async (
    importId: string,
    request: ImportExecutionRequest
  ): Promise<ImportExecutionResponse> => {
    return fetchAPI(`/imports/${importId}/execute`, {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  // Rollback import
  rollback: async (
    importId: string,
    request: ImportRollbackRequest
  ): Promise<ImportRollbackResponse> => {
    return fetchAPI(`/imports/${importId}/rollback`, {
      method: 'DELETE',
      body: JSON.stringify(request),
    })
  },

  // Get import history
  getHistory: async (params?: {
    page?: number
    page_size?: number
    status_filter?: string
    import_type_filter?: string
    date_from?: string
    date_to?: string
  }): Promise<ImportHistoryResponse> => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.page_size) searchParams.append('page_size', params.page_size.toString())
    if (params?.status_filter) searchParams.append('status_filter', params.status_filter)
    if (params?.import_type_filter) searchParams.append('import_type_filter', params.import_type_filter)
    if (params?.date_from) searchParams.append('date_from', params.date_from)
    if (params?.date_to) searchParams.append('date_to', params.date_to)
    
    const query = searchParams.toString()
    return fetchAPI(`/imports/history${query ? '?' + query : ''}`)
  },
}

// Export API
export const exportsAPI = {
  // Export clients
  exportClients: async (params?: {
    format?: 'csv' | 'excel' | 'json' | 'pdf'
    include_pii?: boolean
    filters?: ClientExportFilters
  }): Promise<ExportResponse> => {
    const searchParams = new URLSearchParams()
    if (params?.format) searchParams.append('format', params.format)
    if (params?.include_pii !== undefined) searchParams.append('include_pii', params.include_pii.toString())
    
    // Add filter parameters
    if (params?.filters) {
      if (params.filters.date_from) searchParams.append('date_from', params.filters.date_from)
      if (params.filters.date_to) searchParams.append('date_to', params.filters.date_to)
      if (params.filters.customer_type) searchParams.append('customer_type', params.filters.customer_type)
      if (params.filters.preferred_barber_id) searchParams.append('preferred_barber_id', params.filters.preferred_barber_id.toString())
      if (params.filters.tags) searchParams.append('tags', params.filters.tags)
      if (params.filters.min_visits !== undefined) searchParams.append('min_visits', params.filters.min_visits.toString())
      if (params.filters.min_spent !== undefined) searchParams.append('min_spent', params.filters.min_spent.toString())
    }
    
    const query = searchParams.toString()
    return fetchAPI(`/exports/clients${query ? '?' + query : ''}`)
  },

  // Export appointments
  exportAppointments: async (params?: {
    format?: 'csv' | 'excel' | 'json' | 'pdf'
    include_details?: boolean
    filters?: AppointmentExportFilters
  }): Promise<ExportResponse> => {
    const searchParams = new URLSearchParams()
    if (params?.format) searchParams.append('format', params.format)
    if (params?.include_details !== undefined) searchParams.append('include_details', params.include_details.toString())
    
    // Add filter parameters
    if (params?.filters) {
      if (params.filters.date_from) searchParams.append('date_from', params.filters.date_from)
      if (params.filters.date_to) searchParams.append('date_to', params.filters.date_to)
      if (params.filters.status) {
        params.filters.status.forEach(status => searchParams.append('status', status))
      }
      if (params.filters.barber_id) searchParams.append('barber_id', params.filters.barber_id.toString())
      if (params.filters.service_name) searchParams.append('service_name', params.filters.service_name)
      if (params.filters.min_price !== undefined) searchParams.append('min_price', params.filters.min_price.toString())
      if (params.filters.max_price !== undefined) searchParams.append('max_price', params.filters.max_price.toString())
    }
    
    const query = searchParams.toString()
    return fetchAPI(`/exports/appointments${query ? '?' + query : ''}`)
  },

  // Export analytics
  exportAnalytics: async (params?: {
    format?: 'excel' | 'json' | 'pdf'
    include_charts?: boolean
    date_from?: string
    date_to?: string
  }): Promise<ExportResponse> => {
    const searchParams = new URLSearchParams()
    if (params?.format) searchParams.append('format', params.format)
    if (params?.include_charts !== undefined) searchParams.append('include_charts', params.include_charts.toString())
    if (params?.date_from) searchParams.append('date_from', params.date_from)
    if (params?.date_to) searchParams.append('date_to', params.date_to)
    
    const query = searchParams.toString()
    return fetchAPI(`/exports/analytics${query ? '?' + query : ''}`)
  },

  // Custom export
  customExport: async (
    config: CustomExportConfig,
    format?: 'csv' | 'excel' | 'json'
  ): Promise<ExportResponse> => {
    const searchParams = new URLSearchParams()
    if (format) searchParams.append('format', format)
    
    const query = searchParams.toString()
    return fetchAPI(`/exports/custom${query ? '?' + query : ''}`, {
      method: 'POST',
      body: JSON.stringify(config),
    })
  },

  // Download export
  downloadExport: async (exportId: string): Promise<ExportProgress> => {
    return fetchAPI(`/exports/download/${exportId}`)
  },

  // Get export progress
  getProgress: async (exportId: string): Promise<ExportProgress> => {
    return fetchAPI(`/exports/progress/${exportId}`)
  },

  // Get supported formats
  getFormats: async (): Promise<ExportFormatsResponse> => {
    return fetchAPI('/exports/formats')
  },

  // Clear export cache (admin only)
  clearCache: async (): Promise<{ message: string }> => {
    return fetchAPI('/exports/cache', {
      method: 'DELETE',
    })
  },

  // Helper to download export as file
  downloadAsFile: (exportResponse: ExportResponse) => {
    // Decode base64 content
    const byteCharacters = atob(exportResponse.content)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    
    // Create blob and download
    const blob = new Blob([byteArray], { type: exportResponse.mime_type })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exportResponse.filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  },
}

// Export utility functions that are imported by other modules
export { fetchAPI, API_URL }

// Export aliases for naming consistency
export { sendTestSms as sendTestSMS }

// Add missing functions that are imported by components
export async function getUsers(): Promise<User[]> {
  return fetchAPI('/api/v2/users')
}

// ================================================================================
// STANDARDIZED APPOINTMENT API - Consistent terminology matching database model
// ================================================================================

// Appointment types (standardized to match backend schemas)
export interface AppointmentCreate {
  date: string        // YYYY-MM-DD format
  time: string        // HH:MM format  
  service: string
  notes?: string
  barber_id?: number
}

export interface QuickAppointmentCreate {
  service: string
  notes?: string
}

export interface EnhancedAppointmentCreate {
  service_id?: number
  service_name?: string
  barber_id?: number
  client_id?: number
  appointment_date: string    // YYYY-MM-DD format
  appointment_time: string    // HH:MM format
  duration_minutes?: number
  price?: number
  notes?: string
  buffer_time_before?: number
  buffer_time_after?: number
  timezone?: string
}

export interface AppointmentResponse {
  id: number
  user_id: number
  barber_id?: number
  client_id?: number
  service_id?: number
  service_name: string
  start_time: string
  duration_minutes: number
  price: number
  status: string
  notes?: string
  recurring_pattern_id?: number
  google_event_id?: string
  created_at: string
}

export interface AppointmentListResponse {
  appointments: AppointmentResponse[]
  total: number
}

export interface AppointmentUpdate {
  date?: string
  time?: string
  service?: string
  notes?: string
  status?: string
}

export interface AppointmentReschedule {
  date: string
  time: string
}

// Standardized Appointment API Functions
export const appointmentsAPI = {
  // Get available appointment slots
  async getAvailableSlots(appointmentDate: string, timezone?: string): Promise<any> {
    const params = new URLSearchParams({ appointment_date: appointmentDate })
    if (timezone) params.append('timezone', timezone)
    return fetchAPI(`/api/v2/appointments/slots?${params}`)
  },

  // Create new appointment
  async create(appointmentData: AppointmentCreate): Promise<AppointmentResponse> {
    return fetchAPI('/api/v2/appointments/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointmentData)
    })
  },

  // Create quick appointment (next available slot)
  async createQuick(quickData: QuickAppointmentCreate): Promise<AppointmentResponse> {
    return fetchAPI('/api/v2/appointments/quick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quickData)
    })
  },

  // Create enhanced appointment with full options (admin/staff only)
  async createEnhanced(enhancedData: EnhancedAppointmentCreate): Promise<AppointmentResponse> {
    return fetchAPI('/api/v2/appointments/enhanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enhancedData)
    })
  },

  // Get user's appointments
  async list(skip = 0, limit = 100, status?: string): Promise<AppointmentListResponse> {
    const params = new URLSearchParams({ 
      skip: skip.toString(), 
      limit: limit.toString() 
    })
    if (status) params.append('status', status)
    return fetchAPI(`/api/v2/appointments?${params}`)
  },

  // Get specific appointment
  async get(appointmentId: number): Promise<AppointmentResponse> {
    return fetchAPI(`/api/v2/appointments/${appointmentId}`)
  },

  // Update appointment
  async update(appointmentId: number, updateData: AppointmentUpdate): Promise<AppointmentResponse> {
    return fetchAPI(`/api/v2/appointments/${appointmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    })
  },

  // Reschedule appointment
  async reschedule(appointmentId: number, rescheduleData: AppointmentReschedule): Promise<AppointmentResponse> {
    return fetchAPI(`/api/v2/appointments/${appointmentId}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rescheduleData)
    })
  },

  // Cancel appointment
  async cancel(appointmentId: number): Promise<{ message: string }> {
    return fetchAPI(`/api/v2/appointments/${appointmentId}`, {
      method: 'DELETE'
    })
  },

  // Admin/Staff functions
  async listAll(skip = 0, limit = 100, filters?: {
    status?: string
    date_from?: string
    date_to?: string
    barber_id?: number
  }): Promise<AppointmentListResponse> {
    const params = new URLSearchParams({ 
      skip: skip.toString(), 
      limit: limit.toString() 
    })
    if (filters?.status) params.append('status', filters.status)
    if (filters?.date_from) params.append('date_from', filters.date_from)
    if (filters?.date_to) params.append('date_to', filters.date_to)
    if (filters?.barber_id) params.append('barber_id', filters.barber_id.toString())
    
    return fetchAPI(`/api/v2/appointments/all/list?${params}`)
  }
}

// ================================================================================
// LEGACY BOOKING API - Deprecated aliases for backward compatibility
// ================================================================================

// Legacy booking functions that now use appointment endpoints
// TODO: Update components to use appointmentsAPI instead of these functions

// createBooking function is defined earlier in the file with full retry logic

// quickBooking function is defined earlier in the file with full retry logic

// getMyBookings function is defined earlier in the file

// cancelBooking function is defined earlier in the file

// updateBooking function is defined earlier in the file

// rescheduleBooking function is defined earlier in the file

// ============================================================================
// GUEST BOOKING API (No Authentication Required)
// ============================================================================

export interface GuestInformation {
  first_name: string
  last_name: string
  email: string
  phone: string
}

export interface GuestBookingCreate {
  date: string // YYYY-MM-DD format
  time: string // HH:MM format
  service: string
  notes?: string
  guest_info: GuestInformation
  timezone?: string
}

export interface GuestQuickBookingCreate {
  service: string
  guest_info: GuestInformation
}

export interface GuestBookingResponse {
  id: number
  service: string
  date: string
  time: string
  guest_name: string
  guest_email: string
  guest_phone: string
  amount: number
  status: string
  created_at: string
  confirmation_code?: string
}

// Create a booking for a guest user (no authentication required)
export async function createGuestBooking(bookingData: GuestBookingCreate): Promise<GuestBookingResponse> {
  // Use retryOperation with fetchAPI for consistent error handling and retry logic
  const result = await retryOperation(
    () => fetchAPI('/api/v2/appointments/guest', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    }),
    defaultRetryConfigs.normal, // Normal retry config for guest bookings
    (error) => {
      // Don't retry validation errors (422) or auth errors (401/403)
      const shouldRetry = !error.message?.includes('422') && 
                         !error.message?.includes('401') && 
                         !error.message?.includes('403')
      console.log(`Guest booking error retry decision: ${shouldRetry}`, error.message)
      return shouldRetry
    }
  )
  
  return result
}

// Create a quick booking for guest user (next available slot)
export async function createGuestQuickBooking(bookingData: GuestQuickBookingCreate): Promise<GuestBookingResponse> {
  // Use retryOperation with fetchAPI for consistent error handling and retry logic
  const result = await retryOperation(
    () => fetchAPI('/api/v2/appointments/guest/quick', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    }),
    defaultRetryConfigs.critical, // Critical retry config for quick bookings
    (error) => {
      // Don't retry validation errors (422) or auth errors (401/403)
      const shouldRetry = !error.message?.includes('422') && 
                         !error.message?.includes('401') && 
                         !error.message?.includes('403')
      console.log(`Guest quick booking error retry decision: ${shouldRetry}`, error.message)
      return shouldRetry
    }
  )
  
  return result
}

// ============================================================================
// SMS AND MESSAGING API
// ============================================================================

export async function markSMSMessagesAsRead(conversationId: string): Promise<{ message: string }> {
  return fetchAPI(`/api/v2/sms/conversations/${conversationId}/mark-read`, {
    method: 'POST',
  })
}



// ============================================================================
// PERFORMANCE ANALYTICS API
// ============================================================================

export async function getPerformanceAnalytics(params?: {
  start_date?: string
  end_date?: string
  barber_id?: number
  location_id?: number
}): Promise<any> {
  const searchParams = new URLSearchParams()
  if (params?.start_date) searchParams.append('start_date', params.start_date)
  if (params?.end_date) searchParams.append('end_date', params.end_date)
  if (params?.barber_id) searchParams.append('barber_id', params.barber_id.toString())
  if (params?.location_id) searchParams.append('location_id', params.location_id.toString())
  
  const query = searchParams.toString()
  return fetchAPI(`/api/v2/analytics/performance${query ? '?' + query : ''}`)
}

// Location Management API
export async function getLocations(): Promise<Location[]> {
  try {
    return await fetchAPI('/api/v2/locations')
  } catch (error) {
    // If API is not yet implemented, return mock data for development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Locations API not available, using mock data')
      return [
        {
          id: '1',
          name: 'Downtown Location',
          address: '123 Main St',
          city: 'Seattle',
          state: 'WA',
          zipCode: '98101',
          phoneNumber: '(206) 555-0123',
          email: 'downtown@bookedbarber.com',
          isActive: true,
          stats: {
            activeBarbers: 5,
            todayBookings: 23,
            weekRevenue: 8500,
            occupancyRate: 85
          },
          enterpriseId: 'ent_1',
          enterpriseName: 'BookedBarber Enterprise'
        },
        {
          id: '2',
          name: 'Uptown Location',
          address: '456 Pine Ave',
          city: 'Seattle',
          state: 'WA',
          zipCode: '98109',
          phoneNumber: '(206) 555-0456',
          email: 'uptown@bookedbarber.com',
          isActive: true,
          stats: {
            activeBarbers: 3,
            todayBookings: 18,
            weekRevenue: 5200,
            occupancyRate: 72
          },
          enterpriseId: 'ent_1',
          enterpriseName: 'BookedBarber Enterprise'
        },
        {
          id: '3',
          name: 'Westside Location',
          address: '789 Oak Blvd',
          city: 'Seattle',
          state: 'WA',
          zipCode: '98115',
          phoneNumber: '(206) 555-0789',
          email: 'westside@bookedbarber.com',
          isActive: true,
          stats: {
            activeBarbers: 4,
            todayBookings: 15,
            weekRevenue: 4100,
            occupancyRate: 68
          },
          enterpriseId: 'ent_1',
          enterpriseName: 'BookedBarber Enterprise'
        }
      ]
    }
    throw error
  }
}

// Import the Location type at the top of the file
export interface Location {
  id: string
  name: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  phoneNumber?: string
  email?: string
  isActive: boolean
  stats?: {
    activeBarbers?: number
    todayBookings?: number
    weekRevenue?: number
    occupancyRate?: number
  }
  enterpriseId?: string
  enterpriseName?: string
}

// ============================================================================
// AI AGENT SYSTEM API
// ============================================================================

export interface AgentTemplate {
  agent_type: string
  name: string
  description: string
  default_config: any
  prompt_templates: any
  tone_settings: any
}

export interface AgentInstanceCreate {
  agent_id: number
  name: string
  config: any
}

export interface AgentInstanceUpdate {
  name?: string
  config?: any
  status?: 'draft' | 'active' | 'paused' | 'inactive' | 'error'
}

export interface AgentInstance {
  id: number
  name: string
  agent_id: number
  status: 'draft' | 'active' | 'paused' | 'inactive' | 'error'
  total_conversations: number
  successful_conversations: number
  total_revenue_generated: number
  last_run_at: string | null
  next_run_at: string | null
  agent: {
    name: string
    agent_type: string
    description: string
  }
}

export interface AgentConversation {
  id: string
  agent_instance_id: number
  client_id: number
  status: 'pending' | 'in_progress' | 'waiting_response' | 'completed' | 'failed' | 'opted_out'
  channel: string
  conversation_data: any
  goal_achieved: boolean
  revenue_generated: number
  token_cost: number
  total_tokens_used: number
  created_at: string
  updated_at: string
}

export interface AgentSubscription {
  id: number
  user_id: number
  tier: string
  status: string
  conversations_used: number
  conversation_limit: number | null
  agents_used: number
  agent_limit: number
  trial_ends_at?: string
  billing_cycle_start: string
  billing_cycle_end: string
  created_at: string
  updated_at: string
}

export interface AgentAnalytics {
  total_agents: number
  active_agents: number
  total_conversations: number
  successful_conversations: number
  total_revenue_generated: number
  total_cost: number
  roi: number
  success_rate: number
  top_performing_agents: Array<{
    id: number
    name: string
    success_rate: number
    revenue_generated: number
  }>
}

export interface AIProvider {
  name: string
  status: 'available' | 'unavailable'
  config?: any
}

// Agent Templates API
export async function getAgentTemplates(): Promise<AgentTemplate[]> {
  try {
    return await fetchAPI('/api/v2/agents/templates')
  } catch (error) {
    // Return mock data for development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Agent templates API not available, using mock data')
      return [
        {
          agent_type: 'rebooking',
          name: 'Rebooking Agent',
          description: 'Automatically reach out to clients for their next appointment',
          default_config: {
            rebooking_intervals: { default: 28 },
            max_conversations_per_run: 50,
            supported_channels: ['sms', 'email'],
            message_timing: { avoid_weekends: true }
          },
          prompt_templates: {},
          tone_settings: {}
        },
        {
          agent_type: 'birthday_wishes',
          name: 'Birthday Wishes Agent',
          description: 'Send personalized birthday messages with special offers',
          default_config: {
            birthday_discount: 20,
            discount_validity_days: 30,
            max_conversations_per_run: 25,
            supported_channels: ['sms', 'email']
          },
          prompt_templates: {},
          tone_settings: {}
        },
        {
          agent_type: 'no_show_fee',
          name: 'No-Show Fee Collection',
          description: 'Handle no-show fee collection professionally',
          default_config: {
            max_conversations_per_run: 20,
            supported_channels: ['sms', 'email']
          },
          prompt_templates: {},
          tone_settings: {}
        }
      ]
    }
    throw error
  }
}

export async function getAgentTemplate(agentType: string): Promise<AgentTemplate> {
  try {
    return await fetchAPI(`/api/v2/agents/templates/${agentType}`)
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      const templates = await getAgentTemplates()
      const template = templates.find(t => t.agent_type === agentType)
      if (template) return template
    }
    throw error
  }
}

// Agent Instances API
export async function createAgentInstance(instance: AgentInstanceCreate): Promise<AgentInstance> {
  return fetchAPI('/api/v2/agents/instances', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(instance)
  })
}

export async function getAgentInstances(status?: string): Promise<AgentInstance[]> {
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  
  try {
    return await fetchAPI(`/api/v2/agents/instances${params.toString() ? '?' + params.toString() : ''}`)
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Agent instances API not available, using mock data')
      return [
        {
          id: 1,
          name: 'My Rebooking Agent',
          agent_id: 1,
          status: 'active',
          total_conversations: 45,
          successful_conversations: 38,
          total_revenue_generated: 2850,
          last_run_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          next_run_at: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
          agent: {
            name: 'Rebooking Agent',
            agent_type: 'rebooking',
            description: 'Automatically reach out to clients for their next appointment'
          }
        },
        {
          id: 2,
          name: 'Birthday Special Agent',
          agent_id: 2,
          status: 'paused',
          total_conversations: 12,
          successful_conversations: 8,
          total_revenue_generated: 960,
          last_run_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          next_run_at: null,
          agent: {
            name: 'Birthday Wishes Agent',
            agent_type: 'birthday_wishes',
            description: 'Send personalized birthday messages with special offers'
          }
        }
      ]
    }
    throw error
  }
}

export async function getAgentInstance(instanceId: number): Promise<AgentInstance> {
  return fetchAPI(`/api/v2/agents/instances/${instanceId}`)
}

export async function updateAgentInstance(instanceId: number, update: AgentInstanceUpdate): Promise<AgentInstance> {
  return fetchAPI(`/api/v2/agents/instances/${instanceId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update)
  })
}

export async function activateAgentInstance(instanceId: number): Promise<AgentInstance> {
  return fetchAPI(`/api/v2/agents/instances/${instanceId}/activate`, {
    method: 'POST'
  })
}

export async function pauseAgentInstance(instanceId: number): Promise<AgentInstance> {
  return fetchAPI(`/api/v2/agents/instances/${instanceId}/pause`, {
    method: 'POST'
  })
}

export async function deleteAgentInstance(instanceId: number): Promise<{ message: string }> {
  return fetchAPI(`/api/v2/agents/instances/${instanceId}`, {
    method: 'DELETE'
  })
}

// Agent Conversations API
export async function getAgentConversations(params?: {
  instance_id?: number
  status?: string
  limit?: number
  offset?: number
}): Promise<AgentConversation[]> {
  const searchParams = new URLSearchParams()
  if (params?.instance_id) searchParams.append('instance_id', params.instance_id.toString())
  if (params?.status) searchParams.append('status', params.status)
  if (params?.limit) searchParams.append('limit', params.limit.toString())
  if (params?.offset) searchParams.append('offset', params.offset.toString())

  return fetchAPI(`/api/v2/agents/conversations${searchParams.toString() ? '?' + searchParams.toString() : ''}`)
}

export async function getAgentConversation(conversationId: string): Promise<AgentConversation> {
  return fetchAPI(`/api/v2/agents/conversations/${conversationId}`)
}

// Agent Analytics API
export async function getAgentAnalytics(params?: {
  start_date?: string
  end_date?: string
}): Promise<AgentAnalytics> {
  const searchParams = new URLSearchParams()
  if (params?.start_date) searchParams.append('start_date', params.start_date)
  if (params?.end_date) searchParams.append('end_date', params.end_date)

  try {
    return await fetchAPI(`/api/v2/agents/analytics${searchParams.toString() ? '?' + searchParams.toString() : ''}`)
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Agent analytics API not available, using mock data')
      return {
        total_agents: 2,
        active_agents: 1,
        total_conversations: 57,
        successful_conversations: 46,
        total_revenue_generated: 3810,
        total_cost: 45.25,
        roi: 8325,
        success_rate: 80.7,
        top_performing_agents: [
          { id: 1, name: 'My Rebooking Agent', success_rate: 84.4, revenue_generated: 2850 },
          { id: 2, name: 'Birthday Special Agent', success_rate: 66.7, revenue_generated: 960 }
        ]
      }
    }
    throw error
  }
}

export async function getAgentInstanceAnalytics(instanceId: number, params?: {
  start_date?: string
  end_date?: string
}): Promise<any> {
  const searchParams = new URLSearchParams()
  if (params?.start_date) searchParams.append('start_date', params.start_date)
  if (params?.end_date) searchParams.append('end_date', params.end_date)

  return fetchAPI(`/api/v2/agents/instances/${instanceId}/analytics${searchParams.toString() ? '?' + searchParams.toString() : ''}`)
}

// Agent Subscription API
export async function getAgentSubscription(): Promise<AgentSubscription> {
  try {
    return await fetchAPI('/api/v2/agents/subscription')
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Agent subscription API not available, using mock data')
      return {
        id: 1,
        user_id: 1,
        tier: 'trial',
        status: 'active',
        conversations_used: 57,
        conversation_limit: 100,
        agents_used: 2,
        agent_limit: 3,
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        billing_cycle_start: new Date().toISOString(),
        billing_cycle_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }
    }
    throw error
  }
}

export async function createAgentSubscription(subscription: {
  tier: string
  billing_cycle?: string
}): Promise<AgentSubscription> {
  return fetchAPI('/api/v2/agents/subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription)
  })
}

// AI Providers API
export async function getAIProviders(): Promise<{ 
  available_providers: string[]
  provider_info: Record<string, any>
  validation_status: Record<string, boolean>
}> {
  try {
    return await fetchAPI('/api/v2/agents/providers')
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('AI providers API not available, using mock data')
      return {
        available_providers: ['anthropic', 'openai', 'google', 'mock'],
        provider_info: {
          anthropic: { name: 'Claude (Anthropic)', status: 'available' },
          openai: { name: 'GPT-4 (OpenAI)', status: 'available' },
          google: { name: 'Gemini (Google)', status: 'available' },
          mock: { name: 'Mock Provider (Development)', status: 'available' }
        },
        validation_status: {
          anthropic: false,
          openai: false,
          google: false,
          mock: true
        }
      }
    }
    throw error
  }
}

export async function estimateAgentCost(request: {
  messages: any[]
  provider?: string
  max_tokens?: number
}): Promise<{ estimated_costs: Record<string, number> }> {
  return fetchAPI('/api/v2/agents/providers/estimate-cost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
}

// Customer Tracking Pixels API
export interface TrackingPixel {
  gtm_container_id?: string
  ga4_measurement_id?: string
  meta_pixel_id?: string
  google_ads_conversion_id?: string
  google_ads_conversion_label?: string
  tracking_enabled: boolean
  custom_tracking_code?: string
}

export interface TrackingTestResult {
  pixel_type: string
  is_valid: boolean
  is_active: boolean
  message: string
  details?: Record<string, any>
}

export interface PixelInstructions {
  name: string
  steps: string[]
  format: string
  example: string
  help_url?: string
}

// Get current organization's tracking pixels
export async function getCustomerPixels(): Promise<TrackingPixel> {
  return fetchAPI('/api/v2/customer-pixels/')
}

// Update tracking pixels
export async function updateCustomerPixels(pixelData: Partial<TrackingPixel>): Promise<TrackingPixel> {
  return fetchAPI('/api/v2/customer-pixels/', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pixelData)
  })
}

// Remove a specific tracking pixel
export async function removeCustomerPixel(pixelType: 'gtm' | 'ga4' | 'meta' | 'google_ads'): Promise<{ message: string }> {
  return fetchAPI(`/api/v2/customer-pixels/${pixelType}`, {
    method: 'DELETE'
  })
}

// Test tracking pixels
export async function testCustomerPixels(): Promise<TrackingTestResult[]> {
  return fetchAPI('/api/v2/customer-pixels/test', {
    method: 'POST'
  })
}

// Get setup instructions for a pixel type
export async function getPixelInstructions(pixelType: 'gtm' | 'ga4' | 'meta' | 'google_ads'): Promise<PixelInstructions> {
  return fetchAPI(`/api/v2/customer-pixels/instructions?pixel_type=${pixelType}`, {
    method: 'POST'
  })
}

// Public endpoint - Get tracking pixels for a booking page (no auth required)
export async function getPublicTrackingPixels(organizationSlug: string): Promise<TrackingPixel> {
  return fetchAPI(`/api/v2/customer-pixels/public/${organizationSlug}`, {}, false)
}

// Client Tiers API Types
export interface TierDashboardMetrics {
  total_clients: number
  tier_distribution: {
    bronze: number
    silver: number
    gold: number
    platinum: number
  }
  revenue_by_tier: {
    bronze: number
    silver: number
    gold: number
    platinum: number
  }
  tier_trends: {
    month: string
    bronze: number
    silver: number
    gold: number
    platinum: number
  }[]
}

export interface ClientTierAnalysis {
  client_id: number
  current_tier: string
  recommended_tier: string
  total_revenue: number
  visit_frequency: number
  last_visit: string
}

export interface BulkTierAnalysisResult {
  total_processed: number
  updated_count: number
  errors: string[]
  tier_changes: {
    client_id: number
    old_tier: string
    new_tier: string
  }[]
}

// Client Tiers API Functions - Updated to use new V2 endpoints
export async function getTierDashboardMetrics(): Promise<TierDashboardMetrics> {
  return fetchAPI('/api/v1/client-tiers/')
}

export async function getClientTierAnalysis(clientId: number): Promise<ClientTierAnalysis> {
  return fetchAPI(`/api/v1/client-tiers/client/${clientId}`)
}

export async function updateClientTier(clientId: number): Promise<any> {
  // This would be used to manually recalculate a single client's tier
  return fetchAPI(`/api/v1/client-tiers/calculate-bulk`, {
    method: 'POST',
    body: JSON.stringify({ client_ids: [clientId] })
  })
}

export async function bulkCalculateClientTiers(clientIds?: number[]): Promise<BulkTierAnalysisResult> {
  const body = clientIds ? { client_ids: clientIds } : {}
  return fetchAPI('/api/v1/client-tiers/calculate-bulk', {
    method: 'POST',
    body: JSON.stringify(body)
  })
}

export async function getRevenueOptimizationAnalytics(): Promise<any> {
  return fetchAPI('/api/v1/client-tiers/analytics/revenue-optimization')
}

// AI Agents API Functions
export async function toggleAgentStatus(agentId: string, status: 'active' | 'paused'): Promise<void> {
  await fetchAPI(`/api/v2/ai-agents/${agentId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  })
}

// Export API client objects for backwards compatibility
export const api = {
  login,
  logout,
  registerComplete,
  registerClient,
  getTrialStatus,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail,
  resendVerification,
  getVerificationStatus,
  refreshToken,
  getProfile,
  getAppointments,
  createAppointment,
  getAvailableSlots,
  getNextAvailableSlot,
  getBookingSettings,
  updateBookingSettings,
  createBooking
}

export const apiClient = {
  // Core API functions
  fetchAPI,
  login,
  logout,
  getProfile,
  getAppointments,
  createAppointment,
  // Booking functions
  getAvailableSlots,
  getBookingSettings,
  updateBookingSettings,
  createBooking,
  // Auth functions
  forgotPassword,
  resetPassword,
  verifyEmail,
  refreshToken
}


