'use client'

import { useState, useEffect } from 'react'
import { ClockIcon } from '@heroicons/react/24/outline'

interface TimeSlot {
  time: string
  available: boolean
  reason?: string
}

interface TimeSlotSelectorProps {
  slots: TimeSlot[]
  selectedTime: string | null
  onTimeSelect: (time: string) => void
  loading?: boolean
  disabled?: boolean
}

export default function TimeSlotSelector({
  slots,
  selectedTime,
  onTimeSelect,
  loading = false,
  disabled = false
}: TimeSlotSelectorProps) {
  const [groupedSlots, setGroupedSlots] = useState<{ [key: string]: TimeSlot[] }>({})

  useEffect(() => {
    // Group slots by hour periods
    const groups: { [key: string]: TimeSlot[] } = {
      'Morning (9AM - 12PM)': [],
      'Afternoon (12PM - 5PM)': [],
      'Evening (5PM - 8PM)': []
    }

    slots.forEach(slot => {
      const hour = parseInt(slot.time.split(':')[0])
      if (hour >= 9 && hour < 12) {
        groups['Morning (9AM - 12PM)'].push(slot)
      } else if (hour >= 12 && hour < 17) {
        groups['Afternoon (12PM - 5PM)'].push(slot)
      } else if (hour >= 17 && hour <= 20) {
        groups['Evening (5PM - 8PM)'].push(slot)
      }
    })

    // Remove empty groups
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key]
      }
    })

    setGroupedSlots(groups)
  }, [slots])

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
        <span className="ml-3 text-gray-600">Checking availability...</span>
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-12">
        <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No available time slots for the selected date and service.</p>
        <p className="text-sm text-gray-500 mt-2">Please try a different date or barber.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedSlots).map(([period, periodSlots]) => (
        <div key={period}>
          <h3 className="text-sm font-medium text-gray-700 mb-3">{period}</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {periodSlots.map((slot) => (
              <button
                key={slot.time}
                onClick={() => slot.available && !disabled && onTimeSelect(slot.time)}
                disabled={!slot.available || disabled}
                className={`
                  relative px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${slot.available && !disabled
                    ? selectedTime === slot.time
                      ? 'bg-violet-600 text-white ring-2 ring-violet-600 ring-offset-2'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-violet-300'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
                title={!slot.available && slot.reason ? slot.reason : undefined}
              >
                {formatTime(slot.time)}
                {!slot.available && (
                  <span className="absolute inset-0 rounded-lg bg-gray-100 opacity-50"></span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      {selectedTime && (
        <div className="mt-4 p-3 bg-violet-50 border border-violet-200 rounded-lg">
          <p className="text-sm text-violet-800">
            Selected time: <span className="font-medium">{formatTime(selectedTime)}</span>
          </p>
        </div>
      )}
    </div>
  )
}