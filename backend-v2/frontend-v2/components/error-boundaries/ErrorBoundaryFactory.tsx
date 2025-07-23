'use client'

import React, { ReactNode } from 'react'
import { ErrorBoundary } from '../ErrorBoundary'
import { BookingErrorBoundary } from './BookingErrorBoundary'
import { PaymentErrorBoundary } from './PaymentErrorBoundary'
import { AnalyticsErrorBoundary } from './AnalyticsErrorBoundary'
import { FormErrorBoundary } from './FormErrorBoundary'

// Standardized error boundary types
export type ErrorBoundaryType = 
  | 'general'
  | 'booking'
  | 'payment'
  | 'analytics'
  | 'form'
  | 'calendar'
  | 'dashboard'
  | 'auth'

// Context information for different error boundary types
export interface ErrorBoundaryContext {
  feature?: string
  userId?: string
  component?: string
  
  // Booking-specific context
  bookingStep?: number
  selectedService?: string
  selectedDate?: string
  selectedTime?: string
  isGuestBooking?: boolean
  
  // Payment-specific context
  paymentAmount?: number
  paymentMethod?: string
  paymentIntentId?: string
  
  // Analytics-specific context
  analyticsType?: string
  dateRange?: string
  filters?: Record<string, any>
  
  // Form-specific context
  formId?: string
  fieldErrors?: Record<string, string>
  
  // Additional metadata
  metadata?: Record<string, any>
}

// Props for the factory-created error boundary
export interface StandardErrorBoundaryProps {
  children: ReactNode
  type: ErrorBoundaryType
  context?: ErrorBoundaryContext
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
}

/**
 * Standardized Error Boundary Factory
 * 
 * Creates the appropriate error boundary based on the feature type.
 * Ensures consistent error handling patterns across the application.
 */
export function StandardErrorBoundary({
  children,
  type,
  context = {},
  fallback,
  onError,
  resetKeys,
  resetOnPropsChange = false
}: StandardErrorBoundaryProps) {
  
  // Add common context information
  const enhancedContext = {
    ...context,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    url: typeof window !== 'undefined' ? window.location.href : undefined
  }
  
  switch (type) {
    case 'booking':
      return (
        <BookingErrorBoundary
          contextInfo={{
            bookingStep: enhancedContext.bookingStep,
            selectedService: enhancedContext.selectedService,
            selectedDate: enhancedContext.selectedDate,
            selectedTime: enhancedContext.selectedTime,
            userId: enhancedContext.userId,
            isGuestBooking: enhancedContext.isGuestBooking
          }}
          fallback={fallback}
          onError={onError}
          resetKeys={resetKeys}
          resetOnPropsChange={resetOnPropsChange}
        >
          {children}
        </BookingErrorBoundary>
      )
    
    case 'payment':
      return (
        <PaymentErrorBoundary
          contextInfo={{
            paymentAmount: enhancedContext.paymentAmount,
            paymentMethod: enhancedContext.paymentMethod,
            paymentIntentId: enhancedContext.paymentIntentId,
            userId: enhancedContext.userId
          }}
          fallback={fallback}
          onError={onError}
          resetKeys={resetKeys}
          resetOnPropsChange={resetOnPropsChange}
        >
          {children}
        </PaymentErrorBoundary>
      )
    
    case 'analytics':
      return (
        <AnalyticsErrorBoundary
          contextInfo={{
            analyticsType: enhancedContext.analyticsType,
            dateRange: enhancedContext.dateRange,
            filters: enhancedContext.filters,
            userId: enhancedContext.userId
          }}
          fallback={fallback}
          onError={onError}
          resetKeys={resetKeys}
          resetOnPropsChange={resetOnPropsChange}
        >
          {children}
        </AnalyticsErrorBoundary>
      )
    
    case 'form':
      return (
        <FormErrorBoundary
          contextInfo={{
            formId: enhancedContext.formId,
            fieldErrors: enhancedContext.fieldErrors,
            userId: enhancedContext.userId
          }}
          fallback={fallback}
          onError={onError}
          resetKeys={resetKeys}
          resetOnPropsChange={resetOnPropsChange}
        >
          {children}
        </FormErrorBoundary>
      )
    
    case 'general':
    case 'calendar':
    case 'dashboard':
    case 'auth':
    default:
      return (
        <ErrorBoundary
          feature={enhancedContext.feature || type}
          userId={enhancedContext.userId}
          fallback={fallback}
          onError={onError}
          resetKeys={resetKeys}
          resetOnPropsChange={resetOnPropsChange}
        >
          {children}
        </ErrorBoundary>
      )
  }
}

/**
 * Higher-Order Component for automatic error boundary wrapping
 */
export function withStandardErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  type: ErrorBoundaryType,
  defaultContext?: Partial<ErrorBoundaryContext>
) {
  const displayName = Component.displayName || Component.name || 'Component'
  
  const WrappedComponent = (props: P & { errorBoundaryContext?: ErrorBoundaryContext }) => {
    const { errorBoundaryContext, ...componentProps } = props
    
    const context = {
      ...defaultContext,
      ...errorBoundaryContext,
      component: displayName
    }
    
    return (
      <StandardErrorBoundary type={type} context={context}>
        <Component {...(componentProps as P)} />
      </StandardErrorBoundary>
    )
  }
  
  WrappedComponent.displayName = `withStandardErrorBoundary(${displayName})`
  
  return WrappedComponent
}

/**
 * React Hook for error boundary context
 */
export function useErrorBoundaryContext(): ErrorBoundaryContext {
  const [context, setContext] = React.useState<ErrorBoundaryContext>({})
  
  const updateContext = React.useCallback((updates: Partial<ErrorBoundaryContext>) => {
    setContext(prev => ({ ...prev, ...updates }))
  }, [])
  
  const resetContext = React.useCallback(() => {
    setContext({})
  }, [])
  
  return {
    ...context,
    updateContext,
    resetContext
  } as ErrorBoundaryContext & {
    updateContext: (updates: Partial<ErrorBoundaryContext>) => void
    resetContext: () => void
  }
}

/**
 * Utility function to determine the appropriate error boundary type
 */
export function getErrorBoundaryType(pathname: string, feature?: string): ErrorBoundaryType {
  if (feature) {
    if (feature.includes('booking') || feature.includes('appointment')) return 'booking'
    if (feature.includes('payment') || feature.includes('checkout')) return 'payment'
    if (feature.includes('analytics') || feature.includes('reporting')) return 'analytics'
    if (feature.includes('form') || feature.includes('input')) return 'form'
  }
  
  // Path-based detection
  if (pathname.includes('/book') || pathname.includes('/appointment')) return 'booking'
  if (pathname.includes('/payment') || pathname.includes('/checkout')) return 'payment'
  if (pathname.includes('/analytics') || pathname.includes('/report')) return 'analytics'
  if (pathname.includes('/calendar')) return 'calendar'
  if (pathname.includes('/dashboard')) return 'dashboard'
  if (pathname.includes('/login') || pathname.includes('/register')) return 'auth'
  
  return 'general'
}

/**
 * Pre-configured error boundaries for common use cases
 */
export const BookingBoundary = ({ children, context }: { 
  children: ReactNode
  context?: ErrorBoundaryContext 
}) => (
  <StandardErrorBoundary type="booking" context={context}>
    {children}
  </StandardErrorBoundary>
)

export const PaymentBoundary = ({ children, context }: { 
  children: ReactNode
  context?: ErrorBoundaryContext 
}) => (
  <StandardErrorBoundary type="payment" context={context}>
    {children}
  </StandardErrorBoundary>
)

export const AnalyticsBoundary = ({ children, context }: { 
  children: ReactNode
  context?: ErrorBoundaryContext 
}) => (
  <StandardErrorBoundary type="analytics" context={context}>
    {children}
  </StandardErrorBoundary>
)

export const FormBoundary = ({ children, context }: { 
  children: ReactNode
  context?: ErrorBoundaryContext 
}) => (
  <StandardErrorBoundary type="form" context={context}>
    {children}
  </StandardErrorBoundary>
)

export const GeneralBoundary = ({ children, context }: { 
  children: ReactNode
  context?: ErrorBoundaryContext 
}) => (
  <StandardErrorBoundary type="general" context={context}>
    {children}
  </StandardErrorBoundary>
)