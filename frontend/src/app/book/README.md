# Client Booking Portal

A complete client-facing booking portal for customers to book appointments with barbershops and salons.

## Features

### 🎯 Core Functionality
- **Public Booking Page**: Shop information and team showcase at `/book/[shopId]`
- **Complete Booking Flow**: 6-step booking process at `/book/[shopId]/booking`
- **Mobile-Responsive Design**: Optimized for all devices
- **SEO-Optimized**: Proper meta tags and structured data
- **Real-time Availability**: Live availability checking
- **Payment Integration**: Deposit and full payment options

### 📱 Booking Flow Steps

1. **Service Selection** - Choose from available services with pricing
2. **Barber Selection** - Pick preferred barber (optional, can be pre-selected)
3. **Date & Time Selection** - Real-time availability calendar
4. **Client Information** - Contact details and special requests
5. **Payment Processing** - Deposit or full payment options
6. **Confirmation** - Booking summary with email/SMS notifications

### 🔗 URL Structure

```
/book/[shopId]                    # Shop landing page
/book/[shopId]/booking            # Booking flow
/book/[shopId]/booking?barber=123 # Pre-select barber
/book/[shopId]/booking?service=45 # Pre-select service
```

## Components

### Main Pages
- **`[shopId]/page.tsx`** - Shop landing page with services and team
- **`[shopId]/booking/page.tsx`** - Complete booking flow
- **`[shopId]/layout.tsx`** - SEO metadata and structured data

### Booking Components
- **`ServiceSelector.tsx`** - Service selection with pricing
- **`TimeSlotSelector.tsx`** - Available time slots by period
- **`SimplePaymentStep.tsx`** - Payment options and processing
- **`BookingConfirmationModal.tsx`** - Success confirmation

### State Management
- **`booking-utils.ts`** - Booking state utilities and helpers
- **`BookingContext.tsx`** - React context for booking state

## Usage Examples

### Basic Shop Page
```typescript
// Displays shop info, services, and team
// Auto-generates booking URLs
const url = `/book/123` // Shop ID 123
```

### Pre-selected Barber
```typescript
// Direct booking with specific barber
const url = `/book/123/booking?barber=456`
```

### Shareable Links
```typescript
import { generateShareableBookingLink } from '@/lib/booking-utils'

const link = generateShareableBookingLink('123', {
  barber: 456,
  service: 789
})
```

## API Integration

### Required API Endpoints
- `GET /locations/{id}` - Shop/location details
- `GET /services?location_id={id}` - Available services
- `GET /barbers?location_id={id}&service_id={id}` - Available barbers
- `GET /barbers/{id}/availability` - Time slot availability
- `POST /bookings` - Create new booking

### Data Flow
1. Load shop information and services
2. Filter barbers by selected service
3. Check real-time availability
4. Process payment (mock implementation)
5. Create booking record

## SEO Features

### Meta Tags
- Dynamic titles and descriptions per shop
- Open Graph tags for social sharing
- Twitter Card support
- Canonical URLs

### Structured Data
- LocalBusiness schema
- Service offerings
- Contact information
- Business hours
- Aggregate ratings

### Mobile Optimization
- Responsive design patterns
- Touch-friendly interfaces
- Optimized loading states
- Progressive enhancement

## Customization

### Theming
The portal uses consistent theming with slate colors:
- Primary: `slate-700`
- Hover: `slate-800`
- Accents: `slate-50`, `slate-100`

### Branding
Update the following for custom branding:
- Logo and images in layout
- Color scheme in components
- Business information in structured data

### Payment Integration
Currently includes a mock payment form. To integrate real payments:

1. Replace `SimplePaymentStep.tsx` with actual payment processor
2. Use existing `PaymentStep.tsx` for Stripe/Square integration
3. Update payment handling in booking flow

## Performance

### Loading States
- Skeleton loaders for services and barbers
- Progressive data loading
- Error handling with retry options

### Optimization
- Component code splitting
- API request caching
- Optimistic updates
- Debounced availability checks

## Accessibility

### Standards Compliance
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Focus management

### Features
- Clear step indicators
- Error message announcements
- Loading state feedback
- High contrast support

## Testing

### Component Testing
```bash
# Test individual components
npm test ServiceSelector
npm test TimeSlotSelector
npm test BookingFlow
```

### Integration Testing
```bash
# Test complete booking flow
npm run test:e2e booking-flow
```

### Accessibility Testing
```bash
# Run accessibility audits
npm run test:a11y
```

## Deployment

### Environment Variables
```env
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq0idp-...
```

### Build Optimization
```bash
# Build for production
npm run build

# Analyze bundle size
npm run analyze
```

## Monitoring

### Analytics
- Booking conversion tracking
- Step completion rates
- User journey analysis
- Error rate monitoring

### Performance
- Core Web Vitals tracking
- Loading time metrics
- API response monitoring
- User experience metrics

## Support

### Common Issues
1. **Availability not loading** - Check API endpoints and CORS
2. **Payment not processing** - Verify payment processor configuration
3. **SEO not working** - Ensure server-side rendering is enabled

### Debugging
Enable debug mode in development:
```typescript
const DEBUG_BOOKING = process.env.NODE_ENV === 'development'
```

## Roadmap

### Planned Features
- [ ] Calendar view for availability
- [ ] Recurring appointment booking
- [ ] Group booking support
- [ ] Loyalty program integration
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] Offline booking capability
- [ ] Advanced analytics dashboard

### Technical Improvements
- [ ] GraphQL API integration
- [ ] Real-time updates with WebSockets
- [ ] Enhanced caching strategies
- [ ] Progressive Web App features
- [ ] Advanced error boundaries
- [ ] Performance monitoring integration
