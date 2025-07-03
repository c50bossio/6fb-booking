// This file configures Sentry for server-side error tracking and performance monitoring
// Learn more at: https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Set tracesSampleRate to capture performance data
  // Lower rate in production to manage volume and costs
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  // Set profilesSampleRate to profile server-side performance
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.02 : 1.0,

  // Set environment and release information
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  release: process.env.BUILD_VERSION || '1.0.0',

  // Server-specific error filtering
  beforeSend(event) {
    // Filter out non-critical server errors
    if (process.env.NODE_ENV === 'production') {
      // Skip certain Node.js warnings that are not actionable
      if (event.exception?.values?.[0]?.value?.includes('ExperimentalWarning')) {
        return null
      }
      
      // Skip ECONNRESET errors (client disconnections)
      if (event.exception?.values?.[0]?.value?.includes('ECONNRESET')) {
        return null
      }
      
      // Skip timeout errors for non-critical operations
      if (event.exception?.values?.[0]?.value?.includes('timeout') && 
          !event.tags?.critical) {
        return null
      }
    }
    
    return event
  },

  // Configure server-side integrations
  integrations: [
    // HTTP integration for tracking HTTP requests
    Sentry.httpIntegration({
      tracing: true,
      breadcrumbs: true,
    }),
    
    // Node.js specific integrations
    Sentry.nodeProfilingIntegration(),
    
    // Console integration for server logs
    Sentry.consoleIntegration(),
    
    // Local variables integration for better debugging
    Sentry.localVariablesIntegration({
      captureAllExceptions: false,
      maxExceptionsPerSecond: 5,
    }),
  ],

  // Custom tags for server-side events
  initialScope: {
    tags: {
      component: 'server',
      platform: 'nextjs-server',
      version: process.env.BUILD_VERSION || '1.0.0',
      node_version: process.version,
    },
  },

  // Server-side transaction filtering
  beforeSendTransaction(event) {
    // Filter out health check and internal requests
    if (event.transaction) {
      const transactionName = event.transaction.toLowerCase()
      
      // Skip health checks and monitoring endpoints
      if (transactionName.includes('/health') ||
          transactionName.includes('/api/health') ||
          transactionName.includes('/_next/') ||
          transactionName.includes('/favicon.ico')) {
        return null
      }
      
      // Skip very fast transactions (likely not performance issues)
      if (event.start_timestamp && event.timestamp) {
        const duration = (event.timestamp - event.start_timestamp) * 1000
        if (duration < 10) { // Less than 10ms
          return null
        }
      }
    }
    
    return event
  },

  // Debug mode for development
  debug: process.env.NODE_ENV === 'development',

  // Server-side specific configuration
  attachStacktrace: true,
  
  // Maximum breadcrumbs for server events
  maxBreadcrumbs: 30,

  // Custom breadcrumb processing for server events
  beforeBreadcrumb(breadcrumb, hint) {
    // Add server context to HTTP breadcrumbs
    if (breadcrumb.category === 'http') {
      breadcrumb.data = {
        ...breadcrumb.data,
        server_timestamp: new Date().toISOString(),
        process_id: process.pid,
        memory_usage: process.memoryUsage().heapUsed,
      }
    }
    
    // Add context to console breadcrumbs
    if (breadcrumb.category === 'console') {
      breadcrumb.data = {
        ...breadcrumb.data,
        server_timestamp: new Date().toISOString(),
      }
    }
    
    return breadcrumb
  },

  // Automatically capture unhandled promise rejections and exceptions
  captureUnhandledRejections: true,
  captureUnhandledException: true,

  // Enable Sentry's automatic instrumentation
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,

  // Custom error context for server-side errors
  configureScope: (scope) => {
    scope.setTag('runtime', 'nodejs')
    scope.setContext('runtime', {
      name: 'node',
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    })
    
    // Add server memory information
    scope.setContext('memory', {
      ...process.memoryUsage(),
      timestamp: new Date().toISOString(),
    })
  },

  // Performance monitoring for Next.js API routes and SSR
  instrumenter: 'sentry',
  
  // Trace propagation for distributed tracing
  tracePropagationTargets: [
    'localhost',
    '127.0.0.1',
    /^https:\/\/api\.bookedbarber\.com/,
    /^https:\/\/.*\.railway\.app/,
    /^https:\/\/.*\.render\.com/,
    /^https:\/\/.*\.vercel\.app/,
  ],

  // Transport configuration for reliability
  transport: Sentry.makeNodeTransport,

  // Spotlight integration for local development debugging
  spotlight: process.env.NODE_ENV === 'development',
})