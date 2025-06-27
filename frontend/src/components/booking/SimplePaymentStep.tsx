'use client'

import { useState, useEffect } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { RadioGroup } from '@headlessui/react'
import {
  CreditCardIcon,
  CheckIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import type { Service } from '@/lib/api/services'
import { getStripe, formatAmountForStripe, stripeAppearance } from '@/lib/stripe'
import { paymentsAPI } from '@/lib/api/payments'
import { StripePaymentForm } from '@/components/payments/StripePaymentForm'

interface PaymentStepProps {
  service: Service | null
  onPaymentSelect: (paymentMethod: 'full' | 'deposit', paymentDetails: any) => void
  selectedMethod: 'full' | 'deposit'
  appointmentId?: number
  customerEmail?: string
  onPaymentSuccess?: (paymentId: number) => void
  onPaymentError?: (error: string) => void
}

interface PaymentOption {
  id: 'full' | 'deposit'
  name: string
  description: string
  icon: React.ElementType
  amount: number
  note?: string
}

export default function SimplePaymentStep({
  service,
  onPaymentSelect,
  selectedMethod,
  appointmentId,
  customerEmail,
  onPaymentSuccess,
  onPaymentError
}: PaymentStepProps) {
  const [loading, setLoading] = useState(false)
  const [selectedOption, setSelectedOption] = useState<PaymentOption | null>(null)
  const [clientSecret, setClientSecret] = useState<string>('')
  const [paymentIntentId, setPaymentIntentId] = useState<string>('')
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [stripeError, setStripeError] = useState<string>('')
  const [stripePromise] = useState(() => getStripe())

  if (!service) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Service information not available</p>
      </div>
    )
  }

  const fullAmount = service.base_price
  const depositAmount = service.requires_deposit
    ? (service.deposit_type === 'percentage'
        ? (fullAmount * (service.deposit_amount || 0) / 100)
        : (service.deposit_amount || 0))
    : fullAmount * 0.5 // Default 50% deposit if not specified

  const paymentOptions: PaymentOption[] = [
    {
      id: 'full',
      name: 'Pay Full Amount',
      description: 'Pay the complete service fee now',
      icon: CreditCardIcon,
      amount: fullAmount,
      note: 'No additional payment required at appointment'
    }
  ]

  // Only add deposit option if the service allows it or if it's required
  if (service.requires_deposit || true) { // Allow deposit for all services
    paymentOptions.unshift({
      id: 'deposit',
      name: 'Pay Deposit Only',
      description: 'Secure your booking with a deposit',
      icon: CurrencyDollarIcon,
      amount: depositAmount,
      note: `Remaining $${(fullAmount - depositAmount).toFixed(2)} due at appointment`
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const handleOptionSelect = (option: PaymentOption) => {
    setSelectedOption(option)
  }

  const createPaymentIntent = async (amount: number) => {
    if (!appointmentId) {
      setStripeError('Appointment ID is required to process payment')
      return
    }

    try {
      setLoading(true)
      const intent = await paymentsAPI.createPaymentIntent({
        appointmentId: appointmentId.toString(),
        amount: formatAmountForStripe(amount),
        currency: 'usd',
        saveMethod: false,
        metadata: {
          payment_type: selectedOption?.id,
          customer_email: customerEmail
        }
      })
      setClientSecret(intent.clientSecret)
      setPaymentIntentId(intent.id)
      setShowPaymentForm(true)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize payment'
      setStripeError(errorMessage)
      onPaymentError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = async () => {
    if (!selectedOption) return
    await createPaymentIntent(selectedOption.amount)
  }

  const handlePaymentSuccess = (paymentId: number) => {
    const paymentDetails = {
      method: selectedOption?.id || 'full',
      amount: selectedOption?.amount || 0,
      currency: 'USD',
      status: 'succeeded',
      transaction_id: paymentIntentId,
      payment_method_id: paymentId.toString()
    }
    onPaymentSelect(selectedOption?.id || 'full', paymentDetails)
    onPaymentSuccess?.(paymentId)
  }

  const handlePaymentError = (error: string) => {
    setStripeError(error)
    onPaymentError?.(error)
  }

  return (
    <div className="space-y-6">
      {/* Service Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium text-gray-900">{service.name}</h3>
            <div className="flex items-center mt-1 text-sm text-gray-600">
              <ClockIcon className="h-4 w-4 mr-1" />
              {service.duration_minutes} minutes
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900">
              {formatPrice(fullAmount)}
            </div>
            <div className="text-sm text-gray-600">Total Service Fee</div>
          </div>
        </div>
      </div>

      {/* Payment Options */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Payment Option</h3>
        <RadioGroup value={selectedOption} onChange={handleOptionSelect}>
          <div className="space-y-3">
            {paymentOptions.map((option) => {
              const Icon = option.icon
              return (
                <RadioGroup.Option
                  key={option.id}
                  value={option}
                  className={({ checked }) =>
                    `${checked ? 'bg-slate-50 border-slate-600 ring-1 ring-slate-600' : 'border-gray-300'}
                    relative flex cursor-pointer rounded-lg border p-4 focus:outline-none`
                  }
                >
                  {({ checked }) => (
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center">
                        <div className="text-sm">
                          <div className="flex items-center">
                            <Icon className="h-5 w-5 text-gray-600 mr-3" />
                            <div>
                              <RadioGroup.Label
                                as="p"
                                className={`font-medium ${checked ? 'text-slate-900' : 'text-gray-900'}`}
                              >
                                {option.name}
                              </RadioGroup.Label>
                              <RadioGroup.Description
                                as="p"
                                className={`${checked ? 'text-slate-700' : 'text-gray-500'}`}
                              >
                                {option.description}
                              </RadioGroup.Description>
                              {option.note && (
                                <p className="text-sm text-gray-500 mt-1">{option.note}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="text-right mr-4">
                          <div className={`text-lg font-semibold ${
                            checked ? 'text-slate-900' : 'text-gray-900'
                          }`}>
                            {formatPrice(option.amount)}
                          </div>
                          {option.id === 'deposit' && (
                            <div className="text-sm text-gray-500">
                              + {formatPrice(fullAmount - option.amount)} later
                            </div>
                          )}
                        </div>
                        {checked && (
                          <CheckIcon className="h-5 w-5 text-slate-600" />
                        )}
                      </div>
                    </div>
                  )}
                </RadioGroup.Option>
              )
            })}
          </div>
        </RadioGroup>
      </div>

      {/* Security Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <ShieldCheckIcon className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
          <div className="text-sm">
            <p className="text-green-800 font-medium">Secure Payment</p>
            <p className="text-green-700 mt-1">
              Your payment information is encrypted and secure. We use industry-standard security measures to protect your data.
            </p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {stripeError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
            <div className="text-sm">
              <p className="text-red-800 font-medium">Payment Error</p>
              <p className="text-red-700 mt-1">{stripeError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Payment Form */}
      {showPaymentForm && clientSecret && selectedOption && stripePromise && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Payment Information</h4>
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: stripeAppearance,
              loader: 'auto'
            }}
          >
            <StripePaymentForm
              amount={selectedOption.amount}
              clientSecret={clientSecret}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              customerEmail={customerEmail}
            />
          </Elements>
        </div>
      )}

      {/* Action Button */}
      {!showPaymentForm && (
        <button
          onClick={handleContinue}
          disabled={!selectedOption || loading}
          className="w-full px-6 py-3 bg-slate-700 text-white text-lg font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Initializing Payment...
            </>
          ) : (
            `Proceed with ${selectedOption ? formatPrice(selectedOption.amount) : 'Payment'}`
          )}
        </button>
      )}

      {/* Secure Payment Info */}
      <div className="text-center text-sm text-gray-500">
        <p>Payments are processed securely through Stripe. Your card information is encrypted and never stored on our servers.</p>
      </div>
    </div>
  )
}
