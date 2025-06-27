'use client'

import React from 'react'
import { Trash2, Plus, Minus, ShoppingCart as CartIcon } from 'lucide-react'
import type { Product } from './ProductGrid'

export interface CartItem {
  product: Product
  quantity: number
}

interface ShoppingCartProps {
  items: CartItem[]
  onUpdateQuantity: (productId: number, quantity: number) => void
  onRemoveItem: (productId: number) => void
  onCheckout: () => void
}

export function ShoppingCart({ items, onUpdateQuantity, onRemoveItem, onCheckout }: ShoppingCartProps) {
  const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  const tax = subtotal * 0.0875 // Example 8.75% tax rate
  const total = subtotal + tax

  const totalCommission = items.reduce((sum, item) => {
    const commission = item.product.commission_rate || 0.15 // Default 15% if not specified
    return sum + (item.product.price * item.quantity * commission)
  }, 0)

  return (
    <div className="w-full md:w-96 bg-white border-l flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <CartIcon className="w-5 h-5" />
          Shopping Cart
          {items.length > 0 && (
            <span className="bg-blue-600 text-white text-sm px-2 py-1 rounded-full">
              {items.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </h2>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-center py-12 px-4">
            <CartIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Your cart is empty</p>
            <p className="text-sm text-gray-400 mt-2">Add products to get started</p>
          </div>
        ) : (
          <div className="divide-y">
            {items.map(item => (
              <div key={item.product.id} className="p-4">
                <div className="flex justify-between mb-2">
                  <h3 className="font-medium text-gray-900 flex-1 pr-2">
                    {item.product.name}
                  </h3>
                  <button
                    onClick={() => onRemoveItem(item.product.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, Math.max(0, item.quantity - 1))}
                      className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="font-semibold text-gray-900">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </span>
                </div>

                {item.product.commission_rate && (
                  <p className="text-xs text-gray-500 mt-1">
                    Commission: ${(item.product.price * item.quantity * item.product.commission_rate).toFixed(2)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {items.length > 0 && (
        <div className="border-t p-4 space-y-2">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Tax</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold pt-2 border-t">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          {totalCommission > 0 && (
            <div className="flex justify-between text-sm text-green-600 pt-2">
              <span>Your Commission</span>
              <span>+${totalCommission.toFixed(2)}</span>
            </div>
          )}

          <button
            onClick={onCheckout}
            className="w-full mt-4 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-lg"
          >
            Checkout
          </button>
        </div>
      )}
    </div>
  )
}
