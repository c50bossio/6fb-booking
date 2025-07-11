'use client'

import { useEffect, useState } from 'react'
import { getBarberPerformanceMetrics } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import { GaugeChart, BarChart, chartUtils } from './ChartComponents'
import { formatters } from '@/lib/formatters'

interface PerformanceMetricsProps {
  userId: number
  timeRange: string
}

export default function PerformanceMetrics({ userId, timeRange }: PerformanceMetricsProps) {
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
        
        const data = await getBarberPerformanceMetrics(
          userId,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        )
        setAnalytics(data)
      } catch (err) {
        console.error('Failed to fetch performance analytics:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to load performance data'
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
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <PageLoading message="Loading performance data..." />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
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


  // Performance scoring
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const utilizationScore = Math.min(analytics.efficiency?.utilization_rate || 0, 100)
  const retentionScore = analytics.client_metrics?.client_retention_rate || 0
  const revenuePerHourScore = Math.min(((analytics.revenue?.revenue_per_hour || 0) / 100) * 100, 100)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Performance Score Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-lg border">
              <GaugeChart
                value={utilizationScore}
                title="Utilization"
                height={180}
              />
            </div>
            <div className="p-4 bg-white rounded-lg border">
              <GaugeChart
                value={retentionScore}
                title="Retention"
                height={180}
              />
            </div>
            <div className="p-4 bg-white rounded-lg border">
              <GaugeChart
                value={revenuePerHourScore}
                title="Revenue/Hour"
                height={180}
              />
            </div>
          </div>

          {/* Efficiency Metrics */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">⚡ Efficiency Metrics</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-900">
                  {formatters.percentage(analytics.efficiency?.utilization_rate || 0)}
                </div>
                <div className="text-sm text-gray-600">Time Utilization</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-900">
                  {formatters.duration(analytics.summary?.completed_appointments && analytics.efficiency?.scheduled_hours 
                    ? (analytics.efficiency.scheduled_hours * 60) / analytics.summary.completed_appointments 
                    : 30)}
                </div>
                <div className="text-sm text-gray-600">Avg Appointment</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-900">
                  {Math.round(analytics.efficiency?.average_daily_appointments || 0)}
                </div>
                <div className="text-sm text-gray-600">Daily Appointments</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-900">
                  {formatters.percentage(analytics.summary?.completion_rate || 0)}
                </div>
                <div className="text-sm text-gray-600">Completion Rate</div>
              </div>
            </div>
          </div>

          {/* Client Metrics */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">👥 Client Metrics</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-900">
                  {analytics.client_metrics?.unique_clients || 0}
                </div>
                <div className="text-sm text-blue-700">Total Clients</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-900">
                  {analytics.client_metrics?.repeat_clients || 0}
                </div>
                <div className="text-sm text-green-700">Repeat Clients</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-lg font-bold text-purple-900">
                  {formatters.percentage(analytics.client_metrics?.client_retention_rate || 0)}
                </div>
                <div className="text-sm text-purple-700">Retention Rate</div>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg">
                <div className="text-lg font-bold text-indigo-900">
                  {(analytics.client_metrics?.average_visits_per_client || 0).toFixed(1)}
                </div>
                <div className="text-sm text-indigo-700">Visits per Client</div>
              </div>
            </div>
          </div>

          {/* Financial Metrics */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">💰 Financial Metrics</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <div className="text-xl font-bold text-green-900">
                  {formatters.currency(analytics.revenue?.revenue_per_hour || 0)}
                </div>
                <div className="text-sm text-green-700">Revenue per Hour</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <div className="text-xl font-bold text-blue-900">
                  {formatters.currency(analytics.revenue?.average_appointment_value || 0)}
                </div>
                <div className="text-sm text-blue-700">Avg Appointment Value</div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg text-center">
                <div className="text-xl font-bold text-orange-900">
                  {formatters.currency(analytics.revenue?.total_revenue || 0)}
                </div>
                <div className="text-sm text-orange-700">Total Revenue</div>
              </div>
            </div>
          </div>

          {/* Performance Insights */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">📊 Performance Insights</h4>
            <div className="space-y-2 text-sm">
              {(analytics.efficiency?.utilization_rate || 0) > 80 ? (
                <div className="text-green-700">
                  ✅ Excellent time utilization at {formatters.percentage(analytics.efficiency?.utilization_rate || 0)}
                </div>
              ) : (analytics.efficiency?.utilization_rate || 0) > 60 ? (
                <div className="text-yellow-700">
                  ⚠️ Good utilization, consider optimizing schedule to reach 80%+
                </div>
              ) : (
                <div className="text-red-700">
                  🔴 Low utilization at {formatters.percentage(analytics.efficiency?.utilization_rate || 0)} - focus on filling schedule
                </div>
              )}

              {(analytics.client_metrics?.client_retention_rate || 0) > 80 ? (
                <div className="text-green-700">
                  ✅ Strong client retention at {formatters.percentage(analytics.client_metrics?.client_retention_rate || 0)}
                </div>
              ) : (
                <div className="text-orange-700">
                  💡 Retention could improve - consider loyalty programs or follow-up strategies
                </div>
              )}

              {(analytics.revenue?.revenue_per_hour || 0) > 75 ? (
                <div className="text-green-700">
                  ✅ High revenue efficiency at {formatters.currency(analytics.revenue?.revenue_per_hour || 0)}/hour
                </div>
              ) : (
                <div className="text-blue-700">
                  💰 Revenue per hour: {formatters.currency(analytics.revenue?.revenue_per_hour || 0)} - consider premium services
                </div>
              )}

              {(analytics.client_metrics?.average_visits_per_client || 0) < 3 && (
                <div className="text-purple-700">
                  🔄 Average {(analytics.client_metrics?.average_visits_per_client || 0).toFixed(1)} visits per client - work on building recurring relationships
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}