'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  Settings, 
  Plus, 
  Search,
  Filter,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Clock,
  Star,
  Users,
  Target,
  Brain,
  Zap
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ServiceOverviewGrid from '@/components/services/ServiceOverviewGrid'
import ServiceAnalyticsPanel from '@/components/services/ServiceAnalyticsPanel'
import ServiceBulkOperations from '@/components/services/ServiceBulkOperations'
import ServiceQuickActions from '@/components/services/ServiceQuickActions'
import Service6FBCompliance from '@/components/services/Service6FBCompliance'
import ServiceTemplateRecommendations from '@/components/services/ServiceTemplateRecommendations'
import ServicePerformanceMetrics from '@/components/services/ServicePerformanceMetrics'
import ServicePricingOptimization from '@/components/services/ServicePricingOptimization'
import { 
  getProfile,
  getServices,
  getServiceAnalytics,
  getServiceMetrics,
  type Service,
  type User
} from '@/lib/api'
import { LoadingSpinner } from '@/components/ui/LoadingStates'
import { EmptyState } from '@/components/ui/empty-state'

interface ServiceMetrics {
  totalServices: number
  activeServices: number
  packageServices: number
  averagePrice: number
  totalRevenue: number
  totalBookings: number
  avgBookingsPerService: number
  topPerformingServices: Service[]
  underperformingServices: Service[]
  sixFBCompliance: {
    score: number
    tier: string
    opportunities: string[]
  }
}

export default function ServiceDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [metrics, setMetrics] = useState<ServiceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedServices, setSelectedServices] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState('30d')

  useEffect(() => {
    loadData()
  }, [dateRange])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Check authentication
      const userProfile = await getProfile()
      setUser(userProfile)

      // Load services and analytics
      const [servicesData, analyticsData] = await Promise.all([
        getServices(),
        getServiceAnalytics({ dateRange })
      ])
      
      setServices(servicesData)
      
      // Calculate metrics
      const calculatedMetrics = calculateMetrics(servicesData, analyticsData)
      setMetrics(calculatedMetrics)
    } catch (err: any) {
      setError(err.message || 'Failed to load service data')
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        router.push('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const calculateMetrics = (services: Service[], analytics: any): ServiceMetrics => {
    const activeServices = services.filter(s => s.is_active)
    const packageServices = services.filter(s => s.is_package)
    
    // Calculate average price
    const totalPrice = services.reduce((sum, s) => sum + s.base_price, 0)
    const averagePrice = services.length > 0 ? totalPrice / services.length : 0

    // Mock analytics data - in real implementation, this would come from the API
    const totalRevenue = analytics?.totalRevenue || 0
    const totalBookings = analytics?.totalBookings || 0
    const avgBookingsPerService = totalBookings > 0 ? totalBookings / services.length : 0

    // Identify top and underperforming services
    const topPerformingServices = services
      .sort((a, b) => (b.booking_count || 0) - (a.booking_count || 0))
      .slice(0, 5)

    const underperformingServices = services
      .filter(s => s.is_active)
      .sort((a, b) => (a.booking_count || 0) - (b.booking_count || 0))
      .slice(0, 5)

    // Calculate 6FB compliance score
    const sixFBCompliance = calculate6FBCompliance(services, analytics)

    return {
      totalServices: services.length,
      activeServices: activeServices.length,
      packageServices: packageServices.length,
      averagePrice,
      totalRevenue,
      totalBookings,
      avgBookingsPerService,
      topPerformingServices,
      underperformingServices,
      sixFBCompliance
    }
  }

  const calculate6FBCompliance = (services: Service[], analytics: any) => {
    // Mock calculation - in real implementation, this would be more sophisticated
    let score = 0
    const opportunities: string[] = []

    // Check pricing optimization
    const avgPrice = services.reduce((sum, s) => sum + s.base_price, 0) / services.length
    if (avgPrice >= 50) score += 25
    else opportunities.push('Increase average service price to $50+')

    // Check for premium services
    const premiumServices = services.filter(s => s.base_price >= 75)
    if (premiumServices.length > 0) score += 25
    else opportunities.push('Add premium services ($75+) to your menu')

    // Check for service packages
    const packages = services.filter(s => s.is_package)
    if (packages.length > 0) score += 25
    else opportunities.push('Create service packages for increased revenue')

    // Check service diversity
    const categories = new Set(services.map(s => s.category))
    if (categories.size >= 3) score += 25
    else opportunities.push('Diversify your service offerings across categories')

    // Determine tier
    let tier = 'foundation'
    if (score >= 75) tier = 'elite'
    else if (score >= 50) tier = 'growth'

    return { score, tier, opportunities }
  }

  const handleBulkAction = async (action: string) => {
    // Implement bulk actions
    console.log(`Performing bulk action: ${action} on`, selectedServices)
    await loadData() // Reload after action
  }

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !filterCategory || service.category === filterCategory
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <EmptyState
          icon={AlertCircle}
          title="Error Loading Dashboard"
          description={error}
          action={{
            label: "Try Again",
            onClick: loadData
          }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Service Management Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Optimize your services with Six Figure Barber methodology
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/services/templates')}
              >
                <Package className="w-4 h-4 mr-2" />
                Browse Templates
              </Button>
              <Button
                variant="primary"
                onClick={() => router.push('/services/new')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Service
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Total Services
                    </p>
                    <p className="text-2xl font-bold">{metrics?.totalServices || 0}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {metrics?.activeServices || 0} active
                    </p>
                  </div>
                  <Package className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Average Price
                    </p>
                    <p className="text-2xl font-bold">
                      ${metrics?.averagePrice.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-sm text-green-600 mt-1 flex items-center">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +12% from last month
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Total Revenue
                    </p>
                    <p className="text-2xl font-bold">
                      ${metrics?.totalRevenue.toFixed(0) || '0'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Last {dateRange}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      6FB Score
                    </p>
                    <p className="text-2xl font-bold">{metrics?.sixFBCompliance.score}%</p>
                    <Badge 
                      variant={
                        metrics?.sixFBCompliance.tier === 'elite' ? 'success' :
                        metrics?.sixFBCompliance.tier === 'growth' ? 'warning' : 'default'
                      }
                      className="mt-1"
                    >
                      {metrics?.sixFBCompliance.tier.toUpperCase()}
                    </Badge>
                  </div>
                  <Target className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="overview">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
            <TabsTrigger value="compliance">6FB Compliance</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Quick Actions */}
              <ServiceQuickActions
                services={services}
                onActionComplete={loadData}
              />

              {/* Service Grid */}
              <ServiceOverviewGrid
                services={filteredServices}
                selectedServices={selectedServices}
                onSelectionChange={setSelectedServices}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filterCategory={filterCategory}
                onFilterChange={setFilterCategory}
                onServiceEdit={(service) => router.push(`/services/edit/${service.id}`)}
              />

              {/* Template Recommendations */}
              <ServiceTemplateRecommendations
                currentServices={services}
                onApplyTemplate={loadData}
              />
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <ServiceAnalyticsPanel
              services={services}
              metrics={metrics}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          </TabsContent>

          <TabsContent value="optimization">
            <ServicePricingOptimization
              services={services}
              metrics={metrics}
              onOptimize={loadData}
            />
          </TabsContent>

          <TabsContent value="compliance">
            <Service6FBCompliance
              services={services}
              compliance={metrics?.sixFBCompliance}
              onImprove={loadData}
            />
          </TabsContent>

          <TabsContent value="bulk">
            <ServiceBulkOperations
              services={services}
              selectedServices={selectedServices}
              onBulkAction={handleBulkAction}
            />
          </TabsContent>
        </Tabs>

        {/* Performance Metrics */}
        <div className="mt-8">
          <ServicePerformanceMetrics
            topServices={metrics?.topPerformingServices || []}
            underperformingServices={metrics?.underperformingServices || []}
            dateRange={dateRange}
          />
        </div>
      </div>
    </div>
  )
}