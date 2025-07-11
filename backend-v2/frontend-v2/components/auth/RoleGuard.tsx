'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import { UserRole } from '@/lib/navigation'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  redirectTo?: string
  fallback?: React.ReactNode
  showError?: boolean
}

/**
 * Role-based access control component that protects routes based on user roles
 * 
 * Features:
 * - Checks user authentication status
 * - Validates user role against allowed roles
 * - Redirects unauthorized users to appropriate pages
 * - Shows loading states during authentication checks
 * - Provides fallback content for unauthorized access
 */
export default function RoleGuard({
  children,
  allowedRoles = [],
  redirectTo,
  fallback,
  showError = true
}: RoleGuardProps) {
  const { user, isAuthenticated, isLoading, error } = useAuth()
  const router = useRouter()
  const [hasCheckedAccess, setHasCheckedAccess] = useState(false)

  useEffect(() => {
    if (isLoading) {
      setHasCheckedAccess(false)
      return
    }

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/'
      const loginUrl = redirectTo || `/login?redirect=${encodeURIComponent(currentPath)}`
      router.push(loginUrl)
      return
    }

    // If no roles specified, allow all authenticated users
    if (allowedRoles.length === 0) {
      setHasCheckedAccess(true)
      return
    }

    // Check if user has required role
    const userRole = user?.role
    if (!userRole) {
      setHasCheckedAccess(false)
      return
    }

    // Role hierarchy and equivalence mapping
    const roleMapping: Record<string, string[]> = {
      // Platform-level roles
      'super_admin': ['super_admin', 'admin', 'barber', 'user'],
      'platform_admin': ['super_admin', 'admin', 'barber', 'user'],
      
      // Business owner roles
      'enterprise_owner': ['super_admin', 'admin', 'barber', 'user'],
      'shop_owner': ['admin', 'barber', 'user'],
      'individual_barber': ['barber', 'user'],
      
      // Staff roles
      'shop_manager': ['admin', 'barber', 'user'],
      'barber': ['barber', 'user'],
      'receptionist': ['barber', 'user'], // Can manage appointments
      
      // Client roles
      'client': ['user'],
      'user': ['user']
    }

    // Get equivalent roles for the user's role
    const equivalentRoles = roleMapping[userRole] || [userRole]

    // Check if user has access
    const hasAccess = allowedRoles.some(role => equivalentRoles.includes(role))

    if (!hasAccess) {
      // Redirect to appropriate page based on role
      let redirectPath = redirectTo || '/'
      
      if (userRole === 'user' || userRole === 'client') {
        redirectPath = '/dashboard'
      } else if (equivalentRoles.includes('barber')) {
        redirectPath = '/dashboard'
      } else if (equivalentRoles.includes('admin')) {
        redirectPath = '/dashboard'
      }

      // Add error parameter to show access denied message
      const redirectUrl = `${redirectPath}?error=access_denied&attempted=${encodeURIComponent(window.location.pathname)}`
      router.push(redirectUrl)
      return
    }

    setHasCheckedAccess(true)
  }, [isAuthenticated, isLoading, user, allowedRoles, router, redirectTo])

  // Show loading while checking authentication
  if (isLoading || !hasCheckedAccess) {
    return <PageLoading message="Checking access permissions..." />
  }

  // Show error if authentication failed
  if (error && showError) {
    return (
      <ErrorDisplay 
        error={`Authentication error: ${error}`} 
        onRetry={() => window.location.reload()}
      />
    )
  }

  // Show fallback content if provided and not authenticated
  if (!isAuthenticated && fallback) {
    return <>{fallback}</>
  }

  // If we get here, user is authenticated and has access
  return <>{children}</>
}

/**
 * Hook to check if current user has specific role(s)
 */
export function useRole(requiredRoles: UserRole[]): {
  hasRole: boolean
  userRole: string | null
  isLoading: boolean
} {
  const { user, isLoading } = useAuth()
  
  const userRole = user?.role || null
  
  // Role hierarchy mapping (same as above)
  const roleMapping: Record<string, string[]> = {
    'super_admin': ['super_admin', 'admin', 'barber', 'user'],
    'platform_admin': ['super_admin', 'admin', 'barber', 'user'],
    'enterprise_owner': ['super_admin', 'admin', 'barber', 'user'],
    'shop_owner': ['admin', 'barber', 'user'],
    'individual_barber': ['barber', 'user'],
    'shop_manager': ['admin', 'barber', 'user'],
    'barber': ['barber', 'user'],
    'receptionist': ['barber', 'user'],
    'client': ['user'],
    'user': ['user']
  }

  const equivalentRoles = userRole ? (roleMapping[userRole] || [userRole]) : []
  const hasRole = requiredRoles.some(role => equivalentRoles.includes(role))

  return {
    hasRole,
    userRole,
    isLoading
  }
}

/**
 * Component to conditionally render content based on user role
 */
export function RoleBasedContent({
  children,
  allowedRoles,
  fallback = null
}: {
  children: React.ReactNode
  allowedRoles: UserRole[]
  fallback?: React.ReactNode
}) {
  const { hasRole, isLoading } = useRole(allowedRoles)

  if (isLoading) {
    return null // Don't show anything while loading
  }

  if (!hasRole) {
    return <>{fallback}</>
  }

  return <>{children}</>
}