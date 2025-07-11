'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, getEnterpriseAnalytics, type User, type EnterpriseAnalytics } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import { usePermissions } from '@/components/ProtectedRoute'

// Icon Components
const ArrowTrendingUpIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const ArrowTrendingDownIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

const DollarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const LocationIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const AlertIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
)

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatPercentage(value: number): string {
  return `${Math.round(value)}%`
}

export default function EnterpriseDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [analytics, setAnalytics] = useState<EnterpriseAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('30d')
  const [selectedLocations, setSelectedLocations] = useState<number[]>([])
  
  const { isAdmin } = usePermissions(user)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        
        // Check authentication and authorization
        const userData = await getProfile()
        if (!userData) {
          router.push('/login')
          return
        }
        
        setUser(userData)
        
        // Check if user has enterprise access (super_admin or admin)
        if (userData.role !== 'super_admin' && userData.role !== 'admin') {
          router.push('/dashboard')
          return
        }
        
        // Calculate date range
        const endDate = new Date()
        const startDate = new Date()
        
        switch (dateRange) {
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
        }
        
        // Fetch enterprise analytics
        const analyticsData = await getEnterpriseAnalytics(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0],
          selectedLocations.length > 0 ? selectedLocations : undefined
        )
        
        setAnalytics(analyticsData)
      } catch (err) {
        console.error('Failed to load enterprise analytics:', err)
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [dateRange, selectedLocations, router])

  if (loading) {
    return <PageLoading />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => window.location.reload()} />
  }

  if (!analytics || !user) {
    return null
  }

  const { metrics, locations, revenue_trend, top_performers, alerts } = analytics

  // Calculate trend indicators
  const revenueChangePositive = metrics.revenue_growth > 0
  const utilizationGood = metrics.chair_utilization > 75
  const retentionGood = metrics.staff_retention > 85

  return (
    <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-ios-largeTitle font-bold text-accent-900 dark:text-white tracking-tight">
                Enterprise Dashboard
              </h1>
              <p className="text-ios-body text-ios-gray-600 dark:text-zinc-300 mt-2">
                Monitor performance across all locations
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Select
                value={dateRange}
                onChange={(value) => setDateRange(value as string)}
                className="w-full sm:w-auto"
                options={[
                  { value: "7d", label: "Last 7 days" },
                  { value: "30d", label: "Last 30 days" },
                  { value: "90d", label: "Last 90 days" },
                  { value: "1y", label: "Last year" }
                ]}
              />
              
              <Button
                onClick={() => router.push('/analytics')}
                variant="secondary"
                leftIcon={<ChartIcon />}
              >
                Detailed Analytics
              </Button>
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-3">
            {alerts.map((alert, index) => (
              <Card
                key={index}
                variant={alert.type === 'warning' ? 'warning' : alert.type === 'success' ? 'success' : 'default'}
                className="border-l-4"
              >
                <CardContent className="flex items-center space-x-3 py-3">
                  <AlertIcon />
                  <div>
                    <p className="font-medium">{alert.message}</p>
                    {alert.location && (
                      <p className="text-sm text-ios-gray-600 dark:text-zinc-400">{alert.location}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card variant="elevated" animated>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-ios-lg">
                  <DollarIcon />
                </div>
                {revenueChangePositive ? (
                  <span className="text-success-600 dark:text-success-400 text-sm font-medium flex items-center">
                    <ArrowTrendingUpIcon />
                    {formatPercentage(metrics.revenue_growth)}
                  </span>
                ) : (
                  <span className="text-error-600 dark:text-error-400 text-sm font-medium flex items-center">
                    <ArrowTrendingDownIcon />
                    {formatPercentage(Math.abs(metrics.revenue_growth))}
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-accent-900 dark:text-white">
                {formatCurrency(metrics.total_revenue)}
              </h3>
              <p className="text-ios-caption text-ios-gray-600 dark:text-zinc-400 mt-1">
                Total Revenue
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={100}>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-accent-100 dark:bg-accent-900 rounded-ios-lg">
                  <CalendarIcon />
                </div>
                <span className="text-ios-caption text-ios-gray-600 dark:text-zinc-400">
                  {formatCurrency(metrics.average_ticket)}/avg
                </span>
              </div>
              <h3 className="text-2xl font-bold text-accent-900 dark:text-white">
                {metrics.total_appointments.toLocaleString()}
              </h3>
              <p className="text-ios-caption text-ios-gray-600 dark:text-zinc-400 mt-1">
                Total Appointments
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={200}>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-success-100 dark:bg-success-900 rounded-ios-lg">
                  <UsersIcon />
                </div>
                <span className={`text-sm font-medium ${retentionGood ? 'text-success-600 dark:text-success-400' : 'text-warning-600 dark:text-warning-400'}`}>
                  {formatPercentage(metrics.staff_retention)}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-accent-900 dark:text-white">
                {metrics.total_clients.toLocaleString()}
              </h3>
              <p className="text-ios-caption text-ios-gray-600 dark:text-zinc-400 mt-1">
                Active Clients
              </p>
            </CardContent>
          </Card>

          <Card variant="elevated" animated animationDelay={300}>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-warning-100 dark:bg-warning-900 rounded-ios-lg">
                  <ChartIcon />
                </div>
                <span className={`text-sm font-medium ${utilizationGood ? 'text-success-600 dark:text-success-400' : 'text-warning-600 dark:text-warning-400'}`}>
                  {formatPercentage(metrics.chair_utilization)}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-accent-900 dark:text-white">
                {formatPercentage(metrics.chair_utilization)}
              </h3>
              <p className="text-ios-caption text-ios-gray-600 dark:text-zinc-400 mt-1">
                Chair Utilization
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Location Performance Matrix */}
        <Card variant="elevated" className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Location Performance</CardTitle>
              <Button
                onClick={() => router.push('/locations')}
                variant="ghost"
                size="sm"
                leftIcon={<LocationIcon />}
              >
                Manage Locations
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ios-gray-200 dark:border-zinc-700">
                    <th className="text-left py-3 px-4 text-ios-caption font-medium text-ios-gray-600 dark:text-zinc-400">
                      Location
                    </th>
                    <th className="text-right py-3 px-4 text-ios-caption font-medium text-ios-gray-600 dark:text-zinc-400">
                      Revenue
                    </th>
                    <th className="text-right py-3 px-4 text-ios-caption font-medium text-ios-gray-600 dark:text-zinc-400">
                      Appointments
                    </th>
                    <th className="text-right py-3 px-4 text-ios-caption font-medium text-ios-gray-600 dark:text-zinc-400">
                      Clients
                    </th>
                    <th className="text-right py-3 px-4 text-ios-caption font-medium text-ios-gray-600 dark:text-zinc-400">
                      Occupancy
                    </th>
                    <th className="text-right py-3 px-4 text-ios-caption font-medium text-ios-gray-600 dark:text-zinc-400">
                      Rating
                    </th>
                    <th className="text-right py-3 px-4 text-ios-caption font-medium text-ios-gray-600 dark:text-zinc-400">
                      Growth
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((location) => (
                    <tr
                      key={location.id}
                      className="border-b border-ios-gray-100 dark:border-zinc-800 hover:bg-ios-gray-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      onClick={() => router.push(`/barbershop/${location.id}/dashboard`)}
                    >
                      <td className="py-4 px-4">
                        <p className="font-medium text-accent-900 dark:text-white">{location.name}</p>
                      </td>
                      <td className="text-right py-4 px-4">
                        <p className="font-medium">{formatCurrency(location.revenue)}</p>
                      </td>
                      <td className="text-right py-4 px-4">
                        <p>{location.appointments.toLocaleString()}</p>
                      </td>
                      <td className="text-right py-4 px-4">
                        <p>{location.clients.toLocaleString()}</p>
                      </td>
                      <td className="text-right py-4 px-4">
                        <div className="flex items-center justify-end">
                          <div className="w-24 bg-ios-gray-200 dark:bg-zinc-700 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${
                                location.chair_occupancy > 75
                                  ? 'bg-success-500'
                                  : location.chair_occupancy > 50
                                  ? 'bg-warning-500'
                                  : 'bg-error-500'
                              }`}
                              style={{ width: `${location.chair_occupancy}%` }}
                            />
                          </div>
                          <span className="text-sm">{formatPercentage(location.chair_occupancy)}</span>
                        </div>
                      </td>
                      <td className="text-right py-4 px-4">
                        <div className="flex items-center justify-end">
                          <span className="text-warning-500 mr-1">★</span>
                          <span>{location.average_rating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="text-right py-4 px-4">
                        <span
                          className={`inline-flex items-center text-sm font-medium ${
                            location.growth_percentage > 0
                              ? 'text-success-600 dark:text-success-400'
                              : 'text-error-600 dark:text-error-400'
                          }`}
                        >
                          {location.growth_percentage > 0 ? <ArrowTrendingUpIcon /> : <ArrowTrendingDownIcon />}
                          <span className="ml-1">{formatPercentage(Math.abs(location.growth_percentage))}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart and Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trend Chart */}
          <Card variant="elevated" className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Revenue performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between space-x-2">
                {revenue_trend.slice(-30).map((data, index) => {
                  const maxRevenue = Math.max(...revenue_trend.map(d => d.revenue))
                  const height = (data.revenue / maxRevenue) * 100
                  
                  return (
                    <div
                      key={index}
                      className="flex-1 bg-primary-500 dark:bg-primary-600 rounded-t-sm hover:bg-primary-600 dark:hover:bg-primary-500 transition-colors relative group"
                      style={{ height: `${height}%` }}
                    >
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {formatCurrency(data.revenue)}
                        <br />
                        {new Date(data.date).toLocaleDateString()}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between mt-4 text-ios-caption text-ios-gray-600 dark:text-zinc-400">
                <span>{new Date(revenue_trend[0]?.date).toLocaleDateString()}</span>
                <span>{new Date(revenue_trend[revenue_trend.length - 1]?.date).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
              <CardDescription>Highest revenue generators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {top_performers.map((performer, index) => (
                  <div key={performer.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-warning-500' : index === 1 ? 'bg-ios-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-ios-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-accent-900 dark:text-white">{performer.name}</p>
                        <p className="text-ios-caption text-ios-gray-600 dark:text-zinc-400">
                          {formatCurrency(performer.revenue)} • ★ {performer.rating.toFixed(1)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <Card variant="outlined">
            <CardContent>
              <h4 className="text-ios-subheadline font-medium text-ios-gray-600 dark:text-zinc-400 mb-2">
                NPS Score
              </h4>
              <p className="text-2xl font-bold text-accent-900 dark:text-white">
                {metrics.nps_score}
              </p>
              <p className="text-ios-caption text-ios-gray-600 dark:text-zinc-400 mt-1">
                Customer satisfaction
              </p>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <h4 className="text-ios-subheadline font-medium text-ios-gray-600 dark:text-zinc-400 mb-2">
                Average Ticket
              </h4>
              <p className="text-2xl font-bold text-accent-900 dark:text-white">
                {formatCurrency(metrics.average_ticket)}
              </p>
              <p className="text-ios-caption text-ios-gray-600 dark:text-zinc-400 mt-1">
                Per appointment
              </p>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <h4 className="text-ios-subheadline font-medium text-ios-gray-600 dark:text-zinc-400 mb-2">
                Staff Retention
              </h4>
              <p className="text-2xl font-bold text-accent-900 dark:text-white">
                {formatPercentage(metrics.staff_retention)}
              </p>
              <p className="text-ios-caption text-ios-gray-600 dark:text-zinc-400 mt-1">
                Retention rate
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}