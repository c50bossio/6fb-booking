# Conversion Tracking Component

The `ConversionTracker` component provides GDPR-compliant conversion tracking for Google Analytics and Meta Pixel, integrated with the BookedBarber cookie consent system.

## Features

- ✅ Full cookie consent integration
- ✅ Google Analytics 4 support
- ✅ Meta Pixel (Facebook) support
- ✅ E-commerce tracking for bookings
- ✅ Custom event tracking
- ✅ TypeScript support with full type definitions
- ✅ Debug mode for development
- ✅ Automatic consent checking

## Installation

The component is already integrated with the existing cookie consent system and script loader. No additional setup required.

## Basic Usage

### 1. Initialize Tracking in Your App

Add the `ConversionTracker` component to your app layout:

```tsx
import { ConversionTracker } from '@/components/tracking'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ConversionTracker debugMode={process.env.NODE_ENV === 'development'}>
          {children}
        </ConversionTracker>
      </body>
    </html>
  )
}
```

### 2. Use the Hook in Components

```tsx
import { useConversionTracking, ConversionEventType } from '@/components/tracking'

export function BookingForm() {
  const { track, trackBookingStep } = useConversionTracking()

  const handleServiceSelect = (service: Service) => {
    // Track service selection
    track(ConversionEventType.ADD_TO_CART, {
      items: [{
        item_id: service.id,
        item_name: service.name,
        price: service.price,
        quantity: 1,
        item_category: service.category,
      }],
      value: service.price,
      currency: 'USD',
    })
  }

  const handleBookingComplete = (booking: Booking) => {
    // Track purchase/booking completion
    trackBookingStep('completed', {
      transaction_id: booking.id,
      value: booking.totalAmount,
      currency: 'USD',
      items: booking.services.map(s => ({
        item_id: s.id,
        item_name: s.name,
        price: s.price,
        quantity: 1,
      })),
    })
  }

  return (
    // Your form JSX
  )
}
```

## Event Types

### Standard E-commerce Events

```typescript
ConversionEventType.VIEW_ITEM         // View service details
ConversionEventType.ADD_TO_CART       // Select service
ConversionEventType.BEGIN_CHECKOUT    // Start booking process
ConversionEventType.ADD_PAYMENT_INFO  // Add payment details
ConversionEventType.PURCHASE          // Complete booking
```

### User Events

```typescript
ConversionEventType.SIGN_UP           // New user registration
ConversionEventType.LOGIN             // User login
ConversionEventType.GENERATE_LEAD     // Form submission
```

### Custom Booking Events

```typescript
ConversionEventType.BOOKING_STARTED
ConversionEventType.BOOKING_ABANDONED
ConversionEventType.APPOINTMENT_CANCELED
ConversionEventType.APPOINTMENT_RESCHEDULED
ConversionEventType.REVIEW_SUBMITTED
```

## Advanced Examples

### Track Booking Purchase

```tsx
import { trackBookingPurchase } from '@/components/tracking'

// After successful payment
trackBookingPurchase({
  transaction_id: 'BOOK-12345',
  value: 150.00,
  currency: 'USD',
  tax: 15.00,
  coupon: 'FIRST10',
  payment_type: 'card',
  items: [
    {
      item_id: 'service-001',
      item_name: 'Premium Haircut',
      price: 75.00,
      quantity: 1,
      item_category: 'haircut',
    },
    {
      item_id: 'service-002', 
      item_name: 'Beard Trim',
      price: 25.00,
      quantity: 1,
      item_category: 'beard',
    }
  ],
  user_id: 'user-123',
  user_type: 'customer',
})
```

### Track Form Submissions

```tsx
const { trackFormSubmission } = useConversionTracking()

const handleContactForm = (formData: ContactForm) => {
  trackFormSubmission('contact_form', {
    value: 1,
    content_type: 'contact',
    user_id: formData.email,
  })
}

const handleBarberApplication = (application: BarberApplication) => {
  trackFormSubmission('barber_application', {
    value: 1,
    content_type: 'application',
    user_id: application.email,
    user_type: 'barber',
  })
}
```

### Track Search

```tsx
const { trackSearch } = useConversionTracking()

const handleSearch = (query: string, results: Service[]) => {
  trackSearch(query, results.length)
}
```

### Track Page Views with User Context

```tsx
import { trackEnhancedPageView } from '@/components/tracking'

// In a page component
useEffect(() => {
  trackEnhancedPageView({
    page_title: 'Barber Dashboard',
    page_path: '/dashboard',
    user_id: user?.id,
    user_type: 'barber',
  })
}, [user])
```

## Consent Integration

The component automatically checks cookie consent before tracking:

- **Analytics Events**: Require analytics consent
- **Marketing Events**: Require marketing consent
- **No Tracking**: When consent is not given

```tsx
const { canTrackAnalytics, canTrackMarketing, hasConsent } = useConversionTracking()

// Conditional UI based on consent
{canTrackAnalytics && (
  <AnalyticsWidget />
)}
```

## Debug Mode

Enable debug mode to see all tracking events in the console:

```tsx
// In development
<ConversionTracker debugMode={true}>

// Or with the hook
const tracking = useConversionTracking({ debug: true })
```

## Testing

Test tracking without sending real events:

```tsx
// In your test files
import { trackConversion, ConversionEventType } from '@/components/tracking'

// Mock the scriptLoader
jest.mock('@/lib/scriptLoader', () => ({
  trackEvent: jest.fn(),
  trackPageView: jest.fn(),
}))

// Test your tracking
it('should track booking completion', () => {
  trackConversion(ConversionEventType.PURCHASE, {
    transaction_id: 'test-123',
    value: 100,
  })
  
  expect(trackEvent).toHaveBeenCalledWith('purchase', {
    transaction_id: 'test-123',
    value: 100,
  })
})
```

## Best Practices

1. **Always include value**: For conversion optimization
2. **Use consistent IDs**: Same item_id across events
3. **Track user journey**: From view to purchase
4. **Include user context**: user_id and user_type when available
5. **Currency matters**: Always specify currency code
6. **Test in debug mode**: Verify events before production

## Environment Variables

Ensure these are set in your `.env.local`:

```env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_META_PIXEL_ID=1234567890
```

## Support

For issues or questions about conversion tracking, please refer to:
- [Google Analytics 4 Documentation](https://developers.google.com/analytics)
- [Meta Pixel Documentation](https://developers.facebook.com/docs/meta-pixel)
- BookedBarber internal documentation