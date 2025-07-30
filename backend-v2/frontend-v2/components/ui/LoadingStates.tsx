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

// Table Loading State
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

// Time Slots Loading Skeleton
export const TimeSlotsLoadingSkeleton = ({ 
  slots = 8, 
  className,
  ...props 
}: {
  slots?: number
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn('space-y-3', className)}
    {...props}
  >
    <div className="h-5 bg-ios-gray-200 dark:bg-ios-gray-700 rounded w-32 mb-4 animate-pulse" />
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {Array.from({ length: slots }).map((_, i) => (
        <div 
          key={i} 
          className="h-12 bg-ios-gray-200 dark:bg-ios-gray-700 rounded-lg animate-pulse"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  </div>
)

// Progressive Loading with auto-advancement
export const ProgressiveLoading = ({ 
  stages, 
  currentStage = 0, 
  autoAdvance = false, 
  onComplete,
  className,
  ...props 
}: {
  stages: Array<{ label: string; duration?: number }>
  currentStage?: number
  autoAdvance?: boolean
  onComplete?: () => void
  className?: string
} & React.HTMLAttributes<HTMLDivElement>) => {
  const [stage, setStage] = React.useState(currentStage)
  const [progress, setProgress] = React.useState(0)

  React.useEffect(() => {
    if (!autoAdvance || stage >= stages.length) return

    const currentStageData = stages[stage]
    const duration = currentStageData.duration || 1000
    const interval = 50
    const totalSteps = duration / interval
    let currentStep = 0

    const timer = setInterval(() => {
      currentStep++
      const stageProgress = (currentStep / totalSteps) * 100
      setProgress(stageProgress)

      if (currentStep >= totalSteps) {
        clearInterval(timer)
        if (stage < stages.length - 1) {
          setStage(stage + 1)
          setProgress(0)
        } else if (onComplete) {
          setTimeout(onComplete, 200)
        }
      }
    }, interval)

    return () => clearInterval(timer)
  }, [stage, autoAdvance, stages, onComplete])

  const overallProgress = ((stage + progress / 100) / stages.length) * 100

  return (
    <div 
      className={cn('flex flex-col items-center justify-center gap-4', className)}
      {...props}
    >
      <LoadingSpinner size="lg" />
      
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-ios-gray-900 dark:text-ios-gray-100">
          {stages[stage]?.label || 'Loading...'}
        </p>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-ios-gray-600 dark:text-ios-gray-400">
            Step {stage + 1} of {stages.length}
          </span>
          <span className="text-sm font-medium text-primary-600">
            {Math.round(overallProgress)}%
          </span>
        </div>
        
        <div className="w-64 bg-ios-gray-200 dark:bg-ios-gray-700 rounded-full h-2">
          <div 
            className="bg-primary-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>
      
      {/* Stage indicators */}
      <div className="flex items-center gap-2">
        {stages.map((_, index) => (
          <div 
            key={index}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300',
              index < stage ? 'bg-primary-600' : 
              index === stage ? 'bg-primary-400 animate-pulse' : 
              'bg-ios-gray-300 dark:bg-ios-gray-600'
            )}
          />
        ))}
      </div>
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

// Smart Loading Hook
export const useSmartLoading = ({
  context,
  estimatedDuration = 2000,
  autoComplete = false
}: {
  context: 'analytics' | 'booking' | 'calendar' | 'payments' | 'sync' | 'dashboard' | 'form' | 'search'
  estimatedDuration?: number
  autoComplete?: boolean
}) => {
  const [isLoading, setIsLoading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [stage, setStage] = React.useState<'initializing' | 'processing' | 'finalizing'>('initializing')

  const startLoading = React.useCallback(() => {
    setIsLoading(true)
    setProgress(0)
    setStage('initializing')

    if (autoComplete) {
      const interval = 50
      const totalSteps = estimatedDuration / interval
      let currentStep = 0

      const timer = setInterval(() => {
        currentStep++
        const newProgress = (currentStep / totalSteps) * 100
        setProgress(newProgress)

        if (newProgress < 30) {
          setStage('initializing')
        } else if (newProgress < 80) {
          setStage('processing')
        } else {
          setStage('finalizing')
        }

        if (currentStep >= totalSteps) {
          clearInterval(timer)
          setIsLoading(false)
          setProgress(100)
        }
      }, interval)

      return () => clearInterval(timer)
    }
  }, [estimatedDuration, autoComplete])

  const stopLoading = React.useCallback(() => {
    setIsLoading(false)
    setProgress(100)
    setStage('finalizing')
  }, [])

  const updateProgress = React.useCallback((newProgress: number) => {
    setProgress(Math.min(100, Math.max(0, newProgress)))
    
    if (newProgress < 30) {
      setStage('initializing')
    } else if (newProgress < 80) {
      setStage('processing')
    } else {
      setStage('finalizing')
    }
  }, [])

  return {
    isLoading,
    progress,
    stage,
    startLoading,
    stopLoading,
    updateProgress
  }
}

// Export all components (individual exports already handled above)

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
  ContextualLoading,
  CardLoading,
  TableLoading,
  ListLoading,
  FormLoading,
  TimeSlotsLoadingSkeleton,
  ProgressiveLoading,
  AnalyticsLoading
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

// REMOVED: All module-level CSS injection that causes SSR errors
// CSS will be injected by components when they mount on client-side