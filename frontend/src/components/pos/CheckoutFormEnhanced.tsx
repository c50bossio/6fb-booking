'use client'

import React, { useState } from 'react'
import { CreditCard, DollarSign, Smartphone, Gift, ChevronLeft, AlertCircle, WifiOff } from 'lucide-react'
import type { CartItem } from './ShoppingCart'
import { POSErrorHandler, POSError, ErrorType } from '@/lib/pos/error-handler'
import { useNetworkStatus } from '@/lib/pos/network-monitor'

interface CheckoutFormProps {
  items: CartItem[]
  total: number
  onBack: () => void
  onComplete: (paymentMethod: string, paymentDetails: any) => Promise<void>
}

export function CheckoutFormEnhanced({ items, total, onBack, onComplete }: CheckoutFormProps) {
  const networkStatus = useNetworkStatus()
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'other'>('card')
  const [cashReceived, setCashReceived] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [processingError, setProcessingError] = useState<POSError | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const cashReceivedAmount = parseFloat(cashReceived) || 0
  const changeDue = cashReceivedAmount - total

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // Email validation (optional but must be valid if provided)
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      errors.customerEmail = 'Please enter a valid email address'
    }

    // Phone validation (optional but must be valid if provided)
    if (customerPhone && !/^\d{10,}$/.test(customerPhone.replace(/\D/g, ''))) {
      errors.customerPhone = 'Please enter a valid phone number'
    }

    // Cash validation
    if (paymentMethod === 'cash') {
      if (!cashReceived) {
        errors.cashReceived = 'Please enter the amount received'
      } else if (cashReceivedAmount < total) {
        errors.cashReceived = 'Insufficient cash received'
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsProcessing(true)
    setProcessingError(null)
    setRetryCount(0)

    try {
      const paymentDetails = {
        method: paymentMethod,
        customerEmail,
        customerPhone,
        ...(paymentMethod === 'cash' && { cashReceived: cashReceivedAmount, changeDue })
      }

      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Payment timeout')), 30000) // 30 second timeout
      })

      await Promise.race([
        onComplete(paymentMethod, paymentDetails),
        timeoutPromise
      ])
    } catch (error) {
      const posError = POSErrorHandler.parseError(error)
      setProcessingError(posError)

      // Auto-retry for certain errors
      if (POSErrorHandler.isRetryable(posError) && retryCount < 2) {
        setRetryCount(retryCount + 1)
        setTimeout(() => handleSubmit(e), 2000) // Retry after 2 seconds
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`
    }
    return value
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setCustomerPhone(formatted)

    // Clear validation error when user starts typing
    if (validationErrors.customerPhone) {
      setValidationErrors(prev => ({ ...prev, customerPhone: '' }))
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerEmail(e.target.value)

    // Clear validation error when user starts typing
    if (validationErrors.customerEmail) {
      setValidationErrors(prev => ({ ...prev, customerEmail: '' }))
    }
  }

  const handleCashChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCashReceived(e.target.value)

    // Clear validation error when user starts typing
    if (validationErrors.cashReceived) {
      setValidationErrors(prev => ({ ...prev, cashReceived: '' }))
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          disabled={isProcessing}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold">Checkout</h2>

        {/* Network Status */}
        {!networkStatus.isOnline && (
          <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
            <WifiOff className="w-4 h-4" />
            <span>Offline Mode</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Display */}
          {processingError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">{processingError.userMessage}</p>
                  {retryCount > 0 && (
                    <p className="text-sm mt-1">Retry attempt {retryCount} of 2</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Order Summary</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {items.map(item => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span>{item.product.name} x {item.quantity}</span>
                  <span>${(item.product.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="pt-2 border-t flex justify-between font-semibold">
                <span>Total (incl. tax)</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Customer Info (Optional) */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Customer Info (Optional)</h3>
            <div className="space-y-3">
              <div>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={handleEmailChange}
                  placeholder="Email for receipt"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none transition-colors ${
                    validationErrors.customerEmail
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  disabled={isProcessing}
                />
                {validationErrors.customerEmail && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.customerEmail}</p>
                )}
              </div>

              <div>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={handlePhoneChange}
                  placeholder="Phone number"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none transition-colors ${
                    validationErrors.customerPhone
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-300 focus:border-blue-500'
                  }`}
                  disabled={isProcessing}
                />
                {validationErrors.customerPhone && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.customerPhone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Payment Method</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                disabled={isProcessing}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === 'card'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <CreditCard className="w-8 h-8 mx-auto mb-2" />
                <span className="block text-sm font-medium">Card</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                disabled={isProcessing}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <DollarSign className="w-8 h-8 mx-auto mb-2" />
                <span className="block text-sm font-medium">Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('other')}
                disabled={isProcessing}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentMethod === 'other'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Smartphone className="w-8 h-8 mx-auto mb-2" />
                <span className="block text-sm font-medium">Other</span>
              </button>
            </div>

            {!networkStatus.isOnline && (
              <p className="mt-3 text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Payments will be processed when connection is restored
              </p>
            )}
          </div>

          {/* Cash Payment Details */}
          {paymentMethod === 'cash' && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Cash Payment</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cash Received
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashReceived}
                    onChange={handleCashChange}
                    placeholder="0.00"
                    className={`w-full px-4 py-3 text-xl font-semibold border rounded-lg focus:outline-none transition-colors ${
                      validationErrors.cashReceived
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-gray-300 focus:border-blue-500'
                    }`}
                    required
                    disabled={isProcessing}
                  />
                  {validationErrors.cashReceived && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.cashReceived}</p>
                  )}
                </div>

                {cashReceivedAmount > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between mb-2">
                      <span>Total Due</span>
                      <span className="font-semibold">${total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Cash Received</span>
                      <span className="font-semibold">${cashReceivedAmount.toFixed(2)}</span>
                    </div>
                    {changeDue >= 0 ? (
                      <div className="flex justify-between text-lg font-bold text-green-600 pt-2 border-t">
                        <span>Change Due</span>
                        <span>${changeDue.toFixed(2)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-lg font-bold text-red-600 pt-2 border-t">
                        <span>Amount Short</span>
                        <span>${Math.abs(changeDue).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="p-6 border-t">
          <button
            type="submit"
            disabled={isProcessing || (paymentMethod === 'cash' && changeDue < 0)}
            className="w-full py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-lg flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Complete Sale - ${total.toFixed(2)}</span>
            )}
          </button>

          {!networkStatus.isOnline && (
            <p className="mt-2 text-xs text-center text-gray-500">
              Transaction will be saved locally and synced when online
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
