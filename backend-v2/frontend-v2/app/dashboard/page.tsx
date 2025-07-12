'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { AccessibleButton } from '@/lib/accessibility-helpers'
import { QuickActions } from '@/components/QuickActions'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { 
  CalendarDaysIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CogIcon
} from '@heroicons/react/24/outline'

// Mock data - in a real app this would come from your backend
const mockData = {
  todayStats: {
    appointments: 8,
    revenue: 420,
    noShows: 1,
    completed: 6
  },
  weekStats: {
    appointments: 45,
    revenue: 2340,
    newClients: 7,
    retention: 85
  },
  upcomingAppointments: [
    {
      id: 1,
      clientName: 'John Smith',
      service: 'Haircut + Beard',
      time: '2:00 PM',
      status: 'confirmed'
    },
    {
      id: 2,
      clientName: 'Mike Johnson',
      service: 'Classic Cut',
      time: '3:30 PM',
      status: 'pending'
    },
    {
      id: 3,
      clientName: 'David Wilson',
      service: 'Beard Trim',
      time: '4:00 PM',
      status: 'confirmed'
    }
  ]
}

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-50'
      case 'pending':
        return 'text-yellow-600 bg-yellow-50'
      case 'cancelled':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">
                Welcome back! Here's what's happening today.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Current Time</div>
                <div className="font-medium text-gray-900">
                  {currentTime.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </div>
              </div>
              <ThemeToggle />
              <Link href="/book">
                <AccessibleButton variant="primary">
                  New Appointment
                </AccessibleButton>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <QuickActions />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Today's Appointments */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today's Appointments</p>
                  <p className="text-2xl font-bold text-foreground">{mockData.todayStats.appointments}</p>
                </div>
                <CalendarDaysIcon className="w-8 h-8 text-blue-500" />
              </div>
            </CardHeader>
          </Card>

          {/* Today's Revenue */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today's Revenue</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(mockData.todayStats.revenue)}</p>
                </div>
                <CurrencyDollarIcon className="w-8 h-8 text-green-500" />
              </div>
            </CardHeader>
          </Card>

          {/* Completed Today */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed Today</p>
                  <p className="text-2xl font-bold text-foreground">{mockData.todayStats.completed}</p>
                </div>
                <CheckCircleIcon className="w-8 h-8 text-purple-500" />
              </div>
            </CardHeader>
          </Card>

          {/* Week Revenue */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">This Week</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(mockData.weekStats.revenue)}</p>
                </div>
                <ChartBarIcon className="w-8 h-8 text-yellow-500" />
              </div>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Appointments */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-foreground">Upcoming Appointments</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockData.upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <ClockIcon className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-foreground">{appointment.clientName}</p>
                          <p className="text-sm text-muted-foreground">{appointment.service}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{appointment.time}</p>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(appointment.status)}`}>
                        {appointment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Link href="/calendar">
                  <AccessibleButton variant="secondary" className="w-full">
                    View Full Calendar
                  </AccessibleButton>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Six Figure Barber Metrics */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-foreground">Six Figure Progress</h3>
              <p className="text-sm text-muted-foreground">Track your journey to six figures</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Revenue Target */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Monthly Revenue Target</span>
                    <span className="text-sm text-gray-900">$8,333</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '28%' }}></div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">$2,340 this month</span>
                    <span className="text-xs text-gray-500">28% complete</span>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{mockData.weekStats.retention}%</p>
                    <p className="text-xs text-gray-600">Client Retention</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{mockData.weekStats.newClients}</p>
                    <p className="text-xs text-gray-600">New Clients</p>
                  </div>
                </div>

                <Link href="/analytics">
                  <AccessibleButton variant="secondary" className="w-full">
                    View Detailed Analytics
                  </AccessibleButton>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Links */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/calendar" className="p-4 bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow border border-border">
            <div className="text-center">
              <CalendarDaysIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="font-medium text-foreground">Calendar</p>
              <p className="text-sm text-muted-foreground">Manage schedule</p>
            </div>
          </Link>

          <Link href="/clients" className="p-4 bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow border border-border">
            <div className="text-center">
              <UserGroupIcon className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="font-medium text-foreground">Clients</p>
              <p className="text-sm text-muted-foreground">Client management</p>
            </div>
          </Link>

          <Link href="/analytics" className="p-4 bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow border border-border">
            <div className="text-center">
              <ChartBarIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="font-medium text-foreground">Analytics</p>
              <p className="text-sm text-muted-foreground">Business insights</p>
            </div>
          </Link>

          <Link href="/settings" className="p-4 bg-card rounded-lg shadow-sm hover:shadow-md transition-shadow border border-border">
            <div className="text-center">
              <CogIcon className="w-8 h-8 text-gray-500 mx-auto mb-2" />
              <p className="font-medium text-foreground">Settings</p>
              <p className="text-sm text-muted-foreground">Configuration</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}