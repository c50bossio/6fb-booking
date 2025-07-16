# Phase 2 Calendar System - Integration Guide

## Overview

This guide provides comprehensive documentation for integrating and using the Phase 2 Calendar Enhancement System in the BookedBarber application. The system includes mobile optimization, accessibility features, performance enhancements, and advanced scheduling capabilities.

## Table of Contents

1. [Component Architecture](#component-architecture)
2. [Integration Quick Start](#integration-quick-start)
3. [Core Components](#core-components)
4. [Advanced Features](#advanced-features)
5. [Performance Optimization](#performance-optimization)
6. [Mobile & Touch Support](#mobile--touch-support)
7. [Accessibility Features](#accessibility-features)
8. [Error Handling](#error-handling)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

## Component Architecture

### System Overview

```
Phase 2 Calendar System
├── Core Components
│   ├── UnifiedCalendar (Main wrapper)
│   ├── VirtualizedCalendarGrid (Performance layer)
│   └── CalendarAnimationEngine (Animation layer)
├── Enhancement Modules
│   ├── CalendarCacheManager (Data & performance)
│   ├── TouchDragManager (Mobile interactions)
│   ├── MobileCalendarControls (Mobile UI)
│   ├── ConflictResolutionEngine (Scheduling logic)
│   └── BulkOperationsManager (Batch operations)
├── Support Systems
│   ├── Custom Hooks (useCalendarPerformance, etc.)
│   ├── Utility Functions (calendar-utilities.ts)
│   └── Accessibility Helpers (ARIA, keyboard nav)
└── Integration Layer
    ├── Role-based Dashboards
    ├── API Integration
    └── Error Boundaries
```

### Data Flow

```
User Interaction
    ↓
MobileCalendarControls / TouchDragManager
    ↓
UnifiedCalendar (Event coordination)
    ↓
VirtualizedCalendarGrid (Rendering optimization)
    ↓
CalendarCacheManager (Data management)
    ↓
API Integration
```

## Integration Quick Start

### Basic Setup

```tsx
import UnifiedCalendar from '@/components/UnifiedCalendar'
import { CalendarCacheManager } from '@/components/calendar/CalendarCacheManager'
import { CalendarAnimationEngine } from '@/components/calendar/CalendarAnimationEngine'

function CalendarPage() {
  const [appointments, setAppointments] = useState([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'day' | 'week' | 'month'>('month')

  return (
    <CalendarAnimationEngine performanceMode="balanced">
      <CalendarCacheManager 
        apiEndpoint="/api/v1/appointments"
        onDataLoaded={(data) => setAppointments(data)}
      >
        <UnifiedCalendar
          appointments={appointments}
          currentDate={currentDate}
          view={view}
          onDateChange={setCurrentDate}
          onViewChange={setView}
          userRole="SHOP_OWNER" // Adjust based on user
          enableMobileOptimizations={true}
          enableAccessibilityFeatures={true}
        />
      </CalendarCacheManager>
    </CalendarAnimationEngine>
  )
}
```

### Dashboard Integration

```tsx
import { ShopOwnerDashboard } from '@/components/dashboards/ShopOwnerDashboard'
import { VirtualizedCalendarGrid } from '@/components/calendar/VirtualizedCalendarGrid'

function DashboardWithCalendar() {
  return (
    <ShopOwnerDashboard locationId={locationId}>
      <VirtualizedCalendarGrid
        appointments={appointments}
        startDate={startDate}
        endDate={endDate}
        view="week"
        onAppointmentClick={handleAppointmentClick}
        enableVirtualization={true}
        userRole="SHOP_OWNER"
      />
    </ShopOwnerDashboard>
  )
}
```

## Core Components

### UnifiedCalendar

The main calendar component that orchestrates all features.

**Props:**
```typescript
interface UnifiedCalendarProps {
  appointments: Appointment[]
  currentDate: Date
  view: 'day' | 'week' | 'month'
  onDateChange: (date: Date) => void
  onViewChange: (view: CalendarView) => void
  userRole?: UserRole
  enableMobileOptimizations?: boolean
  enableAccessibilityFeatures?: boolean
  enableAnimations?: boolean
  className?: string
}
```

**Example:**
```tsx
<UnifiedCalendar
  appointments={appointments}
  currentDate={new Date()}
  view="month"
  onDateChange={(date) => console.log('Date changed:', date)}
  onViewChange={(view) => console.log('View changed:', view)}
  userRole="BARBER"
  enableMobileOptimizations={true}
  enableAccessibilityFeatures={true}
/>
```

### VirtualizedCalendarGrid

High-performance calendar grid with virtualization for large datasets.

**Props:**
```typescript
interface VirtualizedCalendarGridProps {
  appointments: Appointment[]
  startDate: Date
  endDate: Date
  view: CalendarView
  onAppointmentClick: (appointment: Appointment) => void
  enableVirtualization?: boolean
  itemHeight?: number
  overscan?: number
  className?: string
}
```

**Performance Configuration:**
```tsx
<VirtualizedCalendarGrid
  appointments={appointments}
  startDate={startDate}
  endDate={endDate}
  view="month"
  onAppointmentClick={handleClick}
  enableVirtualization={appointments.length > 1000}
  itemHeight={60} // Optimize for your appointment height
  overscan={5} // Render 5 extra items outside viewport
/>
```

### CalendarAnimationEngine

Animation system with performance optimization and reduced motion support.

**Configuration:**
```tsx
<CalendarAnimationEngine
  performanceMode="balanced" // 'high' | 'balanced' | 'low'
  enableMicroInteractions={true}
  enablePageTransitions={true}
  config={{
    duration: { fast: 150, normal: 300, slow: 500 },
    respectReducedMotion: true
  }}
>
  {children}
</CalendarAnimationEngine>
```

## Advanced Features

### Caching System

```tsx
import { CalendarCacheManager, useCalendarCache } from '@/components/calendar/CalendarCacheManager'

// Configuration
<CalendarCacheManager
  apiEndpoint="/api/v1/appointments"
  cacheConfig={{
    maxSize: 50, // 50MB cache
    maxEntries: 1000,
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    compressionEnabled: true,
    evictionStrategy: 'lru'
  }}
  lazyLoadConfig={{
    threshold: 200, // Load when 200px from viewport
    batchSize: 50,
    enablePrefetch: true
  }}
>
  {children}
</CalendarCacheManager>

// Usage in components
function CalendarComponent() {
  const { loadData, cache, stats } = useCalendarCache()
  
  const handleDateChange = async (date: Date) => {
    const data = await loadData({
      startDate: startOfMonth(date),
      endDate: endOfMonth(date),
      view: 'month'
    })
  }
  
  return <div>Cache hit ratio: {stats.hitRatio}%</div>
}
```

### Conflict Resolution

```tsx
import { ConflictResolutionEngine } from '@/components/calendar/ConflictResolutionEngine'

<ConflictResolutionEngine
  appointments={appointments}
  barbers={barbers}
  onConflictResolved={(resolution) => {
    console.log('Conflict resolved:', resolution)
  }}
  autoSuggest={true}
  enableShopLevelResolution={userRole === 'SHOP_OWNER'}
/>
```

### Bulk Operations

```tsx
import { BulkOperationsManager } from '@/components/calendar/BulkOperationsManager'

<BulkOperationsManager
  appointments={appointments}
  onBulkOperation={async (operation, selectedAppointments) => {
    switch (operation) {
      case 'cancel':
        await cancelAppointments(selectedAppointments)
        break
      case 'reschedule':
        await rescheduleAppointments(selectedAppointments, newTime)
        break
    }
  }}
  userRole={userRole}
  enableBulkActions={true}
  enableKeyboardShortcuts={true}
>
  {children}
</BulkOperationsManager>
```

## Performance Optimization

### Performance Monitoring

```tsx
import { useCalendarPerformance } from '@/hooks/useCalendarPerformance'

function PerformanceOptimizedCalendar() {
  const {
    metrics,
    startTracking,
    stopTracking,
    getRecommendations
  } = useCalendarPerformance({
    fpsThreshold: 50,
    memoryThreshold: 100 * 1024 * 1024 // 100MB
  })

  useEffect(() => {
    startTracking()
    return stopTracking
  }, [])

  const recommendations = getRecommendations()
  
  return (
    <div>
      <div>FPS: {metrics.fps}</div>
      <div>Memory: {(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
      {recommendations.suggestions.map(suggestion => (
        <div key={suggestion}>{suggestion}</div>
      ))}
    </div>
  )
}
```

### Virtualization Best Practices

```tsx
// For large datasets (1000+ appointments)
<VirtualizedCalendarGrid
  appointments={appointments}
  enableVirtualization={true}
  itemHeight={calculateOptimalHeight(appointments)} // Dynamic height
  overscan={Math.min(10, appointments.length / 100)} // Adaptive overscan
  onScroll={debounce(handleScroll, 16)} // 60fps scroll handling
/>

// For smaller datasets (< 1000 appointments)
<VirtualizedCalendarGrid
  appointments={appointments}
  enableVirtualization={false}
  className="traditional-grid"
/>
```

## Mobile & Touch Support

### Touch Drag Manager

```tsx
import { TouchDragManager } from '@/components/calendar/TouchDragManager'

<TouchDragManager
  onDragStart={(position) => {
    console.log('Drag started at:', position)
  }}
  onDragMove={(position, delta) => {
    console.log('Dragging:', position, 'Delta:', delta)
  }}
  onDragEnd={(position) => {
    console.log('Drag ended at:', position)
  }}
  dragThreshold={10} // Minimum pixels to start drag
  preventScrolling={true}
>
  <AppointmentCard draggable />
</TouchDragManager>
```

### Mobile Controls

```tsx
import { MobileCalendarControls } from '@/components/calendar/MobileCalendarControls'

<MobileCalendarControls
  currentDate={currentDate}
  view={view}
  onDateChange={setCurrentDate}
  onViewChange={setView}
  showViewSwitcher={true}
  enableGestures={true}
  onSwipeLeft={() => navigateNext()}
  onSwipeRight={() => navigatePrevious()}
/>
```

### Responsive Design Integration

```tsx
import { useResponsive } from '@/hooks/useResponsive'

function ResponsiveCalendar() {
  const { isMobile, isTablet, deviceType } = useResponsive()

  return (
    <div>
      {isMobile && <MobileCalendarControls />}
      <UnifiedCalendar
        enableMobileOptimizations={isMobile}
        view={isMobile ? 'day' : 'month'}
        touchEnabled={isMobile || isTablet}
      />
    </div>
  )
}
```

## Accessibility Features

### Accessibility Hook

```tsx
import { useCalendarAccessibility } from '@/hooks/useCalendarAccessibility'

function AccessibleCalendar() {
  const {
    announceToScreenReader,
    setFocusedDate,
    navigateCalendar,
    getAriaLabel,
    focusedDate
  } = useCalendarAccessibility()

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
        navigateCalendar('ArrowRight')
        announceToScreenReader(`Selected ${format(focusedDate, 'MMMM d, yyyy')}`)
        break
      case 'Enter':
        if (focusedDate) {
          onDateSelect(focusedDate)
        }
        break
    }
  }

  return (
    <div
      role="application"
      aria-label="Calendar"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Calendar content */}
    </div>
  )
}
```

### ARIA Implementation

```tsx
// Appointment with full ARIA support
<div
  role="button"
  aria-label={getAriaLabel('appointment', appointment)}
  aria-describedby={`appointment-details-${appointment.id}`}
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onAppointmentClick(appointment)
    }
  }}
>
  <div id={`appointment-details-${appointment.id}`} className="sr-only">
    {appointment.service_name} appointment with {appointment.client_name}
    from {format(appointment.start_time, 'h:mm a')} 
    to {format(appointment.end_time, 'h:mm a')}
    Status: {appointment.status}
  </div>
  {/* Visible content */}
</div>
```

## Error Handling

### Error Boundaries

```tsx
import { CalendarErrorBoundary } from '@/components/calendar/CalendarErrorBoundary'

<CalendarErrorBoundary
  fallback={(error, retry) => (
    <div className="error-state">
      <h3>Calendar temporarily unavailable</h3>
      <p>{error.message}</p>
      <button onClick={retry}>Retry</button>
    </div>
  )}
  onError={(error, errorInfo) => {
    // Log error to monitoring service
    console.error('Calendar error:', error, errorInfo)
  }}
>
  <UnifiedCalendar />
</CalendarErrorBoundary>
```

### Network Error Handling

```tsx
<CalendarCacheManager
  apiEndpoint="/api/v1/appointments"
  onError={(error, request) => {
    if (error.message.includes('Network')) {
      // Handle network errors
      showNotification('Working offline with cached data', 'warning')
    } else if (error.message.includes('500')) {
      // Handle server errors
      showNotification('Server error. Please try again later.', 'error')
    }
  }}
  enableOfflineMode={true}
>
  {children}
</CalendarCacheManager>
```

## Testing

### Component Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import UnifiedCalendar from '@/components/UnifiedCalendar'

test('renders calendar with appointments', () => {
  const appointments = [
    {
      id: 1,
      start_time: '2023-12-01T10:00:00Z',
      end_time: '2023-12-01T11:00:00Z',
      client_name: 'John Doe',
      service_name: 'Haircut',
      status: 'confirmed'
    }
  ]

  render(
    <UnifiedCalendar
      appointments={appointments}
      currentDate={new Date('2023-12-01')}
      view="month"
      onDateChange={jest.fn()}
      onViewChange={jest.fn()}
    />
  )

  expect(screen.getByText('John Doe')).toBeInTheDocument()
  expect(screen.getByText('Haircut')).toBeInTheDocument()
})
```

### Performance Testing

```tsx
import { renderHook } from '@testing-library/react'
import { useCalendarPerformance } from '@/hooks/useCalendarPerformance'

test('tracks performance metrics', () => {
  const { result } = renderHook(() => useCalendarPerformance())
  
  act(() => {
    result.current.startTracking()
  })

  // Simulate performance operations
  const metrics = result.current.getMetrics()
  
  expect(metrics.fps).toBeGreaterThan(0)
  expect(metrics.memoryUsage).toBeGreaterThan(0)
})
```

### Integration Testing

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

test('mobile touch interactions work correctly', async () => {
  const user = userEvent.setup()
  
  render(
    <TouchDragManager
      onDragStart={jest.fn()}
      onDragMove={jest.fn()}
      onDragEnd={jest.fn()}
    >
      <div data-testid="draggable">Draggable content</div>
    </TouchDragManager>
  )

  const draggable = screen.getByTestId('draggable')
  
  // Simulate touch drag
  fireEvent.touchStart(draggable, {
    touches: [{ clientX: 100, clientY: 100 }]
  })
  
  fireEvent.touchMove(draggable, {
    touches: [{ clientX: 150, clientY: 100 }]
  })
  
  fireEvent.touchEnd(draggable)
  
  // Verify drag events were called
  // ... assertions
})
```

## Troubleshooting

### Common Issues

#### 1. Performance Issues

**Symptoms:** Slow rendering, low FPS, high memory usage

**Solutions:**
```tsx
// Enable performance monitoring
const { getRecommendations } = useCalendarPerformance()
const recommendations = getRecommendations()

// Apply recommended optimizations
<CalendarAnimationEngine performanceMode="low">
  <VirtualizedCalendarGrid
    enableVirtualization={true}
    itemHeight={50} // Reduce item height
    overscan={3} // Reduce overscan
  />
</CalendarAnimationEngine>
```

#### 2. Touch Events Not Working

**Symptoms:** Touch gestures not responding on mobile

**Solutions:**
```tsx
// Ensure touch manager is properly configured
<TouchDragManager
  dragThreshold={15} // Increase threshold for better detection
  preventScrolling={false} // Allow scrolling if needed
>
  {children}
</TouchDragManager>

// Check for CSS pointer-events
.touch-element {
  touch-action: manipulation; /* Enable touch */
  pointer-events: auto; /* Ensure events are enabled */
}
```

#### 3. Cache Issues

**Symptoms:** Stale data, memory leaks, slow loading

**Solutions:**
```tsx
// Clear cache manually
const { cache } = useCalendarCache()
cache.clear()

// Adjust cache configuration
<CalendarCacheManager
  cacheConfig={{
    maxSize: 25, // Reduce cache size
    defaultTTL: 2 * 60 * 1000, // Shorter TTL
    evictionStrategy: 'lru' // Use LRU eviction
  }}
>
  {children}
</CalendarCacheManager>
```

#### 4. Accessibility Issues

**Symptoms:** Screen reader not announcing changes, keyboard navigation broken

**Solutions:**
```tsx
// Ensure proper ARIA announcements
const { announceToScreenReader } = useCalendarAccessibility()

useEffect(() => {
  announceToScreenReader(`Calendar view changed to ${view}`)
}, [view])

// Add proper focus management
<div
  role="application"
  aria-label="Calendar"
  tabIndex={0}
  onKeyDown={handleKeyDown}
>
  {/* Calendar content */}
</div>
```

### Debug Mode

Enable debug mode for detailed logging:

```tsx
<CalendarAnimationEngine
  config={{ debug: process.env.NODE_ENV === 'development' }}
>
  <CalendarCacheManager
    debug={true}
    onDebugInfo={(info) => console.log('Cache debug:', info)}
  >
    {children}
  </CalendarCacheManager>
</CalendarAnimationEngine>
```

### Performance Monitoring

```tsx
// Production monitoring
if (process.env.NODE_ENV === 'production') {
  const { metrics } = useCalendarPerformance()
  
  if (metrics.fps < 30) {
    // Log performance issue
    analytics.track('calendar_performance_issue', {
      fps: metrics.fps,
      memory: metrics.memoryUsage,
      timestamp: Date.now()
    })
  }
}
```

## Migration Guide

### From Legacy Calendar

```tsx
// Before (Legacy)
<LegacyCalendar
  appointments={appointments}
  date={date}
  onChange={handleChange}
/>

// After (Phase 2)
<CalendarAnimationEngine>
  <CalendarCacheManager apiEndpoint="/api/v1/appointments">
    <UnifiedCalendar
      appointments={appointments}
      currentDate={date}
      view="month"
      onDateChange={handleChange}
      onViewChange={handleViewChange}
      enableMobileOptimizations={true}
      enableAccessibilityFeatures={true}
    />
  </CalendarCacheManager>
</CalendarAnimationEngine>
```

### Breaking Changes

1. **Event Handlers:** `onChange` → `onDateChange` and `onViewChange`
2. **Props:** `date` → `currentDate`
3. **Structure:** Now requires wrapper components for full functionality
4. **Dependencies:** New peer dependencies for animations and utilities

### Compatibility Layer

```tsx
// Compatibility wrapper for gradual migration
function LegacyCalendarWrapper(props: LegacyCalendarProps) {
  return (
    <UnifiedCalendar
      appointments={props.appointments}
      currentDate={props.date}
      view={props.view || 'month'}
      onDateChange={props.onChange}
      onViewChange={props.onViewChange || (() => {})}
      // Map other legacy props as needed
    />
  )
}
```

---

## Support

For additional support and questions:

- **Documentation:** Check component-specific README files
- **Examples:** See `/examples` directory for complete implementations
- **Testing:** Reference test files for usage patterns
- **Performance:** Use built-in performance monitoring tools

**Last Updated:** 2025-07-16  
**Version:** Phase 2.1.0  
**Compatibility:** React 18+, TypeScript 4.9+