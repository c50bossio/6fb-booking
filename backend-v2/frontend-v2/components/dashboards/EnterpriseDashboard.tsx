'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingStates } from '@/components/ui/LoadingSystem'
import { type UserWithRole } from '@/lib/roleUtils'

// Icons
const BuildingIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)

const DollarSignIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
)

const TrendingUpIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
)

const MapPinIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const BarChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const StarIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
)

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

// Types for enterprise data
interface EnterpriseMetrics {
  totalRevenue: number
  monthlyGrowth: number
  totalLocations: number
  activeLocations: number
  totalStaff: number
  totalClients: number
  averageLocationRevenue: number
  enterpriseUtilization: number
  brandConsistencyScore: number
}

interface LocationPerformance {
  id: number
  name: string
  address: string
  monthlyRevenue: number
  dailyRevenue: number
  staffCount: number
  clientCount: number
  utilizationRate: number
  customerRating: number
  status: 'active' | 'inactive' | 'maintenance'
  manager: string
}

interface CrossLocationMetric {
  metric: string
  topLocation: {
    name: string
    value: number
  }
  bottomLocation: {
    name: string
    value: number
  }
  average: number
}

interface ExpansionOpportunity {
  id: string
  area: string
  marketSize: number
  estimatedRevenue: number
  competitionLevel: 'low' | 'medium' | 'high'
  investmentRequired: number
}

interface EnterpriseData {
  enterpriseMetrics: EnterpriseMetrics
  locationPerformance: LocationPerformance[]
  crossLocationMetrics: CrossLocationMetric[]
  expansionOpportunities: ExpansionOpportunity[]
  topPerformers: Array<{
    type: 'location' | 'manager' | 'service'
    name: string
    metric: string
    value: number
  }>
}

interface EnterpriseDashboardProps {
  user: UserWithRole & {
    email: string
    name: string
  }
  className?: string
}

export function EnterpriseDashboard({ user, className = '' }: EnterpriseDashboardProps) {
  const router = useRouter()
  const [data, setData] = useState<EnterpriseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEnterpriseData() {
      try {
        setLoading(true)
        // This will be implemented when we create the dashboard API
        // const response = await getEnterpriseData(user.id)
        
        // Mock data for now
        const mockData: EnterpriseData = {
          enterpriseMetrics: {
            totalRevenue: 142500,
            monthlyGrowth: 8.5,
            totalLocations: 5,
            activeLocations: 5,
            totalStaff: 28,
            totalClients: 1250,
            averageLocationRevenue: 28500,
            enterpriseUtilization: 79,
            brandConsistencyScore: 87
          },
          locationPerformance: [
            {
              id: 1,
              name: "Downtown Location",
              address: "123 Main St, Downtown",
              monthlyRevenue: 35200,
              dailyRevenue: 1640,
              staffCount: 7,
              clientCount: 310,
              utilizationRate: 89,
              customerRating: 4.8,
              status: "active",
              manager: "Sarah Johnson"
            },
            {
              id: 2,
              name: "Westside Plaza",
              address: "456 West Ave, Westside",
              monthlyRevenue: 28900,
              dailyRevenue: 1350,
              staffCount: 6,
              clientCount: 285,
              utilizationRate: 82,
              customerRating: 4.6,
              status: "active",
              manager: "Mike Rodriguez"
            },
            {
              id: 3,
              name: "Mall Location",
              address: "789 Shopping Center",
              monthlyRevenue: 32100,
              dailyRevenue: 1500,
              staffCount: 6,
              clientCount: 295,
              utilizationRate: 85,
              customerRating: 4.7,
              status: "active",
              manager: "Lisa Chen"
            },
            {
              id: 4,
              name: "Northside Branch",
              address: "321 North Blvd",
              monthlyRevenue: 24800,
              dailyRevenue: 1155,
              staffCount: 5,
              clientCount: 205,
              utilizationRate: 72,
              customerRating: 4.4,
              status: "active",
              manager: "David Wilson"
            },
            {
              id: 5,
              name: "Airport Terminal",
              address: "555 Airport Rd",
              monthlyRevenue: 21500,
              dailyRevenue: 1005,
              staffCount: 4,
              clientCount: 155,
              utilizationRate: 68,
              customerRating: 4.2,
              status: "active",
              manager: "Carlos Martinez"
            }
          ],
          crossLocationMetrics: [
            {
              metric: "Customer Satisfaction",
              topLocation: { name: "Downtown Location", value: 4.8 },
              bottomLocation: { name: "Airport Terminal", value: 4.2 },
              average: 4.5
            },
            {
              metric: "Booking Rate (%)",
              topLocation: { name: "Downtown Location", value: 89 },
              bottomLocation: { name: "Airport Terminal", value: 68 },
              average: 79
            },
            {
              metric: "Revenue per Client ($)",
              topLocation: { name: "Downtown Location", value: 114 },
              bottomLocation: { name: "Northside Branch", value: 121 },
              average: 114
            }
          ],
          expansionOpportunities: [
            {
              id: "1",
              area: "Eastside District",
              marketSize: 45000,
              estimatedRevenue: 28000,
              competitionLevel: "medium",
              investmentRequired: 85000
            },
            {
              id: "2", 
              area: "University Area",
              marketSize: 32000,
              estimatedRevenue: 22000,
              competitionLevel: "low",
              investmentRequired: 75000
            }
          ],
          topPerformers: [
            {
              type: "location",
              name: "Downtown Location",
              metric: "Monthly Revenue",
              value: 35200
            },
            {
              type: "manager",
              name: "Sarah Johnson",
              metric: "Customer Satisfaction",
              value: 4.8
            },
            {
              type: "service",
              name: "Premium Haircut",
              metric: "Cross-Location Bookings",
              value: 234
            }
          ]
        }
        
        setData(mockData)
      } catch (err) {
        setError('Failed to load enterprise data')
        console.error('Error fetching enterprise data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEnterpriseData()
  }, [user.id])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
      case 'inactive':
        return <Badge variant="destructive">Inactive</Badge>
      case 'maintenance':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Maintenance</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getCompetitionBadge = (level: string) => {
    switch (level) {
      case 'low':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Low</Badge>
      case 'medium':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium</Badge>
      case 'high':
        return <Badge variant="destructive">High</Badge>
      default:
        return <Badge variant="secondary">{level}</Badge>
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <LoadingStates.Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <LoadingStates.CardSkeleton />
            <LoadingStates.CardSkeleton />
            <LoadingStates.CardSkeleton />
            <LoadingStates.CardSkeleton />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LoadingStates.CardSkeleton />
            <LoadingStates.CardSkeleton />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Unable to load enterprise data</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Enterprise Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Welcome back, {user.first_name || user.name}. Here's your multi-location overview.
            </p>
          </div>
          
          <div className="flex items-center gap-4 mt-4 lg:mt-0">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{data?.enterpriseMetrics.brandConsistencyScore}%</div>
              <div className="text-xs text-gray-500">Brand Score</div>
            </div>
            <Button 
              onClick={() => router.push('/locations/new')}
              variant="primary"
              leftIcon={<PlusIcon />}
            >
              Add Location
            </Button>
          </div>
        </div>

        {/* Enterprise Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(data?.enterpriseMetrics.totalRevenue || 0)}
                  </p>
                  <p className="text-sm text-green-600">
                    +{data?.enterpriseMetrics.monthlyGrowth}% this month
                  </p>
                </div>
                <DollarSignIcon />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Locations</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {data?.enterpriseMetrics.activeLocations}/{data?.enterpriseMetrics.totalLocations}
                  </p>
                  <p className="text-sm text-blue-600">
                    Avg: {formatCurrency(data?.enterpriseMetrics.averageLocationRevenue || 0)}
                  </p>
                </div>
                <BuildingIcon />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Staff</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {data?.enterpriseMetrics.totalStaff || 0}
                  </p>
                  <p className="text-sm text-gray-500">
                    Across {data?.enterpriseMetrics.totalLocations} locations
                  </p>
                </div>
                <UsersIcon />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Enterprise Utilization</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {data?.enterpriseMetrics.enterpriseUtilization || 0}%
                  </p>
                  <p className="text-sm text-gray-500">
                    {data?.enterpriseMetrics.totalClients || 0} total clients
                  </p>
                </div>
                <TrendingUpIcon />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          
          {/* Location Performance */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPinIcon />
                Location Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.locationPerformance.map((location) => (
                  <div key={location.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{location.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{location.address}</p>
                        <p className="text-xs text-gray-500">Manager: {location.manager}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(location.status)}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => router.push(`/locations/${location.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Monthly Revenue</span>
                        <p className="font-medium">{formatCurrency(location.monthlyRevenue)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Staff</span>
                        <p className="font-medium">{location.staffCount} members</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Utilization</span>
                        <p className="font-medium">{location.utilizationRate}%</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Rating</span>
                        <div className="flex items-center gap-1">
                          <StarIcon />
                          <span className="font-medium">{location.customerRating}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => router.push('/locations')}
                  rightIcon={<ArrowRightIcon />}
                >
                  Manage All Locations
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Cross-Location Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChartIcon />
                Performance Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {data?.crossLocationMetrics.map((metric, index) => (
                  <div key={index} className="space-y-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">{metric.metric}</h4>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-600">Best: {metric.topLocation.name}</span>
                        <span className="font-medium text-green-600">{metric.topLocation.value}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Average</span>
                        <span className="font-medium">{metric.average}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-red-600">Needs Work: {metric.bottomLocation.name}</span>
                        <span className="font-medium text-red-600">{metric.bottomLocation.value}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => router.push('/analytics/cross-location')}
                  rightIcon={<ArrowRightIcon />}
                >
                  Detailed Analytics
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Expansion Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPinIcon />
                Expansion Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.expansionOpportunities.map((opportunity) => (
                  <div key={opportunity.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">{opportunity.area}</h4>
                      {getCompetitionBadge(opportunity.competitionLevel)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                      <div>
                        <span className="text-gray-500">Market Size</span>
                        <p className="font-medium">{opportunity.marketSize.toLocaleString()} people</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Est. Revenue</span>
                        <p className="font-medium">{formatCurrency(opportunity.estimatedRevenue)}/mo</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Investment</span>
                        <p className="font-medium">{formatCurrency(opportunity.investmentRequired)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">ROI Timeline</span>
                        <p className="font-medium">~18 months</p>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={() => router.push(`/expansion/${opportunity.id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => router.push('/expansion')}
                  rightIcon={<ArrowRightIcon />}
                >
                  View All Opportunities
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions & Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle>Enterprise Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="flex flex-col h-16 gap-1"
                    onClick={() => router.push('/locations/new')}
                  >
                    <PlusIcon />
                    <span className="text-xs">New Location</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="flex flex-col h-16 gap-1"
                    onClick={() => router.push('/analytics/enterprise')}
                  >
                    <BarChartIcon />
                    <span className="text-xs">Analytics</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="flex flex-col h-16 gap-1"
                    onClick={() => router.push('/brand')}
                  >
                    <StarIcon />
                    <span className="text-xs">Brand Standards</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="flex flex-col h-16 gap-1"
                    onClick={() => router.push('/reports/executive')}
                  >
                    <TrendingUpIcon />
                    <span className="text-xs">Executive Reports</span>
                  </Button>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Top Performers</h4>
                  <div className="space-y-2">
                    {data?.topPerformers.map((performer, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">{performer.name}</span>
                          <p className="text-gray-500">{performer.metric}</p>
                        </div>
                        <span className="font-medium text-blue-600">
                          {performer.type === 'location' || performer.type === 'service' 
                            ? formatCurrency(performer.value) 
                            : performer.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  )
}