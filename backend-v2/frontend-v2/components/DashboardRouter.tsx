'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getDashboardType, getUserUnifiedRole, type UserWithRole } from '@/lib/roleUtils'
import { getDashboardData } from '@/lib/api/dashboards'
import { LoadingStates } from '@/components/ui/LoadingSystem'
import { EmptyState } from '@/components/ui/EmptyState'

// Import all dashboard components
import { ClientPortal } from '@/components/dashboards/ClientPortal'
import { IndividualBarberDashboard } from '@/components/dashboards/IndividualBarberDashboard'
import { ShopOwnerDashboard } from '@/components/dashboards/ShopOwnerDashboard'
import { EnterpriseDashboard } from '@/components/dashboards/EnterpriseDashboard'

// Error boundary for dashboard components
import { ErrorBoundary } from '@/components/ErrorBoundary'

interface DashboardRouterProps {
  user: UserWithRole & {
    email: string
    name: string
  }
  className?: string
  fallbackComponent?: React.ComponentType<any>
}

/**
 * Smart router component that renders the appropriate dashboard
 * based on the user's unified role and permissions
 */
export function DashboardRouter({ 
  user, 
  className = '',
  fallbackComponent: FallbackComponent 
}: DashboardRouterProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboardData, setDashboardData] = useState<any>(null)

  // Determine dashboard type based on user role
  const dashboardType = getDashboardType(user)
  const unifiedRole = getUserUnifiedRole(user)

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true)
        setError(null)

        // Validate user has required fields
        if (!user || !user.id) {
          throw new Error('Invalid user data')
        }

        // Load dashboard-specific data
        const data = await getDashboardData(user)
        setDashboardData(data)

      } catch (err) {
        console.error('Dashboard loading error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [user.id, unifiedRole])

  // Handle role-based redirects for specific cases
  useEffect(() => {
    // If user needs onboarding, redirect to welcome
    if (user && 'onboarding_completed' in user && !user.onboarding_completed) {
      router.push('/dashboard/welcome')
      return
    }

    // If user doesn't have a unified role, they may need migration
    if (!user.unified_role && (!user.role || !user.user_type)) {
      console.warn('User missing role information, may need account setup')
      // Don't redirect automatically, let them see an error state
    }
  }, [user, router])

  // Loading state
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

  // Error state
  if (error) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <EmptyState
            title="Dashboard Error"
            description={error}
            action={
              <div className="flex gap-2">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Try Again
                </button>
                <button
                  onClick={() => router.push('/settings')}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Account Settings
                </button>
              </div>
            }
          />
        </div>
      </div>
    )
  }

  // Render appropriate dashboard based on role
  const renderDashboard = () => {
    switch (dashboardType) {
      case 'client-portal':
        return (
          <ErrorBoundary fallback={<DashboardErrorFallback dashboardType="Client Portal" />}>
            <ClientPortal 
              user={user} 
              className={className}
            />
          </ErrorBoundary>
        )

      case 'individual-barber':
        return (
          <ErrorBoundary fallback={<DashboardErrorFallback dashboardType="Individual Barber Dashboard" />}>
            <IndividualBarberDashboard 
              user={user} 
              className={className}
            />
          </ErrorBoundary>
        )

      case 'shop-owner':
        return (
          <ErrorBoundary fallback={<DashboardErrorFallback dashboardType="Shop Owner Dashboard" />}>
            <ShopOwnerDashboard 
              user={user} 
              className={className}
            />
          </ErrorBoundary>
        )

      case 'enterprise':
        return (
          <ErrorBoundary fallback={<DashboardErrorFallback dashboardType="Enterprise Dashboard" />}>
            <EnterpriseDashboard 
              user={user} 
              className={className}
            />
          </ErrorBoundary>
        )

      case 'admin':
        // For admin users, we could create an admin dashboard component
        // For now, redirect to the existing admin page
        router.push('/admin')
        return (
          <div className="min-h-screen flex items-center justify-center">
            <LoadingStates.Spinner />
            <span className="ml-2">Redirecting to admin panel...</span>
          </div>
        )

      default:
        // Unknown dashboard type - show fallback or client portal
        if (FallbackComponent) {
          return <FallbackComponent user={user} className={className} />
        }
        
        return (
          <div className={`min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800 ${className}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <EmptyState
                title="Dashboard Not Available"
                description={`Dashboard type "${dashboardType}" not implemented for role "${unifiedRole}"`}
                action={
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push('/settings')}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Account Settings
                    </button>
                    <button
                      onClick={() => router.push('/')}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Home
                    </button>
                  </div>
                }
              />
            </div>
          </div>
        )
    }
  }

  return renderDashboard()
}

/**
 * Error fallback component for dashboard-specific errors
 */
function DashboardErrorFallback({ 
  dashboardType, 
  error 
}: { 
  dashboardType: string
  error?: Error 
}) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-ios-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg 
              className="h-6 w-6 text-red-600" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {dashboardType} Error
          </h2>
          
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {error?.message || `There was a problem loading your ${dashboardType.toLowerCase()}.`}
          </p>
          
          <div className="flex justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Try Again
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Go Home
            </button>
          </div>
          
          {error && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Technical Details
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded text-gray-800 dark:text-gray-200 overflow-auto">
                {error.stack || error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Hook for accessing dashboard context and utilities
 */
export function useDashboardRouter(user: UserWithRole & { email: string; name: string }) {
  const dashboardType = getDashboardType(user)
  const unifiedRole = getUserUnifiedRole(user)
  
  return {
    dashboardType,
    unifiedRole,
    canAccessDashboard: (requiredRole: string) => {
      // Simple role checking - could be expanded with permission system
      return unifiedRole === requiredRole
    },
    canAccessFeature: (feature: string) => {
      // Feature-based access checking
      // This would integrate with the permission system from roleUtils
      switch (feature) {
        case 'analytics':
          return ['individual_barber', 'shop_owner', 'enterprise_owner', 'shop_manager'].includes(unifiedRole)
        case 'staff_management':
          return ['shop_owner', 'enterprise_owner', 'shop_manager'].includes(unifiedRole)
        case 'financial_reports':
          return ['individual_barber', 'shop_owner', 'enterprise_owner'].includes(unifiedRole)
        default:
          return true
      }
    }
  }
}

/**
 * HOC for protecting dashboard routes
 */
export function withDashboardAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function AuthenticatedDashboard(props: P) {
    const router = useRouter()
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
      // Check authentication
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }
      
      setIsAuthenticated(true)
      setIsLoading(false)
    }, [router])

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <LoadingStates.Spinner />
        </div>
      )
    }

    if (!isAuthenticated) {
      return null // Will redirect to login
    }

    return <WrappedComponent {...props} />
  }
}