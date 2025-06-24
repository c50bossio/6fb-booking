/**
 * Customer Authentication API service
 */
import apiClient from './client'
import { smartStorage } from '../utils/storage'

export interface Customer {
  id: number
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone?: string
  is_active: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
  last_login?: string
  newsletter_subscription?: boolean
  preferred_barber_id?: number
  preferred_location_id?: number
  avatar_url?: string
}

interface CustomerLoginRequest {
  email: string
  password: string
}

interface CustomerLoginResponse {
  access_token: string
  token_type: string
  customer: Customer
}

interface CustomerRegisterRequest {
  email: string
  password: string
  first_name: string
  last_name: string
  phone?: string
  newsletter_subscription?: boolean
}

interface ForgotPasswordRequest {
  email: string
}

interface ResetPasswordRequest {
  token: string
  new_password: string
}

interface UpdateProfileRequest {
  first_name?: string
  last_name?: string
  phone?: string
  preferred_barber_id?: number
  preferred_location_id?: number
  newsletter_subscription?: boolean
}

interface ChangePasswordRequest {
  old_password: string
  new_password: string
}

export const customerAuthService = {
  /**
   * Login customer
   */
  async login(credentials: CustomerLoginRequest): Promise<CustomerLoginResponse> {
    const response = await apiClient.post<CustomerLoginResponse>('/customer/auth/login', credentials)

    // Store token and customer data with safe storage
    smartStorage.setItem('customer_access_token', response.data.access_token)
    smartStorage.setItem('customer', JSON.stringify(response.data.customer))

    return response.data
  },

  /**
   * Register new customer
   */
  async register(customerData: CustomerRegisterRequest): Promise<Customer> {
    const response = await apiClient.post<Customer>('/customer/auth/register', customerData)
    return response.data
  },

  /**
   * Logout customer
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/customer/auth/logout')
    } finally {
      // Clear storage regardless of API response
      smartStorage.removeItem('customer_access_token')
      smartStorage.removeItem('customer')
      // Don't redirect here - let the context handle it
    }
  },

  /**
   * Get current customer info
   */
  async getCurrentCustomer(): Promise<Customer> {
    // Use customer-specific header for authentication
    const token = smartStorage.getItem('customer_access_token')
    const response = await apiClient.get<Customer>('/customer/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    // Update stored customer data with fresh data from server
    smartStorage.setItem('customer', JSON.stringify(response.data))

    return response.data
  },

  /**
   * Update customer profile
   */
  async updateProfile(profileData: UpdateProfileRequest): Promise<Customer> {
    const token = smartStorage.getItem('customer_access_token')
    const response = await apiClient.put<Customer>('/customer/auth/profile', profileData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    // Update stored customer data
    smartStorage.setItem('customer', JSON.stringify(response.data))

    return response.data
  },

  /**
   * Change customer password
   */
  async changePassword(passwordData: ChangePasswordRequest): Promise<void> {
    const token = smartStorage.getItem('customer_access_token')
    await apiClient.post('/customer/auth/change-password', passwordData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
  },

  /**
   * Request password reset
   */
  async forgotPassword(request: ForgotPasswordRequest): Promise<void> {
    await apiClient.post('/customer/auth/forgot-password', request)
  },

  /**
   * Reset password with token
   */
  async resetPassword(request: ResetPasswordRequest): Promise<void> {
    await apiClient.post('/customer/auth/reset-password', request)
  },

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    await apiClient.post('/customer/auth/verify-email', { token })
  },

  /**
   * Resend email verification
   */
  async resendEmailVerification(): Promise<void> {
    const token = smartStorage.getItem('customer_access_token')
    await apiClient.post('/customer/auth/resend-verification', {}, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
  },

  /**
   * Get current customer from local storage
   */
  getStoredCustomer(): Customer | null {
    const customerStr = smartStorage.getItem('customer')
    if (!customerStr) return null

    try {
      return JSON.parse(customerStr)
    } catch {
      return null
    }
  },

  /**
   * Check if customer is authenticated
   */
  isAuthenticated(): boolean {
    return !!smartStorage.getItem('customer_access_token')
  },

  /**
   * Get customer token
   */
  getToken(): string | null {
    return smartStorage.getItem('customer_access_token')
  },
}
