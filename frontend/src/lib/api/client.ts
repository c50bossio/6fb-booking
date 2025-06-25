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
      timestamp: new Date().toISOString()
    }

    console.error('API Error:', errorInfo)

    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      // Clear stored tokens
      smartStorage.removeItem('access_token')
      smartStorage.removeItem('user')

      // Only redirect if not already on login/auth pages
      const currentPath = window.location.pathname
      const authPaths = ['/login', '/signup', '/reset-password']

      if (!authPaths.some(path => currentPath.includes(path))) {
        // Store current location for redirect after login
        smartStorage.setItem('redirect_after_login', currentPath)
        window.location.href = '/login'
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

    // Implement retry logic for network failures
    if (!error.response && !originalRequest._retry) {
      originalRequest._retry = true

      // Wait with exponential backoff
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
   * Check API health
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
   * Test authentication
   */
  async testAuth(): Promise<{
    authenticated: boolean
    user?: any
    error?: string
  }> {
    try {
      const response = await apiClient.get('/auth/me')
      return {
        authenticated: true,
        user: response.data
      }
    } catch (error: any) {
      return {
        authenticated: false,
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
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development'
    }
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
