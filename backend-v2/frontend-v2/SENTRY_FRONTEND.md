# Sentry Frontend Integration Guide

## Overview

This guide covers the comprehensive Sentry integration for the BookedBarber V2 frontend application. Our implementation provides:

- **Error Tracking**: Automatic capture and reporting of JavaScript errors
- **Performance Monitoring**: Core Web Vitals, API performance, and custom metrics
- **User Context**: Detailed user session and interaction tracking
- **Error Boundaries**: Enhanced error boundaries with user feedback collection
- **Source Maps**: Proper source map configuration for production debugging

## Table of Contents

1. [Setup and Configuration](#setup-and-configuration)
2. [Environment Variables](#environment-variables)
3. [Usage Examples](#usage-examples)
4. [Performance Monitoring](#performance-monitoring)
5. [Error Handling](#error-handling)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

## Setup and Configuration

### Dependencies

The following packages are required:

```json
{
  "@sentry/nextjs": "^8.55.0",
  "web-vitals": "^4.2.4"
}
```

### Configuration Files

Our Sentry setup consists of several configuration files:

1. **`sentry.client.config.js`** - Client-side configuration
2. **`sentry.server.config.js`** - Server-side configuration
3. **`next.config.js`** - Next.js integration with source map uploading
4. **`lib/sentry.ts`** - Shared utilities and business-specific error handling

### Automatic Initialization

Sentry initializes automatically when the application starts. No manual initialization is required in your components.

## Environment Variables

### Required Variables

```bash
# Sentry DSN (safe for client exposure)
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Environment identifier
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
```

### Optional Variables

```bash
# Session replay (use with caution - privacy implications)
NEXT_PUBLIC_SENTRY_ENABLE_REPLAY=false

# Performance sampling rates (0.0 to 1.0)
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_PROFILES_SAMPLE_RATE=0.05

# Build-time variables for source map uploading
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=your-auth-token
```

### Setting Up Environment Variables

1. **Development**: Copy `.env.template` to `.env.local` and fill in your values
2. **Production**: Set environment variables in your deployment platform
3. **Sentry Setup**: Create a new project at [sentry.io](https://sentry.io) to get your DSN

## Usage Examples

### Basic Error Reporting

```typescript
import { reportApiError, addUserActionBreadcrumb } from '@/lib/sentry'

// Report API errors with context
try {
  const response = await fetch('/api/bookings')
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
} catch (error) {
  reportApiError(error, {
    endpoint: '/api/bookings',
    method: 'GET',
    statusCode: response?.status,
  })
}
```

### User Context Tracking

```typescript
import { useSentryUser } from '@/hooks/useSentryUser'

function LoginComponent() {
  const { setUser, clearUser } = useSentryUser()

  const handleLogin = async (user) => {
    // Set user context for all subsequent events
    setUser({
      id: user.id,
      email: user.email,
      role: 'client',
      businessId: user.businessId,
      subscriptionTier: 'premium'
    })
  }

  const handleLogout = () => {
    // Clear user context
    clearUser()
  }
}
```

### Performance Monitoring

```typescript
import { SentryPerformanceMonitor, usePerformanceTracking } from '@/components/SentryPerformanceMonitor'

function BookingFlow() {
  const { trackOperation, markInteraction } = usePerformanceTracking('booking')

  const handleBookingSubmit = async (bookingData) => {
    // Track the booking operation with performance metrics
    await trackOperation(
      'create_booking',
      async () => {
        const result = await api.post('/bookings', bookingData)
        markInteraction('Booking submitted successfully')
        return result
      }
    )
  }

  return (
    <SentryPerformanceMonitor feature="booking" page="booking-form">
      {/* Your booking form components */}
    </SentryPerformanceMonitor>
  )
}
```

### Form Tracking

```typescript
import { useSentryFormTracking } from '@/hooks/useSentryUser'

function ContactForm() {
  const { 
    trackFormStart, 
    trackFormSubmit, 
    trackFormValidationError 
  } = useSentryFormTracking('contact-form')

  useEffect(() => {
    trackFormStart()
  }, [])

  const handleSubmit = async (formData) => {
    try {
      await submitContact(formData)
      trackFormSubmit(true, { fields: Object.keys(formData) })
    } catch (error) {
      trackFormSubmit(false, { error: error.message })
    }
  }

  const handleValidationError = (field, message) => {
    trackFormValidationError(field, message)
  }
}
```

### Error Boundaries

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary 
      feature="booking"
      userId={user?.id}
      onError={(error, errorInfo) => {
        console.log('Error boundary triggered:', error)
      }}
    >
      <BookingComponent />
    </ErrorBoundary>
  )
}
```

## Performance Monitoring

### Core Web Vitals

Our setup automatically tracks Core Web Vitals:

- **CLS (Cumulative Layout Shift)**: Layout stability
- **FCP (First Contentful Paint)**: Loading performance
- **FID (First Input Delay)**: Interactivity
- **LCP (Largest Contentful Paint)**: Loading performance
- **TTFB (Time to First Byte)**: Server response time

### Custom Performance Tracking

Track specific operations:

```typescript
import { trackPerformance } from '@/lib/sentry'

const result = await trackPerformance(
  'image_upload',
  {
    feature: 'profile',
    action: 'upload_avatar',
    metadata: { fileSize, fileType }
  },
  async () => {
    return await uploadImage(file)
  }
)
```

### API Performance

Use our enhanced API client for automatic performance tracking:

```typescript
import { api, bookingApi, paymentApi } from '@/lib/api-client-sentry'

// Automatically tracked with performance metrics
const bookings = await bookingApi.getAvailability('barber-123', '2024-01-15')
const payment = await paymentApi.createPaymentIntent(5000, 'usd', 'booking-456')
```

## Error Handling

### Business-Specific Error Reporting

```typescript
import { reportBookingError, reportPaymentError } from '@/lib/sentry'

// Report booking-related errors
try {
  await createBooking(bookingData)
} catch (error) {
  reportBookingError(error, {
    bookingId: bookingData.id,
    barberId: bookingData.barberId,
    clientId: bookingData.clientId,
    step: 'confirmation'
  })
}

// Report payment-related errors
try {
  await processPayment(paymentData)
} catch (error) {
  reportPaymentError(error, {
    paymentIntentId: paymentData.paymentIntentId,
    amount: paymentData.amount,
    currency: paymentData.currency,
    customerId: paymentData.customerId
  })
}
```

### Error Boundary with User Feedback

The enhanced error boundary includes:

- **Automatic error reporting** to Sentry
- **User feedback collection** for critical errors
- **Contextual error messages** based on error type
- **Recovery options** (retry, reload, go home)

Features:

- Network error detection and specific messaging
- Chunk loading error handling (common after deployments)
- User feedback form with error correlation
- Breadcrumb tracking for user actions

## Testing

### Running Sentry Integration Tests

```bash
# Run all Sentry-related tests
npm run test:e2e -- tests/sentry-integration.spec.ts

# Run with headed browser for debugging
npm run test:e2e:headed -- tests/sentry-integration.spec.ts
```

### Test Coverage

Our tests verify:

1. **Sentry Initialization**: Proper SDK loading and configuration
2. **Error Capture**: Error boundaries and exception handling
3. **Breadcrumb Tracking**: User interactions and navigation
4. **Performance Monitoring**: Core Web Vitals and custom metrics
5. **API Error Handling**: Network request failures and retries
6. **User Context**: Authentication state and user data
7. **Source Maps**: Proper stack trace resolution

### Manual Testing

To test Sentry integration manually:

1. **Trigger Test Error**:
   ```javascript
   // In browser console
   throw new Error('Test error for Sentry')
   ```

2. **Check Sentry Dashboard**: Verify the error appears with proper context

3. **Test Performance**: Navigate the app and check performance data

## Deployment

### Production Checklist

Before deploying to production:

- [ ] Set `NEXT_PUBLIC_SENTRY_DSN` environment variable
- [ ] Configure `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` for source maps
- [ ] Set appropriate sampling rates for performance monitoring
- [ ] Test error reporting in staging environment
- [ ] Verify source maps are uploading correctly
- [ ] Set up Sentry alerts and notifications

### Source Map Upload

Source maps are automatically uploaded during production builds when:

1. `SENTRY_AUTH_TOKEN` is set
2. `NODE_ENV=production`
3. Build process includes the Sentry webpack plugin

### Performance Considerations

- **Sampling Rates**: Use lower sampling rates in production (0.05-0.1)
- **Session Replay**: Disable in production unless specifically needed
- **Bundle Size**: Sentry adds ~35KB gzipped to your bundle
- **Network Impact**: Errors and performance data are sent asynchronously

## Troubleshooting

### Common Issues

#### Sentry Not Initializing

**Problem**: Sentry is not capturing errors

**Solutions**:
1. Check that `NEXT_PUBLIC_SENTRY_DSN` is set
2. Verify the DSN format is correct
3. Check browser console for Sentry initialization errors
4. Ensure Sentry config files are in the correct location

#### Source Maps Not Working

**Problem**: Stack traces show minified code

**Solutions**:
1. Verify `SENTRY_AUTH_TOKEN` has correct permissions
2. Check that source maps are being uploaded (build logs)
3. Ensure `hideSourceMaps: true` in production
4. Verify release matching between uploads and runtime

#### Performance Data Missing

**Problem**: No performance metrics in Sentry

**Solutions**:
1. Check `tracesSampleRate` is > 0
2. Verify Core Web Vitals support in browser
3. Ensure performance observers are not blocked
4. Check network connectivity for data upload

#### High Error Volume

**Problem**: Too many duplicate errors

**Solutions**:
1. Use `beforeSend` to filter out non-actionable errors
2. Implement proper error grouping
3. Add rate limiting for known issues
4. Update error filtering rules

### Debug Mode

Enable debug mode in development:

```javascript
// In sentry.client.config.js
debug: process.env.NODE_ENV === 'development'
```

### Sentry Dashboard Setup

1. **Alerts**: Set up alerts for error spikes and performance degradation
2. **Releases**: Configure release tracking for deployment correlation
3. **Performance**: Set up performance thresholds and alerts
4. **User Feedback**: Enable user feedback widget for error reports

## Advanced Configuration

### Custom Instrumentation

Add custom instrumentation for specific features:

```typescript
import * as Sentry from '@sentry/nextjs'

// Custom span for database operations
const span = Sentry.startSpan({
  name: 'database.query',
  op: 'db',
  attributes: {
    'db.statement': 'SELECT * FROM bookings',
    'db.system': 'postgresql'
  }
}, () => {
  return database.query('SELECT * FROM bookings')
})
```

### Custom Tags and Context

```typescript
// Set global context
Sentry.setContext('business', {
  subscriptionTier: 'enterprise',
  locationCount: 5,
  monthlyBookings: 1200
})

// Set custom tags
Sentry.setTag('feature.ab_test', 'new_booking_flow')
Sentry.setTag('deployment.version', process.env.BUILD_VERSION)
```

### Integration with Other Services

```typescript
// Integrate with analytics
import { trackEvent } from '@/lib/analytics'

const reportErrorWithAnalytics = (error, context) => {
  // Report to Sentry
  reportApiError(error, context)
  
  // Track in analytics
  trackEvent('error_occurred', {
    error_type: error.name,
    error_message: error.message,
    feature: context.feature
  })
}
```

## Best Practices

1. **Error Context**: Always provide rich context with errors
2. **Performance Impact**: Monitor Sentry's impact on performance
3. **Privacy**: Be careful with PII in error reports and session replay
4. **Sampling**: Use appropriate sampling rates for your traffic volume
5. **Alerting**: Set up meaningful alerts, not just error counts
6. **Documentation**: Document custom error types and handling procedures

## Support and Resources

- **Sentry Documentation**: [docs.sentry.io](https://docs.sentry.io)
- **Next.js Integration**: [docs.sentry.io/platforms/javascript/guides/nextjs](https://docs.sentry.io/platforms/javascript/guides/nextjs)
- **Performance Monitoring**: [docs.sentry.io/product/performance](https://docs.sentry.io/product/performance)
- **Error Monitoring**: [docs.sentry.io/product/issues](https://docs.sentry.io/product/issues)

---

## Version History

- **v1.0.0** (2025-07-03): Initial comprehensive Sentry integration
  - Error tracking with error boundaries
  - Performance monitoring with Core Web Vitals
  - User context and session tracking
  - API monitoring and error reporting
  - Comprehensive test coverage
  - Production-ready configuration