'use client'

import React from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { Button } from '../ui/Button'

interface CalendarHeaderProps {
  currentDate: Date
  onPrevious: () => void
  onNext: () => void
  onToday?: () => void
  view?: 'day' | 'week' | 'month'
  onViewChange?: (view: 'day' | 'week' | 'month') => void
  className?: string
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  onPrevious,
  onNext,
  onToday,
  view = 'month',
  onViewChange,
  className = ''
}) => {
  const formatDate = () => {
    switch (view) {
      case 'day':
        return currentDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      case 'week':
        return currentDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        })
      case 'month':
      default:
        return currentDate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        })
    }
  }

  return (
    <div className={`flex items-center justify-between mb-6 ${className}`}>
      {/* Date Navigation */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Button
            onClick={onPrevious}
            variant="outline"
            size="sm"
            className="p-2"
            aria-label="Previous period"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>
          
          <Button
            onClick={onNext}
            variant="outline"
            size="sm"
            className="p-2"
            aria-label="Next period"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>

        <h2 className="text-xl font-semibold text-gray-900">
          {formatDate()}
        </h2>

        {onToday && (
          <Button
            onClick={onToday}
            variant="ghost"
            size="sm"
          >
            Today
          </Button>
        )}
      </div>

      {/* View Switcher */}
      {onViewChange && (
        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
          {(['day', 'week', 'month'] as const).map((viewOption) => (
            <button
              key={viewOption}
              onClick={() => onViewChange(viewOption)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                view === viewOption
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {viewOption.charAt(0).toUpperCase() + viewOption.slice(1)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default CalendarHeader