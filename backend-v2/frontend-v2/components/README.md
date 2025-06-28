# Calendar Components

This directory contains the simple calendar booking components for the 6FB booking system.

## Components

### Calendar.tsx
A month-view calendar component that:
- Shows the current month with navigation
- Highlights today's date
- Shows selected date
- Displays dots on dates with existing bookings
- Disables past dates and dates more than 30 days in the future
- Mobile responsive

### TimeSlots.tsx
A time slot selector component that:
- Displays available time slots grouped by morning/afternoon/evening
- Shows unavailable slots as disabled
- Highlights the selected time slot
- Responsive grid layout

## Usage

The components are used in the booking flow at `/app/book/page.tsx`:

1. User selects a service
2. User picks a date from the calendar
3. Available time slots load for the selected date
4. User selects a time slot
5. User confirms the booking

## API Integration

The components integrate with the backend through these API endpoints:
- `GET /api/v1/bookings/slots?booking_date=YYYY-MM-DD` - Get available slots
- `POST /api/v1/bookings` - Create a booking
- `GET /api/v1/bookings` - Get user's bookings

## Styling

Components use Tailwind CSS for styling with:
- Clean, minimal design
- Blue color scheme for primary actions
- Gray scale for secondary elements
- Smooth transitions
- Mobile-first responsive design