/**
 * Hook to proactively refresh authentication tokens
 */
import { useEffect, useRef } from 'react'
import { apiUtils } from '@/lib/api/client'
import { useAuth } from '@/components/AuthProvider'

interface UseTokenRefreshOptions {
  /**
   * Interval in milliseconds to check token validity
   * Default: 5 minutes (300000ms)
   */
  checkInterval?: number

  /**
   * Whether to enable automatic refresh
   * Default: true
   */
  enabled?: boolean

  /**
   * Callback when token is refreshed successfully
   */
  onRefreshSuccess?: () => void

  /**
   * Callback when token refresh fails
   */
  onRefreshError?: (error: any) => void
}

export function useTokenRefresh(options: UseTokenRefreshOptions = {}) {
  const {
    checkInterval = 5 * 60 * 1000, // 5 minutes
    enabled = true,
    onRefreshSuccess,
    onRefreshError
  } = options

  const { isAuthenticated, isDemoMode } = useAuth()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isRefreshingRef = useRef(false)

  useEffect(() => {
    // Don't run in demo mode or when not authenticated
    if (!enabled || !isAuthenticated || isDemoMode) {
      return
    }

    const checkAndRefreshToken = async () => {
      // Prevent concurrent refresh attempts
      if (isRefreshingRef.current) {
        console.log('[useTokenRefresh] Refresh already in progress, skipping...')
        return
      }

      try {
        isRefreshingRef.current = true

        // Check token validity
        const tokenInfo = apiUtils.validateStoredToken()

        if (!tokenInfo.hasToken) {
          console.log('[useTokenRefresh] No token found, skipping refresh')
          return
        }

        // If token is expired or close to expiring, refresh it
        if (tokenInfo.isExpired) {
          console.log('[useTokenRefresh] Token expired, attempting refresh...')

          const refreshed = await apiUtils.refreshTokenIfNeeded()

          if (refreshed) {
            console.log('[useTokenRefresh] Token refreshed successfully')
            onRefreshSuccess?.()
          } else {
            console.error('[useTokenRefresh] Token refresh failed')
            onRefreshError?.(new Error('Token refresh failed'))
          }
        } else {
          console.log('[useTokenRefresh] Token still valid')
        }
      } catch (error) {
        console.error('[useTokenRefresh] Error during token check:', error)
        onRefreshError?.(error)
      } finally {
        isRefreshingRef.current = false
      }
    }

    // Check immediately on mount
    checkAndRefreshToken()

    // Set up interval for periodic checks
    intervalRef.current = setInterval(checkAndRefreshToken, checkInterval)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, isAuthenticated, isDemoMode, checkInterval, onRefreshSuccess, onRefreshError])

  // Manual refresh function
  const refreshNow = async () => {
    if (isRefreshingRef.current) {
      console.log('[useTokenRefresh] Refresh already in progress')
      return false
    }

    try {
      isRefreshingRef.current = true
      const refreshed = await apiUtils.refreshTokenIfNeeded()

      if (refreshed) {
        onRefreshSuccess?.()
      } else {
        onRefreshError?.(new Error('Manual token refresh failed'))
      }

      return refreshed
    } catch (error) {
      onRefreshError?.(error)
      return false
    } finally {
      isRefreshingRef.current = false
    }
  }

  return {
    refreshNow,
    isRefreshing: isRefreshingRef.current
  }
}
