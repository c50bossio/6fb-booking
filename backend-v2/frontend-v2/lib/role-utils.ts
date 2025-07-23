/**
 * Centralized Role and Permission Utilities
 * =========================================
 * 
 * Provides consistent role checking and permission validation across the application.
 * Part of Phase 3 role system consolidation.
 */

import { UserRole } from './navigation'

// Role hierarchy constants for better maintainability
export const ROLE_HIERARCHY = {
  SYSTEM: ['super_admin', 'platform_admin'],
  BUSINESS_OWNERS: ['enterprise_owner', 'shop_owner'],
  MANAGERS: ['shop_manager'],
  SERVICE_PROVIDERS: ['individual_barber', 'barber', 'receptionist'],
  CLIENTS: ['client', 'user'],
  LIMITED: ['viewer']
} as const

// Permission levels based on business logic
export const PERMISSION_LEVELS = {
  FULL_ACCESS: ['super_admin', 'enterprise_owner'],
  BUSINESS_ADMIN: ['admin', 'shop_owner', 'shop_manager'],
  SERVICE_ACCESS: ['admin', 'barber', 'individual_barber', 'receptionist'],
  CLIENT_ACCESS: ['client', 'user'],
  READ_ONLY: ['viewer']
} as const

// Cached permission checks for performance
const permissionCache = new Map<string, boolean>()

/**
 * Check if a user has a specific permission level
 */
export function hasPermission(userRole: string, requiredLevel: keyof typeof PERMISSION_LEVELS): boolean {
  const cacheKey = `${userRole}-${requiredLevel}`
  
  if (permissionCache.has(cacheKey)) {
    return permissionCache.get(cacheKey)!
  }
  
  const allowedRoles = PERMISSION_LEVELS[requiredLevel]
  const result = allowedRoles.includes(userRole as any)
  
  permissionCache.set(cacheKey, result)
  return result
}

/**
 * Check if user can access admin features
 */
export function canAccessAdmin(userRole: string): boolean {
  return hasPermission(userRole, 'BUSINESS_ADMIN') || hasPermission(userRole, 'FULL_ACCESS')
}

/**
 * Check if user can access service management
 */
export function canManageServices(userRole: string): boolean {
  return hasPermission(userRole, 'SERVICE_ACCESS') || 
         hasPermission(userRole, 'BUSINESS_ADMIN') || 
         hasPermission(userRole, 'FULL_ACCESS')
}

/**
 * Check if user can access financial features
 */
export function canAccessFinance(userRole: string): boolean {
  return hasPermission(userRole, 'SERVICE_ACCESS') ||
         hasPermission(userRole, 'BUSINESS_ADMIN') || 
         hasPermission(userRole, 'FULL_ACCESS')
}

/**
 * Check if user can access client management
 */
export function canManageClients(userRole: string): boolean {
  return hasPermission(userRole, 'SERVICE_ACCESS') ||
         hasPermission(userRole, 'BUSINESS_ADMIN') || 
         hasPermission(userRole, 'FULL_ACCESS')
}

/**
 * Check if user can access analytics
 */
export function canAccessAnalytics(userRole: string): boolean {
  return hasPermission(userRole, 'SERVICE_ACCESS') ||
         hasPermission(userRole, 'BUSINESS_ADMIN') || 
         hasPermission(userRole, 'FULL_ACCESS')
}

/**
 * Check if user can access marketing features
 */
export function canAccessMarketing(userRole: string): boolean {
  return hasPermission(userRole, 'BUSINESS_ADMIN') || 
         hasPermission(userRole, 'FULL_ACCESS')
}

/**
 * Check if user has enterprise-level access
 */
export function canAccessEnterprise(userRole: string): boolean {
  return hasPermission(userRole, 'FULL_ACCESS')
}

/**
 * Get user's primary business function based on role
 */
export function getUserBusinessFunction(userRole: string): 'system' | 'owner' | 'manager' | 'provider' | 'client' | 'viewer' {
  if (ROLE_HIERARCHY.SYSTEM.includes(userRole as any)) return 'system'
  if (ROLE_HIERARCHY.BUSINESS_OWNERS.includes(userRole as any)) return 'owner'
  if (ROLE_HIERARCHY.MANAGERS.includes(userRole as any)) return 'manager'
  if (ROLE_HIERARCHY.SERVICE_PROVIDERS.includes(userRole as any)) return 'provider'
  if (ROLE_HIERARCHY.CLIENTS.includes(userRole as any)) return 'client'
  return 'viewer'
}

/**
 * Get simplified role for UI display
 */
export function getDisplayRole(userRole: string): string {
  const roleMapping: Record<string, string> = {
    'super_admin': 'Super Admin',
    'admin': 'Admin',
    'platform_admin': 'Platform Admin',
    'enterprise_owner': 'Enterprise Owner',
    'shop_owner': 'Shop Owner',
    'individual_barber': 'Independent Barber',
    'shop_manager': 'Manager',
    'barber': 'Barber',
    'receptionist': 'Receptionist',
    'client': 'Client',
    'user': 'Client',
    'viewer': 'Viewer'
  }
  
  return roleMapping[userRole] || 'User'
}

/**
 * Check if two roles have the same permission level
 */
export function rolesAreEquivalent(role1: string, role2: string): boolean {
  const getPermissionScore = (role: string): number => {
    if (hasPermission(role, 'FULL_ACCESS')) return 5
    if (hasPermission(role, 'BUSINESS_ADMIN')) return 4
    if (hasPermission(role, 'SERVICE_ACCESS')) return 3
    if (hasPermission(role, 'CLIENT_ACCESS')) return 2
    return 1 // READ_ONLY
  }
  
  return getPermissionScore(role1) === getPermissionScore(role2)
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(userRole: string): string[] {
  const permissions: string[] = []
  
  if (hasPermission(userRole, 'FULL_ACCESS')) {
    permissions.push('full_access', 'business_admin', 'service_access', 'client_access')
  } else if (hasPermission(userRole, 'BUSINESS_ADMIN')) {
    permissions.push('business_admin', 'service_access', 'client_access')
  } else if (hasPermission(userRole, 'SERVICE_ACCESS')) {
    permissions.push('service_access', 'client_access')
  } else if (hasPermission(userRole, 'CLIENT_ACCESS')) {
    permissions.push('client_access')
  }
  
  return permissions
}

/**
 * Clear permission cache (call when role system changes)
 */
export function clearPermissionCache() {
  permissionCache.clear()
}

/**
 * Role-based route access control
 */
export function canAccessRoute(userRole: string, route: string): boolean {
  // Define route access patterns
  const routeAccess: Record<string, (role: string) => boolean> = {
    '/admin': canAccessAdmin,
    '/enterprise': canAccessEnterprise,
    '/marketing': canAccessMarketing,
    '/analytics': canAccessAnalytics,
    '/clients': canManageClients,
    '/services': canManageServices,
    '/payments': canAccessFinance,
    '/finance': canAccessFinance
  }
  
  // Find matching route pattern
  const pattern = Object.keys(routeAccess).find(path => route.startsWith(path))
  
  if (!pattern) {
    // Default: allow access to basic routes for authenticated users
    return true
  }
  
  return routeAccess[pattern](userRole)
}

/**
 * Export commonly used role checking functions
 */
export const roleUtils = {
  hasPermission,
  canAccessAdmin,
  canManageServices,
  canAccessFinance,
  canManageClients,
  canAccessAnalytics,
  canAccessMarketing,
  canAccessEnterprise,
  getUserBusinessFunction,
  getDisplayRole,
  rolesAreEquivalent,
  getRolePermissions,
  canAccessRoute,
  clearCache: clearPermissionCache
} as const

export default roleUtils