'use client'

import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { isSameDay, startOfDay, startOfMonth, startOfWeek, endOfWeek, addDays, format } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { Button } from './ui/button'
import { getMobileTouchClass } from '@/lib/mobile-touch-enhancements'
import ClientDetailModal from './modals/ClientDetailModal'
import { touchDragManager, TouchDragManager } from '@/lib/touch-utils'
import { useSwipeNavigation } from '@/lib/mobile-touch-enhancements'
import { useCalendarTouchGestures } from '@/hooks/useAdvancedTouchGestures'
import { useTouchFeedback } from '@/hooks/useTouchFeedback'
import { useTouchPrediction } from '@/lib/touch-prediction'
import { usePullToRefresh, PullToRefreshIndicator } from '@/hooks/usePullToRefresh'
import { TouchContextMenu, createAppointmentActions, createTimeSlotActions } from './calendar/TouchContextMenu'
import { conflictManager } from '@/lib/appointment-conflicts'
import ConflictResolutionModal from './modals/ConflictResolutionModal'
// Updated to use consolidated hooks
import { useCalendarOptimization } from '@/hooks/useCalendarOptimization'
import { useCalendarInteraction } from '@/hooks/useCalendarInteraction'
import { useCalendarVisuals } from '@/hooks/useCalendarVisuals'
import '@/styles/calendar-animations.css'
import '@/styles/calendar-premium.css'
import { CalendarKeyboardNavigation } from './calendar/CalendarKeyboardNavigation'
import { KeyboardShortcutIndicator, useKeyboardShortcutIndicator } from './ui/keyboard-shortcut-indicator'
import { useKeyboardShortcutsHelp } from './ui/keyboard-shortcuts-help'

// Import loading states
import { CalendarEmptyState, CalendarLoadingManager } from './calendar/CalendarLoadingStates'

// Import new extracted components
import { CalendarHeader } from './calendar/CalendarHeader'
import { DayView } from './calendar/DayView'
import { WeekView } from './calendar/WeekView'
import { MonthView } from './calendar/MonthView'
import { CalendarErrorBoundary } from './calendar/CalendarErrorBoundary'
// Updated to use consolidated hooks
import { useCalendarCore } from '@/hooks/useCalendarCore'

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
  clients?: any[]
  
  // Filter props
  selectedBarberId?: number | 'all'
  onBarberSelect?: (barberId: number | 'all') => void
  
  // Event handlers
  onAppointmentClick?: (appointment: Appointment) => void
  onClientClick?: (client: any) => void
  onTimeSlotClick?: (date: Date, barberId?: number) => void
  onAppointmentUpdate?: (appointmentId: number, newStartTime: string, isDragDrop?: boolean) => void
  onDayClick?: (date: Date) => void
  onDayDoubleClick?: (date: Date) => void
  
  // Configuration props
  startHour?: number
  endHour?: number
  slotDuration?: number
  isLoading?: boolean
  error?: string | null
  onRefresh?: () => void
  onRetry?: () => void
  onPreloadDate?: (date: Date) => void
  
  // Style props
  className?: string
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
  error = null,
  onRefresh,
  onRetry,
  onPreloadDate,
  className = ""
}: UnifiedCalendarProps) {
  
  // Use consolidated core calendar hook
  const {
    // Date management
    currentDate: coreCurrentDate,
    setCurrentDate,
    selectedDate,
    setSelectedDate,
    
    // UI state
    selectedAppointmentId,
    setSelectedAppointmentId,
    showClientModal,
    selectedClient,
    showClientModalForClient,
    hideClientModal,
    showConflictModal,
    conflictAnalysis,
    showConflictModalWithAnalysis,
    hideConflictModal,
    
    // Drag state
    draggedAppointment,
    dragOverSlot,
    isDragging,
    dropSuccess,
    dragOverDay,
    updateDragState,
    
    // Optimistic updates
    optimisticUpdates,
    addOptimisticUpdate,
    removeOptimisticUpdate
  } = useCalendarCore({ initialDate: currentDate })
  
  // Use consolidated optimization hook
  const { 
    measureRender, 
    optimizedAppointmentFilter, 
    memoizedDateCalculations,
    optimizedAppointmentsByDay,
    memoizedStatusColor,
    throttle 
  } = useCalendarOptimization()
  
  // Use consolidated interaction hook
  const { 
    announceToScreenReader: announce,
    getCalendarGridProps: getGridProps, 
    getCalendarGridCellProps: getGridCellProps, 
    isHighContrast,
    getAnnouncementRegionProps
  } = useCalendarInteraction()
  
  // Use consolidated visuals hook
  const { 
    isMobile, 
    isTablet,
    isDesktop,
    deviceType,
    viewportWidth
  } = useCalendarVisuals()
  const isTouchDevice = TouchDragManager.isTouchDevice()
  const { showIndicator } = useKeyboardShortcutIndicator()
  const helpDialog = useKeyboardShortcutsHelp()
  
  // Date navigation - Define early to avoid initialization errors
  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    const newDate = new Date(coreCurrentDate || currentDate)
    
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
    
    setCurrentDate(newDate)
    onDateChange?.(newDate)
  }, [view, coreCurrentDate, currentDate, onDateChange, setCurrentDate])
  
  // Swipe navigation for mobile
  const swipeContainerRef = useSwipeNavigation(
    () => navigateDate('next'), // Swipe left goes to next
    () => navigateDate('prev'), // Swipe right goes to previous
    isMobile ? 30 : 50 // Lower threshold on mobile
  )

  // Enhanced touch gestures with pinch-to-zoom and multi-touch
  const [zoomLevel, setZoomLevel] = useState(1)
  const [showZoomIndicator, setShowZoomIndicator] = useState(false)
  
  const handleZoom = useCallback((scale: number) => {
    setZoomLevel(scale)
    setShowZoomIndicator(true)
    
    // Hide zoom indicator after delay
    setTimeout(() => setShowZoomIndicator(false), 1000)
  }, [])

  const handleTimeNavigation = useCallback((direction: 'up' | 'down', velocity: number) => {
    // Two-finger scroll for time navigation
    if (velocity > 0.2) {
      const newHour = direction === 'up' ? startHour - 1 : endHour + 1
      // Update time range based on scroll
      console.log(`Time navigation: ${direction} with velocity ${velocity}`)
    }
  }, [startHour, endHour])

  const handleDateNavigation = useCallback((direction: 'left' | 'right', velocity: number) => {
    // Two-finger horizontal scroll for date navigation
    if (velocity > 0.3) {
      navigateDate(direction === 'left' ? 'prev' : 'next')
    }
  }, [navigateDate])

  const calendarTouchGestures = useCalendarTouchGestures(
    swipeContainerRef,
    handleZoom,
    handleTimeNavigation,
    handleDateNavigation
  )

  // Touch feedback system
  const touchFeedback = useTouchFeedback({
    enableHaptics: isTouchDevice && isMobile,
    enableVisualFeedback: true,
    adaptiveFeedback: true
  })

  // Touch prediction for reduced latency
  const touchPrediction = useTouchPrediction({
    elementType: 'calendar',
    currentView: view,
    deviceType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
  })

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    position: { x: number; y: number }
    appointment?: BookingResponse
    timeSlot?: { date: Date; hour: number; minute: number }
  }>({
    isOpen: false,
    position: { x: 0, y: 0 }
  })

  // Pull-to-refresh functionality for mobile
  const calendarContainerRef = useRef<HTMLDivElement>(null)
  const pullToRefresh = usePullToRefresh(calendarContainerRef, {
    onRefresh: async () => {
      if (onRefresh) {
        await onRefresh()
      }
      
      // Add artificial delay for better UX feedback
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Success haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([25, 25, 50])
      }
    },
    disabled: !isMobile || isLoading,
    enableHaptic: true,
    triggerDistance: 80
  })

  // Context menu handlers
  const showContextMenu = useCallback((
    position: { x: number; y: number },
    appointment?: BookingResponse,
    timeSlot?: { date: Date; hour: number; minute: number }
  ) => {
    setContextMenu({
      isOpen: true,
      position,
      appointment,
      timeSlot
    })
    
    // Long press haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 50])
    }
  }, [])

  const hideContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false }))
  }, [])
  
  // Enhanced drag & drop with optimistic updates
  const checkAndUpdateAppointment = useCallback(async (appointmentId: number, newStartTime: string, isDragDrop: boolean = false) => {
    const appointment = appointments.find(apt => apt.id === appointmentId)
    if (!appointment) {
      return
    }

    // Store original state for rollback
    const originalStartTime = appointment.start_time
    // Apply optimistic update immediately for better UX
    addOptimisticUpdate(appointmentId, originalStartTime, newStartTime)

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
      // Rollback optimistic update
      removeOptimisticUpdate(appointmentId)
      showConflictModalWithAnalysis(analysis, { appointmentId, newStartTime })
    } else {
      // No significant conflicts, proceed with update
      if (onAppointmentUpdate) {
        try {
          await onAppointmentUpdate(appointmentId, newStartTime, isDragDrop)
          // Success - clear optimistic update (it's now permanent)
          removeOptimisticUpdate(appointmentId)
        } catch (updateError: any) {
          // Rollback optimistic update on failure
          removeOptimisticUpdate(appointmentId)
        }
      }
    }
  }, [appointments, onAppointmentUpdate, startHour, endHour, addOptimisticUpdate, removeOptimisticUpdate, showConflictModalWithAnalysis])

  // Enhanced drag handlers with magnetic snap zones and touch feedback
  const dragHandlers = {
    handleDragStart: (appointment: any, element?: HTMLElement, position?: { x: number, y: number }) => {
      updateDragState({ draggedAppointment: appointment, isDragging: true })
      
      // Add touch feedback for drag start
      if (element && position && isTouchDevice) {
        touchFeedback.onDragStart(element, position)
      }
    },
    handleDragEnd: (element?: HTMLElement, position?: { x: number, y: number }) => {
      // Add touch feedback for drag end
      if (element && position && isTouchDevice) {
        touchFeedback.onSuccess(element, position)
      }
      
      updateDragState({ draggedAppointment: null, isDragging: false, dragOverSlot: null })
    },
    handleDragOver: (slot: any, element?: HTMLElement) => {
      updateDragState({ dragOverSlot: slot })
      
      // Add element to magnetic snap zones if it's a valid drop target
      if (element && isTouchDevice) {
        touchDragManager.addMagneticSnapZone(element)
      }
    },
    handleDragLeave: (element?: HTMLElement) => {
      updateDragState({ dragOverSlot: null })
      
      // Remove from magnetic snap zones
      if (element && isTouchDevice) {
        touchDragManager.removeMagneticSnapZone(element)
      }
    },
    handleDrop: (slot: any, element?: HTMLElement, position?: { x: number, y: number }) => {
      if (draggedAppointment && onAppointmentUpdate) {
        checkAndUpdateAppointment(draggedAppointment.id, slot.startTime, true)
        
        // Success feedback
        if (element && position && isTouchDevice) {
          touchFeedback.onBookingConfirm(element, position)
        }
      }
      
      // Clean up magnetic snap zones
      if (element && isTouchDevice) {
        touchDragManager.removeMagneticSnapZone(element)
      }
      
      updateDragState({ draggedAppointment: null, isDragging: false, dragOverSlot: null })
    }
  }
  
  // Performance monitoring
  useEffect(() => {
    const endMeasure = measureRender(`UnifiedCalendar-${view}`)
    return endMeasure
  }, [view, measureRender])
  
  // Sync with prop changes
  useEffect(() => {
    const coreDate = coreCurrentDate || currentDate
    if (!isSameDay(coreDate, currentDate)) {
      setCurrentDate(currentDate)
    }
  }, [currentDate, coreCurrentDate, setCurrentDate])

  // Filter appointments based on current view and filters
  const filteredAppointments = useMemo(() => {
    // Calculate date range based on view
    let startDate: Date
    let endDate: Date
    
    const currentCalendarDate = coreCurrentDate || currentDate
    switch (view) {
      case 'day':
        startDate = startOfDay(currentCalendarDate)
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 1) // Next day start
        break
      case 'week':
        startDate = startOfWeek(currentCalendarDate)
        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 7) // Next week start
        break
      case 'month':
        startDate = startOfMonth(currentCalendarDate)
        endDate = new Date(startDate)
        endDate.setMonth(endDate.getMonth() + 1) // Next month start
        break
    }
    
    return optimizedAppointmentFilter(appointments, {
      startDate,
      endDate,
      selectedBarberId
    })
  }, [appointments, coreCurrentDate, currentDate, view, selectedBarberId, optimizedAppointmentFilter])

  // Touch drag support for appointments
  useEffect(() => {
    if (!isTouchDevice) return

    const appointmentElements = document.querySelectorAll('.unified-calendar-appointment')
    const cleanupFunctions: (() => void)[] = []

    appointmentElements.forEach((appointmentEl) => {
      const appointmentId = appointmentEl.getAttribute('data-appointment-id')
      const appointment = filteredAppointments.find(apt => apt.id.toString() === appointmentId)
      
      if (!appointment || appointment.status === 'completed' || appointment.status === 'cancelled') {
        return
      }

      const cleanup = touchDragManager.initializeTouchDrag(appointmentEl as HTMLElement, {
        onDragStart: (element) => {
          updateDragState({ draggedAppointment: appointment, isDragging: true })
          return true
        },
        onDragMove: (element, position) => {
          // Find which day and time slot we're over
          const grid = document.querySelector('.day-grid, .week-grid')
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
            
            const weekStart = startOfWeek(coreCurrentDate || currentDate)
            const timeSlots = []
            for (let hour = startHour; hour < endHour; hour++) {
              for (let minute = 0; minute < 60; minute += slotDuration) {
                timeSlots.push({ hour, minute })
              }
            }
            
            if (dayIndex >= 0 && dayIndex < 7 && slotIndex >= 0 && slotIndex < timeSlots.length) {
              const targetDay = addDays(weekStart, dayIndex)
              const slot = timeSlots[slotIndex]
              updateDragState({ 
                dragOverSlot: { day: targetDay, hour: slot.hour, minute: slot.minute } 
              })
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
              updateDragState({ 
                dragOverSlot: { day: coreCurrentDate || currentDate, hour: slot.hour, minute: slot.minute } 
              })
            }
          }
        },
        onDragEnd: (element, dropTarget) => {
          if (draggedAppointment && onAppointmentUpdate && dragOverSlot) {
            const newDate = new Date(dragOverSlot.day)
            newDate.setHours(dragOverSlot.hour, dragOverSlot.minute, 0, 0)
            
            // Check if the new time is valid (not in the past for today)
            const now = new Date()
            const isToday = isSameDay(dragOverSlot.day, now)
            if (!isToday || newDate > now) {
              checkAndUpdateAppointment(draggedAppointment.id, newDate.toISOString(), true)
            }
          }
          updateDragState({
            draggedAppointment: null,
            dragOverSlot: null,
            isDragging: false
          })
        },
        canDrag: () => appointment.status !== 'completed' && appointment.status !== 'cancelled'
      })

      if (cleanup) cleanupFunctions.push(cleanup)
    })

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }, [filteredAppointments, isTouchDevice, view, coreCurrentDate, currentDate, draggedAppointment, dragOverSlot, onAppointmentUpdate, checkAndUpdateAppointment, startHour, endHour, slotDuration, updateDragState])
  
  const getStatusColor = useCallback((status: string) => {
    return memoizedStatusColor(status)
  }, [memoizedStatusColor])
  
  
  // Render view-specific content
  const renderView = () => {
    const viewProps = {
      currentDate: coreCurrentDate || currentDate,
      appointments: filteredAppointments,
      startHour,
      endHour,
      slotDuration,
      dragState: {
        draggedAppointment,
        dragOverSlot,
        isDragging,
        dropSuccess,
        dragOverDay
      },
      optimisticUpdates,
      selectedAppointmentId,
      onTimeSlotClick,
      onAppointmentClick,
      onAppointmentUpdate,
      onDragOver: dragHandlers.handleDragOver,
      onDragLeave: dragHandlers.handleDragLeave,
      onDragStart: dragHandlers.handleDragStart,
      onDragEnd: dragHandlers.handleDragEnd,
      onDrop: dragHandlers.handleDrop,
      onSelectAppointment: setSelectedAppointmentId,
      getStatusColor
    }

    switch (view) {
      case 'day':
        return <DayView {...viewProps} />
      case 'week':
        return <WeekView {...viewProps} />
      case 'month':
        return (
          <MonthView
            currentDate={coreCurrentDate || currentDate}
            appointments={filteredAppointments}
            selectedDate={selectedDate}
            onDayClick={onDayClick}
            onDayDoubleClick={onDayDoubleClick}
            onAppointmentClick={onAppointmentClick}
            onDragStart={dragHandlers.handleDragStart}
            onDragEnd={dragHandlers.handleDragEnd}
            onSelectDate={setSelectedDate}
            getStatusColor={getStatusColor}
            dragState={{
              draggedAppointment,
              isDragging
            }}
          />
        )
      default:
        return null
    }
  }
  
  // Determine loading context based on view
  const getLoadingContext = (): 'appointments' | 'calendar' | 'sync' | 'booking' => {
    if (view === 'day') return 'appointments'
    return 'calendar'
  }

  return (
    <div 
      className={`unified-calendar calendar-premium-background h-full flex flex-col shadow-2xl rounded-xl overflow-hidden ${className}`}
      onClick={() => {
        // Deselect appointment when clicking on background
        setSelectedAppointmentId(null)
      }}>
      {/* Navigation header with enhanced mobile touch targets */}
      <CalendarHeader
        view={view}
        currentDate={coreCurrentDate || currentDate}
        onNavigate={navigateDate}
        onTodayClick={() => {
          setCurrentDate(new Date())
          onDateChange?.(new Date())
        }}
        onRefresh={onRefresh}
        isLoading={isLoading}
      />
      
      {/* Pull-to-refresh indicator */}
      {isMobile && pullToRefresh.isPulling && (
        <div className="absolute top-0 left-0 right-0 z-50">
          <PullToRefreshIndicator state={pullToRefresh} />
        </div>
      )}

      {/* View content with loading manager and pull-to-refresh */}
      <div 
        className="calendar-content flex-1 overflow-auto relative" 
        ref={(el) => {
          if (swipeContainerRef.current !== el) {
            swipeContainerRef.current = el
          }
          if (calendarContainerRef.current !== el) {
            calendarContainerRef.current = el
          }
        }}
        role="region"
        aria-label={`Calendar ${view} view`}
        aria-live="polite"
        style={isMobile ? pullToRefresh.getPullStyles() : undefined}>
        <CalendarLoadingManager
          isLoading={isLoading}
          error={error}
          context={getLoadingContext()}
          onRetry={onRetry}
        >
          {/* Check for empty state */}
          {!isLoading && !error && filteredAppointments.length === 0 ? (
            <CalendarEmptyState
              view={view}
              selectedDate={selectedDate}
              onCreateAppointment={() => {
                // If there's a time slot click handler, use current time
                const now = new Date()
                onTimeSlotClick?.(now)
              }}
              message={selectedBarberId !== 'all' ? 
                `No appointments found for the selected barber` : 
                undefined
              }
            />
          ) : (
            <>
              {/* Swipe hint for mobile */}
              {isMobile && !isLoading && (
                <div className="absolute top-1/2 left-0 right-0 flex justify-between px-2 pointer-events-none opacity-30 z-10">
                  <ChevronLeftIcon className="w-6 h-6 text-gray-400 animate-bounce-left" />
                  <ChevronRightIcon className="w-6 h-6 text-gray-400 animate-bounce-right" />
                </div>
              )}
              
              {renderView()}
            </>
          )}
        </CalendarLoadingManager>
      </div>
      
      {/* Modals */}
      {showClientModal && selectedClient && (
        <ClientDetailModal
          client={selectedClient}
          isOpen={showClientModal}
          onClose={hideClientModal}
        />
      )}
      
      {showConflictModal && conflictAnalysis && (
        <ConflictResolutionModal
          isOpen={showConflictModal}
          onClose={hideConflictModal}
          conflicts={conflictAnalysis.conflicts}
          onResolve={(resolution) => {
            // Handle conflict resolution
            hideConflictModal()
          }}
        />
      )}
      
      {/* Keyboard Shortcut Indicator */}
      <KeyboardShortcutIndicator
        show={showIndicator && !isMobile && !isLoading}
        onClick={helpDialog.open}
      />
      
      {/* Keyboard Navigation */}
      <CalendarKeyboardNavigation
        currentDate={coreCurrentDate || currentDate}
        onDateChange={(date) => {
          setCurrentDate(date)
          onDateChange?.(date)
        }}
        currentView={view}
        onViewChange={onViewChange}
        onNewAppointment={() => {
          // Use current time for new appointment
          const now = new Date()
          onTimeSlotClick?.(now)
        }}
        onSearch={() => {
          // Implement search functionality if needed
          announce('Search functionality coming soon')
        }}
        onShowHelp={helpDialog.open}
        onRefresh={onRefresh}
        selectedAppointmentId={selectedAppointmentId}
        onSelectAppointment={(id) => {
          setSelectedAppointmentId(id)
          if (id) {
            const appointment = filteredAppointments.find(apt => apt.id.toString() === id)
            if (appointment) {
              announce(`Selected appointment with ${appointment.client_name}`)
            }
          }
        }}
        onEditAppointment={(id) => {
          const appointment = filteredAppointments.find(apt => apt.id.toString() === id)
          if (appointment) {
            onAppointmentClick?.(appointment)
          }
        }}
        onDeleteAppointment={(id) => {
          // Implement delete functionality
          announce('Delete functionality requires implementation')
        }}
        appointments={filteredAppointments.map(apt => ({ 
          id: apt.id.toString(), 
          date: new Date(apt.start_time) 
        }))}
        enabled={!isLoading && !isDragging}
      />
      
      {/* Touch Enhancement Indicators */}
      {isTouchDevice && (
        <>
          {/* Zoom Level Indicator */}
          <div className={`calendar-zoom-indicator ${showZoomIndicator ? 'active' : ''}`}>
            Zoom: {Math.round(zoomLevel * 100)}%
          </div>
          
          {/* Multi-touch Indicators */}
          {calendarTouchGestures.currentGesture?.type === 'pinch' && (
            <div className="multi-touch-indicator pinching active"
                 style={{
                   left: calendarTouchGestures.currentGesture.center?.x || 0,
                   top: calendarTouchGestures.currentGesture.center?.y || 0
                 }}>
            </div>
          )}
          
          {/* Long Press Indicator */}
          {calendarTouchGestures.currentGesture?.type === 'longPress' && (
            <div className="long-press-indicator active"
                 style={{
                   left: calendarTouchGestures.currentGesture.center?.x || 0,
                   top: calendarTouchGestures.currentGesture.center?.y || 0
                 }}>
            </div>
          )}
        </>
      )}

      {/* Touch Context Menu */}
      <TouchContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        appointment={contextMenu.appointment}
        timeSlot={contextMenu.timeSlot}
        actions={contextMenu.appointment ? 
          createAppointmentActions(contextMenu.appointment, {
            onEdit: () => {
              if (contextMenu.appointment && onAppointmentClick) {
                onAppointmentClick(contextMenu.appointment)
              }
            },
            onDelete: () => {
              if (contextMenu.appointment) {
                console.log('Delete appointment:', contextMenu.appointment.id)
                // Implement delete functionality
              }
            },
            onDuplicate: () => {
              if (contextMenu.appointment) {
                console.log('Duplicate appointment:', contextMenu.appointment.id)
                // Implement duplicate functionality
              }
            },
            onReschedule: () => {
              if (contextMenu.appointment && onAppointmentClick) {
                onAppointmentClick(contextMenu.appointment)
              }
            }
          }) :
          contextMenu.timeSlot ?
            createTimeSlotActions(contextMenu.timeSlot, {
              onBookNew: () => {
                if (contextMenu.timeSlot && onTimeSlotClick) {
                  onTimeSlotClick(contextMenu.timeSlot.date)
                }
              }
            }) : []
        }
        onClose={hideContextMenu}
        onActionComplete={(actionId) => {
          console.log('Context menu action completed:', actionId)
          hideContextMenu()
        }}
      />

      {/* Announcement Region for Screen Reader */}
      <div {...getAnnouncementRegionProps()} />
    </div>
  )
})

export default UnifiedCalendar
export type { UnifiedCalendarProps, CalendarView }