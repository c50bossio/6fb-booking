import React from 'react'
import { CalendarIcon } from '@heroicons/react/24/outline'

export type DateRangePreset = '7d' | '30d' | '90d' | '1y' | 'custom'

interface DateRangeSelectorProps {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
  preset?: DateRangePreset
  onPresetChange?: (preset: DateRangePreset) => void
  showPresets?: boolean
}

export function DateRangeSelector({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  preset = 'custom',
  onPresetChange,
  showPresets = true
}: DateRangeSelectorProps) {
  const handlePresetChange = (newPreset: DateRangePreset) => {
    if (onPresetChange) {
      onPresetChange(newPreset)
    }

    if (newPreset === 'custom') return

    const endDate = new Date()
    const startDate = new Date()

    switch (newPreset) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
    }

    onStartDateChange(startDate.toISOString().split('T')[0])
    onEndDateChange(endDate.toISOString().split('T')[0])
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col lg:flex-row gap-4">
        {showPresets && (
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gray-500" />
            <select
              value={preset}
              onChange={(e) => handlePresetChange(e.target.value as DateRangePreset)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
              <option value="custom">Custom range</option>
            </select>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                onStartDateChange(e.target.value)
                if (onPresetChange) onPresetChange('custom')
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                onEndDateChange(e.target.value)
                if (onPresetChange) onPresetChange('custom')
              }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Quick preset buttons variant
interface QuickDatePresetsProps {
  onSelect: (preset: DateRangePreset) => void
  selected?: DateRangePreset
}

export function QuickDatePresets({ onSelect, selected = '30d' }: QuickDatePresetsProps) {
  const presets: { value: DateRangePreset; label: string }[] = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' }
  ]

  return (
    <div className="flex gap-2">
      {presets.map((preset) => (
        <button
          key={preset.value}
          onClick={() => onSelect(preset.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selected === preset.value
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}