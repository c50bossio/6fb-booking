'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { BusinessTypeSelection, BusinessType } from './BusinessTypeSelection'
import { AccountSetup, AccountInfo } from './AccountSetup'
import { BusinessInformation, BusinessInfo } from './BusinessInformation'
import { ServiceTemplateSelection } from './ServiceTemplateSelection'
import { PricingConfirmation } from './PricingConfirmation'
import { PaymentSetup } from './PaymentSetup'
import { DataRecoveryPrompt } from './DataRecoveryPrompt'
import { AutoSaveIndicator } from './AutoSaveIndicator'
import { RegistrationErrorBoundary } from '../ErrorBoundary'
import { validateStep, ValidationError, getFieldError } from '@/lib/registrationValidation'
import { 
  toast, 
  toastRegistrationError, 
  toastDataRecovery 
} from '@/hooks/use-toast'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { ValidationSummary, useValidation } from '@/components/ui/ValidationDisplay'
import { ServiceTemplate } from '@/lib/types/service-templates'
import { useRegistrationPersistence } from '@/hooks/useRegistrationPersistence'
import { 
  setUserContext, 
  captureError,
  ErrorCategory 
} from '@/lib/error-monitoring'
// import { 
//   announceStepChange, 
//   announceFormSubmission,
//   detectAccessibilityPreferences
// } from '@/lib/accessibility'

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
  if (process.env.NODE_ENV === 'development') {
    console.log('[MultiStepRegistration] Component mounting/rendering')
  }
  const [currentStep, setCurrentStep] = useState<RegistrationStep>(1)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false)
  const [isRecoveryLoading, setIsRecoveryLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Enhanced error handling
  const errorHandler = useErrorHandler({
    toastType: 'registration',
    enableProgressTracking: true,
    enableOfflineDetection: true,
    gracefulDegradation: true,
    onReportError: (error, errorId) => {
      captureError(error, `Registration Step ${currentStep}`, {
        category: ErrorCategory.USER_INPUT,
        metadata: {
          step: currentStep,
          errorId,
          formData: registrationData
        }
      })
    }
  })
  
  // Validation management
  const validation = useValidation()
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[MultiStepRegistration] Current step:', currentStep)
  }
  
  // Initialize persistence hook
  const persistence = useRegistrationPersistence({
    enableAutoSave: true,
    autoSaveDelay: 2500,
    onDataRecovered: async (data, step) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[MultiStepRegistration] Data recovered:', { data, step })
      }
      
      try {
        setRegistrationData(data)
        setCurrentStep(step)
        
        // Update user context for error monitoring
        setUserContext({
          registrationStep: step,
          businessType: data.businessType || undefined
        })
        
        // Announce step change
        // Announce step change for accessibility
        if (typeof window !== 'undefined') {
          import('@/lib/accessibility').then(({ announceStepChange }) => {
            announceStepChange(step, steps.length, steps[step - 1].title)
          }).catch(() => {})
        }
        
        toast({
          title: 'Progress Restored',
          description: `Welcome back! Continuing from step ${step}.`,
          variant: 'default'
        })

        // Clear any existing validation errors
        validation.clearAllErrors()
      } catch (error) {
        errorHandler.handleError(error, 'Data Recovery')
      }
    }
  })
  
  // Accessibility preferences state
  const [preferences, setPreferences] = useState({
    prefersReducedMotion: false,
    prefersHighContrast: false,
    prefersDarkMode: false
  })

  // Initialize accessibility preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@/lib/accessibility').then(({ detectAccessibilityPreferences }) => {
        const prefs = detectAccessibilityPreferences()
        setPreferences(prefs)
        setPrefersReducedMotion(prefs.prefersReducedMotion)
      }).catch(() => {})
      
      // Set up listener for preference changes
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
      mediaQuery.addEventListener('change', handleChange)
      
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
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

  // Initialize recovery prompt check with error handling
  useEffect(() => {
    let isMounted = true
    
    const checkRecovery = async () => {
      try {
        const recoveryData = await persistence.checkForStoredData()
        if (!isMounted) return
        
        if (recoveryData && recoveryData.hasData) {
          setShowRecoveryPrompt(true)
          
          // Show data recovery toast
          toastDataRecovery(
            recoveryData.businessName,
            async () => {
              setIsRecoveryLoading(true)
              try {
                const recovered = await persistence.acceptRecovery()
                if (recovered) {
                  setShowRecoveryPrompt(false)
                }
              } catch (error) {
                errorHandler.handleError(error, 'Progress Recovery')
              } finally {
                setIsRecoveryLoading(false)
              }
            },
            async () => {
              try {
                await persistence.declineRecovery()
                setShowRecoveryPrompt(false)
              } catch (error) {
                errorHandler.handleError(error, 'Decline Recovery')
              }
            }
          )
        }
      } catch (error) {
        errorHandler.handleError(error, 'Check Recovery Data')
      }
    }
    
    checkRecovery()
    
    return () => {
      isMounted = false
    }
  }, [])

  // Update handlers with auto-save integration - optimized to prevent loops
  const updateBusinessType = useCallback((businessType: BusinessType) => {
    setRegistrationData(prev => {
      const updated = { ...prev, businessType }
      // Debounced auto-save to prevent loops
      setTimeout(() => {
        persistence.enableAutoSave(updated, currentStep)
      }, 0)
      return updated
    })
  }, [currentStep])

  const updateAccountInfo = useCallback((accountInfo: AccountInfo) => {
    setRegistrationData(prev => {
      const updated = { ...prev, accountInfo }
      // Debounced auto-save to prevent loops
      setTimeout(() => {
        persistence.enableAutoSave(updated, currentStep)
      }, 0)
      return updated
    })
  }, [currentStep])

  const updateBusinessInfo = useCallback((businessInfo: BusinessInfo) => {
    setRegistrationData(prev => {
      const updated = { ...prev, businessInfo }
      // Debounced auto-save to prevent loops
      setTimeout(() => {
        persistence.enableAutoSave(updated, currentStep)
      }, 0)
      return updated
    })
  }, [currentStep])

  const updatePricingInfo = useCallback((chairs: number, monthlyTotal: number, tier: string) => {
    setRegistrationData(prev => {
      const updated = {
        ...prev,
        pricingInfo: { chairs, monthlyTotal, tier }
      }
      // Debounced auto-save to prevent loops
      setTimeout(() => {
        persistence.enableAutoSave(updated, currentStep)
      }, 0)
      return updated
    })
  }, [currentStep])

  const updateServiceTemplates = useCallback((serviceTemplates: ServiceTemplate[]) => {
    setRegistrationData(prev => {
      const updated = { ...prev, serviceTemplates }
      // Debounced auto-save to prevent loops
      setTimeout(() => {
        persistence.enableAutoSave(updated, currentStep)
      }, 0)
      return updated
    })
  }, [currentStep])

  const updatePaymentInfo = useCallback((paymentInfo: { trialStarted: boolean; paymentMethodAdded: boolean }) => {
    setRegistrationData(prev => {
      const updated = { ...prev, paymentInfo }
      // Debounced auto-save to prevent loops
      setTimeout(() => {
        persistence.enableAutoSave(updated, currentStep)
      }, 0)
      return updated
    })
  }, [currentStep])

  const nextStep = useCallback(async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[MultiStepRegistration] nextStep called, currentStep:', currentStep)
      console.log('[MultiStepRegistration] registrationData:', registrationData)
    }
    
    try {
      // Validate current step before proceeding
      const stepValidation = validateStep(currentStep, registrationData)
      if (process.env.NODE_ENV === 'development') {
        console.log('[MultiStepRegistration] validation result:', stepValidation)
      }
      
      if (!stepValidation.isValid) {
        // Clear existing validation errors
        validation.clearAllErrors()
        
        // Set new validation errors
        stepValidation.errors.forEach(error => {
          validation.setFieldError(error.field, error.message)
        })
        
        // Show registration-specific error toast
        if (stepValidation.errors.length > 0) {
          const error = new Error(stepValidation.errors[0].message)
          toastRegistrationError(error, `Step ${currentStep} Validation`, {
            showDetails: false
          })
        }
        return
      }
      
      // Clear validation errors if validation passed
      validation.clearAllErrors()
      setValidationErrors([])
      
      if (currentStep < 6) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[MultiStepRegistration] Moving to next step')
        }
        const nextStepNumber = (currentStep + 1) as RegistrationStep
        
        // Update user context
        setUserContext({
          registrationStep: nextStepNumber,
          businessType: registrationData.businessType || undefined
        })
        
        // Announce step change
        if (typeof window !== 'undefined') {
          import('@/lib/accessibility').then(({ announceStepChange }) => {
            announceStepChange(nextStepNumber, steps.length, steps[nextStepNumber - 1].title)
          }).catch(() => {})
        }
        
        setCurrentStep(nextStepNumber)
        
        // Auto-save progress when moving to next step (debounced)
        setTimeout(() => {
          persistence.enableAutoSave(registrationData, nextStepNumber)
        }, 100)
      }
    } catch (error) {
      errorHandler.handleError(error, `Step ${currentStep} Navigation`)
    }
  }, [currentStep, registrationData, validation])

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

  const handleComplete = useCallback(async () => {
    try {
      setIsSubmitting(true)
      if (typeof window !== 'undefined') {
        import('@/lib/accessibility').then(({ announceFormSubmission }) => {
          announceFormSubmission(true, 'Registration')
        }).catch(() => {})
      }
      
      // Final validation
      const finalValidation = validateStep(currentStep, registrationData)
      if (!finalValidation.isValid) {
        finalValidation.errors.forEach(error => {
          validation.setFieldError(error.field, error.message)
        })
        return
      }

      // Clear saved progress on successful completion
      await errorHandler.withErrorHandling(
        async () => {
          await persistence.clearProgress()
          onComplete?.(registrationData)
        },
        'Complete Registration',
        { 
          showProgress: true, 
          progressMessage: 'Completing registration...' 
        }
      )
      
      if (typeof window !== 'undefined') {
        import('@/lib/accessibility').then(({ announceFormSubmission }) => {
          announceFormSubmission(false, 'Registration')
        }).catch(() => {})
      }
    } catch (error) {
      errorHandler.handleError(error, 'Registration Completion')
    } finally {
      setIsSubmitting(false)
    }
  }, [registrationData, persistence, onComplete, currentStep, validation, errorHandler])

  // Recovery prompt handlers
  const handleAcceptRecovery = useCallback(async () => {
    setIsRecoveryLoading(true)
    try {
      await persistence.acceptRecovery()
      setShowRecoveryPrompt(false)
    } catch (error) {
      console.error('[MultiStepRegistration] Recovery accept failed:', error)
      toast({
        title: 'Recovery Failed',
        description: 'Unable to restore your progress. Starting fresh.',
        variant: 'destructive'
      })
    } finally {
      setIsRecoveryLoading(false)
    }
  }, [persistence])

  const handleDeclineRecovery = useCallback(async () => {
    setIsRecoveryLoading(true)
    try {
      await persistence.declineRecovery()
      setShowRecoveryPrompt(false)
    } catch (error) {
      console.error('[MultiStepRegistration] Recovery decline failed:', error)
    } finally {
      setIsRecoveryLoading(false)
    }
  }, [persistence])

  // Manual save and clear handlers
  const handleManualSave = useCallback(async () => {
    const success = await persistence.saveProgress(registrationData, currentStep)
    if (success) {
      toast({
        title: 'Progress Saved',
        description: 'Your registration progress has been saved.',
        variant: 'default'
      })
    } else {
      toast({
        title: 'Save Failed',
        description: 'Unable to save your progress. Please try again.',
        variant: 'destructive'
      })
    }
  }, [registrationData, currentStep, persistence])

  const handleClearProgress = useCallback(async () => {
    const success = await persistence.clearProgress()
    if (success) {
      toast({
        title: 'Progress Cleared',
        description: 'Your saved registration progress has been cleared.',
        variant: 'default'
      })
    }
  }, [persistence])

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber < currentStep) return 'completed'
    if (stepNumber === currentStep) return 'current'
    return 'upcoming'
  }

  // Handle progress recovery
  const handleProgressRecovery = useCallback(async () => {
    try {
      setIsRecoveryLoading(true)
      const recovered = await persistence.acceptRecovery()
      if (recovered) {
        setShowRecoveryPrompt(false)
      }
    } catch (error) {
      errorHandler.handleError(error, 'Progress Recovery')
    } finally {
      setIsRecoveryLoading(false)
    }
  }, [persistence, errorHandler])

  const content = (
    <>
      {/* Data Recovery Prompt */}
      {persistence.recoveryPrompt && (
        <DataRecoveryPrompt
          isOpen={showRecoveryPrompt}
          recoveryData={persistence.recoveryPrompt}
          onAccept={handleAcceptRecovery}
          onDecline={handleDeclineRecovery}
          onClose={() => setShowRecoveryPrompt(false)}
          isLoading={isRecoveryLoading}
        />
      )}

      {/* Validation Summary */}
      {validation.hasAnyErrors && (
        <div className="mb-6">
          <ValidationSummary 
            errors={validation.errors} 
            onErrorClick={(field) => {
              // Scroll to field (could be enhanced)
              const element = document.getElementById(field)
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                element.focus()
              }
            }}
          />
        </div>
      )}

      <div className="py-4 sm:py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Premium Progress Indicator */}
        <div className="mb-12">
          {/* Enhanced Mobile Progress Bar */}
          <div className="sm:hidden mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Step {currentStep} of {steps.length}
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                  ~{Math.max(1, 4 - currentStep)} min
                </span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {Math.round((currentStep / steps.length) * 100)}%
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-3 overflow-hidden">
              <div 
                className={`bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 h-3 rounded-full shadow-sm ${prefersReducedMotion ? '' : 'transition-all duration-300 ease-out'}`}
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {steps[currentStep - 1].title}
              </p>
              <div className="flex space-x-1">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index + 1 <= currentStep
                        ? 'bg-blue-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
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
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
            {/* Step Content */}
            <div className="relative">
              {currentStep === 1 && (
                <div className="p-4 sm:p-6 md:p-8 lg:p-10">
                  <BusinessTypeSelection
                    selectedType={registrationData.businessType}
                    onSelect={updateBusinessType}
                    onNext={nextStep}
                    onBack={onCancel}
                  />
                </div>
              )}

              {currentStep === 2 && registrationData.businessType && (
                <div className="p-4 sm:p-6 md:p-8 lg:p-10">
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
                <div className="p-4 sm:p-6 md:p-8 lg:p-10">
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
                <div className="p-4 sm:p-6 md:p-8 lg:p-10">
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
                <div className="p-4 sm:p-6 md:p-8 lg:p-10">
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
                <div className="p-4 sm:p-6 md:p-8 lg:p-10">
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
        <div className="mt-6 sm:mt-8 text-center">
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
    </>
  )

  return (
    <RegistrationErrorBoundary
      registrationStep={currentStep}
      businessType={registrationData.businessType || undefined}
      onProgressRecovery={handleProgressRecovery}
    >
      {content}
    </RegistrationErrorBoundary>
  )
}

export default MultiStepRegistration