/**
 * Local SEO Management API Client
 */
import apiClient from './client'

// TypeScript interfaces for Local SEO API
export interface GoogleBusinessProfile {
  id: string
  account_id: string
  location_id: string
  business_name: string
  address: string
  phone: string
  website_url?: string
  categories: string[]
  hours: Record<string, any>
  photos: Array<{
    url: string
    caption?: string
    type: 'logo' | 'cover' | 'interior' | 'exterior' | 'team' | 'menu'
  }>
  description?: string
  services: string[]
  attributes: Record<string, any>
  verification_status: 'verified' | 'unverified' | 'pending'
  google_places_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SEOOptimization {
  id: string
  business_id: string
  current_score: number
  max_score: number
  recommendations: Array<{
    category: string
    title: string
    description: string
    priority: 'high' | 'medium' | 'low'
    status: 'pending' | 'in_progress' | 'completed'
    impact_score: number
  }>
  local_seo_factors: {
    nap_consistency: number
    google_business_optimization: number
    review_management: number
    local_citations: number
    schema_markup: number
    website_optimization: number
  }
  last_audit_date: string
  next_audit_date: string
  created_at: string
  updated_at: string
}

export interface ReviewData {
  id: string
  platform: 'google' | 'yelp' | 'facebook' | 'other'
  reviewer_name: string
  rating: number
  review_text: string
  response?: string
  response_date?: string
  review_date: string
  is_public: boolean
  sentiment: 'positive' | 'neutral' | 'negative'
  keywords: string[]
  status: 'new' | 'responded' | 'flagged' | 'ignored'
  platform_url?: string
}

export interface LocalKeyword {
  id: string
  keyword: string
  search_volume: number
  difficulty: number
  current_ranking?: number
  target_ranking: number
  location: string
  device: 'desktop' | 'mobile' | 'both'
  trend: 'up' | 'down' | 'stable'
  last_checked: string
  ranking_history: Array<{
    date: string
    position: number
    url: string
  }>
}

export interface LocalCitation {
  id: string
  directory_name: string
  business_name: string
  address: string
  phone: string
  website: string
  status: 'active' | 'inactive' | 'pending' | 'claimed' | 'unclaimed'
  accuracy_score: number
  listing_url?: string
  last_verified: string
  issues: string[]
  authority_score: number
  category: string
}

export interface SchemaMarkup {
  id: string
  schema_type: 'local_business' | 'barber_shop' | 'organization' | 'website'
  json_ld: Record<string, any>
  pages: string[]
  is_valid: boolean
  validation_errors: string[]
  last_tested: string
  implementation_status: 'pending' | 'implemented' | 'needs_update'
}

export interface SEOAnalytics {
  overview: {
    total_impressions: number
    total_clicks: number
    average_position: number
    click_through_rate: number
  }
  local_pack_performance: {
    appearances: number
    clicks: number
    calls: number
    direction_requests: number
  }
  keyword_performance: Array<{
    keyword: string
    impressions: number
    clicks: number
    position: number
    ctr: number
  }>
  competitor_analysis: Array<{
    competitor_name: string
    visibility_score: number
    ranking_keywords: number
    average_position: number
  }>
  time_series: Array<{
    date: string
    impressions: number
    clicks: number
    position: number
  }>
}

// Google Business Profile Management
export const googleBusinessAPI = {
  async getProfile(): Promise<{ success: boolean; profile: GoogleBusinessProfile }> {
    const response = await apiClient.get('/local-seo/google-business/profile')
    return response.data
  },

  async updateProfile(updates: Partial<GoogleBusinessProfile>) {
    const response = await apiClient.put('/local-seo/google-business/profile', updates)
    return response.data
  },

  async uploadPhoto(file: File, type: string, caption?: string) {
    const formData = new FormData()
    formData.append('photo', file)
    formData.append('type', type)
    if (caption) formData.append('caption', caption)

    const response = await apiClient.post('/local-seo/google-business/photos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  async deletePhoto(photoId: string) {
    const response = await apiClient.delete(`/local-seo/google-business/photos/${photoId}`)
    return response.data
  },

  async updateHours(hours: Record<string, any>) {
    const response = await apiClient.put('/local-seo/google-business/hours', { hours })
    return response.data
  },

  async syncWithGoogle() {
    const response = await apiClient.post('/local-seo/google-business/sync')
    return response.data
  }
}

// SEO Optimization
export const seoOptimizationAPI = {
  async getOptimizationData(): Promise<{ success: boolean; optimization: SEOOptimization }> {
    const response = await apiClient.get('/local-seo/optimization')
    return response.data
  },

  async runAudit() {
    const response = await apiClient.post('/local-seo/optimization/audit')
    return response.data
  },

  async updateRecommendationStatus(recommendationId: string, status: string) {
    const response = await apiClient.put(`/local-seo/optimization/recommendations/${recommendationId}`, {
      status
    })
    return response.data
  },

  async getOptimizationTips(): Promise<{ success: boolean; tips: Array<any> }> {
    const response = await apiClient.get('/local-seo/optimization/tips')
    return response.data
  }
}

// Review Management
export const reviewManagementAPI = {
  async getReviews(platform?: string, status?: string): Promise<{ success: boolean; reviews: ReviewData[] }> {
    const params: Record<string, string> = {}
    if (platform) params.platform = platform
    if (status) params.status = status

    const response = await apiClient.get('/local-seo/reviews', { params })
    return response.data
  },

  async respondToReview(reviewId: string, response: string) {
    const response_data = await apiClient.post(`/local-seo/reviews/${reviewId}/respond`, {
      response
    })
    return response_data.data
  },

  async flagReview(reviewId: string, reason: string) {
    const response = await apiClient.post(`/local-seo/reviews/${reviewId}/flag`, {
      reason
    })
    return response.data
  },

  async getReviewInsights(): Promise<{ success: boolean; insights: any }> {
    const response = await apiClient.get('/local-seo/reviews/insights')
    return response.data
  },

  async syncReviews() {
    const response = await apiClient.post('/local-seo/reviews/sync')
    return response.data
  }
}

// Keyword Tracking
export const keywordTrackingAPI = {
  async getKeywords(): Promise<{ success: boolean; keywords: LocalKeyword[] }> {
    const response = await apiClient.get('/local-seo/keywords')
    return response.data
  },

  async addKeyword(keywordData: Omit<LocalKeyword, 'id' | 'created_at' | 'updated_at' | 'ranking_history'>) {
    const response = await apiClient.post('/local-seo/keywords', keywordData)
    return response.data
  },

  async updateKeyword(keywordId: string, updates: Partial<LocalKeyword>) {
    const response = await apiClient.put(`/local-seo/keywords/${keywordId}`, updates)
    return response.data
  },

  async deleteKeyword(keywordId: string) {
    const response = await apiClient.delete(`/local-seo/keywords/${keywordId}`)
    return response.data
  },

  async checkRankings() {
    const response = await apiClient.post('/local-seo/keywords/check-rankings')
    return response.data
  },

  async getKeywordSuggestions(seedKeyword: string): Promise<{ success: boolean; suggestions: string[] }> {
    const response = await apiClient.get('/local-seo/keywords/suggestions', {
      params: { seed: seedKeyword }
    })
    return response.data
  }
}

// Citation Management
export const citationManagementAPI = {
  async getCitations(): Promise<{ success: boolean; citations: LocalCitation[] }> {
    const response = await apiClient.get('/local-seo/citations')
    return response.data
  },

  async addCitation(citationData: Omit<LocalCitation, 'id' | 'last_verified'>) {
    const response = await apiClient.post('/local-seo/citations', citationData)
    return response.data
  },

  async updateCitation(citationId: string, updates: Partial<LocalCitation>) {
    const response = await apiClient.put(`/local-seo/citations/${citationId}`, updates)
    return response.data
  },

  async deleteCitation(citationId: string) {
    const response = await apiClient.delete(`/local-seo/citations/${citationId}`)
    return response.data
  },

  async verifyCitation(citationId: string) {
    const response = await apiClient.post(`/local-seo/citations/${citationId}/verify`)
    return response.data
  },

  async scanForCitations() {
    const response = await apiClient.post('/local-seo/citations/scan')
    return response.data
  },

  async getDirectoryOpportunities(): Promise<{ success: boolean; opportunities: Array<any> }> {
    const response = await apiClient.get('/local-seo/citations/opportunities')
    return response.data
  }
}

// Schema Markup
export const schemaMarkupAPI = {
  async getSchemas(): Promise<{ success: boolean; schemas: SchemaMarkup[] }> {
    const response = await apiClient.get('/local-seo/schema')
    return response.data
  },

  async generateSchema(schemaType: string, businessData: Record<string, any>) {
    const response = await apiClient.post('/local-seo/schema/generate', {
      schema_type: schemaType,
      business_data: businessData
    })
    return response.data
  },

  async validateSchema(schemaId: string) {
    const response = await apiClient.post(`/local-seo/schema/${schemaId}/validate`)
    return response.data
  },

  async updateSchema(schemaId: string, updates: Partial<SchemaMarkup>) {
    const response = await apiClient.put(`/local-seo/schema/${schemaId}`, updates)
    return response.data
  },

  async deleteSchema(schemaId: string) {
    const response = await apiClient.delete(`/local-seo/schema/${schemaId}`)
    return response.data
  }
}

// SEO Analytics
export const seoAnalyticsAPI = {
  async getAnalytics(dateRange?: { start: string; end: string }): Promise<{ success: boolean; analytics: SEOAnalytics }> {
    const params = dateRange ? { start_date: dateRange.start, end_date: dateRange.end } : {}
    const response = await apiClient.get('/local-seo/analytics', { params })
    return response.data
  },

  async getCompetitorAnalysis(): Promise<{ success: boolean; analysis: any }> {
    const response = await apiClient.get('/local-seo/analytics/competitors')
    return response.data
  },

  async getLocalPackPerformance(): Promise<{ success: boolean; performance: any }> {
    const response = await apiClient.get('/local-seo/analytics/local-pack')
    return response.data
  }
}

// Health Check
export const localSEOHealthAPI = {
  async checkHealth() {
    const response = await apiClient.get('/local-seo/health')
    return response.data
  }
}

// Constants
export const SEO_PRIORITIES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
} as const

export const REVIEW_PLATFORMS = {
  GOOGLE: 'google',
  YELP: 'yelp',
  FACEBOOK: 'facebook',
  OTHER: 'other'
} as const

export const REVIEW_STATUSES = {
  NEW: 'new',
  RESPONDED: 'responded',
  FLAGGED: 'flagged',
  IGNORED: 'ignored'
} as const

export const CITATION_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  CLAIMED: 'claimed',
  UNCLAIMED: 'unclaimed'
} as const

export const SCHEMA_TYPES = {
  LOCAL_BUSINESS: 'local_business',
  BARBER_SHOP: 'barber_shop',
  ORGANIZATION: 'organization',
  WEBSITE: 'website'
} as const

export type SEOPriority = typeof SEO_PRIORITIES[keyof typeof SEO_PRIORITIES]
export type ReviewPlatform = typeof REVIEW_PLATFORMS[keyof typeof REVIEW_PLATFORMS]
export type ReviewStatus = typeof REVIEW_STATUSES[keyof typeof REVIEW_STATUSES]
export type CitationStatus = typeof CITATION_STATUSES[keyof typeof CITATION_STATUSES]
export type SchemaType = typeof SCHEMA_TYPES[keyof typeof SCHEMA_TYPES]
