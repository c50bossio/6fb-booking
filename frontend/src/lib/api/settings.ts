/**
 * Settings API Client
 * Comprehensive settings management for enterprise booking calendar
 */

import { apiClient } from './client'

// Types and interfaces
export interface SettingsTemplate {
  id: number
  name: string
  description?: string
  category: string
  template_data: Record<string, any>
  is_system_template: boolean
  usage_count: number
  version: string
}

export interface SettingsConfig {
  id: number
  scope: SettingsScope
  scope_id?: number
  category: SettingsCategory
  setting_key: string
  setting_name: string
  description?: string
  setting_value: any
  default_value?: any
  data_type: string
  ui_component?: string
  ui_group?: string
  display_order: number
  is_advanced: boolean
  is_user_configurable: boolean
}

export interface UserPreferences {
  user_id: number
  theme_mode: ThemeMode
  theme_color: string
  font_size: FontSize
  default_view: CalendarView
  show_weekends: boolean
  time_format: TimeFormat
  date_format: DateFormat
  timezone: string
  high_contrast_mode: boolean
  desktop_notifications: boolean
  keyboard_shortcuts: Record<string, string>
  sidebar_collapsed: boolean
  panel_layout: PanelLayout
  enable_animations: boolean
  reduce_motion: boolean
}

export interface LocationSettings {
  location_id: number
  business_hours: BusinessHours
  booking_window: BookingWindow
  default_slot_duration: number
  cancellation_policy: CancellationPolicy
  payment_configuration: PaymentConfiguration
  automation_settings: AutomationSettings
  staff_permissions: StaffPermissions
  client_settings: ClientSettings
  communication_preferences: CommunicationPreferences
}

export interface NotificationSettings {
  scope: SettingsScope
  scope_id?: number
  appointment_reminders: NotificationConfig
  booking_confirmations: NotificationConfig
  cancellation_notifications: NotificationConfig
  waitlist_notifications: NotificationConfig
  staff_notifications: StaffNotificationConfig
  quiet_hours: QuietHoursConfig
  rate_limiting: RateLimitConfig
}

export interface AccessibilitySettings {
  user_id: number
  font_settings: FontSettings
  contrast_settings: ContrastSettings
  interaction_settings: InteractionSettings
  cognitive_settings: CognitiveSettings
  keyboard_settings: KeyboardSettings
  screen_reader_settings: ScreenReaderSettings
  audio_settings: AudioSettings
  language_settings: LanguageSettings
}

export interface IntegrationSettings {
  scope: SettingsScope
  scope_id?: number
  google_calendar: GoogleCalendarConfig
  outlook_calendar: OutlookCalendarConfig
  stripe_settings: StripeConfig
  square_settings: SquareConfig
  twilio_settings: TwilioConfig
  sendgrid_settings: SendGridConfig
  webhooks: WebhookConfig
  api_settings: ApiConfig
}

// Enums
export enum SettingsScope {
  GLOBAL = 'global',
  LOCATION = 'location',
  USER = 'user',
  BARBER = 'barber'
}

export enum SettingsCategory {
  USER_EXPERIENCE = 'user_experience',
  BUSINESS_CONFIG = 'business_config',
  DISPLAY_OPTIONS = 'display_options',
  BOOKING_RULES = 'booking_rules',
  INTEGRATION = 'integration',
  ACCESSIBILITY = 'accessibility',
  ADVANCED = 'advanced',
  SECURITY = 'security',
  NOTIFICATION = 'notification'
}

export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
  HIGH_CONTRAST = 'high_contrast'
}

export enum CalendarView {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  AGENDA = 'agenda'
}

export enum TimeFormat {
  TWELVE_HOUR = '12h',
  TWENTY_FOUR_HOUR = '24h'
}

export enum DateFormat {
  US = 'MM/DD/YYYY',
  EUROPEAN = 'DD/MM/YYYY',
  ISO = 'YYYY-MM-DD',
  RELATIVE = 'relative'
}

export enum FontSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  X_LARGE = 'x-large',
  XX_LARGE = 'xx-large'
}

// Supporting interfaces
export interface BusinessHours {
  [day: string]: {
    open: string | null
    close: string | null
    breaks: Array<{ start: string; end: string }>
  }
}

export interface BookingWindow {
  min_advance_hours: number
  max_advance_days: number
  same_day_booking: boolean
  booking_cutoff_time: string
}

export interface CancellationPolicy {
  cancellation_window_hours: number
  reschedule_window_hours: number
  cancellation_fee_type: 'percentage' | 'fixed' | 'none'
  cancellation_fee_amount: number
  no_show_fee: number
  allow_online_cancellation: boolean
}

export interface PaymentConfiguration {
  require_deposit: boolean
  deposit_type: 'percentage' | 'fixed'
  deposit_amount: number
  payment_methods: string[]
  tip_options: number[]
  currency: string
}

export interface AutomationSettings {
  auto_confirm_bookings: boolean
  auto_block_past_slots: boolean
  auto_release_expired_holds: boolean
  hold_duration_minutes: number
  waitlist_auto_notify: boolean
}

export interface StaffPermissions {
  can_view_all_appointments: boolean
  can_modify_others_appointments: boolean
  can_access_reports: boolean
  can_manage_clients: boolean
}

export interface ClientSettings {
  require_phone: boolean
  require_email: boolean
  allow_guest_booking: boolean
  auto_create_accounts: boolean
  client_notes_visible: boolean
}

export interface CommunicationPreferences {
  send_confirmation_emails: boolean
  send_reminder_emails: boolean
  send_follow_up_emails: boolean
  reminder_timing_hours: number[]
  email_templates: Record<string, any>
}

export interface PanelLayout {
  left: boolean
  right: boolean
  bottom: boolean
}

export interface NotificationConfig {
  enabled: boolean
  methods: string[]
  timing?: number[]
  templates?: Record<string, any>
}

export interface StaffNotificationConfig {
  new_bookings: boolean
  cancellations: boolean
  schedule_changes: boolean
  daily_schedule: boolean
  methods: string[]
}

export interface QuietHoursConfig {
  enabled: boolean
  start_time: string
  end_time: string
  timezone: string
}

export interface RateLimitConfig {
  max_emails_per_hour: number
  max_sms_per_hour: number
  cooldown_between_same_type: number
}

export interface FontSettings {
  font_size: FontSize
  font_family: string
  line_height: string
  letter_spacing: string
}

export interface ContrastSettings {
  high_contrast: boolean
  contrast_ratio: string
  color_blind_friendly: boolean
  color_blind_type?: string
}

export interface InteractionSettings {
  larger_click_targets: boolean
  sticky_hover: boolean
  click_delay: number
  double_click_tolerance: number
}

export interface CognitiveSettings {
  reduce_motion: boolean
  disable_auto_play: boolean
  simple_language: boolean
  content_warnings: boolean
  focus_indicators: string
}

export interface KeyboardSettings {
  keyboard_only_navigation: boolean
  skip_links: boolean
  tab_order_optimization: boolean
  keyboard_shortcuts_enabled: boolean
  custom_shortcuts: Record<string, string>
}

export interface ScreenReaderSettings {
  optimized_for_screen_reader: boolean
  verbose_descriptions: boolean
  skip_decorative_images: boolean
  live_region_announcements: boolean
  preferred_screen_reader?: string
}

export interface AudioSettings {
  sound_notifications: boolean
  audio_descriptions: boolean
  sound_volume: number
  audio_cues: boolean
}

export interface LanguageSettings {
  language: string
  region: string
  date_format: string
  number_format: string
  right_to_left: boolean
}

export interface GoogleCalendarConfig {
  enabled: boolean
  client_id?: string
  calendar_id: string
  sync_direction: string
  sync_frequency: number
  event_visibility: string
}

export interface OutlookCalendarConfig {
  enabled: boolean
  client_id?: string
  calendar_id: string
  sync_direction: string
  sync_frequency: number
}

export interface StripeConfig {
  enabled: boolean
  publishable_key?: string
  connect_account_id?: string
  automatic_payouts: boolean
  capture_method: string
}

export interface SquareConfig {
  enabled: boolean
  application_id?: string
  location_id?: string
  environment: string
}

export interface TwilioConfig {
  enabled: boolean
  account_sid?: string
  phone_number?: string
  messaging_service_sid?: string
}

export interface SendGridConfig {
  enabled: boolean
  from_email?: string
  from_name?: string
  template_ids: Record<string, string>
}

export interface WebhookConfig {
  appointment_created: string[]
  appointment_updated: string[]
  appointment_cancelled: string[]
  payment_completed: string[]
  client_registered: string[]
}

export interface ApiConfig {
  public_api_enabled: boolean
  rate_limit: number
  allowed_origins: string[]
}

// Update requests
export interface SettingsUpdateRequest {
  setting_key: string
  setting_value: any
  change_reason?: string
}

export interface BulkSettingsUpdateRequest {
  updates: SettingsUpdateRequest[]
  apply_template?: string
}

export interface UserPreferencesUpdateRequest {
  theme_mode?: ThemeMode
  theme_color?: string
  font_size?: FontSize
  default_view?: CalendarView
  show_weekends?: boolean
  time_format?: TimeFormat
  date_format?: DateFormat
  timezone?: string
  high_contrast_mode?: boolean
  desktop_notifications?: boolean
  keyboard_shortcuts?: Record<string, string>
  sidebar_collapsed?: boolean
  panel_layout?: PanelLayout
  enable_animations?: boolean
  reduce_motion?: boolean
}

// API functions
export const settingsApi = {
  // Templates
  async getTemplates(category?: string): Promise<SettingsTemplate[]> {
    const params = new URLSearchParams()
    if (category) params.append('category', category)
    
    const response = await apiClient.get(`/settings/templates?${params}`)
    return response.data
  },

  async applyTemplate(
    templateId: number,
    scope: SettingsScope,
    scopeId?: number
  ): Promise<{ message: string; settings_updated: number }> {
    const response = await apiClient.post(`/settings/templates/${templateId}/apply`, {
      scope,
      scope_id: scopeId
    })
    return response.data
  },

  // Settings Configuration
  async getConfig(
    scope: SettingsScope,
    scopeId?: number,
    category?: SettingsCategory,
    includeAdvanced = false
  ): Promise<SettingsConfig[]> {
    const params = new URLSearchParams({
      scope,
      include_advanced: includeAdvanced.toString()
    })
    
    if (scopeId !== undefined) params.append('scope_id', scopeId.toString())
    if (category) params.append('category', category)
    
    const response = await apiClient.get(`/settings/config?${params}`)
    return response.data
  },

  async updateConfig(
    scope: SettingsScope,
    updates: BulkSettingsUpdateRequest,
    scopeId?: number
  ): Promise<{ updated_count: number; errors: string[] }> {
    const params = new URLSearchParams({ scope })
    if (scopeId !== undefined) params.append('scope_id', scopeId.toString())
    
    const response = await apiClient.put(`/settings/config?${params}`, updates)
    return response.data
  },

  // User Preferences
  async getUserPreferences(): Promise<UserPreferences> {
    const response = await apiClient.get('/settings/preferences')
    return response.data
  },

  async updateUserPreferences(
    updates: UserPreferencesUpdateRequest
  ): Promise<{ message: string }> {
    const response = await apiClient.put('/settings/preferences', updates)
    return response.data
  },

  // Location Settings
  async getLocationSettings(locationId: number): Promise<LocationSettings> {
    const response = await apiClient.get(`/settings/location/${locationId}`)
    return response.data
  },

  async updateLocationSettings(
    locationId: number,
    settings: Partial<LocationSettings>
  ): Promise<{ message: string }> {
    const response = await apiClient.put(`/settings/location/${locationId}`, settings)
    return response.data
  },

  // Notification Settings
  async getNotificationSettings(
    scope: SettingsScope,
    scopeId?: number
  ): Promise<NotificationSettings> {
    const params = new URLSearchParams({ scope })
    if (scopeId !== undefined) params.append('scope_id', scopeId.toString())
    
    const response = await apiClient.get(`/settings/notifications?${params}`)
    return response.data
  },

  async updateNotificationSettings(
    scope: SettingsScope,
    settings: Partial<NotificationSettings>,
    scopeId?: number
  ): Promise<{ message: string }> {
    const params = new URLSearchParams({ scope })
    if (scopeId !== undefined) params.append('scope_id', scopeId.toString())
    
    const response = await apiClient.put(`/settings/notifications?${params}`, settings)
    return response.data
  },

  // Accessibility Settings
  async getAccessibilitySettings(): Promise<AccessibilitySettings> {
    const response = await apiClient.get('/settings/accessibility')
    return response.data
  },

  async updateAccessibilitySettings(
    settings: Partial<AccessibilitySettings>
  ): Promise<{ message: string }> {
    const response = await apiClient.put('/settings/accessibility', settings)
    return response.data
  },

  // Integration Settings
  async getIntegrationSettings(
    scope: SettingsScope,
    scopeId?: number,
    includeSensitive = false
  ): Promise<IntegrationSettings> {
    const params = new URLSearchParams({ 
      scope,
      include_sensitive: includeSensitive.toString()
    })
    if (scopeId !== undefined) params.append('scope_id', scopeId.toString())
    
    const response = await apiClient.get(`/settings/integrations?${params}`)
    return response.data
  },

  async updateIntegrationSettings(
    scope: SettingsScope,
    settings: Partial<IntegrationSettings>,
    scopeId?: number
  ): Promise<{ message: string }> {
    const params = new URLSearchParams({ scope })
    if (scopeId !== undefined) params.append('scope_id', scopeId.toString())
    
    const response = await apiClient.put(`/settings/integrations?${params}`, settings)
    return response.data
  },

  // Settings History
  async getHistory(
    settingId?: number,
    scope?: SettingsScope,
    scopeId?: number,
    limit = 50
  ): Promise<any[]> {
    const params = new URLSearchParams({ limit: limit.toString() })
    
    if (settingId) params.append('setting_id', settingId.toString())
    if (scope) params.append('scope', scope)
    if (scopeId !== undefined) params.append('scope_id', scopeId.toString())
    
    const response = await apiClient.get(`/settings/history?${params}`)
    return response.data
  },

  // Export/Import
  async exportSettings(
    scope: SettingsScope,
    scopeId?: number
  ): Promise<any> {
    const params = new URLSearchParams({ scope })
    if (scopeId !== undefined) params.append('scope_id', scopeId.toString())
    
    const response = await apiClient.get(`/settings/export?${params}`)
    return response.data
  },

  async importSettings(
    importData: any,
    overwriteExisting = false
  ): Promise<{ imported_count: number; errors: string[] }> {
    const params = new URLSearchParams({
      overwrite_existing: overwriteExisting.toString()
    })
    
    const response = await apiClient.post(`/settings/import?${params}`, importData)
    return response.data
  },

  // Initialize
  async initializeDefaultSettings(
    scope: SettingsScope,
    scopeId?: number
  ): Promise<{ message: string }> {
    const params = new URLSearchParams({ scope })
    if (scopeId !== undefined) params.append('scope_id', scopeId.toString())
    
    const response = await apiClient.post(`/settings/initialize?${params}`)
    return response.data
  }
}

export default settingsApi