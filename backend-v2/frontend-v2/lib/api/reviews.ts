/**
 * API client for review management in BookedBarber V2
 * Handles communication with /api/v2/reviews/* endpoints
 */

import { 
  Review, 
  ReviewsListResponse, 
  ReviewResponse, 
  ReviewTemplate, 
  ReviewAnalytics, 
  ReviewFilters,
  ReviewSyncRequest,
  ReviewSyncResponse,
  GMBLocation,
  ReviewResponseCreate,
  ReviewResponseUpdate,
  ReviewTemplateCreate,
  ReviewTemplateUpdate,
  BulkResponseRequest,
  BulkResponseResponse,
  AutoResponseStats,
  TemplateGenerateRequest,
  TemplateGenerateResponse
} from '@/types/review'
import { apiClient } from '@/lib/api'

export class ReviewsAPI {
  private baseUrl = '/api/v2/reviews'

  /**
   * Get paginated reviews with filtering and sorting
   */
  async getReviews(params: {
    platform?: string
    sentiment?: string
    min_rating?: number
    max_rating?: number
    start_date?: string
    end_date?: string
    search_query?: string
    business_id?: string
    has_response?: boolean
    is_flagged?: boolean
    skip?: number
    limit?: number
    sort_by?: string
    sort_order?: string
  } = {}): Promise<ReviewsListResponse> {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString())
      }
    })

    const response = await apiClient.get(`${this.baseUrl}?${searchParams.toString()}`)
    return response.data
  }

  /**
   * Get a specific review by ID
   */
  async getReview(reviewId: number): Promise<Review> {
    const response = await apiClient.get(`${this.baseUrl}/${reviewId}`)
    return response.data
  }

  /**
   * Get review analytics
   */
  async getAnalytics(params: {
    start_date?: string
    end_date?: string
    business_id?: string
  } = {}): Promise<ReviewAnalytics> {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString())
      }
    })

    const response = await apiClient.get(`${this.baseUrl}/analytics?${searchParams.toString()}`)
    return response.data
  }

  /**
   * Create a response to a review
   */
  async createResponse(reviewId: number, responseData: ReviewResponseCreate): Promise<ReviewResponse> {
    const response = await apiClient.post(`${this.baseUrl}/${reviewId}/respond`, responseData)
    return response.data
  }

  /**
   * Update a review response
   */
  async updateResponse(responseId: number, responseData: ReviewResponseUpdate): Promise<ReviewResponse> {
    const response = await apiClient.put(`${this.baseUrl}/responses/${responseId}`, responseData)
    return response.data
  }

  /**
   * Send a review response to the platform
   */
  async sendResponse(responseId: number): Promise<{ success: boolean; message: string; response_id: number; sent_at: string }> {
    const response = await apiClient.post(`${this.baseUrl}/responses/${responseId}/send`)
    return response.data
  }

  /**
   * Sync reviews from platform
   */
  async syncReviews(syncRequest: ReviewSyncRequest): Promise<ReviewSyncResponse> {
    const response = await apiClient.post(`${this.baseUrl}/sync`, syncRequest)
    return response.data
  }

  /**
   * Get review response templates
   */
  async getTemplates(params: {
    category?: string
    platform?: string
    is_active?: boolean
  } = {}): Promise<ReviewTemplate[]> {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString())
      }
    })

    const response = await apiClient.get(`${this.baseUrl}/templates?${searchParams.toString()}`)
    return response.data
  }

  /**
   * Create a new review template
   */
  async createTemplate(templateData: ReviewTemplateCreate): Promise<ReviewTemplate> {
    const response = await apiClient.post(`${this.baseUrl}/templates`, templateData)
    return response.data
  }

  /**
   * Update a review template
   */
  async updateTemplate(templateId: number, templateData: ReviewTemplateUpdate): Promise<ReviewTemplate> {
    const response = await apiClient.put(`${this.baseUrl}/templates/${templateId}`, templateData)
    return response.data
  }

  /**
   * Delete a review template
   */
  async deleteTemplate(templateId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`${this.baseUrl}/templates/${templateId}`)
    return response.data
  }

  /**
   * Generate a response using a template
   */
  async generateResponseFromTemplate(
    templateId: number, 
    reviewId: number, 
    generateRequest?: TemplateGenerateRequest
  ): Promise<TemplateGenerateResponse> {
    const response = await apiClient.post(
      `${this.baseUrl}/templates/${templateId}/generate?review_id=${reviewId}`, 
      generateRequest
    )
    return response.data
  }

  /**
   * Generate bulk responses for multiple reviews
   */
  async bulkGenerateResponses(bulkRequest: BulkResponseRequest): Promise<BulkResponseResponse> {
    const response = await apiClient.post(`${this.baseUrl}/bulk/respond`, bulkRequest)
    return response.data
  }

  /**
   * Get auto-response statistics
   */
  async getAutoResponseStats(daysBack: number = 30): Promise<AutoResponseStats> {
    const response = await apiClient.get(`${this.baseUrl}/auto-response/stats?days_back=${daysBack}`)
    return response.data
  }

  /**
   * Get Google My Business locations
   */
  async getGMBLocations(): Promise<GMBLocation[]> {
    const response = await apiClient.get(`${this.baseUrl}/gmb/locations`)
    return response.data
  }

  /**
   * Initiate Google My Business OAuth flow
   */
  async initiateGMBAuth(redirectUri?: string): Promise<{ success: boolean; message: string; auth_url: string }> {
    const response = await apiClient.post(`${this.baseUrl}/gmb/auth`, {
      redirect_uri: redirectUri
    })
    return response.data
  }

  /**
   * Get review filters with predefined options
   */
  getFilterOptions() {
    return {
      platforms: [
        { value: 'google', label: 'Google' },
        { value: 'yelp', label: 'Yelp' },
        { value: 'facebook', label: 'Facebook' },
        { value: 'instagram', label: 'Instagram' },
        { value: 'booksy', label: 'Booksy' },
        { value: 'fresha', label: 'Fresha' },
        { value: 'styleseat', label: 'StyleSeat' },
        { value: 'other', label: 'Other' }
      ],
      sentiments: [
        { value: 'positive', label: 'Positive' },
        { value: 'neutral', label: 'Neutral' },
        { value: 'negative', label: 'Negative' },
        { value: 'unknown', label: 'Unknown' }
      ],
      responseStatuses: [
        { value: 'pending', label: 'Pending' },
        { value: 'sent', label: 'Sent' },
        { value: 'failed', label: 'Failed' },
        { value: 'not_needed', label: 'Not Needed' },
        { value: 'draft', label: 'Draft' }
      ],
      ratings: [
        { value: '1', label: '1 Star' },
        { value: '2', label: '2 Stars' },
        { value: '3', label: '3 Stars' },
        { value: '4', label: '4 Stars' },
        { value: '5', label: '5 Stars' }
      ],
      categories: [
        { value: 'positive', label: 'Positive' },
        { value: 'negative', label: 'Negative' },
        { value: 'neutral', label: 'Neutral' }
      ],
      sortOptions: [
        { value: 'created_at', label: 'Date Created' },
        { value: 'review_date', label: 'Review Date' },
        { value: 'rating', label: 'Rating' },
        { value: 'sentiment_score', label: 'Sentiment Score' },
        { value: 'platform', label: 'Platform' }
      ],
      sortOrders: [
        { value: 'desc', label: 'Newest First' },
        { value: 'asc', label: 'Oldest First' }
      ]
    }
  }

  /**
   * Helper to build rating display
   */
  getRatingDisplay(rating: number): string {
    return '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating))
  }

  /**
   * Helper to get sentiment badge color
   */
  getSentimentColor(sentiment: string): string {
    switch (sentiment) {
      case 'positive':
        return 'green'
      case 'negative':
        return 'red'
      case 'neutral':
        return 'yellow'
      default:
        return 'gray'
    }
  }

  /**
   * Helper to get platform display name
   */
  getPlatformDisplay(platform: string): string {
    const platformMap: Record<string, string> = {
      google: 'Google',
      yelp: 'Yelp',
      facebook: 'Facebook',
      instagram: 'Instagram',
      booksy: 'Booksy',
      fresha: 'Fresha',
      styleseat: 'StyleSeat',
      other: 'Other'
    }
    return platformMap[platform] || platform
  }

  /**
   * Helper to format date for display
   */
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  /**
   * Helper to get response status badge color
   */
  getResponseStatusColor(status: string): string {
    switch (status) {
      case 'sent':
        return 'green'
      case 'pending':
        return 'yellow'
      case 'failed':
        return 'red'
      case 'draft':
        return 'blue'
      case 'not_needed':
        return 'gray'
      default:
        return 'gray'
    }
  }
}

// Export singleton instance
export const reviewsAPI = new ReviewsAPI()

// Export individual functions for convenience
export const {
  getReviews,
  getReview,
  getAnalytics,
  createResponse,
  updateResponse,
  sendResponse,
  syncReviews,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  generateResponseFromTemplate,
  bulkGenerateResponses,
  getAutoResponseStats,
  getGMBLocations,
  initiateGMBAuth,
  getFilterOptions,
  getRatingDisplay,
  getSentimentColor,
  getPlatformDisplay,
  formatDate,
  getResponseStatusColor
} = reviewsAPI