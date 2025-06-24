'use client'

import React, { useState, useEffect } from 'react'
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'
import { CreditCardIcon, ShieldCheckIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { paymentIntentsApi, formatAmount } from '@/lib/api/payments'

interface PaymentStepProps {
  theme?: 'light' | 'dark'
  appointmentId: number
  amount: number
  onPaymentComplete: (paymentId: number) => void
  onError: (error: string) => void
}

export default function PaymentStep({
  theme = 'dark',
  appointmentId,
  amount,
  onPaymentComplete,
  onError
}: PaymentStepProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [clientSecret, setClientSecret] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  useEffect(() => {
    // Create payment intent when component mounts
    createPaymentIntent()
  }, [appointmentId, amount])

  const createPaymentIntent = async () => {
    try {
      const intent = await paymentIntentsApi.create(
        appointmentId,
        amount,
        undefined,
        false,
        { appointment_id: appointmentId }
      )
      setClientSecret(intent.client_secret)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize payment'
      setPaymentError(errorMessage)
      onError(errorMessage)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements || !clientSecret) {
      return
    }

    setIsProcessing(true)
    setPaymentError(null)

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payments/success?appointment_id=${appointmentId}`,
        },
        redirect: 'if_required',
      })

      if (result.error) {
        setPaymentError(result.error.message || 'Payment failed')
        onError(result.error.message || 'Payment failed')
      } else if (result.paymentIntent) {
        // Payment succeeded
        const paymentId = parseInt(result.paymentIntent.metadata?.payment_id || '0')
        onPaymentComplete(paymentId)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      setPaymentError(errorMessage)
      onError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <div className={`rounded-lg p-6 ${
        theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'
      }`}>
        <h3 className={`text-lg font-semibold mb-4 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Payment Summary
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Service Total
            </span>
            <span className={`font-medium ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {formatAmount(amount)}
            </span>
          </div>
          <div className={`pt-2 border-t ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex justify-between">
              <span className={`font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Total Due
              </span>
              <span className={`font-bold text-lg ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {formatAmount(amount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className={`rounded-lg p-6 ${
          theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center mb-4">
            <CreditCardIcon className={`w-5 h-5 mr-2 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`} />
            <h3 className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Payment Details
            </h3>
          </div>

          {clientSecret && (
            <PaymentElement
              options={{
                layout: 'tabs',
                paymentMethodOrder: ['card'],
                fields: {
                  billingDetails: {
                    address: 'auto',
                  },
                },
                wallets: {
                  applePay: 'auto',
                  googlePay: 'auto',
                },
              }}
            />
          )}

          {paymentError && (
            <div className="mt-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-300">
                {paymentError}
              </p>
            </div>
          )}
        </div>

        {/* Security Badge */}
        <div className={`flex items-center justify-center space-x-4 text-sm ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          <div className="flex items-center">
            <LockClosedIcon className="w-4 h-4 mr-1" />
            <span>Secure Payment</span>
          </div>
          <div className="flex items-center">
            <ShieldCheckIcon className="w-4 h-4 mr-1" />
            <span>SSL Encrypted</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            isProcessing || !stripe
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-teal-600 hover:bg-teal-700 text-white'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing Payment...
            </span>
          ) : (
            `Pay ${formatAmount(amount)}`
          )}
        </button>

        {/* Terms */}
        <p className={`text-xs text-center ${
          theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
        }`}>
          By completing this payment, you agree to our{' '}
          <a href="/terms" className="underline hover:no-underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="underline hover:no-underline">
            Privacy Policy
          </a>
        </p>
      </form>
    </div>
  )
}