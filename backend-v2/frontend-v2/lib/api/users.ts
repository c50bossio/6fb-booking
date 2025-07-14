/**
 * Users API Client
 * 
 * Provides comprehensive user management functionality including:
 * - User profile management
 * - Role and permission management
 * - Timezone and preference settings
 * - Onboarding status tracking
 * - User directory and search
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ===============================
// TypeScript Interfaces
// ===============================

export type UserType = 'client' | 'barber' | 'barbershop'

export type UserRole = 
  | 'user'
  | 'admin'
  | 'super_admin'
  | 'barber'
  | 'manager'
  | 'owner'
  | 'receptionist'
  | 'viewer'

export interface UserBase {
  email: string
  name: string
}

export interface UserCreate extends UserBase {
  password: string
  user_type: UserType
  create_test_data?: boolean
}

export interface User extends UserBase {
  id: number
  created_at: string
  updated_at?: string
  unified_role?: string
  role_migrated?: boolean
  role?: string // Legacy field
  user_type?: UserType
  timezone?: string
  is_active?: boolean
  email_verified?: boolean
  onboarding_completed?: boolean
  onboarding_status?: Record<string, any>
  avatar_url?: string
  phone?: string
  first_name?: string
  last_name?: string
  location_id?: number
}

export interface UserResponse {
  user?: User
  message?: string
}

export interface UserUpdate {
  name?: string
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
  avatar_url?: string
  timezone?: string
}

export interface TimezoneUpdate {
  timezone: string
}

export interface TimezoneResponse {
  timezone: string
  current_time: string
  offset?: string
  message?: string
}

export interface OnboardingUpdate {
  completed?: boolean
  completed_steps?: string[]
  current_step?: number
  skipped?: boolean
}

export interface RoleUpdate {
  role: string
}

export interface UserFilters {
  role?: string
  user_type?: UserType
  is_active?: boolean
  search?: string
  skip?: number
  limit?: number
}

export interface UserPreferences {
  notifications: {
    email_enabled: boolean
    sms_enabled: boolean
    push_enabled: boolean
    appointment_reminders: boolean
    marketing_emails: boolean
    booking_confirmations: boolean
  }
  privacy: {
    profile_visibility: 'public' | 'private' | 'contacts_only'
    share_analytics: boolean
    allow_reviews: boolean
  }
  appearance: {
    theme: 'light' | 'dark' | 'system'
    language: string
    time_format: '12h' | '24h'
    date_format: string
  }
  booking: {
    default_service_duration: number
    auto_confirm_bookings: boolean
    require_deposit: boolean
    cancellation_window_hours: number
  }
}

export interface UserAnalytics {
  total_appointments: number
  total_revenue: number
  average_rating: number
  client_count: number
  retention_rate: number
  no_show_rate: number
  cancellation_rate: number
  monthly_growth: number
  performance_metrics: {
    punctuality_score: number
    customer_satisfaction: number
    rebooking_rate: number
  }
}

export interface UserActivity {
  id: string
  user_id: number
  activity_type: string
  description: string
  metadata?: Record<string, any>
  created_at: string
  ip_address?: string
  user_agent?: string
}

export interface UserSession {
  id: string
  user_id: number
  device_type: string
  device_name?: string
  location?: string
  ip_address: string
  is_current: boolean
  created_at: string
  last_activity: string
  expires_at: string
}

// ===============================
// Utility Functions
// ===============================

/**
 * Get authorization headers with current JWT token
 */
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

/**
 * Handle API response and extract data
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(errorData.detail || `Request failed with status ${response.status}`)
  }
  return response.json()
}

/**
 * Build query string from parameters
 */
function buildQueryString(params: Record<string, any>): string {
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  
  return filtered.length > 0 ? `?${filtered.join('&')}` : ''
}

// ===============================
// Users API Client
// ===============================

export const usersApi = {
  // ===============================
  // Current User Profile
  // ===============================

  /**
   * Get current user's profile
   */
  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  /**
   * Update current user's profile
   */
  async updateProfile(profileData: UserUpdate): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData)
    })

    return handleResponse(response)
  },

  // ===============================
  // Timezone Management
  // ===============================

  /**
   * Get current user's timezone
   */
  async getUserTimezone(): Promise<TimezoneResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/timezone`, {
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  /**
   * Update current user's timezone
   */
  async updateTimezone(timezoneData: TimezoneUpdate): Promise<TimezoneResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/timezone`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(timezoneData)
    })

    return handleResponse(response)
  },

  // ===============================
  // Onboarding Management
  // ===============================

  /**
   * Update user's onboarding status
   */
  async updateOnboardingStatus(onboardingData: OnboardingUpdate): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/onboarding`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(onboardingData)
    })

    return handleResponse(response)
  },

  // ===============================
  // User Management (Admin)
  // ===============================

  /**
   * Get list of all users with filtering
   */
  async getUsers(filters: UserFilters = {}): Promise<User[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/users/${buildQueryString(filters)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Update user's role
   */
  async updateUserRole(userId: number, roleData: RoleUpdate): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}/role`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(roleData)
    })

    return handleResponse(response)
  },

  /**
   * Get specific user by ID
   */
  async getUser(userId: number): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`, {
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  /**
   * Delete user account
   */
  async deleteUser(userId: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  // ===============================
  // User Preferences (Extended)
  // ===============================

  /**
   * Get user preferences
   */
  async getUserPreferences(): Promise<UserPreferences> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/preferences`, {
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  /**
   * Update user preferences
   */
  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/preferences`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(preferences)
    })

    return handleResponse(response)
  },

  // ===============================
  // User Analytics and Insights
  // ===============================

  /**
   * Get user analytics and performance metrics
   */
  async getUserAnalytics(userId?: number, dateRange?: { start: string; end: string }): Promise<UserAnalytics> {
    const params = {
      ...(userId && { user_id: userId }),
      ...(dateRange && { start_date: dateRange.start, end_date: dateRange.end })
    }

    const response = await fetch(
      `${API_BASE_URL}/api/v1/users/analytics${buildQueryString(params)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Get user activity log
   */
  async getUserActivity(
    userId?: number,
    filters: { activity_type?: string; limit?: number; offset?: number } = {}
  ): Promise<UserActivity[]> {
    const params = {
      ...(userId && { user_id: userId }),
      ...filters
    }

    const response = await fetch(
      `${API_BASE_URL}/api/v1/users/activity${buildQueryString(params)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  // ===============================
  // Session Management
  // ===============================

  /**
   * Get user's active sessions
   */
  async getUserSessions(): Promise<UserSession[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/sessions`, {
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  /**
   * Revoke specific session
   */
  async revokeSession(sessionId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  /**
   * Revoke all sessions except current
   */
  async revokeAllOtherSessions(): Promise<{ message: string; revoked_count: number }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/sessions/revoke-all`, {
      method: 'POST',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  // ===============================
  // Avatar and Media Management
  // ===============================

  /**
   * Upload user avatar
   */
  async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    const formData = new FormData()
    formData.append('avatar', file)

    const token = localStorage.getItem('access_token')
    const response = await fetch(`${API_BASE_URL}/api/v1/users/avatar`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
      },
      body: formData
    })

    return handleResponse(response)
  },

  /**
   * Remove user avatar
   */
  async removeAvatar(): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/users/avatar`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  // ===============================
  // Utility Methods
  // ===============================

  /**
   * Get user's full name
   */
  getFullName(user: User): string {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    } else if (user.name) {
      return user.name
    } else {
      return user.email
    }
  },

  /**
   * Get user's display name (shorter version)
   */
  getDisplayName(user: User): string {
    if (user.first_name) {
      return user.first_name
    } else if (user.name) {
      // Extract first name from full name
      return user.name.split(' ')[0]
    } else {
      return user.email.split('@')[0]
    }
  },

  /**
   * Get user's initials for avatar placeholder
   */
  getInitials(user: User): string {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    } else if (user.name) {
      const names = user.name.split(' ')
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase()
      } else {
        return names[0][0].toUpperCase()
      }
    } else {
      return user.email[0].toUpperCase()
    }
  },

  /**
   * Get role display name
   */
  getRoleDisplay(role: string): string {
    const roleMap: Record<string, string> = {
      'user': 'User',
      'admin': 'Administrator',
      'super_admin': 'Super Admin',
      'barber': 'Barber',
      'manager': 'Manager',
      'owner': 'Owner',
      'receptionist': 'Receptionist',
      'viewer': 'Viewer'
    }
    
    return roleMap[role] || role
  },

  /**
   * Check if user has specific permission
   */
  hasPermission(user: User, permission: string): boolean {
    const rolePermissions: Record<string, string[]> = {
      'super_admin': ['*'], // All permissions
      'admin': ['manage_users', 'manage_settings', 'view_analytics', 'manage_bookings'],
      'owner': ['manage_staff', 'view_analytics', 'manage_bookings', 'manage_services'],
      'manager': ['view_analytics', 'manage_bookings', 'manage_clients'],
      'barber': ['manage_bookings', 'view_own_analytics'],
      'receptionist': ['manage_bookings', 'manage_clients'],
      'user': ['manage_own_bookings'],
      'viewer': ['view_basic_info']
    }
    
    const userRole = user.unified_role || user.role || 'user'
    const permissions = rolePermissions[userRole] || []
    
    return permissions.includes('*') || permissions.includes(permission)
  },

  /**
   * Check if user is admin or higher
   */
  isAdmin(user: User): boolean {
    const adminRoles = ['admin', 'super_admin']
    const userRole = user.unified_role || user.role || 'user'
    return adminRoles.includes(userRole)
  },

  /**
   * Check if user is barber
   */
  isBarber(user: User): boolean {
    return user.user_type === 'barber' || (user.unified_role || user.role) === 'barber'
  },

  /**
   * Get user status based on activity
   */
  getUserStatus(user: User): 'active' | 'inactive' | 'pending' | 'suspended' {
    if (!user.is_active) {
      return 'suspended'
    } else if (!user.email_verified) {
      return 'pending'
    } else {
      return 'active'
    }
  },

  /**
   * Calculate user tenure
   */
  getUserTenure(user: User): { years: number; months: number; days: number } {
    const createdDate = new Date(user.created_at)
    const now = new Date()
    
    let years = now.getFullYear() - createdDate.getFullYear()
    let months = now.getMonth() - createdDate.getMonth()
    let days = now.getDate() - createdDate.getDate()
    
    if (days < 0) {
      months--
      const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      days += lastMonth.getDate()
    }
    
    if (months < 0) {
      years--
      months += 12
    }
    
    return { years, months, days }
  },

  /**
   * Format user tenure for display
   */
  formatTenure(user: User): string {
    const tenure = this.getUserTenure(user)
    
    if (tenure.years > 0) {
      return `${tenure.years} year${tenure.years === 1 ? '' : 's'}`
    } else if (tenure.months > 0) {
      return `${tenure.months} month${tenure.months === 1 ? '' : 's'}`
    } else {
      return `${tenure.days} day${tenure.days === 1 ? '' : 's'}`
    }
  },

  /**
   * Get onboarding progress percentage
   */
  getOnboardingProgress(user: User): number {
    if (user.onboarding_completed) {
      return 100
    }
    
    const completedSteps = user.onboarding_status?.completed_steps || []
    const totalSteps = 5 // Assume 5 total onboarding steps
    
    return Math.round((completedSteps.length / totalSteps) * 100)
  },

  /**
   * Check if user timezone is set
   */
  hasTimezoneSet(user: User): boolean {
    return !!user.timezone && user.timezone !== 'UTC'
  },

  /**
   * Get user's local time
   */
  getUserLocalTime(user: User): Date | null {
    if (!user.timezone) return null
    
    try {
      return new Date(new Date().toLocaleString('en-US', { timeZone: user.timezone }))
    } catch (error) {
      return null
    }
  }
}

export default usersApi

// Export individual functions for direct imports
export const {
  getCurrentUser,
  updateProfile,
  getUserTimezone,
  updateTimezone,
  updateOnboardingStatus,
  getUsers,
  updateUserRole,
  getUser,
  deleteUser,
  getUserPreferences,
  updateUserPreferences,
  getUserAnalytics,
  getUserActivity,
  getUserSessions,
  revokeSession,
  revokeAllOtherSessions,
  uploadAvatar,
  removeAvatar
} = usersApi

// Alias for compatibility
export const getProfile = usersApi.getCurrentUser