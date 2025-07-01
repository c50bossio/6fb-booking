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
export interface CalendarError extends Error {
  code?: string
  context?: Record<string, any>
  recoverable?: boolean
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