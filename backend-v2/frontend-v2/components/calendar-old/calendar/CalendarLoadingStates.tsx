'use client'

import React from 'react'
import { CalendarDaysIcon, ClockIcon, SignalIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type { CalendarView } from '@/types/calendar'

// Enhanced loading state types
interface CalendarDetailedLoadingProps {
  stage: 'initializing' | 'fetching' | 'processing' | 'finalizing'
  message?: string
  progress?: number
  estimatedTime?: number
}

interface CalendarSmartLoadingProps {
  context: 'appointments' | 'calendar' | 'sync' | 'booking'
  variant?: 'compact' | 'detailed' | 'fullscreen'
  autoProgress?: boolean
  onComplete?: () => void
}

interface CalendarLoadingManagerProps {
  isLoading: boolean
  error?: string | null
  context: 'appointments' | 'calendar' | 'sync' | 'booking'
  children: React.ReactNode
  onRetry?: () => void
}

/**
 * Smart loading component with context-aware progression
 */
export function CalendarSmartLoading({ 
  context, 
  variant = 'detailed', 
  autoProgress = true, 
  onComplete 
}: CalendarSmartLoadingProps) {
  const [stage, setStage] = React.useState<'initializing' | 'fetching' | 'processing' | 'finalizing'>('initializing')
  const [progress, setProgress] = React.useState(0)
  const [startTime] = React.useState(Date.now())

  const getContextConfig = () => {
    switch (context) {
      case 'appointments':
        return {
          stages: [
            { stage: 'initializing', duration: 500, message: 'Setting up appointment view...' },
            { stage: 'fetching', duration: 1500, message: 'Loading your appointments...' },
            { stage: 'processing', duration: 800, message: 'Organizing schedule...' },
            { stage: 'finalizing', duration: 300, message: 'Ready!' }
          ],
          estimatedTime: 3.1
        }
      case 'calendar':
        return {
          stages: [
            { stage: 'initializing', duration: 400, message: 'Initializing calendar...' },
            { stage: 'fetching', duration: 1200, message: 'Loading calendar data...' },
            { stage: 'processing', duration: 600, message: 'Processing events...' },
            { stage: 'finalizing', duration: 200, message: 'Almost ready!' }
          ],
          estimatedTime: 2.4
        }
      case 'sync':
        return {
          stages: [
            { stage: 'initializing', duration: 300, message: 'Connecting to calendar...' },
            { stage: 'fetching', duration: 2000, message: 'Syncing with Google Calendar...' },
            { stage: 'processing', duration: 1000, message: 'Merging appointments...' },
            { stage: 'finalizing', duration: 500, message: 'Sync complete!' }
          ],
          estimatedTime: 3.8
        }
      case 'booking':
        return {
          stages: [
            { stage: 'initializing', duration: 200, message: 'Preparing booking form...' },
            { stage: 'fetching', duration: 800, message: 'Checking availability...' },
            { stage: 'processing', duration: 1200, message: 'Processing your booking...' },
            { stage: 'finalizing', duration: 400, message: 'Confirming appointment!' }
          ],
          estimatedTime: 2.6
        }
      default:
        return {
          stages: [
            { stage: 'initializing', duration: 500, message: 'Getting ready...' },
            { stage: 'fetching', duration: 1000, message: 'Loading data...' },
            { stage: 'processing', duration: 500, message: 'Processing...' },
            { stage: 'finalizing', duration: 200, message: 'Finishing up!' }
          ],
          estimatedTime: 2.2
        }
    }
  }

  const config = getContextConfig()
  const currentStageConfig = config.stages.find(s => s.stage === stage) || config.stages[0]

  React.useEffect(() => {
    if (!autoProgress) return

    const totalDuration = config.stages.reduce((sum, stage) => sum + stage.duration, 0)
    let elapsed = 0
    let currentStageIndex = 0

    const timer = setInterval(() => {
      elapsed += 50
      const progressPercent = Math.min((elapsed / totalDuration) * 100, 100)
      setProgress(progressPercent)

      // Check if we should move to next stage
      let stageStartTime = 0
      for (let i = 0; i < currentStageIndex; i++) {
        stageStartTime += config.stages[i].duration
      }
      
      if (elapsed >= stageStartTime + config.stages[currentStageIndex].duration) {
        currentStageIndex = Math.min(currentStageIndex + 1, config.stages.length - 1)
        setStage(config.stages[currentStageIndex].stage as any)
      }

      // Complete loading
      if (elapsed >= totalDuration) {
        clearInterval(timer)
        setTimeout(() => {
          if (onComplete) onComplete()
        }, 200)
      }
    }, 50)

    return () => clearInterval(timer)
  }, [autoProgress, config, onComplete])

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-4">
        <div className="animate-spin">
          <CalendarDaysIcon className="w-5 h-5 text-primary-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {currentStageConfig.message}
          </p>
          {autoProgress && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-1">
              <div 
                className="bg-primary-600 h-1 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'fullscreen') {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50">
        <CalendarDetailedLoading
          stage={stage}
          message={currentStageConfig.message}
          progress={progress}
          estimatedTime={config.estimatedTime}
        />
      </div>
    )
  }

  return (
    <CalendarDetailedLoading
      stage={stage}
      message={currentStageConfig.message}
      progress={progress}
      estimatedTime={config.estimatedTime}
    />
  )
}

/**
 * Complete loading manager that handles loading, error, and success states
 */
export function CalendarLoadingManager({
  isLoading,
  error,
  context,
  children,
  onRetry
}: CalendarLoadingManagerProps) {
  if (error) {
    return (
      <CalendarErrorState
        error={error}
        onRetry={onRetry}
        context={context}
      />
    )
  }

  if (isLoading) {
    return (
      <CalendarSmartLoading
        context={context}
        variant="detailed"
        autoProgress={true}
      />
    )
  }

  return <>{children}</>
}

interface CalendarSkeletonProps {
  view: CalendarView
  showStats?: boolean
}

/**
 * Detailed loading state with stage tracking and estimated time
 */
export function CalendarDetailedLoading({ 
  stage = 'initializing', 
  message, 
  progress, 
  estimatedTime 
}: CalendarDetailedLoadingProps) {
  const getStageConfig = (stage: string) => {
    switch (stage) {
      case 'initializing':
        return {
          icon: '🔄',
          message: message || 'Initializing calendar...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800'
        }
      case 'fetching':
        return {
          icon: '📅',
          message: message || 'Fetching appointments...',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50 dark:bg-purple-900/20',
          borderColor: 'border-purple-200 dark:border-purple-800'
        }
      case 'processing':
        return {
          icon: '⚙️',
          message: message || 'Processing data...',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          borderColor: 'border-orange-200 dark:border-orange-800'
        }
      case 'finalizing':
        return {
          icon: '✨',
          message: message || 'Finalizing calendar...',
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800'
        }
      default:
        return {
          icon: '🔄',
          message: message || 'Loading...',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800'
        }
    }
  }

  const config = getStageConfig(stage)
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      <div className="relative mb-6">
        {/* Stage-specific icon */}
        <div className="text-4xl mb-2">{config.icon}</div>
        
        {/* Animated progress ring */}
        <div className="relative">
          <div className="animate-spin">
            <CalendarDaysIcon className={`w-8 h-8 ${config.color}`} />
          </div>
          
          {progress !== undefined && (
            <div className="absolute -inset-3">
              <svg className="w-14 h-14 transform -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="22"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="22"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - progress / 100)}`}
                  className={`${config.color} transition-all duration-500`}
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      <div className="text-center space-y-2">
        <h3 className={`text-lg font-semibold ${config.color}`}>
          {config.message}
        </h3>
        
        {progress !== undefined && (
          <div className="flex items-center justify-center gap-2">
            <span className={`text-sm font-medium ${config.color}`}>
              {Math.round(progress)}%
            </span>
            <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ease-out ${config.color.replace('text-', 'bg-')}`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {estimatedTime && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Estimated time: {formatTime(estimatedTime)}
          </p>
        )}
      </div>
    </div>
  )
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
  showSteps?: boolean
  currentStep?: string
  estimatedTime?: number
  stage?: 'initializing' | 'fetching' | 'processing' | 'finalizing'
}

/**
 * Animated progress bar component
 */
export function CalendarProgressBar({ progress, className = '' }: { progress: number; className?: string }) {
  return (
    <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden ${className}`}>
      <div 
        className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500 ease-out relative"
        style={{ width: `${progress}%` }}
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
      </div>
    </div>
  )
}

/**
 * Loading state with progress indicator and detailed feedback
 */
export function CalendarLoading({ message = 'Loading calendar...', progress, showSteps = false, currentStep }: CalendarLoadingProps) {
  const getStageFromProgress = (progress?: number) => {
    if (progress === undefined) return 'initializing'
    if (progress < 25) return 'initializing'
    if (progress < 50) return 'fetching'
    if (progress < 75) return 'processing'
    return 'finalizing'
  }

  const getStageMessage = (stage: string) => {
    switch (stage) {
      case 'initializing': return 'Setting up calendar...'
      case 'fetching': return 'Fetching appointments...'
      case 'processing': return 'Processing data...'
      case 'finalizing': return 'Almost ready!'
      default: return 'Loading...'
    }
  }

  const currentStage = getStageFromProgress(progress)
  const stageMessage = currentStep || getStageMessage(currentStage)

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative mb-6">
        {/* Animated loading dots */}
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
        </div>
        
        {/* Enhanced spinning calendar icon */}
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

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 font-medium">
        {message}
      </p>

      {progress !== undefined && (
        <div className="w-full max-w-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-500">
              {Math.round(progress)}% complete
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-600">
              {stageMessage}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {/* Loading steps indicator */}
      {showSteps && (
        <div className="mt-4 flex items-center space-x-2">
          {['initializing', 'fetching', 'processing', 'finalizing'].map((stage, index) => {
            const isActive = currentStage === stage
            const isCompleted = ['initializing', 'fetching', 'processing', 'finalizing'].indexOf(currentStage) > index
            
            return (
              <div key={stage} className="flex items-center">
                <div className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-green-500 border-green-500' 
                    : isActive 
                      ? 'bg-primary-600 border-primary-600 animate-pulse' 
                      : 'bg-gray-200 border-gray-300 dark:bg-gray-700 dark:border-gray-600'
                }`}>
                  {isCompleted && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
                {index < 3 && (
                  <div className={`w-8 h-0.5 mx-1 transition-all duration-300 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      )}
      
      {/* Loading tips */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {progress === undefined ? 'Setting up your calendar...' : stageMessage}
        </p>
      </div>
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
  const [isRetrying, setIsRetrying] = React.useState(false)
  
  const handleRetry = async () => {
    if (onRetry) {
      setIsRetrying(true)
      try {
        await onRetry()
      } finally {
        setIsRetrying(false)
      }
    }
  }
  
  const getErrorIcon = () => {
    if (error.includes('network') || error.includes('connection')) {
      return '🌐'
    } else if (error.includes('timeout')) {
      return '⏱️'
    } else if (error.includes('permission')) {
      return '🔒'
    } else {
      return '❌'
    }
  }
  
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-6 mb-4">
        <div className="text-2xl mb-2">{getErrorIcon()}</div>
        <CalendarDaysIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
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
      
      {/* Offline indicator */}
      {!navigator.onLine && (
        <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">You're currently offline</span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {onRetry && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRetrying ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Retrying...
              </>
            ) : (
              <>
                <ClockIcon className="w-4 h-4" />
                Try Again
              </>
            )}
          </button>
        )}
        
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <CalendarDaysIcon className="w-4 h-4" />
          Reload Page
        </button>
      </div>
      
      {/* Help text */}
      <div className="mt-6 text-xs text-gray-400 dark:text-gray-500">
        <p>If the problem persists, please check your internet connection</p>
        <p>or contact support if you need assistance.</p>
      </div>
    </div>
  )
}