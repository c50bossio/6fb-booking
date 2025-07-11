'use client'

import { useState, useEffect, useRef, memo } from 'react'
import { format } from 'date-fns'
import { CalendarDaysIcon, ClockIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { type TimeSlot } from '@/lib/api'
import { cn } from '@/lib/utils'

interface DateTimePickerProps {
  selectedDate: Date | null
  selectedTime: string | null
  onDateChange: (date: Date | null) => void
  onTimeChange: (time: string) => void
  availableSlots: TimeSlot[]
  loadingSlots: boolean
  minDate?: Date
  className?: string
}

export const DateTimePicker = memo(function DateTimePicker({
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  availableSlots,
  loadingSlots,
  minDate = new Date(),
  className = ''
}: DateTimePickerProps) {
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false)
  const timeDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target as Node)) {
        setIsTimeDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Date Selection */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-900 dark:text-white">
          Date *
        </label>
        <div className="relative">
          <input
            type="date"
            value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
            onChange={(e) => {
              const newDate = e.target.value ? new Date(e.target.value) : null
              onDateChange(newDate)
            }}
            min={format(minDate, 'yyyy-MM-dd')}
            className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <CalendarDaysIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Time Selection */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-900 dark:text-white">
          Time *
        </label>
        <div className="relative" ref={timeDropdownRef}>
          <button
            type="button"
            onClick={() => selectedDate && setIsTimeDropdownOpen(!isTimeDropdownOpen)}
            disabled={!selectedDate}
            className={cn(
              'w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-left flex items-center justify-between transition-colors',
              selectedDate 
                ? 'hover:border-gray-400 dark:hover:border-gray-500' 
                : 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-gray-400" />
              <span className={selectedTime ? 'text-gray-900 dark:text-white' : 'text-gray-500'}>
                {selectedTime || 'Select time'}
              </span>
            </div>
            <ChevronDownIcon className={cn(
              'w-5 h-5 text-gray-400 transition-transform',
              isTimeDropdownOpen && 'rotate-180'
            )} />
          </button>

          {isTimeDropdownOpen && (
            <TimeDropdownContent
              availableSlots={availableSlots}
              loadingSlots={loadingSlots}
              selectedTime={selectedTime}
              onSelectTime={(time) => {
                onTimeChange(time)
                setIsTimeDropdownOpen(false)
              }}
            />
          )}
        </div>
        
        {!selectedDate && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Please select a date first
          </p>
        )}
      </div>
    </div>
  )
})

// Separate component for time dropdown
const TimeDropdownContent = memo(function TimeDropdownContent({
  availableSlots,
  loadingSlots,
  selectedTime,
  onSelectTime
}: {
  availableSlots: TimeSlot[]
  loadingSlots: boolean
  selectedTime: string | null
  onSelectTime: (time: string) => void
}) {
  // Group slots by time period
  const groupedSlots = groupSlotsByPeriod(availableSlots)

  return (
    <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
      {loadingSlots ? (
        <div className="p-3 text-center text-gray-500">Loading available times...</div>
      ) : availableSlots.length > 0 ? (
        <div className="py-1">
          {Object.entries(groupedSlots).map(([period, slots]) => (
            <div key={period}>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 sticky top-0">
                {period}
              </div>
              <div className="grid grid-cols-3 gap-1 p-2">
                {slots.map((slot, index) => (
                  <TimeSlotButton
                    key={`${slot.time}-${index}`}
                    slot={slot}
                    isSelected={slot.time === selectedTime}
                    onSelect={() => onSelectTime(slot.time)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 text-center">
          <ClockIcon className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No available times for this date</p>
        </div>
      )}
    </div>
  )
})

// Individual time slot button
const TimeSlotButton = memo(function TimeSlotButton({
  slot,
  isSelected,
  onSelect
}: {
  slot: TimeSlot
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'px-3 py-2 text-sm font-medium rounded-md transition-all',
        isSelected
          ? 'bg-primary-600 text-white shadow-sm'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600',
        slot.is_next_available && !isSelected && 'ring-2 ring-primary-500 ring-offset-1'
      )}
    >
      {slot.time}
      {slot.is_next_available && (
        <span className="block text-xs mt-0.5">Next available</span>
      )}
    </button>
  )
})

// Helper function to group slots by time period
function groupSlotsByPeriod(slots: TimeSlot[]): Record<string, TimeSlot[]> {
  const groups: Record<string, TimeSlot[]> = {
    'Morning': [],
    'Afternoon': [],
    'Evening': []
  }

  slots.forEach(slot => {
    const hour = parseInt(slot.time.split(':')[0])
    if (hour < 12) {
      groups['Morning'].push(slot)
    } else if (hour < 17) {
      groups['Afternoon'].push(slot)
    } else {
      groups['Evening'].push(slot)
    }
  })

  // Remove empty groups
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key]
    }
  })

  return groups
}