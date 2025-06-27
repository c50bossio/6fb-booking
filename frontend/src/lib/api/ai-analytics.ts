/**
 * AI Analytics API Client
 * Provides intelligent revenue insights and optimization recommendations
 */

import apiClient from './client'

// ====== TYPE DEFINITIONS ======

export interface RevenuePattern {
  pattern_type: string
  pattern_name: string
  confidence_score: number
  pattern_description: string
  avg_revenue_impact: number
  frequency: string
  recommendations: string[]
}

export interface RevenuePrediction {
  date: string
  predicted_revenue: number
  confidence_interval_low: number
  confidence_interval_high: number
  confidence_score: number
  predicted_appointments: number
  factors: Record<string, number>
}

export interface PricingOptimization {
  service_name: string
  current_price: number
  recommended_price: number
  expected_revenue_change: number
  expected_demand_change: number
  confidence_score: number
  recommendation_reason: string
  implementation_tips: string[]
}

export interface ClientSegment {
  segment_name: string
  segment_type: string
  description: string
  size: number
  avg_lifetime_value: number
  avg_visit_frequency: number
  engagement_strategies: string[]
  revenue_contribution_percentage: number
  growth_potential: string
}

export interface RevenueInsight {
  insight_type: string
  category: string
  title: string
  description: string
  potential_impact: number
  priority: string
  recommendations: string[]
  confidence_score: number
}

export interface PerformanceBenchmark {
  metric: string
  your_value: number
  peer_average: number
  percentile: number
  status: 'above_average' | 'average' | 'below_average'
  improvement_tips: string[]
}

export interface OptimizationGoal {
  goal_type: string
  goal_name: string
  description: string
  current_value: number
  target_value: number
  target_date: string
  progress_percentage: number
  recommended_actions: string[]
  estimated_difficulty: string
  success_probability: number
}

export interface AIAnalyticsDashboard {
  revenue_patterns: RevenuePattern[]
  predictions: RevenuePrediction[]
  insights: RevenueInsight[]
  optimization_opportunities: {
    pricing: PricingOptimization[]
    scheduling: any[]
    client_segments: ClientSegment[]
  }
  performance_score: number
  key_metrics: {
    predicted_weekly_revenue: number
    revenue_percentile: number
    growth_rate: number
    retention_rate: number
    utilization_rate: number
  }
}

// ====== API CLIENT CLASS ======

export class AIAnalyticsAPI {
  /**
   * Get revenue patterns using machine learning analysis
   */
  async getRevenuePatterns(lookbackDays: number = 180): Promise<RevenuePattern[]> {
    const response = await apiClient.get(`/ai_analytics/patterns?lookback_days=${lookbackDays}`)
    return response.data
  }

  /**
   * Get AI-powered revenue predictions
   */
  async getRevenuePredictions(daysAhead: number = 30): Promise<RevenuePrediction[]> {
    const response = await apiClient.get(`/ai_analytics/predictions?days_ahead=${daysAhead}`)
    return response.data
  }

  /**
   * Get pricing optimization recommendations
   */
  async getPricingOptimization(): Promise<PricingOptimization[]> {
    const response = await apiClient.get('/ai_analytics/pricing-optimization')
    return response.data
  }

  /**
   * Get client segments for targeted marketing
   */
  async getClientSegments(): Promise<ClientSegment[]> {
    const response = await apiClient.get('/ai_analytics/client-segments')
    return response.data
  }

  /**
   * Get AI-generated insights and recommendations
   */
  async getInsights(limit: number = 10, category?: string): Promise<RevenueInsight[]> {
    const params = new URLSearchParams({ limit: limit.toString() })
    if (category) params.append('category', category)

    const response = await apiClient.get(`/ai_analytics/insights?${params.toString()}`)
    return response.data
  }

  /**
   * Get performance benchmark against peers
   */
  async getPerformanceBenchmark(): Promise<PerformanceBenchmark[]> {
    const response = await apiClient.get('/ai_analytics/benchmark')
    return response.data
  }

  /**
   * Get AI-recommended optimization goals
   */
  async getOptimizationGoals(): Promise<OptimizationGoal[]> {
    const response = await apiClient.get('/ai_analytics/optimization-goals')
    return response.data
  }

  /**
   * Get comprehensive AI analytics dashboard
   */
  async getDashboard(): Promise<AIAnalyticsDashboard> {
    const response = await apiClient.get('/ai_analytics/dashboard')
    return response.data
  }

  /**
   * Export AI analytics data
   */
  async exportData(format: 'csv' | 'pdf' | 'excel'): Promise<Blob> {
    const response = await apiClient.get(`/ai_analytics/export?format=${format}`, {
      responseType: 'blob'
    })
    return response.data
  }
}

// ====== ANALYTICS UTILITIES ======

export class AIAnalyticsUtils {
  /**
   * Calculate confidence level color
   */
  static getConfidenceColor(score: number): string {
    if (score >= 0.8) return 'text-green-500'
    if (score >= 0.6) return 'text-yellow-500'
    return 'text-red-500'
  }

  /**
   * Get priority badge color
   */
  static getPriorityColor(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  /**
   * Format currency with proper locale
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  /**
   * Format percentage with appropriate precision
   */
  static formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`
  }

  /**
   * Get trend arrow icon based on change
   */
  static getTrendIcon(change: number): string {
    if (change > 0) return '↗️'
    if (change < 0) return '↘️'
    return '➡️'
  }

  /**
   * Calculate days until target date
   */
  static getDaysUntilTarget(targetDate: string): number {
    const today = new Date()
    const target = new Date(targetDate)
    const diffTime = target.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * Get status color based on benchmark percentile
   */
  static getBenchmarkStatusColor(status: PerformanceBenchmark['status']): string {
    switch (status) {
      case 'above_average': return 'text-green-500'
      case 'average': return 'text-yellow-500'
      case 'below_average': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  /**
   * Calculate progress bar width for goals
   */
  static getGoalProgressWidth(currentValue: number, targetValue: number): number {
    if (targetValue === 0) return 0
    return Math.min(100, Math.max(0, (currentValue / targetValue) * 100))
  }

  /**
   * Get difficulty badge color
   */
  static getDifficultyColor(difficulty: string): string {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  /**
   * Parse pattern type for display
   */
  static formatPatternType(patternType: string): string {
    return patternType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * Get segment icon based on type
   */
  static getSegmentIcon(segmentType: string): string {
    switch (segmentType.toLowerCase()) {
      case 'high_value': return '💎'
      case 'premium': return '⭐'
      case 'loyal': return '❤️'
      case 'churn_risk': return '⚠️'
      case 'casual': return '👤'
      default: return '👥'
    }
  }

  /**
   * Calculate chart color based on value range
   */
  static getChartColor(value: number, min: number, max: number): string {
    const ratio = (value - min) / (max - min)
    if (ratio >= 0.8) return '#10b981' // Green
    if (ratio >= 0.6) return '#f59e0b' // Yellow
    if (ratio >= 0.4) return '#ef4444' // Red
    return '#6b7280' // Gray
  }
}

// ====== EXPORT DEFAULT INSTANCE ======

export const aiAnalyticsAPI = new AIAnalyticsAPI()
export default aiAnalyticsAPI

// ====== HOOK FOR REACT COMPONENTS ======

export interface UseAIAnalyticsOptions {
  enabled?: boolean
  refreshInterval?: number
}

export interface UseAIAnalyticsReturn {
  dashboard: AIAnalyticsDashboard | null
  patterns: RevenuePattern[]
  predictions: RevenuePrediction[]
  insights: RevenueInsight[]
  benchmarks: PerformanceBenchmark[]
  goals: OptimizationGoal[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  exportData: (format: 'csv' | 'pdf' | 'excel') => Promise<void>
}

// Note: The actual React hook implementation would go in a separate hooks file
// This is just the interface definition for now
