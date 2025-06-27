'use client'

import React from 'react'
import { X, Lock, Search, ShoppingCart, CreditCard, CheckCircle } from 'lucide-react'

interface QuickStartGuideProps {
  isOpen: boolean
  onClose: () => void
}

export function QuickStartGuide({ isOpen, onClose }: QuickStartGuideProps) {
  if (!isOpen) return null

  const steps = [
    {
      icon: Lock,
      title: 'Login with PIN',
      description: 'Select your name and enter your 4-6 digit PIN to access the POS'
    },
    {
      icon: Search,
      title: 'Find Products',
      description: 'Search or browse products by category. Tap to add to cart'
    },
    {
      icon: ShoppingCart,
      title: 'Review Cart',
      description: 'Adjust quantities or remove items. Your commission is calculated automatically'
    },
    {
      icon: CreditCard,
      title: 'Process Payment',
      description: 'Accept card, cash, or other payment methods'
    },
    {
      icon: CheckCircle,
      title: 'Complete Sale',
      description: 'Print or email receipts. Your commission is tracked for payouts'
    }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">POS Quick Start Guide</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="space-y-6">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Icon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">
                      {index + 1}. {step.title}
                    </h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Tips for Success</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Keep your PIN secure and don't share it with others</li>
              <li>• Double-check items before processing payment</li>
              <li>• Always offer receipts to customers</li>
              <li>• Log out when you're done to protect your commissions</li>
            </ul>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
