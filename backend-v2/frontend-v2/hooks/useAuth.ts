'use client'

import { useState, useEffect } from 'react'
import { logout as apiLogout, type User } from '@/lib/api'

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

/**
 * Simplified authentication hook without complex global state
 * Checks authentication state efficiently and provides logout functionality
 */
export function useAuth(): AuthState & { logout: () => Promise<void>, refreshToken: () => Promise<void>, setAuthTokens: (accessToken: string, refreshToken: string) => void } {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuthState()
  }, [])

  const checkAuthState = async () => {
    // Quick check - if already loading or no window, skip
    if (typeof window === 'undefined') {
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Check if we have a token first
      const token = localStorage.getItem('token')
      if (!token) {
        setUser(null)
        setIsLoading(false)
        ============')
        return
      }

      // Make API call to validate token - with reasonable timeout
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      try {
        const response = await fetch(`${API_URL}/api/v1/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(2000) // 2 second timeout
        })

        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
          setError(null)
        } else if (response.status === 401 || response.status === 403) {
          , clearing storage')
          // Clear invalid tokens
          localStorage.removeItem('token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
          document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=strict'
          setUser(null)
          setError(null)
        } else {
          , keeping tokens')
          // Don't clear tokens for server errors, just set user to null
          setUser(null)
          setError('api_error')
        }
      } catch (fetchError) {
        // For network errors, don't clear tokens but set user to null
        setUser(null)
        setError('network_error')
      }
    } catch (error) {
      setUser(null)
      setError(error instanceof Error ? error.message : 'unknown_error')
    } finally {
      setIsLoading(false)
      }
  }

  const logout = async () => {
    try {
      await apiLogout()
      setUser(null)
      setError(null)
      
      // Ensure complete cleanup of all auth storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        // Clear session storage too
        sessionStorage.clear()
        // Clear auth cookie
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=strict'
        }
      
      // Redirect to homepage after logout
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    } catch (error) {
      setError('Logout failed')
      
      // Even if API logout fails, clear local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        sessionStorage.clear()
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=strict'
      }
    }
  }

  const refreshToken = async () => {
    try {
      const refreshTokenValue = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null
      if (!refreshTokenValue) {
        throw new Error('No refresh token available')
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshTokenValue })
      })

      if (response.ok) {
        const data = await response.json()
        // Update stored tokens
        if (typeof window !== 'undefined' && data.access_token) {
          localStorage.setItem('token', data.access_token)
          if (data.refresh_token) {
            localStorage.setItem('refresh_token', data.refresh_token)
          }
          // Update cookie as well
          document.cookie = `token=${data.access_token}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=strict`
        }
        
        // Re-check auth state to update user
        await checkAuthState()
      } else {
        throw new Error(`Token refresh failed: ${response.status}`)
      }
    } catch (error) {
      // If refresh fails, logout user
      await logout()
      throw error
    }
  }

  const setAuthTokens = (accessToken: string, refreshToken: string) => {
    if (typeof window !== 'undefined') {
      // Store tokens in localStorage
      localStorage.setItem('token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
      
      // Also set the auth cookie for middleware
      document.cookie = `token=${accessToken}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=strict`
      
      // Trigger auth state check to update user profile
      checkAuthState()
    }
  }

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    logout,
    refreshToken,
    setAuthTokens
  }
}

/**
 * Simple sync check for authentication state
 * Use this for quick checks without loading state
 */
export function isAuthenticatedSync(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('token')
}