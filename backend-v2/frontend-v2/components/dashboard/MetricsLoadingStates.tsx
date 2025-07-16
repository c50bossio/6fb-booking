'use client'

import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/**
 * Loading skeleton for individual metric cards
 */
export function MetricCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </div>
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton for client metrics section
 */
export function ClientMetricsSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
          <div className="space-y-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton for metrics grid
 */
export function MetricsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <MetricCardSkeleton key={index} />
      ))}
    </div>
  )
}

/**
 * Loading skeleton for analytics dashboard
 */
export function AnalyticsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="animate-pulse space-y-2">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="animate-pulse space-y-6">
          {/* Metric cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              </div>
            ))}
          </div>
          
          {/* Chart skeleton */}
          <div className="space-y-4">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          
          {/* Insights skeleton */}
          <div className="space-y-3">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-28"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton for quick actions
 */
export function QuickActionsSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-4 p-6 border border-gray-200 dark:border-gray-700 rounded-2xl">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton for appointment mini calendar
 */
export function CalendarMiniSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 border border-gray-200 dark:border-gray-700 rounded">
                <div className="w-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
              </div>
            ))}
          </div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading error state with retry
 */
interface LoadingErrorProps {
  message?: string
  onRetry?: () => void
  showRetry?: boolean
}

export function LoadingError({ 
  message = 'Failed to load data', 
  onRetry,
  showRetry = true 
}: LoadingErrorProps) {
  return (
    <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
      <CardContent className="p-4 text-center">
        <div className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto mb-2">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-sm text-red-700 dark:text-red-200 mb-3">{message}</p>
        {showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-red-600 dark:text-red-300 hover:text-red-700 dark:hover:text-red-200 underline"
          >
            Try again
          </button>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Shimmer loading effect for better UX
 */
export function ShimmerCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      {children}
    </div>
  )
}

/**
 * Smart loading component that shows appropriate skeleton based on loading state
 */
interface SmartLoadingProps {
  isLoading: boolean
  error?: Error | null
  children: React.ReactNode
  skeleton: React.ReactNode
  onRetry?: () => void
  minLoadingTime?: number
}

export function SmartLoading({ 
  isLoading, 
  error, 
  children, 
  skeleton, 
  onRetry,
  minLoadingTime = 300 
}: SmartLoadingProps) {
  const [showContent, setShowContent] = React.useState(false)

  React.useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setShowContent(true)
      }, minLoadingTime)
      return () => clearTimeout(timer)
    } else {
      setShowContent(false)
    }
  }, [isLoading, minLoadingTime])

  if (error) {
    return (
      <LoadingError 
        message={error.message || 'Something went wrong'} 
        onRetry={onRetry}
      />
    )
  }

  if (isLoading || !showContent) {
    return <ShimmerCard>{skeleton}</ShimmerCard>
  }

  return <>{children}</>
}

export default {
  MetricCardSkeleton,
  ClientMetricsSkeleton,
  MetricsGridSkeleton,
  AnalyticsSkeleton,
  QuickActionsSkeleton,
  CalendarMiniSkeleton,
  LoadingError,
  ShimmerCard,
  SmartLoading
}