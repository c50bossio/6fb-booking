import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  ...props
}: SkeletonProps) {
  const baseStyles = 'bg-gray-200 dark:bg-gray-700'
  
  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  }
  
  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-md'
  }
  
  const style: React.CSSProperties = {
    width: width || (variant === 'circular' ? '40px' : '100%'),
    height: height || (variant === 'circular' ? '40px' : variant === 'text' ? '16px' : '100px'),
    ...props.style
  }
  
  return (
    <div
      className={cn(
        baseStyles,
        animationStyles[animation],
        variantStyles[variant],
        className
      )}
      style={style}
      {...props}
    />
  )
}

// Composite skeleton components for common patterns

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm', className)}>
      <Skeleton variant="rectangular" height={20} width="60%" className="mb-2" />
      <Skeleton variant="text" height={16} width="80%" className="mb-4" />
      <div className="space-y-2">
        <Skeleton variant="text" height={14} />
        <Skeleton variant="text" height={14} />
        <Skeleton variant="text" height={14} width="70%" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={`header-${i}`} variant="text" height={16} width="80%" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="p-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton 
                  key={`cell-${rowIndex}-${colIndex}`} 
                  variant="text" 
                  height={14} 
                  width={colIndex === 0 ? '100%' : '60%'} 
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonList({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" height={16} width="40%" />
            <Skeleton variant="text" height={14} width="60%" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonCalendar() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <Skeleton variant="text" height={24} width={200} />
        <div className="flex space-x-2">
          <Skeleton variant="rounded" height={36} width={100} />
          <Skeleton variant="rounded" height={36} width={100} />
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={`day-${i}`} variant="text" height={20} className="mb-2" />
        ))}
        
        {/* Calendar cells */}
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={`cell-${i}`} variant="rounded" height={80} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <Skeleton variant="text" height={14} width="60%" className="mb-2" />
          <Skeleton variant="text" height={32} width="80%" className="mb-1" />
          <Skeleton variant="text" height={12} width="40%" />
        </div>
      ))}
    </div>
  )
}