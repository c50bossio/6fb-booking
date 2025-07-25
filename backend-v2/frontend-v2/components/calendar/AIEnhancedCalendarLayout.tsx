'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { format, addDays, startOfWeek, isSameDay, isToday, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FreshaColors, 
  FreshaTypography, 
  FreshaSpacing,
  FreshaBorderRadius,
  FreshaShadows,
  createFreshaStyles
} from '@/lib/fresha-design-system'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  AdjustmentsHorizontalIcon,
  PlusIcon,
  SparklesIcon,
  ChartBarIcon,
  BoltIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'

// Import our AI components
import SmartTimeSuggestions from './SmartTimeSuggestions'
import AIInsightsSidebar from './AIInsightsSidebar'

// Import existing calendar components
import StaffAvatarHeader from './StaffAvatarHeader'
import PremiumAppointmentBlock from './PremiumAppointmentBlock'
import ProfessionalTimeAxis from './ProfessionalTimeAxis'

interface Barber {
  id: number
  name?: string
  first_name?: string
  last_name?: string
  email: string
  avatar?: string
  specialties?: string[]
  role?: string
}

interface Appointment {
  id: number
  client_name: string
  client_id?: number
  service_name: string
  service_id?: number
  start_time: string
  duration_minutes: number
  price: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show'
  client_tier?: 'new' | 'regular' | 'vip' | 'platinum'
  barber_id: number
  notes?: string
  is_recurring?: boolean
  created_at?: string
}

interface BarberAvailability {
  barber_id: number
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
}

interface AIEnhancedCalendarLayoutProps {
  // Data
  barbers: Barber[]
  appointments: Appointment[]
  availability: BarberAvailability[]
  currentDate: Date
  
  // View configuration
  view?: 'day' | 'week'
  startHour?: number
  endHour?: number
  slotDuration?: number
  
  // Display options
  showRevenue?: boolean
  showAppointmentCount?: boolean
  colorScheme?: 'service-based' | 'status-based' | 'tier-based'
  
  // AI Features
  enableAIInsights?: boolean
  enableSmartSuggestions?: boolean
  showAISidebar?: boolean
  
  // Event handlers
  onDateChange?: (date: Date) => void
  onAppointmentClick?: (appointment: Appointment) => void
  onTimeSlotClick?: (date: Date, barberId: number, hour: number, minute: number) => void
  onBarberSelect?: (barberId: number) => void
  onNewAppointment?: () => void
  onAIInsightAction?: (insight: any, action: string) => void
  
  // Selection state
  selectedBarberId?: number | null
  selectedAppointmentId?: number | null
  
  className?: string
}

const AIEnhancedCalendarLayout: React.FC<AIEnhancedCalendarLayoutProps> = ({
  barbers = [],
  appointments = [],
  availability = [],
  currentDate,
  view = 'day',
  startHour = 8,
  endHour = 19,
  slotDuration = 60,
  showRevenue = true,
  showAppointmentCount = true,
  colorScheme = 'service-based',
  enableAIInsights = true,
  enableSmartSuggestions = true,
  showAISidebar = true,
  onDateChange,
  onAppointmentClick,
  onTimeSlotClick,
  onBarberSelect,
  onNewAppointment,
  onAIInsightAction,
  selectedBarberId,
  selectedAppointmentId,
  className = ''
}) => {
  const [currentView, setCurrentView] = useState(view)
  const [selectedDate, setSelectedDate] = useState(currentDate)
  const [showAIDialog, setShowAIDialog] = useState(false)
  const [aiSidebarVisible, setAISidebarVisible] = useState(showAISidebar)
  const [selectedServiceForAI, setSelectedServiceForAI] = useState<{
    serviceName: string
    duration: number
    barberId?: number
    clientId?: number
  } | null>(null)

  // Generate time slots for the calendar
  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        slots.push({ hour, minute })
      }
    }
    return slots
  }, [startHour, endHour, slotDuration])

  // Get visible days based on view
  const visibleDays = useMemo(() => {
    if (currentView === 'day') {
      return [selectedDate]
    } else {
      const weekStart = startOfWeek(selectedDate)
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    }
  }, [currentView, selectedDate])

  // Filter appointments for visible days
  const visibleAppointments = useMemo(() => {
    return appointments.filter(apt => {
      const aptDate = parseISO(apt.start_time)
      return visibleDays.some(day => isSameDay(aptDate, day))
    })
  }, [appointments, visibleDays])

  // Calculate daily revenue for each barber
  const dailyRevenue = useMemo(() => {
    const revenue = new Map<string, number>()
    visibleAppointments.forEach(apt => {
      if (apt.status === 'completed') {
        const key = `${apt.barber_id}-${format(parseISO(apt.start_time), 'yyyy-MM-dd')}`
        revenue.set(key, (revenue.get(key) || 0) + apt.price)
      }
    })
    return revenue
  }, [visibleAppointments])

  const handleDateNavigation = (direction: 'prev' | 'next') => {
    const newDate = addDays(selectedDate, direction === 'next' ? 1 : -1)
    setSelectedDate(newDate)
    onDateChange?.(newDate)
  }

  const handleTimeSlotClick = (date: Date, barberId: number, hour: number, minute: number) => {
    onTimeSlotClick?.(date, barberId, hour, minute)
    
    // If AI suggestions are enabled, prepare data for smart suggestions
    if (enableSmartSuggestions) {
      setSelectedServiceForAI({
        serviceName: 'Haircut', // Default service
        duration: 60, // Default duration
        barberId,
        clientId: undefined
      })
      setShowAIDialog(true)
    }
  }

  const handleSmartTimeSlotSelect = (timeSlot: any) => {
    setShowAIDialog(false)
    onTimeSlotClick?.(timeSlot.start_time, timeSlot.barber_id, 
                     timeSlot.start_time.getHours(), 
                     timeSlot.start_time.getMinutes())
  }

  const renderCalendarHeader = () => (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
      {/* Date Navigation */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateNavigation('prev')}
            className="p-2"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h2>
            <p className="text-sm text-gray-500">
              {visibleAppointments.length} appointments
            </p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateNavigation('next')}
            className="p-2"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* View Toggle */}
        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
          <Button
            variant={currentView === 'day' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('day')}
            className="px-3 py-1 text-xs"
          >
            Day
          </Button>
          <Button
            variant={currentView === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('week')}
            className="px-3 py-1 text-xs"
          >
            Week
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        {enableAIInsights && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAISidebarVisible(!aiSidebarVisible)}
            className="flex items-center space-x-2"
          >
            {aiSidebarVisible ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            <span className="hidden sm:inline">AI Insights</span>
          </Button>
        )}

        {enableSmartSuggestions && (
          <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-purple-100"
              >
                <SparklesIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Smart Suggestions</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center space-x-2">
                  <SparklesIcon className="h-5 w-5 text-blue-600" />
                  <span>AI-Powered Time Suggestions</span>
                </DialogTitle>
              </DialogHeader>
              {selectedServiceForAI && (
                <SmartTimeSuggestions
                  selectedDate={selectedDate}
                  serviceName={selectedServiceForAI.serviceName}
                  serviceDuration={selectedServiceForAI.duration}
                  barberId={selectedServiceForAI.barberId}
                  clientId={selectedServiceForAI.clientId}
                  appointments={appointments}
                  availability={availability}
                  onTimeSlotSelect={handleSmartTimeSlotSelect}
                />
              )}
            </DialogContent>
          </Dialog>
        )}

        <Button
          onClick={onNewAppointment}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <PlusIcon className="h-4 w-4" />
          <span className="hidden sm:inline">New Appointment</span>
        </Button>
      </div>
    </div>
  )

  const renderTimeSlot = (day: Date, barberId: number, hour: number, minute: number) => {
    const slotTime = new Date(day)
    slotTime.setHours(hour, minute, 0, 0)
    
    // Find appointment in this slot
    const appointment = visibleAppointments.find(apt => {
      const aptStart = parseISO(apt.start_time)
      return apt.barber_id === barberId && 
             aptStart.getHours() === hour && 
             aptStart.getMinutes() === minute &&
             isSameDay(aptStart, day)
    })

    if (appointment) {
      return (
        <div
          className="h-full cursor-pointer"
          onClick={() => onAppointmentClick?.(appointment)}
        >
          <PremiumAppointmentBlock
            appointment={appointment}
            colorScheme={colorScheme}
            showRevenue={showRevenue}
            isSelected={selectedAppointmentId === appointment.id}
          />
        </div>
      )
    }

    // Empty time slot
    return (
      <div
        className="h-full border border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors duration-150 group"
        onClick={() => handleTimeSlotClick(day, barberId, hour, minute)}
      >
        <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <PlusIcon className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    )
  }

  const renderCalendarGrid = () => (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-[60px_1fr] min-h-full">
        {/* Time axis */}
        <div className="border-r border-gray-200 bg-gray-50">
          <ProfessionalTimeAxis
            startHour={startHour}
            endHour={endHour}
            slotDuration={slotDuration}
          />
        </div>

        {/* Calendar body */}
        <div className="flex-1">
          {/* Staff headers */}
          <div className="grid border-b border-gray-200 bg-white" 
               style={{ gridTemplateColumns: `repeat(${barbers.length}, 1fr)` }}>
            {barbers.map(barber => (
              <div key={barber.id} className="border-r border-gray-200 last:border-r-0">
                <StaffAvatarHeader
                  barber={barber}
                  isSelected={selectedBarberId === barber.id}
                  onClick={() => onBarberSelect?.(barber.id)}
                  showRevenue={showRevenue}
                  dailyRevenue={dailyRevenue.get(`${barber.id}-${format(selectedDate, 'yyyy-MM-dd')}`) || 0}
                  appointmentCount={visibleAppointments.filter(apt => apt.barber_id === barber.id).length}
                  showAppointmentCount={showAppointmentCount}
                />
              </div>
            ))}
          </div>

          {/* Time slots grid */}
          <div className="grid" style={{ gridTemplateColumns: `repeat(${barbers.length}, 1fr)` }}>
            {barbers.map(barber => (
              <div key={barber.id} className="border-r border-gray-200 last:border-r-0">
                {timeSlots.map(({ hour, minute }) => (
                  <div 
                    key={`${hour}-${minute}`}
                    className="border-b border-gray-100 last:border-b-0"
                    style={{ height: `${slotDuration}px` }}
                  >
                    {renderTimeSlot(selectedDate, barber.id, hour, minute)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className={`flex h-full bg-gray-50 ${className}`}>
      {/* Main Calendar */}
      <div className="flex-1 flex flex-col min-w-0">
        {renderCalendarHeader()}
        {renderCalendarGrid()}
      </div>

      {/* AI Insights Sidebar */}
      {enableAIInsights && aiSidebarVisible && (
        <AIInsightsSidebar
          appointments={appointments}
          availability={availability}
          selectedDate={selectedDate}
          onInsightAction={onAIInsightAction}
          className="flex-shrink-0"
        />
      )}
    </div>
  )
}

export default AIEnhancedCalendarLayout