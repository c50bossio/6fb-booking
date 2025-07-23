'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingStates } from '@/components/LoadingStates'
import RealTimeAnalytics from './RealTimeAnalytics'
import { 
  ChartBarIcon,
  FunnelIcon,
  ArrowTrendingUpIcon,
  CursorArrowRaysIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CalendarIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'

// Types for our marketing analytics data
interface MarketingOverview {
  total_conversions: number
  total_revenue: number
  conversion_rate: number
  average_order_value: number
  date_range: {
    start: string
    end: string
  }
}

interface LandingPageMetrics {
  page_views: number
  unique_visitors: number
  bounce_rate: number
  time_on_page: number
  cta_clicks: number
  form_submissions: number
  conversions: number
  conversion_rate: number
}

interface ChannelPerformance {
  channel: string
  visits: number
  conversions: number
  conversion_rate: number
  revenue: number
  cost: number
  roi: number
}

interface ConversionFunnel {
  stages: Array<{
    name: string
    count: number
    rate: number
  }>
  overall_conversion_rate: number
  biggest_dropoff: {
    stage: string
    rate: number
  }
}

interface IntegrationHealth {
  status: string
  healthy_integrations: number
  total_integrations: number
  integrations: Array<{
    type: string
    status: string
    last_sync: string | null
    error: string | null
  }>
}

interface MarketingAnalyticsData {
  overview: MarketingOverview
  landing_page: LandingPageMetrics
  channels: ChannelPerformance[]
  funnel: ConversionFunnel
  integrations: IntegrationHealth
  trends: {
    daily_data: Array<{
      date: string
      conversions: number
      revenue: number
    }>
    growth_rate: number
    trend_direction: string
  }
}

interface MarketingAnalyticsDashboardProps {
  organizationId?: string
}

export default function MarketingAnalyticsDashboard({ organizationId }: MarketingAnalyticsDashboardProps) {
  const [data, setData] = useState<MarketingAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState<string>('30') // days

  // Fetch marketing analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(dateRange))
      
      const response = await fetch(`/api/v2/marketing/analytics/overview?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const analyticsData = await response.json()
      setData(analyticsData)
      
    } catch (err) {
      console.error('Error fetching marketing analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true)
    await fetchAnalytics()
    setRefreshing(false)
  }

  // Export data
  const exportData = async (format: 'csv' | 'json' | 'pdf') => {
    try {
      const response = await fetch(`/api/v2/marketing/analytics/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (response.ok) {
        const result = await response.json()
        // TODO: Handle actual file download
        console.log('Export prepared:', result)
      }
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  if (loading) {
    return <LoadingStates.Loading message="Loading marketing analytics..." />
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Error</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={fetchAnalytics} variant="outline">
          <ArrowPathIcon className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    )
  }

  if (!data) {
    return <div className="p-6 text-center text-gray-500">No analytics data available</div>
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'excellent':
        return 'text-green-600'
      case 'good':
        return 'text-yellow-600'
      case 'needs_attention':
      case 'expired':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'excellent':
        return <CheckCircleIcon className="w-5 h-5" />
      case 'good':
        return <ExclamationTriangleIcon className="w-5 h-5" />
      case 'needs_attention':
      case 'expired':
        return <ExclamationTriangleIcon className="w-5 h-5" />
      default:
        return null
    }
  }

  const getTrendIcon = (direction: string) => {
    return direction === 'up' ? '📈' : direction === 'down' ? '📉' : '📊'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing Analytics</h1>
          <p className="text-gray-600">
            Performance insights and attribution tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <Button
            onClick={refreshData}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => exportData('csv')}
            variant="outline"
            size="sm"
          >
            <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Real-Time Analytics */}
      <RealTimeAnalytics organizationId={organizationId} />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Conversions</p>
                <p className="text-2xl font-bold text-gray-900">{data.overview.total_conversions}</p>
              </div>
              <FunnelIcon className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${data.overview.total_revenue.toLocaleString()}</p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{data.overview.conversion_rate}%</p>
              </div>
              <ArrowTrendingUpIcon className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Order Value</p>
                <p className="text-2xl font-bold text-gray-900">${data.overview.average_order_value.toLocaleString()}</p>
              </div>
              <CursorArrowRaysIcon className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Landing Page Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GlobeAltIcon className="w-5 h-5" />
            Landing Page Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{data.landing_page.page_views}</p>
              <p className="text-sm text-gray-600">Page Views</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{data.landing_page.unique_visitors}</p>
              <p className="text-sm text-gray-600">Unique Visitors</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{data.landing_page.bounce_rate}%</p>
              <p className="text-sm text-gray-600">Bounce Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{data.landing_page.conversion_rate}%</p>
              <p className="text-sm text-gray-600">Conversion Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5" />
            Conversion Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.funnel.stages.map((stage, index) => (
              <div key={stage.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{stage.name}</p>
                    <p className="text-sm text-gray-600">{stage.count} users</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{stage.rate}%</p>
                  <p className="text-sm text-gray-600">conversion rate</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-700">
              <strong>Biggest Drop-off:</strong> {data.funnel.biggest_dropoff.stage} ({data.funnel.biggest_dropoff.rate}%)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Channel Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5" />
            Channel Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.channels.map((channel) => (
              <div key={channel.channel} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{channel.channel}</p>
                    <p className="text-sm text-gray-600">{channel.visits} visits</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">${channel.revenue.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">{channel.conversions} conversions</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${channel.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {channel.roi > 0 ? '+' : ''}{channel.roi}%
                  </p>
                  <p className="text-sm text-gray-600">ROI</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Integration Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5" />
            Integration Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={getStatusColor(data.integrations.status)}>
                {getStatusIcon(data.integrations.status)}
              </div>
              <span className={`font-medium ${getStatusColor(data.integrations.status)}`}>
                {data.integrations.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {data.integrations.healthy_integrations} of {data.integrations.total_integrations} integrations healthy
            </p>
          </div>
          
          <div className="space-y-3">
            {data.integrations.integrations.map((integration) => (
              <div key={integration.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={getStatusColor(integration.status)}>
                    {getStatusIcon(integration.status)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {integration.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    <p className="text-sm text-gray-600">
                      {integration.last_sync 
                        ? `Last sync: ${new Date(integration.last_sync).toLocaleDateString()}`
                        : 'Never synced'
                      }
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${getStatusColor(integration.status)}`}>
                  {integration.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-5 h-5" />
            Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getTrendIcon(data.trends.trend_direction)}</span>
              <div>
                <p className="font-medium text-gray-900">
                  {data.trends.growth_rate > 0 ? '+' : ''}{data.trends.growth_rate}% Growth
                </p>
                <p className="text-sm text-gray-600">Compared to previous period</p>
              </div>
            </div>
          </div>
          
          {/* Simple trend visualization */}
          <div className="space-y-2">
            {data.trends.daily_data.slice(-7).map((day, index) => (
              <div key={day.date} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {new Date(day.date).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{day.conversions} conversions</span>
                  <span className="text-sm text-gray-600">${day.revenue.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}