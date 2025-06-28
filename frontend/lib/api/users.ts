/**
 * Users API service
 */
import apiClient from './client'
import type { User } from './client'

interface UserUpdate {
  full_name?: string
  email?: string
  role?: string
  is_active?: boolean
  primary_location_id?: number
  accessible_locations?: number[]
  permissions?: string[]
}

interface UserFilter {
  skip?: number
  limit?: number
  role?: string
  location_id?: number
  is_active?: boolean
}

interface BarberInfo {
  id: number
  user_id: number
  first_name: string
  last_name: string
  email: string
  phone?: string
  location_id?: number
  location_name?: string
  sixfb_score?: number
  hire_date?: string
}

export const usersService = {
  /**
   * Get list of users
   */
  async getUsers(filters?: UserFilter): Promise<User[]> {
    const params = new URLSearchParams()
    if (filters?.skip) params.append('skip', filters.skip.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.role) params.append('role', filters.role)
    if (filters?.location_id) params.append('location_id', filters.location_id.toString())
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString())

    const response = await apiClient.get<User[]>(`/users?${params.toString()}`)
    return response.data
  },

  /**
   * Get specific user
   */
  async getUser(userId: number): Promise<User> {
    const response = await apiClient.get<User>(`/users/${userId}`)
    return response.data
  },

  /**
   * Update user
   */
  async updateUser(userId: number, data: UserUpdate): Promise<User> {
    const response = await apiClient.put<User>(`/users/${userId}`, data)
    return response.data
  },

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: number): Promise<void> {
    await apiClient.delete(`/users/${userId}`)
  },

  /**
   * Get barber info for user
   */
  async getUserBarberInfo(userId: number): Promise<BarberInfo> {
    const response = await apiClient.get<BarberInfo>(`/users/${userId}/barber-info`)
    return response.data
  },

  /**
   * Assign role to user
   */
  async assignRole(userId: number, role: string): Promise<{ message: string; user_id: number; new_role: string }> {
    const response = await apiClient.post(`/users/${userId}/assign-role`, null, {
      params: { new_role: role }
    })
    return response.data
  },

  /**
   * Grant permission to user
   */
  async grantPermission(userId: number, permission: string): Promise<{ message: string; user_id: number; permissions: string[] }> {
    const response = await apiClient.post(`/users/${userId}/grant-permission`, null, {
      params: { permission }
    })
    return response.data
  },

  /**
   * Create user helper
   */
  async createUser(userData: {
    email: string
    password: string
    full_name: string
    role: string
    primary_location_id?: number
  }): Promise<User> {
    // This uses the auth register endpoint
    const response = await apiClient.post<User>('/auth/register', userData)
    return response.data
  },
}
