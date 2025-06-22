# Booking System Components

This directory contains the React components for the 6FB Payouts platform booking system. These components are designed to be modular, reusable, and fully integrated with the booking API.

## Components

### 1. BookingWidget
**File:** `BookingWidget.tsx`

A complete booking flow component that combines service selection, availability calendar, and confirmation steps.

**Features:**
- Multi-step booking process
- Progress indicator
- Service selection integration
- Date/time selection
- Booking confirmation
- Error handling and loading states
- Embeddable widget support

**Props:**
- `barberId?: number` - Pre-select a specific barber
- `locationId?: number` - Filter by location
- `serviceId?: number` - Pre-select a service
- `onBookingComplete?: (bookingData: any) => void` - Callback when booking is completed
- `className?: string` - Custom CSS classes
- `embedded?: boolean` - Whether to render as embedded widget

**Usage:**
```tsx
<BookingWidget
  locationId={1}
  onBookingComplete={(booking) => console.log('Booking completed', booking)}
/>
```

### 2. ServiceSelector
**File:** `ServiceSelector.tsx`

A component for browsing and selecting services with filtering and search capabilities.

**Features:**
- Service categorization
- Search functionality
- Filter by category
- Service details display
- Popular service highlighting
- Add-on services support

**Props:**
- `locationId?: number` - Filter services by location
- `barberId?: number` - Filter services by barber
- `onServiceSelect: (service: Service) => void` - Callback when service is selected
- `selectedService: Service | null` - Currently selected service
- `className?: string` - Custom CSS classes

**Usage:**
```tsx
<ServiceSelector
  locationId={1}
  onServiceSelect={(service) => setSelectedService(service)}
  selectedService={selectedService}
/>
```

### 3. AvailabilityCalendar
**File:** `AvailabilityCalendar.tsx`

An interactive calendar component for selecting appointment dates and times.

**Features:**
- Monthly calendar view
- Available time slot display
- Barber availability
- Time slot selection
- Multi-barber support
- Responsive design

**Props:**
- `service: any` - Service details for availability check
- `barberId?: number` - Filter by specific barber
- `locationId?: number` - Filter by location
- `onDateTimeSelect: (date: Date, time: string, barber: any) => void` - Callback when date/time is selected
- `className?: string` - Custom CSS classes

**Usage:**
```tsx
<AvailabilityCalendar
  service={selectedService}
  locationId={1}
  onDateTimeSelect={(date, time, barber) =>
    console.log('Selected:', { date, time, barber })
  }
/>
```

### 4. BarberProfile
**File:** `BarberProfile.tsx`

A comprehensive barber profile component displaying information, services, and reviews.

**Features:**
- Barber information display
- Services offered
- Weekly availability schedule
- Customer reviews
- Portfolio gallery
- Certifications
- Booking integration

**Props:**
- `barberId: number` - Barber ID to display
- `onBookService?: (serviceId: number) => void` - Callback for service booking
- `showBookingButton?: boolean` - Whether to show booking buttons
- `className?: string` - Custom CSS classes

**Usage:**
```tsx
<BarberProfile
  barberId={1}
  onBookService={(serviceId) => startBooking(serviceId)}
  showBookingButton={true}
/>
```

### 5. BookingConfirmation
**File:** `BookingConfirmation.tsx`

A confirmation page component displaying booking details and actions.

**Features:**
- Booking summary display
- Calendar integration
- Sharing options
- Download confirmation
- Email notifications
- Action buttons

**Props:**
- `booking: BookingDetails` - Booking details to display
- `onNewBooking?: () => void` - Callback for new booking
- `onViewBookings?: () => void` - Callback to view all bookings
- `className?: string` - Custom CSS classes
- `showAnimation?: boolean` - Whether to show success animation

**Usage:**
```tsx
<BookingConfirmation
  booking={bookingDetails}
  onNewBooking={() => router.push('/booking')}
  onViewBookings={() => router.push('/bookings')}
/>
```

## API Integration

The components are integrated with the booking API service located at `src/lib/api/bookings.ts`. The API service provides:

- Service management
- Availability checking
- Booking creation and management
- Barber information
- Reviews and ratings

## Styling

All components use Tailwind CSS for styling and are built on top of the existing UI component library located in `src/components/ui/`. The components are fully responsive and follow the established design patterns of the 6FB Payouts platform.

## TypeScript Support

All components are fully typed with TypeScript, providing excellent developer experience and type safety. Type definitions are exported from the main index file for easy importing.

## Demo

A demo page is available at `/demo/booking` that showcases all the components with sample data and interactive features.

## Installation

The components are already included in the project. To use them in your code:

```tsx
import {
  BookingWidget,
  ServiceSelector,
  AvailabilityCalendar,
  BarberProfile,
  BookingConfirmation
} from '@/components/booking'
```

## Customization

Components can be customized through:
- Props for configuration
- CSS classes for styling
- Callback functions for integration
- Theme variables for colors and spacing

All components accept a `className` prop for additional styling customization.
