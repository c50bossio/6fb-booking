'use client'

import { useEffect, useRef } from 'react'
import { setupPerformanceMonitoring, trackPerformance, addUserActionBreadcrumb } from '../lib/sentry'

interface PerformanceMonitorProps {
  children: React.ReactNode
  feature?: string
  page?: string
}

/**
 * Component that sets up Sentry performance monitoring
 * and tracks Core Web Vitals automatically
 */
export function SentryPerformanceMonitor({ 
  children, 
  feature = 'unknown',
  page = 'unknown'
}: PerformanceMonitorProps) {
  const initRef = useRef(false)
  const performanceObserverRef = useRef<PerformanceObserver | null>(null)

  useEffect(() => {
    // Only initialize once
    if (initRef.current) return
    initRef.current = true

    // Set up basic performance monitoring
    setupPerformanceMonitoring()

    // Add page load breadcrumb
    addUserActionBreadcrumb(
      `Page loaded: ${page}`,
      'navigation',
      {
        feature,
        page,
        timestamp: performance.now(),
      }
    )

    // Set up Resource Timing observer for tracking API calls and assets
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        // Track resource performance (API calls, images, scripts, etc.)
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          
          entries.forEach((entry) => {
            // Focus on API calls and important resources
            if (entry.name.includes('/api/') || 
                entry.name.includes('api.bookedbarber.com') ||
                entry.entryType === 'navigation') {
              
              const duration = entry.duration
              const isSlowRequest = duration > 2000 // Slower than 2 seconds
              
              addUserActionBreadcrumb(
                `Resource loaded: ${entry.name.split('/').pop() || 'unknown'}`,
                'navigation',
                {
                  feature,
                  page,
                  url: entry.name,
                  duration: Math.round(duration),
                  type: entry.entryType,
                  slow: isSlowRequest,
                  transferSize: (entry as any).transferSize || 0,
                  responseStatus: (entry as any).responseStatus || 0,
                }
              )
            }
          })
        })

        resourceObserver.observe({ entryTypes: ['resource', 'navigation'] })
        performanceObserverRef.current = resourceObserver

        // Track long tasks (JavaScript blocking the main thread)
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          
          entries.forEach((entry) => {
            addUserActionBreadcrumb(
              'Long task detected',
              'performance',
              {
                feature,
                page,
                duration: Math.round(entry.duration),
                startTime: Math.round(entry.startTime),
                type: 'long-task',
              }
            )
          })
        })

        try {
          longTaskObserver.observe({ entryTypes: ['longtask'] })
        } catch (error) {
          // longtask might not be supported in all browsers
          console.debug('Long task observer not supported:', error)
        }

        // Track paint timing
        const paintObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          
          entries.forEach((entry) => {
            addUserActionBreadcrumb(
              `Paint timing: ${entry.name}`,
              'performance',
              {
                feature,
                page,
                startTime: Math.round(entry.startTime),
                type: 'paint',
                paintType: entry.name,
              }
            )
          })
        })

        try {
          paintObserver.observe({ entryTypes: ['paint'] })
        } catch (error) {
          console.debug('Paint observer not supported:', error)
        }

      } catch (error) {
        console.debug('Performance Observer not fully supported:', error)
      }
    }

    // Track memory usage periodically (if available)
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const trackMemory = () => {
        const memory = (performance as any).memory
        if (memory) {
          addUserActionBreadcrumb(
            'Memory usage tracked',
            'performance',
            {
              feature,
              page,
              usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
              totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
              jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
              type: 'memory',
            }
          )
        }
      }

      // Track memory on page load and then every 30 seconds
      trackMemory()
      const memoryInterval = setInterval(trackMemory, 30000)

      // Cleanup interval on unmount
      return () => {
        clearInterval(memoryInterval)
        if (performanceObserverRef.current) {
          performanceObserverRef.current.disconnect()
        }
      }
    }

    // Cleanup observers on unmount
    return () => {
      if (performanceObserverRef.current) {
        performanceObserverRef.current.disconnect()
      }
    }
  }, [feature, page])

  // Track user interactions
  useEffect(() => {
    const handleVisibilityChange = () => {
      addUserActionBreadcrumb(
        document.hidden ? 'Page hidden' : 'Page visible',
        'interaction',
        {
          feature,
          page,
          hidden: document.hidden,
        }
      )
    }

    const handleBeforeUnload = () => {
      addUserActionBreadcrumb(
        'Page unload started',
        'navigation',
        {
          feature,
          page,
          sessionDuration: Math.round(performance.now()),
        }
      )
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [feature, page])

  return <>{children}</>
}

/**
 * Hook for tracking specific operations with performance monitoring
 */
export function usePerformanceTracking(feature: string) {
  return {
    trackOperation: async <T>(
      operationName: string,
      operation: () => Promise<T> | T,
      metadata?: Record<string, any>
    ): Promise<T> => {
      return trackPerformance(
        operationName,
        {
          feature,
          action: operationName,
          metadata,
        },
        async () => {
          const result = await operation()
          return result
        }
      )
    },

    markInteraction: (action: string, metadata?: Record<string, any>) => {
      addUserActionBreadcrumb(
        action,
        'interaction',
        {
          feature,
          ...metadata,
        }
      )
    },

    markNavigation: (path: string, metadata?: Record<string, any>) => {
      addUserActionBreadcrumb(
        `Navigation to ${path}`,
        'navigation',
        {
          feature,
          path,
          ...metadata,
        }
      )
    },
  }
}

/**
 * Component for tracking specific booking flow performance
 */
export function BookingPerformanceTracker({ children }: { children: React.ReactNode }) {
  const { trackOperation, markInteraction } = usePerformanceTracking('booking')

  useEffect(() => {
    // Track when booking flow is mounted
    markInteraction('Booking flow started')
    
    return () => {
      markInteraction('Booking flow unmounted')
    }
  }, [markInteraction])

  return (
    <SentryPerformanceMonitor feature="booking" page="booking-flow">
      {children}
    </SentryPerformanceMonitor>
  )
}

/**
 * Component for tracking payment flow performance
 */
export function PaymentPerformanceTracker({ children }: { children: React.ReactNode }) {
  const { trackOperation, markInteraction } = usePerformanceTracking('payment')

  useEffect(() => {
    // Track when payment flow is mounted
    markInteraction('Payment flow started')
    
    return () => {
      markInteraction('Payment flow unmounted')
    }
  }, [markInteraction])

  return (
    <SentryPerformanceMonitor feature="payment" page="payment-flow">
      {children}
    </SentryPerformanceMonitor>
  )
}