import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { enhancedAuthMiddleware } from './lib/auth-middleware'

/**
 * Enhanced Next.js Middleware with Homepage Consolidation Enforcement
 * 
 * This middleware enforces the homepage consolidation plan by:
 * 1. Redirecting forbidden routes to their correct destinations
 * 2. Blocking access to deprecated/demo routes
 * 3. Ensuring consistent routing across the application
 * 4. Managing authentication flows
 * 
 * Part of the permanent homepage consolidation enforcement infrastructure.
 */

// ==================== ROUTE DEFINITIONS ====================

// List of routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/check-email',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/book',
  '/terms',
  '/privacy', 
  '/cookies',
  '/offline',
  '/calendar-showcase',
  '/calendar', // Allow calendar to always show full interface
  '/test-modal', // Temporary for testing ShareBookingModal
  '/service-worker.js',
  '/manifest.json',
]

// List of routes that require admin role
const adminRoutes = ['/admin']

// Forbidden routes that should redirect (Homepage consolidation enforcement)
const FORBIDDEN_ROUTES: Record<string, string> = {
  // V1 routes (redirect to V2)
  '/auth/signup': '/register',
  '/auth/signin': '/login',
  '/auth/login': '/login',
  
  // Deprecated demo routes only
  '/try-demo': '/',
  '/live-demo': '/',
  
  // Old booking routes
  '/booking': '/book',
  '/bookings/new': '/book',
  
  // Misc redirects
  '/signup': '/register',
  '/signin': '/login',
  '/trial': '/register'
}

// ==================== MIDDLEWARE FUNCTION ====================

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // ==================== HOMEPAGE CONSOLIDATION ENFORCEMENT ====================
  
  // Check if this route should be redirected (permanent homepage consolidation)
  const redirectTarget = FORBIDDEN_ROUTES[path]
  if (redirectTarget) {
    const url = new URL(redirectTarget, request.url)
    
    // Log redirect for debugging (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔀 Homepage Consolidation Redirect: ${path} → ${redirectTarget}`)
    }
    
    return NextResponse.redirect(url, 301) // Permanent redirect
  }
  
  // Block access to deprecated demo routes only
  const blockedDemoRoutes = ['/try-demo', '/live-demo']
  // Allow all /demo/* routes for development and showcasing
  
  if (blockedDemoRoutes.some(route => path.startsWith(route))) {
    const url = new URL('/', request.url)
    url.searchParams.set('error', 'demo_disabled')
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚫 Blocked deprecated demo route: ${path} → /`)
    }
    
    return NextResponse.redirect(url, 301)
  }
  
  // ==================== ENHANCED AUTHENTICATION HANDLING ====================
  
  // Try enhanced auth middleware first (role-based access control)
  const enhancedResponse = enhancedAuthMiddleware(request)
  if (enhancedResponse) {
    return enhancedResponse
  }
  
  // Fallback to basic authentication handling
  // Check localStorage token via custom header or cookie
  // Since middleware runs on server, we check for token in different ways
  const tokenFromCookie = request.cookies.get('token')?.value
  const authHeader = request.headers.get('authorization')
  const hasToken = tokenFromCookie || authHeader?.startsWith('Bearer ')

  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route => path === route || path.startsWith(route + '/'))
  
  // Check if the route is admin-only
  const isAdminRoute = adminRoutes.some(route => path === route || path.startsWith(route + '/'))

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/appointments', '/clients', '/analytics', '/settings']
  const isProtectedRoute = protectedRoutes.some(route => path === route || path.startsWith(route + '/'))
  
  // Simplified auth page handling - always allow access to login/register
  // Let the frontend handle auth state validation
  if (path === '/login' || path === '/register') {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔓 Allowing access to auth page: ${path}`)
    }
    // Don't redirect - let users access login page directly
  }
  
  // Redirect unauthenticated users from protected pages (to login)
  if (!hasToken && isProtectedRoute) {
    const url = new URL('/login', request.url)
    url.searchParams.set('redirect', path) // Remember where they wanted to go
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 Unauthenticated user redirected to login: ${path} → /login`)
    }
    return NextResponse.redirect(url)
  }
  
  // Only redirect if explicitly trying to access admin without any auth indication
  if (isAdminRoute && !hasToken && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ==================== SECURITY HEADERS ====================
  
  const response = NextResponse.next()
  
  // Add service worker headers for proper caching
  if (path === '/service-worker.js') {
    response.headers.set('Service-Worker-Allowed', '/')
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  }
  
  // Add PWA headers for manifest
  if (path === '/manifest.json') {
    response.headers.set('Content-Type', 'application/manifest+json')
  }
  
  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // ==================== DEVELOPMENT DEBUGGING ====================
  
  if (process.env.NODE_ENV === 'development') {
    // Enhanced debugging with role and token info
    const userRoleCookie = request.cookies.get('user_role')?.value
    const tokenCookie = request.cookies.get('token')?.value
    
    // Add debug headers
    response.headers.set('X-Debug-Route', path)
    response.headers.set('X-Debug-Auth', hasToken ? 'true' : 'false')
    response.headers.set('X-Debug-Role', userRoleCookie || 'none')
    response.headers.set('X-Debug-Token-Present', tokenCookie ? 'true' : 'false')
    
    // Enhanced logging for authentication debugging
    if (path.includes('/calendar') || path.includes('/dashboard')) {
      console.log(`🔍 ${request.method} ${path} [${hasToken ? 'AUTH' : 'ANON'}] Role: ${userRoleCookie || 'none'}`)
      
      if (tokenCookie) {
        try {
          // Quick JWT payload inspection for debugging
          const payload = JSON.parse(Buffer.from(tokenCookie.split('.')[1], 'base64').toString())
          console.log(`🔑 Token Info: sub=${payload.sub}, role=${payload.role || 'missing'}, exp=${payload.exp}`)
        } catch (e) {
          console.log(`⚠️ Token parsing failed: ${e}`)
        }
      }
    } else {
      // Normal logging for other routes
      console.log(`📍 ${request.method} ${path} [${hasToken ? 'AUTH' : 'ANON'}]`)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}