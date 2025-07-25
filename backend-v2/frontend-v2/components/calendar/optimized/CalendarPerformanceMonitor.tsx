'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PerformanceMetrics {
  // Render Performance
  avgRenderTime: number
  maxRenderTime: number
  renderCount: number
  slowRenders: number
  
  // Memory Usage
  currentMemoryMB: number
  peakMemoryMB: number
  memoryGrowthRate: number
  
  // Cache Performance
  cacheHitRate: number
  cacheSize: number
  cacheEvictions: number
  
  // User Interactions
  avgInteractionLatency: number
  maxInteractionLatency: number
  interactionCount: number
  slowInteractions: number
  
  // Network Performance
  apiCallCount: number
  avgApiResponseTime: number
  failedApiCalls: number
  
  // Bundle Performance
  bundleSize?: number
  loadTime?: number
  timeToInteractive?: number
}

interface PerformanceAlert {
  id: string
  type: 'warning' | 'error' | 'info'
  message: string
  timestamp: number
  metric: keyof PerformanceMetrics
  value: number
  threshold: number
}

// Performance thresholds for alerting
const PERFORMANCE_THRESHOLDS = {
  avgRenderTime: 50, // ms
  maxRenderTime: 100, // ms
  currentMemoryMB: 100, // MB
  memoryGrowthRate: 5, // MB/minute
  avgInteractionLatency: 100, // ms
  cacheHitRate: 70, // percentage
  avgApiResponseTime: 1000, // ms
  bundleSize: 3 * 1024 * 1024, // 3MB
} as const

class CalendarPerformanceTracker {
  private metrics: PerformanceMetrics
  private alerts: PerformanceAlert[]
  private observers: ((metrics: PerformanceMetrics, alerts: PerformanceAlert[]) => void)[]
  private startTime: number
  private lastMemoryCheck: number
  private initialMemory: number

  constructor() {
    this.metrics = {
      avgRenderTime: 0,
      maxRenderTime: 0,
      renderCount: 0,
      slowRenders: 0,
      currentMemoryMB: 0,
      peakMemoryMB: 0,
      memoryGrowthRate: 0,
      cacheHitRate: 0,
      cacheSize: 0,
      cacheEvictions: 0,
      avgInteractionLatency: 0,
      maxInteractionLatency: 0,
      interactionCount: 0,
      slowInteractions: 0,
      apiCallCount: 0,
      avgApiResponseTime: 0,
      failedApiCalls: 0,
    }
    
    this.alerts = []
    this.observers = []
    this.startTime = Date.now()
    this.lastMemoryCheck = Date.now()
    this.initialMemory = this.getCurrentMemoryUsage()

    this.initializeMonitoring()
  }

  private getCurrentMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memInfo = (performance as any).memory
      return memInfo ? memInfo.usedJSHeapSize / 1024 / 1024 : 0
    }
    return 0
  }

  private initializeMonitoring() {
    // Monitor memory usage every 5 seconds
    setInterval(() => {
      const currentMemory = this.getCurrentMemoryUsage()
      const now = Date.now()
      const timeDiff = (now - this.lastMemoryCheck) / 1000 / 60 // minutes
      
      if (currentMemory > 0) {
        this.metrics.currentMemoryMB = currentMemory
        this.metrics.peakMemoryMB = Math.max(this.metrics.peakMemoryMB, currentMemory)
        
        if (timeDiff > 0) {
          const memoryDiff = currentMemory - this.initialMemory
          this.metrics.memoryGrowthRate = memoryDiff / ((now - this.startTime) / 1000 / 60)
        }
        
        this.checkThreshold('currentMemoryMB', currentMemory)
        this.checkThreshold('memoryGrowthRate', this.metrics.memoryGrowthRate)
      }
      
      this.lastMemoryCheck = now
      this.notifyObservers()
    }, 5000)

    // Monitor bundle size and load times
    if (typeof window !== 'undefined') {
      // Use Navigation Timing API
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        this.metrics.loadTime = navigation.loadEventEnd - navigation.fetchStart
        this.metrics.timeToInteractive = navigation.domInteractive - navigation.fetchStart
      }

      // Estimate bundle size from resource timing
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      const jsResources = resources.filter(r => r.name.includes('.js'))
      this.metrics.bundleSize = jsResources.reduce((total, resource) => {
        return total + (resource.transferSize || resource.encodedBodySize || 0)
      }, 0)

      if (this.metrics.bundleSize) {
        this.checkThreshold('bundleSize', this.metrics.bundleSize)
      }
    }
  }

  trackRender(componentName: string, renderTime: number) {
    this.metrics.renderCount++
    
    // Update average render time
    this.metrics.avgRenderTime = (
      (this.metrics.avgRenderTime * (this.metrics.renderCount - 1) + renderTime) / 
      this.metrics.renderCount
    )
    
    // Update max render time
    this.metrics.maxRenderTime = Math.max(this.metrics.maxRenderTime, renderTime)
    
    // Track slow renders
    if (renderTime > PERFORMANCE_THRESHOLDS.avgRenderTime) {
      this.metrics.slowRenders++
    }
    
    this.checkThreshold('avgRenderTime', this.metrics.avgRenderTime)
    this.checkThreshold('maxRenderTime', renderTime)
    
    if (renderTime > 100) {
      this.addAlert('error', `Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`, 'maxRenderTime', renderTime, 100)
    }
    
    this.notifyObservers()
  }

  trackInteraction(interactionType: string, latency: number) {
    this.metrics.interactionCount++
    
    // Update average interaction latency
    this.metrics.avgInteractionLatency = (
      (this.metrics.avgInteractionLatency * (this.metrics.interactionCount - 1) + latency) / 
      this.metrics.interactionCount
    )
    
    // Update max interaction latency
    this.metrics.maxInteractionLatency = Math.max(this.metrics.maxInteractionLatency, latency)
    
    // Track slow interactions
    if (latency > PERFORMANCE_THRESHOLDS.avgInteractionLatency) {
      this.metrics.slowInteractions++
    }
    
    this.checkThreshold('avgInteractionLatency', this.metrics.avgInteractionLatency)
    
    if (latency > 200) {
      this.addAlert('warning', `Slow interaction: ${interactionType} took ${latency.toFixed(2)}ms`, 'avgInteractionLatency', latency, 200)
    }
    
    this.notifyObservers()
  }

  trackApiCall(endpoint: string, responseTime: number, failed: boolean = false) {
    this.metrics.apiCallCount++
    
    if (failed) {
      this.metrics.failedApiCalls++
    }
    
    // Update average API response time
    this.metrics.avgApiResponseTime = (
      (this.metrics.avgApiResponseTime * (this.metrics.apiCallCount - 1) + responseTime) / 
      this.metrics.apiCallCount
    )
    
    this.checkThreshold('avgApiResponseTime', this.metrics.avgApiResponseTime)
    
    if (responseTime > 2000) {
      this.addAlert('warning', `Slow API call: ${endpoint} took ${responseTime}ms`, 'avgApiResponseTime', responseTime, 2000)
    }
    
    this.notifyObservers()
  }

  trackCache(hitRate: number, size: number, evictions: number) {
    this.metrics.cacheHitRate = hitRate
    this.metrics.cacheSize = size
    this.metrics.cacheEvictions = evictions
    
    this.checkThreshold('cacheHitRate', hitRate)
    
    if (hitRate < 50) {
      this.addAlert('warning', `Low cache hit rate: ${hitRate.toFixed(1)}%`, 'cacheHitRate', hitRate, 50)
    }
    
    this.notifyObservers()
  }

  private checkThreshold(metric: keyof typeof PERFORMANCE_THRESHOLDS, value: number) {
    const threshold = PERFORMANCE_THRESHOLDS[metric]
    if (threshold && value > threshold) {
      this.addAlert('warning', `${metric} exceeded threshold: ${value} > ${threshold}`, metric, value, threshold)
    }
  }

  private addAlert(type: PerformanceAlert['type'], message: string, metric: keyof PerformanceMetrics, value: number, threshold: number) {
    const alert: PerformanceAlert = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      message,
      timestamp: Date.now(),
      metric,
      value,
      threshold
    }
    
    this.alerts.unshift(alert)
    
    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(0, 50)
    }
  }

  subscribe(callback: (metrics: PerformanceMetrics, alerts: PerformanceAlert[]) => void) {
    this.observers.push(callback)
    // Immediately call with current data
    callback(this.metrics, this.alerts)
    
    return () => {
      const index = this.observers.indexOf(callback)
      if (index > -1) {
        this.observers.splice(index, 1)
      }
    }
  }

  private notifyObservers() {
    this.observers.forEach(callback => callback(this.metrics, this.alerts))
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  getAlerts(): PerformanceAlert[] {
    return [...this.alerts]
  }

  clearAlerts() {
    this.alerts = []
    this.notifyObservers()
  }

  generateReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      sessionDuration: Math.round((Date.now() - this.startTime) / 1000),
      metrics: this.metrics,
      recentAlerts: this.alerts.slice(0, 10),
      recommendations: this.generateRecommendations()
    }
    
    return JSON.stringify(report, null, 2)
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = []
    
    if (this.metrics.avgRenderTime > 50) {
      recommendations.push('Consider optimizing component renders with React.memo and useMemo')
    }
    
    if (this.metrics.currentMemoryMB > 100) {
      recommendations.push('High memory usage detected - review cache management and component cleanup')
    }
    
    if (this.metrics.cacheHitRate < 70) {
      recommendations.push('Low cache hit rate - review caching strategy and key generation')
    }
    
    if (this.metrics.avgInteractionLatency > 100) {
      recommendations.push('Slow user interactions - consider debouncing and throttling event handlers')
    }
    
    if (this.metrics.bundleSize && this.metrics.bundleSize > 3 * 1024 * 1024) {
      recommendations.push('Large bundle size - implement code splitting and tree shaking')
    }
    
    return recommendations
  }
}

// Global performance tracker instance
const performanceTracker = new CalendarPerformanceTracker()

// React hook for calendar performance monitoring
export function useCalendarPerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(performanceTracker.getMetrics())
  const [alerts, setAlerts] = useState<PerformanceAlert[]>(performanceTracker.getAlerts())

  useEffect(() => {
    const unsubscribe = performanceTracker.subscribe((newMetrics, newAlerts) => {
      setMetrics(newMetrics)
      setAlerts(newAlerts)
    })

    return unsubscribe
  }, [])

  const trackRender = useCallback((componentName: string, renderTime: number) => {
    performanceTracker.trackRender(componentName, renderTime)
  }, [])

  const trackInteraction = useCallback((interactionType: string, latency: number) => {
    performanceTracker.trackInteraction(interactionType, latency)
  }, [])

  const trackApiCall = useCallback((endpoint: string, responseTime: number, failed?: boolean) => {
    performanceTracker.trackApiCall(endpoint, responseTime, failed)
  }, [])

  const trackCache = useCallback((hitRate: number, size: number, evictions: number) => {
    performanceTracker.trackCache(hitRate, size, evictions)
  }, [])

  const clearAlerts = useCallback(() => {
    performanceTracker.clearAlerts()
  }, [])

  const generateReport = useCallback(() => {
    return performanceTracker.generateReport()
  }, [])

  return {
    metrics,
    alerts,
    trackRender,
    trackInteraction,
    trackApiCall,
    trackCache,
    clearAlerts,
    generateReport
  }
}

// Performance monitor dashboard component
export const CalendarPerformanceDashboard = React.memo(function CalendarPerformanceDashboard({
  isOpen,
  onToggle
}: {
  isOpen: boolean
  onToggle: () => void
}) {
  const { metrics, alerts, clearAlerts, generateReport } = useCalendarPerformanceMonitor()
  const [showAlerts, setShowAlerts] = useState(true)

  const handleDownloadReport = useCallback(() => {
    const report = generateReport()
    const blob = new Blob([report], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `calendar-performance-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [generateReport])

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-50 bg-white shadow-lg"
      >
        📊 Performance
      </Button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 bg-white shadow-2xl rounded-lg border">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Performance Monitor</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadReport}>
            📥 Report
          </Button>
          <Button variant="outline" size="sm" onClick={onToggle}>
            ✕
          </Button>
        </div>
      </div>
      
      <div className="p-4 space-y-4 overflow-auto max-h-80">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="p-2 bg-gray-50 rounded">
            <div className="font-medium">Avg Render</div>
            <div className={metrics.avgRenderTime > 50 ? 'text-red-600' : 'text-green-600'}>
              {metrics.avgRenderTime.toFixed(1)}ms
            </div>
          </div>
          
          <div className="p-2 bg-gray-50 rounded">
            <div className="font-medium">Memory</div>
            <div className={metrics.currentMemoryMB > 100 ? 'text-red-600' : 'text-green-600'}>
              {metrics.currentMemoryMB.toFixed(1)}MB
            </div>
          </div>
          
          <div className="p-2 bg-gray-50 rounded">
            <div className="font-medium">Cache Hit</div>
            <div className={metrics.cacheHitRate < 70 ? 'text-red-600' : 'text-green-600'}>
              {metrics.cacheHitRate.toFixed(1)}%
            </div>
          </div>
          
          <div className="p-2 bg-gray-50 rounded">
            <div className="font-medium">Interactions</div>
            <div className={metrics.avgInteractionLatency > 100 ? 'text-red-600' : 'text-green-600'}>
              {metrics.avgInteractionLatency.toFixed(1)}ms
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">
              Alerts ({alerts.length})
            </h4>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setShowAlerts(!showAlerts)}>
                {showAlerts ? '−' : '+'}
              </Button>
              {alerts.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearAlerts}>
                  Clear
                </Button>
              )}
            </div>
          </div>
          
          {showAlerts && (
            <div className="space-y-1 max-h-32 overflow-auto">
              {alerts.slice(0, 5).map(alert => (
                <div
                  key={alert.id}
                  className={`p-2 rounded text-xs ${
                    alert.type === 'error'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : alert.type === 'warning'
                      ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  <div className="font-medium">{alert.message}</div>
                  <div className="text-xs opacity-70">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

// Export the performance tracker for direct access
export { performanceTracker }