# Booking Link Generator System Guide

The Booking Link Generator system provides comprehensive utilities for creating customizable booking links with URL parameters, enabling advanced marketing campaigns, referral tracking, and pre-populated booking forms.

## Overview

This system consists of several key components:

1. **TypeScript Types** (`types/booking-links.ts`) - Comprehensive type definitions
2. **Core Generator** (`lib/booking-link-generator.ts`) - Main utility functions
3. **React Components** (`components/booking/`) - Integration components
4. **Test Suite** (`lib/__tests__/booking-link-generator.test.ts`) - Comprehensive tests

## Quick Start

### Basic URL Generation

```typescript
import { generateBookingURL } from '@/lib/booking-link-generator'

// Basic booking link
const basicUrl = generateBookingURL({})
// Result: https://app.bookedbarber.com/book

// Service-specific link
const serviceUrl = generateBookingURL({
  service: 'haircut'
})
// Result: https://app.bookedbarber.com/book?service=haircut

// Complete booking link
const completeUrl = generateBookingURL({
  service: 'haircut',
  barber: 'john-doe',
  date: '2025-07-01',
  time: '10:00',
  utm_source: 'facebook',
  utm_campaign: 'summer2025'
})
```

### Using the BookingLinkGenerator Class

```typescript
import { BookingLinkGenerator } from '@/lib/booking-link-generator'

const generator = new BookingLinkGenerator()

// Set available services and barbers for validation
generator.setServices([
  {
    id: 1,
    name: 'Haircut',
    slug: 'haircut',
    duration: 30,
    price: 30,
    category: 'hair',
    isActive: true
  }
])

generator.setBarbers([
  {
    id: 1,
    name: 'John Doe',
    slug: 'john-doe',
    email: 'john@example.com',
    isActive: true,
    services: [1],
    timezone: 'America/New_York'
  }
])

// Generate URLs with validation
const url = generator.generateURL({
  service: 'haircut',
  barber: 'john-doe'
})
```

## URL Parameter Types

### Service Selection
```typescript
{
  service?: string | string[]        // Service name or slug
  serviceId?: number | number[]      // Service ID
}
```

### Barber/Employee Selection
```typescript
{
  barber?: string | string[]         // Barber name or slug
  barberId?: number | number[]       // Barber ID
  employee?: string | string[]       // Alternative to barber
  employeeId?: number | number[]     // Alternative to barberId
}
```

### Date and Time Constraints
```typescript
{
  date?: string                      // ISO date (YYYY-MM-DD)
  dateRange?: string                 // "start,end" format
  time?: string                      // HH:MM format
  timeRange?: string                 // "start,end" format
  timeSlots?: string[]               // Preferred time slots
  duration?: number                  // Duration in minutes
}
```

### Booking Constraints
```typescript
{
  leadTime?: number                  // Minimum hours in advance
  maxAdvance?: number               // Maximum days in advance
  bufferTime?: number               // Buffer time between appointments
}
```

### Campaign and Tracking
```typescript
{
  ref?: string                       // Referral source
  campaign?: string                  // Campaign name
  source?: string                    // Traffic source
  medium?: string                    // Marketing medium
  utm_source?: string               // UTM source
  utm_medium?: string               // UTM medium
  utm_campaign?: string             // UTM campaign
  utm_term?: string                 // UTM term
  utm_content?: string              // UTM content
}
```

### Client Information Pre-fill
```typescript
{
  name?: string                      // Customer name
  email?: string                     // Customer email
  phone?: string                     // Customer phone
}
```

### Special Options
```typescript
{
  recurring?: boolean               // Enable recurring booking
  frequency?: 'weekly' | 'biweekly' | 'monthly' | 'custom'
  quickBook?: boolean              // Skip to next available slot
  giftCertificate?: string         // Gift certificate code
  coupon?: string                  // Coupon code
  package?: string                 // Service package
}
```

## Example URLs

### Basic Examples

```typescript
// Basic booking
https://app.bookedbarber.com/book

// Service pre-selection
https://app.bookedbarber.com/book?service=haircut

// Service and barber
https://app.bookedbarber.com/book?service=haircut&barber=john-doe

// Multiple services
https://app.bookedbarber.com/book?service=haircut,shave

// Date range booking
https://app.bookedbarber.com/book?dateRange=2025-07-01,2025-07-07

// Quick booking (next available)
https://app.bookedbarber.com/book?service=haircut&quickBook=true
```

### Marketing Campaign Examples

```typescript
// Facebook campaign
https://app.bookedbarber.com/book?service=haircut&utm_source=facebook&utm_medium=social&utm_campaign=summer2025

// Instagram story
https://app.bookedbarber.com/book?service=shave&utm_source=instagram&utm_medium=story&utm_campaign=quick-shave&utm_content=story1

// Email newsletter
https://app.bookedbarber.com/book?utm_source=email&utm_medium=newsletter&utm_campaign=monthly-special&utm_content=cta-button

// Referral link
https://app.bookedbarber.com/book?ref=friend-referral&utm_source=referral&utm_medium=word-of-mouth
```

### Advanced Examples

```typescript
// Complete booking flow with pre-filled info
https://app.bookedbarber.com/book?service=haircut&barber=john-doe&date=2025-07-01&time=10:00&name=John%20Customer&email=john@customer.com&leadTime=24&utm_campaign=premium-service

// Recurring appointment setup
https://app.bookedbarber.com/book?service=haircut&recurring=true&frequency=weekly&time=10:00&duration=30

// Gift certificate booking
https://app.bookedbarber.com/book?service=haircut-shave&giftCertificate=GIFT2025&utm_source=gift&utm_medium=certificate
```

## React Integration

### Using BookingLinkHandler Component

```tsx
import BookingLinkHandler from '@/components/booking/BookingLinkHandler'

function BookingPage() {
  const handleParametersLoaded = (params: BookingLinkParams) => {
    // Handle URL parameters
    console.log('Loaded parameters:', params)
    
    // Pre-populate form fields
    if (params.service) {
      setSelectedService(params.service)
    }
    if (params.date) {
      setSelectedDate(new Date(params.date))
    }
  }

  const handleValidationResult = (result: ValidationResult) => {
    if (!result.isValid) {
      console.warn('Invalid URL parameters:', result.errors)
    }
  }

  return (
    <div>
      <BookingLinkHandler
        onParametersLoaded={handleParametersLoaded}
        onValidationResult={handleValidationResult}
      />
      
      {/* Your booking form components */}
    </div>
  )
}
```

### Using the Hook

```tsx
import { useBookingLinkParams } from '@/components/booking/BookingLinkHandler'

function BookingForm() {
  const {
    parameters,
    validation,
    isLoading,
    isValid,
    errors,
    hasParams
  } = useBookingLinkParams()

  useEffect(() => {
    if (parameters.service) {
      setSelectedService(parameters.service)
    }
  }, [parameters])

  if (isLoading) {
    return <div>Loading parameters...</div>
  }

  return (
    <div>
      {hasParams && (
        <div>Parameters loaded from URL</div>
      )}
      {/* Form components */}
    </div>
  )
}
```

## Validation

The system includes comprehensive validation for all parameters:

```typescript
import { validateBookingParams } from '@/lib/booking-link-generator'

const params = {
  service: 'haircut',
  date: '2025-07-01',
  time: '10:00',
  email: 'invalid-email'
}

const result = validateBookingParams(params)

if (!result.isValid) {
  console.log('Validation errors:', result.errors)
  // ["Invalid email format: invalid-email"]
}

if (result.warnings.length > 0) {
  console.log('Warnings:', result.warnings)
}
```

### Custom Validation Constraints

```typescript
const constraints = {
  required: ['service', 'date'],
  serviceExists: true,
  barberExists: true,
  dateInFuture: true,
  maxParameterLength: 100
}

const result = validateBookingParams(params, constraints)
```

## URL Utilities

### Encoding and Decoding

```typescript
import { URLEncoder } from '@/lib/booking-link-generator'

// Encode parameters
const encoded = URLEncoder.encodeParams({
  service: 'haircut',
  services: ['haircut', 'shave'],
  special: 'hello world'
})
// Result: "service=haircut&services=haircut%2Cshave&special=hello%20world"

// Decode parameters
const decoded = URLEncoder.decodeParams('service=haircut&barber=john%20doe')
// Result: { service: 'haircut', barber: 'john doe' }

// Sanitize parameters (remove dangerous characters)
const sanitized = URLEncoder.sanitizeParams({
  'service<script>': 'haircut"test',
  normal: 'safe-value'
})
// Result: { servicescript: 'haircuttest', normal: 'safe-value' }
```

### URL Shortening

```typescript
import { SimpleURLShortener } from '@/lib/booking-link-generator'

const shortener = new SimpleURLShortener()

// Shorten URL
const shortUrl = await shortener.shorten(
  'https://app.bookedbarber.com/book?service=haircut&barber=john-doe',
  { customSlug: 'haircut-john' }
)

// Get analytics
const analytics = await shortener.getAnalytics(shortUrl)
```

## Common Link Generation

### Generate Multiple Variations

```typescript
import { generateCommonBookingLinks } from '@/lib/booking-link-generator'

const links = generateCommonBookingLinks({
  utm_campaign: 'summer2025'
})

console.log(links)
/*
{
  basic: 'https://app.bookedbarber.com/book?utm_campaign=summer2025',
  quickBook: 'https://app.bookedbarber.com/book?quickBook=true&utm_campaign=summer2025',
  service_haircut: 'https://app.bookedbarber.com/book?service=haircut&utm_campaign=summer2025',
  thisWeek: 'https://app.bookedbarber.com/book?dateRange=2025-06-29,2025-07-05&utm_campaign=summer2025',
  // ... more variations
}
*/
```

### Campaign-Specific Links

```typescript
import { generateCampaignBookingLinks } from '@/lib/booking-link-generator'

const campaignLinks = generateCampaignBookingLinks('summer2025', {
  service: 'haircut'
})

console.log(campaignLinks)
/*
{
  facebook: 'https://app.bookedbarber.com/book?service=haircut&campaign=summer2025&utm_source=facebook&utm_medium=social',
  instagram: 'https://app.bookedbarber.com/book?service=haircut&campaign=summer2025&utm_source=instagram&utm_medium=social',
  google: 'https://app.bookedbarber.com/book?service=haircut&campaign=summer2025&utm_source=google&utm_medium=cpc',
  email: 'https://app.bookedbarber.com/book?service=haircut&campaign=summer2025&utm_source=email&utm_medium=email',
  sms: 'https://app.bookedbarber.com/book?service=haircut&campaign=summer2025&utm_source=sms&utm_medium=sms'
}
*/
```

## Link Templates

### Creating Templates

```typescript
const generator = new BookingLinkGenerator()

const template = generator.createTemplate(
  'Facebook Haircut Campaign',
  'Link for Facebook ads promoting haircuts',
  {
    service: 'haircut',
    utm_source: 'facebook',
    utm_medium: 'social',
    utm_campaign: 'haircut-special'
  },
  'marketing'
)

// Save template for reuse
const templates = [template]
```

### Using Templates

```typescript
// Use template to generate URLs
const url = generator.generateURL(template.params)

// Extend template with additional parameters
const extendedUrl = generator.generateURL({
  ...template.params,
  barber: 'john-doe',
  date: '2025-07-01'
})
```

## Best Practices

### 1. Parameter Naming
- Use clear, descriptive parameter names
- Follow existing conventions (utm_* for tracking)
- Keep parameter names short but meaningful

### 2. URL Length
- Keep URLs under 2048 characters
- Use URL shortening for complex links
- Consider using service/barber IDs instead of names for shorter URLs

### 3. Validation
- Always validate parameters before using them
- Handle validation errors gracefully
- Provide fallbacks for invalid parameters

### 4. Security
- Sanitize all URL parameters
- Validate against known services/barbers
- Avoid exposing sensitive information in URLs

### 5. User Experience
- Show users when parameters are pre-filled from URLs
- Provide clear feedback for invalid URLs
- Allow users to modify pre-filled values

### 6. Analytics
- Use consistent UTM parameter naming
- Track link performance and conversion rates
- A/B test different link variations

## Error Handling

### Common Validation Errors

```typescript
// Invalid service
{ service: 'nonexistent-service' }
// Error: "Service does not exist: nonexistent-service"

// Invalid date format
{ date: 'invalid-date' }
// Error: "Invalid date format: invalid-date"

// Past date
{ date: '2020-01-01' }
// Error: "Date must be in the future: 2020-01-01"

// Invalid email
{ email: 'invalid-email' }
// Error: "Invalid email format: invalid-email"

// Parameter too long
{ name: 'A'.repeat(300) }
// Error: "Parameter 'name' exceeds maximum length"
```

### Handling Errors in Components

```tsx
function BookingPage() {
  const [urlErrors, setUrlErrors] = useState<string[]>([])

  const handleValidationResult = (result: ValidationResult) => {
    if (!result.isValid) {
      setUrlErrors(result.errors)
    } else {
      setUrlErrors([])
    }
  }

  return (
    <div>
      {urlErrors.length > 0 && (
        <div className="alert alert-warning">
          <h3>URL Parameter Issues:</h3>
          <ul>
            {urlErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      <BookingLinkHandler onValidationResult={handleValidationResult} />
    </div>
  )
}
```

## Testing

The system includes comprehensive tests. Run them with:

```bash
npm test lib/__tests__/booking-link-generator.test.ts
```

Test coverage includes:
- URL generation with various parameter combinations
- URL parsing and parameter extraction
- Parameter validation with different constraint sets
- Error handling for invalid inputs
- Integration with React components
- Round-trip URL encoding/decoding

## Advanced Features

### Custom Base URLs

```typescript
const generator = new BookingLinkGenerator('https://custom.domain.com/book')
const url = generator.generateURL({ service: 'haircut' })
// Result: https://custom.domain.com/book?service=haircut
```

### Custom Encoding Options

```typescript
const options = {
  encode: true,
  omitEmpty: false,
  includeDefaults: true
}

const url = generator.generateURL(params, options)
```

### Integration with Analytics

```typescript
// Track link generation
const trackingParams = {
  utm_source: 'website',
  utm_medium: 'button',
  utm_campaign: 'homepage-cta'
}

const url = generateBookingURL({
  service: 'haircut',
  ...trackingParams
})

// Analytics will show traffic from 'website' > 'button' > 'homepage-cta'
```

## Troubleshooting

### Common Issues

1. **Parameters not being parsed**
   - Check URL format and encoding
   - Verify component is mounted correctly
   - Check browser console for errors

2. **Validation failing for valid parameters**
   - Ensure services/barbers are set on generator
   - Check validation constraints
   - Verify parameter format matches expectations

3. **URL too long**
   - Use service/barber IDs instead of names
   - Implement URL shortening
   - Remove unnecessary parameters

4. **Parameters not pre-filling form**
   - Check parameter names match form field expectations
   - Verify component integration
   - Test with minimal parameter set first

For additional support or feature requests, check the test suite for examples and expected behavior.