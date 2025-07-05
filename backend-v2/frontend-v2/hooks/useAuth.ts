'use client'

import { useState, useEffect, useCallback } from 'react'
import { getProfile, logout as apiLogout, type User } from '@/lib/api'

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// Global auth state to prevent multiple simultaneous checks
let globalAuthState = {
  user: null as User | null,
  isLoading: true,
  error: null as string | null,
  isChecking: false,
  hasChecked: false
}

let authStateListeners: Array<(state: typeof globalAuthState) => void> = []

/**
 * Simple authentication hook with singleton pattern to prevent loops
 * Checks authentication state and provides logout functionality
 */
export function useAuth(): AuthState & { logout: () => Promise<void> } {
  const [localState, setLocalState] = useState(globalAuthState)

  useEffect(() => {
    // Subscribe to global auth state changes
    const updateLocalState = (newState: typeof globalAuthState) => {
      setLocalState({ ...newState })
    }
    
    authStateListeners.push(updateLocalState)
    
    // If we haven't checked auth yet and we're not already checking, do it now
    if (!globalAuthState.hasChecked && !globalAuthState.isChecking) {
      checkAuthState()
    }
    
    return () => {
      authStateListeners = authStateListeners.filter(listener => listener !== updateLocalState)
    }
  }, [])

  const updateGlobalState = useCallback((updates: Partial<typeof globalAuthState>) => {
    globalAuthState = { ...globalAuthState, ...updates }
    authStateListeners.forEach(listener => listener(globalAuthState))
  }, [])

  const checkAuthState = async () => {
    if (globalAuthState.isChecking) {
      console.log('🔍 checkAuthState: Already checking, skipping')
      return
    }
    
    console.log('🔍 checkAuthState: Starting enhanced authentication check')
    
    updateGlobalState({ isChecking: true, isLoading: true, error: null })
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('🔍 checkAuthState: Auth check timeout after 5s')
      updateGlobalState({ user: null, isLoading: false, isChecking: false, hasChecked: true })
    }, 5000)
    
    try {
      
      // Check if we have a token first
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      console.log('🔍 checkAuthState: Token present:', !!token)
      
      if (!token) {
        console.log('🔍 checkAuthState: No token, ensuring clean state')
        // Also clear any stale cookies
        if (typeof window !== 'undefined') {
          document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=strict'
        }
        updateGlobalState({ user: null, isLoading: false, isChecking: false, hasChecked: true })
        clearTimeout(timeoutId)
        return
      }

      console.log('🔍 checkAuthState: Token found, validating with API')
      
      // Make a direct API call to validate the token
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const userData = await response.json()
        console.log('🔍 checkAuthState: Token valid, user authenticated:', userData)
        // Ensure cookie is set for middleware
        if (typeof window !== 'undefined') {
          document.cookie = `token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=strict`
        }
        updateGlobalState({ user: userData, isLoading: false, isChecking: false, hasChecked: true })
      } else if (response.status === 401 || response.status === 403) {
        console.log('🔍 checkAuthState: Token invalid/expired, clearing all auth storage')
        // Clear all token storage locations
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
          // Clear cookie as well
          document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=strict'
        }
        updateGlobalState({ user: null, isLoading: false, isChecking: false, hasChecked: true })
      } else {
        console.warn('🔍 checkAuthState: API call failed with status:', response.status)
        // Don't clear tokens for server errors, just set user to null
        updateGlobalState({ user: null, isLoading: false, isChecking: false, hasChecked: true })
      }
    } catch (error) {
      console.warn('🔍 checkAuthState: Auth check failed:', error)
      
      // Clear tokens on network/auth errors
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=strict'
      }
      updateGlobalState({ user: null, isLoading: false, isChecking: false, hasChecked: true })
    } finally {
      clearTimeout(timeoutId)
      console.log('🔍 checkAuthState: Auth check complete, loading finished')
    }
  }

  const logout = async () => {
    try {
      console.log('🔓 logout: Starting logout process')
      await apiLogout()
      updateGlobalState({ user: null, error: null })
      
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
      updateGlobalState({ error: 'Logout failed' })
      
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

  return {
    user: localState.user,
    isAuthenticated: !!localState.user,
    isLoading: localState.isLoading,
    error: localState.error,
    logout
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