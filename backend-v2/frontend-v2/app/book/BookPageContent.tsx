'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { OptimizedBookingFlow } from '@/components/booking/OptimizedBookingFlow'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useCustomerPixels, fireConversionEvent } from '@/hooks/useCustomerPixels'
import { createGuestBooking, type GuestBookingResponse } from '@/lib/api'
import { toastError, toastSuccess } from '@/hooks/use-toast'

// Service type compatible with OptimizedBookingFlow
interface Service {
  id: string
  name: string
  duration: number
  price: number
  description?: string
}

const SERVICES: Service[] = [
  { 
    id: 'haircut', 
    name: 'Haircut', 
    duration: 30, 
    price: 30,
    description: 'Professional hair cutting and styling'
  },
  { 
    id: 'shave', 
    name: 'Shave', 
    duration: 20, 
    price: 20,
    description: 'Traditional hot towel shave'
  },
  { 
    id: 'haircut-shave', 
    name: 'Haircut & Shave', 
    duration: 45, 
    price: 45,
    description: 'Complete grooming package'
  }
]

export default function BookPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Get organization slug from URL parameter
  const organizationSlug = searchParams.get('org') || searchParams.get('shop') || undefined
  
  // Load customer tracking pixels
  const { pixelsLoaded, error: pixelError } = useCustomerPixels(organizationSlug)

  // Handle booking completion
  const handleBookingComplete = async (bookingData: any) => {
    setIsSubmitting(true)
    
    try {
      // Prepare booking data for API
      const guestBooking = {
        service_id: bookingData.service.id,
        date: bookingData.dateTime.split('T')[0],
        time: bookingData.dateTime.split('T')[1],
        first_name: bookingData.customer.name.split(' ')[0],
        last_name: bookingData.customer.name.split(' ').slice(1).join(' ') || '',
        email: bookingData.customer.email,
        phone: bookingData.customer.phone || '',
        organization_slug: organizationSlug
      }

      // Create the booking
      const response = await createGuestBooking(guestBooking)
      
      // Fire conversion tracking
      if (pixelsLoaded) {
        fireConversionEvent({
          service: bookingData.service.name,
          value: bookingData.service.price,
          currency: 'USD'
        })
      }
      
      toastSuccess('Booking confirmed! You will receive a confirmation email shortly.')
      
      // Redirect to confirmation page or dashboard
      router.push(`/booking-confirmed?id=${response.id}`)
      
    } catch (error: any) {
      console.error('Booking failed:', error)
      toastError(error.message || 'Failed to create booking. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Book Your Appointment
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Choose your service and schedule your visit with our expert barbers
            </p>
          </div>

          {/* Optimized Booking Flow */}
          <OptimizedBookingFlow
            services={SERVICES}
            onComplete={handleBookingComplete}
            className="max-w-4xl mx-auto"
          />

          {/* Cache Performance Indicator - Development Only */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </p>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}