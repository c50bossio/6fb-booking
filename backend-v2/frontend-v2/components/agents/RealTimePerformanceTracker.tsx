'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Zap, 
  Target, 
  RefreshCw,
  Wifi,
  WifiOff,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
  Bell,
  Eye,
  Play,
  Pause
} from 'lucide-react'
import { AgentAnalytics, agentsApi } from '@/lib/api/agents'

interface RealTimePerformanceTrackerProps {
  initialData?: AgentAnalytics
  autoRefresh?: boolean
  refreshInterval?: number
}

interface PerformanceAlert {
  id: string
  type: 'warning' | 'error' | 'success' | 'info'
  title: string
  message: string
  timestamp: string
  actionable?: boolean
}

interface LiveMetric {
  current: number
  previous: number
  trend: 'up' | 'down' | 'stable'
  change: number
}

export function RealTimePerformanceTracker({ 
  initialData, 
  autoRefresh = true, 
  refreshInterval = 30000 
}: RealTimePerformanceTrackerProps) {
  const [data, setData] = useState<AgentAnalytics | null>(initialData || null)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [isConnected, setIsConnected] = useState(true)
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [refreshEnabled, setRefreshEnabled] = useState(autoRefresh)
  const [countdown, setCountdown] = useState(refreshInterval / 1000)

  // Live metrics tracking
  const [liveMetrics, setLiveMetrics] = useState<{
    conversations: LiveMetric
    revenue: LiveMetric
    responseTime: LiveMetric
    successRate: LiveMetric
  }>({
    conversations: { current: 0, previous: 0, trend: 'stable', change: 0 },
    revenue: { current: 0, previous: 0, trend: 'stable', change: 0 },
    responseTime: { current: 0, previous: 0, trend: 'stable', change: 0 },
    successRate: { current: 0, previous: 0, trend: 'stable', change: 0 }
  })

  // Calculate trend and change for metrics
  const calculateMetricTrend = useCallback((current: number, previous: number): LiveMetric => {
    const change = previous > 0 ? ((current - previous) / previous) * 100 : 0
    let trend: 'up' | 'down' | 'stable' = 'stable'
    
    if (Math.abs(change) > 5) {
      trend = change > 0 ? 'up' : 'down'
    }
    
    return { current, previous, trend, change }
  }, [])

  // Update live metrics when data changes
  useEffect(() => {
    if (data) {
      setLiveMetrics(prev => ({
        conversations: calculateMetricTrend(
          data.current_period_performance.today_conversations,
          prev.conversations.current
        ),
        revenue: calculateMetricTrend(
          data.current_period_performance.today_revenue,
          prev.revenue.current
        ),
        responseTime: calculateMetricTrend(
          data.average_response_time,
          prev.responseTime.current
        ),
        successRate: calculateMetricTrend(
          data.success_rate,
          prev.successRate.current
        )
      }))
    }
  }, [data, calculateMetricTrend])

  // Generate performance alerts
  const generateAlerts = useCallback((analytics: AgentAnalytics): PerformanceAlert[] => {
    const newAlerts: PerformanceAlert[] = []
    const timestamp = new Date().toISOString()

    // Low success rate alert
    if (analytics.success_rate < 60) {
      newAlerts.push({
        id: 'low-success-rate',
        type: 'warning',
        title: 'Low Success Rate Detected',
        message: `Current success rate is ${analytics.success_rate.toFixed(1)}%. Consider reviewing agent configurations.`,
        timestamp,
        actionable: true
      })
    }

    // High response time alert
    if (analytics.average_response_time > 30) {
      newAlerts.push({
        id: 'high-response-time',
        type: 'warning',
        title: 'Slow Response Time',
        message: `Average response time is ${agentsApi.formatResponseTime(analytics.average_response_time)}. Performance may be impacted.`,
        timestamp,
        actionable: true
      })
    }

    // Revenue milestone achievement
    if (analytics.current_period_performance.today_revenue > 1000) {
      newAlerts.push({
        id: 'revenue-milestone',
        type: 'success',
        title: 'Revenue Milestone!',
        message: `Today's revenue has exceeded $1,000! Current: ${agentsApi.formatRevenue(analytics.current_period_performance.today_revenue)}`,
        timestamp
      })
    }

    // No active agents alert
    if (analytics.current_period_performance.agents_running === 0) {
      newAlerts.push({
        id: 'no-active-agents',
        type: 'error',
        title: 'No Active Agents',
        message: 'All agents are currently stopped. Activate agents to start processing conversations.',
        timestamp,
        actionable: true
      })
    }

    return newAlerts
  }, [])

  // Fetch real-time data
  const fetchRealTimeData = useCallback(async () => {
    try {
      setIsLoading(true)
      setIsConnected(true)
      
      const analytics = await agentsApi.getAgentAnalytics()
      setData(analytics)
      setLastUpdated(new Date().toLocaleTimeString())
      
      // Generate alerts based on new data
      const newAlerts = generateAlerts(analytics)
      setAlerts(prev => {
        // Keep only recent alerts and add new ones
        const recentAlerts = prev.filter(alert => 
          Date.now() - new Date(alert.timestamp).getTime() < 300000 // 5 minutes
        )
        return [...recentAlerts, ...newAlerts]
      })
      
    } catch (error) {
      console.error('Failed to fetch real-time data:', error)
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }, [generateAlerts])

  // Auto-refresh logic
  useEffect(() => {
    if (!refreshEnabled) return

    fetchRealTimeData()
    
    const interval = setInterval(fetchRealTimeData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshEnabled, refreshInterval, fetchRealTimeData])

  // Countdown timer for next refresh
  useEffect(() => {
    if (!refreshEnabled) return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          return refreshInterval / 1000
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [refreshEnabled, refreshInterval])

  // Format helper functions
  const formatCurrency = (amount: number) => agentsApi.formatRevenue(amount)
  const formatPercentage = (value: number) => agentsApi.formatPercentage(value)
  const formatResponseTime = (time: number) => agentsApi.formatResponseTime(time)

  const getTrendIcon = (trend: 'up' | 'down' | 'stable', positive = true) => {
    if (trend === 'stable') return <Minus className="w-4 h-4 text-gray-500" />
    if (trend === 'up') {
      return positive ? 
        <ArrowUp className="w-4 h-4 text-green-600" /> : 
        <ArrowUp className="w-4 h-4 text-red-600" />
    }
    return positive ? 
      <ArrowDown className="w-4 h-4 text-red-600" /> : 
      <ArrowDown className="w-4 h-4 text-green-600" />
  }

  const getAlertIcon = (type: PerformanceAlert['type']) => {
    switch (type) {
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />
      default: return <Bell className="w-4 h-4 text-blue-500" />
    }
  }

  const getAlertColors = (type: PerformanceAlert['type']) => {
    switch (type) {
      case 'error': return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
      case 'warning': return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
      case 'success': return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
      default: return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
    }
  }

  if (!data && isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading real-time data...</span>
        </div>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <WifiOff className="w-8 h-8 text-red-400" />
          <span className="ml-2 text-red-600 dark:text-red-400">Failed to load performance data</span>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Real-Time Header with Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <Wifi className="w-5 h-5 text-green-600" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-600" />
              )}
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Real-Time Performance
              </h2>
            </div>
            <Badge variant={isConnected ? 'success' : 'destructive'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Last updated: {lastUpdated}
            </span>
            
            {refreshEnabled && (
              <span className="text-sm text-gray-500 dark:text-gray-500">
                Next refresh: {countdown}s
              </span>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setRefreshEnabled(!refreshEnabled)}
              className="flex items-center space-x-1"
            >
              {refreshEnabled ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Resume</span>
                </>
              )}
            </Button>

            <Button
              size="sm"
              onClick={fetchRealTimeData}
              disabled={isLoading}
              className="flex items-center space-x-1"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Today's Live Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Conversations */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Today's Conversations
              </span>
            </div>
            {getTrendIcon(liveMetrics.conversations.trend)}
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.current_period_performance.today_conversations}
            </p>
            {liveMetrics.conversations.change !== 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {liveMetrics.conversations.change > 0 ? '+' : ''}
                {liveMetrics.conversations.change.toFixed(1)}% since last update
              </p>
            )}
          </div>
        </Card>

        {/* Today's Revenue */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Today's Revenue
              </span>
            </div>
            {getTrendIcon(liveMetrics.revenue.trend)}
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(data.current_period_performance.today_revenue)}
            </p>
            {liveMetrics.revenue.change !== 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {liveMetrics.revenue.change > 0 ? '+' : ''}
                {liveMetrics.revenue.change.toFixed(1)}% vs previous
              </p>
            )}
          </div>
        </Card>

        {/* Active Conversations */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Chats
              </span>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.current_period_performance.active_conversations}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Live conversations
            </p>
          </div>
        </Card>

        {/* Running Agents */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Agents
              </span>
            </div>
            <Badge variant={data.current_period_performance.agents_running > 0 ? 'success' : 'destructive'}>
              {data.current_period_performance.agents_running > 0 ? 'Online' : 'Offline'}
            </Badge>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.current_period_performance.agents_running}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              of {data.total_agents} total agents
            </p>
          </div>
        </Card>
      </div>

      {/* Performance Indicators */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Performance Indicators
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Success Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Success Rate
              </span>
              {getTrendIcon(liveMetrics.successRate.trend)}
            </div>
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-green-600" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {formatPercentage(data.success_rate)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${data.success_rate}%` }}
              />
            </div>
          </div>

          {/* Response Time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg Response Time
              </span>
              {getTrendIcon(liveMetrics.responseTime.trend, false)}
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {formatResponseTime(data.average_response_time)}
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Target: &lt; 10s
            </div>
          </div>

          {/* ROI */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                ROI
              </span>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {(data.roi ?? 0).toFixed(1)}x
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Revenue vs costs
            </div>
          </div>
        </div>
      </Card>

      {/* Performance Alerts */}
      {alerts.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Bell className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Performance Alerts
            </h3>
            <Badge variant="secondary">{alerts.length}</Badge>
          </div>
          
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${getAlertColors(alert.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getAlertIcon(alert.type)}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {alert.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {alert.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  
                  {alert.actionable && (
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {alerts.length > 5 && (
            <div className="mt-3 text-center">
              <Button variant="outline" size="sm">
                View All Alerts ({alerts.length})
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Quick Action Recommendations */}
      {data.optimization_recommendations && data.optimization_recommendations.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.optimization_recommendations.slice(0, 4).map((rec, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={agentsApi.getRecommendationPriorityColor(rec.priority)}>
                    {rec.priority}
                  </Badge>
                  <Button size="sm" variant="outline">
                    {rec.action}
                  </Button>
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  {rec.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {rec.description}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}