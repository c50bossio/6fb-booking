'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { RegistrationData, RegistrationStep } from './types'
import { CheckCircleIcon, ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'

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
              required
            />
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => updateFormData('email', e.target.value)}
              required
            />
            <Input
              label="Phone Number"
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => updateFormData('phone', e.target.value)}
            />
          </div>
        )
      
      case 'account':
        return (
          <div className="space-y-4">
            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => updateFormData('password', e.target.value)}
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => updateFormData('confirmPassword', e.target.value)}
              required
            />
          </div>
        )
      
      case 'business':
        return (
          <div className="space-y-4">
            <Input
              label="Business Name"
              value={formData.businessName || ''}
              onChange={(e) => updateFormData('businessName', e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium mb-2">Business Type</label>
              <select
                value={formData.businessType}
                onChange={(e) => updateFormData('businessType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="individual">Individual Barber</option>
                <option value="shop">Barber Shop</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
        )
      
      case 'preferences':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Service Template</label>
              <select
                value={formData.serviceTemplate}
                onChange={(e) => updateFormData('serviceTemplate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="basic-barber">Basic Barber Services</option>
                <option value="premium-salon">Premium Salon Services</option>
                <option value="custom">Custom Setup</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.acceptTerms}
                  onChange={(e) => updateFormData('acceptTerms', e.target.checked)}
                  className="mr-2"
                />
                I accept the Terms of Service and Privacy Policy
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.acceptMarketing}
                  onChange={(e) => updateFormData('acceptMarketing', e.target.checked)}
                  className="mr-2"
                />
                I'd like to receive marketing emails and updates
              </label>
            </div>
          </div>
        )
      
      default:
        return <div>Unknown step</div>
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {registrationSteps[currentStep].title}
          <span className="text-sm text-gray-500">
            ({currentStep + 1}/{registrationSteps.length})
          </span>
        </CardTitle>
        <CardDescription>
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
        <div className="flex items-center mb-6">
          {registrationSteps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm
                ${index < currentStep ? 'bg-green-500 text-white' : 
                  index === currentStep ? 'bg-blue-500 text-white' : 
                  'bg-gray-200 text-gray-600'}
              `}>
                {index < currentStep ? (
                  <CheckCircleIcon className="w-5 h-5" />
                ) : (
                  index + 1
                )}
              </div>
              {index < registrationSteps.length - 1 && (
                <div className={`w-8 h-1 mx-1 ${
                  index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        {renderStep()}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Previous
          </Button>

          {currentStep === registrationSteps.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={!isStepValid(currentStep) || loading}
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!isStepValid(currentStep)}
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