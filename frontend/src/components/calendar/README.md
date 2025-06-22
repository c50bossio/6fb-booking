# Premium Calendar Component Suite

A comprehensive, modern calendar system designed specifically for barber booking applications with a premium dark theme and violet/purple gradients.

## 🌟 Features

- **Dark Premium Theme**: Deep grays/blacks with vibrant violet/purple gradients
- **Multiple Views**: Month, Week, and Day views with smooth transitions
- **Responsive Design**: Automatically adapts between desktop and mobile layouts
- **Drag & Drop**: Intuitive appointment rescheduling with visual feedback
- **Real-time Updates**: Live appointment synchronization every 30 seconds
- **Complete CRUD**: Create, read, update, and delete appointments
- **Form Validation**: Comprehensive client-side validation with error handling
- **Status Management**: Visual status indicators with color coding
- **Mobile Optimized**: Touch-friendly interface with gesture support
- **API Integration**: Full backend integration with error handling

## 🚀 Quick Start

```tsx
import { CalendarSystem } from '@/components/calendar'

function MyCalendar() {
  return (
    <CalendarSystem
      initialView="week"
      darkMode={true}
      enableDragDrop={true}
      locationId={1}
      onAppointmentCreate={(appointment) => console.log('Created:', appointment)}
      onAppointmentUpdate={(appointment) => console.log('Updated:', appointment)}
      onAppointmentDelete={(id) => console.log('Deleted:', id)}
    />
  )
}
```

## 📱 Responsive Usage

The calendar automatically adapts to different screen sizes. For manual control:

```tsx
import { ResponsiveCalendar, useResponsiveCalendar } from '@/components/calendar'

function ResponsiveExample() {
  const { isMobile, getOptimalProps } = useResponsiveCalendar()

  return (
    <ResponsiveCalendar
      {...getOptimalProps()}
      forceMobile={false} // Set to true to force mobile view
      breakpoint={768}    // Customize breakpoint
    />
  )
}
```

## 🎨 Components Overview

### PremiumCalendar
The core calendar component with advanced styling and interactions.

```tsx
<PremiumCalendar
  appointments={appointments}
  onAppointmentClick={handleAppointmentClick}
  onTimeSlotClick={handleTimeSlotClick}
  initialView="week"
  darkMode={true}
  barbers={barbers}
  services={services}
/>
```

### CalendarSystem
Complete calendar system with modals and API integration.

```tsx
<CalendarSystem
  locationId={1}
  barberId={2}
  enableDragDrop={true}
  onAppointmentCreate={handleCreate}
/>
```

### MobileCalendar
Mobile-optimized calendar with touch-friendly interface.

```tsx
<MobileCalendar
  appointments={appointments}
  onAppointmentClick={handleClick}
  darkMode={true}
/>
```

### DragDropCalendar
Enhanced calendar with drag and drop functionality.

```tsx
<DragDropCalendar
  appointments={appointments}
  onAppointmentMove={handleMove}
  enableDragDrop={true}
/>
```

## 🔧 Component Props

### CalendarSystem Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialView` | `'month' \| 'week' \| 'day'` | `'week'` | Initial calendar view |
| `initialDate` | `Date` | `new Date()` | Initial date to display |
| `locationId` | `number` | - | Filter appointments by location |
| `barberId` | `number` | - | Filter appointments by barber |
| `enableDragDrop` | `boolean` | `true` | Enable drag and drop functionality |
| `darkMode` | `boolean` | `true` | Use dark theme |
| `onAppointmentCreate` | `(appointment) => void` | - | Callback when appointment is created |
| `onAppointmentUpdate` | `(appointment) => void` | - | Callback when appointment is updated |
| `onAppointmentDelete` | `(id) => void` | - | Callback when appointment is deleted |

### Appointment Object Structure

```typescript
interface CalendarAppointment {
  id: string
  title: string
  client: string
  clientId?: number
  barber: string
  barberId: number
  startTime: string        // "HH:MM" format
  endTime: string          // "HH:MM" format
  service: string
  serviceId?: number
  price: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show'
  date: string             // "YYYY-MM-DD" format
  notes?: string
  duration: number         // in minutes
  clientPhone?: string
  clientEmail?: string
}
```

## 🎨 Styling & Themes

The calendar uses a sophisticated color system with CSS custom properties:

```css
/* Primary violet/purple gradients */
--appointment-primary: 262 83% 58%;
--appointment-secondary: 285 85% 65%;

/* Status colors */
--appointment-success: 142 71% 45%;   /* Completed */
--appointment-warning: 45 93% 58%;    /* Pending */
--appointment-danger: 0 84% 60%;      /* Cancelled */

/* Dark theme base */
--charcoal-dark: 222 84% 5%;
--charcoal-medium: 215 28% 17%;
--charcoal-light: 215 20% 25%;
```

### Custom Status Colors

```tsx
const customStatusColors = {
  confirmed: 'bg-gradient-to-br from-violet-600 to-purple-700',
  completed: 'bg-gradient-to-br from-emerald-600 to-green-700',
  pending: 'bg-gradient-to-br from-amber-500 to-orange-600',
  cancelled: 'bg-gradient-to-br from-red-500 to-red-600',
  no_show: 'bg-gradient-to-br from-gray-500 to-gray-600'
}
```

## 📱 Mobile Features

- **Week & Agenda Views**: Optimized for small screens
- **Touch Gestures**: Swipe navigation and touch interactions
- **Floating Action Button**: Quick appointment creation
- **Compact Layout**: Efficient use of screen space
- **Bottom Navigation**: Easy view switching

## 🔄 Real-time Updates

The calendar automatically refreshes every 30 seconds to show live updates:

```tsx
// Automatic refresh setup
useEffect(() => {
  const interval = setInterval(() => {
    loadAppointments()
  }, 30000)

  return () => clearInterval(interval)
}, [])
```

## 🎯 Drag & Drop

Intuitive appointment rescheduling with visual feedback:

```tsx
const handleAppointmentMove = async (
  appointmentId: string,
  newDate: string,
  newTime: string
) => {
  try {
    await appointmentsService.updateAppointment(appointmentId, {
      appointment_date: newDate,
      appointment_time: newTime
    })
    toast.success('Appointment moved successfully!')
  } catch (error) {
    toast.error('Failed to move appointment')
  }
}
```

## 🔌 API Integration

The calendar integrates with your backend API:

```typescript
// Example API calls
import { appointmentsService, bookingService } from '@/lib/api'

// Load appointments
const appointments = await appointmentsService.getAppointments({
  start_date: '2024-06-01',
  end_date: '2024-06-30',
  barber_id: 1
})

// Create appointment
const newAppointment = await appointmentsService.createAppointment({
  barber_id: 1,
  client_name: 'John Doe',
  appointment_date: '2024-06-22',
  appointment_time: '10:00',
  service_name: 'Haircut',
  service_duration: 60,
  service_price: 45
})
```

## 🔧 Customization

### Custom Time Slots

```tsx
<PremiumCalendar
  workingHours={{ start: '08:00', end: '20:00' }}
  timeSlotDuration={30} // 30-minute slots
/>
```

### Custom Barbers & Services

```tsx
const customBarbers = [
  { id: 1, name: 'John', specialties: ['Fades'], rating: 4.9 },
  { id: 2, name: 'Jane', specialties: ['Colors'], rating: 4.8 }
]

const customServices = [
  { id: 1, name: 'Haircut', duration: 45, price: 35 },
  { id: 2, name: 'Shave', duration: 30, price: 25 }
]

<CalendarSystem
  barbers={customBarbers}
  services={customServices}
/>
```

## 🎨 Animation Features

- **Smooth transitions** between views
- **Hover effects** on appointments and time slots
- **Loading states** with skeleton animations
- **Success animations** for form submissions
- **Drag previews** with opacity and scaling

## 🛠️ Development

### Building Custom Components

```tsx
import { CalendarAppointment } from '@/components/calendar'

interface CustomCalendarProps {
  appointments: CalendarAppointment[]
  onAppointmentClick: (appointment: CalendarAppointment) => void
}

function CustomCalendar({ appointments, onAppointmentClick }: CustomCalendarProps) {
  return (
    <div className="premium-card-dark-modern">
      {/* Your custom implementation */}
    </div>
  )
}
```

### Using Hooks

```tsx
import { useResponsiveCalendar, useDragDrop } from '@/components/calendar'

function MyComponent() {
  const { isMobile, getOptimalProps } = useResponsiveCalendar()
  const { dragState, startDrag, endDrag } = useDragDrop(appointments, handleMove)

  // Your component logic
}
```

## 🚨 Error Handling

The calendar includes comprehensive error handling:

```tsx
try {
  await createAppointment(formData)
  toast.success('Appointment created!')
} catch (error) {
  console.error('Error:', error)
  toast.error('Failed to create appointment')
}
```

## 🔍 Accessibility

- **Keyboard navigation** support
- **Screen reader** friendly
- **Focus management** in modals
- **High contrast** mode support
- **ARIA labels** for interactive elements

## 📝 License

This calendar component suite is part of the 6FB Booking System.

---

For more examples and advanced usage, check the component source files in `/src/components/calendar/`.
