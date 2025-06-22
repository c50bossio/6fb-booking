# Premium Calendar API Integration

This directory contains comprehensive API integration utilities for the 6FB booking system's premium calendar. The integration provides real-time functionality, caching strategies, WebSocket support, and timezone handling.

## Overview

The API integration is built with the following principles:
- **Type Safety**: Full TypeScript support with comprehensive interfaces
- **Performance**: Intelligent caching and optimistic updates
- **Real-time**: WebSocket integration for live updates
- **Reliability**: Error handling and retry mechanisms
- **Scalability**: Modular architecture with service separation

## Services

### Core Services

#### `calendarService`
Main calendar integration with real-time updates and caching.

```typescript
import { calendarService } from '@/lib/api'

// Get calendar events
const events = await calendarService.getCalendarEvents(
  new Date('2024-01-01'),
  new Date('2024-01-31'),
  { barberIds: [1, 2] }
)

// Create appointment
const appointment = await calendarService.createAppointment({
  barberId: 1,
  serviceId: 2,
  clientName: 'John Doe',
  appointmentDate: '2024-01-15',
  appointmentTime: '10:00'
})

// Real-time updates
calendarService.on('appointment_created', (appointment) => {
  console.log('New appointment:', appointment)
})
```

#### `appointmentsService`
Enhanced appointment management with conflict checking and bulk operations.

```typescript
import { appointmentsService } from '@/lib/api'

// Get appointments with filtering
const appointments = await appointmentsService.getAppointments({
  barber_id: 1,
  start_date: '2024-01-01',
  end_date: '2024-01-31',
  status: ['scheduled', 'confirmed']
})

// Check for conflicts
const conflicts = await appointmentsService.checkConflicts({
  barberId: 1,
  serviceId: 2,
  appointmentDate: '2024-01-15',
  appointmentTime: '10:00'
})

// Get rescheduling suggestions
const suggestions = await appointmentsService.getRescheduleSuggestions(
  appointmentId,
  ['2024-01-16', '2024-01-17']
)
```

#### `servicesService`
Service and category management with pricing rules.

```typescript
import { servicesService } from '@/lib/api'

// Get services with filtering
const services = await servicesService.getServices({
  category_id: 1,
  is_active: true,
  location_id: 1
})

// Calculate dynamic pricing
const pricing = await servicesService.calculatePrice(
  serviceId,
  barberId,
  '2024-01-15',
  '10:00'
)

// Create pricing rule
const rule = await servicesService.createPricingRule({
  name: 'Peak Hours Surcharge',
  rule_type: 'time_based',
  conditions: {
    start_time: '17:00',
    end_time: '19:00',
    days_of_week: [1, 2, 3, 4, 5]
  },
  adjustment: {
    type: 'percentage',
    amount: 20,
    operation: 'add'
  }
})
```

#### `barbersService`
Barber profile and schedule management.

```typescript
import { barbersService } from '@/lib/api'

// Get barber availability
const availability = await barbersService.getAvailability(
  barberId,
  '2024-01-15',
  '2024-01-21',
  serviceId,
  60 // duration
)

// Update schedule
const schedule = await barbersService.updateSchedule(barberId, [
  {
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    break_start: '12:00',
    break_end: '13:00',
    is_working: true,
    location_id: 1
  }
])

// Create time off request
const timeOff = await barbersService.createAvailabilityBlock(barberId, {
  start_datetime: '2024-01-20T09:00:00',
  end_datetime: '2024-01-20T17:00:00',
  type: 'vacation',
  reason: 'Personal day'
})
```

#### `locationsService`
Location management with business hours and settings.

```typescript
import { locationsService } from '@/lib/api'

// Get locations with radius search
const locations = await locationsService.getLocations({
  within_radius: {
    latitude: 40.7128,
    longitude: -74.0060,
    radius_miles: 25
  }
})

// Update business hours
const hours = await locationsService.updateBusinessHours(locationId, [
  {
    day_of_week: 1,
    is_open: true,
    open_time: '09:00',
    close_time: '18:00'
  }
])

// Add special hours (holiday)
const specialHours = await locationsService.addSpecialHours(locationId, {
  date: '2024-12-25',
  reason: 'Christmas Day',
  is_closed: true
})
```

## Utilities

### Date/Time Utilities

```typescript
import {
  TimezoneHelper,
  DateHelper,
  TimeHelper,
  BusinessHoursHelper
} from '@/lib/utils/datetime'

// Timezone conversion
const convertedDate = TimezoneHelper.convertTimezone(
  new Date(),
  'America/New_York',
  'America/Los_Angeles'
)

// Time formatting
const formatted = TimeHelper.to12Hour('14:30') // "2:30 PM"

// Business hours check
const isOpen = BusinessHoursHelper.isWithinBusinessHours(
  businessHours,
  new Date()
)
```

### WebSocket Integration

```typescript
import { useCalendarWebSocket } from '@/lib/utils/websocket'

function CalendarComponent() {
  const {
    isConnected,
    onAppointmentUpdate,
    joinRoom,
    leaveRoom
  } = useCalendarWebSocket()

  useEffect(() => {
    // Join calendar room for location
    joinRoom(locationId)

    // Subscribe to appointment updates
    const unsubscribe = onAppointmentUpdate((data) => {
      console.log('Appointment updated:', data)
      // Update local state
    })

    return () => {
      unsubscribe()
      leaveRoom(locationId)
    }
  }, [locationId])
}
```

## Type System

The API integration provides comprehensive TypeScript types:

### Core Types

```typescript
// Calendar event with all data
interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  type: 'appointment' | 'availability' | 'blocked'
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  appointment?: CalendarAppointment
  availability?: CalendarAvailability
  editable?: boolean
  deletable?: boolean
}

// Enhanced appointment data
interface CalendarAppointment {
  id: number
  barberId: number
  barberName: string
  clientName: string
  serviceName: string
  serviceDuration: number
  servicePrice: number
  paymentStatus: 'paid' | 'pending' | 'failed'
  source: 'website' | 'phone' | 'walk_in' | 'staff'
  // ... more fields
}
```

### Filter and Request Types

```typescript
// Calendar filtering
interface CalendarFilters {
  barberIds?: number[]
  locationIds?: number[]
  serviceIds?: number[]
  statuses?: string[]
  clientSearch?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

// Appointment creation
interface CreateAppointmentRequest {
  barberId: number
  serviceId: number
  clientName: string
  clientEmail?: string
  appointmentDate: string
  appointmentTime: string
  timezone?: string
  sendConfirmation?: boolean
}
```

## Caching Strategy

The API integration includes intelligent caching:

### Cache Layers

1. **Memory Cache**: Fast access for recent data (5-minute TTL)
2. **Service Cache**: Per-service caching with automatic invalidation
3. **Real-time Invalidation**: WebSocket-triggered cache updates

### Cache Management

```typescript
// Manual cache control
calendarService.clearCache()

// Automatic invalidation on updates
calendarService.on('appointment_created', () => {
  // Cache automatically invalidated
})
```

## Error Handling

All services include comprehensive error handling:

```typescript
try {
  const appointment = await appointmentsService.createAppointment(data)
} catch (error) {
  if (error.response?.status === 409) {
    // Handle conflict
    const conflicts = error.response.data.conflicts
  } else if (error.response?.status === 400) {
    // Handle validation error
    const validationErrors = error.response.data.errors
  }
}
```

## Performance Optimizations

### Intelligent Batching

```typescript
// Multiple operations batched automatically
const results = await calendarService.bulkOperation({
  operation: 'create',
  appointments: [appointment1, appointment2, appointment3]
})
```

### Optimistic Updates

```typescript
// UI updates immediately, syncs in background
const optimisticAppointment = {
  id: 'temp_' + Date.now(),
  // ... appointment data
}

// Update UI immediately
setAppointments(prev => [...prev, optimisticAppointment])

// Sync with server
try {
  const realAppointment = await appointmentsService.createAppointment(data)
  // Replace optimistic with real data
  setAppointments(prev =>
    prev.map(apt => apt.id === optimisticAppointment.id ? realAppointment : apt)
  )
} catch (error) {
  // Remove optimistic update on error
  setAppointments(prev =>
    prev.filter(apt => apt.id !== optimisticAppointment.id)
  )
}
```

## Usage Examples

### Calendar Integration

```typescript
import { calendarService, CalendarEvent } from '@/lib/api'
import { useCalendarWebSocket } from '@/lib/utils/websocket'

function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const { onAppointmentUpdate } = useCalendarWebSocket()

  // Load initial data
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await calendarService.getCalendarEvents(
          startDate,
          endDate,
          filters
        )
        setEvents(response.data)
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [startDate, endDate, filters])

  // Real-time updates
  useEffect(() => {
    return onAppointmentUpdate((data) => {
      setEvents(prev => {
        // Update or add appointment
        const existing = prev.find(e => e.id === `appointment_${data.appointment_id}`)
        if (existing) {
          return prev.map(e =>
            e.id === existing.id
              ? { ...e, appointment: data.appointment }
              : e
          )
        } else {
          return [...prev, transformAppointmentToEvent(data.appointment)]
        }
      })
    })
  }, [])

  return (
    <div>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <Calendar events={events} />
      )}
    </div>
  )
}
```

### Appointment Booking Flow

```typescript
async function bookAppointment(data: CreateAppointmentRequest) {
  // 1. Check for conflicts
  const conflicts = await appointmentsService.checkConflicts(data)

  if (conflicts.data.has_conflicts) {
    // Show conflict resolution options
    return handleConflicts(conflicts.data)
  }

  // 2. Create appointment
  try {
    const appointment = await appointmentsService.createAppointment(data)

    // 3. Send confirmation
    if (data.sendConfirmation) {
      await appointmentsService.sendReminder(
        appointment.data.id,
        'email'
      )
    }

    return appointment.data
  } catch (error) {
    // Handle booking errors
    throw new BookingError('Failed to create appointment', error)
  }
}
```

## Best Practices

### 1. Use TypeScript Types

Always use the provided TypeScript types for better development experience and error prevention.

### 2. Handle Loading States

```typescript
const [loading, setLoading] = useState(false)

const handleAction = async () => {
  setLoading(true)
  try {
    await apiCall()
  } finally {
    setLoading(false)
  }
}
```

### 3. Implement Error Boundaries

```typescript
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundaryComponent
      fallback={<ErrorFallback />}
      onError={(error) => {
        console.error('API Error:', error)
        // Report to error tracking service
      }}
    >
      {children}
    </ErrorBoundaryComponent>
  )
}
```

### 4. Use Real-time Updates

Always subscribe to relevant WebSocket events for live data synchronization.

### 5. Implement Optimistic Updates

For better user experience, update the UI immediately and sync with the server in the background.

### 6. Cache Management

Let the automatic cache management handle most scenarios, but manually clear cache when needed for data consistency.

## Environment Configuration

Configure the API integration through environment variables:

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://api.6fb.com/api/v1
NEXT_PUBLIC_WS_URL=wss://api.6fb.com/ws

# Feature Flags
NEXT_PUBLIC_ENABLE_REAL_TIME=true
NEXT_PUBLIC_ENABLE_CACHING=true
NEXT_PUBLIC_DEBUG_API=false
```

## Testing

The API integration includes comprehensive testing utilities:

```typescript
import { mockCalendarService } from '@/lib/api/__tests__/mocks'

// Mock service for testing
jest.mock('@/lib/api', () => ({
  calendarService: mockCalendarService
}))

test('should load calendar events', async () => {
  mockCalendarService.getCalendarEvents.mockResolvedValue({
    data: [mockEvent1, mockEvent2]
  })

  // Test component
  render(<CalendarView />)

  await waitFor(() => {
    expect(screen.getByText('Event 1')).toBeInTheDocument()
  })
})
```

This comprehensive API integration provides a robust foundation for the premium calendar system with all the modern features expected in a professional booking application.
