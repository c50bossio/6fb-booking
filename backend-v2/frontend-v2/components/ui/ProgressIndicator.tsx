'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const progressVariants = cva(
  'relative overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 transition-all duration-300 ease-out',
  {
    variants: {
      size: {
        sm: 'h-1.5',
        md: 'h-2',
        lg: 'h-3',
        xl: 'h-4',
      },
      variant: {
        default: 'bg-gray-200 dark:bg-gray-700',
        primary: 'bg-primary-100 dark:bg-primary-900/20',
        success: 'bg-green-100 dark:bg-green-900/20',
        warning: 'bg-yellow-100 dark:bg-yellow-900/20',
        error: 'bg-red-100 dark:bg-red-900/20',
      },
      showGlow: {
        true: 'shadow-sm',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
      showGlow: false,
    },
  }
)

const progressBarVariants = cva(
  'h-full rounded-full transition-all duration-500 ease-out transform-gpu will-change-transform',
  {
    variants: {
      variant: {
        default: 'bg-primary-600',
        primary: 'bg-primary-600',
        success: 'bg-green-600',
        warning: 'bg-yellow-600',
        error: 'bg-red-600',
      },
      animated: {
        true: 'relative overflow-hidden',
        false: '',
      },
      showGlow: {
        true: 'shadow-md',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      animated: false,
      showGlow: false,
    },
  }
)

export interface ProgressIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants> {
  value: number
  max?: number
  showValue?: boolean
  showGlow?: boolean
  animated?: boolean
  label?: string
  description?: string
}

const ProgressIndicator = React.forwardRef<HTMLDivElement, ProgressIndicatorProps>(
  ({
    className,
    value,
    max = 100,
    showValue = false,
    showGlow = false,
    animated = false,
    label,
    description,
    size,
    variant,
    ...props
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
    
    return (
      <div ref={ref} className="w-full" {...props}>
        {/* Label and value */}
        {(label || showValue) && (
          <div className="flex items-center justify-between mb-2">
            {label && (
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
              </span>
            )}
            {showValue && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {Math.round(percentage)}%
              </span>
            )}
          </div>
        )}
        
        {/* Progress bar */}
        <div
          className={cn(progressVariants({ size, variant, showGlow }), className)}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          <div
            className={cn(
              progressBarVariants({ variant, animated, showGlow }),
              animated && 'after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent after:translate-x-[-100%] after:animate-shimmer'
            )}
            style={{ width: `${percentage}%` }}
          >
            {/* Shimmer effect for animated variant */}
            {animated && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            )}
          </div>
        </div>
        
        {/* Description */}
        {description && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
    )
  }
)

ProgressIndicator.displayName = 'ProgressIndicator'

// Circular progress variant
export interface CircularProgressProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  showValue?: boolean
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error'
  className?: string
  children?: React.ReactNode
}

export const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  ({
    value,
    max = 100,
    size = 64,
    strokeWidth = 6,
    showValue = true,
    variant = 'primary',
    className,
    children
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const strokeDashoffset = circumference - (percentage / 100) * circumference
    
    const colors = {
      default: 'stroke-primary-600',
      primary: 'stroke-primary-600',
      success: 'stroke-green-600',
      warning: 'stroke-yellow-600',
      error: 'stroke-red-600',
    }
    
    return (
      <div
        ref={ref}
        className={cn('relative inline-flex items-center justify-center', className)}
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={cn(
              colors[variant],
              'transition-all duration-500 ease-out transform-gpu'
            )}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          {children || (showValue && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {Math.round(percentage)}%
            </span>
          ))}
        </div>
      </div>
    )
  }
)

CircularProgress.displayName = 'CircularProgress'

// Multi-step progress indicator
export interface MultiStepProgressProps {
  steps: Array<{
    id: string
    title: string
    description?: string
    completed?: boolean
    current?: boolean
    optional?: boolean
  }>
  orientation?: 'horizontal' | 'vertical'
  showConnectors?: boolean
  className?: string
}

export const MultiStepProgress = React.forwardRef<HTMLDivElement, MultiStepProgressProps>(
  ({
    steps,
    orientation = 'horizontal',
    showConnectors = true,
    className
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          orientation === 'horizontal' ? 'flex-row items-center' : 'flex-col',
          className
        )}
      >
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {/* Step indicator */}
            <div
              className={cn(
                'flex items-center',
                orientation === 'vertical' && 'flex-col text-center'
              )}
            >
              {/* Step circle */}
              <div
                className={cn(
                  'relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200',
                  step.completed
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : step.current
                    ? 'bg-white border-primary-600 text-primary-600 shadow-md'
                    : 'bg-gray-100 border-gray-300 text-gray-500 dark:bg-gray-800 dark:border-gray-600'
                )}
              >
                {step.completed ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              
              {/* Step content */}
              <div className={cn(
                'ml-3',
                orientation === 'vertical' && 'ml-0 mt-2'
              )}>
                <p className={cn(
                  'text-sm font-medium',
                  step.completed || step.current
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                )}>
                  {step.title}
                  {step.optional && (
                    <span className="ml-1 text-xs text-gray-400">(optional)</span>
                  )}
                </p>
                {step.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
            
            {/* Connector */}
            {showConnectors && index < steps.length - 1 && (
              <div
                className={cn(
                  'bg-gray-300 dark:bg-gray-600',
                  orientation === 'horizontal'
                    ? 'h-px flex-1 mx-4'
                    : 'w-px h-8 mx-auto my-2'
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    )
  }
)

MultiStepProgress.displayName = 'MultiStepProgress'

export { ProgressIndicator, progressVariants }