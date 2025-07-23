'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'

interface RecurringOptionsProps {
  isRecurring: boolean
  recurringPattern: 'weekly' | 'biweekly' | 'monthly'
  onRecurringChange: (isRecurring: boolean) => void
  onPatternChange: (pattern: 'weekly' | 'biweekly' | 'monthly') => void
  className?: string
}

interface PatternOption {
  value: 'weekly' | 'biweekly' | 'monthly'
  label: string
  description: string
  icon: string
}

const patternOptions: PatternOption[] = [
  {
    value: 'weekly',
    label: 'Weekly',
    description: 'Every week',
    icon: '📅'
  },
  {
    value: 'biweekly',
    label: 'Bi-weekly',
    description: 'Every 2 weeks',
    icon: '📋'
  },
  {
    value: 'monthly',
    label: 'Monthly',
    description: 'Every month',
    icon: '🗓️'
  }
]

export const RecurringOptions = memo(function RecurringOptions({
  isRecurring,
  recurringPattern,
  onRecurringChange,
  onPatternChange,
  className = ''
}: RecurringOptionsProps) {
  return (
    <div className={cn(
      'space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700',
      className
    )}>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isRecurring"
          checked={isRecurring}
          onChange={(e) => onRecurringChange(e.target.checked)}
          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
        />
        <label 
          htmlFor="isRecurring" 
          className="text-sm font-semibold text-gray-900 dark:text-white cursor-pointer"
        >
          Make this a recurring appointment
        </label>
      </div>
      
      {isRecurring && (
        <div className="ml-7 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <label className="text-sm text-gray-700 dark:text-gray-300">
            Repeat pattern:
          </label>
          <div className="flex gap-3">
            {patternOptions.map((option) => (
              <PatternButton
                key={option.value}
                option={option}
                isSelected={recurringPattern === option.value}
                onClick={() => onPatternChange(option.value)}
              />
            ))}
          </div>
          <RecurringInfo pattern={recurringPattern} />
        </div>
      )}
    </div>
  )
})

// Pattern selection button
const PatternButton = memo(function PatternButton({
  option,
  isSelected,
  onClick
}: {
  option: PatternOption
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-lg text-sm font-medium transition-all',
        isSelected 
          ? 'bg-primary-600 text-white shadow-sm scale-105' 
          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 hover:scale-105'
      )}
    >
      <span className="mr-1">{option.icon}</span>
      {option.label}
    </button>
  )
})

// Information text about the recurring pattern
const RecurringInfo = memo(function RecurringInfo({
  pattern
}: {
  pattern: 'weekly' | 'biweekly' | 'monthly'
}) {
  const getDescription = () => {
    switch (pattern) {
      case 'weekly':
        return 'Appointments will be automatically scheduled at the same time each week.'
      case 'biweekly':
        return 'Appointments will be automatically scheduled at the same time every two weeks.'
      case 'monthly':
        return 'Appointments will be automatically scheduled at the same time each month.'
    }
  }

  return (
    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <svg 
        className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
      <p className="text-xs text-blue-800 dark:text-blue-200">
        {getDescription()}
      </p>
    </div>
  )
})

// Helper function to calculate next occurrence dates
export function getNextOccurrences(
  startDate: Date,
  pattern: 'weekly' | 'biweekly' | 'monthly',
  count: number = 3
): Date[] {
  const dates: Date[] = []
  const currentDate = new Date(startDate)

  for (let i = 0; i < count; i++) {
    switch (pattern) {
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7)
        break
      case 'biweekly':
        currentDate.setDate(currentDate.getDate() + 14)
        break
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1)
        break
    }
    dates.push(new Date(currentDate))
  }

  return dates
}