'use client'

import { useEffect, useState } from 'react'
import { getAppointmentPatterns } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import { BarChart, LineChart, DoughnutChart, chartUtils } from './ChartComponents'

interface AppointmentPatternsProps {
  userId: number
  timeRange: string
}

export default function AppointmentPatterns({ userId, timeRange }: AppointmentPatternsProps) {
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
        
        const data = await getAppointmentPatterns(
          userId,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        )
        setAnalytics(data)
      } catch (err) {
        console.error('Failed to fetch appointment patterns:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to load appointment data'
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
          <CardTitle>Appointment Patterns</CardTitle>
        </CardHeader>
        <CardContent>
          <PageLoading message="Loading appointment patterns..." />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Appointment Patterns</CardTitle>
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
  
  // Days of week labels
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  
  // Transform hourly patterns for bar chart
  const hourlyData = {
    labels: Object.keys(analytics.time_patterns?.hourly_distribution || {}).map(h => {
      const hour = parseInt(h)
      return hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`
    }),
    datasets: [{
      label: 'Appointments',
      data: Object.values(analytics.time_patterns?.hourly_distribution || {}),
      backgroundColor: '#3B82F6',
      borderColor: '#2563EB',
      borderWidth: 1,
    }]
  }

  // Transform daily patterns for bar chart
  const dailyData = {
    labels: Object.keys(analytics.time_patterns?.daily_distribution || {}).map(d => daysOfWeek[parseInt(d)]),
    datasets: [{
      label: 'Appointments',
      data: Object.values(analytics.time_patterns?.daily_distribution || {}),
      backgroundColor: '#10B981',
      borderColor: '#059669',
      borderWidth: 1,
    }]
  }

  // Transform no-show patterns
  const noShowData = {
    labels: ['Completed', 'No Shows', 'Cancelled', 'Rescheduled'],
    datasets: [{
      data: [
        analytics.no_show_analysis?.completed_count || 0,
        analytics.no_show_analysis?.no_show_count || 0,
        analytics.no_show_analysis?.cancelled_count || 0,
        analytics.no_show_analysis?.rescheduled_count || 0,
      ],
      backgroundColor: ['#10B981', '#EF4444', '#F59E0B', '#6366F1'],
      borderWidth: 2,
      borderColor: '#FFFFFF',
    }]
  }

  // Transform booking trends
  const bookingTrendData = analytics.booking_trends?.map((t: any) => ({
    period: t.period,
    bookings: t.bookings_count,
  })) || []

  const trendChartData = {
    labels: bookingTrendData.map((t: any) => 
      new Date(t.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    ),
    datasets: [{
      label: 'Bookings',
      data: bookingTrendData.map((t: any) => t.bookings),
      borderColor: '#8B5CF6',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      fill: true,
      tension: 0.4,
    }]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appointment Patterns & Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-900">
                {analytics.pattern_summary?.total_appointments || 0}
              </div>
              <div className="text-sm text-blue-700">Total Appointments</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-900">
                {formatPercentage(analytics.pattern_summary?.completion_rate || 0)}
              </div>
              <div className="text-sm text-green-700">Completion Rate</div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-900">
                {formatPercentage(analytics.no_show_analysis?.no_show_rate || 0)}
              </div>
              <div className="text-sm text-red-700">No-Show Rate</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-900">
                {analytics.pattern_summary?.avg_daily_appointments?.toFixed(1) || 0}
              </div>
              <div className="text-sm text-purple-700">Daily Average</div>
            </div>
          </div>

          {/* Hourly Distribution */}
          {analytics.time_patterns?.hourly_distribution && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Appointments by Hour</h4>
              <BarChart
                data={hourlyData}
                height={200}
              />
              {analytics.time_patterns?.peak_hour !== undefined && (
                <p className="text-sm text-gray-600">
                  Peak hour: {analytics.time_patterns.peak_hour > 12 
                    ? `${analytics.time_patterns.peak_hour - 12} PM` 
                    : analytics.time_patterns.peak_hour === 0 
                    ? '12 AM' 
                    : analytics.time_patterns.peak_hour === 12
                    ? '12 PM'
                    : `${analytics.time_patterns.peak_hour} AM`}
                </p>
              )}
            </div>
          )}

          {/* Daily Distribution */}
          {analytics.time_patterns?.daily_distribution && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Appointments by Day of Week</h4>
              <BarChart
                data={dailyData}
                height={200}
              />
              {analytics.time_patterns?.peak_day !== undefined && (
                <p className="text-sm text-gray-600">
                  Busiest day: {daysOfWeek[analytics.time_patterns.peak_day]}
                </p>
              )}
            </div>
          )}

          {/* Booking Trends */}
          {bookingTrendData.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Booking Trends</h4>
              <LineChart
                data={trendChartData}
                height={200}
              />
            </div>
          )}

          {/* No-Show Analysis */}
          {analytics.no_show_analysis && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Appointment Outcomes</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <DoughnutChart
                  data={noShowData}
                  height={200}
                />
                <div className="space-y-2">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-900">Completed</span>
                      <span className="font-bold text-green-900">
                        {analytics.no_show_analysis.completed_count} ({formatPercentage(analytics.pattern_summary?.completion_rate || 0)})
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-red-900">No Shows</span>
                      <span className="font-bold text-red-900">
                        {analytics.no_show_analysis.no_show_count} ({formatPercentage(analytics.no_show_analysis.no_show_rate)})
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-orange-900">Cancelled</span>
                      <span className="font-bold text-orange-900">
                        {analytics.no_show_analysis.cancelled_count} ({formatPercentage(analytics.no_show_analysis.cancellation_rate)})
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-purple-900">Rescheduled</span>
                      <span className="font-bold text-purple-900">
                        {analytics.no_show_analysis.rescheduled_count}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Service Performance */}
          {analytics.service_patterns && Object.keys(analytics.service_patterns).length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Top Services</h4>
              <div className="space-y-2">
                {Object.entries(analytics.service_patterns)
                  .sort((a: any, b: any) => b[1].count - a[1].count)
                  .slice(0, 5)
                  .map(([service, data]: [string, any]) => (
                    <div key={service} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">{service}</span>
                        <div className="text-right">
                          <span className="font-bold text-gray-900">{data.count} appointments</span>
                          <span className="text-sm text-gray-600 ml-2">
                            ({formatPercentage(data.percentage)})
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Insights */}
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">📊 Booking Insights</h4>
            <div className="space-y-2 text-sm">
              {analytics.no_show_analysis?.no_show_rate > 10 && (
                <div className="text-red-700">
                  ⚠️ High no-show rate ({formatPercentage(analytics.no_show_analysis.no_show_rate)}) - consider implementing deposit requirements
                </div>
              )}
              {analytics.booking_patterns?.advance_booking_avg && (
                <div className="text-blue-700">
                  📅 Clients book {analytics.booking_patterns.advance_booking_avg.toFixed(1)} days in advance on average
                </div>
              )}
              {analytics.time_patterns?.peak_hour !== undefined && (
                <div className="text-purple-700">
                  ⏰ Consider offering discounts during off-peak hours to balance demand
                </div>
              )}
              {analytics.pattern_summary?.recurring_percentage > 30 && (
                <div className="text-green-700">
                  ✅ {formatPercentage(analytics.pattern_summary.recurring_percentage)} of appointments are recurring - great client loyalty!
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}