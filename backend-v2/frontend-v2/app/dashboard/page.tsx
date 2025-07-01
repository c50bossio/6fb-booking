'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getProfile, logout, getMyBookings, getClientDashboardMetrics, getDashboardAnalytics, type User, type DashboardAnalytics } from '@/lib/api'
import { getDefaultDashboard } from '@/lib/routeGuards'
import TimezoneSetupModal from '@/components/TimezoneSetupModal'
import { BarberDashboardLayout } from '@/components/BarberDashboardLayout'
import { useAsyncOperation } from '@/lib/useAsyncOperation'
import { PageLoading, ErrorDisplay, SuccessMessage } from '@/components/LoadingStates'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card'
import { QuickActions } from '@/components/QuickActions'
import CalendarDayMini from '@/components/calendar/CalendarDayMini'

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

const TrendingUpIcon = () => (
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
        
        // Check if user should be redirected to role-specific dashboard
        const defaultDashboard = getDefaultDashboard(userData)
        if (defaultDashboard !== '/dashboard' && window.location.pathname === '/dashboard') {
          router.push(defaultDashboard)
          return
        }
        
        if (!userData.timezone) {
          setShowTimezoneWarning(true)
          const hasSeenTimezoneModal = localStorage.getItem('hasSeenTimezoneModal')
          if (!hasSeenTimezoneModal) {
            setShowTimezoneModal(true)
          }
        }

        try {
          const bookingsData = await getMyBookings()
          setBookings(bookingsData.bookings || [])
        } catch (bookingError) {
          console.warn('Failed to load bookings:', bookingError)
          setBookings([])
        }

        // Load role-specific data
        if (userData.role === 'admin' || userData.role === 'barber') {
          // Load client metrics and analytics in parallel
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
        // Check if it's an auth error
        if (error && (error as any).message?.includes('401')) {
          console.log('Dashboard: Auth error, redirecting to login')
          router.push('/login')
        }
        setUser(null)
        setBookings([])
        setClientMetrics(null)
        setAnalytics(null)
        // Don't redirect during render - let the loading state handle it
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-ios-gray-50 to-white">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto">
            <div className="w-full h-full rounded-full border-4 border-primary-200 border-t-primary-500 animate-spin"></div>
          </div>
          <p className="text-ios-body text-ios-gray-600">Loading your dashboard...</p>
        </div>
      </div>
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
            <Card variant="success" className="mb-6" animated>
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
            <Card variant="warning" className="mb-6" animated>
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
                  variant="warning"
                  size="sm"
                  leftIcon={<SettingsIcon />}
                >
                  Configure
                </Button>
              </CardContent>
            </Card>
          )}

          <BarberDashboardLayout 
            user={user}
            todayStats={todayStats}
            upcomingAppointments={upcomingAppointments}
          />
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
                onClick={() => router.push('/notifications')} 
                variant="secondary" 
                size="md"
                leftIcon={<BellIcon />}
              >
                Notifications
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

        {/* Success Message */}
        {showSuccess && (
          <Card variant="success" className="mb-6" animated>
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
          <Card variant="warning" className="mb-6" animated>
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
                variant="warning"
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
          <QuickActions userRole={user.role} className="mb-8" />
        )}

        {user && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle as="h2">Welcome back!</CardTitle>
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
                  <CalendarDayMini
                    appointments={bookings}
                    selectedDate={new Date()}
                    maxItems={3}
                    onViewAll={() => router.push('/calendar')}
                  />
                </div>
                
                <Card variant="default">
                  <CardContent>
                    <h3 className="font-semibold text-accent-900 mb-3">
                      {user?.role === 'admin' || user?.role === 'barber' ? 'Client Management' : 'Services'}
                    </h3>
                    {user?.role === 'admin' || user?.role === 'barber' ? (
                      <div className="space-y-2">
                        {clientMetrics ? (
                          <div className="text-sm space-y-1">
                            <div>Total Clients: {clientMetrics.total_clients || 0}</div>
                            <div>New This Month: {clientMetrics.new_clients_this_month || 0}</div>
                            <div>VIP Clients: {clientMetrics.vip_clients || 0}</div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-600">Loading metrics...</div>
                        )}
                        <Button
                          onClick={() => router.push('/clients')}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-primary-600 hover:text-primary-700 p-0"
                        >
                          Manage clients →
                        </Button>
                        <Button
                          onClick={() => router.push('/import')}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-primary-600 hover:text-primary-700 p-0"
                        >
                          Import data →
                        </Button>
                        <Button
                          onClick={() => router.push('/export')}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-primary-600 hover:text-primary-700 p-0"
                        >
                          Export data →
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
                <Card variant="default" className="mt-6 border-l-4 border-accent-400">
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
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-gray-600">Loading...</p></div>}>
      <DashboardContent />
    </Suspense>
  )
}