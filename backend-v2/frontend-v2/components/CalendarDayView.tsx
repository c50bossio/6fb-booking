'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { format, addHours, addMinutes, isSameDay, startOfDay, addDays } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline'
import { Button } from './ui/Button'
import { parseAPIDate } from '@/lib/timezone'
import Image from 'next/image'
import ClientDetailModal from './modals/ClientDetailModal'
import { touchDragManager, TouchDragManager } from '@/lib/touch-utils'
import { conflictManager, ConflictAnalysis, ConflictResolution } from '@/lib/appointment-conflicts'
import ConflictResolutionModal from './modals/ConflictResolutionModal'
import { useCalendarPerformance } from '@/hooks/useCalendarPerformance'
import { useResponsive } from '@/hooks/useResponsive'
import CalendarDayViewMobile from './calendar/CalendarDayViewMobile'

interface Appointment {
  id: number
  start_time: string
  end_time?: string
  service_name: string
  client_name?: string
  client_email?: string
  client_phone?: string
  barber_id?: number
  barber_name?: string
  status: string
  duration_minutes?: number
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

interface CalendarDayViewProps {
  appointments: Appointment[]
  barbers?: Barber[]
  selectedBarberId?: number | 'all'
  onBarberSelect?: (barberId: number | 'all') => void
  onAppointmentClick?: (appointment: Appointment) => void
  onClientClick?: (client: any) => void
  onTimeSlotClick?: (date: Date, barberId?: number) => void
  onAppointmentUpdate?: (appointmentId: number, newStartTime: string) => void
  clients?: any[]
  startHour?: number
  endHour?: number
  slotDuration?: number
  currentDate?: Date
  onDateChange?: (date: Date) => void
}

const CalendarDayView = React.memo(function CalendarDayView({
  appointments,
  barbers = [],
  selectedBarberId = 'all',
  onBarberSelect,
  onAppointmentClick,
  onClientClick,
  onTimeSlotClick,
  onAppointmentUpdate,
  clients = [],
  startHour = 6,
  endHour = 22,
  slotDuration = 30,
  currentDate = new Date(),
  onDateChange
}: CalendarDayViewProps) {
  const [currentDay, setCurrentDay] = useState(() => currentDate)
  const [selectedClient, setSelectedClient] = useState<any | null>(null)
  const [showClientModal, setShowClientModal] = useState(false)
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<{ hour: number; minute: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dropSuccess, setDropSuccess] = useState<{ hour: number; minute: number } | null>(null)
  const [selectedAppointments, setSelectedAppointments] = useState<Set<number>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null)
  const [conflictAnalysis, setConflictAnalysis] = useState<ConflictAnalysis | null>(null)
  const [pendingUpdate, setPendingUpdate] = useState<{ appointmentId: number; newStartTime: string } | null>(null)
  const [showConflictModal, setShowConflictModal] = useState(false)
  const scheduleColumnRef = useRef<HTMLDivElement>(null)
  const isTouchDevice = TouchDragManager.isTouchDevice()
  
  // Responsive hook
  const { isMobile } = useResponsive()
  
  // Performance monitoring and optimization
  const { measureRender, optimizedAppointmentFilter, memoizedDateCalculations } = useCalendarPerformance()
  
  // Performance monitoring
  useEffect(() => {
    const endMeasure = measureRender('CalendarDayView')
    return endMeasure
  })

  // Sync currentDay with currentDate prop changes
  useEffect(() => {
    if (!isSameDay(currentDay, currentDate)) {
      setCurrentDay(currentDate)
    }
  }, [currentDate, currentDay])

  // Memoized time slots generation
  const timeSlots = useMemo(() => {
    const slots: { hour: number; minute: number }[] = []
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        slots.push({ hour, minute })
      }
    }
    return slots
  }, [startHour, endHour, slotDuration])

  // Optimized appointment filtering with performance hook
  const filteredAppointments = useMemo(() => {
    return optimizedAppointmentFilter(appointments, {
      barberId: selectedBarberId,
      startDate: currentDay,
      endDate: addDays(currentDay, 1)
    })
  }, [appointments, selectedBarberId, currentDay, optimizedAppointmentFilter])

  // Optimized navigation functions with useCallback
  const previousDay = useCallback(() => {
    const newDate = addDays(currentDay, -1)
    setCurrentDay(newDate)
    onDateChange?.(newDate)
  }, [currentDay, onDateChange])

  const nextDay = useCallback(() => {
    const newDate = addDays(currentDay, 1)
    setCurrentDay(newDate)
    onDateChange?.(newDate)
  }, [currentDay, onDateChange])

  const goToToday = useCallback(() => {
    const today = new Date()
    setCurrentDay(today)
    onDateChange?.(today)
  }, [onDateChange])

  // Get appointment position and height
  const getAppointmentStyle = (appointment: Appointment) => {
    const start = parseAPIDate(appointment.start_time)
    let end: Date
    
    if (appointment.end_time) {
      end = parseAPIDate(appointment.end_time)
    } else if (appointment.duration_minutes) {
      end = addMinutes(start, appointment.duration_minutes)
    } else {
      // Default to 60 minutes if no end time or duration
      end = addMinutes(start, 60)
    }
    
    const startMinutes = start.getHours() * 60 + start.getMinutes()
    const endMinutes = end.getHours() * 60 + end.getMinutes()
    const slotStartMinutes = startHour * 60
    
    // Each hour = 80px, each slot (30min) = 40px
    const hourHeight = 80
    const slotHeight = hourHeight / (60 / slotDuration)
    
    const top = ((startMinutes - slotStartMinutes) / slotDuration) * slotHeight
    const height = ((endMinutes - startMinutes) / slotDuration) * slotHeight
    
    return {
      top: `${top}px`,
      height: `${Math.max(height, 40)}px`, // Minimum height of 40px
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'scheduled':
        return 'bg-green-500 hover:bg-green-600 border-green-600'
      case 'pending':
        return 'bg-yellow-500 hover:bg-yellow-600 border-yellow-600'
      case 'cancelled':
        return 'bg-red-500 hover:bg-red-600 border-red-600'
      case 'completed':
        return 'bg-blue-500 hover:bg-blue-600 border-blue-600'
      default:
        return 'bg-purple-500 hover:bg-purple-600 border-purple-600'
    }
  }

  // Format barber name
  const getBarberName = (barber: Barber) => {
    return barber.name || 
           (barber.first_name && barber.last_name ? `${barber.first_name} ${barber.last_name}` : '') ||
           barber.email.split('@')[0]
  }

  // Check if it's current time slot
  const isCurrentTimeSlot = (hour: number, minute: number) => {
    const now = new Date()
    const isToday = isSameDay(currentDay, now)
    if (!isToday) return false
    
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    
    return hour === currentHour && minute <= currentMinute && currentMinute < minute + slotDuration
  }

  // Get time slot from screen position (for touch drag)
  const getTimeSlotFromPosition = (clientY: number) => {
    if (!scheduleColumnRef.current) return null
    
    const rect = scheduleColumnRef.current.getBoundingClientRect()
    const relativeY = clientY - rect.top
    const slotHeight = 40 // 40px per slot
    const slotIndex = Math.floor(relativeY / slotHeight)
    
    if (slotIndex < 0 || slotIndex >= timeSlots.length) return null
    
    return timeSlots[slotIndex]
  }

  // Check for conflicts before updating appointment
  const checkAndUpdateAppointment = (appointmentId: number, newStartTime: string) => {
    const appointment = appointments.find(apt => apt.id === appointmentId)
    if (!appointment) return

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
      // Show conflict resolution modal
      setConflictAnalysis(analysis)
      setPendingUpdate({ appointmentId, newStartTime })
      setShowConflictModal(true)
    } else {
      // No significant conflicts, proceed with update
      onAppointmentUpdate?.(appointmentId, newStartTime)
    }
  }

  // Handle conflict resolution
  const handleConflictResolution = (resolution: ConflictResolution) => {
    if (!pendingUpdate) return

    let finalStartTime = pendingUpdate.newStartTime
    let finalAppointmentId = pendingUpdate.appointmentId

    // Apply resolution changes
    if (resolution.suggestedStartTime) {
      finalStartTime = resolution.suggestedStartTime
    }
    
    // For now, we'll just update the time. In a full implementation, 
    // you'd also handle barber changes and duration adjustments
    onAppointmentUpdate?.(finalAppointmentId, finalStartTime)
    
    setShowConflictModal(false)
    setConflictAnalysis(null)
    setPendingUpdate(null)
  }

  // Handle proceeding despite conflicts
  const handleProceedAnyway = () => {
    if (!pendingUpdate) return
    
    onAppointmentUpdate?.(pendingUpdate.appointmentId, pendingUpdate.newStartTime)
    
    setShowConflictModal(false)
    setConflictAnalysis(null)
    setPendingUpdate(null)
  }

  // Handle cancelling the update
  const handleCancelConflictResolution = () => {
    setShowConflictModal(false)
    setConflictAnalysis(null)
    setPendingUpdate(null)
  }

  // Touch drag support for appointments
  useEffect(() => {
    if (!isTouchDevice) return

    const appointments = document.querySelectorAll('.calendar-appointment')
    const cleanupFunctions: (() => void)[] = []

    appointments.forEach((appointmentEl) => {
      const appointmentId = appointmentEl.getAttribute('data-appointment-id')
      const appointment = filteredAppointments.find(apt => apt.id.toString() === appointmentId)
      
      if (!appointment || appointment.status === 'completed' || appointment.status === 'cancelled') {
        return
      }

      const cleanup = touchDragManager.initializeTouchDrag(appointmentEl as HTMLElement, {
        onDragStart: (element) => {
          setDraggedAppointment(appointment)
          setIsDragging(true)
          return true
        },
        onDragMove: (element, position) => {
          const slot = getTimeSlotFromPosition(position.clientY)
          if (slot) {
            setDragOverSlot({ hour: slot.hour, minute: slot.minute })
          }
        },
        onDragEnd: (element, dropTarget) => {
          if (draggedAppointment && onAppointmentUpdate) {
            const slot = getTimeSlotFromPosition(touchDragManager.getDragState().currentPosition?.clientY || 0)
            if (slot) {
              const newDate = new Date(currentDay)
              newDate.setHours(slot.hour, slot.minute, 0, 0)
              
              // Check if the new time is valid (not in the past for today)
              const now = new Date()
              const isToday = isSameDay(currentDay, now)
              if (!isToday || newDate > now) {
                checkAndUpdateAppointment(draggedAppointment.id, newDate.toISOString())
              }
            }
          }
          setDraggedAppointment(null)
          setDragOverSlot(null)
          setIsDragging(false)
        },
        canDrag: () => appointment.status !== 'completed' && appointment.status !== 'cancelled'
      })

      cleanupFunctions.push(cleanup)
    })

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }, [filteredAppointments, currentDay, onAppointmentUpdate, isTouchDevice])

  // Selection helpers
  const toggleAppointmentSelection = (appointmentId: number, event?: React.MouseEvent) => {
    if (!event) {
      // Simple toggle
      setSelectedAppointments(prev => {
        const newSet = new Set(prev)
        if (newSet.has(appointmentId)) {
          newSet.delete(appointmentId)
        } else {
          newSet.add(appointmentId)
        }
        return newSet
      })
      return
    }

    const appointmentIndex = filteredAppointments.findIndex(apt => apt.id === appointmentId)
    
    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd click - toggle individual selection
      setSelectedAppointments(prev => {
        const newSet = new Set(prev)
        if (newSet.has(appointmentId)) {
          newSet.delete(appointmentId)
        } else {
          newSet.add(appointmentId)
        }
        return newSet
      })
      setLastClickedIndex(appointmentIndex)
    } else if (event.shiftKey && lastClickedIndex !== null) {
      // Shift click - select range
      const start = Math.min(lastClickedIndex, appointmentIndex)
      const end = Math.max(lastClickedIndex, appointmentIndex)
      const rangeIds = filteredAppointments.slice(start, end + 1).map(apt => apt.id)
      
      setSelectedAppointments(prev => {
        const newSet = new Set(prev)
        rangeIds.forEach(id => newSet.add(id))
        return newSet
      })
    } else {
      // Regular click - select only this appointment
      setSelectedAppointments(new Set([appointmentId]))
      setLastClickedIndex(appointmentIndex)
    }
  }

  const selectAllAppointments = useCallback(() => {
    const selectableAppointments = filteredAppointments.filter(
      apt => apt.status !== 'completed' && apt.status !== 'cancelled'
    )
    setSelectedAppointments(new Set(selectableAppointments.map(apt => apt.id)))
  }, [filteredAppointments])

  const clearSelection = useCallback(() => {
    setSelectedAppointments(new Set())
    setIsSelectionMode(false)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape - clear selection
      if (event.key === 'Escape') {
        clearSelection()
      }
      
      // Ctrl/Cmd + A - select all
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault()
        selectAllAppointments()
      }
      
      // Delete - delete selected appointments
      if (event.key === 'Delete') {
        event.preventDefault()
        // Check current selection and implement delete logic here
        console.log('Delete key pressed')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectAllAppointments, clearSelection])

  // Auto-enable selection mode when appointments are selected
  useEffect(() => {
    setIsSelectionMode(selectedAppointments.size > 0)
  }, [selectedAppointments])
  

  // Render mobile view on small screens
  if (isMobile) {
    return (
      <CalendarDayViewMobile
        selectedDate={currentDay}
        appointments={appointments}
        onAppointmentClick={onAppointmentClick}
        onTimeSlotClick={(date, hour, minute) => {
          const slotDate = new Date(date)
          slotDate.setHours(hour, minute, 0, 0)
          onTimeSlotClick?.(slotDate)
        }}
        onCreateAppointment={() => onTimeSlotClick?.(currentDay)}
        onDateChange={(date) => {
          setCurrentDay(date)
          onDateChange?.(date)
        }}
        selectedBarberId={selectedBarberId}
        startHour={startHour}
        endHour={endHour}
      />
    )
  }

  // Desktop view
  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm h-full flex flex-col">
      {/* Selection toolbar */}
      {isSelectionMode && (
        <div className="bg-primary-50 dark:bg-primary-900/20 border-b border-primary-200 dark:border-primary-800 p-3 flex items-center justify-between animate-slide-down">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
              {selectedAppointments.size} appointment{selectedAppointments.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={selectAllAppointments}
              className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
            >
              Select All
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Implement bulk reschedule logic
                console.log('Bulk reschedule:', Array.from(selectedAppointments))
              }}
              className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Reschedule
            </button>
            <button
              onClick={() => {
                // Implement bulk status change
                console.log('Bulk status change:', Array.from(selectedAppointments))
              }}
              className="px-3 py-1.5 text-xs bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Change Status
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 text-xs bg-gray-400 text-white rounded-md hover:bg-gray-500 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
        {/* Barber Filter */}
        {barbers.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              <button
                onClick={() => onBarberSelect?.('all')}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                  selectedBarberId === 'all' ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                  All
                </div>
                <span className="text-xs text-gray-700 dark:text-gray-300">All Staff</span>
              </button>
              
              {barbers.map((barber) => (
                <button
                  key={barber.id}
                  onClick={() => onBarberSelect?.(barber.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                    selectedBarberId === barber.id ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="w-12 h-12 bg-gray-300 rounded-full overflow-hidden">
                    {barber.avatar ? (
                      <Image src={barber.avatar} alt={getBarberName(barber)} width={48} height={48} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 font-semibold">
                        {getBarberName(barber).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300">{getBarberName(barber)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Day Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={previousDay} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={goToToday}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Today
            </button>
            <h3 className="text-xl font-semibold">
              {format(currentDay, 'EEEE, MMMM d, yyyy')}
            </h3>
          </div>
          
          <button onClick={nextDay} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Day Schedule */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex">
          {/* Time column */}
          <div className="w-20 flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
            {Array.from({ length: endHour - startHour }).map((_, hourIndex) => {
              const hour = startHour + hourIndex
              return (
                <div key={hour} className="h-20 border-b border-gray-100 dark:border-gray-700">
                  <div className="text-sm text-gray-500 dark:text-gray-400 p-2 text-right font-medium">
                    {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Schedule column */}
          <div ref={scheduleColumnRef} className="flex-1 relative">
            {/* Time slot grid */}
            {timeSlots.map((slot, idx) => (
              <div 
                key={idx}
                className={`calendar-time-slot h-10 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors relative group ${
                  isCurrentTimeSlot(slot.hour, slot.minute) ? 'bg-primary-50 dark:bg-primary-900/10' : ''
                } ${
                  dragOverSlot?.hour === slot.hour && dragOverSlot?.minute === slot.minute 
                    ? 'drop-target bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500 ring-opacity-50' 
                    : ''
                } ${
                  dropSuccess?.hour === slot.hour && dropSuccess?.minute === slot.minute 
                    ? 'drop-success' 
                    : ''
                } ${
                  isDragging ? 'bg-gray-25 dark:bg-gray-800/50' : ''
                }`}
                onClick={() => {
                  if (!isDragging) {
                    const slotDate = new Date(currentDay)
                    slotDate.setHours(slot.hour, slot.minute, 0, 0)
                    if (selectedBarberId !== 'all') {
                      onTimeSlotClick?.(slotDate, selectedBarberId as number)
                    } else {
                      onTimeSlotClick?.(slotDate)
                    }
                  }
                }}
                onDragOver={(e) => {
                  if (draggedAppointment) {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    setDragOverSlot({ hour: slot.hour, minute: slot.minute })
                  }
                }}
                onDragLeave={() => {
                  setDragOverSlot(null)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (draggedAppointment && onAppointmentUpdate) {
                    const newDate = new Date(currentDay)
                    newDate.setHours(slot.hour, slot.minute, 0, 0)
                    
                    // Check if the new time is valid (not in the past for today)
                    const now = new Date()
                    const isToday = isSameDay(currentDay, now)
                    if (!isToday || newDate > now) {
                      // Show success animation
                      setDropSuccess({ hour: slot.hour, minute: slot.minute })
                      setTimeout(() => setDropSuccess(null), 600)
                      
                      checkAndUpdateAppointment(draggedAppointment.id, newDate.toISOString())
                    }
                  }
                  setDraggedAppointment(null)
                  setDragOverSlot(null)
                  setIsDragging(false)
                }}
              >
                {/* Time label for 30-minute slots */}
                {slot.minute === 0 || slot.minute === 30 ? (
                  <div className="absolute left-2 top-1 text-xs text-gray-400">
                    {format(new Date().setHours(slot.hour, slot.minute, 0, 0), 'h:mm')}
                  </div>
                ) : null}
                
                {/* Add appointment button on hover */}
                <div className="absolute right-2 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const slotDate = new Date(currentDay)
                      slotDate.setHours(slot.hour, slot.minute, 0, 0)
                      if (selectedBarberId !== 'all') {
                        onTimeSlotClick?.(slotDate, selectedBarberId as number)
                      } else {
                        onTimeSlotClick?.(slotDate)
                      }
                    }}
                    className="p-1 rounded bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                  >
                    <PlusIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {/* Current time indicator */}
            {isSameDay(currentDay, new Date()) && (
              <div
                className="absolute left-0 right-0 h-0.5 bg-red-500 z-10"
                style={{
                  top: `${((new Date().getHours() * 60 + new Date().getMinutes() - startHour * 60) / slotDuration) * 40}px`
                }}
              >
                <div className="absolute -left-2 -top-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
              </div>
            )}
            
            {/* Appointments */}
            {filteredAppointments.map((appointment) => (
              <div
                key={appointment.id}
                data-appointment-id={appointment.id}
                draggable={appointment.status !== 'completed' && appointment.status !== 'cancelled'}
                className={`calendar-appointment absolute left-2 right-2 rounded-lg transition-all text-white p-3 border-l-4 shadow-sm hover:shadow-md ${getStatusColor(appointment.status)} ${
                  draggedAppointment?.id === appointment.id ? 'dragging opacity-60' : ''
                } ${
                  selectedAppointments.has(appointment.id) ? 'ring-2 ring-white ring-opacity-80 shadow-lg scale-[1.02]' : ''
                } ${
                  appointment.status !== 'completed' && appointment.status !== 'cancelled' 
                    ? 'cursor-move hover:shadow-lg hover:scale-[1.02] hover:z-10 touch-target' 
                    : 'cursor-pointer'
                }`}
                style={getAppointmentStyle(appointment)}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isDragging) {
                    if (e.ctrlKey || e.metaKey || e.shiftKey || isSelectionMode) {
                      toggleAppointmentSelection(appointment.id, e)
                    } else {
                      onAppointmentClick?.(appointment)
                    }
                  }
                }}
                onDragStart={(e) => {
                  if (appointment.status !== 'completed' && appointment.status !== 'cancelled') {
                    e.dataTransfer.effectAllowed = 'move'
                    setDraggedAppointment(appointment)
                    setIsDragging(true)
                  } else {
                    e.preventDefault()
                  }
                }}
                onDragEnd={() => {
                  setDraggedAppointment(null)
                  setDragOverSlot(null)
                  setIsDragging(false)
                }}
              >
                {/* Selection indicator */}
                {selectedAppointments.has(appointment.id) && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
                    <div className="w-3 h-3 bg-primary-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  </div>
                )}
                
                <div 
                  className="font-semibold text-sm truncate hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    // Find client by name and open detail modal
                    const client = clients.find(c => 
                      `${c.first_name} ${c.last_name}` === appointment.client_name ||
                      c.email === appointment.client_email
                    )
                    if (client) {
                      setSelectedClient(client)
                      setShowClientModal(true)
                    }
                  }}
                >
                  {appointment.client_name || 'Client'}
                </div>
                <div className="text-xs opacity-90 truncate">{appointment.service_name}</div>
                <div className="text-xs opacity-75 mt-1">
                  {format(parseAPIDate(appointment.start_time), 'h:mm a')}
                  {appointment.duration_minutes && ` (${appointment.duration_minutes}m)`}
                </div>
                {appointment.barber_name && (
                  <div className="text-xs opacity-75 truncate">{appointment.barber_name}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? 's' : ''} scheduled
          {isDragging && (
            <span className="ml-3 text-primary-600 dark:text-primary-400 font-medium animate-pulse">
              📍 Drop to reschedule
            </span>
          )}
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Completed</span>
          </div>
          <div className="text-gray-500 ml-6">
            💡 {isTouchDevice ? 'Long press & drag appointments to reschedule' : 'Drag appointments to reschedule'} • {isSelectionMode ? 'Click to select/deselect' : 'Ctrl+click to select multiple'} • Click client names for details
          </div>
        </div>
      </div>

      {/* Client Detail Modal */}
      <ClientDetailModal
        isOpen={showClientModal}
        onClose={() => {
          setShowClientModal(false)
          setSelectedClient(null)
        }}
        client={selectedClient}
        appointments={appointments}
        onEdit={(client) => {
          // Handle edit client
          onClientClick?.(client)
        }}
        onBookAppointment={(clientId) => {
          // Handle book appointment for client
          setShowClientModal(false)
          // Could trigger appointment modal here
        }}
      />

      {/* Conflict Resolution Modal */}
      {showConflictModal && conflictAnalysis && pendingUpdate && (
        <ConflictResolutionModal
          isOpen={showConflictModal}
          onClose={handleCancelConflictResolution}
          analysis={conflictAnalysis}
          appointmentData={{
            client_name: appointments.find(apt => apt.id === pendingUpdate.appointmentId)?.client_name,
            service_name: appointments.find(apt => apt.id === pendingUpdate.appointmentId)?.service_name || '',
            start_time: pendingUpdate.newStartTime,
            duration_minutes: appointments.find(apt => apt.id === pendingUpdate.appointmentId)?.duration_minutes,
            barber_name: appointments.find(apt => apt.id === pendingUpdate.appointmentId)?.barber_name
          }}
          onResolveConflict={handleConflictResolution}
          onProceedAnyway={handleProceedAnyway}
          onCancel={handleCancelConflictResolution}
        />
      )}
    </div>
  )
})

// Add display name for debugging
CalendarDayView.displayName = 'CalendarDayView'

export default CalendarDayView