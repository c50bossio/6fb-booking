/**
 * TypeScript interfaces and types for integration management
 * Matches backend integration schemas
 */

export enum IntegrationType {
  GOOGLE_CALENDAR = 'google_calendar',
  STRIPE = 'stripe',
  SENDGRID = 'sendgrid',
  TWILIO = 'twilio',
  SQUARE = 'square',
  ACUITY = 'acuity',
  BOOKSY = 'booksy',
  CUSTOM = 'custom'
}

export enum IntegrationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  PENDING = 'pending',
  EXPIRED = 'expired'
}

export interface IntegrationBase {
  name: string
  integration_type: IntegrationType
  config?: Record<string, any>
  is_active: boolean
}

export interface IntegrationCreate extends IntegrationBase {
  api_key?: string
  api_secret?: string
  webhook_url?: string
}

export interface IntegrationUpdate {
  name?: string
  config?: Record<string, any>
  is_active?: boolean
  webhook_url?: string
}

export interface IntegrationResponse extends IntegrationBase {
  id: number
  user_id: number
  status: IntegrationStatus
  scopes: string[]
  webhook_url?: string
  last_sync_at?: string
  last_error?: string
  error_count: number
  created_at: string
  updated_at: string
  is_connected: boolean
}

export interface OAuthInitiateRequest {
  integration_type: IntegrationType
  redirect_uri?: string
  scopes?: string[]
  state?: string
}

export interface OAuthCallbackRequest {
  code: string
  state?: string
  error?: string
  error_description?: string
}

export interface OAuthCallbackResponse {
  success: boolean
  integration_id?: number
  message: string
  redirect_url?: string
}

export interface IntegrationHealthCheck {
  integration_id: number
  integration_type: IntegrationType
  name: string
  status: IntegrationStatus
  healthy: boolean
  last_check: string
  details: Record<string, any>
  error?: string
}

export interface IntegrationHealthSummary {
  total_integrations: number
  healthy_count: number
  error_count: number
  inactive_count: number
  integrations: IntegrationHealthCheck[]
  checked_at: string
}

export interface IntegrationDisconnectResponse {
  success: boolean
  message: string
  integration_id: number
}

export interface IntegrationTokenRefreshRequest {
  integration_id: number
  force?: boolean
}

export interface IntegrationTokenRefreshResponse {
  success: boolean
  message: string
  expires_at?: string
}

export interface IntegrationSyncRequest {
  integration_id: number
  sync_type?: string
  options?: Record<string, any>
}

export interface IntegrationSyncResponse {
  success: boolean
  message: string
  synced_at: string
  items_synced?: number
  errors: string[]
}

// Integration metadata for UI display
export interface IntegrationMetadata {
  type: IntegrationType
  name: string
  displayName: string
  description: string
  icon: string
  color: string
  requiresOAuth: boolean
  requiredFields?: string[]
  features: string[]
  helpUrl?: string
}

// Map of integration metadata
export const INTEGRATION_METADATA: Record<IntegrationType, IntegrationMetadata> = {
  [IntegrationType.GOOGLE_CALENDAR]: {
    type: IntegrationType.GOOGLE_CALENDAR,
    name: 'google_calendar',
    displayName: 'Google Calendar',
    description: 'Sync appointments with Google Calendar for seamless scheduling',
    icon: 'CalendarIcon',
    color: '#4285F4',
    requiresOAuth: true,
    features: [
      'Two-way appointment sync',
      'Automatic availability updates',
      'Event reminders',
      'Multi-calendar support'
    ],
    helpUrl: 'https://support.bookedbarber.com/integrations/google-calendar'
  },
  [IntegrationType.STRIPE]: {
    type: IntegrationType.STRIPE,
    name: 'stripe',
    displayName: 'Stripe',
    description: 'Process payments and manage payouts with Stripe',
    icon: 'CreditCardIcon',
    color: '#635BFF',
    requiresOAuth: true,
    features: [
      'Secure payment processing',
      'Automatic payouts',
      'Refund management',
      'Payment analytics'
    ],
    helpUrl: 'https://support.bookedbarber.com/integrations/stripe'
  },
  [IntegrationType.SENDGRID]: {
    type: IntegrationType.SENDGRID,
    name: 'sendgrid',
    displayName: 'SendGrid',
    description: 'Send transactional and marketing emails',
    icon: 'EnvelopeIcon',
    color: '#1A82E2',
    requiresOAuth: false,
    requiredFields: ['api_key'],
    features: [
      'Automated appointment reminders',
      'Marketing campaigns',
      'Email analytics',
      'Custom templates'
    ],
    helpUrl: 'https://support.bookedbarber.com/integrations/sendgrid'
  },
  [IntegrationType.TWILIO]: {
    type: IntegrationType.TWILIO,
    name: 'twilio',
    displayName: 'Twilio',
    description: 'Send SMS notifications and reminders',
    icon: 'PhoneIcon',
    color: '#F22F46',
    requiresOAuth: false,
    requiredFields: ['api_key', 'api_secret'],
    features: [
      'SMS appointment reminders',
      'Two-way messaging',
      'Automated confirmations',
      'Message analytics'
    ],
    helpUrl: 'https://support.bookedbarber.com/integrations/twilio'
  },
  [IntegrationType.SQUARE]: {
    type: IntegrationType.SQUARE,
    name: 'square',
    displayName: 'Square',
    description: 'Alternative payment processor for Square users',
    icon: 'CreditCardIcon',
    color: '#00D632',
    requiresOAuth: true,
    features: [
      'Payment processing',
      'Inventory sync',
      'Customer management',
      'Sales reporting'
    ],
    helpUrl: 'https://support.bookedbarber.com/integrations/square'
  },
  [IntegrationType.ACUITY]: {
    type: IntegrationType.ACUITY,
    name: 'acuity',
    displayName: 'Acuity Scheduling',
    description: 'Import data from Acuity Scheduling',
    icon: 'CalendarDaysIcon',
    color: '#FF5A5F',
    requiresOAuth: false,
    requiredFields: ['api_key'],
    features: [
      'Client import',
      'Appointment history',
      'Service migration',
      'Data sync'
    ],
    helpUrl: 'https://support.bookedbarber.com/integrations/acuity'
  },
  [IntegrationType.BOOKSY]: {
    type: IntegrationType.BOOKSY,
    name: 'booksy',
    displayName: 'Booksy',
    description: 'Import data from Booksy',
    icon: 'CalendarDaysIcon',
    color: '#00B4D8',
    requiresOAuth: false,
    requiredFields: ['api_key'],
    features: [
      'Client import',
      'Service import',
      'Appointment history',
      'Reviews sync'
    ],
    helpUrl: 'https://support.bookedbarber.com/integrations/booksy'
  },
  [IntegrationType.CUSTOM]: {
    type: IntegrationType.CUSTOM,
    name: 'custom',
    displayName: 'Custom Integration',
    description: 'Connect with custom webhooks and APIs',
    icon: 'CogIcon',
    color: '#6B7280',
    requiresOAuth: false,
    requiredFields: ['webhook_url'],
    features: [
      'Custom webhooks',
      'API endpoints',
      'Flexible configuration',
      'Event triggers'
    ],
    helpUrl: 'https://support.bookedbarber.com/integrations/custom'
  }
}