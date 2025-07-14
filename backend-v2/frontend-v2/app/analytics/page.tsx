'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getProfile, getDashboardAnalytics, getEnterpriseAnalytics, type User } from '@/lib/api'
import { AnalyticsLayout } from '@/components/analytics/AnalyticsLayout'
import { DateRangeSelector, DateRangePreset } from '@/components/analytics/shared/DateRangeSelector'
import { SkeletonStats, SkeletonCard } from '@/components/ui/skeleton-loader'
import { PageLoading } from '@/components/ui/LoadingStates'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AIInsightsPanel from '@/components/ai/AIInsightsPanel'

// Role-based view components
import { BarberAnalyticsView } from '@/components/analytics/views/BarberAnalyticsView'
import { ManagerAnalyticsView } from '@/components/analytics/views/ManagerAnalyticsView'
import { EnterpriseAnalyticsView } from '@/components/analytics/views/EnterpriseAnalyticsView'

// Lazy load specialized views
const RevenueAnalyticsSection = React.lazy(() => import('@/components/analytics/sections/RevenueAnalyticsSection'))
const ClientAnalyticsSection = React.lazy(() => import('@/components/analytics/sections/ClientAnalyticsSection'))
const MarketingAnalyticsSection = React.lazy(() => import('@/components/analytics/sections/MarketingAnalyticsSection'))
const ReviewsAnalyticsSection = React.lazy(() => import('@/components/analytics/sections/ReviewsAnalyticsSection'))
const ProductivityAnalyticsSection = React.lazy(() => import('@/components/analytics/sections/ProductivityAnalyticsSection'))

interface AnalyticsTab {
  id: string
  label: string
  roles: string[]
  icon?: React.ReactNode
}

const analyticsTabs: AnalyticsTab[] = [
  { id: 'overview', label: 'Overview', roles: ['all'] },
  { id: 'revenue', label: 'Revenue', roles: ['all'] },
  { id: 'clients', label: 'Clients', roles: ['all'] },
  { id: 'marketing', label: 'Marketing', roles: ['admin', 'super_admin', 'location_manager'] },
  { id: 'reviews', label: 'Reviews', roles: ['admin', 'super_admin', 'location_manager'] },
  { id: 'productivity', label: 'Productivity', roles: ['barber', 'admin', 'location_manager'] },
]

function UnifiedAnalyticsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview')
  
  // Date range state
  const [datePreset, setDatePreset] = useState<DateRangePreset>('30d')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Initialize date range
  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 30)
    
    setStartDate(start.toISOString().split('T')[0])
    setEndDate(end.toISOString().split('T')[0])
  }, [])

  // Update URL when tab changes
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams.toString())
    newParams.set('tab', activeTab)
    router.push(`/analytics?${newParams.toString()}`, { scroll: false })
  }, [activeTab, router, searchParams])

  // Load user and analytics data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        // Get user profile
        const userData = await getProfile()
        if (!userData) {
          router.push('/login')
          return
        }
        setUser(userData)

        // Load analytics based on user role
        let data = null
        
        if (userData.role === 'super_admin' || userData.role === 'enterprise_owner') {
          // Enterprise view
          const enterpriseData = await getEnterpriseAnalytics(startDate, endDate)
          data = {
            type: 'enterprise',
            summary: {
              totalRevenue: enterpriseData.metrics.total_revenue,
              revenueGrowth: enterpriseData.metrics.revenue_growth,
              totalLocations: enterpriseData.locations.length,
              totalBarbers: enterpriseData.metrics.total_clients,
              totalClients: enterpriseData.metrics.total_clients,
              averageUtilization: enterpriseData.metrics.chair_utilization
            },
            locations: enterpriseData.locations,
            topPerformers: enterpriseData.top_performers,
            raw: enterpriseData
          }
        } else {
          // Standard analytics for other roles
          const analytics = await getDashboardAnalytics(userData.id)
          data = {
            type: userData.role === 'admin' || userData.role === 'location_manager' ? 'manager' : 'barber',
            summary: analytics,
            raw: analytics
          }
        }

        setAnalyticsData(data)
      } catch (err) {
        console.error('Failed to load analytics:', err)
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    if (startDate && endDate) {
      loadData()
    }
  }, [startDate, endDate, router])

  // Filter tabs based on user role
  const availableTabs = analyticsTabs.filter(tab => 
    tab.roles.includes('all') || tab.roles.includes(user?.role || '')
  )

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Analytics</h1>
          <p className="text-gray-600">Loading your business insights...</p>
        </div>
        <SkeletonStats />
        <div className="grid md:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!user || !analyticsData) {
    return null
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        // Role-based overview
        switch (analyticsData.type) {
          case 'enterprise':
            return <EnterpriseAnalyticsView data={analyticsData} />
          case 'manager':
            return <ManagerAnalyticsView data={analyticsData} />
          case 'barber':
            return <BarberAnalyticsView data={analyticsData} />
          default:
            return <div>Unknown analytics view type</div>
        }
      case 'revenue':
        return (
          <Suspense fallback={<PageLoading message="Loading revenue analytics..." />}>
            <RevenueAnalyticsSection 
              data={analyticsData.raw} 
              userRole={user.role} 
              dateRange={{ startDate, endDate }}
            />
          </Suspense>
        )
      case 'clients':
        return (
          <Suspense fallback={<PageLoading message="Loading client analytics..." />}>
            <ClientAnalyticsSection 
              data={analyticsData.raw} 
              userRole={user.role}
              dateRange={{ startDate, endDate }}
            />
          </Suspense>
        )
      case 'marketing':
        return (
          <Suspense fallback={<PageLoading message="Loading marketing analytics..." />}>
            <MarketingAnalyticsSection 
              userRole={user.role}
              dateRange={{ startDate, endDate }}
            />
          </Suspense>
        )
      case 'reviews':
        return (
          <Suspense fallback={<PageLoading message="Loading review analytics..." />}>
            <ReviewsAnalyticsSection 
              userRole={user.role}
              dateRange={{ startDate, endDate }}
            />
          </Suspense>
        )
      case 'productivity':
        return (
          <Suspense fallback={<PageLoading message="Loading productivity analytics..." />}>
            <ProductivityAnalyticsSection 
              data={analyticsData.raw}
              userRole={user.role}
              dateRange={{ startDate, endDate }}
            />
          </Suspense>
        )
      default:
        return <div>Invalid tab selected</div>
    }
  }

  return (
    <AnalyticsLayout
      title="Analytics Dashboard"
      description="Comprehensive insights into your business performance"
      userRole={user.role}
      showNavigation={false}
      headerActions={
        <DateRangeSelector
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          preset={datePreset}
          onPresetChange={setDatePreset}
        />
      }
    >
      {/* AI Insights Panel - Always visible at top */}
      <div className="mb-6">
        <AIInsightsPanel userId={user.id} />
      </div>

      {/* Tabbed Analytics Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-auto gap-2 w-full max-w-4xl mx-auto">
          {availableTabs.map(tab => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          {renderTabContent()}
        </div>
      </Tabs>
    </AnalyticsLayout>
  )
}

export default function UnifiedAnalyticsPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading analytics..." />}>
      <UnifiedAnalyticsContent />
    </Suspense>
  )
}