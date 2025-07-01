/**
 * Standardized calendar and appointment types for type safety across the application
 */

// Core appointment interface - matches backend API response
export interface Appointment {
  id: number
  start_time: string // ISO string
  end_time?: string // ISO string
  service_name: string
  service_id?: number
  client_name?: string
  client_id?: number
  client_email?: string
  client_phone?: string
  barber_id?: number
  barber_name?: string
  status: AppointmentStatus
  duration_minutes?: number
  price?: number
  notes?: string
  created_at?: string
  updated_at?: string
  is_recurring?: boolean
  recurring_series_id?: number
}

export type AppointmentStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'scheduled' 
  | 'completed' 
  | 'cancelled' 
  | 'no_show'

// Extended appointment for creation/updates
export interface AppointmentCreate extends Omit<Appointment, 'id' | 'created_at' | 'updated_at'> {
  date: string // YYYY-MM-DD format
  time: string // HH:MM format
  send_notification?: boolean
  recurring_pattern?: RecurringPattern
}

export interface AppointmentUpdate extends Partial<AppointmentCreate> {
  id: number
}

// Barber/Staff interface
export interface Barber {
  id: number
  name?: string
  first_name?: string
  last_name?: string
  email: string
  avatar?: string
  role?: string
  is_active?: boolean
  specialties?: string[]
}

// Client interface
export interface Client {
  id: number
  first_name: string
  last_name: string
  email: string
  phone?: string
  avatar?: string
  notes?: string
  preferences?: ClientPreferences
  created_at?: string
  total_appointments?: number
  last_appointment?: string
}

export interface ClientPreferences {
  preferred_barber_id?: number
  preferred_services?: number[]
  communication_method?: 'email' | 'sms' | 'both'
  reminder_time?: number // minutes before appointment
}

// Service interface
export interface Service {
  id: number
  name: string
  description?: string
  duration_minutes: number
  price: number
  category?: string
  is_active?: boolean
  requires_booking?: boolean
}

// Time slot interface for availability
export interface TimeSlot {
  time: string // HH:MM format
  available: boolean
  barber_id?: number
  appointment_id?: number
  reason?: string // reason if not available
}

// Calendar view types
export type CalendarView = 'day' | 'week' | 'month'

// Calendar view props interfaces
export interface CalendarViewProps {
  appointments: Appointment[]
  barbers?: Barber[]
  selectedBarberId?: number | 'all'
  onBarberSelect?: (barberId: number | 'all') => void
  onAppointmentClick?: (appointment: Appointment) => void
  onClientClick?: (client: Client) => void
  onTimeSlotClick?: (date: Date, barberId?: number) => void
  onAppointmentUpdate?: (appointmentId: number, newStartTime: string) => void | Promise<void>
  clients?: Client[]
  startHour?: number
  endHour?: number
  slotDuration?: number
  currentDate?: Date
  onDateChange?: (date: Date) => void
  loading?: boolean
  error?: string | null
}

// Recurring appointment types
export interface RecurringPattern {
  type: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  interval: number
  end_date?: string
  max_occurrences?: number
  days_of_week?: number[] // 0-6, Sunday = 0
  day_of_month?: number
}

export interface RecurringSeries {
  id: number
  pattern: RecurringPattern
  appointments: Appointment[]
  created_at: string
  next_occurrence?: string
}

// Calendar conflict types
export interface ConflictInfo {
  type: 'overlap' | 'adjacent' | 'double_booking' | 'barber_unavailable'
  severity: 'critical' | 'warning' | 'info'
  conflictingAppointment: Appointment
  overlapMinutes: number
  message: string
}

export interface ConflictResolution {
  type: 'reschedule' | 'adjust_duration' | 'change_barber' | 'split_appointment'
  suggestedStartTime?: string
  suggestedEndTime?: string
  suggestedBarberId?: number
  adjustedDuration?: number
  message: string
  confidence: number // 0-100
}

export interface ConflictAnalysis {
  hasConflicts: boolean
  conflicts: ConflictInfo[]
  resolutions: ConflictResolution[]
  riskScore: number // 0-100
}

// Calendar state management
export interface CalendarState {
  view: CalendarView
  currentDate: Date
  selectedDate: Date | null
  selectedBarberId: number | 'all'
  appointments: Appointment[]
  barbers: Barber[]
  clients: Client[]
  services: Service[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

// API response types
export interface AppointmentsResponse {
  appointments: Appointment[]
  total: number
  page?: number
  limit?: number
}

export interface SlotsResponse {
  date: string
  slots: TimeSlot[]
  barber_id?: number
}

// Calendar component error types
export interface CalendarError {
  name: string
  message: string
  code: string  // Required for compatibility
  errorCode?: string  // Our custom error code
  context?: Record<string, any>
  recoverable?: boolean
  timestamp?: Date
  stack?: string
  userMessage?: string
  componentStack?: string
}

// Touch interaction types
export interface TouchPosition {
  x: number
  y: number
  clientX: number
  clientY: number
}

export interface DragState {
  isDragging: boolean
  draggedAppointment: Appointment | null
  startPosition: TouchPosition | null
  currentPosition: TouchPosition | null
  dropTarget: HTMLElement | null
}

// Calendar performance metrics
export interface CalendarMetrics {
  renderTime: number
  appointmentCount: number
  viewSwitchTime: number
  apiResponseTime: number
  lastMeasurement: Date
}

// Validation schemas
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings?: string[]
}

// User interface for calendar context
export interface User {
  id: number
  email: string
  first_name?: string
  last_name?: string
  role?: string
  timezone?: string
}

// Calendar preferences
export interface CalendarPreferences {
  defaultView: CalendarView
  startHour: number
  endHour: number
  slotDuration: number
  showWeekends: boolean
  timezone: string
  dateFormat: string
  timeFormat: '12h' | '24h'
  theme: 'light' | 'dark' | 'auto'
}

// Enhanced UX interaction types for unified calendar experience
export interface CalendarInteraction {
  type: 'select' | 'create' | 'edit' | 'move' | 'delete'
  target: 'date' | 'appointment' | 'time-slot'
  data?: any
  event?: React.MouseEvent | React.KeyboardEvent | React.TouchEvent
}

// Visual states for improved UX
export interface VisualState {
  hoveredDate: Date | null
  hoveredAppointment: Appointment | null
  selectedAppointments: Set<number>
  highlightedTimeSlots: Date[]
  isSelectionMode: boolean
  dragOverTarget: {
    type: 'date' | 'time-slot'
    date: Date
    timeSlot?: { hour: number; minute: number }
  } | null
}

// Enhanced event handlers for unified interaction
export interface CalendarEventHandlers {
  // Unified click handlers - standardized across all views
  onDateClick: (date: Date, event: React.MouseEvent) => void
  onDateDoubleClick: (date: Date, event: React.MouseEvent) => void
  onAppointmentClick: (appointment: Appointment, event: React.MouseEvent) => void
  onAppointmentDoubleClick: (appointment: Appointment, event: React.MouseEvent) => void
  
  // Keyboard navigation for accessibility
  onKeyDown: (event: React.KeyboardEvent) => void
  
  // Hover states for better visual feedback
  onMouseEnter: (target: Date | Appointment, event: React.MouseEvent) => void
  onMouseLeave: (target: Date | Appointment, event: React.MouseEvent) => void
  
  // Touch gestures for mobile optimization
  onTouchStart: (event: React.TouchEvent) => void
  onTouchMove: (event: React.TouchEvent) => void
  onTouchEnd: (event: React.TouchEvent) => void
  
  // Enhanced drag and drop with visual feedback
  onDragStart: (appointment: Appointment, event: React.DragEvent) => void
  onDragEnter: (target: Date, event: React.DragEvent) => void
  onDragOver: (target: Date, event: React.DragEvent) => void
  onDragLeave: (target: Date, event: React.DragEvent) => void
  onDrop: (appointment: Appointment, target: Date, event: React.DragEvent) => void
  onDragEnd: (event: React.DragEvent) => void
}

// Enhanced accessibility state
export interface AccessibilityState {
  announcements: string[]
  focusedDate: Date | null
  keyboardNavigation: boolean
  highContrast: boolean
  screenReaderMode: boolean
  focusedAppointment: Appointment | null
  ariaLiveRegion: string
}

// Performance monitoring interface
export interface CalendarPerformanceMetrics {
  renderTime: number
  appointmentCount: number
  memoryUsage?: number
  lastRenderTimestamp: number
  cacheHitRate: number
  componentName: string
  interactionLatency: number
  dragPerformance?: {
    startTime: number
    moveCount: number
    averageFrameTime: number
  }
}


// Action types for state management
export type CalendarAction = 
  | { type: 'SET_APPOINTMENTS'; payload: Appointment[] }
  | { type: 'ADD_APPOINTMENT'; payload: Appointment }
  | { type: 'UPDATE_APPOINTMENT'; payload: { id: number; updates: Partial<Appointment> } }
  | { type: 'DELETE_APPOINTMENT'; payload: number }
  | { type: 'SET_VIEW'; payload: CalendarView }
  | { type: 'SET_SELECTED_DATE'; payload: Date | null }
  | { type: 'SET_CURRENT_DATE'; payload: Date }
  | { type: 'SET_SELECTED_BARBER'; payload: number | 'all' }
  | { type: 'SET_VISUAL_STATE'; payload: Partial<VisualState> }
  | { type: 'SET_DRAG_STATE'; payload: Partial<DragState> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: CalendarError | null }
  | { type: 'TOGGLE_MODAL'; payload: { modal: string; open: boolean } }
  | { type: 'SET_ACCESSIBILITY_STATE'; payload: Partial<AccessibilityState> }

// Constants for consistent UX behavior
export const CALENDAR_CONSTANTS = {
  // Timing
  DRAG_THRESHOLD: 10, // pixels
  LONG_PRESS_DELAY: 500, // milliseconds  
  DOUBLE_CLICK_DELAY: 300, // milliseconds
  HOVER_DELAY: 150, // milliseconds
  
  // Sizing (accessibility compliant)
  MIN_TOUCH_TARGET: 44, // pixels (WCAG AAA)
  TIME_SLOT_HEIGHT: 40, // pixels
  APPOINTMENT_MIN_HEIGHT: 24, // pixels
  
  // Colors (consistent with status types)
  STATUS_COLORS: {
    pending: 'bg-yellow-500 border-yellow-600 text-white',
    confirmed: 'bg-green-500 border-green-600 text-white', 
    scheduled: 'bg-green-500 border-green-600 text-white',
    completed: 'bg-blue-500 border-blue-600 text-white',
    cancelled: 'bg-red-500 border-red-600 text-white',
    no_show: 'bg-gray-500 border-gray-600 text-white'
  },
  
  // Animation durations for smooth UX
  ANIMATION_DURATION: {
    fast: 150,
    normal: 300,
    slow: 500
  },
  
  // Z-index layers for proper stacking
  Z_INDEX: {
    BASE: 1,
    HOVER: 10,
    DRAG_GHOST: 50,
    MODAL: 1000,
    TOOLTIP: 1050
  }
} as const

// Component display names for debugging
export const CALENDAR_COMPONENT_NAMES = {
  CALENDAR_PAGE: 'CalendarPage',
  MONTH_VIEW: 'CalendarMonthView', 
  WEEK_VIEW: 'CalendarWeekView',
  DAY_VIEW: 'CalendarDayView',
  APPOINTMENT_MODAL: 'CreateAppointmentModal',
  TIME_PICKER: 'TimePickerModal',
  CONFLICT_RESOLVER: 'ConflictResolutionModal'
} as const

// Hook return types for calendar functionality
export interface UseCalendarReturn {
  state: CalendarState & {
    visualState: VisualState
    accessibilityState: AccessibilityState  
    dragState: DragState
  }
  handlers: CalendarEventHandlers
  utils: {
    getAppointmentsForDate: (date: Date) => Appointment[]
    getAppointmentsForTimeSlot: (date: Date, hour: number, minute: number) => Appointment[]
    isDateAvailable: (date: Date) => boolean
    formatAppointmentTime: (appointment: Appointment) => string
    getStatusColor: (status: AppointmentStatus) => string
    validateAppointmentTime: (startTime: Date, duration: number) => ValidationResult
    announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void
  }
}