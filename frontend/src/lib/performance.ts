/**
 * Performance monitoring utilities
 */

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  metadata?: Record<string, any>
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private observers: Map<string, PerformanceObserver> = new Map()

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers()
    }
  }

  private initializeObservers() {
    // Monitor Largest Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as any
        this.recordMetric('LCP', lastEntry.startTime, {
          element: lastEntry.element?.tagName,
          size: lastEntry.size
        })
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observers.set('lcp', lcpObserver)
    } catch (e) {
      console.warn('LCP observer not supported')
    }

    // Monitor First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          this.recordMetric('FID', entry.processingStart - entry.startTime, {
            eventType: entry.name
          })
        })
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
      this.observers.set('fid', fidObserver)
    } catch (e) {
      console.warn('FID observer not supported')
    }

    // Monitor Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
            this.recordMetric('CLS', clsValue)
          }
        })
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      this.observers.set('cls', clsObserver)
    } catch (e) {
      console.warn('CLS observer not supported')
    }

    // Monitor resource loading
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
            this.recordMetric('API_CALL', entry.duration, {
              url: entry.name,
              transferSize: entry.transferSize,
              status: entry.responseStatus
            })
          }
        })
      })
      resourceObserver.observe({ entryTypes: ['resource'] })
      this.observers.set('resource', resourceObserver)
    } catch (e) {
      console.warn('Resource observer not supported')
    }
  }

  recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata
    }
    
    this.metrics.push(metric)
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${value.toFixed(2)}ms`, metadata)
    }

    // Send to analytics service in production
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      this.sendToAnalytics(metric)
    }
  }

  private sendToAnalytics(metric: PerformanceMetric) {
    // Send to your analytics endpoint
    // This is a placeholder - implement based on your analytics service
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon('/api/analytics/performance', JSON.stringify(metric))
    }
  }

  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now()
    
    return fn()
      .then(result => {
        const duration = performance.now() - start
        this.recordMetric(name, duration)
        return result
      })
      .catch(error => {
        const duration = performance.now() - start
        this.recordMetric(name, duration, { error: error.message })
        throw error
      })
  }

  measure<T>(name: string, fn: () => T): T {
    const start = performance.now()
    
    try {
      const result = fn()
      const duration = performance.now() - start
      this.recordMetric(name, duration)
      return result
    } catch (error) {
      const duration = performance.now() - start
      this.recordMetric(name, duration, { error: (error as Error).message })
      throw error
    }
  }

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name)
    }
    return [...this.metrics]
  }

  clearMetrics() {
    this.metrics = []
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
    this.metrics = []
  }

  // Get Web Vitals summary
  getWebVitals() {
    const lcp = this.metrics.find(m => m.name === 'LCP')
    const fid = this.metrics.find(m => m.name === 'FID')
    const cls = this.metrics.find(m => m.name === 'CLS')
    
    return {
      LCP: lcp?.value,
      FID: fid?.value,
      CLS: cls?.value,
      timestamp: Date.now()
    }
  }

  // Component render timing
  startComponentTimer(componentName: string): () => void {
    const start = performance.now()
    
    return () => {
      const duration = performance.now() - start
      this.recordMetric(`COMPONENT_RENDER`, duration, { component: componentName })
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()

// React hook for component performance monitoring
export function usePerformanceMonitor(componentName: string) {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const endTimer = performanceMonitor.startComponentTimer(componentName)
    
    // Use useEffect to measure after render
    if ('useEffect' in require('react')) {
      const { useEffect } = require('react')
      useEffect(() => {
        endTimer()
      })
    }
  }
}