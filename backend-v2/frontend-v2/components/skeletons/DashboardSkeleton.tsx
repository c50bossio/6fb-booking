import React from 'react'

export function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-md mb-2"></div>
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            </div>
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments List Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3 border border-gray-100 dark:border-gray-700 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Analytics Chart Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    </div>
  )
}

export function CalendarSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>

      {/* Time Grid */}
      <div className="flex">
        {/* Time Labels */}
        <div className="w-20 pr-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-20 flex items-start">
              <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="flex-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-20 border-b border-gray-100 dark:border-gray-700 relative">
              {i % 3 === 0 && (
                <div className="absolute left-2 top-2 right-2 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function AppointmentListSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  )
}