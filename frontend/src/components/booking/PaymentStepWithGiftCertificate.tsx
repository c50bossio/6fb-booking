'use client'

import React, { useState, useEffect } from 'react'
import { ShieldCheckIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { paymentIntentsApi, formatAmount } from '@/lib/api/payments'
import { UnifiedPaymentForm } from '@/components/payments'
import { GiftCertificateRedemption } from '@/components/gift-certificates'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface PaymentStepWithGiftCertificateProps {
  theme?: 'light' | 'dark'
  appointmentId: number
  amount: number
  onPaymentComplete: (paymentId: number, method?: 'stripe' | 'square') => void
  onError: (error: string) => void
  enabledMethods?: ('stripe' | 'square')[]
  customerEmail?: string
}

export default function PaymentStepWithGiftCertificate({
  theme = 'dark',
  appointmentId,
  amount,
  onPaymentComplete,
  onError,
  enabledMethods = ['stripe'],
  customerEmail
}: PaymentStepWithGiftCertificateProps) {
  const [clientSecret, setClientSecret] = useState<string>('')
  const [isInitializing, setIsInitializing] = useState(true)
  const [initError, setInitError] = useState<string | null>(null)
  const [showGiftCertificate, setShowGiftCertificate] = useState(false)
  const [appliedGiftAmount, setAppliedGiftAmount] = useState(0)
  const [finalAmount, setFinalAmount] = useState(amount)

  useEffect(() => {
    // Update final amount when gift certificate is applied
    setFinalAmount(amount - appliedGiftAmount)
  }, [amount, appliedGiftAmount])

  useEffect(() => {
    // Create payment intent for Stripe if enabled and amount > 0
    if (enabledMethods.includes('stripe') && finalAmount > 0) {
      createPaymentIntent()
    } else {
      setIsInitializing(false)
    }
  }, [appointmentId, finalAmount, enabledMethods])

  const createPaymentIntent = async () => {
    try {
      setIsInitializing(true)
      const intent = await paymentIntentsApi.create(
        appointmentId,
        finalAmount,
        undefined,
        false,
        {
          appointment_id: appointmentId,
          gift_certificate_amount: appliedGiftAmount
        }
      )
      setClientSecret(intent.client_secret)
    } catch (error: any) {
      console.error('Failed to create payment intent:', error)
      setInitError(error.message || 'Failed to initialize payment')
      onError(error.message || 'Failed to initialize payment')
    } finally {
      setIsInitializing(false)
    }
  }

  const handleGiftCertificateApply = (certificate: any, amountApplied: number) => {
    setAppliedGiftAmount(amountApplied)
    setShowGiftCertificate(false)

    // If the gift certificate covers the full amount, complete the payment
    if (amountApplied >= amount) {
      onPaymentComplete(0, 'stripe') // No payment ID needed for full gift certificate payment
    }
  }

  const handleGiftCertificateCancel = () => {
    setShowGiftCertificate(false)
  }

  const handleRemoveGiftCertificate = () => {
    setAppliedGiftAmount(0)
    setShowGiftCertificate(false)
  }

  const darkTheme = theme === 'dark'
  const bgColor = darkTheme ? 'bg-gray-900' : 'bg-white'
  const textColor = darkTheme ? 'text-white' : 'text-gray-900'
  const borderColor = darkTheme ? 'border-gray-700' : 'border-gray-200'

  if (initError) {
    return (
      <div className={`${bgColor} ${textColor} p-6 rounded-lg`}>
        <p className="text-red-500">Error: {initError}</p>
        <Button
          onClick={createPaymentIntent}
          className="mt-4"
          variant="outline"
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className={`${bgColor} ${textColor} p-6 rounded-lg`}>
      <h3 className="text-xl font-semibold mb-6 flex items-center">
        <ShieldCheckIcon className="w-6 h-6 mr-2" />
        Secure Payment
      </h3>

      {/* Payment Summary */}
      <Card className={`mb-6 p-4 ${darkTheme ? 'bg-gray-800 border-gray-700' : 'bg-gray-50'}`}>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Service Total:</span>
            <span className="font-semibold">{formatAmount(amount)}</span>
          </div>

          {appliedGiftAmount > 0 && (
            <>
              <div className="flex justify-between text-green-600">
                <span>Gift Certificate:</span>
                <span className="font-semibold">-{formatAmount(appliedGiftAmount)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Amount Due:</span>
                <span>{formatAmount(finalAmount)}</span>
              </div>
            </>
          )}
        </div>

        {/* Gift Certificate Actions */}
        <div className="mt-4">
          {!showGiftCertificate && appliedGiftAmount === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGiftCertificate(true)}
              className="w-full"
            >
              Apply Gift Certificate
            </Button>
          )}

          {appliedGiftAmount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveGiftCertificate}
              className="w-full text-red-600 hover:text-red-700"
            >
              Remove Gift Certificate
            </Button>
          )}
        </div>
      </Card>

      {/* Gift Certificate Form */}
      {showGiftCertificate && (
        <div className="mb-6">
          <GiftCertificateRedemption
            appointmentId={appointmentId}
            totalAmount={amount}
            onApply={handleGiftCertificateApply}
            onCancel={handleGiftCertificateCancel}
          />
        </div>
      )}

      {/* Payment Form - Only show if there's an amount due */}
      {finalAmount > 0 ? (
        <>
          <div className="flex items-center justify-center mb-4 text-sm opacity-75">
            <LockClosedIcon className="w-4 h-4 mr-1" />
            Your payment information is encrypted and secure
          </div>

          <UnifiedPaymentForm
            amount={finalAmount}
            onPaymentSuccess={(paymentId, method) => onPaymentComplete(paymentId, method)}
            onPaymentError={onError}
            appointmentId={appointmentId}
            stripeClientSecret={clientSecret}
            isLoading={isInitializing}
            enabledMethods={enabledMethods}
            customerEmail={customerEmail}
            theme={theme}
          />
        </>
      ) : (
        <div className="text-center py-8">
          <div className="text-green-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-lg font-semibold mb-2">No Payment Required!</p>
          <p className="text-sm opacity-75">Your gift certificate covers the full amount.</p>
          <Button
            onClick={() => onPaymentComplete(0, 'stripe')}
            className="mt-4"
          >
            Complete Booking
          </Button>
        </div>
      )}
    </div>
  )
}
