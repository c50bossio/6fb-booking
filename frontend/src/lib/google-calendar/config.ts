// Google Calendar API Configuration
export const GOOGLE_CALENDAR_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '',
  discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
  scope: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly'
  ].join(' '),
  // OAuth endpoints
  authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  redirectUri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
  // API settings
  apiBaseUrl: 'https://www.googleapis.com/calendar/v3',
  maxResults: 2500, // Maximum events to fetch per request
  orderBy: 'startTime',
  singleEvents: true,
  // Sync settings
  syncIntervalMinutes: 5,
  conflictResolutionStrategy: 'local-priority' as 'local-priority' | 'google-priority' | 'newest-wins' | 'manual',
  batchSize: 50, // Number of events to sync in one batch
  retryAttempts: 3,
  retryDelayMs: 1000,
  // Rate limiting
  rateLimitPerSecond: 10,
  rateLimitPerMinute: 300,
  rateLimitPerDay: 50000,
  // Webhook settings (for real-time sync)
  webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/google-calendar`,
  webhookExpireHours: 24,
  // Storage keys
  storageKeys: {
    accessToken: 'google_calendar_access_token',
    refreshToken: 'google_calendar_refresh_token',
    tokenExpiry: 'google_calendar_token_expiry',
    syncedCalendars: 'google_calendar_synced_calendars',
    lastSyncTime: 'google_calendar_last_sync',
    syncQueue: 'google_calendar_sync_queue'
  }
}

// Google Calendar event colors
export const GOOGLE_CALENDAR_COLORS = {
  1: '#7986cb', // Lavender
  2: '#33b679', // Sage
  3: '#8e24aa', // Grape
  4: '#e67c73', // Flamingo
  5: '#f6bf26', // Banana
  6: '#f4511e', // Tangerine
  7: '#039be5', // Peacock
  8: '#616161', // Graphite
  9: '#3f51b5', // Blueberry
  10: '#0b8043', // Basil
  11: '#d50000' // Tomato
}

// Event status mapping
export const EVENT_STATUS_MAP = {
  // App to Google
  'confirmed': 'confirmed',
  'pending': 'tentative',
  'completed': 'confirmed',
  'cancelled': 'cancelled',
  'no_show': 'cancelled',
  // Google to App
  'confirmed': 'confirmed',
  'tentative': 'pending',
  'cancelled': 'cancelled'
} as const

// Error codes
export const GOOGLE_CALENDAR_ERRORS = {
  AUTH_FAILED: 'GCAL_AUTH_FAILED',
  TOKEN_EXPIRED: 'GCAL_TOKEN_EXPIRED',
  RATE_LIMITED: 'GCAL_RATE_LIMITED',
  QUOTA_EXCEEDED: 'GCAL_QUOTA_EXCEEDED',
  CALENDAR_NOT_FOUND: 'GCAL_CALENDAR_NOT_FOUND',
  EVENT_NOT_FOUND: 'GCAL_EVENT_NOT_FOUND',
  SYNC_CONFLICT: 'GCAL_SYNC_CONFLICT',
  NETWORK_ERROR: 'GCAL_NETWORK_ERROR',
  PERMISSION_DENIED: 'GCAL_PERMISSION_DENIED'
} as const

export type GoogleCalendarError = typeof GOOGLE_CALENDAR_ERRORS[keyof typeof GOOGLE_CALENDAR_ERRORS]
