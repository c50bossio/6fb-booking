'use client'

import React, { Suspense, lazy } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring'

// Core calendar components (always loaded)
import { JumpToTodayButton } from './JumpToTodayButton'

// Conditionally loaded components based on device/usage
const AppointmentTooltip = lazy(() => import('./AppointmentTooltip').then(module => ({
  default: module.AppointmentTooltip
})))

const CalendarVisualEnhancement = lazy(() => import('./CalendarVisualEnhancement').then(module => ({
  default: module.CalendarVisualEnhancement
})))

const AppointmentSuggestions = lazy(() => import('./AppointmentSuggestions').then(module => ({
  default: module.AppointmentSuggestions
})))

const MobileCalendarNavigation = lazy(() => import('./MobileCalendarNavigation').then(module => ({
  default: module.MobileCalendarNavigation
})))

const ResponsiveCalendarLayout = lazy(() => import('./ResponsiveCalendarLayout').then(module => ({
  default: module.ResponsiveCalendarLayout
})))

// Loading components
const CalendarSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: 35 }, (_, i) => (
        <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
      ))}
    </div>
  </div>
)

const NavigationSkeleton = () => (
  <div className="animate-pulse h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
)

const SuggestionsSkeleton = () => (
  <div className="animate-pulse space-y-2">
    {Array.from({ length: 2 }, (_, i) => (
      <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
    ))}
  </div>
)

interface OptimizedCalendarProps {
  currentDate: Date
  selectedDate?: Date | null
  appointments?: any[]
  onDateChange: (date: Date) => void
  onDateSelect?: (date: Date) => void
  viewMode: 'day' | 'week' | 'month'
  onViewModeChange: (mode: 'day' | 'week' | 'month') => void
  showSuggestions?: boolean
  showVisualEnhancements?: boolean
  enableTouchGestures?: boolean
  className?: string
}

/**
 * Optimized calendar with intelligent component loading
 * Only loads features that are needed for the current device/context
 */
export function OptimizedCalendar({
  currentDate,
  selectedDate,
  appointments = [],
  onDateChange,
  onDateSelect,
  viewMode,
  onViewModeChange,
  showSuggestions = true,
  showVisualEnhancements = true,
  enableTouchGestures = true,
  className = ''
}: OptimizedCalendarProps) {
  // Device detection
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isTouchDevice = useMediaQuery('(hover: none) and (pointer: coarse)')
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  
  // Performance monitoring (development only)
  const { measureRenderStart, measureRenderEnd } = usePerformanceMonitoring('OptimizedCalendar')

  // Measure render performance
  React.useEffect(() => {
    measureRenderStart()
    return measureRenderEnd
  })

  // Determine which features to load based on device capabilities
  const shouldLoadMobileNav = isMobile && enableTouchGestures
  const shouldLoadVisualEnhancements = showVisualEnhancements && !prefersReducedMotion
  const shouldLoadSuggestions = showSuggestions && appointments.length > 5 // Only if enough data
  const shouldLoadTooltips = !isTouchDevice // Desktop-only feature

  // Preload critical components on hover/interaction
  React.useEffect(() => {
    if (!isMobile) {
      // Preload mobile components when viewport changes
      const preloadTimer = setTimeout(() => {
        import('./MobileCalendarNavigation')
        import('./ResponsiveCalendarLayout')
      }, 2000)

      return () => clearTimeout(preloadTimer)
    }
  }, [isMobile])

  return (
    <div className={`optimized-calendar ${className}`}>
      {/* Always-loaded core navigation */}
      <JumpToTodayButton
        currentDate={currentDate}
        onJumpToToday={() => onDateChange(new Date())}
      />

      {/* Conditionally loaded mobile navigation */}
      {shouldLoadMobileNav && (
        <Suspense fallback={<NavigationSkeleton />}>
          <MobileCalendarNavigation
            currentDate={currentDate}
            onDateChange={onDateChange}
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
          />
        </Suspense>
      )}

      {/* Main calendar layout with responsive optimization */}
      <Suspense fallback={<CalendarSkeleton />}>
        <ResponsiveCalendarLayout viewMode={viewMode}>
          {/* Calendar content would go here */}
          <div className="calendar-grid">
            {/* Grid content */}
            <div className="text-center p-8 text-gray-500 dark:text-gray-400">
              Optimized Calendar Grid
              <br />
              <small>Components loaded: {
                [
                  'Core',
                  shouldLoadMobileNav && 'Mobile Nav',
                  shouldLoadVisualEnhancements && 'Visual Effects',
                  shouldLoadSuggestions && 'AI Suggestions',
                  shouldLoadTooltips && 'Tooltips'
                ].filter(Boolean).join(', ')
              }</small>
            </div>
          </div>
        </ResponsiveCalendarLayout>
      </Suspense>

      {/* Visual enhancements (loaded conditionally) */}
      {shouldLoadVisualEnhancements && (
        <Suspense fallback={null}>
          <CalendarVisualEnhancement
            currentDate={currentDate}
            selectedDate={selectedDate}
            appointments={appointments}
            onDateSelect={onDateSelect}
          />
        </Suspense>
      )}

      {/* AI-powered suggestions (loaded only when beneficial) */}
      {shouldLoadSuggestions && (
        <Suspense fallback={<SuggestionsSkeleton />}>
          <AppointmentSuggestions
            appointments={appointments}
            maxSuggestions={isMobile ? 2 : 3}
            onSuggestionAccept={(suggestion) => {
              console.log('Suggestion accepted:', suggestion)
            }}
          />
        </Suspense>
      )}

      {/* Performance monitor in development */}
      {process.env.NODE_ENV === 'development' && (
        <Suspense fallback={null}>
          <div className="fixed bottom-4 left-4 z-50 bg-black/80 text-white p-2 rounded text-xs">
            Loaded: {[
              'Core',
              shouldLoadMobileNav && 'Mobile',
              shouldLoadVisualEnhancements && 'Visual',
              shouldLoadSuggestions && 'AI',
              shouldLoadTooltips && 'Tooltips'
            ].filter(Boolean).length} components
          </div>
        </Suspense>
      )}
    </div>
  )
}

/**
 * Factory function for creating optimized calendar instances
 * Automatically determines the best configuration for the current environment
 */
export function createOptimizedCalendar(overrides: Partial<OptimizedCalendarProps> = {}) {
  return function CalendarWithOptimization(props: OptimizedCalendarProps) {
    const mergedProps = { ...props, ...overrides }

    return <OptimizedCalendar {...mergedProps} />
  }
}

/**
 * Bundle analysis and optimization utilities
 */
export const CalendarBundleInfo = {
  // Core components (always loaded)
  core: [
    'JumpToTodayButton',
    'OptimizedCalendar'
  ],
  
  // Conditional components (loaded as needed)
  conditional: [
    'AppointmentTooltip',
    'CalendarVisualEnhancement', 
    'AppointmentSuggestions',
    'MobileCalendarNavigation',
    'ResponsiveCalendarLayout'
  ],
  
  // Estimated bundle sizes (approximate)
  bundleSizes: {
    core: '~15KB',
    mobile: '~25KB',
    visual: '~18KB',
    suggestions: '~22KB',
    tooltips: '~12KB',
    responsive: '~16KB'
  },
  
  // Loading strategies
  loadingStrategies: {
    immediate: ['core'],
    onInteraction: ['tooltips', 'visual'],
    onViewport: ['mobile', 'responsive'],
    onDataAvailable: ['suggestions']
  }
}

export default OptimizedCalendar