'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getProfile, logout, getMyBookings, getClientDashboardMetrics, getDashboardAnalytics, type User, type DashboardAnalytics } from '@/lib/api'
import { handleAuthError } from '@/lib/auth-error-handler'
import { batchDashboardData } from '@/lib/requestBatcher'
import { getDefaultDashboard } from '@/lib/routeGuards'
import TimezoneSetupModal from '@/components/TimezoneSetupModal'
import { BarberDashboardLayout } from '@/components/BarberDashboardLayout'
import { useAsyncOperation } from '@/lib/useAsyncOperation'
import { PageLoading, ErrorDisplay, SuccessMessage } from '@/components/LoadingStates'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { QuickActions } from '@/components/QuickActions'
import CalendarDayMini from '@/components/calendar/CalendarDayMini'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { TrialStatusBanner } from '@/components/ui/TrialStatusBanner'
import { TrialWarningSystem } from '@/components/ui/TrialWarningSystem'
import { ErrorBoundary } from '@/components/error-boundaries'

// Simple Icon Components
const BookIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z" />
  </svg>
)

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

export default function ComplexDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState([])
  const [clientMetrics, setClientMetrics] = useState(null)
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showTimezoneModal, setShowTimezoneModal] = useState(false)
  const [showTimezoneWarning, setShowTimezoneWarning] = useState(false)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        
        // First get user profile
        const userData = await getProfile()
        setUser(userData)

        // Check if timezone is configured and warn if not
        if (!userData.timezone || userData.timezone === 'UTC') {
          setShowTimezoneWarning(true)
        }

        // Batch load other data
        const bookingsPromise = getMyBookings()
        
        const [bookingsResult] = await Promise.allSettled([bookingsPromise])
        
        if (bookingsResult.status === 'fulfilled') {
          setBookings(bookingsResult.value || [])
        } else {
          console.warn('Failed to load bookings:', bookingsResult.reason)
          setBookings([])
        }

        if (userData.role === 'admin' || userData.role === 'barber' || userData.role === 'platform_admin') {
          const [metricsResult, analyticsResult] = await Promise.allSettled([
            getClientDashboardMetrics(),
            getDashboardAnalytics(userData.id)
          ])
          
          if (metricsResult.status === 'fulfilled') {
            setClientMetrics(metricsResult.value)
          } else {
            console.warn('Failed to load client metrics:', metricsResult.reason)
            setClientMetrics(null)
          }
          
          if (analyticsResult.status === 'fulfilled') {
            setAnalytics(analyticsResult.value)
          } else {
            console.warn('Failed to load analytics:', analyticsResult.reason)
            setAnalytics(null)
          }
        }
      } catch (error) {
        console.error('Dashboard: Failed to load data:', error)
        
        if (handleAuthError(error, router)) {
          setUser(null)
          setBookings([])
          setClientMetrics(null)
          setAnalytics(null)
          return
        }
        
        console.warn('Dashboard data loading failed, but user remains authenticated')
        setBookings([])
        setClientMetrics(null)
        setAnalytics(null)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()

    if (searchParams.get('booking') === 'success') {
      setShowSuccess(true)
    }
  }, [router, searchParams])

  if (loading) {
    return <DashboardSkeleton />
  }

  if (!user) {
    return <PageLoading message="Loading dashboard..." />
  }

  // Show timezone setup modal if needed
  if (showTimezoneModal) {
    return (
      <TimezoneSetupModal
        isOpen={showTimezoneModal}
        onClose={() => setShowTimezoneModal(false)}
        onComplete={() => {
          setShowTimezoneModal(false)
          setShowTimezoneWarning(false)
          window.location.reload()
        }}
      />
    )
  }

  // Render specialized barber dashboard layout
  if (user?.role === 'barber' || user?.role === 'admin' || user?.role === 'platform_admin') {
    // Calculate completion rate from analytics data
    const completionRate = analytics?.appointment_summary ? 
      Math.round(100 - (analytics.appointment_summary.cancellation_rate + analytics.appointment_summary.no_show_rate)) : 95
    
    const todayStats = {
      appointments: analytics?.appointment_summary?.total_appointments || 0,
      revenue: analytics?.revenue_summary?.total_revenue || 0,
      newClients: analytics?.client_summary?.new_clients || 0,
      completionRate
    }

    const upcomingAppointments = bookings.slice(0, 5).map(booking => ({
      id: booking.id,
      service_name: booking.service_name,
      start_time: booking.start_time,
      client_name: booking.client_name || 'Client',
      status: booking.status
    }))

    return (
      <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <h1 className="text-ios-largeTitle font-bold text-accent-900 dark:text-white tracking-tight">
                Complex Dashboard Layout
              </h1>
              <p className="text-ios-body text-ios-gray-600 dark:text-zinc-300">
                Welcome back, {user?.first_name || user?.name || 'there'}. Here's your performance overview.
              </p>
            </div>
          </div>

          {/* Success Message */}
          {showSuccess && (
            <Card variant="default" className="mb-6 border-green-200 bg-green-50">
              <CardContent className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-success-800 font-medium">Booking confirmed successfully!</p>
                  <p className="text-success-700 text-sm mt-1">Your appointment has been scheduled.</p>
                </div>
                <Button
                  onClick={() => setShowSuccess(false)}
                  variant="ghost"
                  size="sm"
                  className="text-success-600 hover:text-success-700"
                >
                  ×
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Timezone Warning */}
          {showTimezoneWarning && (
            <Card variant="default" className="mb-6 border-yellow-200 bg-yellow-50">
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-warning-800 font-medium">Timezone not configured</p>
                    <p className="text-warning-700 text-sm mt-1">
                      Set your timezone to ensure appointment times display correctly.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => router.push('/settings')}
                  variant="outline"
                  size="sm"
                  leftIcon={<SettingsIcon />}
                >
                  Configure
                </Button>
              </CardContent>
            </Card>
          )}

          <ErrorBoundary 
            feature="barber-dashboard"
            userId={user?.id}
          >
            <BarberDashboardLayout 
              user={user}
              todayStats={todayStats}
              upcomingAppointments={upcomingAppointments}
            />
          </ErrorBoundary>
        </div>
      </main>
    )
  }

  // Default client dashboard
  return (
    <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome Back
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Hello, {user?.first_name || 'there'}. Ready to book your next appointment?
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <QuickActions user={user} />
            <CalendarDayMini />
          </div>
        </div>
      </div>
    </main>
  )
}