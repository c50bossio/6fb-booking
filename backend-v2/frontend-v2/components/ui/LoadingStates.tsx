'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  )
}

interface LoadingSkeletonProps {
  type?: 'text' | 'card' | 'button' | 'avatar' | 'table-row'
  count?: number
  className?: string
}

export function LoadingSkeleton({ type = 'text', count = 1, className = '' }: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'text':
        return <div className="loading-skeleton h-4 w-3/4" />
      case 'card':
        return (
          <div className="space-y-3">
            <div className="loading-skeleton h-6 w-1/2" />
            <div className="loading-skeleton h-4 w-full" />
            <div className="loading-skeleton h-4 w-2/3" />
          </div>
        )
      case 'button':
        return <div className="loading-skeleton h-10 w-24 rounded-lg" />
      case 'avatar':
        return <div className="loading-skeleton h-10 w-10 rounded-full" />
      case 'table-row':
        return (
          <div className="flex space-x-4">
            <div className="loading-skeleton h-4 w-1/4" />
            <div className="loading-skeleton h-4 w-1/3" />
            <div className="loading-skeleton h-4 w-1/4" />
            <div className="loading-skeleton h-4 w-1/6" />
          </div>
        )
      default:
        return <div className="loading-skeleton h-4 w-full" />
    }
  }

  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={i > 0 ? 'mt-2' : ''}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  )
}

interface LoadingOverlayProps {
  isLoading: boolean
  children: React.ReactNode
  className?: string
}

export function LoadingOverlay({ isLoading, children, className = '' }: LoadingOverlayProps) {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-secondary-900/80 flex items-center justify-center rounded-lg backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-2">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-secondary-600 dark:text-secondary-400">Loading...</p>
          </div>
        </div>
      )}
    </div>
  )
}

interface LoadingCardProps {
  title?: string
  description?: string
  className?: string
}

export function LoadingCard({ title = 'Loading...', description, className = '' }: LoadingCardProps) {
  return (
    <div className={`card ${className}`}>
      <div className="card-content">
        <div className="flex items-center space-x-3">
          <LoadingSpinner size="md" />
          <div>
            <h3 className="font-medium text-secondary-900 dark:text-secondary-100">{title}</h3>
            {description && (
              <p className="text-sm text-secondary-600 dark:text-secondary-400">{description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface LoadingListProps {
  itemCount?: number
  showAvatars?: boolean
  className?: string
}

export function LoadingList({ itemCount = 5, showAvatars = false, className = '' }: LoadingListProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: itemCount }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 border border-secondary-200 dark:border-secondary-700 rounded-lg">
          {showAvatars && <LoadingSkeleton type="avatar" />}
          <div className="flex-1">
            <LoadingSkeleton type="text" />
            <div className="mt-1">
              <LoadingSkeleton type="text" className="!w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

interface LoadingTableProps {
  rows?: number
  columns?: number
  className?: string
}

export function LoadingTable({ rows = 5, columns = 4, className = '' }: LoadingTableProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex space-x-4 p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="loading-skeleton h-4 w-1/4" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-3 border border-secondary-200 dark:border-secondary-700 rounded-lg">
          <LoadingSkeleton type="table-row" />
        </div>
      ))}
    </div>
  )
}

// Higher-order component for adding loading states
export function withLoading<T extends object>(
  Component: React.ComponentType<T>,
  LoadingComponent: React.ComponentType<any> = LoadingCard
) {
  return function WithLoadingComponent(props: T & { isLoading?: boolean; loadingProps?: any }) {
    const { isLoading, loadingProps, ...componentProps } = props
    
    if (isLoading) {
      return <LoadingComponent {...loadingProps} />
    }
    
    return <Component {...(componentProps as T)} />
  }
}