# Smart Conflict Resolution System

A comprehensive conflict resolution system for the calendar drag-and-drop feature that provides intelligent suggestions and multiple resolution options when appointment scheduling conflicts occur.

## Overview

When a user attempts to drag an appointment to a time slot that conflicts with existing appointments, the system:

1. **Detects conflicts** automatically using the existing collision detection logic
2. **Analyzes the situation** to understand which appointments can be moved
3. **Generates smart suggestions** for alternative time slots
4. **Presents resolution options** through an intuitive modal interface
5. **Handles the resolution** according to the user's choice

## Components

### 1. ConflictResolutionModal (`ConflictResolutionModal.tsx`)

The main UI component that presents conflict resolution options to users.

**Features:**
- **Conflict Overview**: Clear display of the appointment being moved and conflicting appointments
- **Smart Suggestions**: Alternative time slots ranked by priority (high/medium/low)
- **Bump Options**: Ability to move conflicting appointments to alternative times
- **Allow Overlap**: Option to proceed with double booking (with warning)
- **Notes**: Optional text field for explaining the resolution

**Props:**
```typescript
interface ConflictResolutionModalProps {
  isOpen: boolean
  onClose: () => void
  conflictingAppointments: ConflictingAppointment[]
  draggedAppointment: {
    id: string
    client: string
    service: string
    barber: string
    duration: number
    originalDate: string
    originalTime: string
  }
  targetDate: string
  targetTime: string
  suggestions: TimeSlotSuggestion[]
  onResolveConflict: (resolution: ConflictResolution) => void
  isLoading?: boolean
}
```

### 2. ConflictResolutionService (`ConflictResolutionService.ts`)

The intelligent algorithm that generates smart time slot suggestions and analyzes conflicts.

**Key Features:**
- **Smart Scoring**: Suggestions are scored based on multiple factors:
  - Same day preference (+50 points)
  - Time proximity to original slot (+10-30 points)
  - Preferred time periods (+15 points)
  - Prime time slots (+10 points)
- **Conflict Analysis**: Determines which appointments can be safely moved
- **Multiple Day Search**: Looks ahead up to 14 days for alternatives
- **Barber Availability**: Respects existing appointments for the same barber

**Example Usage:**
```typescript
const conflictService = new ConflictResolutionService(appointments, {
  workingHoursStart: '08:00',
  workingHoursEnd: '18:00',
  slotInterval: 15,
  maxSuggestions: 12,
  prioritizeSameDay: true
})

const suggestions = conflictService.generateSuggestions(
  appointment,
  targetDate,
  targetTime,
  barberId
)
```

### 3. Enhanced DragDropCalendar (`DragDropCalendar.tsx`)

Updated drag-and-drop calendar with integrated conflict resolution.

**New Props:**
```typescript
interface DragDropCalendarProps {
  // ... existing props
  enableSmartConflictResolution?: boolean  // Default: true
  workingHours?: { start: string; end: string }  // Default: 08:00-20:00
  onConflictResolution?: (resolution: ConflictResolution) => Promise<void>
}
```

## Resolution Types

The system provides three types of conflict resolution:

### 1. Accept Suggestion (`accept_suggestion`)
User chooses one of the smart alternative time suggestions.

```typescript
{
  type: 'accept_suggestion',
  selectedSuggestion: {
    date: '2024-06-26',
    time: '10:30',
    endTime: '11:30',
    score: 85,
    reason: 'Same day, close to original time',
    priority: 'high'
  }
}
```

### 2. Bump Appointments (`bump_appointments`)
User chooses to move conflicting appointments to make space for the dragged appointment.

```typescript
{
  type: 'bump_appointments',
  appointmentsToBump: [
    {
      appointmentId: 'apt-123',
      newDate: '2024-06-26',
      newTime: '14:00'
    }
  ]
}
```

### 3. Allow Overlap (`allow_overlap`)
User proceeds with the conflicting time (double booking).

```typescript
{
  type: 'allow_overlap',
  note: 'Emergency booking - customer will wait'
}
```

## Integration Guide

### Basic Setup

1. Import the enhanced DragDropCalendar:
```typescript
import DragDropCalendar from './components/calendar/DragDropCalendar'
import { ConflictResolution } from './components/modals/ConflictResolutionModal'
```

2. Implement conflict resolution handler:
```typescript
const handleConflictResolution = async (resolution: ConflictResolution) => {
  switch (resolution.type) {
    case 'accept_suggestion':
      if (resolution.selectedSuggestion) {
        await moveAppointment(
          appointmentId,
          resolution.selectedSuggestion.date,
          resolution.selectedSuggestion.time
        )
      }
      break

    case 'bump_appointments':
      // Move main appointment
      await moveAppointment(appointmentId, targetDate, targetTime)

      // Move bumped appointments
      for (const bump of resolution.appointmentsToBump || []) {
        await moveAppointment(bump.appointmentId, bump.newDate, bump.newTime)
      }
      break

    case 'allow_overlap':
      await moveAppointment(appointmentId, targetDate, targetTime)
      // Log the overlap for tracking
      console.warn('Double booking allowed:', resolution.note)
      break
  }
}
```

3. Use the calendar with conflict resolution:
```typescript
<DragDropCalendar
  appointments={appointments}
  onAppointmentMove={handleAppointmentMove}
  onConflictResolution={handleConflictResolution}
  enableSmartConflictResolution={true}
  workingHours={{ start: '08:00', end: '18:00' }}
/>
```

### Advanced Configuration

**Custom Suggestion Options:**
```typescript
const conflictService = new ConflictResolutionService(appointments, {
  maxDaysAhead: 7,  // Look ahead 7 days instead of 14
  preferredPeriod: 'morning',  // Prefer morning slots
  workingHoursStart: '09:00',
  workingHoursEnd: '17:00',
  slotInterval: 30,  // 30-minute intervals
  maxSuggestions: 6,
  prioritizeSameDay: false,  // Don't prioritize same day
  prioritizeNearbyTimes: true
})
```

**Disable Conflict Resolution:**
```typescript
<DragDropCalendar
  enableSmartConflictResolution={false}
  allowConflicts={true}  // Allow direct conflicts without resolution
/>
```

## Suggestion Algorithm

The suggestion algorithm uses a sophisticated scoring system:

### Base Score: 100 points

### Bonuses:
- **Same Day**: +50 points, priority: high
- **Today**: +30 points
- **Tomorrow**: +20 points
- **Time Proximity**:
  - Within 1 hour: +30 points, priority: high
  - Within 2 hours: +20 points
  - Within 3 hours: +10 points
- **Preferred Period**: +15 points (if specified)
- **Prime Time** (9 AM - 5 PM): +10 points

### Penalties:
- **Early/Late** (before 8 AM or after 6 PM): -10 points, priority: low
- **Weekend**: -5 points

### Priority Levels:
- **High**: Same day + close time, or very close to original time
- **Medium**: Default priority for reasonable alternatives
- **Low**: Early morning, late evening, or distant alternatives

## User Experience Flow

1. **User drags appointment** to a conflicting time slot
2. **System detects conflict** and analyzes the situation
3. **Modal appears** showing:
   - Clear conflict overview
   - Smart alternative suggestions
   - Option to bump other appointments
   - Warning about double booking
4. **User selects resolution** method
5. **System applies changes** according to the chosen resolution
6. **Confirmation and notifications** are sent if needed

## Testing Scenarios

The `ConflictResolutionExample.tsx` component provides several test scenarios:

1. **Same Barber Conflict**: Drag John's 10:00 appointment to 11:30 (conflicts with Mike)
2. **Partial Overlap**: Drag David's 14:00 appointment to 10:30 (partial conflict with John)
3. **Alternative Suggestions**: System suggests nearby available slots
4. **Bump Functionality**: Option to move conflicting appointments

## Best Practices

1. **Always provide alternatives**: The system should offer at least 3-5 alternative suggestions
2. **Clear communication**: Make conflict details and resolution options obvious
3. **Prevent dangerous overlaps**: Warn users about double booking risks
4. **Customer notification**: Always offer to notify customers about schedule changes
5. **Undo functionality**: Maintain undo capability for resolution actions

## Error Handling

- **No suggestions available**: Gracefully handle cases where no alternatives exist
- **API failures**: Provide retry options and clear error messages
- **Validation errors**: Ensure moved appointments don't create new conflicts
- **Network issues**: Handle offline scenarios and sync when reconnected

## Accessibility

The conflict resolution modal includes:
- **Keyboard navigation**: Full keyboard support for all interactive elements
- **Screen reader support**: Proper ARIA labels and descriptions
- **Focus management**: Logical tab order and focus trapping
- **High contrast**: Support for high contrast themes
- **Reduced motion**: Respects user's motion preferences

## Performance Considerations

- **Efficient conflict detection**: O(n) complexity for conflict checking
- **Suggestion caching**: Cache suggestions to avoid recalculation
- **Lazy loading**: Load conflict resolution modal only when needed
- **Debounced updates**: Prevent excessive recalculation during drag operations

## Future Enhancements

Potential improvements for the conflict resolution system:

1. **ML-based suggestions**: Learn from user preferences over time
2. **Batch operations**: Handle multiple appointment moves at once
3. **Customer preferences**: Consider customer scheduling preferences
4. **Resource conflicts**: Handle equipment or room booking conflicts
5. **Time zone support**: Handle appointments across different time zones
6. **Recurring appointments**: Special handling for repeating appointments
7. **Priority levels**: VIP customers get priority in conflict resolution
