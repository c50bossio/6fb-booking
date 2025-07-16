import { User } from './api'

export type UserRole = 'user' | 'barber' | 'admin' | 'super_admin'

export interface RoutePermission {
  path: string
  allowedRoles: UserRole[]
  exact?: boolean
}

// Define route permissions
export const routePermissions: RoutePermission[] = [
  // Public routes (no authentication required)
  { path: '/', allowedRoles: ['user', 'barber', 'admin', 'super_admin'], exact: true },
  { path: '/login', allowedRoles: ['user', 'barber', 'admin', 'super_admin'] },
  { path: '/register', allowedRoles: ['user', 'barber', 'admin', 'super_admin'] },
  { path: '/forgot-password', allowedRoles: ['user', 'barber', 'admin', 'super_admin'] },
  { path: '/reset-password', allowedRoles: ['user', 'barber', 'admin', 'super_admin'] },
  
  // Admin-only routes
  { path: '/admin', allowedRoles: ['admin', 'super_admin'] },
  { path: '/enterprise', allowedRoles: ['admin', 'super_admin'] },
  
  // Barber and Admin routes
  { path: '/analytics', allowedRoles: ['barber', 'admin', 'super_admin'] },
  { path: '/clients', allowedRoles: ['barber', 'admin', 'super_admin'] },
  { path: '/notifications', allowedRoles: ['barber', 'admin', 'super_admin'] },
  { path: '/payouts', allowedRoles: ['barber', 'admin', 'super_admin'] },
  { path: '/barber-availability', allowedRoles: ['barber', 'admin', 'super_admin'] },
  { path: '/barber', allowedRoles: ['barber', 'admin', 'super_admin'] },
  { path: '/import', allowedRoles: ['barber', 'admin', 'super_admin'] },
  { path: '/export', allowedRoles: ['barber', 'admin', 'super_admin'] },
  { path: '/sms', allowedRoles: ['barber', 'admin', 'super_admin'] },
  
  // Authenticated user routes (all authenticated users)
  { path: '/dashboard', allowedRoles: ['user', 'barber', 'admin', 'super_admin'] },
  { path: '/bookings', allowedRoles: ['user', 'barber', 'admin', 'super_admin'] },
  { path: '/book', allowedRoles: ['user', 'barber', 'admin', 'super_admin'] },
  { path: '/settings', allowedRoles: ['user', 'barber', 'admin', 'super_admin'] },
  { path: '/recurring', allowedRoles: ['user', 'barber', 'admin', 'super_admin'] },
  { path: '/payments', allowedRoles: ['user', 'barber', 'admin', 'super_admin'] },
]

/**
 * Check if a user has permission to access a specific route
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

  // Find matching route permission
  const permission = routePermissions.find(route => {
    if (route.exact) {
      return route.path === pathname
    }
    return pathname.startsWith(route.path)
  })

  // If no specific permission found, allow for authenticated users (default behavior)
  if (!permission) {
    return { allowed: true }
  }

  // Check if user's role is allowed
  const userRole = user.role as UserRole
  if (!userRole || !permission.allowedRoles.includes(userRole)) {
    // Determine appropriate redirect based on user role
    let redirectTo = '/dashboard'
    
    if (userRole === 'user') {
      redirectTo = '/dashboard'
    } else if (userRole === 'barber') {
      redirectTo = '/dashboard'
    } else if (userRole === 'admin' || userRole === 'super_admin') {
      redirectTo = '/admin'
    }

    return { 
      allowed: false, 
      redirectTo,
      reason: `Access denied. Required roles: ${permission.allowedRoles.join(', ')}`
    }
  }

  return { allowed: true }
}

/**
 * Check if user has admin privileges
 */
export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin' || user?.role === 'super_admin'
}

/**
 * Check if user has barber or admin privileges
 */
export function isStaff(user: User | null): boolean {
  return user?.role === 'barber' || user?.role === 'admin' || user?.role === 'super_admin'
}

/**
 * Check if user is a regular user (customer)
 */
export function isUser(user: User | null): boolean {
  return user?.role === 'user'
}

/**
 * Get user's default dashboard route based on role
 */
export function getDefaultDashboard(user: User | null): string {
  if (!user) return '/login'
  
  // Check unified_role first (new system), fall back to legacy role
  const unifiedRole = user.unified_role
  const legacyRole = user.role as UserRole
  
  // Handle unified roles
  if (unifiedRole) {
    switch (unifiedRole) {
      case 'SUPER_ADMIN':
      case 'PLATFORM_ADMIN':
      case 'ENTERPRISE_OWNER':
        return '/admin'
      case 'SHOP_OWNER':
      case 'INDIVIDUAL_BARBER':
      case 'SHOP_MANAGER':
      case 'BARBER':
        return '/dashboard'
      case 'CLIENT':
      case 'VIEWER':
        return '/dashboard'
      default:
        // Fall through to legacy role check
        break
    }
  }
  
  // Legacy role handling
  switch (legacyRole) {
    case 'admin':
    case 'super_admin':
      return '/admin'
    case 'barber':
      return '/dashboard'
    case 'user':
    default:
      return '/dashboard'
  }
}

/**
 * Get navigation items based on user role
 */
export function getNavigationItems(user: User | null) {
  if (!user) return []

  const baseItems = [
    { name: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { name: 'Book Appointment', href: '/book', icon: 'book' },
    { name: 'My Bookings', href: '/bookings', icon: 'bookings' },
    { name: 'Settings', href: '/settings', icon: 'settings' },
  ]

  const staffItems = [
    { name: 'Analytics', href: '/analytics', icon: 'analytics' },
    { name: 'Clients', href: '/clients', icon: 'clients' },
    { name: 'Notifications', href: '/notifications', icon: 'notifications' },
    { name: 'SMS', href: '/sms', icon: 'sms' },
    { name: 'Import/Export', href: '/import', icon: 'import' },
  ]

  const barberItems = [
    { name: 'Availability', href: '/barber-availability', icon: 'availability' },
    { name: 'Payouts', href: '/payouts', icon: 'payouts' },
  ]

  const adminItems = [
    { name: 'Admin Panel', href: '/admin', icon: 'admin' },
  ]

  const enterpriseItems = [
    { name: 'Enterprise Dashboard', href: '/enterprise/dashboard', icon: 'enterprise' },
  ]

  if (user?.role === 'super_admin') {
    return [...baseItems, ...staffItems, ...barberItems, ...adminItems, ...enterpriseItems]
  } else if (isAdmin(user)) {
    return [...baseItems, ...staffItems, ...barberItems, ...adminItems]
  } else if (isStaff(user)) {
    return [...baseItems, ...staffItems, ...barberItems]
  } else {
    return baseItems
  }
}