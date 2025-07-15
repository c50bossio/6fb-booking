'use client'

import React, { useState, useCallback } from 'react'
import { Input } from './Input'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  className?: string
  error?: string
}

// Format phone number as user types
export function formatPhoneNumber(value: string): string {
  // Remove all non-numeric characters
  const numbers = value.replace(/\D/g, '')
  
  // Apply US phone number formatting
  if (numbers.length <= 3) {
    return numbers
  } else if (numbers.length <= 6) {
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
  } else {
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
  }
}

// Validate phone number format
export function validatePhoneNumber(phone: string): { isValid: boolean; message?: string } {
  const numbers = phone.replace(/\D/g, '')
  
  if (!phone.trim()) {
    return { isValid: true } // Empty is valid if not required
  }
  
  if (numbers.length < 10) {
    return { isValid: false, message: 'Phone number must be at least 10 digits' }
  }
  
  if (numbers.length > 10) {
    return { isValid: false, message: 'Phone number cannot be more than 10 digits' }
  }
  
  return { isValid: true }
}

export function PhoneInput({
  value,
  onChange,
  label = "Phone Number",
  placeholder = "(555) 123-4567",
  required = false,
  className = "",
  error
}: PhoneInputProps) {
  const [focused, setFocused] = useState(false)
  const [internalError, setInternalError] = useState<string>()

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    const formattedValue = formatPhoneNumber(inputValue)
    
    // Only allow formatted phone number up to correct length
    if (formattedValue.length <= 14) { // (xxx) xxx-xxxx
      onChange(formattedValue)
      
      // Clear error when user starts typing
      if (internalError) {
        setInternalError(undefined)
      }
    }
  }, [onChange, internalError])

  const handleBlur = useCallback(() => {
    setFocused(false)
    
    // Validate on blur
    const validation = validatePhoneNumber(value)
    if (!validation.isValid) {
      setInternalError(validation.message)
    }
  }, [value])

  const handleFocus = useCallback(() => {
    setFocused(true)
    setInternalError(undefined)
  }, [])

  const displayError = error || internalError
  const validation = validatePhoneNumber(value)

  return (
    <div className={className}>
      <Input
        label={label}
        type="tel"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        error={displayError}
        className={`${focused ? 'ring-2 ring-blue-500' : ''}`}
      />
      
      {/* Format hint */}
      {focused && !value && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Format: (555) 123-4567
        </p>
      )}
      
      {/* Success indicator */}
      {value && validation.isValid && !displayError && (
        <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Valid phone number
        </p>
      )}
    </div>
  )
}