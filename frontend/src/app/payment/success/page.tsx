'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PaymentSuccess } from '@/components/payments'
import { paymentsApi } from '@/lib/api/payments'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [paymentData, setPaymentData] = useState<any>(null)
  const [error, setError] = useState<string>('')

  // Get URL parameters
  const paymentIntentId = searchParams.get('payment_intent')
  const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret')
  const redirectStatus = searchParams.get('redirect_status')

  useEffect(() => {
    const verifyPayment = async () => {
      if (!paymentIntentId) {
        setError('Missing payment information')
        setLoading(false)
        return
      }

      try {
        // Verify payment status and get details
        // This would typically involve calling your backend to confirm the payment
        // For now, we'll simulate success

        const mockPaymentData = {
          paymentDetails: {
            id: parseInt(paymentIntentId.slice(-6)) || 123456,
            amount: 85.00,
            currency: 'USD',
            status: 'succeeded',
            created_at: new Date().toISOString(),
            transaction_id: paymentIntentId
          },
          appointmentDetails: {
            service_name: 'Premium Haircut',
            barber_name: 'Marcus Johnson',
            date: new Date().toISOString().split('T')[0],
            time: '10:00 AM',
            duration_minutes: 60
          },
          customerDetails: {
            name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '+1 (555) 123-4567'
          }
        }

        setPaymentData(mockPaymentData)
      } catch (err) {
        setError('Failed to verify payment status')
      } finally {
        setLoading(false)
      }
    }

    verifyPayment()
  }, [paymentIntentId])

  const handlePrintReceipt = () => {
    window.print()
  }

  const handleDownloadReceipt = () => {
    // Create a downloadable receipt
    const receiptContent = `
Payment Receipt
===============

Transaction ID: ${paymentData?.paymentDetails?.transaction_id}
Amount: $${paymentData?.paymentDetails?.amount}
Date: ${new Date(paymentData?.paymentDetails?.created_at).toLocaleDateString()}

Appointment Details:
Service: ${paymentData?.appointmentDetails?.service_name}
Barber: ${paymentData?.appointmentDetails?.barber_name}
Date: ${new Date(paymentData?.appointmentDetails?.date).toLocaleDateString()}
Time: ${paymentData?.appointmentDetails?.time}

Customer: ${paymentData?.customerDetails?.name}
Email: ${paymentData?.customerDetails?.email}
Phone: ${paymentData?.customerDetails?.phone}

Thank you for your business!
`

    const blob = new Blob([receiptContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-${paymentData?.paymentDetails?.transaction_id}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleBackToBooking = () => {
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-xl font-semibold text-red-800 mb-2">
              Payment Verification Failed
            </h1>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={handleBackToBooking}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!paymentData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No payment data found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <PaymentSuccess
          {...paymentData}
          onPrintReceipt={handlePrintReceipt}
          onDownloadReceipt={handleDownloadReceipt}
          onBackToBooking={handleBackToBooking}
        />
      </div>
    </div>
  )
}
