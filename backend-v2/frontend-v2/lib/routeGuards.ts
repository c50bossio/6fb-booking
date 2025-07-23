import { User } from './api'
import { canAccessRoute, getUserBusinessFunction, type UserRole } from './role-utils'

// Route permissions are now handled by the centralized role utilities
// This eliminates the need for redundant permission arrays

/**
 * Streamlined route permission checking using centralized role utilities
 */
export function hasRoutePermission(
  pathname: string, 
  user: User | null, 
  isPublicRoute: boolean = false
): { allowed: boolean; redirectTo?: string; reason?: string } {
  // Allow access to public routes without authentication
  if (isPublicRoute) {
    return { allowed: true }
  }

  // Require authentication for protected routes
  if (!user) {
    return { 
      allowed: false, 
      redirectTo: '/login',
      reason: 'Authentication required'
    }
  }

  // Use centralized route access control
  const userRole = user.role || 'user'
  const hasAccess = canAccessRoute(userRole, pathname)
  
  if (!hasAccess) {
    // Get appropriate redirect based on user's business function
    const redirectTo = getDefaultDashboard(user)
    
    return { 
      allowed: false, 
      redirectTo,
      reason: `Access denied for role: ${userRole}`
    }
  }

  return { allowed: true }
}

/**
 * Simplified role checking functions using centralized utilities
 */
export function isAdmin(user: User | null): boolean {
  if (!user?.role) return false
  const businessFunction = getUserBusinessFunction(user.role)
  return businessFunction === 'system' || businessFunction === 'owner' || businessFunction === 'manager'
}

export function isStaff(user: User | null): boolean {
  if (!user?.role) return false
  const businessFunction = getUserBusinessFunction(user.role)
  return ['system', 'owner', 'manager', 'provider'].includes(businessFunction)
}

export function isUser(user: User | null): boolean {
  if (!user?.role) return false
  const businessFunction = getUserBusinessFunction(user.role)
  return businessFunction === 'client'
}

/**
 * Get user's optimal dashboard route based on their business function
 */
export function getDefaultDashboard(user: User | null): string {
  if (!user?.role) return '/login'
  
  const businessFunction = getUserBusinessFunction(user.role)
  
  switch (businessFunction) {
    case 'system':
      return '/admin' // Super admin, platform admin
    case 'owner':
      return '/enterprise/dashboard' // Enterprise owner -> enterprise dashboard
    case 'manager':
      return '/admin' // Shop manager -> admin panel
    case 'provider':
      return '/dashboard' // Barbers, individual barbers, receptionists
    case 'client':
      return '/dashboard' // Clients use standard dashboard
    case 'viewer':
    default:
      return '/dashboard' // Default fallback
  }
}

/**
 * Get navigation items based on user role (DEPRECATED)
 * 
 * This function is deprecated. Use the centralized navigation system from:
 * @see /lib/navigation.ts - filterNavigationByRole()
 * @see /lib/navigation.ts - getMobileNavigationTabs()
 * @see /lib/navigation.ts - getQuickActionsForRole()
 * 
 * The new system provides better performance, caching, and consistency.
 */
export function getNavigationItems(user: User | null) {
  console.warn('getNavigationItems() is deprecated. Use filterNavigationByRole() from /lib/navigation.ts instead.')
  
  if (!user) return []
  
  // Return minimal fallback navigation
  return [
    { name: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { name: 'Settings', href: '/settings', icon: 'settings' },
  ]
}