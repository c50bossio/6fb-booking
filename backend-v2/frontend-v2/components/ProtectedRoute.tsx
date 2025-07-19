'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { User } from '@/lib/api'
import { hasRoutePermission, getDefaultDashboard } from '@/lib/routeGuards'

interface ProtectedRouteProps {
  children: React.ReactNode
  user: User | null
  loading: boolean
}

export function ProtectedRoute({ children, user, loading }: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [redirecting, setRedirecting] = useState(false)

  // Define public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password']
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/reset-password/')

  useEffect(() => {
    // Don't check permissions while loading or if already redirecting
    if (loading || redirecting) return

    // Check route permission
    const permission = hasRoutePermission(pathname, user, isPublicRoute)

    if (!permission.allowed && permission.redirectTo) {
      setRedirecting(true)
      
      // Add a small delay to prevent flash
      setTimeout(() => {
        router.replace(permission.redirectTo!)
      }, 100)
    }
  }, [pathname, user, loading, redirecting, isPublicRoute, router])

  // Show loading while checking permissions or redirecting
  if (loading || redirecting) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-surface-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-gray-800 dark:text-gray-200 text-sm">
            {redirecting ? 'Redirecting...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  // Check final permission
  const permission = hasRoutePermission(pathname, user, isPublicRoute)
  
  if (!permission.allowed) {
    // This should not happen due to the useEffect redirect, but provide fallback
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-surface-100 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="mb-4">
            <svg 
              className="w-16 h-16 text-red-500 mx-auto" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
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
            Access Denied
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            {permission.reason || 'You do not have permission to access this page.'}
          </p>
          <button
            onClick={() => router.push(permission.redirectTo || getDefaultDashboard(user))}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Utility component for role-based conditional rendering
interface RoleGuardProps {
  children: React.ReactNode
  user: User | null
  allowedRoles: string[]
  fallback?: React.ReactNode
}

export function RoleGuard({ children, user, allowedRoles, fallback = null }: RoleGuardProps) {
  const userRole = user?.role || ''
  
  if (allowedRoles.includes(userRole)) {
    return <>{children}</>
  }
  
  return <>{fallback}</>
}

// Hook for checking permissions in components
export function usePermissions(user: User | null) {
  const pathname = usePathname()
  
  const hasPermission = (path?: string) => {
    const checkPath = path || pathname
    const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password']
    const isPublic = publicRoutes.includes(checkPath) || checkPath.startsWith('/reset-password/')
    
    return hasRoutePermission(checkPath, user, isPublic).allowed
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const isStaff = user?.role === 'barber' || user?.role === 'admin' || user?.role === 'super_admin'
  const isUser = user?.role === 'user'

  return {
    hasPermission,
    isAdmin,
    isStaff,
    isUser,
    userRole: user?.role || null
  }
}