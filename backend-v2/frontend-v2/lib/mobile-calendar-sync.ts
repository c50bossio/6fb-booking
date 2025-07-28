/**
 * Mobile Calendar Sync System
 * Two-way synchronization with iOS/Android device calendars
 * Version: 1.0.0
 */

import { getOfflineSystem } from './mobile-pwa-offline'
import { getPushNotificationSystem } from './push-notifications'
import { getAnalyticsSystem } from './mobile-pwa-analytics'

export interface CalendarSyncConfig {
  enabled: boolean
  autoSync: boolean
  syncDirection: 'import' | 'export' | 'bidirectional'
  syncInterval: number // minutes
  calendarName: string
  categories: {
    appointments: boolean
    availability: boolean
    businessHours: boolean
  }
  conflictResolution: 'device-wins' | 'app-wins' | 'ask-user'
}

export interface DeviceCalendar {
  id: string
  name: string
  color: string
  isDefault: boolean
  canWrite: boolean
  source: 'local' | 'icloud' | 'google' | 'exchange'
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startDate: Date
  endDate: Date
  allDay: boolean
  location?: string
  attendees?: string[]
  reminders?: number[] // minutes before
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval: number
    until?: Date
    count?: number
  }
  status: 'confirmed' | 'tentative' | 'cancelled'
  privacy: 'public' | 'private' | 'confidential'
  url?: string
  notes?: string
  categories?: string[]
}

export interface SyncConflict {
  id: string
  type: 'time-overlap' | 'duplicate-event' | 'modification-conflict'
  deviceEvent: CalendarEvent
  appEvent: CalendarEvent
  resolution?: 'device' | 'app' | 'merge' | 'skip'
  timestamp: number
}

const DEFAULT_CONFIG: CalendarSyncConfig = {
  enabled: true,
  autoSync: true,
  syncDirection: 'bidirectional',
  syncInterval: 15, // 15 minutes
  calendarName: 'BookedBarber Appointments',
  categories: {
    appointments: true,
    availability: true,
    businessHours: false
  },
  conflictResolution: 'ask-user'
}

export class MobileCalendarSyncSystem {
  private config: CalendarSyncConfig
  private isSupported: boolean = false
  private deviceCalendars: DeviceCalendar[] = []
  private syncConflicts: SyncConflict[] = []
  private lastSyncTime: number = 0
  private syncInProgress: boolean = false

  constructor(config?: Partial<CalendarSyncConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeSystem()
  }

  private async initializeSystem() {
    // Check if calendar API is supported
    this.isSupported = this.checkCalendarSupport()
    
    if (!this.isSupported) {
      console.warn('Device calendar sync not supported on this platform')
      return
    }

    try {
      // Request calendar permissions
      await this.requestCalendarPermissions()

      // Load device calendars
      await this.loadDeviceCalendars()

      // Setup automatic sync if enabled
      if (this.config.autoSync) {
        this.setupAutomaticSync()
      }

      console.log('✅ Mobile Calendar Sync System initialized')
    } catch (error) {
      console.error('Failed to initialize calendar sync:', error)
    }
  }

  /**
   * Check if calendar API is supported
   */
  private checkCalendarSupport(): boolean {
    // Check for various calendar APIs
    return !!(
      (window as any).DeviceMotionEvent || // iOS Safari
      (navigator as any).calendar || // Cordova plugin
      (window as any).CalendarPlugin || // Capacitor plugin  
      'serviceWorker' in navigator // PWA with calendar permissions
    )
  }

  /**
   * Request calendar permissions
   */
  async requestCalendarPermissions(): Promise<boolean> {
    try {
      // For PWA/Web - use Permissions API if available
      if ('permissions' in navigator) {
        const permission = await (navigator as any).permissions.query({ name: 'calendar' })
        if (permission.state === 'denied') {
          return false
        }
      }

      // For Cordova/Capacitor apps
      if ((window as any).CalendarPlugin) {
        const hasPermission = await (window as any).CalendarPlugin.hasReadWritePermission()
        if (!hasPermission) {
          await (window as any).CalendarPlugin.requestReadWritePermission()
        }
      }

      // For iOS Safari - request via user interaction
      if (this.isIOSSafari()) {
        return await this.requestIOSCalendarAccess()
      }

      return true
    } catch (error) {
      console.error('Calendar permission request failed:', error)
      return false
    }
  }

  /**
   * Load available device calendars
   */
  private async loadDeviceCalendars(): Promise<void> {
    try {
      if ((window as any).CalendarPlugin) {
        // Capacitor/Cordova implementation
        const calendars = await (window as any).CalendarPlugin.listCalendars()
        this.deviceCalendars = calendars.map((cal: any) => ({
          id: cal.id,
          name: cal.name,
          color: cal.color,
          isDefault: cal.isPrimary,
          canWrite: !cal.isReadOnly,
          source: this.getCalendarSource(cal.accountName)
        }))
      } else if (this.isIOSSafari()) {
        // iOS Safari implementation
        this.deviceCalendars = await this.loadIOSCalendars()
      } else {
        // Web-based fallback - create virtual calendar
        this.deviceCalendars = [{
          id: 'bookedbarber-pwa',
          name: 'BookedBarber (PWA)',
          color: '#3B82F6',
          isDefault: true,
          canWrite: true,
          source: 'local'
        }]
      }

      console.log(`Found ${this.deviceCalendars.length} device calendars`)
    } catch (error) {
      console.error('Failed to load device calendars:', error)
    }
  }

  /**
   * Setup automatic sync interval
   */
  private setupAutomaticSync(): void {
    setInterval(async () => {
      if (!this.syncInProgress) {
        await this.performSync()
      }
    }, this.config.syncInterval * 60 * 1000)
  }

  /**
   * Perform full sync operation
   */
  async performSync(): Promise<void> {
    if (this.syncInProgress || !this.isSupported) return

    this.syncInProgress = true
    console.log('🔄 Starting calendar sync...')

    try {
      const analytics = getAnalyticsSystem()
      const startTime = Date.now()

      // Get app appointments
      const offlineSystem = getOfflineSystem()
      const appAppointments = offlineSystem.getOfflineData('appointments') || []

      // Get device calendar events
      const deviceEvents = await this.getDeviceCalendarEvents()

      // Determine sync operations
      const syncOperations = this.planSyncOperations(appAppointments, deviceEvents)

      // Execute sync operations
      const results = await this.executeSyncOperations(syncOperations)

      this.lastSyncTime = Date.now()

      // Track sync analytics
      analytics.trackEvent('calendar_sync_completed', {
        duration: Date.now() - startTime,
        operationsCount: syncOperations.length,
        conflictsResolved: results.conflictsResolved,
        eventsImported: results.imported,
        eventsExported: results.exported,
        errors: results.errors
      })

      console.log(`✅ Calendar sync completed: ${results.imported} imported, ${results.exported} exported`)

    } catch (error) {
      console.error('Calendar sync failed:', error)
    } finally {
      this.syncInProgress = false
    }
  }

  /**
   * Get events from device calendar
   */
  private async getDeviceCalendarEvents(): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = []
    const now = new Date()
    const futureDate = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000)) // 90 days

    try {
      if ((window as any).CalendarPlugin) {
        // Capacitor/Cordova implementation
        const calendarEvents = await (window as any).CalendarPlugin.findEvents({
          title: '',
          location: '',
          notes: '',
          startDate: now,
          endDate: futureDate
        })

        return calendarEvents.map((event: any) => this.convertDeviceEventToCalendarEvent(event))
      } else if (this.isIOSSafari()) {
        // iOS Safari implementation
        return await this.getIOSCalendarEvents(now, futureDate)
      } else {
        // Web-based fallback - return empty array
        return []
      }
    } catch (error) {
      console.error('Failed to get device calendar events:', error)
      return []
    }
  }

  /**
   * Plan sync operations based on app and device data
   */
  private planSyncOperations(appAppointments: any[], deviceEvents: CalendarEvent[]): any[] {
    const operations = []

    if (this.config.syncDirection === 'export' || this.config.syncDirection === 'bidirectional') {
      // Export app appointments to device
      for (const appointment of appAppointments) {
        const existingEvent = deviceEvents.find(event => 
          event.notes?.includes(`BookedBarber-${appointment.id}`)
        )

        if (!existingEvent) {
          operations.push({
            type: 'export',
            appointment,
            action: 'create'
          })
        } else if (this.hasAppointmentChanged(appointment, existingEvent)) {
          operations.push({
            type: 'export',
            appointment,
            existingEvent,
            action: 'update'
          })
        }
      }
    }

    if (this.config.syncDirection === 'import' || this.config.syncDirection === 'bidirectional') {
      // Import device events to app
      for (const event of deviceEvents) {
        if (this.shouldImportEvent(event)) {
          const existingAppointment = appAppointments.find(apt => 
            apt.external_calendar_id === event.id
          )

          if (!existingAppointment) {
            operations.push({
              type: 'import',
              event,
              action: 'create'
            })
          } else if (this.hasEventChanged(event, existingAppointment)) {
            operations.push({
              type: 'import',
              event,
              existingAppointment,
              action: 'update'
            })
          }
        }
      }
    }

    return operations
  }

  /**
   * Execute planned sync operations
   */
  private async executeSyncOperations(operations: any[]): Promise<any> {
    const results = {
      imported: 0,
      exported: 0,
      conflictsResolved: 0,
      errors: 0
    }

    for (const operation of operations) {
      try {
        if (operation.type === 'export') {
          await this.exportAppointmentToDevice(operation.appointment, operation.action, operation.existingEvent)
          results.exported++
        } else if (operation.type === 'import') {
          await this.importEventToApp(operation.event, operation.action, operation.existingAppointment)
          results.imported++
        }
      } catch (error) {
        console.error(`Sync operation failed:`, error)
        results.errors++
      }
    }

    return results
  }

  /**
   * Export appointment to device calendar
   */
  private async exportAppointmentToDevice(appointment: any, action: 'create' | 'update', existingEvent?: CalendarEvent): Promise<void> {
    const calendarEvent = this.convertAppointmentToCalendarEvent(appointment)

    if ((window as any).CalendarPlugin) {
      if (action === 'create') {
        await (window as any).CalendarPlugin.createEvent(calendarEvent)
      } else {
        await (window as any).CalendarPlugin.modifyEvent({
          ...calendarEvent,
          id: existingEvent?.id
        })
      }
    } else if (this.isIOSSafari()) {
      await this.createIOSCalendarEvent(calendarEvent)
    }
  }

  /**
   * Import device event to app
   */
  private async importEventToApp(event: CalendarEvent, action: 'create' | 'update', existingAppointment?: any): Promise<void> {
    const appointment = this.convertCalendarEventToAppointment(event)

    const offlineSystem = getOfflineSystem()
    
    if (action === 'create') {
      // Add to offline system as imported appointment
      appointment.external_calendar_id = event.id
      appointment.source = 'device-calendar'
      
      await offlineSystem.updateOfflineData('appointments', [
        ...offlineSystem.getOfflineData('appointments'),
        appointment
      ])
    } else {
      // Update existing appointment
      const appointments = offlineSystem.getOfflineData('appointments')
      const updatedAppointments = appointments.map((apt: any) => 
        apt.id === existingAppointment.id ? { ...apt, ...appointment } : apt
      )
      
      await offlineSystem.updateOfflineData('appointments', updatedAppointments)
    }
  }

  /**
   * Convert app appointment to calendar event format
   */
  private convertAppointmentToCalendarEvent(appointment: any): CalendarEvent {
    const startDate = new Date(appointment.start_time || appointment.startTime)
    const endDate = new Date(startDate.getTime() + (appointment.duration * 60 * 1000))

    return {
      id: `bookedbarber-${appointment.id}`,
      title: `${appointment.service_name || appointment.serviceName} - ${appointment.client_name || appointment.clientName}`,
      description: `BookedBarber appointment\nService: ${appointment.service_name || appointment.serviceName}\nClient: ${appointment.client_name || appointment.clientName}`,
      startDate,
      endDate,
      allDay: false,
      location: appointment.location || '',
      reminders: [15], // 15 minutes before
      status: appointment.status === 'confirmed' ? 'confirmed' : 'tentative',
      privacy: 'private',
      notes: `BookedBarber-${appointment.id}`,
      categories: ['BookedBarber', 'Appointment']
    }
  }

  /**
   * Convert calendar event to app appointment format
   */
  private convertCalendarEventToAppointment(event: CalendarEvent): any {
    return {
      id: `imported_${event.id}_${Date.now()}`,
      client_name: this.extractClientName(event.title),
      service_name: this.extractServiceName(event.title),
      start_time: event.startDate.toISOString(),
      duration: Math.round((event.endDate.getTime() - event.startDate.getTime()) / (60 * 1000)),
      status: event.status === 'confirmed' ? 'confirmed' : 'pending',
      location: event.location || '',
      notes: event.description || '',
      external_calendar_id: event.id,
      source: 'device-calendar',
      isImported: true
    }
  }

  /**
   * Check if appointment has changed compared to calendar event
   */
  private hasAppointmentChanged(appointment: any, event: CalendarEvent): boolean {
    const appointmentStart = new Date(appointment.start_time || appointment.startTime)
    const appointmentTitle = `${appointment.service_name || appointment.serviceName} - ${appointment.client_name || appointment.clientName}`

    return (
      appointmentStart.getTime() !== event.startDate.getTime() ||
      appointmentTitle !== event.title ||
      appointment.status !== (event.status === 'confirmed' ? 'confirmed' : 'pending')
    )
  }

  /**
   * Check if event has changed compared to appointment
   */
  private hasEventChanged(event: CalendarEvent, appointment: any): boolean {
    const appointmentStart = new Date(appointment.start_time || appointment.startTime)
    
    return (
      event.startDate.getTime() !== appointmentStart.getTime() ||
      event.status !== (appointment.status === 'confirmed' ? 'confirmed' : 'tentative')
    )
  }

  /**
   * Check if event should be imported to app
   */
  private shouldImportEvent(event: CalendarEvent): boolean {
    // Don't import events we created
    if (event.notes?.includes('BookedBarber-') || event.categories?.includes('BookedBarber')) {
      return false
    }

    // Only import events that look like appointments
    const title = event.title.toLowerCase()
    const appointmentKeywords = ['appointment', 'booking', 'meeting', 'consultation', 'service']
    
    return appointmentKeywords.some(keyword => title.includes(keyword))
  }

  /**
   * Extract client name from event title
   */
  private extractClientName(title: string): string {
    // Try to extract client name from various formats
    const match = title.match(/(?:with|for|client)\s+([A-Za-z\s]+)/i)
    return match ? match[1].trim() : 'Imported Client'
  }

  /**
   * Extract service name from event title
   */
  private extractServiceName(title: string): string {
    // Try to extract service name from title
    const commonServices = ['haircut', 'trim', 'shave', 'style', 'color', 'wash', 'consultation']
    const titleLower = title.toLowerCase()
    
    const service = commonServices.find(s => titleLower.includes(s))
    return service ? service.charAt(0).toUpperCase() + service.slice(1) : 'Imported Service'
  }

  /**
   * iOS Safari specific implementations
   */
  private isIOSSafari(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  }

  private async requestIOSCalendarAccess(): Promise<boolean> {
    // For iOS Safari, we need to use a different approach
    // This would typically involve showing a custom UI to guide users
    return new Promise((resolve) => {
      // Show instruction modal for manual calendar setup
      this.showIOSCalendarInstructions()
      resolve(true)
    })
  }

  private async loadIOSCalendars(): Promise<DeviceCalendar[]> {
    // iOS Safari implementation would be limited
    return [{
      id: 'ios-default',
      name: 'iOS Calendar',
      color: '#007AFF',
      isDefault: true,
      canWrite: true,
      source: 'local'
    }]
  }

  private async getIOSCalendarEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    // iOS Safari can't directly access calendar events
    // This would require user to manually export/import
    return []
  }

  private async createIOSCalendarEvent(event: CalendarEvent): Promise<void> {
    // Generate .ics file for iOS Safari
    const icsContent = this.generateICSContent(event)
    this.downloadICSFile(icsContent, `${event.title}.ics`)
  }

  /**
   * Generate ICS file content
   */
  private generateICSContent(event: CalendarEvent): string {
    const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//BookedBarber//Calendar Sync//EN
BEGIN:VEVENT
UID:${event.id}@bookedbarber.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(event.startDate)}
DTEND:${formatDate(event.endDate)}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${event.location || ''}
STATUS:${event.status?.toUpperCase() || 'CONFIRMED'}
CATEGORIES:${event.categories?.join(',') || 'BookedBarber'}
END:VEVENT
END:VCALENDAR`
  }

  /**
   * Download ICS file
   */
  private downloadICSFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  }

  /**
   * Show iOS calendar instructions
   */
  private showIOSCalendarInstructions(): void {
    // This would show a modal with instructions for iOS users
    console.log('📱 iOS Calendar Integration: Use generated .ics files to sync with your device calendar')
  }

  /**
   * Get calendar source from account name
   */
  private getCalendarSource(accountName: string): DeviceCalendar['source'] {
    if (accountName?.toLowerCase().includes('icloud')) return 'icloud'
    if (accountName?.toLowerCase().includes('google')) return 'google'
    if (accountName?.toLowerCase().includes('exchange')) return 'exchange'
    return 'local'
  }

  /**
   * Convert device event to standard format
   */
  private convertDeviceEventToCalendarEvent(deviceEvent: any): CalendarEvent {
    return {
      id: deviceEvent.id,
      title: deviceEvent.title,
      description: deviceEvent.notes,
      startDate: new Date(deviceEvent.startDate),
      endDate: new Date(deviceEvent.endDate),
      allDay: deviceEvent.allday,
      location: deviceEvent.location,
      status: deviceEvent.status === 'CONFIRMED' ? 'confirmed' : 'tentative',
      privacy: 'private',
      categories: deviceEvent.categories || []
    }
  }

  /**
   * Get sync status
   */
  getStatus(): {
    supported: boolean
    enabled: boolean
    lastSync: number
    conflictsCount: number
    calendarsCount: number
  } {
    return {
      supported: this.isSupported,
      enabled: this.config.enabled,
      lastSync: this.lastSyncTime,
      conflictsCount: this.syncConflicts.length,
      calendarsCount: this.deviceCalendars.length
    }
  }

  /**
   * Get available device calendars
   */
  getDeviceCalendars(): DeviceCalendar[] {
    return [...this.deviceCalendars]
  }

  /**
   * Update sync configuration
   */
  updateConfig(newConfig: Partial<CalendarSyncConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Save to localStorage
    localStorage.setItem('mobile_calendar_sync_config', JSON.stringify(this.config))
  }

  /**
   * Manual sync trigger
   */
  async triggerSync(): Promise<void> {
    if (!this.isSupported) {
      throw new Error('Calendar sync not supported on this device')
    }

    await this.performSync()
  }

  /**
   * Export single appointment
   */
  async exportAppointment(appointment: any): Promise<void> {
    if (!this.isSupported) {
      throw new Error('Calendar export not supported on this device')
    }

    await this.exportAppointmentToDevice(appointment, 'create')
    
    const notifications = getPushNotificationSystem()
    await notifications.showBookingConfirmation({
      ...appointment,
      message: 'Appointment exported to device calendar'
    })
  }
}

// Global calendar sync instance
let globalCalendarSync: MobileCalendarSyncSystem | null = null

/**
 * Get or create calendar sync instance
 */
export function getCalendarSyncSystem(config?: Partial<CalendarSyncConfig>): MobileCalendarSyncSystem {
  if (!globalCalendarSync) {
    globalCalendarSync = new MobileCalendarSyncSystem(config)
  }
  return globalCalendarSync
}

/**
 * React hook for calendar sync
 */
export function useCalendarSync() {
  const calendarSync = getCalendarSyncSystem()

  return {
    triggerSync: calendarSync.triggerSync.bind(calendarSync),
    exportAppointment: calendarSync.exportAppointment.bind(calendarSync),
    getStatus: calendarSync.getStatus.bind(calendarSync),
    getDeviceCalendars: calendarSync.getDeviceCalendars.bind(calendarSync),
    updateConfig: calendarSync.updateConfig.bind(calendarSync)
  }
}

export default MobileCalendarSyncSystem