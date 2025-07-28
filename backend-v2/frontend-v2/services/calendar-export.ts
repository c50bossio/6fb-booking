/**
 * Calendar Export Service
 * 
 * Frontend service for calendar export and synchronization functionality.
 * Provides a clean interface for interacting with the calendar export APIs.
 */

import { apiRequest } from '../lib/api'

// Types
export interface ExportOptions {
  format: 'ical' | 'csv' | 'json' | 'google_calendar' | 'outlook'
  privacy_level: 'full' | 'business' | 'minimal' | 'anonymous'
  start_date: string
  end_date: string
  barber_ids?: number[]
  service_ids?: number[]
  include_cancelled?: boolean
  include_completed?: boolean
  timezone?: string
  custom_title?: string
  include_client_contact?: boolean
  include_pricing?: boolean
}

export interface ExportResult {
  success: boolean
  format: string
  filename: string
  size_bytes: number
  export_count: number
  export_id: string
  subscription_url?: string
  download_url?: string
  errors: string[]
  warnings: string[]
}

export interface BulkExportOptions {
  barber_ids: number[]
  export_options: ExportOptions
}

export interface BulkExportResult {
  success: boolean
  total_exports: number
  successful_exports: number
  failed_exports: number
  results: ExportResult[]
}

export interface SyncOptions {
  provider: 'google_calendar' | 'outlook' | 'apple_calendar' | 'caldav'
  external_calendar_id: string
  sync_direction?: 'export_only' | 'import_only' | 'bidirectional'
  conflict_resolution?: 'prompt' | 'local_wins' | 'remote_wins' | 'newest_wins' | 'merge'
  sync_frequency?: number
  privacy_level?: 'full' | 'business' | 'minimal' | 'anonymous'
  auto_create_calendar?: boolean
  webhook_enabled?: boolean
}

export interface SyncStatus {
  total_configurations: number
  active_configurations: number
  last_sync_times: Record<string, string | null>
  next_sync_times: Record<string, string | null>
  sync_errors: Record<string, string[]>
  sync_health: Record<string, {
    score: number
    status: string
    last_successful_sync?: string
    error_count: number
    uptime_percentage: number
  }>
  recent_activity: Array<{
    timestamp: string
    action: string
    provider: string
    events_processed: number
    success: boolean
  }>
}

export interface SyncConflict {
  id: string
  local_event: {
    id: string
    title: string
    start_time: string
    end_time: string
    description: string
  }
  remote_event: {
    id: string
    title: string
    start_time: string
    end_time: string
    description: string
  }
  conflict_type: 'time_overlap' | 'content_mismatch' | 'deletion_conflict'
  detected_at: string
  suggested_resolution?: string
}

export interface ConflictData {
  total_conflicts: number
  pending_conflicts: number
  resolved_conflicts: number
  conflicts: SyncConflict[]
}

export interface SubscriptionOptions {
  name: string
  description: string
  privacy_level: 'full' | 'business' | 'minimal' | 'anonymous'
  filters: Record<string, any>
  expires_in_days?: number
}

export interface CalendarSubscription {
  success: boolean
  subscription_id: string
  name: string
  url: string
  expires_at?: string
  created_at: string
}

export interface Analytics {
  export_analytics: {
    total_exports: number
    exports_by_format: Record<string, number>
    exports_by_privacy_level: Record<string, number>
    subscription_usage: Record<string, number>
    sync_performance: Record<string, any>
    most_exported_date_ranges: string[]
    error_rate: number
  }
  sync_analytics: {
    sync_frequency: {
      successful_syncs: number
      failed_syncs: number
      average_duration_seconds: number
      success_rate_percentage: number
    }
    data_volume: {
      events_synced_total: number
      events_created: number
      events_updated: number
      events_deleted: number
    }
    conflicts: {
      total_conflicts: number
      resolved_conflicts: number
      pending_conflicts: number
      conflict_types: Record<string, number>
    }
    provider_breakdown: Record<string, any>
    error_analysis: {
      most_common_errors: string[]
      error_trends: any[]
    }
    performance_metrics: {
      average_sync_time: number
      sync_reliability_score: number
      webhook_response_time: number
    }
  }
  period_days: number
  generated_at: string
}

/**
 * Calendar Export Service Class
 */
export class CalendarExportService {
  private baseUrl = '/api/v2/calendar'

  /**
   * Export calendar in specified format
   */
  async exportCalendar(options: ExportOptions): Promise<ExportResult> {
    try {
      const response = await apiRequest(`${this.baseUrl}/export`, {
        method: 'POST',
        body: JSON.stringify(options),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      return response
    } catch (error) {
      console.error('Calendar export failed:', error)
      throw new Error(
        error.detail || 'Calendar export failed'
      )
    }
  }

  /**
   * Export calendars for multiple barbers
   */
  async bulkExport(options: BulkExportOptions): Promise<BulkExportResult> {
    try {
      const response = await apiRequest(`${this.baseUrl}/bulk-export`, {
        method: 'POST',
        body: JSON.stringify(options),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      return response
    } catch (error) {
      console.error('Bulk export failed:', error)
      throw new Error(
        error.detail || 'Bulk export failed'
      )
    }
  }

  /**
   * Download exported calendar file
   */
  async downloadExport(exportId: string): Promise<Blob> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/download/${exportId}`, {
        responseType: 'blob'
      })
      return response.data
    } catch (error) {
      console.error('Download failed:', error)
      throw new Error(
        error.response?.data?.detail || 'Download failed'
      )
    }
  }

  /**
   * Set up calendar synchronization
   */
  async setupSync(options: SyncOptions): Promise<any> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/sync/setup`, options)
      return response.data
    } catch (error) {
      console.error('Sync setup failed:', error)
      throw new Error(
        error.response?.data?.detail || 'Sync setup failed'
      )
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/sync/status`)
      return response.data
    } catch (error) {
      console.error('Failed to get sync status:', error)
      throw new Error(
        error.response?.data?.detail || 'Failed to get sync status'
      )
    }
  }

  /**
   * Manually trigger sync
   */
  async triggerSync(configId: string, force = false): Promise<any> {
    try {
      const response = await apiClient.post(
        `${this.baseUrl}/sync/${configId}/trigger`,
        null,
        { params: { force } }
      )
      return response.data
    } catch (error) {
      console.error('Manual sync failed:', error)
      throw new Error(
        error.response?.data?.detail || 'Manual sync failed'
      )
    }
  }

  /**
   * Pause sync
   */
  async pauseSync(configId: string): Promise<any> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/sync/${configId}/pause`)
      return response.data
    } catch (error) {
      console.error('Failed to pause sync:', error)
      throw new Error(
        error.response?.data?.detail || 'Failed to pause sync'
      )
    }
  }

  /**
   * Resume sync
   */
  async resumeSync(configId: string): Promise<any> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/sync/${configId}/resume`)
      return response.data
    } catch (error) {
      console.error('Failed to resume sync:', error)
      throw new Error(
        error.response?.data?.detail || 'Failed to resume sync'
      )
    }
  }

  /**
   * Get sync conflicts
   */
  async getSyncConflicts(): Promise<ConflictData> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/sync/conflicts`)
      return response.data
    } catch (error) {
      console.error('Failed to get conflicts:', error)
      throw new Error(
        error.response?.data?.detail || 'Failed to get conflicts'
      )
    }
  }

  /**
   * Resolve sync conflicts
   */
  async resolveConflicts(
    conflictIds: string[],
    resolutionStrategy: 'prompt' | 'local_wins' | 'remote_wins' | 'newest_wins' | 'merge',
    userChoices?: Record<string, any>
  ): Promise<any> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/sync/conflicts/resolve`, {
        conflict_ids: conflictIds,
        resolution_strategy: resolutionStrategy,
        user_choices: userChoices
      })
      return response.data
    } catch (error) {
      console.error('Conflict resolution failed:', error)
      throw new Error(
        error.response?.data?.detail || 'Conflict resolution failed'
      )
    }
  }

  /**
   * Create calendar subscription
   */
  async createSubscription(options: SubscriptionOptions): Promise<CalendarSubscription> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/subscription`, options)
      return response.data
    } catch (error) {
      console.error('Subscription creation failed:', error)
      throw new Error(
        error.response?.data?.detail || 'Subscription creation failed'
      )
    }
  }

  /**
   * Get analytics
   */
  async getAnalytics(days = 30): Promise<Analytics> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/analytics`, {
        params: { days }
      })
      return response.data
    } catch (error) {
      console.error('Failed to get analytics:', error)
      throw new Error(
        error.response?.data?.detail || 'Failed to get analytics'
      )
    }
  }

  /**
   * Helper method to download file with proper filename
   */
  async downloadFile(exportId: string, filename?: string): Promise<void> {
    try {
      const blob = await this.downloadExport(exportId)
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || `calendar-export-${exportId}`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('File download failed:', error)
      throw error
    }
  }

  /**
   * Get export format display name
   */
  getFormatDisplayName(format: string): string {
    const formatNames: Record<string, string> = {
      ical: 'iCalendar (.ics)',
      csv: 'CSV Spreadsheet (.csv)',
      json: 'JSON Data (.json)',
      google_calendar: 'Google Calendar',
      outlook: 'Outlook Calendar (.msg)'
    }
    return formatNames[format] || format
  }

  /**
   * Get privacy level description
   */
  getPrivacyLevelDescription(level: string): string {
    const descriptions: Record<string, string> = {
      full: 'All details including client contact information',
      business: 'Business details without sensitive client info',
      minimal: 'Just appointment times and services',
      anonymous: 'Generic placeholder appointments'
    }
    return descriptions[level] || level
  }

  /**
   * Validate export options
   */
  validateExportOptions(options: ExportOptions): string[] {
    const errors: string[] = []

    // Check required fields
    if (!options.format) {
      errors.push('Export format is required')
    }

    if (!options.start_date) {
      errors.push('Start date is required')
    }

    if (!options.end_date) {
      errors.push('End date is required')
    }

    // Check date range
    if (options.start_date && options.end_date) {
      const start = new Date(options.start_date)
      const end = new Date(options.end_date)
      
      if (start >= end) {
        errors.push('End date must be after start date')
      }

      // Check for reasonable date range (max 1 year)
      const yearInMs = 365 * 24 * 60 * 60 * 1000
      if (end.getTime() - start.getTime() > yearInMs) {
        errors.push('Date range cannot exceed 1 year')
      }
    }

    // Check barber IDs if provided
    if (options.barber_ids && options.barber_ids.length === 0) {
      errors.push('At least one barber must be selected if barber filter is used')
    }

    return errors
  }

  /**
   * Format sync frequency for display
   */
  formatSyncFrequency(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minutes`
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60)
      return `${hours} hour${hours > 1 ? 's' : ''}`
    } else {
      const days = Math.floor(minutes / 1440)
      return `${days} day${days > 1 ? 's' : ''}`
    }
  }

  /**
   * Get sync health status color
   */
  getSyncHealthColor(score: number): string {
    if (score >= 90) return 'green'
    if (score >= 70) return 'yellow'
    if (score >= 50) return 'orange'
    return 'red'
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// Export singleton instance
export const calendarExportService = new CalendarExportService()