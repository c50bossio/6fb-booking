'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/LoadingStates'
import { getUpcomingAppointments, type RecurringPattern, type AppointmentOccurrence } from '@/lib/recurringApi'

interface RecurringCalendarViewProps {
  patterns: RecurringPattern[]
  onPatternSelect: (pattern: RecurringPattern) => void
}

interface CalendarDay {
  date: Date
  appointments: AppointmentOccurrence[]
  isCurrentMonth: boolean
  isToday: boolean
}

const PATTERN_COLORS = [
  'bg-blue-100 border-blue-300 text-blue-900',
  'bg-green-100 border-green-300 text-green-900',
  'bg-purple-100 border-purple-300 text-purple-900',
  'bg-pink-100 border-pink-300 text-pink-900',
  'bg-yellow-100 border-yellow-300 text-yellow-900',
  'bg-indigo-100 border-indigo-300 text-indigo-900',
]

export default function RecurringCalendarView({ patterns, onPatternSelect }: RecurringCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([])
  const [appointments, setAppointments] = useState<AppointmentOccurrence[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredPattern, setHoveredPattern] = useState<number | null>(null)

  // Create pattern color map
  const patternColorMap = new Map<number, string>()
  patterns.forEach((pattern, index) => {
    patternColorMap.set(pattern.id, PATTERN_COLORS[index % PATTERN_COLORS.length])
  })

  useEffect(() => {
    fetchAllAppointments()
  }, [patterns, currentMonth])

  const fetchAllAppointments = async () => {
    if (patterns.length === 0) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // Fetch appointments for all patterns
      const allAppointments: AppointmentOccurrence[] = []
      
      for (const pattern of patterns) {
        if (pattern.is_active) {
          try {
            const data = await getUpcomingAppointments(pattern.id, 90) // Get 90 days ahead
            allAppointments.push(...data.appointments.map(apt => ({
              ...apt,
              pattern_id: pattern.id
            })))
          } catch (err) {
            console.error(`Failed to fetch appointments for pattern ${pattern.id}:`, err)
          }
        }
      }
      
      setAppointments(allAppointments)
      generateCalendarDays(allAppointments)
    } catch (err) {
      console.error('Failed to fetch appointments:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateCalendarDays = (appointments: AppointmentOccurrence[]) => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startingDayOfWeek = firstDay.getDay()
    const daysInMonth = lastDay.getDate()
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const days: CalendarDay[] = []
    
    // Add days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i)
      days.push({
        date,
        appointments: getAppointmentsForDate(appointments, date),
        isCurrentMonth: false,
        isToday: false
      })
    }
    
    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      days.push({
        date,
        appointments: getAppointmentsForDate(appointments, date),
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString()
      })
    }
    
    // Add days from next month to fill the grid
    const remainingDays = 42 - days.length // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day)
      days.push({
        date,
        appointments: getAppointmentsForDate(appointments, date),
        isCurrentMonth: false,
        isToday: false
      })
    }
    
    setCalendarDays(days)
  }

  const getAppointmentsForDate = (appointments: AppointmentOccurrence[], date: Date): AppointmentOccurrence[] => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate.toDateString() === date.toDateString()
    })
  }

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={previousMonth}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={nextMonth}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Pattern Legend */}
        <div className="flex flex-wrap gap-2 mt-4">
          {patterns.filter(p => p.is_active).map((pattern, index) => (
            <div
              key={pattern.id}
              className={`px-3 py-1 text-xs rounded-full border cursor-pointer transition-opacity ${
                patternColorMap.get(pattern.id)
              } ${hoveredPattern && hoveredPattern !== pattern.id ? 'opacity-30' : ''}`}
              onMouseEnter={() => setHoveredPattern(pattern.id)}
              onMouseLeave={() => setHoveredPattern(null)}
              onClick={() => onPatternSelect(pattern)}
            >
              {pattern.service?.name} - {pattern.pattern_type}
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0 mb-2">
              {dayNamesShort.map(day => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-gray-600 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0 border-t border-l">
              {calendarDays.map((day, index) => {
                const hasAppointments = day.appointments.length > 0
                const isHighlighted = hoveredPattern && day.appointments.some(
                  apt => apt.pattern_id === hoveredPattern
                )

                return (
                  <div
                    key={index}
                    className={`border-r border-b p-2 min-h-[100px] transition-colors ${
                      !day.isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                    } ${day.isToday ? 'bg-blue-50' : ''} ${
                      isHighlighted ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      !day.isCurrentMonth ? 'text-gray-400' : 'text-gray-900'
                    } ${day.isToday ? 'text-blue-600' : ''}`}>
                      {day.date.getDate()}
                    </div>

                    {hasAppointments && (
                      <div className="space-y-1">
                        {day.appointments.slice(0, 3).map((apt, aptIndex) => {
                          const pattern = patterns.find(p => p.id === apt.pattern_id)
                          if (!pattern) return null

                          return (
                            <div
                              key={aptIndex}
                              className={`text-xs px-1 py-0.5 rounded border cursor-pointer transition-opacity ${
                                apt.pattern_id ? patternColorMap.get(apt.pattern_id) : ''
                              } ${hoveredPattern && hoveredPattern !== apt.pattern_id ? 'opacity-30' : ''}`}
                              onClick={() => onPatternSelect(pattern)}
                              onMouseEnter={() => setHoveredPattern(apt.pattern_id || null)}
                              onMouseLeave={() => setHoveredPattern(null)}
                              title={`${pattern.service?.name} - ${new Date(apt.start_time).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}`}
                            >
                              {new Date(apt.start_time).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          )
                        })}
                        {day.appointments.length > 3 && (
                          <div className="text-xs text-gray-500 pl-1">
                            +{day.appointments.length - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}