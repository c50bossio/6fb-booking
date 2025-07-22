'use client'

import { useEffect } from 'react'
import { useCustomerPixels } from '@/hooks/useCustomerPixels'
import { useBookingConversion } from '@/hooks/useBookingConversion'

interface BookingData {
  id: string | number
  service_id?: string | number
  service_name?: string
  barber_id?: string | number
  barber_name?: string
  total_price: number
  currency?: string
  appointment_date?: string
  duration_minutes?: number
  location_id?: string | number
  status: 'initiated' | 'confirmed' | 'completed' | 'cancelled'
  payment_status?: 'pending' | 'completed' | 'failed'
}

interface CustomerPixelTrackerProps {
  organizationSlug: string
  bookingData?: BookingData
  eventType?: 'service_view' | 'booking_initiated' | 'appointment_scheduled' | 'payment_completed' | 'appointment_completed'
  autoTrack?: boolean
}

/**
 * CustomerPixelTracker component for barbershop booking pages
 * 
 * This component automatically:
 * 1. Loads the barbershop's OWN tracking pixels (Meta, GTM, GA4, Google Ads)
 * 2. Fires conversion events to ONLY that barbershop's pixels
 * 3. Ensures each barbershop only receives their own conversion data
 * 
 * Usage:
 * <CustomerPixelTracker 
 *   organizationSlug="barbershop-name"
 *   bookingData={bookingDetails}
 *   eventType="appointment_scheduled"
 *   autoTrack={true}
 * />
 */
export default function CustomerPixelTracker({
  organizationSlug,
  bookingData,
  eventType,
  autoTrack = true
}: CustomerPixelTrackerProps) {
  const { pixelsLoaded, error } = useCustomerPixels(organizationSlug)
  const {
    trackServiceView,
    trackBookingInitiated,
    trackAppointmentScheduled,
    trackPaymentCompleted,
    trackAppointmentCompleted
  } = useBookingConversion()

  // Auto-track based on booking status changes
  useEffect(() => {
    if (!pixelsLoaded || !bookingData || !autoTrack) return

    // Automatic tracking based on booking status
    if (bookingData.status === 'confirmed') {
      trackAppointmentScheduled(bookingData)
    } else if (bookingData.status === 'completed') {
      trackAppointmentCompleted(bookingData)
    } else if (bookingData.status === 'initiated') {
      trackBookingInitiated(bookingData)
    }

    // Track payment completion
    if (bookingData.payment_status === 'completed') {
      trackPaymentCompleted(bookingData)
    }
  }, [
    pixelsLoaded,
    bookingData,
    autoTrack,
    trackAppointmentScheduled,
    trackAppointmentCompleted,
    trackBookingInitiated,
    trackPaymentCompleted
  ])

  // Manual event tracking based on eventType prop
  useEffect(() => {
    if (!pixelsLoaded || !bookingData || !eventType || autoTrack) return

    switch (eventType) {
      case 'service_view':
        if (bookingData.service_id && bookingData.service_name) {
          trackServiceView({
            service_id: bookingData.service_id,
            service_name: bookingData.service_name,
            price: bookingData.total_price,
            currency: bookingData.currency
          })
        }
        break
      case 'booking_initiated':
        trackBookingInitiated(bookingData)
        break
      case 'appointment_scheduled':
        trackAppointmentScheduled(bookingData)
        break
      case 'payment_completed':
        trackPaymentCompleted(bookingData)
        break
      case 'appointment_completed':
        trackAppointmentCompleted(bookingData)
        break
    }
  }, [
    pixelsLoaded,
    bookingData,
    eventType,
    autoTrack,
    trackServiceView,
    trackBookingInitiated,
    trackAppointmentScheduled,
    trackPaymentCompleted,
    trackAppointmentCompleted
  ])

  // Log tracking status in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (pixelsLoaded) {
        console.log(`✅ Customer pixels loaded for: ${organizationSlug}`)
        if (bookingData) {
          console.log('📊 Booking data for conversion tracking:', bookingData)
        }
      }
      if (error) {
        console.error(`❌ Pixel loading error for ${organizationSlug}:`, error)
      }
    }
  }, [pixelsLoaded, error, organizationSlug, bookingData])

  // This component doesn't render anything visible
  return null
}

/**
 * Booking confirmation page wrapper that automatically fires conversion events
 */
interface BookingConfirmationTrackerProps {
  organizationSlug: string
  bookingData: BookingData
  children: React.ReactNode
}

export function BookingConfirmationTracker({
  organizationSlug,
  bookingData,
  children
}: BookingConfirmationTrackerProps) {
  return (
    <>
      <CustomerPixelTracker
        organizationSlug={organizationSlug}
        bookingData={{ ...bookingData, status: 'confirmed' }}
        autoTrack={true}
      />
      {children}
    </>
  )
}

/**
 * Service page wrapper for tracking service views
 */
interface ServiceViewTrackerProps {
  organizationSlug: string
  serviceData: {
    service_id: string | number
    service_name: string
    price: number
    currency?: string
  }
  children: React.ReactNode
}

export function ServiceViewTracker({
  organizationSlug,
  serviceData,
  children
}: ServiceViewTrackerProps) {
  return (
    <>
      <CustomerPixelTracker
        organizationSlug={organizationSlug}
        eventType="service_view"
        bookingData={{
          id: `service_${serviceData.service_id}`,
          service_id: serviceData.service_id,
          service_name: serviceData.service_name,
          total_price: serviceData.price,
          currency: serviceData.currency,
          status: 'initiated'
        }}
        autoTrack={false}
      />
      {children}
    </>
  )
}