'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { checkRouteAccess, getRoleDisplayName } from '@/lib/access-control'
import { UserRole } from '@/lib/navigation'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ExclamationTriangleIcon,
  LockClosedIcon,
  ArrowLeftIcon,
  HomeIcon
} from '@heroicons/react/24/outline'

interface AccessControlProps {
  children: React.ReactNode
  requiredRoles?: UserRole[]
  fallback?: React.ReactNode
  showAccessDenied?: boolean
  redirectOnDenied?: string
  allowUnauthenticated?: boolean
}

/**
 * Internal access control component that uses useSearchParams
 */
function AccessControlContent({
  children,
  requiredRoles = [],
  fallback,
  showAccessDenied = true,
  redirectOnDenied,
  allowUnauthenticated = false
}: AccessControlProps) {
  const { user, isAuthenticated, isLoading, error: authError } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [accessChecked, setAccessChecked] = useState(false)
  const [accessGranted, setAccessGranted] = useState(false)

  // Get current path
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/'

  useEffect(() => {
    // Wait for auth to complete loading
    if (isLoading) {
      setAccessChecked(false)
      return
    }

    // Check access based on current conditions
    const accessCheck = checkRouteAccess(currentPath, user?.role || null, isAuthenticated)

    // If unauthenticated access is explicitly allowed and no roles required
    if (allowUnauthenticated && requiredRoles.length === 0) {
      setAccessGranted(true)
      setAccessChecked(true)
      return
    }

    // If access is denied, handle appropriately
    if (!accessCheck.hasAccess) {
      setAccessGranted(false)
      setAccessChecked(true)

      // Redirect if specified
      if (redirectOnDenied) {
        router.push(redirectOnDenied)
        return
      }

      // Auto-redirect based on route configuration
      if (accessCheck.redirectTo && !showAccessDenied) {
        const redirectUrl = `${accessCheck.redirectTo}?error=access_denied&attempted=${encodeURIComponent(currentPath)}`
        router.push(redirectUrl)
        return
      }

      return
    }

    // Access granted
    setAccessGranted(true)
    setAccessChecked(true)
  }, [isLoading, isAuthenticated, user?.role, currentPath, requiredRoles, allowUnauthenticated, redirectOnDenied, showAccessDenied, router])

  // Show loading state
  if (isLoading || !accessChecked) {
    return <PageLoading message="Checking access permissions..." />
  }

  // Show authentication error
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
              Authentication Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {authError}
            </p>
            <div className="flex space-x-2">
              <Button
                onClick={() => window.location.reload()}
                variant="primary"
                size="sm"
              >
                Retry
              </Button>
              <Button
                onClick={() => router.push('/login')}
                variant="outline"
                size="sm"
              >
                Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show access denied page
  if (!accessGranted && showAccessDenied) {
    return <AccessDeniedPage currentPath={currentPath} userRole={user?.role} />
  }

  // Show fallback content
  if (!accessGranted && fallback) {
    return <>{fallback}</>
  }

  // Show children if access is granted
  if (accessGranted) {
    return (
      <>
        {children}
        <AccessControlNotifications />
      </>
    )
  }

  // Default: show access denied
  return <AccessDeniedPage currentPath={currentPath} userRole={user?.role} />
}

/**
 * Comprehensive access control wrapper component with Suspense boundary
 * Provides role-based access control with user-friendly error messages
 */
export default function AccessControl(props: AccessControlProps) {
  return (
    <Suspense fallback={<PageLoading />}>
      <AccessControlContent {...props} />
    </Suspense>
  )
}

/**
 * Access denied page component
 */
function AccessDeniedPage({ 
  currentPath, 
  userRole 
}: { 
  currentPath: string
  userRole?: string 
}) {
  const router = useRouter()
  
  // Make search params access safe for SSR
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSearchParams(new URLSearchParams(window.location.search))
    }
  }, [])

  const error = searchParams?.get('error')
  const attemptedPath = searchParams?.get('attempted_path')
  const requiredRole = searchParams?.get('required_role')

  const getErrorMessage = () => {
    if (error === 'authentication_required') {
      return 'You must be logged in to access this page.'
    }
    if (error === 'insufficient_permissions') {
      return `You don't have permission to access this page. Required role: ${requiredRole || 'higher privileges'}`
    }
    return 'Access denied. You don\'t have permission to view this page.'
  }

  const getRedirectPath = () => {
    if (!userRole) return '/login'
    
    // Redirect based on user role
    switch (userRole) {
      case 'client':
      case 'user':
        return '/bookings'
      case 'barber':
      case 'individual_barber':
        return '/dashboard'
      case 'admin':
      case 'shop_owner':
      case 'shop_manager':
        return '/dashboard'
      case 'super_admin':
      case 'platform_admin':
        return '/admin'
      default:
        return '/dashboard'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <LockClosedIcon className="w-6 h-6 mr-3" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {getErrorMessage()}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {userRole ? (
                <>
                  Current role: <span className="font-medium">{getRoleDisplayName(userRole)}</span>
                </>
              ) : (
                'Please log in to continue'
              )}
            </p>
          </div>

          {attemptedPath && (
            <Alert>
              <AlertDescription>
                You attempted to access: <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{attemptedPath}</code>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => router.push(getRedirectPath())}
              variant="primary"
              className="flex-1"
            >
              <HomeIcon className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>

          {!userRole && (
            <div className="text-center">
              <Button
                onClick={() => router.push('/login')}
                variant="secondary"
                size="sm"
              >
                Login to Access More Features
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Component to show access control notifications
 */
function AccessControlNotifications() {
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      const error = searchParams.get('error')
      if (error === 'access_denied') {
        setShowNotification(true)
        // Auto-hide after 5 seconds
        setTimeout(() => setShowNotification(false), 5000)
      }
    }
  }, [])

  if (!showNotification) return null

  return (
    <div className="fixed top-4 right-4 z-50">
      <Alert className="max-w-sm">
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertDescription>
          Access denied to the requested page. You've been redirected to an appropriate section.
        </AlertDescription>
      </Alert>
    </div>
  )
}

/**
 * Higher-order component to wrap pages with access control
 */
export function withAccessControl<T extends object>(
  Component: React.ComponentType<T>,
  requiredRoles?: UserRole[]
) {
  return function AccessControlledComponent(props: T) {
    return (
      <AccessControl requiredRoles={requiredRoles}>
        <Component {...props} />
      </AccessControl>
    )
  }
}

/**
 * Hook to check current user's access to a specific path
 */
export function useAccessControl(path?: string) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const currentPath = path || (typeof window !== 'undefined' ? window.location.pathname : '/')

  const [accessInfo, setAccessInfo] = useState<{
    hasAccess: boolean
    requiresAuth: boolean
    redirectTo?: string
    isChecking: boolean
  }>({
    hasAccess: false,
    requiresAuth: true,
    isChecking: true
  })

  useEffect(() => {
    if (isLoading) return

    const accessCheck = checkRouteAccess(currentPath, user?.role || null, isAuthenticated)
    setAccessInfo({
      hasAccess: accessCheck.hasAccess,
      requiresAuth: accessCheck.requiresAuth,
      redirectTo: accessCheck.redirectTo,
      isChecking: false
    })
  }, [currentPath, user?.role, isAuthenticated, isLoading])

  return accessInfo
}