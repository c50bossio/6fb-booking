'use client'

import React, { useState } from 'react'
import { BusinessTypeSelection, BusinessType } from './BusinessTypeSelection'
import { AccountSetup, AccountInfo } from './AccountSetup'
import { BusinessInformation, BusinessInfo } from './BusinessInformation'
import { PricingConfirmation } from './PricingConfirmation'
import { PaymentSetup } from './PaymentSetup'

export type RegistrationStep = 1 | 2 | 3 | 4 | 5

export interface RegistrationData {
  businessType: BusinessType | null
  accountInfo: AccountInfo
  businessInfo: BusinessInfo
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
  { number: 4, title: 'Pricing', description: 'Confirm your plan and pricing' },
  { number: 5, title: 'Payment', description: 'Start your free trial' }
]

export function MultiStepRegistration({ onComplete, onCancel }: MultiStepRegistrationProps) {
  const [currentStep, setCurrentStep] = useState<RegistrationStep>(1)
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

  const updatePaymentInfo = (paymentInfo: { trialStarted: boolean; paymentMethodAdded: boolean }) => {
    setRegistrationData(prev => ({ ...prev, paymentInfo }))
  }

  const nextStep = () => {
    if (currentStep < 5) {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => {
              const status = getStepStatus(step.number)
              return (
                <div key={step.number} className="flex items-center">
                  {/* Step Circle */}
                  <button
                    onClick={() => goToStep(step.number as RegistrationStep)}
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200
                      ${status === 'completed' 
                        ? 'bg-green-500 text-white hover:bg-green-600' 
                        : status === 'current'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }
                      ${(step.number <= currentStep || step.number === currentStep + 1) 
                        ? 'cursor-pointer hover:scale-105' 
                        : 'cursor-not-allowed'
                      }
                    `}
                    disabled={step.number > currentStep + 1}
                  >
                    {status === 'completed' ? '✓' : step.number}
                  </button>
                  
                  {/* Step Info */}
                  <div className="ml-3 hidden sm:block">
                    <div className={`text-sm font-medium ${
                      status === 'current' 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : status === 'completed'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {step.description}
                    </div>
                  </div>
                  
                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      step.number < currentStep 
                        ? 'bg-green-500' 
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {currentStep === 1 && (
            <div className="p-8">
              <BusinessTypeSelection
                selectedType={registrationData.businessType}
                onSelect={updateBusinessType}
                onNext={nextStep}
                onBack={onCancel}
              />
            </div>
          )}

          {currentStep === 2 && registrationData.businessType && (
            <div className="p-8">
              <AccountSetup
                businessType={registrationData.businessType}
                accountInfo={registrationData.accountInfo}
                onUpdate={updateAccountInfo}
                onNext={nextStep}
                onBack={prevStep}
              />
            </div>
          )}

          {currentStep === 3 && registrationData.businessType && (
            <div className="p-8">
              <BusinessInformation
                businessType={registrationData.businessType}
                businessInfo={registrationData.businessInfo}
                onUpdate={updateBusinessInfo}
                onNext={nextStep}
                onBack={prevStep}
              />
            </div>
          )}

          {currentStep === 4 && registrationData.businessType && (
            <div className="p-8">
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

          {currentStep === 5 && registrationData.pricingInfo && (
            <div className="p-8">
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

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Step {currentStep} of {steps.length} • Your information is secure and encrypted
          </p>
        </div>
      </div>
    </div>
  )
}

export default MultiStepRegistration