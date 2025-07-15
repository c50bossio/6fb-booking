'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { PasswordStrengthIndicator, calculatePasswordStrength } from '@/components/ui/PasswordStrengthIndicator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RegistrationData, RegistrationStep } from './types'
import { CheckCircleIcon, ArrowRightIcon, ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface MultiStepRegistrationProps {
  onComplete: (data: RegistrationData) => void
  loading?: boolean
  error?: string
}

const registrationSteps: RegistrationStep[] = [
  {
    id: 'personal',
    title: 'Personal Information',
    description: 'Tell us about yourself',
    fields: ['name', 'email', 'phone']
  },
  {
    id: 'account',
    title: 'Account Security',
    description: 'Create your secure account',
    fields: ['password', 'confirmPassword']
  },
  {
    id: 'business',
    title: 'Business Details',
    description: 'Tell us about your business',
    fields: ['businessName', 'businessType', 'role'],
    optional: true
  },
  {
    id: 'preferences',
    title: 'Preferences',
    description: 'Customize your experience',
    fields: ['serviceTemplate', 'acceptTerms', 'acceptMarketing']
  }
]

export function MultiStepRegistration({ onComplete, loading, error }: MultiStepRegistrationProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<RegistrationData>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    businessName: '',
    businessType: 'individual',
    role: 'barber',
    serviceTemplate: 'basic-barber',
    acceptTerms: false,
    acceptMarketing: false,
    referralCode: '',
    timezone: 'America/New_York'
  })

  const updateFormData = (field: keyof RegistrationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const nextStep = () => {
    if (currentStep < registrationSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = () => {
    onComplete(formData)
  }

  const isStepValid = (stepIndex: number): boolean => {
    const step = registrationSteps[stepIndex]
    
    // Check required fields for this step
    return step.fields.every(field => {
      if (field === 'acceptTerms') return formData.acceptTerms
      if (step.optional) return true // Optional steps are always valid
      
      const value = formData[field as keyof RegistrationData]
      
      // Special validation for specific fields
      if (field === 'email') {
        return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.toString())
      }
      
      if (field === 'password') {
        const strength = calculatePasswordStrength(value?.toString() || '')
        return strength.score >= 2 // At least "Fair" strength
      }
      
      if (field === 'confirmPassword') {
        return value && value === formData.password
      }
      
      return value && value.toString().trim().length > 0
    })
  }

  const renderStep = () => {
    const step = registrationSteps[currentStep]
    
    switch (step.id) {
      case 'personal':
        return (
          <div className="space-y-4">
            <Input
              label="Full Name"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              placeholder="Enter your full name"
              required
            />
            <div>
              <Input
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                placeholder="your.email@example.com"
                required
                error={formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? 'Please enter a valid email address' : undefined}
              />
              {formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center">
                  <CheckCircleIcon className="w-3 h-3 mr-1" />
                  Valid email address
                </p>
              )}
            </div>
            <PhoneInput
              value={formData.phone || ''}
              onChange={(value) => updateFormData('phone', value)}
              label="Phone Number (Optional)"
              placeholder="(555) 123-4567"
            />
          </div>
        )
      
      case 'account':
        return (
          <div className="space-y-4">
            <div>
              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => updateFormData('password', e.target.value)}
                placeholder="Create a strong password"
                required
              />
              <PasswordStrengthIndicator 
                password={formData.password} 
                show={formData.password.length > 0}
              />
            </div>
            <div>
              <Input
                label="Confirm Password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                placeholder="Confirm your password"
                required
                error={formData.confirmPassword && formData.confirmPassword !== formData.password ? 'Passwords do not match' : undefined}
              />
              {formData.confirmPassword && formData.confirmPassword === formData.password && formData.password && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center">
                  <CheckCircleIcon className="w-3 h-3 mr-1" />
                  Passwords match
                </p>
              )}
            </div>
          </div>
        )
      
      case 'business':
        return (
          <div className="space-y-6">
            <Input
              label="Business Name (Optional)"
              value={formData.businessName || ''}
              onChange={(e) => updateFormData('businessName', e.target.value)}
              placeholder="Your barbershop or business name"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Business Type
              </label>
              <div className="space-y-3">
                {[
                  { value: 'individual', label: 'Individual Barber', description: 'Solo barber operating independently' },
                  { value: 'shop', label: 'Barber Shop', description: 'Multi-chair barbershop or salon' },
                  { value: 'enterprise', label: 'Enterprise', description: 'Multiple locations or franchise' }
                ].map((option) => (
                  <label key={option.value} className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="businessType"
                      value={option.value}
                      checked={formData.businessType === option.value}
                      onChange={(e) => updateFormData('businessType', e.target.value)}
                      className="mt-1 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )
      
      case 'preferences':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Service Template
              </label>
              <div className="space-y-3">
                {[
                  { value: 'basic-barber', label: 'Basic Barber Services', description: 'Essential cuts, beard trim, basic styling' },
                  { value: 'premium-salon', label: 'Premium Salon Services', description: 'Full service cuts, styling, treatments' },
                  { value: 'custom', label: 'Custom Setup', description: 'I\'ll customize my services later' }
                ].map((option) => (
                  <label key={option.value} className="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="serviceTemplate"
                      value={option.value}
                      checked={formData.serviceTemplate === option.value}
                      onChange={(e) => updateFormData('serviceTemplate', e.target.value)}
                      className="mt-1 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={formData.acceptTerms}
                  onChange={(e) => updateFormData('acceptTerms', e.target.checked)}
                  className="mt-1 text-primary-600 focus:ring-primary-500"
                  required
                />
                <div className="text-sm">
                  <span className="text-gray-900 dark:text-white">
                    I accept the{' '}
                    <a href="/terms" target="_blank" className="text-primary-600 hover:text-primary-700 underline">
                      Terms of Service
                    </a>
                    {' '}and{' '}
                    <a href="/privacy" target="_blank" className="text-primary-600 hover:text-primary-700 underline">
                      Privacy Policy
                    </a>
                    <span className="text-red-500 ml-1">*</span>
                  </span>
                </div>
              </label>
              
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={formData.acceptMarketing}
                  onChange={(e) => updateFormData('acceptMarketing', e.target.checked)}
                  className="mt-1 text-primary-600 focus:ring-primary-500"
                />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  I'd like to receive marketing emails and updates about new features
                </div>
              </label>
            </div>
            
            {!formData.acceptTerms && (
              <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">You must accept the Terms of Service to continue</span>
              </div>
            )}
          </div>
        )
      
      default:
        return <div>Unknown step</div>
    }
  }

  return (
    <Card 
      className="w-full max-w-md mx-auto shadow-xl border-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm"
      role="main"
      aria-labelledby="registration-title"
      aria-describedby="registration-description"
    >
      <CardHeader className="text-center">
        <CardTitle 
          id="registration-title"
          className="text-xl font-semibold text-gray-900 dark:text-white"
        >
          {registrationSteps[currentStep].title}
          <span className="block text-sm font-normal text-gray-500 dark:text-gray-400 mt-1">
            Step {currentStep + 1} of {registrationSteps.length}
          </span>
        </CardTitle>
        <CardDescription 
          id="registration-description"
          className="text-gray-600 dark:text-gray-300"
        >
          {registrationSteps[currentStep].description}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {/* Progress indicators */}
        <nav aria-label="Registration progress" className="mb-8">
          <div className="flex items-center justify-center">
            {registrationSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div 
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 transform
                    ${index < currentStep 
                      ? 'bg-green-500 text-white scale-110 shadow-lg' 
                      : index === currentStep 
                      ? 'bg-primary-600 text-white scale-110 shadow-lg ring-4 ring-primary-200 dark:ring-primary-800' 
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 scale-100'
                    }
                  `}
                  aria-label={`
                    Step ${index + 1}: ${step.title}. 
                    ${index < currentStep ? 'Completed' : index === currentStep ? 'Current step' : 'Not started'}
                  `}
                  aria-current={index === currentStep ? 'step' : undefined}
                >
                  {index < currentStep ? (
                    <CheckCircleIcon className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <span aria-hidden="true">{index + 1}</span>
                  )}
                </div>
                {index < registrationSteps.length - 1 && (
                  <div 
                    className={`w-12 h-2 mx-2 rounded-full transition-all duration-500 ${
                      index < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                    aria-hidden="true"
                  />
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* Step content with animation */}
        <div 
          className="min-h-[400px] transition-all duration-300 ease-in-out"
          role="group"
          aria-labelledby="registration-title"
        >
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <fieldset>
              <legend className="sr-only">
                {registrationSteps[currentStep].title} - Step {currentStep + 1} of {registrationSteps.length}
              </legend>
              {renderStep()}
            </fieldset>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`transition-all duration-200 ${
              currentStep === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
            }`}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {currentStep === registrationSteps.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={!isStepValid(currentStep) || loading}
              className={`bg-green-600 hover:bg-green-700 text-white transition-all duration-200 ${
                isStepValid(currentStep) && !loading ? 'hover:scale-105 shadow-lg' : ''
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Creating Account...
                </>
              ) : (
                <>
                  Complete Registration
                  <CheckCircleIcon className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!isStepValid(currentStep)}
              className={`transition-all duration-200 ${
                isStepValid(currentStep) ? 'hover:scale-105 shadow-lg' : 'opacity-75'
              }`}
            >
              Next
              <ArrowRightIcon className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}