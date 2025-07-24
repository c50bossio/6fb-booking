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
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const ArrowTrendingUpIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
)

const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [clientMetrics, setClientMetrics] = useState<any>(null)
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showTimezoneWarning, setShowTimezoneWarning] = useState(false)
  const [showTimezoneModal, setShowTimezoneModal] = useState(false)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        console.log('Dashboard: Fetching user profile...')
        // Check authentication first
        const userData = await getProfile()
        console.log('Dashboard: User data received:', userData)
        if (!userData) {
          console.log('Dashboard: No user data, will redirect to login')
          return
        }
        setUser(userData)
        
        // FIXED: Onboarding redirect logic disabled to prevent infinite loops
        // Check if user needs onboarding - removed to fix redirect loop
        // if (!userData.onboarding_completed && userData.is_new_user !== false) {
        //   console.log('Dashboard: Redirecting new user to welcome page')
        //   router.push('/dashboard/welcome')
        //   return
        // }
        
        // FIXED: Role-specific dashboard redirect disabled to allow admin access
        // Check if user should be redirected to role-specific dashboard - disabled to fix loops
        // const defaultDashboard = getDefaultDashboard(userData)
        // if (defaultDashboard !== '/dashboard' && window.location.pathname === '/dashboard') {
        //   router.push(defaultDashboard)
        //   return
        // }
        
        if (!userData.timezone) {
          setShowTimezoneWarning(true)
          const hasSeenTimezoneModal = localStorage.getItem('hasSeenTimezoneModal')
          if (!hasSeenTimezoneModal) {
            setShowTimezoneModal(true)
          }
        }

        // Prepare batched requests based on user role
        const dashboardRequests = [
          {
            endpoint: '/api/v2/appointments/',
            priority: 8,
            cacheKey: `user_appointments_${userData.id}`,
            cacheTtl: 30000 // 30 seconds
          }
        ]

        // Add role-specific requests
        if (userData.role === 'admin' || userData.role === 'barber') {
          dashboardRequests.push(
            {
              endpoint: '/api/v2/dashboard/client-metrics',
              priority: 6,
              cacheKey: `client_metrics_${userData.id}`,
              cacheTtl: 60000 // 1 minute
            },
            {
              endpoint: `/api/v2/analytics/dashboard/${userData.id}`,
              priority: 5,
              cacheKey: `dashboard_analytics_${userData.id}`,
              cacheTtl: 120000 // 2 minutes
            }
          )
        }

        try {
          console.log(`Dashboard: Batching ${dashboardRequests.length} requests...`)
          const results = await batchDashboardData(dashboardRequests)
          
          // Process bookings data
          if (results[0]) {
            setBookings(results[0].bookings || [])
          } else {
            console.warn('Failed to load bookings from batch')
            setBookings([])
          }

          // Process role-specific data
          if (userData.role === 'admin' || userData.role === 'barber') {
            // Client metrics
            if (results[1]) {
              setClientMetrics(results[1])
            } else {
              console.warn('Failed to load client metrics from batch')
              setClientMetrics(null)
            }

            // Analytics data
            if (results[2]) {
              setAnalytics(results[2])
            } else {
              console.warn('Failed to load analytics from batch')
              setAnalytics(null)
            }
          }
        } catch (batchError) {
          console.error('Dashboard: Batch request failed:', batchError)
          // Fallback to individual requests
          try {
            const bookingsData = await getMyBookings()
            setBookings(bookingsData.bookings || [])
          } catch (bookingError) {
            console.warn('Failed to load bookings:', bookingError)
            setBookings([])
          }

          if (userData.role === 'admin' || userData.role === 'barber') {
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
        }
      } catch (error) {
        console.error('Dashboard: Failed to load data:', error)
        
        // Only handle auth errors (401/403), not server errors (500)
        if (handleAuthError(error, router)) {
          // Auth error handled, clear state and let redirect happen
          setUser(null)
          setBookings([])
          setClientMetrics(null)
          setAnalytics(null)
          return
        }
        
        // For non-auth errors (like 500), keep user data but clear failed data
        // Don't clear user state - this prevents redirect loops
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
      setTimeout(() => setShowSuccess(false), 5000)
    }
  }, [router, searchParams])

  // Handle redirect to login if user is not authenticated
  useEffect(() => {
    // Check if we have a token in localStorage
    const token = localStorage.getItem('token')
    console.log('Dashboard: Checking auth - token exists:', !!token, 'loading:', loading, 'user:', !!user)
    
    if (!loading && !user && !token) {
      // Only redirect if we truly have no authentication
      console.log('Dashboard: No token and no user, redirecting to login')
      const redirectTimer = setTimeout(() => {
        router.push('/login')
      }, 500) // Increased delay to allow for profile fetch
      return () => clearTimeout(redirectTimer)
    }
  }, [loading, user, router])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const handleTimezoneComplete = (timezone: string) => {
    setShowTimezoneModal(false)
    setShowTimezoneWarning(false)
    localStorage.setItem('hasSeenTimezoneModal', 'true')
    if (user) {
      setUser({ ...user, timezone })
    }
  }

  const handleTimezoneModalClose = () => {
    setShowTimezoneModal(false)
    localStorage.setItem('hasSeenTimezoneModal', 'true')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <DashboardSkeleton />
        </div>
      </main>
    )
  }

  // Render specialized barber dashboard layout
  if (user?.role === 'barber' || user?.role === 'admin' || user?.role === 'super_admin') {
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
          {/* Enhanced Header Section with Visual Hierarchy */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-6 lg:space-y-0">
            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                {/* Subtle accent line following restraint principles */}
                <div className="w-1 h-12 bg-primary-500 rounded-full"></div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Dashboard
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    Welcome back, {user?.first_name || 'there'}. Here's your day at a glance.
                  </p>
                </div>
              </div>
              
              {/* Quick stats preview - subtle integration */}
              {todayStats && (
                <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon />
                    <span>{todayStats.appointments} appointments today</span>
                  </div>
                  {todayStats.revenue > 0 && (
                    <div className="flex items-center space-x-2">
                      <ArrowTrendingUpIcon />
                      <span>${todayStats.revenue.toFixed(2)} revenue</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Quick Actions - Enhanced with better hierarchy */}
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => router.push('/calendar')} 
                variant="primary" 
                size="md"
                leftIcon={<CalendarIcon />}
                className="shadow-sm hover:shadow-md transition-all duration-200"
              >
                View Calendar
              </Button>
              <Button 
                onClick={() => router.push('/clients')} 
                variant="secondary" 
                size="md"
                leftIcon={<UserIcon />}
              >
                Clients
              </Button>
              <Button 
                onClick={() => router.push('/analytics')} 
                variant="ghost" 
                size="md"
                leftIcon={<ArrowTrendingUpIcon />}
              >
                Analytics
              </Button>
            </div>
          </div>

          {/* Enhanced Success Message with new card variants */}
          {showSuccess && (
            <Card variant="secondary" borderAccent className="mb-6 border-l-green-500 bg-green-50 dark:bg-green-900/10">
              <CardContent className="flex items-center space-x-4 py-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-green-800 dark:text-green-200 font-medium">Booking confirmed successfully!</p>
                  <p className="text-green-700 dark:text-green-300 text-sm mt-1">Your appointment has been scheduled and confirmation sent.</p>
                </div>
                <Button
                  onClick={() => setShowSuccess(false)}
                  variant="ghost"
                  size="sm"
                  className="text-green-600 hover:text-green-700 hover:bg-green-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Timezone Warning */}
          {showTimezoneWarning && (
            <Card variant="secondary" borderAccent className="mb-6 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-yellow-800 dark:text-yellow-200 font-medium">Timezone Setup Required</p>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                      Configure your timezone to ensure appointment times display correctly.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => router.push('/settings')}
                  variant="outline"
                  size="sm"
                  leftIcon={<SettingsIcon />}
                  className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
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

        <TimezoneSetupModal
          isOpen={showTimezoneModal}
          onClose={handleTimezoneModalClose}
          onComplete={handleTimezoneComplete}
        />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Enhanced Client Dashboard Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-6 lg:space-y-0">
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              {/* Subtle accent line following restraint principles */}
              <div className="w-1 h-12 bg-primary-500 rounded-full"></div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Welcome Back
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Hello, {user?.first_name || 'there'}. Ready to book your next appointment?
                </p>
              </div>
            </div>
            
            {/* Quick appointment info for clients */}
            {bookings.length > 0 && (
              <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                  <CalendarIcon />
                  <span>{bookings.length} upcoming appointment{bookings.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ClockIcon />
                  <span>Next: {bookings[0]?.start_time ? new Date(bookings[0].start_time).toLocaleDateString() : 'Not scheduled'}</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Client-focused Quick Actions */}
          <div className="flex items-center space-x-3">
            <Button 
              onClick={() => router.push('/book')} 
              variant="primary" 
              size="md"
              leftIcon={<PlusIcon />}
              className="shadow-sm hover:shadow-md transition-all duration-200"
            >
              Book Appointment
            </Button>
            <Button 
              onClick={() => router.push('/calendar')} 
              variant="secondary" 
              size="md"
              leftIcon={<CalendarIcon />}
            >
              My Appointments
            </Button>
            {(user?.role === 'admin' || user?.role === 'barber') && (
              <Button 
                onClick={() => router.push('/notifications')} 
                variant="ghost" 
                size="md"
                leftIcon={<BellIcon />}
              >
                Notifications
              </Button>
            )}
          </div>
        </div>

        {/* Enhanced Success Message with new card variants */}
        {showSuccess && (
          <Card variant="secondary" borderAccent className="mb-6 border-l-green-500 bg-green-50 dark:bg-green-900/10">
            <CardContent className="flex items-center space-x-4 py-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-green-800 dark:text-green-200 font-medium">Booking confirmed successfully!</p>
                <p className="text-green-700 dark:text-green-300 text-sm mt-1">Your appointment has been scheduled and confirmation sent.</p>
              </div>
              <Button
                onClick={() => setShowSuccess(false)}
                variant="ghost"
                size="sm"
                className="text-green-600 hover:text-green-700 hover:bg-green-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Timezone Warning */}
        {showTimezoneWarning && (
          <Card variant="secondary" borderAccent className="mb-6 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-yellow-800 dark:text-yellow-200 font-medium">Timezone Setup Required</p>
                  <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                    Configure your timezone to ensure appointment times display correctly.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => router.push('/settings')}
                variant="outline"
                size="sm"
                leftIcon={<SettingsIcon />}
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                Configure
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions - Prominent placement after warnings */}
        {user && (
          <ErrorBoundary feature="quick-actions" userId={user?.id}>
            <QuickActions userRole={user.role} className="mb-8" />
          </ErrorBoundary>
        )}

        {/* Enhanced Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Hero Card - Today's Appointments (Only one hero per page) */}
          <div className="lg:col-span-2">
            <Card variant="hero" className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center">
                      <CalendarIcon />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Today's Schedule</CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {bookings.length > 0 ? `${bookings.length} appointment${bookings.length !== 1 ? 's' : ''} scheduled` : 'No appointments today'}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push('/calendar')}
                    variant="ghost"
                    size="sm"
                    className="text-primary-600 hover:text-primary-700"
                  >
                    View All →
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ErrorBoundary feature="calendar-mini" userId={user?.id}>
                  <CalendarDayMini
                    appointments={bookings}
                    selectedDate={new Date()}
                    maxItems={4}
                    onViewAll={() => router.push('/calendar')}
                  />
                </ErrorBoundary>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions Card - Secondary */}
          <Card variant="secondary">
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <PlusIcon />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  onClick={() => router.push('/book')}
                  variant="primary"
                  size="sm"
                  className="w-full justify-start"
                  leftIcon={<BookIcon />}
                >
                  Book Appointment
                </Button>
                <Button
                  onClick={() => router.push('/calendar')}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  leftIcon={<CalendarIcon />}
                >
                  View Calendar
                </Button>
                <Button
                  onClick={() => router.push('/settings')}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-gray-600 hover:text-gray-800"
                  leftIcon={<SettingsIcon />}
                >
                  Account Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Account Information */}
          <Card variant="default">
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <UserIcon />
                <span>Account Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Email Address</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{user.email}</p>
                </div>
                {user.timezone && (
                  <div>
                    <p className="text-sm text-gray-500">Timezone</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {user.timezone.replace(/_/g, ' ')}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {user.role === 'admin' ? 'Administrator' : user.role}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role-Specific Business Tools / Services */}
          <Card variant={user?.role === 'admin' ? 'elevated' : 'default'}>
            <CardHeader>
              <div className="flex items-center space-x-3">
                {user?.role === 'admin' && (
                  <div className="w-1 h-8 bg-primary-500 rounded-full"></div>
                )}
                <CardTitle className="text-lg">
                  {user?.role === 'admin' ? 'Admin Tools' : 
                   user?.role === 'barber' ? 'Barber Dashboard' : 
                   'Your Services'}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {user?.role === 'admin' || user?.role === 'barber' ? (
                <div className="space-y-3">
                  {clientMetrics ? (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-2xl font-bold text-primary-600">{clientMetrics.total_clients || 0}</p>
                        <p className="text-xs text-gray-500">Total Clients</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{clientMetrics.new_clients_this_month || 0}</p>
                        <p className="text-xs text-gray-500">New This Month</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 mb-4">Loading metrics...</div>
                  )}
                  
                  <div className="space-y-2">
                    <Button
                      onClick={() => router.push('/clients')}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                      leftIcon={<UserIcon />}
                    >
                      Manage Clients
                    </Button>
                    <Button
                      onClick={() => router.push('/analytics')}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                      leftIcon={<ArrowTrendingUpIcon />}
                    >
                      View Analytics
                    </Button>
                    <Button
                      onClick={() => router.push('/import')}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                    >
                      Import Data
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-4">
                    Explore our professional barbering services and book your next appointment.
                  </p>
                  <Button
                    onClick={() => router.push('/book')}
                    variant="primary"
                    size="sm"
                    className="w-full"
                    leftIcon={<BookIcon />}
                  >
                    Browse Services
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Admin Panel - Enhanced for Admin Role */}
        {user?.role === 'admin' && (
          <Card variant="elevated" borderAccent className="mt-6">
            <CardHeader>
              <div className="flex items-center space-x-4">
                <div className="w-1 h-12 bg-primary-500 rounded-full"></div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-sm">
                    <ShieldIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">System Administration</CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Manage users, settings, and system operations
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Manage booking settings, business hours, and platform configuration
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={() => router.push('/admin')}
                  variant="primary"
                  size="sm"
                  className="justify-start"
                  leftIcon={<SettingsIcon />}
                >
                  Admin Settings
                </Button>
                <Button
                  onClick={() => router.push('/analytics')}
                  variant="secondary"
                  size="sm"
                  className="justify-start"
                  leftIcon={<ArrowTrendingUpIcon />}
                >
                  System Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <TimezoneSetupModal
        isOpen={showTimezoneModal}
        onClose={handleTimezoneModalClose}
        onComplete={handleTimezoneComplete}
      />
    </main>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <DashboardSkeleton />
        </div>
      </main>
    }>
      <DashboardContent />
    </Suspense>
  )
}