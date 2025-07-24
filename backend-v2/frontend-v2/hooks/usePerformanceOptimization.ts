import { useMemo, useCallback, useRef, useEffect, useState, DependencyList } from 'react'
import { debounce, throttle } from 'lodash'

/**
 * Custom hook for memoizing expensive computations with cache invalidation
 */
export function useMemoWithCache<T>(
  factory: () => T,
  deps: DependencyList,
  cacheKey?: string
): T {
  const cacheRef = useRef<Map<string, { value: T; deps: DependencyList }>>(new Map())
  
  return useMemo(() => {
    if (cacheKey) {
      const cached = cacheRef.current.get(cacheKey)
      if (cached && JSON.stringify(cached.deps) === JSON.stringify(deps)) {
        return cached.value
      }
    }
    
    const value = factory()
    
    if (cacheKey) {
      cacheRef.current.set(cacheKey, { value, deps })
      // Limit cache size
      if (cacheRef.current && cacheRef.current.size > 100) {
        const keysIterator = cacheRef.current.keys()
        const firstKey = keysIterator.next().value
        if (firstKey !== undefined) {
          cacheRef.current.delete(firstKey)
        }
      }
    }
    
    return value
  }, deps)
}

/**
 * Custom hook for creating stable callbacks with automatic memoization
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList
): T {
  const callbackRef = useRef(callback)
  
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])
  
  return useCallback(
    ((...args) => callbackRef.current(...args)) as T,
    deps
  )
}

/**
 * Hook for debouncing values with performance optimization
 */
export function useDebouncedValue<T>(
  value: T,
  delay: number,
  options?: { leading?: boolean; trailing?: boolean; maxWait?: number }
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  const debouncedSetValue = useMemo(
    () => debounce(setDebouncedValue, delay, options),
    [delay, options?.leading, options?.trailing, options?.maxWait]
  )
  
  useEffect(() => {
    debouncedSetValue(value)
    return () => {
      debouncedSetValue.cancel()
    }
  }, [value, debouncedSetValue])
  
  return debouncedValue
}

/**
 * Hook for throttling function calls
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options?: { leading?: boolean; trailing?: boolean }
): T {
  const callbackRef = useRef(callback)
  
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])
  
  return useMemo(
    () => throttle(
      ((...args) => callbackRef.current(...args)) as T,
      delay,
      options
    ),
    [delay, options?.leading, options?.trailing]
  )
}

/**
 * Hook for lazy loading components with intersection observer
 */
export function useLazyLoad(
  threshold = 0.1,
  rootMargin = '50px'
): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    const element = ref.current
    if (!element) return
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin }
    )
    
    observer.observe(element)
    
    return () => {
      observer.disconnect()
    }
  }, [threshold, rootMargin])
  
  return [ref, isVisible]
}

/**
 * Hook for virtualized list rendering
 */
export function useVirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
  getItemKey,
}: {
  items: T[]
  itemHeight: number | ((index: number) => number)
  containerHeight: number
  overscan?: number
  getItemKey: (item: T, index: number) => string | number
}) {
  const [scrollTop, setScrollTop] = useState(0)
  
  const handleScroll = useThrottledCallback((e: Event) => {
    const target = e.target as HTMLElement
    setScrollTop(target.scrollTop)
  }, 16) // ~60fps
  
  const { startIndex, endIndex, totalHeight, offsetY } = useMemo(() => {
    let accumulatedHeight = 0
    let startIdx = 0
    let endIdx = items.length - 1
    let foundStart = false
    
    const getHeight = (index: number) => 
      typeof itemHeight === 'function' ? itemHeight(index) : itemHeight
    
    // Find start index
    for (let i = 0; i < items.length; i++) {
      const height = getHeight(i)
      if (!foundStart && accumulatedHeight + height > scrollTop) {
        startIdx = Math.max(0, i - overscan)
        foundStart = true
      }
      
      if (accumulatedHeight > scrollTop + containerHeight) {
        endIdx = Math.min(items.length - 1, i + overscan)
        break
      }
      
      accumulatedHeight += height
    }
    
    // Calculate total height
    const total = items.reduce((sum, _, index) => sum + getHeight(index), 0)
    
    // Calculate offset for visible items
    let offset = 0
    for (let i = 0; i < startIdx; i++) {
      offset += getHeight(i)
    }
    
    return {
      startIndex: startIdx,
      endIndex: endIdx,
      totalHeight: total,
      offsetY: offset,
    }
  }, [items.length, itemHeight, scrollTop, containerHeight, overscan])
  
  const visibleItems = useMemo(
    () => items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      key: getItemKey(item, startIndex + index),
    })),
    [items, startIndex, endIndex, getItemKey]
  )
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
  }
}

/**
 * Hook for optimizing heavy computations with Web Workers
 */
export function useWebWorker<T, R>(
  workerFunction: (data: T) => R,
  deps: DependencyList = []
): [(data: T) => Promise<R>, boolean, Error | null] {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const workerRef = useRef<Worker | null>(null)
  
  useEffect(() => {
    // Create worker from function
    const workerCode = `
      self.onmessage = function(e) {
        try {
          const result = (${workerFunction.toString()})(e.data);
          self.postMessage({ success: true, result });
        } catch (error) {
          self.postMessage({ success: false, error: error.message });
        }
      }
    `
    
    const blob = new Blob([workerCode], { type: 'application/javascript' })
    const workerUrl = URL.createObjectURL(blob)
    workerRef.current = new Worker(workerUrl)
    
    return () => {
      workerRef.current?.terminate()
      URL.revokeObjectURL(workerUrl)
    }
  }, deps)
  
  const execute = useCallback((data: T): Promise<R> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Worker not initialized'))
        return
      }
      
      setLoading(true)
      setError(null)
      
      workerRef.current.onmessage = (e) => {
        setLoading(false)
        if (e.data.success) {
          resolve(e.data.result)
        } else {
          const err = new Error(e.data.error)
          setError(err)
          reject(err)
        }
      }
      
      workerRef.current.onerror = (err) => {
        setLoading(false)
        setError(new Error(err.message))
        reject(new Error(err.message))
      }
      
      workerRef.current.postMessage(data)
    })
  }, [])
  
  return [execute, loading, error]
}

/**
 * Hook for batching multiple state updates
 */
export function useBatchedState<T extends Record<string, any>>(
  initialState: T
): [T, (updates: Partial<T>) => void, () => void] {
  const [state, setState] = useState(initialState)
  const pendingUpdates = useRef<Partial<T>>({})
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  const batchUpdate = useCallback((updates: Partial<T>) => {
    pendingUpdates.current = { ...pendingUpdates.current, ...updates }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, ...pendingUpdates.current }))
      pendingUpdates.current = {}
    }, 0)
  }, [])
  
  const flushUpdates = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setState(prev => ({ ...prev, ...pendingUpdates.current }))
    pendingUpdates.current = {}
  }, [])
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])
  
  return [state, batchUpdate, flushUpdates]
}

