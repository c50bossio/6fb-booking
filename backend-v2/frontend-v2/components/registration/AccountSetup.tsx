'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BusinessType } from './BusinessTypeSelection'
import { ValidationDisplay, ValidationSummary } from '@/components/ui/ValidationDisplay'
import { getFieldError } from '@/lib/registrationValidation'

export interface AccountInfo {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  consent: {
    terms: boolean
    privacy: boolean
    marketing: boolean
    testData: boolean
  }
}

interface PasswordStrength {
  hasMinLength: boolean
  hasUpperCase: boolean
  hasLowerCase: boolean
  hasDigit: boolean
  hasSpecialChar: boolean
}

interface AccountSetupProps {
  businessType: BusinessType
  accountInfo: AccountInfo
  validationErrors?: Array<{ field: string; message: string }>
  onUpdate: (info: AccountInfo) => void
  onNext: () => void
  onBack: () => void
}

export function AccountSetup({ 
  businessType, 
  accountInfo, 
  validationErrors = [],
  onUpdate, 
  onNext, 
  onBack 
}: AccountSetupProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [emailSuggestion, setEmailSuggestion] = useState<string>('')
  const [showEmailSuggestion, setShowEmailSuggestion] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasDigit: false,
    hasSpecialChar: false
  })

  // Common email domain suggestions
  const commonDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
    'aol.com', 'icloud.com', 'live.com', 'msn.com'
  ]

  // Smart defaults based on business type
  useEffect(() => {
    if (businessType && accountInfo.firstName && accountInfo.lastName && !accountInfo.email) {
      // For solo barbers, suggest a professional email format
      if (businessType === 'solo' && accountInfo.firstName && accountInfo.lastName) {
        const suggestedEmail = `${accountInfo.firstName.toLowerCase()}.${accountInfo.lastName.toLowerCase()}@`
        // Don't auto-fill, just prepare for suggestion
      }
    }
  }, [businessType, accountInfo.firstName, accountInfo.lastName])

  const validatePassword = (password: string) => {
    const strength = {
      hasMinLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasDigit: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    }
    setPasswordStrength(strength)
    return strength
  }

  const isPasswordValid = (): boolean => {
    return passwordStrength.hasMinLength &&
           passwordStrength.hasUpperCase &&
           passwordStrength.hasLowerCase &&
           passwordStrength.hasDigit &&
           passwordStrength.hasSpecialChar
  }

  const checkEmailTypo = (email: string) => {
    if (!email.includes('@')) return

    const [localPart, domainPart] = email.split('@')
    if (!domainPart) return

    // Find the closest matching domain
    for (const domain of commonDomains) {
      const similarity = calculateSimilarity(domainPart.toLowerCase(), domain)
      if (similarity > 0.6 && similarity < 1) {
        const suggestion = `${localPart}@${domain}`
        setEmailSuggestion(suggestion)
        setShowEmailSuggestion(true)
        return
      }
    }
    setShowEmailSuggestion(false)
  }

  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const distance = levenshteinDistance(longer, shorter)
    return (longer.length - distance) / longer.length
  }

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = []
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    return matrix[str2.length][str1.length]
  }

  const applySuggestion = () => {
    updateField('email', emailSuggestion)
    setShowEmailSuggestion(false)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!accountInfo.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!accountInfo.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!accountInfo.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountInfo.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!accountInfo.password) {
      newErrors.password = 'Password is required'
    } else if (!isPasswordValid()) {
      newErrors.password = 'Password does not meet requirements'
    }

    if (!accountInfo.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (accountInfo.password !== accountInfo.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!accountInfo.consent.terms) {
      newErrors.terms = 'You must agree to the Terms of Service'
    }

    if (!accountInfo.consent.privacy) {
      newErrors.privacy = 'You must agree to the Privacy Policy'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onNext()
    }
  }

  const updateField = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      onUpdate({
        ...accountInfo,
        [parent]: {
          ...accountInfo[parent as keyof AccountInfo],
          [child]: value
        }
      })
    } else {
      onUpdate({
        ...accountInfo,
        [field]: value
      })
    }
    
    // Special handling for password validation
    if (field === 'password') {
      validatePassword(value)
    }

    // Special handling for email validation and suggestions
    if (field === 'email') {
      checkEmailTypo(value)
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const getAccountTypeDescription = () => {
    switch (businessType) {
      case 'solo':
        return 'Your account will be set up as a solo barber with full access to booking and client management features.'
      case 'single_location':
        return 'Your account will be set up as the owner with admin access to manage your barbershop, staff, and business analytics.'
      case 'multi_location':
        return 'Your account will be set up as the enterprise owner with full access to manage multiple locations and franchise operations.'
      default:
        return 'Your account details'
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Create your account
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Set up your login credentials and account preferences
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {getAccountTypeDescription()}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Personal Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={accountInfo.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  placeholder="John"
                  className={errors.firstName ? 'border-red-500' : ''}
                />
                <ValidationDisplay error={errors.firstName || getFieldError(validationErrors, 'firstName')} />
              </div>

              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={accountInfo.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  placeholder="Doe"
                  className={errors.lastName ? 'border-red-500' : ''}
                />
                <ValidationDisplay error={errors.lastName || getFieldError(validationErrors, 'lastName')} />
              </div>
            </div>
          </div>

          {/* Login Credentials */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Login Credentials</h3>
            
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={accountInfo.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder={businessType === 'solo' ? 'your.name@gmail.com' : 'contact@yourbusiness.com'}
                className={errors.email ? 'border-red-500' : ''}
              />
              
              {/* Email Domain Suggestion */}
              {showEmailSuggestion && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-blue-700 dark:text-blue-300">
                        Did you mean <strong>{emailSuggestion}</strong>?
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={applySuggestion}
                        className="text-xs px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Yes, use this
                      </button>
                      <button
                        onClick={() => setShowEmailSuggestion(false)}
                        className="text-xs px-3 py-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                      >
                        No, keep mine
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This will be used for login and account verification
              </p>
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={accountInfo.password}
                onChange={(e) => updateField('password', e.target.value)}
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && (
                <p className="text-sm text-red-600 mt-1">{errors.password}</p>
              )}
              
              {/* Password Requirements */}
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-600 dark:text-gray-400">Password must contain:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`text-xs flex items-center ${passwordStrength.hasMinLength ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    <span className="mr-2">{passwordStrength.hasMinLength ? '✓' : '○'}</span>
                    At least 8 characters
                  </div>
                  <div className={`text-xs flex items-center ${passwordStrength.hasUpperCase ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    <span className="mr-2">{passwordStrength.hasUpperCase ? '✓' : '○'}</span>
                    One uppercase letter
                  </div>
                  <div className={`text-xs flex items-center ${passwordStrength.hasLowerCase ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    <span className="mr-2">{passwordStrength.hasLowerCase ? '✓' : '○'}</span>
                    One lowercase letter
                  </div>
                  <div className={`text-xs flex items-center ${passwordStrength.hasDigit ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    <span className="mr-2">{passwordStrength.hasDigit ? '✓' : '○'}</span>
                    One number
                  </div>
                  <div className={`text-xs flex items-center ${passwordStrength.hasSpecialChar ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    <span className="mr-2">{passwordStrength.hasSpecialChar ? '✓' : '○'}</span>
                    Special character
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={accountInfo.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                className={errors.confirmPassword ? 'border-red-500' : ''}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Consent */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Privacy & Consent</h3>
            
            <div className="space-y-3">
              {/* Required Consents */}
              <div className="flex items-start">
                <input
                  id="terms-consent"
                  type="checkbox"
                  checked={accountInfo.consent.terms}
                  onChange={(e) => updateField('consent.terms', e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  required
                />
                <label htmlFor="terms-consent" className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                  I agree to the{' '}
                  <a 
                    href="/terms" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-500 underline"
                  >
                    Terms of Service
                  </a>
                  <span className="text-red-500 ml-1">*</span>
                </label>
              </div>
              {errors.terms && (
                <p className="text-sm text-red-600 ml-7">{errors.terms}</p>
              )}

              <div className="flex items-start">
                <input
                  id="privacy-consent"
                  type="checkbox"
                  checked={accountInfo.consent.privacy}
                  onChange={(e) => updateField('consent.privacy', e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  required
                />
                <label htmlFor="privacy-consent" className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                  I agree to the{' '}
                  <a 
                    href="/privacy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-500 underline"
                  >
                    Privacy Policy
                  </a>
                  <span className="text-red-500 ml-1">*</span>
                </label>
              </div>
              {errors.privacy && (
                <p className="text-sm text-red-600 ml-7">{errors.privacy}</p>
              )}

              {/* Optional Consents */}
              <div className="flex items-start">
                <input
                  id="marketing-consent"
                  type="checkbox"
                  checked={accountInfo.consent.marketing}
                  onChange={(e) => updateField('consent.marketing', e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <label htmlFor="marketing-consent" className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                  I would like to receive promotional emails and updates about new features (optional)
                </label>
              </div>

              <div className="flex items-start bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                <input
                  id="test-data-consent"
                  type="checkbox"
                  checked={accountInfo.consent.testData}
                  onChange={(e) => updateField('consent.testData', e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <label htmlFor="test-data-consent" className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">Create sample data to help me learn the platform</span>
                  <br />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Adds test barbers, clients, and appointments to explore features safely. 
                    All test data is clearly marked and can be deleted anytime.
                  </span>
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-6 max-w-2xl mx-auto">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        
        <Button onClick={handleSubmit}>
          Continue
        </Button>
      </div>
    </div>
  )
}

export default AccountSetup