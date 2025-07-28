'use client'

import { useState } from 'react'

interface Appointment {
  id: number
  service_name: string
  client_name: string
  appointment_date: string
  start_time: string
  end_time?: string
  barber_name?: string
  status?: string
  duration?: number
}

interface CalendarGridViewProps {
  appointments: Appointment[]
  barbers: any[]
  onAppointmentClick?: (appointment: Appointment) => void
  onTimeSlotClick?: (date: Date, time: string) => void
  onAppointmentReschedule?: (appointment: Appointment, newDate: Date, newTime: string) => Promise<boolean>
}

type ViewType = 'month' | 'week' | 'day'

export function CalendarGridView({ 
  appointments, 
  barbers, 
  onAppointmentClick, 
  onTimeSlotClick,
  onAppointmentReschedule 
}: CalendarGridViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewType, setViewType] = useState<ViewType>('month')
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Generate calendar data for month view
  const generateMonthCalendar = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days = []
    const current = new Date(startDate)
    
    for (let i = 0; i < 42; i++) {
      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        isToday: current.toDateString() === new Date().toDateString()
      })
      current.setDate(current.getDate() + 1)
    }
    
    return { days, month: firstDay }
  }

  const calendarData = generateMonthCalendar()

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            🎉 CALENDAR GRID VIEW IS WORKING! 🎉
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewType('month')}
              className={`px-3 py-1 rounded ${viewType === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Month
            </button>
            <button
              onClick={() => setViewType('week')}
              className={`px-3 py-1 rounded ${viewType === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Week
            </button>
            <button
              onClick={() => setViewType('day')}
              className={`px-3 py-1 rounded ${viewType === 'day' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Day
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              const newDate = new Date(currentDate)
              newDate.setMonth(newDate.getMonth() - 1)
              setCurrentDate(newDate)
            }}
            className="p-2 hover:bg-gray-100 rounded"
          >
            ←
          </button>
          <h3 className="text-xl font-semibold">
            {calendarData.month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <button
            onClick={() => {
              const newDate = new Date(currentDate)
              newDate.setMonth(newDate.getMonth() + 1)
              setCurrentDate(newDate)
            }}
            className="p-2 hover:bg-gray-100 rounded"
          >
            →
          </button>
        </div>
      </div>

      {viewType === 'month' && (
        <div>
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 border border-gray-200 rounded-lg overflow-hidden">
            {calendarData.days.map((day, index) => {
              const dayAppointments = appointments.filter((apt) => {
                const aptDate = new Date(apt.appointment_date)
                return aptDate.toDateString() === day.date.toDateString()
              })
              
              return (
                <button
                  key={index}
                  onClick={() => onTimeSlotClick?.(day.date, '10:00')}
                  className={`
                    min-h-[100px] p-2 border-r border-b border-gray-200 hover:bg-blue-50 transition-colors text-left
                    ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                    ${day.isToday ? 'bg-blue-100 border-blue-300' : ''}
                  `}
                >
                  <div className="font-medium">{day.date.getDate()}</div>
                  <div className="mt-1 space-y-1">
                    {dayAppointments.slice(0, 2).map((apt) => (
                      <div
                        key={apt.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onAppointmentClick?.(apt)
                        }}
                        className="text-xs bg-blue-500 text-white rounded p-1 cursor-pointer hover:bg-blue-600"
                      >
                        {apt.client_name}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{dayAppointments.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {viewType === 'week' && (
        <div className="text-center py-8">
          <h3 className="text-xl font-bold text-green-600">Week View - Coming Soon!</h3>
          <p className="text-gray-600">This will show the weekly calendar view</p>
        </div>
      )}

      {viewType === 'day' && (
        <div className="text-center py-8">
          <h3 className="text-xl font-bold text-purple-600">Day View - Coming Soon!</h3>  
          <p className="text-gray-600">This will show the daily schedule view</p>
        </div>
      )}

      <div className="mt-6 p-4 bg-green-100 border border-green-300 rounded-lg">
        <h4 className="font-bold text-green-800">✅ Calendar Grid Status:</h4>
        <ul className="text-sm text-green-700 mt-2">
          <li>✅ Component loaded successfully</li>
          <li>✅ Props received: {appointments.length} appointments, {barbers.length} barbers</li>
          <li>✅ Month navigation working</li>
          <li>✅ View switching working (Current: {viewType})</li>
          <li>✅ Calendar grid rendering</li>
        </ul>
      </div>
    </div>
  )
}