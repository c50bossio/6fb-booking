'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  ChartBarIcon,
  EnvelopeOpenIcon,
  CursorArrowRaysIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  EyeIcon,
  PhoneIcon,
  ChatBubbleOvalLeftIcon,
  CreditCardIcon,
  UserGroupIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import { LineChart, BarChart, DoughnutChart, PieChart, GaugeChart, chartUtils } from '@/components/analytics/ChartComponents'
import { LoadingStates } from '@/components/ui/LoadingStates'
import { trackingAPI } from '@/lib/api/tracking'
import { 
  ConversionAnalytics, 
  AttributionReport, 
  AttributionModel, 
  TrackingHealthStatus,
  CampaignTrackingResponse,
  ConversionGoalResponse
} from '@/types/tracking'

// Comprehensive analytics interfaces
interface UnifiedMetrics {
  totalConversions: number
  totalRevenue: number
  conversionRate: number
  averageOrderValue: number
  customerLifetimeValue: number
  returnOnAdSpend: number
  costPerAcquisition: number
  revenueGrowth: number
}

interface ChannelAnalytics {
  channel: string
  source: string
  impressions: number
  clicks: number
  conversions: number
  revenue: number
  cost: number
  ctr: number
  conversionRate: number
  cpc: number
  cpa: number
  roas: number
  roi: number
  attribution_credit: number
}

interface ConversionFunnelStage {
  stage: string
  visitors: number
  conversions: number
  rate: number
  dropoff: number
}

interface CustomerSegment {
  segment: string
  customers: number
  revenue: number
  ltv: number
  acquisitionCost: number
  roi: number
}

export default function MarketingAnalyticsDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('last30days')
  const [attributionModel, setAttributionModel] = useState<AttributionModel>(AttributionModel.LAST_CLICK)
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])
  const [exportFormat, setExportFormat] = useState('pdf')
  
  // Data states
  const [unifiedMetrics, setUnifiedMetrics] = useState<UnifiedMetrics | null>(null)
  const [channelAnalytics, setChannelAnalytics] = useState<ChannelAnalytics[]>([])
  const [conversionFunnel, setConversionFunnel] = useState<ConversionFunnelStage[]>([])
  const [customerSegments, setCustomerSegments] = useState<CustomerSegment[]>([])
  const [trackingHealth, setTrackingHealth] = useState<TrackingHealthStatus | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignTrackingResponse[]>([])
  const [goals, setGoals] = useState<ConversionGoalResponse[]>([])
  const [attributionReport, setAttributionReport] = useState<AttributionReport | null>(null)
  const [analytics, setAnalytics] = useState<ConversionAnalytics | null>(null)

  useEffect(() => {
    loadAnalyticsData()
  }, [dateRange, attributionModel])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)

      const endDate = new Date().toISOString().split('T')[0]
      const startDate = getDateRangeStart(dateRange)

      // Load all analytics data in parallel
      const [
        analyticsData,
        attributionData,
        healthData,
        campaignsData,
        goalsData
      ] = await Promise.all([
        trackingAPI.getAnalytics({ start_date: startDate, end_date: endDate }),
        trackingAPI.getAttributionReport({ 
          model: attributionModel, 
          start_date: startDate, 
          end_date: endDate 
        }),
        trackingAPI.getHealthStatus(),
        trackingAPI.campaigns.list({ 
          is_active: true, 
          start_date: startDate, 
          end_date: endDate 
        }),
        trackingAPI.goals.list({ is_active: true })
      ])

      setAnalytics(analyticsData)
      setAttributionReport(attributionData)
      setTrackingHealth(healthData)
      setCampaigns(campaignsData)
      setGoals(goalsData)

      // Process and transform data
      await processAnalyticsData(analyticsData, attributionData, campaignsData)
      
    } catch (err) {
      console.error('Failed to load analytics data:', err)
      setError('Failed to load analytics data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const processAnalyticsData = async (
    analytics: ConversionAnalytics,
    attribution: AttributionReport,
    campaigns: CampaignTrackingResponse[]
  ) => {
    // Process unified metrics
    const totalCost = campaigns.reduce((sum, c) => sum + c.total_cost, 0)
    const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0)
    const avgCLV = 850 // This would come from actual CLV calculation
    
    setUnifiedMetrics({
      totalConversions: analytics.total_conversions,
      totalRevenue: analytics.total_revenue,
      conversionRate: analytics.conversion_rate,
      averageOrderValue: analytics.average_order_value,
      customerLifetimeValue: avgCLV,
      returnOnAdSpend: totalCost > 0 ? (analytics.total_revenue / totalCost) : 0,
      costPerAcquisition: analytics.total_conversions > 0 ? (totalCost / analytics.total_conversions) : 0,
      revenueGrowth: 12.5 // This would be calculated from period comparison
    })

    // Process channel analytics
    const channelData: ChannelAnalytics[] = analytics.channel_performance.map(channel => {
      const campaignData = campaigns.find(c => 
        c.campaign_source.toLowerCase() === channel.channel.toLowerCase()
      )
      
      return {
        channel: channel.channel,
        source: campaignData?.campaign_source || channel.channel,
        impressions: campaignData?.impressions || 0,
        clicks: campaignData?.clicks || 0,
        conversions: channel.conversions,
        revenue: channel.revenue,
        cost: campaignData?.total_cost || 0,
        ctr: campaignData?.ctr || 0,
        conversionRate: channel.conversion_rate,
        cpc: campaignData?.cpc || 0,
        cpa: campaignData?.cpa || 0,
        roas: campaignData?.roas || channel.roi,
        roi: channel.roi,
        attribution_credit: channel.attributed_revenue / channel.revenue
      }
    })
    setChannelAnalytics(channelData)

    // Process conversion funnel (mock data - would be calculated from actual events)
    const funnelData: ConversionFunnelStage[] = [
      { stage: 'Website Visitors', visitors: 15420, conversions: 15420, rate: 100, dropoff: 0 },
      { stage: 'Service Page Views', visitors: 8940, conversions: 8940, rate: 58.0, dropoff: 42.0 },
      { stage: 'Booking Started', visitors: 3250, conversions: 3250, rate: 36.4, dropoff: 21.6 },
      { stage: 'Contact Info', visitors: 2180, conversions: 2180, rate: 67.1, dropoff: 32.9 },
      { stage: 'Payment Info', visitors: 1620, conversions: 1620, rate: 74.3, dropoff: 25.7 },
      { stage: 'Booking Complete', visitors: 1280, conversions: 1280, rate: 79.0, dropoff: 21.0 }
    ]
    setConversionFunnel(funnelData)

    // Process customer segments (mock data)
    const segmentData: CustomerSegment[] = [
      { segment: 'New Customers', customers: 420, revenue: 35200, ltv: 520, acquisitionCost: 45, roi: 1055 },
      { segment: 'Returning Customers', customers: 680, revenue: 89600, ltv: 1240, acquisitionCost: 25, roi: 4860 },
      { segment: 'VIP Customers', customers: 125, revenue: 48900, ltv: 2100, acquisitionCost: 85, roi: 2370 },
      { segment: 'At-Risk Customers', customers: 89, revenue: 12400, ltv: 890, acquisitionCost: 65, roi: 1269 }
    ]
    setCustomerSegments(segmentData)
  }

  const getDateRangeStart = (range: string): string => {
    const now = new Date()
    const days = {
      'last7days': 7,
      'last30days': 30,
      'last90days': 90,
      'thisYear': 365
    }[range] || 30
    
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
    return startDate.toISOString().split('T')[0]
  }

  const handleExport = async () => {
    try {
      const data = {
        unifiedMetrics,
        channelAnalytics,
        conversionFunnel,
        customerSegments,
        dateRange,
        attributionModel,
        generatedAt: new Date().toISOString()
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `marketing-analytics-${dateRange}-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  const renderChannelChart = () => {
    if (!channelAnalytics.length) return null

    const chartData = {
      labels: channelAnalytics.map(c => c.channel),
      datasets: [
        {
          label: 'Revenue',
          data: channelAnalytics.map(c => c.revenue),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          label: 'ROAS',
          data: channelAnalytics.map(c => c.roas),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1,
          type: 'line' as const,
          yAxisID: 'y1'
        }
      ]
    }

    const options = {
      responsive: true,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      scales: {
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          ticks: {
            callback: function(value: any) {
              return '$' + value.toLocaleString()
            }
          }
        },
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            callback: function(value: any) {
              return value.toFixed(1) + 'x'
            }
          }
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context: any) {
              if (context.dataset.label === 'Revenue') {
                return `Revenue: $${context.parsed.y.toLocaleString()}`
              } else {
                return `ROAS: ${context.parsed.y.toFixed(1)}x`
              }
            }
          }
        }
      }
    }

    return <BarChart data={chartData} options={options} height={350} />
  }

  const renderFunnelChart = () => {
    if (!conversionFunnel.length) return null

    const chartData = {
      labels: conversionFunnel.map(stage => stage.stage),
      datasets: [{
        label: 'Conversion Rate',
        data: conversionFunnel.map(stage => stage.rate),
        backgroundColor: [
          'rgba(99, 102, 241, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)'
        ],
        borderColor: [
          'rgb(99, 102, 241)',
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
          'rgb(139, 92, 246)'
        ],
        borderWidth: 1
      }]
    }

    return <BarChart data={chartData} options={chartUtils.defaultOptions.percentage} height={300} />
  }

  const renderAttributionChart = () => {
    if (!attributionReport?.channels.length) return null

    const chartData = {
      labels: attributionReport.channels.map(channel => channel.name || 'Unknown'),
      datasets: [{
        data: attributionReport.channels.map(channel => channel.attributed_revenue || 0),
        backgroundColor: [
          '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#6366F1'
        ],
        borderWidth: 2,
        borderColor: '#FFFFFF'
      }]
    }

    return <DoughnutChart data={chartData} height={300} />
  }

  if (loading) {
    return <LoadingStates.Dashboard />
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Analytics
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Button onClick={loadAnalyticsData}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Marketing Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Unified marketing performance across all channels
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExport}>
            <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
            Export Report
          </Button>
          <Button variant="outline">
            <CogIcon className="w-5 h-5 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Tracking Health Status */}
      {trackingHealth && (
        <Card className={`border-l-4 ${
          trackingHealth.status === 'healthy' ? 'border-l-green-500' :
          trackingHealth.status === 'degraded' ? 'border-l-yellow-500' : 'border-l-red-500'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {trackingHealth.status === 'healthy' ? (
                  <CheckCircleIcon className="w-6 h-6 text-green-500" />
                ) : trackingHealth.status === 'degraded' ? (
                  <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />
                ) : (
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Tracking Status: {trackingHealth.status.charAt(0).toUpperCase() + trackingHealth.status.slice(1)}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {trackingHealth.events_last_24h} events tracked in the last 24 hours
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className={`flex items-center gap-1 ${trackingHealth.integrations.gtm.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${trackingHealth.integrations.gtm.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                  GTM
                </div>
                <div className={`flex items-center gap-1 ${trackingHealth.integrations.meta.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${trackingHealth.integrations.meta.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                  Meta
                </div>
                <div className={`flex items-center gap-1 ${trackingHealth.integrations.google_ads.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${trackingHealth.integrations.google_ads.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                  Google Ads
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Date Range and Attribution Model Selectors */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-gray-500" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="last7days">Last 7 days</option>
                <option value="last30days">Last 30 days</option>
                <option value="last90days">Last 90 days</option>
                <option value="thisYear">This year</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-gray-500" />
              <select
                value={attributionModel}
                onChange={(e) => setAttributionModel(e.target.value as AttributionModel)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={AttributionModel.LAST_CLICK}>Last Click</option>
                <option value={AttributionModel.FIRST_CLICK}>First Click</option>
                <option value={AttributionModel.LINEAR}>Linear</option>
                <option value={AttributionModel.TIME_DECAY}>Time Decay</option>
                <option value={AttributionModel.POSITION_BASED}>Position Based</option>
                <option value={AttributionModel.DATA_DRIVEN}>Data Driven</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unified Metrics Overview */}
      {unifiedMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <CreditCardIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                ${unifiedMetrics.totalRevenue.toLocaleString()}
              </div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Revenue
              </div>
              <div className="text-xs text-green-600 mt-1">
                +{unifiedMetrics.revenueGrowth}% vs last period
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <ArrowTrendingUpIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {unifiedMetrics.returnOnAdSpend.toFixed(1)}x
              </div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Return on Ad Spend
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <UserGroupIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                ${unifiedMetrics.customerLifetimeValue.toLocaleString()}
              </div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Customer Lifetime Value
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <CursorArrowRaysIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {unifiedMetrics.conversionRate.toFixed(1)}%
              </div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Overall Conversion Rate
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Channel Performance and Attribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5" />
              Channel Performance & ROI
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderChannelChart()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5" />
              Attribution Analysis ({attributionModel.replace('_', ' ')})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderAttributionChart()}
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel and Customer Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5" />
              Conversion Funnel Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderFunnelChart()}
            <div className="mt-4 space-y-2">
              {conversionFunnel.map((stage, index) => (
                <div key={stage.stage} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{stage.stage}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-900 dark:text-white font-medium">
                      {stage.visitors.toLocaleString()} ({stage.rate.toFixed(1)}%)
                    </span>
                    {index > 0 && (
                      <span className="text-red-500 text-xs">
                        -{stage.dropoff.toFixed(1)}% dropoff
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserGroupIcon className="w-5 h-5" />
              Customer Segment Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {customerSegments.map(segment => (
                <div key={segment.segment} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {segment.segment}
                    </h4>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {segment.customers} customers
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Revenue:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        ${segment.revenue.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">LTV:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        ${segment.ltv}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">CAC:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">
                        ${segment.acquisitionCost}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">ROI:</span>
                      <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                        {segment.roi}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Channel Analytics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Channel Analytics</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Channel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Impressions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Clicks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    CTR
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Conversions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Conv. Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    ROAS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    CPA
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {channelAnalytics.map(channel => (
                  <tr key={channel.channel} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {channel.channel}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {channel.source}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {channel.impressions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {channel.clicks.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {channel.ctr.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {channel.conversions}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {channel.conversionRate.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-green-600 dark:text-green-400">
                      ${channel.revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      ${channel.cost.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-blue-600 dark:text-blue-400">
                      {channel.roas.toFixed(1)}x
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      ${channel.cpa.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Tracking Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5" />
            Real-time Tracking Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <GaugeChart 
                value={trackingHealth?.status === 'healthy' ? 98 : trackingHealth?.status === 'degraded' ? 75 : 45}
                title="System Health"
                height={200}
              />
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-white">Active Goals</h4>
              {goals.slice(0, 3).map(goal => (
                <div key={goal.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{goal.name}</span>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {goal.total_conversions}
                    </div>
                    <div className="text-xs text-gray-500">
                      ${goal.total_value.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Booking completed - $85
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Email campaign click
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Form submission
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}