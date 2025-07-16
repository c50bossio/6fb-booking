'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { getDashboardAnalytics, getEnterpriseAnalytics, getLocationAnalytics, getProfile, type DashboardAnalytics, type LocationPerformance, type EnterpriseAnalytics, type LocationAnalytics, type User } from '@/lib/api'
import { 
  BuildingStorefrontIcon, 
  ChartBarIcon, 
  UserGroupIcon, 
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { useAsyncOperation } from '@/lib/useAsyncOperation'
import { PageLoading, ErrorDisplay } from '@/components/ui/LoadingSystem'
import SnapshotDashboard from '@/components/dashboards/SnapshotDashboard'

interface BarberInfo {
  id: number
  name: string
  revenue: number
  appointments: number
  rating: number
  utilization: number
  compensation_type: 'commission' | 'booth_rental' | 'salary'
  compensation_rate?: number
}

interface ChairInfo {
  id: number
  name: string
  barber?: string
  status: 'occupied' | 'available' | 'maintenance'
  utilization: number
}

interface BarbershopData {
  location: LocationPerformance
  analytics: LocationAnalytics
  barbers: BarberInfo[]
  chairs: ChairInfo[]
  compensation_models: {
    commission_count: number
    booth_rental_count: number
    salary_count: number
    total_compensation_cost: number
  }
}

// Function to get barbershop-specific data
async function getBarbershopData(locationId: string): Promise<BarbershopData> {
  // Fetch location-specific analytics and enterprise data in parallel
  const [locationAnalytics, enterpriseData] = await Promise.all([
    getLocationAnalytics(parseInt(locationId)),
    getEnterpriseAnalytics()
  ])

  // Find the specific location from enterprise data
  const location = enterpriseData.locations.find(loc => loc.id === parseInt(locationId)) || {
    id: parseInt(locationId),
    name: locationAnalytics.location_name || `Location ${locationId}`,
    revenue: locationAnalytics.revenue_summary.total_revenue,
    appointments: locationAnalytics.appointment_summary.total_appointments,
    clients: locationAnalytics.client_summary.total_clients,
    average_rating: 4.7,
    chair_occupancy: Math.round(locationAnalytics.chair_inventory.filter((c: any) => c.status === 'occupied').length / locationAnalytics.chair_inventory.length * 100),
    growth_percentage: locationAnalytics.revenue_summary.revenue_growth
  }

  // Transform barber performance data
  const barbers: BarberInfo[] = locationAnalytics.barber_performance.map((barber: any) => ({
    id: barber.id,
    name: barber.name,
    revenue: barber.revenue,
    appointments: barber.appointments,
    rating: barber.rating,
    utilization: barber.utilization_rate,
    compensation_type: barber.compensation_type as 'commission' | 'booth_rental' | 'salary',
    compensation_rate: barber.compensation_type === 'commission' ? 60 : 
                      barber.compensation_type === 'booth_rental' ? 1500 : 4500
  }))

  // Transform chair inventory data
  const chairs: ChairInfo[] = locationAnalytics.chair_inventory.map((chair: any) => ({
    id: chair.id,
    name: chair.name,
    barber: chair.barber_name,
    status: chair.status,
    utilization: chair.utilization_rate
  }))

  return {
    location,
    analytics: locationAnalytics,
    barbers,
    chairs,
    compensation_models: locationAnalytics.compensation_summary
  }
}

export default function BarbershopDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const locationId = params.id as string
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  
  // Check authentication and permissions
  useEffect(() => {
    async function checkAuth() {
      try {
        const userData = await getProfile()
        if (!userData) {
          router.push('/login')
          return
        }
        
        // Check if user has permission to view this dashboard
        if (userData.role !== 'super_admin' && userData.role !== 'admin') {
          router.push('/dashboard')
          return
        }
        
        setUser(userData)
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/login')
      } finally {
        setAuthLoading(false)
      }
    }
    
    checkAuth()
  }, [router])
  
  const [
    { data: barbershopData, loading, error }, 
    { execute: loadData }
  ] = useAsyncOperation(null)

  // Load barbershop data when auth completes
  useEffect(() => {
    if (!authLoading && user) {
      loadData(() => getBarbershopData(locationId))
    }
  }, [authLoading, user, locationId, loadData])

  // Retry function for error display
  const handleRetry = () => {
    loadData(() => getBarbershopData(locationId))
  }

  if (authLoading || loading) {
    return <PageLoading message="Loading barbershop dashboard..." />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={handleRetry} />
  }

  if (!barbershopData) {
    return <ErrorDisplay error="No data available" />
  }

  const { location, analytics, barbers, chairs, compensation_models } = barbershopData

  // Calculate KPIs for the snapshot dashboard
  const todayStats = {
    appointments: location.appointments,
    revenue: location.revenue,
    newClients: Math.floor(location.clients * 0.15), // Estimate 15% are new
    completionRate: location.chair_occupancy
  }

  // Calculate chair status summary
  const chairStatusSummary = {
    occupied: chairs.filter((c: ChairInfo) => c.status === 'occupied').length,
    available: chairs.filter((c: ChairInfo) => c.status === 'available').length,
    maintenance: chairs.filter((c: ChairInfo) => c.status === 'maintenance').length,
    total: chairs.length
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <button 
            onClick={() => router.push('/enterprise/dashboard')}
            className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            Enterprise
          </button>
          <ChevronRightIcon className="w-4 h-4" />
          <span className="text-gray-900 dark:text-white font-medium">{location.name}</span>
        </nav>

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-4 lg:space-y-0">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <BuildingStorefrontIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              <h1 className="text-ios-largeTitle font-bold text-accent-900 dark:text-white tracking-tight">
                {location.name}
              </h1>
            </div>
            <p className="text-ios-body text-ios-gray-600 dark:text-zinc-300">
              Location performance dashboard and barber management
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button 
              onClick={() => router.push(`/barbershop/${locationId}/settings`)} 
              variant="secondary" 
              size="md"
            >
              Location Settings
            </Button>
            <Button 
              onClick={() => router.push(`/barbershop/${locationId}/barbers/new`)} 
              variant="primary" 
              size="md"
            >
              Add Barber
            </Button>
          </div>
        </div>

        {/* Location Alerts */}
        {location.chair_occupancy < 70 && (
          <Card className="mb-6">
            <CardContent className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-warning-600 flex-shrink-0" />
              <div>
                <p className="text-warning-800 font-medium">Low Chair Utilization</p>
                <p className="text-warning-700 text-sm mt-1">
                  Chair occupancy is at {location.chair_occupancy}%. Consider marketing campaigns or schedule optimization.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Snapshot Dashboard */}
        <div className="mb-8">
          <SnapshotDashboard
            user={{ id: parseInt(locationId), role: 'admin' }}
            todayStats={todayStats}
            timeRange="30d"
          />
        </div>

        {/* Chair Inventory Visualization */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Chair Inventory Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary-600">{chairStatusSummary.occupied}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Occupied</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{chairStatusSummary.available}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Available</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-orange-600">{chairStatusSummary.maintenance}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Maintenance</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{location.chair_occupancy}%</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Utilization</p>
              </div>
            </div>

            {/* Chair Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {chairs.map((chair: ChairInfo) => (
                <div 
                  key={chair.id}
                  className={`p-4 rounded-lg border-2 text-center transition-all ${
                    chair.status === 'occupied' 
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                      : chair.status === 'available'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                  }`}
                >
                  <p className="font-semibold text-sm">{chair.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {chair.barber || chair.status}
                  </p>
                  {chair.utilization > 0 && (
                    <p className="text-xs font-medium mt-2">{chair.utilization}%</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Barber Performance Table */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Barber Performance</CardTitle>
              <Button 
                onClick={() => router.push(`/barbershop/${locationId}/barbers`)}
                variant="ghost"
                size="sm"
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Barber</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Revenue</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Appointments</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Rating</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Utilization</th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Compensation</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {barbers.map((barber: BarberInfo) => (
                    <tr key={barber.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-3 px-4">
                        <button 
                          onClick={() => router.push(`/barbershop/${locationId}/barber/${barber.id}`)}
                          className="font-medium text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          {barber.name}
                        </button>
                      </td>
                      <td className="text-right py-3 px-4">${barber.revenue.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">{barber.appointments}</td>
                      <td className="text-right py-3 px-4">
                        <span className="inline-flex items-center">
                          {barber.rating}
                          <svg className="w-4 h-4 text-yellow-400 ml-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={`font-medium ${
                          barber.utilization >= 80 ? 'text-green-600' : 
                          barber.utilization >= 60 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {barber.utilization}%
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-sm">
                          {barber.compensation_type === 'commission' && `${barber.compensation_rate}% Commission`}
                          {barber.compensation_type === 'booth_rental' && `$${barber.compensation_rate}/mo Booth`}
                          {barber.compensation_type === 'salary' && `$${barber.compensation_rate}/mo Salary`}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <Button
                          onClick={() => router.push(`/barbershop/${locationId}/barber/${barber.id}`)}
                          variant="ghost"
                          size="sm"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Compensation Models Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Compensation Model Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-3xl font-bold text-primary-600">{compensation_models.commission_count}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Commission-Based</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">55-70% of service revenue</p>
              </div>
              <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-3xl font-bold text-purple-600">{compensation_models.booth_rental_count}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Booth Rental</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">$1,200-2,000/month</p>
              </div>
              <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{compensation_models.salary_count}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Salary + Benefits</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">$3,500-5,500/month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}