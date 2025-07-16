'use client'

import { useEffect, useState } from 'react'
import { getClientRetentionAnalytics } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PageLoading, ErrorDisplay } from '@/components/ui/LoadingSystem'
import { LineChart, BarChart, DoughnutChart, chartUtils } from './ChartComponents'

interface ClientRetentionChartProps {
  userId: number
  timeRange: string
}

export default function ClientRetentionChart({ userId, timeRange }: ClientRetentionChartProps) {
  const [analytics, setAnalytics] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true)
        setError(null)
        
        // Calculate date range based on timeRange
        const endDate = new Date()
        const startDate = new Date()
        
        switch (timeRange) {
          case '7d':
            startDate.setDate(endDate.getDate() - 7)
            break
          case '30d':
            startDate.setDate(endDate.getDate() - 30)
            break
          case '90d':
            startDate.setDate(endDate.getDate() - 90)
            break
          case '1y':
            startDate.setFullYear(endDate.getFullYear() - 1)
            break
          default:
            startDate.setDate(endDate.getDate() - 30)
        }
        
        const data = await getClientRetentionAnalytics(
          userId,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        )
        setAnalytics(data)
      } catch (err) {
        console.error('Failed to fetch client retention analytics:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to load retention data'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [userId, timeRange])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Client Retention Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <PageLoading message="Loading retention data..." />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Client Retention Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorDisplay error={error} onRetry={() => window.location.reload()} />
        </CardContent>
      </Card>
    )
  }

  if (!analytics) {
    return null
  }

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`

  // Transform retention trends for line chart
  const retentionTrendData = {
    labels: analytics.retention_trends?.map((t: any) => 
      new Date(t.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ) || [],
    datasets: [{
      label: 'Retention Rate',
      data: analytics.retention_trends?.map((t: any) => t.retention_rate) || [],
      borderColor: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.4,
    }]
  }

  // Transform client segments for doughnut chart
  const segmentData = {
    labels: Object.keys(analytics.segmentation || {}),
    datasets: [{
      data: Object.values(analytics.segmentation || {}),
      backgroundColor: [
        '#3B82F6', // New
        '#10B981', // Regular
        '#F59E0B', // VIP
        '#EF4444', // At Risk
        '#8B5CF6', // Lost
      ],
      borderWidth: 2,
      borderColor: '#FFFFFF',
    }]
  }

  // Transform visit frequency for bar chart
  const visitFrequencyData = {
    labels: Object.keys(analytics.visit_frequency || {}),
    datasets: [{
      label: 'Number of Clients',
      data: Object.values(analytics.visit_frequency || {}),
      backgroundColor: '#6366F1',
      borderColor: '#4F46E5',
      borderWidth: 1,
    }]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Retention Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-900">
                {formatPercentage(analytics.retention_summary?.overall_retention_rate || 0)}
              </div>
              <div className="text-sm text-green-700">Overall Retention</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-900">
                {analytics.retention_summary?.active_clients || 0}
              </div>
              <div className="text-sm text-blue-700">Active Clients</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-900">
                {analytics.retention_summary?.new_clients || 0}
              </div>
              <div className="text-sm text-purple-700">New Clients</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-900">
                {analytics.retention_summary?.churned_clients || 0}
              </div>
              <div className="text-sm text-orange-700">Churned Clients</div>
            </div>
          </div>

          {/* Retention Trend Chart */}
          {analytics.retention_trends && analytics.retention_trends.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Retention Rate Trend</h4>
              <LineChart
                data={retentionTrendData}
                options={chartUtils.defaultOptions.percentage}
                height={250}
              />
            </div>
          )}

          {/* Client Segmentation */}
          {analytics.segmentation && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Client Segmentation</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <DoughnutChart
                  data={segmentData}
                  height={200}
                />
                <div className="space-y-2">
                  {Object.entries(analytics.segmentation).map(([segment, count]: [string, any]) => {
                    const colors: Record<string, string> = {
                      'new': '#3B82F6',
                      'regular': '#10B981',
                      'vip': '#F59E0B',
                      'at_risk': '#EF4444',
                      'lost': '#8B5CF6',
                    }
                    
                    const segmentLabels: Record<string, string> = {
                      'new': 'New Clients',
                      'regular': 'Regular Clients',
                      'vip': 'VIP Clients',
                      'at_risk': 'At Risk',
                      'lost': 'Lost Clients',
                    }
                    
                    return (
                      <div key={segment} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: colors[segment] || '#6B7280' }}
                          ></div>
                          <span className="font-medium text-gray-900">
                            {segmentLabels[segment] || segment}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">{count}</div>
                          <div className="text-sm text-gray-600">
                            {((count / analytics.retention_summary?.total_clients || 1) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Visit Frequency Distribution */}
          {analytics.visit_frequency && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Visit Frequency Distribution</h4>
              <BarChart
                data={visitFrequencyData}
                height={200}
              />
            </div>
          )}

          {/* Retention Strategies */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">💡 Retention Strategies</h4>
            <div className="space-y-2 text-sm">
              {analytics.retention_summary?.churn_rate > 20 && (
                <div className="text-red-700">
                  ⚠️ High churn rate ({formatPercentage(analytics.retention_summary.churn_rate)}) - implement loyalty program
                </div>
              )}
              {analytics.segmentation?.at_risk > 10 && (
                <div className="text-orange-700">
                  🎯 {analytics.segmentation.at_risk} clients at risk - send re-engagement campaigns
                </div>
              )}
              {analytics.segmentation?.vip < analytics.retention_summary?.total_clients * 0.1 && (
                <div className="text-blue-700">
                  💎 Only {formatPercentage((analytics.segmentation?.vip || 0) / (analytics.retention_summary?.total_clients || 1) * 100)} are VIP - create VIP program
                </div>
              )}
              {analytics.retention_summary?.average_lifetime_value && (
                <div className="text-green-700">
                  💰 Average lifetime value: ${analytics.retention_summary.average_lifetime_value.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}