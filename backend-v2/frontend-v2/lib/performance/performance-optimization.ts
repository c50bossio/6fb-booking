/**
 * Performance optimization utilities for BookedBarber V2
 * Addresses critical 8-15 second load time issues
 */

import { lazy, ComponentType } from 'react'

/**
 * Create optimized lazy components with better loading states
 */
export function createOptimizedLazy<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  componentName: string = 'Component'
): T {
  const LazyComponent = lazy(() => {
    const startTime = performance.now()
    
    return importFn().then(module => {
      const loadTime = performance.now() - startTime
      
      // Log slow-loading components in development
      if (process.env.NODE_ENV === 'development' && loadTime > 100) {
        console.warn(`🐌 Slow component load: ${componentName} took ${loadTime.toFixed(2)}ms`)
      }
      
      return module
    })
  })
  
  // Add display name for debugging
  LazyComponent.displayName = `Optimized(${componentName})`
  
  return LazyComponent as T
}

/**
 * Preload critical components after initial page load
 */
export function preloadCriticalComponents() {
  if (typeof window === 'undefined') return
  
  // Use requestIdleCallback to preload during idle time
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Preload frequently used components
      import('@/components/UnifiedCalendar')
      import('@/components/modals/CreateAppointmentModal')
      import('@/components/calendar/EnhancedRevenueDisplay')
    }, { timeout: 2000 })
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      import('@/components/UnifiedCalendar')
      import('@/components/modals/CreateAppointmentModal')
      import('@/components/calendar/EnhancedRevenueDisplay')
    }, 1000)
  }
}

/**
 * Performance monitoring for component render times
 */
export class PerformanceMonitor {
  private static measurements: Map<string, number[]> = new Map()
  
  static startMeasure(componentName: string): string {
    const measureName = `${componentName}-${Date.now()}`
    performance.mark(`${measureName}-start`)
    return measureName
  }
  
  static endMeasure(measureName: string, componentName: string) {
    try {
      performance.mark(`${measureName}-end`)
      performance.measure(measureName, `${measureName}-start`, `${measureName}-end`)
      
      const measure = performance.getEntriesByName(measureName)[0]
      if (measure) {
        const measurements = this.measurements.get(componentName) || []
        measurements.push(measure.duration)
        this.measurements.set(componentName, measurements.slice(-10)) // Keep last 10 measurements
        
        // Log slow renders in development
        if (process.env.NODE_ENV === 'development' && measure.duration > 16) {
          console.warn(`🐌 Slow render: ${componentName} took ${measure.duration.toFixed(2)}ms`)
        }
      }
      
      // Cleanup
      performance.clearMarks(`${measureName}-start`)
      performance.clearMarks(`${measureName}-end`)
      performance.clearMeasures(measureName)
    } catch (error) {
      // Ignore performance measurement errors
    }
  }
  
  static getAverageRenderTime(componentName: string): number {
    const measurements = this.measurements.get(componentName)
    if (!measurements || measurements.length === 0) return 0
    
    return measurements.reduce((sum, time) => sum + time, 0) / measurements.length
  }
  
  static getPerformanceReport(): Record<string, { average: number, count: number }> {
    const report: Record<string, { average: number, count: number }> = {}
    
    this.measurements.forEach((measurements, componentName) => {
      report[componentName] = {
        average: measurements.reduce((sum, time) => sum + time, 0) / measurements.length,
        count: measurements.length
      }
    })
    
    return report
  }
}

/**
 * HOC for monitoring component performance
 */
export function withPerformanceMonitoring<T extends ComponentType<any>>(
  Component: T,
  componentName: string = Component.displayName || Component.name || 'Unknown'
): T {
  if (process.env.NODE_ENV !== 'development') {
    return Component
  }
  
  const WrappedComponent = (props: any) => {
    const measureName = PerformanceMonitor.startMeasure(componentName)
    
    // Clean up measurement when component unmounts
    React.useEffect(() => {
      return () => {
        PerformanceMonitor.endMeasure(measureName, componentName)
      }
    }, [measureName])
    
    return React.createElement(Component, props)
  }
  
  WrappedComponent.displayName = `PerformanceMonitored(${componentName})`
  
  return WrappedComponent as T
}

/**
 * Bundle size analyzer - reports large imports
 */
export function analyzeBundleSize() {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
    return
  }
  
  // Get all loaded modules from webpack
  if (typeof __webpack_require__ !== 'undefined') {
    const modules = Object.keys(__webpack_require__.cache || {})
    const largeModules = modules
      .filter(id => {
        const module = __webpack_require__.cache[id]
        return module && module.size && module.size > 50000 // > 50KB
      })
      .sort((a, b) => {
        const moduleA = __webpack_require__.cache[a]
        const moduleB = __webpack_require__.cache[b]
        return (moduleB?.size || 0) - (moduleA?.size || 0)
      })
      .slice(0, 10)
    
    if (largeModules.length > 0) {
      console.group('📦 Large Bundle Components')
      largeModules.forEach(id => {
        const module = __webpack_require__.cache[id]
        console.log(`${id}: ${((module?.size || 0) / 1024).toFixed(1)}KB`)
      })
      console.groupEnd()
    }
  }
}

/**
 * Memory usage monitoring
 */
export function monitorMemoryUsage() {
  if (typeof window === 'undefined' || !('performance' in window) || !('memory' in performance)) {
    return
  }
  
  const memory = (performance as any).memory
  if (memory) {
    const used = Math.round(memory.usedJSHeapSize / 1048576) // Convert to MB
    const allocated = Math.round(memory.totalJSHeapSize / 1048576)
    const limit = Math.round(memory.jsHeapSizeLimit / 1048576)
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🧠 Memory Usage: ${used}MB used / ${allocated}MB allocated / ${limit}MB limit`)
      
      // Warn if memory usage is high
      if (used > limit * 0.8) {
        console.warn('⚠️ High memory usage detected!')
      }
    }
  }
}

/**
 * Critical rendering path optimization
 */
export function optimizeCriticalRenderingPath() {
  if (typeof window === 'undefined') return
  
  // Preconnect to external resources
  const preconnectDomains = [
    'fonts.googleapis.com',
    'fonts.gstatic.com'
  ]
  
  preconnectDomains.forEach(domain => {
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = `https://${domain}`
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  })
  
  // Prefetch critical CSS
  const criticalCSS = document.createElement('link')
  criticalCSS.rel = 'prefetch'
  criticalCSS.href = '/_next/static/css/critical.css'
  document.head.appendChild(criticalCSS)
}

/**
 * Initialize all performance optimizations
 */
export function initializePerformanceOptimizations() {
  if (typeof window === 'undefined') return
  
  // Run optimizations after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      optimizeCriticalRenderingPath()
      preloadCriticalComponents()
      
      if (process.env.NODE_ENV === 'development') {
        setTimeout(() => {
          analyzeBundleSize()
          monitorMemoryUsage()
        }, 2000)
      }
    })
  } else {
    optimizeCriticalRenderingPath()
    preloadCriticalComponents()
    
    if (process.env.NODE_ENV === 'development') {
      analyzeBundleSize()
      monitorMemoryUsage()
    }
  }
}