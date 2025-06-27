'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Clock, Zap } from 'lucide-react'

interface TimeSlot {
  time: string
  available: boolean
  isRecommended?: boolean
  isSoonest?: boolean
}

interface BookingCalendarProps {
  selectedDate: string | null
  onDateSelect: (date: string) => void
  availableDates?: string[]
  minDate?: Date
  maxDate?: Date
  // Time slot integration props
  availableSlots?: { [date: string]: TimeSlot[] }
  selectedTime?: string | null
  onTimeSelect?: (time: string) => void
  autoSelectFirstTime?: boolean
}

export default function BookingCalendar({
  selectedDate,
  onDateSelect,
  availableDates = [],
  minDate = new Date(),
  maxDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
  availableSlots = {},
  selectedTime = null,
  onTimeSelect,
  autoSelectFirstTime = true
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    return new Date(year, month + 1, 0).getDate()
  }, [currentMonth])

  const firstDayOfWeek = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    return new Date(year, month, 1).getDay()
  }, [currentMonth])

  const monthYear = useMemo(() => {
    return currentMonth.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
  }, [currentMonth])

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Find first available date
  const findFirstAvailableDate = () => {
    const sortedDates = [...availableDates].sort()
    return sortedDates.length > 0 ? sortedDates[0] : null
  }

  // Handle "Show First Available" button click
  const handleShowFirstAvailable = () => {
    const firstDate = findFirstAvailableDate()
    if (firstDate) {
      onDateSelect(firstDate)
      
      // Auto-select first available time if enabled
      if (autoSelectFirstTime && onTimeSelect && availableSlots[firstDate]) {
        const availableTimes = availableSlots[firstDate].filter(slot => slot.available)
        if (availableTimes.length > 0) {
          // Prioritize recommended slots, then soonest available
          const recommendedSlot = availableTimes.find(slot => slot.isRecommended)
          const soonestSlot = availableTimes.find(slot => slot.isSoonest)
          const selectedSlot = recommendedSlot || soonestSlot || availableTimes[0]
          onTimeSelect(selectedSlot.time)
        }
      }
    }
  }

  // Auto-select first time when date changes
  useEffect(() => {
    if (selectedDate && autoSelectFirstTime && onTimeSelect && availableSlots[selectedDate]) {
      const availableTimes = availableSlots[selectedDate].filter(slot => slot.available)
      if (availableTimes.length > 0 && !selectedTime) {
        const recommendedSlot = availableTimes.find(slot => slot.isRecommended)
        const soonestSlot = availableTimes.find(slot => slot.isSoonest)
        const selectedSlot = recommendedSlot || soonestSlot || availableTimes[0]
        onTimeSelect(selectedSlot.time)
      }
    }
  }, [selectedDate, availableSlots, autoSelectFirstTime, onTimeSelect, selectedTime])

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev)
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1)
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1)
      }
      return newMonth
    })
  }

  const isDateDisabled = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Check if date is in the past
    if (date < today) return true
    
    // Check if date is before minDate
    if (minDate && date < minDate) return true
    
    // Check if date is after maxDate
    if (maxDate && date > maxDate) return true
    
    return false
  }

  const formatDateString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const isDateAvailable = (dateString: string) => {
    return availableDates.includes(dateString)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const renderCalendarDays = () => {
    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-12 sm:h-14 lg:h-16" />
      )
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      )
      const dateString = formatDateString(date)
      const isDisabled = isDateDisabled(date)
      const isSelected = selectedDate === dateString
      const hasAvailability = isDateAvailable(dateString)
      const isCurrentDay = isToday(date)

      days.push(
        <button
          key={day}
          onClick={() => !isDisabled && onDateSelect(dateString)}
          disabled={isDisabled}
          className={`
            relative h-12 sm:h-14 lg:h-16 rounded-lg font-medium text-base sm:text-lg lg:text-xl
            transition-all duration-200 
            ${
              isDisabled
                ? 'text-gray-300 cursor-not-allowed'
                : isSelected
                ? 'bg-slate-700 text-white hover:bg-slate-800 shadow-lg transform scale-105'
                : 'hover:bg-gray-100 text-gray-700 hover:shadow-md hover:transform hover:scale-102'
            }
            ${isCurrentDay && !isSelected ? 'ring-2 ring-slate-400 ring-inset' : ''}
          `}
        >
          <span className="relative">
            {day}
            {hasAvailability && !isDisabled && (
              <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-green-500 rounded-full" />
            )}
            {/* Show special indicators for recommended slots */}
            {hasAvailability && !isDisabled && availableSlots[dateString] && (
              <>
                {availableSlots[dateString].some(slot => slot.isRecommended) && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                    <Zap className="w-2 h-2 text-yellow-800" />
                  </span>
                )}
                {availableSlots[dateString].some(slot => slot.isSoonest) && !availableSlots[dateString].some(slot => slot.isRecommended) && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full flex items-center justify-center">
                    <Clock className="w-2 h-2 text-blue-800" />
                  </span>
                )}
              </>
            )}
          </span>
        </button>
      )
    }

    return days
  }

  const canNavigatePrev = useMemo(() => {
    const firstDayOfCurrentMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    )
    const firstDayOfMinMonth = new Date(
      minDate.getFullYear(),
      minDate.getMonth(),
      1
    )
    return firstDayOfCurrentMonth > firstDayOfMinMonth
  }, [currentMonth, minDate])

  const canNavigateNext = useMemo(() => {
    const lastDayOfCurrentMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    )
    return lastDayOfCurrentMonth < maxDate
  }, [currentMonth, maxDate])

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 lg:p-10">
      {/* Show First Available Button */}
      {availableDates.length > 0 && (
        <div className="mb-6 flex justify-center">
          <button
            onClick={handleShowFirstAvailable}
            className="inline-flex items-center px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            <Zap className="w-5 h-5 mr-2" />
            Show First Available
          </button>
        </div>
      )}
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigateMonth('prev')}
          disabled={!canNavigatePrev}
          className={`
            p-2 rounded-lg transition-colors
            ${
              canNavigatePrev
                ? 'hover:bg-gray-100 text-gray-700'
                : 'text-gray-300 cursor-not-allowed'
            }
          `}
          aria-label="Previous month"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900">
          {monthYear}
        </h2>
        
        <button
          onClick={() => navigateMonth('next')}
          disabled={!canNavigateNext}
          className={`
            p-2 rounded-lg transition-colors
            ${
              canNavigateNext
                ? 'hover:bg-gray-100 text-gray-700'
                : 'text-gray-300 cursor-not-allowed'
            }
          `}
          aria-label="Next month"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-sm sm:text-base lg:text-lg font-medium text-gray-500 py-3"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {renderCalendarDays()}
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center space-x-8 text-sm sm:text-base text-gray-600">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-slate-700 rounded"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <div className="w-4 h-4 bg-gray-100 rounded"></div>
            <span className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-green-500 rounded-full"></span>
          </div>
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <div className="w-4 h-4 bg-gray-100 rounded"></div>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
              <Zap className="w-2 h-2 text-yellow-800" />
            </span>
          </div>
          <span>Recommended</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <div className="w-4 h-4 bg-gray-100 rounded"></div>
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-400 rounded-full flex items-center justify-center">
              <Clock className="w-2 h-2 text-blue-800" />
            </span>
          </div>
          <span>Soonest</span>
        </div>
      </div>
    </div>
  )
}