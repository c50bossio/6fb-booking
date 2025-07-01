'use client'

import React from 'react'
import { CalendarDaysIcon, ClockIcon } from '@heroicons/react/24/outline'
import type { CalendarView } from '@/types/calendar'

interface CalendarSkeletonProps {
  view: CalendarView
  showStats?: boolean
}

/**
 * Loading skeleton for calendar components
 */
export function CalendarSkeleton({ view, showStats = true }: CalendarSkeletonProps) {
  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm animate-pulse">
      {/* Header skeleton */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
          {showStats && (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-8 mb-1"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
              <div className="text-center">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12 mb-1"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-6"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-6"></div>
        </div>
      </div>

      {/* Content skeleton based on view */}
      <div className="p-4">
        {view === 'day' && <DayViewSkeleton />}
        {view === 'week' && <WeekViewSkeleton />}
        {view === 'month' && <MonthViewSkeleton />}
      </div>
    </div>
  )
}

function DayViewSkeleton() {
  return (
    <div className="flex">
      {/* Time column */}
      <div className="w-20 space-y-2">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="h-16 flex items-start pt-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
          </div>
        ))}
      </div>

      {/* Schedule column */}
      <div className="flex-1 space-y-2 ml-4">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="h-16 border-b border-gray-100 dark:border-gray-700 relative">
            {/* Random appointment blocks */}
            {Math.random() > 0.7 && (
              <div className="absolute left-2 right-2 top-2 h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function WeekViewSkeleton() {
  return (
    <div className="space-y-4">
      {/* Days header */}
      <div className="grid grid-cols-8 gap-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="text-center space-y-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 mx-auto"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-6 mx-auto"></div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-8 gap-2">
        {/* Time column */}
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-12 flex items-start pt-1">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-8"></div>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {Array.from({ length: 7 }).map((_, dayIndex) => (
          <div key={dayIndex} className="space-y-3">
            {Array.from({ length: 10 }).map((_, slotIndex) => (
              <div key={slotIndex} className="h-12 border-t border-gray-100 dark:border-gray-700 relative">
                {/* Random appointment blocks */}
                {Math.random() > 0.8 && (
                  <div className="absolute inset-1 bg-gray-200 dark:bg-gray-700 rounded"></div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function MonthViewSkeleton() {
  return (
    <div className="space-y-4">
      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="h-24 border border-gray-200 dark:border-gray-700 rounded p-2 space-y-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-6"></div>
            {Math.random() > 0.6 && (
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            )}
            {Math.random() > 0.8 && (
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

interface CalendarEmptyStateProps {
  view: CalendarView
  selectedDate?: Date | null
  onCreateAppointment?: () => void
  message?: string
}

/**
 * Empty state for calendar when no appointments are found
 */
export function CalendarEmptyState({ 
  view, 
  selectedDate, 
  onCreateAppointment,
  message 
}: CalendarEmptyStateProps) {
  const getEmptyStateMessage = () => {
    if (message) return message
    
    switch (view) {
      case 'day':
        return selectedDate 
          ? `No appointments scheduled for ${selectedDate.toLocaleDateString()}`
          : 'No appointments scheduled for today'
      case 'week':
        return 'No appointments scheduled for this week'
      case 'month':
        return 'No appointments scheduled for this month'
      default:
        return 'No appointments found'
    }
  }

  const getEmptyStateIcon = () => {
    switch (view) {
      case 'day':
        return <ClockIcon className="w-12 h-12 text-gray-400" />
      case 'week':
      case 'month':
      default:
        return <CalendarDaysIcon className="w-12 h-12 text-gray-400" />
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-6 mb-4">
        {getEmptyStateIcon()}
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {getEmptyStateMessage()}
      </h3>
      
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
        {view === 'day' 
          ? "Start building your schedule by creating a new appointment."
          : "Get started by scheduling appointments for your clients."
        }
      </p>

      {onCreateAppointment && (
        <button
          onClick={onCreateAppointment}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <CalendarDaysIcon className="w-4 h-4" />
          Create Appointment
        </button>
      )}
    </div>
  )
}

interface CalendarLoadingProps {
  message?: string
  progress?: number
}

/**
 * Loading state with progress indicator
 */
export function CalendarLoading({ message = 'Loading calendar...', progress }: CalendarLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative mb-6">
        {/* Spinning calendar icon */}
        <div className="animate-spin">
          <CalendarDaysIcon className="w-8 h-8 text-primary-600" />
        </div>
        
        {/* Progress ring if progress is provided */}
        {progress !== undefined && (
          <div className="absolute -inset-2">
            <svg className="w-12 h-12 transform -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="18"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="24"
                cy="24"
                r="18"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 18}`}
                strokeDashoffset={`${2 * Math.PI * 18 * (1 - progress / 100)}`}
                className="text-primary-600 transition-all duration-300"
              />
            </svg>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        {message}
      </p>

      {progress !== undefined && (
        <p className="text-xs text-gray-500 dark:text-gray-500">
          {Math.round(progress)}% complete
        </p>
      )}
    </div>
  )
}

interface CalendarErrorStateProps {
  error: string
  onRetry?: () => void
  context?: string
}

/**
 * Error state for calendar components
 */
export function CalendarErrorState({ error, onRetry, context }: CalendarErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-6 mb-4">
        <CalendarDaysIcon className="w-12 h-12 text-red-600 dark:text-red-400" />
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Calendar Error
      </h3>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-sm">
        {error || 'Unable to load calendar data. Please try again.'}
      </p>

      {context && (
        <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
          Context: {context}
        </p>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <ClockIcon className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  )
}