/**
 * React hook for the AI-powered No-Show Analytics Dashboard
 * Provides real-time data, predictions, and insights from the AI no-show prevention system
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { APIClient } from '@/lib/api/client'

const apiClient = new APIClient()

export interface NoShowAnalyticsData {
  live_metrics: {
    current_no_show_rate: number
    prediction_accuracy: number
    intervention_success_rate: number
    average_risk_score: number
    total_appointments_today: number
    high_risk_appointments: number
    ai_prevented_no_shows: number
    revenue_saved_today: number
  }
  risk_distribution: {
    LOW: number
    MEDIUM: number
    HIGH: number
    CRITICAL: number
  }
  active_alerts: Array<{
    id: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    alert_type: string
    message: string
    created_at: string
    appointment_id?: number
  }>
  optimization_recommendations: Array<{
    category: string
    recommendation: string
    impact: 'low' | 'medium' | 'high'
    implementation_effort: 'easy' | 'moderate' | 'complex'
  }>
  ai_learning_progress: {
    model_accuracy_trend: number
    learning_rate: number
    data_quality_score: number
    confidence_level: number
  }
  performance_analytics: {
    intervention_response_rate: number
    message_engagement_rate: number
    behavioral_pattern_detection: number
    predictive_confidence: number
  }
  client_behavior_trends: {
    communication_preferences: Record<string, number>
    booking_patterns: Record<string, number>
    risk_factors: Record<string, number>
  }
  dashboard_metadata: {
    last_updated: string
    system_status: 'healthy' | 'warning' | 'error'
    ai_services_status: Record<string, string>
    refresh_rate: number
  }
}

export interface LivePrediction {
  appointment_id: number
  client_name: string
  appointment_time: string
  risk_score: number
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  risk_factors: string[]
  intervention_recommended: boolean
  potential_revenue_loss: number
  barber_name: string
}

export interface PredictionsResponse {
  predictions: LivePrediction[]
  prediction_metadata: {
    total_appointments: number
    high_risk_count: number
    revenue_at_risk: number
    last_updated: string
  }
  risk_summary: {
    low_risk: number
    medium_risk: number
    high_risk: number
    critical_risk: number
  }
}

export interface AnalyticsAlert {
  id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  alert_type: string
  message: string
  created_at: string
  appointment_id?: number
}

export interface AlertsResponse {
  alerts: AnalyticsAlert[]
  total_count: number
  active_critical_alerts: number
  last_updated: string
}

export interface UseNoShowAnalyticsOptions {
  timeRange?: string
  refreshInterval?: number
  autoRefresh?: boolean
  enablePredictions?: boolean
  enableAlerts?: boolean
}

export interface UseNoShowAnalyticsReturn {
  // Data
  dashboardData: NoShowAnalyticsData | null
  predictions: LivePrediction[]
  alerts: AnalyticsAlert[]
  
  // Loading states
  loading: boolean
  predictionsLoading: boolean
  alertsLoading: boolean
  
  // Error states
  error: string | null
  predictionsError: string | null
  alertsError: string | null
  
  // Actions
  refreshDashboard: () => Promise<void>
  refreshPredictions: () => Promise<void>
  refreshAlerts: () => Promise<void>
  refreshAll: () => Promise<void>
  
  // Utilities
  getMetricTrend: (metricKey: string) => 'up' | 'down' | 'stable'
  getSystemHealth: () => 'healthy' | 'warning' | 'error'
  getCriticalAlertsCount: () => number
  getHighRiskAppointmentsCount: () => number
  
  // Meta
  lastUpdated: Date | null
  isRealTimeActive: boolean
}

export function useNoShowAnalytics(options: UseNoShowAnalyticsOptions = {}): UseNoShowAnalyticsReturn {
  const {
    timeRange = '24h',
    refreshInterval = 30000,
    autoRefresh = true,
    enablePredictions = true,
    enableAlerts = true
  } = options

  // State
  const [dashboardData, setDashboardData] = useState<NoShowAnalyticsData | null>(null)
  const [predictions, setPredictions] = useState<LivePrediction[]>([])
  const [alerts, setAlerts] = useState<AnalyticsAlert[]>([])
  
  // Loading states
  const [loading, setLoading] = useState(true)
  const [predictionsLoading, setPredictionsLoading] = useState(false)
  const [alertsLoading, setAlertsLoading] = useState(false)
  
  // Error states
  const [error, setError] = useState<string | null>(null)
  const [predictionsError, setPredictionsError] = useState<string | null>(null)
  const [alertsError, setAlertsError] = useState<string | null>(null)
  
  // Meta state
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRealTimeActive, setIsRealTimeActive] = useState(false)
  
  // Refs for intervals
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isActiveRef = useRef(true)

  // Fetch dashboard data
  const refreshDashboard = useCallback(async () => {
    if (!isActiveRef.current) return
    
    try {
      setError(null)
      const response = await apiClient.get<NoShowAnalyticsData>(
        `/api/v2/realtime-analytics/dashboard?time_range=${timeRange}`
      )
      setDashboardData(response)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics dashboard')
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  // Fetch predictions
  const refreshPredictions = useCallback(async () => {
    if (!enablePredictions || !isActiveRef.current) return
    
    try {
      setPredictionsLoading(true)
      setPredictionsError(null)
      
      const response = await apiClient.get<PredictionsResponse>(
        `/api/v2/realtime-analytics/predictions?hours_ahead=48&include_low_risk=false`
      )
      setPredictions(response.predictions || [])
    } catch (err) {
      console.error('Failed to fetch predictions:', err)
      setPredictionsError(err instanceof Error ? err.message : 'Failed to load predictions')
    } finally {
      setPredictionsLoading(false)
    }
  }, [enablePredictions])

  // Fetch alerts
  const refreshAlerts = useCallback(async () => {
    if (!enableAlerts || !isActiveRef.current) return
    
    try {
      setAlertsLoading(true)
      setAlertsError(null)
      
      const response = await apiClient.get<AlertsResponse>(
        `/api/v2/realtime-analytics/alerts?limit=50`
      )
      setAlerts(response.alerts || [])
    } catch (err) {
      console.error('Failed to fetch alerts:', err)
      setAlertsError(err instanceof Error ? err.message : 'Failed to load alerts')
    } finally {
      setAlertsLoading(false)
    }
  }, [enableAlerts])

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshDashboard(),
      refreshPredictions(),
      refreshAlerts()
    ])
  }, [refreshDashboard, refreshPredictions, refreshAlerts])

  // Utility functions
  const getMetricTrend = useCallback((metricKey: string): 'up' | 'down' | 'stable' => {
    // This would compare with historical data if available
    // For now, return stable as default
    return 'stable'
  }, [])

  const getSystemHealth = useCallback((): 'healthy' | 'warning' | 'error' => {
    return dashboardData?.dashboard_metadata?.system_status || 'error'
  }, [dashboardData])

  const getCriticalAlertsCount = useCallback((): number => {
    return alerts.filter(alert => alert.severity === 'critical').length
  }, [alerts])

  const getHighRiskAppointmentsCount = useCallback((): number => {
    return dashboardData?.live_metrics?.high_risk_appointments || 0
  }, [dashboardData])

  // Initial load
  useEffect(() => {
    isActiveRef.current = true
    refreshAll()
  }, [refreshAll])

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || !refreshInterval) return

    setIsRealTimeActive(true)
    
    refreshIntervalRef.current = setInterval(() => {
      if (isActiveRef.current) {
        refreshAll()
      }
    }, refreshInterval)

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
      setIsRealTimeActive(false)
    }
  }, [autoRefresh, refreshInterval, refreshAll])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [])

  return {
    // Data
    dashboardData,
    predictions,
    alerts,
    
    // Loading states
    loading,
    predictionsLoading,
    alertsLoading,
    
    // Error states
    error,
    predictionsError,
    alertsError,
    
    // Actions
    refreshDashboard,
    refreshPredictions,
    refreshAlerts,
    refreshAll,
    
    // Utilities
    getMetricTrend,
    getSystemHealth,
    getCriticalAlertsCount,
    getHighRiskAppointmentsCount,
    
    // Meta
    lastUpdated,
    isRealTimeActive
  }
}

export default useNoShowAnalytics