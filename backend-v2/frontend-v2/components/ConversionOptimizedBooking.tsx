'use client'

import React from 'react'

interface ConversionOptimizedBookingProps {
  organizationSlug: string
  barberName?: string
  shopName?: string
  logoUrl?: string
  primaryColor?: string
  accentColor?: string
}

function ConversionOptimizedBookingContent(props: ConversionOptimizedBookingProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">
          Book an Appointment
        </h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600">
            Booking system is currently being updated. Please check back soon.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ConversionOptimizedBooking(props: ConversionOptimizedBookingProps) {
  return <ConversionOptimizedBookingContent {...props} />
}