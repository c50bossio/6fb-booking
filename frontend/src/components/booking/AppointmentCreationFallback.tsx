'use client'

import { useState } from 'react'
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'

interface AppointmentCreationFallbackProps {
  error?: string
  onRetry: () => void
  onGoBack: () => void
  isRetrying?: boolean
  customerEmail?: string
  locationName?: string
}

export default function AppointmentCreationFallback({
  error,
  onRetry,
  onGoBack,
  isRetrying = false,
  customerEmail,
  locationName
}: AppointmentCreationFallbackProps) {
  const [showDebugInfo, setShowDebugInfo] = useState(false)

  return (
    <div className="space-y-6">
      {/* Main Error Message */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-medium text-red-800">Appointment Creation Failed</h3>
            <p className="text-red-700 mt-2">
              We encountered an issue while creating your appointment. This might be due to:
            </p>
            <ul className="list-disc list-inside mt-3 text-red-700 space-y-1">
              <li>The selected time slot became unavailable</li>
              <li>A temporary connection issue</li>
              <li>High booking demand at this time</li>
              <li>Server maintenance in progress</li>
            </ul>
            {error && (
              <div className="mt-4">
                <p className="text-red-800 font-medium">Technical details:</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recovery Options */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <InformationCircleIcon className="h-6 w-6 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-medium text-blue-800">What you can do:</h3>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-blue-200">
                <div>
                  <p className="font-medium text-blue-900">Try Again</p>
                  <p className="text-blue-700 text-sm">The issue might be temporary</p>
                </div>
                <button
                  onClick={onRetry}
                  disabled={isRetrying}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isRetrying ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <ArrowPathIcon className="h-4 w-4 mr-2" />
                      Retry
                    </>
                  )}
                </button>
              </div>
              
              <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-blue-200">
                <div>
                  <p className="font-medium text-blue-900">Choose Different Time</p>
                  <p className="text-blue-700 text-sm">Go back and select another slot</p>
                </div>
                <button
                  onClick={onGoBack}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start">
          <PhoneIcon className="h-6 w-6 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-medium text-green-800">Need Help?</h3>
            <p className="text-green-700 mt-2">
              If the issue persists, you can book directly with {locationName || 'the shop'}:
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center">
                <PhoneIcon className="h-4 w-4 text-green-600 mr-2" />
                <span className="text-green-700">Call us to book over the phone</span>
              </div>
              <div className="flex items-center">
                <EnvelopeIcon className="h-4 w-4 text-green-600 mr-2" />
                <span className="text-green-700">We can also contact you at {customerEmail || 'your email'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Information */}
      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={() => setShowDebugInfo(!showDebugInfo)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {showDebugInfo ? 'Hide' : 'Show'} Debug Information
        </button>
        
        {showDebugInfo && (
          <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-600 font-mono">
              Timestamp: {new Date().toISOString()}<br />
              Customer: {customerEmail || 'not provided'}<br />
              Location: {locationName || 'not provided'}<br />
              User Agent: {typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A'}<br />
              Error: {error || 'No specific error message'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}