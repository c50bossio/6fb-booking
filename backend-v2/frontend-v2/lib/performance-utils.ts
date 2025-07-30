/**
 * React Performance Optimization Utilities
 * Centralized performance patterns and hooks
 */
import React, { useCallback, useMemo, useRef, useEffect } from 'react'

// Memoization utilities
export const createMemoizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  return useCallback(callback, deps)
}

export const createMemoizedValue = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  return useMemo(factory, deps)
}

// Debounced value hook for expensive operations
export const useDebounced = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Throttled callback hook
export const useThrottled = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastRun = useRef(Date.now())

  return useCallback((...args: Parameters<T>) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args)
      lastRun.current = Date.now()
    }
  }, [callback, delay]) as T
}

// Intersection Observer hook for lazy loading
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
      },
      {
        threshold: 0.1,
        ...options
      }
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [options])

  return { ref, isIntersecting }
}

// Virtual scrolling utilities
export const useVirtualScrolling = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = React.useState(0)

  const startIndex = Math.floor(scrollTop / itemHeight)
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  )

  const visibleItems = items.slice(startIndex, endIndex)
  const totalHeight = items.length * itemHeight
  const offsetY = startIndex * itemHeight

  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop)
    }
  }
}

// Performance monitoring hooks
export const usePerformanceMetrics = () => {
  const [metrics, setMetrics] = React.useState({
    renderTime: 0,
    componentMounts: 0,
    reRenders: 0
  })

  const renderStartTime = useRef<number>()
  const mountCount = useRef(0)
  const renderCount = useRef(0)

  useEffect(() => {
    mountCount.current += 1
    setMetrics(prev => ({ ...prev, componentMounts: mountCount.current }))
  }, [])

  useEffect(() => {
    renderCount.current += 1
    setMetrics(prev => ({ ...prev, reRenders: renderCount.current }))
  })

  const startRenderTimer = useCallback(() => {
    renderStartTime.current = performance.now()
  }, [])

  const endRenderTimer = useCallback(() => {
    if (renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current
      setMetrics(prev => ({ ...prev, renderTime }))
    }
  }, [])

  return {
    metrics,
    startRenderTimer,
    endRenderTimer
  }
}

// Heavy computation hook with Web Workers
export const useWebWorker = <T, R>(
  workerFunction: (data: T) => R,
  dependencies: React.DependencyList = []
) => {
  const [result, setResult] = React.useState<R | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  const worker = useMemo(() => {
    if (typeof window === 'undefined') return null

    const blob = new Blob([`
      self.onmessage = function(e) {
        try {
          const result = (${workerFunction.toString()})(e.data);
          self.postMessage({ result });
        } catch (error) {
          self.postMessage({ error: error.message });
        }
      }
    `], { type: 'application/javascript' })

    return new Worker(URL.createObjectURL(blob))
  }, dependencies)

  const execute = useCallback((data: T) => {
    if (!worker) return

    setLoading(true)
    setError(null)

    worker.onmessage = (e) => {
      const { result, error } = e.data
      if (error) {
        setError(new Error(error))
      } else {
        setResult(result)
      }
      setLoading(false)
    }

    worker.postMessage(data)
  }, [worker])

  useEffect(() => {
    return () => {
      if (worker) {
        worker.terminate()
      }
    }
  }, [worker])

  return { result, loading, error, execute }
}

// Component caching utilities
export const createMemoizedComponent = <P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  const MemoizedComponent = React.memo(Component, propsAreEqual)
  MemoizedComponent.displayName = `Memoized(${Component.displayName || Component.name})`
  return MemoizedComponent
}

// Bundle splitting utilities
export const prefetchRoute = (routePath: string) => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    // Prefetch the route in the background
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = routePath
    document.head.appendChild(link)
  }
}

export const preloadComponent = (importFunction: () => Promise<any>) => {
  if (typeof window !== 'undefined') {
    // Preload the component chunk
    importFunction().catch(() => {
      // Ignore preload errors
    })
  }
}

// Performance measurement decorators
export const withPerformanceTracking = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const TrackedComponent = React.forwardRef<any, P>((props, ref) => {
    const renderStart = useRef<number>()
    const renderCount = useRef(0)

    useEffect(() => {
      renderStart.current = performance.now()
      renderCount.current += 1
    })

    useEffect(() => {
      if (renderStart.current) {
        const renderTime = performance.now() - renderStart.current
        console.log(`${Component.displayName || Component.name} render #${renderCount.current}: ${renderTime.toFixed(2)}ms`)
      }
    })

    return <Component {...props} ref={ref} />
  })

  TrackedComponent.displayName = `WithPerformanceTracking(${Component.displayName || Component.name})`
  return TrackedComponent
}

// Export performance optimization presets
export const PerformancePresets = {
  // For heavy calculation components
  heavyCalculation: {
    memo: true,
    callbackDeps: [],
    memoValues: true
  },
  
  // For list components
  listOptimization: {
    virtual: true,
    intersection: true,
    memo: true
  },
  
  // For chart components
  chartOptimization: {
    debounce: 300,
    memo: true,
    lazyLoad: true
  },
  
  // For form components
  formOptimization: {
    debounce: 150,
    memo: true,
    validation: 'onChange'
  }
}