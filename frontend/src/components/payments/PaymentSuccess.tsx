'use client'

import React from 'react'
import {
  CheckCircleIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  PrinterIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import { formatCurrency, formatPaymentDate } from '@/lib/payment-utils'

interface PaymentSuccessProps {
  paymentDetails: {
    id: number
    amount: number
    currency: string
    status: string
    created_at: string
    transaction_id: string
  }
  appointmentDetails: {
    service_name: string
    barber_name: string
    date: string
    time: string
    duration_minutes: number
  }
  customerDetails: {
    name: string
    email: string
    phone: string
  }
  onPrintReceipt?: () => void
  onDownloadReceipt?: () => void
  onBackToBooking?: () => void
}

export function PaymentSuccess({
  paymentDetails,
  appointmentDetails,
  customerDetails,
  onPrintReceipt,
  onDownloadReceipt,
  onBackToBooking
}: PaymentSuccessProps) {
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
      {/* Success Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircleIcon className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h1>
        <p className="text-lg text-gray-600">
          Your appointment has been confirmed and payment processed.
        </p>
      </div>

      {/* Payment Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Payment Summary
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Transaction ID:</span>
            <span className="font-mono text-sm text-gray-900">
              {paymentDetails.transaction_id}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Amount Paid:</span>
            <span className="font-semibold text-gray-900">
              {formatCurrency(paymentDetails.amount, paymentDetails.currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Payment Date:</span>
            <span className="text-gray-900">
              {formatPaymentDate(paymentDetails.created_at)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {paymentDetails.status}
            </span>
          </div>
        </div>
      </div>

      {/* Appointment Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Appointment Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <CalendarDaysIcon className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Date</p>
                <p className="font-medium text-gray-900">
                  {formatDate(appointmentDetails.date)}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <ClockIcon className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">Time & Duration</p>
                <p className="font-medium text-gray-900">
                  {appointmentDetails.time} ({appointmentDetails.duration_minutes} minutes)
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Service</p>
              <p className="font-medium text-gray-900">
                {appointmentDetails.service_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Barber</p>
              <p className="font-medium text-gray-900">
                {appointmentDetails.barber_name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Customer Information
        </h2>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <UserIcon className="w-5 h-5 text-gray-600" />
            <span className="text-gray-900">{customerDetails.name}</span>
          </div>
          <div className="flex items-center space-x-3">
            <EnvelopeIcon className="w-5 h-5 text-gray-600" />
            <span className="text-gray-900">{customerDetails.email}</span>
          </div>
          <div className="flex items-center space-x-3">
            <PhoneIcon className="w-5 h-5 text-gray-600" />
            <span className="text-gray-900">{customerDetails.phone}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        {onPrintReceipt && (
          <button
            onClick={onPrintReceipt}
            className="flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <PrinterIcon className="w-5 h-5 mr-2" />
            Print Receipt
          </button>
        )}
        {onDownloadReceipt && (
          <button
            onClick={onDownloadReceipt}
            className="flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
            Download Receipt
          </button>
        )}
        {onBackToBooking && (
          <button
            onClick={onBackToBooking}
            className="flex items-center justify-center px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Back to Booking
          </button>
        )}
      </div>

      {/* Confirmation Message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">
          <strong>Confirmation sent!</strong> A confirmation email has been sent to {customerDetails.email} with your appointment details and receipt.
        </p>
      </div>
    </div>
  )
}
