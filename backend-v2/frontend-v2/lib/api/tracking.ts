/**
 * Conversion Tracking API Client
 * 
 * Provides methods for tracking conversion events, managing attribution,
 * configuring tracking platforms, and analyzing conversion data.
 */

import { fetchAPI } from '../api'
import type {
  ConversionEventCreate,
  ConversionEventResponse,
  ConversionAnalytics,
  ConversionAnalyticsQuery,
  AttributionReport,
  AttributionReportQuery,
  AttributionModel,
  TrackingConfigUpdate,
  TrackingConfigResponse,
  ConversionGoalCreate,
  ConversionGoalResponse,
  ConversionGoalsQuery,
  CampaignTrackingCreate,
  CampaignTrackingResponse,
  CampaignTrackingQuery,
  CampaignMetricsUpdate,
  CampaignSyncResponse,
  CampaignSyncQuery,
  PlatformTestRequest,
  PlatformTestResponse,
  TrackingHealthStatus,
} from '@/types/tracking'

/**
 * Tracking API client with methods for all tracking endpoints
 */
export const trackingAPI = {
  /**
   * Track a single conversion event
   * 
   * Supports deduplication, attribution assignment, and multi-platform syncing.
   * Events are automatically sent to configured platforms (GTM, Meta, etc.).
   * 
   * @param eventData - The conversion event data
   * @returns The tracked event response
   */
  async trackEvent(eventData: ConversionEventCreate): Promise<ConversionEventResponse> {
    return fetchAPI('/api/v2/tracking/event', {
      method: 'POST',
      body: JSON.stringify(eventData),
    })
  },

  /**
   * Track multiple conversion events in batch
   * 
   * Useful for offline conversions or bulk imports.
   * Maximum 100 events per batch.
   * 
   * @param events - Array of conversion events (max 100)
   * @returns Array of tracked events or partial success with errors
   */
  async trackEventsBatch(events: ConversionEventCreate[]): Promise<ConversionEventResponse[] | { tracked: ConversionEventResponse[], errors: any[] }> {
    if (events.length > 100) {
      throw new Error('Maximum 100 events per batch')
    }
    
    return fetchAPI('/api/v2/tracking/events/batch', {
      method: 'POST',
      body: JSON.stringify(events),
    })
  },

  /**
   * Get comprehensive conversion analytics
   * 
   * Includes channel performance, top converting pages, and conversion funnel data.
   * Defaults to last 30 days if no date range specified.
   * 
   * @param query - Query parameters for filtering analytics
   * @returns Conversion analytics data
   */
  async getAnalytics(query?: ConversionAnalyticsQuery): Promise<ConversionAnalytics> {
    const params = new URLSearchParams()
    
    if (query?.start_date) params.append('start_date', query.start_date)
    if (query?.end_date) params.append('end_date', query.end_date)
    if (query?.group_by) params.append('group_by', query.group_by)
    
    const queryString = params.toString()
    return fetchAPI(`/api/v2/tracking/analytics${queryString ? `?${queryString}` : ''}`)
  },

  /**
   * Generate attribution report using different models
   * 
   * Supports last-click, first-click, linear, time-decay, position-based, and data-driven models.
   * Shows how conversion credit is distributed across channels.
   * 
   * @param query - Query parameters including attribution model
   * @returns Attribution report
   */
  async getAttributionReport(query?: AttributionReportQuery): Promise<AttributionReport> {
    const params = new URLSearchParams()
    
    if (query?.model) params.append('model', query.model)
    if (query?.start_date) params.append('start_date', query.start_date)
    if (query?.end_date) params.append('end_date', query.end_date)
    
    const queryString = params.toString()
    return fetchAPI(`/api/v2/tracking/attribution${queryString ? `?${queryString}` : ''}`)
  },

  /**
   * Get current tracking configuration
   * 
   * @returns Current tracking configuration or default if not set
   */
  async getConfig(): Promise<TrackingConfigResponse> {
    return fetchAPI('/api/v2/tracking/config')
  },

  /**
   * Update tracking configuration
   * 
   * Configure platform settings, attribution windows, and privacy preferences.
   * 
   * @param config - Configuration updates
   * @returns Updated configuration
   */
  async updateConfig(config: TrackingConfigUpdate): Promise<TrackingConfigResponse> {
    return fetchAPI('/api/v2/tracking/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    })
  },

  /**
   * Test connection to a tracking platform
   * 
   * Validates credentials and configuration without saving.
   * 
   * @param testRequest - Platform and config to test
   * @returns Test results
   */
  async testPlatformConnection(testRequest: PlatformTestRequest): Promise<PlatformTestResponse> {
    return fetchAPI('/api/v2/tracking/config/test', {
      method: 'POST',
      body: JSON.stringify(testRequest),
    })
  },

  /**
   * Conversion Goals Management
   */
  goals: {
    /**
     * Get all conversion goals
     * 
     * @param query - Filter by active status
     * @returns List of conversion goals
     */
    async list(query?: ConversionGoalsQuery): Promise<ConversionGoalResponse[]> {
      const params = new URLSearchParams()
      
      if (query?.is_active !== undefined) {
        params.append('is_active', String(query.is_active))
      }
      
      const queryString = params.toString()
      return fetchAPI(`/api/v2/tracking/goals${queryString ? `?${queryString}` : ''}`)
    },

    /**
     * Create a new conversion goal
     * 
     * @param goalData - Goal configuration
     * @returns Created goal
     */
    async create(goalData: ConversionGoalCreate): Promise<ConversionGoalResponse> {
      return fetchAPI('/api/v2/tracking/goals', {
        method: 'POST',
        body: JSON.stringify(goalData),
      })
    },

    /**
     * Update a conversion goal
     * 
     * @param goalId - Goal ID to update
     * @param goalData - Updated goal configuration
     * @returns Updated goal
     */
    async update(goalId: number, goalData: ConversionGoalCreate): Promise<ConversionGoalResponse> {
      return fetchAPI(`/api/v2/tracking/goals/${goalId}`, {
        method: 'PUT',
        body: JSON.stringify(goalData),
      })
    },

    /**
     * Delete a conversion goal
     * 
     * @param goalId - Goal ID to delete
     * @returns Success message
     */
    async delete(goalId: number): Promise<{ message: string }> {
      return fetchAPI(`/api/v2/tracking/goals/${goalId}`, {
        method: 'DELETE',
      })
    },
  },

  /**
   * Campaign Tracking Management
   */
  campaigns: {
    /**
     * Get campaign tracking data
     * 
     * @param query - Filter parameters
     * @returns List of campaigns
     */
    async list(query?: CampaignTrackingQuery): Promise<CampaignTrackingResponse[]> {
      const params = new URLSearchParams()
      
      if (query?.is_active !== undefined) {
        params.append('is_active', String(query.is_active))
      }
      if (query?.source) params.append('source', query.source)
      if (query?.start_date) params.append('start_date', query.start_date)
      if (query?.end_date) params.append('end_date', query.end_date)
      
      const queryString = params.toString()
      return fetchAPI(`/api/v2/tracking/campaigns${queryString ? `?${queryString}` : ''}`)
    },

    /**
     * Create campaign tracking record
     * 
     * @param campaignData - Campaign configuration
     * @returns Created campaign
     */
    async create(campaignData: CampaignTrackingCreate): Promise<CampaignTrackingResponse> {
      return fetchAPI('/api/v2/tracking/campaigns', {
        method: 'POST',
        body: JSON.stringify(campaignData),
      })
    },

    /**
     * Update campaign performance metrics
     * 
     * @param campaignId - Campaign ID to update
     * @param metrics - Metrics to update
     * @returns Updated campaign
     */
    async updateMetrics(campaignId: number, metrics: CampaignMetricsUpdate): Promise<CampaignTrackingResponse> {
      const params = new URLSearchParams()
      
      if (metrics.impressions !== undefined) {
        params.append('impressions', String(metrics.impressions))
      }
      if (metrics.clicks !== undefined) {
        params.append('clicks', String(metrics.clicks))
      }
      if (metrics.conversions !== undefined) {
        params.append('conversions', String(metrics.conversions))
      }
      if (metrics.conversion_value !== undefined) {
        params.append('conversion_value', String(metrics.conversion_value))
      }
      if (metrics.total_cost !== undefined) {
        params.append('total_cost', String(metrics.total_cost))
      }
      
      return fetchAPI(`/api/v2/tracking/campaigns/${campaignId}/metrics?${params.toString()}`, {
        method: 'PUT',
      })
    },

    /**
     * Sync campaign data from external platforms
     * 
     * This endpoint integrates with Google Ads, Meta Ads, etc.
     * to pull latest campaign performance data.
     * 
     * @param query - Optional source filter
     * @returns Sync results
     */
    async sync(query?: CampaignSyncQuery): Promise<CampaignSyncResponse> {
      const params = new URLSearchParams()
      
      if (query?.source) params.append('source', query.source)
      
      const queryString = params.toString()
      return fetchAPI(`/api/v2/tracking/campaigns/sync${queryString ? `?${queryString}` : ''}`, {
        method: 'POST',
      })
    },
  },

  /**
   * Check health of tracking integrations
   * 
   * @returns Health status and recent activity
   */
  async getHealthStatus(): Promise<TrackingHealthStatus> {
    return fetchAPI('/api/v2/tracking/health')
  },
}

/**
 * Helper function to handle rate limiting with exponential backoff
 * 
 * @param fn - Function to execute
 * @param maxRetries - Maximum number of retries
 * @returns Result of the function
 */
async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      if (error.message?.includes('Rate limit exceeded')) {
        const retryAfterMatch = error.message.match(/try again in (\d+) seconds/)
        const retryAfter = retryAfterMatch ? parseInt(retryAfterMatch[1], 10) : 60
        
        if (i < maxRetries - 1) {
          // Exponential backoff with jitter
          const backoffTime = Math.min(retryAfter * 1000, Math.pow(2, i) * 1000 + Math.random() * 1000)
          await new Promise(resolve => setTimeout(resolve, backoffTime))
          continue
        }
      }
      
      lastError = error
      break
    }
  }
  
  throw lastError || new Error('Unknown error in rate limit retry')
}

/**
 * Track event with automatic retry on rate limit
 * 
 * @param eventData - Event to track
 * @returns Tracked event
 */
export async function trackEventWithRetry(eventData: ConversionEventCreate): Promise<ConversionEventResponse> {
  return withRateLimitRetry(() => trackingAPI.trackEvent(eventData))
}

/**
 * Utility function to generate a unique event ID
 * 
 * @param eventName - Base event name
 * @returns Unique event ID
 */
export function generateEventId(eventName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)
  return `${eventName}_${timestamp}_${random}`
}

/**
 * Utility function to extract UTM parameters from URL
 * 
 * @param url - URL to parse (defaults to current URL)
 * @returns UTM parameters
 */
export function extractUTMParams(url?: string): {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
} {
  const searchParams = new URLSearchParams(url || window.location.search)
  
  return {
    utm_source: searchParams.get('utm_source') || undefined,
    utm_medium: searchParams.get('utm_medium') || undefined,
    utm_campaign: searchParams.get('utm_campaign') || undefined,
    utm_term: searchParams.get('utm_term') || undefined,
    utm_content: searchParams.get('utm_content') || undefined,
  }
}

/**
 * Utility function to get or create a client ID for tracking
 * 
 * @returns Client ID
 */
export function getClientId(): string {
  const storageKey = '_ga_client_id'
  let clientId = localStorage.getItem(storageKey)
  
  if (!clientId) {
    // Generate GA-compatible client ID
    clientId = `${Date.now()}.${Math.random().toString(36).substring(2, 11)}`
    localStorage.setItem(storageKey, clientId)
  }
  
  return clientId
}

/**
 * Utility function to get or create a session ID
 * 
 * @param sessionDurationMinutes - Session duration (default 30 minutes)
 * @returns Session ID
 */
export function getSessionId(sessionDurationMinutes: number = 30): string {
  const storageKey = '_tracking_session'
  const now = Date.now()
  
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const session = JSON.parse(stored)
      if (session.expires > now) {
        // Extend session
        session.expires = now + (sessionDurationMinutes * 60 * 1000)
        localStorage.setItem(storageKey, JSON.stringify(session))
        return session.id
      }
    }
  } catch (e) {
    // Invalid stored data
  }
  
  // Create new session
  const sessionId = `${now}.${Math.random().toString(36).substring(2, 11)}`
  const session = {
    id: sessionId,
    expires: now + (sessionDurationMinutes * 60 * 1000),
  }
  
  localStorage.setItem(storageKey, JSON.stringify(session))
  return sessionId
}

// Export everything for convenience
export default trackingAPI