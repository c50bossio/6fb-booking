'use client'

/**
 * Enhanced Booking Validation Toast System
 * 
 * Provides comprehensive user feedback for booking validation with:
 * - Six Figure Barber methodology messaging
 * - Progressive disclosure of information
 * - Action-oriented error guidance
 * - Premium experience positioning
 * - Upselling and suggestions integration
 */

import { useState, useEffect } from 'react'
import { toast, type ExternalToast } from 'sonner'
import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  LightBulbIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import type { ValidationResult, ValidationError } from '@/lib/booking-validation'

interface BookingValidationToastProps {
  validationResult: ValidationResult
  onRetry?: () => void
  onSuggestionClick?: (suggestion: string) => void
  onUpsellClick?: (service: string) => void
}

// Custom toast components for different validation types
export function ValidationErrorToast({ 
  error, 
  onRetry, 
  onHelp 
}: { 
  error: ValidationError
  onRetry?: () => void
  onHelp?: () => void 
}) {
  return (
    <div className="flex items-start gap-3 p-2">
      <div className="flex-shrink-0">
        <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-red-900 dark:text-red-100">
            {getFieldDisplayName(error.field)} Issue
          </p>
          {error.severity === 'error' && (
            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
              Required
            </span>
          )}
        </div>
        <p className="text-sm text-red-700 dark:text-red-200 mt-1">
          {error.message}
        </p>
        <div className="flex gap-2 mt-3">
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="h-8 px-3 text-xs"
            >
              Try Again
            </Button>
          )}
          {onHelp && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onHelp}
              className="h-8 px-3 text-xs text-blue-600"
            >
              Get Help
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function ValidationWarningToast({ 
  warning, 
  onDismiss 
}: { 
  warning: ValidationError
  onDismiss?: () => void 
}) {
  return (
    <div className="flex items-start gap-3 p-2">
      <div className="flex-shrink-0">
        <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
            Recommendation
          </p>
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            Optional
          </span>
        </div>
        <p className="text-sm text-yellow-700 dark:text-yellow-200 mt-1">
          {warning.message}
        </p>
        {onDismiss && (
          <div className="flex justify-end mt-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="h-8 px-3 text-xs text-yellow-600"
            >
              Got it
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export function ValidationSuggestionToast({ 
  suggestion, 
  onApply, 
  onDismiss 
}: { 
  suggestion: string
  onApply?: () => void
  onDismiss?: () => void 
}) {
  return (
    <div className="flex items-start gap-3 p-2">
      <div className="flex-shrink-0">
        <SparklesIcon className="w-6 h-6 text-blue-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            Six Figure Barber Experience
          </p>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            Premium
          </span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
          {suggestion}
        </p>
        <div className="flex gap-2 mt-3">
          {onApply && (
            <Button
              size="sm"
              variant="default"
              onClick={onApply}
              className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700"
            >
              Apply
            </Button>
          )}
          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="h-8 px-3 text-xs text-blue-600"
            >
              Maybe Later
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function UpsellOpportunityToast({ 
  service, 
  reason, 
  additionalRevenue, 
  onViewService, 
  onDismiss 
}: { 
  service: string
  reason: string
  additionalRevenue: number
  onViewService?: () => void
  onDismiss?: () => void 
}) {
  return (
    <div className="flex items-start gap-3 p-2">
      <div className="flex-shrink-0">
        <CurrencyDollarIcon className="w-6 h-6 text-green-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-green-900 dark:text-green-100">
            Upgrade Opportunity
          </p>
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
            +${additionalRevenue}
          </span>
        </div>
        <p className="text-sm font-medium text-green-800 dark:text-green-200 mt-1">
          {service}
        </p>
        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
          {reason}
        </p>
        <div className="flex gap-2 mt-3">
          {onViewService && (
            <Button
              size="sm"
              variant="default"
              onClick={onViewService}
              className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700"
            >
              Learn More
            </Button>
          )}
          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className="h-8 px-3 text-xs text-green-600"
            >
              Keep Current
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function ValidationSuccessToast({ 
  message, 
  nextSteps 
}: { 
  message: string
  nextSteps?: string[] 
}) {
  return (
    <div className="flex items-start gap-3 p-2">
      <div className="flex-shrink-0">
        <CheckCircleIcon className="w-6 h-6 text-green-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-green-900 dark:text-green-100">
          Validation Successful
        </p>
        <p className="text-sm text-green-700 dark:text-green-200 mt-1">
          {message}
        </p>
        {nextSteps && nextSteps.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-green-800 dark:text-green-200 mb-2">
              Next Steps:
            </p>
            <ul className="text-xs text-green-700 dark:text-green-300 space-y-1">
              {nextSteps.map((step, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

// Main toast system functions
export function showBookingValidationResults(
  validationResult: ValidationResult,
  options: {
    onRetry?: () => void
    onSuggestionClick?: (suggestion: string) => void
    onUpsellClick?: (service: string, additionalRevenue: number) => void
    onHelp?: () => void
  } = {}
) {
  const { onRetry, onSuggestionClick, onUpsellClick, onHelp } = options
  
  // Show errors first (highest priority)
  validationResult.errors.forEach((error, index) => {
    const toastId = `validation-error-${index}`
    
    toast.custom(
      (t) => (
        <ValidationErrorToast 
          error={error}
          onRetry={() => {
            toast.dismiss(toastId)
            onRetry?.()
          }}
          onHelp={() => {
            toast.dismiss(toastId)
            onHelp?.()
          }}
        />
      ),
      {
        id: toastId,
        duration: 8000,
        position: 'top-center',
        className: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
        descriptionClassName: 'text-red-700 dark:text-red-300'
      }
    )
  })
  
  // Show warnings (medium priority)
  validationResult.warnings.forEach((warning, index) => {
    const toastId = `validation-warning-${index}`
    
    toast.custom(
      (t) => (
        <ValidationWarningToast 
          warning={warning}
          onDismiss={() => toast.dismiss(toastId)}
        />
      ),
      {
        id: toastId,
        duration: 6000,
        position: 'top-center',
        className: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
        descriptionClassName: 'text-yellow-700 dark:text-yellow-300'
      }
    )
  })
  
  // Show suggestions (lower priority, staggered)
  validationResult.suggestions.forEach((suggestion, index) => {
    const toastId = `validation-suggestion-${index}`
    
    setTimeout(() => {
      toast.custom(
        (t) => (
          <ValidationSuggestionToast 
            suggestion={suggestion}
            onApply={() => {
              toast.dismiss(toastId)
              onSuggestionClick?.(suggestion)
            }}
            onDismiss={() => toast.dismiss(toastId)}
          />
        ),
        {
          id: toastId,
          duration: 5000,
          position: 'bottom-right',
          className: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
          descriptionClassName: 'text-blue-700 dark:text-blue-300'
        }
      )
    }, index * 1000) // Stagger suggestions
  })
  
  // Show upselling opportunities (lowest priority, most staggered)
  if (validationResult.errors.length === 0) { // Only show if no errors
    const upsellOpportunities = (validationResult as any).upselling_opportunities || []
    
    upsellOpportunities.forEach((opportunity: any, index: number) => {
      const toastId = `validation-upsell-${index}`
      
      setTimeout(() => {
        toast.custom(
          (t) => (
            <UpsellOpportunityToast 
              service={opportunity.service}
              reason={opportunity.reason}
              additionalRevenue={opportunity.additional_revenue}
              onViewService={() => {
                toast.dismiss(toastId)
                onUpsellClick?.(opportunity.service, opportunity.additional_revenue)
              }}
              onDismiss={() => toast.dismiss(toastId)}
            />
          ),
          {
            id: toastId,
            duration: 7000,
            position: 'bottom-right',
            className: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
            descriptionClassName: 'text-green-700 dark:text-green-300'
          }
        )
      }, (index + validationResult.suggestions.length) * 1500) // Stagger after suggestions
    })
  }
  
  // Show success message if validation passed
  if (validationResult.isValid) {
    toast.custom(
      (t) => (
        <ValidationSuccessToast 
          message="Your appointment details are validated and ready!"
          nextSteps={[
            "Arrive 10 minutes early for consultation",
            "Bring any reference photos or style ideas",
            "Enjoy your premium Six Figure Barber experience"
          ]}
        />
      ),
      {
        duration: 4000,
        position: 'top-center',
        className: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
        descriptionClassName: 'text-green-700 dark:text-green-300'
      }
    )
  }
}

// Quick toast helpers for common scenarios
export function showValidationError(message: string, field?: string, onRetry?: () => void) {
  const error: ValidationError = {
    field: field || 'general',
    message,
    severity: 'error',
    code: 'VALIDATION_ERROR'
  }
  
  toast.custom(
    (t) => <ValidationErrorToast error={error} onRetry={onRetry} />,
    {
      duration: 6000,
      position: 'top-center',
      className: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
    }
  )
}

export function showValidationSuccess(message: string, nextSteps?: string[]) {
  toast.custom(
    (t) => <ValidationSuccessToast message={message} nextSteps={nextSteps} />,
    {
      duration: 4000,
      position: 'top-center',
      className: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
    }
  )
}

export function showSixFigureBarberSuggestion(message: string, onApply?: () => void) {
  toast.custom(
    (t) => (
      <ValidationSuggestionToast 
        suggestion={message}
        onApply={onApply}
        onDismiss={() => toast.dismiss(t.id)}
      />
    ),
    {
      duration: 5000,
      position: 'bottom-right',
      className: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
    }
  )
}

// Helper function to get user-friendly field names
function getFieldDisplayName(field?: string): string {
  const fieldNames: Record<string, string> = {
    date: 'Date Selection',
    time: 'Time Selection', 
    service: 'Service Selection',
    client: 'Client Information',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email Address',
    phone: 'Phone Number',
    notes: 'Style Notes',
    recurringPattern: 'Recurring Schedule',
    barber_id: 'Barber Selection',
    general: 'Booking'
  }
  
  return fieldNames[field || 'general'] || 'Appointment'
}

// Enhanced toast configurations for different scenarios
export const VALIDATION_TOAST_CONFIGS = {
  error: {
    duration: 8000,
    position: 'top-center' as const,
    className: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    important: true
  },
  warning: {
    duration: 6000,
    position: 'top-right' as const,
    className: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
  },
  suggestion: {
    duration: 5000,
    position: 'bottom-right' as const,
    className: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
  },
  upsell: {
    duration: 7000,
    position: 'bottom-right' as const,
    className: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
  },
  success: {
    duration: 4000,
    position: 'top-center' as const,
    className: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
  }
}