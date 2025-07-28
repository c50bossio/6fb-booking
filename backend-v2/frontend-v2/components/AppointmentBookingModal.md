# AppointmentBookingModal Component

A comprehensive, production-ready appointment booking modal component for the Six Figure Barber calendar system. This component provides a complete booking experience with time slot selection, conflict detection, form validation, and mobile optimization.

## Features

### Core Functionality
- ✅ **Professional Modal Layout**: Clean, responsive modal design
- ✅ **Client Selection**: Search existing clients or create new ones
- ✅ **Service Selection**: Dropdown with service details and pricing
- ✅ **Date/Time Selection**: Interactive calendar and time slot grid
- ✅ **Barber Assignment**: Optional barber selection for appointments
- ✅ **Form Validation**: Comprehensive client-side validation with error messages
- ✅ **Conflict Detection**: Real-time conflict detection and warnings
- ✅ **API Integration**: Full integration with backend appointment endpoints

### Accessibility Features
- ✅ **Screen Reader Support**: ARIA labels, live regions, and semantic markup
- ✅ **Keyboard Navigation**: Full keyboard navigation with arrow keys
- ✅ **Focus Management**: Proper focus handling and tab order
- ✅ **High Contrast**: Proper color contrast for visually impaired users
- ✅ **Touch Optimization**: Minimum 48px touch targets for mobile

### Mobile Optimization
- ✅ **Responsive Design**: Adapts to all screen sizes
- ✅ **Touch-Friendly**: Large touch targets and touch-optimized interactions
- ✅ **iOS Safari Optimization**: `touch-manipulation` CSS for better performance
- ✅ **Reduced Motion**: Respects user's reduced motion preferences

## Usage

### Basic Usage

```tsx
import AppointmentBookingModal from '@/components/AppointmentBookingModal'
import { useAppointmentBookingModal } from '@/hooks/useAppointmentBookingModal'

function CalendarPage() {
  const { modalState, openModal, closeModal, handleAppointmentCreated } = useAppointmentBookingModal({
    onAppointmentCreated: (appointment) => {
      console.log('New appointment:', appointment)
      // Refresh calendar data
    }
  })

  return (
    <div>
      <button onClick={() => openModal()}>
        Book Appointment
      </button>

      <AppointmentBookingModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        selectedDate={modalState.selectedDate}
        selectedTime={modalState.selectedTime}
        selectedBarber={modalState.selectedBarber}
        existingAppointments={appointments}
        onAppointmentCreated={handleAppointmentCreated}
      />
    </div>
  )
}
```

### With Calendar Integration

```tsx
import CalendarWithBookingModal from '@/components/calendar/CalendarWithBookingModal'

function CalendarView() {
  const [appointments, setAppointments] = useState([])

  const handleAppointmentCreated = (newAppointment) => {
    setAppointments(prev => [...prev, newAppointment])
    toast({ title: 'Appointment booked successfully!' })
  }

  return (
    <CalendarWithBookingModal
      currentDate={new Date()}
      appointments={appointments}
      onAppointmentCreated={handleAppointmentCreated}
    />
  )
}
```

### Advanced Usage with Pre-selected Values

```tsx
function QuickBookButton({ client, service, preferredDate }) {
  const { openModal } = useAppointmentBookingModal()

  const handleQuickBook = () => {
    openModal({
      selectedDate: preferredDate,
      selectedTime: '14:00', // 2 PM
      preselectedClient: client,
      preselectedService: service
    })
  }

  return <button onClick={handleQuickBook}>Quick Book</button>
}
```

## Props

### AppointmentBookingModal Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | ✅ | Controls modal visibility |
| `onClose` | `() => void` | ✅ | Called when modal should close |
| `selectedDate` | `Date` | ❌ | Pre-selected date |
| `selectedTime` | `string` | ❌ | Pre-selected time (HH:MM format) |
| `selectedBarber` | `User` | ❌ | Pre-selected barber |
| `existingAppointments` | `any[]` | ❌ | Appointments for conflict detection |
| `onAppointmentCreated` | `(appointment: any) => void` | ❌ | Called when appointment is created |
| `className` | `string` | ❌ | Additional CSS classes |

### useAppointmentBookingModal Hook

```tsx
const {
  modalState,      // Current modal state
  openModal,       // Open modal with optional pre-selected values
  closeModal,      // Close modal and reset state
  openForTimeSlot, // Open modal for specific time slot
  updateAppointments, // Update appointments for conflict detection
  handleAppointmentCreated, // Handle successful appointment creation
  isOpen          // Boolean indicating if modal is open
} = useAppointmentBookingModal({
  onAppointmentCreated: (appointment) => void,
  defaultDate?: Date,
  defaultBarber?: User
})
```

## Integration Guide

### Step 1: Install Dependencies

Ensure your project has the required dependencies:

```json
{
  "date-fns": "^2.30.0",
  "@heroicons/react": "^2.0.18",
  "react": "^18.0.0"
}
```

### Step 2: Import Required Components

```tsx
import AppointmentBookingModal from '@/components/AppointmentBookingModal'
import { useAppointmentBookingModal } from '@/hooks/useAppointmentBookingModal'
```

### Step 3: Set Up State Management

```tsx
function YourComponent() {
  const [appointments, setAppointments] = useState([])
  
  const { modalState, openModal, closeModal } = useAppointmentBookingModal({
    onAppointmentCreated: (newAppointment) => {
      setAppointments(prev => [...prev, newAppointment])
    }
  })

  // Your component logic
}
```

### Step 4: Add Modal to JSX

```tsx
return (
  <div>
    {/* Your existing content */}
    
    <AppointmentBookingModal
      isOpen={modalState.isOpen}
      onClose={closeModal}
      existingAppointments={appointments}
      onAppointmentCreated={modalState.handleAppointmentCreated}
    />
  </div>
)
```

## API Integration

The component integrates with the following API endpoints:

### Required Endpoints

1. **Get Available Slots**: `GET /api/v2/appointments/slots`
2. **Create Appointment**: `POST /api/v2/appointments/enhanced`
3. **Search Clients**: `GET /api/v2/clients/search`
4. **Create Client**: `POST /api/v2/clients`
5. **Get Services**: `GET /api/v2/services`
6. **Get Barbers**: `GET /api/v2/users/barbers`

### API Response Formats

```typescript
// Time Slots Response
interface SlotsResponse {
  date: string
  slots: TimeSlot[]
  next_available?: NextAvailableSlot
  business_hours: BusinessHours
}

// Appointment Creation Request
interface EnhancedAppointmentCreate {
  client_id: number
  service_id: number
  barber_id?: number
  appointment_date: string // YYYY-MM-DD
  appointment_time: string // HH:MM
  duration_minutes: number
  price: number
  notes?: string
  timezone: string
}
```

## Conflict Detection

The component includes sophisticated conflict detection:

### Conflict Types
- **Time Overlap**: Appointments that overlap in time
- **Double Booking**: Same barber booked at the same time
- **Business Hours**: Appointments outside business hours
- **Barber Unavailable**: Barber has time off or is unavailable

### Visual Indicators
- 🟡 **Yellow**: Minor conflicts or warnings
- 🔴 **Red**: Critical conflicts that prevent booking
- 🟢 **Green**: Recommended time slots
- ⭐ **Badge**: Next available appointment

## Customization

### Styling

The component uses Tailwind CSS classes and can be customized via:

```tsx
<AppointmentBookingModal
  className="custom-booking-modal"
  // Other props
/>
```

### Custom CSS Classes

```css
.booking-modal {
  /* Custom modal styles */
}

.booking-modal .time-slot-grid {
  /* Custom time slot grid styles */
}

.booking-modal .conflict-warning {
  /* Custom conflict warning styles */
}
```

### Theme Support

The component supports both light and dark themes via Tailwind's dark mode classes.

## Testing

### Unit Testing

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AppointmentBookingModal from '@/components/AppointmentBookingModal'

test('renders booking modal with form fields', () => {
  render(
    <AppointmentBookingModal
      isOpen={true}
      onClose={jest.fn()}
    />
  )

  expect(screen.getByText('Book New Appointment')).toBeInTheDocument()
  expect(screen.getByLabelText(/client/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/service/i)).toBeInTheDocument()
})
```

### E2E Testing

```tsx
// Playwright example
test('complete booking flow', async ({ page }) => {
  await page.goto('/calendar')
  await page.click('[data-testid="book-appointment"]')
  
  // Fill form
  await page.fill('[data-testid="client-search"]', 'John Doe')
  await page.click('[data-testid="service-haircut"]')
  await page.click('[data-testid="time-slot-14:00"]')
  
  // Submit
  await page.click('[data-testid="submit-booking"]')
  
  // Verify success
  await expect(page.locator('.success-message')).toBeVisible()
})
```

## Best Practices

### Performance
- Use `memo()` for expensive computations
- Debounce API calls for search inputs
- Lazy load time slots only when needed

### Accessibility
- Always provide meaningful ARIA labels
- Test with screen readers
- Ensure keyboard navigation works
- Maintain proper focus management

### User Experience
- Show loading states during API calls
- Provide clear error messages
- Use optimistic updates where appropriate
- Implement proper validation feedback

### Mobile
- Test on actual devices
- Use large touch targets (min 48px)
- Consider thumb navigation patterns
- Optimize for slow networks

## Troubleshooting

### Common Issues

1. **Modal not opening**: Check `isOpen` prop and state management
2. **Time slots not loading**: Verify API endpoints and permissions
3. **Conflicts not detected**: Ensure `existingAppointments` prop is provided
4. **Validation errors**: Check form data structure and API response format

### Debug Mode

Enable debug logging:

```tsx
const debugMode = process.env.NODE_ENV === 'development'

if (debugMode) {
  console.log('Modal state:', modalState)
  console.log('Form data:', formData)
  console.log('Available slots:', enhancedSlots)
}
```

## Six Figure Barber Alignment

This component supports the Six Figure Barber methodology by:

- **Revenue Optimization**: Clear pricing display and upselling opportunities
- **Client Value Creation**: Smooth booking experience and conflict prevention
- **Business Efficiency**: Automated scheduling and conflict detection
- **Professional Growth**: Premium UI that reflects barber's brand quality
- **Scalability**: Supports multiple barbers and complex scheduling rules

## Contributing

When contributing to this component:

1. Maintain accessibility standards (WCAG 2.1 AA)
2. Follow Six Figure Barber design principles
3. Add comprehensive tests for new features
4. Update documentation for API changes
5. Test on multiple devices and browsers

## Version History

- **v1.0**: Initial release with basic booking functionality
- **v1.1**: Added conflict detection and mobile optimization
- **v1.2**: Enhanced accessibility and keyboard navigation
- **v1.3**: Added advanced scheduling features and barber selection

---

For questions or support, please refer to the main project documentation or create an issue in the repository.