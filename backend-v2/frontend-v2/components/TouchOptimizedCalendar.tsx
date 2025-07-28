'use client'

import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { isSameDay, startOfDay, startOfMonth, startOfWeek, endOfWeek, addDays, format, addMonths, subMonths } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Smartphone,
  Vibrate,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createTouchGestureManager, MobileTouchGestureManager, SwipeGesture, TapGesture, DragGesture, LongPressGesture } from '@/lib/mobile-touch-gestures'
import { useHapticFeedback } from '@/lib/haptic-feedback-system'

interface TouchOptimizedCalendarProps {
  // Core props
  view: 'day' | 'week' | 'month'
  onViewChange?: (view: 'day' | 'week' | 'month') => void
  currentDate?: Date
  onDateChange?: (date: Date) => void
  
  // Data props
  appointments: any[]
  barbers?: any[]
  
  // Configuration
  startHour?: number
  endHour?: number
  slotDuration?: number
  isLoading?: boolean
  
  // Event handlers
  onAppointmentClick?: (appointment: any) => void
  onTimeSlotClick?: (date: Date, barberId?: number) => void
  onAppointmentUpdate?: (appointmentId: number, newStartTime: string, isDragDrop?: boolean) => void
  
  // Style props
  className?: string
}

export function TouchOptimizedCalendar({
  view = 'week',
  onViewChange,
  currentDate = new Date(),
  onDateChange,
  appointments = [],
  barbers = [],
  startHour = 8,
  endHour = 19,
  slotDuration = 30,
  isLoading = false,
  onAppointmentClick,
  onTimeSlotClick,
  onAppointmentUpdate,
  className = ""
}: TouchOptimizedCalendarProps) {
  
  const [selectedDate, setSelectedDate] = useState(currentDate)
  const [draggedAppointment, setDraggedAppointment] = useState<any>(null)
  const [touchFeedback, setTouchFeedback] = useState<{ type: string; message: string } | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1.0)
  const [isGestureActive, setIsGestureActive] = useState(false)
  
  const calendarRef = useRef<HTMLDivElement>(null)
  const gestureManagerRef = useRef<MobileTouchGestureManager | null>(null)
  const { toast } = useToast()
  const { feedback: triggerHaptic } = useHapticFeedback({
    debugMode: false,
    fallbackToSound: true
  })

  // Initialize gesture manager
  useEffect(() => {
    if (calendarRef.current && !gestureManagerRef.current) {
      gestureManagerRef.current = createTouchGestureManager(calendarRef.current, {
        swipe: {
          threshold: 60,
          velocity: 0.4,
          maxTime: 800,
          preventScroll: true
        },
        tap: {
          maxTime: 300,
          maxDistance: 15,
          doubleTapDelay: 350
        },
        longPress: {
          duration: 600,
          maxDistance: 20
        },
        drag: {
          threshold: 15,
          snapBack: true,
          hapticFeedback: true
        }
      })

      // Setup gesture handlers
      gestureManagerRef.current
        .onSwipe(handleSwipeGesture)
        .onTap(handleTapGesture)
        .onLongPress(handleLongPressGesture)
        .onDrag(handleDragGesture)
    }

    return () => {
      gestureManagerRef.current?.destroy()
      gestureManagerRef.current = null
    }
  }, [])

  // Handle swipe gestures for navigation
  const handleSwipeGesture = useCallback((gesture: SwipeGesture) => {
    setIsGestureActive(true)
    triggerHaptic('swipe_navigation')
    
    let newDate = new Date(selectedDate)
    
    switch (gesture.direction) {
      case 'left':
        // Swipe left = next period
        if (view === 'day') {
          newDate = addDays(selectedDate, 1)
        } else if (view === 'week') {
          newDate = addDays(selectedDate, 7)
        } else if (view === 'month') {
          newDate = addMonths(selectedDate, 1)
        }
        break
        
      case 'right':
        // Swipe right = previous period
        if (view === 'day') {
          newDate = addDays(selectedDate, -1)
        } else if (view === 'week') {
          newDate = addDays(selectedDate, -7)
        } else if (view === 'month') {
          newDate = addMonths(selectedDate, -1)
        }
        break
        
      case 'up':
        // Swipe up = zoom in to more detailed view
        if (view === 'month') {
          onViewChange?.('week')
          triggerHaptic('zoom_in')
        } else if (view === 'week') {
          onViewChange?.('day')
          triggerHaptic('zoom_in')
        }
        break
        
      case 'down':
        // Swipe down = zoom out to less detailed view
        if (view === 'day') {
          onViewChange?.('week')
          triggerHaptic('zoom_out')
        } else if (view === 'week') {
          onViewChange?.('month')
          triggerHaptic('zoom_out')
        }
        break
    }
    
    if (newDate !== selectedDate) {
      setSelectedDate(newDate)
      onDateChange?.(newDate)
      triggerHaptic('date_navigation')
      
      showTouchFeedback('swipe', `Navigated to ${format(newDate, 'MMM d, yyyy')}`)
    }
    
    setTimeout(() => setIsGestureActive(false), 200)
  }, [selectedDate, view, onDateChange, onViewChange, triggerHaptic])

  // Handle tap gestures
  const handleTapGesture = useCallback((gesture: TapGesture, event: TouchEvent) => {
    const target = document.elementFromPoint(gesture.point.x, gesture.point.y)
    if (!target) return

    // Find the closest appointment or time slot
    const appointmentElement = target.closest('[data-appointment-id]')
    const timeSlotElement = target.closest('[data-time-slot]')
    
    if (appointmentElement) {
      const appointmentId = appointmentElement.getAttribute('data-appointment-id')
      const appointment = appointments.find(apt => apt.id.toString() === appointmentId)
      
      if (appointment) {
        if (gesture.isDoubleTap) {
          // Double tap to edit appointment
          triggerHaptic('double_tap')
          showTouchFeedback('double-tap', 'Opening appointment editor...')
          onAppointmentClick?.(appointment)
        } else {
          // Single tap to select appointment
          triggerHaptic('appointment_select')
          showTouchFeedback('tap', `Selected: ${appointment.client_name || 'Appointment'}`)
          // Could show appointment details in a tooltip or panel
        }
      }
    } else if (timeSlotElement) {
      const dateStr = timeSlotElement.getAttribute('data-date')
      const timeStr = timeSlotElement.getAttribute('data-time')
      const barberId = timeSlotElement.getAttribute('data-barber-id')
      
      if (dateStr && timeStr) {
        const slotDate = new Date(`${dateStr}T${timeStr}`)
        
        if (gesture.isDoubleTap) {
          // Double tap to create new appointment
          triggerHaptic('double_tap')
          showTouchFeedback('double-tap', 'Creating new appointment...')
          onTimeSlotClick?.(slotDate, barberId ? parseInt(barberId) : undefined)
        } else {
          // Single tap to select time slot
          triggerHaptic('time_slot_select')
          showTouchFeedback('tap', `Selected: ${format(slotDate, 'h:mm a')}`)
        }
      }
    }
  }, [appointments, onAppointmentClick, onTimeSlotClick, triggerHaptic])

  // Handle long press gestures
  const handleLongPressGesture = useCallback((gesture: LongPressGesture) => {
    const target = document.elementFromPoint(gesture.point.x, gesture.point.y)
    if (!target) return

    const appointmentElement = target.closest('[data-appointment-id]')
    
    if (appointmentElement) {
      const appointmentId = appointmentElement.getAttribute('data-appointment-id')
      const appointment = appointments.find(apt => apt.id.toString() === appointmentId)
      
      if (appointment) {
        triggerHaptic('long_press')
        showTouchFeedback('long-press', 'Appointment options available')
        // Could show context menu or options for the appointment
        // For now, we'll just provide haptic feedback and visual indication
      }
    } else {
      // Long press on empty area - could show global options
      triggerHaptic('long_press')
      showTouchFeedback('long-press', 'Calendar options available')
    }
  }, [appointments, triggerHaptic])

  // Handle drag gestures for appointment rescheduling
  const handleDragGesture = useCallback((gesture: DragGesture, event: TouchEvent) => {
    const target = document.elementFromPoint(gesture.startPoint.x, gesture.startPoint.y)
    if (!target) return

    const appointmentElement = target.closest('[data-appointment-id]')
    
    if (!appointmentElement) return

    const appointmentId = appointmentElement.getAttribute('data-appointment-id')
    const appointment = appointments.find(apt => apt.id.toString() === appointmentId)
    
    if (!appointment) return

    switch (gesture.phase) {
      case 'start':
        setDraggedAppointment(appointment)
        triggerHaptic('drag_start')
        showTouchFeedback('drag-start', `Moving: ${appointment.client_name || 'Appointment'}`)
        
        // Add visual feedback to the dragged element
        appointmentElement.classList.add('dragging', 'touch-dragging')
        break
        
      case 'move':
        // Update visual position during drag
        if (appointmentElement) {
          appointmentElement.style.transform = `translate(${gesture.delta.x}px, ${gesture.delta.y}px)`
          appointmentElement.style.zIndex = '1000'
          appointmentElement.style.opacity = '0.8'
        }
        
        // Find potential drop target
        const dropTarget = document.elementFromPoint(
          gesture.currentPoint.x, 
          gesture.currentPoint.y
        )?.closest('[data-time-slot]')
        
        if (dropTarget) {
          dropTarget.classList.add('drop-target-highlight')
          triggerHaptic('drag_over_valid')
          showTouchFeedback('drag-over', 'Drop here to reschedule')
        }
        break
        
      case 'end':
        // Find drop target and handle appointment move
        const finalTarget = document.elementFromPoint(
          gesture.currentPoint.x,
          gesture.currentPoint.y
        )?.closest('[data-time-slot]')
        
        if (finalTarget && draggedAppointment) {
          const newDateStr = finalTarget.getAttribute('data-date')
          const newTimeStr = finalTarget.getAttribute('data-time')
          
          if (newDateStr && newTimeStr) {
            const newStartTime = `${newDateStr}T${newTimeStr}`
            onAppointmentUpdate?.(draggedAppointment.id, newStartTime, true)
            triggerHaptic('drag_success')
            showTouchFeedback('drag-success', 'Appointment rescheduled!')
          }
        } else {
          triggerHaptic('drag_cancel')
          showTouchFeedback('drag-cancel', 'Move cancelled')
        }
        
        // Clean up visual feedback
        this.cleanupDragVisuals()
        setDraggedAppointment(null)
        break
        
      case 'cancel':
        triggerHaptic('drag_cancel')
        showTouchFeedback('drag-cancel', 'Move cancelled')
        this.cleanupDragVisuals()
        setDraggedAppointment(null)
        break
    }
  }, [appointments, draggedAppointment, onAppointmentUpdate, triggerHaptic])

  // Cleanup drag visual effects
  const cleanupDragVisuals = useCallback(() => {
    document.querySelectorAll('.dragging').forEach(el => {
      el.classList.remove('dragging', 'touch-dragging')
      ;(el as HTMLElement).style.transform = ''
      ;(el as HTMLElement).style.zIndex = ''
      ;(el as HTMLElement).style.opacity = ''
    })
    
    document.querySelectorAll('.drop-target-highlight').forEach(el => {
      el.classList.remove('drop-target-highlight')
    })
  }, [])

  // Show touch feedback to user
  const showTouchFeedback = useCallback((type: string, message: string) => {
    setTouchFeedback({ type, message })
    
    // Auto-hide feedback after 2 seconds
    setTimeout(() => {
      setTouchFeedback(null)
    }, 2000)
    
    // Show toast for important actions
    if (type.includes('success') || type.includes('error')) {
      toast({
        title: type.includes('success') ? 'Success' : 'Action',
        description: message,
        duration: 1500
      })
    }
  }, [toast])

  // Generate time slots with larger touch targets
  const generateTimeSlots = useMemo(() => {
    const slots = []
    const totalMinutes = (endHour - startHour) * 60
    const slotsCount = totalMinutes / slotDuration
    
    for (let i = 0; i < slotsCount; i++) {
      const minutes = startHour * 60 + i * slotDuration
      const hour = Math.floor(minutes / 60)
      const minute = minutes % 60
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      
      slots.push({
        time: timeString,
        displayTime: format(new Date(0, 0, 0, hour, minute), 'h:mm a'),
        hour,
        minute
      })
    }
    
    return slots
  }, [startHour, endHour, slotDuration])

  // Render touch-optimized time slot
  const renderTimeSlot = useCallback((slot: any, date: Date, barberId?: number) => {
    const slotDate = new Date(date)
    slotDate.setHours(slot.hour, slot.minute, 0, 0)
    
    const appointment = appointments.find(apt => {
      const aptDate = new Date(apt.start_time)
      return isSameDay(aptDate, slotDate) && 
             aptDate.getHours() === slot.hour && 
             aptDate.getMinutes() === slot.minute &&
             (!barberId || apt.barber_id === barberId)
    })

    return (
      <div
        key={`${format(date, 'yyyy-MM-dd')}-${slot.time}-${barberId || 'all'}`}
        className={`
          touch-time-slot relative min-h-[60px] p-2 border-b border-gray-100
          transition-all duration-200 ease-in-out
          ${appointment ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}
          ${isGestureActive ? 'pointer-events-none' : 'cursor-pointer'}
        `}
        data-time-slot="true"
        data-date={format(date, 'yyyy-MM-dd')}
        data-time={slot.time}
        data-barber-id={barberId}
      >
        {/* Time label with larger touch target */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-600 select-none">
            {slot.displayTime}
          </span>
          {appointment && (
            <Badge variant="secondary" className="text-xs">
              Booked
            </Badge>
          )}
        </div>
        
        {/* Appointment display with touch optimization */}
        {appointment && (
          <div
            className={`
              touch-appointment bg-blue-100 border border-blue-200 rounded-md p-3
              min-h-[44px] flex items-center justify-between
              transition-all duration-200 ease-in-out
              hover:bg-blue-200 active:bg-blue-300
              ${draggedAppointment?.id === appointment.id ? 'dragging' : ''}
            `}
            data-appointment-id={appointment.id}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-900 truncate">
                {appointment.client_name || 'Unknown Client'}
              </p>
              <p className="text-xs text-blue-700 truncate">
                {appointment.service_name || 'Service'}
              </p>
            </div>
            
            {/* Touch indicator */}
            <div className="flex items-center gap-1 ml-2">
              <Smartphone className="w-3 h-3 text-blue-600" />
              {draggedAppointment?.id === appointment.id && (
                <Vibrate className="w-3 h-3 text-blue-600 animate-pulse" />
              )}
            </div>
          </div>
        )}
        
        {/* Empty slot indicator */}
        {!appointment && (
          <div className="touch-empty-slot flex items-center justify-center h-8 border-2 border-dashed border-gray-200 rounded-md">
            <span className="text-xs text-gray-400">Available</span>
          </div>
        )}
      </div>
    )
  }, [appointments, draggedAppointment, isGestureActive])

  // Render calendar based on view
  const renderCalendarContent = () => {
    switch (view) {
      case 'day':
        return (
          <div className="touch-day-view space-y-2">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-semibold text-lg">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </h3>
              </div>
              <div className="divide-y">
                {generateTimeSlots.map(slot => renderTimeSlot(slot, selectedDate))}
              </div>
            </div>
          </div>
        )
        
      case 'week':
        const weekStart = startOfWeek(selectedDate)
        const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
        
        return (
          <div className="touch-week-view">
            <div className="grid grid-cols-7 gap-1 mb-4">
              {weekDays.map(day => (
                <div key={day.toISOString()} className="text-center p-2">
                  <div className="text-sm font-medium text-gray-600">
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-lg font-bold mt-1 p-2 rounded-lg ${
                    isSameDay(day, selectedDate) ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                  }`}>
                    {format(day, 'd')}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
              {weekDays.map(day => (
                <div key={day.toISOString()} className="bg-white rounded-lg shadow-sm border">
                  <div className="p-2 border-b bg-gray-50 text-center">
                    <span className="font-medium text-sm">
                      {format(day, 'MMM d')}
                    </span>
                  </div>
                  <div className="divide-y max-h-96 overflow-y-auto">
                    {generateTimeSlots.slice(0, 8).map(slot => renderTimeSlot(slot, day))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
        
      case 'month':
        const monthStart = startOfMonth(selectedDate)
        const monthWeekStart = startOfWeek(monthStart)
        const monthDays = Array.from({ length: 42 }, (_, i) => addDays(monthWeekStart, i))
        
        return (
          <div className="touch-month-view">
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-3 text-center text-sm font-medium text-gray-600 bg-gray-50 rounded-t-lg">
                  {day}
                </div>
              ))}
              
              {monthDays.map(day => {
                const dayAppointments = appointments.filter(apt => 
                  isSameDay(new Date(apt.start_time), day)
                )
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`
                      touch-month-day min-h-[80px] p-2 border border-gray-200 bg-white
                      transition-all duration-200 ease-in-out
                      hover:bg-gray-50 active:bg-gray-100
                      ${isSameDay(day, selectedDate) ? 'bg-blue-50 border-blue-300' : ''}
                      ${!isSameDay(day, monthStart) && day.getMonth() !== monthStart.getMonth() ? 'text-gray-400 bg-gray-50' : ''}
                    `}
                    data-date={format(day, 'yyyy-MM-dd')}
                    onClick={() => {
                      setSelectedDate(day)
                      onDateChange?.(day)
                    }}
                  >
                    <div className="font-medium text-sm mb-1">
                      {format(day, 'd')}
                    </div>
                    
                    {dayAppointments.length > 0 && (
                      <div className="space-y-1">
                        {dayAppointments.slice(0, 2).map(apt => (
                          <div
                            key={apt.id}
                            className="bg-blue-100 text-blue-900 text-xs p-1 rounded truncate"
                            data-appointment-id={apt.id}
                          >
                            {apt.client_name || 'Appointment'}
                          </div>
                        ))}
                        {dayAppointments.length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{dayAppointments.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
        
      default:
        return null
    }
  }

  return (
    <div className={`touch-optimized-calendar ${className}`} ref={calendarRef}>
      {/* Touch feedback indicator */}
      {touchFeedback && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <Alert className="bg-blue-50 border-blue-200">
            <Smartphone className="h-4 w-4" />
            <AlertDescription className="text-blue-900">
              {touchFeedback.message}
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {/* Header with touch-optimized navigation */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  const newDate = view === 'day' ? addDays(selectedDate, -1) :
                                 view === 'week' ? addDays(selectedDate, -7) :
                                 addMonths(selectedDate, -1)
                  setSelectedDate(newDate)
                  onDateChange?.(newDate)
                }}
                className="h-12 w-12 p-0"
              >
                <ChevronLeftIcon className="h-6 w-6" />
              </Button>
              
              <div className="text-center min-w-[200px]">
                <CardTitle className="text-lg">
                  {view === 'day' && format(selectedDate, 'EEEE, MMM d')}
                  {view === 'week' && `Week of ${format(startOfWeek(selectedDate), 'MMM d')}`}
                  {view === 'month' && format(selectedDate, 'MMMM yyyy')}
                </CardTitle>
              </div>
              
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  const newDate = view === 'day' ? addDays(selectedDate, 1) :
                                 view === 'week' ? addDays(selectedDate, 7) :
                                 addMonths(selectedDate, 1)
                  setSelectedDate(newDate)
                  onDateChange?.(newDate)
                }}
                className="h-12 w-12 p-0"
              >
                <ChevronRightIcon className="h-6 w-6" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedDate(new Date())
                  onDateChange?.(new Date())
                }}
                className="h-10"
              >
                Today
              </Button>
            </div>
          </div>
          
          {/* View selector with touch-optimized buttons */}
          <div className="flex justify-center gap-1 mt-3">
            {(['day', 'week', 'month'] as const).map(viewType => (
              <Button
                key={viewType}
                variant={view === viewType ? 'default' : 'outline'}
                onClick={() => onViewChange?.(viewType)}
                className="h-10 px-6 capitalize"
              >
                {viewType}
              </Button>
            ))}
          </div>
        </CardHeader>
      </Card>
      
      {/* Calendar content */}
      <div className="calendar-content">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          renderCalendarContent()
        )}
      </div>
      
      {/* Touch interaction instructions */}
      <Card className="mt-4 bg-gray-50">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <ArrowPathIcon className="h-4 w-4" />
              <span>Swipe to navigate</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Tap to select</span>
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4" />
              <span>Double-tap to book</span>
            </div>
            <div className="flex items-center gap-2">
              <Vibrate className="h-4 w-4" />
              <span>Drag to reschedule</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Custom styles for touch interactions */}
      <style jsx>{`
        .touch-time-slot {
          touch-action: manipulation;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        
        .touch-appointment {
          touch-action: manipulation;
          transform-origin: center;
        }
        
        .touch-appointment.dragging {
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          transform: scale(1.05);
        }
        
        .touch-appointment.touch-dragging {
          transition: none !important;
        }
        
        .drop-target-highlight {
          background-color: rgba(59, 130, 246, 0.1) !important;
          border-color: rgb(59, 130, 246) !important;
          animation: pulse 1s infinite;
        }
        
        .touch-month-day {
          touch-action: manipulation;
          user-select: none;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        /* Mobile-specific optimizations */
        @media (max-width: 768px) {
          .touch-time-slot {
            min-height: 70px;
            padding: 12px;
          }
          
          .touch-appointment {
            min-height: 50px;
            padding: 12px;
          }
          
          .touch-month-day {
            min-height: 90px;
            padding: 8px;
          }
        }
      `}</style>
    </div>
  )
}

export default TouchOptimizedCalendar