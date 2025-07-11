import React from 'react'
import { cn } from '@/lib/utils'
import { 
  ExclamationTriangleIcon, 
  XCircleIcon, 
  ArrowPathIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface ErrorMessageProps {
  title?: string
  message: string
  type?: 'error' | 'warning' | 'info'
  onRetry?: () => void
  onDismiss?: () => void
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function ErrorMessage({
  title,
  message,
  type = 'error',
  onRetry,
  onDismiss,
  action,
  className
}: ErrorMessageProps) {
  const config = {
    error: {
      icon: XCircleIcon,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
      iconColor: 'text-red-600 dark:text-red-400',
      titleColor: 'text-red-800 dark:text-red-200',
      messageColor: 'text-red-700 dark:text-red-300'
    },
    warning: {
      icon: ExclamationTriangleIcon,
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      borderColor: 'border-amber-200 dark:border-amber-800',
      iconColor: 'text-amber-600 dark:text-amber-400',
      titleColor: 'text-amber-800 dark:text-amber-200',
      messageColor: 'text-amber-700 dark:text-amber-300'
    },
    info: {
      icon: InformationCircleIcon,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-600 dark:text-blue-400',
      titleColor: 'text-blue-800 dark:text-blue-200',
      messageColor: 'text-blue-700 dark:text-blue-300'
    }
  }

  const { icon: Icon, bgColor, borderColor, iconColor, titleColor, messageColor } = config[type]

  return (
    <div className={cn(
      'rounded-lg border p-4',
      bgColor,
      borderColor,
      className
    )}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={cn('text-sm font-medium', titleColor)}>
              {title}
            </h3>
          )}
          <div className={cn('text-sm', title && 'mt-1', messageColor)}>
            {message}
          </div>
          {(onRetry || action) && (
            <div className="mt-3 flex space-x-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={cn(
                    'inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md',
                    type === 'error' && 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50',
                    type === 'warning' && 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50',
                    type === 'info' && 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                  )}
                >
                  <ArrowPathIcon className="h-3 w-3 mr-1" />
                  Try Again
                </button>
              )}
              {action && (
                <button
                  onClick={action.onClick}
                  className={cn(
                    'inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded-md',
                    type === 'error' && 'border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20',
                    type === 'warning' && 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20',
                    type === 'info' && 'border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  )}
                >
                  {action.label}
                </button>
              )}
            </div>
          )}
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              className={cn(
                'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                type === 'error' && 'text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 focus:ring-red-600',
                type === 'warning' && 'text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/30 focus:ring-amber-600',
                type === 'info' && 'text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 focus:ring-blue-600'
              )}
            >
              <span className="sr-only">Dismiss</span>
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Common error message presets
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorMessage
      title="Network Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      type="error"
      onRetry={onRetry}
    />
  )
}

export function ValidationError({ errors }: { errors: string[] }) {
  return (
    <ErrorMessage
      title="Validation Error"
      message={errors.length === 1 ? errors[0] : `Please fix the following errors: ${errors.join(', ')}`}
      type="warning"
    />
  )
}

export function PermissionError({ action }: { action?: string }) {
  return (
    <ErrorMessage
      title="Permission Denied"
      message={`You don't have permission to ${action || 'perform this action'}. Please contact your administrator.`}
      type="error"
    />
  )
}

export function NotFoundError({ resource = 'Resource' }: { resource?: string }) {
  return (
    <ErrorMessage
      title={`${resource} Not Found`}
      message={`The ${resource.toLowerCase()} you're looking for doesn't exist or has been removed.`}
      type="warning"
    />
  )
}

export function GenericError({ 
  message = 'Something went wrong. Please try again later.',
  onRetry 
}: { 
  message?: string
  onRetry?: () => void 
}) {
  return (
    <ErrorMessage
      title="Oops!"
      message={message}
      type="error"
      onRetry={onRetry}
    />
  )
}