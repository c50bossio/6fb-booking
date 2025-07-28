/**
 * Mobile PWA Lazy Loading System
 * Dynamic imports and code splitting for optimal bundle size
 * Version: 1.0.0
 */

import { lazy, ComponentType, LazyExoticComponent } from 'react'
import { getDeploymentManager } from './mobile-pwa-deployment'

export interface LazyLoadConfig {
  enableCodeSplitting: boolean
  preloadThreshold: number // Preload when this close to viewport (px)
  chunkTimeout: number // Timeout for chunk loading (ms)
  retryAttempts: number
  fallbackDelay: number // Delay before showing fallback (ms)
}

const DEFAULT_LAZY_LOAD_CONFIG: LazyLoadConfig = {
  enableCodeSplitting: true,
  preloadThreshold: 500,
  chunkTimeout: 10000, // 10 seconds
  retryAttempts: 3,
  fallbackDelay: 300
}

class MobilePWALazyLoader {
  private config: LazyLoadConfig
  private loadedModules: Map<string, any> = new Map()
  private loadingPromises: Map<string, Promise<any>> = new Map()
  private intersectionObserver?: IntersectionObserver
  private preloadQueue: Set<string> = new Set()

  constructor(config?: Partial<LazyLoadConfig>) {
    this.config = { ...DEFAULT_LAZY_LOAD_CONFIG, ...config }
    this.initializeIntersectionObserver()
  }

  private initializeIntersectionObserver() {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const moduleId = entry.target.getAttribute('data-preload-module')
            if (moduleId && this.preloadQueue.has(moduleId)) {
              this.preloadModule(moduleId)
              this.preloadQueue.delete(moduleId)
            }
          }
        })
      },
      {
        rootMargin: `${this.config.preloadThreshold}px`
      }
    )
  }

  /**
   * Create a lazy-loaded component with retry logic
   */
  createLazyComponent<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    moduleId: string,
    fallback?: ComponentType<any>
  ): LazyExoticComponent<T> {
    if (!this.config.enableCodeSplitting) {
      // If code splitting disabled, load immediately
      importFn().then(module => {
        this.loadedModules.set(moduleId, module.default)
      })
    }

    return lazy(() => this.loadWithRetry(importFn, moduleId, fallback))
  }

  /**
   * Load module with retry logic and error handling
   */
  private async loadWithRetry<T>(
    importFn: () => Promise<{ default: T }>,
    moduleId: string,
    fallback?: ComponentType<any>
  ): Promise<{ default: T }> {
    // Return from cache if already loaded
    if (this.loadedModules.has(moduleId)) {
      return { default: this.loadedModules.get(moduleId) }
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(moduleId)) {
      return this.loadingPromises.get(moduleId)
    }

    const loadPromise = this.attemptLoad(importFn, moduleId, this.config.retryAttempts, fallback)
    this.loadingPromises.set(moduleId, loadPromise)

    try {
      const result = await loadPromise
      this.loadedModules.set(moduleId, result.default)
      this.loadingPromises.delete(moduleId)
      return result
    } catch (error) {
      this.loadingPromises.delete(moduleId)
      throw error
    }
  }

  /**
   * Attempt to load module with retries
   */
  private async attemptLoad<T>(
    importFn: () => Promise<{ default: T }>,
    moduleId: string,
    retriesLeft: number,
    fallback?: ComponentType<any>
  ): Promise<{ default: T }> {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout loading ${moduleId}`)), this.config.chunkTimeout)
      })

      const loadPromise = importFn()
      const result = await Promise.race([loadPromise, timeoutPromise])
      
      console.log(`✅ Successfully loaded module: ${moduleId}`)
      return result

    } catch (error) {
      console.warn(`⚠️ Failed to load module ${moduleId}, retries left: ${retriesLeft}`, error)

      if (retriesLeft > 0) {
        // Wait before retry with exponential backoff
        const delay = Math.pow(2, this.config.retryAttempts - retriesLeft) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.attemptLoad(importFn, moduleId, retriesLeft - 1, fallback)
      }

      // All retries exhausted, use fallback or throw
      if (fallback) {
        console.log(`🔄 Using fallback component for ${moduleId}`)
        return { default: fallback as T }
      }

      throw new Error(`Failed to load module ${moduleId} after ${this.config.retryAttempts} attempts`)
    }
  }

  /**
   * Preload a module without rendering
   */
  async preloadModule(moduleId: string): Promise<void> {
    const moduleConfig = this.getModuleConfig(moduleId)
    if (!moduleConfig) return

    try {
      await this.loadWithRetry(moduleConfig.importFn, moduleId)
      console.log(`🚀 Preloaded module: ${moduleId}`)
    } catch (error) {
      console.warn(`Failed to preload module ${moduleId}:`, error)
    }
  }

  /**
   * Schedule preloading when element enters viewport
   */
  schedulePreload(element: Element, moduleId: string): void {
    if (!this.intersectionObserver) return

    this.preloadQueue.add(moduleId)
    element.setAttribute('data-preload-module', moduleId)
    this.intersectionObserver.observe(element)
  }

  /**
   * Get module configuration
   */
  private getModuleConfig(moduleId: string): { importFn: () => Promise<any> } | null {
    const moduleConfigs: { [key: string]: { importFn: () => Promise<any> } } = {
      'touch-optimized-calendar': {
        importFn: () => import('@/components/TouchOptimizedCalendar')
      },
      'touch-interaction-demo': {
        importFn: () => import('@/components/TouchInteractionDemo')
      },
      'mobile-pwa-onboarding': {
        importFn: () => import('@/components/MobilePWAOnboarding')
      },
      'mobile-pwa-monitoring-dashboard': {
        importFn: () => import('@/components/MobilePWAMonitoringDashboard')
      },
      'mobile-pwa-analytics-dashboard': {
        importFn: () => import('@/components/MobilePWAAnalyticsDashboard')
      },
      'haptic-feedback-system': {
        importFn: () => import('@/lib/haptic-feedback-system')
      },
      'mobile-touch-gestures': {
        importFn: () => import('@/lib/mobile-touch-gestures')
      },
      'mobile-calendar-performance': {
        importFn: () => import('@/lib/mobile-calendar-performance')
      }
    }

    return moduleConfigs[moduleId] || null
  }

  /**
   * Get loading status of modules
   */
  getLoadingStatus(): {
    loaded: string[]
    loading: string[]
    cached: string[]
  } {
    return {
      loaded: Array.from(this.loadedModules.keys()),
      loading: Array.from(this.loadingPromises.keys()),
      cached: Array.from(this.loadedModules.keys())
    }
  }

  /**
   * Clear module cache
   */
  clearCache(): void {
    this.loadedModules.clear()
    this.loadingPromises.clear()
    this.preloadQueue.clear()
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<LazyLoadConfig>): void {
    this.config = { ...this.config, ...updates }
  }
}

// Global lazy loader instance
let globalLazyLoader: MobilePWALazyLoader | null = null

/**
 * Get or create lazy loader instance
 */
export function getLazyLoader(config?: Partial<LazyLoadConfig>): MobilePWALazyLoader {
  if (!globalLazyLoader) {
    globalLazyLoader = new MobilePWALazyLoader(config)
  }
  return globalLazyLoader
}

/**
 * Lazy loaded components with optimized loading
 */
export const LazyTouchOptimizedCalendar = getLazyLoader().createLazyComponent(
  () => import('@/components/TouchOptimizedCalendar'),
  'touch-optimized-calendar'
)

export const LazyTouchInteractionDemo = getLazyLoader().createLazyComponent(
  () => import('@/components/TouchInteractionDemo'),
  'touch-interaction-demo'
)

export const LazyMobilePWAOnboarding = getLazyLoader().createLazyComponent(
  () => import('@/components/MobilePWAOnboarding'),
  'mobile-pwa-onboarding'
)

export const LazyMobilePWAMonitoringDashboard = getLazyLoader().createLazyComponent(
  () => import('@/components/MobilePWAMonitoringDashboard'),
  'mobile-pwa-monitoring-dashboard'
)

export const LazyMobilePWAAnalyticsDashboard = getLazyLoader().createLazyComponent(
  () => import('@/components/MobilePWAAnalyticsDashboard'),
  'mobile-pwa-analytics-dashboard'
)

/**
 * React hook for lazy loading with preloading
 */
export function useLazyLoading() {
  const lazyLoader = getLazyLoader()

  return {
    preloadModule: lazyLoader.preloadModule.bind(lazyLoader),
    schedulePreload: lazyLoader.schedulePreload.bind(lazyLoader),
    getLoadingStatus: lazyLoader.getLoadingStatus.bind(lazyLoader),
    clearCache: lazyLoader.clearCache.bind(lazyLoader)
  }
}

/**
 * Higher-order component for lazy loading with error boundary
 */
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  moduleId: string,
  fallback?: ComponentType<P>
) {
  const LazyComponent = getLazyLoader().createLazyComponent(
    () => Promise.resolve({ default: Component }),
    moduleId,
    fallback
  )

  return LazyComponent
}

/**
 * Preload critical mobile PWA modules
 */
export async function preloadCriticalModules(): Promise<void> {
  const deploymentManager = getDeploymentManager()
  const enabledFeatures = deploymentManager.getEnabledFeatures()
  const lazyLoader = getLazyLoader()

  const criticalModules = []

  // Preload based on enabled features
  if (enabledFeatures.includes('touch-gestures')) {
    criticalModules.push('touch-optimized-calendar', 'mobile-touch-gestures')
  }

  if (enabledFeatures.includes('haptic-feedback')) {
    criticalModules.push('haptic-feedback-system')
  }

  if (enabledFeatures.includes('performance-optimization')) {
    criticalModules.push('mobile-calendar-performance')
  }

  // Preload in parallel
  const preloadPromises = criticalModules.map(moduleId => 
    lazyLoader.preloadModule(moduleId).catch(error => 
      console.warn(`Failed to preload critical module ${moduleId}:`, error)
    )
  )

  await Promise.allSettled(preloadPromises)
  console.log(`🚀 Preloaded ${criticalModules.length} critical modules`)
}

/**
 * Bundle size analysis utilities
 */
export function analyzeBundleSize(): {
  totalModules: number
  loadedModules: number
  lazyModules: number
  cacheHitRate: number
} {
  const lazyLoader = getLazyLoader()
  const status = lazyLoader.getLoadingStatus()
  
  // Estimate total modules based on known module configs
  const totalModules = 8 // Known mobile PWA modules
  const loadedModules = status.loaded.length
  const lazyModules = totalModules - loadedModules
  const cacheHitRate = status.cached.length / Math.max(1, status.loaded.length + status.loading.length)

  return {
    totalModules,
    loadedModules,
    lazyModules,
    cacheHitRate
  }
}

/**
 * Dynamic import with fallback for older browsers
 */
export async function safeDynamicImport<T>(
  importFn: () => Promise<T>,
  fallback: T,
  timeout: number = 5000
): Promise<T> {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Dynamic import timeout')), timeout)
    })

    return await Promise.race([importFn(), timeoutPromise])
  } catch (error) {
    console.warn('Dynamic import failed, using fallback:', error)
    return fallback
  }
}

export default MobilePWALazyLoader