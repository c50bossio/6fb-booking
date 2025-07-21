'use client'

import React, { useEffect, useCallback } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import ValidatedInput from '@/components/ui/ValidatedInput'
import FormValidationProgress from '@/components/ui/FormValidationProgress'
import { useProgressiveValidation, FieldConfig } from '@/hooks/useProgressiveValidation'
import { logger } from '@/lib/logger'
import { 
  getRegionAria,
  getButtonAria,
  ScreenReaderOnly,
  SCREEN_READER_INSTRUCTIONS
} from '@/lib/accessibility'

export interface GuestInfo {
  name: string
  email: string
  phone: string
}

export interface ProgressiveGuestFormProps {
  guestInfo: GuestInfo
  onGuestInfoChange: (guestInfo: GuestInfo) => void
  onSubmit: () => Promise<void>
  onBack: () => void
  loading: boolean
  error?: string
  className?: string
  showProgress?: boolean
}

// Form field configurations with validation rules
const FORM_FIELDS: FieldConfig[] = [
  {
    name: 'name',
    label: 'Full Name',
    rules: {
      required: true,
      minLength: 2,
      maxLength: 100,
      custom: (value: string) => {
        // Check for at least first and last name
        const trimmed = value.trim()
        const parts = trimmed.split(/\s+/)
        if (parts.length < 2) {
          return 'Please enter your first and last name'
        }
        // Check for reasonable name characters
        if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
          return 'Please use only letters, spaces, apostrophes, and hyphens'
        }
        return null
      }
    },
    validateOnChange: true,
    validateOnBlur: true,
    debounceMs: 500
  },
  {
    name: 'email',
    label: 'Email Address',
    rules: {
      required: true,
      email: true,
      maxLength: 255,
      custom: (value: string) => {
        // Additional email validation beyond basic format
        const trimmed = value.trim().toLowerCase()
        
        // Check for common typos in domains
        const commonDomainTypos = [
          'gmial.com', 'gmai.com', 'yahooo.com', 'hotmial.com'
        ]
        if (commonDomainTypos.some(typo => trimmed.includes(typo))) {
          return 'Please check your email address for typos'
        }
        
        // Check for reasonable length
        if (trimmed.length > 254) {
          return 'Email address is too long'
        }
        
        return null
      }
    },
    validateOnChange: true,
    validateOnBlur: true,
    debounceMs: 300
  },
  {
    name: 'phone',
    label: 'Phone Number',
    rules: {
      required: true,
      phone: true,
      custom: (value: string) => {
        // Remove all non-digit characters for validation
        const digitsOnly = value.replace(/\D/g, '')
        
        // Check for US phone number format
        if (digitsOnly.length === 10) {
          // US format without country code
          return null
        } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
          // US format with country code
          return null
        } else if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
          // International format
          return null
        }
        
        return 'Please enter a valid phone number (e.g., (555) 123-4567)'
      }
    },
    validateOnChange: true,
    validateOnBlur: true,
    debounceMs: 500
  }
]

export default function ProgressiveGuestForm({
  guestInfo,
  onGuestInfoChange,
  onSubmit,
  onBack,
  loading,
  error,
  className,
  showProgress = true
}: ProgressiveGuestFormProps) {
  // Initialize progressive validation
  const validation = useProgressiveValidation(FORM_FIELDS, guestInfo)

  // Update parent component when form values change
  useEffect(() => {
    const newGuestInfo: GuestInfo = {
      name: validation.values.name || '',
      email: validation.values.email || '',
      phone: validation.values.phone || ''
    }
    
    // Only update if values have actually changed to prevent infinite loops
    if (
      newGuestInfo.name !== guestInfo.name ||
      newGuestInfo.email !== guestInfo.email ||
      newGuestInfo.phone !== guestInfo.phone
    ) {
      onGuestInfoChange(newGuestInfo)
    }
  }, [validation.values, guestInfo, onGuestInfoChange])

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    logger.booking.info(40, 'Progressive guest form submission started', {
      completionPercentage: validation.getValidationSummary().completionPercentage,
      hasErrors: validation.hasErrors,
      touchedFields: validation.touchedFields.length
    })

    try {
      // Validate all fields before submission
      const isValid = await validation.validateAllFields()
      
      if (!isValid) {
        logger.booking.warn(41, 'Form submission blocked due to validation errors', {
          errors: validation.getValidationSummary().allErrors,
          invalidFields: validation.getValidationSummary().invalidFields
        })
        
        // Focus on first error field
        const firstError = validation.getValidationSummary().firstError
        if (firstError) {
          const errorElement = document.getElementById(firstError.field)
          errorElement?.focus()
        }
        
        return
      }

      // All validation passed, proceed with submission
      await onSubmit()
      
      logger.booking.info(42, 'Progressive guest form submission completed successfully', {
        formData: {
          nameLength: validation.values.name.length,
          emailDomain: validation.values.email.split('@')[1] || '',
          phoneDigits: validation.values.phone.replace(/\D/g, '').length
        }
      })

    } catch (submitError) {
      logger.booking.error(43, 'Progressive guest form submission failed', submitError, {
        validationState: validation.getValidationSummary()
      })
    }
  }, [validation, onSubmit])

  // Phone number formatting
  const formatPhoneNumber = useCallback((value: string) => {
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '')
    
    // Apply US phone number formatting
    if (digitsOnly.length <= 3) {
      return digitsOnly
    } else if (digitsOnly.length <= 6) {
      return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3)}`
    } else if (digitsOnly.length <= 10) {
      return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`
    } else {
      // Handle longer numbers (international)
      return `+${digitsOnly.slice(0, 1)} (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7, 11)}`
    }
  }, [])

  // Get validation summary for progress display
  const validationSummary = validation.getValidationSummary()

  return (
    <section className={className} aria-labelledby="guest-info-title">
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Go back to date and time selection"
          title="Go back to date and time selection"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 id="guest-info-title" className="text-2xl font-bold text-gray-900">
            Your Information
          </h2>
          <p className="text-gray-600" id="guest-info-description">
            We'll need some details to confirm your booking. All fields are validated in real-time.
          </p>
          <ScreenReaderOnly>
            {SCREEN_READER_INSTRUCTIONS.step3}
          </ScreenReaderOnly>
        </div>
      </div>

      {/* Form Progress Indicator */}
      {showProgress && (
        <div className="mb-6">
          <FormValidationProgress
            validationSummary={validationSummary}
            title="Booking Information Progress"
            showDetails={validationSummary.touchedFields > 0}
            animated={true}
            showSuccessMessage={true}
          />
        </div>
      )}

      {/* General Form Error */}
      {error && (
        <div 
          className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center space-x-2">
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-lg p-6 border">
        <form 
          onSubmit={handleSubmit}
          className="space-y-6"
          {...getRegionAria('form')}
          aria-describedby="guest-info-description"
          noValidate
        >
          {/* Name Field */}
          <ValidatedInput
            id="guest-name"
            label="Full Name"
            type="text"
            placeholder="Enter your first and last name"
            required={true}
            maxLength={100}
            showCharacterCount={true}
            helpText="Please enter your first and last name as they appear on your ID"
            {...validation.getFieldProps('name')}
          />

          {/* Email Field */}
          <ValidatedInput
            id="guest-email"
            label="Email Address"
            type="email"
            placeholder="Enter your email address"
            required={true}
            maxLength={255}
            helpText="We'll send your booking confirmation to this email"
            {...validation.getFieldProps('email')}
          />

          {/* Phone Field with Formatting */}
          <ValidatedInput
            id="guest-phone"
            label="Phone Number"
            type="tel"
            placeholder="(555) 123-4567"
            required={true}
            maxLength={20}
            helpText="We'll send SMS reminders to this number"
            value={formatPhoneNumber(validation.values.phone || '')}
            onChange={(value) => {
              // Store unformatted value for validation
              const digitsOnly = value.replace(/\D/g, '')
              validation.setValue('phone', digitsOnly)
            }}
            onBlur={validation.getFieldProps('phone').onBlur}
            onFocus={validation.getFieldProps('phone').onFocus}
            error={validation.getFieldProps('phone').error}
            touched={validation.getFieldProps('phone').touched}
            focused={validation.getFieldProps('phone').focused}
            isValidating={validation.getFieldProps('phone').isValidating}
            aria-invalid={validation.getFieldProps('phone')['aria-invalid']}
            aria-describedby={validation.getFieldProps('phone')['aria-describedby']}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !validation.isValid}
            className="w-full py-3 px-6 bg-black text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            {...getButtonAria(
              loading ? 'Creating Your Booking' : 'Continue to Payment',
              loading,
              loading || !validation.isValid,
              validation.isValid 
                ? 'Proceed to secure payment to confirm your booking'
                : `Complete all fields to continue (${validationSummary.invalidFields + (validationSummary.totalFields - validationSummary.validFields - validationSummary.invalidFields)} remaining)`
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Creating Your Booking...
              </>
            ) : (
              <>Continue to Payment {validation.isValid && '→'}</>
            )}
          </Button>

          {/* Form Help Text */}
          {!validation.isValid && validationSummary.touchedFields > 0 && (
            <div className="text-sm text-gray-600 text-center p-2 bg-blue-50 rounded border border-blue-200">
              Please complete all fields with valid information to continue
            </div>
          )}
        </form>
      </div>

      {/* Accessibility Live Region for Form Updates */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
      >
        {validationSummary.completionPercentage}% of form completed. 
        {validationSummary.invalidFields > 0 && 
          `${validationSummary.invalidFields} field${validationSummary.invalidFields !== 1 ? 's' : ''} need${validationSummary.invalidFields === 1 ? 's' : ''} attention.`
        }
      </div>
    </section>
  )
}