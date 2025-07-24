'use client'

import React from 'react'
import { CheckCircle, Circle } from 'lucide-react'

interface ProgressStep {
  id: string
  label: string
  description?: string
  completed: boolean
  current: boolean
}

interface ProgressIndicatorProps {
  steps: ProgressStep[]
  className?: string
  variant?: 'linear' | 'circular'
  showLabels?: boolean
  compact?: boolean
}

export function ProgressIndicator({ 
  steps, 
  className = '', 
  variant = 'linear',
  showLabels = true,
  compact = false
}: ProgressIndicatorProps) {
  const completedSteps = steps.filter(step => step.completed).length
  const currentStepIndex = steps.findIndex(step => step.current)
  const progressPercentage = (completedSteps / steps.length) * 100

  if (variant === 'circular') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="relative w-16 h-16">
          {/* Background circle */}
          <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress circle */}
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={176}
              strokeDashoffset={176 - (176 * progressPercentage) / 100}
              className="text-blue-500 transition-all duration-500 ease-out"
            />
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-bold text-gray-900 dark:text-white">
                {Math.round(progressPercentage)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {completedSteps}/{steps.length}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Progress bar */}
      <div className="relative">
        {/* Background line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700" />
        
        {/* Progress line with animation */}
        <div 
          className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700 ease-out"
          style={{ 
            width: `${currentStepIndex >= 0 ? ((currentStepIndex) / (steps.length - 1)) * 100 : 0}%` 
          }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isCompleted = step.completed
            const isCurrent = step.current
            const isUpcoming = !isCompleted && !isCurrent
            
            return (
              <div key={step.id} className="flex flex-col items-center group">
                {/* Step circle with enhanced animations */}
                <div className={`
                  relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium 
                  transition-all duration-300 ease-out transform
                  ${isCompleted 
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg scale-110 animate-in zoom-in-50' 
                    : isCurrent
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md ring-4 ring-blue-100 dark:ring-blue-900/50 scale-110 animate-pulse'
                    : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:scale-105'
                  }
                  ${!compact && 'group-hover:scale-110'}
                `}>
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : isCurrent ? (
                    <div className="w-3 h-3 bg-white rounded-full animate-ping" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                  
                  {/* Pulse effect for current step */}
                  {isCurrent && (
                    <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-20" />
                  )}
                </div>
                
                {/* Step info */}
                {showLabels && !compact && (
                  <div className="mt-3 text-center max-w-[120px]">
                    <div className={`text-sm font-medium transition-colors duration-200 ${
                      isCurrent 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : isCompleted
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {step.label}
                    </div>
                    {step.description && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">
                        {step.description}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Compact labels */}
                {showLabels && compact && (
                  <div className="mt-2 text-center">
                    <div className={`text-xs font-medium transition-colors duration-200 ${
                      isCurrent 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : isCompleted
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {step.label}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Progress summary */}
      {!compact && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              {completedSteps} completed
            </div>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
              1 in progress
            </div>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full mr-2" />
              {steps.length - completedSteps - 1} remaining
            </div>
          </div>
          
          <div className="text-gray-500 dark:text-gray-400">
            {Math.round(progressPercentage)}% Complete
          </div>
        </div>
      )}
    </div>
  )
}

// Animated progress bar component for inline use
interface AnimatedProgressBarProps {
  progress: number
  className?: string
  showPercentage?: boolean
  color?: 'blue' | 'green' | 'purple' | 'indigo'
}

export function AnimatedProgressBar({ 
  progress, 
  className = '', 
  showPercentage = true,
  color = 'blue'
}: AnimatedProgressBarProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    indigo: 'from-indigo-500 to-indigo-600',
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Progress
        </span>
        {showPercentage && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {Math.round(progress)}%
          </span>
        )}
      </div>
      
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 bg-gradient-to-r ${colorClasses[color]} rounded-full transition-all duration-700 ease-out transform origin-left`}
          style={{ 
            width: `${Math.min(100, Math.max(0, progress))}%`,
            transform: `scaleX(${Math.min(100, Math.max(0, progress)) / 100})`,
            transformOrigin: 'left'
          }}
        >
          {/* Animated shine effect */}
          <div className="h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
        </div>
      </div>
    </div>
  )
}

// Micro progress indicator for inline use
interface MicroProgressProps {
  current: number
  total: number
  className?: string
}

export function MicroProgress({ current, total, className = '' }: MicroProgressProps) {
  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={`h-1 rounded-full transition-all duration-300 ${
            index < current
              ? 'w-4 bg-blue-500'
              : index === current
              ? 'w-6 bg-blue-400 animate-pulse'
              : 'w-2 bg-gray-300 dark:bg-gray-600'
          }`}
        />
      ))}
    </div>
  )
}