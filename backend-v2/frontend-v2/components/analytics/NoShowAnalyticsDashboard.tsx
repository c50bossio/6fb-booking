'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { format, isToday, parseISO } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  BeakerIcon,
  BoltIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  UsersIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { apiClient } from '@/lib/api/client'

interface AnalyticsDashboardProps {
  timeRange?: string
  refreshInterval?: number
  className?: string
}

interface DashboardData {
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

interface LivePrediction {
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

export function NoShowAnalyticsDashboard({
  timeRange = "24h",
  refreshInterval = 30000,
  className = ""
}: AnalyticsDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [livePredictions, setLivePredictions] = useState<LivePrediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState<'overview' | 'predictions' | 'insights'>('overview')

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await apiClient.get<DashboardData>(
        `/api/v1/realtime-analytics/dashboard?time_range=${timeRange}`
      )
      setDashboardData(response)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setError('Failed to load analytics dashboard')
    }
  }, [timeRange])

  // Fetch live predictions
  const fetchLivePredictions = useCallback(async () => {
    try {
      const response = await apiClient.get<{predictions: LivePrediction[]}>(
        `/api/v1/realtime-analytics/predictions?hours_ahead=48&include_low_risk=false`
      )
      setLivePredictions(response.predictions || [])
    } catch (err) {
      console.error('Failed to fetch live predictions:', err)
    }
  }, [])

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchDashboardData(), fetchLivePredictions()])
      setLoading(false)
      setLastRefresh(new Date())
    }
    loadData()
  }, [fetchDashboardData, fetchLivePredictions])

  // Auto-refresh
  useEffect(() => {
    if (!refreshInterval) return

    const interval = setInterval(async () => {
      await Promise.all([fetchDashboardData(), fetchLivePredictions()])
      setLastRefresh(new Date())
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval, fetchDashboardData, fetchLivePredictions])

  // Get risk level color
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-green-600 bg-green-50'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50'
      case 'HIGH': return 'text-orange-600 bg-orange-50'
      case 'CRITICAL': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  // Get alert severity color
  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'border-blue-200 bg-blue-50'
      case 'medium': return 'border-yellow-200 bg-yellow-50'
      case 'high': return 'border-orange-200 bg-orange-50'
      case 'critical': return 'border-red-200 bg-red-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  if (loading && !dashboardData) {
    return (
      <div className={`analytics-dashboard h-full flex items-center justify-center bg-gray-50 ${className}`}>
        <div className="text-center">
          <motion.div
            className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-gray-600">Loading analytics dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`analytics-dashboard h-full flex items-center justify-center bg-gray-50 ${className}`}>
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Dashboard Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Retry Loading
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`analytics-dashboard h-full bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI No-Show Analytics</h1>
            <p className="text-sm text-gray-600">
              Real-time insights and predictions powered by AI
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* System status indicator */}
            <div className="flex items-center space-x-2">
              <motion.div
                className={`w-3 h-3 rounded-full ${
                  dashboardData?.dashboard_metadata.system_status === 'healthy' 
                    ? 'bg-green-400' 
                    : dashboardData?.dashboard_metadata.system_status === 'warning'
                    ? 'bg-yellow-400'
                    : 'bg-red-400'
                }`}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-xs text-gray-500">
                {dashboardData?.dashboard_metadata.system_status || 'Unknown'}
              </span>
            </div>
            
            {/* Last refresh */}
            <div className="text-xs text-gray-500">
              Last updated: {format(lastRefresh, 'HH:mm:ss')}
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="mt-4 flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'overview', label: 'Overview', icon: ChartBarIcon },
            { id: 'predictions', label: 'Live Predictions', icon: CpuChipIcon },
            { id: 'insights', label: 'AI Insights', icon: BeakerIcon }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                activeTab === tab.id 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="p-6 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Key metrics cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  title="No-Show Rate"
                  value={`${dashboardData?.live_metrics.current_no_show_rate || 0}%`}
                  change={-2.3}
                  icon={TrendingDownIcon}
                  color="green"
                />
                <MetricCard
                  title="AI Accuracy"
                  value={`${dashboardData?.live_metrics.prediction_accuracy || 0}%`}
                  change={+1.2}
                  icon={CpuChipIcon}
                  color="blue"
                />
                <MetricCard
                  title="Revenue Saved"
                  value={`$${dashboardData?.live_metrics.revenue_saved_today || 0}`}
                  change={+15.8}
                  icon={CurrencyDollarIcon}
                  color="green"
                />
                <MetricCard
                  title="High Risk Today"
                  value={`${dashboardData?.live_metrics.high_risk_appointments || 0}`}
                  change={-8.4}
                  icon={ExclamationTriangleIcon}
                  color="orange"
                />
              </div>

              {/* Risk distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ChartBarIcon className="w-5 h-5 mr-2" />
                    Risk Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(dashboardData?.risk_distribution || {}).map(([level, count]) => (
                      <div key={level} className="text-center">
                        <div className={`p-3 rounded-lg ${getRiskColor(level)}`}>
                          <div className="text-2xl font-bold">{count}</div>
                          <div className="text-xs uppercase tracking-wide">{level}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Active alerts */}
              {dashboardData?.active_alerts && dashboardData.active_alerts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BoltIcon className="w-5 h-5 mr-2" />
                      Active Alerts ({dashboardData.active_alerts.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dashboardData.active_alerts.slice(0, 5).map((alert) => (
                      <div 
                        key={alert.id}
                        className={`p-3 rounded-lg border-l-4 ${getAlertColor(alert.severity)}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{alert.message}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {alert.alert_type} • {format(parseISO(alert.created_at), 'HH:mm')}
                            </div>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {alert.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {activeTab === 'predictions' && (
            <motion.div
              key="predictions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CpuChipIcon className="w-5 h-5 mr-2" />
                    Live Predictions (Next 48 Hours)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {livePredictions.length > 0 ? (
                    <div className="space-y-3">
                      {livePredictions.map((prediction) => (
                        <div 
                          key={prediction.appointment_id}
                          className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {prediction.client_name}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {format(parseISO(prediction.appointment_time), 'MMM d, h:mm a')} • {prediction.barber_name}
                                  </div>
                                </div>
                                <Badge className={getRiskColor(prediction.risk_level)}>
                                  {prediction.risk_level}
                                </Badge>
                              </div>
                              
                              <div className="mt-2 text-xs text-gray-500">
                                Risk factors: {prediction.risk_factors.join(', ')}
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">
                                ${prediction.potential_revenue_loss}
                              </div>
                              {prediction.intervention_recommended && (
                                <Badge variant="outline" className="mt-1">
                                  Action Needed
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ShieldCheckIcon className="w-12 h-12 text-green-400 mx-auto mb-3" />
                      <p className="text-gray-600">No high-risk appointments predicted</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* AI Learning Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BeakerIcon className="w-5 h-5 mr-2" />
                    AI Learning Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {dashboardData?.ai_learning_progress.model_accuracy_trend || 0}%
                      </div>
                      <div className="text-xs text-gray-500">Model Accuracy</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {dashboardData?.ai_learning_progress.confidence_level || 0}%
                      </div>
                      <div className="text-xs text-gray-500">Confidence Level</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {dashboardData?.ai_learning_progress.data_quality_score || 0}%
                      </div>
                      <div className="text-xs text-gray-500">Data Quality</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {dashboardData?.ai_learning_progress.learning_rate || 0}%
                      </div>
                      <div className="text-xs text-gray-500">Learning Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Optimization Recommendations */}
              {dashboardData?.optimization_recommendations && dashboardData.optimization_recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUpIcon className="w-5 h-5 mr-2" />
                      AI Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dashboardData.optimization_recommendations.map((rec, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{rec.category}</span>
                          <div className="flex space-x-2">
                            <Badge 
                              variant="outline" 
                              className={
                                rec.impact === 'high' ? 'border-green-500 text-green-700' :
                                rec.impact === 'medium' ? 'border-yellow-500 text-yellow-700' :
                                'border-gray-500 text-gray-700'
                              }
                            >
                              {rec.impact} impact
                            </Badge>
                            <Badge variant="secondary">
                              {rec.implementation_effort}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{rec.recommendation}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Metric card component
interface MetricCardProps {
  title: string
  value: string
  change: number
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  color: 'green' | 'blue' | 'orange' | 'red'
}

function MetricCard({ title, value, change, icon: Icon, color }: MetricCardProps) {
  const colorClasses = {
    green: 'text-green-600 bg-green-50',
    blue: 'text-blue-600 bg-blue-50',
    orange: 'text-orange-600 bg-orange-50',
    red: 'text-red-600 bg-red-50'
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <div className="flex items-center mt-1">
              {change >= 0 ? (
                <TrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <TrendingDownIcon className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change >= 0 ? '+' : ''}{change}%
              </span>
            </div>
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default NoShowAnalyticsDashboard