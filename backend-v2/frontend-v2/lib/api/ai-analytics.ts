import { apiClient } from './client'

// Types for AI Analytics API responses
export interface BenchmarkData {
  metric_type: string
  current_value: number
  industry_percentile: number
  industry_average: number
  business_segment: string
  trend_direction: 'up' | 'down' | 'stable'
  comparison_insight: string
}

export interface ComprehensiveBenchmark {
  overall_performance_score: number
  percentile_rank: number
  business_segment: string
  revenue_benchmark: BenchmarkData
  appointment_benchmark: BenchmarkData
  efficiency_benchmark: BenchmarkData
  recommendations: string[]
  next_review_date: string
}

export interface PredictionRequest {
  prediction_type: 'revenue_forecast' | 'churn_prediction' | 'demand_patterns' | 'pricing_optimization'
  time_horizon?: string
  parameters?: Record<string, any>
}

export interface RevenueForecast {
  month: string
  predicted_revenue: number
  confidence_interval: {
    lower: number
    upper: number
  }
  factors: string[]
}

export interface ChurnPrediction {
  client_id: number
  client_name: string
  churn_probability: number
  risk_level: 'low' | 'medium' | 'high'
  contributing_factors: string[]
  recommended_actions: string[]
}

export interface DemandPattern {
  time_slot: string
  predicted_demand: number
  capacity_utilization: number
  recommendations: string[]
}

export interface PricingOptimization {
  service_id: number
  service_name: string
  current_price: number
  recommended_price: number
  expected_revenue_impact: number
  confidence_score: number
  market_insights: string[]
}

export interface PredictionResponse {
  prediction_type: string
  generated_at: string
  data: RevenueForecast[] | ChurnPrediction[] | DemandPattern[] | PricingOptimization[]
  metadata: {
    model_version: string
    confidence_score: number
    data_points_used: number
  }
}

export interface AICoachingInsight {
  category: string
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  actionable_steps: string[]
  expected_impact: string
  timeline: string
}

export interface MarketIntelligence {
  competitive_position: {
    percentile_rank: number
    strengths: string[]
    opportunities: string[]
  }
  market_trends: {
    trend: string
    impact: 'positive' | 'negative' | 'neutral'
    recommendation: string
  }[]
  seasonal_insights: {
    season: string
    historical_performance: number
    predicted_performance: number
    preparation_tips: string[]
  }[]
}

export interface PrivacyReport {
  consent_status: boolean
  data_usage_summary: {
    anonymized_metrics: string[]
    retention_period: string
    sharing_scope: string
  }
  compliance_status: {
    gdpr_compliant: boolean
    ccpa_compliant: boolean
    last_audit_date: string
  }
  user_rights: {
    can_export_data: boolean
    can_delete_data: boolean
    can_opt_out: boolean
  }
}

// AI Analytics API Client
export const aiAnalyticsApi = {
  // Consent Management
  async updateConsent(consent: boolean): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/ai-analytics/consent', { consent })
    return response.data
  },

  // Benchmarks
  async getBenchmark(metricType: string): Promise<BenchmarkData> {
    const response = await apiClient.get(`/ai-analytics/benchmarks/${metricType}`)
    return response.data
  },

  async getComprehensiveBenchmarks(): Promise<ComprehensiveBenchmark> {
    const response = await apiClient.get('/ai-analytics/benchmarks/comprehensive')
    return response.data
  },

  // Predictions
  async getPredictions(request: PredictionRequest): Promise<PredictionResponse> {
    const response = await apiClient.post('/ai-analytics/predictions', request)
    return response.data
  },

  async getRevenueForecast(timeHorizon: string = '6_months'): Promise<PredictionResponse> {
    return this.getPredictions({
      prediction_type: 'revenue_forecast',
      time_horizon: timeHorizon
    })
  },

  async getChurnPredictions(): Promise<PredictionResponse> {
    return this.getPredictions({
      prediction_type: 'churn_prediction'
    })
  },

  async getDemandPatterns(parameters?: Record<string, any>): Promise<PredictionResponse> {
    return this.getPredictions({
      prediction_type: 'demand_patterns',
      parameters
    })
  },

  async getPricingOptimization(): Promise<PredictionResponse> {
    return this.getPredictions({
      prediction_type: 'pricing_optimization'
    })
  },

  // Insights
  async getCoachingInsights(): Promise<AICoachingInsight[]> {
    const response = await apiClient.get('/ai-analytics/insights/coaching')
    return response.data
  },

  async getMarketIntelligence(): Promise<MarketIntelligence> {
    const response = await apiClient.get('/ai-analytics/insights/market-intelligence')
    return response.data
  },

  // Privacy
  async getPrivacyReport(): Promise<PrivacyReport> {
    const response = await apiClient.get('/ai-analytics/privacy/report')
    return response.data
  }
}

// Analytics API (existing analytics endpoints)
export const analyticsApi = {
  async getDashboard(): Promise<any> {
    const response = await apiClient.get('/analytics/dashboard')
    return response.data
  },

  async getRevenue(groupBy?: string): Promise<any> {
    const response = await apiClient.get('/analytics/revenue', {
      params: { group_by: groupBy }
    })
    return response.data
  },

  async getAppointments(): Promise<any> {
    const response = await apiClient.get('/analytics/appointments')
    return response.data
  },

  async getClientRetention(): Promise<any> {
    const response = await apiClient.get('/analytics/client-retention')
    return response.data
  },

  async getSixFigureBarber(): Promise<any> {
    const response = await apiClient.get('/analytics/six-figure-barber')
    return response.data
  },

  async getInsights(): Promise<any> {
    const response = await apiClient.get('/analytics/insights')
    return response.data
  }
}

// Agents API (AI agent management)
export const agentsApi = {
  async getTemplates(): Promise<any> {
    const response = await apiClient.get('/agents/templates')
    return response.data
  },

  async createAgent(template: any): Promise<any> {
    const response = await apiClient.post('/agents/', template)
    return response.data
  },

  async getConversations(): Promise<any> {
    const response = await apiClient.get('/agents/conversations')
    return response.data
  }
}