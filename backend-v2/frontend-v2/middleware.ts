import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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
]

// List of routes that require admin role
const adminRoutes = ['/admin']

// Forbidden routes that should redirect (Homepage consolidation enforcement)
const FORBIDDEN_ROUTES: Record<string, string> = {
  // V1 routes (redirect to V2)
  '/auth/signup': '/register',
  '/auth/signin': '/login',
  '/auth/login': '/login',
  
  // Demo routes (disabled per consolidation plan)
  '/demo': '/',
  '/demo/login': '/login',
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
  
  // Block access to demo routes entirely (per consolidation plan)
  const demoRoutes = ['/demo', '/try-demo', '/live-demo']
  if (demoRoutes.some(route => path.startsWith(route))) {
    const url = new URL('/', request.url)
    url.searchParams.set('error', 'demo_disabled')
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚫 Blocked demo route per consolidation plan: ${path} → /`)
    }
    
    return NextResponse.redirect(url, 301)
  }
  
  // ==================== AUTHENTICATION HANDLING ====================
  
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
  const protectedRoutes = ['/dashboard', '/appointments', '/clients', '/analytics', '/settings', '/calendar']
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))
  
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
  
  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // ==================== DEVELOPMENT DEBUGGING ====================
  
  if (process.env.NODE_ENV === 'development') {
    // Add debug headers
    response.headers.set('X-Debug-Route', path)
    response.headers.set('X-Debug-Auth', hasToken ? 'true' : 'false')
    
    // Log all requests for debugging
    console.log(`📍 ${request.method} ${path} [${hasToken ? 'AUTH' : 'ANON'}]`)
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