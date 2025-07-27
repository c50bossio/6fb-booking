"use client"

/**
 * Business Efficiency Analytics Dashboard
 * 
 * Comprehensive operational efficiency tracking and optimization system aligned with
 * Six Figure Barber methodology for maximizing business performance and productivity.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'
import { 
  Clock, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Users,
  Scissors,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  LineChart,
  Activity,
  Timer,
  Percent,
  DollarSign,
  RefreshCw,
  Zap,
  Settings,
  Lightbulb,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamic import for recharts to fix webpack issues
const RechartsLineChart = dynamic(() => import('recharts').then(mod => ({ default: mod.LineChart })), { ssr: false })
const Line = dynamic(() => import('recharts').then(mod => ({ default: mod.Line })), { ssr: false })
const AreaChart = dynamic(() => import('recharts').then(mod => ({ default: mod.AreaChart })), { ssr: false })
const Area = dynamic(() => import('recharts').then(mod => ({ default: mod.Area })), { ssr: false })
const BarChart = dynamic(() => import('recharts').then(mod => ({ default: mod.BarChart })), { ssr: false })
const Bar = dynamic(() => import('recharts').then(mod => ({ default: mod.Bar })), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.XAxis })), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.YAxis })), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => ({ default: mod.CartesianGrid })), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => ({ default: mod.Tooltip })), { ssr: false })
const Legend = dynamic(() => import('recharts').then(mod => ({ default: mod.Legend })), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), { ssr: false })

import { 
  getEfficiencyMetrics,
  getEfficiencyTrends,
  EfficiencyMetrics,
  EfficiencyTrends
} from '@/lib/six-figure-barber-api'

// Import intelligent analytics components
import { SmartAlertsWidget } from '../analytics/SmartAlertsWidget'
import { TrendPredictionOverlay } from '../analytics/TrendPredictionOverlay'

interface BusinessEfficiencyAnalyticsProps {
  className?: string
}

// Efficiency metric configurations
const EFFICIENCY_METRICS = {
  'booking_utilization': {
    name: 'Booking Utilization',
    description: 'Percentage of available time slots booked',
    icon: Calendar,
    color: 'text-blue-600',
    unit: '%',
    target: 85
  },
  'no_show_rate': {
    name: 'No-Show Rate',
    description: 'Percentage of appointments with client no-shows',
    icon: Users,
    color: 'text-red-600',
    unit: '%',
    target: 5,
    invert: true // Lower is better
  },
  'average_service_time': {
    name: 'Average Service Time',
    description: 'Average time per service appointment',
    icon: Timer,
    color: 'text-green-600',
    unit: 'min',
    target: 45
  },
  'client_wait_time': {
    name: 'Client Wait Time',
    description: 'Average time clients wait for service',
    icon: Clock,
    color: 'text-orange-600',
    unit: 'min',
    target: 5,
    invert: true
  },
  'revenue_per_hour': {
    name: 'Revenue per Hour',
    description: 'Average revenue generated per working hour',
    icon: DollarSign,
    color: 'text-green-600',
    unit: '$',
    target: 100
  },
  'cancellation_rate': {
    name: 'Cancellation Rate',
    description: 'Percentage of appointments cancelled',
    icon: RefreshCw,
    color: 'text-yellow-600',
    unit: '%',
    target: 10,
    invert: true
  }
}

const CHART_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function BusinessEfficiencyAnalytics({ className }: BusinessEfficiencyAnalyticsProps) {
  const [metrics, setMetrics] = useState<EfficiencyMetrics | null>(null)
  const [trends, setTrends] = useState<EfficiencyTrends | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [trendPeriod, setTrendPeriod] = useState<number>(30)
  const [activeTab, setActiveTab] = useState('overview')

  const loadData = async (date?: string, days?: number) => {
    try {
      setLoading(true)
      setError(null)
      
      const [metricsData, trendsData] = await Promise.all([
        getEfficiencyMetrics(date),
        getEfficiencyTrends(days || trendPeriod)
      ])
      
      setMetrics(metricsData)
      setTrends(trendsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load efficiency data'
      setError(errorMessage)
      console.error('Failed to load business efficiency data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(selectedDate, trendPeriod)
  }, [selectedDate, trendPeriod])

  const getMetricStatus = (metricKey: string, value: number) => {
    const config = EFFICIENCY_METRICS[metricKey as keyof typeof EFFICIENCY_METRICS]
    if (!config) return { status: 'neutral', color: 'text-gray-600' }
    
    const isOnTarget = config.invert 
      ? value <= config.target 
      : value >= config.target
    
    const variance = config.invert 
      ? ((config.target - value) / config.target) * 100
      : ((value - config.target) / config.target) * 100
    
    if (isOnTarget) {
      return { 
        status: 'good', 
        color: 'text-green-600',
        variance: Math.abs(variance)
      }
    } else if (Math.abs(variance) <= 20) {
      return { 
        status: 'warning', 
        color: 'text-yellow-600',
        variance: Math.abs(variance)
      }
    } else {
      return { 
        status: 'critical', 
        color: 'text-red-600',
        variance: Math.abs(variance)
      }
    }
  }

  const formatMetricValue = (metricKey: string, value: number) => {
    const config = EFFICIENCY_METRICS[metricKey as keyof typeof EFFICIENCY_METRICS]
    if (!config) return value.toString()
    
    switch (config.unit) {
      case '%':
        return `${value.toFixed(1)}%`
      case '$':
        return `$${value.toFixed(2)}`
      case 'min':
        return `${value.toFixed(0)}min`
      default:
        return value.toFixed(1)
    }
  }

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Efficiency Data Error</AlertTitle>
          <AlertDescription>
            {error}
            <Button 
              onClick={() => loadData(selectedDate, trendPeriod)} 
              variant="outline" 
              size="sm" 
              className="ml-4"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!metrics || !trends) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Efficiency Data</AlertTitle>
          <AlertDescription>
            Business efficiency metrics are not available. Complete some appointments to see efficiency analytics.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Business Efficiency Analytics</h2>
          <p className="text-muted-foreground">
            Optimize operations using Six Figure Barber efficiency methodology
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
          <Select value={trendPeriod.toString()} onValueChange={(value) => setTrendPeriod(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overall Efficiency Score */}
          <Card className="border-2 border-primary">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Overall Efficiency Score</CardTitle>
              <CardDescription>
                Composite score across all efficiency metrics for {selectedDate}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className={`text-4xl font-bold ${
                metrics.overall_efficiency_score >= 90 ? 'text-green-600' :
                metrics.overall_efficiency_score >= 80 ? 'text-blue-600' :
                metrics.overall_efficiency_score >= 70 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {metrics.overall_efficiency_score.toFixed(1)}
                <span className="text-lg text-muted-foreground">/100</span>
              </div>
              <Progress value={metrics.overall_efficiency_score} className="w-full h-3" />
              <Badge variant={
                metrics.overall_efficiency_score >= 90 ? 'default' :
                metrics.overall_efficiency_score >= 80 ? 'secondary' :
                metrics.overall_efficiency_score >= 70 ? 'outline' : 'destructive'
              }>
                {metrics.overall_efficiency_score >= 90 ? 'Exceptional' :
                 metrics.overall_efficiency_score >= 80 ? 'Excellent' :
                 metrics.overall_efficiency_score >= 70 ? 'Good' : 'Needs Improvement'}
              </Badge>
            </CardContent>
          </Card>

          {/* Key Efficiency Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(metrics.metrics).map(([metricKey, metricData]) => {
              const config = EFFICIENCY_METRICS[metricKey as keyof typeof EFFICIENCY_METRICS]
              if (!config) return null
              
              const status = getMetricStatus(metricKey, metricData.value)
              const MetricIcon = config.icon
              
              return (
                <Card key={metricKey}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{config.name}</CardTitle>
                    <MetricIcon className={`h-4 w-4 ${config.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${status.color}`}>
                      {formatMetricValue(metricKey, metricData.value)}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <Progress value={metricData.efficiency_percentage || 0} className="h-2 flex-1 mr-2" />
                      <span className="text-xs text-muted-foreground">
                        Target: {formatMetricValue(metricKey, config.target)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {config.description}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          {/* Detailed Metrics Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(metrics.metrics).map(([metricKey, metricData]) => {
              const config = EFFICIENCY_METRICS[metricKey as keyof typeof EFFICIENCY_METRICS]
              if (!config) return null
              
              const status = getMetricStatus(metricKey, metricData.value)
              const MetricIcon = config.icon
              
              return (
                <Card key={metricKey} className="border-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MetricIcon className={`h-5 w-5 ${config.color}`} />
                      {config.name}
                    </CardTitle>
                    <CardDescription>{config.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Current Value</span>
                      <span className={`text-xl font-bold ${status.color}`}>
                        {formatMetricValue(metricKey, metricData.value)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Target</span>
                      <span className="text-lg font-semibold">
                        {formatMetricValue(metricKey, config.target)}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Performance vs Target</span>
                        <span className={status.color}>
                          {status.variance.toFixed(1)}% {config.invert ? 'below' : 'above'} target
                        </span>
                      </div>
                      <Progress value={metricData.efficiency_percentage || 0} className="h-2" />
                    </div>
                    
                    <Badge variant={
                      status.status === 'good' ? 'default' :
                      status.status === 'warning' ? 'secondary' : 'destructive'
                    }>
                      {status.status === 'good' ? 'On Target' :
                       status.status === 'warning' ? 'Close to Target' : 'Needs Improvement'}
                    </Badge>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Efficiency Trends Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Efficiency Trends Over Time</CardTitle>
                  <CardDescription>
                    Performance trends for the last {trendPeriod} days
                  </CardDescription>
                </div>
                <TrendPredictionOverlay 
                  metricName="booking_utilization"
                  daysAhead={30}
                  chartType="line"
                  compact={true}
                />
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RechartsLineChart data={Object.entries(trends.trends).length > 0 ? 
                  Object.keys(trends.trends).reduce((acc: any[], metricKey) => {
                    trends.trends[metricKey].forEach((point, index) => {
                      if (!acc[index]) {
                        acc[index] = { date: point.date }
                      }
                      acc[index][metricKey] = point.value
                    })
                    return acc
                  }, []) : []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {Object.keys(trends.trends).map((metricKey, index) => (
                    <Line
                      key={metricKey}
                      type="monotone"
                      dataKey={metricKey}
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      strokeWidth={2}
                      name={EFFICIENCY_METRICS[metricKey as keyof typeof EFFICIENCY_METRICS]?.name || metricKey}
                    />
                  ))}
                </RechartsLineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Performance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(trends.overall_performance).map(([metricKey, performance]) => {
              const config = EFFICIENCY_METRICS[metricKey as keyof typeof EFFICIENCY_METRICS]
              if (!config) return null
              
              const TrendIcon = performance.trend_direction === 'improving' ? TrendingUp :
                               performance.trend_direction === 'declining' ? TrendingDown : Target
              
              return (
                <Card key={metricKey}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <config.icon className={`h-4 w-4 ${config.color}`} />
                      {config.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold">
                        {formatMetricValue(metricKey, performance.current_average)}
                      </span>
                      <div className={`flex items-center gap-1 text-xs ${
                        performance.trend_direction === 'improving' ? 'text-green-600' :
                        performance.trend_direction === 'declining' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        <TrendIcon className="h-3 w-3" />
                        {performance.improvement_rate.toFixed(1)}%
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {trendPeriod}-day average
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {/* Smart Alerts for Efficiency */}
          <SmartAlertsWidget 
            maxAlerts={5}
            compact={false}
            showActions={true}
            className="mb-6"
          />

          {/* Efficiency Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Efficiency Insights
                </CardTitle>
                <CardDescription>
                  AI-powered insights from your efficiency data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics.insights.map((insight, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 space-y-1">
                    <h4 className="font-medium">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                    {insight.impact && (
                      <Badge variant="outline" className="text-xs">
                        Impact: {insight.impact}
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Optimization Opportunities
                </CardTitle>
                <CardDescription>
                  Actionable steps to improve efficiency
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics.opportunities.map((opportunity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <h4 className="font-medium">{opportunity.title}</h4>
                      <p className="text-sm text-muted-foreground">{opportunity.description}</p>
                      {opportunity.potential_improvement && (
                        <p className="text-sm font-medium text-green-600">
                          Potential improvement: {opportunity.potential_improvement}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Six Figure Barber Methodology Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Six Figure Barber Methodology Insights
              </CardTitle>
              <CardDescription>
                Strategic efficiency recommendations based on the methodology
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {trends.six_fb_insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{insight}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recommended Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Recommended Actions
              </CardTitle>
              <CardDescription>
                Priority actions to improve business efficiency
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {metrics.recommended_actions.map((action, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    action.priority === 'high' ? 'bg-red-500' :
                    action.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <div className="space-y-1">
                    <h4 className="font-medium">{action.title}</h4>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        action.priority === 'high' ? 'destructive' :
                        action.priority === 'medium' ? 'secondary' : 'default'
                      } className="text-xs">
                        {action.priority} priority
                      </Badge>
                      {action.timeline && (
                        <Badge variant="outline" className="text-xs">
                          {action.timeline}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}