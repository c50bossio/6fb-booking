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
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { UsageChart } from '@/components/marketing/UsageChart'

interface CampaignMetric {
  id: string
  name: string
  type: 'email' | 'sms'
  sentDate: string
  recipients: number
  delivered: number
  opened: number
  clicked: number
  unsubscribed: number
  bounced: number
  complaints: number
  revenue?: number
}

interface OverallMetrics {
  totalCampaigns: number
  totalRecipients: number
  avgOpenRate: number
  avgClickRate: number
  avgDeliveryRate: number
  totalRevenue: number
}

export default function MarketingAnalyticsPage() {
  const [campaigns, setCampaigns] = useState<CampaignMetric[]>([])
  const [overallMetrics, setOverallMetrics] = useState<OverallMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('last30days')
  const [campaignType, setCampaignType] = useState('all')
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])

  useEffect(() => {
    // Simulate loading analytics data
    setTimeout(() => {
      const mockCampaigns: CampaignMetric[] = [
        {
          id: '1',
          name: 'Holiday Special Promotion',
          type: 'email',
          sentDate: '2024-12-20',
          recipients: 450,
          delivered: 441,
          opened: 319,
          clicked: 71,
          unsubscribed: 3,
          bounced: 9,
          complaints: 0,
          revenue: 3250
        },
        {
          id: '2',
          name: 'New Year Welcome Back',
          type: 'email',
          sentDate: '2025-01-02',
          recipients: 523,
          delivered: 515,
          opened: 378,
          clicked: 94,
          unsubscribed: 5,
          bounced: 8,
          complaints: 1,
          revenue: 4120
        },
        {
          id: '3',
          name: 'Appointment Reminder Blast',
          type: 'sms',
          sentDate: '2024-12-22',
          recipients: 127,
          delivered: 125,
          opened: 119,
          clicked: 0,
          unsubscribed: 1,
          bounced: 2,
          complaints: 0
        },
        {
          id: '4',
          name: 'Service Update Notification',
          type: 'email',
          sentDate: '2024-12-15',
          recipients: 380,
          delivered: 372,
          opened: 245,
          clicked: 52,
          unsubscribed: 2,
          bounced: 8,
          complaints: 0,
          revenue: 1890
        },
        {
          id: '5',
          name: 'Flash Sale Alert',
          type: 'sms',
          sentDate: '2024-12-28',
          recipients: 215,
          delivered: 213,
          opened: 201,
          clicked: 0,
          unsubscribed: 0,
          bounced: 2,
          complaints: 0,
          revenue: 980
        }
      ]

      setCampaigns(mockCampaigns)

      // Calculate overall metrics
      const totals = mockCampaigns.reduce((acc, campaign) => ({
        recipients: acc.recipients + campaign.recipients,
        delivered: acc.delivered + campaign.delivered,
        opened: acc.opened + campaign.opened,
        clicked: acc.clicked + campaign.clicked,
        revenue: acc.revenue + (campaign.revenue || 0)
      }), { recipients: 0, delivered: 0, opened: 0, clicked: 0, revenue: 0 })

      setOverallMetrics({
        totalCampaigns: mockCampaigns.length,
        totalRecipients: totals.recipients,
        avgOpenRate: (totals.opened / totals.delivered) * 100,
        avgClickRate: (totals.clicked / totals.opened) * 100,
        avgDeliveryRate: (totals.delivered / totals.recipients) * 100,
        totalRevenue: totals.revenue
      })

      setLoading(false)
    }, 1000)
  }, [dateRange, campaignType])

  const calculateRate = (numerator: number, denominator: number) => {
    if (denominator === 0) return '0%'
    return `${((numerator / denominator) * 100).toFixed(1)}%`
  }

  const getRateColor = (rate: number, type: 'good' | 'bad' = 'good') => {
    if (type === 'bad') {
      if (rate < 2) return 'text-green-600 dark:text-green-400'
      if (rate < 5) return 'text-yellow-600 dark:text-yellow-400'
      return 'text-red-600 dark:text-red-400'
    }
    
    if (rate > 70) return 'text-green-600 dark:text-green-400'
    if (rate > 40) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const filteredCampaigns = campaigns.filter(campaign => {
    if (campaignType === 'all') return true
    return campaign.type === campaignType
  })

  const handleCompare = () => {
    if (selectedCampaigns.length < 2) {
      alert('Please select at least 2 campaigns to compare')
      return
    }
    // Navigate to comparison view
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campaign Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track and analyze your marketing campaign performance</p>
        </div>
        <Button variant="outline">
          <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Date Range and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-gray-500" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                value={campaignType}
                onChange={(e) => setCampaignType(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Types</option>
                <option value="email">Email Only</option>
                <option value="sms">SMS Only</option>
              </select>
            </div>
            {selectedCampaigns.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedCampaigns.length} selected
                </span>
                <Button size="sm" onClick={handleCompare}>
                  Compare
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Overall Metrics */}
      {overallMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card variant="accent">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <ChartBarIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-primary-900 dark:text-primary-100">
                {overallMetrics.avgOpenRate.toFixed(1)}%
              </div>
              <div className="text-sm font-medium text-primary-700 dark:text-primary-300">
                Average Open Rate
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <CursorArrowRaysIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {overallMetrics.avgClickRate.toFixed(1)}%
              </div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Average Click Rate
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <EnvelopeOpenIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {overallMetrics.avgDeliveryRate.toFixed(1)}%
              </div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Delivery Rate
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <span className="text-xl">💰</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                ${overallMetrics.totalRevenue.toLocaleString()}
              </div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Revenue Generated
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <UsageChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engagement by Campaign Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Email Campaigns</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">72.3% avg open rate</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '72.3%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">SMS Campaigns</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">94.1% avg open rate</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '94.1%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCampaigns(filteredCampaigns.map(c => c.id))
                        } else {
                          setSelectedCampaigns([])
                        }
                      }}
                      className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Delivery
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Opens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Clicks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Issues
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCampaigns.map(campaign => {
                  const deliveryRate = (campaign.delivered / campaign.recipients) * 100
                  const openRate = (campaign.opened / campaign.delivered) * 100
                  const clickRate = campaign.type === 'email' ? (campaign.clicked / campaign.opened) * 100 : 0
                  const issueRate = ((campaign.bounced + campaign.unsubscribed + campaign.complaints) / campaign.recipients) * 100

                  return (
                    <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedCampaigns.includes(campaign.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCampaigns([...selectedCampaigns, campaign.id])
                            } else {
                              setSelectedCampaigns(selectedCampaigns.filter(id => id !== campaign.id))
                            }
                          }}
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{campaign.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {campaign.type.toUpperCase()} • {new Date(campaign.sentDate).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">{campaign.recipients}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className={`text-sm font-medium ${getRateColor(deliveryRate)}`}>
                            {calculateRate(campaign.delivered, campaign.recipients)}
                          </div>
                          <div className="text-xs text-gray-500">{campaign.delivered} delivered</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className={`text-sm font-medium ${getRateColor(openRate)}`}>
                            {calculateRate(campaign.opened, campaign.delivered)}
                          </div>
                          <div className="text-xs text-gray-500">{campaign.opened} opened</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {campaign.type === 'email' ? (
                          <div>
                            <div className={`text-sm font-medium ${getRateColor(clickRate)}`}>
                              {calculateRate(campaign.clicked, campaign.opened)}
                            </div>
                            <div className="text-xs text-gray-500">{campaign.clicked} clicked</div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">N/A</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className={`text-sm font-medium ${getRateColor(issueRate, 'bad')}`}>
                            {calculateRate(campaign.bounced + campaign.unsubscribed + campaign.complaints, campaign.recipients)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {campaign.bounced + campaign.unsubscribed + campaign.complaints} issues
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {campaign.revenue ? (
                          <div className="text-sm font-medium text-green-600 dark:text-green-400">
                            ${campaign.revenue.toLocaleString()}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-400">-</div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}