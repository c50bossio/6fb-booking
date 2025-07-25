'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnalyticsCardGrid } from '../shared/AnalyticsCard'
import { 
  CurrencyDollarIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  Cog6ToothIcon,
  ClockIcon,
  StarIcon,
  MapPinIcon,
  PhoneIcon,
  GlobeAltIcon,
  PlusIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  Bars3BottomLeftIcon,
  ChartPieIcon,
  CalendarDaysIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface LocationData {
  id: number
  name: string
  revenue: number
  growth: number
  appointments: number
  utilization: number
  rating: number
  barbers: number
  address?: string
  phone?: string
  manager?: string
  status: 'active' | 'inactive' | 'pending'
  performanceScore: number
  monthlyTarget: number
  lastReview?: string
  openHours?: string
  services: string[]
  clientRetention: number
  averageTicket: number
}

interface LocationPerformanceMetrics {
  revenue_vs_target: number
  growth_trend: 'up' | 'down' | 'stable'
  efficiency_score: number
  customer_satisfaction: number
  staff_productivity: number
  booking_conversion: number
}

interface LocationBenchmark {
  metric: string
  current: number
  target: number
  benchmark: number
  trend: 'up' | 'down' | 'stable'
  status: 'excellent' | 'good' | 'needs_improvement' | 'critical'
}

interface EnterpriseAnalyticsViewProps {
  data: {
    summary: {
      totalRevenue: number
      revenueGrowth: number
      totalLocations: number
      totalBarbers: number
      totalClients: number
      averageUtilization: number
    }
    locations: LocationData[]
    topPerformers: {
      id: number
      name: string
      location: string
      revenue: number
      rating: number
    }[]
  }
  loading?: boolean
}

export function EnterpriseAnalyticsView({ data, loading = false }: EnterpriseAnalyticsViewProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [sortBy, setSortBy] = useState<'revenue' | 'growth' | 'rating' | 'performance'>('revenue')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'pending'>('all')
  const [showAddLocationDialog, setShowAddLocationDialog] = useState(false)

  // Enhanced location data with additional metrics
  const enhancedLocations: LocationData[] = data.locations.map((location, index) => ({
    ...location,
    address: `${123 + index * 111} Main St, Suite ${100 + index}`,
    phone: `(555) ${String(123 + index * 111).substring(0, 3)}-${String(456 + index * 123).substring(0, 4)}`,
    manager: ['Sarah Johnson', 'Mike Chen', 'Elena Rodriguez', 'David Kim'][index] || 'TBD',
    status: index === 0 ? 'active' : index === 1 ? 'active' : index === 2 ? 'pending' : 'active',
    performanceScore: Math.round((location.rating * 10 + location.utilization + location.growth) / 3),
    monthlyTarget: Math.round(location.revenue * 1.2),
    lastReview: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    openHours: '9:00 AM - 7:00 PM',
    services: ['Premium Cuts', 'Beard Grooming', 'Hot Towel Shaves', 'Hair Washing'].slice(0, 2 + index),
    clientRetention: Math.round(75 + Math.random() * 20),
    averageTicket: Math.round(45 + Math.random() * 30)
  }))

  const metrics = [
    {
      title: 'Total Revenue',
      value: `$${data.summary.totalRevenue.toLocaleString()}`,
      icon: <CurrencyDollarIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />,
      change: data.summary.revenueGrowth,
      trend: data.summary.revenueGrowth > 0 ? 'up' : 'down'
    },
    {
      title: 'Active Locations',
      value: enhancedLocations.filter(l => l.status === 'active').length,
      icon: <BuildingStorefrontIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      trend: 'up',
      subtitle: `${data.summary.totalLocations} total`
    },
    {
      title: 'Team Members',
      value: data.summary.totalBarbers,
      icon: <UserGroupIcon className="w-5 h-5 text-green-600 dark:text-green-400" />,
      change: data.summary.averageUtilization,
      changeLabel: 'avg utilization',
      trend: data.summary.averageUtilization > 75 ? 'up' : 'down'
    },
    {
      title: 'Performance Score',
      value: Math.round(enhancedLocations.reduce((sum, l) => sum + l.performanceScore, 0) / enhancedLocations.length),
      icon: <ChartBarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      trend: 'up',
      subtitle: 'Enterprise average'
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
      case 'inactive':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Inactive</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Excellent</Badge>
    if (score >= 75) return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Good</Badge>
    if (score >= 60) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Fair</Badge>
    return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Needs Attention</Badge>
  }

  const filteredAndSortedLocations = enhancedLocations
    .filter(location => filterStatus === 'all' || location.status === filterStatus)
    .sort((a, b) => {
      switch (sortBy) {
        case 'revenue': return b.revenue - a.revenue
        case 'growth': return b.growth - a.growth
        case 'rating': return b.rating - a.rating
        case 'performance': return b.performanceScore - a.performanceScore
        default: return 0
      }
    })

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <AnalyticsCardGrid metrics={metrics} loading={loading} />

      {/* Enterprise Location Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="locations">Location Management</TabsTrigger>
          <TabsTrigger value="performance">Performance Analysis</TabsTrigger>
          <TabsTrigger value="insights">Business Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Revenue Trend and Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {/* Placeholder chart bars */}
                  {Array.from({ length: 30 }, (_, i) => {
                    const height = Math.random() * 80 + 20
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-primary-500 dark:bg-primary-600 rounded-t hover:bg-primary-600 dark:hover:bg-primary-500 transition-colors"
                        style={{ height: `${height}%` }}
                      />
                    )
                  })}
                </div>
                <div className="flex justify-between mt-4 text-xs text-gray-600 dark:text-gray-400">
                  <span>30 days ago</span>
                  <span>Today</span>
                </div>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.topPerformers.map((performer, index) => (
                    <div key={performer.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{performer.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {performer.location} • ★ {performer.rating.toFixed(1)}
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-gray-900 dark:text-white">
                        ${performer.revenue.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Enterprise Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => setShowAddLocationDialog(true)}
                >
                  <PlusIcon className="w-5 h-5" />
                  <span className="text-sm">Add Location</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => setActiveTab('performance')}
                >
                  <ChartPieIcon className="w-5 h-5" />
                  <span className="text-sm">Performance Review</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => router.push('/reports')}
                >
                  <Bars3BottomLeftIcon className="w-5 h-5" />
                  <span className="text-sm">Generate Reports</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => router.push('/settings/financial')}
                >
                  <BanknotesIcon className="w-5 h-5" />
                  <span className="text-sm">Financial Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          {/* Location Management Controls */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BuildingStorefrontIcon className="w-5 h-5" />
                    Location Management
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage all your barbershop locations from one central dashboard
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="inactive">Inactive Only</SelectItem>
                      <SelectItem value="pending">Pending Setup</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Sort by Revenue</SelectItem>
                      <SelectItem value="growth">Sort by Growth</SelectItem>
                      <SelectItem value="rating">Sort by Rating</SelectItem>
                      <SelectItem value="performance">Sort by Performance</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
                  >
                    <ArrowsUpDownIcon className="w-4 h-4 mr-2" />
                    {viewMode === 'table' ? 'Grid View' : 'Table View'}
                  </Button>

                  <Button onClick={() => setShowAddLocationDialog(true)}>
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add Location
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {viewMode === 'table' ? (
                // Table View
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Location</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Performance</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Revenue</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Target</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Team</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Rating</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedLocations.map((location) => (
                        <tr
                          key={location.id}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                          onClick={() => setSelectedLocation(location)}
                        >
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{location.name}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{location.address}</p>
                              <p className="text-xs text-gray-500">{location.manager}</p>
                            </div>
                          </td>
                          <td className="text-right py-4 px-4">
                            {getStatusBadge(location.status)}
                          </td>
                          <td className="text-right py-4 px-4">
                            {getPerformanceBadge(location.performanceScore)}
                          </td>
                          <td className="text-right py-4 px-4">
                            <div>
                              <p className="font-medium">${location.revenue.toLocaleString()}</p>
                              <span className={`text-sm ${location.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {location.growth > 0 ? '+' : ''}{location.growth}%
                              </span>
                            </div>
                          </td>
                          <td className="text-right py-4 px-4">
                            <div>
                              <p className="text-sm">${location.monthlyTarget.toLocaleString()}</p>
                              <p className="text-xs text-gray-500">
                                {Math.round((location.revenue / location.monthlyTarget) * 100)}% achieved
                              </p>
                            </div>
                          </td>
                          <td className="text-right py-4 px-4">
                            <div>
                              <p className="font-medium">{location.barbers}</p>
                              <p className="text-xs text-gray-500">{location.utilization}% util</p>
                            </div>
                          </td>
                          <td className="text-right py-4 px-4">
                            <div className="flex items-center justify-end">
                              <StarIcon className="w-4 h-4 fill-yellow-400 text-yellow-400 mr-1" />
                              <span className="font-medium">{location.rating.toFixed(1)}</span>
                            </div>
                          </td>
                          <td className="text-right py-4 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/barbershop/${location.id}/dashboard`)
                                }}
                                variant="ghost"
                                size="sm"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedLocation(location)
                                }}
                                variant="ghost"
                                size="sm"
                              >
                                <Cog6ToothIcon className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                // Grid View
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAndSortedLocations.map((location) => (
                    <Card 
                      key={location.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedLocation(location)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{location.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{location.address}</p>
                          </div>
                          {getStatusBadge(location.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Performance</span>
                          {getPerformanceBadge(location.performanceScore)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Revenue</p>
                            <p className="font-semibold">${location.revenue.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Growth</p>
                            <p className={`font-semibold ${location.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {location.growth > 0 ? '+' : ''}{location.growth}%
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Team</p>
                            <p className="font-semibold">{location.barbers} barbers</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Rating</p>
                            <div className="flex items-center">
                              <StarIcon className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
                              <span className="font-semibold">{location.rating.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/barbershop/${location.id}/dashboard`)
                            }}
                          >
                            <EyeIcon className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedLocation(location)
                            }}
                          >
                            <Cog6ToothIcon className="w-3 h-3 mr-1" />
                            Manage
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Performance Benchmarking */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Benchmarks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { metric: 'Revenue vs Target', current: 87, target: 100, benchmark: 85, trend: 'up', status: 'good' },
                    { metric: 'Client Retention', current: 82, target: 90, benchmark: 75, trend: 'up', status: 'good' },
                    { metric: 'Team Utilization', current: 73, target: 80, benchmark: 70, trend: 'stable', status: 'needs_improvement' },
                    { metric: 'Average Rating', current: 4.7, target: 4.8, benchmark: 4.5, trend: 'up', status: 'excellent' }
                  ].map((benchmark, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{benchmark.metric}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Current: {benchmark.current}{benchmark.metric.includes('Rating') ? '' : '%'}</span>
                          <span>Target: {benchmark.target}{benchmark.metric.includes('Rating') ? '' : '%'}</span>
                          <span>Benchmark: {benchmark.benchmark}{benchmark.metric.includes('Rating') ? '' : '%'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {benchmark.trend === 'up' ? (
                          <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                        ) : benchmark.trend === 'down' ? (
                          <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                        <Badge className={`${
                          benchmark.status === 'excellent' ? 'bg-green-100 text-green-800' :
                          benchmark.status === 'good' ? 'bg-blue-100 text-blue-800' :
                          benchmark.status === 'needs_improvement' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {benchmark.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Location Comparison Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {enhancedLocations.slice(0, 4).map((location, index) => (
                    <div key={location.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          index === 0 ? 'bg-green-500' : index === 1 ? 'bg-blue-500' : index === 2 ? 'bg-yellow-500' : 'bg-gray-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{location.name}</p>
                          <p className="text-sm text-muted-foreground">Score: {location.performanceScore}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${location.revenue.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{location.growth > 0 ? '+' : ''}{location.growth}% growth</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {/* Business Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Growth Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Expansion Opportunity</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Consider opening a new location in the Northeast district. Market analysis shows 40% less competition and 25% higher income demographics.
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">Service Optimization</h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Premium services show 30% higher profit margins. Consider expanding these offerings at underperforming locations.
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg">
                    <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">Staffing Efficiency</h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      Locations with 4-6 barbers show optimal utilization rates. Consider staff reallocation for better efficiency.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { type: 'warning', title: 'Utilization Drop', message: 'Downtown location utilization down 15% this month', location: 'Downtown Barbershop' },
                    { type: 'success', title: 'Revenue Goal Met', message: 'Uptown location exceeded monthly target by 12%', location: 'Uptown Hair Studio' },
                    { type: 'info', title: 'Review Trend', message: 'Average rating increased 0.3 points across all locations', location: 'All Locations' }
                  ].map((alert, index) => (
                    <div key={index} className={`p-3 border-l-4 rounded-r-lg ${
                      alert.type === 'warning' ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' :
                      alert.type === 'success' ? 'border-green-400 bg-green-50 dark:bg-green-900/20' :
                      'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{alert.title}</h4>
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{alert.location}</p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <EyeIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Location Dialog */}
      <Dialog open={showAddLocationDialog} onOpenChange={setShowAddLocationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
            <DialogDescription>
              Set up a new barbershop location in your enterprise network
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="location-name">Location Name</Label>
                <Input id="location-name" placeholder="Downtown Barbershop" />
              </div>
              <div>
                <Label htmlFor="location-address">Address</Label>
                <Textarea id="location-address" placeholder="123 Main Street, City, State 12345" />
              </div>
              <div>
                <Label htmlFor="location-phone">Phone Number</Label>
                <Input id="location-phone" placeholder="(555) 123-4567" />
              </div>
              <div>
                <Label htmlFor="location-manager">Manager</Label>
                <Input id="location-manager" placeholder="Manager Name" />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="monthly-target">Monthly Revenue Target</Label>
                <Input id="monthly-target" type="number" placeholder="50000" />
              </div>
              <div>
                <Label htmlFor="team-size">Initial Team Size</Label>
                <Input id="team-size" type="number" placeholder="4" />
              </div>
              <div>
                <Label htmlFor="open-hours">Operating Hours</Label>
                <Input id="open-hours" placeholder="9:00 AM - 7:00 PM" />
              </div>
              <div>
                <Label htmlFor="services">Services Offered</Label>
                <Textarea id="services" placeholder="Premium Cuts, Beard Grooming, Hot Towel Shaves..." />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowAddLocationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowAddLocationDialog(false)}>
              Add Location
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Location Detail Dialog */}
      {selectedLocation && (
        <Dialog open={!!selectedLocation} onOpenChange={() => setSelectedLocation(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BuildingStorefrontIcon className="w-5 h-5" />
                {selectedLocation.name}
              </DialogTitle>
              <DialogDescription>
                Detailed performance metrics and management options
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Location Details */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Location Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPinIcon className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm">{selectedLocation.address}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm">{selectedLocation.phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm">{selectedLocation.openHours}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserGroupIcon className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm">Manager: {selectedLocation.manager}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Services</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedLocation.services.map((service, index) => (
                        <Badge key={index} variant="secondary">{service}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Metrics */}
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">${selectedLocation.revenue.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                        <p className={`text-sm ${selectedLocation.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedLocation.growth > 0 ? '+' : ''}{selectedLocation.growth}%
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{selectedLocation.performanceScore}</p>
                        <p className="text-xs text-muted-foreground">Performance Score</p>
                        {getPerformanceBadge(selectedLocation.performanceScore)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{selectedLocation.clientRetention}%</p>
                        <p className="text-xs text-muted-foreground">Client Retention</p>
                        <p className="text-sm text-blue-600">Above average</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">${selectedLocation.averageTicket}</p>
                        <p className="text-xs text-muted-foreground">Average Ticket</p>
                        <p className="text-sm text-green-600">+12% vs avg</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Management Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <Button variant="outline" size="sm" onClick={() => router.push(`/barbershop/${selectedLocation.id}/dashboard`)}>
                        <EyeIcon className="w-4 h-4 mr-2" />
                        View Dashboard
                      </Button>
                      <Button variant="outline" size="sm">
                        <CalendarDaysIcon className="w-4 h-4 mr-2" />
                        Schedule Review
                      </Button>
                      <Button variant="outline" size="sm">
                        <Cog6ToothIcon className="w-4 h-4 mr-2" />
                        Edit Settings
                      </Button>
                      <Button variant="outline" size="sm">
                        <UserGroupIcon className="w-4 h-4 mr-2" />
                        Manage Staff
                      </Button>
                      <Button variant="outline" size="sm">
                        <ChartBarIcon className="w-4 h-4 mr-2" />
                        View Reports
                      </Button>
                      <Button variant="outline" size="sm">
                        <BanknotesIcon className="w-4 h-4 mr-2" />
                        Financial Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}