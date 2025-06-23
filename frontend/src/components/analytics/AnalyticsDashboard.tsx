'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useWebSocket } from '@/hooks/useWebSocket'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { RevenueChart } from './RevenueChart'
import { BookingTrendsChart } from './BookingTrendsChart'
import { PerformanceMetrics } from './PerformanceMetrics'
import { ServiceAnalytics } from './ServiceAnalytics'
import { ClientRetentionChart } from './ClientRetentionChart'
import { PeakHoursHeatmap } from './PeakHoursHeatmap'
import { BarberComparison } from './BarberComparison'
import { DateRangePicker } from './DateRangePicker'
import { ExportButton } from './ExportButton'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { cache, cacheKeys, cacheUtils } from '@/lib/cache'
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  Activity,
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react'

interface DateRange {
  from: Date
  to: Date
}

interface AnalyticsData {
  revenue: any[]
  bookings: any[]
  metrics: any
  services: any[]
  retention: any
  peakHours: any[]
  barberStats: any[]
}

export function AnalyticsDashboard() {
  const { lastMessage } = useWebSocket()
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AnalyticsData>({
    revenue: [],
    bookings: [],
    metrics: {},
    services: [],
    retention: {},
    peakHours: [],
    barberStats: []
  })

  // Fetch analytics data with error handling
  const fetchAnalytics = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Authentication required')
      }

      const params = new URLSearchParams({
        start_date: format(dateRange.from, 'yyyy-MM-dd'),
        end_date: format(dateRange.to, 'yyyy-MM-dd')
      })

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      const endpoints = [
        { url: `/api/v1/analytics/revenue?${params}`, key: 'revenue' },
        { url: `/api/v1/analytics/bookings?${params}`, key: 'bookings' },
        { url: `/api/v1/analytics/metrics?${params}`, key: 'metrics' },
        { url: `/api/v1/analytics/services?${params}`, key: 'services' },
        { url: `/api/v1/analytics/retention?${params}`, key: 'retention' },
        { url: `/api/v1/analytics/peak-hours?${params}`, key: 'peakHours' },
        { url: `/api/v1/analytics/barber-comparison?${params}`, key: 'barberStats' }
      ]

      const responses = await Promise.allSettled(
        endpoints.map(endpoint => {
          const cacheKey = cacheKeys.analytics(
            endpoint.key,
            format(dateRange.from, 'yyyy-MM-dd'),
            format(dateRange.to, 'yyyy-MM-dd')
          )

          return cacheUtils.fetchWithCache(
            cacheKey,
            () => fetch(endpoint.url, { headers })
              .then(res => {
                if (!res.ok) {
                  throw new Error(`Failed to fetch ${endpoint.key}`)
                }
                return res.json()
              })
              .then(data => ({ key: endpoint.key, data })),
            5 * 60 * 1000 // 5 minutes cache
          )
        })
      )

      const newData: Partial<AnalyticsData> = {}
      const errors: string[] = []

      responses.forEach((response, index) => {
        if (response.status === 'fulfilled') {
          newData[response.value.key as keyof AnalyticsData] = response.value.data
        } else {
          errors.push(`Failed to load ${endpoints[index].key} data`)
          console.error(`Error fetching ${endpoints[index].key}:`, response.reason)
        }
      })

      setData(prev => ({ ...prev, ...newData }))

      if (errors.length > 0) {
        setError(errors.join(', '))
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics data')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch data on mount and date range change
  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage?.type === 'analytics_update') {
      const update = lastMessage.data
      setData(prev => ({
        ...prev,
        metrics: update.metrics || prev.metrics,
        revenue: update.revenue || prev.revenue,
        bookings: update.bookings || prev.bookings
      }))
    }
  }, [lastMessage])

  const quickRanges = [
    { label: 'Today', value: () => ({ from: new Date(), to: new Date() }) },
    { label: 'Last 7 Days', value: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
    { label: 'Last 30 Days', value: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
    { label: 'This Month', value: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) }
  ]

  const MetricSkeleton = () => (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </Card>
  )

  const ChartSkeleton = () => (
    <Card className="p-6">
      <Skeleton className="h-6 w-32 mb-4" />
      <Skeleton className="h-[350px] w-full" />
    </Card>
  )

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">Track performance and gain insights</p>
          </div>
          <div className="flex items-center gap-3">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              quickRanges={quickRanges}
            />
            <button
              onClick={fetchAnalytics}
              className="p-2 rounded-lg border hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={isLoading}
              aria-label="Refresh data"
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <ExportButton data={data} dateRange={dateRange} />
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
            </>
          ) : (
            <>
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${data.metrics.totalRevenue?.toLocaleString() || '0'}
                    </p>
                    <p className="text-sm text-green-600 flex items-center mt-1">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      {data.metrics.revenueGrowth || 0}% vs last period
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-gray-400" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Bookings</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {data.metrics.totalBookings?.toLocaleString() || '0'}
                    </p>
                    <p className="text-sm text-blue-600 flex items-center mt-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      {data.metrics.bookingGrowth || 0}% growth
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Clients</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {data.metrics.activeClients?.toLocaleString() || '0'}
                    </p>
                    <p className="text-sm text-slate-600 flex items-center mt-1">
                      <Users className="h-4 w-4 mr-1" />
                      {data.metrics.retention || 0}% retention
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Booking Value</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${data.metrics.avgBookingValue?.toFixed(2) || '0'}
                    </p>
                    <p className="text-sm text-orange-600 flex items-center mt-1">
                      <Activity className="h-4 w-4 mr-1" />
                      {data.metrics.utilizationRate || 0}% utilization
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-gray-400" />
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Performance Metrics Overview */}
        {isLoading ? (
          <ChartSkeleton />
        ) : (
          <ErrorBoundary>
            <PerformanceMetrics data={data.metrics} dateRange={dateRange} />
          </ErrorBoundary>
        )}

        {/* Charts Tabs */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="retention">Retention</TabsTrigger>
            <TabsTrigger value="comparison">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="space-y-4">
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <ErrorBoundary>
                <RevenueChart data={data.revenue} dateRange={dateRange} />
              </ErrorBoundary>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            {isLoading ? (
              <>
                <ChartSkeleton />
                <ChartSkeleton />
              </>
            ) : (
              <ErrorBoundary>
                <BookingTrendsChart data={data.bookings} dateRange={dateRange} />
                <PeakHoursHeatmap data={data.peakHours} />
              </ErrorBoundary>
            )}
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <ErrorBoundary>
                <ServiceAnalytics data={data.services} />
              </ErrorBoundary>
            )}
          </TabsContent>

          <TabsContent value="retention" className="space-y-4">
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <ErrorBoundary>
                <ClientRetentionChart data={data.retention} />
              </ErrorBoundary>
            )}
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            {isLoading ? (
              <ChartSkeleton />
            ) : (
              <ErrorBoundary>
                <BarberComparison data={data.barberStats} />
              </ErrorBoundary>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  )
}
