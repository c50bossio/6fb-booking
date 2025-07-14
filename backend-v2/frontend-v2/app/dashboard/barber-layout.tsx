'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { QuickActions } from '@/components/QuickActions'
import SixFigureAnalyticsDashboard from '@/components/analytics/SixFigureAnalyticsDashboard'

interface BarberDashboardLayoutProps {
  user: { 
    id: number
    name: string
    role: string
  }
  todayStats: { 
    appointments: number
    revenue: number
    newClients: number
    completionRate: number
  }
  upcomingAppointments: any[]
}

// Simple Icon Components
const CalendarIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const DollarIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
)

const UserPlusIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
  </svg>
)

const CheckCircleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const ClockIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

export default function BarberDashboardLayout({ 
  user, 
  todayStats, 
  upcomingAppointments 
}: BarberDashboardLayoutProps) {
  // Get next appointment
  const nextAppointment = upcomingAppointments?.[0]

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format percentage
  const formatPercentage = (rate: number) => {
    return `${Math.round(rate * 100)}%`
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-ios-largeTitle font-bold text-accent-900 tracking-tight">
          Barber Dashboard
        </h1>
        <p className="text-ios-body text-ios-gray-600">
          Welcome back, {user.name}. Here's your performance overview.
        </p>
      </div>

      {/* Today's Overview - 4-card metrics bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Appointments */}
        <Card 
          variant="outlined" 
          className="backdrop-blur-2xl bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-900/80 dark:to-gray-800/60 border-white/20 dark:border-white/10"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Today's Appointments
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {todayStats.appointments}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-primary-500/10 to-primary-600/10 dark:from-primary-400/20 dark:to-primary-500/20 rounded-xl">
                <CalendarIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card 
          variant="outlined" 
          className="backdrop-blur-2xl bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-900/80 dark:to-gray-800/60 border-white/20 dark:border-white/10"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Today's Revenue
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(todayStats.revenue)}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-green-500/10 to-green-600/10 dark:from-green-400/20 dark:to-green-500/20 rounded-xl">
                <DollarIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New Clients */}
        <Card 
          variant="outlined" 
          className="backdrop-blur-2xl bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-900/80 dark:to-gray-800/60 border-white/20 dark:border-white/10"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  New Clients
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {todayStats.newClients}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-blue-500/10 to-blue-600/10 dark:from-blue-400/20 dark:to-blue-500/20 rounded-xl">
                <UserPlusIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card 
          variant="outlined" 
          className="backdrop-blur-2xl bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-900/80 dark:to-gray-800/60 border-white/20 dark:border-white/10"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Completion Rate
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatPercentage(todayStats.completionRate)}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 dark:from-emerald-400/20 dark:to-emerald-500/20 rounded-xl">
                <CheckCircleIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Appointment Card */}
      {nextAppointment && (
        <Card 
          variant="outlined" 
          className="backdrop-blur-2xl bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-900/80 dark:to-gray-800/60 border-white/20 dark:border-white/10"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <ClockIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Next Appointment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {nextAppointment.service_name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {nextAppointment.client_name}
                </p>
                <p className="text-sm text-primary-600 dark:text-primary-400">
                  {new Date(nextAppointment.start_time).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(nextAppointment.price)}
                </p>
                <p className={`text-sm font-medium ${
                  nextAppointment.status === 'confirmed' ? 'text-green-600' : 
                  nextAppointment.status === 'pending' ? 'text-yellow-600' : 
                  'text-gray-600'
                }`}>
                  {nextAppointment.status?.charAt(0).toUpperCase() + nextAppointment.status?.slice(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions - Use existing component */}
      <QuickActions userRole={user.role} />

      {/* 6FB Analytics - Use consolidated component */}
      <SixFigureAnalyticsDashboard
        userId={user.id} 
        timeRange="30d"
        userName={user.name}
        todayStats={todayStats}
      />
    </div>
  )
}