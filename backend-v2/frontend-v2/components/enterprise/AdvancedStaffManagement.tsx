'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

// Advanced Staff Management Component
// Provides comprehensive staff performance tracking and management tools

interface StaffMember {
  id: string
  name: string
  email: string
  role: 'barber' | 'manager' | 'receptionist'
  avatar?: string
  status: 'active' | 'inactive' | 'on_leave'
  locations: {
    id: number
    name: string
    isPrimary: boolean
  }[]
  performance: {
    revenue: number
    revenueGrowth: number
    appointments: number
    clientRetention: number
    averageRating: number
    efficiency: number
    punctuality: number
    clientSatisfaction: number
  }
  goals: {
    monthlyRevenue: number
    weeklyAppointments: number
    clientRetentionTarget: number
  }
  schedule: {
    hoursWorked: number
    hoursScheduled: number
    utilizationRate: number
  }
  compensation: {
    type: 'commission' | 'hourly' | 'booth_rental'
    rate: number
    totalEarnings: number
    projectedMonthly: number
  }
  lastActive: string
  joinedDate: string
}

interface StaffAnalytics {
  totalStaff: number
  activeStaff: number
  averagePerformance: number
  totalRevenue: number
  averageRetention: number
  topPerformers: StaffMember[]
  underPerformers: StaffMember[]
  recentActivity: {
    newHires: number
    departures: number
    promotions: number
  }
}

interface AdvancedStaffManagementProps {
  organizationId?: number
  locationId?: number
  className?: string
}

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
)

const TrophyIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
  </svg>
)

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const DollarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const StarIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
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

function getPerformanceColor(value: number, threshold: { good: number; warning: number }): string {
  if (value >= threshold.good) return 'text-green-600 dark:text-green-400'
  if (value >= threshold.warning) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</Badge>
    case 'inactive':
      return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">Inactive</Badge>
    case 'on_leave':
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">On Leave</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default function AdvancedStaffManagement({ organizationId, locationId, className }: AdvancedStaffManagementProps) {
  const [staffData, setStaffData] = useState<StaffMember[]>([])
  const [analytics, setAnalytics] = useState<StaffAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterLocation, setFilterLocation] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('performance')
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null)

  useEffect(() => {
    async function loadStaffData() {
      setLoading(true)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock staff data with comprehensive performance metrics
      const mockStaffData: StaffMember[] = [
        {
          id: '1',
          name: 'Marcus Johnson',
          email: 'marcus.j@barbershop.com',
          role: 'barber',
          status: 'active',
          locations: [
            { id: 1, name: 'Downtown Location', isPrimary: true },
            { id: 2, name: 'Uptown Branch', isPrimary: false }
          ],
          performance: {
            revenue: 8500,
            revenueGrowth: 18.5,
            appointments: 127,
            clientRetention: 89,
            averageRating: 4.8,
            efficiency: 92,
            punctuality: 96,
            clientSatisfaction: 94
          },
          goals: {
            monthlyRevenue: 9000,
            weeklyAppointments: 30,
            clientRetentionTarget: 85
          },
          schedule: {
            hoursWorked: 156,
            hoursScheduled: 160,
            utilizationRate: 97.5
          },
          compensation: {
            type: 'commission',
            rate: 60,
            totalEarnings: 5100,
            projectedMonthly: 5250
          },
          lastActive: '2024-07-26T10:30:00Z',
          joinedDate: '2023-03-15'
        },
        {
          id: '2',
          name: 'Sarah Williams',
          email: 'sarah.w@barbershop.com',
          role: 'barber',
          status: 'active',
          locations: [
            { id: 1, name: 'Downtown Location', isPrimary: true }
          ],
          performance: {
            revenue: 7200,
            revenueGrowth: 12.3,
            appointments: 98,
            clientRetention: 85,
            averageRating: 4.6,
            efficiency: 88,
            punctuality: 91,
            clientSatisfaction: 87
          },
          goals: {
            monthlyRevenue: 8000,
            weeklyAppointments: 25,
            clientRetentionTarget: 85
          },
          schedule: {
            hoursWorked: 144,
            hoursScheduled: 160,
            utilizationRate: 90
          },
          compensation: {
            type: 'commission',
            rate: 55,
            totalEarnings: 3960,
            projectedMonthly: 4100
          },
          lastActive: '2024-07-26T09:45:00Z',
          joinedDate: '2023-08-20'
        },
        {
          id: '3',
          name: 'David Chen',
          email: 'david.c@barbershop.com',
          role: 'manager',
          status: 'active',
          locations: [
            { id: 1, name: 'Downtown Location', isPrimary: true },
            { id: 2, name: 'Uptown Branch', isPrimary: false }
          ],
          performance: {
            revenue: 5800,
            revenueGrowth: 8.7,
            appointments: 0, // Manager doesn't take appointments
            clientRetention: 0,
            averageRating: 4.5,
            efficiency: 95, // Management efficiency
            punctuality: 98,
            clientSatisfaction: 92
          },
          goals: {
            monthlyRevenue: 0,
            weeklyAppointments: 0,
            clientRetentionTarget: 0
          },
          schedule: {
            hoursWorked: 168,
            hoursScheduled: 160,
            utilizationRate: 105 // Overtime
          },
          compensation: {
            type: 'hourly',
            rate: 35,
            totalEarnings: 5880,
            projectedMonthly: 5600
          },
          lastActive: '2024-07-26T11:15:00Z',
          joinedDate: '2022-11-10'
        },
        {
          id: '4',
          name: 'Emily Rodriguez',
          email: 'emily.r@barbershop.com',
          role: 'barber',
          status: 'active',
          locations: [
            { id: 2, name: 'Uptown Branch', isPrimary: true }
          ],
          performance: {
            revenue: 6800,
            revenueGrowth: 15.2,
            appointments: 89,
            clientRetention: 82,
            averageRating: 4.7,
            efficiency: 85,
            punctuality: 88,
            clientSatisfaction: 89
          },
          goals: {
            monthlyRevenue: 7500,
            weeklyAppointments: 22,
            clientRetentionTarget: 85
          },
          schedule: {
            hoursWorked: 128,
            hoursScheduled: 140,
            utilizationRate: 91.4
          },
          compensation: {
            type: 'booth_rental',
            rate: 1200,
            totalEarnings: 5600,
            projectedMonthly: 5800
          },
          lastActive: '2024-07-26T08:20:00Z',
          joinedDate: '2024-01-08'
        }
      ]
      
      const mockAnalytics: StaffAnalytics = {
        totalStaff: 4,
        activeStaff: 4,
        averagePerformance: 90,
        totalRevenue: 28300,
        averageRetention: 85.5,
        topPerformers: mockStaffData.slice(0, 2),
        underPerformers: [],
        recentActivity: {
          newHires: 1,
          departures: 0,
          promotions: 0
        }
      }
      
      setStaffData(mockStaffData)
      setAnalytics(mockAnalytics)
      setLoading(false)
    }
    
    loadStaffData()
  }, [organizationId, locationId])

  const filteredStaff = staffData.filter(staff => {
    if (filterRole !== 'all' && staff.role !== filterRole) return false
    if (filterLocation !== 'all' && !staff.locations.some(loc => loc.id.toString() === filterLocation)) return false
    return true
  })

  const sortedStaff = [...filteredStaff].sort((a, b) => {
    switch (sortBy) {
      case 'performance':
        return b.performance.efficiency - a.performance.efficiency
      case 'revenue':
        return b.performance.revenue - a.performance.revenue
      case 'rating':
        return b.performance.averageRating - a.performance.averageRating
      case 'name':
        return a.name.localeCompare(b.name)
      default:
        return 0
    }
  })

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UsersIcon />
            <span>Advanced Staff Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* Staff Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{analytics?.totalStaff}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Staff</p>
              </div>
              <UsersIcon />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(analytics?.totalRevenue || 0)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
              </div>
              <DollarIcon />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{formatPercentage(analytics?.averagePerformance || 0)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Performance</p>
              </div>
              <ChartIcon />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">{formatPercentage(analytics?.averageRetention || 0)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Client Retention</p>
              </div>
              <TrophyIcon />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <Select
                value={filterRole}
                onChange={(value) => setFilterRole(value as string)}
                className="w-32"
                options={[
                  { value: "all", label: "All Roles" },
                  { value: "barber", label: "Barbers" },
                  { value: "manager", label: "Managers" },
                  { value: "receptionist", label: "Reception" }
                ]}
              />
              
              <Select
                value={sortBy}
                onChange={(value) => setSortBy(value as string)}
                className="w-36"
                options={[
                  { value: "performance", label: "Performance" },
                  { value: "revenue", label: "Revenue" },
                  { value: "rating", label: "Rating" },
                  { value: "name", label: "Name" }
                ]}
              />
              
              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  Table
                </Button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Export Report
              </Button>
              <Button size="sm">
                Add Staff Member
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Performance Dashboard</CardTitle>
          <CardDescription>
            Comprehensive view of staff performance with Six Figure Barber methodology metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedStaff.map((staff) => (
                <Card key={staff.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {staff.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h3 className="font-semibold">{staff.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{staff.role}</p>
                        </div>
                      </div>
                      {getStatusBadge(staff.status)}
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Revenue</span>
                        <span className="font-semibold">{formatCurrency(staff.performance.revenue)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Performance</span>
                        <span className={`font-semibold ${getPerformanceColor(staff.performance.efficiency, { good: 90, warning: 75 })}`}>
                          {formatPercentage(staff.performance.efficiency)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Rating</span>
                        <div className="flex items-center space-x-1">
                          <StarIcon />
                          <span className="font-semibold">{staff.performance.averageRating}</span>
                        </div>
                      </div>
                      
                      {staff.role === 'barber' && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Retention</span>
                          <span className={`font-semibold ${getPerformanceColor(staff.performance.clientRetention, { good: 85, warning: 70 })}`}>
                            {formatPercentage(staff.performance.clientRetention)}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Utilization</span>
                        <span className={`font-semibold ${getPerformanceColor(staff.schedule.utilizationRate, { good: 90, warning: 75 })}`}>
                          {formatPercentage(staff.schedule.utilizationRate)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          View Details
                        </Button>
                        <Button size="sm" variant="ghost">
                          Schedule
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4">Staff Member</th>
                    <th className="text-right py-3 px-4">Revenue</th>
                    <th className="text-right py-3 px-4">Performance</th>
                    <th className="text-right py-3 px-4">Rating</th>
                    <th className="text-right py-3 px-4">Retention</th>
                    <th className="text-right py-3 px-4">Utilization</th>
                    <th className="text-right py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStaff.map((staff) => (
                    <tr key={staff.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {staff.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-medium">{staff.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{staff.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-4 px-4 font-medium">
                        {formatCurrency(staff.performance.revenue)}
                      </td>
                      <td className="text-right py-4 px-4">
                        <span className={getPerformanceColor(staff.performance.efficiency, { good: 90, warning: 75 })}>
                          {formatPercentage(staff.performance.efficiency)}
                        </span>
                      </td>
                      <td className="text-right py-4 px-4">
                        <div className="flex items-center justify-end space-x-1">
                          <StarIcon />
                          <span>{staff.performance.averageRating}</span>
                        </div>
                      </td>
                      <td className="text-right py-4 px-4">
                        {staff.role === 'barber' ? (
                          <span className={getPerformanceColor(staff.performance.clientRetention, { good: 85, warning: 70 })}>
                            {formatPercentage(staff.performance.clientRetention)}
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="text-right py-4 px-4">
                        <span className={getPerformanceColor(staff.schedule.utilizationRate, { good: 90, warning: 75 })}>
                          {formatPercentage(staff.schedule.utilizationRate)}
                        </span>
                      </td>
                      <td className="text-right py-4 px-4">
                        {getStatusBadge(staff.status)}
                      </td>
                      <td className="text-right py-4 px-4">
                        <div className="flex justify-end space-x-2">
                          <Button size="sm" variant="ghost">
                            Edit
                          </Button>
                          <Button size="sm" variant="outline">
                            Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}