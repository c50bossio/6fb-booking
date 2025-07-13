'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User } from '@/lib/api/auth'

// ===============================
// Types and Interfaces
// ===============================

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (userData: any) => Promise<void>
  refreshAuth: () => Promise<void>
  clearError: () => void
  
  // Token management
  getToken: () => string | null
  hasValidToken: () => boolean
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// ===============================
// Context Creation
// ===============================

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ===============================
// Authentication Provider
// ===============================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  })

  // Refs to prevent race conditions
  const isCheckingAuth = useRef(false)
  const hasInitialized = useRef(false)
  const refreshTimer = useRef<NodeJS.Timeout | null>(null)

  // ===============================
  // Token Management
  // ===============================

  const getToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('access_token')
  }, [])

  const getRefreshToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('refresh_token')
  }, [])

  const hasValidToken = useCallback((): boolean => {
    const token = getToken()
    if (!token) return false
    
    try {
      // Basic JWT validation (check expiry)
      const payload = JSON.parse(atob(token.split('.')[1]))
      const now = Date.now() / 1000
      return payload.exp > now
    } catch (error) {
      console.warn('Invalid token format:', error)
      return false
    }
  }, [getToken])

  const setTokens = useCallback((accessToken: string, refreshToken?: string) => {
    if (typeof window === 'undefined') return
    
    localStorage.setItem('access_token', accessToken)
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken)
    }
    
    // Set cookie for middleware
    document.cookie = `token=${accessToken}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=strict`
  }, [])

  const clearTokens = useCallback(() => {
    if (typeof window === 'undefined') return
    
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    sessionStorage.clear()
    
    // Clear cookie
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=strict'
  }, [])

  // ===============================
  // API Helper Functions
  // ===============================

  const makeAuthRequest = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const token = getToken()
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    }

    const response = await fetch(`${API_URL}${endpoint}`, config)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(errorData.detail || `Request failed with status ${response.status}`)
    }

    return response.json()
  }, [getToken])

  // ===============================
  // Token Refresh Logic
  // ===============================

  const refreshTokens = useCallback(async (): Promise<boolean> => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      console.warn('No refresh token available')
      return false
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTokens(data.access_token, data.refresh_token)
        console.log('✅ Token refreshed successfully')
        return true
      } else {
        console.warn('Token refresh failed:', response.status)
        return false
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      return false
    }
  }, [getRefreshToken, setTokens])

  // ===============================
  // Authentication Check
  // ===============================

  const checkAuthState = useCallback(async () => {
    if (isCheckingAuth.current) {
      console.log('🔍 Auth check already in progress, skipping')
      return
    }

    isCheckingAuth.current = true
    console.log('🔍 Starting auth state check')

    try {
      const token = getToken()
      
      if (!token) {
        console.log('🔍 No token found, user not authenticated')
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        })
        clearTokens()
        return
      }

      // Check if token is expired
      if (!hasValidToken()) {
        console.log('🔍 Token expired, attempting refresh')
        const refreshSuccess = await refreshTokens()
        
        if (!refreshSuccess) {
          console.log('🔍 Token refresh failed, clearing auth state')
          setState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          })
          clearTokens()
          return
        }
      }

      // Validate token with server
      console.log('🔍 Validating token with server')
      const userData = await makeAuthRequest('/api/v1/auth/me')
      
      console.log('✅ Auth check successful, user authenticated')
      setState({
        user: userData,
        isAuthenticated: true,
        isLoading: false,
        error: null
      })

    } catch (error) {
      console.error('🚨 Auth check failed:', error)
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      })
      clearTokens()
    } finally {
      isCheckingAuth.current = false
      hasInitialized.current = true
    }
  }, [getToken, hasValidToken, refreshTokens, makeAuthRequest, clearTokens])

  // ===============================
  // Auto Token Refresh
  // ===============================

  const scheduleTokenRefresh = useCallback(() => {
    const token = getToken()
    if (!token) return

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const expiresAt = payload.exp * 1000 // Convert to milliseconds
      const now = Date.now()
      
      // Refresh 5 minutes before expiry
      const refreshAt = expiresAt - (5 * 60 * 1000)
      const delay = Math.max(0, refreshAt - now)

      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current)
      }

      refreshTimer.current = setTimeout(async () => {
        console.log('🔄 Auto-refreshing token')
        await refreshTokens()
        scheduleTokenRefresh() // Schedule next refresh
      }, delay)

      console.log(`🕒 Token refresh scheduled in ${Math.round(delay / 1000)}s`)
    } catch (error) {
      console.warn('Failed to schedule token refresh:', error)
    }
  }, [getToken, refreshTokens])

  // ===============================
  // Authentication Actions
  // ===============================

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Login failed')
      }

      const data = await response.json()
      setTokens(data.access_token, data.refresh_token)
      
      // Get user profile after successful login
      const userData = await makeAuthRequest('/api/v1/auth/me')
      
      setState({
        user: userData,
        isAuthenticated: true,
        isLoading: false,
        error: null
      })

      scheduleTokenRefresh()
      console.log('✅ Login successful')
      
    } catch (error) {
      console.error('🚨 Login failed:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed'
      }))
      clearTokens()
    }
  }, [setTokens, makeAuthRequest, scheduleTokenRefresh, clearTokens])

  const logout = useCallback(async () => {
    console.log('🔓 Starting logout process')
    
    setState(prev => ({ ...prev, isLoading: true }))

    try {
      // Attempt to logout on server
      await makeAuthRequest('/api/v1/auth/logout', { method: 'POST' })
    } catch (error) {
      console.warn('Server logout failed:', error)
      // Continue with local logout even if server fails
    }

    // Clear local state regardless of server response
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    })

    clearTokens()
    
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current)
      refreshTimer.current = null
    }

    console.log('✅ Logout complete, redirecting to home')
    
    // Redirect to home page
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }, [makeAuthRequest, clearTokens])

  const register = useCallback(async (userData: {
    email: string
    password: string
    name: string
    user_type: string
  }) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Registration failed')
      }

      const data = await response.json()
      setTokens(data.access_token, data.refresh_token)
      
      // Get user profile after successful registration
      const userProfile = await makeAuthRequest('/api/v1/auth/me')
      
      setState({
        user: userProfile,
        isAuthenticated: true,
        isLoading: false,
        error: null
      })

      scheduleTokenRefresh()
      console.log('✅ Registration successful')
      
    } catch (error) {
      console.error('🚨 Registration failed:', error)
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      }))
      clearTokens()
    }
  }, [setTokens, makeAuthRequest, scheduleTokenRefresh, clearTokens])

  const refreshAuth = useCallback(async () => {
    await checkAuthState()
  }, [checkAuthState])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // ===============================
  // Effects
  // ===============================

  // Initialize auth state on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      checkAuthState()
    }
  }, [checkAuthState])

  // Set up token refresh when user is authenticated
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      scheduleTokenRefresh()
    }

    return () => {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current)
      }
    }
  }, [state.isAuthenticated, state.user, scheduleTokenRefresh])

  // Handle visibility change (refresh auth when tab becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && state.isAuthenticated) {
        console.log('🔍 Tab became visible, checking auth state')
        checkAuthState()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [state.isAuthenticated, checkAuthState])

  // ===============================
  // Context Value
  // ===============================

  const contextValue: AuthContextType = {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    
    login,
    logout,
    register,
    refreshAuth,
    clearError,
    
    getToken,
    hasValidToken
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// ===============================
// Custom Hook
// ===============================

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

// ===============================
// Utility Hooks
// ===============================

/**
 * Hook for components that need authentication but can gracefully degrade
 */
export function useOptionalAuth(): AuthContextType | null {
  try {
    return useAuthContext()
  } catch (error) {
    return null
  }
}

/**
 * Hook that throws if user is not authenticated (for protected routes)
 */
export function useRequiredAuth(): AuthContextType {
  const auth = useAuthContext()
  
  if (!auth.isAuthenticated && !auth.isLoading) {
    throw new Error('Authentication required')
  }
  
  return auth
}

/**
 * Simple hook to check if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const auth = useOptionalAuth()
  return auth?.isAuthenticated ?? false
}