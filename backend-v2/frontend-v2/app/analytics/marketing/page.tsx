'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, type User } from '@/lib/api'
import { AnalyticsLayout, AnalyticsSectionLayout } from '@/components/analytics/AnalyticsLayout'
import { AnalyticsCardGrid } from '@/components/analytics/shared/AnalyticsCard'
import { AnalyticsFilters, FilterOption } from '@/components/analytics/shared/AnalyticsFilters'
import { DateRangeSelector, DateRangePreset } from '@/components/analytics/shared/DateRangeSelector'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AnalyticsLoading, LoadingStates } from '@/components/LoadingStates'
import { ErrorDisplay } from '@/components/LoadingStates'
import UsageChart from '@/components/marketing/UsageChart'
import { 
  EnvelopeOpenIcon,
  CursorArrowRaysIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'

interface MarketingAnalyticsData {
  campaigns: {
    total: number
    active: number
    completed: number
    draft: number
  }
  performance: {
    totalSent: number
    delivered: number
    opened: number
    clicked: number
    conversions: number
    revenue: number
  }
  engagement: {
    averageOpenRate: number
    averageClickRate: number
    averageConversionRate: number
    unsubscribeRate: number
  }
  channels: {
    email: { sent: number; openRate: number; clickRate: number }
    sms: { sent: number; deliveryRate: number; responseRate: number }
  }
}

export default function MarketingAnalyticsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [analyticsData, setAnalyticsData] = useState<MarketingAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter states
  const [datePreset, setDatePreset] = useState<DateRangePreset>('30d')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [campaignType, setCampaignType] = useState('all')
  const [channelFilter, setChannelFilter] = useState('all')

  // Initialize dates
  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 30)
    
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }, [])

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        const userData = await getProfile()
        if (!userData) {
          router.push('/login')
          return
        }

        // Check permissions
        if (!['admin', 'super_admin', 'location_manager'].includes(userData.role || '')) {
          router.push('/analytics')
          return
        }

        setUser(userData)

        // Mock data - would be replaced with actual API call
        const mockData: MarketingAnalyticsData = {
          campaigns: {
            total: 45,
            active: 3,
            completed: 40,
            draft: 2
          },
          performance: {
            totalSent: 12450,
            delivered: 12200,
            opened: 8954,
            clicked: 2156,
            conversions: 423,
            revenue: 45680
          },
          engagement: {
            averageOpenRate: 73.4,
            averageClickRate: 24.1,
            averageConversionRate: 4.7,
            unsubscribeRate: 0.8
          },
          channels: {
            email: { sent: 8500, openRate: 72.3, clickRate: 23.5 },
            sms: { sent: 3950, deliveryRate: 98.1, responseRate: 35.2 }
          }
        }

        setAnalyticsData(mockData)
      } catch (err) {
        console.error('Failed to load marketing analytics:', err)
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [startDate, endDate, campaignType, channelFilter, router])

  if (loading) {
    return <AnalyticsLoading type="marketing" />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => window.location.reload()} />
  }

  if (!user || !analyticsData) {
    return null
  }

  const openRateTrend: 'up' | 'down' = analyticsData.engagement.averageOpenRate > 70 ? 'up' : 'down'
  const clickRateTrend: 'up' | 'down' = analyticsData.engagement.averageClickRate > 20 ? 'up' : 'down'

  const metrics = [
    {
      title: 'Campaign Revenue',
      value: `$${analyticsData.performance.revenue.toLocaleString()}`,
      icon: <CurrencyDollarIcon className="w-5 h-5 text-green-600" />,
      trend: 'up' as const,
      change: 18.5
    },
    {
      title: 'Open Rate',
      value: `${analyticsData.engagement.averageOpenRate}%`,
      icon: <EnvelopeOpenIcon className="w-5 h-5 text-blue-600" />,
      trend: openRateTrend
    },
    {
      title: 'Click Rate',
      value: `${analyticsData.engagement.averageClickRate}%`,
      icon: <CursorArrowRaysIcon className="w-5 h-5 text-purple-600" />,
      trend: clickRateTrend
    },
    {
      title: 'Conversions',
      value: analyticsData.performance.conversions,
      icon: <ArrowTrendingUpIcon className="w-5 h-5 text-orange-600" />,
      trend: 'neutral' as const,
      change: analyticsData.engagement.averageConversionRate,
      changeLabel: 'rate'
    }
  ]

  const campaignTypeOptions: FilterOption[] = [
    { value: 'all', label: 'All Campaigns' },
    { value: 'promotional', label: 'Promotional' },
    { value: 'transactional', label: 'Transactional' },
    { value: 'newsletter', label: 'Newsletter' }
  ]

  const channelOptions: FilterOption[] = [
    { value: 'all', label: 'All Channels' },
    { value: 'email', label: 'Email Only' },
    { value: 'sms', label: 'SMS Only' }
  ]

  const handleExport = () => {
    console.log('Exporting marketing analytics...')
  }

  return (
    <AnalyticsLayout
      title="Marketing Analytics"
      description="Track campaign performance and customer engagement"
      userRole={user.role}
      showNavigation={true}
      navigationVariant="tabs"
    >
      <AnalyticsSectionLayout
        sectionTitle="Campaign Performance"
        sectionDescription="Monitor your marketing campaigns and engagement metrics"
        filters={
          <div className="space-y-4">
            <DateRangeSelector
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              preset={datePreset}
              onPresetChange={setDatePreset}
            />
            <AnalyticsFilters
              filters={[
                {
                  label: 'Campaign Type',
                  value: campaignType,
                  options: campaignTypeOptions,
                  onChange: setCampaignType
                },
                {
                  label: 'Channel',
                  value: channelFilter,
                  options: channelOptions,
                  onChange: setChannelFilter
                }
              ]}
              onExport={handleExport}
              additionalActions={
                <Button 
                  variant="primary"
                  onClick={() => router.push('/marketing/campaigns/new')}
                >
                  New Campaign
                </Button>
              }
            />
          </div>
        }
      >
        <div className="space-y-6">
          {/* KPI Cards */}
          <AnalyticsCardGrid metrics={metrics} loading={loading} />

          {/* Campaign Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Engagement Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <UsageChart />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-sm font-medium">Active</span>
                    <span className="text-2xl font-bold text-green-600">{analyticsData.campaigns.active}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm font-medium">Completed</span>
                    <span className="text-2xl font-bold">{analyticsData.campaigns.completed}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <span className="text-sm font-medium">Draft</span>
                    <span className="text-2xl font-bold text-yellow-600">{analyticsData.campaigns.draft}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Channel Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Channel Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <EnvelopeOpenIcon className="w-5 h-5 text-blue-600" />
                      <h4 className="font-medium">Email Campaigns</h4>
                    </div>
                    <span className="text-sm text-gray-500">{analyticsData.channels.email.sent} sent</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Open Rate</span>
                        <span className="font-medium">{analyticsData.channels.email.openRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${analyticsData.channels.email.openRate}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Click Rate</span>
                        <span className="font-medium">{analyticsData.channels.email.clickRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ width: `${analyticsData.channels.email.clickRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <ChatBubbleLeftIcon className="w-5 h-5 text-green-600" />
                      <h4 className="font-medium">SMS Campaigns</h4>
                    </div>
                    <span className="text-sm text-gray-500">{analyticsData.channels.sms.sent} sent</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Delivery Rate</span>
                        <span className="font-medium">{analyticsData.channels.sms.deliveryRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${analyticsData.channels.sms.deliveryRate}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Response Rate</span>
                        <span className="font-medium">{analyticsData.channels.sms.responseRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-orange-600 h-2 rounded-full" 
                          style={{ width: `${analyticsData.channels.sms.responseRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Marketing Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => router.push('/marketing/campaigns')}
                >
                  View All Campaigns
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => router.push('/marketing/contacts')}
                >
                  <UserGroupIcon className="w-4 h-4 mr-2" />
                  Manage Contacts
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => router.push('/marketing/templates')}
                >
                  Create Template
                </Button>
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => router.push('/marketing/booking-links')}
                >
                  Booking Links
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AnalyticsSectionLayout>
    </AnalyticsLayout>
  )
}