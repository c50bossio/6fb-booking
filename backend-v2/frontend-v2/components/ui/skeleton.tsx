'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const skeletonVariants = cva(
  'relative overflow-hidden rounded-lg',
  {
    variants: {
      variant: {
        default: 'loading-skeleton',
        shimmer: 'animate-shimmer bg-gradient-to-r from-ios-gray-200 via-ios-gray-300 to-ios-gray-200 dark:from-ios-gray-700 dark:via-ios-gray-600 dark:to-ios-gray-700',
        pulse: 'animate-pulse bg-ios-gray-200 dark:bg-ios-gray-700',
        wave: 'bg-ios-gray-200 dark:bg-ios-gray-700 animate-shimmer',
      },
      size: {
        sm: 'h-4',
        md: 'h-6',
        lg: 'h-8',
        xl: 'h-12',
        '2xl': 'h-16',
      },
      shape: {
        rectangle: 'rounded-lg',
        circle: 'rounded-full aspect-square',
        pill: 'rounded-full',
        none: 'rounded-none',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      shape: 'rectangle',
    },
  }
)

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  width?: string | number
  height?: string | number
  lines?: number
  spacing?: 'sm' | 'md' | 'lg'
}

function Skeleton({
  className,
  variant,
  size,
  shape,
  width,
  height,
  lines,
  spacing = 'md',
  style,
  ...props
}: SkeletonProps) {
  const spacingMap = {
    sm: 'space-y-2',
    md: 'space-y-3',
    lg: 'space-y-4',
  }

  if (lines && lines > 1) {
    return (
      <div className={cn(spacingMap[spacing], className)} {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={skeletonVariants({ variant, size, shape })}
            style={{
              width: index === lines - 1 ? '75%' : width,
              height,
              ...style,
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(skeletonVariants({ variant, size, shape }), className)}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  )
}

// Predefined skeleton components for common use cases
const SkeletonText = ({ lines = 1, className, ...props }: SkeletonProps) => (
  <Skeleton
    variant="shimmer"
    lines={lines}
    className={cn('w-full', className)}
    {...props}
  />
)

const SkeletonButton = ({ className, ...props }: SkeletonProps) => (
  <Skeleton
    variant="shimmer"
    shape="pill"
    size="lg"
    width="120px"
    className={cn('px-6 py-3', className)}
    {...props}
  />
)

const SkeletonAvatar = ({ size = 'md', className, ...props }: SkeletonProps) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
    '2xl': 'w-24 h-24',
  }

  return (
    <Skeleton
      variant="shimmer"
      shape="circle"
      className={cn(sizeMap[size], className)}
      {...props}
    />
  )
}

const SkeletonCard = ({ className, ...props }: SkeletonProps) => (
  <div className={cn('p-6 space-y-4 border rounded-lg', className)} {...props}>
    <div className="flex items-center space-x-4">
      <SkeletonAvatar size="md" />
      <div className="space-y-2 flex-1">
        <SkeletonText className="h-4 w-[200px]" />
        <SkeletonText className="h-3 w-[150px]" />
      </div>
    </div>
    <div className="space-y-2">
      <SkeletonText lines={3} />
    </div>
    <div className="flex space-x-2">
      <SkeletonButton />
      <SkeletonButton />
    </div>
  </div>
)

const SkeletonTable = ({ 
  rows = 5, 
  columns = 4, 
  className, 
  ...props 
}: SkeletonProps & { rows?: number; columns?: number }) => (
  <div className={cn('space-y-3', className)} {...props}>
    {/* Table Header */}
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={`header-${index}`} variant="shimmer" className="h-6" />
      ))}
    </div>
    {/* Table Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div 
        key={`row-${rowIndex}`} 
        className="grid gap-4" 
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton 
            key={`cell-${rowIndex}-${colIndex}`} 
            variant="shimmer" 
            className="h-5" 
          />
        ))}
      </div>
    ))}
  </div>
)

const SkeletonList = ({ 
  items = 5, 
  showAvatar = true, 
  className, 
  ...props 
}: SkeletonProps & { items?: number; showAvatar?: boolean }) => (
  <div className={cn('space-y-4', className)} {...props}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-4">
        {showAvatar && <SkeletonAvatar size="sm" />}
        <div className="space-y-2 flex-1">
          <SkeletonText className="h-4" />
          <SkeletonText className="h-3 w-3/4" />
        </div>
      </div>
    ))}
  </div>
)

export { 
  Skeleton, 
  SkeletonText, 
  SkeletonButton, 
  SkeletonAvatar, 
  SkeletonCard, 
  SkeletonTable, 
  SkeletonList,
  skeletonVariants 
}