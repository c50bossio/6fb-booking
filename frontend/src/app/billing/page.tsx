'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CreditCardIcon,
  CalendarIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { TrialCountdown } from '@/components/trial'

export default function BillingPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Mock trial data - in real app this would come from API
  const mockTrialEndDate = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000) // 25 days from now
  const mockSubscriptionStatus = 'TRIAL' as const

  const handleUpgrade = () => {
    router.push('/upgrade')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 mb-6"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Billing & Subscription
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your subscription and billing information
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Trial Status */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Current Subscription
              </h2>

              {/* Trial Countdown Component */}
              <TrialCountdown
                trialEndDate={mockTrialEndDate}
                subscriptionStatus={mockSubscriptionStatus}
                onUpgrade={handleUpgrade}
                showUpgradeButton={true}
              />
            </div>

            {/* Usage Summary */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Trial Usage Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Appointments Created</span>
                  <span className="text-gray-900 dark:text-white font-medium">12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Clients Added</span>
                  <span className="text-gray-900 dark:text-white font-medium">8</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Revenue Tracked</span>
                  <span className="text-gray-900 dark:text-white font-medium">$425</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Team Members</span>
                  <span className="text-gray-900 dark:text-white font-medium">3</span>
                </div>
              </div>
            </div>
          </div>

          {/* Billing Information */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Billing Information
              </h2>

              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
                    <span className="text-gray-900 dark:text-white font-medium">No Payment Method</span>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Add a payment method to seamlessly upgrade when your trial ends.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => console.log('Add payment method')}
                >
                  <CreditCardIcon className="h-4 w-4 mr-2" />
                  Add Payment Method
                </Button>
              </div>
            </div>

            {/* Billing History */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Billing History
              </h3>

              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No billing history yet
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Your billing history will appear here after your first payment
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">
                Need Help?
              </h3>
              <p className="text-blue-700 dark:text-blue-200 mt-1">
                Have questions about your trial or billing? Our support team is here to help.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-800"
                onClick={() => console.log('Contact support')}
              >
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
