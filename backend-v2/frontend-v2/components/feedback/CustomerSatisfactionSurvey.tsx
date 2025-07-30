'use client'

import { useState, useEffect } from 'react'
import { Star, X, MessageSquare, ThumbsUp, ThumbsDown, Send } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SurveyProps {
  appointmentId?: string
  barberId?: string
  clientId?: string
  triggerEvent?: 'appointment_completed' | 'app_used' | 'manual'
  onComplete?: (feedback: SurveyResponse) => void
  onClose?: () => void
}

interface SurveyResponse {
  appointmentId?: string
  barberId?: string
  clientId?: string
  overallRating: number
  serviceQuality: number
  valueForMoney: number
  recommendation: number
  feedback: string
  improvements: string[]
  wouldReturn: boolean
  triggerEvent?: string
  timestamp: string
}

const IMPROVEMENT_OPTIONS = [
  'Faster service',
  'Better communication',
  'More flexible scheduling',
  'Improved cleanliness',
  'Better waiting area',
  'More services offered',
  'Lower prices',
  'Online booking improvements',
  'Staff friendliness',
  'Better equipment'
]

export default function CustomerSatisfactionSurvey({
  appointmentId,
  barberId,
  clientId,
  triggerEvent = 'manual',
  onComplete,
  onClose
}: SurveyProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [response, setResponse] = useState<Partial<SurveyResponse>>({
    appointmentId,
    barberId,
    clientId,
    triggerEvent,
    overallRating: 0,
    serviceQuality: 0,
    valueForMoney: 0,
    recommendation: 0,
    feedback: '',
    improvements: [],
    wouldReturn: false,
    timestamp: new Date().toISOString()
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)

  const totalSteps = 4

  const handleRatingChange = (field: keyof SurveyResponse, rating: number) => {
    setResponse(prev => ({ ...prev, [field]: rating }))
  }

  const handleImprovementToggle = (improvement: string) => {
    setResponse(prev => ({
      ...prev,
      improvements: prev.improvements?.includes(improvement)
        ? prev.improvements.filter(i => i !== improvement)
        : [...(prev.improvements || []), improvement]
    }))
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      // Submit to backend
      const submitResponse = await fetch('/api/v2/feedback/satisfaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(response),
        credentials: 'include'
      })

      if (submitResponse.ok) {
        setShowThankYou(true)
        
        // Call completion callback
        if (onComplete) {
          onComplete(response as SurveyResponse)
        }

        // Auto-close after showing thank you
        setTimeout(() => {
          if (onClose) onClose()
        }, 3000)
      } else {
        throw new Error('Failed to submit feedback')
      }
    } catch (error) {
      console.error('Survey submission error:', error)
      // Store locally for retry
      const storedSurveys = JSON.parse(localStorage.getItem('pendingSurveys') || '[]')
      storedSurveys.push(response)
      localStorage.setItem('pendingSurveys', JSON.stringify(storedSurveys))
      
      setShowThankYou(true)
      setTimeout(() => {
        if (onClose) onClose()
      }, 3000)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStars = (rating: number, onRatingChange: (rating: number) => void, size = 'w-8 h-8') => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onRatingChange(star)}
          className={`${size} transition-colors ${
            star <= rating
              ? 'text-yellow-400 fill-current'
              : 'text-gray-300 hover:text-yellow-300'
          }`}
        >
          <Star className="w-full h-full" />
        </button>
      ))}
    </div>
  )

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return response.overallRating! > 0
      case 2:
        return response.serviceQuality! > 0 && response.valueForMoney! > 0
      case 3:
        return response.recommendation! > 0
      case 4:
        return true // Optional step
      default:
        return false
    }
  }

  if (showThankYou) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-8 shadow-2xl max-w-md mx-auto text-center"
      >
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ThumbsUp className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
        <p className="text-gray-600 mb-4">
          Your feedback helps us provide better service. We truly appreciate your time.
        </p>
        <div className="text-sm text-gray-500">
          This will close automatically...
        </div>
      </motion.div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">How was your experience?</h2>
            <p className="text-sm text-gray-500">Step {currentStep} of {totalSteps}</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-teal-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Overall, how satisfied were you?
                </h3>
                {renderStars(
                  response.overallRating!,
                  (rating) => handleRatingChange('overallRating', rating),
                  'w-12 h-12'
                )}
                <div className="mt-4 flex justify-between text-sm text-gray-500">
                  <span>Very dissatisfied</span>
                  <span>Very satisfied</span>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Service Quality
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    How would you rate the quality of service?
                  </p>
                  {renderStars(
                    response.serviceQuality!,
                    (rating) => handleRatingChange('serviceQuality', rating)
                  )}
                </div>

                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Value for Money
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Was the service worth what you paid?
                  </p>
                  {renderStars(
                    response.valueForMoney!,
                    (rating) => handleRatingChange('valueForMoney', rating)
                  )}
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Would you recommend us?
                  </h3>
                  {renderStars(
                    response.recommendation!,
                    (rating) => handleRatingChange('recommendation', rating),
                    'w-10 h-10'
                  )}
                  <div className="mt-4 flex justify-between text-sm text-gray-500">
                    <span>Never</span>
                    <span>Definitely</span>
                  </div>
                </div>

                <div className="text-center">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Would you return for another appointment?
                  </h4>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => setResponse(prev => ({ ...prev, wouldReturn: true }))}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                        response.wouldReturn
                          ? 'bg-green-100 border-green-300 text-green-700'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Yes
                    </button>
                    <button
                      onClick={() => setResponse(prev => ({ ...prev, wouldReturn: false }))}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                        response.wouldReturn === false
                          ? 'bg-red-100 border-red-300 text-red-700'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                      No
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Tell us more (optional)
                  </h3>
                  <textarea
                    value={response.feedback}
                    onChange={(e) => setResponse(prev => ({ ...prev, feedback: e.target.value }))}
                    placeholder="What did you like most? What could we improve?"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    rows={3}
                  />
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3">
                    What could we improve? (Select all that apply)
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {IMPROVEMENT_OPTIONS.map((option) => (
                      <button
                        key={option}
                        onClick={() => handleImprovementToggle(option)}
                        className={`p-2 text-sm rounded-lg border transition-colors ${
                          response.improvements?.includes(option)
                            ? 'bg-teal-100 border-teal-300 text-teal-700'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex gap-2">
            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}