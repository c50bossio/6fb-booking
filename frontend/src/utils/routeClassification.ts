/**
 * Route Classification Utilities
 *
 * This file contains utilities for classifying routes and determining
 * which layout components should be used for different pages.
 */

// Route patterns for different types of pages
export const ROUTE_PATTERNS = {
  // Public routes that don't require authentication
  PUBLIC: [
    '/',
    '/login',
    '/signup',
    '/register',
    '/forgot-password',
    '/emergency-login',
    '/simple-login',
    '/book',
    '/demo',
    '/booking-demo',
    '/calendar-demo',
    '/simple-calendar-demo',
    '/enhanced-calendar-demo',
    '/demo-google-calendar',
    '/contact',
    '/about',
    '/privacy',
    '/terms',
    '/security',
    '/test-public',
    '/landing'
  ],

  // Dashboard routes that should use the sidebar layout
  DASHBOARD: [
    '/dashboard',
    '/appointments',
    '/calendar',
    '/clients',
    '/analytics',
    '/settings',
    '/profile',
    '/admin',
    '/barber',
    '/customer',
    '/reports',
    '/payouts',
    '/payments',
    '/notifications',
    '/staff',
    '/services',
    '/inventory',
    '/schedule'
  ],

  // Routes that should never show sidebar (even if authenticated)
  NO_SIDEBAR: [
    '/login',
    '/register',
    '/forgot-password',
    '/emergency-login',
    '/simple-login',
    '/',
    '/landing',
    '/book',
    '/demo',
    '/booking-demo',
    '/calendar-demo',
    '/simple-calendar-demo',
    '/enhanced-calendar-demo',
    '/demo-google-calendar'
  ]
} as const

/**
 * Check if a route is a public route (doesn't require authentication)
 */
export function isPublicRoute(pathname: string): boolean {
  return ROUTE_PATTERNS.PUBLIC.some(route => {
    if (pathname === route) return true
    if (pathname.startsWith(route + '/')) return true
    return false
  })
}

/**
 * Check if a route is a dashboard route (should use dashboard layout)
 */
export function isDashboardRoute(pathname: string): boolean {
  return ROUTE_PATTERNS.DASHBOARD.some(route => {
    if (pathname === route) return true
    if (pathname.startsWith(route + '/')) return true
    return false
  })
}

/**
 * Check if a route should show the sidebar
 */
export function shouldShowSidebar(pathname: string): boolean {
  // Don't show sidebar for explicitly excluded routes
  const isNoSidebarRoute = ROUTE_PATTERNS.NO_SIDEBAR.some(route => {
    if (pathname === route) return true
    if (pathname.startsWith(route + '/')) return true
    return false
  })

  if (isNoSidebarRoute) return false

  // Show sidebar for dashboard routes
  return isDashboardRoute(pathname)
}

/**
 * Get the route type for debugging/logging purposes
 */
export function getRouteType(pathname: string): 'public' | 'dashboard' | 'protected' | 'unknown' {
  if (isPublicRoute(pathname)) return 'public'
  if (isDashboardRoute(pathname)) return 'dashboard'
  if (!isPublicRoute(pathname)) return 'protected'
  return 'unknown'
}

/**
 * Get all dashboard routes (for navigation menu generation)
 */
export function getDashboardRoutes(): readonly string[] {
  return ROUTE_PATTERNS.DASHBOARD
}

/**
 * Get all public routes (for middleware and auth checks)
 */
export function getPublicRoutes(): readonly string[] {
  return ROUTE_PATTERNS.PUBLIC
}

/**
 * Check if a route requires authentication
 */
export function requiresAuth(pathname: string): boolean {
  return !isPublicRoute(pathname)
}

/**
 * Check if a route should have a specific layout behavior
 */
export function getLayoutBehavior(pathname: string) {
  return {
    isPublic: isPublicRoute(pathname),
    isDashboard: isDashboardRoute(pathname),
    shouldShowSidebar: shouldShowSidebar(pathname),
    requiresAuth: requiresAuth(pathname),
    routeType: getRouteType(pathname)
  }
}
