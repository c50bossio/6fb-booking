'use client'

interface PerformanceMetrics {
  renderTime: number
  memoryUsage: number
  componentRenders: number
  domNodes: number
  largestContentfulPaint?: number
  firstContentfulPaint?: number
  interactionToNextPaint?: number
}

interface PerformanceBenchmark {
  id: string
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: any
}

interface MemoryInfo {
  usedJSHeapSize: number
  totalJSHeapSize: number
  jsHeapSizeLimit: number
  usagePercentage: number
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private benchmarks: Map<string, PerformanceBenchmark> = new Map()
  private renderCounts: Map<string, number> = new Map()
  private observer: PerformanceObserver | null = null

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  constructor() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.initializeObserver()
    }
  }

  private initializeObserver() {
    try {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.entryType === 'largest-contentful-paint') {
            console.log(`LCP: ${entry.startTime}ms`)
          } else if (entry.entryType === 'first-contentful-paint') {
            console.log(`FCP: ${entry.startTime}ms`)
          }
        })
      })

      this.observer.observe({ entryTypes: ['largest-contentful-paint', 'first-contentful-paint'] })
    } catch (error) {
      console.warn('Performance Observer not supported:', error)
    }
  }

  // Start performance benchmark
  startBenchmark(id: string, name: string, metadata?: any): void {
    const benchmark: PerformanceBenchmark = {
      id,
      name,
      startTime: performance.now(),
      metadata
    }
    this.benchmarks.set(id, benchmark)
    performance.mark(`${id}_start`)
  }

  // End performance benchmark
  endBenchmark(id: string): PerformanceBenchmark | null {
    const benchmark = this.benchmarks.get(id)
    if (!benchmark) return null

    const endTime = performance.now()
    const duration = endTime - benchmark.startTime

    benchmark.endTime = endTime
    benchmark.duration = duration

    performance.mark(`${id}_end`)
    performance.measure(benchmark.name, `${id}_start`, `${id}_end`)

    this.benchmarks.set(id, benchmark)
    return benchmark
  }

  // Get current performance metrics
  getCurrentMetrics(): PerformanceMetrics {
    const memory = this.getMemoryUsage()
    
    return {
      renderTime: performance.now(),
      memoryUsage: memory.usedJSHeapSize,
      componentRenders: Array.from(this.renderCounts.values()).reduce((sum, count) => sum + count, 0),
      domNodes: document.querySelectorAll('*').length,
      largestContentfulPaint: this.getLCP(),
      firstContentfulPaint: this.getFCP(),
      interactionToNextPaint: this.getINP()
    }
  }

  // Track component render count
  trackRender(componentName: string): void {
    const currentCount = this.renderCounts.get(componentName) || 0
    this.renderCounts.set(componentName, currentCount + 1)
  }

  // Get memory usage information
  getMemoryUsage(): MemoryInfo {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      }
    }
    
    return {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      usagePercentage: 0
    }
  }

  // Get Largest Contentful Paint
  private getLCP(): number | undefined {
    if (typeof window === 'undefined') return undefined
    
    const entries = performance.getEntriesByType('largest-contentful-paint')
    return entries.length > 0 ? entries[entries.length - 1].startTime : undefined
  }

  // Get First Contentful Paint
  private getFCP(): number | undefined {
    if (typeof window === 'undefined') return undefined
    
    const entries = performance.getEntriesByType('paint')
    const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint')
    return fcpEntry?.startTime
  }

  // Get Interaction to Next Paint (simplified)
  private getINP(): number | undefined {
    if (typeof window === 'undefined') return undefined
    
    const entries = performance.getEntriesByType('event')
    if (entries.length > 0) {
      const eventEntry = entries[entries.length - 1] as any
      return eventEntry.processingEnd - eventEntry.processingStart
    }
    return undefined
  }

  // Get render statistics
  getRenderStats(): Map<string, number> {
    return new Map(this.renderCounts)
  }

  // Clear performance data
  clearMetrics(): void {
    this.benchmarks.clear()
    this.renderCounts.clear()
    performance.clearMarks()
    performance.clearMeasures()
  }

  // Generate performance report
  generateReport(): {
    benchmarks: PerformanceBenchmark[]
    renderStats: Record<string, number>
    currentMetrics: PerformanceMetrics
    recommendations: string[]
  } {
    const currentMetrics = this.getCurrentMetrics()
    const recommendations: string[] = []

    // Generate recommendations based on metrics
    if (currentMetrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
      recommendations.push('High memory usage detected. Consider implementing component virtualization.')
    }

    if (currentMetrics.domNodes > 5000) {
      recommendations.push('High DOM node count. Consider using virtual scrolling for large lists.')
    }

    if (currentMetrics.largestContentfulPaint && currentMetrics.largestContentfulPaint > 2500) {
      recommendations.push('LCP is over 2.5s. Optimize loading of critical resources.')
    }

    const renderStats = Object.fromEntries(this.renderCounts.entries())
    const excessiveRenders = Object.entries(renderStats).filter(([_, count]) => count > 50)
    
    if (excessiveRenders.length > 0) {
      recommendations.push(`Components with excessive re-renders: ${excessiveRenders.map(([name]) => name).join(', ')}`)
    }

    return {
      benchmarks: Array.from(this.benchmarks.values()),
      renderStats,
      currentMetrics,
      recommendations
    }
  }

  // Resource timing analysis
  analyzeResourceTiming(): {
    scripts: number
    stylesheets: number
    images: number
    api: number
    totalLoadTime: number
    slowResources: PerformanceResourceTiming[]
  } {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    
    let scripts = 0, stylesheets = 0, images = 0, api = 0
    let totalLoadTime = 0
    const slowResources: PerformanceResourceTiming[] = []

    resources.forEach(resource => {
      const loadTime = resource.responseEnd - resource.requestStart

      if (loadTime > 1000) { // Resources taking more than 1s
        slowResources.push(resource)
      }

      totalLoadTime += loadTime

      if (resource.name.includes('.js')) scripts++
      else if (resource.name.includes('.css')) stylesheets++
      else if (resource.name.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) images++
      else if (resource.name.includes('/api/')) api++
    })

    return {
      scripts,
      stylesheets,
      images,
      api,
      totalLoadTime,
      slowResources
    }
  }

  // Cleanup
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect()
    }
    this.clearMetrics()
  }
}

// React hooks for performance monitoring
export function usePerformanceMonitor() {
  const monitor = PerformanceMonitor.getInstance()
  
  return {
    startBenchmark: monitor.startBenchmark.bind(monitor),
    endBenchmark: monitor.endBenchmark.bind(monitor),
    trackRender: monitor.trackRender.bind(monitor),
    getCurrentMetrics: monitor.getCurrentMetrics.bind(monitor),
    getMemoryUsage: monitor.getMemoryUsage.bind(monitor),
    generateReport: monitor.generateReport.bind(monitor),
    analyzeResourceTiming: monitor.analyzeResourceTiming.bind(monitor),
    clearMetrics: monitor.clearMetrics.bind(monitor)
  }
}

// Performance decorator for measuring function execution time
export function measurePerformance(name: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = function (...args: any[]) {
      const monitor = PerformanceMonitor.getInstance()
      const benchmarkId = `${name}_${propertyKey}_${Date.now()}`
      
      monitor.startBenchmark(benchmarkId, `${name}.${propertyKey}`)
      
      try {
        const result = originalMethod.apply(this, args)
        
        if (result instanceof Promise) {
          return result.finally(() => {
            monitor.endBenchmark(benchmarkId)
          })
        } else {
          monitor.endBenchmark(benchmarkId)
          return result
        }
      } catch (error) {
        monitor.endBenchmark(benchmarkId)
        throw error
      }
    }

    return descriptor
  }
}

// Web Vitals measurement utilities
export const webVitals = {
  // Measure Cumulative Layout Shift
  measureCLS(): Promise<number> {
    return new Promise((resolve) => {
      let clsValue = 0
      
      if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
        resolve(0)
        return
      }

      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          }
          resolve(clsValue)
        })

        observer.observe({ type: 'layout-shift', buffered: true })
        
        // Resolve after 5 seconds if no entries
        setTimeout(() => resolve(clsValue), 5000)
      } catch (error) {
        resolve(0)
      }
    })
  },

  // Measure First Input Delay
  measureFID(): Promise<number> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
        resolve(0)
        return
      }

      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            resolve(entry.processingStart - entry.startTime)
            break
          }
        })

        observer.observe({ type: 'first-input', buffered: true })
        
        // Resolve with 0 after 10 seconds if no input
        setTimeout(() => resolve(0), 10000)
      } catch (error) {
        resolve(0)
      }
    })
  },

  // Get all Web Vitals
  async getAllVitals(): Promise<{
    lcp: number | undefined
    fcp: number | undefined
    cls: number
    fid: number
    inp: number | undefined
  }> {
    const monitor = PerformanceMonitor.getInstance()
    const metrics = monitor.getCurrentMetrics()
    
    const [cls, fid] = await Promise.all([
      this.measureCLS(),
      this.measureFID()
    ])

    return {
      lcp: metrics.largestContentfulPaint,
      fcp: metrics.firstContentfulPaint,
      cls,
      fid,
      inp: metrics.interactionToNextPaint
    }
  }
}

// Performance optimization utilities
export const performanceUtils = {
  // Debounce function calls for performance
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
    immediate: boolean = false
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | undefined

    return function (this: any, ...args: Parameters<T>) {
      const callNow = immediate && !timeout

      const later = () => {
        timeout = undefined
        if (!immediate) func.apply(this, args)
      }

      clearTimeout(timeout)
      timeout = setTimeout(later, wait)

      if (callNow) func.apply(this, args)
    }
  },

  // Throttle function calls
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let lastFunc: NodeJS.Timeout
    let lastRan: number

    return function (this: any, ...args: Parameters<T>) {
      if (!lastRan) {
        func.apply(this, args)
        lastRan = Date.now()
      } else {
        clearTimeout(lastFunc)
        lastFunc = setTimeout(() => {
          if (Date.now() - lastRan >= limit) {
            func.apply(this, args)
            lastRan = Date.now()
          }
        }, limit - (Date.now() - lastRan))
      }
    }
  },

  // Optimize large dataset rendering
  optimizeForLargeDataset<T>(
    data: T[],
    chunkSize: number = 100
  ): {
    chunks: T[][]
    totalChunks: number
    getChunk: (index: number) => T[] | undefined
  } {
    const chunks: T[][] = []
    
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize))
    }

    return {
      chunks,
      totalChunks: chunks.length,
      getChunk: (index: number) => chunks[index]
    }
  },

  // Calculate virtual scrolling parameters
  calculateVirtualScrollParams(
    totalItems: number,
    itemHeight: number,
    containerHeight: number,
    scrollTop: number
  ): {
    startIndex: number
    endIndex: number
    visibleItems: number
    offsetY: number
  } {
    const visibleItems = Math.ceil(containerHeight / itemHeight) + 2 // 2 buffer items
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(startIndex + visibleItems, totalItems)
    const offsetY = startIndex * itemHeight

    return {
      startIndex: Math.max(0, startIndex),
      endIndex,
      visibleItems,
      offsetY
    }
  }
}

export default PerformanceMonitor