'use client'

import React from 'react'
import {
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  CreditCardIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { formatCurrency, formatPaymentDate } from '@/lib/payment-utils'

interface ReceiptProps {
  receiptData: {
    receiptNumber: string
    paymentId: number
    transactionId: string
    amount: number
    currency: string
    paymentDate: string
    paymentMethod: {
      type: 'card' | 'apple_pay' | 'google_pay'
      last4?: string
      brand?: string
    }
    status: string
  }
  appointmentData: {
    appointmentId: number
    serviceName: string
    serviceDescription?: string
    barberName: string
    date: string
    time: string
    duration: number
    location: {
      name: string
      address: string
      phone: string
    }
  }
  customerData: {
    name: string
    email: string
    phone: string
  }
  businessData: {
    name: string
    address: string
    phone: string
    email: string
    website?: string
    taxId?: string
  }
  printable?: boolean
}

export function Receipt({
  receiptData,
  appointmentData,
  customerData,
  businessData,
  printable = false
}: ReceiptProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getPaymentMethodDisplay = () => {
    const { type, brand, last4 } = receiptData.paymentMethod

    switch (type) {
      case 'apple_pay':
        return 'Apple Pay'
      case 'google_pay':
        return 'Google Pay'
      case 'card':
        return `${brand?.toUpperCase() || 'Card'} •••• ${last4 || '****'}`
      default:
        return 'Payment Method'
    }
  }

  const containerClasses = printable
    ? 'max-w-2xl mx-auto bg-white print:shadow-none print:max-w-none'
    : 'max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg shadow-lg'

  const headerClasses = printable
    ? 'text-center border-b border-gray-200 pb-6 mb-6'
    : 'text-center border-b border-gray-200 p-6'

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className={headerClasses}>
        <div className="flex items-center justify-center mb-4">
          <BuildingStorefrontIcon className="w-8 h-8 text-slate-700 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">{businessData.name}</h1>
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          <p>{businessData.address}</p>
          <p>Phone: {businessData.phone} | Email: {businessData.email}</p>
          {businessData.website && <p>Website: {businessData.website}</p>}
        </div>
        {businessData.taxId && (
          <p className="text-xs text-gray-500 mt-2">Tax ID: {businessData.taxId}</p>
        )}
      </div>

      {/* Receipt Info */}
      <div className={printable ? 'px-6 py-4' : 'p-6'}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <DocumentTextIcon className="w-5 h-5 mr-2" />
              Payment Receipt
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Receipt #{receiptData.receiptNumber}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Date</p>
            <p className="font-medium text-gray-900">
              {formatPaymentDate(receiptData.paymentDate)}
            </p>
          </div>
        </div>

        {/* Customer Information */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
            <UserIcon className="w-5 h-5 mr-2" />
            Customer Information
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium text-gray-900">{customerData.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-gray-900">{customerData.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium text-gray-900">{customerData.phone}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Appointment Details */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
            <CalendarDaysIcon className="w-5 h-5 mr-2" />
            Appointment Details
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Service</p>
                <p className="font-medium text-gray-900">{appointmentData.serviceName}</p>
                {appointmentData.serviceDescription && (
                  <p className="text-sm text-gray-600 mt-1">
                    {appointmentData.serviceDescription}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600">Barber</p>
                <p className="font-medium text-gray-900">{appointmentData.barberName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date</p>
                <p className="font-medium text-gray-900">
                  {formatDate(appointmentData.date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Time & Duration</p>
                <p className="font-medium text-gray-900">
                  {appointmentData.time} ({appointmentData.duration} minutes)
                </p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-medium text-gray-900">{appointmentData.location.name}</p>
                <p className="text-sm text-gray-600">{appointmentData.location.address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
            <CreditCardIcon className="w-5 h-5 mr-2" />
            Payment Details
          </h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction ID</span>
                <span className="font-mono text-sm text-gray-900">
                  {receiptData.transactionId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method</span>
                <span className="text-gray-900">{getPaymentMethodDisplay()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Status</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {receiptData.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Amount Summary */}
        <div className="border-t border-gray-200 pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-lg">
              <span className="text-gray-600">Service Amount</span>
              <span className="text-gray-900">
                {formatCurrency(receiptData.amount, receiptData.currency)}
              </span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t border-gray-200 pt-2">
              <span className="text-gray-900">Total Paid</span>
              <span className="text-gray-900">
                {formatCurrency(receiptData.amount, receiptData.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Thank you for choosing {businessData.name}!
          </p>
          <p className="text-xs text-gray-500">
            This is an electronic receipt. No signature required.
          </p>
          {!printable && (
            <p className="text-xs text-gray-500 mt-2">
              Questions about this receipt? Contact us at {businessData.email} or {businessData.phone}
            </p>
          )}
        </div>
      </div>

      {/* Print-specific styles */}
      {printable && (
        <style jsx>{`
          @media print {
            .print\\:shadow-none {
              box-shadow: none !important;
            }
            .print\\:max-w-none {
              max-width: none !important;
            }
          }
        `}</style>
      )}
    </div>
  )
}
