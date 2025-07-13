'use client'

import { useState, useEffect } from 'react'
import { Clock, Star, Shield, CheckCircle, ChevronLeft, ChevronRight, Loader2, AlertCircle, CreditCard, Lock } from 'lucide-react'
import { useEnhancedConversionTracking } from '@/hooks/useEnhancedConversionTracking'
import { useCustomerPixels } from '@/hooks/useCustomerPixels'
import { appointmentsApi, TimeSlot as ApiTimeSlot } from '@/lib/api/appointments'
import { calendarApi, CalendarTimeSlot } from '@/lib/api/calendar'
import { servicesApi } from '@/lib/api/services'
import type { Service as ApiService } from '@/lib/api/services'
import { paymentsApi } from '@/lib/api/payments'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

interface ConversionOptimizedBookingProps {
  organizationSlug: string
  barberName?: string
  shopName?: string
  logoUrl?: string
  primaryColor?: string
  accentColor?: string
}

interface Service {
  id: string
  name: string
  duration: number
  price: number
  description: string
}

interface TimeSlot {
  time: string
  available: boolean
  barber_id?: number
  barber_name?: string
  duration_minutes?: number
  calendar_synced?: boolean
  calendar_conflicts?: Array<{
    provider: string
    title?: string
    start: string
    end: string
    event_id?: string
    error?: string
  }>
}

// Services will be loaded dynamically from API

// Time slots will be loaded dynamically from calendar API

// Payment form component using Stripe Elements
interface PaymentFormProps {
  clientSecret?: string
  amount: number
  onSuccess: () => void
  onError: (error: string) => void
  processing: boolean
  setProcessing: (processing: boolean) => void
}

function PaymentFormContent({ clientSecret, amount, onSuccess, onError, processing, setProcessing }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      onError('Payment system is not ready. Please try again.')
      return
    }

    if (!clientSecret) {
      onError('Payment intent not ready. Please try again.')
      return
    }

    setProcessing(true)

    try {
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error('Card element not found')
      }

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      })

      if (result.error) {
        throw new Error(result.error.message)
      }

      onSuccess()
    } catch (error: any) {
      console.error('Payment error:', error)
      onError(error.message || 'Payment failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <CreditCard className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Payment Information</h3>
          <Lock className="w-4 h-4 text-green-500" />
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Your payment is secured with 256-bit SSL encryption
          </p>
          <p className="text-lg font-semibold text-gray-900">
            Total: ${amount.toFixed(2)}
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Details
          </label>
          <div className="border border-gray-300 rounded-lg p-3 bg-white">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    fontFamily: 'system-ui, sans-serif',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
                hidePostalCode: false,
              }}
            />
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-4">
          <p>By completing your purchase, you agree to our terms of service.</p>
          <p>Your card will be charged immediately upon confirmation.</p>
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || processing || !clientSecret}
        className="w-full py-4 px-6 text-white font-semibold rounded-lg text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        style={{ backgroundColor: processing ? '#gray' : '#000000' }}
      >
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Processing Payment...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5 mr-2" />
            Complete Payment - ${amount.toFixed(2)}
          </>
        )}
      </button>
    </form>
  )
}

const TRUST_SIGNALS = [
  { icon: Star, text: '4.9/5 Rating', subtext: '200+ Reviews' },
  { icon: Shield, text: 'Licensed Professional', subtext: '10+ Years Experience' },
  { icon: CheckCircle, text: 'Satisfaction Guaranteed', subtext: 'Or Money Back' }
]

function ConversionOptimizedBookingContent({
  organizationSlug,
  barberName = 'Professional Barber',
  shopName = 'Premium Barbershop',
  logoUrl,
  primaryColor = '#000000',
  accentColor = '#FFD700'
}: ConversionOptimizedBookingProps) {
  // Enhanced conversion tracking
  const { trackEvent, trackPageView, trackBeginCheckout, trackAddPaymentInfo, trackPurchase } = useEnhancedConversionTracking(organizationSlug)
  
  // Load customer pixels for this organization
  useCustomerPixels(organizationSlug)

  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [urgencyTimer, setUrgencyTimer] = useState(15 * 60) // 15 minutes
  const [socialProofCount, setSocialProofCount] = useState(23)

  // API state management
  const [services, setServices] = useState<ApiService[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [barberId, setBarberId] = useState<number | null>(null)
  const [loading, setLoading] = useState({
    services: false,
    timeSlots: false,
    booking: false,
    payment: false,
    initializing: true
  })
  const [errors, setErrors] = useState({
    services: '',
    timeSlots: '',
    booking: '',
    payment: '',
    network: ''
  })
  const [retryCount, setRetryCount] = useState({
    services: 0,
    timeSlots: 0,
    booking: 0
  })
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [connectionQuality, setConnectionQuality] = useState<'fast' | 'slow' | 'offline'>('fast')
  const [lastSuccessfulRequest, setLastSuccessfulRequest] = useState<Date>(new Date())
  
  // Payment state
  const [paymentIntentData, setPaymentIntentData] = useState<{
    clientSecret?: string
    paymentIntentId?: string
    amount: number
    paymentId?: number
  } | null>(null)
  const [bookingId, setBookingId] = useState<number | null>(null)

  // Enhanced network monitoring and connection quality detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setConnectionQuality('fast')
      setErrors(prev => ({ ...prev, network: '' }))
      // Auto-retry failed operations when back online
      if (errors.services && retryCount.services < 3) {
        setTimeout(() => retryOperation('services'), 1000)
      }
      if (errors.timeSlots && retryCount.timeSlots < 3 && selectedDate) {
        setTimeout(() => retryOperation('timeSlots'), 1000)
      }
    }
    const handleOffline = () => {
      setIsOnline(false)
      setConnectionQuality('offline')
      setErrors(prev => ({ ...prev, network: 'No internet connection. Please check your network and try again.' }))
    }

    // Connection quality monitoring
    const monitorConnection = () => {
      if (!navigator.onLine) return
      
      const start = performance.now()
      fetch('/favicon.ico?t=' + Date.now(), { 
        method: 'HEAD',
        cache: 'no-cache'
      })
      .then(() => {
        const latency = performance.now() - start
        setLastSuccessfulRequest(new Date())
        setConnectionQuality(latency > 1000 ? 'slow' : 'fast')
      })
      .catch(() => {
        const timeSinceLastSuccess = new Date().getTime() - lastSuccessfulRequest.getTime()
        if (timeSinceLastSuccess > 10000) { // 10 seconds
          setConnectionQuality('slow')
        }
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Monitor connection quality every 30 seconds
    const connectionMonitor = setInterval(monitorConnection, 30000)
    
    // Initial connection check
    monitorConnection()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(connectionMonitor)
    }
  }, [errors.services, errors.timeSlots, retryCount.services, retryCount.timeSlots, selectedDate, lastSuccessfulRequest])

  // Track page view on component mount and initialize data
  useEffect(() => {
    trackPageView()
    initializeBookingData()
  }, [trackPageView])

  // Initialize booking data (services and barber info)
  const initializeBookingData = async () => {
    try {
      setLoading(prev => ({ ...prev, services: true, initializing: true }))
      setErrors(prev => ({ ...prev, services: '', network: '' }))

      // Check network connectivity first
      if (!isOnline) {
        throw new Error('No internet connection')
      }

      // TODO: Get barber ID from organization slug
      // For now, we'll use a default barber ID or the first available barber
      setBarberId(1) // This should be resolved from organizationSlug

      // Load services with timeout and retry logic
      const start = performance.now()
      const allServices = await servicesApi.getPublicServices()
      const loadTime = performance.now() - start
      
      // Update connection quality based on response time
      if (loadTime > 3000) {
        setConnectionQuality('slow')
      }
      
      const bookableServices = allServices.filter(service => service.is_bookable_online)
      
      if (bookableServices.length === 0) {
        throw new Error('No services available for online booking')
      }
      
      setServices(bookableServices)
      setRetryCount(prev => ({ ...prev, services: 0 }))
      setLastSuccessfulRequest(new Date())

    } catch (error) {
      console.error('Error initializing booking data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setErrors(prev => ({ ...prev, services: 'Network error. Please check your connection and try again.' }))
      } else {
        setErrors(prev => ({ ...prev, services: `Failed to load services: ${errorMessage}` }))
      }
    } finally {
      setLoading(prev => ({ ...prev, services: false, initializing: false }))
    }
  }

  // Retry function for failed operations
  const retryOperation = async (operation: 'services' | 'timeSlots' | 'booking') => {
    const currentRetryCount = retryCount[operation]
    if (currentRetryCount >= 3) {
      setErrors(prev => ({ ...prev, [operation]: 'Maximum retry attempts reached. Please refresh the page.' }))
      return
    }

    setRetryCount(prev => ({ ...prev, [operation]: currentRetryCount + 1 }))

    switch (operation) {
      case 'services':
        await initializeBookingData()
        break
      case 'timeSlots':
        if (selectedDate) await loadTimeSlots(selectedDate)
        break
      case 'booking':
        await handleBookingComplete()
        break
    }
  }

  // Urgency timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setUrgencyTimer(prev => prev > 0 ? prev - 1 : 0)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Social proof counter (simulated real-time activity)
  useEffect(() => {
    const interval = setInterval(() => {
      setSocialProofCount(prev => prev + Math.floor(Math.random() * 3))
    }, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const generateCalendarDays = () => {
    const days = []
    const today = new Date()
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      days.push({
        date: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        number: date.getDate(),
        isToday: i === 0,
        isAvailable: i < 10 // First 10 days available
      })
    }
    return days
  }

  const handleServiceSelect = (serviceId: number) => {
    setSelectedService(serviceId)
    trackEvent('service_selected', { service_id: serviceId.toString() })
    setStep(2)
  }

  const handleDateTimeSelect = (date: string, time: string) => {
    setSelectedDate(date)
    setSelectedTime(time)
    trackEvent('datetime_selected', { date, time })
    setStep(3)
  }

  const handleCustomerInfoSubmit = async () => {
    if (!selectedService || !barberId || !selectedDate || !selectedTime) {
      setErrors(prev => ({ ...prev, booking: 'Missing required booking information' }))
      return
    }

    const selectedServiceData = services.find(s => s.id === selectedService)
    if (!selectedServiceData) {
      setErrors(prev => ({ ...prev, booking: 'Selected service not found' }))
      return
    }

    try {
      setLoading(prev => ({ ...prev, booking: true }))
      setErrors(prev => ({ ...prev, booking: '' }))

      // Create guest appointment (without payment)
      const guestBooking = {
        guest_name: customerInfo.name,
        guest_email: customerInfo.email,
        guest_phone: customerInfo.phone,
        service: selectedServiceData.name,
        date: selectedDate,
        time: selectedTime,
        barber_id: barberId,
        notes: ''
      }

      const response = await appointmentsApi.createGuestAppointment(guestBooking)
      setBookingId(response.appointment.id)
      
      // Create payment intent for the booking
      const paymentIntent = await paymentsApi.createGuestPaymentIntent({
        booking_id: response.appointment.id
      })
      
      setPaymentIntentData({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.payment_intent_id,
        amount: paymentIntent.amount,
        paymentId: paymentIntent.payment_id
      })
      
      trackBeginCheckout()
      setStep(4)
      setLastSuccessfulRequest(new Date())
      setRetryCount(prev => ({ ...prev, booking: 0 }))
      
    } catch (error) {
      console.error('Error creating booking:', error)
      setErrors(prev => ({ ...prev, booking: 'Failed to create booking. Please try again.' }))
    } finally {
      setLoading(prev => ({ ...prev, booking: false }))
    }
  }

  // const handlePaymentSuccess = async () => {
  //   if (!bookingId || !paymentIntentData?.paymentIntentId) {
  //     setErrors(prev => ({ ...prev, payment: 'Missing payment information' }))
  //     return
  //   }

  //   try {
  //     setLoading(prev => ({ ...prev, payment: true }))
  //     setErrors(prev => ({ ...prev, payment: '' }))

  //     // Confirm payment on backend
  //     await paymentsApi.confirmGuestPayment({
  //       payment_intent_id: paymentIntentData.paymentIntentId,
  //       booking_id: bookingId
  //     })

  //     const selectedServiceData = services.find(s => s.id === selectedService)
      
  //     trackPurchase({
  //       transaction_id: `booking_${bookingId}`,
  //       value: paymentIntentData.amount,
  //       currency: 'USD',
  //       items: [{
  //         item_id: selectedService?.toString() || '',
  //         item_name: selectedServiceData?.name || 'Service',
  //         price: paymentIntentData.amount,
  //         quantity: 1
  //       }]
  //     })
      
  //     trackAddPaymentInfo()
  //     setStep(5)
      
  //   } catch (error) {
  //     console.error('Error confirming payment:', error)
  //     setErrors(prev => ({ ...prev, payment: 'Failed to confirm payment. Please try again.' }))
  //   } finally {
  //     setLoading(prev => ({ ...prev, payment: false }))
  //   }
  // }

  const handlePaymentSuccess = () => {
    alert('Payment successful! (placeholder)')
    setStep(5)
  }

  const handlePaymentError = (error: string) => {
    setErrors(prev => ({ ...prev, payment: error }))
  }

  const handleBookingComplete = () => {
    // Show success message
    alert(`Booking confirmed! Your confirmation code is: ${bookingId}`)
    
    // Reset form or redirect as needed
    // For now, just show the confirmation
  }

  // Load time slots when date is selected
  const loadTimeSlots = async (date: string) => {
    if (!barberId || !selectedService) return

    try {
      setLoading(prev => ({ ...prev, timeSlots: true }))
      setErrors(prev => ({ ...prev, timeSlots: '' }))

      // Get selected service duration
      const service = services.find(s => s.id === selectedService)
      const serviceDuration = service?.duration_minutes || 60

      // Use calendar-integrated barber availability API
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${API_URL}/api/calendar/barber/${barberId}/availability?date=${date}T00:00:00`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Note: This endpoint should work without auth for public booking
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load availability: ${response.status}`)
      }

      const availabilityData = await response.json()
      
      // Extract slots from the barber availability response
      const slots = availabilityData.slots || []
      
      // Convert availability slots to component format with calendar sync information
      const formattedSlots: TimeSlot[] = slots.map((slot: any) => ({
        time: slot.time,
        available: slot.available,
        barber_id: barberId,
        duration_minutes: serviceDuration,
        // Include calendar sync indicators from our enhanced availability system
        calendar_synced: slot.calendar_synced || false,
        calendar_conflicts: slot.calendar_conflicts || []
      }))

      setTimeSlots(formattedSlots)
      setLastSuccessfulRequest(new Date())
      setRetryCount(prev => ({ ...prev, timeSlots: 0 }))

    } catch (error) {
      console.error('Error loading calendar-integrated time slots:', error)
      setErrors(prev => ({ ...prev, timeSlots: 'Failed to load available times. Please try another date or try again later.' }))
      setTimeSlots([])
    } finally {
      setLoading(prev => ({ ...prev, timeSlots: false }))
    }
  }

  const selectedServiceData = selectedService ? services.find(s => s.id === selectedService) : null

  // Helper function for slot styling
  const getSlotClassName = (slot: TimeSlot) => {
    if (selectedTime === slot.time) {
      return 'w-full p-3 rounded-lg text-center transition-colors relative text-white'
    }
    if (slot.available) {
      if (slot.calendar_synced) {
        return 'w-full p-3 rounded-lg text-center transition-colors relative bg-green-50 border border-green-200 hover:bg-green-100 text-gray-900'
      }
      return 'w-full p-3 rounded-lg text-center transition-colors relative bg-gray-100 hover:bg-gray-200 text-gray-900'
    }
    if (slot.calendar_conflicts && slot.calendar_conflicts.length > 0) {
      return 'w-full p-3 rounded-lg text-center transition-colors relative bg-red-50 border border-red-200 text-red-400 cursor-not-allowed'
    }
    return 'w-full p-3 rounded-lg text-center transition-colors relative bg-gray-50 text-gray-400 cursor-not-allowed'
  }

  // Helper function for slot title
  const getSlotTitle = (slot: TimeSlot) => {
    if (slot.calendar_conflicts && slot.calendar_conflicts.length > 0) {
      const conflictTitle = slot.calendar_conflicts[0]?.title || 'Busy'
      return `Calendar conflict: ${conflictTitle}`
    }
    if (slot.calendar_synced) {
      return 'Calendar integrated - verified availability'
    }
    return undefined
  }

  // Load time slots when date changes
  useEffect(() => {
    if (selectedDate && barberId && selectedService) {
      loadTimeSlots(selectedDate)
    }
  }, [selectedDate, barberId, selectedService])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header with branding */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {logoUrl && (
                <img src={logoUrl} alt={shopName} className="w-10 h-10 rounded-full object-cover" />
              )}
              <div>
                <h1 className="text-xl font-bold" style={{ color: primaryColor }}>
                  {shopName}
                </h1>
                <p className="text-sm text-gray-600">with {barberName}</p>
              </div>
            </div>
            
            {/* Progress indicator */}
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <div
                  key={num}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= num ? 'text-white' : 'bg-gray-200 text-gray-500'
                  }`}
                  style={{
                    backgroundColor: step >= num ? primaryColor : undefined
                  }}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main booking flow */}
          <div className="lg:col-span-2">
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Service</h2>
                  <p className="text-gray-600">Select the perfect service for your needs</p>
                </div>

                {/* Network status indicator */}
                {!isOnline ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-700">You're currently offline. Please check your internet connection.</span>
                  </div>
                ) : connectionQuality === 'slow' ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    <span className="text-yellow-700">Your connection seems slow. Loading may take longer than usual.</span>
                  </div>
                ) : null}

                {errors.services && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <span className="text-red-700">{errors.services}</span>
                    </div>
                    {retryCount.services < 3 ? (
                      <button
                        onClick={() => retryOperation('services')}
                        disabled={loading.services}
                        className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {loading.services ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            Retrying...
                          </>
                        ) : (
                          `Try Again (${3 - retryCount.services} attempts left)`
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => window.location.reload()}
                        className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded transition-colors"
                      >
                        Refresh Page
                      </button>
                    )}
                  </div>
                )}

                {loading.services ? (
                  <div className="grid gap-4">
                    {/* Service loading skeletons */}
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-white rounded-lg p-6 border-2 border-gray-200 animate-pulse">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                          </div>
                          <div className="ml-4">
                            <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
                            <div className="h-4 bg-gray-200 rounded w-12"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {services.length > 0 ? (
                      services.map((service) => (
                        <div
                          key={service.id}
                          onClick={() => handleServiceSelect(service.id)}
                          className="bg-white rounded-lg p-6 border-2 border-gray-200 hover:border-blue-500 cursor-pointer transition-all duration-200 hover:shadow-lg"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                              <p className="text-gray-600 mt-1">{service.description}</p>
                              <div className="flex items-center mt-2 text-sm text-gray-500">
                                <Clock className="w-4 h-4 mr-1" />
                                {service.duration_minutes} minutes
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-gray-900">${service.base_price}</div>
                              <div className="text-sm text-gray-500">starting from</div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No services available for booking.</p>
                        <p className="text-sm mt-2">Please contact us directly to schedule an appointment.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setStep(1)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Select Date & Time</h2>
                    <p className="text-gray-600">Choose when you'd like your {selectedServiceData?.name}</p>
                  </div>
                </div>

                {/* Calendar */}
                <div className="bg-white rounded-lg p-6 border">
                  <h3 className="text-lg font-semibold mb-4">Available Dates</h3>
                  <div className="grid grid-cols-7 gap-2 mb-6">
                    {generateCalendarDays().map((day) => (
                      <button
                        key={day.date}
                        onClick={() => {
                          if (day.isAvailable && !loading.timeSlots) {
                            setSelectedDate(day.date)
                            setSelectedTime('') // Reset time selection
                            setErrors(prev => ({ ...prev, timeSlots: '' })) // Clear previous errors
                          }
                        }}
                        disabled={!day.isAvailable || loading.timeSlots}
                        className={`p-3 rounded-lg text-center transition-colors relative ${
                          selectedDate === day.date
                            ? 'text-white'
                            : day.isAvailable && !loading.timeSlots
                            ? 'hover:bg-gray-100 text-gray-900'
                            : 'text-gray-400 cursor-not-allowed'
                        }`}
                        style={{
                          backgroundColor: selectedDate === day.date ? primaryColor : undefined
                        }}
                      >
                        <div className="text-xs font-medium">{day.day}</div>
                        <div className="text-lg font-bold">{day.number}</div>
                        {day.isToday && <div className="text-xs">Today</div>}
                        {/* Loading indicator for selected date */}
                        {selectedDate === day.date && loading.timeSlots && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-lg">
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {selectedDate && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Available Times</h3>
                      
                      {errors.timeSlots && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            <span className="text-red-700">{errors.timeSlots}</span>
                          </div>
                          {retryCount.timeSlots < 3 ? (
                            <button
                              onClick={() => retryOperation('timeSlots')}
                              disabled={loading.timeSlots}
                              className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                              {loading.timeSlots ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                  Retrying...
                                </>
                              ) : (
                                `Try Again (${3 - retryCount.timeSlots} attempts left)`
                              )}
                            </button>
                          ) : (
                            <div className="space-y-2">
                              <button
                                onClick={() => {
                                  setSelectedDate('')
                                  setErrors(prev => ({ ...prev, timeSlots: '' }))
                                  setRetryCount(prev => ({ ...prev, timeSlots: 0 }))
                                }}
                                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded transition-colors"
                              >
                                Select Different Date
                              </button>
                              <button
                                onClick={() => window.location.reload()}
                                className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded transition-colors"
                              >
                                Refresh Page
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {loading.timeSlots ? (
                        <div>
                          <div className="flex items-center justify-center py-4 mb-4">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                            <span className="ml-2 text-gray-600">Checking calendar availability...</span>
                          </div>
                          {/* Time slot loading skeletons */}
                          <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                              <div key={i} className="bg-gray-200 rounded-lg p-3 animate-pulse">
                                <div className="h-4 bg-gray-300 rounded w-full"></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : timeSlots.length > 0 ? (
                        <div className="grid grid-cols-4 gap-2">
                          {timeSlots.map((slot) => (
                            <div key={slot.time} className="relative">
                              <button
                                onClick={() => slot.available && handleDateTimeSelect(selectedDate, slot.time)}
                                disabled={!slot.available}
                                className={getSlotClassName(slot)}
                                style={{
                                  backgroundColor: selectedTime === slot.time ? primaryColor : undefined
                                }}
                                title={getSlotTitle(slot)}
                              >
                                {slot.time}
                                
                                {/* Calendar sync indicator */}
                                {slot.calendar_synced && slot.available && (
                                  <span 
                                    className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full"
                                    aria-hidden="true"
                                  />
                                )}
                                
                                {/* Calendar conflict indicator */}
                                {slot.calendar_conflicts && slot.calendar_conflicts.length > 0 && (
                                  <span 
                                    className="absolute top-0 left-0 w-2 h-2 bg-red-400 rounded-full"
                                    aria-hidden="true"
                                  />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                        
                        {/* Calendar integration legend */}
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Calendar Integration</h4>
                          <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                              <span>Calendar verified</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                              <span>Calendar conflict</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                              <span>Standard availability</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          No available times for this date. Please select another date.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setStep(2)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Your Information</h2>
                    <p className="text-gray-600">We'll need some details to confirm your booking</p>
                  </div>
                </div>

                {errors.booking && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <span className="text-red-700">{errors.booking}</span>
                    </div>
                    {retryCount.booking < 3 && (
                      <button
                        onClick={() => retryOperation('booking')}
                        disabled={loading.booking}
                        className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {loading.booking ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            Retrying...
                          </>
                        ) : (
                          `Try Again (${3 - retryCount.booking} attempts left)`
                        )}
                      </button>
                    )}
                  </div>
                )}

                <div className="bg-white rounded-lg p-6 border">
                  <form onSubmit={async (e) => { e.preventDefault(); await handleCustomerInfoSubmit(); }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your email"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your phone number"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading.booking}
                      className="w-full py-3 px-6 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {loading.booking ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Creating Booking...
                        </>
                      ) : (
                        'Continue to Payment'
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setStep(3)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Payment Method</h2>
                    <p className="text-gray-600">Secure payment to confirm your booking</p>
                  </div>
                </div>

                {errors.payment && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <span className="text-red-700">{errors.payment}</span>
                    </div>
                    <div className="text-sm text-red-600 mt-2">
                      If this issue persists, please try refreshing the page or contact support.
                    </div>
                  </div>
                )}

                {paymentIntentData ? (
                  <PaymentFormContent
                    clientSecret={paymentIntentData.clientSecret}
                    amount={paymentIntentData.amount}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    processing={loading.payment}
                    setProcessing={(processing) => setLoading(prev => ({ ...prev, payment: processing }))}
                  />
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="ml-2 text-gray-600">Preparing payment...</span>
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
                  <p className="text-gray-600">Your appointment has been successfully booked and paid for.</p>
                </div>

                <div className="bg-white rounded-lg p-6 border border-green-200">
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900 mb-2">
                        Confirmation #: {bookingId}
                      </div>
                      <div className="text-sm text-gray-600">
                        A confirmation email has been sent to {customerInfo.email}
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="text-lg font-semibold mb-3">Booking Details</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Service:</span>
                          <span className="font-medium">{selectedServiceData?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Duration:</span>
                          <span className="font-medium">{selectedServiceData?.duration_minutes} minutes</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Date:</span>
                          <span className="font-medium">{selectedDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Time:</span>
                          <span className="font-medium">{selectedTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Barber:</span>
                          <span className="font-medium">{barberName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Client:</span>
                          <span className="font-medium">{customerInfo.name}</span>
                        </div>
                        <div className="border-t pt-2 mt-2">
                          <div className="flex justify-between text-lg font-bold text-green-600">
                            <span>Amount Paid:</span>
                            <span>${paymentIntentData?.amount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">What's Next?</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• You'll receive a reminder 24 hours before your appointment</li>
                        <li>• If you need to reschedule, please call us at least 24 hours in advance</li>
                        <li>• Arrive 10 minutes early for your appointment</li>
                      </ul>
                    </div>

                    <button
                      onClick={() => window.location.reload()}
                      className="w-full py-3 px-6 text-white font-semibold rounded-lg transition-colors"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Book Another Appointment
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar with trust signals and urgency */}
          <div className="space-y-6">
            {/* Urgency Timer */}
            {urgencyTimer > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-red-800 font-semibold mb-1">Limited Time Offer</div>
                  <div className="text-2xl font-bold text-red-600 mb-1">
                    {formatTime(urgencyTimer)}
                  </div>
                  <div className="text-sm text-red-700">
                    Book now and save 10% on your first visit!
                  </div>
                </div>
              </div>
            )}

            {/* Trust Signals */}
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-lg font-semibold mb-4">Why Choose Us?</h3>
              <div className="space-y-4">
                {TRUST_SIGNALS.map((signal, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <signal.icon className="w-5 h-5 text-green-500 mt-1" />
                    <div>
                      <div className="font-medium text-gray-900">{signal.text}</div>
                      <div className="text-sm text-gray-600">{signal.subtext}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Social Proof */}
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-green-600">{socialProofCount}</span> people booked this week
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-blue-600">5</span> appointments booked today
                </div>
                <div className="text-sm text-gray-600">
                  Last booking: <span className="font-medium">12 minutes ago</span>
                </div>
              </div>
            </div>

            {/* Reviews Preview */}
            <div className="bg-white rounded-lg p-6 border">
              <h3 className="text-lg font-semibold mb-4">Recent Reviews</h3>
              <div className="space-y-3">
                <div className="border-b border-gray-100 pb-3">
                  <div className="flex items-center mb-1">
                    <div className="flex text-yellow-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">"Best haircut I've ever had! Professional and friendly."</p>
                  <p className="text-xs text-gray-500 mt-1">- Mike T.</p>
                </div>
                <div>
                  <div className="flex items-center mb-1">
                    <div className="flex text-yellow-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">"Amazing attention to detail. Highly recommend!"</p>
                  <p className="text-xs text-gray-500 mt-1">- Sarah L.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ConversionOptimizedBooking(props: ConversionOptimizedBookingProps) {
  return (
    <Elements stripe={stripePromise}>
      <ConversionOptimizedBookingContent {...props} />
    </Elements>
  )
}