# BookedBarber V2 Calendar Design System
## The Art of Scheduling: Invisible Excellence Meets Revenue Optimization

*A comprehensive design system for the scheduling heart of the BookedBarber platform, built on Six Figure Barber methodology*

---

## Table of Contents
1. [Design Philosophy: Invisible Excellence](#design-philosophy-invisible-excellence)
2. [User Experience Architecture](#user-experience-architecture)
3. [Calendar Component System](#calendar-component-system)
4. [Six Figure Barber Integration](#six-figure-barber-integration)
5. [Mobile-First Design](#mobile-first-design)
6. [Accessibility Standards](#accessibility-standards)
7. [Performance & Technical Architecture](#performance--technical-architecture)
8. [Implementation Guidelines](#implementation-guidelines)

---

## Design Philosophy: Invisible Excellence

### Core Principle: The Calendar as Heart of Operations

The calendar is not just a scheduling tool—it's the nerve center of barbershop operations. Our design philosophy centers on **"invisible excellence"**: technology that seamlessly manages business operations while allowing barbers to focus entirely on their craft.

**Key Restraint Philosophy:**  
The best calendar is one users barely notice—it simply works. Every visual element must earn its place by serving user goals, not impressing with clever design tricks.

### Three Foundational Design Principles

#### 1. Simplicity with Power
- **Progressive disclosure**: Essential information immediately visible, advanced features discoverable
- **Clean aesthetic**: Projects premium brand image Six Figure Barber professionals deserve
- **Contextual intelligence**: System anticipates user needs and adapts accordingly

#### 2. Mobile-First Excellence
- **Touch-optimized interactions**: Drag-and-drop works flawlessly on mobile devices
- **Swipe navigation**: Natural gestures for navigating between time periods
- **Responsive perfection**: Seamless experience from phone to desktop

#### 3. Revenue-Centric Intelligence
- **Smart time slots**: Automatically calculates availability based on service duration
- **Conflict prevention**: Real-time validation prevents double-bookings
- **Value optimization**: Visual indicators help maximize booking revenue

### The Perfect Balance Achievement
- **User Experience Excellence**: Intuitive, role-adaptive design
- **Technical Robustness**: Bulletproof scheduling with conflict prevention
- **Performance Optimization**: Sub-100ms response times
- **Business Intelligence**: Revenue-focused analytics and optimization
- **Scalability**: Architecture for thousands of concurrent users

---

## User Experience Architecture

### Three Calendar Personas

#### 1. Client Experience: Effortless Booking
```
Client Journey Flow:
1. View real-time availability in intuitive grid → 5 seconds
2. Select preferred time with single tap → 2 seconds
3. See barber profile and service details → 3 seconds
4. Complete booking with minimal friction → 15 seconds
5. Receive instant confirmation and calendar invite → Immediate
```

**Key Features:**
- **24/7 Availability Display**: Always-current view of open slots
- **Service Visualization**: Clear descriptions with duration and pricing
- **Instant Confirmation**: Real-time booking with SMS/email confirmation
- **Guest Booking Support**: No account required for first appointment

**UX Patterns:**
```tsx
// Clean, tappable time slots with large touch targets
<TimeSlot 
  className="min-h-[44px] w-full bg-primary-50 hover:bg-primary-100 
             border border-primary-200 rounded-lg px-4 py-3
             transition-colors duration-200 cursor-pointer
             focus:ring-2 focus:ring-primary-500 focus:outline-none"
  onClick={() => selectTimeSlot(slot)}
>
  <div className="flex justify-between items-center">
    <time className="font-medium text-accent-900">
      {formatTime(slot.startTime)}
    </time>
    <span className="text-sm text-accent-600">
      {slot.duration}min
    </span>
  </div>
</TimeSlot>
```

#### 2. Barber Experience: Command Center
```
Barber Workflow:
1. Glance at color-coded calendar grid → Instant overview
2. Tap appointment for full client details → 1 second
3. Drag-and-drop to reschedule seamlessly → 3 seconds
4. View daily earnings and goals in real-time → Always visible
5. Manage availability with simple toggles → 2 seconds
```

**Key Features:**
- **Color-Coded Services**: Visual distinction between service types and values
- **Client History Integration**: Full customer profile accessible with one tap
- **Revenue Tracking**: Live updates on daily and weekly earnings
- **Quick Actions**: Block time, add notes, send messages without navigation

**Revenue-Centric Visual Design:**
```tsx
// Color-coded appointments by service value
const getServiceColor = (serviceValue: number) => {
  if (serviceValue >= 80) return 'bg-yellow-100 border-yellow-400' // Premium gold
  if (serviceValue >= 50) return 'bg-blue-100 border-blue-400'     // Standard blue  
  return 'bg-gray-100 border-gray-400'                            // Basic gray
}

<AppointmentBlock 
  className={cn(
    "p-3 rounded-lg border-l-4 cursor-pointer transition-all duration-200",
    "hover:shadow-md hover:scale-[1.02]",
    getServiceColor(appointment.serviceValue)
  )}
>
  <div className="flex justify-between items-start">
    <div>
      <h4 className="font-medium text-accent-900">{appointment.clientName}</h4>
      <p className="text-sm text-accent-600">{appointment.serviceName}</p>
    </div>
    <div className="text-right">
      <p className="font-bold text-primary-600">${appointment.price}</p>
      <p className="text-xs text-accent-500">{appointment.duration}min</p>
    </div>
  </div>
</AppointmentBlock>
```

#### 3. Owner Experience: Business Intelligence
```
Owner Dashboard:
1. Multi-barber calendar overview → Strategic view
2. Revenue analytics with visual trends → Performance insights
3. Staff performance metrics → Optimization opportunities
4. Booking pattern insights → Business intelligence
5. Resource utilization optimization → Growth planning
```

**Key Features:**
- **Multi-Location Support**: Unified view across all shop locations
- **Performance Analytics**: Staff productivity and revenue metrics
- **Booking Patterns**: Insights for optimal scheduling and staffing
- **Conflict Resolution**: Automated alerts for scheduling issues

---

## Calendar Component System

### UnifiedCalendar Architecture

#### Core Component Structure
```tsx
interface CalendarProps {
  view: 'day' | 'week' | 'month'
  appointments: Appointment[]
  user: User
  onAppointmentUpdate: (id: number, newTime: string) => void
  onTimeSlotClick: (date: Date) => void
  onViewChange: (view: CalendarView) => void
}

const UnifiedCalendar = React.memo(({ 
  view, 
  appointments, 
  user,
  ...handlers 
}) => {
  // Performance-optimized with React.memo and useMemo
  const optimizedAppointments = useMemo(() => 
    optimizeAppointmentDisplay(appointments, view), 
    [appointments, view]
  )
  
  const calendarConfig = useMemo(() => 
    getCalendarConfig(user.role, user.preferences),
    [user.role, user.preferences]
  )
  
  return (
    <CalendarContainer className="h-full flex flex-col">
      <CalendarHeader 
        view={view}
        onViewChange={handlers.onViewChange}
        showRevenueStats={user.role !== 'client'}
      />
      
      <CalendarGrid 
        view={view}
        appointments={optimizedAppointments}
        config={calendarConfig}
        {...handlers}
      />
    </CalendarContainer>
  )
})
```

#### Advanced Calendar Features

**1. Drag-and-Drop Rescheduling**
```tsx
const useDragAndDrop = () => {
  const [dragState, setDragState] = useState(null)
  
  const handleDragStart = (appointment: Appointment) => {
    setDragState({
      appointment,
      originalPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 }
    })
  }
  
  const handleDragEnd = async (newTimeSlot: TimeSlot) => {
    if (!dragState) return
    
    try {
      // Optimistic update for instant feedback
      updateAppointmentOptimistically(dragState.appointment.id, newTimeSlot)
      
      // Backend update with conflict validation
      await rescheduleAppointment(dragState.appointment.id, newTimeSlot)
      
      setDragState(null)
    } catch (error) {
      // Rollback optimistic update on conflict
      revertOptimisticUpdate(dragState.appointment.id)
      showConflictError(error.message)
    }
  }
  
  return { handleDragStart, handleDragEnd, dragState }
}
```

**2. Real-Time Conflict Detection**
```tsx
const useConflictDetection = (appointments: Appointment[]) => {
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  
  const validateTimeSlot = useCallback((newSlot: TimeSlot, appointmentId?: number) => {
    const conflictingAppointments = appointments.filter(apt => 
      apt.id !== appointmentId && // Exclude self when rescheduling
      apt.barberId === newSlot.barberId &&
      timeRangesOverlap(apt.timeRange, newSlot.timeRange)
    )
    
    return {
      isValid: conflictingAppointments.length === 0,
      conflicts: conflictingAppointments,
      suggestions: conflictingAppointments.length > 0 
        ? generateAlternativeSlots(newSlot) 
        : []
    }
  }, [appointments])
  
  return { conflicts, validateTimeSlot }
}
```

**3. Accessibility Integration**
```tsx
const useCalendarAccessibility = () => {
  const [focusedDate, setFocusedDate] = useState<Date>(new Date())
  const [announcementText, setAnnouncementText] = useState('')
  
  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowRight':
        setFocusedDate(addDays(focusedDate, 1))
        announceDate(addDays(focusedDate, 1))
        break
      case 'ArrowLeft':
        setFocusedDate(subDays(focusedDate, 1))
        announceDate(subDays(focusedDate, 1))
        break
      case 'ArrowUp':
        setFocusedDate(subDays(focusedDate, 7))
        announceDate(subDays(focusedDate, 7))
        break
      case 'ArrowDown':
        setFocusedDate(addDays(focusedDate, 7))
        announceDate(addDays(focusedDate, 7))
        break
      case 'Enter':
      case ' ':
        selectDate(focusedDate)
        break
    }
  }, [focusedDate])
  
  const announceDate = (date: Date) => {
    const availableSlots = getAvailableSlotsForDate(date)
    setAnnouncementText(
      `${formatDateForScreenReader(date)}. ${availableSlots.length} appointments available.`
    )
  }
  
  return { 
    focusedDate, 
    announcementText, 
    handleKeyboardNavigation,
    ariaProps: {
      role: 'grid',
      'aria-live': 'polite',
      'aria-label': 'Calendar appointment scheduler'
    }
  }
}
```

---

## Six Figure Barber Integration

### Revenue-Centric Design Elements

#### Visual Revenue Indicators (Subtle, Not Flashy)
```tsx
const CalendarRevenue = ({ appointments, dailyGoal }: CalendarRevenueProps) => {
  const todayRevenue = calculateDayRevenue(appointments)
  const progressPercentage = (todayRevenue / dailyGoal) * 100
  
  return (
    <div className="bg-white border border-gray-200 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-600">Today's Revenue</h3>
        <span className="text-xl font-semibold text-gray-900">${todayRevenue}</span>
      </div>
      
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
        <div 
          className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(progressPercentage, 100)}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-gray-500">
        <span>Goal: ${dailyGoal}</span>
        <span>{progressPercentage.toFixed(0)}%</span>
      </div>
    </div>
  )
}
```

#### Smart Service Recommendations
```tsx
const ServiceRecommendation = ({ timeSlot, clientHistory }: ServiceRecProps) => {
  const recommendations = useMemo(() => {
    return generateServiceRecommendations({
      timeSlot,
      clientHistory,
      revenueOptimization: true,
      seasonalTrends: getSeasonalTrends(timeSlot.date)
    })
  }, [timeSlot, clientHistory])
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
      <h4 className="font-medium text-yellow-800 mb-2">
        💡 Revenue Optimization Suggestions
      </h4>
      {recommendations.map(rec => (
        <div key={rec.id} className="flex justify-between items-center py-1">
          <span className="text-sm text-yellow-700">{rec.service}</span>
          <span className="font-medium text-yellow-800">+${rec.additionalRevenue}</span>
        </div>
      ))}
    </div>
  )
}
```

#### Client Lifetime Value Integration
```tsx
const ClientValueIndicator = ({ client }: ClientValueProps) => {
  const { lifetimeValue, tier, nextTierProgress } = useClientValue(client.id)
  
  const tierColors = {
    bronze: 'bg-amber-100 text-amber-800',
    silver: 'bg-gray-100 text-gray-800', 
    gold: 'bg-yellow-100 text-yellow-800',
    platinum: 'bg-purple-100 text-purple-800'
  }
  
  return (
    <div className="flex items-center space-x-2">
      <div className={cn(
        "px-2 py-1 rounded-full text-xs font-medium",
        tierColors[tier]
      )}>
        {tier.toUpperCase()}
      </div>
      <div className="text-sm text-accent-600">
        LTV: ${lifetimeValue}
      </div>
      {nextTierProgress && (
        <div className="text-xs text-accent-500">
          ${nextTierProgress.remaining} to {nextTierProgress.nextTier}
        </div>
      )}
    </div>
  )
}
```

---

## Mobile-First Design

### Touch-Optimized Interactions

#### Gesture Support Implementation
```tsx
const useTouchCalendarNavigation = () => {
  const { swipeLeft, swipeRight, pinchZoom, longPress } = useGestureRecognition()
  
  useEffect(() => {
    // Swipe navigation for dates
    swipeLeft(() => navigateToNextPeriod())
    swipeRight(() => navigateToPreviousPeriod())
    
    // Pinch to zoom between views
    pinchZoom((scale) => {
      if (scale > 1.5) setView('day')
      else if (scale < 0.7) setView('month')
      else setView('week')
    })
    
    // Long press for quick actions
    longPress((target) => {
      if (target.dataset.appointmentId) {
        openQuickActionsMenu(target.dataset.appointmentId)
      } else if (target.dataset.timeSlot) {
        openBookingModal(target.dataset.timeSlot)
      }
    })
  }, [])
  
  return { 
    handleTouchStart,
    handleTouchMove, 
    handleTouchEnd,
    gestureState
  }
}
```

#### Mobile-Specific UX Patterns
```tsx
const MobileCalendarGrid = ({ appointments, onSlotClick }: MobileCalendarProps) => {
  const { gestureHandlers } = useTouchCalendarNavigation()
  
  return (
    <div 
      className="touch-manipulation overscroll-y-contain"
      {...gestureHandlers}
    >
      {/* Optimized for thumb navigation */}
      <div className="grid grid-cols-1 gap-2 pb-20"> {/* Bottom padding for thumb reach */}
        {timeSlots.map(slot => (
          <TouchTarget
            key={slot.id}
            className="min-h-[44px] bg-white border border-gray-200 rounded-lg
                       active:scale-95 active:bg-gray-50 transition-transform duration-100"
            onTap={() => onSlotClick(slot)}
            data-time-slot={slot.id}
          >
            <div className="p-4 flex justify-between items-center">
              <time className="font-medium text-lg">
                {format(slot.startTime, 'h:mm a')}
              </time>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-accent-600">
                  {slot.duration}min
                </span>
                {slot.available && (
                  <div className="w-3 h-3 bg-green-400 rounded-full" />
                )}
              </div>
            </div>
          </TouchTarget>
        ))}
      </div>
    </div>
  )
}
```

#### Haptic Feedback Integration
```tsx
const useHapticFeedback = () => {
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        success: [10, 50, 10],
        error: [20, 100, 20, 100, 20]
      }
      navigator.vibrate(patterns[type])
    }
  }, [])
  
  return { triggerHaptic }
}

// Usage in calendar interactions
const handleAppointmentBook = async (slot: TimeSlot) => {
  triggerHaptic('light') // Immediate feedback
  
  try {
    await bookAppointment(slot)
    triggerHaptic('success') // Success confirmation
  } catch (error) {
    triggerHaptic('error') // Error indication
  }
}
```

---

## Accessibility Standards

### WCAG 2.1 AA Compliance

#### Screen Reader Support
```tsx
const AccessibleCalendarGrid = ({ appointments, view }: AccessibleCalendarProps) => {
  const { focusedDate, announcementText, handleKeyboardNavigation } = useCalendarAccessibility()
  
  return (
    <>
      {/* Live region for announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {announcementText}
      </div>
      
      {/* Calendar grid with proper ARIA structure */}
      <div
        role="grid"
        aria-label="Calendar appointment scheduler"
        onKeyDown={handleKeyboardNavigation}
        className="calendar-grid focus:outline-none"
        tabIndex={0}
      >
        {/* Column headers for screen readers */}
        <div role="row" className="sr-only">
          {getDaysOfWeek().map(day => (
            <div key={day} role="columnheader">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar cells */}
        {getCalendarDates(view).map(date => (
          <CalendarCell
            key={date.toISOString()}
            date={date}
            appointments={getAppointmentsForDate(appointments, date)}
            isFocused={isSameDay(date, focusedDate)}
            aria-selected={isSameDay(date, selectedDate)}
            role="gridcell"
            tabIndex={isSameDay(date, focusedDate) ? 0 : -1}
          />
        ))}
      </div>
    </>
  )
}
```

#### High Contrast and Reduced Motion Support
```css
/* High contrast mode support */
@media (prefers-contrast: high) {
  .calendar-appointment {
    border: 2px solid;
    background: transparent;
  }
  
  .calendar-available {
    background: Canvas;
    color: CanvasText;
    border-color: Highlight;
  }
  
  .calendar-booked {
    background: Highlight;
    color: HighlightText;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .calendar-grid {
    scroll-behavior: auto;
  }
  
  .appointment-block {
    transition: none;
  }
  
  .drag-preview {
    animation: none;
    transform: none;
  }
}

/* Focus indicators with high visibility */
.calendar-cell:focus {
  outline: 3px solid #005fcc;
  outline-offset: 2px;
  box-shadow: 0 0 0 1px white;
}

@media (prefers-color-scheme: dark) {
  .calendar-cell:focus {
    outline-color: #66b3ff;
    box-shadow: 0 0 0 1px black;
  }
}
```

#### Color-Blind Accessibility
```tsx
const ColorBlindFriendlyAppointment = ({ appointment }: AppointmentProps) => {
  // Use patterns and icons in addition to color
  const getStatusIndicators = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed':
        return {
          icon: '✓',
          pattern: 'solid',
          bgClass: 'bg-green-100',
          textClass: 'text-green-800'
        }
      case 'pending':
        return {
          icon: '⏳',
          pattern: 'striped',
          bgClass: 'bg-yellow-100',
          textClass: 'text-yellow-800'
        }
      case 'cancelled':
        return {
          icon: '✕',
          pattern: 'dotted',
          bgClass: 'bg-red-100',
          textClass: 'text-red-800'
        }
    }
  }
  
  const indicators = getStatusIndicators(appointment.status)
  
  return (
    <div className={cn(
      "p-3 rounded-lg border-l-4 relative",
      indicators.bgClass,
      `pattern-${indicators.pattern}` // Custom CSS pattern class
    )}>
      <div className="flex items-start justify-between">
        <div>
          <span className="sr-only">Status: {appointment.status}</span>
          <span className="text-lg mr-2" aria-hidden="true">
            {indicators.icon}
          </span>
          <span className={indicators.textClass}>
            {appointment.clientName}
          </span>
        </div>
        <time className="text-sm text-accent-600">
          {format(appointment.startTime, 'h:mm a')}
        </time>
      </div>
    </div>
  )
}
```

---

## Performance & Technical Architecture

### Backend Scheduling Engine

#### Database Design for Integrity
```sql
-- Bulletproof appointments table with temporal constraints
CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  barber_id INTEGER REFERENCES users(id),
  client_id INTEGER REFERENCES users(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status appointment_status DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent overlapping appointments for same barber
  EXCLUDE USING gist (
    barber_id WITH =,
    tsrange(start_time, end_time) WITH &&
  ) WHERE (status != 'cancelled')
);

-- Optimized indexes for fast queries
CREATE INDEX idx_appointments_barber_time 
ON appointments USING gist (barber_id, tsrange(start_time, end_time));

CREATE INDEX idx_appointments_client_upcoming
ON appointments (client_id, start_time) 
WHERE status = 'confirmed' AND start_time > NOW();

CREATE INDEX idx_appointments_daily_revenue
ON appointments (date(start_time), barber_id)
WHERE status = 'confirmed';
```

#### Anti-Double-Booking Logic
```python
async def create_appointment(appointment_data: AppointmentCreate) -> Appointment:
    """
    Creates appointment with bulletproof conflict prevention using
    database-level constraints and atomic transactions.
    """
    async with db.transaction():
        # 1. Lock potential conflicts with SELECT FOR UPDATE
        conflicts = await db.fetch("""
            SELECT id, client_name, start_time, end_time 
            FROM appointments 
            WHERE barber_id = $1 
            AND tsrange(start_time, end_time) && tsrange($2, $3)
            AND status != 'cancelled'
            FOR UPDATE
        """, appointment_data.barber_id, 
            appointment_data.start_time, 
            appointment_data.end_time)
        
        if conflicts:
            conflict_details = [
                f"{c['client_name']} from {c['start_time']} to {c['end_time']}"
                for c in conflicts
            ]
            raise ConflictError(
                message="Time slot no longer available",
                conflicts=conflict_details,
                suggestions=await generate_alternative_slots(appointment_data)
            )
        
        # 2. Create appointment within same transaction
        appointment = await db.fetchrow("""
            INSERT INTO appointments (
                barber_id, client_id, service_id, start_time, end_time, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        """, 
            appointment_data.barber_id,
            appointment_data.client_id,
            appointment_data.service_id,
            appointment_data.start_time,
            appointment_data.end_time,
            appointment_data.notes
        )
        
        # 3. Trigger async notifications outside transaction
        await schedule_notifications(appointment)
        await update_calendar_integrations(appointment)
        
        return Appointment.from_row(appointment)
```

### Frontend Performance Optimizations

#### Virtualized Calendar Rendering
```tsx
const VirtualizedCalendarGrid = ({ appointments, view, containerHeight = 600 }: VirtualizedCalendarProps) => {
  const { visibleItems, totalHeight, offsetY } = useVirtualizedList({
    items: appointments,
    itemHeight: view === 'day' ? 60 : view === 'week' ? 40 : 30,
    containerHeight,
    overscan: 5, // Render 5 extra items for smooth scrolling
    getItemKey: (apt) => `${apt.id}-${apt.startTime}`
  })
  
  return (
    <div 
      className="calendar-grid-container overflow-auto"
      style={{ height: containerHeight }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div 
          style={{ 
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <AppointmentBlock 
              key={item.key} 
              appointment={item} 
              index={index}
              style={{ position: 'absolute', top: index * itemHeight }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
```

#### Optimistic Updates with Rollback
```tsx
const useOptimisticAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<number, Partial<Appointment>>>(new Map())
  const [rollbackStack, setRollbackStack] = useState<Array<{ id: number, originalData: Appointment }>>([])
  
  const updateAppointmentOptimistically = useCallback(async (
    id: number, 
    updates: Partial<Appointment>
  ) => {
    // Store original for potential rollback
    const original = appointments.find(apt => apt.id === id)
    if (original) {
      setRollbackStack(prev => [...prev, { id, originalData: original }])
    }
    
    // Apply optimistic update immediately
    setOptimisticUpdates(prev => new Map(prev.set(id, updates)))
    
    try {
      // Background API call
      const updatedAppointment = await api.updateAppointment(id, updates)
      
      // Success: remove from optimistic updates, update actual data
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev)
        newMap.delete(id)
        return newMap
      })
      
      setAppointments(prev => 
        prev.map(apt => apt.id === id ? updatedAppointment : apt)
      )
      
      // Clear rollback entry
      setRollbackStack(prev => prev.filter(entry => entry.id !== id))
      
    } catch (error) {
      // Failure: rollback optimistic update
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev)
        newMap.delete(id)
        return newMap
      })
      
      // Show user-friendly error
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: error.message || 'Please try again',
        action: {
          label: 'Retry',
          onClick: () => updateAppointmentOptimistically(id, updates)
        }
      })
      
      // Clear rollback entry
      setRollbackStack(prev => prev.filter(entry => entry.id !== id))
    }
  }, [appointments])
  
  // Merge actual appointments with optimistic updates
  const displayAppointments = useMemo(() => {
    return appointments.map(apt => {
      const optimisticUpdate = optimisticUpdates.get(apt.id)
      return optimisticUpdate ? { ...apt, ...optimisticUpdate } : apt
    })
  }, [appointments, optimisticUpdates])
  
  return { 
    appointments: displayAppointments, 
    updateAppointmentOptimistically,
    hasOptimisticUpdates: optimisticUpdates.size > 0
  }
}
```

---

## Implementation Guidelines

### Component Development Standards

#### Calendar Component Template
```tsx
import React, { memo, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useCalendarAccessibility } from '@/hooks/useCalendarAccessibility'
import { useOptimisticAppointments } from '@/hooks/useOptimisticAppointments'

interface CalendarComponentProps {
  appointments: Appointment[]
  view: CalendarView
  userRole: UserRole
  onAppointmentClick?: (appointment: Appointment) => void
  onTimeSlotClick?: (slot: TimeSlot) => void
  className?: string
}

export const CalendarComponent = memo<CalendarComponentProps>(({
  appointments,
  view,
  userRole,
  onAppointmentClick,
  onTimeSlotClick,
  className
}) => {
  // Performance optimizations
  const optimizedAppointments = useMemo(() => 
    optimizeAppointmentDisplay(appointments, view),
    [appointments, view]
  )
  
  // Accessibility
  const { 
    ariaProps, 
    handleKeyboardNavigation, 
    focusedDate 
  } = useCalendarAccessibility()
  
  // Optimistic updates
  const { 
    updateAppointmentOptimistically 
  } = useOptimisticAppointments()
  
  // Event handlers
  const handleAppointmentUpdate = useCallback(async (
    id: number, 
    updates: Partial<Appointment>
  ) => {
    await updateAppointmentOptimistically(id, updates)
  }, [updateAppointmentOptimistically])
  
  return (
    <div 
      className={cn(
        "calendar-component h-full flex flex-col",
        "focus:outline-none focus:ring-2 focus:ring-primary-500",
        className
      )}
      onKeyDown={handleKeyboardNavigation}
      {...ariaProps}
    >
      {/* Calendar header with view controls */}
      <CalendarHeader 
        view={view}
        showRevenueStats={userRole !== 'client'}
      />
      
      {/* Main calendar grid */}
      <CalendarGrid
        appointments={optimizedAppointments}
        view={view}
        focusedDate={focusedDate}
        onAppointmentClick={onAppointmentClick}
        onTimeSlotClick={onTimeSlotClick}
        onAppointmentUpdate={handleAppointmentUpdate}
      />
    </div>
  )
})

CalendarComponent.displayName = 'CalendarComponent'
```

### Testing Standards

#### Calendar Component Testing
```tsx
describe('Calendar Component System', () => {
  describe('Conflict Prevention', () => {
    it('prevents double-booking under concurrent requests', async () => {
      const simultaneousBookings = Array(10).fill(null).map(() =>
        bookAppointment({
          barberId: 1,
          startTime: '2024-01-15T10:00:00Z',
          duration: 60
        })
      )
      
      const results = await Promise.allSettled(simultaneousBookings)
      const successful = results.filter(r => r.status === 'fulfilled')
      
      expect(successful).toHaveLength(1) // Only one should succeed
      expect(results.filter(r => r.status === 'rejected')).toHaveLength(9)
    })
  })
  
  describe('Performance', () => {
    it('maintains sub-100ms render time with 1000+ appointments', async () => {
      const startTime = performance.now()
      
      render(
        <CalendarComponent 
          appointments={generateMockAppointments(1000)}
          view="month"
          userRole="barber"
        />
      )
      
      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(100)
    })
    
    it('handles drag-and-drop with optimistic updates', async () => {
      const { result } = renderHook(() => useOptimisticAppointments())
      const mockAppointment = createMockAppointment()
      
      // Start optimistic update
      act(() => {
        result.current.updateAppointmentOptimistically(
          mockAppointment.id, 
          { startTime: '2024-01-15T11:00:00Z' }
        )
      })
      
      // Should show updated time immediately
      expect(result.current.appointments.find(apt => apt.id === mockAppointment.id))
        .toHaveProperty('startTime', '2024-01-15T11:00:00Z')
    })
  })
  
  describe('Accessibility', () => {
    it('supports full keyboard navigation', () => {
      render(<CalendarComponent {...defaultProps} />)
      
      const calendar = screen.getByRole('grid')
      
      // Focus calendar
      calendar.focus()
      expect(calendar).toHaveFocus()
      
      // Navigate with arrow keys
      fireEvent.keyDown(calendar, { key: 'ArrowRight' })
      expect(screen.getByRole('gridcell', { selected: true }))
        .toHaveAttribute('aria-selected', 'true')
    })
    
    it('announces changes to screen readers', async () => {
      render(<CalendarComponent {...defaultProps} />)
      
      const liveRegion = screen.getByRole('status')
      
      // Navigate to a date
      fireEvent.keyDown(screen.getByRole('grid'), { key: 'ArrowRight' })
      
      await waitFor(() => {
        expect(liveRegion).toHaveTextContent(/appointments available/)
      })
    })
  })
})
```

---

## Calendar-Specific Design Restraint Guidelines

### The "Invisible Calendar" Principle

The best scheduling interface is one that users don't think about—it simply enables their work. Apply these calendar-specific restraint guidelines:

#### ⚠️ **Avoid Calendar Overkill Patterns**

##### ❌ **The Christmas Tree Calendar**
```tsx
// DON'T: Too many visual indicators competing for attention
<CalendarDay className="relative">
  <div className="bg-gradient-to-br from-yellow-100 to-orange-200 
                  shadow-lg border-2 border-yellow-400 rounded-xl
                  animate-pulse transform hover:scale-110">
    <div className="absolute -top-2 -right-2 bg-red-500 text-white 
                    rounded-full w-6 h-6 flex items-center justify-center
                    animate-bounce font-bold">
      3
    </div>
    <div className="p-4">
      <div className="text-rainbow text-lg font-bold">
        Day 15
      </div>
      <div className="space-y-1">
        <div className="bg-green-400 text-white p-1 rounded shadow-md">9:00 AM</div>
        <div className="bg-blue-400 text-white p-1 rounded shadow-md">10:30 AM</div>
        <div className="bg-purple-400 text-white p-1 rounded shadow-md">2:00 PM</div>
      </div>
    </div>
  </div>
</CalendarDay>
```

##### ✅ **The Clean, Functional Calendar**
```tsx
// DO: Minimal, scannable, purposeful
<CalendarDay>
  <div className="border border-gray-200 bg-white h-full p-2">
    <div className="text-sm text-gray-500 mb-2">15</div>
    <div className="space-y-1">
      <div className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded">
        9:00 John D.
      </div>
      <div className="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded">
        10:30 Sarah M.
      </div>
      <div className="text-xs bg-gray-50 text-gray-700 px-2 py-1 rounded">
        2:00 Mike R.
      </div>
    </div>
  </div>
</CalendarDay>
```

#### Calendar Color Usage Restraint

##### ✅ **Semantic Color System (Maximum 4 Colors)**
```tsx
const getAppointmentStyle = (appointment: Appointment) => {
  // Only use color to convey important status information
  switch (appointment.status) {
    case 'confirmed':
      return 'bg-white border-gray-200 text-gray-900' // Default, neutral
    case 'tentative':
      return 'bg-yellow-50 border-yellow-200 text-yellow-800' // Warning
    case 'high-value':
      return 'bg-primary-50 border-primary-200 text-primary-800' // Important
    case 'blocked':
      return 'bg-gray-100 border-gray-300 text-gray-500' // Disabled
    default:
      return 'bg-white border-gray-200 text-gray-900'
  }
}
```

#### Animation Restraint for Calendars

##### ❌ **Overly Animated Calendar**
```tsx
// DON'T: Distracting animations that serve no purpose
<CalendarGrid className="animate-fadeInUp">
  {appointments.map(apt => (
    <AppointmentBlock 
      key={apt.id}
      className="animate-slideInLeft hover:animate-pulse
                 transform-gpu will-change-transform
                 transition-all duration-1000 ease-in-out
                 hover:scale-110 hover:rotate-3 hover:skew-x-12"
    />
  ))}
</CalendarGrid>
```

##### ✅ **Purposeful Calendar Animations**
```tsx
// DO: Minimal animations that aid understanding
<CalendarGrid>
  {appointments.map(apt => (
    <AppointmentBlock 
      key={apt.id}
      className="transition-colors duration-200 hover:bg-gray-50
                 focus:ring-2 focus:ring-primary-500 focus:outline-none"
    />
  ))}
</CalendarGrid>
```

### Calendar Information Hierarchy

#### The "Glance Test" for Calendars
> Users should be able to see their key information (next appointment, daily schedule, availability) within a 2-second glance.

#### ✅ **Progressive Information Disclosure**
```tsx
const CalendarAppointment = ({ appointment }: CalendarAppointmentProps) => {
  const [showDetails, setShowDetails] = useState(false)
  
  return (
    <div className="bg-white border border-gray-200 rounded p-2">
      {/* Always visible: Essential info only */}
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{appointment.clientName}</span>
        <time className="text-xs text-gray-500">{appointment.time}</time>
      </div>
      
      {/* Show details only when needed */}
      {showDetails && (
        <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
          <p>Service: {appointment.service}</p>
          <p>Duration: {appointment.duration}min</p>
          <p>Notes: {appointment.notes}</p>
        </div>
      )}
      
      <button 
        onClick={() => setShowDetails(!showDetails)}
        className="text-xs text-primary-600 hover:text-primary-700 mt-1"
      >
        {showDetails ? 'Less' : 'Details'}
      </button>
    </div>
  )
}
```

### Mobile Calendar Restraint

#### ✅ **Touch-First, Not Touch-Fancy**
```tsx
// DO: Large, simple touch targets
<TouchTarget 
  className="min-h-[44px] bg-white border border-gray-200 
             active:bg-gray-50 transition-colors duration-100"
  onTap={() => selectTimeSlot(slot)}
>
  <div className="p-4 flex justify-between">
    <time className="font-medium">{slot.time}</time>
    <span className="text-gray-500">{slot.duration}min</span>
  </div>
</TouchTarget>

// DON'T: Complex gestures or tiny targets
<ComplexGestureTarget 
  className="min-h-[20px] relative overflow-hidden"
  onSwipeLeft={handleSwipe}
  onSwipeRight={handleSwipe}
  onPinch={handlePinch}
  onRotate={handleRotate}
  onDoubleTap={handleDoubleTap}
>
  <div className="absolute inset-0 bg-gradient-radial animate-spin" />
  <div className="text-xs truncate">{slot.time}</div>
</ComplexGestureTarget>
```

---

## Conclusion: The Perfect Scheduling Experience

The BookedBarber V2 Calendar Design System represents the culmination of thoughtful design, robust engineering, and deep understanding of barbershop operations. By embodying the "invisible excellence" philosophy, we've created a calendar that doesn't just schedule appointments—it elevates the entire business experience.

### Key Achievements

1. **Design Excellence**: Mobile-first, accessible design that adapts to user roles
2. **Technical Robustness**: Bulletproof scheduling engine with real-time conflict prevention
3. **Performance Optimization**: Sub-100ms interactions with intelligent caching
4. **Business Intelligence**: Revenue-focused analytics seamlessly integrated
5. **Accessibility Leadership**: WCAG 2.1 AA compliance with comprehensive screen reader support
6. **Six Figure Barber Integration**: Every design decision supports revenue optimization

### The Invisible Excellence Promise

- **For Clients**: Effortless booking experience with instant confirmation
- **For Barbers**: Command center that maximizes productivity and revenue
- **For Owners**: Business intelligence platform that drives growth

This calendar system sets the foundation for continued platform evolution, ensuring that every appointment booked brings barbers closer to their Six Figure goals while providing clients with an exceptional, accessible experience.

*The result is a calendar that truly disappears into the background, allowing barbers to focus entirely on their craft while technology seamlessly manages their business operations.*

---

*Last updated: 2025-07-24*  
*Design System Version: 2.0.0*  
*Components: UnifiedCalendar, CalendarGrid, AppointmentBlock, TimeSlotPicker*