'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, getEnterpriseAnalytics, type User, type EnterpriseAnalytics } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import { usePermissions } from '@/components/ProtectedRoute'

// Import new advanced enterprise components
import SixFigureCoachingPanel from '@/components/enterprise/SixFigureCoachingPanel'
import AdvancedStaffManagement from '@/components/enterprise/AdvancedStaffManagement'
import MultiLocationCalendar from '@/components/enterprise/MultiLocationCalendar'

// Icon Components
const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const CoachingIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

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

const DollarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

export default function EnhancedEnterpriseDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [analytics, setAnalytics] = useState<EnterpriseAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('30d')
  const [selectedLocations, setSelectedLocations] = useState<number[]>([])
  const [activeTab, setActiveTab] = useState('overview')
  
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
                Enterprise Management Center
              </h1>
              <p className="text-ios-body text-ios-gray-600 dark:text-zinc-300 mt-2">
                Advanced multi-location management with Six Figure Barber methodology
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

        {/* Quick KPI Overview */}
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
                  <LocationIcon />
                </div>
                <span className="text-ios-caption text-ios-gray-600 dark:text-zinc-400">
                  {locations.length} locations
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

        {/* Enhanced Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <DashboardIcon />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="coaching" className="flex items-center space-x-2">
              <CoachingIcon />
              <span>AI Coaching</span>
            </TabsTrigger>
            <TabsTrigger value="staff" className="flex items-center space-x-2">
              <UsersIcon />
              <span>Staff Management</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center space-x-2">
              <CalendarIcon />
              <span>Multi-Location Calendar</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Original Dashboard Content */}
          <TabsContent value="overview" className="space-y-6">
            {/* Location Performance Matrix */}
            <Card variant="elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Location Performance Matrix</CardTitle>
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
          </TabsContent>

          {/* Six Figure Barber AI Coaching Tab */}
          <TabsContent value="coaching">
            <SixFigureCoachingPanel 
              dateRange={dateRange}
              className="space-y-6"
            />
          </TabsContent>

          {/* Advanced Staff Management Tab */}
          <TabsContent value="staff">
            <AdvancedStaffManagement 
              className="space-y-6"
            />
          </TabsContent>

          {/* Multi-Location Calendar Tab */}
          <TabsContent value="calendar">
            <MultiLocationCalendar 
              className="space-y-6"
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}