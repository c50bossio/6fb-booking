'use client'

import { useState, useEffect, useMemo } from 'react'
import BaseModal from './BaseModal'
import {
  ClockIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

interface TimeSlot {
  time: string
  available: boolean
  barber?: {
    id: number
    name: string
  }
  price?: number
  duration?: number
}

interface TimeSlotPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (timeSlot: { date: string; time: string; barber?: any }) => void
  selectedDate?: string
  selectedTime?: string
  barberId?: number
  serviceId?: number
  serviceDuration?: number // in minutes
}

// Mock availability data
const generateTimeSlots = (date: string, barberId?: number): TimeSlot[] => {
  const slots: TimeSlot[] = []
  const startHour = 9
  const endHour = 19
  const slotDuration = 30 // 30 minutes

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minutes = 0; minutes < 60; minutes += slotDuration) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

      // Mock availability logic
      const isAvailable = Math.random() > 0.3 // 70% availability

      slots.push({
        time: timeString,
        available: isAvailable,
        barber: barberId ? { id: barberId, name: 'Selected Barber' } : undefined
      })
    }
  }

  return slots
}

const mockBarbers = [
  { id: 1, name: 'Marcus Johnson', color: 'slate' },
  { id: 2, name: 'Sarah Mitchell', color: 'emerald' },
  { id: 3, name: 'David Rodriguez', color: 'amber' }
]

export default function TimeSlotPickerModal({
  isOpen,
  onClose,
  onSelect,
  selectedDate,
  selectedTime,
  barberId,
  serviceId,
  serviceDuration = 60
}: TimeSlotPickerModalProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date().toISOString().split('T')[0])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(selectedTime || null)

  // Generate available dates for the next 30 days
  const availableDates = useMemo(() => {
    const dates = []
    const today = new Date()

    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)

      // Skip Sundays for this example
      if (date.getDay() !== 0) {
        dates.push({
          date: date.toISOString().split('T')[0],
          display: date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          }),
          isToday: i === 0
        })
      }
    }

    return dates
  }, [])

  // Load time slots when date or barber changes
  useEffect(() => {
    if (currentDate) {
      setIsLoading(true)
      // Simulate API call
      setTimeout(() => {
        const slots = generateTimeSlots(currentDate, barberId)
        setTimeSlots(slots)
        setIsLoading(false)
      }, 500)
    }
  }, [currentDate, barberId])

  // Group time slots by time periods
  const timeSlotGroups = useMemo(() => {
    const groups = {
      morning: [] as TimeSlot[],
      afternoon: [] as TimeSlot[],
      evening: [] as TimeSlot[]
    }

    timeSlots.forEach(slot => {
      const hour = parseInt(slot.time.split(':')[0])
      if (hour < 12) {
        groups.morning.push(slot)
      } else if (hour < 17) {
        groups.afternoon.push(slot)
      } else {
        groups.evening.push(slot)
      }
    })

    return groups
  }, [timeSlots])

  const handleTimeSlotSelect = (time: string) => {
    setSelectedTimeSlot(time)
  }

  const handleConfirm = () => {
    if (selectedTimeSlot && currentDate) {
      const selectedSlot = timeSlots.find(slot => slot.time === selectedTimeSlot)
      onSelect({
        date: currentDate,
        time: selectedTimeSlot,
        barber: selectedSlot?.barber
      })
      onClose()
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getBarberColor = (barberId?: number) => {
    if (!barberId) return 'slate'
    const barber = mockBarbers.find(b => b.id === barberId)
    return barber?.color || 'slate'
  }

  const TimeSlotGrid = ({ slots, title }: { slots: TimeSlot[]; title: string }) => {
    if (slots.length === 0) return null

    return (
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
          {title}
        </h4>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {slots.map((slot) => (
            <button
              key={slot.time}
              onClick={() => slot.available && handleTimeSlotSelect(slot.time)}
              disabled={!slot.available}
              className={`
                relative p-3 rounded-lg text-sm font-medium transition-all duration-200
                ${slot.available
                  ? selectedTimeSlot === slot.time
                    ? `bg-${getBarberColor(barberId)}-600 text-white shadow-lg scale-105`
                    : `border-2 border-${getBarberColor(barberId)}-200 text-${getBarberColor(barberId)}-700 hover:border-${getBarberColor(barberId)}-400 hover:bg-${getBarberColor(barberId)}-50`
                  : 'border-2 border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                }
              `}
            >
              <div className="text-center">
                <div className="font-semibold">{slot.time}</div>
                {selectedTimeSlot === slot.time && (
                  <CheckCircleIcon className="h-4 w-4 mx-auto mt-1" />
                )}
              </div>

              {!slot.available && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-0.5 bg-gray-400 transform rotate-45"></div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Time Slot"
      size="3xl"
    >
      <div className="space-y-6">
        {/* Service Info Banner */}
        {serviceId && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center space-x-2 text-slate-700">
              <ClockIcon className="h-5 w-5" />
              <span className="text-sm font-medium">
                Service Duration: {serviceDuration} minutes
              </span>
            </div>
          </div>
        )}

        {/* Date Selection */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <CalendarDaysIcon className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Select Date</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {availableDates.slice(0, 14).map((dateInfo) => (
              <button
                key={dateInfo.date}
                onClick={() => setCurrentDate(dateInfo.date)}
                className={`
                  p-3 rounded-lg text-sm font-medium transition-all duration-200 relative
                  ${currentDate === dateInfo.date
                    ? 'bg-teal-600 text-white shadow-lg'
                    : 'border-2 border-gray-200 text-gray-700 hover:border-teal-400 hover:bg-teal-50'
                  }
                `}
              >
                <div className="text-center">
                  <div className="font-semibold">{dateInfo.display}</div>
                  {dateInfo.isToday && (
                    <div className="text-xs opacity-75 mt-1">Today</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Date Display */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-center">
            <h4 className="text-lg font-semibold text-gray-900">
              {formatDate(currentDate)}
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              {timeSlots.filter(slot => slot.available).length} available time slots
            </p>
          </div>
        </div>

        {/* Time Slots */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ClockIcon className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Available Times</h3>
            </div>
            {isLoading && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></div>
                <span>Loading...</span>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-200 rounded-lg animate-pulse"
                ></div>
              ))}
            </div>
          ) : timeSlots.length > 0 ? (
            <div className="max-h-80 overflow-y-auto space-y-6">
              <TimeSlotGrid slots={timeSlotGroups.morning} title="Morning" />
              <TimeSlotGrid slots={timeSlotGroups.afternoon} title="Afternoon" />
              <TimeSlotGrid slots={timeSlotGroups.evening} title="Evening" />
            </div>
          ) : (
            <div className="text-center py-8">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No time slots available</h3>
              <p className="mt-1 text-sm text-gray-500">
                Please select a different date or try again later.
              </p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 text-xs text-gray-600 bg-gray-50 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-teal-600 rounded"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-teal-200 rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-200 rounded relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-0.5 bg-gray-400"></div>
              </div>
            </div>
            <span>Unavailable</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {selectedTimeSlot && (
              <span>Selected: {formatDate(currentDate)} at {selectedTimeSlot}</span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="premium-button-secondary text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedTimeSlot}
              className="premium-button text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Time Slot
            </button>
          </div>
        </div>
      </div>
    </BaseModal>
  )
}
