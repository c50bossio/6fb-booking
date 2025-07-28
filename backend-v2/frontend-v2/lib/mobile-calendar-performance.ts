/**
 * Mobile Calendar Performance Optimization Library
 * Advanced performance optimizations for touch-based calendar interactions
 * Version: 1.0.0
 */

import { useCallback, useMemo, useRef, useEffect, useState } from 'react'
import { debounce, throttle } from 'lodash'

export interface PerformanceMetrics {
  renderTime: number
  interactionDelay: number
  scrollPerformance: number
  memoryUsage: number
  gestureResponseTime: number
}

export interface VirtualizationConfig {
  enabled: boolean
  itemHeight: number
  overscan: number
  threshold: number
  recycleThreshold: number
}

export interface MobileOptimizationConfig {
  virtualization: VirtualizationConfig
  lazyLoading: boolean
  imageOptimization: boolean
  touchOptimization: boolean
  memoryManagement: boolean
  performanceMonitoring: boolean
  adaptiveRendering: boolean
}

const DEFAULT_CONFIG: MobileOptimizationConfig = {
  virtualization: {
    enabled: true,
    itemHeight: 60,
    overscan: 5,
    threshold: 50,
    recycleThreshold: 100
  },
  lazyLoading: true,
  imageOptimization: true,
  touchOptimization: true,
  memoryManagement: true,
  performanceMonitoring: true,
  adaptiveRendering: true
}

/**
 * Virtual scrolling hook for large calendar datasets
 */
export function useVirtualScrolling<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0)
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null)
  
  const visibleRange = useMemo(() => {
    if (!containerRef) return { start: 0, end: items.length }
    
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    )
    
    return {
      start: Math.max(0, startIndex - overscan),
      end: endIndex
    }
  }, [scrollTop, containerHeight, itemHeight, overscan, items.length])
  
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index,
      style: {
        position: 'absolute' as const,
        top: (visibleRange.start + index) * itemHeight,
        height: itemHeight,
        width: '100%'
      }
    }))
  }, [items, visibleRange, itemHeight])
  
  const totalHeight = items.length * itemHeight
  
  const handleScroll = useCallback(
    throttle((event: Event) => {
      const target = event.target as HTMLElement
      setScrollTop(target.scrollTop)
    }, 16), // 60fps
    []
  )
  
  return {
    containerRef: setContainerRef,
    visibleItems,
    totalHeight,
    handleScroll
  }
}

/**
 * Lazy loading hook for calendar components
 */
export function useLazyLoading() {
  const [loadedItems, setLoadedItems] = useState(new Set<string>())
  const observerRef = useRef<IntersectionObserver | null>(null)
  
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const itemId = entry.target.getAttribute('data-item-id')
            if (itemId) {
              setLoadedItems(prev => new Set(prev.add(itemId)))
            }
          }
        })
      },
      {
        rootMargin: '100px',
        threshold: 0.1
      }
    )
    
    return () => {
      observerRef.current?.disconnect()
    }
  }, [])
  
  const observeElement = useCallback((element: HTMLElement | null, itemId: string) => {
    if (element && observerRef.current) {
      element.setAttribute('data-item-id', itemId)
      observerRef.current.observe(element)
    }
  }, [])
  
  const isLoaded = useCallback((itemId: string) => {
    return loadedItems.has(itemId)
  }, [loadedItems])
  
  return { observeElement, isLoaded }
}

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitoring() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    interactionDelay: 0,
    scrollPerformance: 0,
    memoryUsage: 0,
    gestureResponseTime: 0
  })
  
  const startMeasurement = useCallback((name: string) => {
    performance.mark(`${name}-start`)
  }, [])
  
  const endMeasurement = useCallback((name: string) => {
    performance.mark(`${name}-end`)
    performance.measure(name, `${name}-start`, `${name}-end`)
    
    const measure = performance.getEntriesByName(name).pop()
    if (measure) {
      setMetrics(prev => ({
        ...prev,
        [name]: measure.duration
      }))
    }
  }, [])
  
  const measureRender = useCallback(() => {
    startMeasurement('renderTime')
    
    return () => {
      // Use requestAnimationFrame to measure after render
      requestAnimationFrame(() => {
        endMeasurement('renderTime')
      })
    }
  }, [startMeasurement, endMeasurement])
  
  const measureInteraction = useCallback((callback: () => void) => {
    startMeasurement('interactionDelay')
    
    const result = callback()
    
    requestAnimationFrame(() => {
      endMeasurement('interactionDelay')
    })
    
    return result
  }, [startMeasurement, endMeasurement])
  
  const getMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
      }
    }
    return { used: 0, total: 0, limit: 0 }
  }, [])
  
  return {
    metrics,
    measureRender,
    measureInteraction,
    getMemoryUsage,
    startMeasurement,
    endMeasurement
  }
}

/**
 * Touch performance optimization hook
 */
export function useTouchOptimization() {
  const lastTouchRef = useRef<Touch | null>(null)
  const touchStartTimeRef = useRef<number>(0)
  const [touchMetrics, setTouchMetrics] = useState({
    averageDelay: 0,
    totalTouches: 0
  })
  
  const optimizeTouchHandler = useCallback(<T extends TouchEvent>(
    handler: (event: T) => void,
    options?: { passive?: boolean; capture?: boolean }
  ) => {
    return (event: T) => {
      const now = performance.now()
      
      if (event.type === 'touchstart') {
        touchStartTimeRef.current = now
        lastTouchRef.current = event.touches[0]
      } else if (event.type === 'touchend' && touchStartTimeRef.current) {
        const delay = now - touchStartTimeRef.current
        setTouchMetrics(prev => ({
          averageDelay: (prev.averageDelay * prev.totalTouches + delay) / (prev.totalTouches + 1),
          totalTouches: prev.totalTouches + 1
        }))
      }
      
      // Use RAF for heavy operations
      if (options?.passive !== false) {
        requestAnimationFrame(() => handler(event))
      } else {
        handler(event)
      }
    }
  }, [])
  
  const createOptimizedEventListener = useCallback((
    element: HTMLElement,
    eventType: string,
    handler: (event: any) => void,
    options?: AddEventListenerOptions
  ) => {
    const optimizedHandler = optimizeTouchHandler(handler, options)
    
    element.addEventListener(eventType, optimizedHandler, {
      passive: eventType.startsWith('touch') && options?.passive !== false,
      capture: options?.capture || false
    })
    
    return () => {
      element.removeEventListener(eventType, optimizedHandler, options)
    }
  }, [optimizeTouchHandler])
  
  return {
    touchMetrics,
    createOptimizedEventListener,
    optimizeTouchHandler
  }
}

/**
 * Adaptive rendering hook based on device capabilities
 */
export function useAdaptiveRendering() {
  const [deviceCapabilities, setDeviceCapabilities] = useState({
    isMobile: false,
    isLowEnd: false,
    supportsTouchEvents: false,
    supportsHover: false,
    connectionSpeed: 'unknown' as '2g' | '3g' | '4g' | 'wifi' | 'unknown',
    memoryLimit: 0
  })
  
  useEffect(() => {
    // Detect device capabilities
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const supportsTouchEvents = 'ontouchstart' in window
    const supportsHover = window.matchMedia('(hover: hover)').matches
    
    // Estimate device performance
    const isLowEnd = estimateIsLowEndDevice()
    
    // Get connection information
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    const connectionSpeed = connection?.effectiveType || 'unknown'
    
    // Get memory information
    const memory = (performance as any).memory
    const memoryLimit = memory ? memory.jsHeapSizeLimit / (1024 * 1024) : 0
    
    setDeviceCapabilities({
      isMobile,
      isLowEnd,
      supportsTouchEvents,
      supportsHover,
      connectionSpeed,
      memoryLimit
    })
  }, [])
  
  const getOptimalSettings = useCallback(() => {
    const settings = { ...DEFAULT_CONFIG }
    
    if (deviceCapabilities.isLowEnd) {
      // Reduce settings for low-end devices
      settings.virtualization.overscan = 2
      settings.virtualization.recycleThreshold = 50
      settings.imageOptimization = true
      settings.adaptiveRendering = true
    }
    
    if (deviceCapabilities.connectionSpeed === '2g' || deviceCapabilities.connectionSpeed === '3g') {
      // Optimize for slow connections
      settings.lazyLoading = true
      settings.imageOptimization = true
    }
    
    if (deviceCapabilities.memoryLimit < 100) {
      // Aggressive memory management for limited devices
      settings.memoryManagement = true
      settings.virtualization.recycleThreshold = 30
    }
    
    return settings
  }, [deviceCapabilities])
  
  return {
    deviceCapabilities,
    getOptimalSettings,
    isLowEndDevice: deviceCapabilities.isLowEnd,
    isMobile: deviceCapabilities.isMobile
  }
}

/**
 * Memory management hook for mobile devices
 */
export function useMemoryManagement() {
  const componentCacheRef = useRef(new Map<string, any>())
  const [memoryPressure, setMemoryPressure] = useState(false)
  
  useEffect(() => {
    const checkMemoryPressure = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit
        setMemoryPressure(usageRatio > 0.8)
      }
    }
    
    const interval = setInterval(checkMemoryPressure, 5000)
    return () => clearInterval(interval)
  }, [])
  
  const memoizeComponent = useCallback(<T>(key: string, factory: () => T, deps: any[]): T => {
    const cacheKey = `${key}-${JSON.stringify(deps)}`
    
    if (componentCacheRef.current.has(cacheKey)) {
      return componentCacheRef.current.get(cacheKey)
    }
    
    const component = factory()
    componentCacheRef.current.set(cacheKey, component)
    
    // Clean cache if memory pressure is high
    if (memoryPressure && componentCacheRef.current.size > 50) {
      const entries = Array.from(componentCacheRef.current.entries())
      entries.slice(0, 25).forEach(([key]) => {
        componentCacheRef.current.delete(key)
      })
    }
    
    return component
  }, [memoryPressure])
  
  const clearCache = useCallback(() => {
    componentCacheRef.current.clear()
  }, [])
  
  return {
    memoryPressure,
    memoizeComponent,
    clearCache,
    cacheSize: componentCacheRef.current.size
  }
}

/**
 * Utility functions
 */
function estimateIsLowEndDevice(): boolean {
  // Basic heuristics for device performance
  const hardwareConcurrency = navigator.hardwareConcurrency || 1
  const memory = (navigator as any).deviceMemory || 1
  
  // Consider low-end if:
  // - Less than 2 CPU cores
  // - Less than 2GB RAM
  // - Older user agent patterns
  return hardwareConcurrency < 2 || memory < 2
}

/**
 * Debounced scroll handler for better performance
 */
export const createOptimizedScrollHandler = (
  handler: (scrollTop: number, scrollLeft: number) => void,
  delay: number = 16
) => {
  return throttle((event: Event) => {
    const target = event.target as HTMLElement
    handler(target.scrollTop, target.scrollLeft)
  }, delay)
}

/**
 * Frame rate monitor for development
 */
export function useFrameRateMonitor() {
  const [fps, setFps] = useState(60)
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  
  useEffect(() => {
    let animationId: number
    
    const measureFPS = () => {
      frameCountRef.current++
      const now = performance.now()
      
      if (now - lastTimeRef.current >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current)))
        frameCountRef.current = 0
        lastTimeRef.current = now
      }
      
      animationId = requestAnimationFrame(measureFPS)
    }
    
    animationId = requestAnimationFrame(measureFPS)
    
    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [])
  
  return fps
}

export default {
  useVirtualScrolling,
  useLazyLoading,
  usePerformanceMonitoring,
  useTouchOptimization,
  useAdaptiveRendering,
  useMemoryManagement,
  useFrameRateMonitor,
  createOptimizedScrollHandler
}