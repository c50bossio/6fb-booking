'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PaymentFailure } from '@/components/payments'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

function PaymentFailureContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [errorData, setErrorData] = useState<any>(null)

  // Get URL parameters
  const paymentIntentId = searchParams.get('payment_intent')
  const errorType = searchParams.get('error')
  const errorCode = searchParams.get('error_code')
  const errorMessage = searchParams.get('error_message')

  useEffect(() => {
    const processError = () => {
      // Process the error information from URL parameters
      const processedError = {
        error: {
          type: (errorType as any) || 'payment_error',
          code: errorCode || undefined,
          message: errorMessage ? decodeURIComponent(errorMessage) : 'Payment failed',
          decline_code: searchParams.get('decline_code') || undefined
        },
        paymentAmount: parseFloat(searchParams.get('amount') || '0') || 85.00,
        appointmentDetails: {
          service_name: searchParams.get('service') || 'Premium Haircut',
          date: searchParams.get('date') || new Date().toISOString().split('T')[0],
          time: searchParams.get('time') || '10:00 AM'
        }
      }

      setErrorData(processedError)
      setLoading(false)
    }

    processError()
  }, [searchParams])

  const handleRetryPayment = () => {
    // Navigate back to payment with preserved appointment data
    const appointmentId = searchParams.get('appointment_id')
    if (appointmentId) {
      router.push(`/booking/payment?appointment_id=${appointmentId}`)
    } else {
      router.push('/dashboard')
    }
  }

  const handleContactSupport = () => {
    // Open support contact form or navigate to support page
    window.open('mailto:support@6fb-booking.com?subject=Payment Issue&body=I encountered a payment error. Payment Intent: ' + paymentIntentId, '_blank')
  }

  const handleBackToBooking = () => {
    router.push('/dashboard')
  }

  const handleChangeBilling = () => {
    // Navigate back to payment step with option to change payment method
    const appointmentId = searchParams.get('appointment_id')
    if (appointmentId) {
      router.push(`/booking/payment?appointment_id=${appointmentId}&change_method=true`)
    } else {
      router.push('/dashboard')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-600">Processing error information...</p>
        </div>
      </div>
    )
  }

  if (!errorData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No error information found</p>
          <button
            onClick={handleBackToBooking}
            className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <PaymentFailure
          {...errorData}
          onRetryPayment={handleRetryPayment}
          onContactSupport={handleContactSupport}
          onBackToBooking={handleBackToBooking}
          onChangeBilling={handleChangeBilling}
        />
      </div>
    </div>
  )
}

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-600">Loading error details...</p>
        </div>
      </div>
    }>
      <PaymentFailureContent />
    </Suspense>
  )
}
