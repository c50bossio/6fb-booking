// Conversion tracking type definitions

// Define ConversionEventType enum
export enum ConversionEventType {
  PAGE_VIEW = 'page_view',
  VIEW_CONTENT = 'view_content',
  SEARCH = 'search',
  ADD_TO_CART = 'add_to_cart',
  ADD_TO_WISHLIST = 'add_to_wishlist',
  INITIATE_CHECKOUT = 'begin_checkout',
  ADD_PAYMENT_INFO = 'add_payment_info',
  PURCHASE = 'purchase',
  LEAD = 'lead',
  COMPLETE_REGISTRATION = 'complete_registration',
  CONTACT = 'contact',
  SUBMIT_APPLICATION = 'submit_application',
  SUBSCRIBE = 'subscribe',
  START_TRIAL = 'start_trial',
  SCHEDULE = 'schedule'
}

// Define ConversionEventParams interface
export interface ConversionEventParams {
  value?: number
  currency?: string
  content_name?: string
  content_category?: string
  content_ids?: string[]
  contents?: Array<{ id: string; quantity: number }>
  content_type?: string
  num_items?: number
}

// Define PurchaseEventParams interface
export interface PurchaseEventParams extends ConversionEventParams {
  transaction_id: string
  affiliation?: string
  revenue?: number
  tax?: number
  shipping?: number
  coupon?: string
}

// Event Type Enum (matching backend)
export enum EventType {
  PAGE_VIEW = "page_view",
  CLICK = "click",
  FORM_SUBMIT = "form_submit",
  ADD_TO_CART = "add_to_cart",
  PURCHASE = "purchase",
  REGISTRATION = "registration",
  LEAD = "lead",
  PHONE_CALL = "phone_call",
  CHAT_STARTED = "chat_started",
  CUSTOM = "custom"
}

// Attribution Model Enum (matching backend)
export enum AttributionModel {
  LAST_CLICK = "last_click",
  FIRST_CLICK = "first_click",
  LINEAR = "linear",
  TIME_DECAY = "time_decay",
  POSITION_BASED = "position_based",
  DATA_DRIVEN = "data_driven"
}

// Conversion Status Enum (matching backend)
export enum ConversionStatus {
  PENDING = "pending",
  TRACKED = "tracked",
  FAILED = "failed",
  DUPLICATE = "duplicate"
}

// API Request/Response Types
export interface ConversionEventCreate {
  event_id?: string
  event_name: string
  event_type: EventType
  event_value?: number
  event_currency?: string
  event_data?: Record<string, any>
  source_url?: string
  user_agent?: string
  ip_address?: string
  client_id?: string
  session_id?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  referrer?: string
}

export interface ConversionEventResponse {
  id: number
  user_id: number
  event_id: string
  event_name: string
  event_type: EventType
  event_value?: number
  event_currency: string
  channel?: string
  status: ConversionStatus
  created_at: string
  gtm_synced: boolean
  meta_synced: boolean
  google_ads_synced: boolean
  attribution_path_id?: number
}

export interface ChannelPerformance {
  channel: string
  conversions: number
  revenue: number
  attributed_revenue: number
  conversion_rate: number
  roi: number
}

export interface ConversionAnalytics {
  total_conversions: number
  total_revenue: number
  conversion_rate: number
  average_order_value: number
  channel_performance: ChannelPerformance[]
  top_converting_pages: Record<string, any>[]
  conversion_funnel: Record<string, any>[]
  period_start: string
  period_end: string
}

export interface AttributionReport {
  model: AttributionModel
  total_revenue: number
  total_conversions: number
  channels: Record<string, any>[]
  period_start: string
  period_end: string
}

export interface TrackingConfigUpdate {
  gtm_container_id?: string
  gtm_enabled?: boolean
  gtm_server_url?: string
  meta_pixel_id?: string
  meta_enabled?: boolean
  meta_test_event_code?: string
  google_ads_conversion_id?: string
  google_ads_enabled?: boolean
  google_ads_conversion_labels?: Record<string, string>
  attribution_window_days?: number
  default_attribution_model?: AttributionModel
  conversion_value_rules?: Record<string, any>
  excluded_domains?: string[]
}

export interface TrackingConfigResponse {
  id: number
  user_id: number
  gtm_enabled: boolean
  gtm_container_id?: string
  meta_enabled: boolean
  meta_pixel_id?: string
  google_ads_enabled: boolean
  google_ads_conversion_id?: string
  attribution_window_days: number
  default_attribution_model: AttributionModel
  enable_enhanced_conversions: boolean
  hash_user_data: boolean
  created_at: string
  updated_at?: string
}

export interface ConversionGoalCreate {
  name: string
  description?: string
  event_name: string
  event_type: EventType
  value?: number
  value_expression?: string
  conditions?: Record<string, any>
  is_active?: boolean
}

export interface ConversionGoalResponse {
  id: number
  user_id: number
  name: string
  description?: string
  event_name: string
  event_type: EventType
  value?: number
  value_expression?: string
  conditions?: Record<string, any>
  is_active: boolean
  total_conversions: number
  total_value: number
  created_at: string
  updated_at?: string
}

export interface CampaignTrackingCreate {
  campaign_id: string
  campaign_name: string
  campaign_source: string
  campaign_medium: string
  start_date: string
  end_date?: string
  total_cost?: number
  currency?: string
}

export interface CampaignTrackingResponse {
  id: number
  user_id: number
  campaign_id: string
  campaign_name: string
  campaign_source: string
  campaign_medium: string
  start_date: string
  end_date?: string
  total_cost: number
  currency: string
  impressions: number
  clicks: number
  conversions: number
  conversion_value: number
  ctr?: number
  conversion_rate?: number
  cpc?: number
  cpa?: number
  roas?: number
  is_active: boolean
  created_at: string
  updated_at?: string
  last_sync_at?: string
}

export interface CampaignMetricsUpdate {
  impressions?: number
  clicks?: number
  conversions?: number
  conversion_value?: number
  total_cost?: number
}

export interface PlatformTestRequest {
  platform: 'gtm' | 'meta' | 'google_ads'
  config: Record<string, any>
}

export interface PlatformTestResponse {
  success: boolean
  message: string
  details?: Record<string, any>
}

export interface TrackingHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  integrations: {
    gtm: {
      configured: boolean
      enabled: boolean
    }
    meta: {
      configured: boolean
      enabled: boolean
    }
    google_ads: {
      configured: boolean
      enabled: boolean
    }
  }
  events_last_24h: number
  timestamp: string
}

export interface CampaignSyncResponse {
  synced: number
  errors: Array<{
    campaign_id: string
    source: string
    error: string
  }>
  message: string
}

// Query Parameters
export interface ConversionAnalyticsQuery {
  start_date?: string
  end_date?: string
  group_by?: 'day' | 'week' | 'month'
}

export interface AttributionReportQuery {
  model?: AttributionModel
  start_date?: string
  end_date?: string
}

export interface ConversionGoalsQuery {
  is_active?: boolean
}

export interface CampaignTrackingQuery {
  is_active?: boolean
  source?: string
  start_date?: string
  end_date?: string
}

export interface CampaignSyncQuery {
  source?: string
}

// Extended event parameters for specific use cases
export interface BookingEventParams extends ConversionEventParams {
  barber_id?: string
  barber_name?: string
  location_id?: string
  location_name?: string
  appointment_date?: string
  appointment_time?: string
  booking_type?: 'walk-in' | 'appointment' | 'recurring'
  booking_source?: 'web' | 'mobile' | 'phone' | 'in-person'
  services?: string[]
}

export interface UserEventParams extends ConversionEventParams {
  method?: 'email' | 'google' | 'facebook' | 'apple'
  user_role?: 'customer' | 'barber' | 'admin' | 'manager'
  referral_code?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

export interface ReviewEventParams extends ConversionEventParams {
  rating: number
  barber_id: string
  service_ids: string[]
  has_text: boolean
  has_photos: boolean
  days_after_appointment: number
  platform?: 'internal' | 'google' | 'facebook' | 'yelp'
}

export interface MarketingEventParams extends ConversionEventParams {
  campaign_id?: string
  campaign_name?: string
  campaign_type?: 'email' | 'sms' | 'push' | 'social'
  message_id?: string
  variant?: string
  action?: 'opened' | 'clicked' | 'converted'
}

// Conversion value helpers
export interface ConversionValue {
  value: number
  currency: string
  ltv?: number // Lifetime value
  average_order_value?: number
  purchase_frequency?: number
}

// Event context for enhanced tracking
export interface EventContext {
  session_id?: string
  client_id?: string
  user_agent?: string
  ip_country?: string
  device_type?: 'desktop' | 'mobile' | 'tablet'
  browser?: string
  os?: string
  referrer?: string
  landing_page?: string
  exit_page?: string
  pages_viewed?: number
  time_on_site?: number
}

// Booking funnel stages
export enum BookingFunnelStage {
  LANDING = 'landing',
  SERVICE_BROWSING = 'service_browsing',
  SERVICE_SELECTED = 'service_selected',
  BARBER_SELECTED = 'barber_selected',
  TIME_SELECTED = 'time_selected',
  CONTACT_INFO = 'contact_info',
  PAYMENT_INFO = 'payment_info',
  CONFIRMATION = 'confirmation',
  COMPLETED = 'completed',
}

// Attribution models
export interface AttributionData {
  first_touch?: {
    source: string
    medium: string
    campaign?: string
    timestamp: string
  }
  last_touch?: {
    source: string
    medium: string
    campaign?: string
    timestamp: string
  }
  multi_touch?: Array<{
    source: string
    medium: string
    campaign?: string
    timestamp: string
    credit: number // Attribution credit (0-1)
  }>
}

// Custom dimension mappings for GA4
export interface CustomDimensions {
  user_type?: string
  barber_id?: string
  location_id?: string
  service_category?: string
  booking_source?: string
  loyalty_tier?: string
  lifetime_value_tier?: string
  days_since_last_visit?: number
  total_bookings?: number
  preferred_barber?: string
}

// Custom metrics for GA4
export interface CustomMetrics {
  booking_value?: number
  service_duration?: number
  days_until_appointment?: number
  cancellation_rate?: number
  no_show_rate?: number
  rebooking_rate?: number
  average_rating?: number
  tip_amount?: number
  discount_amount?: number
  net_revenue?: number
}

// Enhanced e-commerce data for detailed tracking
export interface EnhancedEcommerceData extends PurchaseEventParams {
  affiliation?: string // Shop/location name
  revenue?: number // Total revenue after discounts
  shipping?: number
  tax?: number
  discount?: number
  coupon?: string
  list_name?: string // Where the service was selected from
  list_id?: string
  items: Array<{
    item_id: string
    item_name: string
    affiliation?: string
    coupon?: string
    discount?: number
    index?: number // Position in list
    item_brand?: string // Barber name
    item_category?: string
    item_category2?: string
    item_category3?: string
    item_list_id?: string
    item_list_name?: string
    item_variant?: string // Service duration/type
    location_id?: string
    price: number
    quantity: number
  }>
}

// Consent-aware tracking configuration
export interface TrackingConfig {
  enabled: boolean
  debug?: boolean
  anonymize_ip?: boolean
  cookie_domain?: string
  cookie_expires?: number
  cookie_prefix?: string
  user_id?: string
  custom_dimensions?: CustomDimensions
  custom_metrics?: CustomMetrics
  enhanced_ecommerce?: boolean
  cross_domain_tracking?: string[]
  excluded_referrers?: string[]
  sample_rate?: number // 0-100
}

// Tracking state interface
export interface TrackingState {
  initialized: boolean
  consent_given: boolean
  analytics_enabled: boolean
  marketing_enabled: boolean
  last_event?: {
    type: ConversionEventType
    timestamp: string
    params?: any
  }
  session: {
    id: string
    start_time: string
    events_count: number
    page_views: number
  }
  user: {
    id?: string
    type?: string
    first_seen: string
    last_seen: string
    total_events: number
    total_conversions: number
    total_value: number
  }
}