'use client'

import { TimeSlot } from '@/lib/api'
import { formatTimeWithTimezone, getTimezoneAbbreviation } from '@/lib/timezone'

interface TimeSlotsProps {
  slots: TimeSlot[]
  selectedTime: string | null
  onTimeSelect: (time: string) => void
  loading?: boolean
  showNextAvailableBadge?: boolean
}

export default function TimeSlots({ slots, selectedTime, onTimeSelect, loading = false, showNextAvailableBadge = true }: TimeSlotsProps) {
  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <p className="text-gray-500">No available time slots for this date.</p>
          </div>
        </div>
      </div>
    )
  }

  // Group slots by morning, afternoon, evening
  const groupSlots = (slots: TimeSlot[]) => {
    const groups = {
      morning: [] as TimeSlot[],
      afternoon: [] as TimeSlot[],
      evening: [] as TimeSlot[]
    }

    slots.forEach(slot => {
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

  const groupedSlots = groupSlots(slots)

  const formatTime = (time: string) => {
    // Format time without timezone for compact display in slots
    return formatTimeWithTimezone(time, false)
  }
  
  const timezoneAbbr = getTimezoneAbbreviation()

  const renderSlotGroup = (title: string, slots: TimeSlot[]) => {
    if (slots.length === 0) return null

    return (
      <div className="mb-6 last:mb-0">
        <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {slots.map((slot) => (
            <div key={slot.time} className="relative">
              <button
                onClick={() => slot.available && onTimeSelect(slot.time)}
                disabled={!slot.available}
                className={`
                  w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative
                  ${!slot.available 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : selectedTime === slot.time
                      ? 'bg-primary-600 text-white'
                      : slot.is_next_available && showNextAvailableBadge
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg ring-2 ring-primary-300 hover:from-primary-600 hover:to-primary-700'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-primary-400 hover:bg-primary-50'
                  }
                `}
              >
                {formatTime(slot.time)}
              </button>
              {slot.is_next_available && showNextAvailableBadge && slot.available && (
                <div className="absolute -top-2 -right-2 bg-primary-500 text-white text-xs px-1.5 py-0.5 rounded-full font-semibold shadow-sm animate-pulse">
                  ⚡
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Available Time Slots</h2>
            {timezoneAbbr && (
              <p className="text-sm text-gray-500 mt-1">All times in {timezoneAbbr}</p>
            )}
          </div>
          {slots.some(slot => slot.is_next_available) && showNextAvailableBadge && (
            <div className="flex items-center text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
              <span className="mr-1">⚡</span>
              Next Available
            </div>
          )}
        </div>
        
        {renderSlotGroup('Morning', groupedSlots.morning)}
        {renderSlotGroup('Afternoon', groupedSlots.afternoon)}
        {renderSlotGroup('Evening', groupedSlots.evening)}
      </div>
    </div>
  )
}