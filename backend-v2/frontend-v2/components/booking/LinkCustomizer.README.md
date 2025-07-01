# LinkCustomizer Component

A comprehensive booking link customization component for the 6FB booking system that allows barbers to configure booking link parameters with real-time URL preview.

## Features

### Two Operating Modes

1. **Set Appointment Parameters Mode** (`set-parameters`)
   - Full configuration interface with all available options
   - Service selection with multi-select capability
   - Barber filtering and selection
   - Date and time range configuration
   - Advanced booking constraints
   - Campaign tracking parameters

2. **Quick Mode** (`quick`)
   - Simplified interface for immediate link generation
   - Basic service and barber selection
   - Quick URL generation and copy functionality

### Configuration Options

#### Service Selection
- Multi-select service configuration
- Service details display (duration, price)
- Visual selection indicators
- Service category grouping

#### Barber Selection
- Individual barber selection
- Service compatibility checking
- Barber availability display
- Multi-barber support

#### Date & Time Constraints
- Specific date selection
- Date range configuration (start/end dates)
- Time range specification
- Time slot preferences

#### Advanced Settings
- Lead time configuration (minimum hours in advance)
- Maximum advance booking time (days)
- Appointment duration override
- Quick booking enablement
- Recurring appointment options
- Campaign tracking (name, source, medium)

### Real-time URL Preview
- Live URL generation as parameters change
- Parameter summary display
- Copy to clipboard functionality
- URL validation and error handling

## Usage

### Basic Integration

```tsx
import { LinkCustomizer } from '@/components/booking'

const MyComponent = () => {
  const [showCustomizer, setShowCustomizer] = useState(false)
  
  return (
    <LinkCustomizer
      isOpen={showCustomizer}
      onClose={() => setShowCustomizer(false)}
      businessName="Your Business"
      mode="set-parameters"
    />
  )
}
```

### With Services and Barbers Data

```tsx
import { LinkCustomizer } from '@/components/booking'
import { ServiceInfo, BarberInfo } from '@/types/booking-links'

const services: ServiceInfo[] = [
  {
    id: 1,
    name: 'Haircut',
    slug: 'haircut',
    duration: 30,
    price: 30,
    category: 'hair',
    isActive: true
  }
]

const barbers: BarberInfo[] = [
  {
    id: 1,
    name: 'Marcus Johnson',
    slug: 'marcus',
    email: 'marcus@6fb.com',
    isActive: true,
    services: [1, 2, 3],
    timezone: 'America/New_York'
  }
]

<LinkCustomizer
  isOpen={isOpen}
  onClose={onClose}
  businessName="Demo Barber Shop"
  services={services}
  barbers={barbers}
  mode="set-parameters"
/>
```

### Integration with ShareBookingModal

The LinkCustomizer is designed to work seamlessly with the ShareBookingModal:

```tsx
import { ShareBookingModal } from '@/components/booking'

<ShareBookingModal
  isOpen={showShareModal}
  onClose={() => setShowShareModal(false)}
  bookingUrl="https://book.6fb.com/your-business"
  businessName="Your Business"
  services={services}
  barbers={barbers}
/>
```

## Props Interface

```tsx
interface LinkCustomizerProps {
  isOpen: boolean                    // Modal visibility state
  onClose: () => void               // Close handler
  onBack?: () => void               // Back navigation handler
  businessName?: string             // Business name for context
  services?: ServiceInfo[]          // Available services
  barbers?: BarberInfo[]           // Available barbers
  mode?: 'set-parameters' | 'quick' // Operating mode
}
```

## Generated URL Parameters

The component generates URLs with the following parameter structure:

### Service Parameters
- `service` - Single service slug or comma-separated list
- `serviceId` - Service ID(s) for API integration

### Barber Parameters
- `barber` - Single barber slug or comma-separated list
- `barberId` - Barber ID(s) for API integration

### Date/Time Parameters
- `date` - Specific date (YYYY-MM-DD format)
- `dateRange` - Date range (start,end format)
- `time` - Specific time (HH:MM format)
- `timeRange` - Time range (start,end format)
- `duration` - Appointment duration in minutes

### Booking Constraints
- `leadTime` - Minimum lead time in hours
- `maxAdvance` - Maximum advance booking in days
- `quickBook` - Enable quick booking (boolean)
- `recurring` - Enable recurring options (boolean)

### Campaign Tracking
- `campaign` - Campaign name
- `source` - Traffic source
- `utm_source`, `utm_medium`, `utm_campaign` - UTM parameters

## Example Generated URLs

### Basic Service Selection
```
https://book.6fb.com/your-business?service=haircut
```

### Multiple Services with Barber
```
https://book.6fb.com/your-business?service=haircut,shave&barber=marcus
```

### Date Range with Time Constraints
```
https://book.6fb.com/your-business?service=haircut&dateRange=2024-01-01,2024-01-31&timeRange=09:00,17:00
```

### Advanced Configuration
```
https://book.6fb.com/your-business?service=haircut&barber=marcus&leadTime=24&maxAdvance=30&quickBook=true&campaign=summer-promo
```

## Form Validation

The component includes comprehensive form validation:

- Date range validation (start < end)
- Time range validation (start < end)
- Lead time validation (non-negative)
- Duration validation (5-480 minutes)
- Max advance validation (minimum 1 day)
- Parameter length validation

## Responsive Design

- Mobile-optimized layout with collapsible sections
- Sticky preview panel on desktop
- Touch-friendly interface elements
- Responsive grid layouts

## Accessibility Features

- Keyboard navigation support
- Screen reader compatibility
- Focus management
- High contrast design elements
- Proper ARIA labels

## State Management

The component manages internal state for:
- Form parameters
- Service/barber selections
- Date/time ranges
- Validation errors
- URL generation
- Copy feedback

## Dependencies

- React 18+
- Next.js 14+
- Tailwind CSS
- Heroicons
- BookingLinkGenerator utility
- TypeScript types from `@/types/booking-links`

## Browser Support

- Modern browsers with ES2020 support
- Mobile Safari 14+
- Chrome 90+
- Firefox 88+
- Edge 90+

## Performance Considerations

- Memoized URL generation
- Debounced parameter updates
- Lazy loading for large service/barber lists
- Optimized re-renders with React.memo where appropriate

## Testing

See `LinkCustomizerExample.tsx` for a complete working example that demonstrates all features and integration patterns.

## Future Enhancements

- QR code generation for URLs
- URL shortening integration
- Analytics tracking
- Template save/load functionality
- Bulk link generation
- CSV export of generated links