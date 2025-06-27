'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CreditCardIcon,
  PlusIcon,
  TrashIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  CheckIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { paymentsAPI } from '@/lib/api/payments'
import { SavedPaymentMethod } from '@/types/payment'
import { PaymentMethodsList } from '@/components/payments/PaymentMethodsList'
import { loadStripe } from '@stripe/stripe-js'

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

export default function PaymentSettingsPage() {
  const router = useRouter()
  const [paymentMethods, setPaymentMethods] = useState<SavedPaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isAddingCard, setIsAddingCard] = useState(false)

  useEffect(() => {
    fetchPaymentMethods()
  }, [])

  const fetchPaymentMethods = async () => {
    try {
      // Get the current user's customer ID from their profile
      const userResponse = await fetch('/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      const userData = await userResponse.json()

      if (userData.stripe_customer_id) {
        const methods = await paymentsAPI.getSavedMethods(userData.stripe_customer_id)
        setPaymentMethods(methods)
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPaymentMethod = async () => {
    setIsAddingCard(true)
    try {
      const stripe = await stripePromise
      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      // Create a setup intent on your backend
      const response = await fetch('/api/v1/payments/setup-intent', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      })

      const { client_secret } = await response.json()

      // Collect card details
      const { error, setupIntent } = await stripe.confirmCardSetup(client_secret, {
        payment_method: {
          card: {
            // Stripe Elements would be used here in production
          },
        },
      })

      if (error) {
        throw error
      }

      if (setupIntent?.payment_method) {
        // Add the payment method via API
        // The payment method has been created via setup intent
        // Just refresh the list
        await fetchPaymentMethods()
        setShowAddModal(false)
      }
    } catch (error) {
      console.error('Failed to add payment method:', error)
      alert('Failed to add payment method')
    } finally {
      setIsAddingCard(false)
    }
  }

  const handleSetDefault = async (methodId: string) => {
    try {
      await paymentsAPI.setDefaultMethod(methodId)
      await fetchPaymentMethods()
    } catch (error) {
      console.error('Failed to set default payment method:', error)
    }
  }

  const handleRemove = async (methodId: string) => {
    if (confirm('Are you sure you want to remove this payment method?')) {
      try {
        await paymentsAPI.deleteSavedMethod(methodId)
        await fetchPaymentMethods()
      } catch (error) {
        console.error('Failed to remove payment method:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Settings
          </button>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Payment Methods
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your payment methods for appointments and services
          </p>
        </div>

        {/* Security Badge */}
        <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center">
            <ShieldCheckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                Your payment information is secure
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                We use bank-level encryption to protect your payment details
              </p>
            </div>
            <LockClosedIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {/* Payment Methods List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Saved Payment Methods
              </h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Payment Method
              </button>
            </div>
          </div>

          <div className="p-6">
            {paymentMethods.length === 0 ? (
              <div className="text-center py-12">
                <CreditCardIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  No payment methods
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Add a payment method to make booking faster
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Your First Card
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CreditCardIcon className="h-8 w-8 text-gray-400 mr-4" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {method.brand?.toUpperCase()} •••• {method.last4}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Expires {method.expiryMonth}/{method.expiryYear}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {method.isDefault ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                            <CheckIcon className="h-3 w-3 mr-1" />
                            Default
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetDefault(method.id)}
                            className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium"
                          >
                            Set as Default
                          </button>
                        )}

                        <button
                          onClick={() => handleRemove(method.id)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Remove payment method"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Your payment methods are stored securely with our payment processor.
          </p>
          <p className="mt-1">
            We never store your full card details on our servers.
          </p>
        </div>
      </div>

      {/* Add Payment Method Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />

            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Add Payment Method
              </h3>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                This feature requires Stripe Elements integration for secure card collection.
              </p>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPaymentMethod}
                  disabled={isAddingCard}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isAddingCard ? 'Adding...' : 'Add Card'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
