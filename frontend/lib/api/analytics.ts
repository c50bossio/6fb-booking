/**
 * Analytics API service
 */
import apiClient from './client'

interface SixFBScore {
  barber_id: number
  barber_name: string
  period: string
  start_date: string
  end_date: string
  overall_score: number
  components: Record<string, number>
  improvements_needed: string[]
}

interface BarberAnalytics {
  barber_info: Record<string, any>
  period: Record<string, any>
  performance_scores: Record<string, any>
  revenue_analysis: Record<string, any>
  client_analysis: Record<string, any>
  efficiency_metrics: Record<string, any>
  comparative_rankings: Record<string, any>
  improvement_recommendations: Array<Record<string, any>>
}

interface TeamComparison {
  summary: Record<string, any>
  location_comparisons: Array<Record<string, any>>
  top_performing_teams: Array<Record<string, any>>
  improvement_opportunities: Array<Record<string, any>>
  network_benchmarks: Record<string, any>
}

interface NetworkInsights {
  network_overview: Record<string, any>
  performance_distribution: Record<string, any>
  benchmarks: Record<string, any>
  trends: Record<string, any>
  improvement_opportunities: Array<Record<string, any>>
}

interface DashboardSummary {
  type: 'network' | 'location' | 'barber'
  location_id?: number
  metrics: Record<string, number>
}

interface TrendData {
  metric: string
  period_days: number
  location_id?: number
  barber_id?: number
  data: Array<{
    date: string
    value: number
  }>
}

export const analyticsService = {
  /**
   * Get 6FB score for a barber
   */
  async getSixFBScore(
    barberId: number,
    period: 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'weekly',
    startDate?: string,
    endDate?: string
  ): Promise<SixFBScore> {
    const params = new URLSearchParams({ period })
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)

    const response = await apiClient.get<SixFBScore>(
      `/analytics/sixfb-score/${barberId}?${params.toString()}`
    )
    return response.data
  },

  /**
   * Get detailed analytics for a barber
   */
  async getBarberAnalytics(barberId: number, periodDays: number = 30): Promise<BarberAnalytics> {
    const response = await apiClient.get<BarberAnalytics>(
      `/analytics/barber/${barberId}/detailed`,
      { params: { period_days: periodDays } }
    )
    return response.data
  },

  /**
   * Get team comparison analytics
   */
  async getTeamComparison(locationIds?: number[]): Promise<TeamComparison> {
    const params = new URLSearchParams()
    if (locationIds?.length) {
      locationIds.forEach(id => params.append('location_ids', id.toString()))
    }

    const response = await apiClient.get<TeamComparison>(
      `/analytics/team-comparison?${params.toString()}`
    )
    return response.data
  },

  /**
   * Get network-wide insights
   */
  async getNetworkInsights(): Promise<NetworkInsights> {
    const response = await apiClient.get<NetworkInsights>('/analytics/network-insights')
    return response.data
  },

  /**
   * Get dashboard summary data
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await apiClient.get<DashboardSummary>('/analytics/dashboard-summary')
    return response.data
  },

  /**
   * Get metric trends
   */
  async getMetricTrends(
    metric: 'revenue' | 'appointments' | 'sixfb_score' | 'retention' | 'efficiency',
    periodDays: number = 90,
    locationId?: number,
    barberId?: number
  ): Promise<TrendData> {
    const params = new URLSearchParams({
      period_days: periodDays.toString()
    })
    if (locationId) params.append('location_id', locationId.toString())
    if (barberId) params.append('barber_id', barberId.toString())

    const response = await apiClient.get<TrendData>(
      `/analytics/trends/${metric}?${params.toString()}`
    )
    return response.data
  },
}