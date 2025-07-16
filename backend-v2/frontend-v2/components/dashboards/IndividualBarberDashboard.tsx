'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingStates } from '@/components/ui/LoadingSystem'
import { type UserWithRole } from '@/lib/roleUtils'

// Icons
const TrendingUpIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
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

const TargetIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

// Types for individual barber business data
interface BusinessMetrics {
  monthlyRevenue: number
  monthlyGoal: number
  totalClients: number
  newClientsThisMonth: number
  retentionRate: number
  averageTicket: number
  appointmentsThisMonth: number
  utilizationRate: number
}

interface TodaySchedule {
  totalAppointments: number
  completedAppointments: number
  revenue: number
  nextAppointment?: {
    id: number
    clientName: string
    serviceName: string
    startTime: string
    duration: number
  }
}

interface Goal {
  id: string
  title: string
  target: number
  current: number
  unit: string
  deadline: string
  category: 'revenue' | 'clients' | 'appointments'
}

interface IndividualBarberData {
  businessMetrics: BusinessMetrics
  todaySchedule: TodaySchedule
  goals: Goal[]
  recentClients: Array<{
    id: number
    name: string
    lastVisit: string
    totalSpent: number
    visits: number
  }>
}

interface IndividualBarberDashboardProps {
  user: UserWithRole & {
    email: string
    name: string
  }
  className?: string
}

export function IndividualBarberDashboard({ user, className = '' }: IndividualBarberDashboardProps) {
  const router = useRouter()
  const [data, setData] = useState<IndividualBarberData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBarberData() {
      try {
        setLoading(true)
        // This will be implemented when we create the dashboard API
        // const response = await getIndividualBarberData(user.id)
        
        // Mock data for now
        const mockData: IndividualBarberData = {
          businessMetrics: {
            monthlyRevenue: 8750,
            monthlyGoal: 10000,
            totalClients: 125,
            newClientsThisMonth: 12,
            retentionRate: 78,
            averageTicket: 45,
            appointmentsThisMonth: 194,
            utilizationRate: 87
          },
          todaySchedule: {
            totalAppointments: 8,
            completedAppointments: 5,
            revenue: 360,
            nextAppointment: {
              id: 1,
              clientName: "John Davis",
              serviceName: "Haircut & Beard Trim",
              startTime: "2025-07-15T15:30:00Z",
              duration: 45
            }
          },
          goals: [
            {
              id: "1",
              title: "Monthly Revenue Goal",
              target: 10000,
              current: 8750,
              unit: "$",
              deadline: "2025-07-31",
              category: "revenue"
            },
            {
              id: "2", 
              title: "New Clients This Month",
              target: 15,
              current: 12,
              unit: "clients",
              deadline: "2025-07-31",
              category: "clients"
            }
          ],
          recentClients: [
            {
              id: 1,
              name: "Michael Brown",
              lastVisit: "2025-07-14T10:00:00Z",
              totalSpent: 450,
              visits: 10
            },
            {
              id: 2,
              name: "Sarah Wilson",
              lastVisit: "2025-07-13T14:30:00Z", 
              totalSpent: 320,
              visits: 8
            }
          ]
        }
        
        setData(mockData)
      } catch (err) {
        setError('Failed to load your business data')
        console.error('Error fetching barber data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBarberData()
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

  const getGoalProgress = (goal: Goal) => {
    return Math.min(100, (goal.current / goal.target) * 100)
  }

  const getSixFigureScore = () => {
    if (!data) return 0
    const { businessMetrics } = data
    
    // Simplified 6FB score calculation
    const revenueScore = Math.min(100, (businessMetrics.monthlyRevenue / businessMetrics.monthlyGoal) * 100)
    const utilizationScore = businessMetrics.utilizationRate
    const retentionScore = businessMetrics.retentionRate
    
    return Math.round((revenueScore + utilizationScore + retentionScore) / 3)
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <LoadingStates.CardSkeleton />
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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Unable to load business data</h2>
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
              Business Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Welcome back, {user.first_name || user.name}. Here's your business overview.
            </p>
          </div>
          
          <div className="flex items-center gap-4 mt-4 lg:mt-0">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{getSixFigureScore()}</div>
              <div className="text-xs text-gray-500">6FB Score</div>
            </div>
            <Button 
              onClick={() => router.push('/settings/business')}
              variant="outline"
              leftIcon={<SettingsIcon />}
            >
              Business Settings
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
                      {formatCurrency(data?.businessMetrics.monthlyRevenue || 0)}
                    </p>
                    <p className="text-sm text-gray-500">
                      of {formatCurrency(data?.businessMetrics.monthlyGoal || 0)}
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${((data?.businessMetrics.monthlyRevenue || 0) / (data?.businessMetrics.monthlyGoal || 1)) * 100}%` }}
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
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Clients</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {data?.businessMetrics.totalClients || 0}
                  </p>
                  <p className="text-sm text-green-600">
                    +{data?.businessMetrics.newClientsThisMonth || 0} this month
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
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Average Ticket</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(data?.businessMetrics.averageTicket || 0)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {data?.businessMetrics.appointmentsThisMonth || 0} appointments
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
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Booking Rate</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {data?.businessMetrics.utilizationRate || 0}%
                  </p>
                  <p className="text-sm text-gray-500">
                    Retention: {data?.businessMetrics.retentionRate || 0}%
                  </p>
                </div>
                <TargetIcon />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Today's Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon />
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{data?.todaySchedule.completedAppointments || 0}</div>
                    <div className="text-xs text-blue-600">Completed</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(data?.todaySchedule.revenue || 0)}</div>
                    <div className="text-xs text-green-600">Revenue</div>
                  </div>
                </div>

                {data?.todaySchedule.nextAppointment ? (
                  <div className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Next Appointment</h4>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{data.todaySchedule.nextAppointment.clientName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{data.todaySchedule.nextAppointment.serviceName}</p>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <ClockIcon />
                        {formatTime(data.todaySchedule.nextAppointment.startTime)} ({data.todaySchedule.nextAppointment.duration}min)
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No more appointments today
                  </div>
                )}

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push('/calendar')}
                  rightIcon={<ArrowRightIcon />}
                >
                  View Full Schedule
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Business Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TargetIcon />
                Business Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.goals.map((goal) => (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">{goal.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(getGoalProgress(goal))}%
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">
                        {goal.unit === '$' ? formatCurrency(goal.current) : `${goal.current} ${goal.unit}`}
                      </span>
                      <span className="text-gray-500">
                        {goal.unit === '$' ? formatCurrency(goal.target) : `${goal.target} ${goal.unit}`}
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getGoalProgress(goal) >= 100 ? 'bg-green-600' : 'bg-blue-600'}`}
                        style={{ width: `${getGoalProgress(goal)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => router.push('/goals')}
                  rightIcon={<ArrowRightIcon />}
                >
                  Manage Goals
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Clients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon />
                Recent Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.recentClients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{client.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {client.visits} visits • {formatCurrency(client.totalSpent)} total
                      </p>
                      <p className="text-xs text-gray-500">
                        Last visit: {new Date(client.lastVisit).toLocaleDateString()}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      View
                    </Button>
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => router.push('/clients')}
                  rightIcon={<ArrowRightIcon />}
                >
                  View All Clients
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="flex flex-col h-20 gap-2"
                onClick={() => router.push('/appointments/create')}
              >
                <CalendarIcon />
                <span className="text-xs">New Appointment</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex flex-col h-20 gap-2"
                onClick={() => router.push('/clients')}
              >
                <UsersIcon />
                <span className="text-xs">Manage Clients</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex flex-col h-20 gap-2"
                onClick={() => router.push('/analytics')}
              >
                <TrendingUpIcon />
                <span className="text-xs">View Analytics</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="flex flex-col h-20 gap-2"
                onClick={() => router.push('/settings')}
              >
                <SettingsIcon />
                <span className="text-xs">Settings</span>
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}