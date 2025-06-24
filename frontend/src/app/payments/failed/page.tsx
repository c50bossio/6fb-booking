'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { XCircleIcon, ArrowLeftIcon, ArrowPathIcon, CreditCardIcon } from '@heroicons/react/24/outline'

export default function PaymentFailedPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const appointmentId = searchParams.get('appointment_id')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-3">
              <XCircleIcon className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* Error Message */}
          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
            Payment Failed
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
            {error || 'We were unable to process your payment. Please try again.'}
          </p>

          {/* Common Error Reasons */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Common reasons for payment failure:
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>" Insufficient funds</li>
              <li>" Card declined by issuer</li>
              <li>" Incorrect card details</li>
              <li>" Expired card</li>
              <li>" Network connection issues</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {appointmentId ? (
              <Link
                href={`/book-appointment/${appointmentId}/payment`}
                className="w-full inline-flex items-center justify-center px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
              >
                <ArrowPathIcon className="h-5 w-5 mr-2" />
                Try Again
              </Link>
            ) : (
              <Link
                href="/payments"
                className="w-full inline-flex items-center justify-center px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
              >
                <CreditCardIcon className="h-5 w-5 mr-2" />
                Payment Methods
              </Link>
            )}

            <Link
              href="/dashboard"
              className="w-full inline-flex items-center justify-center px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Link>
          </div>

          {/* Help Section */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Need help?</strong>
              <br />
              Contact support at{' '}
              <a
                href="mailto:support@6fb.com"
                className="underline hover:no-underline"
              >
                support@6fb.com
              </a>{' '}
              or call{' '}
              <a
                href="tel:1-800-6FB-HELP"
                className="underline hover:no-underline"
              >
                1-800-6FB-HELP
              </a>
            </p>
          </div>
        </div>

        {/* Additional Actions */}
        <div className="mt-4 text-center space-y-2">
          <Link
            href="/help/payment-issues"
            className="text-sm text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
          >
            Troubleshoot payment issues
          </Link>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your appointment has been held for 15 minutes while you complete payment.
          </p>
        </div>
      </div>
    </div>
  )
}
