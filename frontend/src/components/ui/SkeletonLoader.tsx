'use client'

import { useTheme } from '@/contexts/ThemeContext'

interface SkeletonLoaderProps {
  className?: string
  width?: string
  height?: string
}

export function SkeletonLoader({ className = '', width = 'w-full', height = 'h-4' }: SkeletonLoaderProps) {
  const { theme } = useTheme()

  return (
    <div
      className={`animate-pulse ${width} ${height} ${className} ${
        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
      } rounded`}
    />
  )
}

export function ClientCardSkeleton() {
  const { theme } = useTheme()

  return (
    <div
      className={`rounded-lg border p-6 ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <SkeletonLoader width="w-12" height="h-12" className="rounded-lg" />
          <div className="flex-1">
            <SkeletonLoader width="w-32" height="h-5" className="mb-2" />
            <SkeletonLoader width="w-20" height="h-4" />
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <SkeletonLoader width="w-20" height="h-4" />
          <SkeletonLoader width="w-16" height="h-4" />
        </div>
        <div className="flex items-center justify-between">
          <SkeletonLoader width="w-16" height="h-4" />
          <SkeletonLoader width="w-8" height="h-4" />
        </div>
        <div className="flex items-center justify-between">
          <SkeletonLoader width="w-20" height="h-4" />
          <SkeletonLoader width="w-24" height="h-4" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <SkeletonLoader width="w-8" height="h-8" className="rounded-lg" />
          <SkeletonLoader width="w-8" height="h-8" className="rounded-lg" />
          <SkeletonLoader width="w-8" height="h-8" className="rounded-lg" />
        </div>
        <SkeletonLoader width="w-8" height="h-8" className="rounded-lg" />
      </div>
    </div>
  )
}

export function StatCardSkeleton() {
  const { theme } = useTheme()

  return (
    <div
      className={`rounded-lg border p-6 ${
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center space-x-3">
        <SkeletonLoader width="w-8" height="h-8" className="rounded" />
        <div>
          <SkeletonLoader width="w-16" height="h-6" className="mb-2" />
          <SkeletonLoader width="w-20" height="h-4" />
        </div>
      </div>
    </div>
  )
}
