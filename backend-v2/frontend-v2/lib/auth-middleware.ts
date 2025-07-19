import { NextRequest, NextResponse } from 'next/server'
import { checkRouteAccess } from './access-control'

/**
 * Enhanced authentication middleware that integrates with role-based access control
 * This complements the existing middleware.ts file
 */

export function enhancedAuthMiddleware(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname
  
  // Skip API routes and static files
  if (
    path.startsWith('/api/') ||
    path.startsWith('/_next/') ||
    path.startsWith('/static/') ||
    path.includes('.')
  ) {
    return null
  }

  // Extract authentication information
  const tokenFromCookie = request.cookies.get('token')?.value
  const authHeader = request.headers.get('authorization')
  const hasToken = !!(tokenFromCookie || authHeader?.startsWith('Bearer '))

  // Try to extract user role from token (if available)
  // Note: In a real implementation, you'd decode the JWT token
  // For now, we'll assume the role is passed via a header or cookie
  const userRole = request.cookies.get('user_role')?.value || 
                  request.headers.get('x-user-role') || 
                  null

  // Check route access
  const accessCheck = checkRouteAccess(path, userRole, hasToken)

  // If access is denied, redirect appropriately
  if (!accessCheck.hasAccess) {
    const redirectUrl = new URL(accessCheck.redirectTo || '/login', request.url)
    
    // Add context for better error handling
    if (accessCheck.requiresAuth && !hasToken) {
      redirectUrl.searchParams.set('error', 'authentication_required')
      redirectUrl.searchParams.set('redirect', path)
    } else if (hasToken && !accessCheck.hasAccess) {
      redirectUrl.searchParams.set('error', 'insufficient_permissions')
      redirectUrl.searchParams.set('required_role', accessCheck.matchedRoute?.allowedRoles.join(',') || '')
      redirectUrl.searchParams.set('attempted_path', path)
    }

    // Log access denial for debugging
    if (process.env.NODE_ENV === 'development') {
      || 'authenticated'}`)
    }

    return NextResponse.redirect(redirectUrl)
  }

  // Add security headers for authenticated routes
  if (accessCheck.requiresAuth && hasToken) {
    const response = NextResponse.next()
    
    // Add role-based security headers
    response.headers.set('X-User-Role', userRole || 'unknown')
    response.headers.set('X-Route-Access', 'granted')
    
    // Add CSP headers for admin routes
    if (userRole === 'admin' || userRole === 'super_admin') {
      response.headers.set('X-Admin-Access', 'true')
    }

    return response
  }

  // Allow access
  return null
}

/**
 * Extract user role from JWT token
 * This is a simplified version - in production, you'd properly decode the JWT
 */
export function extractUserRoleFromToken(token: string): string | null {
  try {
    // In a real implementation, you'd decode the JWT token
    // For now, we'll return null and rely on API calls to get user role
    return null
  } catch (error) {
    return null
  }
}

/**
 * Create a response with access control headers
 */
export function createAccessControlResponse(
  request: NextRequest,
  userRole: string | null,
  hasAccess: boolean
): NextResponse {
  const response = NextResponse.next()
  
  // Add debug headers in development
  if (process.env.NODE_ENV === 'development') {
    response.headers.set('X-Debug-Path', request.nextUrl.pathname)
    response.headers.set('X-Debug-Role', userRole || 'none')
    response.headers.set('X-Debug-Access', hasAccess ? 'granted' : 'denied')
  }

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Add role-specific headers
  if (userRole) {
    response.headers.set('X-User-Role', userRole)
  }

  return response
}

/**
 * Check if a path requires elevated permissions
 */
export function requiresElevatedPermissions(path: string): boolean {
  const elevatedPaths = [
    '/admin',
    '/enterprise',
    '/tools',
    '/settings/integrations',
    '/settings/security',
    '/commissions',
    '/payouts'
  ]

  return elevatedPaths.some(elevatedPath => 
    path === elevatedPath || path.startsWith(elevatedPath + '/')
  )
}

/**
 * Log access attempts for security monitoring
 */
export function logAccessAttempt(
  request: NextRequest,
  userRole: string | null,
  granted: boolean,
  reason?: string
): void {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString()
    const ip = request.ip || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    }
  
  // In production, you'd send this to a logging service
  // Example: send to Sentry, DataDog, or CloudWatch
}