/**
 * Service Worker Manager for 6FB Booking Platform
 * Handles service worker registration, communication, and lifecycle
 */
import { useState, useEffect, useCallback } from 'react'

interface ServiceWorkerMessage {
  type: string
  payload?: any
}

interface ServiceWorkerResponse {
  success: boolean
  data?: any
  error?: string
}

interface OfflineAction {
  id?: string
  type: string
  request?: any
  timestamp: number
  retries?: number
}

interface CacheStats {
  [cacheName: string]: {
    entries: number
    urls: string[]
  }
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private isSupported: boolean = false
  private isRegistered: boolean = false
  private messageChannel: MessageChannel | null = null
  private eventListeners: Map<string, Function[]> = new Map()
  private offlineQueue: OfflineAction[] = []
  private isOnline: boolean = navigator.onLine

  constructor() {
    this.isSupported = 'serviceWorker' in navigator && 'caches' in window
    this.setupNetworkListeners()
    this.setupMessageChannel()
  }

  async register(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('[SWM] Service Worker not supported')
      return false
    }

    if (this.isRegistered) {
      console.log('[SWM] Service Worker already registered')
      return true
    }

    try {
      console.log('[SWM] Registering service worker...')
      
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'imports'
      })

      console.log('[SWM] Service worker registered successfully')

      // Setup event listeners
      this.setupServiceWorkerListeners()

      // Check for updates
      this.checkForUpdates()

      this.isRegistered = true
      this.emit('registered', { registration: this.registration })

      return true
    } catch (error) {
      console.error('[SWM] Service worker registration failed:', error)
      this.emit('error', { error, type: 'registration' })
      return false
    }
  }

  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false
    }

    try {
      const result = await this.registration.unregister()
      this.isRegistered = false
      this.registration = null
      this.emit('unregistered')
      return result
    } catch (error) {
      console.error('[SWM] Service worker unregistration failed:', error)
      return false
    }
  }

  async update(): Promise<boolean> {
    if (!this.registration) {
      return false
    }

    try {
      await this.registration.update()
      return true
    } catch (error) {
      console.error('[SWM] Service worker update failed:', error)
      return false
    }
  }

  async skipWaiting(): Promise<void> {
    if (!this.registration?.waiting) {
      return
    }

    this.sendMessage({ type: 'SKIP_WAITING' })
    
    // Reload page after skip waiting
    this.registration.waiting.addEventListener('statechange', (event) => {
      const worker = event.target as ServiceWorker
      if (worker.state === 'activated') {
        window.location.reload()
      }
    })
  }

  // Cache management
  async getCacheStats(): Promise<CacheStats | null> {
    try {
      const response = await this.sendMessageWithResponse({
        type: 'GET_CACHE_STATS'
      })
      return response.success ? response.data : null
    } catch (error) {
      console.error('[SWM] Failed to get cache stats:', error)
      return null
    }
  }

  async clearCache(cacheName?: string): Promise<boolean> {
    try {
      if (cacheName) {
        const response = await this.sendMessageWithResponse({
          type: 'CLEAR_CACHE',
          payload: { cacheName }
        })
        return response.success
      } else {
        // Clear all caches
        const cacheNames = await caches.keys()
        const results = await Promise.all(
          cacheNames.map(name => caches.delete(name))
        )
        return results.every(result => result)
      }
    } catch (error) {
      console.error('[SWM] Failed to clear cache:', error)
      return false
    }
  }

  async prefetchRoutes(routes: string[]): Promise<boolean> {
    try {
      const response = await this.sendMessageWithResponse({
        type: 'PREFETCH_ROUTES',
        payload: { routes }
      })
      return response.success
    } catch (error) {
      console.error('[SWM] Failed to prefetch routes:', error)
      return false
    }
  }

  // Offline queue management
  async queueOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp'>): Promise<boolean> {
    const fullAction: OfflineAction = {
      ...action,
      id: this.generateId(),
      timestamp: Date.now(),
      retries: 0
    }

    try {
      const response = await this.sendMessageWithResponse({
        type: 'QUEUE_OFFLINE_ACTION',
        payload: fullAction
      })

      if (response.success) {
        this.offlineQueue.push(fullAction)
        this.emit('actionQueued', fullAction)
      }

      return response.success
    } catch (error) {
      console.error('[SWM] Failed to queue offline action:', error)
      return false
    }
  }

  getOfflineQueue(): OfflineAction[] {
    return [...this.offlineQueue]
  }

  clearOfflineQueue(): void {
    this.offlineQueue = []
    this.emit('queueCleared')
  }

  // Network status
  isOnlineNow(): boolean {
    return this.isOnline
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('[SWM] Event listener error:', error)
        }
      })
    }
  }

  // Service worker communication
  private sendMessage(message: ServiceWorkerMessage): void {
    if (!this.registration?.active) {
      console.warn('[SWM] No active service worker to send message to')
      return
    }

    this.registration.active.postMessage(message)
  }

  private async sendMessageWithResponse(message: ServiceWorkerMessage): Promise<ServiceWorkerResponse> {
    return new Promise((resolve, reject) => {
      if (!this.registration?.active) {
        reject(new Error('No active service worker'))
        return
      }

      const channel = new MessageChannel()
      
      channel.port1.onmessage = (event) => {
        resolve(event.data)
      }

      this.registration.active.postMessage(message, [channel.port2])
      
      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Message timeout'))
      }, 10000)
    })
  }

  private setupMessageChannel(): void {
    if (!this.isSupported) return

    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, payload } = event.data
      this.emit('message', { type, payload })
      
      // Handle specific message types
      switch (type) {
        case 'CACHE_UPDATED':
          this.emit('cacheUpdated', payload)
          break
          
        case 'OFFLINE_ACTION_COMPLETED':
          this.removeFromOfflineQueue(payload.actionId)
          this.emit('actionCompleted', payload)
          break
          
        case 'OFFLINE_ACTION_FAILED':
          this.emit('actionFailed', payload)
          break
          
        case 'SYNC_COMPLETED':
          this.emit('syncCompleted', payload)
          break
      }
    })
  }

  private setupServiceWorkerListeners(): void {
    if (!this.registration) return

    // Handle updates
    this.registration.addEventListener('updatefound', () => {
      console.log('[SWM] Service worker update found')
      this.emit('updateFound')
      
      const newWorker = this.registration!.installing
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SWM] New service worker installed, waiting to activate')
            this.emit('updateReady', { newWorker })
          }
        })
      }
    })

    // Handle controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SWM] Service worker controller changed')
      this.emit('controllerChanged')
      
      // Reload the page to ensure all resources are loaded from the new service worker
      if (!window.location.pathname.includes('/offline')) {
        window.location.reload()
      }
    })
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('[SWM] Network back online')
      this.isOnline = true
      this.emit('online')
    })

    window.addEventListener('offline', () => {
      console.log('[SWM] Network went offline')
      this.isOnline = false
      this.emit('offline')
    })
  }

  private async checkForUpdates(): Promise<void> {
    if (!this.registration) return

    try {
      await this.registration.update()
    } catch (error) {
      console.warn('[SWM] Update check failed:', error)
    }
  }

  private removeFromOfflineQueue(actionId: string): void {
    const index = this.offlineQueue.findIndex(action => action.id === actionId)
    if (index > -1) {
      this.offlineQueue.splice(index, 1)
      this.emit('actionRemoved', { actionId })
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  // Public getters
  get isServiceWorkerSupported(): boolean {
    return this.isSupported
  }

  get isServiceWorkerRegistered(): boolean {
    return this.isRegistered
  }

  get serviceWorkerRegistration(): ServiceWorkerRegistration | null {
    return this.registration
  }

  // Cleanup
  destroy(): void {
    this.eventListeners.clear()
    if (this.messageChannel) {
      this.messageChannel.port1.close()
      this.messageChannel.port2.close()
    }
  }
}

// Global service worker manager instance
export const serviceWorkerManager = new ServiceWorkerManager()

// React hook for service worker management
export function useServiceWorker() {
  const [isRegistered, setIsRegistered] = useState(serviceWorkerManager.isServiceWorkerRegistered)
  const [isOnline, setIsOnline] = useState(serviceWorkerManager.isOnlineNow())
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [offlineQueue, setOfflineQueue] = useState<OfflineAction[]>([])

  useEffect(() => {
    // Register service worker
    serviceWorkerManager.register().then(setIsRegistered)

    // Setup event listeners
    const handleRegistered = () => setIsRegistered(true)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    const handleUpdateReady = () => setUpdateAvailable(true)
    const handleActionQueued = () => setOfflineQueue(serviceWorkerManager.getOfflineQueue())
    const handleActionCompleted = () => setOfflineQueue(serviceWorkerManager.getOfflineQueue())

    serviceWorkerManager.on('registered', handleRegistered)
    serviceWorkerManager.on('online', handleOnline)
    serviceWorkerManager.on('offline', handleOffline)
    serviceWorkerManager.on('updateReady', handleUpdateReady)
    serviceWorkerManager.on('actionQueued', handleActionQueued)
    serviceWorkerManager.on('actionCompleted', handleActionCompleted)

    // Initial cache stats
    serviceWorkerManager.getCacheStats().then(setCacheStats)

    return () => {
      serviceWorkerManager.off('registered', handleRegistered)
      serviceWorkerManager.off('online', handleOnline)
      serviceWorkerManager.off('offline', handleOffline)
      serviceWorkerManager.off('updateReady', handleUpdateReady)
      serviceWorkerManager.off('actionQueued', handleActionQueued)
      serviceWorkerManager.off('actionCompleted', handleActionCompleted)
    }
  }, [])

  const updateServiceWorker = useCallback(() => {
    serviceWorkerManager.skipWaiting()
    setUpdateAvailable(false)
  }, [])

  const refreshCacheStats = useCallback(async () => {
    const stats = await serviceWorkerManager.getCacheStats()
    setCacheStats(stats)
  }, [])

  const clearCache = useCallback(async (cacheName?: string) => {
    const success = await serviceWorkerManager.clearCache(cacheName)
    if (success) {
      refreshCacheStats()
    }
    return success
  }, [refreshCacheStats])

  const prefetchRoutes = useCallback(async (routes: string[]) => {
    return serviceWorkerManager.prefetchRoutes(routes)
  }, [])

  const queueOfflineAction = useCallback(async (action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    return serviceWorkerManager.queueOfflineAction(action)
  }, [])

  return {
    isRegistered,
    isOnline,
    updateAvailable,
    cacheStats,
    offlineQueue,
    updateServiceWorker,
    refreshCacheStats,
    clearCache,
    prefetchRoutes,
    queueOfflineAction,
    serviceWorkerManager
  }
}

export default serviceWorkerManager