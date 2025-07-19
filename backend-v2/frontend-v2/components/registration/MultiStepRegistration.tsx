'use client'

import React, { useState, useEffect } from 'react'
import { BusinessTypeSelection, BusinessType } from './BusinessTypeSelection'
import { AccountSetup, AccountInfo } from './AccountSetup'
import { BusinessInformation, BusinessInfo } from './BusinessInformation'
import { ServiceTemplateSelection } from './ServiceTemplateSelection'
import { PricingConfirmation } from './PricingConfirmation'
import { PaymentSetup } from './PaymentSetup'
import { validateStep, ValidationError, getFieldError } from '@/lib/registrationValidation'
import { toast } from '@/hooks/use-toast'
import { ServiceTemplate } from '@/lib/types/service-templates'

export type RegistrationStep = 1 | 2 | 3 | 4 | 5 | 6

export interface RegistrationData {
  businessType: BusinessType | null
  accountInfo: AccountInfo
  businessInfo: BusinessInfo
  serviceTemplates: ServiceTemplate[]
  pricingInfo: {
    chairs: number
    monthlyTotal: number
    tier: string
  } | null
  paymentInfo: {
    trialStarted: boolean
    paymentMethodAdded: boolean
  } | null
}

interface MultiStepRegistrationProps {
  onComplete?: (data: RegistrationData) => void
  onCancel?: () => void
}

const steps = [
  { number: 1, title: 'Business Type', description: 'What describes your business?' },
  { number: 2, title: 'Account Setup', description: 'Create your login credentials' },
  { number: 3, title: 'Business Details', description: 'Tell us about your business' },
  { number: 4, title: 'Service Templates', description: 'Choose your starting services (optional)' },
  { number: 5, title: 'Pricing', description: 'Confirm your plan and pricing' },
  { number: 6, title: 'Payment', description: 'Start your free trial' }
]

export function MultiStepRegistration({ onComplete, onCancel }: MultiStepRegistrationProps) {
  const [currentStep, setCurrentStep] = useState<RegistrationStep>(1)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  
  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])
  
  const [registrationData, setRegistrationData] = useState<RegistrationData>({
    businessType: null,
    accountInfo: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      consent: {
        terms: false,
        privacy: false,
        marketing: false,
        testData: false
      }
    },
    businessInfo: {
      businessName: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: ''
      },
      phone: '',
      website: '',
      chairCount: 1,
      barberCount: 1,
      description: ''
    },
    serviceTemplates: [],
    pricingInfo: null,
    paymentInfo: null
  })

  const updateBusinessType = (businessType: BusinessType) => {
    setRegistrationData(prev => ({ ...prev, businessType }))
  }

  const updateAccountInfo = (accountInfo: AccountInfo) => {
    setRegistrationData(prev => ({ ...prev, accountInfo }))
  }

  const updateBusinessInfo = (businessInfo: BusinessInfo) => {
    setRegistrationData(prev => ({ ...prev, businessInfo }))
  }

  const updatePricingInfo = (chairs: number, monthlyTotal: number, tier: string) => {
    setRegistrationData(prev => ({
      ...prev,
      pricingInfo: { chairs, monthlyTotal, tier }
    }))
  }

  const updateServiceTemplates = (serviceTemplates: ServiceTemplate[]) => {
    setRegistrationData(prev => ({ ...prev, serviceTemplates }))
  }

  const updatePaymentInfo = (paymentInfo: { trialStarted: boolean; paymentMethodAdded: boolean }) => {
    setRegistrationData(prev => ({ ...prev, paymentInfo }))
  }

  const nextStep = () => {
    // Validate current step before proceeding
    const validation = validateStep(currentStep, registrationData)
    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      
      // Show first error in toast
      if (validation.errors.length > 0) {
        toast({
          title: 'Validation Error',
          description: validation.errors[0].message,
          variant: 'destructive'
        })
      }
      return
    }
    
    // Clear validation errors if validation passed
    setValidationErrors([])
    
    if (currentStep < 6) {
      setCurrentStep((prev) => (prev + 1) as RegistrationStep)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as RegistrationStep)
    }
  }

  const goToStep = (step: RegistrationStep) => {
    // Only allow going to previous steps or next step if current step is valid
    if (step <= currentStep || step === currentStep + 1) {
      setCurrentStep(step)
    }
  }

  const handleComplete = () => {
    onComplete?.(registrationData)
  }

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber < currentStep) return 'completed'
    if (stepNumber === currentStep) return 'current'
    return 'upcoming'
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Premium Progress Indicator */}
        <div className="mb-12">
          {/* Mobile Progress Bar */}
          <div className="sm:hidden mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Step {currentStep} of {steps.length}
              </span>
              <div className="flex items-center space-x-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                  ~{Math.max(1, 4 - currentStep)} min remaining
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {Math.round((currentStep / steps.length) * 100)}% Complete
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`bg-gradient-to-r from-primary-500 to-blue-500 h-2 rounded-full ${prefersReducedMotion ? '' : 'transition-all duration-200 ease-out'}`}
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {steps[currentStep - 1].title}
            </p>
          </div>

          {/* Desktop Progress Steps */}
          <div className="hidden sm:block">
            <div className="relative">
              {/* Background Line */}
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700"></div>
              
              {/* Progress Line */}
              <div 
                className={`absolute top-5 left-0 h-0.5 bg-gradient-to-r from-primary-500 to-blue-500 ${prefersReducedMotion ? '' : 'transition-all duration-200 ease-out'}`}
                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              />

              {/* Steps */}
              <div className="relative flex justify-between">
                {steps.map((step, index) => {
                  const status = getStepStatus(step.number)
                  return (
                    <div key={step.number} className="flex flex-col items-center">
                      {/* Step Circle */}
                      <button
                        onClick={() => goToStep(step.number as RegistrationStep)}
                        className={`
                          relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${prefersReducedMotion ? '' : 'transition-colors duration-200'}
                          ${status === 'completed' 
                            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg' 
                            : status === 'current'
                            ? 'bg-gradient-to-r from-primary-500 to-blue-500 text-white shadow-md ring-2 ring-primary-200'
                            : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }
                          ${(step.number <= currentStep || step.number === currentStep + 1) 
                            ? 'cursor-pointer' 
                            : 'cursor-not-allowed opacity-50'
                          }
                        `}
                        disabled={step.number > currentStep + 1}
                      >
                        {status === 'completed' ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          step.number
                        )}
                        
                      </button>
                      
                      {/* Step Info */}
                      <div className="mt-3 text-center">
                        <div className={`text-sm font-medium ${prefersReducedMotion ? '' : 'transition-colors'} ${
                          status === 'current' 
                            ? 'text-primary-600 dark:text-primary-400' 
                            : status === 'completed'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {step.title}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {step.description}
                        </div>
                        
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Step Content Container - Simplified */}
        <div className="relative">
          {/* Content Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
            {/* Step Content */}
            <div className="relative">
              {currentStep === 1 && (
                <div className="p-6 sm:p-8 lg:p-10 ">
                  <BusinessTypeSelection
                    selectedType={registrationData.businessType}
                    onSelect={updateBusinessType}
                    onNext={nextStep}
                    onBack={onCancel}
                  />
                </div>
              )}

              {currentStep === 2 && registrationData.businessType && (
                <div className="p-6 sm:p-8 lg:p-10 ">
                  <AccountSetup
                    businessType={registrationData.businessType}
                    accountInfo={registrationData.accountInfo}
                    validationErrors={validationErrors}
                    onUpdate={updateAccountInfo}
                    onNext={nextStep}
                    onBack={prevStep}
                  />
                </div>
              )}

              {currentStep === 3 && registrationData.businessType && (
                <div className="p-6 sm:p-8 lg:p-10 ">
                  <BusinessInformation
                    businessType={registrationData.businessType}
                    businessInfo={registrationData.businessInfo}
                    validationErrors={validationErrors}
                    onUpdate={updateBusinessInfo}
                    onNext={nextStep}
                    onBack={prevStep}
                  />
                </div>
              )}

              {currentStep === 4 && registrationData.businessType && (
                <div className="p-6 sm:p-8 lg:p-10 ">
                  <ServiceTemplateSelection
                    businessType={registrationData.businessType}
                    businessName={registrationData.businessInfo.businessName}
                    selectedTemplates={registrationData.serviceTemplates}
                    onUpdate={updateServiceTemplates}
                    onNext={nextStep}
                    onBack={prevStep}
                  />
                </div>
              )}

              {currentStep === 5 && registrationData.businessType && (
                <div className="p-6 sm:p-8 lg:p-10 ">
                  <PricingConfirmation
                businessType={registrationData.businessType}
                chairCount={registrationData.businessInfo.chairCount}
                businessName={registrationData.businessInfo.businessName}
                onConfirm={updatePricingInfo}
                onNext={nextStep}
                onBack={prevStep}
                  />
                </div>
              )}

              {currentStep === 6 && registrationData.pricingInfo && (
                <div className="p-6 sm:p-8 lg:p-10 ">
                  <PaymentSetup
                    businessName={registrationData.businessInfo.businessName}
                    pricingInfo={registrationData.pricingInfo}
                    onComplete={updatePaymentInfo}
                    onFinish={handleComplete}
                    onBack={prevStep}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Premium Footer */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              SSL Encrypted
            </span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span>Step {currentStep} of {steps.length}</span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              PCI Compliant
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MultiStepRegistration