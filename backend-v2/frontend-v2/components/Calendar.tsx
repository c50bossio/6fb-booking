'use client'

import { useState, useEffect } from 'react'
import { isToday as checkIsToday } from '@/lib/timezone'

interface CalendarProps {
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  bookingDates?: Date[]
}

export default function Calendar({ selectedDate, onDateSelect, bookingDates = [] }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  // Create today's date at midnight in local timezone
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek }
  }

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth)

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const isToday = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return checkIsToday(date)
  }

  const isSelected = (day: number) => {
    if (!selectedDate) return false
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return date.toDateString() === selectedDate.toDateString()
  }

  const isPastDate = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    date.setHours(0, 0, 0, 0) // Ensure we're comparing dates at midnight
    return date < today
  }

  const isTooFarInFuture = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    date.setHours(0, 0, 0, 0)
    const maxDate = new Date(today)
    maxDate.setDate(maxDate.getDate() + 30)
    maxDate.setHours(23, 59, 59, 999) // End of day
    return date > maxDate
  }

  const hasBooking = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    // Compare dates properly in local timezone
    return bookingDates.some(bookingDate => {
      return bookingDate.getFullYear() === date.getFullYear() &&
             bookingDate.getMonth() === date.getMonth() &&
             bookingDate.getDate() === date.getDate()
    })
  }

  const handleDateClick = (day: number) => {
    if (isPastDate(day) || isTooFarInFuture(day)) return
    
    // Create date at noon to avoid any DST issues
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, 12, 0, 0)
    onDateSelect(date)
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <button
          onClick={previousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h2 className="text-lg font-semibold">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h2>
        
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Next month"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 gap-0 p-4 pb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-600 pb-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-0 p-4 pt-0">
        {/* Empty cells for days before month starts */}
        {Array.from({ length: startingDayOfWeek }).map((_, index) => (
          <div key={`empty-${index}`} className="aspect-square p-1" />
        ))}
        
        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1
          const isPast = isPastDate(day)
          const isTooFar = isTooFarInFuture(day)
          const isDisabled = isPast || isTooFar
          
          return (
            <div key={day} className="aspect-square p-1">
              <button
                onClick={() => handleDateClick(day)}
                disabled={isDisabled}
                className={`
                  relative w-full h-full rounded-lg font-medium text-sm
                  transition-all duration-200 
                  ${isDisabled 
                    ? 'text-gray-300 cursor-not-allowed' 
                    : 'hover:bg-gray-100 cursor-pointer'
                  }
                  ${isToday(day) 
                    ? 'bg-primary-50 text-primary-600 font-semibold' 
                    : ''
                  }
                  ${isSelected(day) 
                    ? 'bg-primary-600 text-white hover:bg-primary-700' 
                    : ''
                  }
                `}
              >
                {day}
                {hasBooking(day) && !isSelected(day) && (
                  <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-400 rounded-full" />
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="px-4 pb-4 flex items-center justify-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-primary-50 rounded"></span>
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-primary-600 rounded"></span>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1 h-1 bg-primary-400 rounded-full"></span>
          <span>Booking</span>
        </div>
      </div>
    </div>
  )
}