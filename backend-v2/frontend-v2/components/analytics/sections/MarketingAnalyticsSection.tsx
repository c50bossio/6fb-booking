import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AnalyticsCardGrid } from '@/components/analytics/shared/AnalyticsCard'
import UsageChart from '@/components/marketing/UsageChart'
import { fetchAPI } from '@/lib/api'
import { 
  EnvelopeOpenIcon,
  CursorArrowRaysIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'

interface MarketingAnalyticsSectionProps {
  userRole?: string
  dateRange: {
    startDate: string
    endDate: string
  }
}

export default function MarketingAnalyticsSection({ userRole, dateRange }: MarketingAnalyticsSectionProps) {
  const [marketingData, setMarketingData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'email' | 'sms'>('all')

  useEffect(() => {
    async function loadMarketingData() {
      try {
        setLoading(true)
        // In a real implementation, this would fetch from the marketing analytics API
        const mockData = {
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
        setMarketingData(mockData)
      } catch (error) {
        } finally {
        setLoading(false)
      }
    }

    loadMarketingData()
  }, [dateRange])

  if (loading || !marketingData) {
    return <div>Loading marketing analytics...</div>
  }

  const metrics = [
    {
      title: 'Campaign Revenue',
      value: `$${marketingData.performance.revenue.toLocaleString()}`,
      icon: <CurrencyDollarIcon className="w-5 h-5 text-green-600" />,
      trend: 'up',
      change: 18.5
    },
    {
      title: 'Open Rate',
      value: `${marketingData.engagement.averageOpenRate}%`,
      icon: <EnvelopeOpenIcon className="w-5 h-5 text-blue-600" />,
      trend: marketingData.engagement.averageOpenRate > 70 ? 'up' : 'down'
    },
    {
      title: 'Click Rate',
      value: `${marketingData.engagement.averageClickRate}%`,
      icon: <CursorArrowRaysIcon className="w-5 h-5 text-purple-600" />,
      trend: marketingData.engagement.averageClickRate > 20 ? 'up' : 'down'
    },
    {
      title: 'Conversions',
      value: marketingData.performance.conversions,
      icon: <ArrowTrendingUpIcon className="w-5 h-5 text-orange-600" />,
      change: marketingData.engagement.averageConversionRate,
      changeLabel: 'rate'
    }
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <AnalyticsCardGrid metrics={metrics} loading={false} />

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
                <span className="text-2xl font-bold text-green-600">{marketingData.campaigns.active}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm font-medium">Completed</span>
                <span className="text-2xl font-bold">{marketingData.campaigns.completed}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <span className="text-sm font-medium">Draft</span>
                <span className="text-2xl font-bold text-yellow-600">{marketingData.campaigns.draft}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Performance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Channel Performance</CardTitle>
            <div className="flex gap-2">
              {(['all', 'email', 'sms'] as const).map((channel) => (
                <Button
                  key={channel}
                  variant={selectedChannel === channel ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedChannel(channel)}
                >
                  {channel.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(selectedChannel === 'all' || selectedChannel === 'email') && (
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <EnvelopeOpenIcon className="w-5 h-5 text-blue-600" />
                    <h4 className="font-medium">Email Campaigns</h4>
                  </div>
                  <span className="text-sm text-gray-500">{marketingData.channels.email.sent} sent</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Open Rate</span>
                      <span className="font-medium">{marketingData.channels.email.openRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${marketingData.channels.email.openRate}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Click Rate</span>
                      <span className="font-medium">{marketingData.channels.email.clickRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full" 
                        style={{ width: `${marketingData.channels.email.clickRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(selectedChannel === 'all' || selectedChannel === 'sms') && (
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <ChatBubbleLeftIcon className="w-5 h-5 text-green-600" />
                    <h4 className="font-medium">SMS Campaigns</h4>
                  </div>
                  <span className="text-sm text-gray-500">{marketingData.channels.sms.sent} sent</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Delivery Rate</span>
                      <span className="font-medium">{marketingData.channels.sms.deliveryRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${marketingData.channels.sms.deliveryRate}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Response Rate</span>
                      <span className="font-medium">{marketingData.channels.sms.responseRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-orange-600 h-2 rounded-full" 
                        style={{ width: `${marketingData.channels.sms.responseRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Marketing Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Marketing Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="justify-start">
              Create Campaign
            </Button>
            <Button variant="outline" className="justify-start">
              <UserGroupIcon className="w-4 h-4 mr-2" />
              Manage Contacts
            </Button>
            <Button variant="outline" className="justify-start">
              Email Templates
            </Button>
            <Button variant="outline" className="justify-start">
              Booking Links
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}