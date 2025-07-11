'use client'

import { useState, useCallback } from 'react'
import { AccessibleButton } from '@/lib/accessibility-helpers'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { 
  CalendarDaysIcon,
  ViewColumnsIcon,
  Squares2X2Icon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { format, addDays, startOfWeek, endOfWeek, isSameDay, startOfMonth, endOfMonth, addWeeks, addMonths } from 'date-fns'

type CalendarView = 'day' | 'week' | 'month'

// Mock data - in real app this would come from API
const mockAppointments = [
  {
    id: 1,
    client_name: 'John Smith',
    client_phone: '(555) 123-4567',
    service_name: 'Classic Haircut',
    service_duration: 45,
    service_price: 35,
    start_time: '2025-07-11T14:00:00.000Z',
    end_time: '2025-07-11T14:45:00.000Z',
    status: 'confirmed',
    barber_name: 'Alex Thompson'
  },
  {
    id: 2,
    client_name: 'Mike Johnson',
    client_phone: '(555) 234-5678',
    service_name: 'Beard Trim',
    service_duration: 30,
    service_price: 25,
    start_time: '2025-07-11T15:30:00.000Z',
    end_time: '2025-07-11T16:00:00.000Z',
    status: 'pending',
    barber_name: 'Alex Thompson'
  },
  {
    id: 3,
    client_name: 'David Wilson',
    client_phone: '(555) 345-6789',
    service_name: 'Full Service',
    service_duration: 90,
    service_price: 65,
    start_time: '2025-07-11T16:30:00.000Z',
    end_time: '2025-07-11T18:00:00.000Z',
    status: 'confirmed',
    barber_name: 'Jordan Martinez'
  },
  {
    id: 4,
    client_name: 'Robert Brown',
    client_phone: '(555) 456-7890',
    service_name: 'Classic Haircut',
    service_duration: 45,
    service_price: 35,
    start_time: '2025-07-12T10:00:00.000Z',
    end_time: '2025-07-12T10:45:00.000Z',
    status: 'confirmed',
    barber_name: 'Alex Thompson'
  }
]

export default function CalendarPage() {
  const [currentView, setCurrentView] = useState<CalendarView>('week')
  const [currentDate, setCurrentDate] = useState(new Date())

  // Navigation functions
  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    
    switch (currentView) {
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
  }, [currentView, currentDate])

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Get appointments for current view
  const getFilteredAppointments = () => {
    const today = new Date()
    
    switch (currentView) {
      case 'day':
        return mockAppointments.filter(apt => 
          isSameDay(new Date(apt.start_time), currentDate)
        )
      case 'week':
        const weekStart = startOfWeek(currentDate)
        const weekEnd = endOfWeek(currentDate)
        return mockAppointments.filter(apt => {
          const aptDate = new Date(apt.start_time)
          return aptDate >= weekStart && aptDate <= weekEnd
        })
      case 'month':
        const monthStart = startOfMonth(currentDate)
        const monthEnd = endOfMonth(currentDate)
        return mockAppointments.filter(apt => {
          const aptDate = new Date(apt.start_time)
          return aptDate >= monthStart && aptDate <= monthEnd
        })
      default:
        return mockAppointments
    }
  }

  const filteredAppointments = getFilteredAppointments()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDateRange = () => {
    switch (currentView) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy')
      case 'week':
        const weekStart = startOfWeek(currentDate)
        const weekEnd = endOfWeek(currentDate)
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
      case 'month':
        return format(currentDate, 'MMMM yyyy')
      default:
        return ''
    }
  }

  const viewOptions = [
    { value: 'day' as CalendarView, label: 'Day', icon: ClockIcon },
    { value: 'week' as CalendarView, label: 'Week', icon: ViewColumnsIcon },
    { value: 'month' as CalendarView, label: 'Month', icon: Squares2X2Icon }
  ]

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate)
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    
    return (
      <div className="grid grid-cols-7 gap-1 h-full">
        {/* Day headers */}
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="p-2 text-center font-medium bg-gray-50 border-b">
            <div className="text-sm text-gray-600">{format(day, 'EEE')}</div>
            <div className={`text-lg ${isSameDay(day, new Date()) ? 'text-blue-600 font-bold' : 'text-gray-900'}`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
        
        {/* Day content */}
        {weekDays.map((day) => {
          const dayAppointments = filteredAppointments.filter(apt => 
            isSameDay(new Date(apt.start_time), day)
          )
          
          return (
            <div key={day.toISOString()} className="p-2 border-r border-gray-200 min-h-96 bg-white">
              {dayAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className={`p-2 mb-2 rounded-md border text-xs cursor-pointer hover:shadow-sm ${getStatusColor(appointment.status)}`}
                  onClick={() => alert(`Appointment: ${appointment.client_name}\n${appointment.service_name}\n${format(new Date(appointment.start_time), 'h:mm a')}`)}
                >
                  <div className="font-medium">{format(new Date(appointment.start_time), 'h:mm a')}</div>
                  <div className="truncate">{appointment.client_name}</div>
                  <div className="truncate">{appointment.service_name}</div>
                </div>
              ))}
              
              {/* Add appointment button */}
              <button
                onClick={() => alert(`Create appointment for ${format(day, 'EEEE, MMM d')}`)}
                className="w-full p-2 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:border-blue-400 hover:text-blue-600 text-xs"
              >
                <PlusIcon className="w-4 h-4 mx-auto mb-1" />
                Add appointment
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  const renderDayView = () => {
    const dayAppointments = filteredAppointments.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )
    
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {dayAppointments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CalendarDaysIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments today</h3>
                <p className="text-gray-600 mb-4">You have a free day! Consider reaching out to clients or planning ahead.</p>
                <AccessibleButton variant="primary" onClick={() => alert('Create new appointment')}>
                  Schedule Appointment
                </AccessibleButton>
              </CardContent>
            </Card>
          ) : (
            <>
              {dayAppointments.map((appointment) => (
                <Card key={appointment.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{appointment.client_name}</h3>
                        <p className="text-gray-600">{appointment.service_name}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {format(new Date(appointment.start_time), 'h:mm a')} - {format(new Date(appointment.end_time), 'h:mm a')}
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Duration:</span> {appointment.service_duration} minutes
                      </div>
                      <div>
                        <span className="text-gray-600">Price:</span> ${appointment.service_price}
                      </div>
                      <div>
                        <span className="text-gray-600">Phone:</span> {appointment.client_phone}
                      </div>
                      <div>
                        <span className="text-gray-600">Barber:</span> {appointment.barber_name}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </div>
    )
  }

  const renderMonthView = () => {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-12">
            <CalendarDaysIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Month View</h3>
            <p className="text-gray-600 mb-4">
              Full month calendar view coming soon. For now, use Week or Day view for detailed scheduling.
            </p>
            <div className="text-sm text-gray-500">
              {filteredAppointments.length} appointments this month
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderView = () => {
    switch (currentView) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <CalendarDaysIcon className="w-7 h-7 mr-3 text-blue-500" />
                Calendar
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your schedule and appointments
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* View Selector */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                {viewOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setCurrentView(option.value)}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentView === option.value
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <option.icon className="w-4 h-4 mr-2" />
                    {option.label}
                  </button>
                ))}
              </div>

              {/* New Appointment Button */}
              <AccessibleButton
                variant="primary"
                onClick={() => alert('Create new appointment')}
              >
                New Appointment
              </AccessibleButton>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 rounded-md hover:bg-gray-100"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 rounded-md hover:bg-gray-100"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-medium text-gray-900 ml-4">
                {formatDateRange()}
              </h2>
            </div>
            
            <AccessibleButton
              variant="secondary"
              onClick={goToToday}
            >
              Today
            </AccessibleButton>
          </div>
        </div>
      </header>

      {/* Calendar Content */}
      <div className="flex-1">
        {renderView()}
      </div>
    </div>
  )
}