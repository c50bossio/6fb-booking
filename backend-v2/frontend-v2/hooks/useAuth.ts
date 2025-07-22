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
      console.log('🔍 useAuth: Server-side rendering, skipping auth check')
      return
    }
    
    console.log('🔍 useAuth: ============ STARTING AUTH CHECK ============')
    console.log('🔍 useAuth: Current state - user:', !!user, 'loading:', isLoading, 'error:', error)
    setIsLoading(true)
    setError(null)
    
    try {
      // Check if we have a token first
      const token = localStorage.getItem('token')
      console.log('🔍 useAuth: Token present:', !!token)
      
      if (!token) {
        console.log('🔍 useAuth: ❌ No token found, user not authenticated')
        console.log('🔍 useAuth: Setting state - user: null, loading: false, error: null')
        setUser(null)
        setIsLoading(false)
        console.log('🔍 useAuth: ============ AUTH CHECK COMPLETE (NO TOKEN) ============')
        return
      }

      console.log('🔍 useAuth: Token found, validating with API')
      
      // Make API call to validate token - with reasonable timeout
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      try {
        const response = await fetch(`${API_URL}/api/v2/auth-simple/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000) // Increased to 5 second timeout to prevent status 0 errors
        })

        if (response.ok) {
          const userData = await response.json()
          console.log('🔍 useAuth: ✅ Token valid, user authenticated:', userData.email || userData.id)
          console.log('🔍 useAuth: Setting state - user: authenticated, loading: false, error: null')
          setUser(userData)
          setError(null)
        } else if (response.status === 401 || response.status === 403) {
          console.log('🔍 useAuth: ❌ Token invalid/expired (status:', response.status, '), clearing storage')
          // Clear invalid tokens
          localStorage.removeItem('token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
          document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=strict'
          console.log('🔍 useAuth: Setting state - user: null, loading: false, error: null')
          setUser(null)
          setError(null)
        } else {
          console.warn('🔍 useAuth: ⚠️ API error (status:', response.status, '), keeping tokens')
          console.log('🔍 useAuth: Setting state - user: null, loading: false, error: api_error')
          // Don't clear tokens for server errors, just set user to null
          setUser(null)
          setError('api_error')
        }
      } catch (fetchError) {
        console.warn('🔍 useAuth: 🌐 Network error:', fetchError)
        console.log('🔍 useAuth: Setting state - user: null, loading: false, error: network_error')
        // For network errors, don't clear tokens but set user to null
        setUser(null)
        setError('network_error')
      }
    } catch (error) {
      console.warn('🔍 useAuth: 💥 Auth check failed:', error)
      console.log('🔍 useAuth: Setting state - user: null, loading: false, error:', error instanceof Error ? error.message : 'unknown_error')
      setUser(null)
      setError(error instanceof Error ? error.message : 'unknown_error')
    } finally {
      setIsLoading(false)
      console.log('🔍 useAuth: ============ AUTH CHECK COMPLETE ============')
    }
  }

  const logout = async () => {
    try {
      console.log('🔓 logout: Starting logout process')
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
        console.log('🔓 logout: All auth storage cleared')
      }
      
      // Redirect to homepage after logout
      if (typeof window !== 'undefined') {
        console.log('🔓 logout: Redirecting to homepage')
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Logout failed:', error)
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
      console.log('🔄 refreshToken: Starting token refresh')
      
      const refreshTokenValue = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null
      if (!refreshTokenValue) {
        throw new Error('No refresh token available')
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${API_URL}/api/v2/auth-simple/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshTokenValue })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('🔄 refreshToken: Token refreshed successfully')
        
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
      console.error('🔄 refreshToken: Refresh failed:', error)
      // If refresh fails, logout user
      await logout()
      throw error
    }
  }

  const setAuthTokens = (accessToken: string, refreshToken: string) => {
    console.log('🔐 setAuthTokens: Storing new auth tokens')
    
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