'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  CurrencyDollarIcon,
  PlusIcon,
  CalendarIcon as CalendarIconOutline
} from '@heroicons/react/24/outline'
import {
  CalendarIcon,
  ViewColumnsIcon,
  Squares2X2Icon
} from '@heroicons/react/24/solid'
import AppointmentMoveConfirmation from '../modals/AppointmentMoveConfirmation'
import ConflictResolutionModal, { ConflictResolution, TimeSlotSuggestion, ConflictingAppointment } from '../modals/ConflictResolutionModal'
import ConflictResolutionService from './ConflictResolutionService'
import { useTheme } from '@/contexts/ThemeContext'

// Types for appointments and calendar
export interface CalendarAppointment {
  id: string
  title: string
  client: string
  clientId?: number
  barber: string
  barberId: number
  startTime: string
  endTime: string
  service: string
  serviceId?: number
  price: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show'
  date: string
  notes?: string
  duration: number // in minutes
  clientPhone?: string
  clientEmail?: string
  __dragProps?: any // For drag and drop functionality
  isGoogleEvent?: boolean // Google Calendar event indicator
  __eventColors?: { // Custom event colors
    color?: string
    backgroundColor?: string
    borderColor?: string
    textColor?: string
  }
}

export interface CalendarProps {
  appointments?: CalendarAppointment[]
  onAppointmentClick?: (appointment: CalendarAppointment) => void
  onTimeSlotClick?: (date: string, time: string) => void
  onCreateAppointment?: (date: string, time: string) => void
  onUpdateAppointment?: (appointment: CalendarAppointment) => void
  onDeleteAppointment?: (appointmentId: string) => void
  initialView?: 'month' | 'week' | 'day'
  initialDate?: Date
  workingHours?: { start: string; end: string }
  timeSlotDuration?: number // in minutes
  barbers?: Array<{ id: number; name: string; color?: string }>
  services?: Array<{ id: number; name: string; duration: number; price: number }>
  isLoading?: boolean
  darkMode?: boolean // Deprecated - use theme context instead
}

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

// Default working hours and time slots
const DEFAULT_WORKING_HOURS = { start: '08:00', end: '20:00' }
const DEFAULT_TIME_SLOT_DURATION = 30

// Helper function to format date as YYYY-MM-DD without timezone conversion
const formatDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Generate time slots based on working hours and duration
const generateTimeSlots = (start: string, end: string, duration: number = 30): string[] => {
  const slots: string[] = []
  const startTime = new Date(`2024-01-01 ${start}`)
  const endTime = new Date(`2024-01-01 ${end}`)

  const current = new Date(startTime)
  while (current < endTime) {
    slots.push(current.toTimeString().slice(0, 5))
    current.setMinutes(current.getMinutes() + duration)
  }

  return slots
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
  onAppointmentClick,
  onTimeSlotClick,
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
  // Calendar view props
  initialView = 'week',
  initialDate,
  timeSlotDuration = DEFAULT_TIME_SLOT_DURATION,
  ...calendarProps
}: UnifiedCalendarProps) {
  // Theme context
  const { theme, getThemeColors } = useTheme()
  const colors = getThemeColors()

  // Calendar navigation state
  const [currentDate, setCurrentDate] = useState(initialDate || new Date())
  const [selectedView, setSelectedView] = useState<'month' | 'week' | 'day'>(initialView)
  const [selectedDate, setSelectedDate] = useState(currentDate)
  const [hoveredTimeSlot, setHoveredTimeSlot] = useState<{ date: string; time: string } | null>(null)
  // Prevent SSR issues by checking for client-side rendering
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  // Global event listeners for drag state cleanup
  useEffect(() => {
    const resetDragState = () => {
      setDragState({
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
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Reset drag state on ESC key
      if (e.key === 'Escape' && dragState.isDragging) {
        console.log('🔧 ESC pressed - resetting drag state')
        resetDragState()
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      // Don't interfere with drag operations
      // The dragend event will handle cleanup for drag operations
      // This is only for non-drag mouse operations
    }

    const handleDragEnd = (e: DragEvent) => {
      // Global dragend fallback - only reset if not handled by drop
      if (dragState.isDragging && e.dataTransfer.dropEffect === 'none') {
        console.log('🔧 Global drag end - no drop occurred, resetting drag state')
        resetDragState()
      }
    }

    // Add global event listeners
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('dragend', handleDragEnd)

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('dragend', handleDragEnd)
    }
  }, [dragState.isDragging])

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

  // Optimistic updates state for immediate visual feedback
  const [optimisticMoves, setOptimisticMoves] = useState<Map<string, { newDate: string; newTime: string }>>(new Map())
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

  // Client-side only mock appointments to prevent SSR issues
  const effectiveAppointments = useMemo(() => {
    // Only generate mock data on client-side to prevent SSR errors
    if (typeof window === 'undefined') {
      console.log('📱 SSR: Returning empty appointments for server rendering')
      return []
    }

    // Use real appointments if available, otherwise show demo appointments
    if (appointments && appointments.length > 0) {
      console.log('📅 Using real appointments:', appointments.length)
      return appointments
    } else if (isDemoMode) {
      console.log('🎭 Demo mode: Using mock appointments')
      const mockAppts = generateMockAppointments()
      return mockAppts
    }

    console.log('📅 No appointments available')
    return []
  }, [appointments, isDemoMode])

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
    const appointmentsToExport = filteredAppointments.length > 0 ? filteredAppointments : effectiveAppointments

    if (format === 'csv') {
      // Generate CSV content
      const headers = ['Date', 'Time', 'Client', 'Service', 'Barber', 'Status', 'Price', 'Notes']
      const rows = appointmentsToExport.map(apt => [
        apt.date,
        apt.time,
        apt.client,
        apt.service,
        apt.barber,
        apt.status,
        `$${apt.price || 0}`,
        apt.notes || ''
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `appointments-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else if (format === 'pdf') {
      // Generate simple PDF using print functionality
      const printContent = `
        <html>
          <head>
            <title>Appointments Export</title>
            <style>
              body { font-family: Arial, sans-serif; }
              h1 { color: #333; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f4f4f4; font-weight: bold; }
              @media print { body { margin: 20px; } }
            </style>
          </head>
          <body>
            <h1>Appointments Export - ${new Date().toLocaleDateString()}</h1>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Barber</th>
                  <th>Status</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                ${appointmentsToExport.map(apt => `
                  <tr>
                    <td>${apt.date}</td>
                    <td>${apt.time}</td>
                    <td>${apt.client}</td>
                    <td>${apt.service}</td>
                    <td>${apt.barber}</td>
                    <td>${apt.status}</td>
                    <td>$${apt.price || 0}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `

      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(printContent)
        printWindow.document.close()
        printWindow.print()
      }
    } else if (format === 'ical') {
      // Generate iCal format
      const icalEvents = appointmentsToExport.map(apt => {
        const startDate = new Date(`${apt.date}T${apt.time}`)
        const endDate = new Date(startDate.getTime() + (apt.duration || 60) * 60000)

        return [
          'BEGIN:VEVENT',
          `UID:${apt.id}@bookedbarber.com`,
          `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
          `DTEND:${endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
          `SUMMARY:${apt.client} - ${apt.service}`,
          `DESCRIPTION:Barber: ${apt.barber}\\nStatus: ${apt.status}${apt.notes ? `\\nNotes: ${apt.notes}` : ''}`,
          `STATUS:${apt.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
          'END:VEVENT'
        ].join('\r\n')
      }).join('\r\n')

      const icalContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Booked Barber//Calendar Export//EN',
        'CALSCALE:GREGORIAN',
        icalEvents,
        'END:VCALENDAR'
      ].join('\r\n')

      // Download iCal file
      const blob = new Blob([icalContent], { type: 'text/calendar' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `appointments-${new Date().toISOString().split('T')[0]}.ics`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }, [filteredAppointments, effectiveAppointments])

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

  // Enhance appointments with drag & drop handlers and custom styling
  const enhancedAppointments = useMemo(() => {
    console.log('🔧 Enhancing appointments, enableDragDrop:', enableDragDrop)

    const enhanced = filteredAppointments.map(appointment => {
      // Apply Google Calendar event colors if present
      let customStyle = {}
      if (appointment.__eventColors) {
        customStyle = {
          backgroundColor: appointment.__eventColors.backgroundColor,
          borderColor: appointment.__eventColors.borderColor,
          color: appointment.__eventColors.textColor,
          borderWidth: '2px',
          borderStyle: 'solid'
        }
      }

      // Apply optimistic updates if any exist for this appointment
      const optimisticUpdate = optimisticMoves.get(appointment.id)
      const finalAppointment = optimisticUpdate ? {
        ...appointment,
        date: optimisticUpdate.newDate,
        startTime: optimisticUpdate.newTime,
        __optimistic: true // Flag to indicate this is an optimistic update
      } : appointment

      // Return appointment with styling and optimistic updates
      return {
        ...finalAppointment,
        __customStyle: customStyle
      }
    })

    console.log('🔧 Enhanced appointments sample:', enhanced[0]?.__dragProps ? 'Has __dragProps' : 'No __dragProps')
    return enhanced
  }, [filteredAppointments, enableDragDrop])

  // Pass through click handlers to PremiumCalendar with proper event handling
  const handleAppointmentClickInternal = useCallback((appointment: CalendarAppointment) => {
    console.log('🔥 UnifiedCalendar: Appointment clicked', appointment.id, appointment.client)
    if (onAppointmentClick) {
      onAppointmentClick(appointment)
    }
  }, [onAppointmentClick])

  const handleTimeSlotClickInternal = useCallback((date: string, time: string) => {
    console.log('🔥 UnifiedCalendar: Time slot clicked', date, time)
    if (onTimeSlotClick) {
      onTimeSlotClick(date, time)
    }
  }, [onTimeSlotClick])

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

      // Reset drag state after successful drop
      setDragState({
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

    } catch (error) {
      console.error('Error handling drop:', error)
      // Reset drag state on error as well
      setDragState({
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

  // Calendar helper functions
  const timeSlots = useMemo(() => generateTimeSlots(workingHours.start, workingHours.end, timeSlotDuration), [workingHours, timeSlotDuration])

  // Get week dates for week view
  const weekDates = useMemo(() => {
    const dates = []
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    startOfWeek.setDate(currentDate.getDate() - day)

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      dates.push(date)
    }
    return dates
  }, [currentDate])

  // Get appointments for a specific date
  const getAppointmentsForDate = useCallback((date: Date) => {
    const dateStr = formatDateString(date)
    return enhancedAppointments.filter(apt => apt.date === dateStr)
  }, [enhancedAppointments])

  // Handle navigation
  const navigatePeriod = useCallback((direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)

    if (selectedView === 'month') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1))
    } else if (selectedView === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
    } else {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1))
    }

    setCurrentDate(newDate)
  }, [currentDate, selectedView])

  // Get current period text for header
  const getCurrentPeriodText = useCallback(() => {
    const options: Intl.DateTimeFormatOptions = selectedView === 'month'
      ? { year: 'numeric', month: 'long' }
      : selectedView === 'week'
      ? { month: 'short', day: 'numeric' }
      : { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }

    return currentDate.toLocaleDateString('en-US', options)
  }, [currentDate, selectedView])

  // Check if a date is today
  const isToday = useCallback((date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }, [])

  // Appointment styling based on status
  const getAppointmentStyle = useCallback((status: CalendarAppointment['status'], barberId?: number) => {
    const baseClasses = 'text-white shadow-lg border border-white/20 backdrop-blur-sm'

    switch (status) {
      case 'confirmed':
        return `${baseClasses} bg-gradient-to-br from-violet-500 to-purple-600`
      case 'pending':
        return `${baseClasses} bg-gradient-to-br from-amber-500 to-orange-600`
      case 'completed':
        return `${baseClasses} bg-gradient-to-br from-green-500 to-emerald-600`
      case 'cancelled':
        return `${baseClasses} bg-gradient-to-br from-gray-500 to-gray-600`
      case 'no_show':
        return `${baseClasses} bg-gradient-to-br from-red-500 to-red-600`
      default:
        return `${baseClasses} bg-gradient-to-br from-blue-500 to-indigo-600`
    }
  }, [])

  // Status badge styling
  const getStatusBadge = useCallback((status: CalendarAppointment['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-violet-100 text-violet-800 border-violet-200'
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'no_show':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }, [])

  // Handle time slot hover for drag feedback
  const handleTimeSlotHover = useCallback((date: Date, time: string, isEntering: boolean) => {
    if (isEntering && dragState.isDragging) {
      setHoveredTimeSlot({ date: formatDateString(date), time })
    } else if (!isEntering) {
      setHoveredTimeSlot(null)
    }
  }, [dragState.isDragging])

  // Handle time slot click
  const handleTimeSlotClick = useCallback((date: Date, time: string) => {
    const dateStr = formatDateString(date)
    console.log('🖱️ Time slot clicked in UnifiedCalendar:', dateStr, time)
    if (onTimeSlotClick) {
      onTimeSlotClick(dateStr, time)
    }
  }, [onTimeSlotClick])

  // Early return for SSR to prevent initialization errors
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-400"></div>
      </div>
    )
  }

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
        <div className="border-b p-4 space-y-4" style={{
          backgroundColor: colors.cardBackground,
          borderColor: colors.border
        }}>
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
                  className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  style={{
                    backgroundColor: theme === 'light' || theme === 'soft-light' ? '#ffffff' : '#374151',
                    borderColor: colors.border,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.border}`
                  }}
                />
              </div>

              {/* Filter Toggle Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                style={{
                  backgroundColor: showFilters
                    ? (theme === 'soft-light' ? '#7c9885' : '#8b5cf6')
                    : (theme === 'light' || theme === 'soft-light' ? '#e5e7eb' : '#374151'),
                  color: showFilters ? '#ffffff' : colors.textSecondary
                }}
                onMouseEnter={(e) => {
                  if (!showFilters) {
                    e.currentTarget.style.backgroundColor = theme === 'light' || theme === 'soft-light' ? '#d1d5db' : '#4b5563'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showFilters) {
                    e.currentTarget.style.backgroundColor = theme === 'light' || theme === 'soft-light' ? '#e5e7eb' : '#374151'
                  }
                }}
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
                  className="px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                  style={{
                    backgroundColor: theme === 'light' || theme === 'soft-light' ? '#e5e7eb' : '#374151',
                    color: colors.textSecondary
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme === 'light' || theme === 'soft-light' ? '#d1d5db' : '#4b5563'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme === 'light' || theme === 'soft-light' ? '#e5e7eb' : '#374151'
                  }}
                  title="Export as CSV"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                  style={{
                    backgroundColor: theme === 'light' || theme === 'soft-light' ? '#e5e7eb' : '#374151',
                    color: colors.textSecondary
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme === 'light' || theme === 'soft-light' ? '#d1d5db' : '#4b5563'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme === 'light' || theme === 'soft-light' ? '#e5e7eb' : '#374151'
                  }}
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
                className="rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                style={{
                  backgroundColor: theme === 'light' || theme === 'soft-light' ? '#ffffff' : '#374151',
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`
                }}
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
                className="rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                style={{
                  backgroundColor: theme === 'light' || theme === 'soft-light' ? '#ffffff' : '#374151',
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`
                }}
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
                className="rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500"
                style={{
                  backgroundColor: theme === 'light' || theme === 'soft-light' ? '#ffffff' : '#374151',
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`
                }}
              >
                <option value="">All Services</option>
                {filterOptions.services.map(service => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>

              {/* Clear Filters Button */}
              <button
                onClick={clearFilters}
                className="flex items-center justify-center space-x-2 px-4 py-2 text-white rounded-lg transition-colors"
                style={{
                  backgroundColor: '#ef4444'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ef4444'
                }}
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
        <div className="rounded-lg p-4 mb-4" style={{
          backgroundColor: theme === 'soft-light' ? 'rgba(124, 152, 133, 0.2)' : 'rgba(139, 92, 246, 0.2)',
          borderColor: theme === 'soft-light' ? 'rgba(124, 152, 133, 0.3)' : 'rgba(139, 92, 246, 0.3)',
          border: '1px solid'
        }}>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{
              backgroundColor: theme === 'soft-light' ? '#7c9885' : '#a78bfa'
            }}></div>
            <span className="text-sm font-medium" style={{
              color: theme === 'soft-light' ? '#7c9885' : '#a78bfa'
            }}>
              Demo Mode: Showing sample appointments
            </span>
          </div>
          <p className="text-xs mt-1" style={{
            color: theme === 'soft-light' ? 'rgba(124, 152, 133, 0.8)' : 'rgba(167, 139, 250, 0.8)'
          }}>
            Try dragging appointments to test the drag & drop functionality
          </p>
        </div>
      )}

      {/* Debug Information */}
      {false && (
        <div className="p-2 rounded text-xs mb-4" style={{
          backgroundColor: colors.cardBackground,
          color: colors.textSecondary
        }}>
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
                <span className="ml-2" style={{ color: '#22c55e' }}>✓ Drag Props</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Enhanced Calendar with all drag & drop functionality */}
      <div
        className="calendar-container relative z-10"
        style={{ pointerEvents: 'auto' }}
        data-drag-drop-enabled={enableDragDrop}
        onClick={(e) => {
          console.log('🔍 DIAGNOSTIC: Click reached calendar container!', e.target)
          console.log('🔍 Target element:', (e.target as HTMLElement).tagName, (e.target as HTMLElement).className)
        }}
        onDragOver={(e) => {
          if (enableDragDrop) {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
          }
        }}
        onDrop={(e) => {
          console.log('📦 Drop event triggered on calendar container', {
            enableDragDrop,
            isDragging: dragState.isDragging,
            target: e.target,
            currentTarget: e.currentTarget
          })

          if (enableDragDrop && dragState.isDragging) {
            e.preventDefault()
            e.stopPropagation()

            const timeSlot = (e.target as HTMLElement).closest('[data-time-slot]')
            console.log('📦 Looking for time slot:', timeSlot)

            if (timeSlot) {
              const date = timeSlot.getAttribute('data-date')
              const time = timeSlot.getAttribute('data-time')
              console.log('📦 Time slot attributes:', { date, time })

              if (date && time) {
                console.log('📦 Handling drop on time slot:', date, time)
                handleTimeSlotDrop(e, date, time)
              }
            }
          }
        }}
      >
        {/* Inline Calendar Implementation with Drag & Drop */}
        <div className="rounded-lg border overflow-hidden" style={{
          backgroundColor: colors.cardBackground,
          borderColor: colors.border
        }}>
          {/* Calendar Header */}
          <div className="border-b p-4" style={{
            backgroundColor: theme === 'light' || theme === 'soft-light' ? colors.background : colors.cardBackground,
            borderColor: colors.border
          }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigatePeriod('prev')}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    ':hover': {
                      backgroundColor: theme === 'light' || theme === 'soft-light' ? '#e5e7eb' : '#374151'
                    }
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme === 'light' || theme === 'soft-light' ? '#e5e7eb' : '#374151'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <ChevronLeftIcon className="h-5 w-5" style={{ color: colors.textSecondary }} />
                </button>
                <h2 className="text-xl font-semibold" style={{ color: colors.textPrimary }}>
                  {getCurrentPeriodText()}
                </h2>
                <button
                  onClick={() => navigatePeriod('next')}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    ':hover': {
                      backgroundColor: theme === 'light' || theme === 'soft-light' ? '#e5e7eb' : '#374151'
                    }
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme === 'light' || theme === 'soft-light' ? '#e5e7eb' : '#374151'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <ChevronRightIcon className="h-5 w-5" style={{ color: colors.textSecondary }} />
                </button>
              </div>

              {/* View Toggle */}
              <div className="flex rounded-lg p-1" style={{
                backgroundColor: theme === 'light' || theme === 'soft-light' ? '#e5e7eb' : '#4b5563'
              }}>
                {(['day', 'week', 'month'] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setSelectedView(view)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                      selectedView === view
                        ? 'text-white shadow-sm'
                        : ''
                    }`}
                    style={{
                      backgroundColor: selectedView === view
                        ? (theme === 'soft-light' ? '#7c9885' : theme === 'charcoal' ? '#6b7280' : '#8b5cf6')
                        : 'transparent',
                      color: selectedView === view
                        ? '#ffffff'
                        : colors.textSecondary
                    }}
                    onMouseEnter={(e) => {
                      if (selectedView !== view) {
                        e.currentTarget.style.backgroundColor = theme === 'light' || theme === 'soft-light' ? '#d1d5db' : '#374151'
                        e.currentTarget.style.color = colors.textPrimary
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedView !== view) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = colors.textSecondary
                      }
                    }}
                  >
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar Content */}
          <div className="calendar-view">
            {selectedView === 'week' && (
              <div className="flex flex-col">
                {/* Week Header */}
                <div className="grid grid-cols-8 border-b" style={{ borderColor: colors.border }}>
                  <div className="p-3 text-center text-sm font-medium border-r" style={{
                    color: colors.textSecondary,
                    borderColor: colors.border
                  }}>
                    Time
                  </div>
                  {weekDates.map((date, index) => (
                    <div
                      key={index}
                      className={`p-3 text-center border-r last:border-r-0`}
                      style={{
                        borderColor: colors.border,
                        backgroundColor: isToday(date)
                          ? (theme === 'soft-light' ? 'rgba(124, 152, 133, 0.2)' : 'rgba(139, 92, 246, 0.2)')
                          : 'transparent',
                        color: isToday(date)
                          ? (theme === 'soft-light' ? '#7c9885' : '#a78bfa')
                          : colors.textSecondary
                      }}
                    >
                      <div className="text-xs font-medium">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-lg font-bold" style={{
                        color: isToday(date)
                          ? (theme === 'soft-light' ? '#7c9885' : '#a78bfa')
                          : colors.textPrimary
                      }}>
                        {date.getDate()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Time Slots Grid */}
                <div className="flex-1 overflow-y-auto max-h-[600px]">
                  {timeSlots.map((timeSlot) => (
                    <div key={timeSlot} className="grid grid-cols-8 border-b min-h-[60px]" style={{
                      borderColor: colors.border + '80'
                    }}>
                      {/* Time Column */}
                      <div className="p-2 text-right text-sm border-r flex items-center justify-end" style={{
                        color: colors.textSecondary,
                        borderColor: colors.border,
                        backgroundColor: theme === 'light' || theme === 'soft-light' ? colors.background : 'transparent'
                      }}>
                        {timeSlot}
                      </div>

                      {/* Day Columns */}
                      {weekDates.map((date, dayIndex) => {
                        const dateStr = formatDateString(date)
                        const dayAppointments = getAppointmentsForDate(date).filter(
                          apt => apt.startTime === timeSlot
                        )
                        if (dayAppointments.length > 0 && dayIndex === 0 && timeSlot === timeSlots[0]) {
                          console.log('🔍 Day appointment check:', {
                            id: dayAppointments[0].id,
                            hasDragProps: !!dayAppointments[0].__dragProps,
                            dragPropsKeys: dayAppointments[0].__dragProps ? Object.keys(dayAppointments[0].__dragProps) : []
                          })
                        }
                        const isHovered = hoveredTimeSlot?.date === dateStr && hoveredTimeSlot?.time === timeSlot

                        return (
                          <div
                            key={`${dateStr}-${timeSlot}`}
                            data-time-slot
                            data-date={dateStr}
                            data-time={timeSlot}
                            className={`relative border-r last:border-r-0 min-h-[60px] p-1 transition-all duration-200`}
                            style={{
                              borderColor: colors.border,
                              backgroundColor: isHovered && dragState.isDragging
                                ? (theme === 'soft-light' ? 'rgba(124, 152, 133, 0.2)' : 'rgba(139, 92, 246, 0.2)')
                                : 'transparent',
                              borderWidth: isHovered && dragState.isDragging ? '2px' : '1px',
                              borderStyle: 'solid'
                            }}
                            onMouseEnter={(e) => {
                              if (!dragState.isDragging) {
                                e.currentTarget.style.backgroundColor = theme === 'light' ? '#f3f4f6' : theme === 'soft-light' ? '#f0efea' : 'rgba(55, 65, 81, 0.3)'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!dragState.isDragging || !isHovered) {
                                e.currentTarget.style.backgroundColor = 'transparent'
                              }
                            }}
                            onDragOver={(e) => {
                              if (enableDragDrop) {
                                e.preventDefault()
                                e.dataTransfer.dropEffect = 'move'
                                handleTimeSlotHover(date, timeSlot, true)
                              }
                            }}
                            onDragLeave={(e) => {
                              if (enableDragDrop) {
                                // Only clear if we're actually leaving this element
                                const rect = e.currentTarget.getBoundingClientRect()
                                const x = e.clientX
                                const y = e.clientY
                                if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                                  handleTimeSlotHover(date, timeSlot, false)
                                }
                              }
                            }}
                            onDrop={(e) => {
                              if (enableDragDrop) {
                                console.log('📦 Drop on time slot:', dateStr, timeSlot)
                                handleTimeSlotDrop(e, dateStr, timeSlot)
                                handleTimeSlotHover(date, timeSlot, false)
                              }
                            }}
                            onClick={() => {
                              console.log('🖱️ Time slot clicked:', dateStr, timeSlot)
                              handleTimeSlotClick(date, timeSlot)
                            }}
                          >
                            {/* Time Slot Click Area */}
                            {dayAppointments.length === 0 && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <PlusIcon className="h-4 w-4" style={{ color: colors.textSecondary }} />
                              </div>
                            )}

                            {/* Appointments in this time slot */}
                            {dayAppointments.map((appointment) => (
                              <div
                                key={appointment.id}
                                className={`appointment-block relative w-full rounded-md p-2 text-xs text-white cursor-pointer select-none ${getAppointmentStyle(appointment.status, appointment.barberId)}`}
                                style={appointment.__customStyle || {}}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  console.log('🖱️ Appointment clicked:', appointment.id, appointment.client)
                                  handleAppointmentClickInternal(appointment)
                                }}
                                onMouseEnter={() => setHoveredAppointment(appointment.id)}
                                onMouseLeave={() => setHoveredAppointment(null)}
                                draggable={true}
                                onDragStart={(e) => {
                                  console.log('🎯 DIRECT onDragStart fired!', appointment.id)
                                  e.stopPropagation()
                                  e.dataTransfer.setData('text/plain', JSON.stringify({
                                    appointmentId: appointment.id,
                                    originalDate: appointment.date,
                                    originalTime: appointment.startTime
                                  }))
                                  setDragState(prev => ({
                                    ...prev,
                                    isDragging: true,
                                    draggedAppointment: appointment
                                  }))
                                }}
                                onDragEnd={(e) => {
                                  console.log('🎯 DIRECT onDragEnd fired!')
                                  setDragState(prev => ({
                                    ...prev,
                                    isDragging: false,
                                    draggedAppointment: null
                                  }))
                                }}
                                style={appointment.__customStyle ? { ...appointment.__customStyle, cursor: 'move' } : { cursor: 'move' }}
                              >
                                <div className="font-medium truncate">{appointment.client}</div>
                                <div className="text-xs opacity-90 truncate">{appointment.service}</div>
                                <div className="text-xs opacity-75 mt-1 flex items-center space-x-2">
                                  <span className="flex items-center">
                                    <UserIcon className="h-3 w-3 mr-1" />
                                    {appointment.barber.split(' ')[0]}
                                  </span>
                                  <span className="flex items-center">
                                    <ClockIcon className="h-3 w-3 mr-1" />
                                    {appointment.duration}m
                                  </span>
                                  <span className="flex items-center">
                                    <CurrencyDollarIcon className="h-3 w-3 mr-1" />
                                    {appointment.price}
                                  </span>
                                </div>

                                {/* Status Badge */}
                                <div className={`absolute top-1 right-1 px-1 py-0.5 rounded text-xs font-medium border ${getStatusBadge(appointment.status)}`}>
                                  {appointment.status}
                                </div>

                                {/* Google Calendar Indicator */}
                                {appointment.isGoogleEvent && (
                                  <div className="absolute top-1 left-1" title="Google Calendar Event">
                                    <CalendarIconOutline className="h-3 w-3 text-white/80" />
                                  </div>
                                )}

                                {/* Drag Handle Indicator */}
                                {enableDragDrop && hoveredAppointment === appointment.id && (
                                  <div className="absolute bottom-1 right-1 text-white/70">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M3 7a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 13a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"></path>
                                    </svg>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedView === 'day' && (
              <div className="flex flex-col">
                {/* Day Header */}
                <div className="border-b p-4 text-center" style={{ borderColor: colors.border }}>
                  <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                    {currentDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h3>
                </div>

                {/* Day Time Slots */}
                <div className="flex-1 overflow-y-auto max-h-[600px]">
                  {timeSlots.map((timeSlot) => {
                    const dateStr = formatDateString(currentDate)
                    const slotAppointments = getAppointmentsForDate(currentDate).filter(
                      apt => apt.startTime === timeSlot
                    )
                    const isHovered = hoveredTimeSlot?.date === dateStr && hoveredTimeSlot?.time === timeSlot

                    return (
                      <div
                        key={timeSlot}
                        className="flex border-b min-h-[80px]"
                        style={{ borderColor: colors.border + '80' }}
                      >
                        {/* Time Column */}
                        <div className="w-20 p-3 text-right text-sm border-r flex items-center justify-end" style={{
                          color: colors.textSecondary,
                          borderColor: colors.border,
                          backgroundColor: theme === 'light' || theme === 'soft-light' ? colors.background : 'transparent'
                        }}>
                          {timeSlot}
                        </div>

                        {/* Appointment Area */}
                        <div
                          data-time-slot
                          data-date={dateStr}
                          data-time={timeSlot}
                          className="flex-1 p-2 transition-all duration-200"
                          style={{
                            backgroundColor: isHovered && dragState.isDragging
                              ? (theme === 'soft-light' ? 'rgba(124, 152, 133, 0.2)' : 'rgba(139, 92, 246, 0.2)')
                              : 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            if (!dragState.isDragging) {
                              e.currentTarget.style.backgroundColor = theme === 'light' ? '#f3f4f6' : theme === 'soft-light' ? '#f0efea' : 'rgba(55, 65, 81, 0.3)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!dragState.isDragging || !isHovered) {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }
                          }}
                          onDragOver={(e) => {
                            if (enableDragDrop) {
                              e.preventDefault()
                              e.dataTransfer.dropEffect = 'move'
                              handleTimeSlotHover(currentDate, timeSlot, true)
                            }
                          }}
                          onDragLeave={(e) => {
                            if (enableDragDrop) {
                              const rect = e.currentTarget.getBoundingClientRect()
                              const x = e.clientX
                              const y = e.clientY
                              if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                                handleTimeSlotHover(currentDate, timeSlot, false)
                              }
                            }
                          }}
                          onDrop={(e) => {
                            if (enableDragDrop) {
                              console.log('📦 Drop on day time slot:', dateStr, timeSlot)
                              handleTimeSlotDrop(e, dateStr, timeSlot)
                              handleTimeSlotHover(currentDate, timeSlot, false)
                            }
                          }}
                          onClick={() => {
                            console.log('🖱️ Day time slot clicked:', dateStr, timeSlot)
                            handleTimeSlotClick(currentDate, timeSlot)
                          }}
                        >
                          {slotAppointments.length === 0 && (
                            <div className="flex items-center justify-center h-full opacity-0 hover:opacity-100 transition-opacity">
                              <PlusIcon className="h-5 w-5" style={{ color: colors.textSecondary }} />
                            </div>
                          )}

                          {slotAppointments.map((appointment) => (
                            <div
                              key={appointment.id}
                              className={`appointment-block mb-2 rounded-lg p-3 text-sm text-white cursor-pointer select-none ${getAppointmentStyle(appointment.status, appointment.barberId)}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                console.log('🖱️ Day appointment clicked:', appointment.id, appointment.client)
                                handleAppointmentClickInternal(appointment)
                              }}
                              onMouseEnter={() => setHoveredAppointment(appointment.id)}
                              onMouseLeave={() => setHoveredAppointment(null)}
                              draggable={true}
                              onDragStart={(e) => {
                                console.log('🎯 DIRECT DAY onDragStart fired!', appointment.id)
                                e.stopPropagation()
                                e.dataTransfer.setData('text/plain', JSON.stringify({
                                  appointmentId: appointment.id,
                                  originalDate: appointment.date,
                                  originalTime: appointment.startTime
                                }))
                                setDragState(prev => ({
                                  ...prev,
                                  isDragging: true,
                                  draggedAppointment: appointment
                                }))
                              }}
                              onDragEnd={(e) => {
                                console.log('🎯 DIRECT DAY onDragEnd fired!')
                                setDragState(prev => ({
                                  ...prev,
                                  isDragging: false,
                                  draggedAppointment: null
                                }))
                              }}
                              style={appointment.__customStyle ? { ...appointment.__customStyle, cursor: 'move' } : { cursor: 'move' }}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <div className="font-semibold">{appointment.client}</div>
                                  {appointment.isGoogleEvent && (
                                    <CalendarIconOutline className="h-4 w-4" style={{ opacity: 0.8 }} title="Google Calendar Event" />
                                  )}
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-medium border ${getStatusBadge(appointment.status)}`}>
                                  {appointment.status}
                                </div>
                              </div>
                              <div className="text-sm opacity-90 mb-2">{appointment.service}</div>
                              <div className="flex items-center space-x-4 text-xs opacity-75">
                                <span className="flex items-center">
                                  <UserIcon className="h-3 w-3 mr-1" />
                                  {appointment.barber}
                                </span>
                                <span className="flex items-center">
                                  <ClockIcon className="h-3 w-3 mr-1" />
                                  {appointment.duration} minutes
                                </span>
                                <span className="flex items-center">
                                  <CurrencyDollarIcon className="h-3 w-3 mr-1" />
                                  ${appointment.price}
                                </span>
                              </div>

                              {/* Drag Handle Indicator */}
                              {enableDragDrop && hoveredAppointment === appointment.id && (
                                <div className="absolute top-2 right-2 text-white/70">
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M3 7a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 13a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"></path>
                                  </svg>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {selectedView === 'month' && (
              <div className="p-4">
                <div className="text-center py-8" style={{ color: colors.textSecondary }}>
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <div className="text-lg font-medium">Month View</div>
                  <div className="text-sm">Month view implementation coming soon</div>
                  <div className="text-xs mt-2">Switch to Week or Day view for full functionality</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* All the existing drag/drop modals and animations will be added here */}
      {/* Appointment Move Confirmation Modal */}
      {pendingMove && (
        <AppointmentMoveConfirmation
          isOpen={isConfirmationOpen}
          onClose={() => {
            setIsConfirmationOpen(false)
            setPendingMove(null)
            // Ensure drag state is reset when modal is closed
            setDragState({
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

      {/* Enhanced Drag Visual Feedback */}
      <AnimatePresence>
        {dragState.isDragging && dragState.draggedAppointment && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-6 py-3 rounded-xl shadow-2xl border border-violet-400/20 backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
                <div>
                  <div className="font-semibold text-sm">Moving Appointment</div>
                  <div className="text-xs opacity-90">
                    {dragState.draggedAppointment.client} - {dragState.draggedAppointment.service}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Enhanced Drag & Drop Styles */}
      <style jsx global>{`
        /* Enhanced drop zone visual feedback */
        .calendar-container [data-time-slot] {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .calendar-container [data-time-slot]:hover {
          background-color: rgba(139, 92, 246, 0.1);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
        }

        .calendar-container [data-time-slot].drop-target-valid {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(139, 92, 246, 0.2));
          border: 2px solid rgb(34, 197, 94);
          box-shadow:
            inset 0 0 0 1px rgba(34, 197, 94, 0.5),
            0 4px 12px rgba(34, 197, 94, 0.3),
            0 0 0 4px rgba(34, 197, 94, 0.1);
          animation: validPulse 2s infinite;
        }

        .calendar-container [data-time-slot].drop-target-invalid {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2));
          border: 2px solid rgb(239, 68, 68);
          box-shadow:
            inset 0 0 0 1px rgba(239, 68, 68, 0.5),
            0 4px 12px rgba(239, 68, 68, 0.3),
            0 0 0 4px rgba(239, 68, 68, 0.1);
          animation: invalidShake 0.6s ease-in-out;
        }

        @keyframes validPulse {
          0%, 100% {
            box-shadow:
              inset 0 0 0 1px rgba(34, 197, 94, 0.5),
              0 4px 12px rgba(34, 197, 94, 0.3),
              0 0 0 4px rgba(34, 197, 94, 0.1);
          }
          50% {
            box-shadow:
              inset 0 0 0 1px rgba(34, 197, 94, 0.8),
              0 8px 20px rgba(34, 197, 94, 0.4),
              0 0 0 8px rgba(34, 197, 94, 0.2);
          }
        }

        @keyframes invalidShake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-3px) rotateZ(-1deg); }
          20%, 40%, 60%, 80% { transform: translateX(3px) rotateZ(1deg); }
        }

        /* Enhanced appointment dragging */
        .calendar-container .appointment-block {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: ${enableDragDrop ? 'grab' : 'pointer'};
          touch-action: none;
          position: relative;
        }

        .calendar-container .appointment-block:hover {
          transform: scale(1.02) translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          z-index: 10;
        }

        .calendar-container .appointment-block:active {
          cursor: ${enableDragDrop ? 'grabbing' : 'pointer'};
          transform: scale(0.98);
        }

        .calendar-container .appointment-block[draggable="true"]::after {
          content: '⋮⋮';
          position: absolute;
          top: 4px;
          right: 4px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 10px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .calendar-container .appointment-block[draggable="true"]:hover::after {
          opacity: 1;
        }

        /* Mobile touch optimizations */
        @media (pointer: coarse) {
          .calendar-container .appointment-block {
            min-height: 44px;
            padding: 8px;
          }

          .calendar-container [data-time-slot] {
            min-height: 50px;
          }
        }

        /* Focus indicators for accessibility */
        .calendar-container [data-time-slot]:focus,
        .calendar-container .appointment-block:focus {
          outline: 2px solid #8b5cf6;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  )
}

// Export the hook as well for backward compatibility
export const useUnifiedCalendar = () => {
  // Hook implementation will be added later
  return {}
}
