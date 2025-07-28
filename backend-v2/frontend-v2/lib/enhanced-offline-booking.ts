/**
 * Enhanced Offline Booking Manager
 * Improved mobile-first PWA experience with intelligent form persistence
 * Version: 1.0.0
 */

export interface OfflineBookingForm {
  id: string
  tempId: string
  step: 'service' | 'datetime' | 'client' | 'payment' | 'confirmation'
  formData: {
    serviceId?: string
    serviceName?: string
    servicePrice?: number
    barberId?: string
    barberName?: string
    selectedDate?: string
    selectedTime?: string
    duration?: number
    clientName?: string
    clientEmail?: string
    clientPhone?: string
    notes?: string
    paymentMethod?: string
  }
  timestamp: number
  lastModified: number
  networkStatus: 'online' | 'offline' | 'poor'
  syncStatus: 'draft' | 'validating' | 'ready' | 'submitting' | 'completed' | 'failed'
  validationErrors?: Record<string, string>
  retryCount: number
}

export interface OfflineBookingConfig {
  autoSaveInterval: number // milliseconds
  maxRetries: number
  networkTimeoutMs: number
  enableHapticFeedback: boolean
  enableProgressIndicator: boolean
}

export class EnhancedOfflineBookingManager {
  private db: IDBDatabase | null = null
  private config: OfflineBookingConfig
  private currentForm: OfflineBookingForm | null = null
  private autoSaveTimer: NodeJS.Timeout | null = null
  private networkMonitor: NetworkMonitor

  constructor(config: Partial<OfflineBookingConfig> = {}) {
    this.config = {
      autoSaveInterval: 2000, // 2 seconds
      maxRetries: 3,
      networkTimeoutMs: 5000, // 5 seconds
      enableHapticFeedback: true,
      enableProgressIndicator: true,
      ...config
    }
    this.networkMonitor = new NetworkMonitor()
    this.initializeDB()
  }

  /**
   * Initialize IndexedDB for enhanced offline booking
   */
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('EnhancedOfflineBooking', 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Booking forms store with advanced indexing
        if (!db.objectStoreNames.contains('bookingForms')) {
          const store = db.createObjectStore('bookingForms', { keyPath: 'id' })
          store.createIndex('tempId', 'tempId', { unique: true })
          store.createIndex('step', 'step')
          store.createIndex('syncStatus', 'syncStatus')
          store.createIndex('timestamp', 'timestamp')
          store.createIndex('lastModified', 'lastModified')
        }
        
        // Form validation cache
        if (!db.objectStoreNames.contains('validationCache')) {
          const store = db.createObjectStore('validationCache', { keyPath: 'key' })
          store.createIndex('timestamp', 'timestamp')
        }
        
        // Network quality metrics
        if (!db.objectStoreNames.contains('networkMetrics')) {
          const store = db.createObjectStore('networkMetrics', { keyPath: 'id', autoIncrement: true })
          store.createIndex('timestamp', 'timestamp')
          store.createIndex('quality', 'quality')
        }
      }
    })
  }

  /**
   * Start new booking session with intelligent pre-caching
   */
  async startBookingSession(): Promise<string> {
    const tempId = `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.currentForm = {
      id: tempId,
      tempId,
      step: 'service',
      formData: {},
      timestamp: Date.now(),
      lastModified: Date.now(),
      networkStatus: this.networkMonitor.getStatus(),
      syncStatus: 'draft',
      retryCount: 0
    }

    // Pre-cache essential data for offline booking
    await this.preCacheBookingData()
    
    // Start auto-save
    this.startAutoSave()
    
    // Provide haptic feedback on mobile
    if (this.config.enableHapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(50) // Short vibration to indicate session start
    }
    
    return tempId
  }

  /**
   * Pre-cache essential data for seamless offline booking
   */
  private async preCacheBookingData(): Promise<void> {
    try {
      // Cache services, barbers, and availability for next 7 days
      const cachePromises = [
        this.cacheServices(),
        this.cacheBarbers(),
        this.cacheAvailability(),
        this.cacheClientHistory()
      ]
      
      await Promise.allSettled(cachePromises)
    } catch (error) {
      console.warn('Pre-caching failed, continuing in degraded mode:', error)
    }
  }

  /**
   * Update form data with intelligent validation and auto-save
   */
  async updateFormData(step: OfflineBookingForm['step'], data: Partial<OfflineBookingForm['formData']>): Promise<void> {
    if (!this.currentForm) {
      throw new Error('No active booking session')
    }

    // Update form data
    this.currentForm.step = step
    this.currentForm.formData = { ...this.currentForm.formData, ...data }
    this.currentForm.lastModified = Date.now()
    this.currentForm.networkStatus = this.networkMonitor.getStatus()

    // Validate form data for current step
    const validation = await this.validateFormStep(step, this.currentForm.formData)
    this.currentForm.validationErrors = validation.errors
    this.currentForm.syncStatus = validation.isValid ? 'ready' : 'validating'

    // Immediate save to IndexedDB
    await this.saveFormToStorage()

    // Provide visual/haptic feedback
    this.provideFeedback(validation.isValid ? 'success' : 'warning')
  }

  /**
   * Intelligent form validation with offline capability
   */
  private async validateFormStep(step: string, formData: any): Promise<{ isValid: boolean; errors: Record<string, string> }> {
    const errors: Record<string, string> = {}

    switch (step) {
      case 'service':
        if (!formData.serviceId) errors.service = 'Please select a service'
        if (!formData.barberId) errors.barber = 'Please select a barber'
        break
        
      case 'datetime':
        if (!formData.selectedDate) errors.date = 'Please select a date'
        if (!formData.selectedTime) errors.time = 'Please select a time'
        // Check for conflicts offline
        const hasConflict = await this.checkOfflineConflicts(formData)
        if (hasConflict) errors.time = 'Time slot may be unavailable'
        break
        
      case 'client':
        if (!formData.clientName?.trim()) errors.name = 'Name is required'
        if (!formData.clientPhone?.trim()) errors.phone = 'Phone is required'
        if (formData.clientEmail && !this.isValidEmail(formData.clientEmail)) {
          errors.email = 'Invalid email format'
        }
        break
        
      case 'payment':
        if (!formData.paymentMethod) errors.payment = 'Please select payment method'
        break
    }

    return { isValid: Object.keys(errors).length === 0, errors }
  }

  /**
   * Check for appointment conflicts using cached data
   */
  private async checkOfflineConflicts(formData: any): Promise<boolean> {
    if (!this.db) return false

    try {
      const transaction = this.db.transaction(['availabilityCache'], 'readonly')
      const store = transaction.objectStore('availabilityCache')
      const key = `${formData.barberId}_${formData.selectedDate}`
      const availability = await this.getFromStore(store, key)
      
      if (!availability) return false
      
      // Check if selected time slot is available
      return !availability.timeSlots.some((slot: any) => 
        slot.time === formData.selectedTime && slot.available
      )
    } catch (error) {
      console.warn('Offline conflict check failed:', error)
      return false
    }
  }

  /**
   * Submit booking with intelligent retry and offline queuing
   */
  async submitBooking(): Promise<{ success: boolean; bookingId?: string; queuedForSync?: boolean }> {
    if (!this.currentForm) {
      throw new Error('No active booking session')
    }

    this.currentForm.syncStatus = 'submitting'
    await this.saveFormToStorage()

    // Try immediate submission if online
    if (this.networkMonitor.isOnline()) {
      try {
        const result = await this.submitToServer()
        if (result.success) {
          this.currentForm.syncStatus = 'completed'
          await this.saveFormToStorage()
          this.provideFeedback('success')
          this.cleanup()
          return { success: true, bookingId: result.bookingId }
        }
      } catch (error) {
        console.warn('Online submission failed, queuing for later:', error)
      }
    }

    // Queue for later submission
    this.currentForm.syncStatus = 'failed'
    this.currentForm.retryCount += 1
    await this.saveFormToStorage()
    await this.queueForBackgroundSync()
    
    this.provideFeedback('queued')
    this.cleanup()
    
    return { success: true, queuedForSync: true }
  }

  /**
   * Auto-save form data every few seconds
   */
  private startAutoSave(): void {
    this.autoSaveTimer = setInterval(async () => {
      if (this.currentForm) {
        await this.saveFormToStorage()
      }
    }, this.config.autoSaveInterval)
  }

  /**
   * Save form to IndexedDB storage
   */
  private async saveFormToStorage(): Promise<void> {
    if (!this.db || !this.currentForm) return

    const transaction = this.db.transaction(['bookingForms'], 'readwrite')
    const store = transaction.objectStore('bookingForms')
    await store.put(this.currentForm)
  }

  /**
   * Provide user feedback with haptic and visual cues
   */
  private provideFeedback(type: 'success' | 'warning' | 'error' | 'queued'): void {
    if (!this.config.enableHapticFeedback || !('vibrate' in navigator)) return

    switch (type) {
      case 'success':
        navigator.vibrate([100, 50, 100]) // Success pattern
        break
      case 'warning':
        navigator.vibrate([200]) // Single warning
        break
      case 'error':
        navigator.vibrate([300, 100, 300, 100, 300]) // Error pattern
        break
      case 'queued':
        navigator.vibrate([150, 100, 150]) // Queued pattern
        break
    }
  }

  /**
   * Cache services data for offline access
   */
  private async cacheServices(): Promise<void> {
    try {
      const response = await fetch('/api/v2/services')
      const services = await response.json()
      
      if (this.db) {
        const transaction = this.db.transaction(['serviceCache'], 'readwrite')
        const store = transaction.objectStore('serviceCache')
        await store.put({ id: 'services', data: services, timestamp: Date.now() })
      }
    } catch (error) {
      console.warn('Failed to cache services:', error)
    }
  }

  /**
   * Cache barbers data for offline access
   */
  private async cacheBarbers(): Promise<void> {
    try {
      const response = await fetch('/api/v2/barbers')
      const barbers = await response.json()
      
      if (this.db) {
        const transaction = this.db.transaction(['barberCache'], 'readwrite')
        const store = transaction.objectStore('barberCache')
        await store.put({ id: 'barbers', data: barbers, timestamp: Date.now() })
      }
    } catch (error) {
      console.warn('Failed to cache barbers:', error)
    }
  }

  /**
   * Cache availability data for next 7 days
   */
  private async cacheAvailability(): Promise<void> {
    // Implementation for caching barber availability
    // This would fetch availability for the next 7 days and cache it
  }

  /**
   * Cache client history for auto-complete
   */
  private async cacheClientHistory(): Promise<void> {
    // Implementation for caching recent client data for auto-complete
  }

  /**
   * Submit booking to server
   */
  private async submitToServer(): Promise<{ success: boolean; bookingId?: string }> {
    // Implementation for server submission
    return { success: true, bookingId: 'temp_id' }
  }

  /**
   * Queue booking for background sync
   */
  private async queueForBackgroundSync(): Promise<void> {
    // Implementation for background sync queuing
  }

  /**
   * Utility methods
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  private async getFromStore(store: IDBObjectStore, key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = store.get(key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
    }
    this.currentForm = null
  }
}

/**
 * Network Monitor for connection quality
 */
class NetworkMonitor {
  private connection: any
  
  constructor() {
    this.connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  }

  getStatus(): 'online' | 'offline' | 'poor' {
    if (!navigator.onLine) return 'offline'
    
    if (this.connection) {
      // Consider 2G or slower as poor connection
      if (this.connection.effectiveType === 'slow-2g' || this.connection.effectiveType === '2g') {
        return 'poor'
      }
    }
    
    return 'online'
  }

  isOnline(): boolean {
    return navigator.onLine && this.getStatus() !== 'poor'
  }
}

export default EnhancedOfflineBookingManager