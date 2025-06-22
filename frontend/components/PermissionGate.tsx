/**
 * Permission-based access control component
 * Conditionally renders children based on user permissions or roles
 */
'use client'

import React from 'react'
import { useAuth } from './AuthProvider'
import { Permission, Role } from '@/lib/api/auth'

interface PermissionGateProps {
  children: React.ReactNode
  permission?: Permission | string
  permissions?: (Permission | string)[]
  role?: Role | string
  roles?: (Role | string)[]
  requireAll?: boolean // If true, user must have ALL permissions/roles
  fallback?: React.ReactNode
  resourceType?: 'client' | 'appointment' | 'payment'
  resourceId?: number
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  children,
  permission,
  permissions,
  role,
  roles,
  requireAll = false,
  fallback = null,
  resourceType,
  resourceId,
}) => {
  const { hasPermission, hasRole, canAccessResource } = useAuth()

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    const hasPermissions = requireAll
      ? permissions.every(p => hasPermission(p))
      : permissions.some(p => hasPermission(p))
    
    if (!hasPermissions) {
      return <>{fallback}</>
    }
  }

  // Check single role
  if (role && !hasRole(role)) {
    return <>{fallback}</>
  }

  // Check multiple roles
  if (roles && roles.length > 0) {
    const hasRoles = requireAll
      ? roles.every(r => hasRole(r))
      : roles.some(r => hasRole(r))
    
    if (!hasRoles) {
      return <>{fallback}</>
    }
  }

  // Check resource access
  if (resourceType && !canAccessResource(resourceType, resourceId)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Convenience components for common permission checks
export const AdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback = null 
}) => (
  <PermissionGate roles={[Role.SUPER_ADMIN, Role.ADMIN]} fallback={fallback}>
    {children}
  </PermissionGate>
)

export const SuperAdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback = null 
}) => (
  <PermissionGate role={Role.SUPER_ADMIN} fallback={fallback}>
    {children}
  </PermissionGate>
)

export const MentorOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback = null 
}) => (
  <PermissionGate roles={[Role.SUPER_ADMIN, Role.ADMIN, Role.MENTOR]} fallback={fallback}>
    {children}
  </PermissionGate>
)

export const BarberAccess: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback = null 
}) => (
  <PermissionGate roles={[Role.SUPER_ADMIN, Role.ADMIN, Role.MENTOR, Role.BARBER]} fallback={fallback}>
    {children}
  </PermissionGate>
)

export const StaffAccess: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({ 
  children, 
  fallback = null 
}) => (
  <PermissionGate roles={[Role.SUPER_ADMIN, Role.ADMIN, Role.MENTOR, Role.BARBER, Role.STAFF]} fallback={fallback}>
    {children}
  </PermissionGate>
)

// Permission-based button wrapper
interface SecureButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission?: Permission | string
  permissions?: (Permission | string)[]
  role?: Role | string
  roles?: (Role | string)[]
  requireAll?: boolean
  children: React.ReactNode
}

export const SecureButton: React.FC<SecureButtonProps> = ({
  permission,
  permissions,
  role,
  roles,
  requireAll = false,
  children,
  ...buttonProps
}) => {
  return (
    <PermissionGate
      permission={permission}
      permissions={permissions}
      role={role}
      roles={roles}
      requireAll={requireAll}
    >
      <button {...buttonProps}>
        {children}
      </button>
    </PermissionGate>
  )
}

// Permission-based link wrapper
interface SecureLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  permission?: Permission | string
  permissions?: (Permission | string)[]
  role?: Role | string
  roles?: (Role | string)[]
  requireAll?: boolean
  children: React.ReactNode
}

export const SecureLink: React.FC<SecureLinkProps> = ({
  permission,
  permissions,
  role,
  roles,
  requireAll = false,
  children,
  ...linkProps
}) => {
  return (
    <PermissionGate
      permission={permission}
      permissions={permissions}
      role={role}
      roles={roles}
      requireAll={requireAll}
    >
      <a {...linkProps}>
        {children}
      </a>
    </PermissionGate>
  )
}

export default PermissionGate