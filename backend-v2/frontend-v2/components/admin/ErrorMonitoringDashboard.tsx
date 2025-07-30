'use client'

/**
 * Comprehensive Error Monitoring Dashboard
 * 
 * Features:
 * - Real-time error analytics and metrics
 * - Interactive charts and visualizations
 * - Error pattern analysis and insights
 * - Alert management and configuration
 * - Business impact assessment
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { 
  AlertTriangle, 
  Activity, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Users,
  DollarSign,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Settings,
  Download,
  Filter,
  Search,
  Bell,
  BellOff
} from 'lucide-react'
import { toast } from 'sonner'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

interface ErrorMetrics {
  totalErrors: number
  errorRate: number
  criticalErrors: number
  resolvedErrors: number
  averageResolutionTime: number
  businessImpact: {
    revenue_blocking: number
    user_blocking: number
    experience_degrading: number
    monitoring: number
  }
  errorsByCategory: Record<string, number>
  errorsBySeverity: Record<string, number>
  trends: {
    timestamp: string
    errorCount: number
    criticalCount: number
    resolvedCount: number
  }[]
}

interface ErrorPattern {
  patternId: string
  errorSignature: string
  occurrenceCount: number
  severity: string
  category: string
  businessImpact: string
  autoResolvable: boolean
  firstSeen: string
  lastSeen: string
}

interface AlertConfig {
  errorRateThreshold: number
  criticalErrorThreshold: number
  notificationChannels: string[]
  alertCooldownMinutes: number
}

interface ActiveAlert {
  id: string
  severity: string
  title: string
  message: string
  createdAt: string
  acknowledged: boolean
  escalated: boolean
}

interface SystemHealth {
  status: string
  database: string
  monitoring: string
  errorRate: number
  lastCheck: string
}

const ErrorMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<ErrorMetrics | null>(null)
  const [patterns, setPatterns] = useState<ErrorPattern[]>([])
  const [alerts, setAlerts] = useState<ActiveAlert[]>([])
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [timeframe, setTimeframe] = useState('24h')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      const [metricsRes, patternsRes, alertsRes, healthRes] = await Promise.all([
        fetch(`/api/v2/error-monitoring/analytics?timeframe=${timeframe}`),
        fetch('/api/v2/error-monitoring/patterns'),
        fetch('/api/v2/error-monitoring/dashboard'),
        fetch('/api/v2/error-monitoring/health')
      ])

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json()
        setMetrics(metricsData.data)
      }

      if (patternsRes.ok) {
        const patternsData = await patternsRes.json()
        setPatterns(patternsData.data.patterns || [])
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json()
        setAlerts(alertsData.data.alerts?.active_alerts || [])
        setSystemHealth(alertsData.data.system_health)
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json()
        if (!systemHealth) {
          setSystemHealth(healthData)
        }
      }

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [timeframe, systemHealth])

  // Auto-refresh effect
  useEffect(() => {
    fetchDashboardData()

    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, 30000) // 30 seconds
      return () => clearInterval(interval)
    }
  }, [fetchDashboardData, autoRefresh])

  // Acknowledge alert
  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/v2/error-monitoring/alerts/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId })
      })

      if (response.ok) {
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        ))
        toast.success('Alert acknowledged')
      }
    } catch (error) {
      toast.error('Failed to acknowledge alert')
    }
  }

  // Resolve alert
  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/v2/error-monitoring/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errorId: alertId, resolutionMethod: 'Manual resolution from dashboard' })
      })

      if (response.ok) {
        setAlerts(prev => prev.filter(alert => alert.id !== alertId))
        toast.success('Alert resolved')
      }
    } catch (error) {
      toast.error('Failed to resolve alert')
    }
  }

  // Export data
  const exportData = async (type: 'errors' | 'patterns' | 'alerts') => {
    try {
      const response = await fetch(`/api/v2/error-monitoring/export?type=${type}&timeframe=${timeframe}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `error-monitoring-${type}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success(`${type} data exported successfully`)
      }
    } catch (error) {
      toast.error('Failed to export data')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    )
  }

  const severityColors = {
    critical: 'destructive',
    high: 'orange',
    medium: 'yellow',
    low: 'blue',
    info: 'green'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'degraded': return 'text-yellow-600'
      case 'unhealthy': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Error Monitoring Dashboard</h1>
          <p className="text-gray-600">Real-time system health and error tracking</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            {autoRefresh ? 'Auto Refresh On' : 'Auto Refresh Off'}
          </Button>
          
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          
          <Button onClick={() => fetchDashboardData()} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Status */}
      {systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getStatusColor(systemHealth.status)}`}>
                  {systemHealth.status.toUpperCase()}
                </div>
                <p className="text-sm text-gray-600">Overall Status</p>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getStatusColor(systemHealth.database)}`}>
                  {systemHealth.database.toUpperCase()}
                </div>
                <p className="text-sm text-gray-600">Database</p>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getStatusColor(systemHealth.monitoring)}`}>
                  {systemHealth.monitoring.toUpperCase()}
                </div>
                <p className="text-sm text-gray-600">Monitoring</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {systemHealth.errorRate.toFixed(1)}/min
                </div>
                <p className="text-sm text-gray-600">Error Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={severityColors[alert.severity as keyof typeof severityColors] as any}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      {alert.escalated && (
                        <Badge variant="destructive">ESCALATED</Badge>
                      )}
                      {alert.acknowledged && (
                        <Badge variant="outline">ACKNOWLEDGED</Badge>
                      )}
                    </div>
                    <h4 className="font-semibold">{alert.title}</h4>
                    <p className="text-sm text-gray-600 line-clamp-2">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {!alert.acknowledged && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Acknowledge
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalErrors.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.errorRate.toFixed(2)} errors/hour
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Errors</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.criticalErrors}</div>
              <p className="text-xs text-muted-foreground">
                Requiring immediate attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {metrics.totalErrors > 0 ? ((metrics.resolvedErrors / metrics.totalErrors) * 100).toFixed(1) : '0'}%
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.resolvedErrors} resolved
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {(metrics.averageResolutionTime / 60).toFixed(1)}m
              </div>
              <p className="text-xs text-muted-foreground">
                Mean time to resolution
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Business Impact Assessment */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Business Impact Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {metrics.businessImpact.revenue_blocking}
                </div>
                <p className="text-sm text-red-700">Revenue Blocking</p>
                <p className="text-xs text-gray-600">Critical payment/booking issues</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {metrics.businessImpact.user_blocking}
                </div>
                <p className="text-sm text-orange-700">User Blocking</p>
                <p className="text-xs text-gray-600">Prevents user actions</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {metrics.businessImpact.experience_degrading}
                </div>
                <p className="text-sm text-yellow-700">Experience Degrading</p>
                <p className="text-xs text-gray-600">Poor UX but functional</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.businessImpact.monitoring}
                </div>
                <p className="text-sm text-blue-700">Monitoring</p>
                <p className="text-xs text-gray-600">Internal system issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patterns">Error Patterns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Error Trends Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Error Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics.trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="errorCount" stroke="#8884d8" name="Total Errors" />
                      <Line type="monotone" dataKey="criticalCount" stroke="#ff4444" name="Critical" />
                      <Line type="monotone" dataKey="resolvedCount" stroke="#44ff44" name="Resolved" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Errors by Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Errors by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(metrics.errorsByCategory).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="capitalize">{category.replace('_', ' ')}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ 
                                width: `${(count / Math.max(...Object.values(metrics.errorsByCategory))) * 100}%` 
                              }}
                            />
                          </div>
                          <span className="font-medium w-12 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Error Patterns Tab */}
        <TabsContent value="patterns" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search patterns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                <option value="payment">Payment</option>
                <option value="booking">Booking</option>
                <option value="authentication">Authentication</option>
                <option value="database">Database</option>
                <option value="api">API</option>
              </select>
            </div>
            <Button onClick={() => exportData('patterns')} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Error Patterns ({patterns.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {patterns
                  .filter(pattern => 
                    (!selectedCategory || pattern.category === selectedCategory) &&
                    (!searchTerm || pattern.errorSignature.toLowerCase().includes(searchTerm.toLowerCase()))
                  )
                  .map((pattern) => (
                    <div key={pattern.patternId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={severityColors[pattern.severity as keyof typeof severityColors] as any}>
                              {pattern.severity.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">{pattern.category}</Badge>
                            {pattern.autoResolvable && (
                              <Badge variant="secondary">
                                <Zap className="h-3 w-3 mr-1" />
                                Auto-Resolvable
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-semibold mb-1">
                            {pattern.errorSignature}
                          </h4>
                          <div className="text-sm text-gray-600 grid grid-cols-1 md:grid-cols-3 gap-2">
                            <span>Occurrences: <strong>{pattern.occurrenceCount}</strong></span>
                            <span>First Seen: {new Date(pattern.firstSeen).toLocaleDateString()}</span>
                            <span>Last Seen: {new Date(pattern.lastSeen).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            Analyze
                          </Button>
                          <Button size="sm" variant="outline">
                            Create Rule
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Severity Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Error Severity Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={Object.entries(metrics.errorsBySeverity).map(([severity, count]) => ({
                          name: severity,
                          value: count,
                          color: {
                            critical: '#ff4444',
                            high: '#ff8800',
                            medium: '#ffaa00',
                            low: '#0088ff',
                            info: '#00cc88'
                          }[severity] || '#888888'
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(metrics.errorsBySeverity).map(([severity, count], index) => (
                          <Cell key={`cell-${index}`} fill={{
                            critical: '#ff4444',
                            high: '#ff8800',
                            medium: '#ffaa00',
                            low: '#0088ff',
                            info: '#00cc88'
                          }[severity] || '#888888'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Resolution Time Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Resolution Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-xl font-bold text-green-600">
                          {((metrics.resolvedErrors / metrics.totalErrors) * 100).toFixed(1)}%
                        </div>
                        <p className="text-sm text-green-700">Resolution Rate</p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-xl font-bold text-blue-600">
                          {(metrics.averageResolutionTime / 60).toFixed(1)}m
                        </div>
                        <p className="text-sm text-blue-700">Avg Time</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Alert Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Error Rate Threshold (errors/minute)
                  </label>
                  <input
                    type="number"
                    value={alertConfig?.errorRateThreshold || 10}
                    onChange={(e) => setAlertConfig(prev => ({
                      ...prev!,
                      errorRateThreshold: parseFloat(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Critical Error Threshold
                  </label>
                  <input
                    type="number"
                    value={alertConfig?.criticalErrorThreshold || 5}
                    onChange={(e) => setAlertConfig(prev => ({
                      ...prev!,
                      criticalErrorThreshold: parseInt(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Alert Cooldown (minutes)
                  </label>
                  <input
                    type="number"
                    value={alertConfig?.alertCooldownMinutes || 15}
                    onChange={(e) => setAlertConfig(prev => ({
                      ...prev!,
                      alertCooldownMinutes: parseInt(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline">Reset to Defaults</Button>
                  <Button>Save Configuration</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ErrorMonitoringDashboard