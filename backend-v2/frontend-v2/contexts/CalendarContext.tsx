'use client'

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, format } from 'date-fns'
import type { BookingResponse } from '@/lib/api'

// Types
export type CalendarView = 'day' | 'week' | 'month'
export type ConflictSeverity = 'high' | 'medium' | 'low'
export type ConflictType = 'overlap' | 'double-booking' | 'buffer-violation' | 'business-hours'

export interface CalendarAppointment extends BookingResponse {
  // Calendar-specific computed fields
  height?: number
  topPosition?: number
  conflicts?: string[]
  revenueImpact?: number
  clientTier?: 'new' | 'regular' | 'vip' | 'platinum'
}

export interface CalendarBarber {
  id: number
  name?: string
  first_name?: string
  last_name?: string
  email: string
  avatar?: string
  specialties?: string[]
  role?: string
  availability?: { [key: string]: boolean }
  revenueTarget?: number
  currentRevenue?: number
}

export interface CalendarConflict {
  id: string
  type: ConflictType
  severity: ConflictSeverity
  description: string
  affectedAppointments: string[]
  suggestedResolutions: ConflictResolution[]
  autoResolvable: boolean
}

export interface ConflictResolution {
  id: string
  type: 'reschedule' | 'extend-duration' | 'add-buffer' | 'change-barber'
  description: string
  impact: string
  confidence: number
  newStartTime?: string
  newEndTime?: string
  alternativeBarber?: number
  cost: number
}

export interface CalendarFilters {
  barberIds: number[]
  serviceTypes: string[]
  statusFilter: string[]
  dateRange: {
    start: Date
    end: Date
  }
  revenueThreshold?: number
  clientTiers: string[]
}

export interface CalendarSettings {
  view: CalendarView
  startHour: number
  endHour: number
  slotDuration: number
  workingDays: number[]
  timezone: string
  showRevenue: boolean
  showConflicts: boolean
  enableAutoResolution: boolean
  mobileOptimized: boolean
}

export interface RevenueMetrics {
  dailyTarget: number
  currentDaily: number
  weeklyTarget: number
  currentWeekly: number
  monthlyTarget: number
  currentMonthly: number
  upsellOpportunities: UpsellOpportunity[]
}

export interface UpsellOpportunity {
  appointmentId: number
  clientName: string
  currentService: string
  suggestedService: string
  revenueIncrease: number
  probability: number
  reasoning: string
}

export interface CalendarState {
  // Core state
  currentDate: Date
  selectedDate: Date | null
  view: CalendarView
  
  // Data
  appointments: CalendarAppointment[]
  barbers: CalendarBarber[]
  conflicts: CalendarConflict[]
  
  // UI state
  loading: boolean
  error: string | null
  selectedAppointmentId: number | null
  selectedBarberId: number | null
  
  // Filters and settings
  filters: CalendarFilters
  settings: CalendarSettings
  
  // Business intelligence
  revenueMetrics: RevenueMetrics
  
  // Interaction state
  draggedAppointment: CalendarAppointment | null
  dragTarget: { date: Date; hour: number; barberId: number } | null
  
  // Undo/Redo
  history: CalendarState[]
  historyIndex: number
  maxHistorySize: number
  
  // Real-time
  currentTime: Date
  lastSync: Date | null
}

// Actions
export type CalendarAction =
  | { type: 'SET_DATE'; payload: Date }
  | { type: 'SET_VIEW'; payload: CalendarView }
  | { type: 'SET_APPOINTMENTS'; payload: CalendarAppointment[] }
  | { type: 'ADD_APPOINTMENT'; payload: CalendarAppointment }
  | { type: 'UPDATE_APPOINTMENT'; payload: { id: number; updates: Partial<CalendarAppointment> } }
  | { type: 'DELETE_APPOINTMENT'; payload: number }
  | { type: 'SET_BARBERS'; payload: CalendarBarber[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SELECTED_APPOINTMENT'; payload: number | null }
  | { type: 'SET_SELECTED_BARBER'; payload: number | null }
  | { type: 'SET_FILTERS'; payload: Partial<CalendarFilters> }
  | { type: 'SET_SETTINGS'; payload: Partial<CalendarSettings> }
  | { type: 'SET_CONFLICTS'; payload: CalendarConflict[] }
  | { type: 'RESOLVE_CONFLICT'; payload: { conflictId: string; resolution: ConflictResolution } }
  | { type: 'SET_REVENUE_METRICS'; payload: RevenueMetrics }
  | { type: 'START_DRAG'; payload: CalendarAppointment }
  | { type: 'SET_DRAG_TARGET'; payload: { date: Date; hour: number; barberId: number } | null }
  | { type: 'END_DRAG' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SAVE_STATE' }
  | { type: 'UPDATE_CURRENT_TIME' }
  | { type: 'SET_LAST_SYNC'; payload: Date }

// Initial state
const initialState: CalendarState = {
  currentDate: new Date(),
  selectedDate: null,
  view: 'week',
  appointments: [],
  barbers: [],
  conflicts: [],
  loading: false,
  error: null,
  selectedAppointmentId: null,
  selectedBarberId: null,
  filters: {
    barberIds: [],
    serviceTypes: [],
    statusFilter: ['confirmed', 'pending'],
    dateRange: {
      start: startOfWeek(new Date()),
      end: endOfWeek(new Date())
    },
    clientTiers: []
  },
  settings: {
    view: 'week',
    startHour: 8,
    endHour: 19,
    slotDuration: 60,
    workingDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday
    timezone: 'America/New_York',
    showRevenue: true,
    showConflicts: true,
    enableAutoResolution: false,
    mobileOptimized: true
  },
  revenueMetrics: {
    dailyTarget: 800,
    currentDaily: 0,
    weeklyTarget: 4800,
    currentWeekly: 0,
    monthlyTarget: 20000,
    currentMonthly: 0,
    upsellOpportunities: []
  },
  draggedAppointment: null,
  dragTarget: null,
  history: [],
  historyIndex: -1,
  maxHistorySize: 20,
  currentTime: new Date(),
  lastSync: null
}

// Reducer
function calendarReducer(state: CalendarState, action: CalendarAction): CalendarState {
  switch (action.type) {
    case 'SET_DATE':
      return {
        ...state,
        currentDate: action.payload,
        selectedDate: action.payload
      }
    
    case 'SET_VIEW':
      return {
        ...state,
        view: action.payload,
        settings: {
          ...state.settings,
          view: action.payload
        }
      }
    
    case 'SET_APPOINTMENTS':
      return {
        ...state,
        appointments: action.payload,
        loading: false,
        error: null
      }
    
    case 'ADD_APPOINTMENT':
      return {
        ...state,
        appointments: [...state.appointments, action.payload]
      }
    
    case 'UPDATE_APPOINTMENT':
      return {
        ...state,
        appointments: state.appointments.map(apt =>
          apt.id === action.payload.id
            ? { ...apt, ...action.payload.updates }
            : apt
        )
      }
    
    case 'DELETE_APPOINTMENT':
      return {
        ...state,
        appointments: state.appointments.filter(apt => apt.id !== action.payload)
      }
    
    case 'SET_BARBERS':
      return {
        ...state,
        barbers: action.payload
      }
    
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      }
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false
      }
    
    case 'SET_SELECTED_APPOINTMENT':
      return {
        ...state,
        selectedAppointmentId: action.payload
      }
    
    case 'SET_SELECTED_BARBER':
      return {
        ...state,
        selectedBarberId: action.payload
      }
    
    case 'SET_FILTERS':
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload
        }
      }
    
    case 'SET_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload
        }
      }
    
    case 'SET_CONFLICTS':
      return {
        ...state,
        conflicts: action.payload
      }
    
    case 'RESOLVE_CONFLICT':
      return {
        ...state,
        conflicts: state.conflicts.filter(conflict => conflict.id !== action.payload.conflictId)
      }
    
    case 'SET_REVENUE_METRICS':
      return {
        ...state,
        revenueMetrics: action.payload
      }
    
    case 'START_DRAG':
      return {
        ...state,
        draggedAppointment: action.payload
      }
    
    case 'SET_DRAG_TARGET':
      return {
        ...state,
        dragTarget: action.payload
      }
    
    case 'END_DRAG':
      return {
        ...state,
        draggedAppointment: null,
        dragTarget: null
      }
    
    case 'SAVE_STATE':
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push({ ...state })
      
      return {
        ...state,
        history: newHistory.slice(-state.maxHistorySize),
        historyIndex: Math.min(newHistory.length - 1, state.maxHistorySize - 1)
      }
    
    case 'UNDO':
      if (state.historyIndex > 0) {
        const previousState = state.history[state.historyIndex - 1]
        return {
          ...previousState,
          history: state.history,
          historyIndex: state.historyIndex - 1
        }
      }
      return state
    
    case 'REDO':
      if (state.historyIndex < state.history.length - 1) {
        const nextState = state.history[state.historyIndex + 1]
        return {
          ...nextState,
          history: state.history,
          historyIndex: state.historyIndex + 1
        }
      }
      return state
    
    case 'UPDATE_CURRENT_TIME':
      return {
        ...state,
        currentTime: new Date()
      }
    
    case 'SET_LAST_SYNC':
      return {
        ...state,
        lastSync: action.payload
      }
    
    default:
      return state
  }
}

// Context
const CalendarContext = createContext<{
  state: CalendarState
  dispatch: React.Dispatch<CalendarAction>
  actions: CalendarActions
} | null>(null)

// Actions interface for easier use
export interface CalendarActions {
  setDate: (date: Date) => void
  setView: (view: CalendarView) => void
  setAppointments: (appointments: CalendarAppointment[]) => void
  addAppointment: (appointment: CalendarAppointment) => void
  updateAppointment: (id: number, updates: Partial<CalendarAppointment>) => void
  deleteAppointment: (id: number) => void
  setBarbers: (barbers: CalendarBarber[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSelectedAppointment: (id: number | null) => void
  setSelectedBarber: (id: number | null) => void
  setFilters: (filters: Partial<CalendarFilters>) => void
  setSettings: (settings: Partial<CalendarSettings>) => void
  setConflicts: (conflicts: CalendarConflict[]) => void
  resolveConflict: (conflictId: string, resolution: ConflictResolution) => void
  setRevenueMetrics: (metrics: RevenueMetrics) => void
  startDrag: (appointment: CalendarAppointment) => void
  setDragTarget: (target: { date: Date; hour: number; barberId: number } | null) => void
  endDrag: () => void
  undo: () => void
  redo: () => void
  saveState: () => void
  updateCurrentTime: () => void
  setLastSync: (date: Date) => void
}

// Provider component
export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(calendarReducer, initialState)
  
  // Actions object for easier use
  const actions: CalendarActions = {
    setDate: (date: Date) => dispatch({ type: 'SET_DATE', payload: date }),
    setView: (view: CalendarView) => dispatch({ type: 'SET_VIEW', payload: view }),
    setAppointments: (appointments: CalendarAppointment[]) => dispatch({ type: 'SET_APPOINTMENTS', payload: appointments }),
    addAppointment: (appointment: CalendarAppointment) => dispatch({ type: 'ADD_APPOINTMENT', payload: appointment }),
    updateAppointment: (id: number, updates: Partial<CalendarAppointment>) => dispatch({ type: 'UPDATE_APPOINTMENT', payload: { id, updates } }),
    deleteAppointment: (id: number) => dispatch({ type: 'DELETE_APPOINTMENT', payload: id }),
    setBarbers: (barbers: CalendarBarber[]) => dispatch({ type: 'SET_BARBERS', payload: barbers }),
    setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setError: (error: string | null) => dispatch({ type: 'SET_ERROR', payload: error }),
    setSelectedAppointment: (id: number | null) => dispatch({ type: 'SET_SELECTED_APPOINTMENT', payload: id }),
    setSelectedBarber: (id: number | null) => dispatch({ type: 'SET_SELECTED_BARBER', payload: id }),
    setFilters: (filters: Partial<CalendarFilters>) => dispatch({ type: 'SET_FILTERS', payload: filters }),
    setSettings: (settings: Partial<CalendarSettings>) => dispatch({ type: 'SET_SETTINGS', payload: settings }),
    setConflicts: (conflicts: CalendarConflict[]) => dispatch({ type: 'SET_CONFLICTS', payload: conflicts }),
    resolveConflict: (conflictId: string, resolution: ConflictResolution) => dispatch({ type: 'RESOLVE_CONFLICT', payload: { conflictId, resolution } }),
    setRevenueMetrics: (metrics: RevenueMetrics) => dispatch({ type: 'SET_REVENUE_METRICS', payload: metrics }),
    startDrag: (appointment: CalendarAppointment) => dispatch({ type: 'START_DRAG', payload: appointment }),
    setDragTarget: (target: { date: Date; hour: number; barberId: number } | null) => dispatch({ type: 'SET_DRAG_TARGET', payload: target }),
    endDrag: () => dispatch({ type: 'END_DRAG' }),
    undo: () => dispatch({ type: 'UNDO' }),
    redo: () => dispatch({ type: 'REDO' }),
    saveState: () => dispatch({ type: 'SAVE_STATE' }),
    updateCurrentTime: () => dispatch({ type: 'UPDATE_CURRENT_TIME' }),
    setLastSync: (date: Date) => dispatch({ type: 'SET_LAST_SYNC', payload: date })
  }
  
  // Real-time clock update
  useEffect(() => {
    const interval = setInterval(() => {
      actions.updateCurrentTime()
    }, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <CalendarContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </CalendarContext.Provider>
  )
}

// Hook to use calendar context
export function useCalendar() {
  const context = useContext(CalendarContext)
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider')
  }
  return context
}

// Computed selectors
export function useCalendarSelectors() {
  const { state } = useCalendar()
  
  return {
    // Filtered appointments based on current filters
    filteredAppointments: state.appointments.filter(appointment => {
      const filters = state.filters
      
      // Barber filter
      if (filters.barberIds.length > 0 && !filters.barberIds.includes(appointment.barber_id)) {
        return false
      }
      
      // Status filter
      if (filters.statusFilter.length > 0 && !filters.statusFilter.includes(appointment.status)) {
        return false
      }
      
      // Date range filter
      const appointmentDate = new Date(appointment.start_time)
      if (appointmentDate < filters.dateRange.start || appointmentDate > filters.dateRange.end) {
        return false
      }
      
      return true
    }),
    
    // Appointments for current view
    viewAppointments: state.appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.start_time)
      const currentDate = state.currentDate
      
      switch (state.view) {
        case 'day':
          return isSameDay(appointmentDate, currentDate)
        case 'week':
          const weekStart = startOfWeek(currentDate)
          const weekEnd = endOfWeek(currentDate)
          return appointmentDate >= weekStart && appointmentDate <= weekEnd
        case 'month':
          const monthStart = startOfMonth(currentDate)
          const monthEnd = endOfMonth(currentDate)
          return appointmentDate >= monthStart && appointmentDate <= monthEnd
        default:
          return true
      }
    }),
    
    // High-priority conflicts
    criticalConflicts: state.conflicts.filter(conflict => conflict.severity === 'high'),
    
    // Today's revenue
    todayRevenue: state.appointments
      .filter(apt => isSameDay(new Date(apt.start_time), new Date()))
      .reduce((total, apt) => total + (apt.total_price || 0), 0),
    
    // Can undo/redo
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex < state.history.length - 1,
    
    // Selected appointment
    selectedAppointment: state.appointments.find(apt => apt.id === state.selectedAppointmentId),
    
    // Selected barber
    selectedBarber: state.barbers.find(barber => barber.id === state.selectedBarberId)
  }
}