// This file configures Sentry for client-side error tracking and performance monitoring
// Learn more at: https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Set tracesSampleRate to 1.0 to capture 100% of the transactions for performance monitoring
  // Adjust this value in production to balance performance vs cost
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Set profilesSampleRate to 1.0 to profile 100% of the transactions
  // This requires tracesSampleRate to be set above 0
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  // Set environment and release information
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  release: process.env.BUILD_VERSION || '1.0.0',

  // Error filtering and sampling
  beforeSend(event) {
    // Filter out non-critical errors in production
    if (process.env.NODE_ENV === 'production') {
      // Skip certain error types that are not actionable
      if (event.exception?.values?.[0]?.value?.includes('ResizeObserver loop limit exceeded')) {
        return null
      }
      
      // Skip network errors that might be user connection issues
      if (event.exception?.values?.[0]?.value?.includes('Network Error')) {
        return null
      }
      
      // Skip chunk loading errors (usually deployment-related)
      if (event.exception?.values?.[0]?.value?.includes('Loading chunk')) {
        return null
      }
    }
    
    return event
  },

  // Configure integrations
  integrations: [
    // Automatic breadcrumbs for console, DOM events, etc.
    Sentry.breadcrumbsIntegration({
      console: true,
      dom: true,
      history: true,
      fetch: true,
      xhr: true,
    }),
    
    // Browser profiling integration
    Sentry.browserProfilingIntegration(),
    
    // Replay integration for session replay (disabled by default, enable carefully)
    ...(process.env.NEXT_PUBLIC_SENTRY_ENABLE_REPLAY === 'true' ? [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
        maskAllInputs: true,
      })
    ] : []),
  ],

  // Replay settings
  replaysSessionSampleRate: 0.01, // 1% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Custom tags for better error categorization
  initialScope: {
    tags: {
      component: 'frontend',
      platform: 'nextjs',
      version: process.env.BUILD_VERSION || '1.0.0',
    },
  },

  // Performance monitoring configuration
  beforeSendTransaction(event) {
    // Filter out non-essential transactions in production
    if (process.env.NODE_ENV === 'production') {
      // Skip very fast transactions (likely not performance issues)
      if (event.start_timestamp && event.timestamp) {
        const duration = (event.timestamp - event.start_timestamp) * 1000
        if (duration < 50) { // Less than 50ms
          return null
        }
      }
    }
    
    return event
  },

  // Configure allowed URLs for better error attribution
  allowUrls: [
    /https?:\/\/(.+\.)?bookedbarber\.com/,
    /https?:\/\/(.+\.)?localhost/,
    /https?:\/\/(.+\.)?127\.0\.0\.1/,
    /https?:\/\/(.+\.)?railway\.app/,
    /https?:\/\/(.+\.)?render\.com/,
    /https?:\/\/(.+\.)?vercel\.app/,
  ],

  // Deny certain URLs that generate noise
  denyUrls: [
    // Browser extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
    // Third-party scripts
    /google-analytics\.com/i,
    /googletagmanager\.com/i,
    /facebook\.net/i,
    /doubleclick\.net/i,
  ],

  // Transport options for better reliability
  transport: Sentry.makeBrowserOfflineTransport(Sentry.makeFetchTransport),

  // Debug mode for development
  debug: process.env.NODE_ENV === 'development',

  // Automatically capture unhandled promise rejections
  captureUnhandledRejections: true,

  // Maximum breadcrumbs to keep
  maxBreadcrumbs: 50,

  // Additional configuration for Next.js specific features
  normalizeDepth: 6, // Normalize nested objects to this depth
  attachStacktrace: true,

  // Custom instrumentation for business-critical flows
  beforeBreadcrumb(breadcrumb, hint) {
    // Add extra context for API calls
    if (breadcrumb.category === 'fetch') {
      breadcrumb.data = {
        ...breadcrumb.data,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      }
    }
    
    // Add context for user interactions
    if (breadcrumb.category === 'ui.click') {
      const target = hint?.event?.target
      if (target) {
        breadcrumb.data = {
          ...breadcrumb.data,
          elementType: target.tagName,
          elementId: target.id,
          elementClass: target.className,
        }
      }
    }
    
    return breadcrumb
  },
})