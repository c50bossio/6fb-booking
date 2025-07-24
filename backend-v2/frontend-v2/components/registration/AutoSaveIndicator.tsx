/**
 * AutoSaveIndicator - Component to show auto-save status and provide user feedback
 * 
 * Features:
 * - Real-time auto-save status indicators
 * - Last saved timestamp
 * - Error states and recovery actions
 * - Accessible design with proper ARIA labels
 * - Subtle animations and visual feedback
 */

'use client'

import React from 'react'
import { PersistenceState } from '@/hooks/useRegistrationPersistence'

interface AutoSaveIndicatorProps {
  persistenceState: PersistenceState
  onManualSave?: () => void
  onClearData?: () => void
  className?: string
}

export function AutoSaveIndicator({
  persistenceState,
  onManualSave,
  onClearData,
  className = ''
}: AutoSaveIndicatorProps) {
  const {
    isAutoSaving,
    lastSaved,
    error,
    hasStoredData
  } = persistenceState

  const formatLastSaved = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffSecs < 30) return 'just now'
    if (diffSecs < 60) return `${diffSecs}s ago`
    if (diffMins < 60) return `${diffMins}m ago`
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Don't show indicator if no data has been saved and not currently saving
  if (!hasStoredData && !isAutoSaving && !error) {
    return null
  }

  return (
    <div className={`flex items-center justify-between text-xs ${className}`}>
      {/* Status Section */}
      <div className="flex items-center space-x-2">
        {/* Auto-save Status */}
        {isAutoSaving ? (
          <div className="flex items-center text-blue-600 dark:text-blue-400">
            <svg 
              className="animate-spin w-3 h-3 mr-1.5" 
              fill="none" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span aria-live="polite">Saving progress...</span>
          </div>
        ) : error ? (
          <div className="flex items-center text-red-600 dark:text-red-400">
            <svg 
              className="w-3 h-3 mr-1.5" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path 
                fillRule="evenodd" 
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
                clipRule="evenodd" 
              />
            </svg>
            <span aria-live="assertive" title={error}>
              Save failed
            </span>
          </div>
        ) : hasStoredData && lastSaved ? (
          <div className="flex items-center text-green-600 dark:text-green-400">
            <svg 
              className="w-3 h-3 mr-1.5" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path 
                fillRule="evenodd" 
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                clipRule="evenodd" 
              />
            </svg>
            <span aria-live="polite">
              Saved {formatLastSaved(lastSaved)}
            </span>
          </div>
        ) : null}

        {/* Auto-save Feature Indicator */}
        {!error && !isAutoSaving && (
          <div className="text-gray-500 dark:text-gray-400 flex items-center">
            <svg 
              className="w-3 h-3 mr-1" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
              />
            </svg>
            <span>Auto-save enabled</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-3">
        {/* Manual Save Button (shown when there's an error) */}
        {error && onManualSave && (
          <button
            onClick={onManualSave}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
            title="Try saving again"
            aria-label="Retry saving progress manually"
          >
            Retry
          </button>
        )}

        {/* Clear Data Button */}
        {hasStoredData && onClearData && (
          <button
            onClick={onClearData}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            title="Clear saved progress and start fresh"
            aria-label="Clear saved progress"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

// Compact version for mobile/smaller spaces
export function CompactAutoSaveIndicator({
  persistenceState,
  className = ''
}: Pick<AutoSaveIndicatorProps, 'persistenceState' | 'className'>) {
  const { isAutoSaving, error, hasStoredData } = persistenceState

  if (!hasStoredData && !isAutoSaving && !error) {
    return null
  }

  return (
    <div className={`inline-flex items-center ${className}`}>
      {isAutoSaving ? (
        <div className="flex items-center text-blue-600 dark:text-blue-400 text-xs">
          <svg 
            className="animate-spin w-3 h-3 mr-1" 
            fill="none" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="sr-only">Saving progress</span>
        </div>
      ) : error ? (
        <div className="flex items-center text-red-600 dark:text-red-400 text-xs">
          <svg 
            className="w-3 h-3" 
            fill="currentColor" 
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path 
              fillRule="evenodd" 
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
              clipRule="evenodd" 
            />
          </svg>
          <span className="sr-only">Save failed</span>
        </div>
      ) : (
        <div className="flex items-center text-green-600 dark:text-green-400 text-xs">
          <svg 
            className="w-3 h-3" 
            fill="currentColor" 
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path 
              fillRule="evenodd" 
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
              clipRule="evenodd" 
            />
          </svg>
          <span className="sr-only">Progress saved</span>
        </div>
      )}
    </div>
  )
}

export default AutoSaveIndicator