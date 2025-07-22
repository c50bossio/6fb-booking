'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface PerformanceMetrics {
  bundleLoadTime: number
  componentRenderTime: number
  memoryUsage: number
  networkRequests: number
  totalJsSize: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
}

interface ComponentPerformance {
  componentName: string
  renderCount: number
  averageRenderTime: number
  totalRenderTime: number
  lastRenderTime: number
}

interface BundleAnalysis {
  totalSize: number
  loadedChunks: string[]
  pendingChunks: string[]
  failedChunks: string[]
  duplicateModules: string[]
}

/**
 * Hook for monitoring calendar performance and bundle optimization
 */
export function usePerformanceMonitoring(componentName: string = 'Calendar') {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    bundleLoadTime: 0,
    componentRenderTime: 0,
    memoryUsage: 0,
    networkRequests: 0,
    totalJsSize: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    cumulativeLayoutShift: 0
  })

  const [componentPerf, setComponentPerf] = useState<ComponentPerformance>({
    componentName,
    renderCount: 0,
    averageRenderTime: 0,
    totalRenderTime: 0,
    lastRenderTime: 0
  })

  const renderStartTime = useRef<number>(0)
  const observerRef = useRef<PerformanceObserver | null>(null)

  // Measure component render performance
  const measureRenderStart = useCallback(() => {
    renderStartTime.current = performance.now()
  }, [])

  const measureRenderEnd = useCallback(() => {
    if (renderStartTime.current === 0) return

    const renderTime = performance.now() - renderStartTime.current
    
    setComponentPerf(prev => {
      const newRenderCount = prev.renderCount + 1
      const newTotalTime = prev.totalRenderTime + renderTime
      
      return {
        ...prev,
        renderCount: newRenderCount,
        lastRenderTime: renderTime,
        totalRenderTime: newTotalTime,
        averageRenderTime: newTotalTime / newRenderCount
      }
    })

    renderStartTime.current = 0
  }, [])

  // Measure bundle and network performance
  const measureBundlePerformance = useCallback(() => {
    if (typeof window === 'undefined' || !('performance' in window)) return

    try {
      // Get navigation timing
      const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const bundleLoadTime = navTiming ? navTiming.loadEventEnd - navTiming.navigationStart : 0

      // Get resource timing for JS bundles
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      const jsResources = resources.filter(resource => 
        resource.name.includes('.js') || resource.name.includes('_next')
      )
      
      const totalJsSize = jsResources.reduce((total, resource) => 
        total + (resource.transferSize || 0), 0
      )

      // Get paint timing
      const paintEntries = performance.getEntriesByType('paint')
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0

      // Get memory usage (if available)
      const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0

      setMetrics(prev => ({
        ...prev,
        bundleLoadTime,
        networkRequests: resources.length,
        totalJsSize,
        firstContentfulPaint: fcp,
        memoryUsage
      }))
    } catch (error) {
      console.warn('Performance measurement failed:', error)
    }
  }, [])

  // Set up performance observer
  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

    try {
      observerRef.current = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        
        entries.forEach(entry => {
          if (entry.entryType === 'largest-contentful-paint') {
            setMetrics(prev => ({
              ...prev,
              largestContentfulPaint: entry.startTime
            }))
          }
          
          if (entry.entryType === 'layout-shift') {
            const layoutShiftEntry = entry as any
            if (layoutShiftEntry.hadRecentInput) return
            
            setMetrics(prev => ({
              ...prev,
              cumulativeLayoutShift: prev.cumulativeLayoutShift + layoutShiftEntry.value
            }))
          }
        })
      })

      observerRef.current.observe({ 
        entryTypes: ['largest-contentful-paint', 'layout-shift'] 
      })
    } catch (error) {
      console.warn('PerformanceObserver setup failed:', error)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  // Initial performance measurement
  useEffect(() => {
    const timer = setTimeout(measureBundlePerformance, 1000) // Wait for initial load
    return () => clearTimeout(timer)
  }, [measureBundlePerformance])

  // Bundle analysis function
  const analyzeBundleSize = useCallback(async (): Promise<BundleAnalysis> => {
    if (typeof window === 'undefined') {
      return {
        totalSize: 0,
        loadedChunks: [],
        pendingChunks: [],
        failedChunks: [],
        duplicateModules: []
      }
    }

    try {
      // Get loaded scripts
      const scripts = Array.from(document.querySelectorAll('script[src]'))
      const loadedChunks = scripts
        .map(script => (script as HTMLScriptElement).src)
        .filter(src => src.includes('_next') || src.includes('chunks'))

      // Calculate total size from performance entries
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      const chunkResources = resources.filter(resource => 
        loadedChunks.some(chunk => resource.name.includes(chunk.split('/').pop() || ''))
      )

      const totalSize = chunkResources.reduce((total, resource) => 
        total + (resource.transferSize || 0), 0
      )

      // Check for failed loads
      const failedChunks = chunkResources
        .filter(resource => resource.responseStatus >= 400)
        .map(resource => resource.name)

      return {
        totalSize,
        loadedChunks: loadedChunks.map(chunk => chunk.split('/').pop() || chunk),
        pendingChunks: [], // Would need more complex logic to detect
        failedChunks,
        duplicateModules: [] // Would need webpack stats to detect
      }
    } catch (error) {
      console.warn('Bundle analysis failed:', error)
      return {
        totalSize: 0,
        loadedChunks: [],
        pendingChunks: [],
        failedChunks: [],
        duplicateModules: []
      }
    }
  }, [])

  // Performance scoring
  const getPerformanceScore = useCallback((): number => {
    let score = 100

    // Deduct points for slow metrics
    if (metrics.firstContentfulPaint > 2500) score -= 20
    else if (metrics.firstContentfulPaint > 1800) score -= 10

    if (metrics.largestContentfulPaint > 4000) score -= 20
    else if (metrics.largestContentfulPaint > 2500) score -= 10

    if (metrics.cumulativeLayoutShift > 0.25) score -= 20
    else if (metrics.cumulativeLayoutShift > 0.1) score -= 10

    if (metrics.totalJsSize > 1024 * 1024) score -= 15 // 1MB
    else if (metrics.totalJsSize > 512 * 1024) score -= 8 // 512KB

    if (componentPerf.averageRenderTime > 16) score -= 10 // 60fps target

    return Math.max(0, score)
  }, [metrics, componentPerf])

  // Get performance recommendations
  const getRecommendations = useCallback((): string[] => {
    const recommendations: string[] = []

    if (metrics.firstContentfulPaint > 2500) {
      recommendations.push('Consider code splitting to reduce initial bundle size')
    }

    if (metrics.largestContentfulPaint > 4000) {
      recommendations.push('Optimize images and lazy load non-critical content')
    }

    if (metrics.cumulativeLayoutShift > 0.25) {
      recommendations.push('Reserve space for dynamic content to reduce layout shifts')
    }

    if (metrics.totalJsSize > 1024 * 1024) {
      recommendations.push('Bundle size is large - consider removing unused dependencies')
    }

    if (componentPerf.averageRenderTime > 16) {
      recommendations.push('Component render time is slow - consider React.memo() or optimization')
    }

    if (metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
      recommendations.push('Memory usage is high - check for memory leaks')
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance looks good! Keep monitoring for regressions.')
    }

    return recommendations
  }, [metrics, componentPerf])

  return {
    metrics,
    componentPerf,
    measureRenderStart,
    measureRenderEnd,
    analyzeBundleSize,
    getPerformanceScore,
    getRecommendations,
    // Utility functions
    formatBytes: (bytes: number) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
    },
    formatTime: (ms: number) => {
      if (ms < 1000) return `${ms.toFixed(1)}ms`
      return `${(ms / 1000).toFixed(2)}s`
    }
  }
}

/**
 * Hook for monitoring bundle loading and optimizing code splitting
 */
export function useBundleOptimization() {
  const [loadedModules, setLoadedModules] = useState<Set<string>>(new Set())
  const [pendingModules, setPendingModules] = useState<Set<string>>(new Set())

  const trackModuleLoad = useCallback((moduleName: string) => {
    setPendingModules(prev => {
      const newSet = new Set(prev)
      newSet.add(moduleName)
      return newSet
    })

    return () => {
      setPendingModules(prev => {
        const newSet = new Set(prev)
        newSet.delete(moduleName)
        return newSet
      })
      
      setLoadedModules(prev => {
        const newSet = new Set(prev)
        newSet.add(moduleName)
        return newSet
      })
    }
  }, [])

  const preloadModule = useCallback(async (importFn: () => Promise<any>) => {
    try {
      await importFn()
    } catch (error) {
      console.warn('Module preload failed:', error)
    }
  }, [])

  const getLoadingStats = useCallback(() => ({
    loaded: loadedModules.size,
    pending: pendingModules.size,
    loadedModules: Array.from(loadedModules),
    pendingModules: Array.from(pendingModules)
  }), [loadedModules, pendingModules])

  return {
    trackModuleLoad,
    preloadModule,
    getLoadingStats,
    loadingStats: getLoadingStats()
  }
}

/**
 * Performance monitoring component for development
 */
interface PerformanceMonitorProps {
  componentName?: string
  showInProduction?: boolean
}

export function PerformanceMonitor({ 
  componentName = 'Component',
  showInProduction = false 
}: PerformanceMonitorProps) {
  const {
    metrics,
    componentPerf,
    getPerformanceScore,
    getRecommendations,
    formatBytes,
    formatTime
  } = usePerformanceMonitoring(componentName)

  const [isVisible, setIsVisible] = useState(false)

  // Only show in development unless explicitly enabled for production
  useEffect(() => {
    setIsVisible(process.env.NODE_ENV === 'development' || showInProduction)
  }, [showInProduction])

  if (!isVisible) return null

  const score = getPerformanceScore()
  const recommendations = getRecommendations()

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-sm text-xs">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900 dark:text-white">Performance</h4>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          score >= 90 ? 'bg-green-100 text-green-700' :
          score >= 70 ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {score}/100
        </div>
      </div>

      <div className="space-y-1 text-gray-600 dark:text-gray-400">
        <div>Bundle: {formatBytes(metrics.totalJsSize)}</div>
        <div>FCP: {formatTime(metrics.firstContentfulPaint)}</div>
        <div>LCP: {formatTime(metrics.largestContentfulPaint)}</div>
        <div>Renders: {componentPerf.renderCount}</div>
        <div>Avg Render: {formatTime(componentPerf.averageRenderTime)}</div>
      </div>

      {recommendations.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
          <div className="text-gray-500 dark:text-gray-400 text-xs">
            {recommendations[0]}
          </div>
        </div>
      )}
    </div>
  )
}