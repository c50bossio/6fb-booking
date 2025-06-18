/**
 * Base API client configuration
 */
import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient

// Type definitions
export interface User {
  id: number
  email: string
  full_name: string
  role: string
  is_active: boolean
  primary_location_id?: number
  permissions?: string[]
  sixfb_certification_level?: string
  certification_date?: string
  created_at: string
  last_login?: string
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
  limit: number
}

export interface ErrorResponse {
  detail: string
  status_code?: number
}