/**
 * Branded Skeleton Components for BookedBarber V2
 * Premium Six Figure Barber themed loading states with sophisticated animations
 */

'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

// Enhanced branded skeleton variants with Six Figure Barber premium styling
const brandedSkeletonVariants = cva(
  'relative overflow-hidden',
  {
    variants: {
      variant: {
        // Premium shimmer with brand gradient
        premium: 'animate-shimmer bg-gradient-to-r from-primary-50 via-primary-100 to-primary-50 dark:from-primary-900 dark:via-primary-800 dark:to-primary-900',
        // Luxury gold accent shimmer
        luxury: 'animate-shimmer bg-gradient-to-r from-yellow-50 via-yellow-100 to-yellow-50 dark:from-yellow-900 dark:via-yellow-800 dark:to-yellow-900',
        // Executive professional shimmer
        executive: 'animate-shimmer bg-gradient-to-r from-secondary-100 via-secondary-200 to-secondary-100 dark:from-secondary-800 dark:via-secondary-700 dark:to-secondary-800',
        // Soft pulse for gentle loading
        gentle: 'animate-pulse bg-ios-gray-100/80 dark:bg-ios-gray-800/80',
        // Glass morphism style
        glass: 'backdrop-blur-sm bg-gradient-to-r from-white/20 via-white/30 to-white/20 dark:from-black/20 dark:via-black/30 dark:to-black/20 animate-shimmer',
      },
      size: {
        xs: 'h-3',
        sm: 'h-4',
        md: 'h-6',
        lg: 'h-8',
        xl: 'h-12',
        '2xl': 'h-16',
        '3xl': 'h-20',
      },
      shape: {
        rectangle: 'rounded-lg',
        rounded: 'rounded-xl',
        pill: 'rounded-full',
        circle: 'rounded-full aspect-square',
        square: 'aspect-square rounded-lg',
        none: 'rounded-none',
      },
      intensity: {
        subtle: 'opacity-60',
        normal: 'opacity-80',
        strong: 'opacity-100',
      }
    },
    defaultVariants: {
      variant: 'premium',
      size: 'md',
      shape: 'rectangle',
      intensity: 'normal',
    },
  }
)

export interface BrandedSkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof brandedSkeletonVariants> {
  width?: string | number
  height?: string | number
  lines?: number
  spacing?: 'tight' | 'normal' | 'relaxed'
  shimmerDirection?: 'left-to-right' | 'top-to-bottom' | 'diagonal'
}

// Premium branded skeleton with advanced shimmer effects
export function BrandedSkeleton({
  className,
  variant,
  size,
  shape,
  intensity,
  width,
  height,
  lines,
  spacing = 'normal',
  shimmerDirection = 'left-to-right',
  style,
  ...props
}: BrandedSkeletonProps) {
  const spacingMap = {
    tight: 'space-y-2',
    normal: 'space-y-3',
    relaxed: 'space-y-4',
  }

  const shimmerStyles = {
    'left-to-right': 'animate-shimmer',
    'top-to-bottom': 'animate-pulse',
    'diagonal': 'animate-shimmer',
  }

  if (lines && lines > 1) {
    return (
      <div className={cn(spacingMap[spacing], className)} {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              brandedSkeletonVariants({ variant, size, shape, intensity }),
              shimmerStyles[shimmerDirection]
            )}
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
      className={cn(
        brandedSkeletonVariants({ variant, size, shape, intensity }),
        shimmerStyles[shimmerDirection],
        className
      )}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  )
}

// Six Figure Barber branded avatar skeleton
export function SixFigureAvatarSkeleton({
  size = 'lg',
  variant = 'premium',
  className,
  ...props
}: BrandedSkeletonProps) {
  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
    '2xl': 'w-24 h-24',
    '3xl': 'w-32 h-32',
  }

  return (
    <div className="relative">
      <BrandedSkeleton
        variant={variant}
        shape="circle"
        className={cn(size ? sizeMap[size] : sizeMap.lg, className)}
        {...props}
      />
      {/* Premium badge indicator for Six Figure Barber profiles */}
      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full border-2 border-white dark:border-gray-800 animate-pulse" />
    </div>
  )
}

// Premium barber profile card skeleton
export function BarberProfileSkeleton({
  variant = 'premium',
  className,
  ...props
}: BrandedSkeletonProps) {
  return (
    <div className={cn('p-6 space-y-6 bg-gradient-to-br from-white to-primary-50 dark:from-gray-900 dark:to-primary-950 rounded-2xl border border-primary-200 dark:border-primary-800', className)} {...props}>
      {/* Profile header */}
      <div className="flex items-center space-x-4">
        <SixFigureAvatarSkeleton size="xl" variant={variant} />
        <div className="space-y-3 flex-1">
          <BrandedSkeleton variant={variant} className="h-6 w-48" />
          <BrandedSkeleton variant="executive" className="h-4 w-32" />
          <div className="flex space-x-2">
            {/* Rating stars skeleton */}
            {Array.from({ length: 5 }).map((_, i) => (
              <BrandedSkeleton key={i} variant="luxury" shape="square" className="w-4 h-4" />
            ))}
            <BrandedSkeleton variant="gentle" className="h-4 w-16 ml-2" />
          </div>
        </div>
      </div>

      {/* Specialties */}
      <div className="space-y-3">
        <BrandedSkeleton variant="executive" className="h-5 w-24" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <BrandedSkeleton key={i} variant="premium" shape="pill" className="h-6 w-20" />
          ))}
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <BrandedSkeleton variant="executive" className="h-5 w-32" />
        <BrandedSkeleton variant="gentle" lines={3} spacing="tight" />
      </div>

      {/* Action buttons */}
      <div className="flex space-x-3 pt-4">
        <BrandedSkeleton variant="premium" shape="pill" className="h-12 flex-1" />
        <BrandedSkeleton variant="executive" shape="pill" className="h-12 w-32" />
      </div>
    </div>
  )
}

// Six Figure Barber service card skeleton
export function ServiceCardSkeleton({
  variant = 'luxury',
  className,
  ...props
}: BrandedSkeletonProps) {
  return (
    <div className={cn('p-5 space-y-4 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 rounded-xl border border-yellow-200 dark:border-yellow-800', className)} {...props}>
      {/* Service header with icon */}
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <BrandedSkeleton variant={variant} className="h-6 w-40" />
          <BrandedSkeleton variant="premium" className="h-4 w-24" />
        </div>
        <BrandedSkeleton variant="luxury" shape="square" className="w-12 h-12" />
      </div>

      {/* Price and duration */}
      <div className="flex items-center justify-between">
        <BrandedSkeleton variant="executive" className="h-8 w-20" />
        <BrandedSkeleton variant="gentle" className="h-5 w-16" />
      </div>

      {/* Description */}
      <BrandedSkeleton variant="gentle" lines={2} spacing="tight" />

      {/* Book button */}
      <BrandedSkeleton variant="premium" shape="pill" className="h-11 w-full" />
    </div>
  )
}

// Premium appointment card skeleton
export function AppointmentCardSkeleton({
  variant = 'premium',
  viewType = 'day',
  className,
  ...props
}: BrandedSkeletonProps & { viewType?: 'day' | 'week' | 'month' }) {
  const compactMode = viewType === 'week' || viewType === 'month'
  
  return (
    <div className={cn(
      'relative overflow-hidden rounded-lg border border-primary-200 dark:border-primary-800',
      compactMode ? 'p-2' : 'p-4',
      'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900',
      className
    )} {...props}>
      {/* Barber symbol (top-right) */}
      <BrandedSkeleton 
        variant="executive" 
        shape="circle" 
        className={cn(
          'absolute top-1 right-1',
          compactMode ? 'w-4 h-4' : 'w-5 h-5'
        )} 
      />
      
      {/* Service icon (bottom-left) */}
      <BrandedSkeleton 
        variant="luxury" 
        shape="square" 
        className={cn(
          'absolute bottom-1 left-1',
          compactMode ? 'w-3 h-3' : 'w-4 h-4'
        )} 
      />

      {/* Content */}
      <div className={cn('space-y-1', compactMode ? 'mt-1' : 'mt-0')}>
        {/* Client name */}
        <BrandedSkeleton 
          variant={variant} 
          className={cn(
            compactMode ? 'h-3 w-16' : 'h-4 w-24'
          )} 
        />
        
        {/* Service name */}
        <BrandedSkeleton 
          variant="gentle" 
          className={cn(
            compactMode ? 'h-2 w-12' : 'h-3 w-20'
          )} 
        />
        
        {/* Duration (day view only) */}
        {!compactMode && (
          <BrandedSkeleton variant="gentle" className="h-3 w-16" />
        )}
      </div>

      {/* Premium shimmer overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer opacity-30" />
    </div>
  )
}

// Six Figure Barber analytics card skeleton
export function AnalyticsCardSkeleton({
  variant = 'executive',
  showChart = true,
  className,
  ...props
}: BrandedSkeletonProps & { showChart?: boolean }) {
  return (
    <div className={cn('p-6 space-y-6 bg-gradient-to-br from-white to-secondary-50 dark:from-gray-900 dark:to-secondary-950 rounded-2xl border border-secondary-200 dark:border-secondary-800', className)} {...props}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <BrandedSkeleton variant={variant} className="h-5 w-32" />
          <BrandedSkeleton variant="gentle" className="h-3 w-48" />
        </div>
        <BrandedSkeleton variant="luxury" shape="square" className="w-8 h-8" />
      </div>

      {/* Main metric */}
      <div className="space-y-2">
        <BrandedSkeleton variant="premium" className="h-10 w-40" />
        <div className="flex items-center space-x-2">
          <BrandedSkeleton variant="gentle" shape="square" className="w-4 h-4" />
          <BrandedSkeleton variant="gentle" className="h-4 w-20" />
        </div>
      </div>

      {/* Chart area */}
      {showChart && (
        <div className="space-y-3">
          <div className="h-48 flex items-end justify-between space-x-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <BrandedSkeleton 
                key={i} 
                variant="premium" 
                className="w-full"
                style={{ height: `${Math.random() * 80 + 20}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between">
            {Array.from({ length: 7 }).map((_, i) => (
              <BrandedSkeleton key={i} variant="gentle" className="h-3 w-8" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Premium dashboard stats grid skeleton
export function DashboardStatsSkeleton({
  variant = 'premium',
  columns = 3,
  className,
  ...props
}: BrandedSkeletonProps & { columns?: number }) {
  return (
    <div className={cn(`grid grid-cols-1 md:grid-cols-${columns} gap-6`, className)} {...props}>
      {Array.from({ length: columns }).map((_, index) => (
        <div key={index} className="p-6 bg-gradient-to-br from-white to-primary-50 dark:from-gray-900 dark:to-primary-950 rounded-2xl border border-primary-200 dark:border-primary-800">
          {/* Icon */}
          <BrandedSkeleton variant="luxury" shape="square" className="w-12 h-12 mb-4" />
          
          {/* Value */}
          <BrandedSkeleton variant={variant} className="h-8 w-20 mb-2" />
          
          {/* Label */}
          <BrandedSkeleton variant="gentle" className="h-4 w-24 mb-3" />
          
          {/* Change indicator */}
          <div className="flex items-center space-x-2">
            <BrandedSkeleton variant="gentle" shape="square" className="w-4 h-4" />
            <BrandedSkeleton variant="gentle" className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Premium calendar skeleton with Six Figure Barber branding
export function SixFigureCalendarSkeleton({
  view = 'week',
  className,
  ...props
}: BrandedSkeletonProps & { view?: 'day' | 'week' | 'month' }) {
  return (
    <div className={cn('space-y-4', className)} {...props}>
      {/* Calendar header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-500 to-primary-600 rounded-t-2xl">
        <div className="flex items-center space-x-4">
          <BrandedSkeleton variant="glass" shape="square" className="w-8 h-8" />
          <BrandedSkeleton variant="glass" className="h-6 w-32" />
        </div>
        <div className="flex items-center space-x-2">
          <BrandedSkeleton variant="glass" shape="pill" className="h-8 w-20" />
          <BrandedSkeleton variant="glass" shape="square" className="w-8 h-8" />
          <BrandedSkeleton variant="glass" shape="square" className="w-8 h-8" />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="p-4 bg-white dark:bg-gray-900 rounded-b-2xl">
        {view === 'week' && (
          <div className="grid grid-cols-7 gap-4">
            {/* Time slots */}
            <div className="space-y-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <BrandedSkeleton key={i} variant="gentle" className="h-4 w-12" />
              ))}
            </div>
            
            {/* Days */}
            {Array.from({ length: 6 }).map((_, dayIndex) => (
              <div key={dayIndex} className="space-y-2">
                <BrandedSkeleton variant="executive" className="h-5 w-16 mb-3" />
                {Array.from({ length: Math.floor(Math.random() * 4) + 1 }).map((_, appointmentIndex) => (
                  <AppointmentCardSkeleton
                    key={appointmentIndex}
                    viewType="week"
                    style={{ height: `${Math.random() * 80 + 40}px` }}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {view === 'month' && (
          <div className="grid grid-cols-7 gap-2">
            {/* Days of week header */}
            {Array.from({ length: 7 }).map((_, i) => (
              <BrandedSkeleton key={i} variant="executive" className="h-6 w-full mb-2" />
            ))}
            
            {/* Calendar days */}
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="aspect-square p-2 border border-gray-200 dark:border-gray-700 rounded">
                <BrandedSkeleton variant="gentle" className="h-4 w-6 mb-2" />
                {Math.random() > 0.6 && (
                  <BrandedSkeleton variant="premium" className="h-2 w-full" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Premium loading overlay for full-screen loading
export function PremiumLoadingOverlay({
  variant = 'premium',
  message = 'Loading your Six Figure Barber experience...',
  showLogo = true,
  className,
  ...props
}: BrandedSkeletonProps & { 
  message?: string
  showLogo?: boolean
}) {
  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center',
      'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900',
      'backdrop-blur-sm',
      className
    )} {...props}>
      <div className="text-center space-y-6 p-8">
        {/* Logo skeleton */}
        {showLogo && (
          <div className="flex justify-center">
            <BrandedSkeleton 
              variant={variant} 
              shape="rounded" 
              className="w-24 h-24" 
            />
          </div>
        )}

        {/* Loading message */}
        <div className="space-y-3">
          <BrandedSkeleton variant={variant} className="h-6 w-80 mx-auto" />
          <BrandedSkeleton variant="gentle" className="h-4 w-60 mx-auto" />
        </div>

        {/* Loading animation */}
        <div className="flex justify-center space-x-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <BrandedSkeleton
              key={i}
              variant="premium"
              shape="circle"
              className="w-3 h-3 animate-bounce"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Only add exports that don't already exist in this file

// Export all components
export {
  brandedSkeletonVariants,
}

export default BrandedSkeleton