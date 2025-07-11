# Calendar Mobile Enhancements Documentation

## Overview

The BookedBarber calendar now includes comprehensive mobile touch enhancements that provide a native app-like experience on mobile devices. These enhancements improve usability, accessibility, and performance on touch devices.

## Key Features

### 1. Enhanced Touch Targets
- All interactive elements have minimum 44px touch targets (iOS HIG standard)
- Invisible touch target expansion for small elements
- Visual feedback on touch with scale animations

### 2. Gesture Support
- **Swipe Navigation**: Navigate between dates/periods
  - Swipe left: Next day/week/month
  - Swipe right: Previous day/week/month
- **Double Tap**: Quick appointment creation
- **Long Press**: Context menus and actions
- **Pinch Zoom**: Change calendar view
  - Pinch out: More detailed view (month → week → day)
  - Pinch in: Less detailed view (day → week → month)

### 3. Mobile-Optimized UI Components

#### CalendarMobileEnhancements
Wrapper component that adds touch gesture support to any calendar view.

```tsx
import { CalendarMobileEnhancements } from '@/components/calendar/CalendarMobileEnhancements'

<CalendarMobileEnhancements
  onSwipeLeft={handleNextPeriod}
  onSwipeRight={handlePreviousPeriod}
  onPinchZoom={handleViewChange}
  onDoubleTap={handleQuickBooking}
  onLongPress={handleContextMenu}
  enableHaptics={true}
>
  <YourCalendarComponent />
</CalendarMobileEnhancements>
```

#### MobileTimePicker
Touch-friendly time selection with wheel interface.

```tsx
import { MobileTimePicker } from '@/components/calendar/MobileTimePicker'

<MobileTimePicker
  selectedTime={selectedTime}
  onTimeChange={handleTimeChange}
  minTime={minTime}
  maxTime={maxTime}
  minuteInterval={15}
  onClose={handleClose}
/>
```

#### MobileCalendarModal
iOS-style bottom sheet modal with swipe-to-dismiss.

```tsx
import { MobileCalendarModal } from '@/components/calendar/MobileCalendarModal'

<MobileCalendarModal
  isOpen={isOpen}
  onClose={handleClose}
  title="Select Date"
  fullHeight={false}
  showHandle={true}
  enableSwipeDown={true}
>
  <YourModalContent />
</MobileCalendarModal>
```

### 4. Haptic Feedback
Provides tactile feedback for actions on supported devices.

```tsx
import { Haptics, ImpactStyle } from '@capacitor/haptics'

// Light feedback for selections
await Haptics.impact({ style: ImpactStyle.Light })

// Medium feedback for navigation
await Haptics.impact({ style: ImpactStyle.Medium })

// Heavy feedback for important actions
await Haptics.impact({ style: ImpactStyle.Heavy })
```

### 5. Performance Optimizations
- Hardware-accelerated animations
- Touch-optimized scrolling with momentum
- Reduced motion support for accessibility
- GPU-accelerated transforms

## Implementation Guide

### Basic Setup

1. **Import mobile styles**:
```tsx
import '@/styles/calendar-mobile.css'
```

2. **Use UnifiedCalendarMobile for automatic enhancements**:
```tsx
import UnifiedCalendarMobile from '@/components/calendar/UnifiedCalendarMobile'

<UnifiedCalendarMobile
  // All standard UnifiedCalendar props
  view={view}
  appointments={appointments}
  // Additional mobile props
  user={user}
  onSyncToggle={handleSync}
  onConflictToggle={handleConflicts}
/>
```

3. **Add responsive detection**:
```tsx
import { useResponsive } from '@/hooks/useResponsive'

const { isMobile, isTablet } = useResponsive()

// Apply mobile-specific styles
<div className={isMobile ? 'calendar-mobile' : ''}>
  {/* Calendar content */}
</div>
```

### Advanced Touch Handling

```tsx
import { useTouchEnhancements } from '@/lib/mobile-touch-enhancements'

function MyComponent() {
  const containerRef = useRef<HTMLDivElement>(null)
  
  useTouchEnhancements(containerRef, (gesture) => {
    switch (gesture.type) {
      case 'swipe':
        console.log('Swiped', gesture.direction)
        break
      case 'doubleTap':
        console.log('Double tapped at', gesture.startX, gesture.startY)
        break
      case 'longPress':
        console.log('Long pressed')
        break
      case 'pinch':
        console.log('Pinched with scale', gesture.scale)
        break
    }
  }, {
    enableSwipe: true,
    enableDoubleTap: true,
    enableLongPress: true,
    enablePinch: true
  })
  
  return <div ref={containerRef}>Content</div>
}
```

### Mobile-Specific Features

#### Floating Action Button (FAB)
```tsx
import { MobileFAB } from '@/components/calendar/CalendarMobileEnhancements'

<MobileFAB onClick={handleCreateAppointment} />
```

#### Swipeable Appointment Cards
```tsx
import { MobileAppointmentCard } from '@/components/calendar/CalendarMobileEnhancements'

<MobileAppointmentCard
  appointment={appointment}
  onEdit={handleEdit}
  onCancel={handleCancel}
  onReschedule={handleReschedule}
/>
```

#### Action Sheets
```tsx
import { MobileActionSheet } from '@/components/calendar/MobileCalendarModal'

<MobileActionSheet
  isOpen={showActions}
  onClose={handleClose}
  title="Appointment Actions"
  actions={[
    {
      label: 'Reschedule',
      icon: '📅',
      onClick: handleReschedule,
      variant: 'primary'
    },
    {
      label: 'Cancel',
      icon: '❌',
      onClick: handleCancel,
      variant: 'danger'
    }
  ]}
/>
```

## Best Practices

### 1. Touch Target Sizing
- Ensure all interactive elements are at least 44x44px
- Use the `getMobileTouchClass` utility for consistent sizing:
```tsx
<button className={getMobileTouchClass('medium', 'primary')}>
  Book Now
</button>
```

### 2. Gesture Hints
Show gesture hints for first-time users:
```tsx
useEffect(() => {
  const hasSeenHints = localStorage.getItem('calendar-gesture-hints-seen')
  if (!hasSeenHints && isMobile) {
    showGestureHints()
    localStorage.setItem('calendar-gesture-hints-seen', 'true')
  }
}, [])
```

### 3. Performance
- Use `will-change: transform` for animated elements
- Apply `touch-action: manipulation` to prevent zoom
- Enable momentum scrolling with `-webkit-overflow-scrolling: touch`

### 4. Accessibility
- Provide alternative interactions for all gestures
- Support keyboard navigation
- Include proper ARIA labels
- Respect prefers-reduced-motion

### 5. Safe Area Handling
Handle notched devices properly:
```css
.mobile-safe {
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

## Testing

### Manual Testing Checklist
- [ ] Touch targets are easily tappable
- [ ] Swipe navigation works smoothly
- [ ] Double tap creates appointments
- [ ] Long press shows context menu
- [ ] Pinch zoom changes views
- [ ] Modals can be swiped down to dismiss
- [ ] Haptic feedback works (on real devices)
- [ ] Performance is smooth (60 FPS)
- [ ] Works in both portrait and landscape
- [ ] Safe areas are respected on notched devices

### Device Testing
Test on various devices:
- iPhone (various models including notched)
- iPad (for tablet experience)
- Android phones (various screen sizes)
- Android tablets

## Troubleshooting

### Common Issues

1. **Gestures not working**
   - Ensure touch event listeners are properly attached
   - Check for conflicting touch handlers
   - Verify `touch-action` CSS property

2. **Performance issues**
   - Use Chrome DevTools Performance tab
   - Check for unnecessary re-renders
   - Optimize animation with `will-change`

3. **Haptics not working**
   - Only works on real devices (not simulators)
   - Requires Capacitor or native bridge
   - Check device permissions

4. **Modal dismiss issues**
   - Ensure backdrop click handlers are set
   - Check z-index stacking
   - Verify swipe threshold settings

## Future Enhancements

1. **3D Touch / Force Touch** support
2. **Voice control** integration
3. **Offline mode** with sync
4. **Native app** wrapper with Capacitor
5. **Apple Watch** companion app
6. **Android Wear** support

## Demo

View the mobile enhancements demo at `/calendar-mobile-demo` to see all features in action.