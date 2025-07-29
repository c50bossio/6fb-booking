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
    // SIMPLIFIED: Just check if we have tokens and verify auth state
    if (typeof window !== 'undefined') {
      const hasTokens = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('refresh_token')
      if (!hasTokens) {
        setUser(null)
        setIsLoading(false)
        return
      }
    }
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
      // Check if we have a token first (try new naming, fall back to legacy)
      const token = localStorage.getItem('access_token') || localStorage.getItem('token')
      
      if (!token) {
        setUser(null)
        setIsLoading(false)
        return
      }

      // REASONABLE RATE LIMITING: Only prevent excessive requests (reduced from 5 seconds to 1 second)
      const lastCheck = localStorage.getItem('auth_last_check')
      const now = Date.now()
      if (lastCheck && (now - parseInt(lastCheck)) < 1000) {
        // Skip if checked within last 1 second (much more reasonable)
        setIsLoading(false)
        return
      }
      localStorage.setItem('auth_last_check', now.toString())

      
      // Make API call to validate token - with reasonable timeout
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      try {
        const response = await fetch(`${API_URL}/api/v2/auth/me`, {
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
          // Clear invalid tokens (but allow retry - don't permanently block user)
          localStorage.removeItem('access_token')
          localStorage.removeItem('token') // Legacy cleanup
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
          document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=lax'
          document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=lax'
          document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=lax' // Legacy cleanup
          
          // REMOVED: Don't permanently block user - they should be able to login again
          
          setUser(null)
          setError(null)
        } else {
          console.warn('🔍 useAuth: ⚠️ API error (status:', response.status, '), keeping tokens')
          // Don't clear tokens for server errors, just set user to null
          setUser(null)
          setError('api_error')
        }
      } catch (fetchError) {
        console.warn('🔍 useAuth: 🌐 Network error:', fetchError)
        // For network errors, don't clear tokens but set user to null
        setUser(null)
        setError('network_error')
      }
    } catch (error) {
      console.warn('🔍 useAuth: 💥 Auth check failed:', error)
      setUser(null)
      setError(error instanceof Error ? error.message : 'unknown_error')
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      // REASONABLE PROTECTION: Prevent rapid logout calls (reduced to 500ms)
      const lastLogout = localStorage.getItem('auth_last_logout')
      const now = Date.now()
      if (lastLogout && (now - parseInt(lastLogout)) < 500) {
        console.log('🔄 useAuth: Logout called too frequently, skipping')
        return
      }
      localStorage.setItem('auth_last_logout', now.toString())

      await apiLogout()
      setUser(null)
      setError(null)
      
      // Ensure complete cleanup of all auth storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token')
        localStorage.removeItem('token') // Legacy cleanup
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        // Clear session storage too
        sessionStorage.clear()
        // Clear auth cookies with correct names
        document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=lax'
        document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=lax'
        document.cookie = 'csrf_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=lax'
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=lax' // Legacy cleanup
      }
      
      // Redirect to homepage after logout
      if (typeof window !== 'undefined') {
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
      // REASONABLE PROTECTION: Prevent rapid refresh calls (reduced to 2 seconds)
      const lastRefresh = localStorage.getItem('auth_last_refresh')
      const now = Date.now()
      if (lastRefresh && (now - parseInt(lastRefresh)) < 2000) {
        console.log('🔄 useAuth: Refresh called too frequently, skipping')
        throw new Error('Refresh called too frequently')
      }
      localStorage.setItem('auth_last_refresh', now.toString())
      
      const refreshTokenValue = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null
      if (!refreshTokenValue) {
        throw new Error('No refresh token available')
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${API_URL}/api/v2/auth/refresh`, {
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
          // Update cookies with correct names that match backend/middleware expectations
          document.cookie = `access_token=${data.access_token}; path=/; max-age=${15 * 60}; samesite=lax`
          document.cookie = `refresh_token=${data.refresh_token}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`
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
    
    if (typeof window !== 'undefined') {
      // Store tokens in localStorage with correct names
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
      
      // Clear auth disabled flag on successful login
      localStorage.removeItem('auth_disabled')
      
      // Set cookies with correct names that match backend/middleware expectations
      document.cookie = `access_token=${accessToken}; path=/; max-age=${15 * 60}; samesite=lax`
      document.cookie = `refresh_token=${refreshToken}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`
      
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