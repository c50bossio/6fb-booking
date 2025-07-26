import { UserRole } from './navigation'

/**
 * Role-based access control configuration
 * Defines which roles can access which routes
 */

export interface RouteAccess {
  path: string
  allowedRoles: UserRole[]
  requiresAuth: boolean
  redirectTo?: string
  description?: string
}

/**
 * Comprehensive route access control configuration
 * Routes are organized by permission level from most restrictive to least restrictive
 */
export const routeAccessControl: RouteAccess[] = [
  // ==================== SUPER ADMIN ONLY ====================
  {
    path: '/admin/users',
    allowedRoles: ['super_admin', 'platform_admin'],
    requiresAuth: true,
    description: 'User management and role assignment'
  },
  {
    path: '/enterprise',
    allowedRoles: ['super_admin', 'enterprise_owner'],
    requiresAuth: true,
    description: 'Multi-location enterprise management'
  },
  {
    path: '/admin/webhooks',
    allowedRoles: ['super_admin', 'platform_admin'],
    requiresAuth: true,
    description: 'System webhook configuration'
  },
  {
    path: '/tools',
    allowedRoles: ['super_admin', 'platform_admin'],
    requiresAuth: true,
    description: 'Advanced business tools'
  },

  // ==================== ADMIN LEVEL ====================
  {
    path: '/admin',
    allowedRoles: ['admin', 'super_admin', 'platform_admin', 'shop_owner', 'shop_manager'],
    requiresAuth: true,
    description: 'Administration dashboard'
  },
  {
    path: '/admin/services',
    allowedRoles: ['admin', 'super_admin', 'shop_owner', 'shop_manager'],
    requiresAuth: true,
    description: 'Service management'
  },
  {
    path: '/admin/booking-rules',
    allowedRoles: ['admin', 'super_admin', 'shop_owner', 'shop_manager'],
    requiresAuth: true,
    description: 'Booking rule configuration'
  },
  {
    path: '/services/dashboard',
    allowedRoles: ['admin', 'super_admin', 'shop_owner', 'shop_manager', 'barber'],
    requiresAuth: true,
    description: 'Service analytics and management'
  },
  {
    path: '/customers',
    allowedRoles: ['admin', 'super_admin', 'shop_owner', 'shop_manager'],
    requiresAuth: true,
    description: 'Customer management hub'
  },
  {
    path: '/marketing',
    allowedRoles: ['admin', 'super_admin', 'shop_owner', 'shop_manager'],
    requiresAuth: true,
    description: 'Marketing suite'
  },
  {
    path: '/commissions',
    allowedRoles: ['admin', 'super_admin', 'shop_owner'],
    requiresAuth: true,
    description: 'Commission structure management'
  },
  {
    path: '/payouts',
    allowedRoles: ['admin', 'super_admin', 'shop_owner'],
    requiresAuth: true,
    description: 'Barber payout management'
  },
  {
    path: '/reviews',
    allowedRoles: ['admin', 'super_admin', 'shop_owner', 'shop_manager'],
    requiresAuth: true,
    description: 'Review management'
  },
  {
    path: '/products',
    allowedRoles: ['admin', 'super_admin', 'shop_owner', 'shop_manager'],
    requiresAuth: true,
    description: 'Product catalog management'
  },
  {
    path: '/import',
    allowedRoles: ['admin', 'super_admin', 'shop_owner'],
    requiresAuth: true,
    description: 'Data import tools'
  },
  {
    path: '/export',
    allowedRoles: ['admin', 'super_admin', 'shop_owner'],
    requiresAuth: true,
    description: 'Data export tools'
  },

  // ==================== BARBER LEVEL ====================
  {
    path: '/clients',
    allowedRoles: ['barber', 'admin', 'super_admin', 'shop_owner', 'shop_manager', 'receptionist'],
    requiresAuth: true,
    description: 'Client management'
  },
  {
    path: '/barber/availability',
    allowedRoles: ['barber', 'admin', 'super_admin', 'individual_barber'],
    requiresAuth: true,
    description: 'Barber availability management'
  },
  {
    path: '/barber/earnings',
    allowedRoles: ['barber', 'individual_barber'],
    requiresAuth: true,
    description: 'Barber earnings dashboard'
  },
  {
    path: '/calendar',
    allowedRoles: [],
    requiresAuth: false,
    description: 'Public calendar that always shows full interface'
  },
  {
    path: '/appointments',
    allowedRoles: ['barber', 'admin', 'super_admin', 'shop_owner', 'shop_manager', 'receptionist', 'individual_barber'],
    requiresAuth: true,
    description: 'Appointment management'
  },
  {
    path: '/notifications',
    allowedRoles: ['barber', 'admin', 'super_admin', 'shop_owner', 'shop_manager', 'receptionist'],
    requiresAuth: true,
    description: 'Send notifications'
  },
  {
    path: '/recurring',
    allowedRoles: ['barber', 'admin', 'super_admin', 'shop_owner', 'shop_manager'],
    requiresAuth: true,
    description: 'Recurring appointment management'
  },
  {
    path: '/compliance',
    allowedRoles: ['barber', 'admin', 'super_admin', 'shop_owner', 'individual_barber'],
    requiresAuth: true,
    description: 'Six Figure Barber compliance tracking'
  },

  // ==================== AUTHENTICATED USERS ====================
  {
    path: '/dashboard',
    allowedRoles: ['user', 'client', 'barber', 'admin', 'super_admin', 'shop_owner', 'shop_manager', 'receptionist', 'individual_barber', 'enterprise_owner', 'platform_admin'],
    requiresAuth: true,
    description: 'Main dashboard'
  },
  {
    path: '/bookings',
    allowedRoles: ['user', 'client'],
    requiresAuth: true,
    redirectTo: '/dashboard',
    description: 'Client booking management'
  },
  {
    path: '/analytics',
    allowedRoles: ['barber', 'admin', 'super_admin', 'shop_owner', 'shop_manager', 'individual_barber'],
    requiresAuth: true,
    description: 'Business analytics'
  },
  {
    path: '/finance',
    allowedRoles: ['barber', 'admin', 'super_admin', 'shop_owner', 'shop_manager', 'individual_barber'],
    requiresAuth: true,
    description: 'Financial management'
  },
  {
    path: '/payments',
    allowedRoles: ['barber', 'admin', 'super_admin', 'shop_owner', 'shop_manager', 'individual_barber'],
    requiresAuth: true,
    description: 'Payment management'
  },
  {
    path: '/settings',
    allowedRoles: ['user', 'client', 'barber', 'admin', 'super_admin', 'shop_owner', 'shop_manager', 'receptionist', 'individual_barber', 'enterprise_owner', 'platform_admin'],
    requiresAuth: true,
    description: 'User settings'
  },

  // ==================== PUBLIC ROUTES ====================
  {
    path: '/',
    allowedRoles: [],
    requiresAuth: false,
    description: 'Homepage'
  },
  {
    path: '/login',
    allowedRoles: [],
    requiresAuth: false,
    description: 'Login page'
  },
  {
    path: '/register',
    allowedRoles: [],
    requiresAuth: false,
    description: 'Registration page'
  },
  {
    path: '/book',
    allowedRoles: [],
    requiresAuth: false,
    description: 'Public booking page'
  },
  {
    path: '/terms',
    allowedRoles: [],
    requiresAuth: false,
    description: 'Terms of service'
  },
  {
    path: '/privacy',
    allowedRoles: [],
    requiresAuth: false,
    description: 'Privacy policy'
  },
  {
    path: '/cookies',
    allowedRoles: [],
    requiresAuth: false,
    description: 'Cookie policy'
  },
  {
    path: '/calendar-showcase',
    allowedRoles: [],
    requiresAuth: false,
    description: 'Calendar demo page'
  },
  {
    path: '/test-modal',
    allowedRoles: [],
    requiresAuth: false,
    description: 'ShareBookingModal test page'
  }
]

/**
 * Check if a user has access to a specific route
 */
export function checkRouteAccess(
  pathname: string,
  userRole: string | null,
  isAuthenticated: boolean
): {
  hasAccess: boolean
  requiresAuth: boolean
  redirectTo?: string
  matchedRoute?: RouteAccess
} {
  // Find the most specific matching route
  let matchedRoute: RouteAccess | undefined
  
  // Sort routes by specificity (longer paths first)
  const sortedRoutes = [...routeAccessControl].sort((a, b) => b.path.length - a.path.length)
  
  for (const route of sortedRoutes) {
    if (pathname === route.path || pathname.startsWith(route.path + '/')) {
      matchedRoute = route
      break
    }
  }

  // If no specific route found, default to requiring authentication
  if (!matchedRoute) {
    return {
      hasAccess: isAuthenticated,
      requiresAuth: true,
      redirectTo: '/login'
    }
  }

  // Check authentication requirement
  if (matchedRoute.requiresAuth && !isAuthenticated) {
    return {
      hasAccess: false,
      requiresAuth: true,
      redirectTo: matchedRoute.redirectTo || '/login',
      matchedRoute
    }
  }

  // If no roles specified, allow all authenticated users (or everyone if public)
  if (matchedRoute.allowedRoles.length === 0) {
    return {
      hasAccess: true,
      requiresAuth: matchedRoute.requiresAuth,
      matchedRoute
    }
  }

  // Check role-based access
  if (!userRole) {
    return {
      hasAccess: false,
      requiresAuth: matchedRoute.requiresAuth,
      redirectTo: matchedRoute.redirectTo || '/dashboard',
      matchedRoute
    }
  }

  // Role hierarchy mapping
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

  const equivalentRoles = roleMapping[userRole] || [userRole]
  const hasAccess = matchedRoute.allowedRoles.some(role => equivalentRoles.includes(role))

  return {
    hasAccess,
    requiresAuth: matchedRoute.requiresAuth,
    redirectTo: matchedRoute.redirectTo || '/dashboard',
    matchedRoute
  }
}

/**
 * Get user-friendly role name
 */
export function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    'super_admin': 'Super Administrator',
    'platform_admin': 'Platform Administrator',
    'enterprise_owner': 'Enterprise Owner',
    'shop_owner': 'Shop Owner',
    'individual_barber': 'Individual Barber',
    'shop_manager': 'Shop Manager',
    'barber': 'Barber',
    'receptionist': 'Receptionist',
    'client': 'Client',
    'user': 'User'
  }

  return roleNames[role] || role
}

/**
 * Get routes accessible to a specific role
 */
export function getRoutesForRole(userRole: string): RouteAccess[] {
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

  const equivalentRoles = roleMapping[userRole] || [userRole]

  return routeAccessControl.filter(route => {
    // Public routes (no roles required)
    if (route.allowedRoles.length === 0) {
      return true
    }
    
    // Check if user has any of the required roles
    return route.allowedRoles.some(role => equivalentRoles.includes(role))
  })
}