'use client'

import React, { useState } from 'react'
import {
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import {
  CreditCardIcon,
  LockClosedIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface StripePaymentFormProps {
  amount: number
  clientSecret: string
  onSuccess: (paymentId: number) => void
  onError: (error: string) => void
  customerEmail?: string
  showAmount?: boolean
}

export function StripePaymentForm({
  amount,
  clientSecret,
  onSuccess,
  onError,
  customerEmail,
  showAmount = true
}: StripePaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string>('')
  const [succeeded, setSucceeded] = useState(false)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setProcessing(true)
    setError('')

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
          receipt_email: customerEmail
        },
        redirect: 'if_required'
      })

      if (error) {
        if (error.type === 'card_error' || error.type === 'validation_error') {
          setError(error.message || 'Payment failed')
          onError(error.message || 'Payment failed')
        } else {
          setError('An unexpected error occurred.')
          onError('An unexpected error occurred.')
        }
      } else if (paymentIntent.status === 'succeeded') {
        setSucceeded(true)
        // Extract payment ID from metadata or use the payment intent ID
        const paymentId = parseInt(paymentIntent.metadata?.payment_id || paymentIntent.id.slice(-8)) || 0
        onSuccess(paymentId)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      onError(errorMessage)
    } finally {
      setProcessing(false)
    }
  }

  if (succeeded) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-green-800 mb-2">
          Payment Successful!
        </h3>
        <p className="text-green-700">
          Your payment of {formatPrice(amount)} has been processed successfully.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Amount Display */}
      {showAmount && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Amount to pay:</span>
            <span className="text-2xl font-bold text-gray-900">
              {formatPrice(amount)}
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Element */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <CreditCardIcon className="h-5 w-5 text-gray-600" />
            <h4 className="font-medium text-gray-900">Payment Details</h4>
          </div>

          <div className="border border-gray-300 rounded-lg p-4">
            <PaymentElement
              options={{
                layout: {
                  type: 'tabs',
                  defaultCollapsed: false,
                  radios: false,
                  spacedAccordionItems: false
                },
                paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
                fields: {
                  billingDetails: {
                    name: 'auto',
                    email: customerEmail ? 'never' : 'auto',
                    phone: 'auto',
                    address: {
                      country: 'never',
                      line1: 'auto',
                      line2: 'auto',
                      city: 'auto',
                      state: 'auto',
                      postalCode: 'auto'
                    }
                  }
                },
                wallets: {
                  applePay: 'auto',
                  googlePay: 'auto'
                }
              }}
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!stripe || processing}
          className="w-full px-6 py-3 bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing Payment...
            </>
          ) : (
            <>
              <LockClosedIcon className="h-5 w-5 mr-2" />
              Pay {formatPrice(amount)}
            </>
          )}
        </button>

        {/* Security Notice */}
        <div className="text-center">
          <div className="inline-flex items-center text-sm text-gray-500">
            <LockClosedIcon className="h-4 w-4 mr-1" />
            Secured by Stripe
          </div>
        </div>
      </form>
    </div>
  )
}
