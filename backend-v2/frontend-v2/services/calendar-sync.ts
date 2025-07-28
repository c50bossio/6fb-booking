/**
 * Calendar Sync Service
 * 
 * Frontend service for advanced calendar synchronization functionality.
 * Handles real-time sync monitoring, conflict management, and webhook integration.
 */

import { apiClient } from '../lib/api-client'

// Types for sync monitoring
export interface SyncConfiguration {
  id: string
  provider: 'google_calendar' | 'outlook' | 'apple_calendar' | 'caldav'
  external_calendar_id: string
  sync_direction: 'export_only' | 'import_only' | 'bidirectional'
  conflict_resolution: 'prompt' | 'local_wins' | 'remote_wins' | 'newest_wins' | 'merge'
  sync_frequency_minutes: number
  privacy_level: 'full' | 'business' | 'minimal' | 'anonymous'
  enabled: boolean
  last_sync?: string
  next_sync?: string
  sync_errors: string[]
  webhook_url?: string
  created_at: string
  updated_at: string
}

export interface SyncEvent {
  id: string
  external_id?: string
  title: string
  description: string
  start_time: string
  end_time: string
  location?: string
  attendees: string[]
  created_at: string
  modified_at: string
  source: 'local' | 'external'
  checksum: string
}

export interface SyncResult {
  success: boolean
  sync_id: string
  started_at: string
  completed_at: string
  events_processed: number
  events_created: number
  events_updated: number
  events_deleted: number
  conflicts_detected: number
  conflicts_resolved: number
  duration_seconds: number
  errors: string[]
  warnings: string[]
  next_sync_at?: string
}

export interface ConflictDetails {
  id: string
  local_event: SyncEvent
  remote_event: SyncEvent
  conflict_type: 'time_overlap' | 'content_mismatch' | 'deletion_conflict'
  detected_at: string
  resolution_required: boolean
  suggested_resolution?: string
}

export interface WebhookEvent {
  id: string
  provider: string
  user_id: number
  event_type: 'created' | 'updated' | 'deleted'
  calendar_id: string
  event_id: string
  timestamp: string
  processed: boolean
}

/**
 * Real-time sync monitoring with WebSocket
 */
export class SyncMonitor {
  private ws: WebSocket | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private listeners: Map<string, Function[]> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  constructor(private userId: number) {}

  /**
   * Connect to sync monitoring WebSocket
   */
  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/sync/${this.userId}?token=${token}`
        
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('Sync monitor connected')
          this.reconnectAttempts = 0
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.handleMessage(data)
          } catch (error) {
            console.error('Failed to parse sync message:', error)
          }
        }

        this.ws.onclose = () => {
          console.log('Sync monitor disconnected')
          this.scheduleReconnect(token)
        }

        this.ws.onerror = (error) => {
          console.error('Sync monitor error:', error)
          reject(error)
        }

      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Disconnect from sync monitoring
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.listeners.clear()
  }

  /**
   * Subscribe to sync events
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  /**
   * Unsubscribe from sync events
   */
  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  private handleMessage(data: any): void {
    const { type, payload } = data

    // Emit to listeners
    const callbacks = this.listeners.get(type) || []
    callbacks.forEach(callback => {
      try {
        callback(payload)
      } catch (error) {
        console.error('Sync event callback error:', error)
      }
    })
  }

  private scheduleReconnect(token: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    const delay = Math.pow(2, this.reconnectAttempts) * 1000 // Exponential backoff
    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      this.connect(token).catch(error => {
        console.error('Reconnection failed:', error)
      })
    }, delay)
  }
}

/**
 * Calendar Sync Service Class
 */
export class CalendarSyncService {
  private baseUrl = '/api/v2/calendar/sync'
  private monitor: SyncMonitor | null = null

  constructor(private userId?: number) {}

  /**
   * Initialize sync monitoring
   */
  async initializeMonitoring(token: string): Promise<SyncMonitor> {
    if (!this.userId) {
      throw new Error('User ID required for sync monitoring')
    }

    this.monitor = new SyncMonitor(this.userId)
    await this.monitor.connect(token)
    return this.monitor
  }

  /**
   * Stop sync monitoring
   */
  stopMonitoring(): void {
    if (this.monitor) {
      this.monitor.disconnect()
      this.monitor = null
    }
  }

  /**
   * Get all sync configurations for user
   */
  async getSyncConfigurations(): Promise<SyncConfiguration[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/configurations`)
      return response.data
    } catch (error) {
      console.error('Failed to get sync configurations:', error)
      throw new Error(
        error.response?.data?.detail || 'Failed to get sync configurations'
      )
    }
  }

  /**
   * Create new sync configuration
   */
  async createSyncConfiguration(config: Partial<SyncConfiguration>): Promise<SyncConfiguration> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/configurations`, config)
      return response.data
    } catch (error) {
      console.error('Failed to create sync configuration:', error)
      throw new Error(
        error.response?.data?.detail || 'Failed to create sync configuration'
      )
    }
  }

  /**
   * Update sync configuration
   */
  async updateSyncConfiguration(configId: string, updates: Partial<SyncConfiguration>): Promise<SyncConfiguration> {
    try {
      const response = await apiClient.put(`${this.baseUrl}/configurations/${configId}`, updates)
      return response.data
    } catch (error) {
      console.error('Failed to update sync configuration:', error)
      throw new Error(
        error.response?.data?.detail || 'Failed to update sync configuration'
      )
    }
  }

  /**
   * Delete sync configuration
   */
  async deleteSyncConfiguration(configId: string): Promise<void> {
    try {
      await apiClient.delete(`${this.baseUrl}/configurations/${configId}`)
    } catch (error) {
      console.error('Failed to delete sync configuration:', error)
      throw new Error(
        error.response?.data?.detail || 'Failed to delete sync configuration'
      )
    }
  }

  /**
   * Test sync configuration
   */
  async testSyncConfiguration(config: Partial<SyncConfiguration>): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/test`, config)
      return response.data
    } catch (error) {
      console.error('Sync configuration test failed:', error)
      throw new Error(
        error.response?.data?.detail || 'Sync configuration test failed'
      )
    }
  }

  /**
   * Get sync history
   */
  async getSyncHistory(configId: string, limit = 50): Promise<SyncResult[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/history/${configId}`, {
        params: { limit }
      })
      return response.data
    } catch (error) {
      console.error('Failed to get sync history:', error)
      throw new Error(
        error.response?.data?.detail || 'Failed to get sync history'
      )
    }
  }

  /**
   * Get pending conflicts
   */
  async getPendingConflicts(configId?: string): Promise<ConflictDetails[]> {
    try {
      const params = configId ? { config_id: configId } : {}
      const response = await apiClient.get(`${this.baseUrl}/conflicts/pending`, { params })
      return response.data.conflicts || []
    } catch (error) {
      console.error('Failed to get pending conflicts:', error)
      throw new Error(
        error.response?.data?.detail || 'Failed to get pending conflicts'
      )
    }
  }

  /**
   * Preview sync changes
   */
  async previewSyncChanges(configId: string): Promise<{
    local_changes: SyncEvent[]
    remote_changes: SyncEvent[]
    potential_conflicts: ConflictDetails[]
  }> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/preview/${configId}`)
      return response.data
    } catch (error) {
      console.error('Failed to preview sync changes:', error)
      throw new Error(
        error.response?.data?.detail || 'Failed to preview sync changes'
      )
    }
  }

  /**
   * Get sync performance metrics
   */
  async getSyncMetrics(configId: string, days = 30): Promise<{
    success_rate: number
    average_duration: number
    total_syncs: number
    error_count: number
    events_synced: number
    last_successful_sync?: string
  }> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/metrics/${configId}`, {
        params: { days }
      })
      return response.data
    } catch (error) {
      console.error('Failed to get sync metrics:', error)
      throw new Error(
        error.response?.data?.detail || 'Failed to get sync metrics'
      )
    }
  }

  /**
   * Get webhook events
   */
  async getWebhookEvents(configId: string, limit = 100): Promise<WebhookEvent[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/webhooks/${configId}`, {
        params: { limit }
      })
      return response.data
    } catch (error) {
      console.error('Failed to get webhook events:', error)
      throw new Error(
        error.response?.data?.detail || 'Failed to get webhook events'
      )
    }
  }

  /**
   * Retry failed webhook
   */
  async retryWebhook(webhookId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/webhooks/${webhookId}/retry`)
      return response.data
    } catch (error) {
      console.error('Failed to retry webhook:', error)
      throw new Error(
        error.response?.data?.detail || 'Failed to retry webhook'
      )
    }
  }

  /**
   * Bulk resolve conflicts
   */
  async bulkResolveConflicts(
    conflictIds: string[],
    strategy: 'local_wins' | 'remote_wins' | 'newest_wins'
  ): Promise<{ resolved: number; failed: number; results: any[] }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/conflicts/bulk-resolve`, {
        conflict_ids: conflictIds,
        strategy
      })
      return response.data
    } catch (error) {
      console.error('Bulk conflict resolution failed:', error)
      throw new Error(
        error.response?.data?.detail || 'Bulk conflict resolution failed'
      )
    }
  }

  /**
   * Export sync configuration
   */
  async exportSyncConfiguration(configId: string): Promise<Blob> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/configurations/${configId}/export`, {
        responseType: 'blob'
      })
      return response.data
    } catch (error) {
      console.error('Failed to export sync configuration:', error)
      throw new Error(
        error.response?.data?.detail || 'Failed to export sync configuration'
      )
    }
  }

  /**
   * Import sync configuration
   */
  async importSyncConfiguration(file: File): Promise<SyncConfiguration> {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await apiClient.post(`${this.baseUrl}/configurations/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    } catch (error) {
      console.error('Failed to import sync configuration:', error)
      throw new Error(
        error.response?.data?.detail || 'Failed to import sync configuration'
      )
    }
  }

  /**
   * Validate external calendar connection
   */
  async validateExternalCalendar(
    provider: string,
    calendarId: string,
    credentials?: any
  ): Promise<{ valid: boolean; message: string; calendar_info?: any }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/validate-calendar`, {
        provider,
        calendar_id: calendarId,
        credentials
      })
      return response.data
    } catch (error) {
      console.error('Calendar validation failed:', error)
      throw new Error(
        error.response?.data?.detail || 'Calendar validation failed'
      )
    }
  }

  /**
   * Get supported providers
   */
  getSupportedProviders(): Array<{
    id: string
    name: string
    description: string
    features: string[]
    setup_requirements: string[]
  }> {
    return [
      {
        id: 'google_calendar',
        name: 'Google Calendar',
        description: 'Sync with Google Calendar using OAuth2',
        features: ['Two-way sync', 'Real-time webhooks', 'Conflict resolution'],
        setup_requirements: ['Google account', 'Calendar access permission']
      },
      {
        id: 'outlook',
        name: 'Microsoft Outlook',
        description: 'Sync with Outlook calendar via Microsoft Graph API',
        features: ['Two-way sync', 'Webhook notifications', 'Office 365 integration'],
        setup_requirements: ['Microsoft account', 'Outlook calendar access']
      },
      {
        id: 'apple_calendar',
        name: 'Apple Calendar',
        description: 'Sync with Apple Calendar via CalDAV',
        features: ['Two-way sync', 'iCloud integration'],
        setup_requirements: ['Apple ID', 'iCloud calendar access', 'App-specific password']
      },
      {
        id: 'caldav',
        name: 'CalDAV',
        description: 'Generic CalDAV server integration',
        features: ['Two-way sync', 'Custom server support'],
        setup_requirements: ['CalDAV server URL', 'Authentication credentials']
      }
    ]
  }

  /**
   * Format sync frequency for display
   */
  formatSyncFrequency(minutes: number): string {
    if (minutes < 60) {
      return `Every ${minutes} minute${minutes !== 1 ? 's' : ''}`
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60)
      return `Every ${hours} hour${hours !== 1 ? 's' : ''}`
    } else {
      const days = Math.floor(minutes / 1440)
      return `Every ${days} day${days !== 1 ? 's' : ''}`
    }
  }

  /**
   * Get conflict type description
   */
  getConflictTypeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      time_overlap: 'Appointments overlap in time',
      content_mismatch: 'Event details differ between calendars',
      deletion_conflict: 'Event deleted in one calendar but modified in another'
    }
    return descriptions[type] || 'Unknown conflict type'
  }

  /**
   * Get sync direction description
   */
  getSyncDirectionDescription(direction: string): string {
    const descriptions: Record<string, string> = {
      export_only: 'Local → External (one-way export)',
      import_only: 'External → Local (one-way import)',
      bidirectional: 'Local ↔ External (two-way sync)'
    }
    return descriptions[direction] || direction
  }

  /**
   * Get provider icon
   */
  getProviderIcon(provider: string): string {
    const icons: Record<string, string> = {
      google_calendar: '📅',
      outlook: '📧',
      apple_calendar: '🍎',
      caldav: '🔗'
    }
    return icons[provider] || '📅'
  }

  /**
   * Calculate sync health score
   */
  calculateSyncHealth(metrics: {
    success_rate: number
    average_duration: number
    error_count: number
    last_successful_sync?: string
  }): { score: number; status: string; recommendations: string[] } {
    let score = 100
    const recommendations: string[] = []

    // Deduct points for low success rate
    if (metrics.success_rate < 90) {
      score -= (90 - metrics.success_rate) * 2
      recommendations.push('Improve sync reliability by checking network connectivity')
    }

    // Deduct points for high error count
    if (metrics.error_count > 5) {
      score -= Math.min(metrics.error_count * 2, 20)
      recommendations.push('Review and resolve sync errors')
    }

    // Deduct points for slow syncs
    if (metrics.average_duration > 30) {
      score -= Math.min((metrics.average_duration - 30) / 2, 15)
      recommendations.push('Consider optimizing sync frequency or data volume')
    }

    // Deduct points for stale sync
    if (metrics.last_successful_sync) {
      const lastSync = new Date(metrics.last_successful_sync)
      const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60)
      
      if (hoursSinceSync > 24) {
        score -= Math.min(hoursSinceSync / 2, 25)
        recommendations.push('Sync has not run recently - check configuration')
      }
    }

    // Determine status
    let status = 'excellent'
    if (score < 90) status = 'good'
    if (score < 70) status = 'fair'
    if (score < 50) status = 'poor'

    return {
      score: Math.max(0, Math.round(score)),
      status,
      recommendations
    }
  }
}

// Export singleton instance
export const calendarSyncService = new CalendarSyncService()