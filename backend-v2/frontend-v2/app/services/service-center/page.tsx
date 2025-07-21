'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getProfile, fetchAPI, type User } from '@/lib/api'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DateRangeSelector, DateRangePreset } from '@/components/analytics/shared/DateRangeSelector'
import { 
  ScissorsIcon,
  SparklesIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  PlusIcon,
  RocketLaunchIcon,
  CurrencyDollarIcon,
  ClockIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  ArchiveBoxIcon,
  BeakerIcon
} from '@heroicons/react/24/outline'

// Lazy load service sections
const ServiceOverviewGrid = React.lazy(() => import('@/components/services/ServiceOverviewGrid'))
const ServiceAnalyticsPanel = React.lazy(() => import('@/components/services/ServiceAnalyticsPanel'))
const ServiceTemplateSelector = React.lazy(() => import('@/components/onboarding/ServiceTemplateSelector'))
const ServicePricingOptimization = React.lazy(() => import('@/components/services/ServicePricingOptimization'))
const Service6FBCompliance = React.lazy(() => import('@/components/services/Service6FBCompliance'))
const ServiceBulkOperations = React.lazy(() => import('@/components/services/ServiceBulkOperations'))
const ServiceQuickActions = React.lazy(() => import('@/components/services/ServiceQuickActions'))

interface ServiceCenterTab {
  id: string
  label: string
  icon: React.ReactNode
  roles: string[]
  description: string
}

const serviceCenterTabs: ServiceCenterTab[] = [
  { 
    id: 'overview', 
    label: 'Overview', 
    icon: <ChartBarIcon className="w-4 h-4" />,
    roles: ['all'],
    description: 'Service portfolio and performance summary'
  },
  { 
    id: 'management', 
    label: 'Management', 
    icon: <Cog6ToothIcon className="w-4 h-4" />,
    roles: ['all'],
    description: 'Service configuration and settings'
  },
  { 
    id: 'analytics', 
    label: 'Analytics', 
    icon: <ChartBarIcon className="w-4 h-4" />,
    roles: ['barber', 'admin', 'super_admin'],
    description: 'Performance insights and profitability'
  },
  { 
    id: 'templates', 
    label: 'Templates', 
    icon: <BeakerIcon className="w-4 h-4" />,
    roles: ['admin', 'super_admin'],
    description: 'Service templates and automation'
  },
  { 
    id: 'optimization', 
    label: 'Optimization', 
    icon: <RocketLaunchIcon className="w-4 h-4" />,
    roles: ['admin', 'super_admin'],
    description: 'Pricing and revenue optimization'
  },
  { 
    id: 'compliance', 
    label: '6FB Compliance', 
    icon: <StarIcon className="w-4 h-4" />,
    roles: ['barber', 'admin', 'super_admin'],
    description: 'Six Figure Barber methodology alignment'
  },
  { 
    id: 'bulk', 
    label: 'Bulk Operations', 
    icon: <ArchiveBoxIcon className="w-4 h-4" />,
    roles: ['admin', 'super_admin'],
    description: 'Mass service operations'
  }
]

function ServiceCenterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview')
  const [services, setServices] = useState([])
  const [serviceSummary, setServiceSummary] = useState({
    totalServices: 0,
    activeServices: 0,
    totalRevenue: 0,
    avgPrice: 0,
    topPerformer: null,
    complianceScore: 0,
    growthRate: 0
  })
  
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
    router.push(`/services/service-center?${newParams.toString()}`, { scroll: false })
  }, [activeTab, router, searchParams])

  // Load user and service data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        const userData = await getProfile()
        if (!userData) {
          router.push('/login')
          return
        }
        setUser(userData)

        // Load service data
        try {
          const [servicesResponse, analyticsResponse] = await Promise.all([
            fetchAPI('/api/v1/services'),
            fetchAPI(`/api/v1/services/analytics?start_date=${startDate}&end_date=${endDate}`)
          ])

          setServices(servicesResponse.services || [])
          setServiceSummary({
            totalServices: servicesResponse.services?.length || 0,
            activeServices: servicesResponse.services?.filter((s: any) => s.is_active)?.length || 0,
            totalRevenue: analyticsResponse.total_revenue || 0,
            avgPrice: analyticsResponse.avg_price || 0,
            topPerformer: analyticsResponse.top_performer || { name: '', revenue: 0 },
            complianceScore: analyticsResponse.compliance_score || 0,
            growthRate: analyticsResponse.growth_rate || 0
          })
        } catch (err) {
          console.error('Failed to load service data:', err)
          // Use mock data for demo
          setServices([])
          setServiceSummary({
            totalServices: 12,
            activeServices: 10,
            totalRevenue: 25800,
            avgPrice: 65,
            topPerformer: { name: 'Premium Cut & Style', revenue: 5400 },
            complianceScore: 78,
            growthRate: 12.5
          })
        }
      } catch (err) {
        console.error('Failed to load service center data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    if (startDate && endDate) {
      loadData()
    }
  }, [startDate, endDate, router])

  // Filter tabs based on user role
  const availableTabs = serviceCenterTabs.filter(tab => 
    tab.roles.includes('all') || tab.roles.includes(user?.role || '')
  )

  if (loading) {
    return <PageLoading message="Loading Service Center..." />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => window.location.reload()} />
  }

  if (!user) {
    return null
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ServiceOverview summary={serviceSummary} userRole={user.role} services={services} />
      case 'management':
        return (
          <Suspense fallback={<PageLoading message="Loading service management..." />}>
            <ServiceOverviewGrid
              services={services}
              selectedServices={[]}
              onSelectionChange={() => {}}
              searchQuery=""
              onSearchChange={() => {}}
              filterCategory=""
              onFilterChange={() => {}}
              onServiceEdit={(service) => router.push(`/admin/services/${service.id}/edit`)}
            />
          </Suspense>
        )
      case 'analytics':
        return (
          <Suspense fallback={<PageLoading message="Loading analytics..." />}>
            <ServiceAnalyticsPanel
              services={services}
              metrics={serviceSummary}
              dateRange={datePreset}
              onDateRangeChange={(range: string) => setDatePreset(range as DateRangePreset)}
            />
          </Suspense>
        )
      case 'templates':
        return (
          <Suspense fallback={<PageLoading message="Loading templates..." />}>
            <ServiceTemplateSelector
              onTemplatesSelect={() => {}}
              onApply={async () => {}}
              allowMultiSelect={true}
              maxSelections={10}
            />
          </Suspense>
        )
      case 'optimization':
        return (
          <Suspense fallback={<PageLoading message="Loading optimization..." />}>
            <ServicePricingOptimization
              services={services}
              metrics={serviceSummary}
              onOptimize={() => {}}
            />
          </Suspense>
        )
      case 'compliance':
        return (
          <Suspense fallback={<PageLoading message="Loading compliance..." />}>
            <Service6FBCompliance
              services={services}
              compliance={{
                score: serviceSummary.complianceScore,
                tier: serviceSummary.complianceScore >= 75 ? 'elite' : serviceSummary.complianceScore >= 50 ? 'growth' : 'foundation',
                opportunities: []
              }}
              onImprove={() => {}}
            />
          </Suspense>
        )
      case 'bulk':
        return (
          <Suspense fallback={<PageLoading message="Loading bulk operations..." />}>
            <ServiceBulkOperations
              services={services}
              selectedServices={[]}
              onBulkAction={async () => {}}
            />
          </Suspense>
        )
      default:
        return <div>Invalid tab selected</div>
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push('/dashboard')}
                variant="ghost"
                size="sm"
              >
                ← Dashboard
              </Button>
              <div className="border-l border-gray-300 dark:border-gray-600 h-6" />
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                  <ScissorsIcon className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Service Center
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Complete service management and optimization
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <DateRangeSelector
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                preset={datePreset}
                onPresetChange={setDatePreset}
              />
              <Button
                onClick={() => router.push('/admin/services/new')}
                size="sm"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Service
              </Button>
            </div>
          </div>
        </div>

        {/* Tabbed Service Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue={activeTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-auto gap-2">
            {availableTabs.map(tab => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id}
                className="flex items-center space-x-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-6">
            {renderTabContent()}
          </div>
        </Tabs>
      </div>
    </div>
  )
}

// Service Overview Component
function ServiceOverview({ summary, userRole, services }: { summary: any; userRole?: string; services: any[] }) {
  const router = useRouter()

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="elevated" animated>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <ScissorsIcon className="w-5 h-5 text-teal-600" />
              <span className="text-sm font-medium text-teal-600 flex items-center">
                <span className="text-xs">Active: {summary.activeServices}</span>
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary.totalServices}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total Services
            </p>
          </CardContent>
        </Card>

        <Card variant="elevated" animated animationDelay={100}>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-600 flex items-center">
                <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                {summary.growthRate}%
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${summary.totalRevenue.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Service Revenue (MTD)
            </p>
          </CardContent>
        </Card>

        <Card variant="elevated" animated animationDelay={200}>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <ClockIcon className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${summary.avgPrice}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Average Price
            </p>
          </CardContent>
        </Card>

        <Card variant="elevated" animated animationDelay={300}>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <StarIcon className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary.complianceScore}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              6FB Compliance Score
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => router.push('/admin/services/new')}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add New Service
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => router.push('/services/service-center?tab=templates')}
            >
              <BeakerIcon className="w-4 h-4 mr-2" />
              Browse Templates
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => router.push('/services/service-center?tab=optimization')}
            >
              <RocketLaunchIcon className="w-4 h-4 mr-2" />
              Optimize Pricing
            </Button>
            <Button 
              variant="outline" 
              className="justify-start"
              onClick={() => router.push('/services/service-center?tab=analytics')}
            >
              <ChartBarIcon className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Service Performance Highlights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Highlights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Top Performing Service</h4>
              {summary.topPerformer ? (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <p className="font-medium text-green-800 dark:text-green-200">{summary.topPerformer.name}</p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ${summary.topPerformer.revenue.toLocaleString()} revenue this month
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">No data available</p>
              )}
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Service Portfolio Health</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">6FB Compliance</span>
                  <span className="text-sm font-medium">{summary.complianceScore}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full" 
                    style={{ width: `${summary.complianceScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Service Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            Navigate to specific tabs to view detailed service data and management tools
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ServiceCenterPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading Service Center..." />}>
      <ServiceCenterContent />
    </Suspense>
  )
}