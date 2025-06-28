/**
 * Base API client configuration
 */
import axios from 'axios'
import { smartStorage } from '../utils/storage'
import { getApiBaseUrl, initializeCors } from './corsHelper'
import {
  isTokenExpired,
  isTokenExpiringWithin,
  TOKEN_REFRESH_THRESHOLD
} from '../utils/tokenUtils'

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

// Token refresh management
let isRefreshingToken = false
let refreshPromise: Promise<boolean> | null = null
let failedRequestsQueue: Array<{
  resolve: (value?: any) => void
  reject: (error?: any) => void
  config: any
}> = []

// Function to refresh token
const refreshToken = async (): Promise<boolean> => {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      console.log('[API Client] Attempting token refresh...')

      // Import auth service dynamically to avoid circular dependency
      const { authService } = await import('./auth')

      // Try to get fresh user data (this will trigger token refresh)
      const user = await authService.getCurrentUser()

      if (user) {
        console.log('[API Client] Token refresh successful')
        return true
      } else {
        console.error('[API Client] Token refresh failed - no user returned')
        return false
      }
    } catch (error) {
      console.error('[API Client] Token refresh failed:', error)
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// Process queued requests after token refresh
const processQueue = (error: any = null) => {
  failedRequestsQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error)
    } else {
      resolve(apiClient.request(config))
    }
  })

  failedRequestsQueue = []
}

// Request interceptor to add auth token and proactive validation
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Set dynamic base URL
      config.baseURL = getBaseURL()

      // Always try to get fresh token from storage
      const token = smartStorage.getItem('access_token')

      // Skip auth validation for auth endpoints and health checks
      const isAuthEndpoint = config.url?.includes('/auth/') ||
                           config.url?.includes('/health') ||
                           config.url?.includes('/register')

      if (token && !isAuthEndpoint) {
        // Proactive token validation for protected endpoints
        const isExpired = isTokenExpired(token)
        const isExpiring = isTokenExpiringWithin(token, TOKEN_REFRESH_THRESHOLD)

        if (isExpired || isExpiring) {
          console.log('[API Client] Token validation failed, attempting refresh before request', {
            url: config.url,
            isExpired,
            isExpiring
          })

          // Queue this request if token is being refreshed
          if (isRefreshingToken) {
            return new Promise((resolve, reject) => {
              failedRequestsQueue.push({ resolve, reject, config })
            })
          }

          // Attempt token refresh
          isRefreshingToken = true
          try {
            const refreshSuccess = await refreshToken()
            if (refreshSuccess) {
              // Get the refreshed token
              const newToken = smartStorage.getItem('access_token')
              if (newToken) {
                config.headers.Authorization = `Bearer ${newToken}`
                console.log('[API Client] Using refreshed token for request')
              }
              processQueue() // Process any queued requests
            } else {
              const error = new Error('Token refresh failed')
              processQueue(error)
              throw error
            }
          } finally {
            isRefreshingToken = false
          }
        } else {
          // Token is valid, use it
          config.headers.Authorization = `Bearer ${token}`
        }

        // Double-check the header was set
        if (!config.headers.Authorization || !config.headers.Authorization.startsWith('Bearer ')) {
          console.warn('[API Client] Authorization header not set properly, retrying...')
          config.headers = config.headers || {}
          const currentToken = smartStorage.getItem('access_token')
          if (currentToken) {
            config.headers.Authorization = `Bearer ${currentToken}`
          }
        }
      } else if (!token && !isAuthEndpoint) {
        // No token for protected endpoint
        console.warn('[API Client] No token available for protected endpoint:', config.url)
        delete config.headers.Authorization
      } else {
        // Auth endpoint or no token needed
        delete config.headers.Authorization
      }

      // Add request ID for debugging
      config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Enhanced logging in development
      if (process.env.NODE_ENV === 'development') {
        const logData = {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
          fullURL: `${config.baseURL}${config.url}`,
          hasAuth: !!token,
          authHeader: config.headers.Authorization ? 'Bearer [REDACTED]' : 'None',
          tokenLength: token ? token.length : 0,
          requestId: config.headers['X-Request-ID'],
          timestamp: new Date().toISOString()
        }

        // Log different levels based on auth status
        if (!token && !config.url?.includes('/auth/') && !config.url?.includes('/health')) {
          console.warn('[API Client] Request without auth token:', logData)
        } else {
          console.log('[API Client] Request:', logData)
        }
      }

      // Verify token retrieval from storage
      if (config.url && !config.url.includes('/auth/token') && !config.url.includes('/auth/refresh')) {
        const storedToken = smartStorage.getItem('access_token')
        if (storedToken !== token) {
          console.error('[API Client] Token mismatch detected!', {
            retrieved: !!token,
            stored: !!storedToken,
            match: token === storedToken
          })
        }
      }
    } catch (e) {
      // Handle any unexpected errors
      console.error('[API Client] Critical error in request interceptor:', e)
      // Don't block the request due to interceptor errors
    }
    return config
  },
  (error) => {
    console.error('[API Client] Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for basic error handling only
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

    // Log error details
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      isNetworkError: !error.response,
      isRetry: originalRequest._retry
    })

    // Enhanced error classification for UI components
    error.isNetworkError = !error.response
    error.isServerError = error.response?.status >= 500
    error.isClientError = error.response?.status >= 400 && error.response?.status < 500
    error.isAuthError = error.response?.status === 401
    error.isPermissionError = error.response?.status === 403
    error.isValidationError = error.response?.status === 422

    // Handle 401 Unauthorized with retry logic
    if (error.response?.status === 401 && !originalRequest._retry) {
      const isAuthEndpoint = originalRequest.url?.includes('/auth/') ||
                           originalRequest.url?.includes('/health') ||
                           originalRequest.url?.includes('/register')

      // Don't retry auth endpoints or if already retried
      if (isAuthEndpoint) {
        console.log('[API Client] 401 on auth endpoint, not retrying')
        // Emit auth error event for login endpoints
        window.dispatchEvent(new CustomEvent('auth-error', {
          detail: {
            type: 'unauthorized',
            message: 'Authentication failed. Please check your credentials.',
            status: 401
          }
        }))
        return Promise.reject(error)
      }

      // Mark as retry attempt
      originalRequest._retry = true

      console.log('[API Client] 401 error, attempting token refresh and retry')

      // If already refreshing, queue this request
      if (isRefreshingToken) {
        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({
            resolve: (value) => resolve(value),
            reject: (err) => reject(err),
            config: originalRequest
          })
        })
      }

      // Attempt token refresh
      isRefreshingToken = true
      try {
        const refreshSuccess = await refreshToken()

        if (refreshSuccess) {
          // Update the authorization header with new token
          const newToken = smartStorage.getItem('access_token')
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            console.log('[API Client] Retrying request with refreshed token')

            // Process any queued requests
            processQueue()

            // Retry the original request
            return apiClient.request(originalRequest)
          }
        }

        // Token refresh failed, process queue with error
        const refreshError = new Error('Token refresh failed')
        processQueue(refreshError)

        // Emit auth error event
        window.dispatchEvent(new CustomEvent('auth-error', {
          detail: {
            type: 'unauthorized',
            message: 'Authentication expired. Please log in again.',
            status: 401
          }
        }))

        return Promise.reject(refreshError)

      } catch (refreshError) {
        console.error('[API Client] Token refresh failed:', refreshError)

        // Process queue with error
        processQueue(refreshError)

        // Emit auth error event
        window.dispatchEvent(new CustomEvent('auth-error', {
          detail: {
            type: 'unauthorized',
            message: 'Authentication expired. Please log in again.',
            status: 401
          }
        }))

        return Promise.reject(refreshError)
      } finally {
        isRefreshingToken = false
      }
    } else if (error.response?.status === 401) {
      // Already retried and still 401, emit auth error
      window.dispatchEvent(new CustomEvent('auth-error', {
        detail: {
          type: 'unauthorized',
          message: 'Authentication expired. Please log in again.',
          status: 401
        }
      }))
    }

    // Handle network errors - emit backend unavailable event
    if (!error.response) {
      const isBackendDown = error.code === 'ECONNREFUSED' ||
                           error.message?.includes('ERR_CONNECTION_REFUSED') ||
                           error.message?.includes('Network Error') ||
                           error.message?.includes('fetch')

      if (isBackendDown) {
        window.dispatchEvent(new CustomEvent('backend-unavailable', {
          detail: {
            message: 'Backend service is unavailable.',
            enableDemoMode: true
          }
        }))
      }
    }

    // Add user-friendly error messages
    if (error.response?.status >= 400 && error.response?.status < 500) {
      error.userMessage = getUserFriendlyErrorMessage(error.response.status, error.response.data)
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
      // For 400 errors, prioritize the backend message since it's usually specific
      return data?.message || data?.detail || 'Invalid request. Please check your input and try again.'
    case 401:
      return 'Your session has expired. Please log in again.'
    case 403:
      return 'You don\'t have permission to perform this action.'
    case 404:
      return 'The requested resource was not found.'
    case 409:
      return data?.message || data?.detail || 'This action conflicts with existing data.'
    case 422:
      return data?.message || data?.detail || 'Please check your input and try again.'
    case 429:
      return 'Too many requests. Please wait a moment and try again.'
    case 500:
      return 'Server error. Please try again later.'
    case 502:
      return 'Service temporarily unavailable. Please try again later.'
    case 503:
      return 'Service maintenance in progress. Please try again later.'
    default:
      return data?.message || data?.detail || 'An unexpected error occurred. Please try again.'
  }
}

// Simple utility functions for API health and demo mode
export const apiUtils = {
  /**
   * Basic health check
   */
  async checkHealth(): Promise<{
    healthy: boolean
    status?: any
    error?: string
  }> {
    try {
      const response = await apiClient.get('/health')
      return {
        healthy: true,
        status: response.data
      }
    } catch (error: any) {
      return {
        healthy: false,
        error: error.message || 'Health check failed'
      }
    }
  },

  /**
   * Get basic API configuration info
   */
  getConfig() {
    return {
      baseURL: getBaseURL(),
      demoMode: sessionStorage?.getItem('demo_mode') === 'true',
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development'
    }
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
