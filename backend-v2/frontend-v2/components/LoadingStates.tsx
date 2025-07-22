'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

// ===============================
// UNIFIED LOADING STATES SYSTEM
// ===============================
// This file consolidates all loading components from both ui/LoadingStates.tsx 
// and components/LoadingStates.tsx into a single, consistent system.
// All components use CVA for variants and consistent sizing with layout shift prevention.
// Enhanced with Six Figure Barber branded components for premium loading experiences.

// Import branded components
import { BrandedSkeleton, SixFigureAvatarSkeleton, BarberProfileSkeleton, ServiceCardSkeleton, AppointmentCardSkeleton, AnalyticsCardSkeleton, DashboardStatsSkeleton, SixFigureCalendarSkeleton, PremiumLoadingOverlay } from './ui/BrandedSkeletons'
import { BrandedSpinner, SixFigureSVGSpinner, BarberPoleSpinner, PremiumDotsSpinner, PulseRingSpinner, LoadingButton as BrandedLoadingButton } from './ui/BrandedSpinners'

// ===================
// CORE LOADING VARIANTS
// ===================

// Loading spinner variants - Enhanced version from ui/LoadingStates
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

// ===================
// CORE INTERFACES
// ===================

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

// ===================
// BASIC LOADING COMPONENTS
// ===================

// Enhanced Loading Spinner with both SVG and CSS variants
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

// ===================
// COMPOUND LOADING COMPONENTS
// ===================

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

// ===================
// PAGE-LEVEL LOADING COMPONENTS
// ===================

// Enhanced Page Loading Component with consistent styling
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

// ===================
// BUTTON LOADING COMPONENTS
// ===================

// Enhanced Button Loading State
export const LocalLoadingButton = ({
  loading,
  children,
  loadingText = 'Loading...',
  disabled,
  className = '',
  ...props
}: {
  loading: boolean
  children: React.ReactNode
  loadingText?: string
  disabled?: boolean
  className?: string
  [key: string]: any
}) => {
  return (
    <button
      {...props}
      disabled={loading || disabled}
      className={cn(
        'relative inline-flex items-center justify-center',
        loading || disabled ? 'cursor-not-allowed opacity-50' : '',
        className
      )}
    >
      {loading && (
        <LoadingSpinner size="sm" variant="current" className="mr-2" />
      )}
      {loading ? loadingText : children}
    </button>
  )
}

// Button Loading State (for use within button components)
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

// ===================
// SKELETON LOADING COMPONENTS
// ===================

// Enhanced Loading Skeleton
export const LoadingSkeleton = ({ 
  lines = 3, 
  className = '',
  showAvatar = false 
}: { 
  lines?: number
  className?: string
  showAvatar?: boolean 
}) => {
  return (
    <div className={cn('animate-pulse', className)}>
      <div className="flex items-start space-x-4">
        {showAvatar && (
          <div className="rounded-full bg-ios-gray-200 dark:bg-ios-gray-700 h-10 w-10" />
        )}
        <div className="flex-1 space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-4 bg-ios-gray-200 dark:bg-ios-gray-700 rounded',
                i === lines - 1 ? 'w-3/4' : 'w-full'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

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

// Enhanced Table Loading Skeleton
export const TableSkeleton = ({ 
  rows = 5, 
  columns = 4, 
  className = '' 
}: { 
  rows?: number
  columns?: number
  className?: string 
}) => {
  return (
    <div className={cn('animate-pulse', className)}>
      <div className="space-y-3">
        {/* Header */}
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <div key={`header-${i}`} className="h-4 bg-ios-gray-300 dark:bg-ios-gray-600 rounded" />
          ))}
        </div>
        
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={`cell-${rowIndex}-${colIndex}`} className="h-4 bg-ios-gray-200 dark:bg-ios-gray-700 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Enhanced Table Loading State
export const TableLoading = ({ 
  rows = 5, 
  columns = 4, 
  className,
  ...props 
}: {
  rows?: number
  columns?: number
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn(
      'bg-white dark:bg-dark-surface-200 rounded-lg border border-ios-gray-200 dark:border-ios-gray-700 overflow-hidden',
      className
    )}
    {...props}
  >
    <div className="animate-pulse">
      {/* Header */}
      <div className="border-b border-ios-gray-200 dark:border-ios-gray-700 p-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <div key={`header-${i}`} className="h-4 bg-ios-gray-200 dark:bg-ios-gray-700 rounded w-3/4" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="border-b border-ios-gray-100 dark:border-ios-gray-800 p-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div 
                key={`cell-${rowIndex}-${colIndex}`} 
                className={cn(
                  'h-3 bg-ios-gray-200 dark:bg-ios-gray-700 rounded',
                  colIndex === 0 ? 'w-full' : 'w-3/4'
                )}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
)

// Enhanced Calendar Loading Skeleton
export const CalendarSkeleton = ({ className = '' }: { className?: string }) => {
  return (
    <div className={cn(
      'animate-pulse bg-white dark:bg-dark-surface-200 rounded-lg shadow-sm border border-ios-gray-200 dark:border-ios-gray-700 p-6',
      className
    )}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="h-6 bg-ios-gray-200 dark:bg-ios-gray-700 rounded w-32" />
          <div className="flex space-x-2">
            <div className="h-8 w-8 bg-ios-gray-200 dark:bg-ios-gray-700 rounded" />
            <div className="h-8 w-8 bg-ios-gray-200 dark:bg-ios-gray-700 rounded" />
          </div>
        </div>
        
        {/* Days grid */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-10 bg-ios-gray-100 dark:bg-ios-gray-800 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}

// Enhanced Time Slots Loading Skeleton (consolidating both versions)
export const TimeSlotsLoadingSkeleton = ({ 
  slots = 8, 
  className = '',
  ...props 
}: {
  slots?: number
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={cn(
      'animate-pulse bg-white dark:bg-dark-surface-200 rounded-lg shadow-sm border border-ios-gray-200 dark:border-ios-gray-700 p-6',
      className
    )} {...props}>
      <div className="space-y-4">
        {/* Header */}
        <div className="h-6 bg-ios-gray-200 dark:bg-ios-gray-700 rounded w-48" />
        
        {/* Time slots grid - Enhanced version */}
        <div className="space-y-4">
          {['Morning', 'Afternoon', 'Evening'].map((period, periodIndex) => (
            <div key={period} className="space-y-3">
              <div className="h-4 bg-ios-gray-200 dark:bg-ios-gray-700 rounded w-24" />
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {Array.from({ length: Math.max(4 + periodIndex, slots) }).map((_, i) => (
                  <div 
                    key={i} 
                    className="h-10 bg-ios-gray-100 dark:bg-ios-gray-800 rounded"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// List Loading State
export const ListLoading = ({ 
  items = 3, 
  className,
  ...props 
}: {
  items?: number
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn('space-y-4', className)}
    {...props}
  >
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="animate-pulse flex items-center space-x-4">
        <div className="w-12 h-12 bg-ios-gray-200 dark:bg-ios-gray-700 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-ios-gray-200 dark:bg-ios-gray-700 rounded w-2/3" />
          <div className="h-3 bg-ios-gray-200 dark:bg-ios-gray-700 rounded w-1/2" />
        </div>
        <div className="w-16 h-8 bg-ios-gray-200 dark:bg-ios-gray-700 rounded" />
      </div>
    ))}
  </div>
)

// Form Loading State
export const FormLoading = ({ 
  fields = 4, 
  className,
  ...props 
}: {
  fields?: number
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn('space-y-6', className)}
    {...props}
  >
    <div className="animate-pulse">
      <div className="h-6 bg-ios-gray-200 dark:bg-ios-gray-700 rounded w-1/3 mb-6" />
      
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2 mb-4">
          <div className="h-4 bg-ios-gray-200 dark:bg-ios-gray-700 rounded w-1/4" />
          <div className="h-10 bg-ios-gray-200 dark:bg-ios-gray-700 rounded w-full" />
        </div>
      ))}
      
      <div className="flex gap-3 mt-6">
        <div className="h-10 bg-ios-gray-200 dark:bg-ios-gray-700 rounded w-24" />
        <div className="h-10 bg-ios-gray-200 dark:bg-ios-gray-700 rounded w-20" />
      </div>
    </div>
  </div>
)

// ===================
// CONTEXTUAL LOADING COMPONENTS
// ===================

// Context-aware Loading Component
export const ContextualLoading = ({ 
  context,
  size = 'md',
  className,
  ...props 
}: {
  context: 'analytics' | 'booking' | 'calendar' | 'payments' | 'sync' | 'dashboard' | 'form' | 'search'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) => {
  const getContextConfig = () => {
    switch (context) {
      case 'analytics':
        return {
          text: 'Analyzing your data...',
          icon: '📊',
          variant: 'primary' as const
        }
      case 'booking':
        return {
          text: 'Processing your booking...',
          icon: '📅',
          variant: 'primary' as const
        }
      case 'calendar':
        return {
          text: 'Loading calendar...',
          icon: '🗓️',
          variant: 'primary' as const
        }
      case 'payments':
        return {
          text: 'Processing payment...',
          icon: '💳',
          variant: 'primary' as const
        }
      case 'sync':
        return {
          text: 'Syncing data...',
          icon: '🔄',
          variant: 'secondary' as const
        }
      case 'dashboard':
        return {
          text: 'Loading dashboard...',
          icon: '🏠',
          variant: 'primary' as const
        }
      case 'form':
        return {
          text: 'Submitting form...',
          icon: '📝',
          variant: 'primary' as const
        }
      case 'search':
        return {
          text: 'Searching...',
          icon: '🔍',
          variant: 'secondary' as const
        }
      default:
        return {
          text: 'Loading...',
          icon: '⏳',
          variant: 'primary' as const
        }
    }
  }

  const config = getContextConfig()
  
  return (
    <div 
      className={cn('flex flex-col items-center justify-center gap-3', className)}
      {...props}
    >
      <div className="text-2xl">{config.icon}</div>
      <LoadingSpinner size={size} variant={config.variant} label={config.text} />
    </div>
  )
}

// Analytics Specific Loading State
export const AnalyticsLoading = ({ 
  type = 'general', 
  className,
  ...props 
}: {
  type?: 'general' | 'revenue' | 'clients' | 'marketing' | 'reviews' | 'productivity'
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) => {
  const getAnalyticsConfig = () => {
    switch (type) {
      case 'revenue':
        return {
          icon: '💰',
          title: 'Loading Revenue Analytics',
          subtitle: 'Calculating your earnings and growth metrics...'
        }
      case 'clients':
        return {
          icon: '👥',
          title: 'Loading Client Analytics',
          subtitle: 'Analyzing client behavior and retention...'
        }
      case 'marketing':
        return {
          icon: '📈',
          title: 'Loading Marketing Analytics',
          subtitle: 'Processing campaign performance and ROI...'
        }
      case 'reviews':
        return {
          icon: '⭐',
          title: 'Loading Review Analytics',
          subtitle: 'Analyzing feedback and ratings...'
        }
      case 'productivity':
        return {
          icon: '⚡',
          title: 'Loading Productivity Analytics',
          subtitle: 'Calculating efficiency and utilization...'
        }
      default:
        return {
          icon: '📊',
          title: 'Loading Analytics',
          subtitle: 'Processing your business data...'
        }
    }
  }

  const config = getAnalyticsConfig()

  return (
    <div 
      className={cn('flex flex-col items-center justify-center py-12 px-6', className)}
      {...props}
    >
      <div className="text-4xl mb-4">{config.icon}</div>
      <LoadingSpinner size="lg" className="mb-4" />
      <h3 className="text-lg font-semibold text-ios-gray-900 dark:text-ios-gray-100 mb-2">
        {config.title}
      </h3>
      <p className="text-sm text-ios-gray-600 dark:text-ios-gray-400 text-center max-w-xs">
        {config.subtitle}
      </p>
    </div>
  )
}

// ===================
// ERROR HANDLING COMPONENTS  
// ===================

// Error display component with enhanced retry functionality
export function ErrorDisplay({ 
  error, 
  onRetry, 
  className = '',
  title = 'Something went wrong',
  showDetails = true,
  retryText = 'Try again',
  retryAttempts = 0,
  maxRetries = 3,
  suggestions = []
}: { 
  error: string | Error
  onRetry?: () => void
  className?: string
  title?: string
  showDetails?: boolean
  retryText?: string
  retryAttempts?: number
  maxRetries?: number
  suggestions?: string[]
}) {
  const [isRetrying, setIsRetrying] = React.useState(false)
  const errorMessage = error instanceof Error ? error.message : error
  const canRetry = onRetry && retryAttempts < maxRetries

  // Detect error type for better messaging
  const getErrorInfo = () => {
    const msg = errorMessage.toLowerCase()
    
    if (msg.includes('network') || msg.includes('fetch')) {
      return {
        title: 'Connection Error',
        icon: '🌐',
        suggestions: [
          'Check your internet connection',
          'Try refreshing the page',
          'Check if the service is online'
        ]
      }
    } else if (msg.includes('timeout')) {
      return {
        title: 'Request Timed Out',
        icon: '⏱️',
        suggestions: [
          'The server is taking too long to respond',
          'Try again in a moment',
          'Check your internet speed'
        ]
      }
    } else if (msg.includes('not found') || msg.includes('404')) {
      return {
        title: 'Not Found',
        icon: '🔍',
        suggestions: [
          'The requested resource was not found',
          'Check if the URL is correct',
          'The item may have been removed'
        ]
      }
    } else if (msg.includes('unauthorized') || msg.includes('401')) {
      return {
        title: 'Authentication Required',
        icon: '🔒',
        suggestions: [
          'Your session may have expired',
          'Please log in again',
          'Check your credentials'
        ]
      }
    } else if (msg.includes('server') || msg.includes('500')) {
      return {
        title: 'Server Error',
        icon: '🖥️',
        suggestions: [
          'The server encountered an error',
          'Our team has been notified',
          'Please try again later'
        ]
      }
    }
    
    return {
      title,
      icon: '⚠️',
      suggestions: suggestions.length > 0 ? suggestions : ['Please try again or contact support if the issue persists']
    }
  }

  const errorInfo = getErrorInfo()

  const handleRetry = async () => {
    if (!onRetry) return
    
    setIsRetrying(true)
    try {
      await onRetry()
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <div className={cn(
      'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4',
      className
    )}>
      <div className="flex items-start">
        <div className="flex-shrink-0 text-2xl mr-3" aria-hidden="true">
          {errorInfo.icon}
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            {errorInfo.title}
          </h3>
          
          {showDetails && (
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              {errorMessage}
            </p>
          )}
          
          {/* Retry attempts indicator */}
          {retryAttempts > 0 && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              Retry attempt {retryAttempts} of {maxRetries}
            </p>
          )}
          
          {/* Suggestions */}
          {errorInfo.suggestions.length > 0 && (
            <div className="mt-3 bg-red-100 dark:bg-red-800/20 rounded p-2">
              <p className="text-xs font-medium text-red-800 dark:text-red-200 mb-1">
                Possible solutions:
              </p>
              <ul className="text-xs space-y-0.5 text-red-700 dark:text-red-300">
                {errorInfo.suggestions.map((suggestion, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span>•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="mt-3 flex items-center gap-3">
            {canRetry && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="text-sm font-medium text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100 underline disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
              >
                {isRetrying ? (
                  <>
                    <LoadingSpinner size="sm" variant="default" className="text-red-600" />
                    Retrying...
                  </>
                ) : (
                  retryText
                )}
              </button>
            )}
            
            {/* Additional actions based on error type */}
            {errorMessage.toLowerCase().includes('401') && (
              <a
                href="/login"
                className="text-sm font-medium text-red-800 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100 underline"
              >
                Go to Login
              </a>
            )}
          </div>
          
          {/* Dev mode error stack */}
          {process.env.NODE_ENV === 'development' && error instanceof Error && error.stack && (
            <details className="mt-3">
              <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer">
                Show error stack
              </summary>
              <pre className="mt-1 text-xs overflow-auto p-2 bg-red-100 dark:bg-red-800/20 rounded max-h-32">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  )
}

// Enhanced Success message component
export const SuccessMessage = ({ 
  message, 
  onDismiss, 
  className = '' 
}: { 
  message: string
  onDismiss?: () => void
  className?: string 
}) => {
  return (
    <div className={cn(
      'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4',
      className
    )}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">{message}</p>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              className="inline-flex text-green-400 hover:text-green-600 dark:hover:text-green-300"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ===============================
// COMPOUND EXPORT SYSTEM
// ===============================

// Export LoadingStates as a compound component (maintaining compatibility)
export const LoadingStates = {
  Loading,
  LoadingSpinner,
  LoadingDots,
  LoadingPulse,
  LoadingBar,
  PageLoading,
  LocalLoadingButton,
  ButtonLoading,
  InlineLoading,
  LoadingSkeleton,
  CardLoading,
  TableSkeleton,
  TableLoading,
  CalendarSkeleton,
  TimeSlotsLoadingSkeleton,
  ListLoading,
  FormLoading,
  ContextualLoading,
  AnalyticsLoading,
  ErrorDisplay,
  SuccessMessage,
  
  // ===========================
  // SIX FIGURE BARBER BRANDED COMPONENTS
  // ===========================
  // Premium branded loading states for Six Figure Barber methodology
  BrandedSkeleton,
  BrandedSpinner,
  SixFigureAvatarSkeleton,
  SixFigureSVGSpinner,
  BarberProfileSkeleton,
  BarberPoleSpinner,
  ServiceCardSkeleton,
  PremiumDotsSpinner,
  AppointmentCardSkeleton,
  PulseRingSpinner,
  AnalyticsCardSkeleton,
  DashboardStatsSkeleton,
  SixFigureCalendarSkeleton,
  PremiumLoadingOverlay
}

// CSS for indeterminate animation (add to globals.css if not already present)
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
  const styleId = 'unified-loading-states-css'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = indeterminateCSS
    document.head.appendChild(style)
  }
}

// Individual exports for direct importing
export { BrandedSpinner, SixFigureSVGSpinner, BarberPoleSpinner, PremiumDotsSpinner, PulseRingSpinner, LoadingButton } from './ui/BrandedSpinners'
export { BrandedSkeleton, SixFigureAvatarSkeleton, BarberProfileSkeleton, ServiceCardSkeleton, AppointmentCardSkeleton, AnalyticsCardSkeleton, DashboardStatsSkeleton, SixFigureCalendarSkeleton, PremiumLoadingOverlay } from './ui/BrandedSkeletons'