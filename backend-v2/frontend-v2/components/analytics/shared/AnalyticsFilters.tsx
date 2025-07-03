import React from 'react'
import { FunnelIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'

export interface FilterOption {
  value: string
  label: string
}

interface AnalyticsFiltersProps {
  filters: {
    label: string
    value: string
    options: FilterOption[]
    onChange: (value: string) => void
  }[]
  onExport?: () => void
  showExport?: boolean
  additionalActions?: React.ReactNode
}

export function AnalyticsFilters({
  filters,
  onExport,
  showExport = true,
  additionalActions
}: AnalyticsFiltersProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 flex flex-wrap gap-4">
          {filters.map((filter, index) => (
            <div key={index} className="flex items-center gap-2">
              {index === 0 && <FunnelIcon className="w-5 h-5 text-gray-500" />}
              <select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          {additionalActions}
          {showExport && onExport && (
            <Button
              onClick={onExport}
              variant="secondary"
              leftIcon={<ArrowDownTrayIcon className="w-5 h-5" />}
            >
              Export
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Location filter for enterprise views
interface LocationFilterProps {
  locations: { id: number; name: string }[]
  selectedLocations: number[]
  onChange: (locations: number[]) => void
  multiple?: boolean
}

export function LocationFilter({
  locations,
  selectedLocations,
  onChange,
  multiple = true
}: LocationFilterProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (multiple) {
      const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value))
      onChange(selected)
    } else {
      onChange([parseInt(e.target.value)])
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Location{multiple && 's'}:
      </label>
      <select
        multiple={multiple}
        value={multiple ? selectedLocations.map(String) : String(selectedLocations[0] || '')}
        onChange={handleChange}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        size={multiple ? Math.min(locations.length, 4) : 1}
      >
        {!multiple && <option value="">All Locations</option>}
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </select>
    </div>
  )
}