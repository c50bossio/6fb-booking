/**
 * Smart Dashboard Router
 * =====================
 * 
 * Intelligent routing system that directs users to their optimal dashboard
 * based on role, business function, and current context.
 * 
 * Part of Phase 3.3: Dashboard routing optimization.
 */

import { User } from './api'
import { getUserBusinessFunction, canAccessRoute } from './role-utils'

// Dashboard configuration for different user types
export const DASHBOARD_ROUTES = {
  // System administrators
  SYSTEM_ADMIN: '/admin',
  
  // Business owners and managers
  ENTERPRISE_OWNER: '/enterprise/dashboard',
  SHOP_OWNER: '/admin', 
  SHOP_MANAGER: '/admin',
  
  // Service providers
  INDIVIDUAL_BARBER: '/dashboard',
  STAFF_BARBER: '/dashboard',
  RECEPTIONIST: '/dashboard',
  
  // Clients
  CLIENT: '/client-dashboard',
  CLIENT_FALLBACK: '/dashboard', // If client dashboard not available
  
  // Default
  DEFAULT: '/dashboard',
  LOGIN: '/login'
} as const

// Dashboard feature availability matrix
export const DASHBOARD_FEATURES = {
  system: {
    routes: ['/admin', '/enterprise/dashboard', '/dashboard'],
    features: ['full_admin', 'enterprise_overview', 'system_management', 'all_analytics'],
    priority: 'admin_first'
  },
  owner: {
    routes: ['/enterprise/dashboard', '/admin', '/dashboard'],
    features: ['business_overview', 'multi_location', 'staff_management', 'financial_reports'],
    priority: 'enterprise_first'
  },
  manager: {
    routes: ['/admin', '/dashboard'],
    features: ['location_management', 'staff_oversight', 'operational_analytics'],
    priority: 'admin_first'
  },
  provider: {
    routes: ['/dashboard', '/barber/earnings'],
    features: ['appointment_management', 'earnings_tracking', 'client_management'],
    priority: 'dashboard_first'
  },
  client: {
    routes: ['/client-dashboard', '/dashboard'],
    features: ['appointment_booking', 'appointment_history', 'profile_management'],
    priority: 'client_first'
  },
  viewer: {
    routes: ['/dashboard'],
    features: ['read_only'],
    priority: 'basic_only'
  }
} as const

/**
 * Get the optimal dashboard route for a user
 */
export function getOptimalDashboardRoute(user: User | null, currentPath?: string): string {
  if (!user) return DASHBOARD_ROUTES.LOGIN
  
  const businessFunction = getUserBusinessFunction(user.role || 'user')
  const config = DASHBOARD_FEATURES[businessFunction]
  
  // If user is already on a valid dashboard route, keep them there
  if (currentPath && config.routes.some(route => currentPath.startsWith(route))) {
    // Ensure they still have access to current route
    if (canAccessRoute(user.role || 'user', currentPath)) {
      return currentPath
    }
  }
  
  // Find the best available route based on their role
  for (const route of config.routes) {
    if (canAccessRoute(user.role || 'user', route)) {
      return route
    }
  }
  
  // Fallback to default dashboard
  return DASHBOARD_ROUTES.DEFAULT
}

/**
 * Get dashboard configuration for a user
 */
export function getDashboardConfig(user: User | null) {
  if (!user) {
    return {
      route: DASHBOARD_ROUTES.LOGIN,
      features: [],
      businessFunction: 'viewer' as const,
      hasMultipleOptions: false
    }
  }
  
  const businessFunction = getUserBusinessFunction(user.role || 'user')
  const config = DASHBOARD_FEATURES[businessFunction]
  const availableRoutes = config.routes.filter(route => 
    canAccessRoute(user.role || 'user', route)
  )
  
  return {
    route: getOptimalDashboardRoute(user),
    features: config.features,
    businessFunction,
    availableRoutes,
    hasMultipleOptions: availableRoutes.length > 1,
    priority: config.priority
  }
}

/**
 * Get dashboard navigation options for a user
 */
export function getDashboardNavigationOptions(user: User | null) {
  if (!user) return []
  
  const config = getDashboardConfig(user)
  const options = []
  
  // Add dashboard options based on available routes
  for (const route of config.availableRoutes) {
    let name: string, description: string
    
    switch (route) {
      case '/admin':
        name = 'Admin Panel'
        description = 'Location management and settings'
        break
      case '/enterprise/dashboard':
        name = 'Enterprise Dashboard'
        description = 'Multi-location overview'
        break
      case '/client-dashboard':
        name = 'My Account'
        description = 'Bookings and preferences'
        break
      case '/dashboard':
        name = 'Dashboard'
        description = 'Main business overview'
        break
      case '/barber/earnings':
        name = 'Earnings'
        description = 'Income and payouts'
        break
      default:
        continue
    }
    
    options.push({
      name,
      description,
      route,
      isCurrent: route === config.route,
      isPrimary: config.availableRoutes.indexOf(route) === 0
    })
  }
  
  return options
}

/**
 * Smart redirect logic for dashboard routing
 */
export function getSmartRedirect(user: User | null, requestedPath: string): string | null {
  if (!user) return '/login'
  
  // If user is requesting a dashboard route
  if (requestedPath.startsWith('/dashboard') || 
      requestedPath.startsWith('/admin') || 
      requestedPath.startsWith('/enterprise')) {
    
    // Check if they have access to the requested route
    if (canAccessRoute(user.role || 'user', requestedPath)) {
      return null // No redirect needed
    }
    
    // Redirect to their optimal dashboard
    return getOptimalDashboardRoute(user)
  }
  
  // For non-dashboard routes, use existing route permission logic
  if (!canAccessRoute(user.role || 'user', requestedPath)) {
    return getOptimalDashboardRoute(user)
  }
  
  return null // No redirect needed
}

/**
 * Check if user should see dashboard switcher UI
 */
export function shouldShowDashboardSwitcher(user: User | null): boolean {
  if (!user) return false
  
  const config = getDashboardConfig(user)
  return config.hasMultipleOptions
}

/**
 * Get contextual dashboard recommendations
 */
export function getDashboardRecommendations(user: User | null, currentPath?: string) {
  if (!user) return []
  
  const businessFunction = getUserBusinessFunction(user.role || 'user')
  const config = getDashboardConfig(user)
  const recommendations = []
  
  // Context-aware recommendations
  if (currentPath?.startsWith('/admin') && businessFunction === 'owner') {
    recommendations.push({
      route: '/enterprise/dashboard',
      title: 'Try Enterprise Dashboard',
      reason: 'Better overview for multi-location management'
    })
  }
  
  if (currentPath?.startsWith('/dashboard') && businessFunction === 'system') {
    recommendations.push({
      route: '/admin',
      title: 'Switch to Admin Panel',
      reason: 'Access advanced system controls'
    })
  }
  
  return recommendations
}

/**
 * Export dashboard router utilities
 */
export const dashboardRouter = {
  getOptimalRoute: getOptimalDashboardRoute,
  getConfig: getDashboardConfig,
  getNavigationOptions: getDashboardNavigationOptions,
  getSmartRedirect,
  shouldShowSwitcher: shouldShowDashboardSwitcher,
  getRecommendations: getDashboardRecommendations,
  
  // Route constants
  routes: DASHBOARD_ROUTES,
  features: DASHBOARD_FEATURES
} as const

export default dashboardRouter