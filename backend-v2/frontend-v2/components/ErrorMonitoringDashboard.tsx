'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  AlertCircle, 
  Activity, 
  DollarSign, 
  Users, 
  Clock, 
  TrendingUp,
  Shield,
  RefreshCw,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react'

interface ErrorMetrics {
  total_errors: number
  critical_errors: number
  revenue_blocking_errors: number
  user_blocking_errors: number
  total_revenue_impact: number
  affected_users: number
  average_resolution_time: number
  error_rate: number
  health_score: number
}

interface ErrorTrend {
  timestamp: string
  error_count: number
  revenue_impact: number
  health_score: number
}

interface DashboardData {
  generated_at: string
  time_range: string
  metrics: ErrorMetrics
  trends: ErrorTrend[]
  error_categories: Record<string, any>
  integration_health: Record<string, any>
  revenue_analysis: any
  alerts: any[]
  recommendations: any[]
}

interface ActiveAlert {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  message: string
  timestamp: string
  revenue_impact?: number
  affected_users?: number
}

const ErrorMonitoringDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h')
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch dashboard data
  const fetchDashboardData = async (timeRange: string = selectedTimeRange) => {
    try {
      const response = await fetch(`/api/v2/error-monitoring/dashboard/metrics?time_range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        setDashboardData(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    }
  }

  // Fetch active alerts
  const fetchActiveAlerts = async () => {
    try {
      const response = await fetch('/api/v2/error-monitoring/alerts/active', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        setActiveAlerts(result.data.active_alerts || [])
      }
    } catch (error) {
      console.error('Failed to fetch active alerts:', error)
    }
  }

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchDashboardData(),
        fetchActiveAlerts()
      ])
      setLoading(false)
    }
    
    loadData()
  }, [selectedTimeRange])

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchDashboardData()
      fetchActiveAlerts()
    }, 60000) // Refresh every minute

    return () => clearInterval(interval)
  }, [autoRefresh, selectedTimeRange])

  // Export error report
  const exportReport = async () => {
    try {
      const response = await fetch(`/api/v2/error-monitoring/dashboard/export?time_range=${selectedTimeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { 
          type: 'application/json' 
        })
        
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `error-report-${selectedTimeRange}-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export report:', error)
    }
  }

  // Get health status color and icon
  const getHealthStatus = (score: number) => {
    if (score >= 95) return { color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle, text: 'Healthy' }
    if (score >= 80) return { color: 'text-yellow-600', bg: 'bg-yellow-50', icon: AlertTriangle, text: 'Warning' }
    return { color: 'text-red-600', bg: 'bg-red-50', icon: XCircle, text: 'Critical' }
  }

  // Get alert severity styling
  const getAlertSeverity = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-800'
      case 'high': return 'bg-orange-50 border-orange-200 text-orange-800'
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      default: return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  if (loading) {
    return (
      <div className=\"flex items-center justify-center h-96\">
        <div className=\"flex items-center space-x-2\">
          <RefreshCw className=\"h-6 w-6 animate-spin\" />
          <span>Loading error monitoring dashboard...</span>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <Alert className=\"m-4\">
        <AlertCircle className=\"h-4 w-4\" />
        <AlertDescription>
          Failed to load error monitoring data. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    )
  }

  const healthStatus = getHealthStatus(dashboardData.metrics.health_score)
  const HealthIcon = healthStatus.icon

  return (
    <div className=\"space-y-6 p-6\">
      {/* Header */}
      <div className=\"flex justify-between items-center\">
        <div>
          <h1 className=\"text-3xl font-bold\">Error Monitoring Dashboard</h1>
          <p className=\"text-gray-600 mt-1\">
            Real-time system health and business impact monitoring
          </p>
        </div>
        
        <div className=\"flex items-center space-x-3\">
          {/* Time Range Selector */}
          <select 
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className=\"px-3 py-2 border border-gray-300 rounded-md\"
          >
            <option value=\"1h\">Last Hour</option>
            <option value=\"4h\">Last 4 Hours</option>
            <option value=\"24h\">Last 24 Hours</option>
            <option value=\"7d\">Last 7 Days</option>
            <option value=\"30d\">Last 30 Days</option>
          </select>
          
          {/* Auto-refresh Toggle */}
          <Button
            variant={autoRefresh ? \"default\" : \"outline\"}
            size=\"sm\"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          
          {/* Export Button */}
          <Button variant=\"outline\" size=\"sm\" onClick={exportReport}>
            <Download className=\"h-4 w-4 mr-2\" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div className=\"space-y-2\">
          <h2 className=\"text-lg font-semibold flex items-center\">
            <AlertCircle className=\"h-5 w-5 mr-2 text-red-500\" />
            Active Alerts ({activeAlerts.length})
          </h2>
          
          <div className=\"grid gap-3\">
            {activeAlerts.map((alert) => (
              <Alert key={alert.id} className={getAlertSeverity(alert.severity)}>
                <AlertDescription className=\"flex justify-between items-start\">
                  <div>
                    <div className=\"font-medium\">{alert.title}</div>
                    <div className=\"text-sm mt-1\">{alert.message}</div>
                    {alert.revenue_impact && (
                      <div className=\"text-sm mt-1\">
                        Revenue Impact: ${alert.revenue_impact.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <Badge variant=\"secondary\" className=\"text-xs\">
                    {alert.severity.toUpperCase()}
                  </Badge>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}

      {/* System Health Overview */}
      <div className=\"grid grid-cols-1 md:grid-cols-4 gap-6\">
        {/* Overall Health */}
        <Card className={healthStatus.bg}>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">System Health</CardTitle>
            <HealthIcon className={`h-4 w-4 ${healthStatus.color}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${healthStatus.color}`}>
              {dashboardData.metrics.health_score.toFixed(1)}%
            </div>
            <p className={`text-xs ${healthStatus.color}`}>
              {healthStatus.text}
            </p>
          </CardContent>
        </Card>

        {/* Total Errors */}
        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Total Errors</CardTitle>
            <Activity className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold\">{dashboardData.metrics.total_errors}</div>
            <div className=\"flex items-center text-xs text-muted-foreground mt-1\">
              <span className=\"text-red-600 font-medium\">
                {dashboardData.metrics.critical_errors} critical
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Impact */}
        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Revenue Impact</CardTitle>
            <DollarSign className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold\">
              ${dashboardData.metrics.total_revenue_impact.toFixed(2)}
            </div>
            <p className=\"text-xs text-muted-foreground\">
              Potential revenue loss
            </p>
          </CardContent>
        </Card>

        {/* Affected Users */}
        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">Affected Users</CardTitle>
            <Users className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold\">{dashboardData.metrics.affected_users}</div>
            <p className=\"text-xs text-muted-foreground\">
              Users impacted
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue=\"overview\" className=\"space-y-4\">
        <TabsList>
          <TabsTrigger value=\"overview\">Overview</TabsTrigger>
          <TabsTrigger value=\"categories\">Error Categories</TabsTrigger>
          <TabsTrigger value=\"integrations\">Integration Health</TabsTrigger>
          <TabsTrigger value=\"recommendations\">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value=\"overview\" className=\"space-y-4\">
          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
            {/* Error Rate Card */}
            <Card>
              <CardHeader>
                <CardTitle className=\"flex items-center\">
                  <TrendingUp className=\"h-5 w-5 mr-2\" />
                  Error Rate
                </CardTitle>
                <CardDescription>Errors per minute</CardDescription>
              </CardHeader>
              <CardContent>
                <div className=\"text-3xl font-bold\">
                  {dashboardData.metrics.error_rate.toFixed(2)}
                </div>
                <p className=\"text-sm text-muted-foreground mt-2\">
                  errors/minute in {selectedTimeRange}
                </p>
              </CardContent>
            </Card>

            {/* Resolution Time Card */}
            <Card>
              <CardHeader>
                <CardTitle className=\"flex items-center\">
                  <Clock className=\"h-5 w-5 mr-2\" />
                  Average Resolution Time
                </CardTitle>
                <CardDescription>Time to resolve errors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className=\"text-3xl font-bold\">
                  {dashboardData.metrics.average_resolution_time}m
                </div>
                <p className=\"text-sm text-muted-foreground mt-2\">
                  Average resolution time
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value=\"categories\" className=\"space-y-4\">
          <Card>
            <CardHeader>
              <CardTitle>Error Categories Breakdown</CardTitle>
              <CardDescription>Distribution of errors by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className=\"grid gap-4\">
                {Object.entries(dashboardData.error_categories).map(([category, data]: [string, any]) => (
                  <div key={category} className=\"flex items-center justify-between p-3 border rounded-lg\">
                    <div>
                      <div className=\"font-medium capitalize\">{category.replace('_', ' ')}</div>
                      <div className=\"text-sm text-muted-foreground\">
                        {data.users_affected} users affected
                      </div>
                    </div>
                    <div className=\"text-right\">
                      <div className=\"font-bold\">{data.count}</div>
                      <div className=\"text-sm text-muted-foreground\">
                        ${data.revenue_impact.toFixed(2)} impact
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value=\"integrations\" className=\"space-y-4\">
          <Card>
            <CardHeader>
              <CardTitle className=\"flex items-center\">
                <Shield className=\"h-5 w-5 mr-2\" />
                Integration Health Status
              </CardTitle>
              <CardDescription>External service monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className=\"grid gap-4\">
                {Object.entries(dashboardData.integration_health).map(([service, health]: [string, any]) => (
                  <div key={service} className=\"flex items-center justify-between p-3 border rounded-lg\">
                    <div className=\"flex items-center space-x-3\">
                      <div className={`w-3 h-3 rounded-full ${
                        health.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <div className=\"font-medium capitalize\">{service.replace('_', ' ')}</div>
                        <div className=\"text-sm text-muted-foreground\">
                          Error rate: {(health.error_rate * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <Badge variant={health.status === 'healthy' ? 'default' : 'destructive'}>
                      {health.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value=\"recommendations\" className=\"space-y-4\">
          <Card>
            <CardHeader>
              <CardTitle>System Recommendations</CardTitle>
              <CardDescription>Actionable insights for system improvement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className=\"space-y-4\">
                {dashboardData.recommendations.length === 0 ? (
                  <div className=\"text-center py-8 text-muted-foreground\">
                    <CheckCircle className=\"h-12 w-12 mx-auto mb-4 text-green-500\" />
                    <p>No recommendations at this time. System is performing well!</p>
                  </div>
                ) : (
                  dashboardData.recommendations.map((rec: any, index: number) => (
                    <Alert key={index} className={getAlertSeverity(rec.priority)}>
                      <AlertDescription>
                        <div className=\"font-medium\">{rec.title}</div>
                        <div className=\"text-sm mt-1\">{rec.description}</div>
                        <div className=\"text-sm mt-2 font-medium\">
                          Action: {rec.action}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Info */}
      <div className=\"text-center text-sm text-muted-foreground\">
        Last updated: {new Date(dashboardData.generated_at).toLocaleString()}
        {autoRefresh && <span className=\"ml-2\">(Auto-refreshing every minute)</span>}
      </div>
    </div>
  )
}

export default ErrorMonitoringDashboard