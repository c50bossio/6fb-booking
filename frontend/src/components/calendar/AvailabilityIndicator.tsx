/**
 * Real-time availability indicator component
 * Shows slot availability, conflicts, and suggestions with theme-aware styling
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAvailability, useConflictDetection, type UseAvailabilityOptions } from '../../hooks/useAvailability'
import { type AvailabilityRequest, type SlotRecommendation } from '../../lib/availability/availability-service'
import { type SchedulingConflict, type ConflictContext } from '../../lib/availability/conflict-resolver'
import { cn } from '../../lib/utils'

interface AvailabilityIndicatorProps {
  // Core props
  barberId?: number
  date: string
  serviceId: number
  duration: number
  selectedTime?: string

  // Display options
  showRecommendations?: boolean
  showConflicts?: boolean
  showLastUpdated?: boolean
  compact?: boolean

  // Styling
  className?: string
  theme?: 'light' | 'dark' | 'auto'

  // Event handlers
  onSlotSelect?: (time: string, barberId: number) => void
  onConflictDetected?: (conflicts: SchedulingConflict[]) => void
  onRecommendationSelect?: (recommendation: SlotRecommendation) => void

  // Configuration
  availabilityOptions?: UseAvailabilityOptions
  autoRefresh?: boolean
  refreshInterval?: number
}

interface SlotDisplayProps {
  time: string
  barberId: number
  barberName: string
  available: boolean
  conflictType?: string
  conflictReason?: string
  confidence: number
  isSelected?: boolean
  isRecommended?: boolean
  isReserved?: boolean
  onSelect?: (time: string, barberId: number) => void
  compact?: boolean
  theme?: string
}

// Individual slot component
const SlotDisplay: React.FC<SlotDisplayProps> = ({
  time,
  barberId,
  barberName,
  available,
  conflictType,
  conflictReason,
  confidence,
  isSelected,
  isRecommended,
  isReserved,
  onSelect,
  compact,
  theme = 'light'
}) => {
  const getSlotStatusColor = () => {
    if (isReserved) return 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-200'
    if (!available) {
      switch (conflictType) {
        case 'overlap': return 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900 dark:border-red-700 dark:text-red-200'
        case 'buffer': return 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900 dark:border-orange-700 dark:text-orange-200'
        case 'break': return 'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900 dark:border-purple-700 dark:text-purple-200'
        default: return 'bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200'
      }
    }
    if (isRecommended) return 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-200'
    return 'bg-white border-gray-200 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100'
  }

  const getConfidenceIndicator = () => {
    if (confidence >= 0.8) return '🟢'
    if (confidence >= 0.6) return '🟡'
    return '🔴'
  }

  return (
    <button
      className={cn(
        'relative p-2 rounded-lg border transition-all duration-200 hover:shadow-sm',
        getSlotStatusColor(),
        isSelected && 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800',
        available && !isReserved && 'hover:bg-blue-50 dark:hover:bg-blue-900',
        compact && 'p-1 text-sm',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
      onClick={() => available && !isReserved && onSelect?.(time, barberId)}
      disabled={!available || isReserved}
      title={conflictReason || `${barberName} - ${time}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-medium">{time}</span>
          {!compact && (
            <span className="text-xs opacity-75">{barberName}</span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {!compact && (
            <span className="text-xs" title={`Confidence: ${Math.round(confidence * 100)}%`}>
              {getConfidenceIndicator()}
            </span>
          )}

          {isRecommended && (
            <span className="text-xs" title="Recommended slot">⭐</span>
          )}

          {isReserved && (
            <span className="text-xs" title="Reserved by you">🔒</span>
          )}
        </div>
      </div>

      {conflictReason && !compact && (
        <div className="mt-1 text-xs opacity-75">
          {conflictReason}
        </div>
      )}
    </button>
  )
}

// Recommendations list component
const RecommendationsList: React.FC<{
  recommendations: SlotRecommendation[]
  onSelect?: (recommendation: SlotRecommendation) => void
  compact?: boolean
  theme?: string
}> = ({ recommendations, onSelect, compact, theme }) => {
  if (recommendations.length === 0) return null

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
        Recommended Times
      </h4>
      <div className="space-y-1">
        {recommendations.slice(0, compact ? 3 : 5).map((rec, index) => (
          <button
            key={`${rec.slot.barberId}-${rec.slot.time}-${index}`}
            className={cn(
              'w-full p-2 text-left rounded-md border transition-colors',
              'bg-green-50 border-green-200 text-green-800 hover:bg-green-100',
              'dark:bg-green-900 dark:border-green-700 dark:text-green-200 dark:hover:bg-green-800',
              compact && 'p-1 text-sm'
            )}
            onClick={() => onSelect?.(rec)}
          >
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium">
                  {rec.alternativeDate || 'Today'} at {rec.slot.time}
                </span>
                <span className="text-sm opacity-75 ml-2">
                  ({rec.slot.barberName})
                </span>
              </div>
              <span className="text-xs bg-green-200 dark:bg-green-700 px-2 py-1 rounded">
                {Math.round(rec.score)}% match
              </span>
            </div>
            {!compact && rec.reasons.length > 0 && (
              <div className="mt-1 text-xs opacity-75">
                {rec.reasons.slice(0, 2).join(', ')}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// Conflicts display component
const ConflictsDisplay: React.FC<{
  conflicts: SchedulingConflict[]
  compact?: boolean
  theme?: string
}> = ({ conflicts, compact, theme }) => {
  if (conflicts.length === 0) return null

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900 dark:border-red-700 dark:text-red-200'
      case 'high': return 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900 dark:border-orange-700 dark:text-orange-200'
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-200'
      default: return 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200'
    }
  }

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
        Scheduling Conflicts
      </h4>
      <div className="space-y-2">
        {conflicts.slice(0, compact ? 2 : 4).map((conflict, index) => (
          <div
            key={index}
            className={cn(
              'p-2 rounded-md border',
              getSeverityColor(conflict.severity),
              compact && 'p-1 text-sm'
            )}
          >
            <div className="flex justify-between items-start">
              <span className="font-medium capitalize">
                {conflict.type.replace('_', ' ')}
              </span>
              <span className="text-xs uppercase tracking-wide">
                {conflict.severity}
              </span>
            </div>
            <p className="text-sm mt-1">{conflict.message}</p>
            {!compact && conflict.suggestedResolutions.length > 0 && (
              <div className="mt-2 text-xs">
                <span className="font-medium">Suggested: </span>
                {conflict.suggestedResolutions[0].description}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Loading skeleton component
const LoadingSkeleton: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <div className="space-y-2">
    {Array.from({ length: compact ? 4 : 8 }).map((_, i) => (
      <div
        key={i}
        className={cn(
          'animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg',
          compact ? 'h-8' : 'h-12'
        )}
      />
    ))}
  </div>
)

// Main component
export const AvailabilityIndicator: React.FC<AvailabilityIndicatorProps> = ({
  barberId,
  date,
  serviceId,
  duration,
  selectedTime,
  showRecommendations = true,
  showConflicts = true,
  showLastUpdated = true,
  compact = false,
  className,
  theme = 'auto',
  onSlotSelect,
  onConflictDetected,
  onRecommendationSelect,
  availabilityOptions = {},
  autoRefresh = true,
  refreshInterval = 30000,
}) => {
  const [detectedTheme, setDetectedTheme] = useState<'light' | 'dark'>('light')

  // Auto-detect theme
  useEffect(() => {
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      setDetectedTheme(mediaQuery.matches ? 'dark' : 'light')

      const handler = (e: MediaQueryListEvent) => {
        setDetectedTheme(e.matches ? 'dark' : 'light')
      }

      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    } else {
      setDetectedTheme(theme)
    }
  }, [theme])

  // Prepare availability request
  const availabilityRequest: AvailabilityRequest = useMemo(() => ({
    date,
    barberId,
    serviceId,
    duration,
    preferredTimes: selectedTime ? [selectedTime] : undefined,
  }), [date, barberId, serviceId, duration, selectedTime])

  // Use availability hook
  const {
    availability,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    dataAge,
    recommendations,
    refreshAvailability,
    reserveSlot,
    releaseSlot,
    isReserved,
    clearError,
  } = useAvailability(availabilityRequest, {
    autoRefresh,
    refreshInterval,
    onError: (error) => {
      console.error('Availability error:', error)
    },
    ...availabilityOptions,
  })

  // Prepare conflict context for conflict detection
  const conflictContext: ConflictContext | null = useMemo(() => {
    if (!selectedTime || !barberId) return null

    return {
      barberId,
      date,
      time: selectedTime,
      duration,
      serviceId,
      priority: 'normal',
      isRescheduling: false,
    }
  }, [barberId, date, selectedTime, duration, serviceId])

  // Use conflict detection hook
  const { conflicts, isChecking } = useConflictDetection(conflictContext, {
    onConflict: onConflictDetected,
  })

  // Handle slot selection
  const handleSlotSelect = (time: string, barberId: number) => {
    onSlotSelect?.(time, barberId)
  }

  // Handle recommendation selection
  const handleRecommendationSelect = (recommendation: SlotRecommendation) => {
    onRecommendationSelect?.(recommendation)
    if (recommendation.alternativeDate) {
      // If it's a different date, we'd need to notify parent to change date
      onSlotSelect?.(recommendation.slot.time, recommendation.slot.barberId)
    } else {
      handleSlotSelect(recommendation.slot.time, recommendation.slot.barberId)
    }
  }

  // Format data age
  const formatDataAge = (age: number) => {
    if (age < 60000) return 'Just now'
    if (age < 3600000) return `${Math.floor(age / 60000)}m ago`
    return `${Math.floor(age / 3600000)}h ago`
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className={cn(
          'font-semibold text-gray-900 dark:text-gray-100',
          compact ? 'text-base' : 'text-lg'
        )}>
          Available Times
        </h3>

        <div className="flex items-center space-x-2">
          {showLastUpdated && lastUpdated && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDataAge(dataAge)}
            </span>
          )}

          <button
            onClick={refreshAvailability}
            disabled={isRefreshing}
            className={cn(
              'p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100',
              'dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isRefreshing && 'animate-spin'
            )}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-md dark:bg-red-900 dark:border-red-700 dark:text-red-200">
          <div className="flex justify-between items-start">
            <span className="text-sm">{error.userMessage || error.message}</span>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && <LoadingSkeleton compact={compact} />}

      {/* Availability slots */}
      {availability && !isLoading && (
        <div>
          <div className={cn(
            'grid gap-2',
            compact ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
          )}>
            {availability.slots.map((slot) => (
              <SlotDisplay
                key={`${slot.barberId}-${slot.time}`}
                time={slot.time}
                barberId={slot.barberId}
                barberName={slot.barberName}
                available={slot.available}
                conflictType={slot.conflictType}
                conflictReason={slot.conflictReason}
                confidence={slot.confidence}
                isSelected={selectedTime === slot.time && barberId === slot.barberId}
                isRecommended={recommendations.some(rec =>
                  rec.slot.time === slot.time && rec.slot.barberId === slot.barberId
                )}
                isReserved={isReserved(slot.barberId, date, slot.time)}
                onSelect={handleSlotSelect}
                compact={compact}
                theme={detectedTheme}
              />
            ))}
          </div>

          {/* Summary */}
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {availability.availableSlots} available out of {availability.totalSlots} slots
            {isRefreshing && (
              <span className="ml-2 text-blue-600 dark:text-blue-400">Updating...</span>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {showRecommendations && recommendations.length > 0 && (
        <RecommendationsList
          recommendations={recommendations}
          onSelect={handleRecommendationSelect}
          compact={compact}
          theme={detectedTheme}
        />
      )}

      {/* Conflicts */}
      {showConflicts && conflicts.length > 0 && (
        <ConflictsDisplay
          conflicts={conflicts}
          compact={compact}
          theme={detectedTheme}
        />
      )}

      {/* Conflict checking indicator */}
      {isChecking && (
        <div className="mt-2 text-sm text-blue-600 dark:text-blue-400 flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
          </svg>
          Checking for conflicts...
        </div>
      )}
    </div>
  )
}

export default AvailabilityIndicator
