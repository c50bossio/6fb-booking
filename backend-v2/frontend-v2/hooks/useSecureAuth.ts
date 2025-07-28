'use client'

import { useState, useEffect, useCallback } from 'react'
import { secureAuth } from '@/lib/secure-auth'

export interface User {
  id: number
  email: string
  name: string
  role: string
  unified_role: string
  is_active: boolean
  email_verified: boolean
  phone?: string
  timezone?: string
  onboarding_completed?: boolean
  onboarding_status?: string
  is_new_user?: boolean
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

/**
 * Secure authentication hook using HttpOnly cookies
 * 
 * This hook replaces the old localStorage-based authentication with
 * secure cookie-based authentication to prevent XSS attacks.
 * 
 * SECURITY FEATURES:
 * - No localStorage access - all tokens in HttpOnly cookies
 * - Automatic CSRF protection
 * - Automatic token refresh
 * - Secure session management
 */
export function useSecureAuth(): AuthState & { 
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  register: (userData: any) => Promise<void>
} {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Check authentication state on component mount
   */
  useEffect(() => {
    checkAuthState()
  }, [])

  /**
   * Check if user is authenticated and get user data
   */
  const checkAuthState = useCallback(async () => {
    if (typeof window === 'undefined') {
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      const userData = await secureAuth.getCurrentUser()
      setUser(userData)
    } catch (error) {
      // User not authenticated or token expired
      setUser(null)
      // Don't set error for normal unauthenticated state
      if (error instanceof Error && !error.message.includes('401')) {
        setError(error.message)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Login user with email and password
   */
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const userData = await secureAuth.login({ email, password })
      setUser(userData)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      setError(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Logout user and clear authentication state
   */
  const logout = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      await secureAuth.logout()
    } catch (error) {
      console.warn('Logout error:', error)
    } finally {
      setUser(null)
      setIsLoading(false)
    }
  }, [])

  /**
   * Refresh authentication token
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const success = await secureAuth.refreshToken()
      if (success) {
        // Refresh user data after successful token refresh
        await checkAuthState()
      }
      return success
    } catch (error) {
      console.error('Token refresh error:', error)
      return false
    }
  }, [checkAuthState])

  /**
   * Change user password
   */
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    setError(null)
    
    try {
      await secureAuth.changePassword(currentPassword, newPassword)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password change failed'
      setError(errorMessage)
      throw error
    }
  }, [])

  /**
   * Register new user
   */
  const register = useCallback(async (userData: any) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const newUser = await secureAuth.register(userData)
      setUser(newUser)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed'
      setError(errorMessage)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    refreshToken,
    changePassword,
    register,
  }
}

// Legacy hook for backward compatibility - with deprecation warning
export function useAuth() {
  console.warn('⚠️ useAuth is deprecated for security reasons. Please use useSecureAuth instead.')
  return useSecureAuth()
}