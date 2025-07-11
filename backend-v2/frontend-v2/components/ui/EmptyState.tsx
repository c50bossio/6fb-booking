import React from 'react'
import { Button } from './Button'
import { EMPTY_STATES } from '@/lib/ui-constants'

export interface EmptyStateProps {
  type?: keyof typeof EMPTY_STATES
  title?: string
  description?: string
  icon?: string | React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function EmptyState({
  type,
  title,
  description,
  icon,
  action,
  className = '',
  size = 'md'
}: EmptyStateProps) {
  // Use predefined empty state if type is provided
  const predefinedState = type ? EMPTY_STATES[type] : null
  
  const finalTitle = title || predefinedState?.title || 'No data'
  const finalDescription = description || predefinedState?.description || 'No items to display'
  const finalIcon = icon || predefinedState?.icon || '📭'
  const finalAction = action || (predefinedState?.action ? {
    label: predefinedState.action,
    onClick: () => {}
  } : null)
  
  const sizeClasses = {
    sm: {
      container: 'py-8 px-6',
      icon: 'text-4xl mb-3',
      title: 'text-lg',
      description: 'text-sm',
      button: 'size="sm"'
    },
    md: {
      container: 'py-12 px-8',
      icon: 'text-6xl mb-4',
      title: 'text-xl',
      description: 'text-base',
      button: 'size="md"'
    },
    lg: {
      container: 'py-16 px-10',
      icon: 'text-8xl mb-6',
      title: 'text-2xl',
      description: 'text-lg',
      button: 'size="lg"'
    }
  }
  
  const sizes = sizeClasses[size]
  
  return (
    <div className={`flex flex-col items-center justify-center text-center ${sizes.container} ${className}`}>
      {/* Icon */}
      <div className={`${sizes.icon} select-none`} aria-hidden="true">
        {typeof finalIcon === 'string' ? (
          <span role="img">{finalIcon}</span>
        ) : (
          finalIcon
        )}
      </div>
      
      {/* Title */}
      <h3 className={`font-semibold text-gray-900 dark:text-white mb-2 ${sizes.title}`}>
        {finalTitle}
      </h3>
      
      {/* Description */}
      <p className={`text-gray-600 dark:text-gray-400 mb-6 max-w-md ${sizes.description}`}>
        {finalDescription}
      </p>
      
      {/* Action */}
      {finalAction && (
        <Button
          onClick={finalAction.onClick}
          variant="primary"
          size={size}
        >
          {finalAction.label}
        </Button>
      )}
    </div>
  )
}

// Specialized empty states for common use cases
export function NoResultsEmptyState({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      icon="🔍"
      title="No results found"
      description="Try adjusting your search terms or filters"
      action={onClear ? {
        label: 'Clear filters',
        onClick: onClear
      } : undefined}
    />
  )
}

export function LoadingEmptyState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  )
}

export function ErrorEmptyState({ 
  error, 
  onRetry 
}: { 
  error?: string
  onRetry?: () => void 
}) {
  return (
    <EmptyState
      icon="❌"
      title="Something went wrong"
      description={error || "We couldn't load the data. Please try again."}
      action={onRetry ? {
        label: 'Try again',
        onClick: onRetry
      } : undefined}
    />
  )
}

export function ComingSoonEmptyState({ feature }: { feature?: string }) {
  return (
    <EmptyState
      icon="🚧"
      title="Coming Soon"
      description={`${feature || 'This feature'} is currently under development and will be available soon.`}
    />
  )
}

export function PermissionDeniedEmptyState() {
  return (
    <EmptyState
      icon="🔒"
      title="Access Denied"
      description="You don't have permission to view this content."
    />
  )
}

export function OfflineEmptyState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon="🌐"
      title="You're offline"
      description="Check your internet connection and try again."
      action={onRetry ? {
        label: 'Retry',
        onClick: onRetry
      } : undefined}
    />
  )
}