import { GOOGLE_CALENDAR_CONFIG, GOOGLE_CALENDAR_ERRORS } from './config'
import {
  GoogleCalendarEvent,
  GoogleCalendarList,
  GoogleCalendar,
  GoogleAuthTokens
} from './types'

// Rate limiting implementation
class RateLimiter {
  private requests: number[] = []
  private dailyRequests = 0
  private lastResetDate: string

  constructor() {
    this.lastResetDate = new Date().toDateString()
  }

  async checkLimit(): Promise<void> {
    const now = Date.now()
    const currentDate = new Date().toDateString()

    // Reset daily counter if new day
    if (currentDate !== this.lastResetDate) {
      this.dailyRequests = 0
      this.lastResetDate = currentDate
    }

    // Remove requests older than 1 minute
    this.requests = this.requests.filter(time => now - time < 60000)

    // Check rate limits
    const requestsLastSecond = this.requests.filter(time => now - time < 1000).length
    const requestsLastMinute = this.requests.length

    if (requestsLastSecond >= GOOGLE_CALENDAR_CONFIG.rateLimitPerSecond) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    } else if (requestsLastMinute >= GOOGLE_CALENDAR_CONFIG.rateLimitPerMinute) {
      await new Promise(resolve => setTimeout(resolve, 60000))
    } else if (this.dailyRequests >= GOOGLE_CALENDAR_CONFIG.rateLimitPerDay) {
      throw new Error(GOOGLE_CALENDAR_ERRORS.QUOTA_EXCEEDED)
    }

    this.requests.push(now)
    this.dailyRequests++
  }
}

export class GoogleCalendarClient {
  private rateLimiter = new RateLimiter()
  private accessToken: string | null = null
  private tokenExpiry: number | null = null

  constructor() {
    this.loadTokensFromStorage()
  }

  // Token management
  private loadTokensFromStorage() {
    if (typeof window === 'undefined') return

    const token = localStorage.getItem(GOOGLE_CALENDAR_CONFIG.storageKeys.accessToken)
    const expiry = localStorage.getItem(GOOGLE_CALENDAR_CONFIG.storageKeys.tokenExpiry)

    if (token && expiry) {
      this.accessToken = token
      this.tokenExpiry = parseInt(expiry)
    }
  }

  private saveTokensToStorage(tokens: GoogleAuthTokens) {
    if (typeof window === 'undefined') return

    localStorage.setItem(GOOGLE_CALENDAR_CONFIG.storageKeys.accessToken, tokens.accessToken)
    localStorage.setItem(GOOGLE_CALENDAR_CONFIG.storageKeys.tokenExpiry, tokens.expiryDate.toString())

    if (tokens.refreshToken) {
      localStorage.setItem(GOOGLE_CALENDAR_CONFIG.storageKeys.refreshToken, tokens.refreshToken)
    }

    this.accessToken = tokens.accessToken
    this.tokenExpiry = tokens.expiryDate
  }

  private clearTokensFromStorage() {
    if (typeof window === 'undefined') return

    localStorage.removeItem(GOOGLE_CALENDAR_CONFIG.storageKeys.accessToken)
    localStorage.removeItem(GOOGLE_CALENDAR_CONFIG.storageKeys.refreshToken)
    localStorage.removeItem(GOOGLE_CALENDAR_CONFIG.storageKeys.tokenExpiry)

    this.accessToken = null
    this.tokenExpiry = null
  }

  // Auth methods
  async authenticate(): Promise<void> {
    const authUrl = new URL(GOOGLE_CALENDAR_CONFIG.authEndpoint)
    authUrl.searchParams.append('client_id', GOOGLE_CALENDAR_CONFIG.clientId)
    authUrl.searchParams.append('redirect_uri', GOOGLE_CALENDAR_CONFIG.redirectUri)
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('scope', GOOGLE_CALENDAR_CONFIG.scope)
    authUrl.searchParams.append('access_type', 'offline')
    authUrl.searchParams.append('prompt', 'consent')

    window.location.href = authUrl.toString()
  }

  async handleAuthCallback(code: string): Promise<GoogleAuthTokens> {
    const response = await fetch('/api/auth/google/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })

    if (!response.ok) {
      throw new Error(GOOGLE_CALENDAR_ERRORS.AUTH_FAILED)
    }

    const tokens = await response.json()
    this.saveTokensToStorage(tokens)
    return tokens
  }

  async refreshAccessToken(): Promise<void> {
    const refreshToken = localStorage.getItem(GOOGLE_CALENDAR_CONFIG.storageKeys.refreshToken)
    if (!refreshToken) {
      throw new Error(GOOGLE_CALENDAR_ERRORS.TOKEN_EXPIRED)
    }

    const response = await fetch('/api/auth/google/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    })

    if (!response.ok) {
      this.clearTokensFromStorage()
      throw new Error(GOOGLE_CALENDAR_ERRORS.TOKEN_EXPIRED)
    }

    const tokens = await response.json()
    this.saveTokensToStorage(tokens)
  }

  async signOut(): Promise<void> {
    this.clearTokensFromStorage()
  }

  // API request helper
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Check if token is expired
    if (this.tokenExpiry && Date.now() >= this.tokenExpiry) {
      await this.refreshAccessToken()
    }

    if (!this.accessToken) {
      throw new Error(GOOGLE_CALENDAR_ERRORS.AUTH_FAILED)
    }

    // Rate limiting
    await this.rateLimiter.checkLimit()

    const url = endpoint.startsWith('http') ? endpoint : `${GOOGLE_CALENDAR_CONFIG.apiBaseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (response.status === 401) {
      // Try refreshing token once
      await this.refreshAccessToken()

      // Retry request
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      })

      if (!retryResponse.ok) {
        throw new Error(GOOGLE_CALENDAR_ERRORS.AUTH_FAILED)
      }

      return retryResponse.json()
    }

    if (response.status === 429) {
      throw new Error(GOOGLE_CALENDAR_ERRORS.RATE_LIMITED)
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `API request failed: ${response.statusText}`)
    }

    return response.json()
  }

  // Calendar methods
  async listCalendars(): Promise<GoogleCalendar[]> {
    const data = await this.apiRequest<GoogleCalendarList>('/users/me/calendarList')
    return data.items || []
  }

  async getCalendar(calendarId: string): Promise<GoogleCalendar> {
    return this.apiRequest<GoogleCalendar>(`/calendars/${encodeURIComponent(calendarId)}`)
  }

  // Event methods
  async listEvents(
    calendarId: string,
    params?: {
      timeMin?: string
      timeMax?: string
      maxResults?: number
      orderBy?: string
      pageToken?: string
      singleEvents?: boolean
      q?: string
    }
  ): Promise<{ events: GoogleCalendarEvent[]; nextPageToken?: string }> {
    const searchParams = new URLSearchParams()

    if (params?.timeMin) searchParams.append('timeMin', params.timeMin)
    if (params?.timeMax) searchParams.append('timeMax', params.timeMax)
    searchParams.append('maxResults', (params?.maxResults || GOOGLE_CALENDAR_CONFIG.maxResults).toString())
    searchParams.append('orderBy', params?.orderBy || GOOGLE_CALENDAR_CONFIG.orderBy)
    searchParams.append('singleEvents', (params?.singleEvents ?? GOOGLE_CALENDAR_CONFIG.singleEvents).toString())
    if (params?.pageToken) searchParams.append('pageToken', params.pageToken)
    if (params?.q) searchParams.append('q', params.q)

    const data = await this.apiRequest<{
      items?: GoogleCalendarEvent[]
      nextPageToken?: string
    }>(`/calendars/${encodeURIComponent(calendarId)}/events?${searchParams}`)

    return {
      events: data.items || [],
      nextPageToken: data.nextPageToken
    }
  }

  async getEvent(calendarId: string, eventId: string): Promise<GoogleCalendarEvent> {
    return this.apiRequest<GoogleCalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
    )
  }

  async createEvent(calendarId: string, event: GoogleCalendarEvent): Promise<GoogleCalendarEvent> {
    return this.apiRequest<GoogleCalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        body: JSON.stringify(event)
      }
    )
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    event: GoogleCalendarEvent
  ): Promise<GoogleCalendarEvent> {
    return this.apiRequest<GoogleCalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(event)
      }
    )
  }

  async patchEvent(
    calendarId: string,
    eventId: string,
    updates: Partial<GoogleCalendarEvent>
  ): Promise<GoogleCalendarEvent> {
    return this.apiRequest<GoogleCalendarEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }
    )
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await this.apiRequest(
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE' }
    )
  }

  // Batch operations
  async batchCreateEvents(
    calendarId: string,
    events: GoogleCalendarEvent[]
  ): Promise<GoogleCalendarEvent[]> {
    const results: GoogleCalendarEvent[] = []

    for (let i = 0; i < events.length; i += GOOGLE_CALENDAR_CONFIG.batchSize) {
      const batch = events.slice(i, i + GOOGLE_CALENDAR_CONFIG.batchSize)
      const promises = batch.map(event => this.createEvent(calendarId, event))
      const batchResults = await Promise.allSettled(promises)

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          console.error(`Failed to create event ${i + index}:`, result.reason)
        }
      })
    }

    return results
  }

  // Watch/webhook methods for real-time sync
  async watchCalendar(calendarId: string, syncToken?: string): Promise<{
    resourceId: string
    expiration: number
  }> {
    const watchRequest = {
      id: `watch-${calendarId}-${Date.now()}`,
      type: 'web_hook',
      address: GOOGLE_CALENDAR_CONFIG.webhookUrl,
      expiration: Date.now() + (GOOGLE_CALENDAR_CONFIG.webhookExpireHours * 60 * 60 * 1000),
      params: {
        ttl: (GOOGLE_CALENDAR_CONFIG.webhookExpireHours * 60 * 60).toString()
      }
    }

    const response = await this.apiRequest<{
      resourceId: string
      expiration: string
    }>(`/calendars/${encodeURIComponent(calendarId)}/events/watch`, {
      method: 'POST',
      body: JSON.stringify(watchRequest)
    })

    return {
      resourceId: response.resourceId,
      expiration: parseInt(response.expiration)
    }
  }

  async stopWatching(calendarId: string, resourceId: string): Promise<void> {
    await this.apiRequest('/channels/stop', {
      method: 'POST',
      body: JSON.stringify({
        id: resourceId,
        resourceId: resourceId
      })
    })
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.accessToken && (!this.tokenExpiry || Date.now() < this.tokenExpiry)
  }

  getAuthStatus(): {
    isAuthenticated: boolean
    expiresAt?: Date
  } {
    return {
      isAuthenticated: this.isAuthenticated(),
      expiresAt: this.tokenExpiry ? new Date(this.tokenExpiry) : undefined
    }
  }
}

// Singleton instance
export const googleCalendarClient = new GoogleCalendarClient()
