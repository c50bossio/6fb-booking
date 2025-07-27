'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  AlertCircle,
  Info,
  Zap,
  Shield,
  Activity,
  BarChart3,
  Bug,
  Timer
} from 'lucide-react'
import { useErrorHandler } from '@/hooks/useErrorHandler'

interface ErrorSummary {
  total_active_errors: number
  error_rate_5min: number
  auto_resolution_rate: number
  mean_resolution_time: number
  sla_compliance: {
    error_rate_target: number
    current_rate: number
    mttr_target: number
    current_mttr: number
  }
}

interface ErrorBreakdown {
  by_severity: Record<string, number>
  by_category: Record<string, number>
  by_business_impact: Record<string, number>
}

interface ErrorTrends {
  errors_24h: number
  critical_errors_24h: number
  revenue_impact_24h: number
}

interface ErrorPattern {
  signature: string
  count: number
  severity: string
  category: string
  auto_resolvable: boolean
}

interface BusinessImpact {
  revenue_impacting_errors_1h: number
  user_impacting_errors_1h: number
  critical_unresolved: number
  total_active_errors: number
  auto_resolution_rate: number
  mean_resolution_time_seconds: number
  error_rate_5min: number
  six_figure_workflow_impacted: Record<string, any>
}

interface ResolutionStrategy {
  name: string
  description: string
  success_rate: number
  total_attempts: number
}

interface DashboardData {
  summary: ErrorSummary
  breakdown: ErrorBreakdown
  trends: ErrorTrends
  top_patterns: ErrorPattern[]
  business_impact: BusinessImpact
  resolution_strategies: ResolutionStrategy[]
  timestamp: string
}

const severityColors = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
  info: 'bg-gray-500'
}

const severityIcons = {
  critical: AlertTriangle,
  high: AlertCircle,
  medium: Info,
  low: Info,
  info: Info
}

export function ErrorMonitoringDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)
  const { handleApiError } = useErrorHandler()

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v2/error-monitoring/dashboard')
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.status}`)
      }
      const data = await response.json()
      setDashboardData(data)
      setLastRefresh(new Date())
    } catch (error) {
      await handleApiError(error, {
        endpoint: '/api/v2/error-monitoring/dashboard',
        method: 'GET',
        userAction: 'loading error monitoring dashboard'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchDashboardData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [autoRefresh])

  const getSeverityLevel = (percentage: number, target: number) => {
    if (percentage > target * 2) return 'critical'
    if (percentage > target * 1.5) return 'high'
    if (percentage > target) return 'medium'
    return 'low'
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`
    return `${(seconds / 3600).toFixed(1)}h`
  }

  if (loading && !dashboardData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading error monitoring dashboard...</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Dashboard</AlertTitle>
        <AlertDescription>
          Unable to load error monitoring data. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    )
  }

  const { summary, breakdown, trends, top_patterns, business_impact, resolution_strategies } = dashboardData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Error Monitoring Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time error tracking and resolution for BookedBarber V2
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className={`h-4 w-4 mr-1 ${autoRefresh ? 'text-green-500' : 'text-gray-500'}`} />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <span className="text-xs text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* SLA Compliance Alert */}
      {(summary.sla_compliance.current_rate > summary.sla_compliance.error_rate_target ||
        summary.sla_compliance.current_mttr > summary.sla_compliance.mttr_target) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>SLA Compliance Alert</AlertTitle>
          <AlertDescription>
            {summary.sla_compliance.current_rate > summary.sla_compliance.error_rate_target && (
              <p>Error rate ({summary.sla_compliance.current_rate.toFixed(3)}%) exceeds target ({summary.sla_compliance.error_rate_target}%)</p>
            )}
            {summary.sla_compliance.current_mttr > summary.sla_compliance.mttr_target && (
              <p>Mean time to resolution ({formatDuration(summary.sla_compliance.current_mttr)}) exceeds target ({formatDuration(summary.sla_compliance.mttr_target)})</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Errors</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total_active_errors}</div>
            <p className="text-xs text-muted-foreground">
              Unresolved issues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.error_rate_5min.toFixed(2)}/min
            </div>
            <p className="text-xs text-muted-foreground">
              Last 5 minutes
            </p>
            <Progress 
              value={(summary.error_rate_5min / 20) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Resolution</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(summary.auto_resolution_rate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Automatically resolved
            </p>
            <Progress 
              value={summary.auto_resolution_rate * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mean Resolution Time</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(summary.mean_resolution_time)}
            </div>
            <p className="text-xs text-muted-foreground">
              Average time to resolve
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="business-impact">Business Impact</TabsTrigger>
          <TabsTrigger value="patterns">Error Patterns</TabsTrigger>
          <TabsTrigger value="resolution">Resolution</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Error Breakdown by Severity */}
            <Card>
              <CardHeader>
                <CardTitle>Error Breakdown by Severity</CardTitle>
                <CardDescription>Distribution of errors by severity level</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(breakdown.by_severity).map(([severity, count]) => {
                  const Icon = severityIcons[severity as keyof typeof severityIcons]
                  return (
                    <div key={severity} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span className="capitalize">{severity}</span>
                      </div>
                      <Badge variant="outline" className={severityColors[severity as keyof typeof severityColors]}>
                        {count}
                      </Badge>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Error Trends */}
            <Card>
              <CardHeader>
                <CardTitle>24-Hour Trends</CardTitle>
                <CardDescription>Error trends over the last 24 hours</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Total Errors</span>
                  <Badge variant="outline">{trends.errors_24h}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Critical Errors</span>
                  <Badge variant="outline" className="bg-red-500">
                    {trends.critical_errors_24h}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Revenue Impact</span>
                  <Badge variant="outline" className="bg-orange-500">
                    {trends.revenue_impact_24h}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Error Categories</CardTitle>
              <CardDescription>Breakdown by error category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(breakdown.by_category).map(([category, count]) => (
                  <div key={category} className="text-center">
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {category.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business-impact" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue Impact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Revenue Impact (Last Hour)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Revenue-Blocking Errors</span>
                  <Badge variant="destructive">
                    {business_impact.revenue_impacting_errors_1h}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>User-Blocking Errors</span>
                  <Badge variant="outline" className="bg-orange-500">
                    {business_impact.user_impacting_errors_1h}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Critical Unresolved</span>
                  <Badge variant="destructive">
                    {business_impact.critical_unresolved}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Six Figure Workflow Impact */}
            <Card>
              <CardHeader>
                <CardTitle>Six Figure Barber Workflow Impact</CardTitle>
                <CardDescription>Impact on core business workflows</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(business_impact.six_figure_workflow_impacted).map(([workflow, data]: [string, any]) => (
                  <div key={workflow} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="capitalize">{workflow.replace('_', ' ')}</span>
                      <Badge variant={data.active_errors > 0 ? 'destructive' : 'outline'}>
                        {data.active_errors} errors
                      </Badge>
                    </div>
                    {data.active_errors > 0 && (
                      <div className="text-xs text-muted-foreground ml-4">
                        Critical: {data.severity_breakdown.critical || 0} | 
                        High: {data.severity_breakdown.high || 0} | 
                        Medium: {data.severity_breakdown.medium || 0}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* SLA Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                SLA Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span>Error Rate</span>
                    <span className="text-sm text-muted-foreground">
                      {summary.sla_compliance.current_rate.toFixed(3)}% / {summary.sla_compliance.error_rate_target}%
                    </span>
                  </div>
                  <Progress 
                    value={(summary.sla_compliance.current_rate / summary.sla_compliance.error_rate_target) * 100}
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span>Mean Time to Resolution</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(summary.sla_compliance.current_mttr)} / {formatDuration(summary.sla_compliance.mttr_target)}
                    </span>
                  </div>
                  <Progress 
                    value={(summary.sla_compliance.current_mttr / summary.sla_compliance.mttr_target) * 100}
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Error Patterns</CardTitle>
              <CardDescription>Most frequently occurring error patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {top_patterns.map((pattern, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {pattern.signature}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {pattern.category} • {pattern.severity}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{pattern.count}x</Badge>
                      {pattern.auto_resolvable && (
                        <Badge variant="outline" className="bg-green-500">
                          <Zap className="h-3 w-3 mr-1" />
                          Auto
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resolution Strategies</CardTitle>
              <CardDescription>Automated error resolution strategies and their success rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resolution_strategies.map((strategy, index) => (
                  <div key={index} className="p-4 border rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{strategy.name}</h4>
                      <Badge variant={strategy.success_rate > 0.8 ? 'default' : 'outline'}>
                        {(strategy.success_rate * 100).toFixed(1)}% success
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {strategy.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Total attempts: {strategy.total_attempts}</span>
                      <span>Success rate: {(strategy.success_rate * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={strategy.success_rate * 100} className="h-1" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}