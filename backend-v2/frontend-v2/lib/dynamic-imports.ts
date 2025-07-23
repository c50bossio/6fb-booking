/**
 * Dynamic import utilities for performance optimization
 * Reduces initial bundle size by dynamically importing heavy dependencies
 */

import React, { lazy } from 'react'

/**
 * Heavy calendar components - lazy loaded
 */
export const CalendarComponents = {
  UnifiedCalendar: lazy(() => import('@/components/UnifiedCalendar')),
  AvailabilityHeatmap: lazy(() => import('@/components/calendar/AvailabilityHeatmap')),
  CalendarAnalyticsSidebar: lazy(() => import('@/components/calendar/CalendarAnalyticsSidebar')),
  EnhancedRevenueDisplay: lazy(() => import('@/components/calendar/EnhancedRevenueDisplay')),
  AppointmentSuggestions: lazy(() => import('@/components/calendar/AppointmentSuggestions')),
}

/**
 * Modal components - only loaded when needed
 */
export const ModalComponents = {
  CreateAppointmentModal: lazy(() => import('@/components/modals/CreateAppointmentModal')),
  TimePickerModal: lazy(() => import('@/components/modals/TimePickerModal')),
  RescheduleModal: lazy(() => import('@/components/modals/RescheduleModal')),
}

/**
 * Analytics components - heavy and rarely used initially
 */
export const AnalyticsComponents = {
  AnalyticsDashboard: lazy(() => import('@/components/analytics/AnalyticsDashboard')),
  RevenueChart: lazy(() => import('@/components/analytics/RevenueChart')),
  ClientMetrics: lazy(() => import('@/components/analytics/ClientMetrics')),
}

/**
 * Form components - heavy due to validation libraries
 */
export const FormComponents = {
  AppointmentForm: lazy(() => import('@/components/forms/AppointmentForm')),
  ClientForm: lazy(() => import('@/components/forms/ClientForm')),
  ServiceForm: lazy(() => import('@/components/forms/ServiceForm')),
}

/**
 * Utility functions for dynamic imports
 */
export class DynamicImportManager {
  private static loadedModules = new Set<string>()
  private static preloadPromises = new Map<string, Promise<any>>()

  /**
   * Preload a module without executing it
   */
  static preload(moduleId: string, importFn: () => Promise<any>): Promise<any> {
    if (this.preloadPromises.has(moduleId)) {
      return this.preloadPromises.get(moduleId)!
    }

    const promise = importFn().then(module => {
      this.loadedModules.add(moduleId)
      return module
    })

    this.preloadPromises.set(moduleId, promise)
    return promise
  }

  /**
   * Check if a module has been loaded
   */
  static isLoaded(moduleId: string): boolean {
    return this.loadedModules.has(moduleId)
  }

  /**
   * Preload critical components after initial render
   */
  static preloadCriticalComponents() {
    if (typeof window === 'undefined') return

    // Use requestIdleCallback to preload during idle time
    const preloadFn = () => {
      // Preload most commonly used components
      this.preload('unified-calendar', () => import('@/components/UnifiedCalendar'))
      this.preload('create-appointment-modal', () => import('@/components/modals/CreateAppointmentModal'))
      this.preload('revenue-display', () => import('@/components/calendar/EnhancedRevenueDisplay'))
    }

    if ('requestIdleCallback' in window) {
      requestIdleCallback(preloadFn, { timeout: 2000 })
    } else {
      setTimeout(preloadFn, 1000)
    }
  }

  /**
   * Preload components based on route
   */
  static preloadForRoute(route: string) {
    if (typeof window === 'undefined') return

    const preloadMap: Record<string, () => void> = {
      '/calendar': () => {
        this.preload('calendar-sync', () => import('@/components/CalendarSync'))
        this.preload('availability-heatmap', () => import('@/components/calendar/AvailabilityHeatmap'))
        this.preload('calendar-analytics', () => import('@/components/calendar/CalendarAnalyticsSidebar'))
      },
      '/analytics': () => {
        this.preload('analytics-dashboard', () => import('@/components/analytics/AnalyticsDashboard'))
        this.preload('revenue-chart', () => import('@/components/analytics/RevenueChart'))
        this.preload('client-metrics', () => import('@/components/analytics/ClientMetrics'))
      },
      '/clients': () => {
        this.preload('client-form', () => import('@/components/forms/ClientForm'))
        this.preload('client-list', () => import('@/components/clients/ClientList'))
      },
      '/settings': () => {
        this.preload('settings-forms', () => import('@/components/settings/SettingsForms'))
        this.preload('integrations', () => import('@/components/settings/Integrations'))
      }
    }

    const preloadFn = preloadMap[route]
    if (preloadFn) {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(preloadFn, { timeout: 1000 })
      } else {
        setTimeout(preloadFn, 500)
      }
    }
  }

  /**
   * Get loading statistics for debugging
   */
  static getStats() {
    return {
      loadedModules: Array.from(this.loadedModules),
      preloadPromises: this.preloadPromises.size,
      totalLoaded: this.loadedModules.size
    }
  }
}

/**
 * Hook for dynamic imports with loading states
 */
export function useDynamicImport<T>(
  importFn: () => Promise<{ default: T }>,
  moduleId: string
): { component: T | null; loading: boolean; error: Error | null } {
  const [state, setState] = React.useState<{
    component: T | null
    loading: boolean
    error: Error | null
  }>({
    component: null,
    loading: false,
    error: null
  })

  React.useEffect(() => {
    let cancelled = false

    // Check if already loaded
    if (DynamicImportManager.isLoaded(moduleId)) {
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    importFn()
      .then(module => {
        if (!cancelled) {
          setState({
            component: module.default,
            loading: false,
            error: null
          })
        }
      })
      .catch(error => {
        if (!cancelled) {
          setState({
            component: null,
            loading: false,
            error
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [importFn, moduleId])

  return state
}

/**
 * Initialize dynamic import manager
 */
export function initializeDynamicImports() {
  if (typeof window !== 'undefined') {
    // Preload critical components after app loads
    DynamicImportManager.preloadCriticalComponents()

    // Monitor route changes and preload accordingly
    if ('navigation' in window) {
      ;(window as any).navigation?.addEventListener('navigate', (event: any) => {
        const url = new URL(event.destination.url)
        DynamicImportManager.preloadForRoute(url.pathname)
      })
    }
  }
}