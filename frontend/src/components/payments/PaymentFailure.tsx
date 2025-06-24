'use client'

import React from 'react'
import {
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PhoneIcon,
  EnvelopeIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline'
import { formatCurrency } from '@/lib/payment-utils'

interface PaymentFailureProps {
  error: {
    type: 'card_error' | 'payment_error' | 'network_error' | 'validation_error'
    code?: string
    message: string
    decline_code?: string
  }
  paymentAmount: number
  appointmentDetails?: {
    service_name: string
    date: string
    time: string
  }
  onRetryPayment?: () => void
  onContactSupport?: () => void
  onBackToBooking?: () => void
  onChangeBilling?: () => void
}

export function PaymentFailure({
  error,
  paymentAmount,
  appointmentDetails,
  onRetryPayment,
  onContactSupport,
  onBackToBooking,
  onChangeBilling
}: PaymentFailureProps) {
  const getErrorIcon = () => {
    switch (error.type) {
      case 'card_error':
        return <CreditCardIcon className="w-8 h-8 text-red-600" />
      case 'network_error':
        return <ExclamationTriangleIcon className="w-8 h-8 text-orange-600" />
      default:
        return <XCircleIcon className="w-8 h-8 text-red-600" />
    }
  }

  const getErrorTitle = () => {
    switch (error.type) {
      case 'card_error':
        return 'Card Payment Failed'
      case 'network_error':
        return 'Connection Error'
      case 'validation_error':
        return 'Payment Information Invalid'
      default:
        return 'Payment Failed'
    }
  }

  const getErrorDescription = () => {
    switch (error.type) {
      case 'card_error':
        return 'There was an issue processing your card. Please check your payment details and try again.'
      case 'network_error':
        return 'We couldn\'t connect to our payment processor. Please check your internet connection and try again.'
      case 'validation_error':
        return 'The payment information provided is invalid. Please review and correct the details.'
      default:
        return 'An unexpected error occurred while processing your payment. Please try again or contact support.'
    }
  }

  const getSuggestions = () => {
    const suggestions = []

    switch (error.code) {
      case 'card_declined':
        suggestions.push('Contact your bank to verify your card is active')
        suggestions.push('Try using a different payment method')
        break
      case 'insufficient_funds':
        suggestions.push('Check your account balance')
        suggestions.push('Try using a different card or payment method')
        break
      case 'expired_card':
        suggestions.push('Update your card expiration date')
        suggestions.push('Use a different card that hasn\'t expired')
        break
      case 'incorrect_cvc':
        suggestions.push('Double-check the security code on your card')
        suggestions.push('Make sure you\'re entering the 3-digit code from the back of your card')
        break
      case 'processing_error':
        suggestions.push('Wait a few minutes and try again')
        suggestions.push('Contact our support team if the issue persists')
        break
      default:
        suggestions.push('Double-check your payment information')
        suggestions.push('Try using a different payment method')
        suggestions.push('Contact our support team if you need assistance')
    }

    return suggestions
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Error Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          {getErrorIcon()}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {getErrorTitle()}
        </h1>
        <p className="text-lg text-gray-600">
          {getErrorDescription()}
        </p>
      </div>

      {/* Error Details */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">
          Error Details
        </h2>
        <p className="text-red-700 mb-4">
          {error.message}
        </p>
        {error.code && (
          <p className="text-sm text-red-600">
            Error Code: <span className="font-mono">{error.code}</span>
            {error.decline_code && (
              <span> | Decline Code: <span className="font-mono">{error.decline_code}</span></span>
            )}
          </p>
        )}
      </div>

      {/* Payment Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Payment Summary
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Amount:</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(paymentAmount)}
            </span>
          </div>
          {appointmentDetails && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">Service:</span>
                <span className="text-gray-900">{appointmentDetails.service_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date & Time:</span>
                <span className="text-gray-900">
                  {formatDate(appointmentDetails.date)} at {appointmentDetails.time}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Suggestions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-yellow-800 mb-3">
          What you can do:
        </h2>
        <ul className="space-y-2">
          {getSuggestions().map((suggestion, index) => (
            <li key={index} className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></div>
              <span className="text-yellow-800">{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        {onRetryPayment && (
          <button
            onClick={onRetryPayment}
            className="flex items-center justify-center px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ArrowPathIcon className="w-5 h-5 mr-2" />
            Try Again
          </button>
        )}
        {onChangeBilling && (
          <button
            onClick={onChangeBilling}
            className="flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <CreditCardIcon className="w-5 h-5 mr-2" />
            Change Payment Method
          </button>
        )}
        {onBackToBooking && (
          <button
            onClick={onBackToBooking}
            className="flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back to Booking
          </button>
        )}
      </div>

      {/* Support Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Need Help?
        </h2>
        <p className="text-gray-600 mb-4">
          If you continue to experience issues, our support team is here to help.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          {onContactSupport && (
            <button
              onClick={onContactSupport}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <EnvelopeIcon className="w-4 h-4 mr-2" />
              Contact Support
            </button>
          )}
          <a
            href="tel:+1234567890"
            className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <PhoneIcon className="w-4 h-4 mr-2" />
            Call (123) 456-7890
          </a>
        </div>
      </div>
    </div>
  )
}
