/**
 * Booking Link Handler Component
 * 
 * This component handles URL parameter parsing and pre-population
 * of booking form fields from customizable booking links.
 */

'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { parseBookingURL, validateBookingParams } from '../../lib/booking-link-generator'
import { BookingLinkParams, ValidationResult } from '../../types/booking-links'

interface BookingLinkHandlerProps {
  onParametersLoaded: (params: BookingLinkParams) => void
  onValidationResult: (result: ValidationResult) => void
  children?: React.ReactNode | ((helpers: any) => React.ReactNode)
}

interface BookingState {
  isLoading: boolean
  parameters: BookingLinkParams
  validation: ValidationResult | null
  hasUrlParams: boolean
  errors: string[]
}

export default function BookingLinkHandler({
  onParametersLoaded,
  onValidationResult,
  children,
}: BookingLinkHandlerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = useState<BookingState>({
    isLoading: true,
    parameters: {},
    validation: null,
    hasUrlParams: false,
    errors: [],
  })

  // Parse URL parameters on mount and when search params change
  useEffect(() => {
    const parseUrlParameters = () => {
      try {
        const currentUrl = window.location.href
        const parsed = parseBookingURL(currentUrl)
        
        // Validate the parsed parameters
        const validation = validateBookingParams(parsed.params)
        
        // Check if we have any meaningful parameters
        const hasUrlParams = Object.keys(parsed.params).length > 0
        
        setState({
          isLoading: false,
          parameters: parsed.params,
          validation,
          hasUrlParams,
          errors: validation.errors,
        })

        // Notify parent components
        onParametersLoaded(parsed.params)
        onValidationResult(validation)

        // If there are validation errors, show a warning but continue
        if (!validation.isValid && hasUrlParams) {
          }

        // If there are warnings, log them
        if (validation.warnings.length > 0) {
          }

      } catch (error) {
        setState({
          isLoading: false,
          parameters: {},
          validation: null,
          hasUrlParams: false,
          errors: ['Failed to parse URL parameters'],
        })
      }
    }

    parseUrlParameters()
  }, [searchParams, onParametersLoaded, onValidationResult])

  // Memoized helper functions for accessing specific parameter types
  const helpers = useMemo(() => ({
    // Service helpers
    getSelectedService: (): string | null => {
      if (Array.isArray(state.parameters.service)) {
        return state.parameters.service[0] || null
      }
      return state.parameters.service || null
    },

    getSelectedServices: (): string[] => {
      if (Array.isArray(state.parameters.service)) {
        return state.parameters.service
      }
      return state.parameters.service ? [state.parameters.service] : []
    },

    // Barber helpers
    getSelectedBarber: (): string | null => {
      if (Array.isArray(state.parameters.barber)) {
        return state.parameters.barber[0] || null
      }
      return state.parameters.barber || null
    },

    getSelectedBarbers: (): string[] => {
      if (Array.isArray(state.parameters.barber)) {
        return state.parameters.barber
      }
      return state.parameters.barber ? [state.parameters.barber] : []
    },

    // Date helpers
    getSelectedDate: (): Date | null => {
      if (state.parameters.date) {
        try {
          return new Date(state.parameters.date)
        } catch {
          return null
        }
      }
      return null
    },

    getDateRange: (): { start: Date; end: Date } | null => {
      if (state.parameters.dateRange) {
        try {
          const [start, end] = state.parameters.dateRange.split(',')
          return {
            start: new Date(start),
            end: new Date(end),
          }
        } catch {
          return null
        }
      }
      return null
    },

    // Time helpers
    getSelectedTime: (): string | null => {
      return state.parameters.time || null
    },

    getTimeRange: (): { start: string; end: string } | null => {
      if (state.parameters.timeRange) {
        const [start, end] = state.parameters.timeRange.split(',')
        return { start: start || '', end: end || '' }
      }
      return null
    },

    // Constraint helpers
    getLeadTime: (): number => {
      return state.parameters.leadTime || 0
    },

    getMaxAdvance: (): number => {
      return state.parameters.maxAdvance || 90
    },

    getDuration: (): number => {
      return state.parameters.duration || 30
    },

    // Booking preference helpers
    isQuickBooking: (): boolean => {
      return state.parameters.quickBook === true
    },

    isRecurring: (): boolean => {
      return state.parameters.recurring === true
    },

    getFrequency: (): string | null => {
      return state.parameters.frequency || null
    },

    // Client information helpers
    getClientInfo: () => ({
      name: state.parameters.name || '',
      email: state.parameters.email || '',
      phone: state.parameters.phone || '',
    }),

    // Tracking helpers
    getTrackingInfo: () => ({
      ref: state.parameters.ref || '',
      campaign: state.parameters.campaign || '',
      source: state.parameters.source || '',
      medium: state.parameters.medium || '',
      utm_source: state.parameters.utm_source || '',
      utm_medium: state.parameters.utm_medium || '',
      utm_campaign: state.parameters.utm_campaign || '',
      utm_term: state.parameters.utm_term || '',
      utm_content: state.parameters.utm_content || '',
    }),

    // Special options helpers
    getSpecialOptions: () => ({
      giftCertificate: state.parameters.giftCertificate || '',
      coupon: state.parameters.coupon || '',
      package: state.parameters.package || '',
    }),

    // Custom fields helper
    getCustomFields: (): Record<string, string> => {
      return state.parameters.custom || {}
    },

    // URL cleaning helper
    cleanUrl: (): void => {
      // Remove URL parameters while keeping the base path
      const newUrl = window.location.pathname
      router.replace(newUrl, { scroll: false })
    },

    // Parameter update helper
    updateUrlParams: (newParams: Partial<BookingLinkParams>): void => {
      const currentParams = new URLSearchParams(window.location.search)
      
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          currentParams.delete(key)
        } else if (Array.isArray(value)) {
          currentParams.set(key, value.join(','))
        } else {
          currentParams.set(key, String(value))
        }
      })

      const newSearch = currentParams.toString()
      const newUrl = newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname
      
      router.replace(newUrl, { scroll: false })
    },
  }), [state.parameters, router])

  // Loading state
  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
        <span className="ml-2 text-sm text-gray-600">Loading booking parameters...</span>
      </div>
    )
  }

  // Error state
  if (state.errors.length > 0 && state.hasUrlParams) {
    return (
      <div className="p-4 mb-4 border border-red-200 rounded-lg bg-red-50">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Booking URL Issues
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <ul className="list-disc list-inside">
                {state.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
            <div className="mt-3">
              <button
                onClick={helpers.cleanUrl}
                className="text-sm font-medium text-red-800 hover:text-red-900 underline"
              >
                Continue with clean URL
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Validation warnings
  const showWarnings = state.validation?.warnings.length && state.validation.warnings.length > 0

  return (
    <>
      {showWarnings && (
        <div className="p-4 mb-4 border border-yellow-200 rounded-lg bg-yellow-50">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Booking URL Warnings
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside">
                  {state.validation?.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success indicator for valid URL parameters */}
      {state.hasUrlParams && state.validation?.isValid && (
        <div className="p-3 mb-4 border border-green-200 rounded-lg bg-green-50">
          <div className="flex items-center">
            <svg className="h-4 w-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-green-800">
              Booking preferences loaded from URL
            </span>
            {state.parameters.campaign && (
              <span className="ml-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                Campaign: {state.parameters.campaign}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Provide helper functions to children */}
      {children && typeof children === 'function' 
        ? children({ ...helpers, parameters: state.parameters, isLoading: state.isLoading })
        : children
      }
    </>
  )
}

// Hook for using booking link parameters in functional components
export function useBookingLinkParams() {
  const [parameters, setParameters] = useState<BookingLinkParams>({})
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const parseUrlParameters = () => {
      try {
        const currentUrl = window.location.href
        const parsed = parseBookingURL(currentUrl)
        const validationResult = validateBookingParams(parsed.params)
        
        setParameters(parsed.params)
        setValidation(validationResult)
        setIsLoading(false)
      } catch (error) {
        setParameters({})
        setValidation(null)
        setIsLoading(false)
      }
    }

    parseUrlParameters()
  }, [])

  return {
    parameters,
    validation,
    isLoading,
    isValid: validation?.isValid || false,
    errors: validation?.errors || [],
    warnings: validation?.warnings || [],
    hasParams: Object.keys(parameters).length > 0,
  }
}

// Helper component for displaying parameter information
export function BookingParameterDisplay({ parameters }: { parameters: BookingLinkParams }) {
  if (Object.keys(parameters).length === 0) {
    return null
  }

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
      <h3 className="text-sm font-medium text-gray-900 mb-2">URL Parameters</h3>
      <div className="space-y-1">
        {Object.entries(parameters).map(([key, value]) => (
          <div key={key} className="flex text-xs">
            <span className="font-medium text-gray-600 w-20">{key}:</span>
            <span className="text-gray-800">
              {Array.isArray(value) ? value.join(', ') : String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}