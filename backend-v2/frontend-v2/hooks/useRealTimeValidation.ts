'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface ValidationRule {
  test: (value: any) => boolean
  message: string
  type?: 'error' | 'warning' | 'info'
  debounceMs?: number
}

export interface FieldValidation {
  field: string
  rules: ValidationRule[]
  validateOnChange?: boolean
  validateOnBlur?: boolean
  debounceMs?: number
}

export interface ValidationState {
  [field: string]: {
    isValid: boolean
    isValidating: boolean
    errors: string[]
    warnings: string[]
    infos: string[]
    touched: boolean
    focused: boolean
  }
}

export interface UseRealTimeValidationOptions {
  validations: FieldValidation[]
  initialValues?: Record<string, any>
  validateOnMount?: boolean
  debounceMs?: number
}

export function useRealTimeValidation({
  validations,
  initialValues = {},
  validateOnMount = false,
  debounceMs = 300
}: UseRealTimeValidationOptions) {
  const [values, setValues] = useState<Record<string, any>>(initialValues)
  const [validationState, setValidationState] = useState<ValidationState>({})
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({})
  
  // Initialize validation state
  useEffect(() => {
    const initialState: ValidationState = {}
    validations.forEach(({ field }) => {
      initialState[field] = {
        isValid: true,
        isValidating: false,
        errors: [],
        warnings: [],
        infos: [],
        touched: false,
        focused: false
      }
    })
    setValidationState(initialState)
  }, [validations])

  // Validate a single field
  const validateField = useCallback(async (field: string, value: any) => {
    const validation = validations.find(v => v.field === field)
    if (!validation) return

    setValidationState(prev => ({
      ...prev,
      [field]: { ...prev[field], isValidating: true }
    }))

    const errors: string[] = []
    const warnings: string[] = []
    const infos: string[] = []

    for (const rule of validation.rules) {
      try {
        const isValid = await rule.test(value)
        if (!isValid) {
          switch (rule.type) {
            case 'warning':
              warnings.push(rule.message)
              break
            case 'info':
              infos.push(rule.message)
              break
            default:
              errors.push(rule.message)
          }
        }
      } catch (error) {
        console.warn(`Validation error for field ${field}:`, error)
        errors.push('Validation error occurred')
      }
    }

    const isValid = errors.length === 0

    setValidationState(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        isValid,
        isValidating: false,
        errors,
        warnings,
        infos
      }
    }))

    return { isValid, errors, warnings, infos }
  }, [validations])

  // Debounced validation
  const debouncedValidate = useCallback((field: string, value: any, customDebounce?: number) => {
    const validation = validations.find(v => v.field === field)
    if (!validation) return

    const delay = customDebounce ?? validation.debounceMs ?? debounceMs

    if (timeoutsRef.current[field]) {
      clearTimeout(timeoutsRef.current[field])
    }

    timeoutsRef.current[field] = setTimeout(() => {
      validateField(field, value)
    }, delay)
  }, [validations, debounceMs, validateField])

  // Update field value and trigger validation
  const updateField = useCallback((field: string, value: any, options?: {
    validate?: boolean
    touch?: boolean
    debounce?: boolean
    debounceMs?: number
  }) => {
    const opts = { 
      validate: true, 
      touch: true, 
      debounce: true, 
      ...options 
    }

    setValues(prev => ({ ...prev, [field]: value }))

    if (opts.touch) {
      setValidationState(prev => ({
        ...prev,
        [field]: { ...prev[field], touched: true }
      }))
    }

    if (opts.validate) {
      const validation = validations.find(v => v.field === field)
      if (validation?.validateOnChange !== false) {
        if (opts.debounce) {
          debouncedValidate(field, value, opts.debounceMs)
        } else {
          validateField(field, value)
        }
      }
    }
  }, [validations, debouncedValidate, validateField])

  // Handle field focus
  const focusField = useCallback((field: string) => {
    setValidationState(prev => ({
      ...prev,
      [field]: { ...prev[field], focused: true }
    }))
  }, [])

  // Handle field blur
  const blurField = useCallback((field: string) => {
    setValidationState(prev => ({
      ...prev,
      [field]: { ...prev[field], focused: false, touched: true }
    }))

    const validation = validations.find(v => v.field === field)
    if (validation?.validateOnBlur !== false) {
      // Clear any pending debounced validation
      if (timeoutsRef.current[field]) {
        clearTimeout(timeoutsRef.current[field])
      }
      // Run immediate validation on blur
      validateField(field, values[field])
    }
  }, [validations, values, validateField])

  // Validate all fields
  const validateAll = useCallback(async () => {
    const results: Record<string, any> = {}
    
    for (const { field } of validations) {
      const result = await validateField(field, values[field])
      results[field] = result
    }

    return results
  }, [validations, values, validateField])

  // Check if form is valid
  const isFormValid = useCallback(() => {
    return Object.values(validationState).every(state => state.isValid)
  }, [validationState])

  // Get validation state for a field
  const getFieldValidation = useCallback((field: string) => {
    return validationState[field] || {
      isValid: true,
      isValidating: false,
      errors: [],
      warnings: [],
      infos: [],
      touched: false,
      focused: false
    }
  }, [validationState])

  // Get field error message (first error)
  const getFieldError = useCallback((field: string) => {
    const fieldState = validationState[field]
    return fieldState?.errors[0] || null
  }, [validationState])

  // Get field value
  const getFieldValue = useCallback((field: string) => {
    return values[field]
  }, [values])

  // Reset validation state
  const reset = useCallback((newValues?: Record<string, any>) => {
    if (newValues) {
      setValues(newValues)
    } else {
      setValues(initialValues)
    }

    const resetState: ValidationState = {}
    validations.forEach(({ field }) => {
      resetState[field] = {
        isValid: true,
        isValidating: false,
        errors: [],
        warnings: [],
        infos: [],
        touched: false,
        focused: false
      }
    })
    setValidationState(resetState)

    // Clear all timeouts
    Object.values(timeoutsRef.current).forEach(timeout => clearTimeout(timeout))
    timeoutsRef.current = {}
  }, [validations, initialValues])

  // Initial validation on mount
  useEffect(() => {
    if (validateOnMount) {
      validateAll()
    }
  }, [validateOnMount, validateAll])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutsRef.current).forEach(timeout => clearTimeout(timeout))
    }
  }, [])

  return {
    // State
    values,
    validationState,
    
    // Actions
    updateField,
    focusField,
    blurField,
    validateField,
    validateAll,
    reset,
    
    // Getters
    getFieldValidation,
    getFieldError,
    getFieldValue,
    isFormValid,
    
    // Helper methods
    setFieldValue: (field: string, value: any) => updateField(field, value, { validate: false }),
    touchField: (field: string) => setValidationState(prev => ({
      ...prev,
      [field]: { ...prev[field], touched: true }
    })),
    
    // Computed properties
    isValid: isFormValid(),
    hasErrors: Object.values(validationState).some(state => state.errors.length > 0),
    hasWarnings: Object.values(validationState).some(state => state.warnings.length > 0),
    isValidating: Object.values(validationState).some(state => state.isValidating),
    touchedFields: Object.keys(validationState).filter(field => validationState[field].touched),
    errorCount: Object.values(validationState).reduce((count, state) => count + state.errors.length, 0)
  }
}

// Common validation rules
export const validationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    test: (value) => {
      if (typeof value === 'string') return value.trim().length > 0
      if (Array.isArray(value)) return value.length > 0
      return value != null && value !== ''
    },
    message,
    type: 'error'
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    test: (value) => {
      if (!value) return true // Allow empty (use required rule separately)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(value)
    },
    message,
    type: 'error'
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    test: (value) => {
      if (!value) return true
      return value.toString().length >= min
    },
    message: message || `Must be at least ${min} characters`,
    type: 'error'
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    test: (value) => {
      if (!value) return true
      return value.toString().length <= max
    },
    message: message || `Must be no more than ${max} characters`,
    type: 'error'
  }),

  pattern: (regex: RegExp, message: string): ValidationRule => ({
    test: (value) => {
      if (!value) return true
      return regex.test(value)
    },
    message,
    type: 'error'
  }),

  passwordStrength: (message = 'Password must contain uppercase, lowercase, number, and special character'): ValidationRule => ({
    test: (value) => {
      if (!value) return true
      const hasUpper = /[A-Z]/.test(value)
      const hasLower = /[a-z]/.test(value)
      const hasNumber = /\d/.test(value)
      const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)
      const hasMinLength = value.length >= 8
      return hasUpper && hasLower && hasNumber && hasSpecial && hasMinLength
    },
    message,
    type: 'error'
  }),

  matchField: (otherField: string, otherValue: any, message = 'Fields must match'): ValidationRule => ({
    test: (value) => value === otherValue,
    message,
    type: 'error'
  }),

  async: (asyncTest: (value: any) => Promise<boolean>, message: string): ValidationRule => ({
    test: asyncTest,
    message,
    type: 'error'
  })
}