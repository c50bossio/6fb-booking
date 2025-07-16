'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'

// Simple debounce implementation to avoid lodash dependency
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
import { format, startOfWeek, endOfWeek, addDays, isSameDay, startOfDay, addHours, addMinutes, startOfMonth, endOfMonth, subDays } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { Button } from './ui/Button'
import { parseAPIDate, isToday as checkIsToday } from '@/lib/timezone'
import Image from 'next/image'
import ClientDetailModal from './modals/ClientDetailModal'
import { touchDragManager, TouchDragManager } from '@/lib/touch-utils'
import { TouchDragManager as NewTouchDragManager, useTouchGestures, TouchPoint } from './calendar/TouchDragManager'
import { MobileCalendarControls, useMobileCalendarNavigation, CalendarView } from './calendar/MobileCalendarControls'
import { conflictManager, ConflictAnalysis, ConflictResolution } from '@/lib/appointment-conflicts'
import ConflictResolutionModal from './modals/ConflictResolutionModal'
import { useCalendarPerformance } from '@/hooks/useCalendarPerformance'
import { useCalendarAccessibility } from '@/hooks/useCalendarAccessibility'
import { useResponsive } from '@/hooks/useResponsive'
import { getServiceConfig, getBarberSymbol, type ServiceType } from '@/lib/calendar-constants'
import { toastError, toastSuccess, toastInfo, toastWarning } from '@/hooks/use-toast'
import '@/styles/calendar-animations.css'

// Use standardized booking response interface
import type { BookingResponse } from '@/lib/api'

interface Appointment extends BookingResponse {
  height?: number // Calendar-specific computed field
}

interface Barber {
  id: number
  name?: string
  first_name?: string
  last_name?: string
  email: string
  avatar?: string
  role?: string
}

interface Client {
  id: number
  name?: string
  first_name?: string
  last_name?: string
  email: string
  phone?: string
  avatar?: string
  notes?: string
}

export type CalendarView = 'day' | 'week' | 'month'

interface UnifiedCalendarProps {
  // Core props
  view: CalendarView
  onViewChange?: (view: CalendarView) => void
  currentDate?: Date
  onDateChange?: (date: Date) => void
  
  // Data props
  appointments: Appointment[]
  barbers?: Barber[]
  clients?: Client[]
  
  // Filter props
  selectedBarberId?: number | 'all'
  onBarberSelect?: (barberId: number | 'all') => void
  
  // Event handlers
  onAppointmentClick?: (appointment: Appointment) => void
  onClientClick?: (client: Client) => void
  onTimeSlotClick?: (date: Date, barberId?: number) => void
  onAppointmentUpdate?: (appointmentId: number, newStartTime: string, isDragDrop?: boolean) => void
  onDayClick?: (date: Date) => void
  onDayDoubleClick?: (date: Date) => void
  
  // Configuration props
  startHour?: number
  endHour?: number
  slotDuration?: number
  isLoading?: boolean
  onRefresh?: () => void
  onPreloadDate?: (date: Date) => void
  
  // Style props
  className?: string
}

// Unified state interface
interface UnifiedCalendarState {
  // Date management
  currentDate: Date
  selectedDate: Date | null
  
  // UI state
  hoveredDay: number | null
  hoveredAppointment: Appointment | null
  tooltipPosition: { x: number; y: number }
  
  // Drag & drop state
  draggedAppointment: Appointment | null
  dragOverSlot: { day: Date; hour: number; minute: number } | null
  dragOverDay: number | null
  isDragging: boolean
  dropSuccess: { day: Date; hour: number; minute: number } | null
  
  // Modal state
  selectedClient: Client | null
  showClientModal: boolean
  showConflictModal: boolean
  
  // Conflict management
  conflictAnalysis: ConflictAnalysis | null
  pendingUpdate: { appointmentId: number; newStartTime: string } | null
  
  // Optimistic updates
  optimisticUpdates: Map<number, { originalStartTime: string; newStartTime: string }>
  isUpdating: number | null // Track which appointment is being updated
  
  // Enhanced drag visual feedback
  dragPreview: { appointment: Appointment; position: { x: number; y: number } } | null
  invalidDropZones: Set<string> // Set of slot keys that are invalid drop targets
  validDropZones: Set<string> // Set of slot keys that are valid drop targets
  
  // Magnetic snap state
  magneticField: { day: Date; hour: number; minute: number } | null
  nearMagneticField: boolean
  magneticDistance: number
}

// Drag & Drop handlers interface
interface DragHandlers {
  handleDragOver: (e: React.DragEvent, day: Date, hour: number, minute: number) => void
  handleDragLeave: () => void
  handleDragStart: (e: React.DragEvent, appointment: Appointment) => void
  handleDragEnd: () => void
  handleDrop: (e: React.DragEvent, day: Date, hour: number, minute: number) => void
}

const UnifiedCalendar = React.memo(function UnifiedCalendar({
  view,
  onViewChange,
  currentDate = new Date(),
  onDateChange,
  appointments = [],
  barbers = [],
  clients = [],
  selectedBarberId = 'all',
  onBarberSelect,
  onAppointmentClick,
  onClientClick,
  onTimeSlotClick,
  onAppointmentUpdate,
  onDayClick,
  onDayDoubleClick,
  startHour = 8,
  endHour = 19,
  slotDuration = 30,
  isLoading = false,
  onRefresh,
  onPreloadDate,
  className = ""
}: UnifiedCalendarProps) {
  
  // Unified state management
  const [state, setState] = useState<UnifiedCalendarState>(() => ({
    currentDate,
    selectedDate: currentDate,
    hoveredDay: null,
    hoveredAppointment: null,
    tooltipPosition: { x: 0, y: 0 },
    draggedAppointment: null,
    dragOverSlot: null,
    dragOverDay: null,
    isDragging: false,
    dropSuccess: null,
    selectedClient: null,
    showClientModal: false,
    showConflictModal: false,
    conflictAnalysis: null,
    pendingUpdate: null,
    optimisticUpdates: new Map(),
    isUpdating: null,
    dragPreview: null,
    invalidDropZones: new Set(),
    validDropZones: new Set(),
    magneticField: null,
    nearMagneticField: false,
    magneticDistance: 0
  }))
  
  // Unified performance and accessibility hooks
  const { 
    optimizedAppointmentFilter, 
    memoizedDateCalculations,
    optimizedAppointmentsByDay,
    memoizedStatusColor
  } = useCalendarPerformance()
  
  const { 
    announce, 
    keyboardNav, 
    getGridProps, 
    getGridCellProps, 
    isHighContrast 
  } = useCalendarAccessibility()
  
  const { isMobile, isTablet } = useResponsive()
  const isTouchDevice = TouchDragManager.isTouchDevice()
  const scheduleGridRef = useRef<HTMLDivElement>(null)

  // Mobile navigation and touch gesture support
  const {
    currentDate: mobileCurrentDate,
    view: mobileView,
    navigationHandlers
  } = useMobileCalendarNavigation({
    initialDate: state.currentDate,
    initialView: view as CalendarView,
    enableSwipeNavigation: isMobile || isTouchDevice
  })

  // Touch gesture handlers for calendar navigation
  const { gestureHandlers, isGestureActive } = useTouchGestures({
    onSwipe: useCallback((direction: 'up' | 'down' | 'left' | 'right', velocity: number) => {
      // Only handle horizontal swipes for navigation (vertical for scrolling)
      if (velocity < 0.3) return // Minimum velocity threshold
      
      if (direction === 'left') {
        navigateDate('next')
      } else if (direction === 'right') {
        navigateDate('prev')
      }
    }, []),
    
    onPinch: useCallback((scale: number, isStarting: boolean) => {
      // Pinch to zoom between views (month -> week -> day)
      if (isStarting || scale < 0.7 || scale > 1.3) return
      
      if (scale < 0.8 && view === 'day') {
        onViewChange?.('week')
      } else if (scale < 0.8 && view === 'week') {
        onViewChange?.('month')
      } else if (scale > 1.2 && view === 'month') {
        onViewChange?.('week')
      } else if (scale > 1.2 && view === 'week') {
        onViewChange?.('day')
      }
    }, [view, onViewChange]),
    
    onLongPress: useCallback((point: TouchPoint) => {
      // Long press to create new appointment at touch point
      if (onTimeSlotClick) {
        // Calculate time slot from touch coordinates
        const rect = scheduleGridRef.current?.getBoundingClientRect()
        if (rect) {
          const y = point.y - rect.top
          const hour = Math.floor(y / 40) + startHour
          const minute = Math.floor((y % 40) / 40 * 60 / slotDuration) * slotDuration
          
          if (hour >= startHour && hour < endHour) {
            const slotDate = new Date(state.currentDate)
            slotDate.setHours(hour, minute, 0, 0)
            onTimeSlotClick(slotDate)
          }
        }
      }
    }, [onTimeSlotClick, startHour, endHour, slotDuration, state.currentDate]),
    
    disabled: state.isDragging || isGestureActive
  })

  // Sync mobile navigation with component state
  useEffect(() => {
    if (mobileCurrentDate.getTime() !== state.currentDate.getTime()) {
      setState(prev => ({ ...prev, currentDate: mobileCurrentDate }))
    }
  }, [mobileCurrentDate, state.currentDate])

  useEffect(() => {
    if (mobileView !== view) {
      onViewChange?.(mobileView)
    }
  }, [mobileView, view, onViewChange])
  
  // Enhanced drag & drop with optimistic updates
  const checkAndUpdateAppointment = useCallback(async (appointmentId: number, newStartTime: string) => {
    
    const appointment = appointments.find(apt => apt.id === appointmentId)
    if (!appointment) {
      console.error('[DRAG DEBUG] Appointment not found:', appointmentId)
      return
    }

    // Store original state for rollback
    const originalStartTime = appointment.start_time
    
    // Apply optimistic update immediately for better UX
    setState(prev => ({
      ...prev,
      optimisticUpdates: new Map(prev.optimisticUpdates.set(appointmentId, { originalStartTime, newStartTime })),
      isUpdating: appointmentId // Track which appointment is being updated
    }))

    // Create updated appointment for conflict checking
    const updatedAppointment = {
      ...appointment,
      start_time: newStartTime,
      id: appointmentId
    }

    // Analyze conflicts
    const analysis = conflictManager.analyzeConflicts(
      updatedAppointment,
      appointments,
      {
        bufferTime: 15,
        checkBarberAvailability: true,
        workingHours: { start: startHour, end: endHour },
        allowAdjacent: false
      }
    )

    if (analysis.hasConflicts && analysis.riskScore > 30) {
      // Show warning toast about conflicts
      const conflictTypes = analysis.conflicts.map(c => c.type).join(', ')
      toastWarning('Schedule Conflict', `Potential conflicts detected: ${conflictTypes}. Please review before confirming.`)
      
      // Rollback optimistic update
      setState(prev => {
        const newMap = new Map(prev.optimisticUpdates)
        newMap.delete(appointmentId)
        return {
          ...prev,
          optimisticUpdates: newMap,
          conflictAnalysis: analysis,
          pendingUpdate: { appointmentId, newStartTime },
          showConflictModal: true,
          isUpdating: null // Clear updating state
        }
      })
    } else {
      // No significant conflicts, proceed with update
      if (onAppointmentUpdate) {
        try {
          await onAppointmentUpdate(appointmentId, newStartTime, true)
          
          // Success - clear optimistic update and trigger refresh
          setState(prev => {
            const newMap = new Map(prev.optimisticUpdates)
            newMap.delete(appointmentId)
            return {
              ...prev,
              optimisticUpdates: newMap,
              isUpdating: null // Clear updating state
            }
          })
          
          // Show success toast with new time
          const newDate = new Date(newStartTime)
          const formattedTime = format(newDate, 'MMM d, h:mm a')
          toastSuccess('Appointment Moved', `Successfully moved to ${formattedTime}`)
          
          // Trigger a data refresh to ensure UI shows latest appointment details
          if (onRefresh) {
            setTimeout(() => onRefresh(), 100) // Small delay to ensure backend has processed the update
          }
          
        } catch (updateError: unknown) {
          console.error('[DRAG DEBUG] Update failed:', updateError)
          
          // Parse error for specific user-friendly messages
          let errorMessage = 'Failed to move appointment. Please try again.'
          let errorTitle = 'Update Failed'
          
          if (updateError?.message || updateError?.detail) {
            const errorText = updateError.message || updateError.detail
            
            if (errorText.includes('minimum lead time') || errorText.includes('15 minutes in advance')) {
              errorTitle = 'Too Soon'
              errorMessage = 'Appointments must be scheduled at least 15 minutes in advance.'
            } else if (errorText.includes('past') || errorText.includes('already started')) {
              errorTitle = 'Invalid Time'
              errorMessage = 'Cannot move appointment to a time in the past.'
            } else if (errorText.includes('not available') || errorText.includes('conflict')) {
              errorTitle = 'Time Conflict'
              errorMessage = 'That time slot is not available. Please choose another time.'
            } else if (errorText.includes('business hours')) {
              errorTitle = 'Outside Business Hours'
              errorMessage = 'Cannot schedule appointment outside business hours.'
            } else if (errorText.includes('advance')) {
              errorTitle = 'Too Far Ahead'
              errorMessage = 'Cannot schedule appointments too far in advance.'
            }
          }
          
          // Show error toast
          toastError(errorTitle, errorMessage)
          
          // Rollback optimistic update on failure
          setState(prev => {
            const newMap = new Map(prev.optimisticUpdates)
            newMap.delete(appointmentId)
            return {
              ...prev,
              optimisticUpdates: newMap,
              isUpdating: null // Clear updating state
            }
          })
          
          // Also refresh data to ensure UI is consistent after rollback
          if (onRefresh) {
            setTimeout(() => onRefresh(), 100)
          }
        }
      } else {
        console.error('[DRAG DEBUG] onAppointmentUpdate is not defined!')
      }
    }
  }, [appointments, onAppointmentUpdate, onRefresh, startHour, endHour])

  // Optimized magnetic snap distance calculation with caching
  const calculateMagneticDistance = useCallback((mouseX: number, mouseY: number, slotElement: Element): number => {
    // Cache rect calculations to avoid repeated getBoundingClientRect calls
    const rect = slotElement.getBoundingClientRect()
    const slotCenterX = rect.left + (rect.width >> 1) // Bit shift for faster division
    const slotCenterY = rect.top + (rect.height >> 1)
    
    // Use faster distance calculation for magnetic snap threshold
    const deltaX = mouseX - slotCenterX
    const deltaY = mouseY - slotCenterY
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  }, [])
  
  // Pre-create empty sets to avoid repeated allocations
  const emptySet = useMemo(() => new Set<string>(), [])
  
  // Debounced drag over handler to reduce expensive calculations
  const debouncedDragOver = useRef(
    debounce((day: Date, hour: number, minute: number, isValid: boolean, distance: number, isNearMagnetic: boolean) => {
      const slotKey = `${day.toDateString()}-${hour}-${minute}`
      
      // Reuse sets when possible to reduce allocations
      const validZones = isValid ? new Set([slotKey]) : emptySet
      const invalidZones = !isValid ? new Set([slotKey]) : emptySet
      
      setState(prev => ({
        ...prev,
        dragOverSlot: { day, hour, minute },
        validDropZones: validZones,
        invalidDropZones: invalidZones,
        magneticField: isValid && isNearMagnetic ? { day, hour, minute } : null,
        nearMagneticField: isValid && isNearMagnetic,
        magneticDistance: distance
      }))
    }, 16) // ~60fps throttling
  ).current

  // Magnetic field detection threshold (in pixels)
  const MAGNETIC_THRESHOLD = 50

  // Filter appointments based on current view and filters
  const filteredAppointments = useMemo(() => {
    // Calculate date range based on view
    let startDate: Date
    let endDate: Date
    
    switch (view) {
      case 'day':
        startDate = startOfDay(state.currentDate)
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 1) // Next day start
        break
      case 'week':
        startDate = startOfWeek(state.currentDate)
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 7) // Next week start
        break
      case 'month':
        startDate = startOfMonth(state.currentDate)
        endDate = new Date(startDate)
        endDate.setMonth(endDate.getMonth() + 1) // Next month start
        break
    }
    
    return optimizedAppointmentFilter(appointments, {
      startDate,
      endDate,
      barberId: selectedBarberId
    })
  }, [appointments, state.currentDate, view, selectedBarberId, optimizedAppointmentFilter])

  // Optimized slot validation with caching
  const slotValidationCache = useRef<Map<string, boolean>>(new Map())
  const isSlotValid = useCallback((day: Date, hour: number, minute: number, draggedAppointment: Appointment): boolean => {
    // Create cache key for this validation
    const cacheKey = `${day.toDateString()}-${hour}-${minute}-${draggedAppointment.id}`
    
    // Check cache first
    if (slotValidationCache.current.has(cacheKey)) {
      return slotValidationCache.current.get(cacheKey)!
    }
    
    // Check 1: Not in the past + 15 minute advance requirement
    const slotDate = new Date(day)
    slotDate.setHours(hour, minute, 0, 0)
    const now = new Date()
    const minimumAdvanceTime = new Date(now.getTime() + 15 * 60 * 1000) // 15 minutes from now
    
    if (slotDate < minimumAdvanceTime) {
      return false
    }
    
    // Check 2: Not the same slot as current appointment
    if (draggedAppointment.start_time) {
      const currentTime = new Date(draggedAppointment.start_time)
      if (isSameDay(currentTime, day) && 
          currentTime.getHours() === hour && 
          currentTime.getMinutes() === minute) {
        return false
      }
    }
    
    // Check 3: No appointment conflicts - only check exact slot
    const hasConflict = filteredAppointments.some(apt => {
      if (apt.id === draggedAppointment.id) return false // Skip self
      const aptTime = new Date(apt.start_time)
      return isSameDay(aptTime, day) && 
             aptTime.getHours() === hour && 
             aptTime.getMinutes() === minute
    })
    
    const isValid = !hasConflict
    
    // Cache the result for performance
    slotValidationCache.current.set(cacheKey, isValid)
    
    // Clear cache periodically to prevent memory leaks
    if (slotValidationCache.current.size > 1000) {
      slotValidationCache.current.clear()
    }
    
    return isValid
  }, [filteredAppointments])

  // Drag & Drop handlers
  const dragHandlers: DragHandlers = useMemo(() => ({
    handleDragOver: (e: React.DragEvent, day: Date, hour: number, minute: number) => {
      e.preventDefault() // Always prevent default to allow drop
      if (state.draggedAppointment) {
        // Skip redundant calculations if hovering over same slot
        if (state.dragOverSlot && 
            state.dragOverSlot.day.getTime() === day.getTime() &&
            state.dragOverSlot.hour === hour && 
            state.dragOverSlot.minute === minute) {
          return // Already processed this slot
        }
        
        // On-demand validation - only check this specific slot
        const isValid = isSlotValid(day, hour, minute, state.draggedAppointment)
        e.dataTransfer.dropEffect = isValid ? 'move' : 'none'
        
        // Calculate magnetic distance for snap effect (only if valid)
        let distance = 0
        let isNearMagnetic = false
        if (isValid) {
          const slotElement = (e.currentTarget as HTMLElement)
          distance = calculateMagneticDistance(e.clientX, e.clientY, slotElement)
          isNearMagnetic = distance <= MAGNETIC_THRESHOLD
        }
        
        // Use debounced handler for expensive state updates
        debouncedDragOver(day, hour, minute, isValid, distance, isNearMagnetic)
      }
    },

    handleDragLeave: (e: React.DragEvent) => {
      // Only clear state if actually leaving the calendar area
      const relatedTarget = e.relatedTarget as Element
      if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
        setState(prev => ({ 
          ...prev, 
          dragOverSlot: null,
          validDropZones: new Set(),
          invalidDropZones: new Set(),
          magneticField: null,
          nearMagneticField: false,
          magneticDistance: 0
        }))
      }
    },

    handleDragStart: (e: React.DragEvent, appointment: Appointment) => {
      if (appointment.status !== 'completed' && appointment.status !== 'cancelled') {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', appointment.id.toString())
        
        // Add drag image
        const dragImage = e.currentTarget as HTMLElement
        e.dataTransfer.setDragImage(dragImage, dragImage.offsetWidth / 2, dragImage.offsetHeight / 2)
        
        // Lightweight initialization - no upfront zone calculation
        setState(prev => ({ 
          ...prev, 
          draggedAppointment: appointment, 
          isDragging: true,
          validDropZones: new Set(), // Start empty - populate on-demand
          invalidDropZones: new Set() // Start empty - populate on-demand
        }))
      } else {
        e.preventDefault()
      }
    },

    handleDragEnd: () => {
      setState(prev => ({ 
        ...prev, 
        draggedAppointment: null, 
        dragOverSlot: null, 
        isDragging: false,
        validDropZones: new Set(),
        invalidDropZones: new Set(),
        magneticField: null,
        nearMagneticField: false,
        magneticDistance: 0
      }))
    },

    handleDrop: (e: React.DragEvent, day: Date, hour: number, minute: number) => {
      e.preventDefault()
      
      const draggedApp = state.draggedAppointment // Store reference before clearing
      
      if (draggedApp && onAppointmentUpdate) {
        const newDate = new Date(day)
        newDate.setHours(hour, minute, 0, 0)
        
        // Check if the new time is valid using comprehensive validation
        if (isSlotValid(day, hour, minute, draggedApp)) {
          // Show success animation with magnetic effect
          setState(prev => ({ 
            ...prev, 
            dropSuccess: { day, hour, minute },
            draggedAppointment: null,
            dragOverSlot: null,
            isDragging: false,
            validDropZones: new Set(),
            invalidDropZones: new Set(),
            magneticField: null,
            nearMagneticField: false,
            magneticDistance: 0
          }))
          
          setTimeout(() => {
            setState(prev => ({ ...prev, dropSuccess: null }))
          }, 600)
          
          // Use the stored reference for the update
          checkAndUpdateAppointment(draggedApp.id, newDate.toISOString())
        } else {
          
          // Show user-friendly error message
          const newDate = new Date(day)
          newDate.setHours(hour, minute, 0, 0)
          const now = new Date()
          const timeDiff = Math.round((newDate.getTime() - now.getTime()) / (1000 * 60))
          
          toastError(`Cannot reschedule to ${format(newDate, 'h:mm a')}. Appointments must be scheduled at least 15 minutes in advance.${timeDiff < 0 ? ' This time is in the past.' : ` Only ${timeDiff} minutes from now.`}`)
          
          // Clear drag state
          setState(prev => ({ 
            ...prev, 
            draggedAppointment: null,
            dragOverSlot: null,
            isDragging: false,
            validDropZones: new Set(),
            invalidDropZones: new Set(),
            magneticField: null,
            nearMagneticField: false,
            magneticDistance: 0
          }))
        }
      } else {
        // Clear drag state
        setState(prev => ({ 
          ...prev, 
          draggedAppointment: null,
          dragOverSlot: null,
          isDragging: false,
          validDropZones: new Set(),
          invalidDropZones: new Set(),
          magneticField: null,
          nearMagneticField: false,
          magneticDistance: 0
        }))
      }
    }
  }), [state.draggedAppointment, state.dragOverSlot, onAppointmentUpdate, checkAndUpdateAppointment, isSlotValid, calculateMagneticDistance])
  
  // Performance monitoring removed - simplified hook
  
  // Sync with prop changes
  useEffect(() => {
    if (!isSameDay(state.currentDate, currentDate)) {
      setState(prev => ({ ...prev, currentDate }))
    }
  }, [currentDate, state.currentDate])

  // Enhanced appointment lookup with date indexing for performance
  const appointmentLookupMap = useMemo(() => {
    const byId = new Map<string, Appointment>()
    const byDate = new Map<string, Appointment[]>()
    
    filteredAppointments.forEach(apt => {
      // ID-based lookup for quick access
      byId.set(apt.id.toString(), apt)
      
      // Date-based lookup for efficient calendar rendering
      const dateKey = format(new Date(apt.start_time), 'yyyy-MM-dd')
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, [])
      }
      byDate.get(dateKey)!.push(apt)
    })
    
    return { byId, byDate }
  }, [filteredAppointments])
  
  // Compatibility getter for existing code
  const getAppointmentById = useCallback((id: string) => appointmentLookupMap.byId.get(id), [appointmentLookupMap])
  const getAppointmentsByDate = useCallback((date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return appointmentLookupMap.byDate.get(dateKey) || []
  }, [appointmentLookupMap])
  
  // Virtualization helper for large appointment lists
  const getVisibleAppointments = useCallback((appointments: Appointment[], maxVisible: number = 50) => {
    // For performance, limit visible appointments in complex views
    if (appointments.length <= maxVisible) return appointments
    
    // Sort by start time and take the most relevant ones
    return appointments
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(0, maxVisible)
  }, [])
  
  // Memoized appointment components for better rendering performance
  const appointmentComponents = useMemo(() => {
    const components = new Map<string, JSX.Element>()
    
    filteredAppointments.forEach(appointment => {
      const key = `${appointment.id}-${appointment.start_time}-${appointment.status}`
      
      // Only create component if not cached
      if (!components.has(key)) {
        components.set(key, (
          <div key={appointment.id} className="appointment-component">
            {/* Appointment content will be rendered inline */}
          </div>
        ))
      }
    })
    
    return components
  }, [filteredAppointments])

  // Touch drag support for appointments
  useEffect(() => {
    if (!isTouchDevice) return

    const appointmentElements = document.querySelectorAll('.unified-calendar-appointment')
    const cleanupFunctions: (() => void)[] = []

    appointmentElements.forEach((appointmentEl) => {
      const appointmentId = appointmentEl.getAttribute('data-appointment-id')
      if (!appointmentId) return
      
      const appointment = appointmentLookupMap.get(appointmentId)
      
      if (!appointment || appointment.status === 'completed' || appointment.status === 'cancelled') {
        return
      }

      const cleanup = touchDragManager.initializeTouchDrag(appointmentEl as HTMLElement, {
        onDragStart: (element) => {
          setState(prev => ({
            ...prev,
            draggedAppointment: appointment,
            isDragging: true
          }))
          return true
        },
        onDragMove: (element, position) => {
          // Find which day and time slot we're over
          const grid = scheduleGridRef.current
          if (!grid) return
          
          const rect = grid.getBoundingClientRect()
          const relativeX = position.clientX - rect.left
          const relativeY = position.clientY - rect.top
          
          // Calculate day and time slot based on current view
          if (view === 'week') {
            const dayWidth = rect.width / 7
            const dayIndex = Math.floor(relativeX / dayWidth)
            const slotHeight = 48 // 48px per slot
            const slotIndex = Math.floor(relativeY / slotHeight)
            
            const weekStart = startOfWeek(state.currentDate)
            const timeSlots = []
            for (let hour = startHour; hour < endHour; hour++) {
              for (let minute = 0; minute < 60; minute += slotDuration) {
                timeSlots.push({ hour, minute })
              }
            }
            
            if (dayIndex >= 0 && dayIndex < 7 && slotIndex >= 0 && slotIndex < timeSlots.length) {
              const targetDay = addDays(weekStart, dayIndex)
              const slot = timeSlots[slotIndex]
              setState(prev => ({ 
                ...prev, 
                dragOverSlot: { day: targetDay, hour: slot.hour, minute: slot.minute } 
              }))
            }
          } else if (view === 'day') {
            const slotHeight = 40 // 40px per slot in day view
            const slotIndex = Math.floor(relativeY / slotHeight)
            
            const timeSlots = []
            for (let hour = startHour; hour < endHour; hour++) {
              for (let minute = 0; minute < 60; minute += slotDuration) {
                timeSlots.push({ hour, minute })
              }
            }
            
            if (slotIndex >= 0 && slotIndex < timeSlots.length) {
              const slot = timeSlots[slotIndex]
              setState(prev => ({ 
                ...prev, 
                dragOverSlot: { day: state.currentDate, hour: slot.hour, minute: slot.minute } 
              }))
            }
          }
        },
        onDragEnd: (element, dropTarget) => {
          if (state.draggedAppointment && onAppointmentUpdate && state.dragOverSlot) {
            const newDate = new Date(state.dragOverSlot.day)
            newDate.setHours(state.dragOverSlot.hour, state.dragOverSlot.minute, 0, 0)
            
            // Check if the new time is valid (not in the past for today)
            const now = new Date()
            const isToday = isSameDay(state.dragOverSlot.day, now)
            if (!isToday || newDate > now) {
              checkAndUpdateAppointment(state.draggedAppointment.id, newDate.toISOString())
            }
          }
          setState(prev => ({
            ...prev,
            draggedAppointment: null,
            dragOverSlot: null,
            isDragging: false,
            magneticField: null,
            nearMagneticField: false,
            magneticDistance: 0
          }))
        },
        canDrag: () => appointment.status !== 'completed' && appointment.status !== 'cancelled'
      })

      if (cleanup) cleanupFunctions.push(cleanup)
    })

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }, [appointmentLookupMap, isTouchDevice, view, state.currentDate, checkAndUpdateAppointment])
  
  // Helper functions
  const getClientName = useCallback((appointment: Appointment): string => {
    return appointment.client_name
  }, [])
  
  const getBarberName = useCallback((appointment: Appointment): string => {
    return appointment.barber_name
  }, [])
  
  const getStatusColor = useCallback((status: string) => {
    return memoizedStatusColor(status)
  }, [memoizedStatusColor])
  
  // Date navigation
  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    const newDate = new Date(state.currentDate)
    
    switch (view) {
      case 'day':
        direction === 'prev' ? newDate.setDate(newDate.getDate() - 1) : newDate.setDate(newDate.getDate() + 1)
        break
      case 'week':
        direction === 'prev' ? newDate.setDate(newDate.getDate() - 7) : newDate.setDate(newDate.getDate() + 7)
        break
      case 'month':
        direction === 'prev' ? newDate.setMonth(newDate.getMonth() - 1) : newDate.setMonth(newDate.getMonth() + 1)
        break
    }
    
    setState(prev => ({ ...prev, currentDate: newDate }))
    onDateChange?.(newDate)
  }, [view, state.currentDate, onDateChange])
  
  // Get current period title
  const getPeriodTitle = useCallback(() => {
    switch (view) {
      case 'day':
        return format(state.currentDate, 'EEEE, MMMM d, yyyy')
      case 'week':
        const weekStart = startOfWeek(state.currentDate)
        const weekEnd = endOfWeek(state.currentDate)
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
      case 'month':
        return format(state.currentDate, 'MMMM yyyy')
      default:
        return ''
    }
  }, [view, state.currentDate])
  
  // Render view-specific content
  const renderView = () => {
    switch (view) {
      case 'day':
        return renderDayView()
      case 'week':
        return renderWeekView()
      case 'month':
        return renderMonthView()
      default:
        return null
    }
  }
  
  // Memoized time slots calculation
  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        slots.push({ hour, minute })
      }
    }
    return slots
  }, [startHour, endHour, slotDuration])

  // Day view renderer
  const renderDayView = useCallback(() => {
    const dayAppointments = filteredAppointments.filter(apt => 
      isSameDay(new Date(apt.start_time), state.currentDate)
    )
    
    return (
      <div className="day-view h-full flex flex-col">
        <div className="day-header border-b border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold text-lg">{format(state.currentDate, 'EEEE, MMMM d')}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {dayAppointments.length} appointments
          </p>
        </div>
        
        <div className="day-grid flex-1 overflow-auto relative" ref={scheduleGridRef}>
          {/* Time labels */}
          <div className="absolute left-0 top-0 w-16 z-10">
            {timeSlots.map(({ hour, minute }) => (
              minute === 0 ? (
                <div 
                  key={`${hour}-${minute}`}
                  className="h-10 text-xs text-gray-500 border-r border-gray-200 dark:border-gray-700 flex items-start justify-end pr-2 pt-1"
                >
                  {format(new Date().setHours(hour, minute), 'h:mm a')}
                </div>
              ) : null
            ))}
          </div>
          
          {/* Time slots */}
          <div className="ml-16">
            {timeSlots.map(({ hour, minute }) => {
              const slotDate = new Date(state.currentDate)
              slotDate.setHours(hour, minute, 0, 0)
              
              return (
                <div 
                  key={`${hour}-${minute}`}
                  className={`h-10 border-b border-gray-100 dark:border-gray-800 cursor-pointer relative transition-all time-slot-magnetic ${
                    // Optimized condition checks - only check what's needed when needed
                    (() => {
                      const slotKey = `${state.currentDate.toDateString()}-${hour}-${minute}`
                      const isDragOverThisSlot = state.dragOverSlot && 
                        isSameDay(state.dragOverSlot.day, state.currentDate) && 
                        state.dragOverSlot.hour === hour && 
                        state.dragOverSlot.minute === minute
                      
                      const isMagneticField = state.magneticField &&
                        isSameDay(state.magneticField.day, state.currentDate) &&
                        state.magneticField.hour === hour &&
                        state.magneticField.minute === minute
                      
                      if (isDragOverThisSlot) {
                        if (state.invalidDropZones.has(slotKey)) {
                          return 'bg-red-50 dark:bg-red-900/30 ring-2 ring-red-400 border-red-300 border-dashed cursor-not-allowed magnetic-rejection shadow-sm'
                        }
                        return 'bg-emerald-50 dark:bg-green-900/30 ring-2 ring-emerald-400 border-emerald-300 border-dashed magnetic-field magnetic-active shadow-sm'
                      }
                      
                      if (isMagneticField) {
                        return 'magnetic-attraction'
                      }
                      
                      if (state.dropSuccess &&
                          isSameDay(state.dropSuccess.day, state.currentDate) &&
                          state.dropSuccess.hour === hour &&
                          state.dropSuccess.minute === minute) {
                        return 'bg-emerald-100 dark:bg-green-800/40 ring-2 ring-emerald-500 animate-pulse magnetic-drop-success shadow-md'
                      }
                      
                      if (state.isDragging) {
                        return 'hover:bg-emerald-50/50 dark:hover:bg-green-900/10 hover:border-emerald-200 hover:border-dashed magnetic-field transition-colors duration-200'
                      }
                      
                      return 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    })()
                  }`}
                  onClick={() => onTimeSlotClick?.(slotDate)}
                  onDragOver={(e) => dragHandlers.handleDragOver(e, state.currentDate, hour, minute)}
                  onDragLeave={dragHandlers.handleDragLeave}
                  onDrop={(e) => dragHandlers.handleDrop(e, state.currentDate, hour, minute)}
                >
                  {/* Magnetic center guide */}
                  <div className="magnetic-center-guide"></div>
                  
                  {/* Render appointments for this time slot */}
                  {dayAppointments
                    .filter(apt => {
                      const aptTime = new Date(apt.start_time)
                      return aptTime.getHours() === hour && aptTime.getMinutes() === minute
                    })
                    .map(appointment => {
                      // Apply optimistic updates
                      const optimisticUpdate = state.optimisticUpdates.get(appointment.id)
                      const displayAppointment = optimisticUpdate ? 
                        { ...appointment, start_time: optimisticUpdate.newStartTime } : 
                        appointment
                      
{
                        // Get service configuration for premium styling
                        const serviceType = appointment.service_name?.toLowerCase() || 'haircut'
                        const serviceConfig = getServiceConfig(serviceType)
                        const barberSymbol = getBarberSymbol(appointment.barber_id?.toString() || appointment.barber_name || '')
                        
                        return (
                          <div 
                            key={appointment.id}
                            data-appointment-id={appointment.id}
                            draggable={appointment.status !== 'completed' && appointment.status !== 'cancelled'}
                            className={`unified-calendar-appointment premium-appointment absolute inset-0 m-1 p-2 rounded text-xs cursor-pointer overflow-hidden transition-all text-white group dragged-appointment-magnetic ${
                              getStatusColor(appointment.status)
                            } ${
                              state.draggedAppointment?.id === appointment.id 
                                ? `opacity-30 scale-95 ring-2 ring-white ring-opacity-50 animate-pulse dragging ${
                                    state.nearMagneticField ? 'near-magnetic-field' : ''
                                  } ${
                                    state.magneticField ? 'snapped-to-slot' : ''
                                  }` 
                                : 'hover:shadow-xl hover:scale-105 hover:z-20 hover:ring-2 hover:ring-white hover:ring-opacity-60'
                            } ${
                              appointment.status !== 'completed' && appointment.status !== 'cancelled' 
                                ? 'cursor-move' 
                                : 'cursor-pointer'
                            }`}
                            style={{
                              background: serviceConfig?.gradient?.light || 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                              borderColor: serviceConfig?.color || '#3b82f6',
                              boxShadow: `0 0 0 1px ${serviceConfig?.color || '#3b82f6'}40, ${serviceConfig?.glow || '0 4px 12px rgba(59, 130, 246, 0.3)'}`
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!state.isDragging) {
                                onAppointmentClick?.(appointment)
                              }
                            }}
                            onDragStart={(e) => dragHandlers.handleDragStart(e, appointment)}
                            onDragEnd={dragHandlers.handleDragEnd}
                          >
                            {/* Barber symbol in top-right corner */}
                            <div className="absolute top-1 right-1 text-xs opacity-70 font-bold text-white bg-black bg-opacity-20 rounded-full w-5 h-5 flex items-center justify-center" title={`Barber: ${appointment.barber_name || 'Unknown'}`}>
                              {barberSymbol}
                            </div>
                            
                            {/* Service icon in bottom-left corner */}
                            <div className="absolute bottom-1 left-1 text-sm opacity-80" title={`Service: ${appointment.service_name}`}>
                              {serviceConfig?.icon || '✂️'}
                            </div>
                            
                            {/* Premium shine effect on hover */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
                            
                            {/* Content */}
                            <div className="relative z-10 space-y-1">
                              <div className="font-medium text-white">{getClientName(appointment)}</div>
                              <div className="text-white text-xs opacity-90">{appointment.service_name}</div>
                              {appointment.duration_minutes && (
                                <div className="text-white text-xs opacity-75">{appointment.duration_minutes} min</div>
                              )}
                            </div>
                            
                            {/* Drop zone indicator when dragging */}
                            {state.isDragging && state.draggedAppointment?.id !== appointment.id && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                <div className="bg-emerald-600 dark:bg-green-500 text-white px-2 py-1 rounded text-xs font-medium shadow-lg border border-emerald-500 dark:border-green-400">
                                  Drop here
                                </div>
                              </div>
                            )}
                            
                            {/* Move button fallback for non-drag browsers or touch devices */}
                            {appointment.status !== 'completed' && appointment.status !== 'cancelled' && !state.isDragging && (
                              <button
                                className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/20 hover:bg-white/30 rounded p-1"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Trigger the same update flow as drag and drop
                                  onAppointmentUpdate?.(appointment.id, appointment.start_time)
                                }}
                                title="Move appointment"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )
                      }
                    })
                  }
                </div>
              )
            })}
          </div>
          
          {/* Current time indicator for today */}
          {isSameDay(state.currentDate, new Date()) && (
            <CurrentTimeIndicator startHour={startHour} slotDuration={slotDuration} />
          )}
        </div>
      </div>
    )
  }, [filteredAppointments, state.currentDate, timeSlots, state.draggedAppointment, state.isDragging, state.validDropZones, state.invalidDropZones, state.dragOverSlot, state.dropSuccess, state.optimisticUpdates, state.isUpdating, getStatusColor, onAppointmentClick, onClientClick, onTimeSlotClick, getClientName, getBarberName])
  
  // Memoized week days calculation
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(state.currentDate)
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [state.currentDate])

  // Week view renderer
  const renderWeekView = useCallback(() => {
    
    return (
      <div className="week-view h-full flex flex-col">
        {/* Week header */}
        <div className="week-header border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-8 gap-0">
            <div className="w-16"></div> {/* Time column spacer */}
            {weekDays.map(day => (
              <div key={day.toISOString()} className="p-2 text-center border-r border-gray-200 dark:border-gray-700">
                <div className="text-sm font-medium">{format(day, 'EEE')}</div>
                <div className={`text-lg ${isSameDay(day, new Date()) ? 'text-blue-600 font-bold' : ''}`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Week grid */}
        <div className="week-grid flex-1 overflow-auto relative" ref={scheduleGridRef}>
          {timeSlots.map(({ hour, minute }) => (
            <div key={`${hour}-${minute}`} className="grid grid-cols-8 gap-0 h-10 border-b border-gray-100 dark:border-gray-800">
              {/* Time label */}
              <div className="w-16 text-xs text-gray-500 border-r border-gray-200 dark:border-gray-700 flex items-start justify-end pr-2 pt-1">
                {minute === 0 ? format(new Date().setHours(hour, minute), 'h:mm a') : ''}
              </div>
              
              {/* Day columns */}
              {weekDays.map(day => {
                const slotDate = new Date(day)
                slotDate.setHours(hour, minute, 0, 0)
                
                const slotAppointments = filteredAppointments.filter(apt => {
                  const aptTime = new Date(apt.start_time)
                  return isSameDay(aptTime, day) && 
                         aptTime.getHours() === hour && 
                         aptTime.getMinutes() === minute
                })
                
                return (
                  <div 
                    key={day.toISOString()}
                    className={`border-r border-gray-200 dark:border-gray-700 cursor-pointer relative transition-all time-slot-magnetic ${
                      // Optimized condition checks for week view
                      (() => {
                        const slotKey = `${day.toDateString()}-${hour}-${minute}`
                        const isDragOverThisSlot = state.dragOverSlot && 
                          isSameDay(state.dragOverSlot.day, day) && 
                          state.dragOverSlot.hour === hour && 
                          state.dragOverSlot.minute === minute
                        
                        const isMagneticField = state.magneticField &&
                          isSameDay(state.magneticField.day, day) &&
                          state.magneticField.hour === hour &&
                          state.magneticField.minute === minute
                        
                        if (isDragOverThisSlot) {
                          if (state.invalidDropZones.has(slotKey)) {
                            return 'bg-red-50 dark:bg-red-900/30 ring-2 ring-red-400 border-red-300 border-dashed cursor-not-allowed magnetic-rejection shadow-sm'
                          }
                          return 'bg-emerald-50 dark:bg-green-900/30 ring-2 ring-emerald-400 border-emerald-300 border-dashed magnetic-field magnetic-active shadow-sm'
                        }
                        
                        if (isMagneticField) {
                          return 'magnetic-attraction'
                        }
                        
                        if (state.dropSuccess &&
                            isSameDay(state.dropSuccess.day, day) &&
                            state.dropSuccess.hour === hour &&
                            state.dropSuccess.minute === minute) {
                          return 'bg-emerald-100 dark:bg-green-800/40 ring-2 ring-emerald-500 animate-pulse magnetic-drop-success shadow-md'
                        }
                        
                        if (state.isDragging) {
                          return 'hover:bg-emerald-50/50 dark:hover:bg-green-900/10 hover:border-emerald-200 hover:border-dashed magnetic-field transition-colors duration-200'
                        }
                        
                        return 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      })()
                    }`}
                    onClick={() => onTimeSlotClick?.(slotDate)}
                    onDragOver={(e) => dragHandlers.handleDragOver(e, day, hour, minute)}
                    onDragLeave={dragHandlers.handleDragLeave}
                    onDrop={(e) => dragHandlers.handleDrop(e, day, hour, minute)}
                    aria-label={`Time slot ${format(slotDate, 'EEEE, MMMM d, yyyy')} at ${format(slotDate, 'h:mm a')}`}
                    role="button"
                    tabIndex={0}
                  >
                    {/* Magnetic center guide */}
                    <div className="magnetic-center-guide"></div>
                    
                    {slotAppointments.map(appointment => {
                      // Apply optimistic updates
                      const optimisticUpdate = state.optimisticUpdates.get(appointment.id)
                      const displayAppointment = optimisticUpdate ? 
                        { ...appointment, start_time: optimisticUpdate.newStartTime } : 
                        appointment
                      
                      {
                        // Get service configuration for premium styling
                        const serviceType = appointment.service_name?.toLowerCase() || 'haircut'
                        const serviceConfig = getServiceConfig(serviceType)
                        const barberSymbol = getBarberSymbol(appointment.barber_id?.toString() || appointment.barber_name || '')
                        
                        return (
                          <div 
                            key={appointment.id}
                            data-appointment-id={appointment.id}
                            draggable={appointment.status !== 'completed' && appointment.status !== 'cancelled'}
                            className={`unified-calendar-appointment premium-appointment absolute inset-0 m-0.5 p-1 rounded text-xs cursor-pointer overflow-hidden transition-all text-white group dragged-appointment-magnetic ${
                              getStatusColor(appointment.status)
                            } ${
                              state.draggedAppointment?.id === appointment.id 
                                ? `dragging opacity-30 scale-95 ring-2 ring-white ring-opacity-50 animate-pulse ${
                                    state.nearMagneticField ? 'near-magnetic-field' : ''
                                  } ${
                                    state.magneticField ? 'snapped-to-slot' : ''
                                  }` 
                                : 'hover:shadow-xl hover:scale-105 hover:z-20 hover:ring-2 hover:ring-white hover:ring-opacity-60'
                            } ${
                              appointment.status !== 'completed' && appointment.status !== 'cancelled' 
                                ? 'cursor-move' 
                                : 'cursor-pointer'
                            }`}
                            aria-label={`Appointment: ${appointment.service_name || 'Service'} with ${appointment.client_name || 'client'} on ${format(new Date(appointment.start_time), 'EEEE, MMMM d, yyyy')} at ${format(new Date(appointment.start_time), 'h:mm a')}. Status: ${appointment.status}. ${appointment.status !== 'completed' && appointment.status !== 'cancelled' ? 'Draggable' : 'Click to view details'}.`}
                            role="button"
                            tabIndex={0}
                            style={{
                              background: serviceConfig?.gradient?.light || 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                              borderColor: serviceConfig?.color || '#3b82f6',
                              boxShadow: `0 0 0 1px ${serviceConfig?.color || '#3b82f6'}40, ${serviceConfig?.glow || '0 4px 12px rgba(59, 130, 246, 0.3)'}`
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!state.isDragging) {
                                onAppointmentClick?.(appointment)
                              }
                            }}
                            onDragStart={(e) => dragHandlers.handleDragStart(e, appointment)}
                            onDragEnd={dragHandlers.handleDragEnd}
                          >
                            {/* Barber symbol in top-right corner */}
                            <div className="absolute top-0.5 right-0.5 text-xs opacity-70 font-bold text-white bg-black bg-opacity-20 rounded-full w-4 h-4 flex items-center justify-center" title={`Barber: ${appointment.barber_name || 'Unknown'}`}>
                              {barberSymbol}
                            </div>
                            
                            {/* Service icon in bottom-left corner */}
                            <div className="absolute bottom-0.5 left-0.5 text-xs opacity-80" title={`Service: ${appointment.service_name}`}>
                              {serviceConfig?.icon || '✂️'}
                            </div>
                            
                            {/* Premium shine effect on hover */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
                            
                            {/* Content */}
                            <div className="relative z-10 mt-1">
                              <div className="font-medium truncate text-white">{getClientName(appointment)}</div>
                              <div className="truncate opacity-90 text-white text-xs">{appointment.service_name}</div>
                            </div>
                            
                            {/* Loading indicator for updating appointments */}
                            {state.isUpdating === appointment.id && (
                              <div className="absolute inset-0 bg-white/80 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-lg">
                                <div className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg border border-blue-500">
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Moving...</span>
                                </div>
                              </div>
                            )}
                            
                            {/* Drop zone indicator when dragging */}
                            {state.isDragging && state.draggedAppointment?.id !== appointment.id && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                <div className="bg-emerald-600 dark:bg-green-500 text-white px-2 py-1 rounded text-xs font-medium shadow-lg border border-emerald-500 dark:border-green-400">
                                  Drop here
                                </div>
                              </div>
                            )}
                            
                            {/* Move button fallback for non-drag browsers or touch devices */}
                            {appointment.status !== 'completed' && appointment.status !== 'cancelled' && !state.isDragging && (
                              <button
                                className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/20 hover:bg-white/30 rounded p-1"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Trigger the same update flow as drag and drop
                                  onAppointmentUpdate?.(appointment.id, appointment.start_time)
                                }}
                                title="Move appointment"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )
                      }
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }, [weekDays, timeSlots, filteredAppointments, state.draggedAppointment, state.isDragging, state.validDropZones, state.invalidDropZones, state.dragOverSlot, state.dropSuccess, state.optimisticUpdates, state.isUpdating, getStatusColor, onAppointmentClick, onClientClick, onTimeSlotClick, onDayClick, onDayDoubleClick, getClientName, getBarberName])
  
  // Month view renderer
  const renderMonthView = () => {
    const monthStart = startOfMonth(state.currentDate)
    const monthEnd = endOfMonth(state.currentDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    
    const calendarDays = []
    let day = calendarStart
    while (day <= calendarEnd) {
      calendarDays.push(day)
      day = addDays(day, 1)
    }
    
    return (
      <div className="month-view h-full flex flex-col">
        {/* Month header */}
        <div className="month-header border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-7 gap-0">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
              <div key={dayName} className="p-2 text-center font-medium text-sm border-r border-gray-200 dark:border-gray-700">
                {dayName}
              </div>
            ))}
          </div>
        </div>
        
        {/* Month grid */}
        <div className="month-grid flex-1">
          <div className="grid grid-cols-7 gap-0 h-full">
            {calendarDays.map(day => {
              const dayAppointments = filteredAppointments.filter(apt => 
                isSameDay(new Date(apt.start_time), day)
              )
              
              const isCurrentMonth = day.getMonth() === state.currentDate.getMonth()
              const isToday = isSameDay(day, new Date())
              const isSelected = state.selectedDate && isSameDay(day, state.selectedDate)
              
              return (
                <div 
                  key={day.toISOString()}
                  className={`
                    border-r border-b border-gray-200 dark:border-gray-700 p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800
                    ${!isCurrentMonth ? 'text-gray-400 bg-gray-50 dark:bg-gray-900' : ''}
                    ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                    ${isSelected ? 'ring-2 ring-blue-500' : ''}
                  `}
                  onClick={() => {
                    setState(prev => ({ ...prev, selectedDate: day }))
                    onDayClick?.(day)
                  }}
                  onDoubleClick={() => onDayDoubleClick?.(day)}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600 font-bold' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  
                  {/* Appointment indicators */}
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 3).map(appointment => {
                      // Get service configuration for premium styling
                      const serviceType = appointment.service_name?.toLowerCase() || 'haircut'
                      const serviceConfig = getServiceConfig(serviceType)
                      
                      return (
                        <div 
                          key={appointment.id}
                          data-appointment-id={appointment.id}
                          draggable={appointment.status !== 'completed' && appointment.status !== 'cancelled'}
                          className={`unified-calendar-appointment text-xs p-1 rounded truncate cursor-pointer transition-all text-white dragged-appointment-magnetic ${
                            getStatusColor(appointment.status)
                          } ${
                            state.draggedAppointment?.id === appointment.id 
                              ? `dragging ${
                                  state.nearMagneticField ? 'near-magnetic-field' : ''
                                } ${
                                  state.magneticField ? 'snapped-to-slot' : ''
                                }` 
                              : ''
                          } ${
                            appointment.status !== 'completed' && appointment.status !== 'cancelled' 
                              ? 'cursor-move hover:scale-105' 
                              : 'cursor-pointer'
                          }`}
                          style={{
                            background: serviceConfig?.gradient?.light || 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                            borderColor: serviceConfig?.color || '#3b82f6'
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            onAppointmentClick?.(appointment)
                          }}
                          onDragStart={(e) => dragHandlers.handleDragStart(e, appointment)}
                          onDragEnd={dragHandlers.handleDragEnd}
                        >
                          {getClientName(appointment)}
                        </div>
                      )
                    })}
                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{dayAppointments.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const calendarContent = (
    <div 
      className={`unified-calendar h-full flex flex-col ${className}`}
      role="application" 
      aria-label="Calendar interface with touch support"
      aria-describedby="calendar-period-title"
    >
      {/* Mobile-optimized navigation header */}
      {isMobile || isTouchDevice ? (
        <MobileCalendarControls
          currentDate={state.currentDate}
          view={view as CalendarView}
          onDateChange={navigationHandlers.onDateChange}
          onViewChange={navigationHandlers.onViewChange}
          onTodayClick={navigationHandlers.onTodayClick}
          enableSwipeNavigation={true}
          compactMode={isMobile}
          className="calendar-navigation"
        />
      ) : (
        <header className="calendar-navigation flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700" role="banner">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('prev')}
              aria-label={`Go to previous ${view === 'day' ? 'day' : view === 'week' ? 'week' : 'month'}`}
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </Button>
            
            <h2 className="text-lg font-semibold min-w-[200px] text-center" id="calendar-period-title">
              {getPeriodTitle()}
            </h2>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('next')}
              aria-label={`Go to next ${view === 'day' ? 'day' : view === 'week' ? 'week' : 'month'}`}
            >
              <ChevronRightIcon className="w-4 h-4" />
            </Button>
          </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setState(prev => ({ ...prev, currentDate: new Date() }))
              onDateChange?.(new Date())
            }}
            aria-label="Go to today"
          >
            Today
          </Button>
          
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              aria-label={isLoading ? "Refreshing calendar..." : "Refresh calendar"}
            >
              {isLoading ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowPathIcon className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </header>
      )}
      
      {/* View content */}
      <main className="calendar-content flex-1 overflow-hidden" role="main" aria-label="Calendar view">
        {renderView()}
      </main>
      
      {/* Modals */}
      {state.showClientModal && state.selectedClient && (
        <ClientDetailModal
          client={state.selectedClient}
          isOpen={state.showClientModal}
          onClose={() => setState(prev => ({ 
            ...prev, 
            showClientModal: false, 
            selectedClient: null 
          }))}
        />
      )}
      
      {state.showConflictModal && state.conflictAnalysis && (
        <ConflictResolutionModal
          isOpen={state.showConflictModal}
          onClose={() => setState(prev => ({ 
            ...prev, 
            showConflictModal: false, 
            conflictAnalysis: null 
          }))}
          analysis={state.conflictAnalysis}
          appointmentData={{
            client_name: 'Client',
            service_name: 'Service',
            start_time: new Date().toISOString(),
            duration_minutes: 60,
            barber_name: 'Barber'
          }}
          onResolveConflict={(resolution) => {
            // Handle conflict resolution
            setState(prev => ({ 
              ...prev, 
              showConflictModal: false, 
              conflictAnalysis: null 
            }))
          }}
          onProceedAnyway={() => {
            setState(prev => ({ 
              ...prev, 
              showConflictModal: false, 
              conflictAnalysis: null 
            }))
          }}
          onCancel={() => setState(prev => ({ 
            ...prev, 
            showConflictModal: false, 
            conflictAnalysis: null 
          }))}
        />
      )}
    </div>
  )

  // Return calendar with touch gesture support on mobile devices
  if (isMobile || isTouchDevice) {
    return (
      <NewTouchDragManager
        {...gestureHandlers}
        enableHapticFeedback={true}
        swipeThreshold={40}
        className="h-full"
      >
        {calendarContent}
      </NewTouchDragManager>
    )
  }

  return calendarContent
})

// Current time indicator component
const CurrentTimeIndicator = React.memo(({ startHour, slotDuration }: { startHour: number; slotDuration: number }) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [])
  
  const top = ((currentTime.getHours() * 60 + currentTime.getMinutes() - startHour * 60) / slotDuration) * 40
  
  return (
    <div
      className="absolute left-0 right-0 h-0.5 bg-red-500 z-10 calendar-today-indicator"
      style={{ top: `${top}px` }}
    >
      <div className="absolute -left-2 -top-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
    </div>
  )
})

CurrentTimeIndicator.displayName = 'CurrentTimeIndicator'

export default UnifiedCalendar
export type { UnifiedCalendarProps }