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
   * Login user - Using emergency endpoint for production reliability
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // Use URL-encoded format for OAuth2 compatibility
    const params = new URLSearchParams()
    params.append('username', credentials.username)
    params.append('password', credentials.password)

    const response = await apiClient.post<LoginResponse>('/auth/token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    // Store token and user data with safe storage
    smartStorage.setItem('access_token', response.data.access_token)
    smartStorage.setItem('user', JSON.stringify(response.data.user))

    return response.data
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
    const response = await apiClient.get<User>('/auth/me')

    // Update stored user data with fresh data from server
    smartStorage.setItem('user', JSON.stringify(response.data))

    return response.data
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
   * Refresh access token with better error handling
   */
  async refreshToken(): Promise<LoginResponse | null> {
    try {
      console.log('[AuthService] Attempting token refresh...')

      // First try with the standard endpoint
      const response = await apiClient.post<LoginResponse>('/auth/refresh', {}, {
        // Ensure we don't trigger infinite loops
        headers: {
          'X-Skip-Auth-Refresh': 'true'
        }
      })

      // Update stored token
      if (response.data.access_token) {
        console.log('[AuthService] Token refresh successful')
        smartStorage.setItem('access_token', response.data.access_token)

        if (response.data.user) {
          smartStorage.setItem('user', JSON.stringify(response.data.user))
        }

        return response.data
      }

      return null
    } catch (error: any) {
      console.error('[AuthService] Token refresh failed:', error)

      // If refresh fails with 401, the refresh token is also invalid
      if (error.response?.status === 401) {
        console.log('[AuthService] Refresh token is invalid')
      }

      return null
    }
  },

  /**
   * Verify token validity
   */
  async verifyToken(): Promise<boolean> {
    try {
      await apiClient.get('/auth/verify')
      return true
    } catch (error) {
      return false
    }
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
   * Check if user is authenticated (basic token check)
   */
  isAuthenticated(): boolean {
    return !!smartStorage.getItem('access_token')
  },

  /**
   * Check if user is authenticated with token validation
   */
  async isAuthenticatedWithValidation(): Promise<boolean> {
    const token = smartStorage.getItem('access_token')
    if (!token) return false

    try {
      // Make a lightweight request to validate the token
      await this.getCurrentUser()
      return true
    } catch (error: any) {
      // If 401, token is invalid
      if (error.response?.status === 401) {
        smartStorage.removeItem('access_token')
        smartStorage.removeItem('user')
        return false
      }
      // For other errors (network, 5xx), assume token is still valid
      return true
    }
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
