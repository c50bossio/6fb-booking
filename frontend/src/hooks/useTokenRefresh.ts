'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { authService } from '@/lib/api/auth'
import { smartStorage } from '@/lib/utils/storage'
import {
  isTokenExpired,
  isTokenExpiringWithin,
  getTokenTimeRemaining,
  TOKEN_REFRESH_THRESHOLD,
  TOKEN_VALIDATION_INTERVAL
} from '@/lib/utils/tokenUtils'

interface UseTokenRefreshOptions {
  checkInterval?: number // milliseconds
  onRefreshSuccess?: () => void
  onRefreshError?: (error: Error) => void
  enabled?: boolean
  proactiveRefresh?: boolean // Enable proactive refresh before expiry
}

interface UseTokenRefreshReturn {
  refreshNow: () => Promise<boolean>
  validateAndRefresh: () => Promise<boolean> // New method for API calls
  isRefreshing: boolean
  lastRefresh: Date | null
  refreshError: Error | null
  tokenTimeRemaining: number
  isTokenExpiring: boolean
}

export function useTokenRefresh(options: UseTokenRefreshOptions = {}): UseTokenRefreshReturn {
  const {
    checkInterval = TOKEN_VALIDATION_INTERVAL, // 30 seconds default for more frequent checks
    onRefreshSuccess,
    onRefreshError,
    enabled = true,
    proactiveRefresh = true
  } = options

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [refreshError, setRefreshError] = useState<Error | null>(null)
  const [tokenTimeRemaining, setTokenTimeRemaining] = useState<number>(0)
  const [isTokenExpiring, setIsTokenExpiring] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null)

  const refreshNow = useCallback(async (): Promise<boolean> => {
    // If already refreshing, return the existing promise
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current
    }

    // Create a new refresh promise
    refreshPromiseRef.current = (async () => {
      setIsRefreshing(true)
      setRefreshError(null)

      try {
        // Check if we have a current token
        if (!authService.isAuthenticated()) {
          console.log('[useTokenRefresh] No token found, skipping refresh')
          return false
        }

        // Get current token and check its status
        const token = smartStorage.getItem('access_token')
        if (!token) {
          console.log('[useTokenRefresh] Token not found in storage')
          return false
        }

        // Check if token is expired or expiring soon
        const isExpired = isTokenExpired(token)
        const isExpiring = isTokenExpiringWithin(token, TOKEN_REFRESH_THRESHOLD)

        if (!isExpired && !isExpiring) {
          console.log('[useTokenRefresh] Token is still valid and not expiring soon')
          setLastRefresh(new Date())
          onRefreshSuccess?.()
          return true
        }

        console.log('[useTokenRefresh] Token expired or expiring, attempting refresh...', {
          isExpired,
          isExpiring,
          timeRemaining: getTokenTimeRemaining(token)
        })

        // Try to get fresh user data (this will trigger token refresh if needed)
        const user = await authService.getCurrentUser()

        if (user) {
          console.log('[useTokenRefresh] Token refresh successful')
          setLastRefresh(new Date())
          onRefreshSuccess?.()
          return true
        } else {
          throw new Error('Failed to refresh token')
        }

      } catch (error) {
        const refreshError = error instanceof Error ? error : new Error('Token refresh failed')
        console.error('[useTokenRefresh] Refresh failed:', refreshError)
        setRefreshError(refreshError)
        onRefreshError?.(refreshError)
        return false
      } finally {
        setIsRefreshing(false)
        refreshPromiseRef.current = null
      }
    })()

    return refreshPromiseRef.current
  }, [onRefreshSuccess, onRefreshError])

  // New method for proactive validation and refresh before API calls
  const validateAndRefresh = useCallback(async (): Promise<boolean> => {
    const token = smartStorage.getItem('access_token')
    if (!token) {
      console.warn('[validateAndRefresh] No token found')
      return false
    }

    // Check if token is expired or expiring within threshold
    const isExpired = isTokenExpired(token)
    const isExpiring = isTokenExpiringWithin(token, TOKEN_REFRESH_THRESHOLD)

    if (isExpired || isExpiring) {
      console.log('[validateAndRefresh] Token needs refresh', {
        isExpired,
        isExpiring,
        timeRemaining: getTokenTimeRemaining(token)
      })
      return await refreshNow()
    }

    return true // Token is valid
  }, [refreshNow])

  // Update token status periodically
  const updateTokenStatus = useCallback(() => {
    const token = smartStorage.getItem('access_token')
    if (token) {
      const timeRemaining = getTokenTimeRemaining(token)
      const isExpiring = isTokenExpiringWithin(token, TOKEN_REFRESH_THRESHOLD)

      setTokenTimeRemaining(timeRemaining)
      setIsTokenExpiring(isExpiring)

      // Trigger proactive refresh if enabled and token is expiring
      if (proactiveRefresh && isExpiring && !isRefreshing) {
        console.log('[useTokenRefresh] Proactive refresh triggered', { timeRemaining })
        refreshNow().catch(console.error)
      }
    } else {
      setTokenTimeRemaining(0)
      setIsTokenExpiring(true)
    }
  }, [proactiveRefresh, isRefreshing, refreshNow])

  // Initialize token status on mount
  useEffect(() => {
    updateTokenStatus()
  }, [updateTokenStatus])

  // Periodic token status checking and proactive refresh
  useEffect(() => {
    if (!enabled || checkInterval <= 0) return

    console.log(`[useTokenRefresh] Starting periodic token validation every ${checkInterval / 1000}s`)

    const startPeriodicCheck = () => {
      intervalRef.current = setInterval(() => {
        updateTokenStatus()
      }, checkInterval)
    }

    // Start immediately and then at intervals
    startPeriodicCheck()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        console.log('[useTokenRefresh] Stopped periodic token validation')
      }
    }
  }, [enabled, checkInterval, updateTokenStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      // Clear any pending refresh promise
      refreshPromiseRef.current = null
    }
  }, [])

  return {
    refreshNow,
    validateAndRefresh,
    isRefreshing,
    lastRefresh,
    refreshError,
    tokenTimeRemaining,
    isTokenExpiring
  }
}
