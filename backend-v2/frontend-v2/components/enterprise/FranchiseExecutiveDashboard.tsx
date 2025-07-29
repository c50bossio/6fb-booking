'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Calendar, 
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Brain,
  Network
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from '@/lib/recharts-dynamic'

interface FranchiseExecutiveDashboardProps {
  networkId: string
  timeframe?: 'week' | 'month' | 'quarter' | 'year'
  className?: string
}

interface NetworkOverview {
  network_name: string
  total_locations: number
  active_locations: number
  network_revenue: number
  network_growth: number
  average_performance_score: number
}

interface PerformanceDistribution {
  elite_locations: number
  high_performer_locations: number
  average_locations: number
  developing_locations: number
  underperforming_locations: number
  distribution_chart_data: Array<{
    segment: string
    count: number
    percentage: number
  }>
}

interface RealTimeMetrics {
  current_appointments: number
  active_clients: number
  staff_online: number
  network_utilization: number
  last_updated: string
}

interface TopPerformer {
  location_id: number
  location_name: string
  performance_score: number
  revenue: number
  growth_rate: number
  key_strengths: string[]
}

interface ImprovementOpportunity {
  location_id: number
  location_name: string
  opportunity_type: string
  potential_impact: number
  recommended_actions: string[]
  timeline: string
}

interface NetworkTrend {
  metric: string
  trend_direction: 'up' | 'down' | 'stable'
  change_percentage: number
  period: string
  significance: 'high' | 'medium' | 'low'
}

interface AIInsight {
  insight_type: string
  title: string
  description: string
  impact_score: number
  recommendations: string[]
  confidence_level: number
}

interface DashboardData {
  network_overview: NetworkOverview
  performance_distribution: PerformanceDistribution
  real_time_metrics: RealTimeMetrics
  top_performers: TopPerformer[]
  improvement_opportunities: ImprovementOpportunity[]
  network_trends: NetworkTrend[]
  ai_insights?: AIInsight[]
  cross_network_benchmarks?: any
}

const COLORS = {
  elite: '#10B981',
  high_performer: '#3B82F6', 
  average: '#F59E0B',
  developing: '#EF4444',
  underperforming: '#DC2626'
}

export default function FranchiseExecutiveDashboard({ networkId, timeframe = 'month', className }: FranchiseExecutiveDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe)
  const [aiInsights, setAIInsights] = useState<AIInsight[]>([])
  const [automationMetrics, setAutomationMetrics] = useState<any>(null)

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/v1/franchise-ai/network/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          network_id: networkId,
          timeframe: selectedTimeframe,
          include_benchmarks: true,
          performance_segments: null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const data = await response.json()
      setDashboardData(data)

      // Fetch AI insights
      const insightsResponse = await fetch('/api/v1/ai-analytics/insights/coaching', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json()
        setAIInsights(insightsData.coaching_insights?.network_insights || [])
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [networkId, selectedTimeframe])

  useEffect(() => {
    fetchDashboardData()
    
    // Set up real-time updates every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [fetchDashboardData])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-blue-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  const getTrendIcon = (direction: string, change: number) => {
    if (direction === 'up' && change > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />
    } else if (direction === 'down' && change < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />
    }
    return <Activity className="h-4 w-4 text-gray-600" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load dashboard data. Please try again.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Franchise Network Dashboard</h1>
          <p className="text-gray-600">{dashboardData.network_overview.network_name}</p>
        </div>
        <div className="flex items-center space-x-4">
          <Tabs value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="quarter">Quarter</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last updated: {new Date(dashboardData.real_time_metrics.last_updated).toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData.network_overview.network_revenue)}</div>
            <p className="text-xs text-muted-foreground">
              {getTrendIcon('up', dashboardData.network_overview.network_growth)}
              <span className="ml-1">{formatPercentage(dashboardData.network_overview.network_growth)} from last period</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Locations</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.network_overview.active_locations}</div>
            <p className="text-xs text-muted-foreground">
              of {dashboardData.network_overview.total_locations} total locations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(dashboardData.network_overview.average_performance_score)}`}>
              {dashboardData.network_overview.average_performance_score.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              Network average score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Real-Time Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.real_time_metrics.current_appointments}</div>
            <p className="text-xs text-muted-foreground">
              Current appointments across network
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Performance Distribution
                </CardTitle>
                <CardDescription>
                  Distribution of locations by performance level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={dashboardData.performance_distribution.distribution_chart_data}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ segment, percentage }) => `${segment}: ${percentage.toFixed(1)}%`}
                    >
                      {dashboardData.performance_distribution.distribution_chart_data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.segment.toLowerCase().replace(' ', '_') as keyof typeof COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {dashboardData.performance_distribution.distribution_chart_data.map((item) => (
                    <div key={item.segment} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[item.segment.toLowerCase().replace(' ', '_') as keyof typeof COLORS] }}
                      />
                      <span className="text-sm">{item.segment}: {item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Real-Time Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Real-Time Network Status
                </CardTitle>
                <CardDescription>
                  Live operational metrics across all locations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Current Appointments</span>
                  <span className="text-lg font-bold">{dashboardData.real_time_metrics.current_appointments}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Active Clients</span>
                  <span className="text-lg font-bold">{dashboardData.real_time_metrics.active_clients}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Staff Online</span>
                  <span className="text-lg font-bold">{dashboardData.real_time_metrics.staff_online}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Network Utilization</span>
                    <span className="text-sm font-bold">{dashboardData.real_time_metrics.network_utilization}%</span>
                  </div>
                  <Progress value={dashboardData.real_time_metrics.network_utilization} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Network Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Network Trends
              </CardTitle>
              <CardDescription>
                Key performance trends across the network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardData.network_trends.map((trend, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{trend.metric}</span>
                      {getTrendIcon(trend.trend_direction, trend.change_percentage)}
                    </div>
                    <div className="text-lg font-bold">
                      {formatPercentage(trend.change_percentage)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {trend.period} • {trend.significance} significance
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Top Performers
                </CardTitle>
                <CardDescription>
                  Highest performing locations in the network
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboardData.top_performers.slice(0, 5).map((performer, index) => (
                  <div key={performer.location_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{performer.location_name}</div>
                      <div className="text-sm text-gray-500">
                        Score: {performer.performance_score} • Revenue: {formatCurrency(performer.revenue)}
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        {formatPercentage(performer.growth_rate)} growth
                      </div>
                    </div>
                    <Badge variant="secondary">#{index + 1}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Improvement Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-orange-600" />
                  Improvement Opportunities
                </CardTitle>
                <CardDescription>
                  Locations with the highest improvement potential
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboardData.improvement_opportunities.slice(0, 5).map((opportunity) => (
                  <div key={opportunity.location_id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">{opportunity.location_name}</div>
                      <Badge variant="outline">{opportunity.opportunity_type}</Badge>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Potential Impact: {formatCurrency(opportunity.potential_impact)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Timeline: {opportunity.timeline}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="ai-insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                AI-Powered Network Intelligence
              </CardTitle>
              <CardDescription>
                Advanced insights from cross-network analysis and predictive modeling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiInsights.length > 0 ? (
                aiInsights.map((insight, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{insight.title}</h4>
                      <Badge variant="secondary">
                        {(insight.confidence_level * 100).toFixed(0)}% confidence
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-gray-700">Recommendations:</div>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {insight.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-blue-600">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-gray-500">Impact Score:</span>
                      <Progress value={insight.impact_score * 10} className="h-1 flex-1" />
                      <span className="text-xs font-medium">{insight.impact_score.toFixed(1)}/10</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>AI insights are being generated...</p>
                  <p className="text-sm">Check back in a few minutes for intelligent recommendations.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                Intelligent Automation Status
              </CardTitle>
              <CardDescription>
                Automated systems and their performance across the network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Performance Monitoring</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    24/7 automated performance tracking
                  </div>
                  <Badge variant="secondary" className="text-green-600">Active</Badge>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Resource Optimization</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Smart staff and resource allocation
                  </div>
                  <Badge variant="secondary" className="text-blue-600">Active</Badge>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                    <span className="font-medium">Dynamic Pricing</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Automated pricing optimization
                  </div>
                  <Badge variant="secondary" className="text-purple-600">Active</Badge>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    <span className="font-medium">Schedule Optimization</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Intelligent appointment scheduling
                  </div>
                  <Badge variant="secondary" className="text-orange-600">Active</Badge>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-teal-600" />
                    <span className="font-medium">Compliance Monitoring</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Automated compliance tracking
                  </div>
                  <Badge variant="secondary" className="text-teal-600">Active</Badge>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-red-600" />
                    <span className="font-medium">Retention Campaigns</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Automated client retention
                  </div>
                  <Badge variant="secondary" className="text-red-600">Active</Badge>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Automation Impact Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Revenue Impact:</span>
                    <div className="text-blue-900 font-bold">+18.5%</div>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Efficiency Gain:</span>
                    <div className="text-blue-900 font-bold">+22.3%</div>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Cost Reduction:</span>
                    <div className="text-blue-900 font-bold">-15.2%</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Opportunities Tab */}
        <TabsContent value="opportunities" className="space-y-6">
          <div className="space-y-4">
            {dashboardData.improvement_opportunities.map((opportunity) => (
              <Card key={opportunity.location_id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{opportunity.location_name}</CardTitle>
                      <CardDescription>{opportunity.opportunity_type}</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-green-600">
                      {formatCurrency(opportunity.potential_impact)} potential
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h5 className="font-medium text-sm mb-2">Recommended Actions:</h5>
                      <ul className="space-y-1">
                        {opportunity.recommended_actions.map((action, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-blue-600 mt-1">•</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-gray-500">Timeline: {opportunity.timeline}</span>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}