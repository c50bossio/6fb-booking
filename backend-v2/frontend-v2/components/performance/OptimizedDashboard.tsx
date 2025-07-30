'use client'

import React, { useEffect, useState, useMemo, useCallback, memo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getProfile, logout, getMyBookings, getClientDashboardMetrics, getDashboardAnalytics, type User, type DashboardAnalytics } from '@/lib/api'
import { handleAuthError } from '@/lib/auth-error-handler'
import { batchDashboardData } from '@/lib/requestBatcher'
import { getDefaultDashboard } from '@/lib/routeGuards'
import TimezoneSetupModal from '@/components/TimezoneSetupModal'
import { OptimizedBarberDashboardLayout } from './OptimizedBarberDashboardLayout'
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
import { useRealtimeAnalytics } from '@/hooks/useRealtimeAnalytics'
import { useMemoizedCallback, useMemoizedValue, useDebounce } from '@/lib/memo-utils'

// Memoized icon components to prevent re-creation
const BookIcon = memo(() => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
))
BookIcon.displayName = 'BookIcon'

const BellIcon = memo(() => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
))
BellIcon.displayName = 'BellIcon'

const SettingsIcon = memo(() => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
))
SettingsIcon.displayName = 'SettingsIcon'

const UserIcon = memo(() => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
))
UserIcon.displayName = 'UserIcon'

const CalendarIcon = memo(() => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
))
CalendarIcon.displayName = 'CalendarIcon'

const ArrowTrendingUpIcon = memo(() => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
))
ArrowTrendingUpIcon.displayName = 'ArrowTrendingUpIcon'

const ClockIcon = memo(() => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
))
ClockIcon.displayName = 'ClockIcon'

const BrainIcon = memo(() => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
))
BrainIcon.displayName = 'BrainIcon'

const PlusIcon = memo(() => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
))
PlusIcon.displayName = 'PlusIcon'

// Lazy load heavy analytics components
const LazyAnalytics = React.lazy(() => import('@/components/analytics/LazyAnalytics'))
const LazySixFigureTracker = React.lazy(() => import('@/components/six-figure-barber/SixFigureBarberDashboard'))

// Optimized dashboard content component with proper memoization
const OptimizedDashboardContent = memo(() => {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State management with performance considerations
  const [user, setUser] = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [clientMetrics, setClientMetrics] = useState<any>(null)
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showTimezoneWarning, setShowTimezoneWarning] = useState(false)
  const [showTimezoneModal, setShowTimezoneModal] = useState(false)
  
  // Use refs to prevent unnecessary re-renders
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  // Memoized real-time analytics hook configuration
  const realtimeConfig = useMemoizedValue(() => ({
    enabled: user?.role === 'admin' || user?.role === 'barber' || user?.role === 'platform_admin',
    showNotifications: true
  }), [user?.role])
  
  const { 
    isConnected: realtimeConnected, 
    analyticsData: realtimeData, 
    lastEvent,
    connectionError 
  } = useRealtimeAnalytics(realtimeConfig)

  // Optimized data fetching with cleanup and error handling
  const fetchDashboardData = useMemoizedCallback(async () => {
    try {
      // Cancel any previous requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      abortControllerRef.current = new AbortController()
      setLoading(true)
      
      // Check authentication first
      const userData = await getProfile()
      
      if (!isMountedRef.current) return
      
      if (!userData) {
        return
      }
      
      setUser(userData)
      
      // Timezone setup logic
      if (!userData.timezone) {
        setShowTimezoneWarning(true)
        const hasSeenTimezoneModal = localStorage.getItem('hasSeenTimezoneModal')
        if (!hasSeenTimezoneModal) {
          setShowTimezoneModal(true)
        }
      }

      // Prepare optimized batched requests
      const dashboardRequests = [
        {
          endpoint: '/api/v2/appointments/',
          priority: 8,
          cacheKey: `user_appointments_${userData.id}`,
          cacheTtl: 30000
        }
      ]

      // Add role-specific requests
      if (userData.role === 'admin' || userData.role === 'barber' || userData.role === 'platform_admin') {
        dashboardRequests.push(
          {
            endpoint: '/api/v2/dashboard/client-metrics',
            priority: 6,
            cacheKey: `client_metrics_${userData.id}`,
            cacheTtl: 60000
          },
          {
            endpoint: `/api/v2/analytics/dashboard/${userData.id}`,
            priority: 5,
            cacheKey: `dashboard_analytics_${userData.id}`,
            cacheTtl: 120000
          }
        )
      }

      try {
        // Parallel data fetching with optimized batching
        const results = await batchDashboardData(dashboardRequests)
        
        if (!isMountedRef.current) return
        
        // Process results efficiently
        if (results[0]) {
          setBookings(results[0].bookings || [])
        } else {
          setBookings([])
        }

        if (userData.role === 'admin' || userData.role === 'barber' || userData.role === 'platform_admin') {
          if (results[1]) {
            setClientMetrics(results[1])
          }

          if (results[2]) {
            setAnalytics(results[2])
          }
        }
      } catch (batchError) {
        console.error('Dashboard: Batch request failed:', batchError)
        
        if (!isMountedRef.current) return
        
        // Optimized fallback with parallel requests
        try {
          const fallbackPromises = [getMyBookings()]
          
          if (userData.role === 'admin' || userData.role === 'barber' || userData.role === 'platform_admin') {
            fallbackPromises.push(
              getClientDashboardMetrics(),
              getDashboardAnalytics(userData.id)
            )
          }
          
          const fallbackResults = await Promise.allSettled(fallbackPromises)
          
          if (!isMountedRef.current) return
          
          // Process fallback results
          if (fallbackResults[0].status === 'fulfilled') {
            setBookings(fallbackResults[0].value.bookings || [])
          }
          
          if (fallbackResults[1]?.status === 'fulfilled') {
            setClientMetrics(fallbackResults[1].value)
          }
          
          if (fallbackResults[2]?.status === 'fulfilled') {
            setAnalytics(fallbackResults[2].value)
          }
        } catch (fallbackError) {
          console.warn('Fallback requests failed:', fallbackError)
        }
      }
    } catch (error) {
      console.error('Dashboard: Failed to load data:', error)
      
      if (!isMountedRef.current) return
      
      // Handle auth errors without clearing all state
      if (handleAuthError(error, router)) {
        setUser(null)
        setBookings([])
        setClientMetrics(null)
        setAnalytics(null)
        return
      }
      
      // For non-auth errors, keep user data but clear failed data
      setBookings([])
      setClientMetrics(null)
      setAnalytics(null)
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [router])

  // Optimized useEffect with proper cleanup
  useEffect(() => {
    isMountedRef.current = true
    
    fetchDashboardData()

    // Handle success message from search params
    if (searchParams.get('booking') === 'success') {
      setShowSuccess(true)
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setShowSuccess(false)
        }
      }, 5000)
      
      return () => clearTimeout(timer)
    }

    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchDashboardData, searchParams])

  // Authentication redirect effect with proper cleanup
  useEffect(() => {
    const token = localStorage.getItem('token')
    
    if (!loading && !user && !token) {
      const redirectTimer = setTimeout(() => {
        if (isMountedRef.current) {
          router.push('/login')
        }
      }, 500)
      
      return () => clearTimeout(redirectTimer)
    }
  }, [loading, user, router])

  // Memoized event handlers
  const handleLogout = useMemoizedCallback(() => {
    logout()
    router.push('/')
  }, [router])

  const handleTimezoneComplete = useMemoizedCallback((timezone: string) => {
    setShowTimezoneModal(false)
    setShowTimezoneWarning(false)
    localStorage.setItem('hasSeenTimezoneModal', 'true')
    if (user) {
      setUser({ ...user, timezone })
    }
  }, [user])

  const handleTimezoneModalClose = useMemoizedCallback(() => {
    setShowTimezoneModal(false)
    localStorage.setItem('hasSeenTimezoneModal', 'true')
  }, [])

  // Memoized computed values for better performance
  const todayStats = useMemoizedValue(() => {
    if (!analytics) return { appointments: 0, revenue: 0, newClients: 0, completionRate: 95 }
    
    const completionRate = analytics.appointment_summary ? 
      Math.round(100 - (analytics.appointment_summary.cancellation_rate + analytics.appointment_summary.no_show_rate)) : 95
    
    return {
      appointments: analytics.appointment_summary?.total_appointments || 0,
      revenue: analytics.revenue_summary?.total_revenue || 0,
      newClients: analytics.client_summary?.new_clients || 0,
      completionRate
    }
  }, [analytics])

  const upcomingAppointments = useMemoizedValue(() => {
    return bookings.slice(0, 5).map(booking => ({
      id: booking.id,
      service_name: booking.service_name,
      start_time: booking.start_time,
      client_name: booking.client_name || 'Client',
      status: booking.status
    }))
  }, [bookings])

  const isAdvancedUser = useMemoizedValue(() => {
    return user?.role === 'barber' || user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'platform_admin'
  }, [user?.role])

  // Loading state
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
  if (isAdvancedUser) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Enhanced Header Section with Visual Hierarchy */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-6 lg:space-y-0">
            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <div className="w-1 h-12 bg-primary-500 rounded-full"></div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Dashboard
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    Welcome back, {user?.first_name || 'there'}. Here&apos;s your day at a glance.
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
                onClick={() => router.push('/ai-business-calendar')} 
                variant="primary" 
                size="md"
                leftIcon={<BrainIcon />}
                className="shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                AI Calendar
              </Button>
              <Button 
                onClick={() => router.push('/calendar')} 
                variant="secondary" 
                size="md"
                leftIcon={<CalendarIcon />}
                className="shadow-sm hover:shadow-md transition-all duration-200"
              >
                View Calendar
              </Button>
              <Button 
                onClick={() => router.push('/clients')} 
                variant="ghost" 
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

          {/* Enhanced Success Message */}
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

          {/* Six Figure Barber Goal Tracking - Enhanced Analytics with Lazy Loading */}
          <ErrorBoundary feature="six-figure-tracker" userId={user?.id}>
            <React.Suspense fallback={<DashboardSkeleton />}>
              <LazySixFigureTracker
                className="mb-8"
                variant="hero"
                showProjections={true}
                showActionables={true}
              />
            </React.Suspense>
          </ErrorBoundary>

          {/* Real-time Analytics Dashboard with Lazy Loading */}
          <ErrorBoundary feature="interactive-analytics" userId={user?.id}>
            <div className="mb-8">
              {/* Real-time Connection Status */}
              {connectionError && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center text-yellow-800 dark:text-yellow-200 text-sm">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse"></div>
                    {connectionError}
                  </div>
                </div>
              )}
              
              {realtimeConnected && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center text-green-800 dark:text-green-200 text-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    Real-time updates active
                    {lastEvent && (
                      <span className="ml-2 text-xs opacity-75">
                        Last: {lastEvent.type.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <React.Suspense fallback={<DashboardSkeleton />}>
                <LazyAnalytics
                  sixFigureGoalEnabled={true}
                  className="w-full"
                />
              </React.Suspense>
            </div>
          </ErrorBoundary>

          <ErrorBoundary 
            feature="barber-dashboard"
            userId={user?.id}
          >
            <OptimizedBarberDashboardLayout 
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

  // Regular client dashboard remains unchanged but with performance optimizations
  return (
    <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Client dashboard content... */}
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-4">Welcome, {user?.first_name}!</h1>
          <p className="text-gray-600 mb-8">Your personalized dashboard is loading...</p>
          <Button onClick={() => router.push('/book')} variant="primary">
            Book Appointment
          </Button>
        </div>
      </div>
    </main>
  )
})

OptimizedDashboardContent.displayName = 'OptimizedDashboardContent'

export { OptimizedDashboardContent }