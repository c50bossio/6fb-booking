/**
 * Base API client configuration
 */
import axios from 'axios'
import { smartStorage } from '../utils/storage'
import { getApiBaseUrl, initializeCors } from './corsHelper'

// Initialize CORS checking
if (typeof window !== 'undefined') {
  initializeCors()
}

// Get dynamic API URL based on CORS status
const getBaseURL = () => {
  const url = getApiBaseUrl()
  if (process.env.NODE_ENV === 'development') {
    console.log('Using API URL:', url)
  }
  return url
}

// Log API configuration in development
if (process.env.NODE_ENV === 'development') {
  console.log('API Configuration:', {
    baseURL: getBaseURL(),
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development'
  })
}

// Create axios instance with dynamic base URL
const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token and logging
apiClient.interceptors.request.use(
  (config) => {
    try {
      // Set dynamic base URL
      config.baseURL = getBaseURL()

      // Use safe storage to get token
      const token = smartStorage.getItem('access_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      // Add request ID for debugging
      config.headers['X-Request-ID'] = Date.now().toString()

      // Log outgoing requests in development
      if (process.env.NODE_ENV === 'development') {
        console.log('API Request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
          hasAuth: !!token,
          timestamp: new Date().toISOString()
        })
      }
    } catch (e) {
      // Handle any unexpected errors
      console.warn('Error in request interceptor:', e)
    }
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling and retry logic
apiClient.interceptors.response.use(
  (response) => {
    // Log successful requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log('API Success:', response.config.method?.toUpperCase(), response.config.url, response.status)
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Log error details with better context
    const errorInfo = {
      url: originalRequest?.url,
      method: originalRequest?.method?.toUpperCase(),
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.response?.data?.message || error.message,
      details: error.response?.data?.detail || null,
      timestamp: new Date().toISOString(),
      isNetworkError: !error.response
    }

    console.error('API Error:', errorInfo)

    // Enhanced error classification
    error.isNetworkError = !error.response
    error.isServerError = error.response?.status >= 500
    error.isClientError = error.response?.status >= 400 && error.response?.status < 500
    error.isAuthError = error.response?.status === 401
    error.isPermissionError = error.response?.status === 403
    error.isValidationError = error.response?.status === 422

    // Handle 429 Too Many Requests
    if (error.response?.status === 429) {
      console.warn('Rate limit exceeded. Waiting before retry...')

      // Get retry-after header if available
      const retryAfter = error.response.headers['retry-after']
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000 // Default 5 seconds

      // Only retry once to avoid infinite loops
      if (!originalRequest._retry) {
        originalRequest._retry = true

        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, delay))
        return apiClient(originalRequest)
      }
    }

    // Handle 401 Unauthorized - enhanced auth error handling
    if (error.response?.status === 401) {
      // Clear stored tokens
      smartStorage.removeItem('access_token')
      smartStorage.removeItem('user')
      smartStorage.removeItem('csrf_token')

      // Check if we're in demo mode or should enable it
      const isDemoMode = sessionStorage.getItem('demo_mode') === 'true' ||
                        window.location.pathname.includes('/app/') ||
                        window.location.search.includes('demo=true')

      // Only redirect if not already on login/auth pages and not in demo mode
      const currentPath = window.location.pathname
      const authPaths = ['/login', '/signup', '/reset-password', '/demo']
      const isPublicPath = authPaths.some(path => currentPath.includes(path)) ||
                          currentPath === '/' ||
                          currentPath.startsWith('/book')

      if (!isPublicPath && !isDemoMode) {
        // Store current location for redirect after login
        smartStorage.setItem('redirect_after_login', currentPath)

        // Emit custom event for auth error handling
        window.dispatchEvent(new CustomEvent('auth-error', {
          detail: {
            type: 'unauthorized',
            message: 'Your session has expired. Please log in again.',
            shouldRedirect: true
          }
        }))

        // Give components a chance to handle the event before redirecting
        setTimeout(() => {
          if (!sessionStorage.getItem('demo_mode')) {
            window.location.href = '/login'
          }
        }, 100)
      }
      return Promise.reject(error)
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error('Access forbidden - insufficient permissions')
      return Promise.reject(error)
    }

    // Handle 404 Not Found - don't retry
    if (error.response?.status === 404) {
      return Promise.reject(error)
    }

    // Handle 422 Validation Error - don't retry
    if (error.response?.status === 422) {
      return Promise.reject(error)
    }

    // Implement retry logic for network failures with backend detection
    if (!error.response && !originalRequest._retry) {
      originalRequest._retry = true

      // Check if this is a connection refused error (backend not running)
      const isBackendDown = error.code === 'ECONNREFUSED' ||
                           error.message?.includes('ERR_CONNECTION_REFUSED') ||
                           error.message?.includes('Network Error') ||
                           error.message?.includes('fetch')

      if (isBackendDown) {
        // Emit event to switch to demo mode
        window.dispatchEvent(new CustomEvent('backend-unavailable', {
          detail: {
            message: 'Backend service is unavailable. Switching to demo mode.',
            enableDemoMode: true
          }
        }))

        // Set demo mode
        sessionStorage.setItem('demo_mode', 'true')
        sessionStorage.setItem('backend_unavailable_reason', 'connection_failed')

        // Don't retry if backend is down
        return Promise.reject(error)
      }

      // Wait with exponential backoff for other network errors
      const delay = Math.min(1000 * Math.pow(2, originalRequest._retryCount || 0), 5000)
      await new Promise(resolve => setTimeout(resolve, delay))

      if (process.env.NODE_ENV === 'development') {
        console.log(`Retrying network failure (attempt ${(originalRequest._retryCount || 0) + 1}):`, originalRequest.url)
      }

      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1
      return apiClient(originalRequest)
    }

    // Handle 500+ server errors with limited retry
    if (error.response?.status >= 500 && !originalRequest._retry && (originalRequest._retryCount || 0) < 2) {
      originalRequest._retry = true
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1

      // Wait longer for server errors
      const delay = Math.min(2000 * Math.pow(2, originalRequest._retryCount - 1), 10000)
      await new Promise(resolve => setTimeout(resolve, delay))

      if (process.env.NODE_ENV === 'development') {
        console.log(`Retrying server error (attempt ${originalRequest._retryCount}):`, originalRequest.url)
      }

      return apiClient(originalRequest)
    }

    // For client errors (4xx), add user-friendly error handling
    if (error.response?.status >= 400 && error.response?.status < 500) {
      // Enhance error with user-friendly message
      error.userMessage = getUserFriendlyErrorMessage(error.response.status, error.response.data)

      // Emit error event for UI components to handle
      window.dispatchEvent(new CustomEvent('api-error', {
        detail: {
          status: error.response.status,
          message: error.userMessage,
          type: error.isAuthError ? 'auth' : error.isValidationError ? 'validation' : 'client',
          originalError: error
        }
      }))
    }

    // For server errors (5xx), check if we should enable demo mode
    if (error.response?.status >= 500) {
      // Emit server error event
      window.dispatchEvent(new CustomEvent('server-error', {
        detail: {
          status: error.response.status,
          message: 'Server error occurred. Some features may be limited.',
          shouldShowFallback: true
        }
      }))
    }

    return Promise.reject(error)
  }
)

/**
 * Get user-friendly error messages for common HTTP status codes
 */
function getUserFriendlyErrorMessage(status: number, data: any): string {
  switch (status) {
    case 400:
      return data?.message || 'Invalid request. Please check your input and try again.'
    case 401:
      return 'Your session has expired. Please log in again.'
    case 403:
      return 'You don\'t have permission to perform this action.'
    case 404:
      return 'The requested resource was not found.'
    case 409:
      return data?.message || 'This action conflicts with existing data.'
    case 422:
      return data?.message || 'Please check your input and try again.'
    case 429:
      return 'Too many requests. Please wait a moment and try again.'
    case 500:
      return 'Server error. Please try again later.'
    case 502:
      return 'Service temporarily unavailable. Please try again later.'
    case 503:
      return 'Service maintenance in progress. Please try again later.'
    default:
      return data?.message || 'An unexpected error occurred. Please try again.'
  }
}

// Utility functions for API health and debugging
export const apiUtils = {
  /**
   * Check API health with enhanced error details
   */
  async checkHealth(): Promise<{
    healthy: boolean
    status?: any
    error?: string
    backendAvailable: boolean
    authServiceHealthy: boolean
  }> {
    try {
      const response = await apiClient.get('/health')

      // Also check auth service health
      let authHealthy = false
      try {
        const authResponse = await apiClient.get('/api/v1/auth/health')
        authHealthy = authResponse.status === 200
      } catch (authError) {
        console.warn('Auth service health check failed:', authError)
      }

      return {
        healthy: true,
        backendAvailable: true,
        authServiceHealthy: authHealthy,
        status: response.data
      }
    } catch (error: any) {
      const isNetworkError = !error.response
      return {
        healthy: false,
        backendAvailable: !isNetworkError,
        authServiceHealthy: false,
        error: error.message || 'Health check failed'
      }
    }
  },

  /**
   * Test authentication with proper endpoint
   */
  async testAuth(): Promise<{
    authenticated: boolean
    user?: any
    error?: string
    errorType?: 'network' | 'unauthorized' | 'server' | 'other'
  }> {
    try {
      const response = await apiClient.get('/api/v1/auth/me')
      return {
        authenticated: true,
        user: response.data
      }
    } catch (error: any) {
      let errorType: 'network' | 'unauthorized' | 'server' | 'other' = 'other'

      if (!error.response) {
        errorType = 'network'
      } else if (error.response.status === 401) {
        errorType = 'unauthorized'
      } else if (error.response.status >= 500) {
        errorType = 'server'
      }

      return {
        authenticated: false,
        errorType,
        error: error.response?.data?.detail || error.message || 'Authentication test failed'
      }
    }
  },

  /**
   * Get API configuration info
   */
  getConfig() {
    return {
      baseURL: getBaseURL(),
      hasToken: !!smartStorage.getItem('access_token'),
      hasCSRF: !!smartStorage.getItem('csrf_token'),
      demoMode: sessionStorage?.getItem('demo_mode') === 'true',
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development'
    }
  },

  /**
   * Force enable demo mode
   */
  enableDemoMode(reason?: string) {
    sessionStorage.setItem('demo_mode', 'true')
    if (reason) {
      sessionStorage.setItem('demo_mode_reason', reason)
    }

    // Clear auth data
    smartStorage.removeItem('access_token')
    smartStorage.removeItem('user')
    smartStorage.removeItem('csrf_token')

    // Emit demo mode event
    window.dispatchEvent(new CustomEvent('demo-mode-enabled', {
      detail: { reason }
    }))
  },

  /**
   * Check if demo mode is active
   */
  isDemoMode(): boolean {
    return sessionStorage?.getItem('demo_mode') === 'true'
  },

  /**
   * Disable demo mode
   */
  disableDemoMode() {
    sessionStorage.removeItem('demo_mode')
    sessionStorage.removeItem('demo_mode_reason')
    sessionStorage.removeItem('backend_unavailable_reason')
  }
}

export default apiClient

// Type definitions
export interface User {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  full_name: string
  role: string
  is_active: boolean
  is_verified: boolean
  primary_location_id?: number
  permissions?: string[]
  sixfb_certification_level?: string
  certification_date?: string
  created_at: string
  updated_at: string
  last_login?: string
  phone_number?: string
  profile_image_url?: string | null
  location_id?: number
  barber_id?: number
}

export interface Location {
  id: number
  name: string
  location_code: string
  address: string
  city: string
  state: string
  zip_code: string
  phone: string
  email: string
  franchise_type: string
  is_active: boolean
  mentor_id?: number
  mentor_name?: string
  operating_hours: Record<string, string>
  capacity: number
  created_at: string
}

export interface Barber {
  id: number
  first_name: string
  last_name: string
  email: string
  phone?: string
  location_id?: number
  location_name?: string
  user_id?: number
  commission_rate: number
  created_at: string
  sixfb_score?: number
  monthly_revenue?: number
  appointments_this_week?: number
}

export interface Appointment {
  id: number
  barber_id: number
  barber_name: string
  client_id?: number
  client_name: string
  client_email?: string
  client_phone?: string
  appointment_date: string
  appointment_time?: string
  status: string
  service_name: string
  service_duration: number
  service_price: number
  service_revenue?: number
  tip_amount?: number
  product_revenue?: number
  total_amount: number
  customer_type: string
  source: string
  notes?: string
  created_at: string
}

export interface TrainingModule {
  id: number
  title: string
  description: string
  category: string
  difficulty_level: string
  content_type: string
  estimated_duration: number
  passing_score: number
  required_for_certification?: string
  is_mandatory: boolean
  can_access: boolean
  enrollment_status: string
  progress: number
  best_score: number
}

export interface ApiResponse<T> {
  data: T
  message?: string
  status?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  totalPages?: number
  hasNext?: boolean
  hasPrev?: boolean
  limit?: number
}

export interface ErrorResponse {
  detail: string
  status_code?: number
}
