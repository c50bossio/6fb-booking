/**
 * Enhanced Error Message System for BookedBarber V2
 * Provides user-friendly, contextual, and actionable error messages
 */

export interface EnhancedErrorMessage {
  title: string
  message: string
  explanation: string
  nextSteps: string[]
  technicalDetails?: string
  isRecoverable: boolean
  category: 'network' | 'auth' | 'validation' | 'server' | 'rate-limit' | 'permission' | 'business'
}

export interface ErrorContext {
  endpoint?: string
  action?: string
  userType?: string
  feature?: string
}

/**
 * Maps HTTP status codes and error types to user-friendly messages
 */
export function getEnhancedErrorMessage(
  statusCode: number,
  errorData: any = {},
  context: ErrorContext = {}
): EnhancedErrorMessage {
  const { endpoint, action, userType, feature } = context

  // Network and connectivity errors
  if (statusCode === 0 || statusCode >= 1000) {
    return {
      title: 'Connection Problem',
      message: 'Unable to connect to BookedBarber servers',
      explanation: 'This could be due to a temporary network issue or server maintenance.',
      nextSteps: [
        'Check your internet connection',
        'Try refreshing the page',
        'Wait a few minutes and try again',
        'Contact support if the problem persists'
      ],
      technicalDetails: `Network error: Status ${statusCode}`,
      isRecoverable: true,
      category: 'network'
    }
  }

  // Authentication errors (401)
  if (statusCode === 401) {
    if (endpoint?.includes('/login')) {
      return {
        title: 'Login Failed',
        message: 'Incorrect email or password',
        explanation: 'The email and password combination you entered doesn\'t match our records.',
        nextSteps: [
          'Double-check your email address for typos',
          'Verify your password is correct',
          'Try using "Forgot Password" if you can\'t remember',
          'Contact support if you continue having trouble'
        ],
        technicalDetails: errorData.detail || 'Authentication failed',
        isRecoverable: true,
        category: 'auth'
      }
    }

    if (errorData.detail?.includes('not verified') || errorData.detail?.includes('verification')) {
      return {
        title: 'Email Not Verified',
        message: 'Please verify your email address to continue',
        explanation: 'We sent a verification link to your email when you registered. You need to click that link before you can log in.',
        nextSteps: [
          'Check your email inbox for the verification link',
          'Check your spam/junk folder',
          'Click "Resend Verification" to get a new link',
          'Contact support if you can\'t find the email'
        ],
        technicalDetails: errorData.detail,
        isRecoverable: true,
        category: 'auth'
      }
    }

    return {
      title: 'Session Expired',
      message: 'You need to log in again',
      explanation: 'Your login session has expired for security reasons.',
      nextSteps: [
        'Click "Login" to sign in again',
        'Your work has been saved automatically',
        'Consider staying logged in for convenience'
      ],
      technicalDetails: errorData.detail || 'Authentication token expired',
      isRecoverable: true,
      category: 'auth'
    }
  }

  // Permission errors (403)
  if (statusCode === 403) {
    if (userType === 'client' && feature === 'admin') {
      return {
        title: 'Access Restricted',
        message: 'This feature is only available to barbers and shop owners',
        explanation: 'You\'re logged in as a client, but this page requires barber or admin privileges.',
        nextSteps: [
          'Contact your barber or shop owner for assistance',
          'Switch to your barber account if you have one',
          'Return to your client dashboard'
        ],
        technicalDetails: 'Insufficient permissions for role: client',
        isRecoverable: false,
        category: 'permission'
      }
    }

    return {
      title: 'Permission Denied',
      message: 'You don\'t have permission to perform this action',
      explanation: 'Your account type doesn\'t include access to this feature or data.',
      nextSteps: [
        'Contact your shop owner or administrator',
        'Check if you need a subscription upgrade',
        'Return to your dashboard'
      ],
      technicalDetails: errorData.detail || 'Access forbidden',
      isRecoverable: false,
      category: 'permission'
    }
  }

  // Not found errors (404)
  if (statusCode === 404) {
    if (endpoint?.includes('/appointments/')) {
      return {
        title: 'Appointment Not Found',
        message: 'This appointment doesn\'t exist or has been removed',
        explanation: 'The appointment you\'re looking for may have been cancelled, rescheduled, or deleted.',
        nextSteps: [
          'Check your appointments list for updates',
          'Contact the barbershop if you believe this is a mistake',
          'Book a new appointment if needed'
        ],
        technicalDetails: `Appointment not found: ${endpoint}`,
        isRecoverable: false,
        category: 'business'
      }
    }

    return {
      title: 'Page Not Found',
      message: 'The page or resource you\'re looking for doesn\'t exist',
      explanation: 'This could be due to a broken link, or the content may have been moved or deleted.',
      nextSteps: [
        'Check the web address for typos',
        'Use the navigation menu to find what you need',
        'Return to your dashboard',
        'Contact support if you followed a link from our site'
      ],
      technicalDetails: `404 Not Found: ${endpoint || 'Unknown URL'}`,
      isRecoverable: false,
      category: 'network'
    }
  }

  // Validation errors (422)
  if (statusCode === 422) {
    if (Array.isArray(errorData.detail)) {
      const validationErrors = errorData.detail.map((err: any) => err.msg || err.message).join(', ')
      return {
        title: 'Invalid Information',
        message: 'Please check the information you entered',
        explanation: 'Some of the information you provided doesn\'t meet our requirements.',
        nextSteps: [
          'Review all form fields for errors',
          'Ensure required fields are filled out',
          'Check format requirements (email, phone, etc.)',
          'Try submitting again after corrections'
        ],
        technicalDetails: validationErrors,
        isRecoverable: true,
        category: 'validation'
      }
    }

    if (action === 'registration' || endpoint?.includes('/register')) {
      return {
        title: 'Registration Error',
        message: 'Unable to create your account',
        explanation: 'There was a problem with the information you provided during registration.',
        nextSteps: [
          'Check that your email address is valid and unique',
          'Ensure your password meets security requirements',
          'Verify all required fields are completed',
          'Try using a different email address if the current one is taken'
        ],
        technicalDetails: errorData.detail || 'Registration validation failed',
        isRecoverable: true,
        category: 'validation'
      }
    }

    return {
      title: 'Invalid Request',
      message: 'The information provided is not valid',
      explanation: 'Please check your input and try again.',
      nextSteps: [
        'Review the form for any validation errors',
        'Ensure all required fields are filled',
        'Check that dates and times are valid'
      ],
      technicalDetails: errorData.detail || 'Validation error',
      isRecoverable: true,
      category: 'validation'
    }
  }

  // Rate limiting (429)
  if (statusCode === 429) {
    const retryAfter = errorData.retry_after || 60
    return {
      title: 'Too Many Requests',
      message: 'Please slow down and try again in a moment',
      explanation: 'You\'ve made too many requests in a short time period. This helps protect our service for everyone.',
      nextSteps: [
        `Wait ${retryAfter} seconds before trying again`,
        'Avoid clicking buttons multiple times',
        'Contact support if you think this is a mistake'
      ],
      technicalDetails: `Rate limit exceeded. Retry after ${retryAfter} seconds`,
      isRecoverable: true,
      category: 'rate-limit'
    }
  }

  // Server errors (500+)
  if (statusCode >= 500) {
    if (action === 'payment' || endpoint?.includes('/payment')) {
      return {
        title: 'Payment Processing Error',
        message: 'Unable to process your payment right now',
        explanation: 'There\'s a temporary issue with our payment system. Your card has not been charged.',
        nextSteps: [
          'Wait a few minutes and try again',
          'Check your payment method is valid',
          'Try a different payment method',
          'Contact support if the problem continues'
        ],
        technicalDetails: `Payment server error: ${statusCode}`,
        isRecoverable: true,
        category: 'server'
      }
    }

    if (action === 'booking' || endpoint?.includes('/appointment')) {
      return {
        title: 'Booking System Error',
        message: 'Unable to process your booking right now',
        explanation: 'There\'s a temporary issue with our booking system. Please try again in a few minutes.',
        nextSteps: [
          'Wait 2-3 minutes and try again',
          'Check if your appointment was actually created',
          'Call the barbershop directly if urgent',
          'Contact support if the problem persists'
        ],
        technicalDetails: `Booking server error: ${statusCode}`,
        isRecoverable: true,
        category: 'server'
      }
    }

    return {
      title: 'Server Error',
      message: 'Something went wrong on our end',
      explanation: 'We\'re experiencing technical difficulties. Our team has been notified and is working on a fix.',
      nextSteps: [
        'Wait a few minutes and try again',
        'Refresh the page',
        'Check our status page for updates',
        'Contact support if you need immediate assistance'
      ],
      technicalDetails: `Server error: ${statusCode} ${errorData.detail || ''}`,
      isRecoverable: true,
      category: 'server'
    }
  }

  // Conflict errors (409)
  if (statusCode === 409) {
    if (endpoint?.includes('/appointment') || action === 'booking') {
      return {
        title: 'Time Slot Unavailable',
        message: 'This appointment time is no longer available',
        explanation: 'Someone else booked this time slot while you were completing your booking.',
        nextSteps: [
          'Choose a different time slot',
          'Check for nearby available times',
          'Call the barbershop for immediate assistance'
        ],
        technicalDetails: 'Appointment slot conflict',
        isRecoverable: true,
        category: 'business'
      }
    }

    return {
      title: 'Conflict Error',
      message: 'This action conflicts with existing data',
      explanation: 'The changes you\'re trying to make conflict with something that already exists.',
      nextSteps: [
        'Refresh the page to see current data',
        'Choose different values',
        'Contact support if you\'re confused'
      ],
      technicalDetails: errorData.detail || 'Data conflict',
      isRecoverable: true,
      category: 'business'
    }
  }

  // Generic client errors (400-499)
  if (statusCode >= 400 && statusCode < 500) {
    return {
      title: 'Request Error',
      message: 'There was a problem with your request',
      explanation: 'The information sent to our servers wasn\'t formatted correctly.',
      nextSteps: [
        'Try refreshing the page',
        'Double-check all form fields',
        'Contact support if the problem continues'
      ],
      technicalDetails: errorData.detail || `HTTP ${statusCode}`,
      isRecoverable: true,
      category: 'validation'
    }
  }

  // Fallback for unknown errors
  return {
    title: 'Unexpected Error',
    message: 'Something unexpected happened',
    explanation: 'We encountered an error we haven\'t seen before. Our team will investigate.',
    nextSteps: [
      'Try refreshing the page',
      'Clear your browser cache',
      'Contact support with details about what you were doing'
    ],
    technicalDetails: `Unknown error: ${statusCode} ${JSON.stringify(errorData)}`,
    isRecoverable: true,
    category: 'server'
  }
}

/**
 * Creates contextual error messages for specific business operations
 */
export function getBusinessContextError(
  operation: string,
  error: any,
  additionalContext?: Record<string, any>
): EnhancedErrorMessage {
  const statusCode = error.status || error.response?.status || 500
  
  const context: ErrorContext = {
    action: operation,
    ...additionalContext
  }

  return getEnhancedErrorMessage(statusCode, error, context)
}

/**
 * Helper to format error messages for toast notifications
 */
export function formatErrorForToast(enhancedError: EnhancedErrorMessage) {
  return {
    title: enhancedError.title,
    description: enhancedError.message,
    variant: 'destructive' as const
  }
}

/**
 * Helper to create user-friendly error messages from API responses
 */
export function formatApiError(error: any, context: ErrorContext = {}): string {
  const enhancedError = getEnhancedErrorMessage(
    error.status || error.response?.status || 500,
    error.response?.data || error,
    context
  )
  
  return `${enhancedError.message}. ${enhancedError.explanation}`
}