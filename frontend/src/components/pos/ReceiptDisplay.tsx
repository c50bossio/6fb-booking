'use client'

import React from 'react'
import { CheckCircle, Printer, Mail, MessageSquare, X } from 'lucide-react'
import type { CartItem } from './ShoppingCart'

interface ReceiptDisplayProps {
  items: CartItem[]
  total: number
  paymentMethod: string
  transactionId: string
  barberName: string
  commission: number
  onClose: () => void
  onPrint?: () => void
  onEmail?: () => void
  onSMS?: () => void
}

export function ReceiptDisplay({
  items,
  total,
  paymentMethod,
  transactionId,
  barberName,
  commission,
  onClose,
  onPrint,
  onEmail,
  onSMS
}: ReceiptDisplayProps) {
  const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  const tax = total - subtotal

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 text-center border-b">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Payment Successful!</h2>
          <p className="text-gray-600 mt-2">Transaction #{transactionId}</p>
        </div>

        {/* Receipt Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Store Info */}
            <div className="text-center">
              <h3 className="font-bold text-lg">Six Feet Barbershop</h3>
              <p className="text-sm text-gray-600">123 Main Street</p>
              <p className="text-sm text-gray-600">City, State 12345</p>
              <p className="text-sm text-gray-600">{new Date().toLocaleString()}</p>
            </div>

            {/* Barber Info */}
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600">Served by: <span className="font-semibold">{barberName}</span></p>
            </div>

            {/* Items */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Items Purchased</h4>
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span>
                      {item.product.name} x {item.quantity}
                    </span>
                    <span>${(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Info */}
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600">
                Payment Method: <span className="font-semibold capitalize">{paymentMethod}</span>
              </p>
            </div>

            {/* Commission Info (for barber) */}
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm font-semibold text-green-800">
                Your Commission: ${commission.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {onPrint && (
              <button
                onClick={onPrint}
                className="flex flex-col items-center gap-2 p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Printer className="w-5 h-5" />
                <span className="text-xs">Print</span>
              </button>
            )}
            {onEmail && (
              <button
                onClick={onEmail}
                className="flex flex-col items-center gap-2 p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Mail className="w-5 h-5" />
                <span className="text-xs">Email</span>
              </button>
            )}
            {onSMS && (
              <button
                onClick={onSMS}
                className="flex flex-col items-center gap-2 p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-xs">SMS</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            New Sale
          </button>
        </div>
      </div>
    </div>
  )
}
