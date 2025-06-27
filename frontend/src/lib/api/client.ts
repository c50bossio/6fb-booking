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

      // Always try to get fresh token from storage
      const token = smartStorage.getItem('access_token')

      // Ensure Authorization header is set properly
      if (token) {
        config.headers.Authorization = `Bearer ${token}`

        // Double-check the header was set
        if (!config.headers.Authorization || config.headers.Authorization !== `Bearer ${token}`) {
          console.warn('[API Client] Authorization header not set properly, retrying...')
          config.headers = config.headers || {}
          config.headers.Authorization = `Bearer ${token}`
        }
      } else {
        // Remove Authorization header if no token
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
      isNetworkError: !error.response,
      hasToken: !!smartStorage.getItem('access_token'),
      isRetry: originalRequest?._retry || false,
      isTokenRefresh: originalRequest?.url?.includes('/auth/refresh') || false
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

    // Handle 401 Unauthorized - enhanced auth error handling with token refresh
    if (error.response?.status === 401) {
      // Don't try to refresh if this is already a refresh request or has skip header
      if (originalRequest?.url?.includes('/auth/refresh') ||
          originalRequest?.url?.includes('/auth/token') ||
          originalRequest?.headers?.['X-Skip-Auth-Refresh'] === 'true') {
        console.log('[API Client] Token refresh skipped or failed, clearing auth state')

        // Clear tokens and auth state
        smartStorage.removeItem('access_token')
        smartStorage.removeItem('user')
        smartStorage.removeItem('csrf_token')

        // Redirect to login only if not on a public page
        const currentPath = window.location.pathname
        const authPaths = ['/login', '/signup', '/reset-password', '/demo', '/']
        const isPublicPath = authPaths.some(path => currentPath === path || currentPath.startsWith('/book'))

        if (!isPublicPath) {
          smartStorage.setItem('redirect_after_login', currentPath)
          window.location.href = '/login'
        }

        return Promise.reject(error)
      }

      // Check if we should attempt token refresh
      const hasToken = smartStorage.getItem('access_token')
      const isSessionRestoring = (window as any)._authSessionRestoreInProgress
      const isDemoMode = sessionStorage.getItem('demo_mode') === 'true'

      // Try to refresh token if we have one and not already retrying
      if (hasToken && !originalRequest._retry && !isSessionRestoring && !isDemoMode) {
        originalRequest._retry = true

        console.log('[API Client] 401 received, attempting token refresh...')

        try {
          // Attempt to refresh the token
          const refreshResponse = await fetch(`${getBaseURL()}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${hasToken}`
            },
            credentials: 'include'
          })

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()

            console.log('[API Client] Token refresh successful')

            // Update the stored token
            if (refreshData.access_token) {
              smartStorage.setItem('access_token', refreshData.access_token)

              // Update user data if provided
              if (refreshData.user) {
                smartStorage.setItem('user', JSON.stringify(refreshData.user))
              }

              // Retry the original request with the new token
              originalRequest.headers.Authorization = `Bearer ${refreshData.access_token}`
              return apiClient(originalRequest)
            }
          } else {
            console.log('[API Client] Token refresh failed with status:', refreshResponse.status)
          }
        } catch (refreshError) {
          console.error('[API Client] Token refresh error:', refreshError)
        }
      }

      // If we reach here, token refresh failed or wasn't attempted
      // Check if session restoration is in progress
      if (!isSessionRestoring) {
        console.warn('[API Client] 401 received, checking authentication state...')

        // Only redirect if not already on login/auth pages and not in demo mode
        const currentPath = window.location.pathname
        const authPaths = ['/login', '/signup', '/reset-password', '/demo']
        const isPublicPath = authPaths.some(path => currentPath.includes(path)) ||
                            currentPath === '/' ||
                            currentPath.startsWith('/book')

        if (!isPublicPath && !isDemoMode) {
          // Emit custom event for auth error handling
          window.dispatchEvent(new CustomEvent('auth-error', {
            detail: {
              type: 'unauthorized',
              message: 'Authentication expired. Please log in again.',
              shouldRedirect: !hasToken // Only redirect if no token exists
            }
          }))

          // Delay token clearing to give AuthProvider time to handle the error
          setTimeout(() => {
            // Re-check conditions before clearing tokens
            if (!(window as any)._authSessionRestoreInProgress &&
                !smartStorage.getItem('user') &&
                !sessionStorage.getItem('demo_mode')) {

              console.log('[API Client] Clearing invalid tokens')

              // Clear tokens
              smartStorage.removeItem('access_token')
              smartStorage.removeItem('user')
              smartStorage.removeItem('csrf_token')

              // Store current location for redirect after login
              smartStorage.setItem('redirect_after_login', currentPath)

              // Redirect to login
              window.location.href = '/login'
            }
          }, 1000) // Give more time for session restoration
        }
      } else {
        console.log('[API Client] 401 received but session restoration in progress, not redirecting')
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
   * Proactively refresh token if needed
   */
  async refreshTokenIfNeeded(): Promise<boolean> {
    const token = smartStorage.getItem('access_token')
    if (!token) {
      console.log('[API Utils] No token to refresh')
      return false
    }

    try {
      console.log('[API Utils] Attempting proactive token refresh...')

      const refreshResponse = await fetch(`${getBaseURL()}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      })

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json()

        if (refreshData.access_token) {
          console.log('[API Utils] Token refreshed successfully')
          smartStorage.setItem('access_token', refreshData.access_token)

          if (refreshData.user) {
            smartStorage.setItem('user', JSON.stringify(refreshData.user))
          }

          return true
        }
      } else {
        console.log('[API Utils] Token refresh failed with status:', refreshResponse.status)
      }
    } catch (error) {
      console.error('[API Utils] Token refresh error:', error)
    }

    return false
  },

  /**
   * Validate current token without making an API call
   */
  validateStoredToken(): {
    hasToken: boolean
    tokenLength: number
    hasUser: boolean
    isExpired?: boolean
  } {
    const token = smartStorage.getItem('access_token')
    const user = smartStorage.getItem('user')

    let isExpired = false

    // Basic JWT expiration check (if token is JWT)
    if (token && token.split('.').length === 3) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.exp) {
          isExpired = payload.exp * 1000 < Date.now()
        }
      } catch (e) {
        console.warn('[API Utils] Failed to parse JWT:', e)
      }
    }

    return {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      hasUser: !!user,
      isExpired
    }
  },

  /**
   * Get API configuration info
   */
  getConfig() {
    const tokenInfo = this.validateStoredToken()

    return {
      baseURL: getBaseURL(),
      hasToken: tokenInfo.hasToken,
      tokenExpired: tokenInfo.isExpired,
      hasUser: tokenInfo.hasUser,
      hasCSRF: !!smartStorage.getItem('csrf_token'),
      demoMode: sessionStorage?.getItem('demo_mode') === 'true',
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
      tokenInfo
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
  },

  /**
   * Debug authentication state
   */
  debugAuth() {
    const config = this.getConfig()
    const token = smartStorage.getItem('access_token')
    const user = smartStorage.getItem('user')

    console.group('[API Debug] Authentication State')
    console.log('Configuration:', config)
    console.log('Token exists:', !!token)
    console.log('Token length:', token ? token.length : 0)
    console.log('User data exists:', !!user)

    if (user) {
      try {
        const userData = JSON.parse(user)
        console.log('User:', { id: userData.id, email: userData.email, role: userData.role })
      } catch (e) {
        console.error('Failed to parse user data:', e)
      }
    }

    console.log('Session restore in progress:', (window as any)._authSessionRestoreInProgress)
    console.log('Demo mode:', this.isDemoMode())
    console.groupEnd()

    return config
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
