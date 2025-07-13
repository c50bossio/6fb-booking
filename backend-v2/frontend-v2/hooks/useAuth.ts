'use client'

import { useState, useEffect, useCallback } from 'react'
import { getProfile, logout as apiLogout, type User } from '@/lib/api'
import { tokenManager, isTokenValid, getValidToken, clearTokens } from '@/lib/tokenManager'

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
      // Use token manager to get valid token (with automatic refresh)
      const token = await getValidToken()
      
      if (!token) {
        console.log('🔍 checkAuthState: No valid token available')
        clearTokens()
        updateGlobalState({ user: null, isLoading: false, isChecking: false, hasChecked: true })
        clearTimeout(timeoutId)
        return
      }

      console.log('🔍 checkAuthState: Valid token obtained, fetching user profile')
      
      // Get user profile using the enhanced API with retry logic
      const userData = await getProfile()
      
      console.log('🔍 checkAuthState: User profile fetched successfully')
      updateGlobalState({ user: userData, isLoading: false, isChecking: false, hasChecked: true })
      
    } catch (error) {
      console.warn('🔍 checkAuthState: Auth check failed:', error)
      
      // Clear tokens and update state
      clearTokens()
      
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
      updateGlobalState({ 
        user: null, 
        isLoading: false, 
        isChecking: false, 
        hasChecked: true,
        error: errorMessage
      })
    } finally {
      clearTimeout(timeoutId)
      console.log('🔍 checkAuthState: Auth check complete')
    }
  }

  const logout = async () => {
    try {
      console.log('🔓 logout: Starting logout process')
      await apiLogout()
      
      // Use token manager for complete cleanup
      clearTokens()
      
      updateGlobalState({ 
        user: null, 
        error: null, 
        isLoading: false, 
        isChecking: false, 
        hasChecked: true 
      })
      
      console.log('🔓 logout: All auth storage cleared')
      
      // Redirect to homepage after logout
      if (typeof window !== 'undefined') {
        console.log('🔓 logout: Redirecting to homepage')
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Logout failed:', error)
      
      // Even if API logout fails, clear local storage
      clearTokens()
      
      updateGlobalState({ 
        user: null, 
        error: 'Logout failed',
        isLoading: false, 
        isChecking: false, 
        hasChecked: true 
      })
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
  return isTokenValid()
}