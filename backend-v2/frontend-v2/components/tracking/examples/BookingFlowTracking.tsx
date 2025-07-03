'use client'

import { useEffect } from 'react'
import { useConversionTracking, ConversionEventType } from '@/components/tracking'

// Example: Track the complete booking flow
export function BookingFlowExample() {
  const { track, trackBookingStep, trackPurchase } = useConversionTracking()

  // Example 1: Track when user views services
  const handleViewServices = (services: any[]) => {
    track(ConversionEventType.VIEW_ITEM_LIST, {
      items: services.map(service => ({
        item_id: service.id,
        item_name: service.name,
        price: service.price,
        quantity: 1,
        item_category: service.category,
      })),
      value: services.reduce((sum, s) => sum + s.price, 0),
      currency: 'USD',
    })
  }

  // Example 2: Track when user views a specific service
  const handleViewServiceDetails = (service: any) => {
    track(ConversionEventType.VIEW_ITEM, {
      items: [{
        item_id: service.id,
        item_name: service.name,
        price: service.price,
        quantity: 1,
        item_category: service.category,
        item_variant: service.duration,
      }],
      value: service.price,
      currency: 'USD',
      content_type: 'service',
      content_id: service.id,
    })
  }

  // Example 3: Track when user selects a service
  const handleSelectService = (service: any, barber: any) => {
    trackBookingStep('service_selected', {
      items: [{
        item_id: service.id,
        item_name: service.name,
        price: service.price,
        quantity: 1,
        item_category: service.category,
      }],
      value: service.price,
      currency: 'USD',
      // Custom parameters
      barber_id: barber.id,
      barber_name: barber.name,
      location_id: barber.locationId,
    })
  }

  // Example 4: Track when user starts checkout
  const handleBeginCheckout = (booking: any) => {
    trackBookingStep('checkout', {
      items: booking.services.map((s: any) => ({
        item_id: s.id,
        item_name: s.name,
        price: s.price,
        quantity: 1,
        item_category: s.category,
      })),
      value: booking.totalAmount,
      currency: 'USD',
      coupon: booking.couponCode,
      // Custom parameters
      appointment_date: booking.date,
      appointment_time: booking.time,
      booking_type: booking.type, // 'walk-in', 'appointment', 'recurring'
    })
  }

  // Example 5: Track when user adds payment info
  const handleAddPaymentInfo = (paymentMethod: string) => {
    track(ConversionEventType.ADD_PAYMENT_INFO, {
      payment_type: paymentMethod, // 'card', 'cash', 'apple_pay', etc.
      value: 1,
    })
  }

  // Example 6: Track successful booking/purchase
  const handleBookingComplete = (booking: any, payment: any) => {
    trackPurchase({
      transaction_id: booking.id,
      value: booking.totalAmount,
      currency: 'USD',
      tax: booking.tax || 0,
      shipping: 0, // No shipping for services
      coupon: booking.couponCode,
      payment_type: payment.method,
      items: booking.services.map((s: any) => ({
        item_id: s.id,
        item_name: s.name,
        price: s.price,
        quantity: 1,
        item_category: s.category,
        item_variant: s.duration,
      })),
      // Custom parameters for bookings
      user_id: booking.customerId,
      user_type: 'customer',
      barber_id: booking.barberId,
      location_id: booking.locationId,
      appointment_date: booking.date,
      appointment_time: booking.time,
      booking_source: booking.source, // 'web', 'mobile', 'phone'
    })
  }

  // Example 7: Track booking abandonment
  const handleBookingAbandoned = (stage: string, reason?: string) => {
    track(ConversionEventType.BOOKING_ABANDONED, {
      stage, // 'service_selection', 'time_selection', 'payment', etc.
      reason, // Optional: 'no_availability', 'price', 'technical_issue'
      value: 1,
    })
  }

  // Example 8: Track appointment modifications
  const handleAppointmentRescheduled = (originalBooking: any, newBooking: any) => {
    track(ConversionEventType.APPOINTMENT_RESCHEDULED, {
      transaction_id: originalBooking.id,
      value: originalBooking.totalAmount,
      currency: 'USD',
      // Custom parameters
      original_date: originalBooking.date,
      new_date: newBooking.date,
      days_before_appointment: Math.ceil(
        (new Date(originalBooking.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
    })
  }

  const handleAppointmentCanceled = (booking: any, reason?: string) => {
    track(ConversionEventType.APPOINTMENT_CANCELED, {
      transaction_id: booking.id,
      value: booking.totalAmount,
      currency: 'USD',
      reason, // 'customer_request', 'barber_unavailable', 'no_show'
      refund_amount: booking.refundAmount || 0,
      days_before_appointment: Math.ceil(
        (new Date(booking.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
    })
  }

  // Example 9: Track review submission
  const handleReviewSubmitted = (review: any, booking: any) => {
    track(ConversionEventType.REVIEW_SUBMITTED, {
      value: review.rating,
      content_id: booking.id,
      content_type: 'appointment',
      // Custom parameters
      barber_id: booking.barberId,
      service_ids: booking.services.map((s: any) => s.id).join(','),
      has_text: !!review.comment,
      days_after_appointment: Math.ceil(
        (Date.now() - new Date(booking.date).getTime()) / (1000 * 60 * 60 * 24)
      ),
    })
  }

  // Example 10: Track referral clicks
  const handleReferralClick = (referralCode: string, source: string) => {
    track(ConversionEventType.REFERRAL_CLICKED, {
      content_id: referralCode,
      content_type: 'referral',
      source, // 'email', 'sms', 'social', 'qr_code'
      value: 1,
    })
  }

  return null // This is just an example component
}

// Example: Integration with Next.js pages
export function BookingPageTracking() {
  const { trackPageView } = useConversionTracking()

  useEffect(() => {
    // Track page view with context
    trackPageView({
      page_title: 'Book Appointment - BookedBarber',
      page_path: '/book',
      page_location: window.location.href,
    })
  }, [trackPageView])

  return null
}

// Example: Track user registration
export function RegistrationTracking() {
  const { track } = useConversionTracking()

  const handleSignUp = (user: any, source: string) => {
    track(ConversionEventType.SIGN_UP, {
      method: source, // 'email', 'google', 'facebook'
      user_id: user.id,
      user_type: user.role, // 'customer', 'barber'
      value: 1,
    })
  }

  const handleBarberApplication = (application: any) => {
    track(ConversionEventType.SUBMIT_APPLICATION, {
      content_type: 'barber_application',
      user_id: application.email,
      // Custom parameters
      has_license: application.hasLicense,
      years_experience: application.yearsExperience,
      preferred_location: application.preferredLocation,
      services_offered: application.services.length,
    })
  }

  return null
}