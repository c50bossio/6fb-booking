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
  ExclamationTriangleIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'
import type { Service } from '@/lib/api/services'
import { getStripe, formatAmountForStripe, stripeAppearance } from '@/lib/stripe'
import { paymentsAPI } from '@/lib/api/payments'
import { StripePaymentForm } from '@/components/payments/StripePaymentForm'

interface PaymentStepProps {
  service: Service | null
  onPaymentSelect: (paymentMethod: 'full' | 'deposit' | 'in_person', paymentDetails: any) => void
  selectedMethod: 'full' | 'deposit' | 'in_person'
  appointmentId?: number
  customerEmail?: string
  onPaymentSuccess?: (paymentId: number) => void
  onPaymentError?: (error: string) => void
  locationId?: number
  // Location payment settings
  payInPersonEnabled?: boolean
  payInPersonMessage?: string
}

interface PaymentOption {
  id: 'full' | 'deposit' | 'in_person'
  name: string
  description: string
  icon: React.ElementType
  amount: number
  note?: string
  requiresOnlinePayment: boolean
}

export default function EnhancedPaymentStep({
  service,
  onPaymentSelect,
  selectedMethod,
  appointmentId,
  customerEmail,
  onPaymentSuccess,
  onPaymentError,
  locationId,
  payInPersonEnabled = true,
  payInPersonMessage
}: PaymentStepProps) {
  const [loading, setLoading] = useState(false)
  const [selectedOption, setSelectedOption] = useState<PaymentOption | null>(null)
  const [clientSecret, setClientSecret] = useState<string>('')
  const [paymentIntentId, setPaymentIntentId] = useState<string>('')
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [stripeError, setStripeError] = useState<string>('')
  const [stripePromise] = useState(() => getStripe())
  const [appointmentValidationError, setAppointmentValidationError] = useState<string>('')

  // Debug logging for appointment ID tracking
  useEffect(() => {
    console.log('[EnhancedPaymentStep] Component mounted with props:', {
      appointmentId,
      customerEmail,
      locationId,
      serviceId: service?.id,
      serviceName: service?.name,
      payInPersonEnabled,
      timestamp: new Date().toISOString()
    })

    // Validate appointment ID on mount
    if (appointmentId === undefined || appointmentId === null) {
      console.warn('[EnhancedPaymentStep] WARNING: appointmentId is missing or undefined')
      setAppointmentValidationError('Appointment ID is missing. Please ensure the appointment was created successfully before proceeding with payment.')
    } else if (typeof appointmentId !== 'number' || appointmentId <= 0) {
      console.warn('[EnhancedPaymentStep] WARNING: appointmentId is invalid:', appointmentId)
      setAppointmentValidationError(`Invalid appointment ID format: ${appointmentId}. Expected a positive number.`)
    } else {
      console.log('[EnhancedPaymentStep] Appointment ID validation passed:', appointmentId)
      setAppointmentValidationError('')
    }
  }, [appointmentId, customerEmail, locationId, service])

  // Track prop changes for debugging
  useEffect(() => {
    console.log('[EnhancedPaymentStep] Appointment ID changed:', {
      from: 'previous value',
      to: appointmentId,
      type: typeof appointmentId,
      isValid: appointmentId !== undefined && appointmentId !== null && typeof appointmentId === 'number' && appointmentId > 0,
      timestamp: new Date().toISOString()
    })
  }, [appointmentId])

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
      id: 'deposit',
      name: 'Pay Deposit Only',
      description: 'Secure your booking with a deposit',
      icon: CurrencyDollarIcon,
      amount: depositAmount,
      note: `Remaining $${(fullAmount - depositAmount).toFixed(2)} due at appointment`,
      requiresOnlinePayment: true
    },
    {
      id: 'full',
      name: 'Pay Full Amount',
      description: 'Pay the complete service fee now',
      icon: CreditCardIcon,
      amount: fullAmount,
      note: 'No additional payment required at appointment',
      requiresOnlinePayment: true
    }
  ]

  // Add "Pay in Person" option if enabled for this location
  if (payInPersonEnabled) {
    paymentOptions.push({
      id: 'in_person',
      name: 'Pay in Person',
      description: 'Pay when you arrive at the shop',
      icon: BanknotesIcon,
      amount: fullAmount,
      note: payInPersonMessage || 'Payment accepted at the shop: cash, card, or digital wallet',
      requiresOnlinePayment: false
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
    setShowPaymentForm(false)
    setStripeError('')
  }

  const createPaymentIntent = async (amount: number) => {
    console.log('[EnhancedPaymentStep] createPaymentIntent called with:', {
      amount,
      appointmentId,
      appointmentIdType: typeof appointmentId,
      selectedOption: selectedOption?.id,
      customerEmail,
      locationId,
      timestamp: new Date().toISOString()
    })

    // Enhanced validation with detailed error messages
    if (appointmentId === undefined || appointmentId === null) {
      const errorMsg = `Cannot process payment: Appointment ID is missing. This usually means the appointment creation failed or is still in progress. Please try refreshing the page or starting a new booking.`
      console.error('[EnhancedPaymentStep] Payment blocked - missing appointment ID:', {
        appointmentId,
        type: typeof appointmentId,
        customerEmail,
        timestamp: new Date().toISOString()
      })
      setStripeError(errorMsg)
      onPaymentError?.(errorMsg)
      return
    }

    if (typeof appointmentId !== 'number' || appointmentId <= 0) {
      const errorMsg = `Cannot process payment: Invalid appointment ID format (${appointmentId}). Expected a positive number. Please try creating a new booking.`
      console.error('[EnhancedPaymentStep] Payment blocked - invalid appointment ID:', {
        appointmentId,
        type: typeof appointmentId,
        customerEmail,
        timestamp: new Date().toISOString()
      })
      setStripeError(errorMsg)
      onPaymentError?.(errorMsg)
      return
    }

    if (!selectedOption) {
      const errorMsg = 'Please select a payment option before proceeding.'
      console.error('[EnhancedPaymentStep] Payment blocked - no payment option selected')
      setStripeError(errorMsg)
      onPaymentError?.(errorMsg)
      return
    }

    try {
      setLoading(true)
      setStripeError('') // Clear any previous errors

      console.log('[EnhancedPaymentStep] Creating payment intent with validated data:', {
        appointmentId,
        amount: formatAmountForStripe(amount),
        paymentType: selectedOption.id,
        customerEmail,
        locationId
      })

      const intent = await paymentsAPI.createPaymentIntent({
        appointmentId: appointmentId.toString(),
        amount: formatAmountForStripe(amount),
        currency: 'usd',
        saveMethod: false,
        metadata: {
          payment_type: selectedOption.id,
          customer_email: customerEmail || 'not_provided',
          location_id: locationId?.toString() || 'not_provided',
          original_amount: amount.toString(),
          created_at: new Date().toISOString()
        }
      })

      console.log('[EnhancedPaymentStep] Payment intent created successfully:', {
        paymentIntentId: intent.id,
        clientSecretLength: intent.clientSecret?.length || 0,
        appointmentId,
        timestamp: new Date().toISOString()
      })

      setClientSecret(intent.clientSecret)
      setPaymentIntentId(intent.id)
      setShowPaymentForm(true)
    } catch (error) {
      console.error('[EnhancedPaymentStep] Payment intent creation failed:', {
        error,
        appointmentId,
        amount,
        selectedOption: selectedOption?.id,
        customerEmail,
        locationId,
        timestamp: new Date().toISOString()
      })

      let errorMessage = 'Failed to initialize payment. Please try again.'

      if (error instanceof Error) {
        errorMessage = error.message

        // Provide more specific error messages based on common issues
        if (error.message.includes('appointment not found') || error.message.includes('404')) {
          errorMessage = 'The appointment could not be found. Please refresh the page and try again, or start a new booking.'
        } else if (error.message.includes('unauthorized') || error.message.includes('401')) {
          errorMessage = 'Authentication error. Please refresh the page and try again.'
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network connection error. Please check your internet connection and try again.'
        } else if (error.message.includes('stripe') || error.message.includes('payment')) {
          errorMessage = 'Payment system error. Please try again in a moment.'
        }
      }

      setStripeError(errorMessage)
      onPaymentError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = async () => {
    console.log('[EnhancedPaymentStep] handleContinue called:', {
      selectedOption: selectedOption?.id,
      appointmentId,
      timestamp: new Date().toISOString()
    })

    if (!selectedOption) {
      const errorMsg = 'Please select a payment option before continuing.'
      console.warn('[EnhancedPaymentStep] Continue blocked - no option selected')
      setStripeError(errorMsg)
      return
    }

    // If "Pay in Person" is selected, no online payment is needed
    if (selectedOption.id === 'in_person') {
      console.log('[EnhancedPaymentStep] Processing in-person payment option')

      // Still validate appointment ID for in-person payments
      if (!appointmentId || typeof appointmentId !== 'number' || appointmentId <= 0) {
        const errorMsg = 'Cannot complete booking: Invalid appointment data. Please refresh and try again.'
        console.error('[EnhancedPaymentStep] In-person payment blocked - invalid appointment ID:', appointmentId)
        setStripeError(errorMsg)
        onPaymentError?.(errorMsg)
        return
      }

      const paymentDetails = {
        method: 'in_person',
        amount: selectedOption.amount,
        currency: 'USD',
        status: 'pending_in_person',
        requires_in_person_payment: true,
        payment_instructions: selectedOption.note,
        appointment_id: appointmentId
      }

      console.log('[EnhancedPaymentStep] In-person payment details created:', paymentDetails)
      onPaymentSelect('in_person', paymentDetails)
      onPaymentSuccess?.(0) // No payment ID for in-person payments
      return
    }

    // For online payments, create payment intent
    console.log('[EnhancedPaymentStep] Proceeding with online payment intent creation')
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
              const isInPerson = option.id === 'in_person'
              return (
                <RadioGroup.Option
                  key={option.id}
                  value={option}
                  className={({ checked }) =>
                    `${checked
                      ? isInPerson
                        ? 'bg-green-50 border-green-600 ring-1 ring-green-600'
                        : 'bg-slate-50 border-slate-600 ring-1 ring-slate-600'
                      : 'border-gray-300'}
                    relative flex cursor-pointer rounded-lg border p-4 focus:outline-none hover:bg-gray-50 transition-colors`
                  }
                >
                  {({ checked }) => (
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center">
                        <div className="text-sm">
                          <div className="flex items-center">
                            <Icon className={`h-5 w-5 mr-3 ${
                              isInPerson
                                ? checked ? 'text-green-600' : 'text-green-500'
                                : 'text-gray-600'
                            }`} />
                            <div>
                              <RadioGroup.Label
                                as="p"
                                className={`font-medium ${
                                  checked
                                    ? isInPerson ? 'text-green-900' : 'text-slate-900'
                                    : 'text-gray-900'
                                }`}
                              >
                                {option.name}
                              </RadioGroup.Label>
                              <RadioGroup.Description
                                as="p"
                                className={`${
                                  checked
                                    ? isInPerson ? 'text-green-700' : 'text-slate-700'
                                    : 'text-gray-500'
                                }`}
                              >
                                {option.description}
                              </RadioGroup.Description>
                              {option.note && (
                                <p className={`text-sm mt-1 ${
                                  isInPerson ? 'text-green-600' : 'text-gray-500'
                                }`}>
                                  {option.note}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="text-right mr-4">
                          {!isInPerson && (
                            <>
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
                            </>
                          )}
                          {isInPerson && (
                            <div className={`text-lg font-semibold ${
                              checked ? 'text-green-900' : 'text-green-700'
                            }`}>
                              {formatPrice(option.amount)}
                            </div>
                          )}
                        </div>
                        {checked && (
                          <CheckIcon className={`h-5 w-5 ${
                            isInPerson ? 'text-green-600' : 'text-slate-600'
                          }`} />
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

      {/* Pay in Person Special Notice */}
      {selectedOption?.id === 'in_person' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <BanknotesIcon className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
            <div className="text-sm">
              <p className="text-green-800 font-medium">Pay in Person Selected</p>
              <p className="text-green-700 mt-1">
                Your appointment is confirmed! No online payment is required.
                Please bring payment when you arrive at the shop.
              </p>
              <div className="mt-2 text-green-700">
                <p className="font-medium">Accepted payment methods at the shop:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Cash</li>
                  <li>Credit/Debit Cards</li>
                  <li>Digital Wallets (Apple Pay, Google Pay)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Notice for Online Payments */}
      {selectedOption?.requiresOnlinePayment && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <ShieldCheckIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
            <div className="text-sm">
              <p className="text-blue-800 font-medium">Secure Online Payment</p>
              <p className="text-blue-700 mt-1">
                Your payment information is encrypted and secure. We use industry-standard security measures to protect your data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Validation Error */}
      {appointmentValidationError && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 mt-0.5 mr-3" />
            <div className="text-sm">
              <p className="text-orange-800 font-medium">Appointment Setup Issue</p>
              <p className="text-orange-700 mt-1">{appointmentValidationError}</p>
              <div className="mt-3">
                <p className="text-orange-600 text-xs">
                  Debug info: Appointment ID = {appointmentId} (type: {typeof appointmentId})
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Error Display */}
      {stripeError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
            <div className="text-sm">
              <p className="text-red-800 font-medium">Payment Error</p>
              <p className="text-red-700 mt-1">{stripeError}</p>
              <div className="mt-3">
                <p className="text-red-600 text-xs">
                  If this issue persists, please try refreshing the page or starting a new booking.
                </p>
                <p className="text-red-600 text-xs mt-1">
                  Debug info: Appointment ID = {appointmentId}, Customer = {customerEmail || 'not provided'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Payment Form */}
      {showPaymentForm && clientSecret && selectedOption && stripePromise && selectedOption.requiresOnlinePayment && (
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
          disabled={!selectedOption || loading || !!appointmentValidationError}
          className={`w-full px-6 py-3 text-white text-lg font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center ${
            selectedOption?.id === 'in_person'
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-slate-700 hover:bg-slate-800'
          }`}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Initializing Payment...
            </>
          ) : appointmentValidationError ? (
            'Fix Appointment Issues First'
          ) : selectedOption?.id === 'in_person' ? (
            'Confirm Booking (Pay in Person)'
          ) : (
            `Proceed with ${selectedOption ? formatPrice(selectedOption.amount) : 'Payment'}`
          )}
        </button>
      )}

      {/* Payment Info Footer */}
      <div className="text-center text-sm text-gray-500">
        {selectedOption?.id === 'in_person' ? (
          <p>Your booking will be confirmed immediately. Payment is due when you arrive at the shop.</p>
        ) : (
          <p>Payments are processed securely through Stripe. Your card information is encrypted and never stored on our servers.</p>
        )}
      </div>
    </div>
  )
}
