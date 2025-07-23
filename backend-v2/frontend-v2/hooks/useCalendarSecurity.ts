'use client'

import { useCallback, useRef, useEffect } from 'react'
import { 
  sanitizeAppointmentData, 
  sanitizeEmail, 
  sanitizePhone,
  validators,
  rateLimiter,
  SecurityAudit,
  SecureStorage,
  type AppointmentInput 
} from '@/lib/security-utils'

interface CalendarSecurityOptions {
  enableRateLimiting?: boolean
  enableSecurityAudit?: boolean
  maxFormSubmissions?: number
  rateLimitWindow?: number
  userIdentifier?: string
}

interface SecurityValidationResult {
  isValid: boolean
  errors: string[]
  sanitizedData?: any
}

/**
 * Enhanced security hook for calendar operations
 * Provides input sanitization, validation, and security monitoring
 */
export function useCalendarSecurity(options: CalendarSecurityOptions = {}) {
  const {
    enableRateLimiting = true,
    enableSecurityAudit = true,
    maxFormSubmissions = 10,
    rateLimitWindow = 300000, // 5 minutes
    userIdentifier = 'anonymous'
  } = options

  const formSubmissionCountRef = useRef(0)
  const lastSubmissionTimeRef = useRef(0)
  
  // Security audit logging
  const auditSecurityEvent = useCallback((event: string, details: any = {}) => {
    if (enableSecurityAudit) {
      SecurityAudit.log(`Calendar: ${event}`, {
        userIdentifier,
        timestamp: Date.now(),
        ...details
      })
    }
  }, [enableSecurityAudit, userIdentifier])

  // Enhanced appointment data sanitization
  const sanitizeAndValidateAppointment = useCallback((data: AppointmentInput): SecurityValidationResult => {
    const errors: string[] = []
    
    // Sanitize all input fields
    const sanitizedData = sanitizeAppointmentData(data)
    
    // Validate sanitized data
    if (data.title && !validators.appointmentTitle(data.title)) {
      errors.push('Invalid appointment title: must be 1-200 characters')
    }
    
    if (data.client_name && !validators.clientName(data.client_name)) {
      errors.push('Invalid client name: must be 1-100 characters')
    }
    
    if (data.service_name && !validators.serviceName(data.service_name)) {
      errors.push('Invalid service name: must be 1-100 characters')
    }
    
    // Audit validation results
    if (errors.length > 0) {
      auditSecurityEvent('Validation Failed', { errors, originalData: data })
    } else {
      auditSecurityEvent('Data Sanitized', { fieldsProcessed: Object.keys(sanitizedData).length })
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined
    }
  }, [auditSecurityEvent])

  // Enhanced contact information sanitization
  const sanitizeContactInfo = useCallback((email?: string, phone?: string): SecurityValidationResult => {
    const errors: string[] = []
    const sanitizedData: { email?: string; phone?: string } = {}
    
    if (email) {
      const sanitizedEmail = sanitizeEmail(email)
      if (!sanitizedEmail) {
        errors.push('Invalid email format')
      } else {
        sanitizedData.email = sanitizedEmail
      }
    }
    
    if (phone) {
      const sanitizedPhone = sanitizePhone(phone)
      if (!sanitizedPhone) {
        errors.push('Invalid phone number format')
      } else {
        sanitizedData.phone = sanitizedPhone
      }
    }
    
    auditSecurityEvent('Contact Info Sanitized', { 
      hasEmail: !!email, 
      hasPhone: !!phone, 
      validEmail: !!sanitizedData.email,
      validPhone: !!sanitizedData.phone
    })
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined
    }
  }, [auditSecurityEvent])

  // Rate limiting check
  const checkRateLimit = useCallback((action: string): boolean => {
    if (!enableRateLimiting) return false
    
    const identifier = `${userIdentifier}_${action}`
    const isLimited = rateLimiter.isRateLimited(identifier, maxFormSubmissions, rateLimitWindow)
    
    if (isLimited) {
      auditSecurityEvent('Rate Limit Exceeded', { 
        action, 
        maxAttempts: maxFormSubmissions,
        windowMs: rateLimitWindow
      })
    }
    
    return isLimited
  }, [enableRateLimiting, userIdentifier, maxFormSubmissions, rateLimitWindow, auditSecurityEvent])

  // Secure form submission handler
  const secureFormSubmission = useCallback(async (
    formData: any,
    submitFunction: (data: any) => Promise<any>,
    actionName: string = 'form_submission'
  ): Promise<{ success: boolean; data?: any; error?: string }> => {
    
    // Check rate limiting
    if (checkRateLimit(actionName)) {
      return {
        success: false,
        error: 'Too many requests. Please wait before trying again.'
      }
    }
    
    // Validate and sanitize appointment data
    const validation = sanitizeAndValidateAppointment(formData)
    
    if (!validation.isValid) {
      auditSecurityEvent('Form Submission Blocked', { 
        action: actionName,
        errors: validation.errors
      })
      
      return {
        success: false,
        error: validation.errors.join(', ')
      }
    }
    
    try {
      auditSecurityEvent('Form Submission Started', { action: actionName })
      
      const result = await submitFunction(validation.sanitizedData)
      
      auditSecurityEvent('Form Submission Success', { 
        action: actionName,
        resultType: typeof result
      })
      
      return {
        success: true,
        data: result
      }
    } catch (error: any) {
      auditSecurityEvent('Form Submission Error', { 
        action: actionName,
        error: error.message || 'Unknown error'
      })
      
      return {
        success: false,
        error: 'Submission failed. Please try again.'
      }
    }
  }, [checkRateLimit, sanitizeAndValidateAppointment, auditSecurityEvent])

  // Secure data storage for calendar preferences
  const secureStorageOperations = {
    saveCalendarPreferences: (preferences: any) => {
      const validation = {
        isValid: true,
        errors: [],
        sanitizedData: preferences
      }
      
      // Validate preferences object
      if (typeof preferences !== 'object') {
        validation.isValid = false
        validation.errors.push('Invalid preferences format')
      }
      
      if (validation.isValid) {
        SecureStorage.setItem('calendar_preferences', validation.sanitizedData)
        auditSecurityEvent('Preferences Saved', { keysCount: Object.keys(preferences).length })
      }
      
      return validation
    },
    
    loadCalendarPreferences: () => {
      const preferences = SecureStorage.getItem('calendar_preferences')
      auditSecurityEvent('Preferences Loaded', { found: !!preferences })
      return preferences
    },
    
    clearCalendarData: () => {
      SecureStorage.removeItem('calendar_preferences')
      auditSecurityEvent('Calendar Data Cleared', {})
    }
  }

  // Security monitoring
  const getSecurityMetrics = useCallback(() => {
    return {
      formSubmissions: formSubmissionCountRef.current,
      lastSubmission: lastSubmissionTimeRef.current,
      auditLogs: SecurityAudit.getLogs().filter(log => log.event.startsWith('Calendar:')),
      rateLimitStatus: {
        enabled: enableRateLimiting,
        maxSubmissions: maxFormSubmissions,
        windowMs: rateLimitWindow
      }
    }
  }, [enableRateLimiting, maxFormSubmissions, rateLimitWindow])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear sensitive data from memory
      formSubmissionCountRef.current = 0
      lastSubmissionTimeRef.current = 0
    }
  }, [])

  // Initialize security monitoring
  useEffect(() => {
    auditSecurityEvent('Security Hook Initialized', {
      rateLimitingEnabled: enableRateLimiting,
      auditEnabled: enableSecurityAudit
    })
  }, [auditSecurityEvent, enableRateLimiting, enableSecurityAudit])

  return {
    // Sanitization functions
    sanitizeAndValidateAppointment,
    sanitizeContactInfo,
    
    // Security checks
    checkRateLimit,
    secureFormSubmission,
    
    // Secure storage
    secureStorage: secureStorageOperations,
    
    // Monitoring
    getSecurityMetrics,
    auditSecurityEvent,
    
    // Utilities
    isRateLimited: (action: string) => checkRateLimit(action)
  }
}