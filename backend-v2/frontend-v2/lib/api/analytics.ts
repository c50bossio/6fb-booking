/**
 * Analytics API Client
 * 
 * Provides comprehensive business analytics functionality including:
 * - Dashboard analytics and KPIs
 * - Revenue analytics and reporting
 * - Appointment metrics and patterns
 * - Client retention and lifetime value
 * - Barber performance metrics
 * - Six Figure Barber methodology calculations
 * - Comparative analytics and benchmarking
 * - Business insights and recommendations
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ===============================
// TypeScript Interfaces
// ===============================

export interface DateRange {
  start_date: string // YYYY-MM-DD format
  end_date: string   // YYYY-MM-DD format
}

export interface AnalyticsFilters {
  user_id?: number
  start_date?: string
  end_date?: string
  group_by?: 'day' | 'week' | 'month' | 'year'
}

export interface AnalyticsResponse {
  generated_at: string
  date_range?: {
    start_date: string
    end_date: string
  }
  user_id?: number
}

export interface DashboardAnalytics extends AnalyticsResponse {
  key_metrics: {
    total_revenue: number
    total_appointments: number
    total_clients: number
    average_ticket: number
    revenue_growth: number
    appointment_growth: number
    client_retention_rate: number
    no_show_rate: number
  }
  revenue_analytics: {
    current_period: number
    previous_period: number
    growth_rate: number
    trend: 'up' | 'down' | 'stable'
    monthly_breakdown: Array<{
      month: string
      revenue: number
      appointments: number
    }>
  }
  appointment_analytics: {
    total_appointments: number
    completed_appointments: number
    cancelled_appointments: number
    no_shows: number
    completion_rate: number
    by_service: Record<string, number>
    by_time_slot: Record<string, number>
  }
  retention_metrics: {
    retention_rate: number
    new_clients: number
    returning_clients: number
    churn_rate: number
    avg_visits_per_client: number
  }
  clv_analytics: {
    average_lifetime_value: number
    median_lifetime_value: number
    total_lifetime_value: number
    clv_by_segment: Record<string, number>
  }
  pattern_analytics: {
    peak_hours: string[]
    peak_days: string[]
    seasonality_trends: Record<string, number>
    booking_lead_time: number
  }
  comparative_data: {
    revenue_vs_previous: number
    appointments_vs_previous: number
    clients_vs_previous: number
    performance_vs_target: number
  }
  business_insights: BusinessInsight[]
  quick_actions: QuickAction[]
  barber_performance?: BarberPerformanceMetrics
}

export interface RevenueAnalytics extends AnalyticsResponse {
  summary: {
    total_revenue: number
    average_revenue_per_appointment: number
    revenue_growth_rate: number
    revenue_per_client: number
    peak_revenue_period: string
  }
  data: Array<{
    period: string
    revenue: number
    appointments: number
    average_ticket: number
    growth_rate?: number
  }>
  trends: {
    direction: 'up' | 'down' | 'stable'
    percentage_change: number
    trend_description: string
  }
}

export interface AppointmentAnalytics extends AnalyticsResponse {
  summary: {
    total_appointments: number
    completed_appointments: number
    cancelled_appointments: number
    no_shows: number
    completion_rate: number
    average_duration: number
  }
  by_service: Record<string, {
    count: number
    revenue: number
    completion_rate: number
  }>
  by_time_slot: Record<string, {
    count: number
    completion_rate: number
    peak_indicator: boolean
  }>
  patterns: {
    busiest_day: string
    busiest_hour: string
    seasonal_trends: Record<string, number>
  }
}

export interface ClientRetentionAnalytics extends AnalyticsResponse {
  summary: {
    retention_rate: number
    churn_rate: number
    new_clients: number
    returning_clients: number
    average_visits_per_client: number
    client_lifetime_value: number
  }
  segments: {
    by_visit_frequency: Record<string, number>
    by_spending_level: Record<string, number>
    by_loyalty_tier: Record<string, number>
  }
  trends: {
    retention_trend: Array<{
      period: string
      retention_rate: number
      new_clients: number
      churn_count: number
    }>
    cohort_analysis: Record<string, number>
  }
}

export interface BarberPerformanceMetrics extends AnalyticsResponse {
  summary: {
    total_revenue: number
    total_appointments: number
    completion_rate: number
    average_rating: number
    client_satisfaction: number
  }
  revenue: {
    monthly_revenue: number
    revenue_per_appointment: number
    revenue_growth: number
    commission_earned: number
  }
  efficiency: {
    appointments_per_day: number
    utilization_rate: number
    punctuality_score: number
    cancellation_rate: number
  }
  client_metrics: {
    total_clients: number
    new_clients: number
    repeat_clients: number
    client_retention_rate: number
    referral_rate: number
  }
  service_performance: Record<string, {
    count: number
    revenue: number
    completion_rate: number
    average_rating: number
  }>
  peak_performance: {
    best_day_of_week: string
    best_time_of_day: string
    peak_months: string[]
  }
}

export interface SixFigureBarberMetrics extends AnalyticsResponse {
  current_performance: {
    annual_revenue: number
    monthly_average: number
    weekly_average: number
    daily_average: number
    appointments_per_day: number
    average_ticket: number
  }
  targets: {
    annual_goal: number
    monthly_goal: number
    weekly_goal: number
    daily_goal: number
    required_appointments_per_day: number
    target_average_ticket: number
  }
  recommendations: {
    price_optimization: {
      current_pricing: Record<string, number>
      recommended_pricing: Record<string, number>
      potential_revenue_increase: number
    }
    booking_optimization: {
      current_utilization: number
      target_utilization: number
      additional_slots_needed: number
    }
    service_mix_optimization: {
      current_mix: Record<string, number>
      recommended_mix: Record<string, number>
      revenue_impact: number
    }
  }
  action_items: Array<{
    priority: 'high' | 'medium' | 'low'
    category: string
    action: string
    impact: string
    effort: string
  }>
}

export interface BusinessInsight {
  type: 'revenue' | 'retention' | 'efficiency' | 'opportunity' | 'warning'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  impact: string
  recommendation: string
  data_points?: Record<string, any>
}

export interface QuickAction {
  type: 'pricing' | 'scheduling' | 'marketing' | 'operations'
  title: string
  description: string
  estimated_impact: string
  difficulty: 'easy' | 'medium' | 'hard'
  time_to_implement: string
}

export interface BusinessRecommendation {
  category: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  estimated_impact: {
    revenue_increase: number
    time_to_impact: string
    confidence_level: number
  }
  implementation_steps: string[]
}

export interface PerformanceScore {
  overall_score: number
  category_scores: {
    revenue: number
    efficiency: number
    client_satisfaction: number
    growth: number
  }
  benchmarks: {
    industry_average: number
    top_performers: number
    your_position: 'top_10' | 'top_25' | 'top_50' | 'below_average'
  }
}

export interface BusinessInsightsResponse extends AnalyticsResponse {
  insights: BusinessInsight[]
  quick_actions: QuickAction[]
  performance_score: PerformanceScore
  recommendations: BusinessRecommendation[]
  benchmarks: {
    industry_averages: Record<string, number>
    peer_comparisons: Record<string, number>
    growth_targets: Record<string, number>
  }
}

export interface ComparativeAnalytics extends AnalyticsResponse {
  current_period: {
    revenue: number
    appointments: number
    clients: number
    average_ticket: number
  }
  comparison_period: {
    revenue: number
    appointments: number
    clients: number
    average_ticket: number
  }
  changes: {
    revenue_change: number
    revenue_change_percent: number
    appointments_change: number
    appointments_change_percent: number
    clients_change: number
    clients_change_percent: number
    average_ticket_change: number
    average_ticket_change_percent: number
  }
  trends: {
    revenue_trend: 'improving' | 'declining' | 'stable'
    efficiency_trend: 'improving' | 'declining' | 'stable'
    client_growth_trend: 'improving' | 'declining' | 'stable'
  }
}

export interface AnalyticsExportRequest {
  export_type: 'dashboard' | 'revenue' | 'appointments' | 'clients' | 'performance'
  format: 'json' | 'csv' | 'excel'
  start_date?: string
  end_date?: string
  user_id?: number
}

export interface AnalyticsExportResponse {
  export_type: string
  format: string
  generated_at: string
  date_range: {
    start_date?: string
    end_date?: string
  }
  user_id?: number
  data: any
  download_url?: string
  note?: string
}

// ===============================
// Utility Functions
// ===============================

/**
 * Get authorization headers with current JWT token
 */
import { getAccessToken } from '../tokenManager'

function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken()
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

/**
 * Handle API response and extract data
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(errorData.detail || `Request failed with status ${response.status}`)
  }
  return response.json()
}

/**
 * Build query string from parameters
 */
function buildQueryString(params: Record<string, any>): string {
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  
  return filtered.length > 0 ? `?${filtered.join('&')}` : ''
}

// ===============================
// Analytics API Client
// ===============================

export const analyticsApi = {
  // ===============================
  // Dashboard Analytics
  // ===============================

  /**
   * Get comprehensive dashboard analytics
   */
  async getDashboardAnalytics(filters: AnalyticsFilters = {}): Promise<DashboardAnalytics> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/analytics/dashboard${buildQueryString(filters)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Get dashboard analytics for specific user
   */
  async getDashboardAnalyticsByUser(userId: number, filters: Omit<AnalyticsFilters, 'user_id'> = {}): Promise<DashboardAnalytics> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/analytics/dashboard/${userId}${buildQueryString(filters)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  // ===============================
  // Revenue Analytics
  // ===============================

  /**
   * Get revenue analytics with grouping options
   */
  async getRevenueAnalytics(filters: AnalyticsFilters = {}): Promise<RevenueAnalytics> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/analytics/revenue${buildQueryString(filters)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  // ===============================
  // Appointment Analytics
  // ===============================

  /**
   * Get appointment analytics and metrics
   */
  async getAppointmentAnalytics(filters: AnalyticsFilters = {}): Promise<AppointmentAnalytics> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/analytics/appointments${buildQueryString(filters)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Get appointment patterns and trends
   */
  async getAppointmentPatterns(filters: AnalyticsFilters = {}): Promise<{
    patterns: Record<string, any>
    peak_hours: string[]
    peak_days: string[]
    seasonal_trends: Record<string, number>
  }> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/analytics/appointment-patterns${buildQueryString(filters)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  // ===============================
  // Client Analytics
  // ===============================

  /**
   * Get client retention analytics
   */
  async getClientRetentionAnalytics(filters: AnalyticsFilters = {}): Promise<ClientRetentionAnalytics> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/analytics/client-retention${buildQueryString(filters)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Get client lifetime value analytics
   */
  async getClientLifetimeValueAnalytics(filters: AnalyticsFilters = {}): Promise<{
    summary: Record<string, number>
    by_segment: Record<string, number>
    trends: Array<{ period: string; average_clv: number }>
  }> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/analytics/client-lifetime-value${buildQueryString(filters)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  // ===============================
  // Barber Performance
  // ===============================

  /**
   * Get barber performance metrics
   */
  async getBarberPerformanceMetrics(filters: AnalyticsFilters = {}): Promise<BarberPerformanceMetrics> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/analytics/barber-performance${buildQueryString(filters)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  // ===============================
  // Six Figure Barber Methodology
  // ===============================

  /**
   * Get Six Figure Barber methodology metrics and recommendations
   */
  async getSixFigureBarberMetrics(
    targetAnnualIncome: number = 100000,
    filters: Omit<AnalyticsFilters, 'user_id'> = {}
  ): Promise<SixFigureBarberMetrics> {
    const params = {
      target_annual_income: targetAnnualIncome,
      ...filters
    }

    const response = await fetch(
      `${API_BASE_URL}/api/v1/analytics/six-figure-barber${buildQueryString(params)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  // ===============================
  // Comparative Analytics
  // ===============================

  /**
   * Get comparative analytics against previous periods
   */
  async getComparativeAnalytics(
    comparisonPeriod: 'previous_month' | 'previous_quarter' | 'previous_year' = 'previous_month',
    filters: AnalyticsFilters = {}
  ): Promise<ComparativeAnalytics> {
    const params = {
      comparison_period: comparisonPeriod,
      ...filters
    }

    const response = await fetch(
      `${API_BASE_URL}/api/v1/analytics/comparative${buildQueryString(params)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  // ===============================
  // Business Insights
  // ===============================

  /**
   * Get AI-powered business insights and recommendations
   */
  async getBusinessInsights(filters: AnalyticsFilters = {}): Promise<BusinessInsightsResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/analytics/insights${buildQueryString(filters)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  // ===============================
  // Data Export
  // ===============================

  /**
   * Export analytics data in various formats
   */
  async exportAnalyticsData(exportRequest: AnalyticsExportRequest): Promise<AnalyticsExportResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/analytics/export${buildQueryString(exportRequest)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  // ===============================
  // Utility Methods
  // ===============================

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount)
  },

  /**
   * Format percentage for display
   */
  formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`
  },

  /**
   * Get trend indicator
   */
  getTrendIndicator(current: number, previous: number): {
    direction: 'up' | 'down' | 'stable'
    percentage: number
    color: string
  } {
    const percentage = previous === 0 ? 0 : ((current - previous) / previous) * 100
    
    let direction: 'up' | 'down' | 'stable' = 'stable'
    let color = 'gray'
    
    if (Math.abs(percentage) < 1) {
      direction = 'stable'
      color = 'gray'
    } else if (percentage > 0) {
      direction = 'up'
      color = 'green'
    } else {
      direction = 'down'
      color = 'red'
    }
    
    return { direction, percentage: Math.abs(percentage), color }
  },

  /**
   * Calculate growth rate
   */
  calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  },

  /**
   * Get performance score color
   */
  getPerformanceScoreColor(score: number): string {
    if (score >= 90) return 'green'
    if (score >= 80) return 'blue'
    if (score >= 70) return 'yellow'
    if (score >= 60) return 'orange'
    return 'red'
  },

  /**
   * Get priority color for insights and actions
   */
  getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
    const colorMap = {
      'high': 'red',
      'medium': 'yellow',
      'low': 'blue'
    }
    return colorMap[priority]
  },

  /**
   * Format date range for display
   */
  formatDateRange(startDate: string, endDate: string): string {
    const start = new Date(startDate).toLocaleDateString()
    const end = new Date(endDate).toLocaleDateString()
    return `${start} - ${end}`
  },

  /**
   * Calculate days in period
   */
  calculateDaysInPeriod(startDate: string, endDate: string): number {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  },

  /**
   * Get default date range for analytics (last 30 days)
   */
  getDefaultDateRange(): DateRange {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    
    return {
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0]
    }
  },

  /**
   * Get common date range presets
   */
  getDateRangePresets(): Record<string, DateRange> {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)
    
    const lastMonth = new Date(today)
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    
    const lastQuarter = new Date(today)
    lastQuarter.setMonth(lastQuarter.getMonth() - 3)
    
    const lastYear = new Date(today)
    lastYear.setFullYear(lastYear.getFullYear() - 1)
    
    return {
      'today': {
        start_date: today.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0]
      },
      'yesterday': {
        start_date: yesterday.toISOString().split('T')[0],
        end_date: yesterday.toISOString().split('T')[0]
      },
      'last_7_days': {
        start_date: lastWeek.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0]
      },
      'last_30_days': {
        start_date: lastMonth.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0]
      },
      'last_3_months': {
        start_date: lastQuarter.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0]
      },
      'last_year': {
        start_date: lastYear.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0]
      }
    }
  }
}

export default analyticsApi