'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, addDays, startOfWeek, endOfWeek, isToday, isSameDay, isPast } from 'date-fns'
import {
  CalendarDaysIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

interface MobileDateTimePickerProps {
  selectedDate?: Date
  selectedTime?: string
  onDateSelect: (date: Date) => void
  onTimeSelect: (time: string) => void
  availableSlots?: { [date: string]: { time: string; available: boolean }[] }
  minDate?: Date
  maxDate?: Date
  theme?: 'light' | 'dark'
}

export default function MobileDateTimePicker({
  selectedDate,
  selectedTime,
  onDateSelect,
  onTimeSelect,
  availableSlots = {},
  minDate = new Date(),
  maxDate = addDays(new Date(), 30),
  theme = 'light'
}: MobileDateTimePickerProps) {
  const [viewMode, setViewMode] = useState<'date' | 'time'>('date')
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-switch to time view when date is selected
  useEffect(() => {
    if (selectedDate && !selectedTime) {
      setViewMode('time')
    }
  }, [selectedDate, selectedTime])

  // Generate week days
  const getWeekDays = () => {
    const start = startOfWeek(currentWeek, { weekStartsOn: 0 })
    const days = []
    for (let i = 0; i < 7; i++) {
      days.push(addDays(start, i))
    }
    return days
  }

  // Check if date has available slots
  const hasAvailableSlots = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const slots = availableSlots[dateStr] || []
    return slots.some(slot => slot.available)
  }

  // Get available times for selected date
  const getAvailableTimes = () => {
    if (!selectedDate) return []
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    return availableSlots[dateStr] || []
  }

  // Group times by period
  const groupTimesByPeriod = (times: { time: string; available: boolean }[]) => {
    const groups = {
      morning: [] as typeof times,
      afternoon: [] as typeof times,
      evening: [] as typeof times
    }

    times.forEach(slot => {
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
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const formattedHour = hour % 12 || 12
    return `${formattedHour}:${minutes} ${ampm}`
  }

  const weekDays = getWeekDays()
  const availableTimes = getAvailableTimes()
  const groupedTimes = groupTimesByPeriod(availableTimes)

  return (
    <div className="space-y-4">
      {/* View Mode Tabs */}
      <div className="flex bg-gray-100 dark:bg-[#24252E] rounded-lg p-1">
        <button
          onClick={() => setViewMode('date')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            viewMode === 'date'
              ? 'bg-white dark:bg-[#1A1B23] text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-[#8B92A5]'
          }`}
        >
          <CalendarDaysIcon className="w-4 h-4" />
          <span>Date</span>
        </button>
        <button
          onClick={() => setViewMode('time')}
          disabled={!selectedDate}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            viewMode === 'time'
              ? 'bg-white dark:bg-[#1A1B23] text-gray-900 dark:text-white shadow-sm'
              : selectedDate
                ? 'text-gray-600 dark:text-[#8B92A5]'
                : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
          }`}
        >
          <ClockIcon className="w-4 h-4" />
          <span>Time</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'date' ? (
          <motion.div
            key="date-picker"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Week Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
                disabled={isPast(endOfWeek(addDays(currentWeek, -7)))}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#24252E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-[#8B92A5]" />
              </button>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
              </h3>
              <button
                onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#24252E] transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-[#8B92A5]" />
              </button>
            </div>

            {/* Week Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((date) => {
                const isSelected = selectedDate && isSameDay(date, selectedDate)
                const isDisabled = isPast(date) && !isToday(date)
                const hasSlots = hasAvailableSlots(date)

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => !isDisabled && hasSlots && onDateSelect(date)}
                    disabled={isDisabled || !hasSlots}
                    className={`
                      relative p-3 rounded-lg transition-all transform active:scale-95
                      ${isSelected
                        ? 'bg-[#20D9D2] text-white shadow-md'
                        : isDisabled || !hasSlots
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                          : 'bg-white dark:bg-[#24252E] text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-[#2C2D3A] border border-gray-200 dark:border-[#2C2D3A]'
                      }
                    `}
                  >
                    <div className="text-xs font-medium mb-1">
                      {format(date, 'EEE')}
                    </div>
                    <div className="text-lg font-semibold">
                      {format(date, 'd')}
                    </div>
                    {isToday(date) && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-[#20D9D2] rounded-full" />
                    )}
                    {!hasSlots && !isDisabled && (
                      <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 opacity-50 rounded-lg" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Selected Date Display */}
            {selectedDate && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-[#20D9D2]/10 dark:bg-[#20D9D2]/20 rounded-lg"
              >
                <p className="text-sm text-[#20D9D2] dark:text-[#20D9D2] font-medium">
                  Selected: {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </p>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="time-picker"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {selectedDate && (
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-[#8B92A5]">
                  Select time for
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {format(selectedDate, 'EEEE, MMMM d')}
                </p>
              </div>
            )}

            {/* Time Slots by Period */}
            <div className="space-y-6" ref={scrollRef}>
              {Object.entries(groupedTimes).map(([period, times]) => {
                if (times.length === 0) return null

                return (
                  <div key={period}>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 capitalize">
                      {period}
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {times.map((slot) => {
                        const isSelected = selectedTime === slot.time

                        return (
                          <button
                            key={slot.time}
                            onClick={() => slot.available && onTimeSelect(slot.time)}
                            disabled={!slot.available}
                            className={`
                              relative px-3 py-3 rounded-lg text-sm font-medium transition-all transform active:scale-95
                              ${isSelected
                                ? 'bg-[#20D9D2] text-white shadow-md'
                                : slot.available
                                  ? 'bg-white dark:bg-[#24252E] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2C2D3A] border border-gray-200 dark:border-[#2C2D3A]'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                              }
                            `}
                          >
                            {formatTime(slot.time)}
                            {!slot.available && (
                              <span className="absolute inset-0 rounded-lg bg-gray-100 dark:bg-gray-800 opacity-50" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {availableTimes.length === 0 && (
                <div className="text-center py-8">
                  <ClockIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-[#8B92A5]">
                    No available times for this date
                  </p>
                  <button
                    onClick={() => setViewMode('date')}
                    className="mt-3 text-sm text-[#20D9D2] hover:underline"
                  >
                    Choose another date
                  </button>
                </div>
              )}
            </div>

            {/* Selected Time Display */}
            {selectedTime && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-[#20D9D2]/10 dark:bg-[#20D9D2]/20 rounded-lg"
              >
                <p className="text-sm text-[#20D9D2] dark:text-[#20D9D2] font-medium">
                  Selected: {formatTime(selectedTime)}
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
