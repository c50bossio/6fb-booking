'use client'

import React, { useState, useEffect } from 'react'
import { ShieldCheckIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { paymentIntentsApi, formatAmount } from '@/lib/api/payments'
import { UnifiedPaymentForm } from '@/components/payments'

interface PaymentStepProps {
  theme?: 'light' | 'dark'
  appointmentId: number
  amount: number
  onPaymentComplete: (paymentId: number, method?: 'stripe' | 'square') => void
  onError: (error: string) => void
  enabledMethods?: ('stripe' | 'square')[]
  customerEmail?: string
}

export default function PaymentStep({
  theme = 'dark',
  appointmentId,
  amount,
  onPaymentComplete,
  onError,
  enabledMethods = ['stripe'],
  customerEmail
}: PaymentStepProps) {
  const [clientSecret, setClientSecret] = useState<string>('')
  const [isInitializing, setIsInitializing] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    // Create payment intent for Stripe if enabled
    if (enabledMethods.includes('stripe')) {
      createPaymentIntent()
    } else {
      setIsInitializing(false)
    }
  }, [appointmentId, amount, enabledMethods])

  const createPaymentIntent = async () => {
    try {
      setIsInitializing(true)
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
      setInitError(errorMessage)
      onError(errorMessage)
    } finally {
      setIsInitializing(false)
    }
  }

  const handlePaymentSuccess = (paymentId: number, method: 'stripe' | 'square') => {
    onPaymentComplete(paymentId, method)
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
      <div className={`rounded-lg p-6 ${
        theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        {initError && (
          <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-300">
              {initError}
            </p>
          </div>
        )}

        {isInitializing ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <span className={`ml-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Initializing payment...
            </span>
          </div>
        ) : (
          <UnifiedPaymentForm
            amount={amount}
            appointmentId={appointmentId}
            clientSecret={clientSecret}
            customerEmail={customerEmail}
            enabledMethods={enabledMethods}
            onSuccess={handlePaymentSuccess}
            onError={onError}
            // TODO: Add Square configuration when needed
            // squareApplicationId={process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID}
            // squareLocationId={process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID}
          />
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
    </div>
  )
}
