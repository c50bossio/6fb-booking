'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MagnifyingGlassIcon, FunnelIcon, ArrowDownTrayIcon, PrinterIcon, XMarkIcon } from '@heroicons/react/24/outline'
import PremiumCalendar, { CalendarAppointment, CalendarProps } from './PremiumCalendar'
import AppointmentMoveConfirmation from '../modals/AppointmentMoveConfirmation'
import ConflictResolutionModal, { ConflictResolution, TimeSlotSuggestion, ConflictingAppointment } from '../modals/ConflictResolutionModal'
import ConflictResolutionService from './ConflictResolutionService'

interface DragDropData {
  appointmentId: string
  originalDate: string
  originalTime: string
}

interface DragState {
  isDragging: boolean
  draggedAppointment: CalendarAppointment | null
  dragOffset: { x: number; y: number }
  currentPosition: { x: number; y: number }
  dropTarget: { date: string; time: string } | null
  conflictingAppointments: CalendarAppointment[]
  snapTarget: { date: string; time: string } | null
  isValidDrop: boolean
  snapGuides: { x: number; y: number; visible: boolean }
  dragHandle: { visible: boolean; appointmentId: string | null }
}

interface ConflictState {
  isResolutionOpen: boolean
  conflictingAppointments: ConflictingAppointment[]
  suggestions: TimeSlotSuggestion[]
  targetDate: string
  targetTime: string
}

// Undo/Redo action tracking
interface MoveAction {
  appointmentId: string
  fromDate: string
  fromTime: string
  toDate: string
  toTime: string
}

// Search and filter interfaces (from EnterpriseCalendar)
interface SearchFilters {
  searchTerm: string
  selectedBarber: string
  selectedStatus: string
  selectedService: string
  dateRange: { start: Date | null; end: Date | null }
}

interface UnifiedCalendarProps extends CalendarProps {
  onAppointmentMove?: (
    appointmentId: string,
    newDate: string,
    newTime: string,
    originalDate: string,
    originalTime: string
  ) => Promise<void>
  enableDragDrop?: boolean
  snapInterval?: 15 | 30 // minutes
  showConflicts?: boolean
  allowConflicts?: boolean
  enableCascadeRescheduling?: boolean
  appointmentDependencies?: Map<string, string[]> // appointmentId -> dependentIds
  enableSmartConflictResolution?: boolean
  workingHours?: { start: string; end: string }
  onConflictResolution?: (resolution: ConflictResolution) => Promise<void>
  // New unified features
  enableSearch?: boolean
  enableExport?: boolean
  enableKeyboardNavigation?: boolean
  enableStatistics?: boolean
}

// Helper function to format date as YYYY-MM-DD without timezone conversion
const formatDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Generate mock appointments for demo purposes
const generateMockAppointments = (): CalendarAppointment[] => {
  const today = new Date()
  const appointments: CalendarAppointment[] = []

  // Generate appointments for the current week
  for (let dayOffset = -3; dayOffset <= 3; dayOffset++) {
    const date = new Date(today)
    date.setDate(today.getDate() + dayOffset)
    const dateStr = formatDateString(date)

    // Add 2-4 random appointments per day
    const appointmentsPerDay = Math.floor(Math.random() * 3) + 2

    for (let i = 0; i < appointmentsPerDay; i++) {
      const startHour = 9 + Math.floor(Math.random() * 8) // 9 AM to 5 PM
      const startMinute = Math.random() < 0.5 ? 0 : 30
      const duration = [30, 45, 60, 90][Math.floor(Math.random() * 4)]

      const startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`
      const endHour = Math.floor((startHour * 60 + startMinute + duration) / 60)
      const endMinute = (startHour * 60 + startMinute + duration) % 60
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`

      const clients = ['John Smith', 'Maria Garcia', 'David Johnson', 'Sarah Wilson', 'Michael Brown', 'Lisa Davis', 'James Rodriguez', 'Emma Thompson']
      const barbers = ['Marcus Johnson', 'Sarah Mitchell', 'Tony Rodriguez', 'Amanda Chen']
      const services = ['Premium Cut & Beard', 'Classic Fade', 'Beard Trim', 'Executive Package', 'Kids Cut', 'Buzz Cut', 'Beard Styling', 'Hot Towel Shave']
      const statuses: CalendarAppointment['status'][] = ['confirmed', 'pending', 'completed', 'cancelled']

      const client = clients[Math.floor(Math.random() * clients.length)]
      const barber = barbers[Math.floor(Math.random() * barbers.length)]
      const service = services[Math.floor(Math.random() * services.length)]
      const status = statuses[Math.floor(Math.random() * statuses.length)]

      appointments.push({
        id: `mock-${dayOffset}-${i}`,
        title: `${service} - ${client}`,
        client,
        clientId: Math.floor(Math.random() * 1000) + 1,
        barber,
        barberId: barbers.indexOf(barber) + 1,
        startTime,
        endTime,
        service,
        serviceId: services.indexOf(service) + 1,
        price: Math.floor(Math.random() * 50) + 35, // $35-$85
        status,
        date: dateStr,
        duration,
        clientPhone: `+1 (555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        clientEmail: `${client.toLowerCase().replace(' ', '.')}@email.com`,
        notes: Math.random() < 0.3 ? ['Regular client', 'First time visit', 'VIP customer', 'Prefers scissors over clippers'][Math.floor(Math.random() * 4)] : undefined
      })
    }
  }

  const sortedAppointments = appointments.sort((a, b) => {
    const dateA = new Date(`${a.date} ${a.startTime}`)
    const dateB = new Date(`${b.date} ${b.startTime}`)
    return dateA.getTime() - dateB.getTime()
  })

  console.log('🎭 Generated mock appointments:', sortedAppointments.length, sortedAppointments.slice(0, 3))
  return sortedAppointments
}

export default function UnifiedCalendar({
  appointments = [],
  onAppointmentMove,
  enableDragDrop = true,
  snapInterval = 15,
  showConflicts = true,
  allowConflicts = false,
  enableCascadeRescheduling = false,
  appointmentDependencies = new Map(),
  enableSmartConflictResolution = true,
  workingHours = { start: '08:00', end: '20:00' },
  onConflictResolution,
  // New unified features
  enableSearch = true,
  enableExport = true,
  enableKeyboardNavigation = true,
  enableStatistics = false,
  ...calendarProps
}: UnifiedCalendarProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedAppointment: null,
    dragOffset: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    dropTarget: null,
    conflictingAppointments: [],
    snapTarget: null,
    isValidDrop: true,
    snapGuides: { x: 0, y: 0, visible: false },
    dragHandle: { visible: false, appointmentId: null }
  })

  // Search and filter state (from EnterpriseCalendar)
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    searchTerm: '',
    selectedBarber: '',
    selectedStatus: '',
    selectedService: '',
    dateRange: { start: null, end: null }
  })
  const [showFilters, setShowFilters] = useState(false)

  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<MoveAction[]>([])
  const [redoStack, setRedoStack] = useState<MoveAction[]>([])
  const [pendingMove, setPendingMove] = useState<{
    appointment: CalendarAppointment
    newDate: string
    newTime: string
  } | null>(null)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [successAnimation, setSuccessAnimation] = useState<{ visible: boolean; appointmentId: string | null }>({ visible: false, appointmentId: null })
  const [hoveredAppointment, setHoveredAppointment] = useState<string | null>(null)
  const [appointmentPreview, setAppointmentPreview] = useState<{
    visible: boolean
    appointment: CalendarAppointment | null
    position: { x: number; y: number }
  }>({ visible: false, appointment: null, position: { x: 0, y: 0 } })

  // Conflict resolution state
  const [conflictState, setConflictState] = useState<ConflictState>({
    isResolutionOpen: false,
    conflictingAppointments: [],
    suggestions: [],
    targetDate: '',
    targetTime: ''
  })

  // Initialize conflict resolution service
  const conflictService = useMemo(() =>
    new ConflictResolutionService(appointments, {
      workingHoursStart: workingHours.start,
      workingHoursEnd: workingHours.end,
      slotInterval: snapInterval,
      maxSuggestions: 12,
      prioritizeSameDay: true,
      prioritizeNearbyTimes: true
    }), [appointments, workingHours, snapInterval])

  const dragImageRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  // Check for demo mode
  const isDemoMode = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.location.search.includes('demo=true') ||
             sessionStorage.getItem('demo_mode') === 'true' ||
             window.location.pathname.includes('/app') ||
             appointments.length === 0
    }
    return appointments.length === 0
  }, [appointments.length])

  // TEMPORARY: Always use mock appointments to test the timezone fix
  const effectiveAppointments = useMemo(() => {
    console.log('📱 ALWAYS using mock appointments for testing')
    const mockAppts = generateMockAppointments()
    console.log('📱 Generated appointments:', mockAppts.length, mockAppts.slice(0, 2))
    return mockAppts
  }, [])

  // Filter appointments based on search criteria
  const filteredAppointments = useMemo(() => {
    if (!enableSearch) return effectiveAppointments

    return effectiveAppointments.filter(appointment => {
      // Search term filter
      if (searchFilters.searchTerm) {
        const searchLower = searchFilters.searchTerm.toLowerCase()
        const matchesSearch =
          appointment.client.toLowerCase().includes(searchLower) ||
          appointment.service.toLowerCase().includes(searchLower) ||
          appointment.barber.toLowerCase().includes(searchLower) ||
          (appointment.notes && appointment.notes.toLowerCase().includes(searchLower))

        if (!matchesSearch) return false
      }

      // Barber filter
      if (searchFilters.selectedBarber && appointment.barber !== searchFilters.selectedBarber) {
        return false
      }

      // Status filter
      if (searchFilters.selectedStatus && appointment.status !== searchFilters.selectedStatus) {
        return false
      }

      // Service filter
      if (searchFilters.selectedService && appointment.service !== searchFilters.selectedService) {
        return false
      }

      return true
    })
  }, [effectiveAppointments, searchFilters, enableSearch])

  // Get unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    const barbers = [...new Set(effectiveAppointments.map(apt => apt.barber))]
    const statuses = [...new Set(effectiveAppointments.map(apt => apt.status))]
    const services = [...new Set(effectiveAppointments.map(apt => apt.service))]

    return { barbers, statuses, services }
  }, [effectiveAppointments])

  // Export functionality
  const handleExport = useCallback((format: 'csv' | 'pdf' | 'ical') => {
    console.log(`Exporting calendar data as ${format}`)
    // Implementation will be added later
  }, [])

  // Print functionality
  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearchFilters({
      searchTerm: '',
      selectedBarber: '',
      selectedStatus: '',
      selectedService: '',
      dateRange: { start: null, end: null }
    })
  }, [])

  // Demo appointment move handler
  const handleDemoAppointmentMove = useCallback(async (
    appointmentId: string,
    newDate: string,
    newTime: string,
    originalDate: string,
    originalTime: string
  ) => {
    console.log('🎯 Demo Mode: Appointment moved', {
      appointmentId,
      from: `${originalDate} ${originalTime}`,
      to: `${newDate} ${newTime}`
    })

    // In demo mode, just log the move - no actual API call needed
    await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API delay

    return Promise.resolve()
  }, [])

  // Enhance appointments with drag & drop handlers
  const enhancedAppointments = useMemo(() => {
    if (!enableDragDrop) return filteredAppointments

    return filteredAppointments.map(appointment => ({
      ...appointment,
      __dragProps: {
        draggable: true,
        onDragStart: (e: React.DragEvent) => {
          console.log('🔥 Drag started for appointment:', appointment.id)

          // Set drag data
          e.dataTransfer.setData('text/plain', JSON.stringify({
            appointmentId: appointment.id,
            originalDate: appointment.date,
            originalTime: appointment.startTime
          }))

          // Update drag state
          setDragState(prev => ({
            ...prev,
            isDragging: true,
            draggedAppointment: appointment,
            dragOffset: { x: 0, y: 0 },
            currentPosition: { x: e.clientX, y: e.clientY }
          }))

          // Add visual feedback
          e.dataTransfer.effectAllowed = 'move'
          const dragImage = document.createElement('div')
          dragImage.textContent = `${appointment.client} - ${appointment.service}`
          dragImage.style.cssText = 'position: absolute; top: -1000px; background: #8b5cf6; color: white; padding: 8px; border-radius: 4px; font-size: 12px;'
          document.body.appendChild(dragImage)
          e.dataTransfer.setDragImage(dragImage, 0, 0)
          setTimeout(() => document.body.removeChild(dragImage), 0)
        },
        onDragEnd: (e: React.DragEvent) => {
          console.log('🔥 Drag ended')
          setDragState(prev => ({
            ...prev,
            isDragging: false,
            draggedAppointment: null,
            dropTarget: null
          }))
        }
      }
    }))
  }, [filteredAppointments, enableDragDrop])

  // Handle drop on time slots
  const handleTimeSlotDrop = useCallback((e: React.DragEvent, date: string, time: string) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const dragData = e.dataTransfer.getData('text/plain')
      if (!dragData) {
        console.log('⚠️ No drag data found, ignoring drop')
        return
      }

      const parsedData = JSON.parse(dragData)
      const { appointmentId, originalDate, originalTime } = parsedData

      console.log('🎯 Drop detected:', {
        appointmentId,
        originalDate,
        originalTime,
        newDate: date,
        newTime: time
      })

      // Find the appointment being moved
      const appointment = filteredAppointments.find(apt => apt.id === appointmentId)
      if (!appointment) {
        console.error('Appointment not found:', appointmentId)
        return
      }

      // Check if it's actually a move (not dropping on same slot)
      if (originalDate === date && originalTime === time) {
        console.log('Same slot drop, ignoring')
        return
      }

      // Set up the pending move for confirmation
      setPendingMove({
        appointment,
        newDate: date,
        newTime: time
      })
      setIsConfirmationOpen(true)

    } catch (error) {
      console.error('Error handling drop:', error)
    }
  }, [filteredAppointments])

  // Handle confirmed move
  const handleConfirmedMove = useCallback(async (notifyCustomer: boolean, note?: string) => {
    if (!pendingMove) return

    try {
      setIsSaving(true)

      const { appointment, newDate, newTime } = pendingMove

      // Call the appropriate move handler
      if (onAppointmentMove) {
        await onAppointmentMove(
          appointment.id,
          newDate,
          newTime,
          appointment.date,
          appointment.startTime
        )
      } else {
        // Fallback to demo handler
        await handleDemoAppointmentMove(
          appointment.id,
          newDate,
          newTime,
          appointment.date,
          appointment.startTime
        )
      }

      // Update the appointment in our local state for immediate feedback
      // (In a real app, this would be handled by refetching data)
      console.log('✅ Move completed successfully')

      // Show success animation
      setSuccessAnimation({ visible: true, appointmentId: appointment.id })
      setTimeout(() => {
        setSuccessAnimation({ visible: false, appointmentId: null })
      }, 2000)

    } catch (error) {
      console.error('❌ Error confirming move:', error)
    } finally {
      setIsSaving(false)
      setIsConfirmationOpen(false)
      setPendingMove(null)
    }
  }, [pendingMove, onAppointmentMove, handleDemoAppointmentMove])

  // Rest of the DragDropCalendar functionality continues here...
  // (I'll include the rest of the drag/drop logic in the next part)

  return (
    <div
      ref={calendarRef}
      className={`relative ${dragState.isDragging ? 'select-none' : ''}`}
      style={{ cursor: dragState.isDragging ? 'grabbing' : 'default' }}
    >
      {/* Search and Filter Bar */}
      {enableSearch && (
        <div className="bg-gray-800 border-b border-gray-700 p-4 space-y-4">
          {/* Search and Filter Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search appointments..."
                  value={searchFilters.searchTerm}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              {/* Filter Toggle Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                  showFilters ? 'bg-violet-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <FunnelIcon className="h-5 w-5" />
                <span>Filters</span>
              </button>
            </div>

            {/* Export and Print Buttons */}
            {enableExport && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleExport('csv')}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg flex items-center space-x-2 transition-colors"
                  title="Export as CSV"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg flex items-center space-x-2 transition-colors"
                  title="Print Calendar"
                >
                  <PrinterIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Print</span>
                </button>
              </div>
            )}
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {/* Barber Filter */}
              <select
                value={searchFilters.selectedBarber}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, selectedBarber: e.target.value }))}
                className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">All Barbers</option>
                {filterOptions.barbers.map(barber => (
                  <option key={barber} value={barber}>{barber}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={searchFilters.selectedStatus}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, selectedStatus: e.target.value }))}
                className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">All Statuses</option>
                {filterOptions.statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>

              {/* Service Filter */}
              <select
                value={searchFilters.selectedService}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, selectedService: e.target.value }))}
                className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">All Services</option>
                {filterOptions.services.map(service => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>

              {/* Clear Filters Button */}
              <button
                onClick={clearFilters}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
                <span>Clear</span>
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* Demo Mode Indicator */}
      {true && (
        <div className="bg-violet-900/20 border border-violet-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse"></div>
            <span className="text-violet-300 text-sm font-medium">
              Demo Mode: Showing sample appointments
            </span>
          </div>
          <p className="text-violet-400/80 text-xs mt-1">
            Try dragging appointments to test the drag & drop functionality
          </p>
        </div>
      )}

      {/* Debug Information */}
      {false && (
        <div className="bg-gray-800 p-2 rounded text-xs text-gray-300 mb-4">
          <strong>Debug Info:</strong> Demo Mode: {isDemoMode ? 'ON' : 'OFF'} |
          Effective Appointments: {effectiveAppointments.length} |
          Filtered Appointments: {filteredAppointments.length} |
          Enhanced Appointments: {enhancedAppointments.length} |
          Drag & Drop: {enableDragDrop ? 'ON' : 'OFF'} |
          Initial View: {calendarProps.initialView || 'week'}
          {filteredAppointments.length > 0 && (
            <div className="mt-1">
              <strong>Sample:</strong> {filteredAppointments[0].client} - {filteredAppointments[0].service} on {filteredAppointments[0].date}
              {enhancedAppointments.length > 0 && enhancedAppointments[0].__dragProps && (
                <span className="ml-2 text-green-400">✓ Drag Props</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Enhanced Calendar with all drag & drop functionality */}
      <div
        className="calendar-container"
        data-drag-drop-enabled={enableDragDrop}
        onDragOver={(e) => {
          if (enableDragDrop) {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
          }
        }}
        onDrop={(e) => {
          if (enableDragDrop && dragState.isDragging) {
            console.log('📦 Drop event triggered')
            const timeSlot = (e.target as HTMLElement).closest('[data-time-slot]')
            if (timeSlot) {
              const date = timeSlot.getAttribute('data-date')
              const time = timeSlot.getAttribute('data-time')
              if (date && time) {
                console.log('📦 Handling drop on time slot:', date, time)
                handleTimeSlotDrop(e, date, time)
              }
            }
          }
        }}
      >
        <PremiumCalendar
          {...calendarProps}
          appointments={enhancedAppointments}
          onAppointmentClick={(appointment) => {
            console.log('🖱️ UnifiedCalendar received appointment click:', appointment.id)
            calendarProps.onAppointmentClick?.(appointment)
          }}
          onTimeSlotClick={(date, time) => {
            console.log('🖱️ UnifiedCalendar received time slot click:', date, time)
            calendarProps.onTimeSlotClick?.(date, time)
          }}
          workingHours={workingHours}
          initialView={calendarProps.initialView || 'week'}
        />
      </div>

      {/* All the existing drag/drop modals and animations will be added here */}
      {/* Appointment Move Confirmation Modal */}
      {pendingMove && (
        <AppointmentMoveConfirmation
          isOpen={isConfirmationOpen}
          onClose={() => {
            setIsConfirmationOpen(false)
            setPendingMove(null)
          }}
          onConfirm={handleConfirmedMove}
          appointment={{
            id: pendingMove.appointment.id,
            client: pendingMove.appointment.client,
            clientPhone: pendingMove.appointment.clientPhone,
            clientEmail: pendingMove.appointment.clientEmail,
            service: pendingMove.appointment.service,
            barber: pendingMove.appointment.barber,
            originalDate: pendingMove.appointment.date,
            originalTime: pendingMove.appointment.startTime,
            newDate: pendingMove.newDate,
            newTime: pendingMove.newTime,
            duration: pendingMove.appointment.duration
          }}
          isLoading={isSaving}
        />
      )}

      {/* Drag Visual Feedback */}
      {dragState.isDragging && (
        <div className="fixed top-4 left-4 z-50 bg-violet-600 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
          🔄 Moving: {dragState.draggedAppointment?.client} - {dragState.draggedAppointment?.service}
        </div>
      )}

      {/* Success Animation */}
      <AnimatePresence>
        {successAnimation.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -50 }}
            className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2"
          >
            <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-medium">Appointment moved successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Export the hook as well for backward compatibility
export const useUnifiedCalendar = () => {
  // Hook implementation will be added later
  return {}
}
