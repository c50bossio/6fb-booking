'use client'

import React from 'react'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'

interface CalendarLoadingAnimationProps {
  view?: 'month' | 'week' | 'day'
  showStats?: boolean
}

export function CalendarLoadingAnimation({ 
  view = 'month',
  showStats = false 
}: CalendarLoadingAnimationProps) {
  return (
    <div className="w-full">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
        </div>
        
        {showStats && (
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse mb-1" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="text-center">
              <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse mb-1" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
        </div>
      </div>

      {/* Calendar content based on view */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {view === 'month' && <MonthViewSkeleton />}
        {view === 'week' && <WeekViewSkeleton />}
        {view === 'day' && <DayViewSkeleton />}
      </div>

      {/* Floating calendar icon animation */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative">
          <CalendarDaysIcon className="w-24 h-24 text-gray-300 dark:text-gray-600 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-primary-500 rounded-full animate-ping" />
          </div>
        </div>
      </div>
    </div>
  )
}

function MonthViewSkeleton() {
  return (
    <div>
      {/* Month header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="p-3 text-center">
            <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto" />
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {[...Array(35)].map((_, i) => (
          <div key={i} className="h-24 border-b border-r border-gray-100 dark:border-gray-700 p-2">
            <div className="flex flex-col gap-2">
              <div className="h-4 w-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              {Math.random() > 0.7 && (
                <>
                  <div className="h-3 w-full bg-primary-100 dark:bg-primary-900/20 rounded animate-pulse" />
                  {Math.random() > 0.5 && (
                    <div className="h-3 w-full bg-green-100 dark:bg-green-900/20 rounded animate-pulse" />
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function WeekViewSkeleton() {
  return (
    <div>
      {/* Week header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>

      <div className="flex">
        {/* Time column */}
        <div className="w-20 border-r border-gray-200 dark:border-gray-700">
          <div className="h-12 border-b border-gray-200 dark:border-gray-700" />
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-12 border-b border-gray-100 dark:border-gray-700 p-2">
              <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-auto" />
            </div>
          ))}
        </div>

        {/* Days columns */}
        <div className="flex-1 grid grid-cols-7">
          {[...Array(7)].map((_, dayIndex) => (
            <div key={dayIndex} className="border-r border-gray-200 dark:border-gray-700 last:border-r-0">
              <div className="h-12 border-b border-gray-200 dark:border-gray-700 p-2 text-center">
                <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto mb-1" />
                <div className="h-3 w-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto" />
              </div>
              
              <div className="relative">
                {[...Array(10)].map((_, slotIndex) => (
                  <div key={slotIndex} className="h-12 border-b border-gray-100 dark:border-gray-700">
                    {Math.random() > 0.8 && (
                      <div className="absolute inset-x-1 top-1 bottom-1 bg-primary-100 dark:bg-primary-900/20 rounded animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DayViewSkeleton() {
  return (
    <div>
      {/* Day header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div>
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto" />
        </div>
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>

      {/* Barber filter */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 overflow-x-auto">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Time slots */}
      <div className="p-4">
        {[...Array(16)].map((_, i) => (
          <div key={i} className="flex items-start gap-4 mb-4">
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex-shrink-0" />
            <div className="flex-1">
              {Math.random() > 0.6 && (
                <div className="bg-primary-100 dark:bg-primary-900/20 rounded-lg p-3 animate-pulse">
                  <div className="h-4 w-32 bg-primary-200 dark:bg-primary-800/20 rounded mb-2" />
                  <div className="h-3 w-24 bg-primary-200 dark:bg-primary-800/20 rounded" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Animated calendar icon component
export function AnimatedCalendarIcon({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <CalendarDaysIcon className="w-full h-full text-gray-400 dark:text-gray-600" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="grid grid-cols-3 gap-0.5 p-2">
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className="w-1 h-1 bg-primary-500 rounded-full animate-pulse"
              style={{
                animationDelay: `${i * 0.1}s`,
                animationDuration: '1.5s'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}