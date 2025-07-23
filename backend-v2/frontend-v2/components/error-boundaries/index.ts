// Error Boundary Components
export { 
  AnalyticsErrorBoundary, 
  withAnalyticsErrorBoundary, 
  AnalyticsErrorFallback 
} from './AnalyticsErrorBoundary'

export { 
  BookingErrorBoundary, 
  withBookingErrorBoundary, 
  BookingErrorFallback 
} from './BookingErrorBoundary'

export { 
  PaymentErrorBoundary, 
  withPaymentErrorBoundary, 
  PaymentErrorFallback 
} from './PaymentErrorBoundary'

export { 
  FormErrorBoundary, 
  withFormErrorBoundary, 
  FormErrorFallback 
} from './FormErrorBoundary'

// Re-export existing calendar error boundary for consistency
export { 
  CalendarErrorBoundary, 
  withCalendarErrorBoundary, 
  CalendarErrorFallback 
} from '../calendar/CalendarErrorBoundary'

// Re-export general error boundary
export { ErrorBoundary, withErrorBoundary } from '../ErrorBoundary'

// Standardized Error Boundary Factory - NEW RECOMMENDED APPROACH
export { 
  StandardErrorBoundary,
  withStandardErrorBoundary,
  useErrorBoundaryContext,
  getErrorBoundaryType,
  BookingBoundary,
  PaymentBoundary,
  AnalyticsBoundary,
  FormBoundary,
  GeneralBoundary
} from './ErrorBoundaryFactory'

export type { 
  ErrorBoundaryType, 
  ErrorBoundaryContext, 
  StandardErrorBoundaryProps 
} from './ErrorBoundaryFactory'