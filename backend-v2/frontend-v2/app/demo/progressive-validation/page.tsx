'use client'

import React, { useState } from 'react'
import { Clock, Star, Shield, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ProgressiveGuestForm, { GuestInfo } from '@/components/booking/ProgressiveGuestForm'
import { logger } from '@/lib/logger'

export default function ProgressiveValidationDemo() {
  const [step, setStep] = useState(3) // Start at guest info step
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({
    name: '',
    email: '',
    phone: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [bookingComplete, setBookingComplete] = useState(false)

  // Mock selected service data for context
  const selectedService = {
    id: 1,
    name: "Premium Haircut & Beard Trim",
    duration_minutes: 60,
    base_price: 75,
    description: "Professional haircut with precision beard trimming and styling"
  }

  const selectedDateTime = {
    date: "2025-07-22",
    time: "2:00 PM",
    barber_name: "Mike Johnson"
  }

  const handleGuestInfoChange = (newGuestInfo: GuestInfo) => {
    setGuestInfo(newGuestInfo)
    logger.booking.info(50, 'Guest info updated in demo', {
      nameLength: newGuestInfo.name.length,
      emailValid: newGuestInfo.email.includes('@'),
      phoneLength: newGuestInfo.phone.length
    })
  }

  const handleGuestInfoSubmit = async () => {
    setLoading(true)
    setError('')
    
    try {
      logger.booking.info(51, 'Processing guest booking submission', {
        guestInfo: {
          nameLength: guestInfo.name.length,
          emailDomain: guestInfo.email.split('@')[1] || '',
          phoneDigits: guestInfo.phone.replace(/\D/g, '').length
        }
      })

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate success
      setBookingComplete(true)
      setStep(5)
      
    } catch (submitError) {
      logger.booking.error(52, 'Demo booking submission failed', submitError)
      setError('Booking submission failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setStep(2)
  }

  const resetDemo = () => {
    setStep(3)
    setGuestInfo({ name: '', email: '', phone: '' })
    setBookingComplete(false)
    setError('')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Demo Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Progressive Validation Demo
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Experience real-time form validation with intelligent feedback and progress tracking
          </p>
          <div className="flex justify-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Real-time validation</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Progress tracking</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Accessibility compliant</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Demo Form */}
          <div className="lg:col-span-2">
            {!bookingComplete ? (
              <div>
                {/* Booking Context */}
                <div className="bg-white rounded-lg p-6 border mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Summary</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service:</span>
                      <span className="font-medium">{selectedService.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date & Time:</span>
                      <span className="font-medium">{selectedDateTime.date} at {selectedDateTime.time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Barber:</span>
                      <span className="font-medium">{selectedDateTime.barber_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Duration:</span>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{selectedService.duration_minutes} minutes</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-lg font-semibold border-t pt-3">
                      <span>Total:</span>
                      <span>${selectedService.base_price}</span>
                    </div>
                  </div>
                </div>

                {/* Progressive Guest Form */}
                <ProgressiveGuestForm
                  guestInfo={guestInfo}
                  onGuestInfoChange={handleGuestInfoChange}
                  onSubmit={handleGuestInfoSubmit}
                  onBack={handleBack}
                  loading={loading}
                  error={error}
                  showProgress={true}
                  className="space-y-6"
                />
              </div>
            ) : (
              /* Booking Complete */
              <div className="bg-white rounded-lg p-8 border text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
                <p className="text-gray-600 mb-6">
                  Your appointment has been successfully booked. You'll receive a confirmation email shortly.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Name:</span>
                      <p className="font-medium">{guestInfo.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Email:</span>
                      <p className="font-medium">{guestInfo.email}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Phone:</span>
                      <p className="font-medium">{guestInfo.phone}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Service:</span>
                      <p className="font-medium">{selectedService.name}</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={resetDemo}
                  className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          {/* Demo Information Sidebar */}
          <div className="space-y-6">
            {/* Feature Highlights */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Progressive Validation Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium">Real-time Feedback</h4>
                      <p className="text-sm text-gray-600">Validation occurs as you type with intelligent debouncing</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium">Smart Validation Rules</h4>
                      <p className="text-sm text-gray-600">Context-aware validation with custom rules and error messages</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium">Progress Tracking</h4>
                      <p className="text-sm text-gray-600">Visual progress indicator showing form completion status</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium">Accessibility Focus</h4>
                      <p className="text-sm text-gray-600">ARIA labels, screen reader support, and keyboard navigation</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Validation Examples */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Try These Examples</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Name Field:</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Type just "John" (missing last name)</li>
                      <li>• Try "John123" (invalid characters)</li>
                      <li>• Enter "John Smith" (valid)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Email Field:</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Type "invalid" (format error)</li>
                      <li>• Try "test@gmial.com" (typo detection)</li>
                      <li>• Enter "test@gmail.com" (valid)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Phone Field:</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li>• Type "123" (too short)</li>
                      <li>• Try "5551234567" (auto-formatting)</li>
                      <li>• Enter "+1-555-123-4567" (international)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Technical Implementation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-900">Components Used:</h4>
                    <ul className="text-gray-600 mt-1 space-y-1">
                      <li>• useProgressiveValidation hook</li>
                      <li>• ValidatedInput component</li>
                      <li>• FormValidationProgress component</li>
                      <li>• ProgressiveGuestForm component</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Key Features:</h4>
                    <ul className="text-gray-600 mt-1 space-y-1">
                      <li>• Debounced validation (300-500ms)</li>
                      <li>• Custom validation rules</li>
                      <li>• Error state management</li>
                      <li>• Progress calculation</li>
                      <li>• Accessibility compliance</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Demo Reset */}
        {!bookingComplete && (
          <div className="text-center mt-8">
            <button
              onClick={resetDemo}
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              Reset Demo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}