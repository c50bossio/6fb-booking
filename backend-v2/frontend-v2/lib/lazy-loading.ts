'use client'

import React, { lazy, ComponentType, Suspense, memo, useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Loading, LoadingSpinner, CardLoading } from '@/components/ui/LoadingStates'
import { cn } from '@/lib/utils'

/**
 * Enhanced Lazy Loading Utilities
 * Comprehensive lazy loading strategies for optimal bundle splitting
 */

// Types
interface LazyComponentOptions {
  fallback?: React.ComponentType
  ssr?: boolean
  loading?: () => React.ReactNode
}

interface ModuleWithDefault<T = any> {
  default: T
}

// Enhanced lazy loading with better error boundaries
export const createLazyComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<ModuleWithDefault<T>>,
  options: LazyComponentOptions = {}
) => {
  const {
    fallback: FallbackComponent = LoadingSpinner,
    ssr = false,
    loading = () => React.createElement(FallbackComponent, {})
  } = options

  return dynamic(importFn, {
    ssr,
    loading: () => loading() as JSX.Element
  })
}

// Pre-configured lazy components with optimized loading states
export const LazyComponents = {
  // Calendar components (heavy date manipulation)
  Calendar: createLazyComponent(
    () => import('@/components/ui/calendar'),
    { 
      loading: () => React.createElement(CardLoading, { className: "h-96" }),
      ssr: false 
    }
  ),
  
  // Chart components (large chart.js bundle)
  // Analytics: createLazyComponent(
  //   () => import('@/components/analytics/Analytics'),
  //   { 
  //     loading: () => React.createElement(Loading, { variant: "spinner", text: "Loading analytics..." }),
  //     ssr: false 
  //   }
  // ),
  
  // Payment components (Stripe bundle)
  PaymentForm: createLazyComponent(
    () => import('@/components/PaymentForm'),
    { 
      loading: () => React.createElement(Loading, { variant: "skeleton", text: "Loading payment form..." }),
      ssr: false 
    }
  ),
  
  // Integration components (heavy with external APIs)
  // IntegrationsPanel: createLazyComponent(
  //   () => import('@/components/integrations/IntegrationsPanel'),
  //   { 
  //     loading: () => React.createElement(CardLoading, { className: "h-64" }),
  //     ssr: false 
  //   }
  // ),
  
  // Settings components
  // SettingsPanel: createLazyComponent(
  //   () => import('@/components/settings/SettingsPanel'),
  //   { 
  //     loading: () => React.createElement(Loading, { variant: "dots", text: "Loading settings..." }),
  //     ssr: false 
  //   }
  // ),
  
  // Admin components (heavy forms and data tables)
  // AdminDashboard: createLazyComponent(
  //   () => import('@/components/admin/AdminDashboard'),
  //   { 
  //     loading: () => React.createElement(Loading, { variant: "pulse", text: "Loading admin dashboard..." }),
  //     ssr: false 
  //   }
  // ),
}

// Route-based lazy loading
export const LazyPages = {
  // Dashboard route
  // Dashboard: createLazyComponent(
  //   () => import('@/app/(auth)/dashboard/page'),
  //   { 
  //     loading: () => React.createElement(Loading, { variant: "spinner", text: "Loading dashboard...", overlay: true }),
  //     ssr: true 
  //   }
  // ),
  
  // Calendar route
  // CalendarPage: createLazyComponent(
  //   () => import('@/app/(auth)/calendar/page'),
  //   { 
  //     loading: () => React.createElement(Loading, { variant: "skeleton", text: "Loading calendar...", overlay: true }),
  //     ssr: false 
  //   }
  // ),
  
  // Analytics route
  // AnalyticsPage: createLazyComponent(
  //   () => import('@/app/(auth)/analytics/page'),
  //   { 
  //     loading: () => React.createElement(Loading, { variant: "bar", text: "Loading analytics...", overlay: true }),
  //     ssr: false 
  //   }
  // ),
  
  // Settings route
  // SettingsPage: createLazyComponent(
  //   () => import('@/app/(auth)/settings/page'),
  //   { 
  //     loading: () => React.createElement(Loading, { variant: "dots", text: "Loading settings...", overlay: true }),
  //     ssr: true 
  //   }
  // ),
}

// Intersection Observer based lazy loading for images and content
export class LazyLoader {
  private static observer: IntersectionObserver | null = null
  private static loadedItems = new Set<string>()

  static init(options: IntersectionObserverInit = {}) {
    if (typeof window === 'undefined') return

    const defaultOptions: IntersectionObserverInit = {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    }

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement
          const src = element.dataset.src
          const id = element.dataset.lazyId

          if (src && element instanceof HTMLImageElement) {
            this.loadImage(element, src)
          }

          if (id && element.dataset.lazyContent) {
            this.loadContent(element, id)
          }

          this.observer?.unobserve(element)
        }
      })
    }, defaultOptions)
  }

  static observe(element: HTMLElement) {
    if (!this.observer) this.init()
    this.observer?.observe(element)
  }

  static unobserve(element: HTMLElement) {
    this.observer?.unobserve(element)
  }

  private static loadImage(img: HTMLImageElement, src: string) {
    const tempImg = new Image()
    tempImg.onload = () => {
      img.src = src
      img.classList.add('loaded')
      img.classList.remove('loading')
    }
    tempImg.onerror = () => {
      img.classList.add('error')
      img.classList.remove('loading')
    }
    tempImg.src = src
  }

  private static loadContent(element: HTMLElement, id: string) {
    if (this.loadedItems.has(id)) return
    
    this.loadedItems.add(id)
    element.classList.add('lazy-loaded')
    
    // Trigger custom event for content loading
    element.dispatchEvent(new CustomEvent('lazyload', { detail: { id } }))
  }

  static cleanup() {
    this.observer?.disconnect()
    this.observer = null
    this.loadedItems.clear()
  }
}

// React hook for lazy loading
export const useLazyLoading = () => {
  const [isLoaded, setIsLoaded] = useState(false)
  const elementRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleLazyLoad = () => setIsLoaded(true)
    element.addEventListener('lazyload', handleLazyLoad)
    
    LazyLoader.observe(element)

    return () => {
      element.removeEventListener('lazyload', handleLazyLoad)
      LazyLoader.unobserve(element)
    }
  }, [])

  return { elementRef, isLoaded }
}

// Lazy image component with progressive loading
export const LazyImage = memo(({
  src,
  alt,
  className = '',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmM2Y0ZjYiLz48L3N2Zz4=',
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & {
  placeholder?: string
}) => {
  const { elementRef, isLoaded } = useLazyLoading()
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    if (isLoaded && elementRef.current) {
      const img = elementRef.current as HTMLImageElement
      if (img.complete) {
        setImageLoaded(true)
      }
    }
  }, [isLoaded])

  return React.createElement('img', {
    ref: elementRef,
    src: imageLoaded ? src : placeholder,
    'data-src': src,
    'data-lazy-id': `img-${src}`,
    alt: alt,
    className: cn(
      'transition-opacity duration-300',
      imageLoaded ? 'opacity-100' : 'opacity-50',
      'loading' in props ? '' : 'loading',
      className
    ),
    onLoad: () => setImageLoaded(true),
    ...props
  })
})

LazyImage.displayName = 'LazyImage'

// Bundle analyzer utilities for development
export const BundleUtils = {
  /**
   * Log bundle information in development
   */
  logBundleInfo: () => {
    if (process.env.NODE_ENV !== 'development') return

    console.group('📦 Bundle Information')
    
    // Performance metrics
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    }
    console.groupEnd()
  },

  /**
   * Analyze component re-renders
   */
  analyzeRenders: (componentName: string) => {
    if (process.env.NODE_ENV !== 'development') return () => {}

    let renderCount = 0
    return () => {
      renderCount++
    }
  },

  /**
   * Memory usage tracking
   */
  trackMemory: (label: string) => {
    if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') return

    if ('memory' in performance) {
      const memory = (performance as any).memory
      console.log('Memory usage:', {
        used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
        total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`,
        limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`
      })
    }
  }
}

// Tree shaking helpers
export const TreeShaking = {
  /**
   * Import only specific utilities from large libraries
   */
  importDateFns: {
    format: () => import('date-fns/format'),
    parseISO: () => import('date-fns/parseISO'),
    addDays: () => import('date-fns/addDays'),
    subDays: () => import('date-fns/subDays'),
    startOfWeek: () => import('date-fns/startOfWeek'),
    endOfWeek: () => import('date-fns/endOfWeek'),
  },

  /**
   * Import specific Heroicons
   */
  importHeroicons: {
    CalendarIcon: () => import('@heroicons/react/24/outline/CalendarIcon'),
    UserIcon: () => import('@heroicons/react/24/outline/UserIcon'),
    CogIcon: () => import('@heroicons/react/24/outline/CogIcon'),
  },

  /**
   * Import specific Lucide icons
   */
  importLucide: {
    Calendar: () => import('lucide-react').then(mod => ({ default: mod.Calendar })),
    User: () => import('lucide-react').then(mod => ({ default: mod.User })),
    Settings: () => import('lucide-react').then(mod => ({ default: mod.Settings })),
  }
}

// Preloading utilities
export const Preloader = {
  /**
   * Preload critical routes
   */
  preloadRoutes: (routes: string[]) => {
    if (typeof window === 'undefined') return

    routes.forEach(route => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = route
      document.head.appendChild(link)
    })
  },

  /**
   * Preload critical components
   */
  preloadComponents: async (components: Array<() => Promise<any>>) => {
    const promises = components.map(component => {
      try {
        return component()
      } catch (error) {
        console.warn('Failed to preload component:', error)
        return Promise.resolve()
      }
    })

    await Promise.allSettled(promises)
  },

  /**
   * Critical resource hints
   */
  addResourceHints: () => {
    if (typeof window === 'undefined') return

    const hints = [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
      { rel: 'preconnect', href: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000' },
    ]

    hints.forEach(hint => {
      const link = document.createElement('link')
      Object.assign(link, hint)
      document.head.appendChild(link)
    })
  }
}

// Performance monitoring
export const PerformanceMonitor = {
  /**
   * Measure component render time
   */
  measureRender: (name: string, fn: () => void) => {
    if (process.env.NODE_ENV !== 'development') return fn()

    const start = performance.now()
    fn()
    const end = performance.now()
  },

  /**
   * Monitor largest contentful paint
   */
  monitorLCP: () => {
    if (typeof window === 'undefined') return

    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
    }).observe({ entryTypes: ['largest-contentful-paint'] })
  },

  /**
   * Monitor cumulative layout shift
   */
  monitorCLS: () => {
    if (typeof window === 'undefined') return

    let clsValue = 0
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value
        }
      }
    }).observe({ entryTypes: ['layout-shift'] })
  }
}

// Initialize lazy loading on app start
if (typeof window !== 'undefined') {
  LazyLoader.init()
  
  // Add resource hints
  Preloader.addResourceHints()
  
  // Development monitoring
  if (process.env.NODE_ENV === 'development') {
    BundleUtils.logBundleInfo()
    PerformanceMonitor.monitorLCP()
    PerformanceMonitor.monitorCLS()
  }
}


export default {
  LazyComponents,
  LazyPages,
  LazyLoader,
  LazyImage,
  BundleUtils,
  TreeShaking,
  Preloader,
  PerformanceMonitor,
  createLazyComponent,
  useLazyLoading,
}