import { useEffect, useCallback } from 'react'
import { fireConversionEvent } from './useCustomerPixels'

/**
 * Booking data for conversion tracking
 */
interface BookingConversionData {
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

/**
 * Hook for tracking booking conversion events throughout the customer journey
 */
export function useBookingConversion() {
  
  /**
   * Track when a customer views a service (top of funnel)
   */
  const trackServiceView = useCallback((serviceData: {
    service_id: string | number
    service_name: string
    price: number
    currency?: string
  }) => {
    fireConversionEvent('service_viewed', serviceData.price, serviceData.currency, {
      id: `service_${serviceData.service_id}`,
      service_id: serviceData.service_id,
      service_name: serviceData.service_name,
      total_price: serviceData.price,
      currency: serviceData.currency
    })
  }, [])

  /**
   * Track when a customer initiates the booking process
   */
  const trackBookingInitiated = useCallback((bookingData: BookingConversionData) => {
    fireConversionEvent('booking_initiated', bookingData.total_price, bookingData.currency, bookingData)
  }, [])

  /**
   * Track when payment information is added
   */
  const trackPaymentInfo = useCallback((bookingData: BookingConversionData) => {
    fireConversionEvent('payment_info_added', bookingData.total_price, bookingData.currency, bookingData)
  }, [])

  /**
   * Track when an appointment is successfully scheduled (PRIMARY CONVERSION)
   */
  const trackAppointmentScheduled = useCallback((bookingData: BookingConversionData) => {
    // This is the main conversion event that barbershops want to track
    fireConversionEvent('appointment_scheduled', bookingData.total_price, bookingData.currency, bookingData)
    
    // Also fire booking_completed for backward compatibility
    fireConversionEvent('booking_completed', bookingData.total_price, bookingData.currency, bookingData)
    
    console.log('🎯 PRIMARY CONVERSION: Appointment Scheduled', {
      appointment_id: bookingData.id,
      service: bookingData.service_name,
      value: bookingData.total_price,
      barber: bookingData.barber_name
    })
  }, [])

  /**
   * Track when payment is completed
   */
  const trackPaymentCompleted = useCallback((bookingData: BookingConversionData) => {
    fireConversionEvent('payment_completed', bookingData.total_price, bookingData.currency, bookingData)
  }, [])

  /**
   * Track when an appointment is completed (end of customer journey)
   */
  const trackAppointmentCompleted = useCallback((bookingData: BookingConversionData) => {
    fireConversionEvent('appointment_completed', bookingData.total_price, bookingData.currency, bookingData)
  }, [])

  /**
   * Automatically track booking status changes
   */
  const trackBookingStatusChange = useCallback((
    bookingData: BookingConversionData,
    previousStatus?: string
  ) => {
    switch (bookingData.status) {
      case 'initiated':
        trackBookingInitiated(bookingData)
        break
      case 'confirmed':
        // This is the key conversion event
        trackAppointmentScheduled(bookingData)
        break
      case 'completed':
        trackAppointmentCompleted(bookingData)
        break
      default:
        break
    }

    // Track payment status changes
    if (bookingData.payment_status === 'completed') {
      trackPaymentCompleted(bookingData)
    }
  }, [trackBookingInitiated, trackAppointmentScheduled, trackAppointmentCompleted, trackPaymentCompleted])

  return {
    trackServiceView,
    trackBookingInitiated,
    trackPaymentInfo,
    trackAppointmentScheduled,
    trackPaymentCompleted,
    trackAppointmentCompleted,
    trackBookingStatusChange
  }
}

/**
 * Higher-order component wrapper for automatic conversion tracking
 */
export function withBookingConversion<T extends object>(
  Component: any
) {
  return function BookingConversionWrapper(props: T & { bookingData?: BookingConversionData }) {
    const { trackBookingStatusChange } = useBookingConversion()

    useEffect(() => {
      if (props.bookingData) {
        trackBookingStatusChange(props.bookingData)
      }
    }, [props.bookingData, trackBookingStatusChange])

    // Return the component - this will be handled by the bundler
    return Component(props)
  }
}