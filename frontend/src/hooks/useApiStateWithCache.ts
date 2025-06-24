/**
 * Enhanced useApiState hook with advanced caching capabilities
 * Extends the existing useApiState hook with intelligent cache management
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useApiState, UseApiStateOptions, UseApiStateReturn } from './useApiState'
import { cacheManager } from '@/lib/cache/cacheManager'
import { errorTracker } from '@/lib/monitoring/errorTracking'

interface CacheOptions {
  enableCache?: boolean
  cacheTTL?: number
  cacheStrategy?: string
  cacheTags?: string[]
  cacheDependencies?: string[]
  cachePriority?: 'low' | 'medium' | 'high'
  staleWhileRevalidate?: boolean
  backgroundRefresh?: boolean
  optimisticUpdates?: boolean
  prefetchRelated?: string[]
}

interface EnhancedApiStateOptions extends UseApiStateOptions, CacheOptions {
  cacheKey?: string
  onCacheHit?: (data: any) => void
  onCacheMiss?: () => void
  onStaleData?: (data: any) => void
  onBackgroundRefresh?: (data: any) => void
}

interface EnhancedApiStateReturn<T> extends UseApiStateReturn<T> {
  isStale: boolean
  isCached: boolean
  cacheAge: number | null
  lastCacheUpdate: number | null
  refreshInBackground: () => Promise<void>
  warmCache: () => Promise<void>
  invalidateCache: () => void
  prefetchRelated: () => Promise<void>
  optimisticUpdate: (data: T) => void
  cacheStats: {
    hits: number
    misses: number
    hitRate: number
  }
}

/**
 * Enhanced hook for API state management with advanced caching
 */
export function useApiStateWithCache<T = any>(
  apiCall: () => Promise<any>,
  options: EnhancedApiStateOptions = {}
): EnhancedApiStateReturn<T> {
  const {
    enableCache = true,
    cacheTTL = 300000, // 5 minutes
    cacheStrategy = 'api',
    cacheTags = [],
    cacheDependencies = [],
    cachePriority = 'medium',
    staleWhileRevalidate = true,
    backgroundRefresh = false,
    optimisticUpdates = false,
    prefetchRelated = [],
    cacheKey: providedCacheKey,
    onCacheHit,
    onCacheMiss,
    onStaleData,
    onBackgroundRefresh,
    ...baseOptions
  } = options

  // Generate cache key from API call and options
  const cacheKey = useMemo(() => {
    if (providedCacheKey) return providedCacheKey
    
    // Create a deterministic key from the function and params
    const functionName = apiCall.name || 'anonymous'
    const timestamp = Date.now() // This should be based on dependencies instead
    return `api:${cacheStrategy}:${functionName}:${btoa(JSON.stringify(baseOptions.dependencies || [])).slice(0, 16)}`
  }, [providedCacheKey, apiCall.name, cacheStrategy, baseOptions.dependencies])

  // Cache state tracking
  const [cacheState, setCacheState] = useState({
    isStale: false,
    isCached: false,
    cacheAge: null as number | null,
    lastCacheUpdate: null as number | null,
    hits: 0,
    misses: 0
  })

  // Refs for cleanup and tracking
  const backgroundRefreshRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchRef = useRef<number>(0)
  const mountedRef = useRef(true)

  // Create enhanced API call that integrates with cache
  const enhancedApiCall = useCallback(async (): Promise<any> => {
    const startTime = performance.now()
    
    try {
      // Check cache first if enabled
      if (enableCache) {
        const cachedData = await cacheManager.get<T>(cacheKey)
        
        if (cachedData !== null) {
          const cacheEntry = await getCacheEntry(cacheKey)
          const age = cacheEntry ? Date.now() - cacheEntry.timestamp : null
          const isStale = age !== null && age > cacheTTL * 0.8 // Consider stale at 80% of TTL
          
          setCacheState(prev => ({
            ...prev,
            isCached: true,
            cacheAge: age,
            lastCacheUpdate: cacheEntry?.timestamp || null,
            isStale,
            hits: prev.hits + 1
          }))

          onCacheHit?.(cachedData)
          
          // If stale and stale-while-revalidate is enabled, return cached data
          // but trigger background refresh
          if (isStale && staleWhileRevalidate) {
            onStaleData?.(cachedData)
            // Schedule background refresh
            setTimeout(() => {
              if (mountedRef.current) {
                refreshInBackground()
              }
            }, 100)
          }
          
          return { data: cachedData }
        } else {
          setCacheState(prev => ({
            ...prev,
            isCached: false,
            misses: prev.misses + 1
          }))
          onCacheMiss?.()
        }
      }

      // Fetch fresh data
      const result = await apiCall()
      const fetchTime = Date.now()
      
      // Cache the result if enabled
      if (enableCache && result?.data) {
        const cacheSuccess = await cacheManager.set(cacheKey, result.data, {
          ttl: cacheTTL,
          strategy: cacheStrategy,
          tags: [
            ...cacheTags,
            cacheStrategy,
            ...(result.data ? extractAutoTags(result.data) : [])
          ],
          dependencies: cacheDependencies,
          priority: cachePriority
        })

        if (cacheSuccess) {
          setCacheState(prev => ({
            ...prev,
            isCached: true,
            lastCacheUpdate: fetchTime,
            cacheAge: 0,
            isStale: false
          }))
        }
      }

      // Schedule background refresh if enabled
      if (backgroundRefresh && cacheTTL > 60000) { // Only for caches > 1 minute
        scheduleBackgroundRefresh()
      }

      // Prefetch related data if specified
      if (prefetchRelated.length > 0) {
        setTimeout(() => {
          prefetchRelatedData()
        }, 200)
      }

      lastFetchRef.current = fetchTime
      
      // Track performance
      const duration = performance.now() - startTime
      if (duration > 2000) { // Slow API call
        errorTracker.capturePerformanceIssue(
          `API call: ${cacheKey}`,
          duration,
          2000,
          'useApiStateWithCache'
        )
      }

      return result

    } catch (error) {
      // On error, try to return stale cached data if available
      if (enableCache && staleWhileRevalidate) {
        const staleData = await cacheManager.get<T>(cacheKey)
        if (staleData !== null) {
          setCacheState(prev => ({
            ...prev,
            isCached: true,
            isStale: true
          }))
          onStaleData?.(staleData)
          
          // Re-throw error but with stale data available
          const enhancedError = new Error(`API call failed, serving stale data: ${(error as Error).message}`)
          ;(enhancedError as any).staleData = staleData
          throw enhancedError
        }
      }
      
      throw error
    }
  }, [
    apiCall,
    enableCache,
    cacheKey,
    cacheTTL,
    cacheStrategy,
    cacheTags,
    cacheDependencies,
    cachePriority,
    staleWhileRevalidate,
    backgroundRefresh,
    prefetchRelated,
    onCacheHit,
    onCacheMiss,
    onStaleData
  ])

  // Use the base hook with our enhanced API call
  const baseState = useApiState<T>(enhancedApiCall, {
    ...baseOptions,
    enableCache: false // Disable base caching since we handle it here
  })

  // Helper function to get cache entry details
  const getCacheEntry = useCallback(async (key: string) => {
    try {
      // This would require exposing cache entry metadata from cacheManager
      // For now, we'll simulate it
      return null
    } catch {
      return null
    }
  }, [])

  // Extract auto-tags from data for intelligent caching
  const extractAutoTags = useCallback((data: any): string[] => {
    const tags: string[] = []
    
    if (Array.isArray(data)) {
      tags.push('list')
      if (data.length > 0 && data[0].id) {
        tags.push('entities')
      }
    } else if (data && typeof data === 'object') {
      if (data.id) tags.push('entity', `entity:${data.id}`)
      if (data.user_id) tags.push(`user:${data.user_id}`)
      if (data.barber_id) tags.push(`barber:${data.barber_id}`)
      if (data.appointment_id) tags.push(`appointment:${data.appointment_id}`)
    }
    
    return tags
  }, [])

  // Background refresh functionality
  const refreshInBackground = useCallback(async (): Promise<void> => {
    try {
      const result = await apiCall()
      
      if (result?.data && enableCache) {
        await cacheManager.set(cacheKey, result.data, {
          ttl: cacheTTL,
          strategy: cacheStrategy,
          tags: [...cacheTags, ...extractAutoTags(result.data)],
          dependencies: cacheDependencies,
          priority: cachePriority
        })

        setCacheState(prev => ({
          ...prev,
          lastCacheUpdate: Date.now(),
          cacheAge: 0,
          isStale: false
        }))

        onBackgroundRefresh?.(result.data)
      }
    } catch (error) {
      console.warn('Background refresh failed:', error)
    }
  }, [
    apiCall,
    enableCache,
    cacheKey,
    cacheTTL,
    cacheStrategy,
    cacheTags,
    cacheDependencies,
    cachePriority,
    extractAutoTags,
    onBackgroundRefresh
  ])

  // Schedule background refresh
  const scheduleBackgroundRefresh = useCallback(() => {
    if (backgroundRefreshRef.current) {
      clearTimeout(backgroundRefreshRef.current)
    }

    // Refresh at 90% of TTL
    const refreshDelay = cacheTTL * 0.9
    backgroundRefreshRef.current = setTimeout(() => {
      if (mountedRef.current) {
        refreshInBackground()
      }
    }, refreshDelay)
  }, [cacheTTL, refreshInBackground])

  // Cache warming
  const warmCache = useCallback(async (): Promise<void> => {
    if (!enableCache) return
    
    try {
      const cachedData = await cacheManager.get<T>(cacheKey)
      if (!cachedData) {
        await baseState.execute()
      }
    } catch (error) {
      console.warn('Cache warming failed:', error)
    }
  }, [enableCache, cacheKey, baseState.execute])

  // Cache invalidation
  const invalidateCache = useCallback((): void => {
    if (enableCache) {
      cacheManager.delete(cacheKey)
      
      // Also invalidate by tags
      cacheTags.forEach(tag => {
        cacheManager.invalidateByTag(tag)
      })

      setCacheState(prev => ({
        ...prev,
        isCached: false,
        cacheAge: null,
        lastCacheUpdate: null,
        isStale: false
      }))
    }
  }, [enableCache, cacheKey, cacheTags])

  // Prefetch related data
  const prefetchRelatedData = useCallback(async (): Promise<void> => {
    if (prefetchRelated.length === 0) return
    
    try {
      await cacheManager.prefetch(prefetchRelated, 'low')
    } catch (error) {
      console.warn('Prefetch related data failed:', error)
    }
  }, [prefetchRelated])

  // Optimistic updates
  const optimisticUpdate = useCallback((data: T): void => {
    if (!optimisticUpdates || !enableCache) return
    
    // Store optimistic data in cache with short TTL
    cacheManager.set(cacheKey, data, {
      ttl: 30000, // 30 seconds
      strategy: 'optimistic',
      tags: [...cacheTags, 'optimistic'],
      priority: 'high'
    })

    setCacheState(prev => ({
      ...prev,
      isCached: true,
      lastCacheUpdate: Date.now(),
      cacheAge: 0,
      isStale: false
    }))
  }, [optimisticUpdates, enableCache, cacheKey, cacheTags])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (backgroundRefreshRef.current) {
        clearTimeout(backgroundRefreshRef.current)
      }
    }
  }, [])

  // Calculate hit rate
  const hitRate = useMemo(() => {
    const total = cacheState.hits + cacheState.misses
    return total > 0 ? (cacheState.hits / total) * 100 : 0
  }, [cacheState.hits, cacheState.misses])

  return {
    ...baseState,
    isStale: cacheState.isStale,
    isCached: cacheState.isCached,
    cacheAge: cacheState.cacheAge,
    lastCacheUpdate: cacheState.lastCacheUpdate,
    refreshInBackground,
    warmCache,
    invalidateCache,
    prefetchRelated: prefetchRelatedData,
    optimisticUpdate,
    cacheStats: {
      hits: cacheState.hits,
      misses: cacheState.misses,
      hitRate
    }
  }
}

/**
 * Hook for managing multiple enhanced API states with shared cache management
 */
export function useMultiApiStateWithCache<T extends Record<string, any>>(
  apiCalls: { [K in keyof T]: () => Promise<any> },
  options: EnhancedApiStateOptions = {}
): {
  [K in keyof T]: EnhancedApiStateReturn<T[K]>
} & {
  loading: boolean
  hasError: boolean
  executeAll: () => Promise<void>
  resetAll: () => void
  invalidateAllCache: () => void
  warmAllCache: () => Promise<void>
  globalCacheStats: {
    totalHits: number
    totalMisses: number
    averageHitRate: number
  }
} {
  const states = {} as { [K in keyof T]: EnhancedApiStateReturn<T[K]> }
  
  // Create individual enhanced state hooks
  Object.keys(apiCalls).forEach(key => {
    states[key as keyof T] = useApiStateWithCache<T[keyof T]>(
      apiCalls[key as keyof T],
      { 
        ...options, 
        immediate: false,
        cacheKey: options.cacheKey ? `${options.cacheKey}:${String(key)}` : undefined
      }
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

  const invalidateAllCache = useCallback(() => {
    Object.values(states).forEach(state => state.invalidateCache())
  }, [states])

  const warmAllCache = useCallback(async () => {
    await Promise.all(
      Object.values(states).map(state => state.warmCache())
    )
  }, [states])

  // Global cache statistics
  const globalCacheStats = useMemo(() => {
    const allStats = Object.values(states).map(state => state.cacheStats)
    const totalHits = allStats.reduce((sum, stats) => sum + stats.hits, 0)
    const totalMisses = allStats.reduce((sum, stats) => sum + stats.misses, 0)
    const averageHitRate = allStats.length > 0 
      ? allStats.reduce((sum, stats) => sum + stats.hitRate, 0) / allStats.length 
      : 0

    return {
      totalHits,
      totalMisses,
      averageHitRate
    }
  }, [states])

  return {
    ...states,
    loading,
    hasError,
    executeAll,
    resetAll,
    invalidateAllCache,
    warmAllCache,
    globalCacheStats
  }
}

/**
 * Enhanced paginated API state with intelligent cache management
 */
export function usePaginatedApiStateWithCache<T = any>(
  apiCall: (page: number, perPage: number) => Promise<any>,
  options: EnhancedApiStateOptions & {
    initialPage?: number
    perPage?: number
    cachePages?: boolean
    maxCachedPages?: number
  } = {}
): EnhancedApiStateReturn<T[]> & {
  page: number
  perPage: number
  total: number
  hasNextPage: boolean
  hasPrevPage: boolean
  nextPage: () => Promise<void>
  prevPage: () => Promise<void>
  goToPage: (page: number) => Promise<void>
  loadMore: () => Promise<void>
  cachedPages: Set<number>
  preloadNextPage: () => Promise<void>
} {
  const { 
    initialPage = 1, 
    perPage = 20, 
    cachePages = true,
    maxCachedPages = 10,
    ...restOptions 
  } = options
  
  const [page, setPage] = useState(initialPage)
  const [total, setTotal] = useState(0)
  const [allData, setAllData] = useState<T[]>([])
  const [cachedPages, setCachedPages] = useState<Set<number>>(new Set())

  // Create cache key for current page
  const currentPageCacheKey = useMemo(() => 
    `${restOptions.cacheKey || 'paginated'}:page:${page}:size:${perPage}`,
    [restOptions.cacheKey, page, perPage]
  )

  const paginatedApiCall = useCallback(async () => {
    const result = await apiCall(page, perPage)
    
    if (result.data) {
      setTotal(result.total || result.data.length)
      
      // Cache individual page if enabled
      if (cachePages) {
        setCachedPages(prev => new Set([...prev, page]))
        
        // Limit cached pages
        if (cachedPages.size > maxCachedPages) {
          const sortedPages = Array.from(cachedPages).sort((a, b) => a - b)
          const pagesToRemove = sortedPages.slice(0, cachedPages.size - maxCachedPages)
          
          pagesToRemove.forEach(pageNum => {
            const pageKey = `${restOptions.cacheKey || 'paginated'}:page:${pageNum}:size:${perPage}`
            cacheManager.delete(pageKey)
          })
          
          setCachedPages(prev => {
            const newSet = new Set(prev)
            pagesToRemove.forEach(pageNum => newSet.delete(pageNum))
            return newSet
          })
        }
      }
      
      return result
    }
    
    return result
  }, [apiCall, page, perPage, cachePages, maxCachedPages, cachedPages.size, restOptions.cacheKey])

  const apiState = useApiStateWithCache<any>(paginatedApiCall, {
    ...restOptions,
    dependencies: [page, perPage],
    cacheKey: currentPageCacheKey,
    cacheTags: [...(restOptions.cacheTags || []), 'paginated', `page:${page}`]
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
      setAllData([]) // Reset for non-infinite scroll
    }
  }, [hasPrevPage])

  const goToPage = useCallback(async (newPage: number) => {
    setPage(newPage)
    setAllData([])
  }, [])

  const loadMore = useCallback(async () => {
    if (hasNextPage && !apiState.loading) {
      await nextPage()
    }
  }, [hasNextPage, apiState.loading, nextPage])

  // Preload next page for better UX
  const preloadNextPage = useCallback(async () => {
    if (!hasNextPage || cachedPages.has(page + 1)) return
    
    const nextPageKey = `${restOptions.cacheKey || 'paginated'}:page:${page + 1}:size:${perPage}`
    
    try {
      const nextPageResult = await apiCall(page + 1, perPage)
      
      if (nextPageResult.data) {
        await cacheManager.set(nextPageKey, nextPageResult, {
          ttl: restOptions.cacheTTL || 300000,
          strategy: restOptions.cacheStrategy || 'api',
          tags: [...(restOptions.cacheTags || []), 'paginated', `page:${page + 1}`, 'preloaded'],
          priority: 'low'
        })
        
        setCachedPages(prev => new Set([...prev, page + 1]))
      }
    } catch (error) {
      console.warn('Preload next page failed:', error)
    }
  }, [
    hasNextPage, 
    cachedPages, 
    page, 
    perPage, 
    restOptions.cacheKey, 
    restOptions.cacheTTL, 
    restOptions.cacheStrategy, 
    restOptions.cacheTags, 
    apiCall
  ])

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
    loadMore,
    cachedPages,
    preloadNextPage
  }
}