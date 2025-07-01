import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// List of routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/book',
  '/calendar', // Added temporarily for testing
  '/calendar-debug', // Added temporarily for testing
]

// List of routes that require admin role
const adminRoutes = ['/admin']

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // Check localStorage token via custom header or cookie
  // Since middleware runs on server, we check for token in different ways
  const tokenFromCookie = request.cookies.get('token')?.value
  const authHeader = request.headers.get('authorization')
  const hasToken = tokenFromCookie || authHeader?.startsWith('Bearer ')

  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route => path === route || path.startsWith(route + '/'))
  
  // Check if the route is admin-only
  const isAdminRoute = adminRoutes.some(route => path === route || path.startsWith(route + '/'))

  // For now, we'll use a lighter approach since localStorage is client-side only
  // The actual auth check happens in the components via API calls
  
  // Only redirect if explicitly trying to access admin without any auth indication
  if (isAdminRoute && !hasToken && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
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