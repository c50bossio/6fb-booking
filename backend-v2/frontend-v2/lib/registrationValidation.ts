/**
 * Registration Flow Validation
 * 
 * Provides comprehensive validation for the multi-step registration process
 */

import { BusinessType } from '@/components/registration/BusinessTypeSelection'
import { AccountInfo } from '@/components/registration/AccountSetup'
import { BusinessInfo } from '@/components/registration/BusinessInformation'
import { ServiceTemplate } from '@/lib/types/service-templates'

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Phone validation regex (US format)
const PHONE_REGEX = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/

// URL validation regex
const URL_REGEX = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/

// Password strength requirements
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/

// Step 1: Business Type Validation
export function validateBusinessType(businessType: BusinessType | null): ValidationResult {
  const errors: ValidationError[] = []

  if (!businessType) {
    errors.push({
      field: 'businessType',
      message: 'Please select a business type'
    })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Step 2: Account Setup Validation
export function validateAccountInfo(accountInfo: AccountInfo): ValidationResult {
  const errors: ValidationError[] = []

  // First name validation
  if (!accountInfo.firstName.trim()) {
    errors.push({
      field: 'firstName',
      message: 'First name is required'
    })
  } else if (accountInfo.firstName.length < 2) {
    errors.push({
      field: 'firstName',
      message: 'First name must be at least 2 characters'
    })
  }

  // Last name validation
  if (!accountInfo.lastName.trim()) {
    errors.push({
      field: 'lastName',
      message: 'Last name is required'
    })
  } else if (accountInfo.lastName.length < 2) {
    errors.push({
      field: 'lastName',
      message: 'Last name must be at least 2 characters'
    })
  }

  // Email validation
  if (!accountInfo.email.trim()) {
    errors.push({
      field: 'email',
      message: 'Email is required'
    })
  } else if (!EMAIL_REGEX.test(accountInfo.email)) {
    errors.push({
      field: 'email',
      message: 'Please enter a valid email address'
    })
  }

  // Password validation
  if (!accountInfo.password) {
    errors.push({
      field: 'password',
      message: 'Password is required'
    })
  } else if (accountInfo.password.length < PASSWORD_MIN_LENGTH) {
    errors.push({
      field: 'password',
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
    })
  } else if (!PASSWORD_REGEX.test(accountInfo.password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain uppercase, lowercase, number, and special character'
    })
  }

  // Confirm password validation
  if (!accountInfo.confirmPassword) {
    errors.push({
      field: 'confirmPassword',
      message: 'Please confirm your password'
    })
  } else if (accountInfo.password !== accountInfo.confirmPassword) {
    errors.push({
      field: 'confirmPassword',
      message: 'Passwords do not match'
    })
  }

  // Consent validation
  if (!accountInfo.consent.terms) {
    errors.push({
      field: 'consent.terms',
      message: 'You must accept the Terms of Service'
    })
  }

  if (!accountInfo.consent.privacy) {
    errors.push({
      field: 'consent.privacy',
      message: 'You must accept the Privacy Policy'
    })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Step 3: Business Information Validation
export function validateBusinessInfo(businessInfo: BusinessInfo, businessType: BusinessType | null): ValidationResult {
  const errors: ValidationError[] = []

  // Business name validation
  if (!businessInfo.businessName.trim()) {
    errors.push({
      field: 'businessName',
      message: 'Business name is required'
    })
  } else if (businessInfo.businessName.length < 2) {
    errors.push({
      field: 'businessName',
      message: 'Business name must be at least 2 characters'
    })
  }

  // Address validation
  if (!businessInfo.address.street.trim()) {
    errors.push({
      field: 'address.street',
      message: 'Street address is required'
    })
  }

  if (!businessInfo.address.city.trim()) {
    errors.push({
      field: 'address.city',
      message: 'City is required'
    })
  }

  if (!businessInfo.address.state.trim()) {
    errors.push({
      field: 'address.state',
      message: 'State is required'
    })
  }

  if (!businessInfo.address.zipCode.trim()) {
    errors.push({
      field: 'address.zipCode',
      message: 'ZIP code is required'
    })
  } else if (!/^\d{5}(-\d{4})?$/.test(businessInfo.address.zipCode)) {
    errors.push({
      field: 'address.zipCode',
      message: 'Please enter a valid ZIP code'
    })
  }

  // Phone validation (optional but must be valid if provided)
  if (businessInfo.phone && !PHONE_REGEX.test(businessInfo.phone)) {
    errors.push({
      field: 'phone',
      message: 'Please enter a valid phone number'
    })
  }

  // Website validation (optional but must be valid if provided)
  if (businessInfo.website && !URL_REGEX.test(businessInfo.website)) {
    errors.push({
      field: 'website',
      message: 'Please enter a valid website URL'
    })
  }

  // Chair count validation
  if (businessType !== 'solo') {
    if (businessInfo.chairCount < 1) {
      errors.push({
        field: 'chairCount',
        message: 'Chair count must be at least 1'
      })
    } else if (businessInfo.chairCount > 1000) {
      errors.push({
        field: 'chairCount',
        message: 'Chair count cannot exceed 1000'
      })
    }
  }

  // Barber count validation
  if (businessInfo.barberCount < 1) {
    errors.push({
      field: 'barberCount',
      message: 'Barber count must be at least 1'
    })
  } else if (businessInfo.barberCount > businessInfo.chairCount) {
    errors.push({
      field: 'barberCount',
      message: 'Barber count cannot exceed chair count'
    })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Step 4: Service Template Selection Validation (Optional)
export function validateServiceTemplates(serviceTemplates: ServiceTemplate[]): ValidationResult {
  // Service template selection is optional, so always valid
  return {
    isValid: true,
    errors: []
  }
}

// Step 5: Pricing Confirmation Validation
export function validatePricingInfo(pricingInfo: { chairs: number; monthlyTotal: number; tier: string } | null): ValidationResult {
  const errors: ValidationError[] = []

  if (!pricingInfo) {
    errors.push({
      field: 'pricing',
      message: 'Pricing information is missing'
    })
  } else {
    if (pricingInfo.chairs < 1) {
      errors.push({
        field: 'pricing.chairs',
        message: 'Invalid chair count'
      })
    }

    if (pricingInfo.monthlyTotal < 0) {
      errors.push({
        field: 'pricing.monthlyTotal',
        message: 'Invalid pricing calculation'
      })
    }

    if (!pricingInfo.tier) {
      errors.push({
        field: 'pricing.tier',
        message: 'Pricing tier is not set'
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Step 6: Payment Setup Validation
export function validatePaymentInfo(paymentInfo: { trialStarted: boolean; paymentMethodAdded: boolean } | null): ValidationResult {
  const errors: ValidationError[] = []

  if (!paymentInfo) {
    errors.push({
      field: 'payment',
      message: 'Payment setup incomplete'
    })
  } else if (!paymentInfo.trialStarted) {
    errors.push({
      field: 'payment.trial',
      message: 'Trial setup incomplete'
    })
  }

  // Note: paymentMethodAdded is optional during trial

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Validate current step
export function validateStep(step: number, data: any): ValidationResult {
  switch (step) {
    case 1:
      return validateBusinessType(data.businessType)
    case 2:
      return validateAccountInfo(data.accountInfo)
    case 3:
      return validateBusinessInfo(data.businessInfo, data.businessType)
    case 4:
      return validateServiceTemplates(data.serviceTemplates || [])
    case 5:
      return validatePricingInfo(data.pricingInfo)
    case 6:
      return validatePaymentInfo(data.paymentInfo)
    default:
      return { isValid: true, errors: [] }
  }
}

// Validate entire registration data
export function validateRegistrationData(data: any): ValidationResult {
  const allErrors: ValidationError[] = []

  // Validate each step
  const step1 = validateBusinessType(data.businessType)
  if (!step1.isValid) allErrors.push(...step1.errors)

  const step2 = validateAccountInfo(data.accountInfo)
  if (!step2.isValid) allErrors.push(...step2.errors)

  const step3 = validateBusinessInfo(data.businessInfo, data.businessType)
  if (!step3.isValid) allErrors.push(...step3.errors)

  const step4 = validateServiceTemplates(data.serviceTemplates || [])
  if (!step4.isValid) allErrors.push(...step4.errors)

  const step5 = validatePricingInfo(data.pricingInfo)
  if (!step5.isValid) allErrors.push(...step5.errors)

  const step6 = validatePaymentInfo(data.paymentInfo)
  if (!step6.isValid) allErrors.push(...step6.errors)

  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  }
}

// Helper function to get field error
export function getFieldError(errors: ValidationError[], field: string): string | undefined {
  const error = errors.find(e => e.field === field)
  return error?.message
}

// Helper function to check if field has error
export function hasFieldError(errors: ValidationError[], field: string): boolean {
  return errors.some(e => e.field === field)
}