'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StarIcon, CheckIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'

export default function UpgradePage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleUpgrade = async () => {
    setLoading(true)
    // TODO: Implement Stripe checkout flow
    console.log('Starting upgrade process...')

    // Mock upgrade process for now
    setTimeout(() => {
      setLoading(false)
      alert('Upgrade process will be implemented with Stripe integration!')
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>

          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full">
                <StarIcon className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Upgrade to Premium
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Unlock all features and grow your barbershop business with our comprehensive platform
            </p>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Basic Plan */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Basic
              </h3>
              <div className="flex items-baseline justify-center">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">$29</span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">/month</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Perfect for solo barbers
              </p>
            </div>

            <div className="space-y-3 mb-8">
              {[
                'Up to 100 appointments/month',
                'Basic analytics',
                'Payment processing',
                'Client management',
                'Email support'
              ].map((feature, index) => (
                <div key={index} className="flex items-center">
                  <CheckIcon className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={handleUpgrade}
              variant="outline"
              className="w-full"
            >
              Start Basic
            </Button>
          </div>

          {/* Premium Plan - Most Popular */}
          <div className="bg-white dark:bg-gray-900 border-2 border-yellow-500 rounded-2xl p-6 relative scale-105">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </span>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Premium
              </h3>
              <div className="flex items-baseline justify-center">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">$49</span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">/month</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Everything you need to grow
              </p>
            </div>

            <div className="space-y-3 mb-8">
              {[
                'Unlimited appointments',
                'Advanced analytics dashboard',
                'Automated payment processing',
                'Client communication tools',
                'Team management features',
                'Priority support',
                'Mobile app access',
                'Custom branding'
              ].map((feature, index) => (
                <div key={index} className="flex items-center">
                  <CheckIcon className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-medium"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                <>
                  <StarIcon className="h-4 w-4 mr-2" />
                  Upgrade Now
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
              30-day money-back guarantee
            </p>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Enterprise
              </h3>
              <div className="flex items-baseline justify-center">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">$99</span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">/month</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                For multi-location businesses
              </p>
            </div>

            <div className="space-y-3 mb-8">
              {[
                'Everything in Premium',
                'Multi-location management',
                'Advanced reporting',
                'API access',
                'White-label options',
                'Dedicated account manager',
                'Custom integrations',
                'SLA guarantee'
              ].map((feature, index) => (
                <div key={index} className="flex items-center">
                  <CheckIcon className="h-4 w-4 text-green-500 mr-3" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={() => console.log('Contact sales')}
              variant="outline"
              className="w-full"
            >
              Contact Sales
            </Button>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                What happens to my trial data?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                All your trial data, appointments, and settings will be preserved when you upgrade.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Yes, you can cancel your subscription at any time from your billing settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
