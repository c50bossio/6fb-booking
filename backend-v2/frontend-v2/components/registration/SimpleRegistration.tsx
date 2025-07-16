'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { GoogleOAuth } from '@/components/auth/GoogleOAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RegistrationData } from './types'
import { CheckCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

interface SimpleRegistrationProps {
  onComplete: (data: RegistrationData) => void
  loading?: boolean
  error?: string
}

interface SimpleFormData {
  name: string
  email: string
  password: string
  phone?: string
  businessName?: string
  businessType: 'individual' | 'shop' | 'skip'
  acceptTerms: boolean
  acceptMarketing: boolean
  acceptTestData: boolean
}

export function SimpleRegistration({ onComplete, loading, error }: SimpleRegistrationProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState<SimpleFormData>({
    name: '',
    email: '',
    password: '',
    phone: '',
    businessName: '',
    businessType: 'individual',
    acceptTerms: false,
    acceptMarketing: false,
    acceptTestData: false
  })

  const updateFormData = (field: keyof SimpleFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const isStrongPassword = (password: string) => {
    return password.length >= 8 && 
           /[A-Z]/.test(password) && 
           /[a-z]/.test(password) && 
           /\d/.test(password)
  }

  const isStep1Valid = () => {
    return formData.name.trim().length > 0 &&
           isValidEmail(formData.email) &&
           isStrongPassword(formData.password) &&
           formData.acceptTerms
  }

  const handleNext = () => {
    if (isStep1Valid()) {
      setStep(2)
    }
  }

  const handleComplete = () => {
    // Convert simple form data to full registration data
    const registrationData: RegistrationData = {
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.password,
      name: formData.name,
      phone: formData.phone,
      businessName: formData.businessType === 'shop' ? formData.name : '',
      businessType: formData.businessType === 'skip' ? 'individual' : formData.businessType,
      role: 'barber',
      serviceTemplate: formData.businessType === 'shop' ? 'premium-salon' : 'basic-barber',
      acceptTerms: formData.acceptTerms,
      acceptMarketing: formData.acceptMarketing,
      acceptTestData: formData.acceptTestData,
      referralCode: '',
      timezone: 'America/New_York'
    }
    
    onComplete(registrationData)
  }

  const handleSkip = () => {
    updateFormData('businessType', 'skip')
    handleComplete()
  }

  if (step === 1) {
    return (
      <div className="w-full max-w-md mx-auto">
        {/* Google Sign-Up Button */}
        <Card className="mb-6 shadow-xl border-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
          <CardContent className="pt-6">
            <GoogleOAuth
              text="Sign up with Google"
              className="w-full h-12 text-base font-medium border-gray-300 hover:bg-gray-50 transition-all duration-200"
              onError={(error) => {
                console.error('Google OAuth error:', error)
                // Show user-friendly error message
                const errorMessage = error.message.includes('not configured') 
                  ? 'Google sign-in is being set up. Please use email registration for now.'
                  : 'Google sign-in failed. Please try email registration instead.'
                
                // You could add a toast notification here
                alert(errorMessage)
              }}
              onSuccess={async (userData) => {
                console.log('Google OAuth success:', userData)
                
                try {
                  // Import the API function
                  const { registerGoogle } = await import('@/lib/api')
                  
                  // Call the Google OAuth registration endpoint
                  const oauthData = {
                    email: userData.email,
                    name: userData.name || `${userData.given_name} ${userData.family_name}`.trim(),
                    google_id: userData.id,
                    profile_picture: userData.picture,
                    user_type: 'barber' as const,
                    business_type: 'individual' as const,
                    accept_marketing: false,
                    timezone: 'America/New_York'
                  }
                  
                  const response = await registerGoogle(oauthData)
                  console.log('Google registration response:', response)
                  
                  // Show success message and redirect
                  alert(`Welcome ${userData.name}! Your account has been created successfully. You can complete your business setup in the dashboard.`)
                  
                  // Redirect to dashboard or welcome page
                  window.location.href = '/dashboard/welcome'
                  
                } catch (error) {
                  console.error('Google registration failed:', error)
                  alert('Google registration failed. Please try email registration instead.')
                }
              }}
            />
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">
                  Or continue with email
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registration Form */}
        <Card className="shadow-xl border-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              Create Your Account
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Join thousands of successful barbers
            </p>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
              <Input
                id="registration-name"
                label="Full Name"
                value={formData.name}
                onChange={(e) => updateFormData('name', e.target.value)}
                placeholder="Enter your full name"
                required
                aria-required="true"
                aria-label="Full Name"
                aria-describedby="name-help"
                autoComplete="name"
              />

              <div>
                <Input
                  id="registration-email"
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  aria-required="true"
                  aria-label="Email Address"
                  aria-describedby="email-validation"
                  autoComplete="email"
                  error={formData.email && !isValidEmail(formData.email) ? 'Please enter a valid email address' : undefined}
                />
                {formData.email && isValidEmail(formData.email) && (
                  <p id="email-validation" className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center">
                    <CheckCircleIcon className="w-3 h-3 mr-1" />
                    Valid email address
                  </p>
                )}
              </div>

              <div>
                <div className="relative">
                  <Input
                    id="registration-password"
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => updateFormData('password', e.target.value)}
                    placeholder="Create a strong password"
                    required
                    aria-required="true"
                    aria-label="Password"
                    aria-describedby="password-requirements"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-4 h-4" />
                    ) : (
                      <EyeIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
                
                {/* Simplified password requirements */}
                {formData.password && (
                  <div id="password-requirements" className="mt-2 space-y-1">
                    <div className="flex items-center space-x-2 text-xs">
                      {isStrongPassword(formData.password) ? (
                        <CheckCircleIcon className="w-3 h-3 text-green-500" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-gray-300" />
                      )}
                      <span className={isStrongPassword(formData.password) ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>
                        Strong password (8+ chars, uppercase, lowercase, number)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 space-y-3">
                <label className="flex items-start space-x-3">
                  <input
                    id="accept-terms"
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={(e) => updateFormData('acceptTerms', e.target.checked)}
                    className="mt-1 text-primary-600 focus:ring-primary-500"
                    required
                    aria-required="true"
                    aria-label="I agree to the Terms of Service and Privacy Policy"
                    aria-describedby="terms-description"
                  />
                  <div id="terms-description" className="text-sm text-gray-600 dark:text-gray-300">
                    I agree to the{' '}
                    <a href="/terms" target="_blank" className="text-primary-600 hover:text-primary-700 underline">
                      Terms of Service
                    </a>
                    {' '}and{' '}
                    <a href="/privacy" target="_blank" className="text-primary-600 hover:text-primary-700 underline">
                      Privacy Policy
                    </a>
                    <span className="text-red-500 ml-1">*</span>
                  </div>
                </label>
              </div>

              <Button
                type="submit"
                disabled={!isStep1Valid() || loading}
                className={`w-full h-12 text-base font-medium transition-all duration-200 ${
                  isStep1Valid() ? 'bg-primary-600 hover:bg-primary-700 shadow-lg hover:shadow-xl' : 'opacity-50'
                }`}
              >
                Continue
              </Button>

              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                Already have an account?{' '}
                <a href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                  Sign in
                </a>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="shadow-xl border-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
            Quick Setup
            <span className="block text-sm font-normal text-gray-500 dark:text-gray-400 mt-1">
              (Optional - takes 30 seconds)
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); handleComplete(); }} className="space-y-6">
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                What describes you best?
              </legend>
              <div className="space-y-3" role="radiogroup" aria-labelledby="business-type-legend">
                {[
                  { value: 'individual', label: 'Individual Barber', description: 'I work solo or rent a chair' },
                  { value: 'shop', label: 'Barber Shop Owner', description: 'I own/manage a barbershop' },
                  { value: 'skip', label: 'Skip for now', description: 'I\'ll set this up later' }
                ].map((option) => (
                  <label key={option.value} className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="businessType"
                      value={option.value}
                      checked={formData.businessType === option.value}
                      onChange={(e) => updateFormData('businessType', e.target.value as 'individual' | 'shop' | 'skip')}
                      className="mt-1 text-primary-600 focus:ring-primary-500"
                      aria-describedby={`business-type-${option.value}-description`}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
                      <div id={`business-type-${option.value}-description`} className="text-sm text-gray-600 dark:text-gray-400">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>

            <PhoneInput
              id="registration-phone"
              value={formData.phone || ''}
              onChange={(value) => updateFormData('phone', value)}
              label="Phone Number (Optional)"
              placeholder="(555) 123-4567"
              aria-describedby="phone-help"
            />

            <div>
              <label className="flex items-start space-x-3">
                <input
                  id="accept-marketing"
                  type="checkbox"
                  checked={formData.acceptMarketing}
                  onChange={(e) => updateFormData('acceptMarketing', e.target.checked)}
                  className="mt-1 text-primary-600 focus:ring-primary-500"
                  aria-describedby="marketing-description"
                />
                <div id="marketing-description" className="text-sm text-gray-600 dark:text-gray-400">
                  Send me tips, updates, and special offers to help grow my business
                </div>
              </label>
            </div>

            <div>
              <label className="flex items-start space-x-3">
                <input
                  id="accept-test-data"
                  type="checkbox"
                  checked={formData.acceptTestData}
                  onChange={(e) => updateFormData('acceptTestData', e.target.checked)}
                  className="mt-1 text-primary-600 focus:ring-primary-500"
                  aria-describedby="test-data-description"
                />
                <div id="test-data-description" className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-blue-600 dark:text-blue-400">🚀 Demo Mode:</span> Include sample appointments, clients, and services to explore the platform immediately
                </div>
              </label>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                disabled={loading}
                className="flex-1 h-12 text-base font-medium"
              >
                Skip for now
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 h-12 text-base font-medium bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}