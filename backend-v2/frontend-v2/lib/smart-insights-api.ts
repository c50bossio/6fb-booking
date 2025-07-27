/**
 * Smart Insights API Client Library
 * 
 * Provides a clean interface for interacting with the Smart Insights Hub API.
 * Handles authentication, error handling, and response parsing.
 */

import { getCookie } from 'cookies-next'

// Types for Smart Insights API
export interface InsightAction {
  type: string
  label: string
  description: string
  endpoint?: string
  params?: Record<string, any>
  icon?: string
}

export interface ConsolidatedInsight {
  id: string
  title: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: 'revenue' | 'retention' | 'efficiency' | 'growth' | 'quality' | 'opportunity' | 'risk'
  impact_score: number
  urgency_score: number
  confidence: number
  source: string
  metric_name: string
  current_value?: number
  target_value?: number
  trend?: string
  created_at: string
  expires_at?: string
  time_horizon: string
  actions: InsightAction[]
  recommended_action?: string
  tags: string[]
  related_clients: number[]
  related_appointments: number[]
}

export interface SmartInsightsResponse {
  critical_insights: ConsolidatedInsight[]
  priority_insight: ConsolidatedInsight | null
  insights_by_category: Record<string, ConsolidatedInsight[]>
  business_health_summary: Record<string, any>
  quick_actions: InsightAction[]
  total_insights: number
  last_updated: string
  metadata: {
    user_id: number
    include_predictions: boolean
    generated_at: string
  }
}

export interface PriorityInsightResponse {
  priority_insight: ConsolidatedInsight | null
  has_critical_insights: boolean
  critical_count: number
  business_health_level: string
  last_updated: string
}

export interface QuickActionsResponse {
  quick_actions: InsightAction[]
  total_actions: number
  action_types: string[]
  last_updated: string
}

export interface CategoryInsightsResponse {
  category: string
  insights: ConsolidatedInsight[]
  total_in_category: number
  returned: number
  last_updated: string
}

export interface ActionExecutionResponse {
  action_type: string
  status: string
  result: any
  executed_at: string
  insight_id?: string
}

export interface InsightsHealthResponse {
  status: 'healthy' | 'unhealthy'
  insights_generated?: number
  generation_time_seconds?: number
  critical_insights_count?: number
  business_health_available?: boolean
  last_successful_generation?: string
  system_performance?: {
    fast: boolean
    acceptable: boolean
    slow: boolean
  }
  error?: string
  checked_at: string
}

/**
 * Smart Insights API Client
 */
export class SmartInsightsAPI {
  private baseUrl: string
  private token: string | null

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
    this.token = null
  }

  /**
   * Get authentication token from cookies
   */
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null
    
    // Try to get token from cookies
    return getCookie('access_token') as string || null
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken()
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Smart Insights API Error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response.json()
  }

  /**
   * Get comprehensive smart insights dashboard
   */
  async getDashboard(options: {
    userId?: number
    includePredictions?: boolean
    forceRefresh?: boolean
  } = {}): Promise<SmartInsightsResponse> {
    const params = new URLSearchParams()
    
    if (options.userId) params.append('user_id', options.userId.toString())
    if (options.includePredictions !== undefined) {
      params.append('include_predictions', options.includePredictions.toString())
    }
    if (options.forceRefresh) params.append('force_refresh', 'true')

    const queryString = params.toString()
    const endpoint = `/api/v2/smart-insights/dashboard${queryString ? `?${queryString}` : ''}`

    return this.makeRequest<SmartInsightsResponse>(endpoint)
  }

  /**
   * Get the single most important insight
   */
  async getPriorityInsight(userId?: number): Promise<PriorityInsightResponse> {
    const params = new URLSearchParams()
    if (userId) params.append('user_id', userId.toString())

    const queryString = params.toString()
    const endpoint = `/api/v2/smart-insights/priority${queryString ? `?${queryString}` : ''}`

    return this.makeRequest<PriorityInsightResponse>(endpoint)
  }

  /**
   * Get insights filtered by category
   */
  async getInsightsByCategory(
    category: string,
    options: {
      userId?: number
      limit?: number
    } = {}
  ): Promise<CategoryInsightsResponse> {
    const params = new URLSearchParams()
    if (options.userId) params.append('user_id', options.userId.toString())
    if (options.limit) params.append('limit', options.limit.toString())

    const queryString = params.toString()
    const endpoint = `/api/v2/smart-insights/category/${category}${queryString ? `?${queryString}` : ''}`

    return this.makeRequest<CategoryInsightsResponse>(endpoint)
  }

  /**
   * Get quick actions derived from insights
   */
  async getQuickActions(options: {
    userId?: number
    actionType?: string
  } = {}): Promise<QuickActionsResponse> {
    const params = new URLSearchParams()
    if (options.userId) params.append('user_id', options.userId.toString())
    if (options.actionType) params.append('action_type', options.actionType)

    const queryString = params.toString()
    const endpoint = `/api/v2/smart-insights/actions${queryString ? `?${queryString}` : ''}`

    return this.makeRequest<QuickActionsResponse>(endpoint)
  }

  /**
   * Execute an insight action
   */
  async executeAction(
    actionType: string,
    options: {
      insightId?: string
      params?: Record<string, any>
    } = {}
  ): Promise<ActionExecutionResponse> {
    const params = new URLSearchParams()
    if (options.insightId) params.append('insight_id', options.insightId)

    const queryString = params.toString()
    const endpoint = `/api/v2/smart-insights/action/${actionType}${queryString ? `?${queryString}` : ''}`

    return this.makeRequest<ActionExecutionResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        params: options.params || {}
      })
    })
  }

  /**
   * Get insights system health status
   */
  async getHealthStatus(): Promise<InsightsHealthResponse> {
    return this.makeRequest<InsightsHealthResponse>('/api/v2/smart-insights/health')
  }

  /**
   * Refresh insights cache for a user
   */
  async refreshInsights(userId?: number): Promise<SmartInsightsResponse> {
    return this.getDashboard({
      userId,
      forceRefresh: true
    })
  }

  /**
   * Get available insight categories
   */
  getAvailableCategories(): string[] {
    return ['revenue', 'retention', 'efficiency', 'growth', 'quality', 'opportunity', 'risk']
  }

  /**
   * Get available action types
   */
  getAvailableActionTypes(): string[] {
    return [
      'schedule_client',
      'adjust_pricing', 
      'send_message',
      'view_analytics',
      'contact_client',
      'review_performance',
      'optimize_schedule',
      'implement_strategy'
    ]
  }

  /**
   * Format insight priority for display
   */
  formatPriority(priority: string): string {
    switch (priority) {
      case 'critical':
        return 'Critical'
      case 'high':
        return 'High'
      case 'medium':
        return 'Medium'
      case 'low':
        return 'Low'
      default:
        return priority.charAt(0).toUpperCase() + priority.slice(1)
    }
  }

  /**
   * Format insight category for display
   */
  formatCategory(category: string): string {
    switch (category) {
      case 'revenue':
        return 'Revenue'
      case 'retention':
        return 'Client Retention'
      case 'efficiency':
        return 'Operational Efficiency'
      case 'growth':
        return 'Business Growth'
      case 'quality':
        return 'Service Quality'
      case 'opportunity':
        return 'Growth Opportunity'
      case 'risk':
        return 'Risk Management'
      default:
        return category.charAt(0).toUpperCase() + category.slice(1)
    }
  }

  /**
   * Get priority color scheme for UI
   */
  getPriorityColors(priority: string): {
    bg: string
    text: string
    border: string
    badge: string
  } {
    switch (priority) {
      case 'critical':
        return {
          bg: 'bg-red-50 dark:bg-red-950',
          text: 'text-red-900 dark:text-red-100',
          border: 'border-red-200 dark:border-red-800',
          badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }
      case 'high':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950',
          text: 'text-amber-900 dark:text-amber-100',
          border: 'border-amber-200 dark:border-amber-800',
          badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
        }
      case 'medium':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950',
          text: 'text-blue-900 dark:text-blue-100',
          border: 'border-blue-200 dark:border-blue-800',
          badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        }
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-900',
          text: 'text-gray-900 dark:text-gray-100',
          border: 'border-gray-200 dark:border-gray-700',
          badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
        }
    }
  }

  /**
   * Calculate insights summary statistics
   */
  calculateSummaryStats(insights: ConsolidatedInsight[]): {
    totalInsights: number
    criticalCount: number
    highCount: number
    averageImpact: number
    averageUrgency: number
    topCategories: string[]
  } {
    if (!insights.length) {
      return {
        totalInsights: 0,
        criticalCount: 0,
        highCount: 0,
        averageImpact: 0,
        averageUrgency: 0,
        topCategories: []
      }
    }

    const criticalCount = insights.filter(i => i.priority === 'critical').length
    const highCount = insights.filter(i => i.priority === 'high').length
    
    const averageImpact = insights.reduce((sum, i) => sum + i.impact_score, 0) / insights.length
    const averageUrgency = insights.reduce((sum, i) => sum + i.urgency_score, 0) / insights.length

    // Get top categories by count
    const categoryCounts = insights.reduce((acc, insight) => {
      acc[insight.category] = (acc[insight.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topCategories = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category)

    return {
      totalInsights: insights.length,
      criticalCount,
      highCount,
      averageImpact: Math.round(averageImpact * 10) / 10,
      averageUrgency: Math.round(averageUrgency * 10) / 10,
      topCategories
    }
  }
}

// Export singleton instance
export const smartInsightsAPI = new SmartInsightsAPI()

// Export hook for React components
export function useSmartInsightsAPI() {
  return smartInsightsAPI
}