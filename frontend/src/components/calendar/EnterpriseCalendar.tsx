'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  CurrencyDollarIcon,
  PlusIcon,
  EllipsisHorizontalIcon,
  ArrowPathIcon,
  ViewColumnsIcon,
  Squares2X2Icon,
  CalendarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  Cog6ToothIcon,
  ShareIcon,
  PrinterIcon
} from '@heroicons/react/24/outline'

interface Appointment {
  id: string
  title: string
  client: string
  barber: string
  startTime: string
  endTime: string
  service: string
  price: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled'
  date: string
  duration?: number
  clientEmail?: string
  clientPhone?: string
  notes?: string
  confirmationNumber?: string
  barberAvatar?: string
  serviceColor?: string
  priority?: 'low' | 'medium' | 'high'
  isRecurring?: boolean
  recurringId?: string
  tags?: string[]
}

interface Barber {
  id: string
  name: string
  color: string
  avatar?: string
  status: 'online' | 'busy' | 'offline'
  workingHours?: { start: string; end: string }
  services?: string[]
}

interface CalendarProps {
  appointments?: Appointment[]
  onAppointmentClick?: (appointment: Appointment) => void
  onTimeSlotClick?: (date: string, time: string) => void
  onAppointmentDrop?: (appointmentId: string, newDate: string, newTime: string) => void
  view?: 'month' | 'week' | 'day' | 'agenda'
  theme?: 'light' | 'dark'
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
  showMiniCalendar?: boolean
  selectedBarbers?: string[]
  availableBarbers?: Barber[]
  onBarberFilter?: (barberIds: string[]) => void
  workingHours?: { start: string; end: string }
  timeSlotDuration?: number
  showWeekends?: boolean
  compactMode?: boolean
  enableDragDrop?: boolean
  showToolbar?: boolean
  enableVirtualScroll?: boolean
  cacheData?: boolean
  realTimeUpdates?: boolean
  onExport?: (format: 'pdf' | 'csv' | 'ical') => void
  onPrint?: () => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
  filterOptions?: {
    status?: string[]
    services?: string[]
    dateRange?: { start: Date; end: Date }
  }
}

// Default configuration
const DEFAULT_CONFIG = {
  workingHours: { start: '08:00', end: '20:00' },
  timeSlotDuration: 30,
  theme: 'dark',
  view: 'week',
  showWeekends: true,
  enableDragDrop: true,
  showToolbar: true,
  enableVirtualScroll: true,
  cacheData: true,
  realTimeUpdates: true
}

// Service colors for visual distinction
const SERVICE_COLORS = {
  'Premium Cut': '#8b5cf6',
  'Classic Fade': '#3b82f6',
  'Beard Trim': '#10b981',
  'Special Event': '#f59e0b',
  'Hair Wash': '#06b6d4',
  'Styling': '#ec4899',
  'Color': '#8b5cf6',
  'Treatment': '#6366f1',
  'Consultation': '#64748b'
}

// Mock data with enhanced properties
const mockAppointments: Appointment[] = [
  {
    id: '1',
    title: 'Premium Haircut & Styling',
    client: 'John Smith',
    barber: 'Marcus Johnson',
    startTime: '09:00',
    endTime: '10:00',
    service: 'Premium Cut',
    price: 85,
    status: 'confirmed',
    date: new Date().toISOString().split('T')[0],
    duration: 60,
    clientEmail: 'john.smith@email.com',
    clientPhone: '(555) 123-4567',
    notes: 'VIP client, prefers specific styling',
    confirmationNumber: 'BK001',
    serviceColor: SERVICE_COLORS['Premium Cut'],
    priority: 'high',
    tags: ['VIP', 'Regular']
  },
  {
    id: '2',
    title: 'Modern Fade Cut',
    client: 'David Rodriguez',
    barber: 'Marcus Johnson',
    startTime: '10:30',
    endTime: '11:30',
    service: 'Classic Fade',
    price: 65,
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    duration: 60,
    clientEmail: 'david.r@email.com',
    clientPhone: '(555) 987-6543',
    notes: 'High fade, short on sides',
    confirmationNumber: 'BK002',
    serviceColor: SERVICE_COLORS['Classic Fade'],
    priority: 'medium',
    tags: ['New Client']
  },
  {
    id: '3',
    title: 'Beard Sculpting & Trim',
    client: 'Michael Brown',
    barber: 'Sarah Mitchell',
    startTime: '14:00',
    endTime: '14:30',
    service: 'Beard Trim',
    price: 35,
    status: 'completed',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
    duration: 30,
    clientEmail: 'mike.brown@email.com',
    clientPhone: '(555) 456-7890',
    notes: 'Allergic to certain beard oils',
    confirmationNumber: 'BK003',
    serviceColor: SERVICE_COLORS['Beard Trim'],
    priority: 'low',
    tags: ['Allergy Alert']
  },
  {
    id: '4',
    title: 'Wedding Day Special',
    client: 'James Wilson',
    barber: 'Sarah Mitchell',
    startTime: '16:00',
    endTime: '17:30',
    service: 'Special Event',
    price: 120,
    status: 'confirmed',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
    duration: 90,
    clientEmail: 'james.wilson@email.com',
    clientPhone: '(555) 321-0987',
    notes: 'Wedding tomorrow, premium styling required',
    confirmationNumber: 'BK004',
    serviceColor: SERVICE_COLORS['Special Event'],
    priority: 'high',
    tags: ['Wedding', 'Special Event']
  }
]

const mockBarbers: Barber[] = [
  { 
    id: 'marcus', 
    name: 'Marcus Johnson', 
    color: '#8b5cf6', 
    avatar: '/avatars/marcus.jpg',
    status: 'online',
    workingHours: { start: '09:00', end: '17:00' },
    services: ['Premium Cut', 'Classic Fade', 'Styling']
  },
  { 
    id: 'sarah', 
    name: 'Sarah Mitchell', 
    color: '#10b981', 
    avatar: '/avatars/sarah.jpg',
    status: 'busy',
    workingHours: { start: '10:00', end: '18:00' },
    services: ['Beard Trim', 'Special Event', 'Color']
  },
  { 
    id: 'alex', 
    name: 'Alex Rodriguez', 
    color: '#f59e0b', 
    avatar: '/avatars/alex.jpg',
    status: 'offline',
    workingHours: { start: '08:00', end: '16:00' },
    services: ['Hair Wash', 'Treatment', 'Consultation']
  }
]

export default function EnterpriseCalendar({
  appointments = mockAppointments,
  availableBarbers = mockBarbers,
  onAppointmentClick,
  onTimeSlotClick,
  onAppointmentDrop,
  view = DEFAULT_CONFIG.view as 'month' | 'week' | 'day' | 'agenda',
  theme = DEFAULT_CONFIG.theme as 'light' | 'dark',
  loading = false,
  error = null,
  onRefresh,
  showMiniCalendar = true,
  selectedBarbers = [],
  onBarberFilter,
  workingHours = DEFAULT_CONFIG.workingHours,
  timeSlotDuration = DEFAULT_CONFIG.timeSlotDuration,
  showWeekends = DEFAULT_CONFIG.showWeekends,
  compactMode = false,
  enableDragDrop = DEFAULT_CONFIG.enableDragDrop,
  showToolbar = DEFAULT_CONFIG.showToolbar,
  enableVirtualScroll = DEFAULT_CONFIG.enableVirtualScroll,
  cacheData = DEFAULT_CONFIG.cacheData,
  realTimeUpdates = DEFAULT_CONFIG.realTimeUpdates,
  onExport,
  onPrint,
  searchQuery = '',
  onSearchChange,
  filterOptions = {}
}: CalendarProps) {
  // State management
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedView, setSelectedView] = useState<'month' | 'week' | 'day' | 'agenda'>(view)
  const [draggedAppointment, setDraggedAppointment] = useState<string | null>(null)
  const [hoveredTimeSlot, setHoveredTimeSlot] = useState<{ date: string; time: string } | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedBarberFilter, setSelectedBarberFilter] = useState<string[]>(selectedBarbers)
  const [showBarberPanel, setShowBarberPanel] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  
  // Refs
  const calendarRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Generate time slots based on working hours and duration
  const timeSlots = useMemo(() => {
    const slots = []
    const startTime = new Date(`2024-01-01T${workingHours.start}:00`)
    const endTime = new Date(`2024-01-01T${workingHours.end}:00`)
    
    let currentTime = new Date(startTime)
    while (currentTime < endTime) {
      slots.push(currentTime.toTimeString().slice(0, 5))
      currentTime = new Date(currentTime.getTime() + timeSlotDuration * 60000)
    }
    
    return slots
  }, [workingHours, timeSlotDuration])

  // Get current period dates based on view
  const currentPeriodDates = useMemo(() => {
    const dates = []
    
    if (selectedView === 'day') {
      dates.push(new Date(currentDate))
    } else if (selectedView === 'week') {
      const start = new Date(currentDate)
      const day = start.getDay()
      const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Start from Monday
      start.setDate(diff)
      
      const daysToShow = showWeekends ? 7 : 5
      for (let i = 0; i < daysToShow; i++) {
        const date = new Date(start)
        date.setDate(start.getDate() + i)
        dates.push(date)
      }
    } else if (selectedView === 'month') {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      
      // Start from the first Monday of the month view
      const firstDay = new Date(start)
      const dayOfWeek = firstDay.getDay()
      firstDay.setDate(firstDay.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      
      // Generate 42 days (6 weeks) for consistent month view
      for (let i = 0; i < 42; i++) {
        const date = new Date(firstDay)
        date.setDate(firstDay.getDate() + i)
        dates.push(date)
      }
    }
    
    return dates
  }, [currentDate, selectedView, showWeekends])

  // Filter and search appointments
  const filteredAppointments = useMemo(() => {
    let filtered = appointments

    // Filter by selected barbers
    if (selectedBarberFilter.length > 0) {
      filtered = filtered.filter(apt => 
        selectedBarberFilter.some(barberId => 
          availableBarbers.find(b => b.id === barberId)?.name === apt.barber
        )
      )
    }

    // Filter by search query
    if (localSearchQuery) {
      const query = localSearchQuery.toLowerCase()
      filtered = filtered.filter(apt =>
        apt.client.toLowerCase().includes(query) ||
        apt.service.toLowerCase().includes(query) ||
        apt.barber.toLowerCase().includes(query) ||
        apt.notes?.toLowerCase().includes(query) ||
        apt.confirmationNumber?.toLowerCase().includes(query)
      )
    }

    // Filter by status
    if (filterOptions.status && filterOptions.status.length > 0) {
      filtered = filtered.filter(apt => filterOptions.status!.includes(apt.status))
    }

    // Filter by services
    if (filterOptions.services && filterOptions.services.length > 0) {
      filtered = filtered.filter(apt => filterOptions.services!.includes(apt.service))
    }

    // Filter by date range
    if (filterOptions.dateRange) {
      const { start, end } = filterOptions.dateRange
      filtered = filtered.filter(apt => {
        const aptDate = new Date(apt.date)
        return aptDate >= start && aptDate <= end
      })
    }

    return filtered
  }, [appointments, selectedBarberFilter, availableBarbers, localSearchQuery, filterOptions])

  // Get current period title
  const getCurrentPeriodTitle = () => {
    if (selectedView === 'day') {
      return currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })
    } else if (selectedView === 'week') {
      const firstDay = currentPeriodDates[0]
      const lastDay = currentPeriodDates[currentPeriodDates.length - 1]
      return `${firstDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    } else if (selectedView === 'agenda') {
      return `Agenda - ${currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
  }

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return filteredAppointments.filter(apt => apt.date === dateStr)
  }

  const getAppointmentsForTimeSlot = (date: Date, time: string) => {
    const dateStr = date.toISOString().split('T')[0]
    return filteredAppointments.filter(apt => {
      if (apt.date !== dateStr) return false
      
      const aptStartTime = apt.startTime
      const aptEndTime = apt.endTime
      
      // Check if the time slot overlaps with the appointment
      const slotStart = new Date(`2024-01-01T${time}:00`)
      const slotEnd = new Date(slotStart.getTime() + timeSlotDuration * 60000)
      const appointmentStart = new Date(`2024-01-01T${aptStartTime}:00`)
      const appointmentEnd = new Date(`2024-01-01T${aptEndTime}:00`)
      
      return slotStart < appointmentEnd && slotEnd > appointmentStart
    })
  }

  const getAppointmentStyle = (appointment: Appointment) => {
    const baseClasses = 'appointment-block rounded-lg p-3 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer relative overflow-hidden group'
    
    let statusClasses = ''
    let glowClasses = ''
    
    switch (appointment.status) {
      case 'confirmed':
        statusClasses = 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
        glowClasses = 'hover:shadow-violet-500/25'
        break
      case 'completed':
        statusClasses = 'bg-gradient-to-br from-emerald-500 to-green-600 text-white'
        glowClasses = 'hover:shadow-emerald-500/25'
        break
      case 'pending':
        statusClasses = 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
        glowClasses = 'hover:shadow-amber-500/25'
        break
      case 'cancelled':
        statusClasses = 'bg-gradient-to-br from-red-500 to-red-600 text-white'
        glowClasses = 'hover:shadow-red-500/25'
        break
      default:
        statusClasses = 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
        glowClasses = 'hover:shadow-violet-500/25'
    }
    
    const priorityClasses = appointment.priority === 'high' ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''
    const dragClasses = draggedAppointment === appointment.id 
      ? 'opacity-50 transform rotate-1 scale-105 z-50' 
      : 'hover:scale-102 hover:z-10'
    
    return `${baseClasses} ${statusClasses} ${glowClasses} ${priorityClasses} ${dragClasses}`
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Navigation handlers
  const navigatePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    
    if (selectedView === 'day') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1))
    } else if (selectedView === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
    } else if (selectedView === 'month' || selectedView === 'agenda') {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1))
    }
    
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const goToDate = (date: Date) => {
    setCurrentDate(date)
  }

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, appointmentId: string) => {
    if (!enableDragDrop) return
    
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', appointmentId)
    setDraggedAppointment(appointmentId)
  }, [enableDragDrop])

  const handleDragEnd = useCallback(() => {
    setDraggedAppointment(null)
    setHoveredTimeSlot(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!enableDragDrop) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [enableDragDrop])

  const handleDrop = useCallback((e: React.DragEvent, date: string, time: string) => {
    if (!enableDragDrop) return
    
    e.preventDefault()
    const appointmentId = e.dataTransfer.getData('text/plain')
    if (appointmentId && onAppointmentDrop) {
      onAppointmentDrop(appointmentId, date, time)
    }
    setDraggedAppointment(null)
    setHoveredTimeSlot(null)
  }, [enableDragDrop, onAppointmentDrop])

  const handleTimeSlotMouseEnter = useCallback((date: string, time: string) => {
    if (draggedAppointment) {
      setHoveredTimeSlot({ date, time })
    }
  }, [draggedAppointment])

  const handleTimeSlotMouseLeave = useCallback(() => {
    setHoveredTimeSlot(null)
  }, [])

  // Event handlers
  const handleTimeSlotClick = (date: string, time: string) => {
    if (!draggedAppointment) {
      onTimeSlotClick?.(date, time)
    }
  }

  const handleAppointmentClick = (appointment: Appointment) => {
    if (!draggedAppointment) {
      setSelectedAppointment(appointment)
      onAppointmentClick?.(appointment)
    }
  }

  // Refresh handler
  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
  }

  // Search handler
  const handleSearchChange = (query: string) => {
    setLocalSearchQuery(query)
    onSearchChange?.(query)
  }

  // Barber filter handlers
  const handleBarberToggle = (barberId: string) => {
    const newSelection = selectedBarberFilter.includes(barberId)
      ? selectedBarberFilter.filter(id => id !== barberId)
      : [...selectedBarberFilter, barberId]
    
    setSelectedBarberFilter(newSelection)
    onBarberFilter?.(newSelection)
  }

  const selectAllBarbers = () => {
    const allBarberIds = availableBarbers.map(b => b.id)
    setSelectedBarberFilter(allBarberIds)
    onBarberFilter?.(allBarberIds)
  }

  const clearBarberSelection = () => {
    setSelectedBarberFilter([])
    onBarberFilter?.([])
  }

  // Export handlers
  const handleExport = (format: 'pdf' | 'csv' | 'ical') => {
    onExport?.(format)
  }

  const handlePrint = () => {
    onPrint?.()
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          navigatePeriod('prev')
          break
        case 'ArrowRight':
          e.preventDefault()
          navigatePeriod('next')
          break
        case 'Home':
          e.preventDefault()
          goToToday()
          break
        case '1':
          e.preventDefault()
          setSelectedView('day')
          break
        case '2':
          e.preventDefault()
          setSelectedView('week')
          break
        case '3':
          e.preventDefault()
          setSelectedView('month')
          break
        case '4':
          e.preventDefault()
          setSelectedView('agenda')
          break
        case 'r':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            handleRefresh()
          }
          break
        case 'f':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            searchInputRef.current?.focus()
          }
          break
        case 'Escape':
          setShowBarberPanel(false)
          setShowFilterPanel(false)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentDate, selectedView])

  // Auto-scroll to current time in day/week view
  useEffect(() => {
    if ((selectedView === 'day' || selectedView === 'week') && scrollContainerRef.current) {
      const now = new Date()
      const currentTimeString = now.toTimeString().slice(0, 5)
      const currentTimeSlot = timeSlots.findIndex(slot => slot >= currentTimeString)
      
      if (currentTimeSlot > -1) {
        const scrollTop = Math.max(0, (currentTimeSlot - 2) * 60) // 60px per time slot, show 2 slots before current time
        scrollContainerRef.current.scrollTop = scrollTop
      }
    }
  }, [selectedView, timeSlots])

  // Real-time updates simulation
  useEffect(() => {
    if (!realTimeUpdates) return

    const interval = setInterval(() => {
      // Simulate real-time appointment updates
      // In a real app, this would be handled by WebSocket or polling
      if (Math.random() < 0.1) { // 10% chance of update
        handleRefresh()
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [realTimeUpdates, handleRefresh])

  // Loading and error states
  if (loading && !isRefreshing) {
    return (
      <div className={`${theme === 'dark' ? 'calendar-dark-theme' : 'premium-card-modern'} p-6`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded-lg w-1/3"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          <div className="grid grid-cols-7 gap-4 mt-6">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-300 rounded-lg shimmer"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${theme === 'dark' ? 'calendar-dark-theme' : 'premium-card-modern'} p-6`}>
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Error Loading Calendar
          </h3>
          <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{error}</p>
          <button onClick={handleRefresh} className="premium-button">
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={calendarRef}
      className={`${theme === 'dark' ? 'calendar-dark-theme' : 'premium-card-modern'} p-6 relative`}
    >
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
          {/* Left side - Title and navigation */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <CalendarDaysIcon className={`h-6 w-6 ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`} />
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Enterprise Calendar
              </h2>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigatePeriod('prev')}
                className={`p-2 rounded-lg transition-colors ${theme === 'dark' 
                  ? 'text-gray-300 hover:text-white hover:bg-white/10' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Previous period (← arrow key)"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              
              <div className="flex items-center space-x-2">
                <span className={`text-lg font-semibold min-w-max ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {getCurrentPeriodTitle()}
                </span>
                <button
                  onClick={goToToday}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${theme === 'dark'
                    ? 'text-violet-300 hover:text-white hover:bg-violet-600/20'
                    : 'text-violet-600 hover:text-violet-700 hover:bg-violet-50'
                  }`}
                  title="Go to today (Home key)"
                >
                  Today
                </button>
              </div>
              
              <button
                onClick={() => navigatePeriod('next')}
                className={`p-2 rounded-lg transition-colors ${theme === 'dark' 
                  ? 'text-gray-300 hover:text-white hover:bg-white/10' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Next period (→ arrow key)"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Right side - Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={localSearchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search appointments..."
                className={`pl-8 pr-4 py-2 text-sm rounded-lg border transition-colors ${theme === 'dark'
                  ? 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 focus:bg-gray-800 focus:border-violet-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-violet-500'
                }`}
              />
              <MagnifyingGlassIcon className={`h-4 w-4 absolute left-2.5 top-2.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>

            {/* View Toggle */}
            <div className={`${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'} rounded-lg p-1 flex`}>
              <button
                onClick={() => setSelectedView('day')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-1 ${
                  selectedView === 'day'
                    ? `${theme === 'dark' ? 'bg-violet-600 text-white' : 'bg-white text-violet-600'} shadow-sm`
                    : `${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                }`}
                title="Day view (1 key)"
              >
                <CalendarIcon className="h-4 w-4" />
                <span>Day</span>
              </button>
              <button
                onClick={() => setSelectedView('week')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-1 ${
                  selectedView === 'week'
                    ? `${theme === 'dark' ? 'bg-violet-600 text-white' : 'bg-white text-violet-600'} shadow-sm`
                    : `${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                }`}
                title="Week view (2 key)"
              >
                <ViewColumnsIcon className="h-4 w-4" />
                <span>Week</span>
              </button>
              <button
                onClick={() => setSelectedView('month')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-1 ${
                  selectedView === 'month'
                    ? `${theme === 'dark' ? 'bg-violet-600 text-white' : 'bg-white text-violet-600'} shadow-sm`
                    : `${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                }`}
                title="Month view (3 key)"
              >
                <Squares2X2Icon className="h-4 w-4" />
                <span>Month</span>
              </button>
              <button
                onClick={() => setSelectedView('agenda')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center space-x-1 ${
                  selectedView === 'agenda'
                    ? `${theme === 'dark' ? 'bg-violet-600 text-white' : 'bg-white text-violet-600'} shadow-sm`
                    : `${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
                }`}
                title="Agenda view (4 key)"
              >
                <ClockIcon className="h-4 w-4" />
                <span>Agenda</span>
              </button>
            </div>

            {/* Filters and Actions */}
            <div className="flex items-center space-x-1">
              {/* Barber Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowBarberPanel(!showBarberPanel)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center space-x-1 ${theme === 'dark'
                    ? 'bg-gray-800/50 text-gray-300 hover:text-white hover:bg-gray-700/50'
                    : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  <UserIcon className="h-4 w-4" />
                  <span>Barbers</span>
                  {selectedBarberFilter.length > 0 && (
                    <span className="bg-violet-500 text-white text-xs rounded-full px-2 py-0.5">
                      {selectedBarberFilter.length}
                    </span>
                  )}
                </button>
                
                {showBarberPanel && (
                  <div className={`absolute right-0 top-full mt-2 w-64 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-lg z-50`}>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Filter by Barber</h3>
                        <div className="flex space-x-2">
                          <button
                            onClick={selectAllBarbers}
                            className="text-xs text-violet-600 hover:text-violet-700"
                          >
                            All
                          </button>
                          <button
                            onClick={clearBarberSelection}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {availableBarbers.map(barber => (
                          <label key={barber.id} className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedBarberFilter.includes(barber.id)}
                              onChange={() => handleBarberToggle(barber.id)}
                              className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                            />
                            <div className="flex items-center space-x-2">
                              <div 
                                className={`w-3 h-3 rounded-full status-dot ${
                                  barber.status === 'online' ? 'status-active' :
                                  barber.status === 'busy' ? 'status-warning' : 'status-inactive'
                                }`}
                                style={{ backgroundColor: barber.color }}
                              ></div>
                              <span className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                                {barber.name}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Filters */}
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                  ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Advanced filters"
              >
                <FunnelIcon className="h-5 w-5" />
              </button>

              {/* Refresh */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                  ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                } ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Refresh calendar (Ctrl/Cmd + R)"
              >
                <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* Export Options */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleExport('pdf')}
                  className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  title="Export to PDF"
                >
                  <ShareIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={handlePrint}
                  className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  title="Print calendar"
                >
                  <PrinterIcon className="h-5 w-5" />
                </button>
              </div>

              {/* New Appointment */}
              <button 
                onClick={() => handleTimeSlotClick('', '')}
                className="premium-button text-sm flex items-center space-x-1"
              >
                <PlusIcon className="h-4 w-4" />
                <span>New Appointment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Views */}
      {selectedView === 'month' ? (
        <MonthView 
          theme={theme}
          dates={currentPeriodDates}
          appointments={filteredAppointments}
          onDateClick={goToDate}
          onAppointmentClick={handleAppointmentClick}
          isToday={isToday}
        />
      ) : selectedView === 'agenda' ? (
        <AgendaView
          theme={theme}
          appointments={filteredAppointments}
          currentDate={currentDate}
          onAppointmentClick={handleAppointmentClick}
        />
      ) : (
        <WeekDayView
          theme={theme}
          view={selectedView}
          dates={currentPeriodDates}
          timeSlots={timeSlots}
          appointments={filteredAppointments}
          onTimeSlotClick={handleTimeSlotClick}
          onAppointmentClick={handleAppointmentClick}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onTimeSlotMouseEnter={handleTimeSlotMouseEnter}
          onTimeSlotMouseLeave={handleTimeSlotMouseLeave}
          getAppointmentsForTimeSlot={getAppointmentsForTimeSlot}
          getAppointmentStyle={getAppointmentStyle}
          isToday={isToday}
          hoveredTimeSlot={hoveredTimeSlot}
          draggedAppointment={draggedAppointment}
          scrollContainerRef={scrollContainerRef}
          compactMode={compactMode}
          enableDragDrop={enableDragDrop}
        />
      )}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-violet-500 to-purple-600"></div>
          <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Confirmed</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-emerald-500 to-green-600"></div>
          <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Completed</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-amber-500 to-orange-600"></div>
          <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Pending</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-red-500 to-red-600"></div>
          <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Cancelled</span>
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50'}`}>
          <div className="text-center">
            <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {filteredAppointments.length}
            </div>
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Total Appointments
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50'}`}>
          <div className="text-center">
            <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {filteredAppointments.filter(apt => apt.status === 'confirmed').length}
            </div>
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Confirmed
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50'}`}>
          <div className="text-center">
            <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              ${filteredAppointments.reduce((sum, apt) => sum + apt.price, 0)}
            </div>
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Total Revenue
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50'}`}>
          <div className="text-center">
            <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {availableBarbers.filter(b => b.status === 'online').length}
            </div>
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Online Barbers
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className={`mt-4 text-center text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
        Use arrow keys to navigate • 1/2/3/4 for views • Home for today • Ctrl/Cmd+R to refresh • Ctrl/Cmd+F to search
      </div>
    </div>
  )
}

// Month View Component
interface MonthViewProps {
  theme: string
  dates: Date[]
  appointments: Appointment[]
  onDateClick: (date: Date) => void
  onAppointmentClick: (appointment: Appointment) => void
  isToday: (date: Date) => boolean
}

function MonthView({ theme, dates, appointments, onDateClick, onAppointmentClick, isToday }: MonthViewProps) {
  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return appointments.filter(apt => apt.date === dateStr)
  }

  const currentMonth = dates[15] // Middle date represents current month

  return (
    <div className={`border rounded-xl overflow-hidden ${theme === 'dark' ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-white'}`}>
      {/* Day Headers */}
      <div className={`grid grid-cols-7 border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className={`p-4 text-center text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            {day}
          </div>
        ))}
      </div>

      {/* Month Grid */}
      <div className="grid grid-cols-7">
        {dates.map((date, index) => {
          const dayAppointments = getAppointmentsForDate(date)
          const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
          const todayClass = isToday(date) ? (theme === 'dark' ? 'bg-violet-900/30 border-violet-500' : 'bg-violet-50 border-violet-200') : ''
          
          return (
            <div
              key={index}
              className={`min-h-[120px] p-2 border-r border-b cursor-pointer transition-all duration-200 hover:scale-102 ${
                theme === 'dark' 
                  ? 'border-gray-700 hover:bg-gray-700/30' 
                  : 'border-gray-200 hover:bg-gray-50'
              } ${todayClass} ${!isCurrentMonth ? 'opacity-50' : ''}`}
              onClick={() => onDateClick(date)}
            >
              <div className={`text-sm font-medium mb-2 ${
                isToday(date) 
                  ? 'text-violet-600' 
                  : isCurrentMonth 
                    ? (theme === 'dark' ? 'text-white' : 'text-gray-900')
                    : (theme === 'dark' ? 'text-gray-500' : 'text-gray-400')
              }`}>
                {date.getDate()}
              </div>
              
              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map(appointment => (
                  <div
                    key={appointment.id}
                    className="text-xs px-2 py-1 rounded-md truncate cursor-pointer transition-all duration-200 hover:scale-105"
                    style={{ 
                      backgroundColor: appointment.serviceColor || '#8b5cf6',
                      color: 'white'
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onAppointmentClick(appointment)
                    }}
                    title={`${appointment.startTime} - ${appointment.client} (${appointment.service})`}
                  >
                    {appointment.startTime} {appointment.client}
                  </div>
                ))}
                {dayAppointments.length > 3 && (
                  <div className={`text-xs px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-600'}`}>
                    +{dayAppointments.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Agenda View Component
interface AgendaViewProps {
  theme: string
  appointments: Appointment[]
  currentDate: Date
  onAppointmentClick: (appointment: Appointment) => void
}

function AgendaView({ theme, appointments, currentDate, onAppointmentClick }: AgendaViewProps) {
  // Group appointments by date
  const groupedAppointments = useMemo(() => {
    const groups: { [key: string]: Appointment[] } = {}
    
    appointments.forEach(appointment => {
      const date = appointment.date
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(appointment)
    })
    
    // Sort appointments within each date by time
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => a.startTime.localeCompare(b.startTime))
    })
    
    return groups
  }, [appointments])

  const sortedDates = Object.keys(groupedAppointments).sort()

  return (
    <div className={`border rounded-xl overflow-hidden ${theme === 'dark' ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-white'}`}>
      <div className="max-h-[600px] overflow-y-auto p-6">
        {sortedDates.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDaysIcon className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              No appointments found
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map(dateStr => {
              const date = new Date(dateStr)
              const dayAppointments = groupedAppointments[dateStr]
              
              return (
                <div key={dateStr} className="space-y-3">
                  <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {date.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  
                  <div className="space-y-2">
                    {dayAppointments.map(appointment => (
                      <div
                        key={appointment.id}
                        className={`p-4 rounded-lg cursor-pointer transition-all duration-200 hover:scale-102 ${
                          theme === 'dark' ? 'bg-gray-700/30 hover:bg-gray-700/50' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => onAppointmentClick(appointment)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: appointment.serviceColor || '#8b5cf6' }}
                            ></div>
                            <div>
                              <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {appointment.client}
                              </div>
                              <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                {appointment.service} • {appointment.barber}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {appointment.startTime} - {appointment.endTime}
                            </div>
                            <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                              ${appointment.price}
                            </div>
                          </div>
                        </div>
                        
                        {appointment.notes && (
                          <div className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {appointment.notes}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-2">
                          <span 
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              appointment.status === 'confirmed' ? 'bg-violet-100 text-violet-800' :
                              appointment.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                              appointment.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                              'bg-red-100 text-red-800'
                            }`}
                          >
                            {appointment.status}
                          </span>
                          
                          {appointment.tags && appointment.tags.length > 0 && (
                            <div className="flex space-x-1">
                              {appointment.tags.slice(0, 2).map(tag => (
                                <span 
                                  key={tag}
                                  className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                    theme === 'dark' ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'
                                  }`}
                                >
                                  {tag}
                                </span>
                              ))}
                              {appointment.tags.length > 2 && (
                                <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                  +{appointment.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Week/Day View Component
interface WeekDayViewProps {
  theme: string
  view: 'week' | 'day'
  dates: Date[]
  timeSlots: string[]
  appointments: Appointment[]
  onTimeSlotClick: (date: string, time: string) => void
  onAppointmentClick: (appointment: Appointment) => void
  onDragStart: (e: React.DragEvent, appointmentId: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, date: string, time: string) => void
  onTimeSlotMouseEnter: (date: string, time: string) => void
  onTimeSlotMouseLeave: () => void
  getAppointmentsForTimeSlot: (date: Date, time: string) => Appointment[]
  getAppointmentStyle: (appointment: Appointment) => string
  isToday: (date: Date) => boolean
  hoveredTimeSlot: { date: string; time: string } | null
  draggedAppointment: string | null
  scrollContainerRef: React.RefObject<HTMLDivElement>
  compactMode: boolean
  enableDragDrop: boolean
}

function WeekDayView({
  theme, view, dates, timeSlots, appointments, onTimeSlotClick, onAppointmentClick,
  onDragStart, onDragEnd, onDragOver, onDrop, onTimeSlotMouseEnter, onTimeSlotMouseLeave,
  getAppointmentsForTimeSlot, getAppointmentStyle, isToday, hoveredTimeSlot,
  draggedAppointment, scrollContainerRef, compactMode, enableDragDrop
}: WeekDayViewProps) {
  const gridCols = view === 'day' ? 'grid-cols-2' : `grid-cols-${dates.length + 1}`
  const timeSlotHeight = compactMode ? 'min-h-[50px]' : 'min-h-[60px]'
  
  return (
    <div className={`border rounded-xl overflow-hidden ${theme === 'dark' ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-white'}`}>
      {/* Day Headers */}
      <div className={`grid ${gridCols} border-b ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
        <div className={`p-4 text-sm font-medium border-r ${theme === 'dark' ? 'text-gray-300 border-gray-700' : 'text-gray-600 border-gray-200'}`}>
          Time
        </div>
        {dates.map((date, index) => (
          <div 
            key={index} 
            className={`p-4 text-center border-r last:border-r-0 transition-colors ${
              isToday(date) 
                ? (theme === 'dark' ? 'bg-violet-900/30' : 'bg-violet-50')
                : (theme === 'dark' ? 'hover:bg-gray-700/30' : 'hover:bg-gray-100')
            } ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <div className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
              {date.toLocaleDateString('en-US', { weekday: view === 'day' ? 'long' : 'short' })}
            </div>
            <div className={`text-lg font-bold mt-1 ${
              isToday(date) 
                ? (theme === 'dark' ? 'text-violet-400' : 'text-violet-600')
                : (theme === 'dark' ? 'text-gray-100' : 'text-gray-700')
            }`}>
              {date.getDate()}
            </div>
            {isToday(date) && (
              <div className="w-2 h-2 bg-violet-500 rounded-full mx-auto mt-1"></div>
            )}
          </div>
        ))}
      </div>

      {/* Time Slots */}
      <div 
        ref={scrollContainerRef}
        className={`max-h-[600px] overflow-y-auto ${theme === 'dark' ? 'dark-scrollbar' : ''}`}
      >
        {timeSlots.map((time) => (
          <div key={time} className={`grid ${gridCols} border-b transition-colors ${theme === 'dark' ? 'border-gray-700/50 hover:bg-gray-700/20' : 'border-gray-100 hover:bg-gray-50'}`}>
            {/* Time Column */}
            <div className={`p-3 text-sm font-medium border-r ${theme === 'dark' ? 'text-gray-300 border-gray-700 bg-gray-800/30' : 'text-gray-600 border-gray-200 bg-gray-50/50'}`}>
              {time}
            </div>
            
            {/* Day Columns */}
            {dates.map((date, dateIndex) => {
              const dateStr = date.toISOString().split('T')[0]
              const slotAppointments = getAppointmentsForTimeSlot(date, time)
              const isHovered = hoveredTimeSlot?.date === dateStr && hoveredTimeSlot?.time === time
              
              return (
                <div
                  key={dateIndex}
                  className={`relative p-2 border-r last:border-r-0 ${timeSlotHeight} time-slot transition-all duration-200 cursor-pointer ${
                    theme === 'dark' 
                      ? 'border-gray-700 hover:bg-violet-900/20' 
                      : 'border-gray-200 hover:bg-violet-50'
                  } ${isHovered ? (theme === 'dark' ? 'bg-violet-900/30 border-violet-700' : 'bg-violet-100 border-violet-300') : ''}`}
                  onClick={() => onTimeSlotClick(dateStr, time)}
                  onDragOver={enableDragDrop ? onDragOver : undefined}
                  onDrop={enableDragDrop ? (e) => onDrop(e, dateStr, time) : undefined}
                  onMouseEnter={() => onTimeSlotMouseEnter(dateStr, time)}
                  onMouseLeave={onTimeSlotMouseLeave}
                >
                  {slotAppointments.map(appointment => (
                    <div
                      key={appointment.id}
                      className={getAppointmentStyle(appointment)}
                      draggable={enableDragDrop}
                      onDragStart={enableDragDrop ? (e) => onDragStart(e, appointment.id) : undefined}
                      onDragEnd={enableDragDrop ? onDragEnd : undefined}
                      onClick={(e) => {
                        e.stopPropagation()
                        onAppointmentClick(appointment)
                      }}
                    >
                      {/* Priority indicator */}
                      {appointment.priority === 'high' && (
                        <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-400 rounded-full"></div>
                      )}
                      
                      {/* Appointment Content */}
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold truncate">
                          {appointment.service}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full bg-white/20 text-white`}>
                          {appointment.status}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1">
                          <UserIcon className="h-3 w-3 opacity-80" />
                          <span className="text-xs truncate">{appointment.client}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="h-3 w-3 opacity-80" />
                          <span className="text-xs">
                            {appointment.startTime} - {appointment.endTime}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <CurrencyDollarIcon className="h-3 w-3 opacity-80" />
                            <span className="text-xs font-medium">${appointment.price}</span>
                          </div>
                          <span className="text-xs opacity-80 truncate">
                            {appointment.barber}
                          </span>
                        </div>
                      </div>
                      
                      {/* Tags */}
                      {appointment.tags && appointment.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {appointment.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-xs px-1 py-0.5 bg-white/20 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Drag indicator */}
                      {enableDragDrop && (
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <EllipsisHorizontalIcon className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Empty slot indicator */}
                  {slotAppointments.length === 0 && (
                    <div className={`absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      <PlusIcon className="h-4 w-4" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}