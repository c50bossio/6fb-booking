'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BusinessType } from './BusinessTypeSelection'
import { ValidationDisplay, ValidationSummary } from '@/components/ui/ValidationDisplay'
import { getFieldError } from '@/lib/registrationValidation'
import { User, Mail, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import { useRealTimeValidation, validationRules } from '@/hooks/useRealTimeValidation'

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

  // Real-time validation setup
  const validation = useRealTimeValidation({
    validations: [
      {
        field: 'firstName',
        rules: [
          validationRules.required('First name is required'),
          validationRules.minLength(2, 'First name must be at least 2 characters'),
          validationRules.pattern(/^[a-zA-Z\s-']+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes')
        ],
        validateOnChange: true,
        debounceMs: 300
      },
      {
        field: 'lastName',
        rules: [
          validationRules.required('Last name is required'),
          validationRules.minLength(2, 'Last name must be at least 2 characters'),
          validationRules.pattern(/^[a-zA-Z\s-']+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes')
        ],
        validateOnChange: true,
        debounceMs: 300
      },
      {
        field: 'email',
        rules: [
          validationRules.required('Email address is required'),
          validationRules.email('Please enter a valid email address'),
          {
            test: (value) => {
              // Check for common typos in email domains
              if (!value?.includes('@')) return true
              const domain = value.split('@')[1]?.toLowerCase()
              const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com']
              const suspiciousDomains = ['gmial.com', 'gmai.com', 'yahooo.com', 'hotmial.com']
              return !suspiciousDomains.includes(domain)
            },
            message: 'Please check your email domain for typos',
            type: 'warning'
          }
        ],
        validateOnChange: true,
        debounceMs: 500
      },
      {
        field: 'password',
        rules: [
          validationRules.required('Password is required'),
          validationRules.minLength(8, 'Password must be at least 8 characters'),
          validationRules.passwordStrength('Password must contain uppercase, lowercase, number, and special character')
        ],
        validateOnChange: true,
        debounceMs: 300
      },
      {
        field: 'confirmPassword',
        rules: [
          validationRules.required('Please confirm your password'),
          validationRules.matchField('password', accountInfo.password, 'Passwords must match')
        ],
        validateOnChange: true,
        debounceMs: 300
      }
    ],
    initialValues: {
      firstName: accountInfo.firstName,
      lastName: accountInfo.lastName,
      email: accountInfo.email,
      password: accountInfo.password,
      confirmPassword: accountInfo.confirmPassword
    },
    debounceMs: 300
  })

  // Sync validation values with parent state
  useEffect(() => {
    validation.updateField('firstName', accountInfo.firstName, { validate: false, touch: false })
    validation.updateField('lastName', accountInfo.lastName, { validate: false, touch: false })
    validation.updateField('email', accountInfo.email, { validate: false, touch: false })
    validation.updateField('password', accountInfo.password, { validate: false, touch: false })
    validation.updateField('confirmPassword', accountInfo.confirmPassword, { validate: false, touch: false })
  }, [accountInfo])

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
    // Update real-time validation
    validation.updateField(field, value)
    
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
    <div className="space-y-6 px-4 sm:px-0">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
          Create your account
        </h2>
        <p className="mt-2 text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          Set up your login credentials and account preferences
        </p>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="pb-4 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">Account Information</CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {getAccountTypeDescription()}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6 sm:space-y-8">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Personal Information</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  inputMode="text"
                  label="First Name *"
                  value={accountInfo.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  onFocus={() => validation.focusField('firstName')}
                  onBlur={() => validation.blurField('firstName')}
                  placeholder="John"
                  error={validation.getFieldError('firstName') || errors.firstName || getFieldError(validationErrors, 'firstName')}
                  leftIcon={<User className="w-4 h-4" />}
                  success={validation.getFieldValidation('firstName').isValid && validation.getFieldValidation('firstName').touched && accountInfo.firstName.trim().length > 0}
                  helperText={validation.getFieldValidation('firstName').isValidating ? 'Validating...' : 'Your legal first name as you\'d like it to appear on invoices'}
                  className="min-h-[52px] sm:min-h-[48px] md:min-h-[44px] touch-manipulation text-base sm:text-sm"
                />
              </div>

              <div>
                <Input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  inputMode="text"
                  label="Last Name *"
                  value={accountInfo.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  onFocus={() => validation.focusField('lastName')}
                  onBlur={() => validation.blurField('lastName')}
                  placeholder="Doe"
                  error={validation.getFieldError('lastName') || errors.lastName || getFieldError(validationErrors, 'lastName')}
                  leftIcon={<User className="w-4 h-4" />}
                  success={validation.getFieldValidation('lastName').isValid && validation.getFieldValidation('lastName').touched && accountInfo.lastName.trim().length > 0}
                  helperText={validation.getFieldValidation('lastName').isValidating ? 'Validating...' : 'Your legal last name as you\'d like it to appear on invoices'}
                  className="min-h-[52px] sm:min-h-[48px] md:min-h-[44px] touch-manipulation text-base sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Login Credentials */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Login Credentials</h3>
            
            <div className="space-y-3">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                enterKeyHint="next"
                label="Email Address *"
                value={accountInfo.email}
                onChange={(e) => updateField('email', e.target.value)}
                onFocus={() => validation.focusField('email')}
                onBlur={() => validation.blurField('email')}
                placeholder={businessType === 'solo' ? 'your.name@gmail.com' : 'contact@yourbusiness.com'}
                error={validation.getFieldError('email') || errors.email || getFieldError(validationErrors, 'email')}
                leftIcon={<Mail className="w-4 h-4" />}
                success={validation.getFieldValidation('email').isValid && validation.getFieldValidation('email').touched && accountInfo.email.includes('@')}
                helperText={validation.getFieldValidation('email').isValidating ? 'Validating email...' : 'This will be used for login and account verification'}
                className="min-h-[52px] sm:min-h-[48px] md:min-h-[44px] touch-manipulation text-base sm:text-sm"
              />
              
              {/* Email warnings */}
              {validation.getFieldValidation('email').warnings.length > 0 && (
                <div className="mt-2">
                  {validation.getFieldValidation('email').warnings.map((warning, index) => (
                    <ValidationDisplay key={index} warning={warning} animated={true} />
                  ))}
                </div>
              )}
              
              {/* Mobile-optimized Email Domain Suggestion */}
              {showEmailSuggestion && (
                <div className="animate-in slide-in-from-top-2 duration-300 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                    <div className="flex items-start sm:items-center space-x-3">
                      <div className="flex-shrink-0 mt-0.5 sm:mt-0">
                        <AlertCircle className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Did you mean <span className="font-semibold break-all">{emailSuggestion}</span>?
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                          We noticed a possible typo in your email domain
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                      <Button
                        size="sm"
                        onClick={applySuggestion}
                        className="h-10 sm:h-8 px-4 sm:px-3 text-sm sm:text-xs bg-blue-600 hover:bg-blue-700 w-full sm:w-auto touch-manipulation"
                      >
                        Yes, use this
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowEmailSuggestion(false)}
                        className="h-10 sm:h-8 px-4 sm:px-3 text-sm sm:text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 w-full sm:w-auto touch-manipulation"
                      >
                        No, keep mine
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                enterKeyHint="next"
                label="Password *"
                value={accountInfo.password}
                onChange={(e) => updateField('password', e.target.value)}
                onFocus={() => validation.focusField('password')}
                onBlur={() => validation.blurField('password')}
                error={validation.getFieldError('password') || errors.password || getFieldError(validationErrors, 'password')}
                leftIcon={<Lock className="w-4 h-4" />}
                showPasswordToggle={true}
                success={validation.getFieldValidation('password').isValid && validation.getFieldValidation('password').touched && isPasswordValid()}
                helperText={validation.getFieldValidation('password').isValidating ? 'Checking password strength...' : 'Choose a strong password to secure your account'}
                className="min-h-[52px] sm:min-h-[48px] md:min-h-[44px] touch-manipulation text-base sm:text-sm"
              />
              
              {/* Mobile-optimized Password Requirements */}
              {accountInfo.password.length > 0 && (
                <div className="animate-in slide-in-from-top-2 duration-300 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Password Strength</span>
                      <div className="flex space-x-1">
                        {Array.from({ length: 5 }).map((_, index) => {
                          const requirements = Object.values(passwordStrength)
                          const metCount = requirements.filter(Boolean).length
                          const isActive = index < metCount
                          return (
                            <div
                              key={index}
                              className={`h-1.5 sm:h-1 w-5 sm:w-4 rounded-full transition-all duration-300 ${
                                isActive
                                  ? metCount <= 2
                                    ? 'bg-red-500'
                                    : metCount <= 3
                                    ? 'bg-yellow-500'
                                    : metCount <= 4
                                    ? 'bg-blue-500'
                                    : 'bg-green-500'
                                  : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                            />
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Requirements:</p>
                    <div className="grid grid-cols-1 gap-2.5 sm:gap-2">
                      {[
                        { key: 'hasMinLength', label: 'At least 8 characters', met: passwordStrength.hasMinLength },
                        { key: 'hasUpperCase', label: 'One uppercase letter', met: passwordStrength.hasUpperCase },
                        { key: 'hasLowerCase', label: 'One lowercase letter', met: passwordStrength.hasLowerCase },
                        { key: 'hasDigit', label: 'One number', met: passwordStrength.hasDigit },
                        { key: 'hasSpecialChar', label: 'Special character (!@#$)', met: passwordStrength.hasSpecialChar },
                      ].map((req) => (
                        <div key={req.key} className={`flex items-center text-xs sm:text-xs transition-all duration-300 ${
                          req.met ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          <div className={`mr-3 sm:mr-2 transition-all duration-300 ${
                            req.met ? 'scale-110' : 'scale-100'
                          }`}>
                            {req.met ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border-2 border-current opacity-30" />
                            )}
                          </div>
                          <span className={req.met ? 'font-medium' : ''}>{req.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                enterKeyHint="done"
                label="Confirm Password *"
                value={accountInfo.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                onFocus={() => validation.focusField('confirmPassword')}
                onBlur={() => validation.blurField('confirmPassword')}
                error={validation.getFieldError('confirmPassword') || errors.confirmPassword || getFieldError(validationErrors, 'confirmPassword')}
                leftIcon={<Lock className="w-4 h-4" />}
                showPasswordToggle={true}
                success={validation.getFieldValidation('confirmPassword').isValid && validation.getFieldValidation('confirmPassword').touched && accountInfo.confirmPassword.length > 0}
                helperText={
                  validation.getFieldValidation('confirmPassword').isValidating ? 'Checking passwords match...' :
                  validation.getFieldValidation('confirmPassword').isValid && accountInfo.confirmPassword.length > 0 ? 'Passwords match! ✓' :
                  'Re-enter your password to confirm'
                }
                className="min-h-[52px] sm:min-h-[48px] md:min-h-[44px] touch-manipulation text-base sm:text-sm"
              />
            </div>
          </div>

          {/* Consent */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Privacy & Consent</h3>
            
            <div className="space-y-3 sm:space-y-4">
              {/* Required Consents */}
              <div className={`transition-all duration-300 ${
                errors.terms ? 'animate-pulse' : ''
              }`}>
                <div className="flex items-start space-x-3 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                  <input
                    id="terms-consent"
                    type="checkbox"
                    checked={accountInfo.consent.terms}
                    onChange={(e) => updateField('consent.terms', e.target.checked)}
                    className="mt-1 h-5 w-5 sm:h-4 sm:w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 transition-all touch-manipulation"
                    required
                  />
                  <label htmlFor="terms-consent" className="flex-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed cursor-pointer">
                    I agree to the{' '}
                    <a 
                      href="/terms" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 underline underline-offset-2 font-medium transition-colors touch-manipulation"
                    >
                      Terms of Service
                    </a>
                    <span className="text-red-500 ml-1 font-medium">*</span>
                  </label>
                </div>
                {errors.terms && (
                  <div className="ml-7 mt-2 animate-in slide-in-from-top-1 duration-200">
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.terms}
                    </p>
                  </div>
                )}
              </div>

              <div className={`transition-all duration-300 ${
                errors.privacy ? 'animate-pulse' : ''
              }`}>
                <div className="flex items-start space-x-3 p-4 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                  <input
                    id="privacy-consent"
                    type="checkbox"
                    checked={accountInfo.consent.privacy}
                    onChange={(e) => updateField('consent.privacy', e.target.checked)}
                    className="mt-1 h-5 w-5 sm:h-4 sm:w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 transition-all touch-manipulation"
                    required
                  />
                  <label htmlFor="privacy-consent" className="flex-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed cursor-pointer">
                    I agree to the{' '}
                    <a 
                      href="/privacy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 underline underline-offset-2 font-medium transition-colors touch-manipulation"
                    >
                      Privacy Policy
                    </a>
                    <span className="text-red-500 ml-1 font-medium">*</span>
                  </label>
                </div>
                {errors.privacy && (
                  <div className="ml-7 mt-2 animate-in slide-in-from-top-1 duration-200">
                    <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.privacy}
                    </p>
                  </div>
                )}
              </div>

              {/* Optional Consents */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Optional Preferences</p>
                
                <div className="flex items-start space-x-3 p-4 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                  <input
                    id="marketing-consent"
                    type="checkbox"
                    checked={accountInfo.consent.marketing}
                    onChange={(e) => updateField('consent.marketing', e.target.checked)}
                    className="mt-1 h-5 w-5 sm:h-4 sm:w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 transition-all touch-manipulation"
                  />
                  <label htmlFor="marketing-consent" className="flex-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed cursor-pointer">
                    <span className="font-medium">Marketing Updates</span>
                    <br />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Receive promotional emails and updates about new features
                    </span>
                  </label>
                </div>

                <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <input
                      id="test-data-consent"
                      type="checkbox"
                      checked={accountInfo.consent.testData}
                      onChange={(e) => updateField('consent.testData', e.target.checked)}
                      className="mt-1 h-5 w-5 sm:h-4 sm:w-4 text-blue-600 border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-blue-600 dark:bg-blue-900/50 transition-all touch-manipulation"
                    />
                    <div className="flex-1">
                      <label htmlFor="test-data-consent" className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed cursor-pointer">
                        <span className="font-semibold">📚 Create sample data to help me learn</span>
                        <br />
                        <span className="text-xs text-blue-700 dark:text-blue-300 mt-1 block">
                          Adds test barbers, clients, and appointments so you can safely explore all features. 
                          All sample data is clearly marked and can be deleted anytime.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile-optimized Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 sm:gap-0 pt-8 max-w-2xl mx-auto">
        <Button 
          variant="outline" 
          onClick={onBack} 
          className="order-2 sm:order-1 w-full sm:w-auto px-6 min-h-[48px] sm:min-h-[44px] touch-manipulation"
        >
          Back
        </Button>
        
        <div className="order-1 sm:order-2 flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3">
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
            {/* Progress indicator */}
            {Object.values({
              firstName: accountInfo.firstName.trim(),
              lastName: accountInfo.lastName.trim(),
              email: accountInfo.email,
              password: isPasswordValid(),
              confirmPassword: accountInfo.password === accountInfo.confirmPassword,
              terms: accountInfo.consent.terms,
              privacy: accountInfo.consent.privacy,
            }).filter(Boolean).length}/7 fields complete
          </div>
          <Button 
            onClick={handleSubmit}
            className="w-full sm:w-auto px-6 sm:px-8 min-h-[52px] sm:min-h-[48px] md:min-h-[44px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl touch-manipulation text-base sm:text-sm font-medium"
            disabled={!accountInfo.consent.terms || !accountInfo.consent.privacy || !validation.isValid || validation.isValidating}
          >
            {validation.isValidating ? (
              <>
                <div className="animate-spin w-4 h-4 mr-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                </div>
                Validating...
              </>
            ) : (
              <>
                <span className="block sm:inline">Continue to Business Details</span>
                <svg className="w-4 h-4 ml-2 hidden sm:inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AccountSetup