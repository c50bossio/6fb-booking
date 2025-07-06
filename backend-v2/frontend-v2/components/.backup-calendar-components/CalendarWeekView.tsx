'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { format, startOfWeek, endOfWeek, addDays, isSameDay, startOfDay, addHours, addMinutes } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { Button } from './ui/Button'
import { parseAPIDate } from '@/lib/timezone'
import Image from 'next/image'
import ClientDetailModal from './modals/ClientDetailModal'
import { touchDragManager, TouchDragManager } from '@/lib/touch-utils'
import { conflictManager, ConflictAnalysis, ConflictResolution } from '@/lib/appointment-conflicts'
import ConflictResolutionModal from './modals/ConflictResolutionModal'
import { useCalendarPerformance } from '@/hooks/useCalendarPerformance'
import { CALENDAR_THEME, getServiceConfig, getBarberSymbol } from '@/lib/calendar-constants'

// Use standardized booking response interface
import type { BookingResponse } from '@/lib/api'

interface Appointment extends BookingResponse {
  // Calendar-specific computed fields can be added here if needed
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

interface CalendarWeekViewProps {
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

const CalendarWeekView = React.memo(function CalendarWeekView({
  appointments,
  barbers = [],
  selectedBarberId = 'all',
  onBarberSelect,
  onAppointmentClick,
  onClientClick,
  onTimeSlotClick,
  onAppointmentUpdate,
  clients = [],
  startHour = 8,
  endHour = 19,
  slotDuration = 30,
  currentDate = new Date(),
  onDateChange
}: CalendarWeekViewProps) {
  const [currentWeek, setCurrentWeek] = useState(() => currentDate)
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<{ day: Date; hour: number; minute: number } | null>(null)
  const [selectedClient, setSelectedClient] = useState<any | null>(null)
  const [showClientModal, setShowClientModal] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dropSuccess, setDropSuccess] = useState<{ day: Date; hour: number; minute: number } | null>(null)
  const [conflictAnalysis, setConflictAnalysis] = useState<ConflictAnalysis | null>(null)
  const [pendingUpdate, setPendingUpdate] = useState<{ appointmentId: number; newStartTime: string } | null>(null)
  const [showConflictModal, setShowConflictModal] = useState(false)
  const scheduleGridRef = useRef<HTMLDivElement>(null)
  const isTouchDevice = TouchDragManager.isTouchDevice()
  
  // Enhanced drag & drop with optimistic updates - MUST BE FIRST to avoid initialization error
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<number, { originalStartTime: string; newStartTime: string }>>(() => new Map())
  
  // Performance monitoring and optimization
  const { measureRender, optimizedAppointmentFilter, memoizedDateCalculations, memoizedStatusColor } = useCalendarPerformance()
  
  // Performance monitoring
  useEffect(() => {
    if (appointments.length > 50) { // Only measure when there are many appointments
      const endMeasure = measureRender('CalendarWeekView')
      return endMeasure
    }
  }, [appointments.length, measureRender])

  // Sync currentWeek with currentDate prop changes
  useEffect(() => {
    if (!isSameDay(currentWeek, currentDate)) {
      setCurrentWeek(currentDate)
    }
  }, [currentDate, currentWeek])

  // Memoized week calculations
  const weekData = useMemo(() => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }) // Monday
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
    
    // Generate time slots
    const timeSlots: { hour: number; minute: number }[] = []
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        timeSlots.push({ hour, minute })
      }
    }

    // Generate week days
    const weekDays = []
    for (let i = 0; i < 7; i++) {
      weekDays.push(addDays(weekStart, i))
    }

    return { weekStart, weekEnd, timeSlots, weekDays }
  }, [currentWeek, startHour, endHour, slotDuration])

  const { weekStart, weekEnd, timeSlots, weekDays } = weekData

  // Get status color for background style (moved up to be available earlier)
  const getStatusColorValue = useCallback((status: string) => {
    switch (status) {
      case 'confirmed':
      case 'scheduled':
        return '#10b981' // green-500
      case 'pending':
        return '#f59e0b' // yellow-500
      case 'cancelled':
        return '#ef4444' // red-500
      case 'completed':
        return '#3b82f6' // blue-500
      default:
        return '#8b5cf6' // purple-500
    }
  }, [])

  // Optimized appointment filtering and preprocessing with error handling
  const processedAppointments = useMemo(() => {
    const filtered = optimizedAppointmentFilter(appointments, {
      barberId: selectedBarberId,
      startDate: weekStart,
      endDate: weekEnd
    })
    
    // Pre-calculate styles and dates to avoid repeated parsing
    return filtered.filter(appointment => {
      // Filter out appointments with invalid dates
      try {
        const testDate = parseAPIDate(appointment.start_time)
        return !isNaN(testDate.getTime())
      } catch {
        return false
      }
    }).map(appointment => {
      try {
        const start = parseAPIDate(appointment.start_time)
        let end: Date
        
        if (appointment.end_time) {
          end = parseAPIDate(appointment.end_time)
        } else if (appointment.duration_minutes) {
          end = addMinutes(start, appointment.duration_minutes)
        } else {
          // Default to 30 minutes if no end time or duration
          end = addMinutes(start, 30)
        }
      
        const startMinutes = start.getHours() * 60 + start.getMinutes()
        const endMinutes = end.getHours() * 60 + end.getMinutes()
        const slotStartMinutes = startHour * 60
        
        const top = ((startMinutes - slotStartMinutes) / slotDuration) * 48 // 48px per slot
        const height = ((endMinutes - startMinutes) / slotDuration) * 48
        
        return {
          ...appointment,
          parsedStartTime: start,
          parsedEndTime: end,
          style: {
            top: `${top}px`,
            height: `${Math.max(height, 20)}px`,
            backgroundColor: getStatusColorValue(appointment.status),
            color: 'white',
            padding: '2px 4px',
            margin: '1px',
            borderRadius: '2px',
            fontSize: '12px',
            overflow: 'hidden',
            position: 'absolute' as const,
            left: '2px',
            right: '2px',
            zIndex: 1
          }
        }
      } catch (error) {
        console.warn('Error processing appointment:', appointment, error)
        return null
      }
    }).filter(Boolean) // Remove null entries
  }, [appointments, selectedBarberId, weekStart, weekEnd, optimizedAppointmentFilter, startHour, slotDuration, getStatusColorValue])

  // Navigate weeks (memoized)
  const previousWeek = useCallback(() => {
    const newDate = addDays(currentWeek, -7)
    setCurrentWeek(newDate)
    onDateChange?.(newDate)
  }, [currentWeek, onDateChange])

  const nextWeek = useCallback(() => {
    const newDate = addDays(currentWeek, 7)
    setCurrentWeek(newDate)
    onDateChange?.(newDate)
  }, [currentWeek, onDateChange])

  const goToToday = useCallback(() => {
    const today = new Date()
    setCurrentWeek(today)
    onDateChange?.(today)
  }, [onDateChange])

  // Pre-calculate appointments by day for faster filtering
  const appointmentsByDay = useMemo(() => {
    const byDay: { [key: string]: any[] } = {}
    
    processedAppointments.forEach(appointment => {
      try {
        // Validate the date before formatting
        if (appointment.parsedStartTime && !isNaN(appointment.parsedStartTime.getTime())) {
          const dayKey = format(appointment.parsedStartTime, 'yyyy-MM-dd')
          if (!byDay[dayKey]) {
            byDay[dayKey] = []
          }
          byDay[dayKey].push(appointment)
        }
      } catch (error) {
        console.warn('Invalid date in appointment:', appointment, error)
      }
    })
    
    return byDay
  }, [processedAppointments])

  // Check if appointment is on a specific day (now using pre-parsed dates)
  const isAppointmentOnDay = (processedAppointment: any, day: Date) => {
    return isSameDay(processedAppointment.parsedStartTime, day)
  }

  // Get appointments for a specific day (optimized and memoized) with optimistic updates
  const getAppointmentsForDay = useCallback((day: Date) => {
    const dayKey = format(day, 'yyyy-MM-dd')
    let dayAppointments = appointmentsByDay[dayKey] || []
    
    // Apply optimistic updates for better UX
    dayAppointments = dayAppointments.map(appointment => {
      const optimisticUpdate = optimisticUpdates.get(appointment.id)
      if (optimisticUpdate) {
        return {
          ...appointment,
          start_time: optimisticUpdate.newStartTime
        }
      }
      return appointment
    })
    
    // Filter out appointments that were moved to other days via optimistic updates
    dayAppointments = dayAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.start_time)
      return format(appointmentDate, 'yyyy-MM-dd') === dayKey
    })
    
    // Add appointments that were moved TO this day via optimistic updates
    optimisticUpdates.forEach((update, appointmentId) => {
      const updateDate = new Date(update.newStartTime)
      if (format(updateDate, 'yyyy-MM-dd') === dayKey) {
        // Find the original appointment
        const originalAppointment = appointments.find(apt => apt.id === appointmentId)
        if (originalAppointment && !dayAppointments.find(apt => apt.id === appointmentId)) {
          dayAppointments.push({
            ...originalAppointment,
            start_time: update.newStartTime
          })
        }
      }
    })
    
    return dayAppointments
  }, [appointmentsByDay, optimisticUpdates, appointments])

  // Get status color for CSS classes (memoized)
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'confirmed':
      case 'scheduled':
        return 'bg-green-500 hover:bg-green-600'
      case 'pending':
        return 'bg-yellow-500 hover:bg-yellow-600'
      case 'cancelled':
        return 'bg-red-500 hover:bg-red-600'
      case 'completed':
        return 'bg-blue-500 hover:bg-blue-600'
      default:
        return 'bg-purple-500 hover:bg-purple-600'
    }
  }, [])

  // Format barber name (memoized) - for barber filter, not appointments
  const getBarberName = useCallback((barber: Barber) => {
    return barber.name || 
           (barber.first_name && barber.last_name ? `${barber.first_name} ${barber.last_name}` : '') ||
           barber.email.split('@')[0]
  }, [])

  // This state was moved up to avoid initialization error - see line 82
  
  // Check for conflicts before updating appointment
  const checkAndUpdateAppointment = async (appointmentId: number, newStartTime: string) => {
    const appointment = appointments.find(apt => apt.id === appointmentId)
    if (!appointment) return

    // Store original state for rollback
    const originalStartTime = appointment.start_time
    
    // Apply optimistic update immediately for better UX
    setOptimisticUpdates(prev => new Map(prev.set(appointmentId, { originalStartTime, newStartTime })))

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
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev)
        newMap.delete(appointmentId)
        return newMap
      })
      
      // Show conflict resolution modal
      setConflictAnalysis(analysis)
      setPendingUpdate({ appointmentId, newStartTime })
      setShowConflictModal(true)
    } else {
      // No significant conflicts, proceed with update
      if (onAppointmentUpdate) {
        try {
          await onAppointmentUpdate(appointmentId, newStartTime)
          
          // Success - clear optimistic update (it's now permanent)
          setOptimisticUpdates(prev => {
            const newMap = new Map(prev)
            newMap.delete(appointmentId)
            return newMap
          })
          
        } catch (updateError: any) {
          // Rollback optimistic update on failure
          setOptimisticUpdates(prev => {
            const newMap = new Map(prev)
            newMap.delete(appointmentId)
            return newMap
          })
          
          console.error('Failed to update appointment:', updateError)
        }
      }
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

  // Memoized drag over handler
  const handleDragOver = useCallback((e: React.DragEvent, day: Date, hour: number, minute: number) => {
    if (draggedAppointment) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOverSlot({ day, hour, minute })
    }
  }, [draggedAppointment])

  // Memoized drag leave handler
  const handleDragLeave = useCallback(() => {
    setDragOverSlot(null)
  }, [])

  // Memoized time slot click handler
  const handleTimeSlotClick = useCallback((day: Date, hour: number, minute: number) => {
    const slotDate = new Date(day)
    slotDate.setHours(hour, minute, 0, 0)
    if (selectedBarberId !== 'all') {
      onTimeSlotClick?.(slotDate, selectedBarberId as number)
    } else {
      onTimeSlotClick?.(slotDate)
    }
  }, [selectedBarberId, onTimeSlotClick])

  // Memoized client click handler
  const handleClientClick = useCallback((appointment: any) => {
    // Find client by name and open detail modal
    const client = clients.find(c => 
      `${c.first_name} ${c.last_name}` === appointment.client_name ||
      c.email === appointment.client_email
    )
    if (client) {
      setSelectedClient(client)
      setShowClientModal(true)
    }
  }, [clients])

  // Touch drag support for appointments
  useEffect(() => {
    if (!isTouchDevice) return

    const appointments = document.querySelectorAll('.calendar-appointment-week')
    const cleanupFunctions: (() => void)[] = []

    appointments.forEach((appointmentEl) => {
      const appointmentId = appointmentEl.getAttribute('data-appointment-id')
      const appointment = processedAppointments.find(apt => apt.id.toString() === appointmentId)
      
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
          // Find which day and time slot we're over
          const weekGrid = scheduleGridRef.current
          if (!weekGrid) return
          
          const rect = weekGrid.getBoundingClientRect()
          const relativeX = position.clientX - rect.left
          const relativeY = position.clientY - rect.top
          
          // Calculate day (7 columns)
          const dayWidth = rect.width / 7
          const dayIndex = Math.floor(relativeX / dayWidth)
          
          // Calculate time slot
          const slotHeight = 48 // 48px per slot
          const slotIndex = Math.floor(relativeY / slotHeight)
          
          if (dayIndex >= 0 && dayIndex < 7 && slotIndex >= 0 && slotIndex < timeSlots.length) {
            const targetDay = weekDays[dayIndex]
            const slot = timeSlots[slotIndex]
            setDragOverSlot({ day: targetDay, hour: slot.hour, minute: slot.minute })
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
              checkAndUpdateAppointment(draggedAppointment.id, newDate.toISOString())
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
  }, [processedAppointments, weekDays, timeSlots, onAppointmentUpdate, isTouchDevice])

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      {/* Header section */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
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

        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <button onClick={previousWeek} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={goToToday}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Today
            </button>
            <h3 className="text-lg font-medium">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'd, yyyy')}
            </h3>
          </div>
          
          <button onClick={nextWeek} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="flex">
            {/* Time column */}
            <div className="w-20 flex-shrink-0 border-r border-gray-200 dark:border-gray-700">
              <div className="h-12 border-b border-gray-200 dark:border-gray-700"></div>
              {timeSlots.map((slot, idx) => (
                <div 
                  key={idx} 
                  className="h-12 border-b border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 p-2 text-right"
                >
                  {slot.minute === 0 && (
                    `${slot.hour === 12 ? 12 : slot.hour % 12}:00 ${slot.hour < 12 ? 'am' : 'pm'}`
                  )}
                </div>
              ))}
            </div>

            {/* Days columns */}
            <div ref={scheduleGridRef} className="flex-1 grid grid-cols-7">
              {weekDays.map((day, dayIdx) => (
                <div key={dayIdx} className="border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                  {/* Day header */}
                  <div className="h-12 border-b border-gray-200 dark:border-gray-700 p-2 text-center">
                    <div className={`text-sm font-medium ${isSameDay(day, new Date()) ? 'text-primary-600' : 'text-gray-900 dark:text-white'}`}>
                      {format(day, 'EEE')}
                    </div>
                    <div className={`text-xs ${isSameDay(day, new Date()) ? 'text-primary-600' : 'text-gray-500'}`}>
                      {format(day, 'd')}
                    </div>
                  </div>
                  
                  {/* Time slots */}
                  <div className="relative">
                    {timeSlots.map((slot, idx) => (
                      <div 
                        key={idx}
                        className={`h-12 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-all duration-200 relative group ${
                          dragOverSlot && 
                          isSameDay(dragOverSlot.day, day) && 
                          dragOverSlot.hour === slot.hour && 
                          dragOverSlot.minute === slot.minute
                            ? 'bg-green-100 dark:bg-green-900/30 ring-2 ring-green-500 ring-inset border-2 border-green-400 border-dashed'
                            : dropSuccess &&
                              isSameDay(dropSuccess.day, day) &&
                              dropSuccess.hour === slot.hour &&
                              dropSuccess.minute === slot.minute
                            ? 'bg-green-200 dark:bg-green-800/40 ring-2 ring-green-400 animate-pulse'
                            : isDragging
                            ? 'hover:bg-green-50 dark:hover:bg-green-900/10 hover:border-green-300 hover:border-dashed'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => handleTimeSlotClick(day, slot.hour, slot.minute)}
                        onDragOver={(e) => handleDragOver(e, day, slot.hour, slot.minute)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => {
                          e.preventDefault()
                          if (draggedAppointment && onAppointmentUpdate) {
                            const newDate = new Date(day)
                            newDate.setHours(slot.hour, slot.minute, 0, 0)
                            
                            // Check if the new time is valid (not in the past for today)
                            const now = new Date()
                            const isToday = isSameDay(day, now)
                            if (!isToday || newDate > now) {
                              // Show success animation
                              setDropSuccess({ day, hour: slot.hour, minute: slot.minute })
                              setTimeout(() => setDropSuccess(null), 600)
                              
                              checkAndUpdateAppointment(draggedAppointment.id, newDate.toISOString())
                            }
                          }
                          setDraggedAppointment(null)
                          setDragOverSlot(null)
                          setIsDragging(false)
                        }}
                      />
                    ))}
                    
                    {/* Appointments - optimized rendering with premium styling */}
                    {getAppointmentsForDay(day).map((appointment) => {
                      // Get service configuration for premium styling
                      const serviceType = appointment.service_name?.toLowerCase() || 'haircut'
                      const serviceConfig = getServiceConfig(serviceType)
                      const barberSymbol = getBarberSymbol(appointment.barber_id?.toString() || appointment.barber_name || '')
                      
                      return (
                        <div
                          key={appointment.id}
                          data-appointment-id={appointment.id}
                          draggable={appointment.status !== 'completed' && appointment.status !== 'cancelled'}
                          className={`calendar-appointment-week premium-appointment absolute left-1 right-1 rounded cursor-pointer transition-all text-white p-1 text-xs overflow-hidden relative ${
                            getStatusColor(appointment.status)
                          } ${
                            draggedAppointment?.id === appointment.id 
                              ? 'opacity-30 scale-95 animate-pulse ring-2 ring-white ring-opacity-50' 
                              : 'hover:shadow-xl hover:scale-105 hover:z-20 hover:ring-2 hover:ring-white hover:ring-opacity-60'
                          } ${
                            appointment.status !== 'completed' && appointment.status !== 'cancelled' 
                              ? 'cursor-move group' 
                              : 'cursor-pointer'
                          }`}
                          style={{
                            ...appointment.style,
                            background: serviceConfig.gradient.light,
                            borderColor: serviceConfig.color,
                            boxShadow: `0 0 0 1px ${serviceConfig.color}40, ${serviceConfig.glow}`
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!isDragging) {
                              onAppointmentClick?.(appointment)
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
                          {/* Barber symbol in top-right corner */}
                          <div className="absolute top-0.5 right-0.5 text-xs opacity-70 font-bold text-white bg-black bg-opacity-20 rounded-full w-4 h-4 flex items-center justify-center" title={`Barber: ${appointment.barber_name || 'Unknown'}`}>
                            {barberSymbol}
                          </div>
                          
                          {/* Service icon in bottom-left corner */}
                          <div className="absolute bottom-0.5 left-0.5 text-xs opacity-80" title={`Service: ${appointment.service_name}`}>
                            {serviceConfig.icon}
                          </div>
                          
                          {/* Drop zone indicator when dragging */}
                          {isDragging && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                              <div className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium shadow-lg">
                                Drop here
                              </div>
                            </div>
                          )}
                          
                          {/* Premium shine effect on hover */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
                          
                          {/* Content */}
                          <div className="relative z-10 mt-1">
                            <div 
                              className="font-semibold truncate hover:underline cursor-pointer text-white"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleClientClick(appointment)
                              }}
                            >
                              {appointment.client_name || 'Client'}
                            </div>
                            <div className="truncate opacity-90 text-white text-xs">{appointment.service_name}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex items-center justify-center gap-6 text-xs">
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
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>Cancelled</span>
        </div>
        <div className="text-gray-500 ml-6">
          💡 Click client names to view details
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
      {showConflictModal && conflictAnalysis && (
        <ConflictResolutionModal
          isOpen={showConflictModal}
          onClose={handleCancelConflictResolution}
          analysis={conflictAnalysis}
          appointmentData={{
            client_name: appointments.find(apt => apt.id === pendingUpdate?.appointmentId)?.client_name,
            service_name: appointments.find(apt => apt.id === pendingUpdate?.appointmentId)?.service_name || '',
            start_time: pendingUpdate?.newStartTime || '',
            duration_minutes: appointments.find(apt => apt.id === pendingUpdate?.appointmentId)?.duration_minutes,
            barber_name: appointments.find(apt => apt.id === pendingUpdate?.appointmentId)?.barber_name
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
CalendarWeekView.displayName = 'CalendarWeekView'

export default CalendarWeekView