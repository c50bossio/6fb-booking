/**
 * Booking Page Integration Example
 * 
 * This component demonstrates how to integrate the BookingLinkHandler
 * with the existing booking page to support URL parameters.
 */

'use client'

import { useState, useEffect } from 'react'
import BookingLinkHandler from './BookingLinkHandler'
import { BookingLinkParams, ValidationResult } from '../../types/booking-links'

// Mock services (in real app, these would come from API)
const SERVICES = [
  { id: 'Haircut', name: 'Haircut', duration: '30 min', price: '$30', amount: 30 },
  { id: 'Shave', name: 'Shave', duration: '20 min', price: '$20', amount: 20 },
  { id: 'Haircut & Shave', name: 'Haircut & Shave', duration: '45 min', price: '$45', amount: 45 }
]

// Mock barbers (in real app, these would come from API)
const BARBERS = [
  { id: 'john-doe', name: 'John Doe', slug: 'john-doe' },
  { id: 'jane-smith', name: 'Jane Smith', slug: 'jane-smith' },
]

interface BookingFormState {
  selectedService: string | null
  selectedBarber: string | null
  selectedDate: Date | null
  selectedTime: string | null
  customerInfo: {
    name: string
    email: string
    phone: string
  }
  step: number
  urlParams: BookingLinkParams
  validationResult: ValidationResult | null
}

export default function BookingPageExample() {
  const [formState, setFormState] = useState<BookingFormState>({
    selectedService: null,
    selectedBarber: null,
    selectedDate: null,
    selectedTime: null,
    customerInfo: {
      name: '',
      email: '',
      phone: '',
    },
    step: 1,
    urlParams: {},
    validationResult: null,
  })

  // Handle URL parameters loaded from BookingLinkHandler
  const handleParametersLoaded = (params: BookingLinkParams) => {
    console.log('Booking parameters loaded from URL:', params)
    
    setFormState(prev => {
      const newState = { ...prev, urlParams: params }

      // Pre-populate service if provided in URL
      if (params.service && typeof params.service === 'string') {
        const serviceValue = typeof params.service === 'string' ? params.service : params.service[0]
        const service = SERVICES.find(s => 
          s.id.toLowerCase() === serviceValue.toLowerCase() ||
          s.name.toLowerCase() === serviceValue.toLowerCase()
        )
        if (service) {
          newState.selectedService = service.id
          // If service is pre-selected, move to step 2
          if (!prev.selectedService) {
            newState.step = 2
          }
        }
      }

      // Pre-populate barber if provided in URL
      if (params.barber && typeof params.barber === 'string') {
        const barberValue = typeof params.barber === 'string' ? params.barber : params.barber[0]
        const barber = BARBERS.find(b => 
          b.slug === barberValue ||
          b.name.toLowerCase() === barberValue.toLowerCase()
        )
        if (barber) {
          newState.selectedBarber = barber.id
        }
      }

      // Pre-populate date if provided in URL
      if (params.date) {
        try {
          const date = new Date(params.date)
          if (!isNaN(date.getTime()) && date > new Date()) {
            newState.selectedDate = date
          }
        } catch (error) {
          console.warn('Invalid date in URL:', params.date)
        }
      }

      // Pre-populate time if provided in URL
      if (params.time) {
        newState.selectedTime = params.time
      }

      // Pre-populate customer info if provided in URL
      if (params.name || params.email || params.phone) {
        newState.customerInfo = {
          name: params.name || prev.customerInfo.name,
          email: params.email || prev.customerInfo.email,
          phone: params.phone || prev.customerInfo.phone,
        }
      }

      // Handle quick booking
      if (params.quickBook) {
        console.log('Quick booking requested')
        // In real implementation, this would trigger the quick booking flow
      }

      return newState
    })
  }

  // Handle validation result from BookingLinkHandler
  const handleValidationResult = (result: ValidationResult) => {
    setFormState(prev => ({
      ...prev,
      validationResult: result,
    }))
  }

  // Service selection handler
  const handleServiceSelect = (serviceId: string) => {
    setFormState(prev => ({
      ...prev,
      selectedService: serviceId,
      step: 2,
    }))
  }

  // Date selection handler
  const handleDateSelect = (date: Date) => {
    setFormState(prev => ({
      ...prev,
      selectedDate: date,
    }))
  }

  // Time selection handler
  const handleTimeSelect = (time: string) => {
    setFormState(prev => ({
      ...prev,
      selectedTime: time,
      step: 3,
    }))
  }

  // Get tracking info from URL parameters
  const getTrackingInfo = () => {
    const { urlParams } = formState
    return {
      campaign: urlParams.campaign,
      source: urlParams.utm_source || urlParams.source,
      medium: urlParams.utm_medium || urlParams.medium,
      ref: urlParams.ref,
    }
  }

  // Check if form has URL-provided values
  const hasUrlPreselections = () => {
    return Object.keys(formState.urlParams).length > 0
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Booking Link Handler - processes URL parameters */}
        <BookingLinkHandler
          onParametersLoaded={handleParametersLoaded}
          onValidationResult={handleValidationResult}
        />

        {/* URL Parameters Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && hasUrlPreselections() && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              URL Parameters Detected
            </h3>
            <div className="text-xs text-blue-700 space-y-1">
              {Object.entries(formState.urlParams).map(([key, value]) => (
                <div key={key}>
                  <span className="font-medium">{key}:</span> {Array.isArray(value) ? value.join(', ') : String(value)}
                </div>
              ))}
            </div>
            {getTrackingInfo().campaign && (
              <div className="mt-2 text-xs text-blue-600">
                Campaign tracking active: {getTrackingInfo().campaign}
              </div>
            )}
          </div>
        )}

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center ${formState.step >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  formState.step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200'
                }`}>
                  1
                </div>
                <span className="ml-2 font-medium hidden sm:inline">Service</span>
              </div>
              
              <div className={`h-px w-16 ${formState.step >= 2 ? 'bg-primary-600' : 'bg-gray-300'}`} />
              
              <div className={`flex items-center ${formState.step >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  formState.step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200'
                }`}>
                  2
                </div>
                <span className="ml-2 font-medium hidden sm:inline">Date & Time</span>
              </div>
              
              <div className={`h-px w-16 ${formState.step >= 3 ? 'bg-primary-600' : 'bg-gray-300'}`} />
              
              <div className={`flex items-center ${formState.step >= 3 ? 'text-primary-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  formState.step >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-200'
                }`}>
                  3
                </div>
                <span className="ml-2 font-medium hidden sm:inline">Confirm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Select Service */}
        {formState.step === 1 && (
          <div>
            <h1 className="text-2xl font-bold text-center mb-8">
              Select a Service
              {formState.urlParams.service && (
                <span className="block text-sm font-normal text-gray-600 mt-1">
                  Pre-selected from link: {formState.urlParams.service}
                </span>
              )}
            </h1>
            
            <div className="grid gap-4 max-w-2xl mx-auto">
              {SERVICES.map(service => (
                <div
                  key={service.id}
                  className={`p-6 border rounded-lg cursor-pointer transition-colors ${
                    formState.selectedService === service.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-400 bg-white'
                  }`}
                  onClick={() => handleServiceSelect(service.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                      <p className="text-gray-600 text-sm mt-1">{service.duration}</p>
                    </div>
                    <div className="text-xl font-bold text-primary-600">{service.price}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Date & Time */}
        {formState.step === 2 && (
          <div>
            <h1 className="text-2xl font-bold text-center mb-8">
              Select Date & Time
              {formState.selectedService && (
                <span className="block text-sm font-normal text-gray-600 mt-1">
                  Service: {SERVICES.find(s => s.id === formState.selectedService)?.name}
                </span>
              )}
            </h1>

            {/* Barber Selection (if pre-selected from URL) */}
            {formState.selectedBarber && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-green-800">
                    Barber pre-selected: {BARBERS.find(b => b.id === formState.selectedBarber)?.name}
                  </span>
                </div>
              </div>
            )}

            {/* Date Selection */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Choose a Date</h2>
              {formState.selectedDate ? (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800">
                    Selected: {formState.selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                    {formState.urlParams.date && (
                      <span className="text-sm ml-2">(pre-selected from URL)</span>
                    )}
                  </p>
                </div>
              ) : (
                <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
                  Calendar component would go here
                  <br />
                  <button
                    onClick={() => handleDateSelect(new Date())}
                    className="mt-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                  >
                    Select Today (Demo)
                  </button>
                </div>
              )}
            </div>

            {/* Time Selection */}
            {formState.selectedDate && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Choose a Time</h2>
                {formState.selectedTime ? (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800">
                      Selected: {formState.selectedTime}
                      {formState.urlParams.time && (
                        <span className="text-sm ml-2">(pre-selected from URL)</span>
                      )}
                    </p>
                    <button
                      onClick={() => handleTimeSelect(formState.selectedTime!)}
                      className="mt-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                    >
                      Continue to Confirmation
                    </button>
                  </div>
                ) : (
                  <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
                    Time slots component would go here
                    <br />
                    <button
                      onClick={() => handleTimeSelect('10:00')}
                      className="mt-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                    >
                      Select 10:00 AM (Demo)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Confirmation */}
        {formState.step === 3 && (
          <div className="max-w-md mx-auto">
            <h1 className="text-2xl font-bold text-center mb-8">Confirm Booking</h1>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Booking Details</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium">
                    {SERVICES.find(s => s.id === formState.selectedService)?.name}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">
                    {formState.selectedDate?.toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">{formState.selectedTime}</span>
                </div>

                {formState.selectedBarber && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Barber:</span>
                    <span className="font-medium">
                      {BARBERS.find(b => b.id === formState.selectedBarber)?.name}
                    </span>
                  </div>
                )}
                
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-bold text-lg">
                      {SERVICES.find(s => s.id === formState.selectedService)?.price}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="mt-6">
                <h3 className="text-md font-semibold mb-3">Customer Information</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Name"
                    value={formState.customerInfo.name}
                    onChange={(e) => setFormState(prev => ({
                      ...prev,
                      customerInfo: { ...prev.customerInfo, name: e.target.value }
                    }))}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={formState.customerInfo.email}
                    onChange={(e) => setFormState(prev => ({
                      ...prev,
                      customerInfo: { ...prev.customerInfo, email: e.target.value }
                    }))}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={formState.customerInfo.phone}
                    onChange={(e) => setFormState(prev => ({
                      ...prev,
                      customerInfo: { ...prev.customerInfo, phone: e.target.value }
                    }))}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Tracking Information Display */}
              {(getTrackingInfo().campaign || getTrackingInfo().source) && (
                <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Campaign Tracking</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    {getTrackingInfo().campaign && (
                      <div>Campaign: {getTrackingInfo().campaign}</div>
                    )}
                    {getTrackingInfo().source && (
                      <div>Source: {getTrackingInfo().source}</div>
                    )}
                    {getTrackingInfo().medium && (
                      <div>Medium: {getTrackingInfo().medium}</div>
                    )}
                    {getTrackingInfo().ref && (
                      <div>Referral: {getTrackingInfo().ref}</div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  // In real implementation, this would create the booking
                  console.log('Booking confirmed with tracking:', getTrackingInfo())
                  alert('Booking confirmed! (Demo)')
                }}
                className="mt-6 w-full px-4 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        )}

        {/* Back button */}
        {formState.step > 1 && (
          <div className="fixed bottom-4 left-4">
            <button
              onClick={() => setFormState(prev => ({ ...prev, step: prev.step - 1 }))}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}