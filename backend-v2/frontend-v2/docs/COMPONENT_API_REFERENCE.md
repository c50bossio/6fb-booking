# Phase 2 Calendar Components - API Reference

## Table of Contents

1. [UnifiedCalendar](#unifiedcalendar)
2. [VirtualizedCalendarGrid](#virtualizedcalendargrid)
3. [CalendarAnimationEngine](#calendaranimationengine)
4. [CalendarCacheManager](#calendarcachemanager)
5. [TouchDragManager](#touchdragmanager)
6. [MobileCalendarControls](#mobilecalendarcontrols)
7. [ConflictResolutionEngine](#conflictresolutionengine)
8. [BulkOperationsManager](#bulkoperationsmanager)
9. [Custom Hooks](#custom-hooks)
10. [Utility Functions](#utility-functions)

---

## UnifiedCalendar

Main calendar component that orchestrates all Phase 2 features.

### Props

```typescript
interface UnifiedCalendarProps {
  // Data
  appointments: Appointment[]
  currentDate: Date
  view: 'day' | 'week' | 'month'
  
  // Event Handlers
  onDateChange: (date: Date) => void
  onViewChange: (view: CalendarView) => void
  onAppointmentClick?: (appointment: Appointment) => void
  onAppointmentUpdate?: (id: number, updates: Partial<Appointment>) => Promise<void>
  onAppointmentCancel?: (id: number) => Promise<void>
  onAppointmentReschedule?: (id: number, newTime: { start: Date; end: Date }) => Promise<void>
  
  // User Context
  userRole?: UserRole
  userId?: number
  locationId?: number
  barberId?: number
  
  // Feature Toggles
  enableMobileOptimizations?: boolean
  enableAccessibilityFeatures?: boolean
  enableAnimations?: boolean
  enableTouchGestures?: boolean
  enableKeyboardNavigation?: boolean
  enableBulkOperations?: boolean
  enableConflictResolution?: boolean
  
  // Display Options
  showTimeSlots?: boolean
  showAppointmentDetails?: boolean
  showBarberInfo?: boolean
  showServiceDuration?: boolean
  timeFormat?: '12h' | '24h'
  
  // Styling
  className?: string
  theme?: 'light' | 'dark' | 'auto'
  
  // Performance
  virtualizeThreshold?: number
  cacheConfig?: Partial<CacheConfig>
  
  // Accessibility
  ariaLabel?: string
  announceChanges?: boolean
  
  // Advanced
  customRenderers?: {
    appointment?: (appointment: Appointment) => React.ReactNode
    timeSlot?: (slot: TimeSlot) => React.ReactNode
    header?: (date: Date, view: CalendarView) => React.ReactNode
  }
}
```

### Usage Examples

#### Basic Usage
```tsx
<UnifiedCalendar
  appointments={appointments}
  currentDate={new Date()}
  view="month"
  onDateChange={setCurrentDate}
  onViewChange={setView}
/>
```

#### Advanced Configuration
```tsx
<UnifiedCalendar
  appointments={appointments}
  currentDate={currentDate}
  view={view}
  onDateChange={setCurrentDate}
  onViewChange={setView}
  userRole="SHOP_OWNER"
  enableMobileOptimizations={isMobile}
  enableAccessibilityFeatures={true}
  enableBulkOperations={true}
  theme="auto"
  timeFormat="12h"
  customRenderers={{
    appointment: (apt) => <CustomAppointmentCard appointment={apt} />,
    header: (date, view) => <CustomHeader date={date} view={view} />
  }}
/>
```

### Events

| Event | Description | Payload |
|-------|-------------|---------|
| `onDateChange` | Fired when user navigates to different date | `Date` |
| `onViewChange` | Fired when calendar view changes | `'day' \| 'week' \| 'month'` |
| `onAppointmentClick` | Fired when appointment is clicked | `Appointment` |
| `onAppointmentUpdate` | Fired when appointment is modified | `id: number, updates: Partial<Appointment>` |

---

## VirtualizedCalendarGrid

High-performance calendar grid with virtualization support.

### Props

```typescript
interface VirtualizedCalendarGridProps {
  // Data
  appointments: Appointment[]
  startDate: Date
  endDate: Date
  view: CalendarView
  
  // Event Handlers
  onAppointmentClick: (appointment: Appointment) => void
  onScroll?: (scrollTop: number) => void
  onVisibleRangeChange?: (start: Date, end: Date) => void
  
  // Virtualization
  enableVirtualization?: boolean
  itemHeight?: number
  overscan?: number
  threshold?: number
  
  // Performance
  enableLazyLoading?: boolean
  batchSize?: number
  debounceScrollMs?: number
  
  // Styling
  className?: string
  gridClassName?: string
  cellClassName?: string
  
  // User Context
  userRole?: UserRole
  
  // Advanced
  renderAppointment?: (appointment: Appointment, style: React.CSSProperties) => React.ReactNode
  renderTimeSlot?: (slot: TimeSlot, style: React.CSSProperties) => React.ReactNode
  
  // Accessibility
  role?: string
  ariaLabel?: string
  tabIndex?: number
}
```

### Performance Configuration

```typescript
// For large datasets (5000+ appointments)
const largeDatasetConfig = {
  enableVirtualization: true,
  itemHeight: 50,
  overscan: 5,
  threshold: 1000,
  batchSize: 100,
  debounceScrollMs: 16
}

// For small datasets (< 500 appointments)
const smallDatasetConfig = {
  enableVirtualization: false,
  enableLazyLoading: false
}
```

### Usage Examples

```tsx
// Basic virtualized grid
<VirtualizedCalendarGrid
  appointments={appointments}
  startDate={startOfMonth(currentDate)}
  endDate={endOfMonth(currentDate)}
  view="month"
  onAppointmentClick={handleAppointmentClick}
  enableVirtualization={appointments.length > 1000}
/>

// Highly optimized for large datasets
<VirtualizedCalendarGrid
  appointments={largeAppointmentSet}
  startDate={startDate}
  endDate={endDate}
  view="month"
  onAppointmentClick={handleClick}
  enableVirtualization={true}
  itemHeight={45}
  overscan={3}
  enableLazyLoading={true}
  batchSize={50}
  renderAppointment={(apt, style) => (
    <CustomAppointment 
      appointment={apt} 
      style={style} 
      compact={true}
    />
  )}
/>
```

---

## CalendarAnimationEngine

Animation system with performance optimization and accessibility compliance.

### Props

```typescript
interface CalendarAnimationEngineProps {
  children: React.ReactNode
  
  // Performance
  performanceMode?: 'high' | 'balanced' | 'low'
  
  // Feature Toggles
  enableMicroInteractions?: boolean
  enablePageTransitions?: boolean
  enableLoadingAnimations?: boolean
  
  // Configuration
  config?: Partial<AnimationConfig>
  
  // Styling
  className?: string
}

interface AnimationConfig {
  enableAnimations: boolean
  respectReducedMotion: boolean
  duration: {
    fast: number
    normal: number
    slow: number
  }
  easing: {
    ease: [number, number, number, number]
    easeInOut: [number, number, number, number]
    bounce: [number, number, number, number]
  }
  stagger: {
    appointments: number
    timeSlots: number
    navigation: number
  }
}
```

### Usage Examples

```tsx
// Balanced performance mode
<CalendarAnimationEngine performanceMode="balanced">
  <UnifiedCalendar {...props} />
</CalendarAnimationEngine>

// Custom configuration
<CalendarAnimationEngine
  performanceMode="high"
  enableMicroInteractions={true}
  config={{
    duration: { fast: 100, normal: 200, slow: 400 },
    respectReducedMotion: true,
    stagger: { appointments: 0.05 }
  }}
>
  <UnifiedCalendar {...props} />
</CalendarAnimationEngine>

// Performance-conscious setup
<CalendarAnimationEngine
  performanceMode={isMobile ? 'low' : 'balanced'}
  enableMicroInteractions={!prefersReducedMotion}
  enablePageTransitions={!isSlowDevice}
>
  <UnifiedCalendar {...props} />
</CalendarAnimationEngine>
```

### Animation Variants

The engine provides pre-built animation variants:

- **Appointment animations:** scale, fade, slide, bounce
- **View transitions:** smooth transitions between day/week/month
- **Loading states:** skeleton, pulse, shimmer
- **Navigation:** staggered list animations
- **Feedback:** success/error micro-interactions

---

## CalendarCacheManager

Intelligent caching system with lazy loading and performance optimization.

### Props

```typescript
interface CalendarCacheManagerProps {
  children: React.ReactNode
  apiEndpoint: string
  
  // Cache Configuration
  cacheConfig?: Partial<CacheConfig>
  
  // Lazy Loading
  lazyLoadConfig?: Partial<LazyLoadConfig>
  
  // Event Handlers
  onDataLoaded?: (data: any, request: CalendarDataRequest) => void
  onError?: (error: Error, request: CalendarDataRequest) => void
  onCacheHit?: () => void
  onCacheMiss?: () => void
  onCacheInvalidation?: () => void
  
  // Styling
  className?: string
}

interface CacheConfig {
  maxSize: number // MB
  maxEntries: number
  defaultTTL: number // milliseconds
  prefetchDistance: number // days
  compressionEnabled: boolean
  persistToStorage: boolean
  evictionStrategy: 'lru' | 'lfu' | 'ttl' | 'size'
}

interface LazyLoadConfig {
  threshold: number // pixels
  batchSize: number
  maxConcurrency: number
  retryAttempts: number
  retryDelay: number
  enablePrefetch: boolean
  prefetchDirection: 'forward' | 'backward' | 'both'
}
```

### Usage Examples

```tsx
// Basic caching
<CalendarCacheManager apiEndpoint="/api/v1/appointments">
  <UnifiedCalendar {...props} />
</CalendarCacheManager>

// Optimized configuration
<CalendarCacheManager
  apiEndpoint="/api/v1/appointments"
  cacheConfig={{
    maxSize: 100, // 100MB cache
    maxEntries: 2000,
    defaultTTL: 10 * 60 * 1000, // 10 minutes
    compressionEnabled: true,
    evictionStrategy: 'lru'
  }}
  lazyLoadConfig={{
    threshold: 200,
    batchSize: 50,
    enablePrefetch: true,
    prefetchDirection: 'both'
  }}
  onError={(error, request) => {
    console.error('Cache error:', error)
    // Handle offline mode, retry logic, etc.
  }}
>
  <UnifiedCalendar {...props} />
</CalendarCacheManager>
```

### Using Cache Hook

```tsx
import { useCalendarCache } from '@/components/calendar/CalendarCacheManager'

function CalendarComponent() {
  const { loadData, cache, stats } = useCalendarCache()
  
  const handleDateChange = async (date: Date) => {
    const data = await loadData({
      startDate: startOfMonth(date),
      endDate: endOfMonth(date),
      view: 'month',
      barberId: currentBarber?.id
    })
  }
  
  return (
    <div>
      <div>Cache efficiency: {stats.hitRatio.toFixed(1)}%</div>
      <div>Memory usage: {stats.currentSizeMB}MB</div>
    </div>
  )
}
```

---

## TouchDragManager

Touch gesture and drag interaction manager for mobile devices.

### Props

```typescript
interface TouchDragManagerProps {
  children: React.ReactNode
  
  // Event Handlers
  onDragStart: (position: { x: number; y: number }) => void
  onDragMove: (position: { x: number; y: number }, delta: { deltaX: number; deltaY: number }) => void
  onDragEnd: (position: { x: number; y: number }) => void
  
  // Configuration
  dragThreshold?: number
  preventScrolling?: boolean
  enableMultiTouch?: boolean
  debounceMs?: number
  
  // Constraints
  constrainToX?: boolean
  constrainToY?: boolean
  bounds?: { top: number; left: number; right: number; bottom: number }
  
  // Styling
  className?: string
}
```

### Usage Examples

```tsx
// Basic drag handling
<TouchDragManager
  onDragStart={(pos) => console.log('Drag start:', pos)}
  onDragMove={(pos, delta) => console.log('Dragging:', pos, delta)}
  onDragEnd={(pos) => console.log('Drag end:', pos)}
>
  <AppointmentCard />
</TouchDragManager>

// Appointment rescheduling with constraints
<TouchDragManager
  onDragStart={handleDragStart}
  onDragMove={handleDragMove}
  onDragEnd={handleReschedule}
  dragThreshold={15}
  constrainToY={true} // Only vertical dragging
  bounds={{
    top: 0,
    left: 0,
    right: calendarWidth,
    bottom: calendarHeight
  }}
>
  <AppointmentCard appointment={appointment} />
</TouchDragManager>
```

---

## MobileCalendarControls

Mobile-optimized navigation and view controls.

### Props

```typescript
interface MobileCalendarControlsProps {
  // State
  currentDate: Date
  view: CalendarView
  
  // Event Handlers
  onDateChange: (date: Date) => void
  onViewChange: (view: CalendarView) => void
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  
  // Configuration
  showViewSwitcher?: boolean
  enableGestures?: boolean
  availableViews?: CalendarView[]
  
  // Styling
  className?: string
  theme?: 'light' | 'dark'
  
  // Accessibility
  navigationAriaLabel?: string
  viewSwitcherAriaLabel?: string
}
```

### Usage Examples

```tsx
// Basic mobile controls
<MobileCalendarControls
  currentDate={currentDate}
  view={view}
  onDateChange={setCurrentDate}
  onViewChange={setView}
/>

// Full-featured mobile navigation
<MobileCalendarControls
  currentDate={currentDate}
  view={view}
  onDateChange={setCurrentDate}
  onViewChange={setView}
  showViewSwitcher={true}
  enableGestures={true}
  availableViews={['day', 'week', 'month']}
  onSwipeLeft={() => navigateNext()}
  onSwipeRight={() => navigatePrevious()}
  theme="auto"
/>
```

---

## ConflictResolutionEngine

Intelligent appointment conflict detection and resolution system.

### Props

```typescript
interface ConflictResolutionEngineProps {
  // Data
  appointments: Appointment[]
  barbers: Barber[]
  
  // Event Handlers
  onConflictResolved: (resolution: ConflictResolution) => void
  onConflictIgnored?: (conflict: AppointmentConflict) => void
  
  // Configuration
  autoSuggest?: boolean
  enableShopLevelResolution?: boolean
  conflictThreshold?: number // minutes
  
  // User Context
  userRole?: UserRole
  
  // Styling
  className?: string
}

interface ConflictResolution {
  type: 'reschedule' | 'reassign' | 'modify' | 'cancel'
  appointmentId: number
  suggestion: {
    newTime?: { start: Date; end: Date }
    newBarber?: number
    newDuration?: number
  }
}
```

### Usage Examples

```tsx
// Basic conflict resolution
<ConflictResolutionEngine
  appointments={appointments}
  barbers={barbers}
  onConflictResolved={(resolution) => {
    applyResolution(resolution)
  }}
/>

// Advanced configuration
<ConflictResolutionEngine
  appointments={appointments}
  barbers={barbers}
  onConflictResolved={handleResolution}
  autoSuggest={true}
  enableShopLevelResolution={userRole === 'SHOP_OWNER'}
  conflictThreshold={15} // 15-minute buffer
  userRole={userRole}
/>
```

---

## BulkOperationsManager

Batch operations manager for appointment management.

### Props

```typescript
interface BulkOperationsManagerProps {
  children: React.ReactNode
  
  // Data
  appointments: Appointment[]
  
  // Event Handlers
  onBulkOperation: (operation: BulkOperation, appointments: Appointment[]) => Promise<void>
  onSelectionChange?: (selectedAppointments: Appointment[]) => void
  
  // Configuration
  enableBulkActions?: boolean
  enableKeyboardShortcuts?: boolean
  maxSelection?: number
  
  // Available Operations
  enableBulkCancel?: boolean
  enableBulkReschedule?: boolean
  enableBulkComplete?: boolean
  enableBarberReassignment?: boolean
  
  // User Context
  userRole?: UserRole
  
  // Styling
  className?: string
}

type BulkOperation = 'cancel' | 'reschedule' | 'complete' | 'reassign' | 'update'
```

### Usage Examples

```tsx
// Basic bulk operations
<BulkOperationsManager
  appointments={appointments}
  onBulkOperation={async (operation, selected) => {
    switch (operation) {
      case 'cancel':
        await cancelAppointments(selected.map(a => a.id))
        break
      case 'complete':
        await markAppointmentsComplete(selected.map(a => a.id))
        break
    }
  }}
  userRole="SHOP_OWNER"
>
  <UnifiedCalendar {...props} />
</BulkOperationsManager>

// Role-based permissions
<BulkOperationsManager
  appointments={appointments}
  onBulkOperation={handleBulkOperation}
  enableBulkCancel={['SHOP_OWNER', 'SHOP_MANAGER'].includes(userRole)}
  enableBulkReschedule={userRole === 'SHOP_OWNER'}
  enableBarberReassignment={userRole === 'SHOP_OWNER'}
  maxSelection={50}
  userRole={userRole}
>
  <UnifiedCalendar {...props} />
</BulkOperationsManager>
```

---

## Custom Hooks

### useCalendarPerformance

```typescript
interface UseCalendarPerformanceOptions {
  fpsThreshold?: number
  memoryThreshold?: number
  trackingInterval?: number
}

interface PerformanceMetrics {
  fps: number
  memoryUsage: number
  renderTime: number
  animationCount: number
  isTracking: boolean
}

function useCalendarPerformance(options?: UseCalendarPerformanceOptions): {
  metrics: PerformanceMetrics
  startTracking: () => void
  stopTracking: () => void
  measureRenderTime: (componentName: string) => void
  endMeasureRenderTime: (componentName: string) => void
  getRecommendations: () => PerformanceRecommendations
  getPerformanceWarnings: () => string[]
}
```

### useCalendarAccessibility

```typescript
function useCalendarAccessibility(): {
  // Screen Reader
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void
  
  // Focus Management
  focusedDate: Date | null
  setFocusedDate: (date: Date) => void
  
  // Keyboard Navigation
  navigateCalendar: (key: string) => void
  
  // ARIA Helpers
  getAriaLabel: (type: string, data: any) => string
  
  // Focus Trap (for modals)
  createFocusTrap: (element: HTMLElement) => void
  destroyFocusTrap: () => void
  focusTrap: any | null
}
```

### useResponsive

```typescript
interface ResponsiveBreakpoints {
  mobile: number
  tablet: number
  desktop: number
}

function useResponsive(breakpoints?: ResponsiveBreakpoints): {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  deviceType: 'mobile' | 'tablet' | 'desktop'
  orientation: 'portrait' | 'landscape'
  viewport: { width: number; height: number }
}
```

### useDebounce

```typescript
function useDebounce<T>(value: T, delay: number): T
```

### useLocalStorage

```typescript
function useLocalStorage<T>(
  key: string, 
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void]
```

### useHoverIntent

```typescript
interface UseHoverIntentOptions {
  onHoverStart?: () => void
  onHoverEnd?: () => void
  delay?: number
}

function useHoverIntent(options: UseHoverIntentOptions): {
  isHovering: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
}
```

### useControlledTooltip

```typescript
interface UseControlledTooltipOptions {
  autoHideDelay?: number
  disabled?: boolean
}

function useControlledTooltip(options?: UseControlledTooltipOptions): {
  isVisible: boolean
  position: { x: number; y: number } | null
  content: string | null
  show: () => void
  hide: () => void
  toggle: () => void
  setPosition: (position: { x: number; y: number }) => void
  setContent: (content: string) => void
  hoverHandlers: {
    onMouseEnter: () => void
    onMouseLeave: () => void
  }
}
```

---

## Utility Functions

### Calendar Utilities (`@/lib/calendar-utilities`)

```typescript
// Time formatting
formatAppointmentTime(appointment: Appointment, options?: { format24h?: boolean }): string
calculateAppointmentDuration(appointment: Appointment): number

// Conflict detection
detectTimeConflicts(appointments: Appointment[]): AppointmentConflict[]
isAppointmentConflict(apt1: Appointment, apt2: Appointment): boolean

// Time slot generation
generateTimeSlots(
  startTime: Date, 
  endTime: Date, 
  intervalMinutes: number, 
  busyTimes?: TimeRange[]
): TimeSlot[]

// Business rules
isWithinBusinessHours(appointment: Appointment, businessHours: BusinessHours): boolean
validateAppointmentData(appointment: Partial<Appointment>): ValidationResult

// Performance optimization
debounceCalendarUpdates<T extends (...args: any[]) => any>(
  func: T, 
  delay: number, 
  immediate?: boolean
): T

memoizeCalendarData<T>(
  func: (...args: any[]) => T, 
  options?: { maxSize?: number }
): (...args: any[]) => T

// Data sanitization
sanitizeCalendarInput(input: any, options?: { maxLength?: number }): any
generateCalendarKey(request: CalendarDataRequest): string

// Viewport calculations
calculateOptimalViewport(
  appointments: Appointment[], 
  view: CalendarView
): { startDate: Date; endDate: Date; zoomLevel: number }
```

### Touch Utilities (`@/lib/touch-utilities`)

```typescript
// Touch gesture detection
detectSwipeGesture(
  startPos: { x: number; y: number },
  endPos: { x: number; y: number },
  duration: number
): SwipeGesture | null

calculateVelocity(
  startPos: { x: number; y: number },
  endPos: { x: number; y: number },
  duration: number
): { x: number; y: number; magnitude: number }

// Touch handler creation
createTouchHandler(options: TouchHandlerOptions): TouchEventHandlers

// Gesture recognition
createDoubleTapDetector(windowMs: number): DoubleTapDetector
```

### Animation Utilities (`@/lib/animation-utilities`)

```typescript
// Animation sequencing
createAnimationSequence(animations: AnimationStep[]): AnimationSequence

// Performance optimization
optimizeFrameRate(currentFPS: number, targetFPS: number): OptimizationSuggestions
detectReducedMotion(): boolean

// Easing functions
calculateEasing(t: number, controlPoints: [number, number, number, number]): number

// Animation management
manageAnimationQueue(animations: Animation[]): AnimationQueue
```

---

## Type Definitions

### Core Types

```typescript
type CalendarView = 'day' | 'week' | 'month'
type UserRole = 'CLIENT' | 'BARBER' | 'INDIVIDUAL_BARBER' | 'SHOP_OWNER' | 'ENTERPRISE_OWNER' | 'SHOP_MANAGER'

interface Appointment {
  id: number
  start_time: string
  end_time: string
  client_name: string
  service_name: string
  barber_name: string
  status: 'confirmed' | 'scheduled' | 'completed' | 'cancelled'
  duration_minutes: number
  barber_id?: number
  client_id?: number
  service_id?: number
  location_id?: number
  notes?: string
  revenue?: number
}

interface TimeSlot {
  time: Date
  available: boolean
  duration: number
  appointment?: Appointment
}

interface Barber {
  id: number
  name: string
  email: string
  avatar?: string
  availability?: BusinessHours
}
```

### Configuration Types

```typescript
interface CalendarDataRequest {
  startDate: Date
  endDate: Date
  view: CalendarView
  barberId?: number
  locationId?: number
  includeDetails?: boolean
  filters?: Record<string, any>
}

interface BusinessHours {
  [key: string]: { open: string; close: string } | { closed: true }
}

interface AppointmentConflict {
  type: 'overlap' | 'overbooking' | 'scheduling'
  severity: 'low' | 'medium' | 'high'
  conflictingAppointments: Appointment[]
  suggestedResolutions: ConflictResolution[]
}
```

---

This API reference provides comprehensive documentation for all Phase 2 calendar components. For implementation examples and best practices, refer to the Integration Guide and component test files.