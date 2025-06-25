import { CalendarAppointment } from '@/components/calendar/PremiumCalendar'
import { googleCalendarClient } from './client'
import { GOOGLE_CALENDAR_CONFIG, EVENT_STATUS_MAP, GOOGLE_CALENDAR_ERRORS } from './config'
import {
  GoogleCalendarEvent,
  GoogleCalendar,
  SyncQueueItem,
  ConflictItem,
  SyncStats,
  mapAppointmentToGoogleEvent,
  mapGoogleEventToAppointment
} from './types'

export class GoogleCalendarSyncService {
  private syncQueue: SyncQueueItem[] = []
  private conflictQueue: ConflictItem[] = []
  private isSyncing = false
  private syncInterval: NodeJS.Timeout | null = null
  private watchResourceIds: Map<string, string> = new Map()

  constructor() {
    this.loadQueueFromStorage()
  }

  // Queue management
  private loadQueueFromStorage() {
    if (typeof window === 'undefined') return

    const savedQueue = localStorage.getItem(GOOGLE_CALENDAR_CONFIG.storageKeys.syncQueue)
    if (savedQueue) {
      try {
        this.syncQueue = JSON.parse(savedQueue)
      } catch (e) {
        console.error('Failed to load sync queue:', e)
      }
    }
  }

  private saveQueueToStorage() {
    if (typeof window === 'undefined') return
    localStorage.setItem(GOOGLE_CALENDAR_CONFIG.storageKeys.syncQueue, JSON.stringify(this.syncQueue))
  }

  private addToQueue(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount'>) {
    const queueItem: SyncQueueItem = {
      ...item,
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      retryCount: 0
    }

    this.syncQueue.push(queueItem)
    this.saveQueueToStorage()
  }

  private removeFromQueue(id: string) {
    this.syncQueue = this.syncQueue.filter(item => item.id !== id)
    this.saveQueueToStorage()
  }

  // Conflict resolution
  private async resolveConflict(
    conflict: ConflictItem,
    strategy: 'local-priority' | 'google-priority' | 'newest-wins' | 'manual'
  ): Promise<void> {
    switch (strategy) {
      case 'local-priority':
        // Update Google with local data
        await this.updateGoogleEvent(
          conflict.googleData.id!,
          conflict.localData
        )
        break

      case 'google-priority':
        // Update local with Google data (callback to parent)
        // This would need to be handled by the parent component
        break

      case 'newest-wins':
        // Compare updated timestamps
        const localUpdated = new Date(conflict.localData.date).getTime()
        const googleUpdated = new Date(conflict.googleData.updated || 0).getTime()

        if (localUpdated > googleUpdated) {
          await this.updateGoogleEvent(conflict.googleData.id!, conflict.localData)
        }
        break

      case 'manual':
        // Add to conflict queue for manual resolution
        this.conflictQueue.push(conflict)
        break
    }
  }

  // Main sync methods
  async startAutoSync(intervalMinutes?: number): Promise<void> {
    const interval = intervalMinutes || GOOGLE_CALENDAR_CONFIG.syncIntervalMinutes

    // Initial sync
    await this.syncAll()

    // Set up interval
    this.syncInterval = setInterval(() => {
      this.syncAll().catch(console.error)
    }, interval * 60 * 1000)
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  async syncAll(
    calendarIds?: string[],
    appointments?: CalendarAppointment[]
  ): Promise<SyncStats> {
    if (this.isSyncing) {
      throw new Error('Sync already in progress')
    }

    this.isSyncing = true
    const stats: SyncStats = {
      totalSynced: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      conflicts: 0,
      errors: 0,
      lastFullSync: new Date()
    }

    try {
      // Process sync queue first
      await this.processSyncQueue(stats)

      // Get calendars to sync
      const calendarsToSync = calendarIds || await this.getEnabledCalendarIds()

      // Sync each calendar
      for (const calendarId of calendarsToSync) {
        await this.syncCalendar(calendarId, appointments, stats)
      }

      // Save last sync time
      localStorage.setItem(
        GOOGLE_CALENDAR_CONFIG.storageKeys.lastSyncTime,
        new Date().toISOString()
      )

      return stats
    } finally {
      this.isSyncing = false
    }
  }

  private async syncCalendar(
    calendarId: string,
    localAppointments?: CalendarAppointment[],
    stats: SyncStats
  ): Promise<void> {
    try {
      // Get all events from Google Calendar
      const googleEvents = await this.fetchAllEvents(calendarId)

      // Create maps for efficient lookup
      const googleEventMap = new Map(
        googleEvents.map(event => [
          event.extendedProperties?.private?.appointmentId || event.id!,
          event
        ])
      )

      const localAppointmentMap = new Map(
        (localAppointments || []).map(apt => [apt.id, apt])
      )

      // Sync local to Google
      for (const appointment of localAppointments || []) {
        const googleEvent = googleEventMap.get(appointment.id)

        if (!googleEvent) {
          // Create new event in Google
          await this.createGoogleEvent(appointment, calendarId)
          stats.created++
        } else {
          // Check for updates
          if (this.needsUpdate(appointment, googleEvent)) {
            await this.updateGoogleEvent(googleEvent.id!, appointment, calendarId)
            stats.updated++
          }
        }

        stats.totalSynced++
      }

      // Sync Google to local (find events not in local)
      for (const [id, googleEvent] of googleEventMap) {
        if (!localAppointmentMap.has(id) && !this.isExternalEvent(googleEvent)) {
          // This is a new event from Google that needs to be added locally
          // This would need to be handled by the parent component via callback
          stats.created++
        }
      }

    } catch (error) {
      stats.errors++
      console.error(`Failed to sync calendar ${calendarId}:`, error)
    }
  }

  private async fetchAllEvents(calendarId: string): Promise<GoogleCalendarEvent[]> {
    const events: GoogleCalendarEvent[] = []
    let pageToken: string | undefined

    // Set time range for sync (e.g., 1 year back to 1 year forward)
    const timeMin = new Date()
    timeMin.setFullYear(timeMin.getFullYear() - 1)

    const timeMax = new Date()
    timeMax.setFullYear(timeMax.getFullYear() + 1)

    do {
      const response = await googleCalendarClient.listEvents(calendarId, {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults: GOOGLE_CALENDAR_CONFIG.maxResults,
        pageToken
      })

      events.push(...response.events)
      pageToken = response.nextPageToken
    } while (pageToken)

    return events
  }

  private needsUpdate(appointment: CalendarAppointment, googleEvent: GoogleCalendarEvent): boolean {
    // Compare key fields to determine if update is needed
    const googleStartTime = new Date(googleEvent.start?.dateTime || '').toTimeString().slice(0, 5)
    const googleEndTime = new Date(googleEvent.end?.dateTime || '').toTimeString().slice(0, 5)

    return (
      appointment.title !== googleEvent.summary ||
      appointment.startTime !== googleStartTime ||
      appointment.endTime !== googleEndTime ||
      EVENT_STATUS_MAP[appointment.status] !== googleEvent.status
    )
  }

  private isExternalEvent(event: GoogleCalendarEvent): boolean {
    // Check if this event was created outside our app
    return !event.extendedProperties?.private?.appointmentId
  }

  // CRUD operations
  async createGoogleEvent(
    appointment: CalendarAppointment,
    calendarId: string = 'primary'
  ): Promise<GoogleCalendarEvent> {
    try {
      const googleEvent = mapAppointmentToGoogleEvent(appointment)
      return await googleCalendarClient.createEvent(calendarId, googleEvent)
    } catch (error) {
      this.addToQueue({
        operation: 'create',
        entityType: 'appointment',
        entityId: appointment.id,
        data: appointment
      })
      throw error
    }
  }

  async updateGoogleEvent(
    eventId: string,
    appointment: CalendarAppointment,
    calendarId: string = 'primary'
  ): Promise<GoogleCalendarEvent> {
    try {
      const googleEvent = mapAppointmentToGoogleEvent(appointment)
      return await googleCalendarClient.updateEvent(calendarId, eventId, googleEvent)
    } catch (error) {
      this.addToQueue({
        operation: 'update',
        entityType: 'appointment',
        entityId: appointment.id,
        data: appointment
      })
      throw error
    }
  }

  async deleteGoogleEvent(
    eventId: string,
    calendarId: string = 'primary'
  ): Promise<void> {
    try {
      await googleCalendarClient.deleteEvent(calendarId, eventId)
    } catch (error) {
      this.addToQueue({
        operation: 'delete',
        entityType: 'event',
        entityId: eventId
      })
      throw error
    }
  }

  // Queue processing
  private async processSyncQueue(stats: SyncStats): Promise<void> {
    const itemsToProcess = [...this.syncQueue]

    for (const item of itemsToProcess) {
      try {
        await this.processQueueItem(item)
        this.removeFromQueue(item.id)
      } catch (error) {
        item.retryCount++
        item.lastAttemptAt = new Date()
        item.error = error instanceof Error ? error.message : 'Unknown error'

        if (item.retryCount >= GOOGLE_CALENDAR_CONFIG.retryAttempts) {
          this.removeFromQueue(item.id)
          stats.errors++
        }

        // Exponential backoff for retries
        const delay = GOOGLE_CALENDAR_CONFIG.retryDelayMs * Math.pow(2, item.retryCount - 1)
        setTimeout(() => this.processSyncQueue(stats), delay)
      }
    }
  }

  private async processQueueItem(item: SyncQueueItem): Promise<void> {
    switch (item.operation) {
      case 'create':
        if (item.data && 'service' in item.data) {
          await this.createGoogleEvent(item.data as CalendarAppointment)
        }
        break

      case 'update':
        if (item.data && 'service' in item.data) {
          // Need to find the Google event ID first
          const googleEventId = await this.findGoogleEventId(item.entityId)
          if (googleEventId) {
            await this.updateGoogleEvent(googleEventId, item.data as CalendarAppointment)
          }
        }
        break

      case 'delete':
        await this.deleteGoogleEvent(item.entityId)
        break
    }
  }

  private async findGoogleEventId(appointmentId: string): Promise<string | null> {
    // Search for event with matching appointment ID in extended properties
    const calendars = await this.getEnabledCalendarIds()

    for (const calendarId of calendars) {
      const events = await googleCalendarClient.listEvents(calendarId, {
        q: appointmentId,
        maxResults: 10
      })

      const matchingEvent = events.events.find(
        event => event.extendedProperties?.private?.appointmentId === appointmentId
      )

      if (matchingEvent?.id) {
        return matchingEvent.id
      }
    }

    return null
  }

  // Calendar management
  async getCalendars(): Promise<GoogleCalendar[]> {
    return googleCalendarClient.listCalendars()
  }

  async getEnabledCalendarIds(): Promise<string[]> {
    const savedCalendars = localStorage.getItem(GOOGLE_CALENDAR_CONFIG.storageKeys.syncedCalendars)
    if (!savedCalendars) return ['primary']

    try {
      const calendars = JSON.parse(savedCalendars)
      return calendars.filter((cal: any) => cal.isEnabled).map((cal: any) => cal.id)
    } catch {
      return ['primary']
    }
  }

  // Real-time sync with webhooks
  async setupRealtimeSync(calendarId: string): Promise<void> {
    try {
      const { resourceId, expiration } = await googleCalendarClient.watchCalendar(calendarId)
      this.watchResourceIds.set(calendarId, resourceId)

      // Schedule renewal before expiration
      const renewTime = expiration - (60 * 60 * 1000) // 1 hour before expiration
      setTimeout(() => {
        this.renewWatch(calendarId).catch(console.error)
      }, renewTime - Date.now())
    } catch (error) {
      console.error('Failed to setup realtime sync:', error)
    }
  }

  private async renewWatch(calendarId: string): Promise<void> {
    const oldResourceId = this.watchResourceIds.get(calendarId)
    if (oldResourceId) {
      try {
        await googleCalendarClient.stopWatching(calendarId, oldResourceId)
      } catch (error) {
        console.error('Failed to stop old watch:', error)
      }
    }

    await this.setupRealtimeSync(calendarId)
  }

  async stopRealtimeSync(calendarId: string): Promise<void> {
    const resourceId = this.watchResourceIds.get(calendarId)
    if (resourceId) {
      await googleCalendarClient.stopWatching(calendarId, resourceId)
      this.watchResourceIds.delete(calendarId)
    }
  }

  // Utility methods
  getConflicts(): ConflictItem[] {
    return [...this.conflictQueue]
  }

  resolveConflictManually(conflictId: string, resolution: 'local' | 'google'): void {
    const conflict = this.conflictQueue.find(c => c.id === conflictId)
    if (conflict) {
      conflict.resolution = resolution
      conflict.resolvedAt = new Date()
      this.conflictQueue = this.conflictQueue.filter(c => c.id !== conflictId)
    }
  }

  getSyncStatus(): {
    isSyncing: boolean
    queueLength: number
    conflictsCount: number
    lastSync?: Date
  } {
    const lastSyncStr = localStorage.getItem(GOOGLE_CALENDAR_CONFIG.storageKeys.lastSyncTime)

    return {
      isSyncing: this.isSyncing,
      queueLength: this.syncQueue.length,
      conflictsCount: this.conflictQueue.length,
      lastSync: lastSyncStr ? new Date(lastSyncStr) : undefined
    }
  }
}

// Singleton instance
export const googleCalendarSync = new GoogleCalendarSyncService()
