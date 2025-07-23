# Error Boundary Usage Guide

## 📋 Overview

This guide provides standardized patterns for implementing error boundaries across the BookedBarber V2 application. Use the `StandardErrorBoundary` factory for consistent error handling.

## 🚀 Quick Start

### Basic Usage

```tsx
import { StandardErrorBoundary } from '@/components/error-boundaries'

function MyComponent() {
  return (
    <StandardErrorBoundary 
      type="general" 
      context={{ feature: "my-feature" }}
    >
      <SomeComponent />
    </StandardErrorBoundary>
  )
}
```

### Pre-configured Boundaries

```tsx
import { 
  BookingBoundary,
  PaymentBoundary,
  AnalyticsBoundary,
  FormBoundary 
} from '@/components/error-boundaries'

// Booking flow
<BookingBoundary context={{ bookingStep: 2, selectedService: "Haircut" }}>
  <BookingForm />
</BookingBoundary>

// Payment processing
<PaymentBoundary context={{ paymentAmount: 25.00, paymentMethod: "card" }}>
  <CheckoutForm />
</PaymentBoundary>

// Analytics dashboard
<AnalyticsBoundary context={{ analyticsType: "revenue", dateRange: "30d" }}>
  <RevenueChart />
</AnalyticsBoundary>

// Form validation
<FormBoundary context={{ formId: "user-profile" }}>
  <ProfileForm />
</FormBoundary>
```

## 🎯 Error Boundary Types

### 1. **booking** - Appointment/Booking Flow
**Use for:** Booking forms, appointment scheduling, service selection

**Context:**
- `bookingStep`: Current step in booking process
- `selectedService`: Selected service name
- `selectedDate`: Selected appointment date
- `selectedTime`: Selected appointment time
- `isGuestBooking`: Whether booking as guest

```tsx
<StandardErrorBoundary 
  type="booking"
  context={{
    bookingStep: 3,
    selectedService: "Premium Haircut",
    selectedDate: "2024-01-15",
    selectedTime: "14:00",
    isGuestBooking: false,
    userId: user?.id
  }}
>
  <BookingConfirmation />
</StandardErrorBoundary>
```

### 2. **payment** - Payment Processing
**Use for:** Checkout flows, payment forms, Stripe integration

**Context:**
- `paymentAmount`: Payment amount in dollars
- `paymentMethod`: Payment method (card, cash, etc.)
- `paymentIntentId`: Stripe payment intent ID

```tsx
<StandardErrorBoundary 
  type="payment"
  context={{
    paymentAmount: 45.00,
    paymentMethod: "card",
    paymentIntentId: "pi_1234567890",
    userId: user?.id
  }}
>
  <PaymentForm />
</StandardErrorBoundary>
```

### 3. **analytics** - Reporting/Analytics
**Use for:** Charts, dashboards, reports, data visualization

**Context:**
- `analyticsType`: Type of analytics (revenue, clients, etc.)
- `dateRange`: Date range for analytics
- `filters`: Applied filters

```tsx
<StandardErrorBoundary 
  type="analytics"
  context={{
    analyticsType: "client-retention",
    dateRange: "90d",
    filters: { location: "downtown", service: "haircut" },
    userId: user?.id
  }}
>
  <RetentionAnalytics />
</StandardErrorBoundary>
```

### 4. **form** - Form Validation
**Use for:** User input forms, validation, data submission

**Context:**
- `formId`: Unique form identifier
- `fieldErrors`: Current field errors

```tsx
<StandardErrorBoundary 
  type="form"
  context={{
    formId: "client-registration",
    fieldErrors: { email: "Invalid email format" },
    userId: user?.id
  }}
>
  <ClientRegistrationForm />
</StandardErrorBoundary>
```

### 5. **general** - General Purpose
**Use for:** Dashboard widgets, utility components, general UI

```tsx
<StandardErrorBoundary 
  type="general"
  context={{
    feature: "user-profile",
    component: "ProfileWidget",
    userId: user?.id
  }}
>
  <UserProfileWidget />
</StandardErrorBoundary>
```

## 🔧 Advanced Usage

### Higher-Order Component Pattern

```tsx
import { withStandardErrorBoundary } from '@/components/error-boundaries'

const SafeBookingForm = withStandardErrorBoundary(
  BookingForm,
  'booking',
  { bookingStep: 1 } // default context
)

// Usage with additional context
<SafeBookingForm 
  errorBoundaryContext={{ selectedService: "Haircut" }}
  {...formProps}
/>
```

### Dynamic Error Boundary Type

```tsx
import { getErrorBoundaryType } from '@/components/error-boundaries'

function DynamicComponent() {
  const pathname = usePathname()
  const boundaryType = getErrorBoundaryType(pathname, "custom-feature")
  
  return (
    <StandardErrorBoundary 
      type={boundaryType}
      context={{ feature: "dynamic-component" }}
    >
      <ComponentContent />
    </StandardErrorBoundary>
  )
}
```

### Using Error Boundary Context Hook

```tsx
import { useErrorBoundaryContext } from '@/components/error-boundaries'

function BookingStepComponent() {
  const { updateContext } = useErrorBoundaryContext()
  
  const handleStepChange = (step: number) => {
    updateContext({ bookingStep: step })
    // Continue with step logic...
  }
  
  return <div>...</div>
}
```

## 📊 Migration from Legacy Error Boundaries

### Before (Legacy Pattern)
```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary'

<ErrorBoundary feature="booking" userId={user?.id}>
  <BookingForm />
</ErrorBoundary>
```

### After (Standardized Pattern)
```tsx
import { StandardErrorBoundary } from '@/components/error-boundaries'

<StandardErrorBoundary 
  type="booking"
  context={{
    feature: "booking-form",
    userId: user?.id,
    bookingStep: 1,
    component: "BookingForm"
  }}
>
  <BookingForm />
</StandardErrorBoundary>
```

### Migration Checklist
- [ ] Replace `ErrorBoundary` imports with `StandardErrorBoundary`
- [ ] Convert `feature` prop to `context.feature`
- [ ] Add appropriate `type` based on component function
- [ ] Add relevant context information for better error tracking
- [ ] Test error scenarios to ensure proper error handling

## 🎯 Context Guidelines

### Always Include
- `feature`: Clear feature identifier
- `userId`: User ID for error tracking
- `component`: Component name for debugging

### Include When Available
- Step/progress information (booking steps, form progress)
- User selections (services, dates, amounts)
- Filter states and configurations
- Error states and validation information

### Example Complete Context
```tsx
<StandardErrorBoundary 
  type="booking"
  context={{
    // Required
    feature: "appointment-booking",
    userId: user?.id,
    component: "BookingWizard",
    
    // Booking-specific
    bookingStep: 3,
    selectedService: "Premium Haircut + Beard Trim",
    selectedDate: "2024-01-15",
    selectedTime: "14:00",
    isGuestBooking: false,
    
    // Additional metadata
    metadata: {
      referralSource: "google",
      deviceType: "mobile",
      bookingDuration: 90 // minutes
    }
  }}
>
  <BookingWizard />
</StandardErrorBoundary>
```

## 🚨 Best Practices

### Do ✅
- Use specific error boundary types for specialized components
- Provide rich context information for debugging
- Wrap logical component groups, not individual elements
- Include user and feature identification
- Test error scenarios during development

### Don't ❌
- Wrap every single component individually
- Use generic error boundaries for specialized flows
- Forget to update context as user progresses
- Skip error boundary testing
- Ignore error boundary patterns in new components

## 🔍 Testing Error Boundaries

### Development Testing
```tsx
// Add error trigger for testing
{process.env.NODE_ENV === 'development' && (
  <button onClick={() => { throw new Error('Test error') }}>
    Trigger Error
  </button>
)}
```

### Automated Testing
```tsx
import { render, screen } from '@testing-library/react'
import { StandardErrorBoundary } from '@/components/error-boundaries'

const ThrowError = () => {
  throw new Error('Test error')
}

test('should catch and display error', () => {
  render(
    <StandardErrorBoundary type="general" context={{ feature: "test" }}>
      <ThrowError />
    </StandardErrorBoundary>
  )
  
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
})
```

## 📈 Error Monitoring

All standardized error boundaries automatically:
- Report errors to Sentry with rich context
- Track user actions leading to errors
- Provide fallback UI with recovery options
- Log detailed error information for debugging

The context information you provide enhances error reports and makes debugging significantly easier.