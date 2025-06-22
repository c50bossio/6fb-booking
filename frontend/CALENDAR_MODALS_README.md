# Calendar Modal System

A comprehensive modal system for appointment management with premium dark theme styling and glass morphism effects.

## Features

### 🎨 Design Features
- **Glass morphism** with backdrop blur effects
- **Premium dark theme** with violet/purple accents
- **Smooth animations** and transitions using Headless UI
- **Fully responsive** design for all devices
- **Beautiful loading states** and error handling
- **Professional form validation** with inline error messages

### ⚡ Functionality Features
- **Form validation** with Zod schema validation
- **Search and filtering** capabilities in selection modals
- **Keyboard navigation** support and accessibility features
- **Focus management** with proper focus trapping
- **API integration** ready with TypeScript interfaces
- **Mock data** for demonstration and testing

## Modal Components

### 1. BaseModal
The foundation component that provides:
- Glass morphism styling
- Smooth animations using Headless UI Transition
- Keyboard navigation and focus management
- Customizable sizing and styling
- Backdrop blur and overlay effects

### 2. CreateAppointmentModal
Complete appointment creation flow with:
- Client information form (name, email, phone)
- Service selection with pricing and features
- Barber selection with ratings and specialties
- Date and time selection
- Additional notes field
- Form validation with error states
- Success confirmation with auto-close

### 3. AppointmentDetailsModal
Comprehensive appointment management:
- Read-only view mode with all appointment details
- Inline editing capabilities
- Status management (confirmed, pending, completed, cancelled)
- Client contact information with clickable links
- Edit/cancel action buttons
- Confirmation dialogs for destructive actions

### 4. ClientSelectionModal
Advanced client selection with:
- Real-time search functionality
- Recent clients section (last 30 days)
- Frequent clients section (5+ visits)
- Client cards with avatar, contact info, and visit history
- "Add new client" functionality
- Search across name, email, and phone

### 5. ServiceSelectionModal
Beautiful service catalog featuring:
- Category-based filtering
- Search by name, description, or features
- Service cards with pricing, duration, and features
- Popularity indicators and badges
- Category icons and color coding
- Responsive grid layout

### 6. TimeSlotPickerModal
Interactive time selection with:
- Visual date picker for next 30 days
- Time slots grouped by morning/afternoon/evening
- Availability visualization
- Service duration consideration
- Loading states for API calls
- Date navigation and formatting

### 7. ConfirmationModal
Clean confirmation dialogs for:
- Destructive actions (delete, cancel)
- Customizable messages and buttons
- Loading states for async operations
- Icon customization
- Accessible design

## File Structure

```
/src/components/modals/
├── BaseModal.tsx              # Foundation modal component
├── CreateAppointmentModal.tsx # Appointment creation
├── AppointmentDetailsModal.tsx # View/edit appointments
├── ClientSelectionModal.tsx   # Client search and selection
├── ServiceSelectionModal.tsx  # Service catalog
├── TimeSlotPickerModal.tsx   # Time selection
├── ConfirmationModal.tsx     # Action confirmations
└── index.ts                  # Export all modals
```

## Integration

### ModernCalendar Integration
The modal system is fully integrated into the ModernCalendar component:

```tsx
import ModernCalendar from '@/components/ModernCalendar'

<ModernCalendar
  appointments={appointments}
  onAppointmentClick={handleAppointmentClick}
  onTimeSlotClick={handleTimeSlotClick}
  view="week"
/>
```

### Calendar Page Implementation
The calendar page (`/dashboard/calendar`) showcases:
- Premium stats cards
- Animated background effects
- Integrated modal system
- Responsive design
- Professional styling

### Demo Page
Visit `/demo/calendar-modals` to see all modals in action with:
- Individual modal demos
- Feature explanations
- Interactive examples
- Mock data demonstrations

## Dependencies

### Required Packages
- `@headlessui/react` - For modal transitions and accessibility
- `react-hook-form` - Form handling and validation
- `@hookform/resolvers` - Form validation resolvers
- `zod` - Schema validation
- `@heroicons/react` - Icons
- `tailwindcss` - Styling

### CSS Enhancements
Custom CSS classes in `globals.css`:
- `.line-clamp-2` and `.line-clamp-3` for text truncation
- `.modal-backdrop` for enhanced blur effects
- Enhanced scrollbar styling
- Premium button and card styles

## Usage Examples

### Basic Modal Usage
```tsx
import { CreateAppointmentModal } from '@/components/modals'

function MyComponent() {
  const [showModal, setShowModal] = useState(false)

  const handleSuccess = (booking) => {
    console.log('Appointment created:', booking)
    setShowModal(false)
  }

  return (
    <>
      <button onClick={() => setShowModal(true)}>
        Create Appointment
      </button>

      <CreateAppointmentModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        selectedDate="2024-06-22"
        selectedTime="14:00"
        onSuccess={handleSuccess}
      />
    </>
  )
}
```

### Modal State Management
```tsx
// Multiple modal states
const [modals, setModals] = useState({
  create: false,
  details: false,
  client: false,
  service: false,
  timePicker: false,
  confirm: false
})

// Helper functions
const openModal = (type) => setModals(prev => ({ ...prev, [type]: true }))
const closeModal = (type) => setModals(prev => ({ ...prev, [type]: false }))
```

## Customization

### Theming
The modal system uses CSS custom properties for theming:
- `--primary`: Main brand color (violet)
- `--primary-gradient-start/end`: Gradient colors
- `--success`, `--warning`, `--destructive`: Status colors
- `--glass-bg`, `--glass-border`: Glass morphism effects

### Styling Classes
Key CSS classes for customization:
- `.premium-card-modern`: Card styling
- `.premium-button`: Button styling
- `.premium-input`: Input field styling
- `.glass-card-enhanced`: Enhanced glass effects

## Accessibility

### Features Implemented
- **Keyboard navigation** with proper tab order
- **Focus management** with focus trapping in modals
- **Screen reader support** with ARIA labels
- **High contrast mode** support
- **Reduced motion** preferences respected
- **Semantic HTML** structure

### ARIA Attributes
- `role="dialog"` for modal containers
- `aria-labelledby` for modal titles
- `aria-describedby` for modal content
- `aria-hidden` for decorative elements

## Performance

### Optimizations
- **Lazy loading** of modal content
- **Virtualization** for large lists
- **Debounced search** to reduce API calls
- **Memoized components** to prevent re-renders
- **Optimized animations** with CSS transforms

### Bundle Size
The modal system adds approximately:
- **15KB** gzipped to the bundle
- **Minimal runtime overhead** with tree shaking
- **Efficient re-renders** with React.memo usage

## Browser Support

### Compatibility
- **Modern browsers** (Chrome 80+, Firefox 75+, Safari 13+)
- **Mobile browsers** with touch support
- **Backdrop-filter support** required for glass effects
- **CSS Grid** support for responsive layouts

## Future Enhancements

### Planned Features
- **Drag and drop** appointment rescheduling
- **Recurring appointments** support
- **Multi-language** support
- **Advanced filtering** options
- **Bulk operations** for appointments
- **Calendar sync** integrations
- **Push notifications** for appointments

### API Integration
The modals are designed to work with RESTful APIs:
- **TypeScript interfaces** for all data types
- **Error handling** for API failures
- **Loading states** for async operations
- **Optimistic updates** for better UX

## License

This modal system is part of the 6FB Booking frontend application and follows the project's licensing terms.
