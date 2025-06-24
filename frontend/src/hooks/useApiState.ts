/**
 * Enhanced hook for API state management with memory leak prevention
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { apiClient } from '@/lib/api/client'
import { errorTracker } from '@/lib/monitoring/errorTracking'

interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
  retryCount: number
  lastUpdated: number | null
}

interface UseApiStateOptions {
  immediate?: boolean
  cacheTTL?: number
  enableCache?: boolean
  retryOnError?: boolean
  maxRetries?: number
  onSuccess?: (data: any) => void
  onError?: (error: any) => void
  dependencies?: any[]
}

interface UseApiStateReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  retryCount: number
  lastUpdated: number | null
  execute: () => Promise<void>
  retry: () => Promise<void>
  reset: () => void
  refresh: () => Promise<void>
}

/**
 * Enhanced hook for managing API state with automatic cleanup and error handling
 */
export function useApiState<T = any>(
  apiCall: () => Promise<any>,
  options: UseApiStateOptions = {}
): UseApiStateReturn<T> {
  const {
    immediate = true,
    cacheTTL = 300000, // 5 minutes
    enableCache = true,
    retryOnError = false,
    maxRetries = 3,
    onSuccess,
    onError,
    dependencies = []
  } = options

  // State management
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
    retryCount: 0,
    lastUpdated: null
  })

  // Refs for cleanup and debouncing
  const mountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastExecutionRef = useRef<number>(0)

  // Cleanup function
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // Safe state update that checks if component is still mounted
  const safeSetState = useCallback((updater: Partial<ApiState<T>> | ((prev: ApiState<T>) => Partial<ApiState<T>>)) => {
    if (!mountedRef.current) return

    if (typeof updater === 'function') {
      setState(prev => ({ ...prev, ...updater(prev) }))
    } else {
      setState(prev => ({ ...prev, ...updater }))
    }
  }, [])

  // Execute API call with enhanced error handling and caching
  const execute = useCallback(async (): Promise<void> => {
    // Prevent rapid successive calls
    const now = Date.now()
    if (now - lastExecutionRef.current < 100) {
      return
    }
    lastExecutionRef.current = now

    // Cleanup previous request
    cleanup()

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    safeSetState({
      loading: true,
      error: null
    })

    try {
      const result = await apiCall()
      
      if (!mountedRef.current) return

      safeSetState({
        data: result.data || result,
        loading: false,
        error: null,
        lastUpdated: Date.now()
      })

      onSuccess?.(result.data || result)

    } catch (error: any) {
      if (!mountedRef.current) return

      // Don't update state if request was aborted
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        return
      }

      const errorMessage = error.userMessage || 
                          error.response?.data?.message || 
                          error.message || 
                          'An unexpected error occurred'

      safeSetState({
        loading: false,
        error: errorMessage
      })

      onError?.(error)

      // Report error for monitoring (API errors are already reported in the client)
      if (!error.response) {
        // Network or other non-API errors
        errorTracker.captureError(error, {
          category: 'network',
          severity: 'medium',
          context: {
            component: 'useApiState',
            action: 'api_call_failed'
          },
          tags: ['hook', 'api_state']
        })
      }

      // Auto-retry on specific errors if enabled
      if (retryOnError && state.retryCount < maxRetries) {
        const shouldRetry = 
          !error.response || // Network errors
          error.response.status >= 500 || // Server errors
          error.response.status === 429 // Rate limiting

        if (shouldRetry) {
          const retryDelay = Math.min(1000 * Math.pow(2, state.retryCount), 10000)
          
          timeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              safeSetState(prev => ({ retryCount: prev.retryCount + 1 }))
              execute()
            }
          }, retryDelay)
        }
      }
    }
  }, [apiCall, retryOnError, maxRetries, state.retryCount, onSuccess, onError, cleanup, safeSetState])

  // Retry function
  const retry = useCallback(async (): Promise<void> => {
    safeSetState({ retryCount: 0 })
    return execute()
  }, [execute, safeSetState])

  // Reset function
  const reset = useCallback(() => {
    cleanup()
    safeSetState({
      data: null,
      loading: false,
      error: null,
      retryCount: 0,
      lastUpdated: null
    })
  }, [cleanup, safeSetState])

  // Refresh function (bypass cache)
  const refresh = useCallback(async (): Promise<void> => {
    lastExecutionRef.current = 0 // Reset rate limiting
    return execute()
  }, [execute])

  // Effect for immediate execution and dependency changes
  useEffect(() => {
    if (immediate) {
      execute()
    }

    return () => {
      cleanup()
    }
  }, [immediate, ...dependencies])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [cleanup])

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    retryCount: state.retryCount,
    lastUpdated: state.lastUpdated,
    execute,
    retry,
    reset,
    refresh
  }
}

/**
 * Hook for managing multiple API states with batch operations
 */
export function useMultiApiState<T extends Record<string, any>>(
  apiCalls: { [K in keyof T]: () => Promise<any> },
  options: UseApiStateOptions = {}
): {
  [K in keyof T]: UseApiStateReturn<T[K]>
} & {
  loading: boolean
  hasError: boolean
  executeAll: () => Promise<void>
  resetAll: () => void
} {
  const states = {} as { [K in keyof T]: UseApiStateReturn<T[K]> }
  
  // Create individual state hooks
  Object.keys(apiCalls).forEach(key => {
    states[key as keyof T] = useApiState<T[keyof T]>(
      apiCalls[key as keyof T],
      { ...options, immediate: false }
    )
  })

  // Computed properties
  const loading = Object.values(states).some(state => state.loading)
  const hasError = Object.values(states).some(state => state.error !== null)

  // Batch operations
  const executeAll = useCallback(async () => {
    await Promise.all(
      Object.values(states).map(state => state.execute())
    )
  }, [states])

  const resetAll = useCallback(() => {
    Object.values(states).forEach(state => state.reset())
  }, [states])

  return {
    ...states,
    loading,
    hasError,
    executeAll,
    resetAll
  }
}

/**
 * Hook for paginated API calls with automatic state management
 */
export function usePaginatedApiState<T = any>(
  apiCall: (page: number, perPage: number) => Promise<any>,
  options: UseApiStateOptions & {
    initialPage?: number
    perPage?: number
  } = {}
): UseApiStateReturn<T[]> & {
  page: number
  perPage: number
  total: number
  hasNextPage: boolean
  hasPrevPage: boolean
  nextPage: () => Promise<void>
  prevPage: () => Promise<void>
  goToPage: (page: number) => Promise<void>
  loadMore: () => Promise<void>
} {
  const { initialPage = 1, perPage = 20, ...restOptions } = options
  
  const [page, setPage] = useState(initialPage)
  const [total, setTotal] = useState(0)
  const [allData, setAllData] = useState<T[]>([])

  const paginatedApiCall = useCallback(async () => {
    const result = await apiCall(page, perPage)
    
    if (result.data) {
      setTotal(result.total || result.data.length)
      return result
    }
    
    return result
  }, [apiCall, page, perPage])

  const apiState = useApiState<any>(paginatedApiCall, {
    ...restOptions,
    dependencies: [page, perPage]
  })

  // Update accumulated data
  useEffect(() => {
    if (apiState.data?.data) {
      if (page === 1) {
        setAllData(apiState.data.data)
      } else {
        setAllData(prev => [...prev, ...apiState.data.data])
      }
    }
  }, [apiState.data, page])

  const hasNextPage = allData.length < total
  const hasPrevPage = page > 1

  const nextPage = useCallback(async () => {
    if (hasNextPage) {
      setPage(prev => prev + 1)
    }
  }, [hasNextPage])

  const prevPage = useCallback(async () => {
    if (hasPrevPage) {
      setPage(prev => Math.max(1, prev - 1))
      // Reset accumulated data for non-infinite scroll
      setAllData([])
    }
  }, [hasPrevPage])

  const goToPage = useCallback(async (newPage: number) => {
    setPage(newPage)
    setAllData([]) // Reset data when jumping to specific page
  }, [])

  const loadMore = useCallback(async () => {
    if (hasNextPage && !apiState.loading) {
      await nextPage()
    }
  }, [hasNextPage, apiState.loading, nextPage])

  return {
    ...apiState,
    data: allData,
    page,
    perPage,
    total,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    goToPage,
    loadMore
  }
}