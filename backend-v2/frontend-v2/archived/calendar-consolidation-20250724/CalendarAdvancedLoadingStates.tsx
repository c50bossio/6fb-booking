'use client'

import React, { useState, useEffect } from 'react'
import { CalendarDaysIcon, ClockIcon, CloudArrowDownIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { CalendarProgressBar } from './CalendarLoadingStates'

interface LoadingStep {
  id: string
  label: string
  duration: number
  icon?: React.ReactNode
}

interface MultiStepLoadingProps {
  steps: LoadingStep[]
  onComplete?: () => void
  title?: string
  showProgress?: boolean
  showStepDetails?: boolean
}

/**
 * Multi-step loading component for complex operations
 */
export function MultiStepLoading({ 
  steps, 
  onComplete,
  title = 'Processing...',
  showProgress = true,
  showStepDetails = true 
}: MultiStepLoadingProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [overallProgress, setOverallProgress] = useState(0)
  const [stepProgress, setStepProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  const currentStep = steps[currentStepIndex]
  const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0)

  useEffect(() => {
    if (isComplete) return

    const stepStartTime = Date.now()
    const stepDuration = currentStep.duration

    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - stepStartTime
      const progress = Math.min((elapsed / stepDuration) * 100, 100)
      setStepProgress(progress)

      // Calculate overall progress
      const completedDuration = steps
        .slice(0, currentStepIndex)
        .reduce((sum, step) => sum + step.duration, 0)
      const totalProgress = ((completedDuration + (elapsed / stepDuration) * stepDuration) / totalDuration) * 100
      setOverallProgress(Math.min(totalProgress, 100))

      if (progress >= 100) {
        if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex(currentStepIndex + 1)
          setStepProgress(0)
        } else {
          setIsComplete(true)
          clearInterval(progressInterval)
          setTimeout(() => {
            onComplete?.()
          }, 500)
        }
      }
    }, 50)

    return () => clearInterval(progressInterval)
  }, [currentStepIndex, currentStep, steps, totalDuration, isComplete, onComplete])

  return (
    <div className="flex flex-col items-center justify-center py-8 px-6">
      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        {title}
      </h3>

      {/* Current step icon and label */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative mb-4">
          {currentStep.icon || (
            <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <CalendarDaysIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
          )}
          
          {/* Progress ring around icon */}
          <svg className="absolute inset-0 w-16 h-16 transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - stepProgress / 100)}`}
              className="text-primary-600 dark:text-primary-400 transition-all duration-300"
            />
          </svg>
        </div>

        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {currentStep.label}
        </p>
      </div>

      {/* Progress bars */}
      {showProgress && (
        <div className="w-full max-w-xs space-y-3">
          {/* Step progress */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Step {currentStepIndex + 1} of {steps.length}</span>
              <span>{Math.round(stepProgress)}%</span>
            </div>
            <CalendarProgressBar progress={stepProgress} className="h-1" />
          </div>

          {/* Overall progress */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Overall Progress</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            <CalendarProgressBar progress={overallProgress} />
          </div>
        </div>
      )}

      {/* Step details */}
      {showStepDetails && (
        <div className="mt-6 flex items-center gap-2">
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex
            const isCurrent = index === currentStepIndex
            const isPending = index > currentStepIndex

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    isCompleted
                      ? 'bg-green-500'
                      : isCurrent
                      ? 'bg-primary-600 dark:bg-primary-400 animate-pulse'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  title={step.label}
                />
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-1 transition-all duration-300 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Completion message */}
      {isComplete && (
        <div className="mt-6 flex items-center gap-2 text-green-600 dark:text-green-400 animate-bounce-in">
          <CheckCircleIcon className="w-5 h-5" />
          <span className="text-sm font-medium">Complete!</span>
        </div>
      )}
    </div>
  )
}

interface RetryableLoadingProps {
  message?: string
  error?: string | null
  onRetry?: () => void
  maxRetries?: number
  retryDelay?: number
  context?: string
}

/**
 * Loading component with automatic retry capability
 */
export function RetryableLoading({
  message = 'Loading...',
  error,
  onRetry,
  maxRetries = 3,
  retryDelay = 2000,
  context
}: RetryableLoadingProps) {
  const [retryCount, setRetryCount] = useState(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (error && onRetry && retryCount < maxRetries) {
      setCountdown(retryDelay / 1000)
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      const retryTimeout = setTimeout(() => {
        setIsRetrying(true)
        setRetryCount(retryCount + 1)
        onRetry()
        setTimeout(() => setIsRetrying(false), 500)
      }, retryDelay)

      return () => {
        clearInterval(countdownInterval)
        clearTimeout(retryTimeout)
      }
    }
  }, [error, onRetry, retryCount, maxRetries, retryDelay])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-6">
        <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-4 mb-4">
          <CloudArrowDownIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Loading Failed
        </h3>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center max-w-sm">
          {error}
        </p>

        {retryCount < maxRetries && onRetry && (
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Retrying in {countdown} seconds... (Attempt {retryCount + 1} of {maxRetries})
            </p>
            <div className="w-32 mx-auto">
              <CalendarProgressBar 
                progress={(1 - countdown / (retryDelay / 1000)) * 100} 
                className="h-1"
              />
            </div>
          </div>
        )}

        {retryCount >= maxRetries && (
          <button
            onClick={() => {
              setRetryCount(0)
              onRetry?.()
            }}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-8 px-6">
      <div className="relative mb-4">
        <div className={`animate-spin ${isRetrying ? 'animate-pulse' : ''}`}>
          <CalendarDaysIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
        </div>
      </div>
      
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {isRetrying ? `Retrying... (Attempt ${retryCount})` : message}
      </p>
      
      {context && (
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          {context}
        </p>
      )}
    </div>
  )
}

interface LoadingWithStatsProps {
  itemsLoaded: number
  totalItems?: number
  itemType?: string
  message?: string
  showPercentage?: boolean
}

/**
 * Loading component that shows progress statistics
 */
export function LoadingWithStats({
  itemsLoaded,
  totalItems,
  itemType = 'items',
  message = 'Loading',
  showPercentage = true
}: LoadingWithStatsProps) {
  const progress = totalItems ? (itemsLoaded / totalItems) * 100 : 0
  
  return (
    <div className="flex flex-col items-center justify-center py-8 px-6">
      <div className="relative mb-4">
        <ClockIcon className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-pulse" />
        
        {/* Items counter */}
        <div className="absolute -bottom-1 -right-1 bg-primary-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          {itemsLoaded}
        </div>
      </div>
      
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {message} {itemType}...
      </h3>
      
      <div className="text-center">
        <p className="text-lg font-bold text-gray-900 dark:text-white">
          {itemsLoaded}{totalItems ? ` / ${totalItems}` : ''}
        </p>
        
        {showPercentage && totalItems && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {Math.round(progress)}% complete
          </p>
        )}
      </div>
      
      {totalItems && (
        <div className="w-full max-w-xs mt-4">
          <CalendarProgressBar progress={progress} />
        </div>
      )}
    </div>
  )
}

/**
 * Inline loading indicator for small spaces
 */
export function InlineLoading({ size = 'sm' }: { size?: 'xs' | 'sm' | 'md' }) {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5'
  }
  
  return (
    <div className="inline-flex items-center gap-2">
      <div className={`${sizeClasses[size]} animate-spin`}>
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24">
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
      </div>
      <span className="text-sm text-gray-600 dark:text-gray-400">Loading...</span>
    </div>
  )
}