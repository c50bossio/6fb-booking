/**
 * Retention Analytics API Client
 * ==============================
 * 
 * Unified API client for all retention intelligence services:
 * - Churn Prediction Analytics
 * - Win-Back Automation Performance  
 * - Dynamic Offer Analytics
 * - Campaign Performance Metrics
 * - Six Figure Methodology Impact
 */

import { apiClient } from './client'

export interface RetentionAnalyticsResponse {
  clientsAtRisk: number
  retentionRate: number
  churnPrevented: number
  averageClientValue: number
  riskDistribution: {
    high: number
    medium: number
    low: number
  }
  predictionAccuracy: number
  sixFigureMethodology: {
    score: number
    valueEnhancementSuccess: number
    relationshipBuildingImpact: number
  }
}

export interface WinBackAnalyticsResponse {
  overview: {
    total_sequences_triggered: number
    sequences_in_progress: number
    clients_reactivated: number
    overall_success_rate: number
    total_recovery_revenue: number
    roi_percentage: number
  }
  stage_performance: {
    gentle_reminder: number
    value_proposition: number
    special_offer: number
    final_attempt: number
  }
  six_figure_methodology_impact: {
    methodology_score: number
    relationship_focused_success: number
    value_enhancement_vs_discount: {
      value_enhancement: { success_rate: number; avg_revenue: number }
      discount_offers: { success_rate: number; avg_revenue: number }
    }
  }
  client_segment_performance: {
    vip_clients: { sequences: number; success_rate: number; avg_recovery: number }
    premium_clients: { sequences: number; success_rate: number; avg_recovery: number }
    regular_clients: { sequences: number; success_rate: number; avg_recovery: number }
    new_clients: { sequences: number; success_rate: number; avg_recovery: number }
  }
  optimization_recommendations: string[]
}

export interface OfferAnalyticsResponse {
  total_offers_generated: number
  overall_redemption_rate: number
  total_revenue_impact: number
  average_roi: number
  performance_by_category: {
    [category: string]: {
      count: number
      redemption_rate: number
      avg_revenue: number
    }
  }
  top_performing_templates: Array<{
    template_id: string
    redemption_rate: number
    roi: number
  }>
  six_figure_impact: {
    methodology_alignment_score: number
    value_focused_offers_performance: number
    revenue_per_successful_offer: number
    client_retention_improvement: string
  }
  optimization_recommendations: string[]
}

export interface CampaignAnalyticsResponse {
  campaignsExecuted: number
  emailOpenRate: number
  smsResponseRate: number
  conversionRate: number
  totalReach: number
  clientSatisfactionCorrelation: number
}

export interface ChurnPrediction {
  client_id: number
  client_name: string
  churn_risk_score: number
  churn_probability: number
  prediction_confidence: number
  risk_factors: string[]
  recommended_actions: string[]
  client_tier: string
  lifetime_value: number
  last_booking_days_ago: number
}

export interface RetentionMetrics {
  total_at_risk_clients: number
  high_risk_clients: number
  medium_risk_clients: number
  low_risk_clients: number
  churn_prevented_this_month: number
  retention_rate: number
  average_client_value: number
  prediction_accuracy: number
}

export interface WinBackSequence {
  sequence_id: string
  client_id: number
  client_name: string
  trigger: string
  current_stage: string
  status: string
  days_dormant: number
  lifetime_value: number
  started_at: string
  next_action_at: string
  reactivated: boolean
  sequence_roi: number
}

export interface PersonalizedOffer {
  offer_id: string
  client_id: number
  client_name: string
  offer_type: string
  offer_category: string
  offer_title: string
  value_amount: number
  churn_risk_score: number
  client_tier: string
  expires_at: string
  generated_at: string
  redeemed_at?: string
}

export interface CampaignExecution {
  execution_id: string
  campaign_type: string
  target_clients: number
  delivery_channel: string
  sent_count: number
  opened_count: number
  clicked_count: number
  converted_count: number
  execution_date: string
  roi_percentage: number
}

export class RetentionAnalyticsAPI {
  /**
   * Get comprehensive retention analytics dashboard data
   */
  static async getDashboardAnalytics(dateRangeDays: number = 30): Promise<{
    retention: RetentionAnalyticsResponse
    winback: WinBackAnalyticsResponse
    offers: OfferAnalyticsResponse
    campaigns: CampaignAnalyticsResponse
  }> {
    const [retention, winback, offers, campaigns] = await Promise.all([
      apiClient.get(`/api/v2/retention/analytics/dashboard?date_range_days=${dateRangeDays}`),
      apiClient.get(`/api/v2/winback/analytics/dashboard?date_range_days=${dateRangeDays}`),
      apiClient.get(`/api/v2/offers/analytics/dashboard?date_range_days=${dateRangeDays}`),
      apiClient.get(`/api/v2/campaigns/analytics/dashboard?date_range_days=${dateRangeDays}`)
    ])

    return {
      retention: retention.data,
      winback: winback.data,
      offers: offers.data,
      campaigns: campaigns.data
    }
  }

  /**
   * Get current retention metrics overview
   */
  static async getRetentionMetrics(): Promise<RetentionMetrics> {
    const response = await apiClient.get('/api/v2/retention/metrics')
    return response.data
  }

  /**
   * Get churn predictions for all clients
   */
  static async getChurnPredictions(riskThreshold: number = 60): Promise<ChurnPrediction[]> {
    const response = await apiClient.get(`/api/v2/retention/predictions?risk_threshold=${riskThreshold}`)
    return response.data
  }

  /**
   * Get high-priority clients needing immediate attention
   */
  static async getHighPriorityClients(): Promise<ChurnPrediction[]> {
    const response = await apiClient.get('/api/v2/retention/predictions?risk_threshold=70&limit=20')
    return response.data
  }

  /**
   * Get active win-back sequences
   */
  static async getActiveWinBackSequences(): Promise<WinBackSequence[]> {
    const response = await apiClient.get('/api/v2/winback/sequences?status=active')
    return response.data
  }

  /**
   * Get win-back performance analytics
   */
  static async getWinBackPerformance(dateRangeDays: number = 90): Promise<any> {
    const response = await apiClient.get(`/api/v2/winback/performance?date_range_days=${dateRangeDays}`)
    return response.data
  }

  /**
   * Trigger win-back sequence detection
   */
  static async triggerWinBackDetection(): Promise<WinBackSequence[]> {
    const response = await apiClient.post('/api/v2/winback/detect-triggers', {
      force_detection: false
    })
    return response.data
  }

  /**
   * Get recent personalized offers
   */
  static async getRecentOffers(limit: number = 50): Promise<PersonalizedOffer[]> {
    const response = await apiClient.get(`/api/v2/offers/recent?limit=${limit}`)
    return response.data
  }

  /**
   * Generate personalized offer for client
   */
  static async generateOffer(clientId: number, context?: any): Promise<PersonalizedOffer> {
    const response = await apiClient.post('/api/v2/offers/generate', {
      client_id: clientId,
      analysis_period_days: 90,
      context
    })
    return response.data
  }

  /**
   * Generate batch offers for high-risk clients
   */
  static async generateBatchOffers(minRiskThreshold: number = 60, batchSize: number = 25): Promise<PersonalizedOffer[]> {
    const response = await apiClient.post('/api/v2/offers/batch', {
      min_risk_threshold: minRiskThreshold,
      batch_size: batchSize,
      analysis_period_days: 90
    })
    return response.data
  }

  /**
   * Get offer performance analytics
   */
  static async getOfferPerformance(dateRangeDays: number = 30): Promise<any> {
    const response = await apiClient.get(`/api/v2/offers/performance?date_range_days=${dateRangeDays}`)
    return response.data
  }

  /**
   * Get recent campaign executions
   */
  static async getRecentCampaigns(limit: number = 20): Promise<CampaignExecution[]> {
    const response = await apiClient.get(`/api/v2/campaigns/executions?limit=${limit}`)
    return response.data
  }

  /**
   * Execute retention campaign for high-risk clients
   */
  static async executeRetentionCampaign(clientIds: number[], campaignType: string = 'retention_email'): Promise<any> {
    const response = await apiClient.post('/api/v2/campaigns/execute', {
      campaign_type: campaignType,
      target_client_ids: clientIds,
      personalization_level: 'high',
      scheduling: 'immediate'
    })
    return response.data
  }

  /**
   * Execute batch campaigns for multiple client segments
   */
  static async executeBatchCampaigns(segments: Array<{
    segment_criteria: any
    campaign_config: any
  }>): Promise<any> {
    const response = await apiClient.post('/api/v2/campaigns/batch', {
      campaigns: segments
    })
    return response.data
  }

  /**
   * Get campaign performance analytics
   */
  static async getCampaignAnalytics(campaignId?: string, dateRangeDays: number = 30): Promise<any> {
    const params = new URLSearchParams()
    if (campaignId) params.append('campaign_id', campaignId)
    params.append('date_range_days', dateRangeDays.toString())
    
    const response = await apiClient.get(`/api/v2/campaigns/analytics?${params.toString()}`)
    return response.data
  }

  /**
   * Mark client as reactivated (for win-back tracking)
   */
  static async markClientReactivated(clientId: number, revenue: number = 0): Promise<any> {
    const response = await apiClient.post(`/api/v2/winback/client/${clientId}/reactivated?revenue=${revenue}`)
    return response.data
  }

  /**
   * Get retention configuration and settings
   */
  static async getRetentionConfiguration(): Promise<any> {
    const [retentionConfig, winbackConfig, offerConfig] = await Promise.all([
      apiClient.get('/api/v2/retention/configuration'),
      apiClient.get('/api/v2/winback/configuration'),
      apiClient.get('/api/v2/offers/configuration')
    ])

    return {
      retention: retentionConfig.data,
      winback: winbackConfig.data,
      offers: offerConfig.data
    }
  }

  /**
   * Get Six Figure methodology impact metrics
   */
  static async getSixFigureImpact(dateRangeDays: number = 90): Promise<any> {
    const response = await apiClient.get(`/api/v2/retention/six-figure-impact?date_range_days=${dateRangeDays}`)
    return response.data
  }

  /**
   * Export retention analytics report
   */
  static async exportAnalyticsReport(format: 'pdf' | 'excel' = 'pdf', dateRangeDays: number = 90): Promise<Blob> {
    const response = await apiClient.get(`/api/v2/retention/export/report?format=${format}&date_range_days=${dateRangeDays}`, {
      responseType: 'blob'
    })
    return response.data
  }
}