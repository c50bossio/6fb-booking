'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  DollarSign, 
  Clock,
  Target,
  BarChart3,
  PieChart,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Star
} from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

// Chart components - in a real implementation, these would use a library like Chart.js or Recharts
import RevenueChart from './charts/RevenueChart'
import ClientAnalyticsChart from './charts/ClientAnalyticsChart'
import PerformanceChart from './charts/PerformanceChart'
import SixFBScoreChart from './charts/SixFBScoreChart'

interface DashboardData {
  overview: {
    total_revenue: number
    revenue_growth_percent: number
    total_appointments: number
    unique_clients: number
    average_ticket_size: number
    booking_efficiency_percent: number
    revenue_per_hour: number
    period_start: string
    period_end: string
  }
  revenue_analytics: any
  client_analytics: any
  barber_performance: any
  business_intelligence: any
  six_fb_alignment: any
  trends: any
  recommendations: any[]
  predictions?: any
}

interface AnalyticsDashboardProps {
  userId?: number
}

export default function AnalyticsDashboard({ userId }: AnalyticsDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState(30)
  const [activeTab, setActiveTab] = useState('overview')

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/analytics/dashboard?date_range_days=${dateRange}&include_predictions=true`)
      setDashboardData(response.data)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Failed to load analytics dashboard')
    } finally {
      setLoading(false)
    }
  }

  // Refresh dashboard data
  const refreshDashboard = async () => {
    try {
      setRefreshing(true)
      await api.post('/analytics/dashboard/refresh')
      toast.success('Dashboard refresh initiated')
      // Reload data after a short delay
      setTimeout(() => {
        loadDashboardData()
      }, 2000)
    } catch (error) {
      console.error('Error refreshing dashboard:', error)
      toast.error('Failed to refresh dashboard')
    } finally {
      setRefreshing(false)
    }
  }

  // Export analytics report
  const exportReport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      const response = await api.post(`/analytics/export?format=${format}&date_range_days=${dateRange}`)
      toast.success(`${format.toUpperCase()} report generation started`)
    } catch (error) {
      console.error('Error exporting report:', error)
      toast.error('Failed to start report export')
    }
  }

  // Load data on component mount and when date range changes
  useEffect(() => {
    loadDashboardData()
  }, [dateRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics dashboard...</p>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-600">Unable to load analytics data. Please try again.</p>
        <Button onClick={loadDashboardData} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  const { overview } = dashboardData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Six Figure Barber Analytics</h1>
          <p className="text-gray-600 mt-1">
            Performance insights for {new Date(overview.period_start).toLocaleDateString()} - {new Date(overview.period_end).toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Date Range Selector */}
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          
          {/* Export Button */}
          <Button variant="outline" onClick={() => exportReport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          
          {/* Refresh Button */}
          <Button 
            variant="outline" 
            onClick={refreshDashboard}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${overview.total_revenue.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {overview.revenue_growth_percent >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={overview.revenue_growth_percent >= 0 ? 'text-green-500' : 'text-red-500'}>
                {Math.abs(overview.revenue_growth_percent).toFixed(1)}%
              </span>
              <span className="ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.total_appointments}</div>
            <p className="text-xs text-muted-foreground">
              {overview.unique_clients} unique clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Ticket</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${overview.average_ticket_size.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${overview.revenue_per_hour.toFixed(2)}/hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booking Efficiency</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.booking_efficiency_percent.toFixed(1)}%</div>
            <Progress value={overview.booking_efficiency_percent} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Six Figure Barber Score */}
      {dashboardData.six_fb_alignment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="h-5 w-5 text-yellow-500 mr-2" />
              Six Figure Barber Methodology Score
            </CardTitle>
            <CardDescription>
              Your overall alignment with Six Figure Barber principles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {dashboardData.six_fb_alignment.overall_score?.toFixed(1) || '75.0'}
                </div>
                <p className="text-sm text-gray-600">Overall Score</p>
                <Badge variant={
                  (dashboardData.six_fb_alignment.overall_score || 75) >= 85 ? 'default' : 
                  (dashboardData.six_fb_alignment.overall_score || 75) >= 70 ? 'secondary' : 'destructive'
                }>
                  {(dashboardData.six_fb_alignment.overall_score || 75) >= 85 ? 'Excellent' : 
                   (dashboardData.six_fb_alignment.overall_score || 75) >= 70 ? 'Good' : 'Needs Improvement'}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Principle Scores</h4>
                {Object.entries(dashboardData.six_fb_alignment.principle_scores || {}).map(([principle, score]) => (
                  <div key={principle} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{principle.replace('_', ' ')}</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={score as number} className="w-20" />
                      <span className="text-sm font-medium w-10">{(score as number).toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Milestone Progress</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current: {dashboardData.six_fb_alignment.milestone_progress?.current_level || 'Developing'}</span>
                    <span>Next: {dashboardData.six_fb_alignment.milestone_progress?.next_target || 'Professional'}</span>
                  </div>
                  <Progress 
                    value={dashboardData.six_fb_alignment.milestone_progress?.progress_percent || 65} 
                    className="mb-2" 
                  />
                  <p className="text-xs text-gray-600">
                    Est. {dashboardData.six_fb_alignment.milestone_progress?.estimated_days || 45} days to next milestone
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueChart data={dashboardData.revenue_analytics?.daily_trends || []} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Six FB Alignment</CardTitle>
              </CardHeader>
              <CardContent>
                <SixFBScoreChart data={dashboardData.six_fb_alignment} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Revenue Trends</CardTitle>
                <CardDescription>Revenue performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueChart data={dashboardData.revenue_analytics?.daily_trends || []} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service Performance</CardTitle>
                <CardDescription>Revenue by service type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.revenue_analytics?.service_performance?.slice(0, 5).map((service: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{service.service_name}</p>
                        <p className="text-sm text-gray-600">{service.bookings} bookings</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${service.revenue.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">${service.average_price.toFixed(2)} avg</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Peak Hours Analysis</CardTitle>
              <CardDescription>Best performing hours of the day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-4">
                {dashboardData.revenue_analytics?.peak_hours?.map((hour: any) => (
                  <div key={hour.hour} className="text-center p-3 border rounded-lg">
                    <div className="font-medium">{hour.hour}:00</div>
                    <div className="text-sm text-gray-600">{hour.bookings} bookings</div>
                    <div className="text-sm font-medium">${hour.revenue.toFixed(0)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Client Retention</CardTitle>
                <CardDescription>Client loyalty and retention metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <ClientAnalyticsChart data={dashboardData.client_analytics} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Client Lifetime Value</CardTitle>
                <CardDescription>Value distribution across client base</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.client_analytics?.client_lifetime_value?.top_clients?.slice(0, 5).map((client: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Client #{client.client_id}</p>
                        <p className="text-sm text-gray-600">{client.visit_count} visits</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${client.total_spent.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">${client.avg_ticket.toFixed(2)} avg</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Efficiency</CardTitle>
              <CardDescription>Time management and service delivery metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceChart data={dashboardData.barber_performance} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actionable Recommendations</CardTitle>
              <CardDescription>AI-powered insights to improve your business</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.recommendations?.map((rec: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{rec.title}</h4>
                      <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'secondary' : 'outline'}>
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-gray-600 mb-3">{rec.description}</p>
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-sm font-medium text-blue-900 mb-2">Expected Impact: {rec.expected_impact}</p>
                      <p className="text-sm text-blue-700">Six FB Principle: {rec.six_fb_principle.replace('_', ' ')}</p>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">Action Items:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {rec.action_items?.map((item: string, i: number) => (
                          <li key={i} className="flex items-start">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
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