'use client'

/**
 * Unified Communication Analytics Dashboard
 * 
 * Provides comprehensive insights across all communication channels:
 * - Email performance metrics
 * - SMS engagement tracking
 * - Marketing campaign analytics
 * - Review response effectiveness
 * - Cross-channel comparisons and ROI analysis
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner, ErrorDisplay, CardSkeleton } from '@/components/ui/LoadingSystem'
import { Button } from '@/components/ui/Button'
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts'
import { 
  Mail, MessageSquare, Megaphone, Star, TrendingUp, TrendingDown,
  Users, DollarSign, Target, Zap, Calendar, ArrowRight
} from 'lucide-react'

interface CommunicationMetrics {
  channel: string
  sent_count: number
  delivered_count: number
  opened_count: number
  clicked_count: number
  failed_count: number
  bounce_rate: number
  engagement_rate: number
  conversion_rate: number
  revenue_attributed: number
}

interface CommunicationOverview {
  date_range: {
    start_date: string
    end_date: string
  }
  overview: {
    total_messages_sent: number
    total_engagement_events: number
    overall_engagement_rate: number
    cost_per_engagement: number
  }
  channel_breakdown: CommunicationMetrics[]
  top_campaigns: Array<{
    id: number
    name: string
    type: string
    sent_date: string
    recipients: number
    engagement_rate: number
    revenue_attributed: number
  }>
  insights: {
    client_preferences: Record<string, number>
    automation_breakdown: Record<string, number>
    roi_by_channel: Record<string, number>
  }
}

const CHANNEL_COLORS = {
  email: '#3B82F6',      // Blue
  sms: '#10B981',        // Green
  campaigns: '#8B5CF6',  // Purple
  reviews: '#F59E0B'     // Amber
}

const CHANNEL_ICONS = {
  email: Mail,
  sms: MessageSquare,
  campaigns: Megaphone,
  reviews: Star
}

export function UnifiedCommunicationDashboard() {
  const [data, setData] = useState<CommunicationOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDateRange, setSelectedDateRange] = useState('30')
  const [retryAttempts, setRetryAttempts] = useState(0)

  const fetchCommunicationData = async () => {
    try {
      setLoading(true)
      setError(null)

      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - parseInt(selectedDateRange) * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0]

      const response = await fetch(
        `/api/v1/communication-analytics/overview?start_date=${startDate}&end_date=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch communication analytics: ${response.status}`)
      }

      const result = await response.json()
      setData(result)
      setRetryAttempts(0)
    } catch (err) {
      console.error('Error fetching communication analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load communication analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCommunicationData()
  }, [selectedDateRange])

  const handleRetry = () => {
    setRetryAttempts(prev => prev + 1)
    fetchCommunicationData()
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`

  if (loading) {
    return (
      <div className="space-y-6">
        <CardSkeleton className="h-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} className="h-48" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton className="h-96" />
          <CardSkeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={handleRetry}
        retryAttempts={retryAttempts}
        maxRetries={3}
        className="max-w-2xl mx-auto"
      />
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Communication Data
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Start sending emails, SMS, or campaigns to see analytics here.
          </p>
          <Button onClick={fetchCommunicationData}>
            Refresh Data
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Prepare chart data
  const channelPerformanceData = data.channel_breakdown.map(channel => ({
    name: channel.channel.charAt(0).toUpperCase() + channel.channel.slice(1),
    engagement_rate: channel.engagement_rate,
    conversion_rate: channel.conversion_rate,
    revenue: channel.revenue_attributed,
    volume: channel.sent_count
  }))

  const preferencesData = Object.entries(data.insights.client_preferences).map(([key, value]) => ({
    name: key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value,
    color: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'][Object.keys(data.insights.client_preferences).indexOf(key)]
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Communication Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Unified insights across all communication channels
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <Button onClick={fetchCommunicationData} variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Messages
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data.overview.total_messages_sent.toLocaleString()}
                </p>
              </div>
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Engagement Rate
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatPercentage(data.overview.overall_engagement_rate)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Engagements
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data.overview.total_engagement_events.toLocaleString()}
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Cost per Engagement
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(data.overview.cost_per_engagement)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.channel_breakdown.map((channel) => {
          const IconComponent = CHANNEL_ICONS[channel.channel as keyof typeof CHANNEL_ICONS]
          const color = CHANNEL_COLORS[channel.channel as keyof typeof CHANNEL_COLORS]
          
          return (
            <Card key={channel.channel} className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-5 w-5" style={{ color }} />
                    <h3 className="font-semibold text-gray-900 dark:text-white capitalize">
                      {channel.channel}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatPercentage(channel.engagement_rate)}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Sent:</span>
                    <span>{channel.sent_count.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Opened:</span>
                    <span>{channel.opened_count.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Revenue:</span>
                    <span>{formatCurrency(channel.revenue_attributed)}</span>
                  </div>
                </div>
                
                {/* Progress bar for engagement rate */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        backgroundColor: color,
                        width: `${Math.min(channel.engagement_rate, 100)}%`
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Performance Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Channel Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={channelPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'revenue' ? formatCurrency(Number(value)) : 
                    name.includes('rate') ? formatPercentage(Number(value)) :
                    Number(value).toLocaleString(),
                    name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                  ]}
                />
                <Legend />
                <Bar dataKey="engagement_rate" fill="#3B82F6" name="Engagement Rate (%)" />
                <Bar dataKey="conversion_rate" fill="#10B981" name="Conversion Rate (%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Client Communication Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Client Communication Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={preferencesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {preferencesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.top_campaigns.slice(0, 5).map((campaign, index) => (
                <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 rounded-full text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {campaign.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {campaign.recipients.toLocaleString()} recipients
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {formatPercentage(campaign.engagement_rate)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatCurrency(campaign.revenue_attributed)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ROI Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>ROI by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(data.insights.roi_by_channel).map(([channel, roi]) => {
                const IconComponent = CHANNEL_ICONS[channel as keyof typeof CHANNEL_ICONS]
                const color = CHANNEL_COLORS[channel as keyof typeof CHANNEL_COLORS]
                
                return (
                  <div key={channel} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <IconComponent className="h-5 w-5" style={{ color }} />
                      <span className="font-medium capitalize">{channel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">
                        {roi.toFixed(1)}x
                      </span>
                      {roi >= 2 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                  Optimize Email Campaigns
                </h4>
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Your email engagement is below average. Try A/B testing subject lines and send times.
              </p>
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-green-900 dark:text-green-100">
                  Scale SMS Success
                </h4>
              </div>
              <p className="text-sm text-green-800 dark:text-green-200">
                SMS shows high engagement. Consider increasing volume for promotional messages.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}