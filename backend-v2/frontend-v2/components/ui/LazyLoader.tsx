'use client'

import React, { Suspense, lazy, ComponentType } from 'react'
import { LoadingSpinner, CardSkeleton } from '@/components/LoadingStates'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface LazyLoaderProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
  variant?: 'spinner' | 'card' | 'minimal'
  delay?: number
}

interface LazyComponentWrapperProps<T = {}> {
  component: () => Promise<{ default: ComponentType<T> }>
  props?: T
  fallback?: React.ReactNode
  className?: string
  variant?: 'spinner' | 'card' | 'minimal'
  delay?: number
}

// Enhanced loading fallbacks with tasteful design
const LoadingFallbacks = {
  spinner: (className?: string) => (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <LoadingSpinner variant="primary" size="lg" />
    </div>
  ),
  
  card: (className?: string) => (
    <Card className={cn('animate-pulse', className)}>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center space-x-4">
          <div className="w-2 h-8 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-32"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-48"></div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-20 bg-gray-200 dark:bg-gray-600 rounded"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-600 rounded"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-600 rounded"></div>
        </div>
      </CardContent>
    </Card>
  ),
  
  minimal: (className?: string) => (
    <div className={cn('h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse', className)}></div>
  )
}

// Intersection Observer hook for lazy loading trigger
function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false)
  const [hasIntersected, setHasIntersected] = React.useState(false)

  React.useEffect(() => {
    const element = ref.current
    if (!element || hasIntersected) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          setHasIntersected(true)
          observer.disconnect()
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [hasIntersected, options])

  return { isIntersecting, hasIntersected }
}

// Basic lazy loader with Suspense
export function LazyLoader({ 
  children, 
  fallback, 
  className, 
  variant = 'spinner',
  delay = 0 
}: LazyLoaderProps) {
  const [shouldRender, setShouldRender] = React.useState(delay === 0)

  React.useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setShouldRender(true), delay)
      return () => clearTimeout(timer)
    }
  }, [delay])

  if (!shouldRender) {
    return fallback || LoadingFallbacks[variant](className)
  }

  return (
    <Suspense fallback={fallback || LoadingFallbacks[variant](className)}>
      <div className={className}>
        {children}
      </div>
    </Suspense>
  )
}

// Advanced lazy component wrapper with intersection observer
export function LazyComponentWrapper<T = {}>({ 
  component, 
  props, 
  fallback, 
  className, 
  variant = 'card',
  delay = 0 
}: LazyComponentWrapperProps<T>) {
  const ref = React.useRef<HTMLDivElement>(null)
  const { hasIntersected } = useIntersectionObserver(ref, { threshold: 0.1 })
  const [Component, setComponent] = React.useState<ComponentType<T> | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    if (!hasIntersected || Component || loading) return

    setLoading(true)
    setError(null)

    const loadComponent = async () => {
      try {
        // Add artificial delay if specified
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }

        const module = await component()
        setComponent(() => module.default)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load component'))
      } finally {
        setLoading(false)
      }
    }

    loadComponent()
  }, [hasIntersected, component, Component, loading, delay])

  const renderContent = () => {
    if (error) {
      return (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 font-medium mb-2">Failed to load component</div>
            <div className="text-sm text-red-500">{error.message}</div>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-3 px-4 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      )
    }

    if (!Component || loading) {
      return fallback || LoadingFallbacks[variant](className)
    }

    return <Component {...(props as T)} />
  }

  return (
    <div ref={ref} className={className}>
      {renderContent()}
    </div>
  )
}

// Specific lazy loaders for common components
export const LazyAnalytics = React.memo((props: any) => (
  <LazyComponentWrapper
    component={() => import('@/components/analytics/InteractiveAnalytics')}
    props={props}
    variant="card"
    className="w-full"
  />
))
LazyAnalytics.displayName = 'LazyAnalytics'

export const LazySixFigureTracker = React.memo((props: any) => (
  <LazyComponentWrapper
    component={() => import('@/components/analytics/SixFigureGoalTracker')}
    props={props}
    variant="card"
    className="w-full"
  />
))
LazySixFigureTracker.displayName = 'LazySixFigureTracker'

// Utility function to create lazy components
export function createLazyComponent<T = {}>(
  importFunction: () => Promise<{ default: ComponentType<T> }>,
  fallbackVariant: 'spinner' | 'card' | 'minimal' = 'card'
) {
  return React.memo((props: T & { className?: string; delay?: number }) => (
    <LazyComponentWrapper
      component={importFunction}
      props={props}
      variant={fallbackVariant}
      className={props.className}
      delay={props.delay}
    />
  ))
}

// Performance monitoring wrapper
export function withPerformanceMonitoring<T extends {}>(
  WrappedComponent: ComponentType<T>,
  componentName: string
) {
  return React.memo((props: T) => {
    React.useEffect(() => {
      const startTime = performance.now()
      
      return () => {
        const endTime = performance.now()
        const renderTime = endTime - startTime
        
        if (renderTime > 100) { // Log if render takes more than 100ms
          console.warn(`${componentName} took ${renderTime.toFixed(2)}ms to render`)
        }
      }
    }, [])

    return <WrappedComponent {...props} />
  })
}

export default LazyLoader