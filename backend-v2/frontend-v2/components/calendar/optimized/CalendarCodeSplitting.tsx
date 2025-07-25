'use client'

import React, { lazy, Suspense, memo, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'

// Skeleton components for lazy loading
const CalendarSkeleton = memo(function CalendarSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }, (_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded"></div>
        ))}
      </div>
    </div>
  )
})

const ComponentSkeleton = memo(function ComponentSkeleton({ height = "h-32" }: { height?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-lg ${height} w-full`}>
      <div className="flex items-center justify-center h-full">
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-75"></div>
          <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-150"></div>
        </div>
      </div>
    </div>
  )
})

// Lazy loaded calendar components with bundle splitting
const LazyCalendarSync = lazy(() => 
  import('@/components/CalendarSync').then(module => ({
    default: module.default || module.CalendarSync
  }))
)

const LazyConflictResolver = lazy(() => 
  import('@/components/CalendarConflictResolver').then(module => ({
    default: module.default || module.CalendarConflictResolver
  }))
)

const LazyAvailabilityHeatmap = lazy(() => 
  import('@/components/calendar/AvailabilityHeatmap').then(module => ({
    default: module.default || module.AvailabilityHeatmap
  }))
)

const LazyCalendarAnalyticsSidebar = lazy(() => 
  import('@/components/calendar/CalendarAnalyticsSidebar').then(module => ({
    default: module.default || module.CalendarAnalyticsSidebar
  }))
)

const LazyEnhancedRevenueDisplay = lazy(() => 
  import('@/components/calendar/EnhancedRevenueDisplay').then(module => ({
    default: module.default || module.EnhancedRevenueDisplay
  }))
)

const LazyQuickBookingPanel = lazy(() => 
  import('@/components/calendar/QuickBookingPanel').then(module => ({
    default: module.default || module.QuickBookingPanel
  }))
)

const LazyQuickBookingFAB = lazy(() => 
  import('@/components/calendar/QuickBookingFAB').then(module => ({
    default: module.default || module.QuickBookingFAB
  }))
)

const LazyCalendarExport = lazy(() => 
  import('@/components/calendar/CalendarExport').then(module => ({
    default: module.default || module.CalendarExport
  }))
)

// Preload strategies for better UX
const preloadComponents = {
  calendarSync: () => import('@/components/CalendarSync'),
  conflictResolver: () => import('@/components/CalendarConflictResolver'),
  heatmap: () => import('@/components/calendar/AvailabilityHeatmap'),
  analytics: () => import('@/components/calendar/CalendarAnalyticsSidebar'),
  revenue: () => import('@/components/calendar/EnhancedRevenueDisplay'),
  quickBooking: () => import('@/components/calendar/QuickBookingPanel'),
  export: () => import('@/components/calendar/CalendarExport'),
}

// Progressive enhancement wrapper
interface ProgressiveComponentProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  preload?: boolean
  onError?: (error: Error) => void
}

const ProgressiveComponent = memo(function ProgressiveComponent({ 
  children, 
  fallback = <ComponentSkeleton />,
  onError 
}: ProgressiveComponentProps) {
  return (
    <Suspense 
      fallback={fallback}
    >
      <ErrorBoundary onError={onError}>
        {children}
      </ErrorBoundary>
    </Suspense>
  )
})

// Error boundary for lazy loaded components
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Calendar component error:', error, errorInfo)
    this.props.onError?.(error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-medium">Component Error</h3>
          <p className="text-red-600 text-sm mt-1">
            This feature is temporarily unavailable. Please refresh the page.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => this.setState({ hasError: false })}
          >
            Retry
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

// Smart loading component with intersection observer
interface SmartLoadProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  preload?: keyof typeof preloadComponents
  priority?: 'high' | 'medium' | 'low'
  onVisible?: () => void
}

const SmartLoad = memo(function SmartLoad({ 
  children, 
  fallback = <ComponentSkeleton />,
  preload,
  priority = 'medium',
  onVisible 
}: SmartLoadProps) {
  const [isVisible, setIsVisible] = useState(priority === 'high')
  const [isPreloaded, setIsPreloaded] = useState(false)
  const observerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            onVisible?.()
            
            // Preload related components
            if (preload && !isPreloaded) {
              preloadComponents[preload]().then(() => {
                setIsPreloaded(true)
              })
            }
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: priority === 'high' ? '0px' : '200px' // Preload based on priority
      }
    )

    if (observerRef.current) {
      observer.observe(observerRef.current)
    }

    return () => observer.disconnect()
  }, [preload, priority, isPreloaded, onVisible])

  return (
    <div ref={observerRef}>
      {isVisible ? (
        <Suspense fallback={fallback}>
          {children}
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  )
})

// Calendar component interfaces for better type safety
interface CalendarSyncWrapperProps {
  isVisible: boolean
  onToggle: () => void
}

interface ConflictResolverWrapperProps {
  isVisible: boolean
  onToggle: () => void
}

interface HeatmapWrapperProps {
  appointments: any[]
  startDate: Date
  onTimeSlotClick: (date: Date, time: string) => void
}

interface AnalyticsWrapperProps {
  appointments: any[]
  selectedDate: Date
  userId?: number
  isOpen: boolean
  onToggle: () => void
  position: 'left' | 'right'
}

// Smart wrapped components with progressive enhancement
export const CalendarSyncWrapper = memo(function CalendarSyncWrapper({ 
  isVisible, 
  onToggle 
}: CalendarSyncWrapperProps) {
  const handlePreload = useCallback(() => {
    preloadComponents.calendarSync()
  }, [])

  if (!isVisible) return null

  return (
    <SmartLoad 
      preload="calendarSync"
      priority="medium"
      onVisible={handlePreload}
      fallback={<ComponentSkeleton height="h-40" />}
    >
      <LazyCalendarSync />
    </SmartLoad>
  )
})

export const ConflictResolverWrapper = memo(function ConflictResolverWrapper({ 
  isVisible, 
  onToggle 
}: ConflictResolverWrapperProps) {
  const handlePreload = useCallback(() => {
    preloadComponents.conflictResolver()
  }, [])

  if (!isVisible) return null

  return (
    <SmartLoad 
      preload="conflictResolver"
      priority="low"
      onVisible={handlePreload}
      fallback={<ComponentSkeleton height="h-40" />}
    >
      <LazyConflictResolver />
    </SmartLoad>
  )
})

export const HeatmapWrapper = memo(function HeatmapWrapper({ 
  appointments, 
  startDate, 
  onTimeSlotClick 
}: HeatmapWrapperProps) {
  return (
    <SmartLoad 
      preload="heatmap"
      priority="low"
      fallback={<ComponentSkeleton height="h-96" />}
    >
      <LazyAvailabilityHeatmap
        appointments={appointments}
        startDate={startDate}
        onTimeSlotClick={onTimeSlotClick}
      />
    </SmartLoad>
  )
})

export const AnalyticsWrapper = memo(function AnalyticsWrapper({ 
  appointments, 
  selectedDate, 
  userId, 
  isOpen, 
  onToggle, 
  position 
}: AnalyticsWrapperProps) {
  const handlePreload = useCallback(() => {
    if (isOpen) {
      preloadComponents.analytics()
    }
  }, [isOpen])

  return (
    <SmartLoad 
      preload="analytics"
      priority={isOpen ? 'high' : 'low'}
      onVisible={handlePreload}
      fallback={<ComponentSkeleton height="h-full" />}
    >
      <LazyCalendarAnalyticsSidebar
        appointments={appointments}
        selectedDate={selectedDate}
        userId={userId}
        isOpen={isOpen}
        onToggle={onToggle}
        position={position}
      />
    </SmartLoad>
  )
})

export const RevenueDisplayWrapper = memo(function RevenueDisplayWrapper({ 
  appointments, 
  todayRevenue, 
  todayCount, 
  selectedDate, 
  collapsed, 
  onToggleCollapse 
}: {
  appointments: any[]
  todayRevenue: number
  todayCount: number
  selectedDate: Date
  collapsed?: boolean
  onToggleCollapse?: () => void
}) {
  return (
    <SmartLoad 
      preload="revenue"
      priority="high"
      fallback={<ComponentSkeleton height="h-24" />}
    >
      <LazyEnhancedRevenueDisplay
        appointments={appointments}
        todayRevenue={todayRevenue}
        todayCount={todayCount}
        selectedDate={selectedDate}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
      />
    </SmartLoad>
  )
})

export const QuickBookingWrapper = memo(function QuickBookingWrapper({ 
  onBookingComplete,
  variant = 'panel'
}: {
  onBookingComplete: () => void
  variant?: 'panel' | 'fab'
}) {
  const Component = variant === 'fab' ? LazyQuickBookingFAB : LazyQuickBookingPanel
  
  return (
    <ProgressiveComponent fallback={<ComponentSkeleton height="h-32" />}>
      <Component onBookingComplete={onBookingComplete} />
    </ProgressiveComponent>
  )
})

export const CalendarExportWrapper = memo(function CalendarExportWrapper({ 
  appointments,
  selectedAppointments,
  onExport
}: {
  appointments: any[]
  selectedAppointments: any[]
  onExport: (format: string) => void
}) {
  return (
    <SmartLoad 
      preload="export"
      priority="low"
      fallback={
        <Button variant="outline" disabled>
          <div className="w-4 h-4 bg-gray-300 rounded animate-pulse mr-2" />
          Export
        </Button>
      }
    >
      <LazyCalendarExport
        appointments={appointments}
        selectedAppointments={selectedAppointments}
        onExport={onExport}
      />
    </SmartLoad>
  )
})

// Preload manager for strategic component loading
export const useCalendarPreloader = () => {
  const [preloadedComponents, setPreloadedComponents] = useState<Set<string>>(new Set())

  const preloadComponent = useCallback(async (componentName: keyof typeof preloadComponents) => {
    if (preloadedComponents.has(componentName)) return

    try {
      await preloadComponents[componentName]()
      setPreloadedComponents(prev => new Set(prev).add(componentName))
    } catch (error) {
      console.error(`Failed to preload component ${componentName}:`, error)
    }
  }, [preloadedComponents])

  const preloadCriticalComponents = useCallback(async () => {
    const critical: (keyof typeof preloadComponents)[] = ['revenue', 'quickBooking']
    await Promise.all(critical.map(preloadComponent))
  }, [preloadComponent])

  const preloadOnInteraction = useCallback(async () => {
    const interactive: (keyof typeof preloadComponents)[] = ['heatmap', 'analytics', 'export']
    // Preload after a short delay to not block critical path
    setTimeout(() => {
      Promise.all(interactive.map(preloadComponent))
    }, 1000)
  }, [preloadComponent])

  return {
    preloadComponent,
    preloadCriticalComponents,
    preloadOnInteraction,
    preloadedComponents: Array.from(preloadedComponents)
  }
}

// Export all components and utilities
export {
  CalendarSkeleton,
  ComponentSkeleton,
  ProgressiveComponent,
  SmartLoad,
  preloadComponents
}