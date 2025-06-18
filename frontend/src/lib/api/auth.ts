/**
 * Authentication API service
 */
import apiClient from './client'
import type { User } from './client'

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
    const formData = new FormData()
    formData.append('username', credentials.username)
    formData.append('password', credentials.password)

    const response = await apiClient.post<LoginResponse>('/auth/token', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    // Store token and user data
    localStorage.setItem('access_token', response.data.access_token)
    localStorage.setItem('user', JSON.stringify(response.data.user))

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
      // Clear local storage regardless of API response
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
  },

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me')
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
   * Get current user from local storage
   */
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user')
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
    return !!localStorage.getItem('access_token')
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