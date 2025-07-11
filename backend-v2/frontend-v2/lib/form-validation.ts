import { VALIDATION_MESSAGES } from './ui-constants'

// Common validation patterns
export const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\s()+-]+$/,
  phoneUS: /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
  url: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphabetic: /^[a-zA-Z]+$/,
  numeric: /^[0-9]+$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  postalCode: /^[0-9]{5}(-[0-9]{4})?$/,
  creditCard: /^[0-9]{13,19}$/,
  cvv: /^[0-9]{3,4}$/
}

// Validation rule type
export type ValidationRule<T = any> = {
  validate: (value: T, formData?: any) => boolean | Promise<boolean>
  message: string | ((value: T) => string)
}

// Common validators
export const validators = {
  required: (message?: string): ValidationRule => ({
    validate: (value) => {
      if (value === null || value === undefined) return false
      if (typeof value === 'string') return value.trim().length > 0
      if (Array.isArray(value)) return value.length > 0
      return true
    },
    message: message || VALIDATION_MESSAGES.required
  }),

  email: (message?: string): ValidationRule => ({
    validate: (value) => !value || PATTERNS.email.test(value),
    message: message || VALIDATION_MESSAGES.email
  }),

  phone: (message?: string): ValidationRule => ({
    validate: (value) => !value || PATTERNS.phone.test(value),
    message: message || VALIDATION_MESSAGES.phone
  }),

  phoneUS: (message?: string): ValidationRule => ({
    validate: (value) => !value || PATTERNS.phoneUS.test(value),
    message: message || VALIDATION_MESSAGES.phone
  }),

  url: (message?: string): ValidationRule => ({
    validate: (value) => !value || PATTERNS.url.test(value),
    message: message || VALIDATION_MESSAGES.url
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => !value || value.length >= min,
    message: message || VALIDATION_MESSAGES.minLength.replace('{min}', min.toString())
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => !value || value.length <= max,
    message: message || VALIDATION_MESSAGES.maxLength.replace('{max}', max.toString())
  }),

  minValue: (min: number, message?: string): ValidationRule => ({
    validate: (value) => !value || Number(value) >= min,
    message: message || VALIDATION_MESSAGES.minValue.replace('{min}', min.toString())
  }),

  maxValue: (max: number, message?: string): ValidationRule => ({
    validate: (value) => !value || Number(value) <= max,
    message: message || VALIDATION_MESSAGES.maxValue.replace('{max}', max.toString())
  }),

  pattern: (pattern: RegExp, message?: string): ValidationRule => ({
    validate: (value) => !value || pattern.test(value),
    message: message || VALIDATION_MESSAGES.pattern
  }),

  alphanumeric: (message?: string): ValidationRule => ({
    validate: (value) => !value || PATTERNS.alphanumeric.test(value),
    message: message || VALIDATION_MESSAGES.alphanumeric
  }),

  alphabetic: (message?: string): ValidationRule => ({
    validate: (value) => !value || PATTERNS.alphabetic.test(value),
    message: message || VALIDATION_MESSAGES.alphabetic
  }),

  numeric: (message?: string): ValidationRule => ({
    validate: (value) => !value || PATTERNS.numeric.test(value),
    message: message || VALIDATION_MESSAGES.numeric
  }),

  matches: (fieldName: string, message?: string): ValidationRule => ({
    validate: (value, formData) => !value || value === formData?.[fieldName],
    message: message || VALIDATION_MESSAGES.passwordMatch
  }),

  futureDate: (message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true
      const date = new Date(value)
      return date > new Date()
    },
    message: message || VALIDATION_MESSAGES.futureDate
  }),

  pastDate: (message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true
      const date = new Date(value)
      return date < new Date()
    },
    message: message || VALIDATION_MESSAGES.pastDate
  }),

  dateRange: (min: Date, max: Date, message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true
      const date = new Date(value)
      return date >= min && date <= max
    },
    message: message || `Date must be between ${min.toLocaleDateString()} and ${max.toLocaleDateString()}`
  }),

  fileSize: (maxBytes: number, message?: string): ValidationRule => ({
    validate: (value: File | FileList) => {
      if (!value) return true
      const files = value instanceof FileList ? Array.from(value) : [value]
      return files.every(file => file.size <= maxBytes)
    },
    message: message || VALIDATION_MESSAGES.fileSize.replace('{size}', `${Math.round(maxBytes / 1024 / 1024)}MB`)
  }),

  fileType: (acceptedTypes: string[], message?: string): ValidationRule => ({
    validate: (value: File | FileList) => {
      if (!value) return true
      const files = value instanceof FileList ? Array.from(value) : [value]
      return files.every(file => acceptedTypes.includes(file.type))
    },
    message: message || VALIDATION_MESSAGES.fileType.replace('{types}', acceptedTypes.join(', '))
  }),

  strongPassword: (message?: string): ValidationRule => ({
    validate: (value) => !value || PATTERNS.strongPassword.test(value),
    message: message || 'Password must be at least 8 characters with uppercase, lowercase, number and special character'
  }),

  creditCard: (message?: string): ValidationRule => ({
    validate: (value) => {
      if (!value) return true
      // Remove spaces and dashes
      const cardNumber = value.replace(/[\s-]/g, '')
      return PATTERNS.creditCard.test(cardNumber) && luhnCheck(cardNumber)
    },
    message: message || 'Please enter a valid credit card number'
  }),

  cvv: (message?: string): ValidationRule => ({
    validate: (value) => !value || PATTERNS.cvv.test(value),
    message: message || 'Please enter a valid CVV'
  }),

  custom: <T = any>(
    validateFn: (value: T, formData?: any) => boolean | Promise<boolean>,
    message: string
  ): ValidationRule => ({
    validate: validateFn,
    message
  })
}

// Luhn algorithm for credit card validation
function luhnCheck(cardNumber: string): boolean {
  let sum = 0
  let alternate = false
  
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let n = parseInt(cardNumber[i], 10)
    
    if (alternate) {
      n *= 2
      if (n > 9) {
        n = (n % 10) + 1
      }
    }
    
    sum += n
    alternate = !alternate
  }
  
  return sum % 10 === 0
}

// Form validation helper
export async function validateForm<T extends Record<string, any>>(
  values: T,
  rules: Record<keyof T, ValidationRule[]>
): Promise<Record<keyof T, string | null>> {
  const errors: Record<string, string | null> = {}
  
  for (const [field, fieldRules] of Object.entries(rules)) {
    for (const rule of fieldRules as ValidationRule[]) {
      const isValid = await rule.validate(values[field], values)
      
      if (!isValid) {
        errors[field] = typeof rule.message === 'function' 
          ? rule.message(values[field])
          : rule.message
        break // Stop at first error for this field
      }
    }
    
    // Set null if no error
    if (!errors[field]) {
      errors[field] = null
    }
  }
  
  return errors as Record<keyof T, string | null>
}

// Validation state helper
export function getValidationState(
  value: any,
  error: string | null,
  touched: boolean
): 'default' | 'error' | 'success' {
  if (!touched) return 'default'
  if (error) return 'error'
  if (value) return 'success'
  return 'default'
}

// Format phone number as user types
export function formatPhoneNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
  
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }
  
  return value
}

// Format credit card number as user types
export function formatCreditCard(value: string): string {
  const cleaned = value.replace(/\s/g, '')
  const chunks = cleaned.match(/.{1,4}/g) || []
  return chunks.join(' ')
}

// Format expiry date as MM/YY
export function formatExpiryDate(value: string): string {
  const cleaned = value.replace(/\D/g, '')
  if (cleaned.length >= 2) {
    return cleaned.slice(0, 2) + (cleaned.length > 2 ? '/' + cleaned.slice(2, 4) : '')
  }
  return cleaned
}

// Debounced validation
export function debounceValidation<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    return new Promise((resolve) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      timeoutId = setTimeout(async () => {
        const result = await fn(...args)
        resolve(result)
      }, delay)
    })
  }
}