/**
 * Mobile PWA Offline System
 * Service worker management and offline data synchronization
 * Version: 1.0.0
 */

import { getAnalyticsSystem } from './mobile-pwa-analytics'
import { getMonitoringSystem } from './mobile-pwa-monitoring'

export interface OfflineConfig {
  enableServiceWorker: boolean
  cacheStrategy: 'cache-first' | 'network-first' | 'stale-while-revalidate'
  maxCacheAge: number // Hours
  syncRetryDelay: number // Minutes
  maxSyncRetries: number
  offlinePages: string[]
  criticalAssets: string[]
}

export interface OfflineData {
  appointments: any[]
  clientData: any[]
  serviceData: any[]
  userPreferences: any
  lastSync: number
}

export interface SyncQueueItem {
  id: string
  type: 'appointment' | 'client' | 'preference'
  action: 'create' | 'update' | 'delete'
  data: any
  timestamp: number
  retryCount: number
}

const DEFAULT_OFFLINE_CONFIG: OfflineConfig = {
  enableServiceWorker: true,
  cacheStrategy: 'stale-while-revalidate',
  maxCacheAge: 24, // 24 hours
  syncRetryDelay: 5, // 5 minutes
  maxSyncRetries: 3,
  offlinePages: [
    '/calendar',
    '/appointments',
    '/clients',
    '/profile',
    '/settings'
  ],
  criticalAssets: [
    '/manifest.json',
    '/icons/',
    '/api/v2/auth/me',
    '/api/v2/appointments/today'
  ]
}

export class MobilePWAOfflineSystem {
  private config: OfflineConfig
  private isOnline: boolean = navigator.onLine
  private syncQueue: SyncQueueItem[] = []
  private offlineData: OfflineData
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null

  constructor(config?: Partial<OfflineConfig>) {
    this.config = { ...DEFAULT_OFFLINE_CONFIG, ...config }
    this.offlineData = this.initializeOfflineData()
    this.initializeOfflineSystem()
  }

  private initializeOfflineData(): OfflineData {
    try {
      const stored = localStorage.getItem('mobile_pwa_offline_data')
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.warn('Failed to load offline data:', error)
    }

    return {
      appointments: [],
      clientData: [],
      serviceData: [],
      userPreferences: {},
      lastSync: 0
    }
  }

  private async initializeOfflineSystem() {
    if (!this.config.enableServiceWorker || typeof window === 'undefined') return

    // Register service worker
    await this.registerServiceWorker()

    // Setup network status monitoring
    this.setupNetworkMonitoring()

    // Setup background sync
    this.setupBackgroundSync()

    // Initial data sync if online
    if (this.isOnline) {
      await this.syncDataFromServer()
    }

    console.log('✅ Mobile PWA Offline System initialized')
  }

  /**
   * Register service worker with caching strategies
   */
  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported')
      return
    }

    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      // Send configuration to service worker
      if (this.serviceWorkerRegistration.active) {
        this.serviceWorkerRegistration.active.postMessage({
          type: 'CONFIG_UPDATE',
          config: this.config
        })
      }

      console.log('✅ Service Worker registered successfully')
    } catch (error) {
      console.error('Service Worker registration failed:', error)
    }
  }

  /**
   * Setup network status monitoring
   */
  private setupNetworkMonitoring(): void {
    const updateOnlineStatus = () => {
      const wasOnline = this.isOnline
      this.isOnline = navigator.onLine

      if (!wasOnline && this.isOnline) {
        // Just came back online
        this.handleBackOnline()
      } else if (wasOnline && !this.isOnline) {
        // Just went offline
        this.handleGoingOffline()
      }
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    // Periodic connectivity check
    setInterval(() => {
      this.checkConnectivity()
    }, 30000) // Every 30 seconds
  }

  /**
   * Check actual connectivity beyond browser online status
   */
  private async checkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('/api/v2/health/ping', {
        method: 'HEAD',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      const isConnected = response.ok
      if (isConnected !== this.isOnline) {
        this.isOnline = isConnected
        if (isConnected) {
          this.handleBackOnline()
        } else {
          this.handleGoingOffline()
        }
      }
      
      return isConnected
    } catch (error) {
      if (this.isOnline) {
        this.isOnline = false
        this.handleGoingOffline()
      }
      return false
    }
  }

  /**
   * Handle coming back online
   */
  private async handleBackOnline(): void {
    console.log('🌐 Back online - syncing data')
    
    const analytics = getAnalyticsSystem()
    analytics.trackEvent('offline_back_online', {
      syncQueueSize: this.syncQueue.length,
      offlineTime: Date.now() - this.offlineData.lastSync
    })

    // Sync pending changes
    await this.processSyncQueue()
    
    // Refresh data from server
    await this.syncDataFromServer()

    // Update UI
    this.broadcastNetworkStatus(true)
  }

  /**
   * Handle going offline
   */
  private handleGoingOffline(): void {
    console.log('📴 Gone offline - enabling offline mode')
    
    const analytics = getAnalyticsSystem()
    analytics.trackEvent('offline_mode_activated', {
      cachedAppointments: this.offlineData.appointments.length,
      cachedClients: this.offlineData.clientData.length
    })

    // Save current state
    this.saveOfflineData()

    // Update UI
    this.broadcastNetworkStatus(false)
  }

  /**
   * Setup background sync for offline actions
   */
  private setupBackgroundSync(): void {
    if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      console.warn('Background Sync not supported')
      return
    }

    // Listen for sync events from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SYNC_COMPLETED') {
        this.handleSyncCompleted(event.data.syncTag)
      }
    })
  }

  /**
   * Add item to sync queue for later processing
   */
  addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): void {
    const syncItem: SyncQueueItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0
    }

    this.syncQueue.push(syncItem)
    this.saveSyncQueue()

    // Register background sync
    this.registerBackgroundSync('offline-data-sync')

    const analytics = getAnalyticsSystem()
    analytics.trackEvent('offline_action_queued', {
      type: item.type,
      action: item.action,
      queueSize: this.syncQueue.length
    })
  }

  /**
   * Register background sync
   */
  private async registerBackgroundSync(tag: string): Promise<void> {
    if (!this.serviceWorkerRegistration) return

    try {
      await this.serviceWorkerRegistration.sync.register(tag)
    } catch (error) {
      console.warn('Background sync registration failed:', error)
    }
  }

  /**
   * Process sync queue when back online
   */
  private async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) return

    console.log(`📤 Processing ${this.syncQueue.length} queued items`)

    const results = []
    for (const item of this.syncQueue) {
      try {
        await this.syncItem(item)
        results.push({ success: true, item })
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error)
        
        item.retryCount++
        if (item.retryCount < this.config.maxSyncRetries) {
          results.push({ success: false, retry: true, item })
        } else {
          results.push({ success: false, retry: false, item })
        }
      }
    }

    // Remove successfully synced items
    this.syncQueue = this.syncQueue.filter(item => 
      !results.some(r => r.success && r.item.id === item.id)
    )

    this.saveSyncQueue()

    const successCount = results.filter(r => r.success).length
    console.log(`✅ Synced ${successCount}/${results.length} items`)

    const analytics = getAnalyticsSystem()
    analytics.trackEvent('offline_sync_completed', {
      totalItems: results.length,
      successCount,
      failedItems: results.length - successCount,
      queueRemaining: this.syncQueue.length
    })
  }

  /**
   * Sync individual item to server
   */
  private async syncItem(item: SyncQueueItem): Promise<void> {
    const { type, action, data } = item

    let endpoint = ''
    let method = 'POST'
    let body = data

    switch (type) {
      case 'appointment':
        endpoint = action === 'create' ? '/api/v2/appointments' : 
                  action === 'update' ? `/api/v2/appointments/${data.id}` :
                  `/api/v2/appointments/${data.id}`
        method = action === 'create' ? 'POST' : 
                action === 'update' ? 'PUT' : 'DELETE'
        break

      case 'client':
        endpoint = action === 'create' ? '/api/v2/clients' :
                  action === 'update' ? `/api/v2/clients/${data.id}` :
                  `/api/v2/clients/${data.id}`
        method = action === 'create' ? 'POST' :
                action === 'update' ? 'PUT' : 'DELETE'
        break

      case 'preference':
        endpoint = '/api/v2/user/preferences'
        method = 'PUT'
        break
    }

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: method !== 'DELETE' ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`)
    }
  }

  /**
   * Sync data from server when online
   */
  private async syncDataFromServer(): Promise<void> {
    if (!this.isOnline) return

    try {
      const [appointments, clients, services] = await Promise.all([
        this.fetchWithFallback('/api/v2/appointments/upcoming'),
        this.fetchWithFallback('/api/v2/clients'),
        this.fetchWithFallback('/api/v2/services')
      ])

      this.offlineData = {
        appointments: appointments || this.offlineData.appointments,
        clientData: clients || this.offlineData.clientData,
        serviceData: services || this.offlineData.serviceData,
        userPreferences: this.offlineData.userPreferences,
        lastSync: Date.now()
      }

      this.saveOfflineData()
      console.log('✅ Data synced from server')

    } catch (error) {
      console.error('Failed to sync data from server:', error)
    }
  }

  /**
   * Fetch with fallback to cached data
   */
  private async fetchWithFallback(url: string): Promise<any> {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.warn(`Fetch failed for ${url}, using cached data:`, error)
    }

    return null
  }

  /**
   * Get offline data for specific type
   */
  getOfflineData(type: keyof OfflineData): any {
    return this.offlineData[type]
  }

  /**
   * Update offline data
   */
  updateOfflineData(type: keyof OfflineData, data: any): void {
    this.offlineData[type] = data
    this.saveOfflineData()
  }

  /**
   * Save offline data to localStorage
   */
  private saveOfflineData(): void {
    try {
      localStorage.setItem('mobile_pwa_offline_data', JSON.stringify(this.offlineData))
    } catch (error) {
      console.error('Failed to save offline data:', error)
    }
  }

  /**
   * Save sync queue to localStorage
   */
  private saveSyncQueue(): void {
    try {
      localStorage.setItem('mobile_pwa_sync_queue', JSON.stringify(this.syncQueue))
    } catch (error) {
      console.error('Failed to save sync queue:', error)
    }
  }

  /**
   * Load sync queue from localStorage
   */
  private loadSyncQueue(): void {
    try {
      const stored = localStorage.getItem('mobile_pwa_sync_queue')
      if (stored) {
        this.syncQueue = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error)
    }
  }

  /**
   * Handle sync completion from service worker
   */
  private handleSyncCompleted(syncTag: string): void {
    console.log(`🔄 Background sync completed: ${syncTag}`)
    
    if (syncTag === 'offline-data-sync') {
      this.processSyncQueue()
    }
  }

  /**
   * Broadcast network status to components
   */
  private broadcastNetworkStatus(isOnline: boolean): void {
    window.dispatchEvent(new CustomEvent('networkStatusChange', {
      detail: { isOnline, syncQueueSize: this.syncQueue.length }
    }))
  }

  /**
   * Get current network and sync status
   */
  getStatus(): {
    isOnline: boolean
    lastSync: number
    syncQueueSize: number
    offlineDataSize: number
  } {
    return {
      isOnline: this.isOnline,
      lastSync: this.offlineData.lastSync,
      syncQueueSize: this.syncQueue.length,
      offlineDataSize: JSON.stringify(this.offlineData).length
    }
  }

  /**
   * Force sync when online
   */
  async forceSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline')
    }

    await this.processSyncQueue()
    await this.syncDataFromServer()
  }

  /**
   * Clear all offline data
   */
  clearOfflineData(): void {
    this.offlineData = {
      appointments: [],
      clientData: [],
      serviceData: [],
      userPreferences: {},
      lastSync: 0
    }
    
    this.syncQueue = []
    this.saveOfflineData()
    this.saveSyncQueue()
  }
}

// Global offline system instance
let globalOfflineSystem: MobilePWAOfflineSystem | null = null

/**
 * Get or create offline system instance
 */
export function getOfflineSystem(config?: Partial<OfflineConfig>): MobilePWAOfflineSystem {
  if (!globalOfflineSystem) {
    globalOfflineSystem = new MobilePWAOfflineSystem(config)
  }
  return globalOfflineSystem
}

/**
 * React hook for offline functionality
 */
export function useOfflineData() {
  const offlineSystem = getOfflineSystem()

  return {
    getOfflineData: offlineSystem.getOfflineData.bind(offlineSystem),
    updateOfflineData: offlineSystem.updateOfflineData.bind(offlineSystem),
    addToSyncQueue: offlineSystem.addToSyncQueue.bind(offlineSystem),
    getStatus: offlineSystem.getStatus.bind(offlineSystem),
    forceSync: offlineSystem.forceSync.bind(offlineSystem)
  }
}

/**
 * Network status hook
 */
export function useNetworkStatus() {
  const [status, setStatus] = React.useState(() => {
    const offlineSystem = getOfflineSystem()
    return offlineSystem.getStatus()
  })

  React.useEffect(() => {
    const handleNetworkChange = (event: CustomEvent) => {
      const offlineSystem = getOfflineSystem()
      setStatus(offlineSystem.getStatus())
    }

    window.addEventListener('networkStatusChange', handleNetworkChange as EventListener)
    
    return () => {
      window.removeEventListener('networkStatusChange', handleNetworkChange as EventListener)
    }
  }, [])

  return status
}

export default MobilePWAOfflineSystem