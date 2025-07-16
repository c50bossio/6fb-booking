'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getProfile, logout, getMyBookings, getClientDashboardMetrics, getDashboardAnalytics, type User, type DashboardAnalytics } from '@/lib/api'
import { handleAuthError } from '@/lib/auth-error-handler'
import { batchDashboardData } from '@/lib/requestBatcher'
import { getDefaultDashboard } from '@/lib/routeGuards'
import TimezoneSetupModal from '@/components/TimezoneSetupModal'
import { BarberDashboardLayout } from '@/components/BarberDashboardLayout'
import { useAsyncOperation } from '@/lib/useAsyncOperation'
import { PageLoading, ErrorDisplay, SuccessMessage } from '@/components/ui/LoadingSystem'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { QuickActions } from '@/components/QuickActions'
import { TestDataQuickActions } from '@/components/TestDataQuickActions'
import CalendarDayMini from '@/components/calendar/CalendarDayMini'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { TrialStatusBanner } from '@/components/ui/TrialStatusBanner'
import { TrialWarningSystem } from '@/components/ui/TrialWarningSystem'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { SmartLoading, ClientMetricsSkeleton, CalendarMiniSkeleton, QuickActionsSkeleton } from '@/components/dashboard/MetricsLoadingStates'

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
  const dataFetchedRef = useRef(false)

  useEffect(() => {
    async function fetchDashboardData() {
      // Prevent multiple executions
      if (dataFetchedRef.current) return
      dataFetchedRef.current = true
      
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
        
        // Check if user needs onboarding
        if (!userData.onboarding_completed && userData.is_new_user !== false) {
          console.log('Dashboard: Redirecting new user to welcome page')
          router.push('/dashboard/welcome')
          return
        }
        
        // NOTE: Role-based dashboard routing disabled to preserve user's preferred UI experience
        // Users (especially ENTERPRISE_OWNER) prefer to access their familiar dashboard interface
        // instead of being automatically redirected to /admin
        // 
        // BACKEND PERMISSIONS STILL WORK: The permission fixes in auth.py ensure proper access control
        // 
        // Uncomment below if role-based routing is needed in the future:
        // const defaultDashboard = getDefaultDashboard(userData)
        // if (defaultDashboard !== '/dashboard' && window.location.pathname === '/dashboard') {
        //   console.log(`Redirecting ${userData.unified_role} user to ${defaultDashboard}`)
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
            endpoint: '/api/v1/appointments/',
            priority: 8,
            cacheKey: `user_appointments_${userData.id}`,
            cacheTtl: 30000 // 30 seconds
          }
        ]

        // Add role-specific requests
        if (userData.role === 'admin' || userData.role === 'barber') {
          dashboardRequests.push(
            {
              endpoint: '/api/v1/dashboard/client-metrics',
              priority: 6,
              cacheKey: `client_metrics_${userData.id}`,
              cacheTtl: 60000 // 1 minute
            },
            {
              endpoint: `/api/v1/analytics/dashboard/${userData.id}`,
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
          // Set default values for failed batch requests
          setBookings([])
          setClientMetrics(null)
          setAnalytics(null)
        }
      } catch (error) {
        console.error('Dashboard: Failed to load data:', error)
        
        // Use centralized auth error handling
        if (handleAuthError(error, router)) {
          // Auth error handled, clear state and let redirect happen
          setUser(null)
          setBookings([])
          setClientMetrics(null)
          setAnalytics(null)
          return
        }
        
        // Non-auth error, just clear state
        setUser(null)
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
    // Check if we have a token in localStorage (use same key as request batcher)
    const token = localStorage.getItem('access_token')
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

  // Render rich dashboard layout with KPIs and analytics cards
  // NOTE: This provides the rich dashboard with cards, metrics, and analytics
  // Admin users should see this rich dashboard, not the basic Command Center
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
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-4 lg:space-y-0">
            <div className="space-y-2">
              <h1 className="text-ios-largeTitle font-bold text-accent-900 dark:text-white tracking-tight">
                Barber Dashboard
              </h1>
              <p className="text-ios-body text-ios-gray-600 dark:text-zinc-300">
                Welcome back, {user?.first_name || 'there'}. Here's your performance overview.
              </p>
            </div>
          </div>

          {/* Success Message */}
          {showSuccess && (
            <Card className="mb-6">
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
            <Card className="mb-6">
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
            userId={user.id.toString()}
            fallback={
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 text-amber-600 dark:text-amber-400 mx-auto mb-4">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-2">
                    Dashboard Temporarily Unavailable
                  </h3>
                  <p className="text-amber-700 dark:text-amber-200 mb-4">
                    Your dashboard is experiencing issues. You can still access your calendar and other features.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => router.push('/calendar')} variant="outline" size="sm">
                      Go to Calendar
                    </Button>
                    <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                      Refresh Page
                    </Button>
                  </div>
                </CardContent>
              </Card>
            }
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
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-4 lg:space-y-0">
          <div className="space-y-2">
            <h1 className="text-ios-largeTitle font-bold text-accent-900 dark:text-white tracking-tight">
              Command Center
            </h1>
            <p className="text-ios-body text-ios-gray-600 dark:text-zinc-300">
              Welcome back, {user?.first_name || 'there'}. Here's what's happening today.
            </p>
          </div>
          
          {/* Quick Actions - Mobile Hidden, Desktop Visible */}
          <div className="hidden lg:flex items-center space-x-3">
            <Button 
              onClick={() => router.push('/book')} 
              variant="primary" 
              size="md"
              elevated
              leftIcon={<BookIcon />}
            >
              Book Appointment
            </Button>
            {(user?.role === 'admin' || user?.role === 'barber') && (
              <Button 
                onClick={() => router.push('/reviews/analytics')} 
                variant="secondary" 
                size="md"
                leftIcon={<BellIcon />}
              >
                Analytics
              </Button>
            )}
            <Button 
              onClick={() => router.push('/settings')} 
              variant="ghost" 
              size="md"
              leftIcon={<SettingsIcon />}
            >
              Settings
            </Button>
          </div>
        </div>

        {/* Trial Warning System */}
        {user && (user.subscription_status === 'trial' || user.is_trial_active) && (
          <TrialWarningSystem
            trialStatus={{
              is_trial_active: user.is_trial_active || false,
              trial_days_remaining: user.trial_days_remaining || 0,
              trial_started_at: user.trial_started_at || null,
              trial_expires_at: user.trial_expires_at || null,
              subscription_status: user.subscription_status || 'trial',
              user_type: user.user_type || user.role || 'barber'
            }}
            onUpgrade={() => router.push('/billing/plans')}
            onDismiss={(warningId) => console.log('Dismissed warning:', warningId)}
          />
        )}

        {/* Trial Status Banner */}
        {user && user.primary_organization_id && (user.subscription_status === 'trial' || user.is_trial_active || user.primary_organization?.subscription_status === 'trial') && (
          <TrialStatusBanner
            organizationId={user.primary_organization_id}
            className="mb-6"
          />
        )}

        {/* Success Message */}
        {showSuccess && (
          <Card className="mb-6">
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
          <Card className="mb-6">
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

        {/* Quick Actions - Prominent placement after warnings */}
        {user && (
          <ErrorBoundary
            feature="quick-actions"
            userId={user.id?.toString()}
            fallback={
              <Card className="mb-8 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-blue-700 dark:text-blue-200">
                    Quick actions are temporarily unavailable.
                  </p>
                </CardContent>
              </Card>
            }
          >
            <SmartLoading
              isLoading={loading}
              error={null}
              skeleton={<QuickActionsSkeleton />}
            >
              <QuickActions userRole={user.role} className="mb-8" />
            </SmartLoading>
          </ErrorBoundary>
        )}

        {/* Test Data Quick Actions for Development */}
        {user && (
          <ErrorBoundary
            fallback={<div>Error loading test data actions</div>}
            onError={(error) => {
              console.error('Error in TestDataQuickActions:', error)
            }}
          >
            <TestDataQuickActions userRole={user.role} className="mb-6" />
          </ErrorBoundary>
        )}

        {user && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Welcome back!</CardTitle>
                <Button
                  onClick={() => router.push('/settings')}
                  variant="ghost"
                  size="sm"
                  className="text-primary-600 hover:text-primary-700"
                >
                  Account Settings
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <p className="text-gray-600">Logged in as: {user.email}</p>
                {user.timezone && (
                  <p className="text-sm text-gray-500 mt-1">
                    Timezone: {user.timezone.replace(/_/g, ' ')}
                  </p>
                )}
              </div>
            
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Today's Appointments Mini Calendar */}
                <div className="md:col-span-1">
                  <ErrorBoundary
                    feature="calendar-mini"
                    fallback={
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="w-8 h-8 text-gray-400 mx-auto mb-2">
                            <CalendarIcon />
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Calendar preview unavailable
                          </p>
                          <Button
                            onClick={() => router.push('/calendar')}
                            variant="outline"
                            size="sm"
                          >
                            View Full Calendar
                          </Button>
                        </CardContent>
                      </Card>
                    }
                  >
                    <SmartLoading
                      isLoading={loading && bookings.length === 0}
                      error={null}
                      skeleton={<CalendarMiniSkeleton />}
                    >
                      <CalendarDayMini
                        appointments={bookings}
                        selectedDate={new Date()}
                        maxItems={3}
                        onViewAll={() => router.push('/calendar')}
                      />
                    </SmartLoading>
                  </ErrorBoundary>
                </div>
                
                <Card>
                  <CardContent>
                    <h3 className="font-semibold text-accent-900 mb-3">
                      {user?.role === 'admin' || user?.role === 'barber' ? 'Client Management' : 'Services'}
                    </h3>
                    {user?.role === 'admin' || user?.role === 'barber' ? (
                      <div className="space-y-2">
                        <SmartLoading
                          isLoading={!clientMetrics && loading}
                          error={null}
                          skeleton={
                            <div className="space-y-2">
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28 animate-pulse"></div>
                              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                            </div>
                          }
                        >
                          {clientMetrics ? (
                            <div className="text-sm space-y-1">
                              <div>Total Clients: {clientMetrics.total_clients || 0}</div>
                              <div>New This Month: {clientMetrics.new_clients_this_month || 0}</div>
                              <div>VIP Clients: {clientMetrics.vip_clients || 0}</div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              No metrics available
                            </div>
                          )}
                        </SmartLoading>
                        <Button
                          onClick={() => router.push('/calendar')}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-primary-600 hover:text-primary-700 p-0"
                        >
                          View appointments →
                        </Button>
                        <Button
                          onClick={() => router.push('/reviews/analytics')}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-primary-600 hover:text-primary-700 p-0"
                        >
                          View analytics →
                        </Button>
                        <Button
                          onClick={() => router.push('/test-data')}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-primary-600 hover:text-primary-700 p-0"
                        >
                          Manage test data →
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">Browse available services</p>
                        <Button
                          onClick={() => router.push('/book')}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-primary-600 hover:text-primary-700 p-0"
                        >
                          View services →
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {user?.role === 'admin' && (
                <Card className="mt-6 border-l-4 border-accent-400">
                  <CardContent>
                    <h3 className="font-semibold text-accent-900 mb-2">🛠️ Admin Panel</h3>
                    <p className="text-accent-700 text-sm mb-3">
                      Manage booking settings, business hours, and platform configuration
                    </p>
                    <Button
                      onClick={() => router.push('/admin')}
                      variant="ghost"
                      size="sm"
                      className="text-primary-600 hover:text-primary-700 p-0"
                    >
                      Open Admin Settings →
                    </Button>
                  </CardContent>
                </Card>
              )}
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