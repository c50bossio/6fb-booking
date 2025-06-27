'use client'

import React, { useState } from 'react'
import { CreditCard, DollarSign, Smartphone, Gift, ChevronLeft } from 'lucide-react'
import type { CartItem } from './ShoppingCart'

interface CheckoutFormProps {
  items: CartItem[]
  total: number
  onBack: () => void
  onComplete: (paymentMethod: string, paymentDetails: any) => Promise<void>
}

export function CheckoutForm({ items, total, onBack, onComplete }: CheckoutFormProps) {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'other'>('card')
  const [cashReceived, setCashReceived] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

  const cashReceivedAmount = parseFloat(cashReceived) || 0
  const changeDue = cashReceivedAmount - total

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      const paymentDetails = {
        method: paymentMethod,
        customerEmail,
        customerPhone,
        ...(paymentMethod === 'cash' && { cashReceived: cashReceivedAmount, changeDue })
      }

      await onComplete(paymentMethod, paymentDetails)
    } catch (error) {
      console.error('Payment failed:', error)
      // Handle error
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold">Checkout</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
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
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Customer Info (Optional) */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Customer Info (Optional)</h3>
            <div className="space-y-3">
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Email for receipt"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Payment Method</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  paymentMethod === 'card'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CreditCard className="w-8 h-8 mx-auto mb-2" />
                <span className="block text-sm font-medium">Card</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  paymentMethod === 'cash'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <DollarSign className="w-8 h-8 mx-auto mb-2" />
                <span className="block text-sm font-medium">Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('other')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  paymentMethod === 'other'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Smartphone className="w-8 h-8 mx-auto mb-2" />
                <span className="block text-sm font-medium">Other</span>
              </button>
            </div>
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
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 text-xl font-semibold border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    required
                  />
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
            className="w-full py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-lg"
          >
            {isProcessing ? 'Processing...' : `Complete Sale - $${total.toFixed(2)}`}
          </button>
        </div>
      </form>
    </div>
  )
}
