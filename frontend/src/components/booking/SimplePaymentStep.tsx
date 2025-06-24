'use client'

import { useState } from 'react'
import { RadioGroup } from '@headlessui/react'
import {
  CreditCardIcon,
  CheckIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import type { Service } from '@/lib/api/services'

interface PaymentStepProps {
  service: Service | null
  onPaymentSelect: (paymentMethod: 'full' | 'deposit', paymentDetails: any) => void
  selectedMethod: 'full' | 'deposit'
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
  selectedMethod
}: PaymentStepProps) {
  const [loading, setLoading] = useState(false)
  const [selectedOption, setSelectedOption] = useState<PaymentOption | null>(null)

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

  const handleContinue = async () => {
    if (!selectedOption) return

    setLoading(true)

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Mock payment details - in real app, this would integrate with Stripe/Square
      const paymentDetails = {
        method: selectedOption.id,
        amount: selectedOption.amount,
        currency: 'USD',
        status: 'confirmed',
        transaction_id: `txn_${Date.now()}`,
        payment_method_id: 'pm_mock_card'
      }

      onPaymentSelect(selectedOption.id, paymentDetails)
    } catch (error) {
      console.error('Payment processing failed:', error)
    } finally {
      setLoading(false)
    }
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

      {/* Mock Payment Form */}
      {selectedOption && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Payment Information</h4>
          <div className="bg-gray-50 rounded-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Number
              </label>
              <input
                type="text"
                placeholder="1234 5678 9012 3456"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date
                </label>
                <input
                  type="text"
                  placeholder="MM/YY"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CVV
                </label>
                <input
                  type="text"
                  placeholder="123"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  disabled={loading}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cardholder Name
              </label>
              <input
                type="text"
                placeholder="John Smith"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                disabled={loading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleContinue}
        disabled={!selectedOption || loading}
        className="w-full px-6 py-3 bg-slate-700 text-white text-lg font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Processing Payment...
          </>
        ) : (
          `Continue with ${selectedOption ? formatPrice(selectedOption.amount) : 'Payment'}`
        )}
      </button>

      {/* Payment Info */}
      <div className="text-center text-sm text-gray-500">
        <p>This is a demo payment form. No actual charges will be made.</p>
      </div>
    </div>
  )
}
