"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AnalyticsCard, AnalyticsCardGrid } from '@/components/analytics/shared/AnalyticsCard'
import { 
  TrendingUpIcon,
  TrendingDownIcon,
  CurrencyDollarIcon,
  UsersIcon,
  EyeIcon,
  ChartBarIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { getCustomerPixels, type TrackingPixel } from '@/lib/api'
import ConversionMetricsPanel from './ConversionMetricsPanel'
import PlatformComparisonCharts from './PlatformComparisonCharts'
import ConversionFunnelChart from './ConversionFunnelChart'

interface ConversionMetrics {
  platform: string
  icon: string
  page_views: number
  bookings: number
  conversion_rate: number
  revenue: number
  cost_per_booking: number
  roi: number
  last_24h: {
    bookings: number
    revenue: number
    change_percent: number
  }
  last_7d: {
    bookings: number
    revenue: number
    change_percent: number
  }
  status: 'active' | 'warning' | 'error'
  last_event_time: string
}

interface ConversionFunnel {
  step: string
  visitors: number
  conversion_rate: number
  drop_off_rate: number
}

interface TrackingAnalytics {
  overview: {
    total_revenue: number
    total_bookings: number
    average_booking_value: number
    overall_conversion_rate: number
    total_page_views: number
    revenue_growth: number
    booking_growth: number
  }
  platforms: ConversionMetrics[]
  funnel: ConversionFunnel[]
  attribution: {
    first_touch: Record<string, number>
    last_touch: Record<string, number>
    assisted: Record<string, number>
  }
  real_time: {
    active_visitors: number
    bookings_today: number
    revenue_today: number
    events_last_hour: number
  }
}

interface TrackingAnalyticsDashboardProps {
  pixels: TrackingPixel
  timeRange: '24h' | '7d' | '30d'
  onTimeRangeChange: (range: '24h' | '7d' | '30d') => void
}

export default function TrackingAnalyticsDashboard({ 
  pixels, 
  timeRange = '7d',
  onTimeRangeChange 
}: TrackingAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<TrackingAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Mock data generator - In production, this would fetch from tracking API
  const generateMockAnalytics = (): TrackingAnalytics => {
    const platforms: ConversionMetrics[] = []

    if (pixels.gtm_container_id) {
      platforms.push({
        platform: 'Google Tag Manager',
        icon: '🏷️',
        page_views: Math.floor(Math.random() * 5000) + 1000,
        bookings: Math.floor(Math.random() * 50) + 10,
        conversion_rate: Math.random() * 3 + 1.5,
        revenue: Math.floor(Math.random() * 15000) + 5000,
        cost_per_booking: Math.floor(Math.random() * 50) + 25,
        roi: Math.random() * 200 + 150,
        last_24h: {
          bookings: Math.floor(Math.random() * 8) + 2,
          revenue: Math.floor(Math.random() * 2000) + 500,
          change_percent: Math.random() * 40 - 20
        },
        last_7d: {
          bookings: Math.floor(Math.random() * 35) + 15,
          revenue: Math.floor(Math.random() * 8000) + 3000,
          change_percent: Math.random() * 60 - 30
        },
        status: 'active',
        last_event_time: new Date(Date.now() - Math.random() * 3600000).toISOString()
      })
    }

    if (pixels.ga4_measurement_id) {
      platforms.push({
        platform: 'Google Analytics 4',
        icon: '📊',
        page_views: Math.floor(Math.random() * 4500) + 800,
        bookings: Math.floor(Math.random() * 45) + 8,
        conversion_rate: Math.random() * 2.8 + 1.2,
        revenue: Math.floor(Math.random() * 12000) + 4000,
        cost_per_booking: 0, // GA4 doesn't have cost data
        roi: 0,
        last_24h: {
          bookings: Math.floor(Math.random() * 7) + 1,
          revenue: Math.floor(Math.random() * 1800) + 400,
          change_percent: Math.random() * 35 - 15
        },
        last_7d: {
          bookings: Math.floor(Math.random() * 30) + 12,
          revenue: Math.floor(Math.random() * 7000) + 2500,
          change_percent: Math.random() * 50 - 25
        },
        status: 'active',
        last_event_time: new Date(Date.now() - Math.random() * 1800000).toISOString()
      })
    }

    if (pixels.meta_pixel_id) {
      platforms.push({
        platform: 'Meta Pixel',
        icon: '📘',
        page_views: Math.floor(Math.random() * 3500) + 600,
        bookings: Math.floor(Math.random() * 40) + 6,
        conversion_rate: Math.random() * 2.5 + 1.0,
        revenue: Math.floor(Math.random() * 10000) + 3500,
        cost_per_booking: Math.floor(Math.random() * 45) + 30,
        roi: Math.random() * 180 + 120,
        last_24h: {
          bookings: Math.floor(Math.random() * 6) + 1,
          revenue: Math.floor(Math.random() * 1500) + 300,
          change_percent: Math.random() * 30 - 10
        },
        last_7d: {
          bookings: Math.floor(Math.random() * 25) + 10,
          revenue: Math.floor(Math.random() * 6000) + 2000,
          change_percent: Math.random() * 45 - 20
        },
        status: 'active',
        last_event_time: new Date(Date.now() - Math.random() * 2400000).toISOString()
      })
    }

    if (pixels.google_ads_conversion_id) {
      platforms.push({
        platform: 'Google Ads',
        icon: '🎯',
        page_views: Math.floor(Math.random() * 2500) + 400,
        bookings: Math.floor(Math.random() * 35) + 5,
        conversion_rate: Math.random() * 3.5 + 1.8,
        revenue: Math.floor(Math.random() * 9000) + 3000,
        cost_per_booking: Math.floor(Math.random() * 40) + 35,
        roi: Math.random() * 150 + 100,
        last_24h: {
          bookings: Math.floor(Math.random() * 5) + 1,
          revenue: Math.floor(Math.random() * 1200) + 250,
          change_percent: Math.random() * 25 - 5
        },
        last_7d: {
          bookings: Math.floor(Math.random() * 20) + 8,
          revenue: Math.floor(Math.random() * 5000) + 1800,
          change_percent: Math.random() * 40 - 15
        },
        status: 'active',
        last_event_time: new Date(Date.now() - Math.random() * 1200000).toISOString()
      })
    }

    const totalBookings = platforms.reduce((sum, p) => sum + p.bookings, 0)
    const totalRevenue = platforms.reduce((sum, p) => sum + p.revenue, 0)
    const totalPageViews = platforms.reduce((sum, p) => sum + p.page_views, 0)

    return {
      overview: {
        total_revenue: totalRevenue,
        total_bookings: totalBookings,
        average_booking_value: totalBookings > 0 ? totalRevenue / totalBookings : 0,
        overall_conversion_rate: totalPageViews > 0 ? (totalBookings / totalPageViews) * 100 : 0,
        total_page_views: totalPageViews,
        revenue_growth: Math.random() * 40 - 10,
        booking_growth: Math.random() * 35 - 5
      },
      platforms,
      funnel: [
        { step: 'Page Views', visitors: totalPageViews, conversion_rate: 100, drop_off_rate: 0 },
        { step: 'Booking Page', visitors: Math.floor(totalPageViews * 0.15), conversion_rate: 15, drop_off_rate: 85 },
        { step: 'Service Selected', visitors: Math.floor(totalPageViews * 0.08), conversion_rate: 8, drop_off_rate: 47 },
        { step: 'Payment Started', visitors: Math.floor(totalPageViews * 0.04), conversion_rate: 4, drop_off_rate: 50 },
        { step: 'Booking Complete', visitors: totalBookings, conversion_rate: totalPageViews > 0 ? (totalBookings / totalPageViews) * 100 : 0, drop_off_rate: 25 }
      ],
      attribution: {
        first_touch: { 'Google Ads': 40, 'Meta Ads': 25, 'Organic': 20, 'Direct': 15 },
        last_touch: { 'Google Ads': 35, 'Meta Ads': 30, 'Organic': 25, 'Direct': 10 },
        assisted: { 'Google Ads': 45, 'Meta Ads': 35, 'Organic': 15, 'Direct': 5 }
      },
      real_time: {
        active_visitors: Math.floor(Math.random() * 50) + 10,
        bookings_today: Math.floor(Math.random() * 12) + 3,
        revenue_today: Math.floor(Math.random() * 3000) + 800,
        events_last_hour: Math.floor(Math.random() * 25) + 5
      }
    }
  }

  const fetchAnalytics = async () => {
    try {
      setRefreshing(true)
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // In production, this would call the actual tracking analytics API
      // const response = await fetch(`/api/v1/tracking/analytics?range=${timeRange}`)
      // const data = await response.json()
      
      const mockData = generateMockAnalytics()
      setAnalytics(mockData)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to fetch tracking analytics:', error)
      toast.error('Failed to load tracking analytics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (pixels.tracking_enabled) {
      fetchAnalytics()
    } else {
      setLoading(false)
    }
  }, [timeRange, pixels.tracking_enabled])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!pixels.tracking_enabled) return

    const interval = setInterval(() => {
      fetchAnalytics()
    }, 300000) // 5 minutes

    return () => clearInterval(interval)
  }, [pixels.tracking_enabled])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now.getTime() - time.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  if (!pixels.tracking_enabled) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Tracking Disabled</h3>
          <p className="text-gray-500 mb-4">
            Enable tracking to view conversion analytics and ROI metrics.
          </p>
          <Badge variant="secondary">Analytics Unavailable</Badge>
        </CardContent>
      </Card>
    )
  }

  if (loading || !analytics) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <AnalyticsCard key={i} title="" value="" loading />
          ))}
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-gray-500">Loading analytics data...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const overviewMetrics = [
    {
      title: 'Total Revenue',
      value: formatCurrency(analytics.overview.total_revenue),
      change: analytics.overview.revenue_growth,
      trend: analytics.overview.revenue_growth > 0 ? 'up' : analytics.overview.revenue_growth < 0 ? 'down' : 'neutral',
      icon: <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
    },
    {
      title: 'Conversions',
      value: analytics.overview.total_bookings,
      change: analytics.overview.booking_growth,
      trend: analytics.overview.booking_growth > 0 ? 'up' : analytics.overview.booking_growth < 0 ? 'down' : 'neutral',
      icon: <CheckCircleIcon className="w-6 h-6 text-blue-600" />
    },
    {
      title: 'Conversion Rate',
      value: `${analytics.overview.overall_conversion_rate.toFixed(2)}%`,
      icon: <ChartBarIcon className="w-6 h-6 text-purple-600" />
    },
    {
      title: 'Avg. Booking Value',
      value: formatCurrency(analytics.overview.average_booking_value),
      icon: <TrendingUpIcon className="w-6 h-6 text-orange-600" />
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header with refresh controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Real-Time Analytics</h3>
          <p className="text-sm text-gray-500">
            {lastUpdated && `Last updated ${getTimeAgo(lastUpdated.toISOString())}`}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['24h', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => onTimeRangeChange(range)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalytics}
            disabled={refreshing}
            className="h-8"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview metrics */}
      <AnalyticsCardGrid metrics={overviewMetrics} />

      {/* Real-time metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
            Real-Time Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {analytics.real_time.active_visitors}
              </div>
              <div className="text-xs text-gray-500">Active Visitors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {analytics.real_time.bookings_today}
              </div>
              <div className="text-xs text-gray-500">Bookings Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(analytics.real_time.revenue_today)}
              </div>
              <div className="text-xs text-gray-500">Revenue Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {analytics.real_time.events_last_hour}
              </div>
              <div className="text-xs text-gray-500">Events (1h)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="platforms" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="platforms">Platform Performance</TabsTrigger>
          <TabsTrigger value="roi">ROI & Metrics</TabsTrigger>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
          <TabsTrigger value="attribution">Attribution</TabsTrigger>
        </TabsList>

        <TabsContent value="platforms" className="space-y-4">
          <PlatformComparisonCharts 
            platforms={analytics.platforms}
            timeRange={timeRange}
          />
          
          <div className="grid gap-4">
            <h4 className="text-lg font-semibold">Platform Details</h4>
            {analytics.platforms.map((platform, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">{platform.icon}</span>
                      {platform.platform}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={platform.status === 'active' ? 'success' : 'warning'}>
                        {platform.status}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {getTimeAgo(platform.last_event_time)}
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                    <div>
                      <div className="text-lg font-semibold">{platform.page_views.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Page Views</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{platform.bookings}</div>
                      <div className="text-xs text-gray-500">Bookings</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{platform.conversion_rate.toFixed(2)}%</div>
                      <div className="text-xs text-gray-500">Conv. Rate</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{formatCurrency(platform.revenue)}</div>
                      <div className="text-xs text-gray-500">Revenue</div>
                    </div>
                    {platform.cost_per_booking > 0 && (
                      <div>
                        <div className="text-lg font-semibold">{formatCurrency(platform.cost_per_booking)}</div>
                        <div className="text-xs text-gray-500">Cost/Booking</div>
                      </div>
                    )}
                    {platform.roi > 0 && (
                      <div>
                        <div className="text-lg font-semibold text-green-600">{platform.roi.toFixed(0)}%</div>
                        <div className="text-xs text-gray-500">ROI</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <div className="text-sm font-medium mb-1">Last 24h</div>
                      <div className="flex items-center space-x-4">
                        <div>
                          <span className="text-sm font-semibold">{platform.last_24h.bookings}</span>
                          <span className="text-xs text-gray-500 ml-1">bookings</span>
                        </div>
                        <div>
                          <span className="text-sm font-semibold">{formatCurrency(platform.last_24h.revenue)}</span>
                        </div>
                        <div className={`text-xs flex items-center ${
                          platform.last_24h.change_percent > 0 ? 'text-green-600' : 
                          platform.last_24h.change_percent < 0 ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {platform.last_24h.change_percent > 0 ? (
                            <TrendingUpIcon className="w-3 h-3 mr-1" />
                          ) : platform.last_24h.change_percent < 0 ? (
                            <TrendingDownIcon className="w-3 h-3 mr-1" />
                          ) : null}
                          {Math.abs(platform.last_24h.change_percent).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">Last 7d</div>
                      <div className="flex items-center space-x-4">
                        <div>
                          <span className="text-sm font-semibold">{platform.last_7d.bookings}</span>
                          <span className="text-xs text-gray-500 ml-1">bookings</span>
                        </div>
                        <div>
                          <span className="text-sm font-semibold">{formatCurrency(platform.last_7d.revenue)}</span>
                        </div>
                        <div className={`text-xs flex items-center ${
                          platform.last_7d.change_percent > 0 ? 'text-green-600' : 
                          platform.last_7d.change_percent < 0 ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {platform.last_7d.change_percent > 0 ? (
                            <TrendingUpIcon className="w-3 h-3 mr-1" />
                          ) : platform.last_7d.change_percent < 0 ? (
                            <TrendingDownIcon className="w-3 h-3 mr-1" />
                          ) : null}
                          {Math.abs(platform.last_7d.change_percent).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="roi" className="space-y-4">
          <ConversionMetricsPanel 
            platforms={analytics.platforms}
            timeRange={timeRange}
          />
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <ConversionFunnelChart 
            funnel={analytics.funnel}
            timeRange={timeRange}
            totalRevenue={analytics.overview.total_revenue}
          />
        </TabsContent>

        <TabsContent value="attribution" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-4">
            {Object.entries(analytics.attribution).map(([model, data]) => (
              <Card key={model}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base capitalize">
                    {model.replace('_', '-')} Attribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(data).map(([channel, percentage]) => (
                      <div key={channel} className="flex items-center justify-between">
                        <span className="text-sm">{channel}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8 text-right">
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
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