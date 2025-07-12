/**
 * Mock Authentication System for Staging Environment
 * Provides realistic authentication behavior without backend dependencies
 */

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'barber' | 'shop_owner' | 'admin'
  avatar?: string
  createdAt: string
  preferences?: {
    timezone: string
    notifications: boolean
    theme: 'light' | 'dark'
  }
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

// Mock users for demo
const MOCK_USERS: Record<string, { password: string; user: User }> = {
  'admin@bookedbarber.com': {
    password: 'password123',
    user: {
      id: 'user_1',
      email: 'admin@bookedbarber.com',
      firstName: 'Alex',
      lastName: 'Thompson',
      role: 'shop_owner',
      createdAt: new Date().toISOString(),
      preferences: {
        timezone: 'America/New_York',
        notifications: true,
        theme: 'light'
      }
    }
  },
  'barber@bookedbarber.com': {
    password: 'demo123',
    user: {
      id: 'user_2',
      email: 'barber@bookedbarber.com',
      firstName: 'Jordan',
      lastName: 'Martinez',
      role: 'barber',
      createdAt: new Date().toISOString(),
      preferences: {
        timezone: 'America/New_York',
        notifications: true,
        theme: 'light'
      }
    }
  },
  'demo@example.com': {
    password: 'demo',
    user: {
      id: 'user_3',
      email: 'demo@example.com',
      firstName: 'Demo',
      lastName: 'User',
      role: 'barber',
      createdAt: new Date().toISOString(),
      preferences: {
        timezone: 'America/New_York',
        notifications: true,
        theme: 'light'
      }
    }
  }
}

// Session storage keys
const SESSION_KEY = 'bookedbarber_session'
const USER_KEY = 'bookedbarber_user'

// Mock auth service
export const authService = {
  // Mock login with realistic delay
  async login(email: string, password: string): Promise<User> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400))
    
    const mockUser = MOCK_USERS[email.toLowerCase()]
    
    if (!mockUser || mockUser.password !== password) {
      throw new Error('Invalid email or password')
    }
    
    // Simulate occasional network issues for realism
    if (Math.random() < 0.05) { // 5% chance
      throw new Error('Network error. Please try again.')
    }
    
    // Store session
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_KEY, 'authenticated')
      localStorage.setItem(USER_KEY, JSON.stringify(mockUser.user))
    }
    
    return mockUser.user
  },

  // Mock register
  async register(userData: {
    email: string
    password: string
    firstName: string
    lastName: string
    role?: 'barber' | 'shop_owner'
  }): Promise<User> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 600))
    
    // Check if user already exists
    if (MOCK_USERS[userData.email.toLowerCase()]) {
      throw new Error('An account with this email already exists')
    }
    
    // Simulate validation
    if (userData.password.length < 6) {
      throw new Error('Password must be at least 6 characters long')
    }
    
    // Create new user
    const newUser: User = {
      id: `user_${Date.now()}`,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role || 'barber',
      createdAt: new Date().toISOString(),
      preferences: {
        timezone: 'America/New_York',
        notifications: true,
        theme: 'light'
      }
    }
    
    // Add to mock users (in real app this would go to database)
    MOCK_USERS[userData.email.toLowerCase()] = {
      password: userData.password,
      user: newUser
    }
    
    // Store session
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_KEY, 'authenticated')
      localStorage.setItem(USER_KEY, JSON.stringify(newUser))
    }
    
    return newUser
  },

  // Logout
  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(USER_KEY)
    }
  },

  // Get current session
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null
    
    const session = localStorage.getItem(SESSION_KEY)
    const userStr = localStorage.getItem(USER_KEY)
    
    if (session === 'authenticated' && userStr) {
      try {
        return JSON.parse(userStr)
      } catch {
        return null
      }
    }
    
    return null
  },

  // Check if authenticated
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(SESSION_KEY) === 'authenticated'
  },

  // Mock forgot password
  async forgotPassword(email: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (!MOCK_USERS[email.toLowerCase()]) {
      throw new Error('No account found with this email address')
    }
    
    // In a real app, this would send an email
    console.log(`Password reset email sent to ${email}`)
  },

  // Mock reset password
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 800))
    
    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long')
    }
    
    // In a real app, this would verify the token and update the password
    console.log('Password reset successfully')
  }
}