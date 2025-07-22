'use client'

import React, { useState } from 'react'
import { format, isToday, isTomorrow } from 'date-fns'
import { 
  ClockIcon, 
  UserIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  XMarkIcon,
  CheckIcon,
  LightBulbIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { useAppointmentPatterns } from '@/hooks/useAppointmentPatterns'
import type { AppointmentPattern, AppointmentSuggestion } from '@/hooks/useAppointmentPatterns'

interface AppointmentSuggestionsProps {
  appointments?: any[]
  onSuggestionAccept?: (suggestion: AppointmentSuggestion) => void
  onSuggestionDismiss?: (suggestionId: string) => void
  className?: string
  maxSuggestions?: number
  showPatternDetails?: boolean
}

/**
 * Component that displays intelligent appointment suggestions based on patterns
 */
export function AppointmentSuggestions({
  appointments = [],
  onSuggestionAccept,
  onSuggestionDismiss,
  className = '',
  maxSuggestions = 3,
  showPatternDetails = false
}: AppointmentSuggestionsProps) {
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  
  const {
    patterns,
    suggestions,
    isAnalyzing,
    stats
  } = useAppointmentPatterns(appointments)

  const visibleSuggestions = suggestions
    .slice(0, maxSuggestions)
    .filter((_, index) => !dismissedSuggestions.has(`suggestion-${index}`))

  const handleAcceptSuggestion = (suggestion: AppointmentSuggestion) => {
    onSuggestionAccept?.(suggestion)
  }

  const handleDismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestionId]))
    onSuggestionDismiss?.(suggestionId)
  }

  const formatDateTime = (date: Date, time: string) => {
    if (isToday(date)) {
      return `Today at ${time}`
    } else if (isTomorrow(date)) {
      return `Tomorrow at ${time}`
    } else {
      return `${format(date, 'MMM d')} at ${time}`
    }
  }

  const getPatternIcon = (type: AppointmentPattern['type']) => {
    switch (type) {
      case 'recurring':
        return <CalendarIcon className="w-4 h-4" />
      case 'time_slot':
        return <ClockIcon className="w-4 h-4" />
      case 'service_pattern':
        return <ChartBarIcon className="w-4 h-4" />
      default:
        return <LightBulbIcon className="w-4 h-4" />
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50'
    return 'text-blue-600 bg-blue-50'
  }

  if (isAnalyzing) {
    return (
      <div className={`appointment-suggestions ${className}`}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Analyzing appointment patterns...
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Looking for recurring trends and client preferences
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (visibleSuggestions.length === 0) {
    return (
      <div className={`appointment-suggestions ${className}`}>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-center">
            <LightBulbIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              No patterns detected yet
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Book more appointments to see intelligent suggestions
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`appointment-suggestions space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <LightBulbIcon className="w-5 h-5 text-blue-500" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Smart Suggestions
          </h3>
        </div>
        
        {showPatternDetails && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {stats.totalPatterns} patterns found
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div className="space-y-2">
        {visibleSuggestions.map((suggestion, index) => {
          const suggestionId = `suggestion-${index}`
          const relatedPattern = patterns[index]
          
          return (
            <div
              key={suggestionId}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Main suggestion */}
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {suggestion.serviceName}
                    </h4>
                    
                    {relatedPattern && (
                      <div className="flex items-center space-x-1">
                        {getPatternIcon(relatedPattern.type)}
                        <span className={`
                          px-2 py-0.5 text-xs font-medium rounded-full
                          ${getConfidenceColor(relatedPattern.confidence)}
                        `}>
                          {Math.round(relatedPattern.confidence * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-1">
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {formatDateTime(suggestion.recommendedDate, suggestion.recommendedTime)}
                    </div>

                    {suggestion.clientName && (
                      <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                        <UserIcon className="w-3 h-3 mr-1" />
                        {suggestion.clientName}
                      </div>
                    )}

                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                      <ClockIcon className="w-3 h-3 mr-1" />
                      {suggestion.estimatedDuration} minutes
                      {suggestion.estimatedPrice && (
                        <>
                          <CurrencyDollarIcon className="w-3 h-3 ml-2 mr-1" />
                          ${suggestion.estimatedPrice}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Reasoning */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                    {suggestion.reasoning}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1 ml-3">
                  <button
                    onClick={() => handleAcceptSuggestion(suggestion)}
                    className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors duration-200"
                    title="Accept suggestion"
                  >
                    <CheckIcon className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDismissSuggestion(suggestionId)}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors duration-200"
                    title="Dismiss suggestion"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Pattern details (optional) */}
              {showPatternDetails && relatedPattern && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-600">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">
                      Pattern: {relatedPattern.description}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500">
                      Based on {relatedPattern.basedOn.length} appointments
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Stats footer */}
      {showPatternDetails && stats.totalPatterns > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mt-4">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="font-medium text-gray-700 dark:text-gray-300">
                {stats.recurringPatterns}
              </div>
              <div className="text-gray-500 dark:text-gray-400">
                Recurring patterns
              </div>
            </div>
            
            <div>
              <div className="font-medium text-gray-700 dark:text-gray-300">
                {stats.highConfidencePatterns}
              </div>
              <div className="text-gray-500 dark:text-gray-400">
                High confidence
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact suggestion widget for dashboard
 */
interface QuickSuggestionProps {
  appointments?: any[]
  onSuggestionSelect?: (suggestion: AppointmentSuggestion) => void
}

export function QuickSuggestion({ appointments = [], onSuggestionSelect }: QuickSuggestionProps) {
  const { getTopSuggestion, isAnalyzing } = useAppointmentPatterns(appointments)
  const topSuggestion = getTopSuggestion()

  if (isAnalyzing || !topSuggestion) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <LightBulbIcon className="w-6 h-6 text-blue-500" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            Smart Suggestion
          </h4>
          
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {topSuggestion.clientName} • {topSuggestion.serviceName}
          </p>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatDateTime(topSuggestion.recommendedDate, topSuggestion.recommendedTime)}
          </p>
        </div>
        
        <button
          onClick={() => onSuggestionSelect?.(topSuggestion)}
          className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-300 dark:bg-blue-800 dark:hover:bg-blue-700 rounded-md transition-colors duration-200"
        >
          Book
        </button>
      </div>
    </div>
  )
}