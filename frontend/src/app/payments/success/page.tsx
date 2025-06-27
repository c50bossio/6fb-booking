'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircleIcon, ArrowLeftIcon, ReceiptRefundIcon } from '@heroicons/react/24/outline'
import { paymentsAPI, paymentHelpers } from '@/lib/api/payments'

function PaymentSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [payment, setPayment] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const paymentIntentId = searchParams.get('payment_intent')
  const paymentId = searchParams.get('payment_id')

  useEffect(() => {
    if (paymentId) {
      fetchPaymentDetails()
    } else {
      setLoading(false)
    }
  }, [paymentId])

  const fetchPaymentDetails = async () => {
    try {
      const paymentData = await paymentsAPI.getPayment(paymentId!)
      setPayment(paymentData)
    } catch (error) {
      console.error('Failed to fetch payment details:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-3">
              <CheckCircleIcon className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
            Payment Successful!
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            Your payment has been processed successfully.
          </p>

          {/* Payment Details */}
          {payment && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Details
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Amount</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {paymentHelpers.formatAmount(payment.amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Payment ID</span>
                  <span className="font-mono text-xs text-gray-900 dark:text-white">
                    #{payment.id}
                  </span>
                </div>
                {payment.description && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Description</span>
                    <span className="text-gray-900 dark:text-white">
                      {payment.description}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Confirmation Number */}
          {paymentIntentId && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Confirmation Number:</strong>
                <br />
                <span className="font-mono text-xs">{paymentIntentId}</span>
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/dashboard/appointments"
              className="w-full inline-flex items-center justify-center px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
            >
              View Appointments
            </Link>

            <Link
              href="/dashboard"
              className="w-full inline-flex items-center justify-center px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Link>
          </div>

          {/* Receipt */}
          <div className="mt-6 text-center">
            <button className="inline-flex items-center text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300">
              <ReceiptRefundIcon className="h-4 w-4 mr-1" />
              Download Receipt
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            A confirmation email has been sent to your registered email address.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
