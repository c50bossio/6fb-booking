'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { AnimatedCard } from '@/components/ui/animated-card'
import { AnimatedNumber } from '@/components/ui/animated-number'
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
  animations, 
  staggerContainer, 
  staggerItem,
  tabContentVariants,
  pageTransition
} from '@/lib/animations'
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Users, 
  Activity,
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

export function AnimatedAnalyticsDashboard() {
  const { lastMessage } = useWebSocket()
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('revenue')
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

  const MetricCard = ({ icon: Icon, title, value, growth, color }: any) => (
    <AnimatedCard className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <motion.p 
            className="text-sm text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {title}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-gray-900"
          >
            {typeof value === 'number' ? (
              <AnimatedNumber value={value} format={(v) => `$${v.toLocaleString()}`} />
            ) : (
              value
            )}
          </motion.div>
          {growth !== undefined && (
            <motion.p 
              className={`text-sm flex items-center mt-1 ${color}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              {growth}% {title.includes('Revenue') ? 'vs last period' : 'growth'}
            </motion.p>
          )}
        </div>
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", delay: 0.4 }}
        >
          <Icon className="h-8 w-8 text-gray-400" />
        </motion.div>
      </div>
    </AnimatedCard>
  )

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
      <motion.div 
        className="space-y-6"
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {/* Header */}
        <motion.div 
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          variants={animations.slideDown}
          initial="initial"
          animate="animate"
        >
          <div>
            <motion.h1 
              className="text-3xl font-bold text-gray-900"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              Analytics Dashboard
            </motion.h1>
            <motion.p 
              className="text-gray-600 mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              Track performance and gain insights
            </motion.p>
          </div>
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              quickRanges={quickRanges}
            />
            <motion.button
              onClick={fetchAnalytics}
              className="p-2 rounded-lg border hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={isLoading}
              aria-label="Refresh data"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={isLoading ? { rotate: 360 } : {}}
                transition={isLoading ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
              >
                <RefreshCw className="h-5 w-5" />
              </motion.div>
            </motion.button>
            <ExportButton data={data} dateRange={dateRange} />
          </motion.div>
        </motion.div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              variants={animations.slideDown}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Key Metrics */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {isLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <motion.div key={i} variants={staggerItem}>
                  <MetricSkeleton />
                </motion.div>
              ))}
            </>
          ) : (
            <>
              <motion.div variants={staggerItem}>
                <MetricCard
                  icon={DollarSign}
                  title="Total Revenue"
                  value={data.metrics.totalRevenue || 0}
                  growth={data.metrics.revenueGrowth}
                  color="text-green-600"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <MetricCard
                  icon={Calendar}
                  title="Total Bookings"
                  value={data.metrics.totalBookings?.toLocaleString() || '0'}
                  growth={data.metrics.bookingGrowth}
                  color="text-blue-600"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <MetricCard
                  icon={Users}
                  title="Active Clients"
                  value={data.metrics.activeClients?.toLocaleString() || '0'}
                  growth={data.metrics.retention}
                  color="text-slate-600"
                />
              </motion.div>
              <motion.div variants={staggerItem}>
                <MetricCard
                  icon={Activity}
                  title="Avg Booking Value"
                  value={`$${data.metrics.avgBookingValue?.toFixed(2) || '0'}`}
                  growth={data.metrics.utilizationRate}
                  color="text-orange-600"
                />
              </motion.div>
            </>
          )}
        </motion.div>

        {/* Performance Metrics Overview */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ChartSkeleton />
            </motion.div>
          ) : (
            <motion.div
              key="content"
              variants={animations.fadeIn}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <ErrorBoundary>
                <PerformanceMetrics data={data.metrics} dateRange={dateRange} />
              </ErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Charts Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="retention">Retention</TabsTrigger>
            <TabsTrigger value="comparison">Team</TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={tabContentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
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
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </motion.div>
    </ErrorBoundary>
  )
}