/**
 * Enhanced Error Display Component
 * Shows user-friendly error messages with actionable next steps
 */

import React, { useState } from 'react'
import { XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EnhancedErrorMessage } from '@/lib/error-messages'

interface EnhancedErrorDisplayProps {
  error: EnhancedErrorMessage
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
  showTechnicalDetails?: boolean
}

export function EnhancedErrorDisplay({
  error,
  onRetry,
  onDismiss,
  className = '',
  showTechnicalDetails = false
}: EnhancedErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [showTechnical, setShowTechnical] = useState(showTechnicalDetails)

  const getIconAndColor = () => {
    switch (error.category) {
      case 'network':
        return {
          icon: ExclamationTriangleIcon,
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          iconColor: 'text-yellow-600 dark:text-yellow-400'
        }
      case 'auth':
        return {
          icon: XCircleIcon,
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          iconColor: 'text-red-600 dark:text-red-400'
        }
      case 'validation':
        return {
          icon: InformationCircleIcon,
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          iconColor: 'text-blue-600 dark:text-blue-400'
        }
      case 'server':
        return {
          icon: ExclamationTriangleIcon,
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          borderColor: 'border-orange-200 dark:border-orange-800',
          iconColor: 'text-orange-600 dark:text-orange-400'
        }
      default:
        return {
          icon: XCircleIcon,
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-800',
          iconColor: 'text-gray-600 dark:text-gray-400'
        }
    }
  }

  const { icon: Icon, bgColor, borderColor, iconColor } = getIconAndColor()

  return (
    <Card className={`${bgColor} ${borderColor} ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Icon className={`h-6 w-6 ${iconColor} flex-shrink-0 mt-0.5`} />
          
          <div className="flex-1 min-w-0">
            {/* Error Title and Category */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {error.title}
              </h3>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${iconColor.replace('text-', 'text-')} border-current`}
                >
                  {error.category}
                </Badge>
                {error.isRecoverable && (
                  <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-200 dark:border-green-800">
                    Recoverable
                  </Badge>
                )}
              </div>
            </div>

            {/* Primary Message */}
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              {error.message}
            </p>

            {/* Explanation */}
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {error.explanation}
            </p>

            {/* Next Steps */}
            <div className="mb-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {showDetails ? (
                  <ChevronDownIcon className="h-4 w-4 mr-1" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 mr-1" />
                )}
                What you can do
              </button>
              
              {showDetails && (
                <div className="mt-2 ml-5">
                  <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    {error.nextSteps.map((step, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2 text-gray-400">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Technical Details (collapsible) */}
            {error.technicalDetails && (
              <div className="mb-4">
                <button
                  onClick={() => setShowTechnical(!showTechnical)}
                  className="flex items-center text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  {showTechnical ? (
                    <ChevronDownIcon className="h-3 w-3 mr-1" />
                  ) : (
                    <ChevronRightIcon className="h-3 w-3 mr-1" />
                  )}
                  Technical details
                </button>
                
                {showTechnical && (
                  <div className="mt-1 ml-4">
                    <code className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {error.technicalDetails}
                    </code>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex space-x-2">
                {error.isRecoverable && onRetry && (
                  <Button
                    onClick={onRetry}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    Try Again
                  </Button>
                )}
                
                {error.category === 'network' && (
                  <Button
                    onClick={() => window.location.reload()}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    Refresh Page
                  </Button>
                )}
                
                {error.category === 'auth' && (
                  <Button
                    onClick={() => window.location.href = '/login'}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    Go to Login
                  </Button>
                )}
              </div>

              {onDismiss && (
                <Button
                  onClick={onDismiss}
                  size="sm"
                  variant="ghost"
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Compact Error Display for inline use
 */
export function CompactErrorDisplay({
  error,
  onRetry,
  className = ''
}: {
  error: EnhancedErrorMessage
  onRetry?: () => void
  className?: string
}) {
  const { icon: Icon, iconColor } = getIconAndColor()

  function getIconAndColor() {
    switch (error.category) {
      case 'network':
        return { icon: ExclamationTriangleIcon, iconColor: 'text-yellow-500' }
      case 'auth':
        return { icon: XCircleIcon, iconColor: 'text-red-500' }
      case 'validation':
        return { icon: InformationCircleIcon, iconColor: 'text-blue-500' }
      default:
        return { icon: XCircleIcon, iconColor: 'text-gray-500' }
    }
  }

  return (
    <div className={`flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg ${className}`}>
      <Icon className={`h-5 w-5 ${iconColor} flex-shrink-0`} />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {error.title}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {error.message}
        </p>
      </div>

      {error.isRecoverable && onRetry && (
        <Button
          onClick={onRetry}
          size="sm"
          variant="outline"
          className="text-xs"
        >
          Retry
        </Button>
      )}
    </div>
  )
}

/**
 * Hook to manage enhanced error state
 */
export function useEnhancedError() {
  const [error, setError] = useState<EnhancedErrorMessage | null>(null)

  const clearError = () => setError(null)
  
  const showError = (enhancedError: EnhancedErrorMessage) => {
    setError(enhancedError)
  }

  return {
    error,
    showError,
    clearError,
    hasError: !!error
  }
}