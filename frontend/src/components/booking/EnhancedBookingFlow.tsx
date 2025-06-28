'use client'

import { useState, useEffect } from 'react'
import EnhancedPaymentStep from './EnhancedPaymentStep'
import { useLocationPaymentSettings } from '@/hooks/useLocationPaymentSettings'
import type { Service } from '@/lib/api/services'

interface BookingData {
  service?: Service
  barber?: any
  date?: string
  time?: string
  clientInfo?: {
    name: string
    email: string
    phone: string
    notes?: string
  }
  paymentMethod?: 'full' | 'deposit' | 'in_person'
  paymentDetails?: {
    method: 'full' | 'deposit' | 'in_person'
    amount: number
    currency: string
    status: string
    transaction_id?: string
    payment_method_id?: string
    requires_in_person_payment?: boolean
    payment_instructions?: string
  }
  totalPrice?: number
  appointmentId?: number
  paymentId?: number
  paymentCompleted?: boolean
  paymentError?: string
  locationId?: number
}

interface EnhancedPaymentStepWrapperProps {
  bookingData: BookingData
  onPaymentSelect: (method: 'full' | 'deposit' | 'in_person', details: any) => void
  onPaymentSuccess: (paymentId: number) => void
  onPaymentError: (error: string) => void
}

function EnhancedPaymentStepWrapper({
  bookingData,
  onPaymentSelect,
  onPaymentSuccess,
  onPaymentError
}: EnhancedPaymentStepWrapperProps) {
  const { settings, loading, error } = useLocationPaymentSettings(bookingData.locationId)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2 text-gray-600">Loading payment options...</span>
      </div>
    )
  }

  if (error && !settings) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load payment settings</p>
        <p className="text-gray-500 text-sm mt-2">Using default payment options</p>
      </div>
    )
  }

  return (
    <EnhancedPaymentStep
      service={bookingData.service}
      onPaymentSelect={onPaymentSelect}
      selectedMethod={bookingData.paymentMethod || 'full'}
      appointmentId={bookingData.appointmentId}
      customerEmail={bookingData.clientInfo?.email}
      onPaymentSuccess={onPaymentSuccess}
      onPaymentError={onPaymentError}
      locationId={bookingData.locationId}
      payInPersonEnabled={settings?.pay_in_person_enabled}
      payInPersonMessage={settings?.pay_in_person_message}
    />
  )
}

export default EnhancedPaymentStepWrapper

// Example usage in a booking flow:
export function ExampleBookingFlowWithPayInPerson() {
  const [bookingData, setBookingData] = useState<BookingData>({
    locationId: 1, // Set this based on the selected location
  })
  const [currentStep, setCurrentStep] = useState(4) // Payment step

  const handlePaymentSelect = (method: 'full' | 'deposit' | 'in_person', details: any) => {
    setBookingData(prev => ({
      ...prev,
      paymentMethod: method,
      paymentDetails: details,
      paymentCompleted: method === 'in_person' || details.status === 'succeeded'
    }))

    // If pay in person is selected, complete the booking immediately
    if (method === 'in_person') {
      console.log('Pay in person selected - booking confirmed without online payment')
      // Move to confirmation step
      setCurrentStep(5)
    }
  }

  const handlePaymentSuccess = (paymentId: number) => {
    setBookingData(prev => ({
      ...prev,
      paymentId,
      paymentCompleted: true
    }))
    // Move to confirmation step
    setCurrentStep(5)
  }

  const handlePaymentError = (error: string) => {
    setBookingData(prev => ({
      ...prev,
      paymentError: error
    }))
  }

  // In your actual booking flow, replace SimplePaymentStep with:
  return (
    <div className="max-w-2xl mx-auto p-6">
      {currentStep === 4 && (
        <EnhancedPaymentStepWrapper
          bookingData={bookingData}
          onPaymentSelect={handlePaymentSelect}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
        />
      )}

      {/* Success message for pay in person */}
      {currentStep === 5 && bookingData.paymentMethod === 'in_person' && (
        <div className="text-center space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-green-900 mb-2">Booking Confirmed!</h3>
            <p className="text-green-700 mb-4">
              Your appointment has been successfully booked. No online payment is required.
            </p>
            <div className="bg-white border border-green-200 rounded-lg p-4 text-left">
              <h4 className="font-medium text-green-900 mb-2">Payment Instructions:</h4>
              <p className="text-green-700 text-sm">
                {bookingData.paymentDetails?.payment_instructions ||
                 'Please bring payment when you arrive at the shop. We accept cash, credit/debit cards, and digital wallets.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
