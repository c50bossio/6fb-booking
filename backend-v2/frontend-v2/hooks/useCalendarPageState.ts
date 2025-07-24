import { useReducer, useCallback } from 'react'
import { CalendarView } from '@/types/calendar'
import type { BookingResponse, User, Location } from '@/lib/api'

// Consolidated state interface for calendar page
interface CalendarPageState {
  // Date & View State
  selectedDate: Date | null
  viewMode: CalendarView
  pendingDate: Date | null
  
  // Data State
  filteredBookings: BookingResponse[]
  user: User | null
  barbers: User[]
  filteredBarbers: User[]
  locations: Location[]
  
  // Filter State
  selectedBarberId: number | 'all'
  selectedLocationId: string | null
  
  // Loading State
  cancelingId: number | null
  isLoadingLocations: boolean
  locationLoadingError: string | null
  
  // Modal State
  modals: {
    showCreateModal: boolean
    showTimePickerModal: boolean
    showSyncPanel: boolean
    showConflictResolver: boolean
    showRescheduleModal: boolean
    showHeatmap: boolean
    showAnalytics: boolean
    revenueCollapsed: boolean
  }
  
  // Temporary State
  preselectedTime: string | undefined
  rescheduleModalData: { appointmentId: number; newStartTime: string } | null
  todayRevenue: number
  todayAppointmentCount: number
}

// Action types for state updates
type CalendarPageAction =
  // Date & View Actions
  | { type: 'SET_SELECTED_DATE'; payload: Date | null }
  | { type: 'SET_VIEW_MODE'; payload: CalendarView }
  | { type: 'SET_PENDING_DATE'; payload: Date | null }
  
  // Data Actions
  | { type: 'SET_FILTERED_BOOKINGS'; payload: BookingResponse[] }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_BARBERS'; payload: User[] }
  | { type: 'SET_FILTERED_BARBERS'; payload: User[] }
  | { type: 'SET_LOCATIONS'; payload: Location[] }
  
  // Filter Actions
  | { type: 'SET_SELECTED_BARBER_ID'; payload: number | 'all' }
  | { type: 'SET_SELECTED_LOCATION_ID'; payload: string | null }
  
  // Loading Actions
  | { type: 'SET_CANCELING_ID'; payload: number | null }
  | { type: 'SET_IS_LOADING_LOCATIONS'; payload: boolean }
  | { type: 'SET_LOCATION_LOADING_ERROR'; payload: string | null }
  
  // Modal Actions
  | { type: 'TOGGLE_MODAL'; payload: { modal: keyof CalendarPageState['modals']; value?: boolean } }
  | { type: 'CLOSE_ALL_MODALS' }
  
  // Temporary Actions
  | { type: 'SET_PRESELECTED_TIME'; payload: string | undefined }
  | { type: 'SET_RESCHEDULE_MODAL_DATA'; payload: { appointmentId: number; newStartTime: string } | null }
  | { type: 'SET_TODAY_REVENUE'; payload: number }
  | { type: 'SET_TODAY_APPOINTMENT_COUNT'; payload: number }
  
  // Batch Actions for Performance
  | { type: 'BATCH_UPDATE'; payload: Partial<CalendarPageState> }
  | { type: 'RESET_STATE' }

// Initial state
const initialState: CalendarPageState = {
  // Date & View State
  selectedDate: new Date(),
  viewMode: 'week',
  pendingDate: null,
  
  // Data State
  filteredBookings: [],
  user: null,
  barbers: [],
  filteredBarbers: [],
  locations: [],
  
  // Filter State
  selectedBarberId: 'all',
  selectedLocationId: null,
  
  // Loading State
  cancelingId: null,
  isLoadingLocations: false,
  locationLoadingError: null,
  
  // Modal State
  modals: {
    showCreateModal: false,
    showTimePickerModal: false,
    showSyncPanel: false,
    showConflictResolver: false,
    showRescheduleModal: false,
    showHeatmap: false,
    showAnalytics: false,
    revenueCollapsed: false,
  },
  
  // Temporary State
  preselectedTime: undefined,
  rescheduleModalData: null,
  todayRevenue: 0,
  todayAppointmentCount: 0,
}

// Reducer function with optimized updates
function calendarPageReducer(state: CalendarPageState, action: CalendarPageAction): CalendarPageState {
  switch (action.type) {
    // Date & View Actions
    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload }
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload }
    case 'SET_PENDING_DATE':
      return { ...state, pendingDate: action.payload }
      
    // Data Actions
    case 'SET_FILTERED_BOOKINGS':
      return { ...state, filteredBookings: action.payload }
    case 'SET_USER':
      return { ...state, user: action.payload }
    case 'SET_BARBERS':
      return { ...state, barbers: action.payload }
    case 'SET_FILTERED_BARBERS':
      return { ...state, filteredBarbers: action.payload }
    case 'SET_LOCATIONS':
      return { ...state, locations: action.payload }
      
    // Filter Actions
    case 'SET_SELECTED_BARBER_ID':
      return { ...state, selectedBarberId: action.payload }
    case 'SET_SELECTED_LOCATION_ID':
      return { ...state, selectedLocationId: action.payload }
      
    // Loading Actions
    case 'SET_CANCELING_ID':
      return { ...state, cancelingId: action.payload }
    case 'SET_IS_LOADING_LOCATIONS':
      return { ...state, isLoadingLocations: action.payload }
    case 'SET_LOCATION_LOADING_ERROR':
      return { ...state, locationLoadingError: action.payload }
      
    // Modal Actions
    case 'TOGGLE_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload.modal]: action.payload.value ?? !state.modals[action.payload.modal]
        }
      }
    case 'CLOSE_ALL_MODALS':
      return {
        ...state,
        modals: {
          showCreateModal: false,
          showTimePickerModal: false,
          showSyncPanel: false,
          showConflictResolver: false,
          showRescheduleModal: false,
          showHeatmap: false,
          showAnalytics: false,
          revenueCollapsed: false,
        },
        // Also clear temporary modal data
        preselectedTime: undefined,
        rescheduleModalData: null,
        pendingDate: null,
      }
      
    // Temporary Actions
    case 'SET_PRESELECTED_TIME':
      return { ...state, preselectedTime: action.payload }
    case 'SET_RESCHEDULE_MODAL_DATA':
      return { ...state, rescheduleModalData: action.payload }
    case 'SET_TODAY_REVENUE':
      return { ...state, todayRevenue: action.payload }
    case 'SET_TODAY_APPOINTMENT_COUNT':
      return { ...state, todayAppointmentCount: action.payload }
      
    // Batch Actions for Performance
    case 'BATCH_UPDATE':
      return { ...state, ...action.payload }
    case 'RESET_STATE':
      return initialState
      
    default:
      return state
  }
}

// Custom hook for calendar page state management
export function useCalendarPageState() {
  const [state, dispatch] = useReducer(calendarPageReducer, initialState)

  // Optimized action creators with useCallback to prevent unnecessary re-renders
  const actions = {
    // Date & View Actions
    setSelectedDate: useCallback((date: Date | null) => {
      dispatch({ type: 'SET_SELECTED_DATE', payload: date })
    }, []),
    
    setViewMode: useCallback((mode: CalendarView) => {
      dispatch({ type: 'SET_VIEW_MODE', payload: mode })
    }, []),
    
    setPendingDate: useCallback((date: Date | null) => {
      dispatch({ type: 'SET_PENDING_DATE', payload: date })
    }, []),
    
    // Data Actions
    setFilteredBookings: useCallback((bookings: BookingResponse[]) => {
      dispatch({ type: 'SET_FILTERED_BOOKINGS', payload: bookings })
    }, []),
    
    setUser: useCallback((user: User | null) => {
      dispatch({ type: 'SET_USER', payload: user })
    }, []),
    
    setBarbers: useCallback((barbers: User[]) => {
      dispatch({ type: 'SET_BARBERS', payload: barbers })
    }, []),
    
    setFilteredBarbers: useCallback((barbers: User[]) => {
      dispatch({ type: 'SET_FILTERED_BARBERS', payload: barbers })
    }, []),
    
    setLocations: useCallback((locations: Location[]) => {
      dispatch({ type: 'SET_LOCATIONS', payload: locations })
    }, []),
    
    // Filter Actions
    setSelectedBarberId: useCallback((id: number | 'all') => {
      dispatch({ type: 'SET_SELECTED_BARBER_ID', payload: id })
    }, []),
    
    setSelectedLocationId: useCallback((id: string | null) => {
      dispatch({ type: 'SET_SELECTED_LOCATION_ID', payload: id })
    }, []),
    
    // Loading Actions
    setCancelingId: useCallback((id: number | null) => {
      dispatch({ type: 'SET_CANCELING_ID', payload: id })
    }, []),
    
    setIsLoadingLocations: useCallback((loading: boolean) => {
      dispatch({ type: 'SET_IS_LOADING_LOCATIONS', payload: loading })
    }, []),
    
    setLocationLoadingError: useCallback((error: string | null) => {
      dispatch({ type: 'SET_LOCATION_LOADING_ERROR', payload: error })
    }, []),
    
    // Modal Actions
    toggleModal: useCallback((modal: keyof CalendarPageState['modals'], value?: boolean) => {
      dispatch({ type: 'TOGGLE_MODAL', payload: { modal, value } })
    }, []),
    
    closeAllModals: useCallback(() => {
      dispatch({ type: 'CLOSE_ALL_MODALS' })
    }, []),
    
    // Temporary Actions
    setPreselectedTime: useCallback((time: string | undefined) => {
      dispatch({ type: 'SET_PRESELECTED_TIME', payload: time })
    }, []),
    
    setRescheduleModalData: useCallback((data: { appointmentId: number; newStartTime: string } | null) => {
      dispatch({ type: 'SET_RESCHEDULE_MODAL_DATA', payload: data })
    }, []),
    
    setTodayRevenue: useCallback((revenue: number) => {
      dispatch({ type: 'SET_TODAY_REVENUE', payload: revenue })
    }, []),
    
    setTodayAppointmentCount: useCallback((count: number) => {
      dispatch({ type: 'SET_TODAY_APPOINTMENT_COUNT', payload: count })
    }, []),
    
    // Batch Actions for Performance
    batchUpdate: useCallback((updates: Partial<CalendarPageState>) => {
      dispatch({ type: 'BATCH_UPDATE', payload: updates })
    }, []),
    
    resetState: useCallback(() => {
      dispatch({ type: 'RESET_STATE' })
    }, []),
    
    // Convenience functions for common operations
    openCreateModal: useCallback((selectedDate?: Date, preselectedTime?: string) => {
      dispatch({ type: 'BATCH_UPDATE', payload: {
        selectedDate: selectedDate || state.selectedDate,
        preselectedTime,
        modals: { ...state.modals, showCreateModal: true }
      }})
    }, [state.selectedDate, state.modals]),
    
    openTimePickerModal: useCallback((pendingDate: Date) => {
      dispatch({ type: 'BATCH_UPDATE', payload: {
        pendingDate,
        modals: { ...state.modals, showTimePickerModal: true }
      }})
    }, [state.modals]),
    
    openRescheduleModal: useCallback((appointmentId: number, newStartTime: string) => {
      dispatch({ type: 'BATCH_UPDATE', payload: {
        rescheduleModalData: { appointmentId, newStartTime },
        modals: { ...state.modals, showRescheduleModal: true }
      }})
    }, [state.modals]),
  }

  return {
    state,
    actions,
    // Exposed for backwards compatibility and specific use cases
    dispatch,
  }
}

// Export types for use in other components
export type { CalendarPageState, CalendarPageAction }