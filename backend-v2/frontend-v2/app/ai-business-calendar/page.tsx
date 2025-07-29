'use client'

import { Suspense } from 'react'
import { AIBusinessCalendar } from '@/components/calendar/AIBusinessCalendar'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Loading component for the AI Business Calendar
function AIBusinessCalendarSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3"></div>
      
      {/* Quick insights skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded"></div>
          </Card>
        ))}
      </div>
      
      {/* AI Agents panel skeleton */}
      <Card className="p-6">
        <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded"></div>
          ))}
        </div>
      </Card>
      
      {/* Calendar skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </div>
        <div className="lg:col-span-1">
          <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </div>
      </div>
    </div>
  )
}

function AIBusinessCalendarContent() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Only allow barbers, admins, and platform admins to access AI Business Calendar
    if (!loading && user && !(['barber', 'admin', 'platform_admin'].includes(user.role))) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // Show loading state while checking authentication
  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <AIBusinessCalendarSkeleton />
        </div>
      </main>
    )
  }

  // Redirect non-authorized users
  if (!user || !(['barber', 'admin', 'platform_admin'].includes(user.role))) {
    return null // Component will redirect in useEffect
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ErrorBoundary
          feature="ai-business-calendar"
          userId={user?.id}
          fallback={
            <Card className="p-8 text-center">
              <CardContent>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  AI Business Calendar Unavailable
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  We&apos;re experiencing technical difficulties with the AI Business Calendar.
                  Please try refreshing the page or contact support if the issue persists.
                </p>
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Refresh Page
                  </button>
                  <button
                    onClick={() => router.push('/calendar')}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Use Standard Calendar
                  </button>
                </div>
              </CardContent>
            </Card>
          }
        >
          <AIBusinessCalendar
            className="w-full"
            showAIInsights={true}
            enableGoogleSync={true}
          />
        </ErrorBoundary>
      </div>
    </main>
  )
}

export default function AIBusinessCalendarPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <AIBusinessCalendarSkeleton />
        </div>
      </main>
    }>
      <AIBusinessCalendarContent />
    </Suspense>
  )
}