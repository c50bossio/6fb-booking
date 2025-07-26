'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, CreditCardIcon, DocumentIcon, ClockIcon } from '@heroicons/react/24/outline'

export default function BillingPage() {
  const router = useRouter()
  const [currentPlan] = useState({
    name: 'Professional',
    price: '$49',
    period: 'month',
    features: ['Unlimited appointments', 'Advanced analytics', 'Custom branding', 'Priority support']
  })

  const [paymentMethods] = useState([
    {
      id: '1',
      type: 'Visa',
      last4: '4242',
      expiry: '12/25',
      isDefault: true
    },
    {
      id: '2',
      type: 'Mastercard',
      last4: '8888',
      expiry: '06/26',
      isDefault: false
    }
  ])

  const [invoices] = useState([
    {
      id: 'INV-2023-12',
      date: '2023-12-01',
      amount: '$49.00',
      status: 'paid',
      downloadUrl: '#'
    },
    {
      id: 'INV-2023-11',
      date: '2023-11-01',
      amount: '$49.00',
      status: 'paid',
      downloadUrl: '#'
    },
    {
      id: 'INV-2023-10',
      date: '2023-10-01',
      amount: '$49.00',
      status: 'paid',
      downloadUrl: '#'
    }
  ])

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <CreditCardIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Billing</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">View billing information and manage payment methods</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/settings')}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors duration-200"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>Back to Settings</span>
          </button>
        </div>

        {/* Billing Content */}
        <div className="space-y-6">
          {/* Current Plan */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Current Plan</h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 rounded-full text-sm font-medium">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{currentPlan.name}</h3>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {currentPlan.price}
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/{currentPlan.period}</span>
                </p>
                <ul className="mt-3 space-y-1">
                  {currentPlan.features.map((feature, index) => (
                    <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="text-right">
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 mb-2">
                  Upgrade Plan
                </button>
                <br />
                <button className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium">
                  Cancel Subscription
                </button>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Methods</h2>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200">
                Add Payment Method
              </button>
            </div>
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-6 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {method.type === 'Visa' ? 'VISA' : 'MC'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        •••• •••• •••• {method.last4}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Expires {method.expiry}
                        {method.isDefault && <span className="ml-2 text-blue-600 dark:text-blue-400">• Default</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!method.isDefault && (
                      <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium">
                        Make Default
                      </button>
                    )}
                    <button className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Billing History */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Billing History</h2>
              <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium">
                View All
              </button>
            </div>
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <DocumentIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{invoice.id}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {new Date(invoice.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">{invoice.amount}</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        invoice.status === 'paid' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      }`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </div>
                    <button
                      onClick={() => window.open(invoice.downloadUrl, '_blank')}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Usage & Limits */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Usage This Month</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">247</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Appointments</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">Unlimited</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">8.4GB</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Storage Used</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">of 100GB</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">1,234</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">API Calls</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">Unlimited</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}