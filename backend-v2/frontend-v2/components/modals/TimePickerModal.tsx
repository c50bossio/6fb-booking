'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ClockIcon } from '@heroicons/react/24/outline'

interface TimePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectTime: (time: string) => void
  selectedDate?: Date
}

export default function TimePickerModal({
  isOpen,
  onClose,
  onSelectTime,
  selectedDate
}: TimePickerModalProps) {
  const [selectedHour, setSelectedHour] = useState(9)
  const [selectedMinute, setSelectedMinute] = useState(0)

  // Generate common appointment times
  const commonTimes = [
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Appointment Time"
      size="md"
      variant="default"
      position="center"
    >
      <div className="p-6 space-y-6">
        <div className="text-center">
          <ClockIcon className="w-12 h-12 text-primary-500 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            Choose a time for your appointment
            {selectedDate && (
              <span className="block text-sm mt-1">
                on {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            )}
          </p>
        </div>

        {/* Common Times Grid */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Popular times
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {commonTimes.map((time) => (
              <button
                key={time}
                onClick={() => handleTimeSelect(time)}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-500 dark:hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Time Selector */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Or select custom time
          </h3>
          <div className="flex items-center gap-2 justify-center">
            <select
              value={selectedHour}
              onChange={(e) => setSelectedHour(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
              onChange={(e) => setSelectedMinute(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value={0}>00</option>
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={45}>45</option>
            </select>
            <Button
              onClick={handleCustomTime}
              variant="primary"
              size="sm"
              className="ml-4"
            >
              Select
            </Button>
          </div>
        </div>

        {/* Cancel Button */}
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}