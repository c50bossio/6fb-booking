'use client'

import { motion } from 'framer-motion'

interface LoadingSkeletonProps {
  className?: string
  height?: string
  width?: string
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

export function LoadingSkeleton({
  className = '',
  height = 'h-4',
  width = 'w-full',
  rounded = 'md'
}: LoadingSkeletonProps) {
  const roundedClasses = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full'
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${height} ${width} ${roundedClasses[rounded]} ${className}`}
    />
  )
}

export function KPICardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 animate-pulse"
    >
      <div className="flex items-center justify-between mb-4">
        <LoadingSkeleton width="w-12" height="h-12" rounded="xl" />
        <LoadingSkeleton width="w-16" height="h-6" rounded="full" />
      </div>
      <div className="space-y-2">
        <LoadingSkeleton width="w-24" height="h-4" />
        <LoadingSkeleton width="w-32" height="h-8" />
        <LoadingSkeleton width="w-20" height="h-3" />
      </div>
      <LoadingSkeleton width="w-full" height="h-1" className="mt-4" />
    </motion.div>
  )
}

export function ChartSkeleton({ height = 'h-80' }: { height?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 animate-pulse"
    >
      <div className="mb-6">
        <LoadingSkeleton width="w-40" height="h-6" className="mb-2" />
        <LoadingSkeleton width="w-60" height="h-4" />
      </div>
      <LoadingSkeleton width="w-full" height={height} rounded="lg" />
    </motion.div>
  )
}

export function ScheduleSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 animate-pulse"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <LoadingSkeleton width="w-9" height="h-9" rounded="lg" />
          <LoadingSkeleton width="w-32" height="h-6" />
        </div>
        <LoadingSkeleton width="w-32" height="h-4" />
      </div>

      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <LoadingSkeleton width="w-16" height="h-4" className="mb-1" />
                <LoadingSkeleton width="w-12" height="h-3" />
              </div>
              <div className="h-8 w-px bg-gray-300 dark:bg-gray-700"></div>
              <div>
                <LoadingSkeleton width="w-40" height="h-5" className="mb-1" />
                <LoadingSkeleton width="w-48" height="h-4" />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <LoadingSkeleton width="w-20" height="h-6" rounded="full" />
              <LoadingSkeleton width="w-12" height="h-5" />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Skeleton */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div>
              <LoadingSkeleton width="w-80" height="h-8" className="mb-2" />
              <LoadingSkeleton width="w-96" height="h-5" />
            </div>
            <div className="flex space-x-4">
              <LoadingSkeleton width="w-32" height="h-10" rounded="lg" />
              <LoadingSkeleton width="w-40" height="h-10" rounded="lg" />
            </div>
          </div>
        </motion.div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>

        {/* Charts Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <ChartSkeleton key={i} />
          ))}
        </div>

        {/* Schedule Skeleton */}
        <ScheduleSkeleton />
      </div>
    </div>
  )
}
