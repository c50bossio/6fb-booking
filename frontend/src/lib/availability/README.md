# Real-Time Availability System

A comprehensive real-time availability checking system for the calendar application that provides intelligent conflict resolution, slot reservations, and optimized booking suggestions.

## Features

### 🔄 Real-Time Availability
- Live availability checking with automatic cache management
- Concurrent booking prevention with slot reservation system
- Intelligent cache invalidation and refresh strategies
- Performance optimized with configurable TTL and stale data handling

### ⚡ Conflict Resolution
- Advanced conflict detection (overlaps, buffer violations, business rules)
- Automatic resolution suggestions with confidence scoring
- Smart rescheduling with minimal disruption to existing appointments
- Buffer time optimization and management

### 🎯 Intelligent Recommendations
- AI-powered slot scoring based on multiple factors
- Alternative time and date suggestions
- Cross-barber availability when preferred barber is unavailable
- Preference-based ranking and filtering

### 🔒 Concurrency Control
- Temporary slot reservations to prevent double booking
- Request ID tracking for proper cleanup
- Automatic expiration of abandoned reservations
- Optimistic UI updates with fallback handling

## Architecture

### Core Components

1. **AvailabilityService** (`availability-service.ts`)
   - Central service for all availability operations
   - Handles caching, API integration, and data transformation
   - Manages concurrent slot reservations

2. **ConflictResolver** (`conflict-resolver.ts`)
   - Advanced conflict detection and resolution
   - Business rule validation
   - Smart rescheduling algorithms

3. **useAvailability Hook** (`../../hooks/useAvailability.ts`)
   - React hook for availability management
   - Loading states, error handling, and cache management
   - Real-time updates and optimistic UI updates

4. **AvailabilityIndicator Component** (`../../components/calendar/AvailabilityIndicator.tsx`)
   - Visual representation of availability data
   - Interactive slot selection with conflict warnings
   - Theme-aware styling and responsive design

## Usage

### Basic Availability Checking

```typescript
import { useAvailability } from '@/lib/availability'

function MyComponent() {
  const { availability, isLoading, error } = useAvailability({
    date: '2024-06-24',
    barberId: 1,
    serviceId: 2,
    duration: 60
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      {availability?.slots.map(slot => (
        <div key={slot.time} className={slot.available ? 'available' : 'busy'}>
          {slot.time} - {slot.barberName}
        </div>
      ))}
    </div>
  )
}
```

### Conflict Detection

```typescript
import { useConflictDetection } from '@/lib/availability'

function ConflictChecker() {
  const { conflicts, isChecking } = useConflictDetection({
    barberId: 1,
    date: '2024-06-24',
    time: '14:00',
    duration: 60,
    serviceId: 2,
    priority: 'normal',
    isRescheduling: false
  })

  return (
    <div>
      {conflicts.map((conflict, index) => (
        <div key={index} className={`conflict-${conflict.severity}`}>
          {conflict.message}
          {conflict.suggestedResolutions.map(resolution => (
            <button key={resolution.id}>
              {resolution.description}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
```

### UI Component

```typescript
import { AvailabilityIndicator } from '@/lib/availability'

function BookingCalendar() {
  return (
    <AvailabilityIndicator
      date="2024-06-24"
      serviceId={2}
      duration={60}
      barberId={1}
      showRecommendations={true}
      showConflicts={true}
      onSlotSelect={(time, barberId) => {
        console.log('Selected:', time, barberId)
      }}
      onConflictDetected={(conflicts) => {
        console.log('Conflicts detected:', conflicts)
      }}
    />
  )
}
```

### Slot Reservation

```typescript
import { useSlotReservation } from '@/lib/availability'

function SlotBooking() {
  const { reserveSlot, releaseSlot, isSlotReserved } = useSlotReservation()

  const handleReserve = async () => {
    const reserved = await reserveSlot(1, '2024-06-24', '14:00', 60)
    if (reserved) {
      // Proceed with booking
      setTimeout(() => {
        releaseSlot(1, '2024-06-24', '14:00')
      }, 5 * 60 * 1000) // Release after 5 minutes
    }
  }

  return (
    <button
      onClick={handleReserve}
      disabled={isSlotReserved(1, '2024-06-24', '14:00')}
    >
      Reserve Slot
    </button>
  )
}
```

## Configuration

### Availability Options

```typescript
const availabilityOptions = {
  autoRefresh: true,           // Auto-refresh availability data
  refreshInterval: 30000,      // Refresh every 30 seconds
  staleTime: 60000,           // Data is stale after 1 minute
  retryOnError: true,         // Retry failed requests
  maxRetries: 3,              // Maximum retry attempts
  enableOptimisticUpdates: true, // Enable optimistic UI updates
  onError: (error) => {
    console.error('Availability error:', error)
  },
  onConflict: (conflicts) => {
    console.warn('Conflicts detected:', conflicts)
  }
}
```

### Rescheduling Options

```typescript
const reschedulingOptions = {
  allowDifferentBarber: true,
  allowDifferentDate: true,
  maxDaysOut: 7,
  maxTimeShift: 120, // 2 hours
  preferredTimeRanges: [
    { start: '09:00', end: '17:00' }
  ],
  prioritizeClientPreference: true,
  minimizeDisruption: true,
  bufferTimeRequired: 15
}
```

## Error Handling

The system uses the central error management system and provides comprehensive error recovery:

```typescript
// Automatic retry with exponential backoff
const { availability } = useAvailability(request, {
  retryOnError: true,
  maxRetries: 3,
  onError: (error) => {
    // Handle specific error types
    if (error.code === 'NETWORK_ERROR') {
      // Show network error message
    } else if (error.code === 'VALIDATION_ERROR') {
      // Show validation error
    }
  }
})
```

## Performance Considerations

### Caching Strategy
- Availability data cached for 2 minutes
- Intelligent cache invalidation on booking changes
- Stale data detection with 30-second threshold
- Pattern-based cache invalidation

### Optimization Features
- Debounced API calls for frequent requests
- Optimistic UI updates for better UX
- Concurrent request deduplication
- Memory-efficient slot reservation tracking

### Best Practices
1. Use appropriate refresh intervals based on user activity
2. Enable optimistic updates for interactive components
3. Handle loading and error states gracefully
4. Clean up reservations on component unmount
5. Use conflict detection before final booking submission

## API Integration

The system integrates with the existing appointments API:

- `GET /appointments/availability/{barberId}` - Single barber availability
- `GET /appointments/availability` - Multi-barber availability
- `POST /appointments/check-conflicts` - Conflict detection
- `GET /appointments/{id}/reschedule-suggestions` - Rescheduling options

## Testing

```bash
# Run availability system tests
npm test -- --testPathPattern=availability

# Test specific components
npm test -- useAvailability.test.ts
npm test -- conflict-resolver.test.ts
npm test -- AvailabilityIndicator.test.tsx
```

## Future Enhancements

- WebSocket integration for real-time updates
- Advanced AI-powered recommendations
- Multi-service booking support
- Waitlist management integration
- Analytics and usage tracking
- Mobile-specific optimizations
