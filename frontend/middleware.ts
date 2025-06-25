import { NextRequest, NextResponse } from 'next/server';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/forgot-password',
  '/register',
  '/emergency-login',
  '/simple-login',
  '/', // Landing page
  '/book', // Public booking pages
  '/demo', // Demo calendar pages
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
  '/test-public', // Test page for debugging
  '/landing' // Server-rendered landing page
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Special handling for root path
  if (pathname === '/' || pathname === '') {
    const response = NextResponse.next();
    response.headers.set('X-Public-Route', 'true');
    response.headers.set('X-Is-Landing-Page', 'true');
    setupSecurityHeaders(response, request);
    return response;
  }

  // Check if the current route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => {
    if (pathname === route) return true;
    if (pathname.startsWith(route + '/')) return true;
    return false;
  });

  // For public routes, proceed without any auth checks
  if (isPublicRoute) {
    const response = NextResponse.next();
    // Set a header to indicate this is a public route (for debugging)
    response.headers.set('X-Public-Route', 'true');
    setupSecurityHeaders(response, request);
    return response;
  }

  // For protected routes, proceed normally (AuthProvider will handle client-side auth)
  const response = NextResponse.next();
  setupSecurityHeaders(response, request);
  return response;
}

function setupSecurityHeaders(response: NextResponse, request: NextRequest) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Development-friendly CSP that allows browser extensions
  const developmentCSP = `
    default-src 'self' 'unsafe-inline' 'unsafe-eval';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob: chrome-extension: moz-extension:;
    style-src 'self' 'unsafe-inline' https: chrome-extension: moz-extension:;
    font-src 'self' https: data: chrome-extension: moz-extension:;
    img-src 'self' data: https: blob: chrome-extension: moz-extension:;
    connect-src 'self' http://localhost:* https: ws://localhost:* wss://localhost:* chrome-extension: moz-extension:;
    frame-src 'self' https: chrome-extension: moz-extension:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
  `.replace(/\s{2,}/g, ' ').trim();

  // Production CSP with strict security
  const productionCSP = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://cdn.tailwindcss.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https: blob:;
    connect-src 'self' https://api.stripe.com https://api.tremendous.com wss: ws:;
    frame-src 'self' https://js.stripe.com https://hooks.stripe.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  // Use appropriate CSP based on environment
  const cspHeader = isDevelopment ? developmentCSP : productionCSP;
  response.headers.set('Content-Security-Policy', cspHeader);

  // Additional security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', isDevelopment ? 'SAMEORIGIN' : 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Development-only headers to help with extension compatibility
  if (isDevelopment) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // Add header to help identify development mode in browser DevTools
    response.headers.set('X-Development-Mode', 'true');
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     *
     * This includes the root path '/'
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    '/',
  ],
};
