'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingStates } from '@/components/ui/LoadingSystem'
import { type UserWithRole } from '@/lib/roleUtils'

// Icons
const StoreIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)

const DollarSignIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
)

const TrendingUpIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const StarIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

// Types for shop owner data
interface ShopMetrics {
  monthlyRevenue: number
  monthlyGoal: number
  dailyRevenue: number
  totalStaff: number
  activeBarbers: number
  totalClients: number
  newClientsThisMonth: number
  appointmentsToday: number
  utilizationRate: number
  customerSatisfaction: number
}

interface StaffMember {
  id: number
  name: string
  role: string
  todayAppointments: number
  todayRevenue: number
  utilizationRate: number
  rating: number
  status: 'active' | 'off' | 'break'
}

interface RecentBooking {
  id: number
  clientName: string
  barberName: string
  serviceName: string
  startTime: string
  revenue: number
  status: 'scheduled' | 'completed' | 'cancelled'
}

interface ShopOwnerData {
  shopMetrics: ShopMetrics
  staffMembers: StaffMember[]
  recentBookings: RecentBooking[]
  topServices: Array<{
    name: string
    bookings: number
    revenue: number
  }>
}

interface ShopOwnerDashboardProps {
  user: UserWithRole & {
    email: string
    name: string
  }
  className?: string
}

export function ShopOwnerDashboard({ user, className = '' }: ShopOwnerDashboardProps) {
  const router = useRouter()
  const [data, setData] = useState<ShopOwnerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchShopData() {
      try {
        setLoading(true)
        // This will be implemented when we create the dashboard API
        // const response = await getShopOwnerData(user.id)
        
        // Mock data for now
        const mockData: ShopOwnerData = {
          shopMetrics: {
            monthlyRevenue: 28500,
            monthlyGoal: 35000,
            dailyRevenue: 1450,
            totalStaff: 6,
            activeBarbers: 4,
            totalClients: 324,
            newClientsThisMonth: 28,
            appointmentsToday: 22,
            utilizationRate: 84,
            customerSatisfaction: 4.7
          },
          staffMembers: [
            {
              id: 1,
              name: "Mike Johnson",
              role: "Senior Barber",
              todayAppointments: 8,
              todayRevenue: 420,
              utilizationRate: 95,
              rating: 4.9,
              status: "active"
            },
            {
              id: 2,
              name: "Sarah Davis",
              role: "Barber",
              todayAppointments: 6,
              todayRevenue: 315,
              utilizationRate: 78,
              rating: 4.6,
              status: "active"
            },
            {
              id: 3,
              name: "Carlos Rodriguez",
              role: "Junior Barber",
              todayAppointments: 5,
              todayRevenue: 210,
              utilizationRate: 65,
              rating: 4.3,
              status: "break"
            },
            {
              id: 4,
              name: "Lisa Chen",
              role: "Barber",
              todayAppointments: 3,
              todayRevenue: 180,
              utilizationRate: 45,
              rating: 4.5,
              status: "off"
            }
          ],
          recentBookings: [
            {
              id: 1,
              clientName: "John Smith",
              barberName: "Mike Johnson",
              serviceName: "Premium Haircut",
              startTime: "2025-07-15T14:30:00Z",
              revenue: 65,
              status: "completed"
            },
            {
              id: 2,
              clientName: "David Wilson",
              barberName: "Sarah Davis",
              serviceName: "Haircut & Beard",
              startTime: "2025-07-15T15:00:00Z",
              revenue: 55,
              status: "scheduled"
            }
          ],
          topServices: [
            { name: "Classic Haircut", bookings: 145, revenue: 5800 },
            { name: "Haircut & Beard", bookings: 89, revenue: 4895 },
            { name: "Premium Cut", bookings: 67, revenue: 4355 }
          ]
        }
        
        setData(mockData)
      } catch (err) {
        setError('Failed to load shop data')
        console.error('Error fetching shop data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchShopData()
  }, [user.id])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
      case 'break':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Break</Badge>
      case 'off':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Off</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Unable to load shop data</h2>
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
              Shop Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Welcome back, {user.first_name || user.name}. Here's your shop overview.
            </p>
          </div>
          
          <div className="flex items-center gap-4 mt-4 lg:mt-0">
            <div className="text-center">
              <div className="flex items-center gap-1">
                <StarIcon />
                <span className="text-2xl font-bold text-yellow-600">{data?.shopMetrics.customerSatisfaction}</span>
              </div>
              <div className="text-xs text-gray-500">Customer Rating</div>
            </div>
            <Button 
              onClick={() => router.push('/settings/shop')}
              variant="outline"
              leftIcon={<SettingsIcon />}
            >
              Shop Settings
            </Button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Monthly Revenue</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(data?.shopMetrics.monthlyRevenue || 0)}
                    </p>
                  </div>
                  <p className="text-sm text-gray-500">
                    Goal: {formatCurrency(data?.shopMetrics.monthlyGoal || 0)}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${((data?.shopMetrics.monthlyRevenue || 0) / (data?.shopMetrics.monthlyGoal || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <DollarSignIcon />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Today's Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(data?.shopMetrics.dailyRevenue || 0)}
                  </p>
                  <p className="text-sm text-blue-600">
                    {data?.shopMetrics.appointmentsToday || 0} appointments today
                  </p>
                </div>
                <TrendingUpIcon />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Staff</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {data?.shopMetrics.activeBarbers || 0}/{data?.shopMetrics.totalStaff || 0}
                  </p>
                  <p className="text-sm text-green-600">
                    Active barbers today
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
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Shop Booking Rate</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {data?.shopMetrics.utilizationRate || 0}%
                  </p>
                  <p className="text-sm text-gray-500">
                    {data?.shopMetrics.totalClients || 0} total clients
                  </p>
                </div>
                <StoreIcon />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          
          {/* Staff Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon />
                Staff Performance Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.staffMembers.map((staff) => (
                  <div key={staff.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{staff.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{staff.role}</p>
                        </div>
                        {getStatusBadge(staff.status)}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                        <div>
                          <span className="text-gray-500">Appointments: </span>
                          <span className="font-medium">{staff.todayAppointments}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Revenue: </span>
                          <span className="font-medium">{formatCurrency(staff.todayRevenue)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Booking Rate: </span>
                          <span className="font-medium">{staff.utilizationRate}%</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 mt-1">
                        <StarIcon />
                        <span className="text-sm font-medium">{staff.rating}</span>
                        <span className="text-sm text-gray-500">rating</span>
                      </div>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => router.push(`/staff/${staff.id}`)}
                    >
                      View
                    </Button>
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => router.push('/staff')}
                  rightIcon={<ArrowRightIcon />}
                >
                  Manage All Staff
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Bookings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon />
                Recent Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">{booking.clientName}</h4>
                      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                        <p>Service: {booking.serviceName}</p>
                        <p>Barber: {booking.barberName}</p>
                        <div className="flex items-center gap-1">
                          <ClockIcon />
                          {formatTime(booking.startTime)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(booking.revenue)}</p>
                      <Badge 
                        variant={booking.status === 'completed' ? 'default' : 'secondary'}
                        className={booking.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => router.push('/bookings')}
                  rightIcon={<ArrowRightIcon />}
                >
                  View All Bookings
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Top Services */}
          <Card>
            <CardHeader>
              <CardTitle>Top Services This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.topServices.map((service, index) => (
                  <div key={service.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{service.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{service.bookings} bookings</p>
                      </div>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(service.revenue)}</p>
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => router.push('/services')}
                  rightIcon={<ArrowRightIcon />}
                >
                  Manage Services
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="flex flex-col h-20 gap-2"
                  onClick={() => router.push('/staff/invite')}
                >
                  <UsersIcon />
                  <span className="text-xs">Add Staff</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex flex-col h-20 gap-2"
                  onClick={() => router.push('/analytics/shop')}
                >
                  <TrendingUpIcon />
                  <span className="text-xs">View Analytics</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex flex-col h-20 gap-2"
                  onClick={() => router.push('/calendar')}
                >
                  <CalendarIcon />
                  <span className="text-xs">Schedule</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex flex-col h-20 gap-2"
                  onClick={() => router.push('/settings/shop')}
                >
                  <SettingsIcon />
                  <span className="text-xs">Shop Settings</span>
                </Button>
              </div>
              
              <div className="mt-4 space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/reports/financial')}
                >
                  <DollarSignIcon />
                  <span className="ml-2">Financial Reports</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => router.push('/marketing')}
                >
                  <TrendingUpIcon />
                  <span className="ml-2">Marketing Tools</span>
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  )
}