'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Badge } from '@/components/ui/badge'
import { bookingService } from '@/lib/api/bookings'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Clock, User } from 'lucide-react'

export interface AvailabilityCalendarProps {
  service: any
  barberId?: number
  locationId?: number
  onDateTimeSelect: (date: Date, time: string, barber: any) => void
  className?: string
}

interface TimeSlot {
  time: string
  available: boolean
  barber?: any
}

interface BarberAvailability {
  barber: any
  timeSlots: TimeSlot[]
}

const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  service,
  barberId,
  locationId,
  onDateTimeSelect,
  className
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedBarber, setSelectedBarber] = useState<any | null>(null)
  const [availability, setAvailability] = useState<BarberAvailability[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    if (selectedDate) {
      loadAvailability(selectedDate)
    }
  }, [selectedDate, service, barberId, locationId])

  const loadAvailability = async (date: Date) => {
    try {
      setLoading(true)
      setError(null)
      setSelectedTime(null)
      setSelectedBarber(null)

      const params = {
        date: date.toISOString().split('T')[0],
        service_id: service.id,
        duration: service.duration,
        barber_id: barberId,
        location_id: locationId
      }

      const response = await bookingService.getAvailability(params)
      setAvailability(response.data)

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load availability')
    } finally {
      setLoading(false)
    }
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
  }

  const handleTimeSelect = (time: string, barber: any) => {
    setSelectedTime(time)
    setSelectedBarber(barber)
  }

  const handleConfirm = () => {
    if (selectedDate && selectedTime && selectedBarber) {
      onDateTimeSelect(selectedDate, selectedTime, selectedBarber)
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []

    // Add empty days for the beginning of the week
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isPastDate = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const formattedHour = hour % 12 || 12
    return `${formattedHour}:${minutes} ${ampm}`
  }

  const monthYearString = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  })

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Calendar */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Select Date</h3>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousMonth}
                disabled={currentMonth.getMonth() === new Date().getMonth() &&
                         currentMonth.getFullYear() === new Date().getFullYear()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-32 text-center">
                {monthYearString}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {getDaysInMonth(currentMonth).map((date, index) => (
              <div key={index} className="aspect-square p-1">
                {date && (
                  <button
                    onClick={() => handleDateSelect(date)}
                    disabled={isPastDate(date)}
                    className={cn(
                      'w-full h-full rounded-lg text-sm font-medium transition-colors',
                      'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500',
                      isPastDate(date) && 'text-gray-300 cursor-not-allowed hover:bg-transparent',
                      isToday(date) && 'bg-blue-100 text-blue-600',
                      selectedDate?.toDateString() === date.toDateString() &&
                        'bg-blue-600 text-white hover:bg-blue-700',
                      !isPastDate(date) && !isToday(date) &&
                        selectedDate?.toDateString() !== date.toDateString() &&
                        'text-gray-700'
                    )}
                  >
                    {date.getDate()}
                  </button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Time Slots */}
      {selectedDate && (
        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">
                Available Times for {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>
            </div>

            {loading && (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            )}

            {error && (
              <div className="text-center py-8">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {!loading && !error && availability.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No available time slots for this date.</p>
              </div>
            )}

            {!loading && !error && availability.length > 0 && (
              <div className="space-y-6">
                {availability.map((barberAvail, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <User className="h-5 w-5 text-gray-400 mr-2" />
                      <h4 className="font-medium">{barberAvail.barber.name}</h4>
                      {barberAvail.barber.rating && (
                        <Badge variant="secondary" className="ml-2">
                          ★ {barberAvail.barber.rating}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {barberAvail.timeSlots.map((slot) => (
                        <Button
                          key={slot.time}
                          variant={selectedTime === slot.time &&
                                  selectedBarber?.id === barberAvail.barber.id ?
                                  'default' : 'outline'}
                          size="sm"
                          disabled={!slot.available}
                          onClick={() => handleTimeSelect(slot.time, barberAvail.barber)}
                          className={cn(
                            'text-xs',
                            !slot.available && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          {formatTime(slot.time)}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedTime && selectedBarber && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Selected appointment:</p>
                    <p className="font-medium">
                      {selectedDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })} at {formatTime(selectedTime)} with {selectedBarber.name}
                    </p>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    {service.duration} min
                  </div>
                </div>

                <Button
                  onClick={handleConfirm}
                  className="w-full"
                >
                  Continue to Confirmation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AvailabilityCalendar
