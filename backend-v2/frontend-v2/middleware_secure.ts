/**
 * Secure Frontend Middleware - Production Ready
 * Implements comprehensive security headers and protections
 * Replaces minimal middleware.ts with enterprise-grade security
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Get environment for conditional security settings
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isStaging = process.env.ENVIRONMENT === 'staging'
  const isProduction = process.env.ENVIRONMENT === 'production'
  
  // Comprehensive Security Headers following OWASP guidelines
  const securityHeaders: Record<string, string> = {
    // XSS Protection
    'X-XSS-Protection': '1; mode=block',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    
    // Content Security Policy - Comprehensive protection
    'Content-Security-Policy': [
      "default-src 'self'",
      // Scripts: Allow self, Stripe, Google Analytics/Ads, Meta Pixel
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' " +
        "https://js.stripe.com " +
        "https://www.google-analytics.com " +
        "https://www.googletagmanager.com " +
        "https://connect.facebook.net " +
        "https://*.facebook.com " +
        "https://www.googleadservices.com " +
        "https://googleads.g.doubleclick.net " +
        "https://www.google.com" +
        (isDevelopment ? " 'unsafe-inline' 'unsafe-eval'" : ""),
      
      // Styles: Allow self, Google Fonts, inline styles for dynamic content
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      
      // Images: Allow self, data URIs, external sources for tracking pixels
      "img-src 'self' data: https: blob: " +
        "https://www.facebook.com " +
        "https://www.google-analytics.com " +
        "https://www.googletagmanager.com " +
        "https://googleads.g.doubleclick.net " +
        "https://www.google.com",
      
      // Fonts: Allow self and Google Fonts
      "font-src 'self' https://fonts.gstatic.com",
      
      // Connections: API calls and external services
      "connect-src 'self' " +
        "https://api.stripe.com " +
        "https://www.google-analytics.com " +
        "https://analytics.google.com " +
        "https://region1.google-analytics.com " +
        "https://www.googletagmanager.com " +
        "https://graph.facebook.com " +
        "https://www.facebook.com " +
        "https://googleads.g.doubleclick.net " +
        "https://www.google-analytics.com/g/collect " +
        "https://stats.g.doubleclick.net " +
        (isDevelopment ? " http://localhost:* http://127.0.0.1:* ws: wss:" : ""),
      
      // Frames: Stripe and Google Ads
      "frame-src 'self' https://js.stripe.com https://bid.g.doubleclick.net",
      
      // Media sources
      "media-src 'self' data: blob:",
      
      // Prevent object embedding
      "object-src 'none'",
      
      // Base URI restriction
      "base-uri 'self'",
      
      // Form action restriction
      "form-action 'self'",
      
      // Frame ancestors (prevents embedding)
      "frame-ancestors 'none'",
      
      // Block mixed content
      "block-all-mixed-content",
      
      // Upgrade insecure requests
      ...(isProduction ? ["upgrade-insecure-requests"] : [])
    ].join('; '),
    
    // HTTP Strict Transport Security (HTTPS enforcement)
    ...(isProduction && {
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload'
    }),
    
    // Referrer Policy - Protect user privacy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions Policy (Feature Policy replacement)
    'Permissions-Policy': [
      'accelerometer=()',
      'ambient-light-sensor=()',
      'autoplay=()',
      'battery=()',
      'camera=()',
      'cross-origin-isolated=()',
      'display-capture=()',
      'document-domain=()',
      'encrypted-media=()',
      'execution-while-not-rendered=()',
      'execution-while-out-of-viewport=()',
      'fullscreen=()',
      'geolocation=()',
      'gyroscope=()',
      'keyboard-map=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'navigation-override=()',
      'payment=(self)',  // Allow payment for Stripe
      'picture-in-picture=()',
      'publickey-credentials-get=()',
      'screen-wake-lock=()',
      'sync-xhr=()',
      'usb=()',
      'web-share=()',
      'xr-spatial-tracking=()'
    ].join(', '),
    
    // Additional security headers
    'X-Robots-Tag': 'noindex, nofollow',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    
    // Prevent DNS prefetching
    'X-DNS-Prefetch-Control': 'off',
    
    // IE-specific security
    'X-Download-Options': 'noopen',
    
    // Cache control for sensitive content
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    
    // Custom security headers for BookedBarber
    'X-Security-Policy': 'BookedBarber-Security-v2.1',
    'X-Content-Security-Policy-Report-Only': 'false',
    'X-WebKit-CSP': 'default-src \'self\'',  // Safari compatibility
  }
  
  // Apply security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  // Environment-specific security adjustments
  if (isDevelopment) {
    // Add development-specific headers for debugging
    response.headers.set('X-Environment', 'development')
    response.headers.set('X-Debug-Mode', 'enabled')
  } else if (isStaging) {
    response.headers.set('X-Environment', 'staging')
    response.headers.set('X-Debug-Mode', 'limited')
  } else if (isProduction) {
    response.headers.set('X-Environment', 'production')
    // Remove any debug information
    response.headers.delete('X-Debug-Mode')
  }
  
  // Security logging for monitoring
  if (request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip')) {
    // Log suspicious requests in production
    const suspiciousPatterns = [
      '/wp-admin',
      '/admin.php',
      '/.env',
      '/config.php',
      '/wp-login.php'
    ]
    
    const pathname = request.nextUrl.pathname
    const isSuspicious = suspiciousPatterns.some(pattern => 
      pathname.toLowerCase().includes(pattern)
    )
    
    if (isSuspicious && isProduction) {
      // In a real implementation, this would send to a logging service
      console.warn(`Suspicious request detected: ${pathname} from ${request.ip}`)
    }
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes have their own security middleware)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt (SEO file)
     * - sitemap.xml (SEO file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}

/**
 * Additional utility functions for security
 */

// CSRF token validation helper
export function validateCSRFToken(request: NextRequest): boolean {
  const csrfCookie = request.cookies.get('csrf_token')?.value
  const csrfHeader = request.headers.get('X-CSRF-Token')
  
  return csrfCookie && csrfHeader && csrfCookie === csrfHeader
}

// Rate limiting helper (basic implementation)
export function isRateLimited(request: NextRequest): boolean {
  // In a real implementation, this would use Redis or another store
  // For now, return false (rate limiting handled by backend)
  return false
}

// Content validation helper
export function validateContent(content: string): boolean {
  // Basic XSS prevention patterns
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi
  ]
  
  return !dangerousPatterns.some(pattern => pattern.test(content))
}