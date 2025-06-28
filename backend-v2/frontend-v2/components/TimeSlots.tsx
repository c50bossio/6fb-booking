'use client'

interface TimeSlot {
  time: string
  available: boolean
}

interface TimeSlotsProps {
  slots: TimeSlot[]
  selectedTime: string | null
  onTimeSelect: (time: string) => void
  loading?: boolean
}

export default function TimeSlots({ slots, selectedTime, onTimeSelect, loading = false }: TimeSlotsProps) {
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
          <p className="text-center text-gray-500">No available time slots for this date.</p>
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
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  const renderSlotGroup = (title: string, slots: TimeSlot[]) => {
    if (slots.length === 0) return null

    return (
      <div className="mb-6 last:mb-0">
        <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {slots.map((slot) => (
            <button
              key={slot.time}
              onClick={() => slot.available && onTimeSelect(slot.time)}
              disabled={!slot.available}
              className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${!slot.available 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : selectedTime === slot.time
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                }
              `}
            >
              {formatTime(slot.time)}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Available Time Slots</h2>
        
        {renderSlotGroup('Morning', groupedSlots.morning)}
        {renderSlotGroup('Afternoon', groupedSlots.afternoon)}
        {renderSlotGroup('Evening', groupedSlots.evening)}
      </div>
    </div>
  )
}