'use client'

import React from 'react'
import { BuildingOfficeIcon } from '@heroicons/react/24/outline'

interface LocationSelectorSkeletonProps {
  compact?: boolean
  className?: string
}

export function LocationSelectorSkeleton({ 
  compact = false, 
  className = '' 
}: LocationSelectorSkeletonProps) {
  return (
    <div className={`relative ${className}`}>
      <div className={`
        flex items-center justify-between w-full
        ${compact ? 'px-3 py-2' : 'px-4 py-3'}
        bg-gray-50 dark:bg-zinc-800/50
        border border-gray-200 dark:border-gray-700
        rounded-ios-lg
        animate-pulse
      `}>
        <div className="flex items-center space-x-3 min-w-0">
          <BuildingOfficeIcon className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
          <div className="text-left min-w-0 flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-1"></div>
            {!compact && (
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            )}
          </div>
        </div>
        <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded flex-shrink-0 ml-2"></div>
      </div>
    </div>
  )
}

export function LocationSelectorLoadingState({ 
  compact = false, 
  className = '' 
}: LocationSelectorSkeletonProps) {
  return (
    <div className={`relative ${className}`}>
      <div className={`
        flex items-center justify-between w-full
        ${compact ? 'px-3 py-2' : 'px-4 py-3'}
        bg-white dark:bg-zinc-800
        border border-gray-200 dark:border-gray-700
        rounded-ios-lg
      `}>
        <div className="flex items-center space-x-3 min-w-0">
          <BuildingOfficeIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <div className="text-left min-w-0">
            <div className="font-medium text-gray-900 dark:text-white">
              Loading locations...
            </div>
            {!compact && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Please wait
              </div>
            )}
          </div>
        </div>
        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin flex-shrink-0 ml-2"></div>
      </div>
    </div>
  )
}

export function LocationSelectorErrorState({ 
  compact = false, 
  className = '',
  onRetry,
  error = 'Failed to load locations'
}: LocationSelectorSkeletonProps & {
  onRetry?: () => void
  error?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <div className={`
        flex items-center justify-between w-full
        ${compact ? 'px-3 py-2' : 'px-4 py-3'}
        bg-red-50 dark:bg-red-950/20
        border border-red-200 dark:border-red-800
        rounded-ios-lg
      `}>
        <div className="flex items-center space-x-3 min-w-0">
          <BuildingOfficeIcon className="w-5 h-5 text-red-400 dark:text-red-500 flex-shrink-0" />
          <div className="text-left min-w-0">
            <div className="font-medium text-red-700 dark:text-red-300 text-sm">
              {compact ? 'Error' : error}
            </div>
            {!compact && onRetry && (
              <button 
                onClick={onRetry}
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
              >
                Try again
              </button>
            )}
          </div>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 flex-shrink-0 ml-2"
            aria-label="Retry loading locations"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}