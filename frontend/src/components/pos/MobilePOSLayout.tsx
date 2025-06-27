'use client'

import React, { useState } from 'react'
import { ChevronUp, ShoppingCart as CartIcon } from 'lucide-react'

interface MobilePOSLayoutProps {
  cartCount: number
  cartTotal: number
  children: React.ReactNode
  cartContent: React.ReactNode
}

export function MobilePOSLayout({ cartCount, cartTotal, children, cartContent }: MobilePOSLayoutProps) {
  const [isCartExpanded, setIsCartExpanded] = useState(false)

  return (
    <div className="h-full relative md:flex">
      {/* Main Content Area */}
      <div className="flex-1 h-full pb-20 md:pb-0">
        {children}
      </div>

      {/* Mobile Cart Toggle Button */}
      <button
        onClick={() => setIsCartExpanded(!isCartExpanded)}
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center justify-between z-40"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <CartIcon className="w-6 h-6" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </div>
          <span className="font-semibold">
            {cartCount === 0 ? 'Cart Empty' : `${cartCount} items`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">${cartTotal.toFixed(2)}</span>
          <ChevronUp className={`w-5 h-5 transition-transform ${isCartExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Mobile Cart Overlay */}
      {isCartExpanded && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsCartExpanded(false)}
        />
      )}

      {/* Cart Content */}
      <div
        className={`
          fixed md:relative bottom-0 left-0 right-0 md:bottom-auto md:left-auto md:right-auto
          bg-white md:bg-transparent
          transform transition-transform duration-300 ease-out
          ${isCartExpanded ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
          max-h-[80vh] md:max-h-full md:h-full
          z-40 md:z-auto
          md:w-96
        `}
      >
        {cartContent}
      </div>
    </div>
  )
}
