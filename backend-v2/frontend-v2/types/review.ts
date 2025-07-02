/**
 * Review management types for BookedBarber V2
 * Based on backend schemas from schemas_new/review.py
 */

export enum ReviewPlatform {
  GOOGLE = "google",
  YELP = "yelp",
  FACEBOOK = "facebook",
  INSTAGRAM = "instagram",
  BOOKSY = "booksy",
  FRESHA = "fresha",
  STYLESEAT = "styleseat",
  OTHER = "other"
}

export enum ReviewSentiment {
  POSITIVE = "positive",
  NEUTRAL = "neutral",
  NEGATIVE = "negative",
  UNKNOWN = "unknown"
}

export enum ReviewResponseStatus {
  PENDING = "pending",
  SENT = "sent",
  FAILED = "failed",
  NOT_NEEDED = "not_needed",
  DRAFT = "draft"
}

export interface Review {
  id: number
  user_id: number
  platform: ReviewPlatform
  external_review_id: string
  business_id?: string
  reviewer_name?: string
  reviewer_photo_url?: string
  rating: number
  review_text?: string
  review_date: string
  review_url?: string
  
  // Sentiment analysis
  sentiment: ReviewSentiment
  sentiment_score?: number
  sentiment_confidence?: number
  sentiment_keywords: string[]
  
  // Response tracking
  response_status: ReviewResponseStatus
  response_text?: string
  response_date?: string
  response_author?: string
  auto_response_generated: boolean
  
  // Business intelligence
  keywords_mentioned: string[]
  services_mentioned: string[]
  competitor_mentions: string[]
  location_mentions: string[]
  
  // Quality metrics
  is_verified: boolean
  is_flagged: boolean
  flag_reason?: string
  is_helpful?: boolean
  helpful_count: number
  
  // Metadata
  last_synced_at?: string
  is_deleted_on_platform: boolean
  sync_errors: Record<string, any>[]
  created_at: string
  updated_at: string
  
  // Computed properties
  is_positive: boolean
  is_negative: boolean
  needs_response: boolean
  can_respond: boolean
}

export interface ReviewResponse {
  id: number
  review_id: number
  user_id: number
  response_text: string
  response_type: string
  template_id?: string
  is_draft: boolean
  is_sent: boolean
  sent_at?: string
  platform_response_id?: string
  
  // SEO and optimization
  keywords_used: string[]
  cta_included: boolean
  business_name_mentioned: boolean
  
  // Performance tracking
  view_count: number
  helpful_votes: number
  character_count: number
  
  // A/B testing
  variant_id?: string
  test_group?: string
  
  // Error tracking
  send_errors: Record<string, any>[]
  last_error?: string
  
  // Metadata
  created_at: string
  updated_at: string
  
  // Computed properties
  is_ready_to_send: boolean
}

export interface ReviewTemplate {
  id: number
  user_id: number
  name: string
  description?: string
  category: string
  platform?: ReviewPlatform
  template_text: string
  placeholders: string[]
  
  // Conditions
  min_rating?: number
  max_rating?: number
  keywords_trigger: string[]
  sentiment_trigger?: ReviewSentiment
  
  // SEO
  seo_keywords: string[]
  include_business_name: boolean
  include_cta: boolean
  cta_text?: string
  
  // Usage tracking
  use_count: number
  success_rate: number
  avg_response_time: number
  
  // Settings
  is_active: boolean
  is_default: boolean
  priority: number
  
  // Metadata
  created_at: string
  updated_at: string
  last_used_at?: string
}

export interface ReviewAnalytics {
  total_reviews: number
  average_rating: number
  rating_distribution: Record<number, number>
  
  // Platform breakdown
  platform_breakdown: Record<string, Record<string, any>>
  
  // Sentiment analysis
  sentiment_breakdown: Record<string, number>
  positive_percentage: number
  negative_percentage: number
  
  // Response metrics
  response_rate: number
  avg_response_time_hours: number
  auto_response_percentage: number
  
  // Time-based metrics
  reviews_this_month: number
  reviews_last_month: number
  month_over_month_change: number
  
  // Quality metrics
  verified_reviews_count: number
  flagged_reviews_count: number
  helpful_reviews_count: number
  
  // SEO insights
  top_keywords: Array<{ keyword: string; count: number; sentiment: string }>
  services_mentioned: Array<{ service: string; count: number; rating: number }>
  competitor_mentions: string[]
}

export interface ReviewFilters {
  platform?: ReviewPlatform
  sentiment?: ReviewSentiment
  response_status?: ReviewResponseStatus
  min_rating?: number
  max_rating?: number
  start_date?: string
  end_date?: string
  is_flagged?: boolean
  is_verified?: boolean
  has_response?: boolean
  search_query?: string
  business_id?: string
}

export interface ReviewSyncRequest {
  platform: ReviewPlatform
  business_id?: string
  force_full_sync?: boolean
  sync_responses?: boolean
  date_range_days?: number
}

export interface ReviewSyncResponse {
  success: boolean
  message: string
  synced_at: string
  platform: ReviewPlatform
  business_id?: string
  reviews_synced: number
  new_reviews: number
  updated_reviews: number
  errors_count: number
  total_reviews_after_sync: number
  average_rating_after_sync: number
  errors: string[]
}

export interface GMBLocation {
  location_id: string
  name: string
  address: string
  phone?: string
  website?: string
  category?: string
  hours?: Record<string, any>
  rating?: number
  review_count?: number
  is_verified: boolean
  is_published: boolean
}

export interface ReviewResponseCreate {
  response_text: string
  template_id?: string
  keywords_used?: string[]
  cta_included?: boolean
  business_name_mentioned?: boolean
  variant_id?: string
  test_group?: string
}

export interface ReviewResponseUpdate {
  response_text?: string
  is_draft?: boolean
  keywords_used?: string[]
  cta_included?: boolean
  business_name_mentioned?: boolean
}

export interface ReviewTemplateCreate {
  name: string
  description?: string
  category: string
  platform?: ReviewPlatform
  template_text: string
  placeholders?: string[]
  min_rating?: number
  max_rating?: number
  keywords_trigger?: string[]
  sentiment_trigger?: ReviewSentiment
  seo_keywords?: string[]
  include_business_name?: boolean
  include_cta?: boolean
  cta_text?: string
  is_active?: boolean
  is_default?: boolean
  priority?: number
}

export interface ReviewTemplateUpdate {
  name?: string
  description?: string
  category?: string
  platform?: ReviewPlatform
  template_text?: string
  placeholders?: string[]
  min_rating?: number
  max_rating?: number
  keywords_trigger?: string[]
  sentiment_trigger?: ReviewSentiment
  seo_keywords?: string[]
  include_business_name?: boolean
  include_cta?: boolean
  cta_text?: string
  is_active?: boolean
  is_default?: boolean
  priority?: number
}

export interface BulkResponseRequest {
  review_ids: number[]
  template_id?: number
  auto_send?: boolean
  business_name?: string
}

export interface BulkResponseResult {
  review_id: number
  success: boolean
  response_id?: number
  error?: string
  response_text?: string
}

export interface BulkResponseResponse {
  success: boolean
  message: string
  total_processed: number
  successful_responses: number
  failed_responses: number
  results: BulkResponseResult[]
}

export interface AutoResponseConfig {
  enabled: boolean
  respond_to_positive: boolean
  respond_to_neutral: boolean
  respond_to_negative: boolean
  min_rating_threshold: number
  max_rating_threshold: number
  delay_hours: number
  platforms: ReviewPlatform[]
  business_hours_only: boolean
  weekend_responses: boolean
  template_selection_strategy: string
}

export interface AutoResponseStats {
  total_auto_responses: number
  auto_responses_today: number
  auto_responses_this_week: number
  auto_responses_this_month: number
  success_rate: number
  average_response_time_hours: number
  most_used_template?: string
  platform_breakdown: Record<string, number>
}

// API Response wrapper types
export interface ReviewsListResponse {
  reviews: Review[]
  total: number
  skip: number
  limit: number
  has_more: boolean
}

export interface TemplateGenerateRequest {
  template_id: number
  business_name?: string
  custom_placeholders?: Record<string, string>
}

export interface TemplateGenerateResponse {
  success: boolean
  response_text: string
  template_used: string
  placeholders_replaced: Record<string, string>
  character_count: number
  seo_keywords_included: string[]
}