'use client'

import React, { ReactNode } from 'react'
import { usePermissions, Permission } from '@/hooks/usePermissions'
import { useAuth } from '@/hooks/useAuth'

interface PermissionGuardProps {
  children: ReactNode
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  fallback?: ReactNode
  organizationId?: number
}

/**
 * Component to conditionally render children based on permissions
 * 
 * @example
 * // Single permission
 * <PermissionGuard permission={Permission.MANAGE_BILLING}>
 *   <BillingSettings />
 * </PermissionGuard>
 * 
 * @example
 * // Multiple permissions (ANY)
 * <PermissionGuard permissions={[Permission.VIEW_STAFF, Permission.MANAGE_STAFF]}>
 *   <StaffList />
 * </PermissionGuard>
 * 
 * @example
 * // Multiple permissions (ALL)
 * <PermissionGuard permissions={[Permission.VIEW_BILLING, Permission.MANAGE_BILLING]} requireAll>
 *   <BillingManagement />
 * </PermissionGuard>
 */
export function PermissionGuard({
  children,
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  organizationId
}: PermissionGuardProps) {
  const { isAuthenticated } = useAuth()
  const permissionHook = usePermissions(organizationId)

  // Not authenticated
  if (!isAuthenticated) {
    return <>{fallback}</>
  }

  // Check single permission
  if (permission) {
    if (!permissionHook.hasPermission(permission)) {
      return <>{fallback}</>
    }
    return <>{children}</>
  }

  // Check multiple permissions
  if (permissions.length > 0) {
    const hasAccess = requireAll
      ? permissionHook.hasAllPermissions(permissions)
      : permissionHook.hasAnyPermission(permissions)
    
    if (!hasAccess) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}

interface RoleBasedGuardProps {
  children: ReactNode
  allowedRoles?: string[]
  fallback?: ReactNode
}

/**
 * Legacy role-based guard for backward compatibility
 * 
 * @deprecated Use PermissionGuard instead
 */
export function RoleBasedGuard({
  children,
  allowedRoles = [],
  fallback = null
}: RoleBasedGuardProps) {
  const { user } = useAuth()
  
  if (!user || !allowedRoles.includes(user.unified_role || user.role)) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

interface BusinessOwnerGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Guard specifically for business owners
 */
export function BusinessOwnerGuard({ children, fallback = null }: BusinessOwnerGuardProps) {
  const permissions = usePermissions()
  
  if (!permissions.isBusinessOwner()) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

interface StaffGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Guard specifically for staff members
 */
export function StaffGuard({ children, fallback = null }: StaffGuardProps) {
  const permissions = usePermissions()
  
  if (!permissions.isStaffMember()) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

interface SystemAdminGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Guard specifically for system administrators
 */
export function SystemAdminGuard({ children, fallback = null }: SystemAdminGuardProps) {
  const permissions = usePermissions()
  
  if (!permissions.isSystemAdmin()) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

/**
 * HOC for protecting components with permissions
 * 
 * @example
 * const ProtectedBilling = withPermission(BillingComponent, Permission.MANAGE_BILLING)
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: Permission,
  fallback?: ReactNode
) {
  return function ProtectedComponent(props: P) {
    return (
      <PermissionGuard permission={permission} fallback={fallback}>
        <Component {...props} />
      </PermissionGuard>
    )
  }
}

/**
 * HOC for protecting components with multiple permissions
 */
export function withPermissions<P extends object>(
  Component: React.ComponentType<P>,
  permissions: Permission[],
  requireAll = false,
  fallback?: ReactNode
) {
  return function ProtectedComponent(props: P) {
    return (
      <PermissionGuard permissions={permissions} requireAll={requireAll} fallback={fallback}>
        <Component {...props} />
      </PermissionGuard>
    )
  }
}

// Permission error component
export function PermissionDenied({ message = "You don't have permission to access this feature" }: { message?: string }) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="text-center">
        <svg 
          className="w-16 h-16 text-red-500 mx-auto mb-4" 
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Access Denied
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {message}
        </p>
      </div>
    </div>
  )
}