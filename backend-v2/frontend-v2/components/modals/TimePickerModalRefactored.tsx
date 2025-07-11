'use client'

import { useState, memo } from 'react'
import { ClockIcon } from '@heroicons/react/24/outline'
import { ModalLayout } from '@/components/calendar/shared/ModalLayout'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface TimePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectTime: (time: string) => void
  selectedDate?: Date
  availableTimes?: string[]
}

export default function TimePickerModal({
  isOpen,
  onClose,
  onSelectTime,
  selectedDate,
  availableTimes
}: TimePickerModalProps) {
  const [selectedHour, setSelectedHour] = useState(9)
  const [selectedMinute, setSelectedMinute] = useState(0)

  // Generate common appointment times if not provided
  const commonTimes = availableTimes || [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00'
  ]

  const handleTimeSelect = (time: string) => {
    onSelectTime(time)
    onClose()
  }

  const handleCustomTime = () => {
    const time = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`
    onSelectTime(time)
    onClose()
  }

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title="Select Appointment Time"
      size="md"
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <TimePickerHeader selectedDate={selectedDate} />

        {/* Common Times Grid */}
        <CommonTimesGrid
          times={commonTimes}
          onSelectTime={handleTimeSelect}
        />

        {/* Custom Time Selector */}
        <CustomTimeSelector
          selectedHour={selectedHour}
          selectedMinute={selectedMinute}
          onHourChange={setSelectedHour}
          onMinuteChange={setSelectedMinute}
          onSelectTime={handleCustomTime}
        />
      </div>
    </ModalLayout>
  )
}

// Header component
const TimePickerHeader = memo(function TimePickerHeader({
  selectedDate
}: {
  selectedDate?: Date
}) {
  return (
    <div className="text-center">
      <ClockIcon className="w-12 h-12 text-primary-500 mx-auto mb-3" />
      <p className="text-gray-600 dark:text-gray-400">
        Choose a time for your appointment
        {selectedDate && (
          <span className="block text-sm mt-1">
            on {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
        )}
      </p>
    </div>
  )
})

// Common times grid component
const CommonTimesGrid = memo(function CommonTimesGrid({
  times,
  onSelectTime
}: {
  times: string[]
  onSelectTime: (time: string) => void
}) {
  // Group times by period
  const groupedTimes = times.reduce((acc, time) => {
    const hour = parseInt(time.split(':')[0])
    const period = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'
    if (!acc[period]) acc[period] = []
    acc[period].push(time)
    return acc
  }, {} as Record<string, string[]>)

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Popular times
      </h3>
      <div className="space-y-4">
        {Object.entries(groupedTimes).map(([period, periodTimes]) => (
          <div key={period}>
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              {period}
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {periodTimes.map((time) => (
                <TimeButton
                  key={time}
                  time={time}
                  onClick={() => onSelectTime(time)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

// Time button component
const TimeButton = memo(function TimeButton({
  time,
  onClick
}: {
  time: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-2 text-sm font-medium rounded-lg border transition-all",
        "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
        "border-gray-300 dark:border-gray-600",
        "hover:bg-primary-50 dark:hover:bg-primary-900/20",
        "hover:border-primary-500 dark:hover:border-primary-400",
        "hover:text-primary-600 dark:hover:text-primary-400",
        "hover:scale-105"
      )}
    >
      {time}
    </button>
  )
})

// Custom time selector component
const CustomTimeSelector = memo(function CustomTimeSelector({
  selectedHour,
  selectedMinute,
  onHourChange,
  onMinuteChange,
  onSelectTime
}: {
  selectedHour: number
  selectedMinute: number
  onHourChange: (hour: number) => void
  onMinuteChange: (minute: number) => void
  onSelectTime: () => void
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Or select custom time
      </h3>
      <div className="flex items-center gap-2 justify-center">
        <select
          value={selectedHour}
          onChange={(e) => onHourChange(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          {Array.from({ length: 14 }, (_, i) => i + 7).map((hour) => (
            <option key={hour} value={hour}>
              {hour.toString().padStart(2, '0')}
            </option>
          ))}
        </select>
        
        <span className="text-2xl font-semibold text-gray-700 dark:text-gray-300">:</span>
        
        <select
          value={selectedMinute}
          onChange={(e) => onMinuteChange(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value={0}>00</option>
          <option value={15}>15</option>
          <option value={30}>30</option>
          <option value={45}>45</option>
        </select>
        
        <Button
          onClick={onSelectTime}
          variant="primary"
          size="sm"
          className="ml-4"
        >
          Select
        </Button>
      </div>
    </div>
  )
})