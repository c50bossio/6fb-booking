/**
 * Base API client configuration
 */
import axios from 'axios'
import { smartStorage } from '../utils/storage'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8003/api/v1'

// Log API configuration in development
if (process.env.NODE_ENV === 'development') {
  console.log('API Configuration:', {
    baseURL: API_BASE_URL,
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development'
  })
}

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token and logging
apiClient.interceptors.request.use(
  (config) => {
    try {
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

    // Log error details
    console.error('API Error:', {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    })

    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      // Clear stored tokens
      smartStorage.removeItem('access_token')
      smartStorage.removeItem('user')

      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error('Access forbidden - insufficient permissions')
      return Promise.reject(error)
    }

    // Implement retry logic for network failures
    if (!error.response && !originalRequest._retry) {
      originalRequest._retry = true

      // Wait 1 second before retry
      await new Promise(resolve => setTimeout(resolve, 1000))

      console.log('Retrying failed request:', originalRequest.url)
      return apiClient(originalRequest)
    }

    // Handle 500 server errors with retry
    if (error.response?.status >= 500 && !originalRequest._retry) {
      originalRequest._retry = true

      // Wait 2 seconds before retry for server errors
      await new Promise(resolve => setTimeout(resolve, 2000))

      console.log('Retrying server error:', originalRequest.url)
      return apiClient(originalRequest)
    }

    return Promise.reject(error)
  }
)

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
      baseURL: API_BASE_URL,
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
