'use client'

import React from 'react'
import { LoadingSpinner } from '../LoadingStates'

interface CalendarEmptyStateProps {
  message?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export const CalendarEmptyState: React.FC<CalendarEmptyStateProps> = ({
  message = 'No appointments scheduled',
  actionLabel = 'Create Appointment',
  onAction,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Your calendar is clear
      </h3>
      
      <p className="text-gray-500 mb-6 max-w-sm">
        {message}
      </p>
      
      {onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

interface CalendarLoadingManagerProps {
  isLoading: boolean
  error?: string | null
  children: React.ReactNode
  loadingComponent?: React.ReactNode
  errorComponent?: React.ReactNode
}

export const CalendarLoadingManager: React.FC<CalendarLoadingManagerProps> = ({
  isLoading,
  error,
  children,
  loadingComponent,
  errorComponent
}) => {
  if (error) {
    return (
      errorComponent || (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Something went wrong
          </h3>
          <p className="text-gray-500 mb-6 max-w-sm">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )
    )
  }

  if (isLoading) {
    return (
      loadingComponent || (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-gray-500">Loading calendar...</p>
        </div>
      )
    )
  }

  return <>{children}</>
}