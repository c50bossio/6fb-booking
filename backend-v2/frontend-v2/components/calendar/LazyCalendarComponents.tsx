'use client'

import React, { lazy, Suspense } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

/**
 * Lazy-loaded calendar components for better performance
 * Only loads components when they're actually needed
 */

// Lazy load heavy components
const AppointmentSuggestions = lazy(() => import('./AppointmentSuggestions').then(module => ({
  default: module.AppointmentSuggestions
})))

const CalendarVisualEnhancement = lazy(() => import('./CalendarVisualEnhancement').then(module => ({
  default: module.CalendarVisualEnhancement
})))

const MobileCalendarNavigation = lazy(() => import('./MobileCalendarNavigation').then(module => ({
  default: module.MobileCalendarNavigation
})))

const ResponsiveCalendarLayout = lazy(() => import('./ResponsiveCalendarLayout').then(module => ({
  default: module.ResponsiveCalendarLayout
})))

// Loading fallback components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
)

const SkeletonCard = () => (
  <div className="animate-pulse">
    <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-20 w-full" />
  </div>
)

const SkeletonSuggestions = () => (
  <div className="space-y-2">
    {Array.from({ length: 2 }, (_, i) => (
      <div key={i} className="animate-pulse">
        <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-16 w-full" />
      </div>
    ))}
  </div>
)

// Wrapper components with error boundaries and loading states
interface LazyComponentWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  errorMessage?: string
}

function LazyComponentWrapper({ 
  children, 
  fallback = <LoadingSpinner />,
  errorMessage = "Failed to load component"
}: LazyComponentWrapperProps) {
  return (
    <ErrorBoundary fallback={<div className="text-red-500 text-sm p-4">{errorMessage}</div>}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

// Lazy-loaded components with optimized loading
export function LazySuggestions(props: any) {
  return (
    <LazyComponentWrapper 
      fallback={<SkeletonSuggestions />}
      errorMessage="Failed to load appointment suggestions"
    >
      <AppointmentSuggestions {...props} />
    </LazyComponentWrapper>
  )
}

export function LazyVisualEnhancement(props: any) {
  return (
    <LazyComponentWrapper 
      fallback={<SkeletonCard />}
      errorMessage="Failed to load visual enhancements"
    >
      <CalendarVisualEnhancement {...props} />
    </LazyComponentWrapper>
  )
}

export function LazyMobileNavigation(props: any) {
  return (
    <LazyComponentWrapper
      fallback={<div className="h-16 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />}
      errorMessage="Failed to load mobile navigation"
    >
      <MobileCalendarNavigation {...props} />
    </LazyComponentWrapper>
  )
}

export function LazyResponsiveLayout(props: any) {
  return (
    <LazyComponentWrapper
      fallback={<div className="w-full h-96 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />}
      errorMessage="Failed to load responsive layout"
    >
      <ResponsiveCalendarLayout {...props} />
    </LazyComponentWrapper>
  )
}

// Preload functions for critical components
export function preloadCalendarComponents() {
  // Preload components that are likely to be used soon
  const preloadPromises = [
    import('./AppointmentSuggestions'),
    import('./CalendarVisualEnhancement'),
    import('./MobileCalendarNavigation'),
    import('./ResponsiveCalendarLayout')
  ]

  return Promise.allSettled(preloadPromises)
}

// Hook for conditional component loading based on viewport
export function useConditionalLoading(
  condition: boolean,
  Component: React.LazyExoticComponent<React.ComponentType<any>>
) {
  const [shouldLoad, setShouldLoad] = React.useState(false)

  React.useEffect(() => {
    if (condition && !shouldLoad) {
      setShouldLoad(true)
    }
  }, [condition, shouldLoad])

  const ConditionalComponent = React.useMemo(() => {
    if (!shouldLoad) return null
    
    return React.forwardRef<any, any>((props, ref) => (
      <Suspense fallback={<LoadingSpinner />}>
        <Component {...props} ref={ref} />
      </Suspense>
    ))
  }, [shouldLoad, Component])

  return ConditionalComponent
}