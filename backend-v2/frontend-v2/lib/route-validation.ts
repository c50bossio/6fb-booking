/**
 * Route Validation System
 * 
 * Enforces proper routing and prevents broken links.
 * Part of the homepage consolidation enforcement infrastructure.
 */

// ==================== ROUTE DEFINITIONS ====================

/**
 * Valid application routes
 * This is the single source of truth for all routes
 */
export const VALID_ROUTES = {
  // Public routes
  home: '/',
  login: '/login',
  register: '/register',
  
  // Legal/policy routes
  terms: '/terms',
  privacy: '/privacy',
  cookies: '/cookies',
  
  // Authenticated routes
  dashboard: '/dashboard',
  appointments: '/appointments',
  clients: '/clients',
  analytics: '/analytics',
  settings: '/settings',
  'settings/privacy': '/settings/privacy',
  
  // Booking flow
  book: '/book',
  'book/confirm': '/book/confirm',
  'book/payment': '/book/payment',
  'book/success': '/book/success',
  
  // API routes (for reference)
  'api/auth/login': '/api/v2/auth/login',
  'api/auth/register': '/api/v2/auth/register',
  'api/appointments': '/api/v2/appointments',
  'api/bookings': '/api/v2/bookings'
} as const

/**
 * Deprecated/forbidden routes that should redirect
 */
export const FORBIDDEN_ROUTES = {
  // V1 routes (redirect to V2)
  '/auth/signup': '/register',
  '/auth/signin': '/login',
  '/auth/login': '/login',
  
  // Demo routes (disabled)
  '/demo': '/',
  '/demo/login': '/login',
  '/try-demo': '/',
  
  // Old booking routes
  '/booking': '/book',
  '/bookings/new': '/book',
  
  // Misc redirects
  '/signup': '/register',
  '/signin': '/login',
  '/trial': '/register'
} as const

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Validates if a route is allowed
 */
export function isValidRoute(route: string): boolean {
  // Check if route is in valid routes
  const validRoutes = Object.values(VALID_ROUTES)
  if (validRoutes.includes(route)) {
    return true
  }
  
  // Check if it's a valid dynamic route pattern
  if (isValidDynamicRoute(route)) {
    return true
  }
  
  return false
}

/**
 * Checks if a route matches valid dynamic patterns
 */
function isValidDynamicRoute(route: string): boolean {
  const dynamicPatterns = [
    /^\/appointments\/[a-zA-Z0-9-]+$/, // /appointments/[id]
    /^\/clients\/[a-zA-Z0-9-]+$/, // /clients/[id]
    /^\/settings\/[a-zA-Z0-9-]+$/, // /settings/[section]
    /^\/book\/[a-zA-Z0-9-]+$/, // /book/[step]
  ]
  
  return dynamicPatterns.some(pattern => pattern.test(route))
}

/**
 * Gets redirect target for forbidden routes
 */
export function getRedirectTarget(route: string): string | null {
  return FORBIDDEN_ROUTES[route as keyof typeof FORBIDDEN_ROUTES] || null
}

/**
 * Validates and potentially redirects a route
 */
export function validateAndRedirect(route: string): string {
  // Check if route is forbidden and needs redirect
  const redirectTarget = getRedirectTarget(route)
  if (redirectTarget) {
    return redirectTarget
  }
  
  // Check if route is valid
  if (isValidRoute(route)) {
    return route
  }
  
  // Default redirect to home for invalid routes
  return '/'
}

// ==================== ROUTE BUILDING HELPERS ====================

/**
 * Type-safe route builder
 */
export function buildRoute<T extends keyof typeof VALID_ROUTES>(
  routeKey: T,
  params?: Record<string, string>
): string {
  let route = VALID_ROUTES[routeKey]
  
  // Replace parameters in route
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      route = route.replace(`[${key}]`, value) as typeof route
    })
  }
  
  return route
}

/**
 * Get all valid routes for sitemap generation
 */
export function getAllValidRoutes(): string[] {
  return Object.values(VALID_ROUTES)
}

/**
 * Get all forbidden routes for redirect setup
 */
export function getAllForbiddenRoutes(): Record<string, string> {
  return FORBIDDEN_ROUTES
}

// ==================== MIDDLEWARE HELPERS ====================

/**
 * Check if a request should be redirected
 * Used in Next.js middleware
 */
export function shouldRedirect(pathname: string): { redirect: boolean; destination?: string } {
  const redirectTarget = getRedirectTarget(pathname)
  
  if (redirectTarget) {
    return { redirect: true, destination: redirectTarget }
  }
  
  return { redirect: false }
}

/**
 * Validate route accessibility based on auth status
 */
export function validateRouteAccess(route: string, isAuthenticated: boolean): {
  allowed: boolean
  redirectTo?: string
} {
  const protectedRoutes = [
    '/dashboard',
    '/appointments',
    '/clients',
    '/analytics',
    '/settings'
  ]
  
  const authRoutes = ['/login', '/register']
  
  // Redirect authenticated users away from auth pages
  if (isAuthenticated && authRoutes.some(authRoute => route.startsWith(authRoute))) {
    return { allowed: false, redirectTo: '/dashboard' }
  }
  
  // Redirect unauthenticated users from protected pages
  if (!isAuthenticated && protectedRoutes.some(protectedRoute => route.startsWith(protectedRoute))) {
    return { allowed: false, redirectTo: '/login' }
  }
  
  return { allowed: true }
}

// ==================== DEVELOPMENT UTILITIES ====================

/**
 * Debug function to check all routes
 * Only runs in development
 */
export function debugRoutes(): void {
  if (process.env.NODE_ENV !== 'development') {
    return
  }
  
  console.group('🛣️ Route Validation Debug')
  
  )
  // Test some common routes
  const testRoutes = ['/', '/login', '/register', '/demo', '/auth/signup', '/invalid-route']
  
  testRoutes.forEach(route => {
    const isValid = isValidRoute(route)
    const redirect = getRedirectTarget(route)
    const final = validateAndRedirect(route)
    
    })
  
  console.groupEnd()
}

// ==================== LINK COMPONENT INTEGRATION ====================

/**
 * Enhanced Link props with validation
 */
export interface ValidatedLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  [key: string]: any
}

/**
 * Validates href prop before rendering Link
 * Throws error in development for invalid routes
 */
export function validateLinkHref(href: string): string {
  const validatedRoute = validateAndRedirect(href)
  
  if (process.env.NODE_ENV === 'development' && validatedRoute !== href) {
    }
  
  return validatedRoute
}

// ==================== ERROR HANDLING ====================

/**
 * Route validation errors
 */
export class RouteValidationError extends Error {
  constructor(route: string, reason: string) {
    super(`Route validation failed for '${route}': ${reason}`)
    this.name = 'RouteValidationError'
  }
}

/**
 * Validate route and throw error if invalid (development only)
 */
export function strictValidateRoute(route: string): void {
  if (process.env.NODE_ENV !== 'development') {
    return
  }
  
  if (!isValidRoute(route)) {
    const redirectTarget = getRedirectTarget(route)
    if (redirectTarget) {
      throw new RouteValidationError(route, `Route is forbidden. Should redirect to: ${redirectTarget}`)
    } else {
      throw new RouteValidationError(route, 'Route is not defined in VALID_ROUTES')
    }
  }
}

// ==================== EXPORTS ====================

export default {
  VALID_ROUTES,
  FORBIDDEN_ROUTES,
  isValidRoute,
  getRedirectTarget,
  validateAndRedirect,
  buildRoute,
  getAllValidRoutes,
  getAllForbiddenRoutes,
  shouldRedirect,
  validateRouteAccess,
  validateLinkHref,
  strictValidateRoute,
  debugRoutes
}