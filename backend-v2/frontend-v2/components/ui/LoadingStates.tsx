'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

// Loading spinner variants
const spinnerVariants = cva(
  'inline-block border-2 border-current border-t-transparent rounded-full animate-spin',
  {
    variants: {
      size: {
        xs: 'w-3 h-3',
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
        xl: 'w-12 h-12',
      },
      variant: {
        default: 'text-primary-500',
        primary: 'text-primary-500',
        secondary: 'text-secondary-500',
        white: 'text-white',
        current: 'text-current',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  }
)

// Loading dots variants
const dotsVariants = cva(
  'inline-flex gap-1',
  {
    variants: {
      size: {
        xs: 'gap-0.5',
        sm: 'gap-1',
        md: 'gap-1.5',
        lg: 'gap-2',
        xl: 'gap-3',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
)

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string
}

export interface LoadingDotsProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dotsVariants> {
  count?: number
  color?: string
}

export interface LoadingPulseProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: string
  size?: 'sm' | 'md' | 'lg'
}

export interface LoadingBarProps extends React.HTMLAttributes<HTMLDivElement> {
  progress?: number
  indeterminate?: boolean
  height?: 'xs' | 'sm' | 'md' | 'lg'
  color?: string
}

// Loading Spinner Component
export const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size, variant, label, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-center', className)}
        role="status"
        aria-label={label || 'Loading'}
        {...props}
      >
        <div className={spinnerVariants({ size, variant })} />
        {label && (
          <span className="ml-2 text-sm text-ios-gray-600 dark:text-ios-gray-400">
            {label}
          </span>
        )}
      </div>
    )
  }
)

LoadingSpinner.displayName = 'LoadingSpinner'

// Loading Dots Component
export const LoadingDots = React.forwardRef<HTMLDivElement, LoadingDotsProps>(
  ({ className, size, count = 3, color = 'currentColor', ...props }, ref) => {
    const dotSizeMap = {
      xs: 'w-1 h-1',
      sm: 'w-1.5 h-1.5',
      md: 'w-2 h-2',
      lg: 'w-3 h-3',
      xl: 'w-4 h-4',
    }

    return (
      <div
        ref={ref}
        className={cn(dotsVariants({ size }), className)}
        role="status"
        aria-label="Loading"
        {...props}
      >
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'rounded-full animate-pulse',
              dotSizeMap[size || 'md']
            )}
            style={{
              backgroundColor: color,
              animationDelay: `${index * 0.15}s`,
              animationDuration: '1s',
            }}
          />
        ))}
      </div>
    )
  }
)

LoadingDots.displayName = 'LoadingDots'

// Loading Pulse Component
export const LoadingPulse = React.forwardRef<HTMLDivElement, LoadingPulseProps>(
  ({ className, color = 'rgb(var(--color-primary))', size = 'md', ...props }, ref) => {
    const sizeMap = {
      sm: 'w-8 h-8',
      md: 'w-12 h-12',
      lg: 'w-16 h-16',
    }

    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-center', className)}
        role="status"
        aria-label="Loading"
        {...props}
      >
        <div
          className={cn(
            'rounded-full animate-ping',
            sizeMap[size]
          )}
          style={{
            backgroundColor: color,
          }}
        />
      </div>
    )
  }
)

LoadingPulse.displayName = 'LoadingPulse'

// Loading Bar Component
export const LoadingBar = React.forwardRef<HTMLDivElement, LoadingBarProps>(
  ({ 
    className, 
    progress = 0, 
    indeterminate = false, 
    height = 'sm', 
    color = 'rgb(var(--color-primary))',
    ...props 
  }, ref) => {
    const heightMap = {
      xs: 'h-1',
      sm: 'h-2',
      md: 'h-3',
      lg: 'h-4',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'w-full bg-ios-gray-200 dark:bg-ios-gray-700 rounded-full overflow-hidden',
          heightMap[height],
          className
        )}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : progress}
        aria-valuemin={0}
        aria-valuemax={100}
        {...props}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out',
            indeterminate ? 'animate-indeterminate' : ''
          )}
          style={{
            backgroundColor: color,
            width: indeterminate ? '30%' : `${Math.min(100, Math.max(0, progress))}%`,
            transform: indeterminate ? 'translateX(-100%)' : 'none',
          }}
        />
      </div>
    )
  }
)

LoadingBar.displayName = 'LoadingBar'

// Compound Loading Component with different states
export interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'spinner' | 'dots' | 'pulse' | 'bar' | 'skeleton'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  text?: string
  overlay?: boolean
  progress?: number
  indeterminate?: boolean
}

export const Loading = React.forwardRef<HTMLDivElement, LoadingProps>(
  ({ 
    className, 
    variant = 'spinner', 
    size = 'md', 
    text, 
    overlay = false,
    progress,
    indeterminate = false,
    ...props 
  }, ref) => {
    const renderLoader = () => {
      // Map size to compatible values for different components
      const mappedSize = size === 'xs' ? 'sm' : size === 'xl' ? 'lg' : size
      
      switch (variant) {
        case 'dots':
          return <LoadingDots size={size} />
        case 'pulse':
          return <LoadingPulse size={mappedSize as 'sm' | 'md' | 'lg'} />
        case 'bar':
          return <LoadingBar progress={progress} indeterminate={indeterminate} />
        case 'spinner':
        default:
          return <LoadingSpinner size={size} label={text} />
      }
    }

    const content = (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center gap-3',
          overlay && 'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm',
          className
        )}
        {...props}
      >
        {renderLoader()}
        {text && variant !== 'spinner' && (
          <span className="text-sm text-ios-gray-600 dark:text-ios-gray-400 font-medium">
            {text}
          </span>
        )}
      </div>
    )

    return content
  }
)

Loading.displayName = 'Loading'

// Page Loading Component
export const PageLoading = ({ 
  title = 'Loading...', 
  subtitle,
  className,
  ...props 
}: {
  title?: string
  subtitle?: string
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      'flex flex-col items-center justify-center min-h-[400px] space-y-4',
      className
    )}
    {...props}
  >
    <LoadingSpinner size="lg" />
    <div className="text-center space-y-2">
      <h3 className="text-lg font-semibold text-ios-gray-900 dark:text-ios-gray-100">
        {title}
      </h3>
      {subtitle && (
        <p className="text-sm text-ios-gray-600 dark:text-ios-gray-400">
          {subtitle}
        </p>
      )}
    </div>
  </div>
)

// Button Loading State
export const ButtonLoading = ({ 
  size = 'sm', 
  className,
  ...props 
}: {
  size?: 'xs' | 'sm' | 'md'
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) => (
  <LoadingSpinner 
    size={size} 
    variant="white" 
    className={cn('mr-2', className)}
    {...props}
  />
)

// Inline Loading Component
export const InlineLoading = ({ 
  text = 'Loading...', 
  className,
  ...props 
}: {
  text?: string
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn('flex items-center space-x-2', className)}
    {...props}
  >
    <LoadingSpinner size="sm" />
    <span className="text-sm text-ios-gray-600 dark:text-ios-gray-400">
      {text}
    </span>
  </div>
)

// Card Loading State
export const CardLoading = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      'bg-white dark:bg-dark-surface-200 rounded-lg border border-ios-gray-200 dark:border-ios-gray-700 p-6',
      className
    )}
    {...props}
  >
    <div className="animate-pulse space-y-4">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-ios-gray-200 dark:bg-ios-gray-700 rounded-full" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-ios-gray-200 dark:bg-ios-gray-700 rounded w-3/4" />
          <div className="h-3 bg-ios-gray-200 dark:bg-ios-gray-700 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-ios-gray-200 dark:bg-ios-gray-700 rounded" />
        <div className="h-4 bg-ios-gray-200 dark:bg-ios-gray-700 rounded" />
        <div className="h-4 bg-ios-gray-200 dark:bg-ios-gray-700 rounded w-5/6" />
      </div>
    </div>
  </div>
)

// Export all components
export {
  spinnerVariants,
  dotsVariants,
}

// Export LoadingStates as a compound component
export const LoadingStates = {
  Loading,
  LoadingSpinner,
  LoadingDots,
  LoadingPulse,
  LoadingBar,
  PageLoading,
  ButtonLoading,
  InlineLoading,
  CardLoading
}

// CSS for indeterminate animation (add to globals.css)
const indeterminateCSS = `
@keyframes indeterminate {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(400%);
  }
}

.animate-indeterminate {
  animation: indeterminate 1.5s ease-in-out infinite;
}
`

// Add the CSS to the document head if not already present
if (typeof document !== 'undefined') {
  const styleId = 'loading-states-css'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = indeterminateCSS
    document.head.appendChild(style)
  }
}