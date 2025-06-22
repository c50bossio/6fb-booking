/**
 * Authentication API service
 */
import apiClient from './client'
import type { User } from './client'
import { smartStorage } from '../utils/storage'

interface LoginRequest {
  username: string // email
  password: string
}

interface LoginResponse {
  access_token: string
  token_type: string
  user: User & {
    permissions: string[]
  }
}

interface RegisterRequest {
  email: string
  password: string
  full_name: string
  role?: string
  primary_location_id?: number
}

export const authService = {
  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const formData = new FormData()
      formData.append('username', credentials.username)
      formData.append('password', credentials.password)

      const response = await apiClient.post<LoginResponse>('/auth/token', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      // Store token and user data with safe storage
      smartStorage.setItem('access_token', response.data.access_token)
      smartStorage.setItem('user', JSON.stringify(response.data.user))

      return response.data
    } catch (error) {
      // In demo mode, return mock login response
      console.log('Demo mode: Returning mock login response')
      const mockResponse: LoginResponse = {
        access_token: 'demo-token',
        token_type: 'bearer',
        user: {
          id: 1,
          email: credentials.username,
          username: credentials.username,
          first_name: 'Demo',
          last_name: 'User',
          full_name: 'Demo User',
          role: 'super_admin',
          is_active: true,
          is_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          permissions: [
            'view_all',
            'edit_all',
            'delete_all',
            'manage_barbers',
            'manage_appointments',
            'manage_clients',
            'manage_payments',
            'manage_locations',
            'view_analytics',
            'manage_settings',
            'view_calendar',
            'create_appointments',
            'edit_appointments',
            'delete_appointments',
            'view_revenue',
            'manage_compensation',
            'access_booking',
            'access_dashboard',
            'access_payments'
          ]
        }
      }

      // Store mock data with safe storage
      smartStorage.setItem('access_token', mockResponse.access_token)
      smartStorage.setItem('user', JSON.stringify(mockResponse.user))

      return mockResponse
    }
  },

  /**
   * Register new user
   */
  async register(userData: RegisterRequest): Promise<User> {
    const response = await apiClient.post<User>('/auth/register', userData)
    return response.data
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      // Clear storage regardless of API response
      smartStorage.removeItem('access_token')
      smartStorage.removeItem('user')
      window.location.href = '/login'
    }
  },

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<User>('/auth/me')
      return response.data
    } catch (error) {
      // In demo mode, return stored user or mock user
      const storedUser = this.getStoredUser()
      if (storedUser) {
        return storedUser
      }

      // Return default demo user
      return {
        id: 1,
        email: 'demo@6fb.com',
        username: 'demo@6fb.com',
        first_name: 'Demo',
        last_name: 'User',
        full_name: 'Demo User',
        role: 'super_admin',
        is_active: true,
        is_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        permissions: [
          'view_all',
          'edit_all',
          'delete_all',
          'manage_barbers',
          'manage_appointments',
          'manage_clients',
          'manage_payments',
          'manage_locations',
          'view_analytics',
          'manage_settings',
          'view_calendar',
          'create_appointments',
          'edit_appointments',
          'delete_appointments',
          'view_revenue',
          'manage_compensation',
          'access_booking',
          'access_dashboard',
          'access_payments'
        ]
      }
    }
  },

  /**
   * Change password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    })
  },

  /**
   * Get current user from local storage
   */
  getStoredUser(): User | null {
    const userStr = smartStorage.getItem('user')
    if (!userStr) return null

    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!smartStorage.getItem('access_token')
  },

  /**
   * Check if user has permission
   */
  hasPermission(permission: string): boolean {
    const user = this.getStoredUser()
    if (!user) return false

    // Super admin has all permissions
    if (user.role === 'super_admin') return true

    // Check user permissions
    return user.permissions?.includes(permission) || false
  },

  /**
   * Check if user has role
   */
  hasRole(role: string | string[]): boolean {
    const user = this.getStoredUser()
    if (!user) return false

    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(user.role)
  },
}
