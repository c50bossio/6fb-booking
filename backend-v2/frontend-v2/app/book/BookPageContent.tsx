'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar } from '@/components/ui/calendar'
import UnifiedCalendar from '@/components/UnifiedCalendar'
import TimeSlots from '@/components/TimeSlots'
import PaymentForm from '@/components/PaymentForm'
import TimezoneTooltip from '@/components/TimezoneTooltip'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingButton, TimeSlotsLoadingSkeleton, ErrorDisplay } from '@/components/LoadingStates'
import { appointmentsAPI, getMyBookings, getProfile, getNextAvailableSlot, quickBooking as quickBookingAPI, type SlotsResponse, type TimeSlot, type NextAvailableSlot, createGuestBooking, createGuestQuickBooking, type GuestInformation, type GuestBookingCreate, type GuestQuickBookingCreate, type GuestBookingResponse, type AppointmentCreate } from '@/lib/api'
import { toastError, toastSuccess } from '@/hooks/use-toast'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { 
  formatDateForAPI, 
  parseAPIDate, 
  formatTimeWithTimezone, 
  getTimezoneDisplayName,
  getFriendlyDateLabel,
  isToday as checkIsToday,
  isTomorrow as checkIsTomorrow
} from '@/lib/timezone'
import { useCustomerPixels, fireConversionEvent } from '@/hooks/useCustomerPixels'
import { useTimeSlotsCache } from '@/hooks/useTimeSlotsCache'
import CachePerformanceIndicator from '@/components/CachePerformanceIndicator'
import { keyboardHelpers, screenReaderHelpers, useScreenReader, generateId } from '@/lib/accessibility'
import ProgressiveGuestForm, { GuestInfo } from '@/components/booking/ProgressiveGuestForm'


const SERVICES = [
  { id: 'Haircut', name: 'Haircut', duration: '30 min', price: '$30', amount: 30 },
  { id: 'Shave', name: 'Shave', duration: '20 min', price: '$20', amount: 20 },
  { id: 'Haircut & Shave', name: 'Haircut & Shave', duration: '45 min', price: '$45', amount: 45 }
]

// Six Figure Barber service mapping for pricing
const SERVICE_NAMES_FOR_PRICING = {
  'Haircut': 'haircut',
  'Shave': 'straight razor shave', 
  'Haircut & Shave': 'haircut & shave'
}

export default function BookPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  // Use cached time slots for better performance
  const {
    timeSlots,
    nextAvailable,
    loading: loadingSlots,
    refreshing,
    error: slotsError,
    loadTimeSlots,
    loadNextAvailable,
    invalidateCache,
    cacheMetrics,
    isDataStale
  } = useTimeSlotsCache({
    service: selectedService || undefined,
    barberId: selectedBarberId || undefined, // Pass barber context to cache
    preloadNearbyDates: true,
    backgroundRefresh: true,
    onCacheUpdate: () => {
      // Optional: show a subtle indicator that data was refreshed
      if (refreshing) {
        console.log('📡 Cache refreshed in background - barber availability updated')
      }
    }
  })
  const [quickBooking, setQuickBooking] = useState(false)
  const [bookingDates, setBookingDates] = useState<Date[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<number | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [guestInfo, setGuestInfo] = useState<GuestInformation>({ first_name: '', last_name: '', email: '', phone: '' })
  const [progressiveGuestInfo, setProgressiveGuestInfo] = useState<GuestInfo>({ name: '', email: '', phone: '' })
  const [guestBookingResponse, setGuestBookingResponse] = useState<GuestBookingResponse | null>(null)
  const [useCalendarView, setUseCalendarView] = useState(false)
  
  // Six Figure Barber pricing state
  const [dynamicPricing, setDynamicPricing] = useState<{[serviceId: string]: any}>({})
  const [loadingPricing, setLoadingPricing] = useState(false)

  // Accessibility state for keyboard navigation
  const [focusedServiceIndex, setFocusedServiceIndex] = useState<number>(-1)
  const serviceCardRefs = useRef<(HTMLDivElement | null)[]>([])
  const { announceStatus, announceNavigation } = useScreenReader()

  // State for timezone display
  const [userTimezone, setUserTimezone] = useState<string>('')
  
  // Get user timezone on mount and parse URL parameters
  const searchParams = useSearchParams()
  
  // Get organization slug from URL parameter
  const organizationSlug = searchParams.get('org') || searchParams.get('shop') || undefined
  
  // Get barber context from URL parameters
  const selectedBarberId = searchParams.get('barber')
  const selectedBarberName = searchParams.get('barberName')
  const barberExperience = searchParams.get('experience')
  const barberSpecialties = searchParams.get('specialties')?.split(',') || []
  const barberHourlyRate = searchParams.get('hourlyRate')
  const isPremiumTier = searchParams.get('tier') === 'premium'
  const suggestedPrice = searchParams.get('suggestedPrice')
  
  // Load customer tracking pixels
  const { pixelsLoaded, error: pixelError } = useCustomerPixels(organizationSlug)
  
  // Load Six Figure Barber dynamic pricing when barber is selected
  const loadDynamicPricing = async () => {
    if (!selectedBarberId) return
    
    setLoadingPricing(true)
    try {
      const pricingPromises = SERVICES.map(async (service) => {
        const serviceName = SERVICE_NAMES_FOR_PRICING[service.id as keyof typeof SERVICE_NAMES_FOR_PRICING] || service.id.toLowerCase()
        
        const pricingResult = await appointmentsAPI.calculateServicePrice(
          serviceName,
          selectedBarberId,
          undefined, // client_id - we'll add this for logged-in users later
          selectedDate && selectedTime ? 
            new Date(`${selectedDate.toISOString().split('T')[0]}T${selectedTime}:00`).toISOString() : 
            undefined
        )
        
        return {
          serviceId: service.id,
          pricing: pricingResult
        }
      })
      
      const results = await Promise.all(pricingPromises)
      const pricingMap: {[serviceId: string]: any} = {}
      
      results.forEach(result => {
        pricingMap[result.serviceId] = result.pricing
      })
      
      setDynamicPricing(pricingMap)
      console.log('🎯 Six Figure Barber pricing loaded:', pricingMap)
    } catch (error) {
      console.warn('Failed to load dynamic pricing:', error)
      // Fallback to default pricing
    } finally {
      setLoadingPricing(false)
    }
  }
  
  useEffect(() => {
    setUserTimezone(getTimezoneDisplayName())
    
    // Parse URL parameters to pre-populate fields
    const urlService = searchParams.get('service')
    const urlDate = searchParams.get('date')
    const urlTime = searchParams.get('time')
    
    if (urlService && SERVICES.find(s => s.id === urlService)) {
      setSelectedService(urlService)
      setStep(2)
    }
    
    if (urlDate) {
      const date = new Date(urlDate)
      if (!isNaN(date.getTime())) {
        setSelectedDate(date)
      }
    }
    
    if (urlTime && /^\d{1,2}:\d{2}$/.test(urlTime)) {
      setSelectedTime(urlTime)
      if (selectedDate && selectedService) {
        setStep(3)
      }
    }
  }, [searchParams])

  // Check authentication status and optionally fetch user's existing bookings
  useEffect(() => {
    async function checkAuthAndFetchBookings() {
      try {
        // Try to check if user is authenticated
        await getProfile()
        setIsAuthenticated(true)
        
        // If authenticated, fetch existing bookings to show on calendar
        const response = await getMyBookings()
        const dates = response.bookings.map((booking: any) => {
          // Parse the datetime string properly
          const bookingDate = new Date(booking.start_time)
          return bookingDate
        })
        setBookingDates(dates)
      } catch (err) {
        console.log('User not authenticated - guest booking mode')
        setIsAuthenticated(false)
        // Don't redirect - allow guest booking
      }
    }
    checkAuthAndFetchBookings()
  }, [router])

  // Load next available slot on mount
  useEffect(() => {
    loadNextAvailable().catch(console.warn)
  }, [loadNextAvailable])

  // Load dynamic pricing when barber context or appointment details change
  useEffect(() => {
    if (selectedBarberId) {
      loadDynamicPricing()
    }
  }, [selectedBarberId, selectedDate, selectedTime])

  // Load time slots when date is selected
  useEffect(() => {
    if (selectedDate) {
      const dateStr = formatDateForAPI(selectedDate)
      loadTimeSlots(dateStr).catch(console.error)
    }
  }, [selectedDate, loadTimeSlots])

  // Initialize service card refs
  useEffect(() => {
    serviceCardRefs.current = serviceCardRefs.current.slice(0, SERVICES.length)
  }, [])

  // Keyboard navigation for service selection
  const handleServiceKeyDown = useCallback((event: React.KeyboardEvent, index: number) => {
    keyboardHelpers.handleArrowNavigation(
      event as any,
      serviceCardRefs.current.filter(Boolean) as HTMLElement[],
      index,
      (newIndex) => {
        setFocusedServiceIndex(newIndex)
        serviceCardRefs.current[newIndex]?.focus()
        
        // Announce navigation to screen readers
        const service = SERVICES[newIndex]
        announceStatus(`${service.name}, ${service.price}, ${service.duration}`)
      },
      { loop: true, horizontal: false }
    )

    keyboardHelpers.handleHomeEndNavigation(
      event as any,
      serviceCardRefs.current.filter(Boolean) as HTMLElement[],
      (newIndex) => {
        setFocusedServiceIndex(newIndex)
        serviceCardRefs.current[newIndex]?.focus()
        
        const service = SERVICES[newIndex]
        announceStatus(`${service.name}, ${service.price}, ${service.duration}`)
      }
    )
  }, [announceStatus])

  const handleServiceSelect = (service: string) => {
    setSelectedService(service)
    
    // Announce selection to screen readers
    const selectedServiceObj = SERVICES.find(s => s.id === service)
    if (selectedServiceObj) {
      announceStatus(`Selected ${selectedServiceObj.name}`)
      announceNavigation(`Moving to date and time selection`)
    }
    
    // For guest users, collect info early to reduce abandonment
    if (isAuthenticated === false) {
      setStep(1.5)
    } else {
      setStep(2)
    }
    
    // Fire event when booking flow starts
    if (pixelsLoaded) {
      fireConversionEvent('booking_flow_started', 0, 'USD')
    }
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date)
    setSelectedTime(null) // Reset time when date changes
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    setStep(3)
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
      if (step === 2) {
        setSelectedService(null)
      } else if (step === 3) {
        setSelectedTime(null)
      }
    }
  }

  const handleQuickBooking = async () => {
    if (!selectedService) return

    setQuickBooking(true)
    setError(null)

    try {
      if (isAuthenticated) {
        // Authenticated user quick booking
        const booking = await quickBookingAPI({ service: selectedService })
        setBookingId(booking.id)
        setStep(4)
        
        // Invalidate cache since a booking was made
        invalidateCache()
      } else {
        // Guest user quick booking - need guest info first
        if (!guestInfo.first_name || !guestInfo.last_name || !guestInfo.email || !guestInfo.phone) {
          setStep(3.5) // Guest info step
          return
        }
        
        const guestBooking = await createGuestQuickBooking({
          service: selectedService,
          guest_info: guestInfo
        })
        
        setGuestBookingResponse(guestBooking)
        setBookingId(guestBooking.id)
        setStep(4)
        
        // Invalidate cache since a booking was made
        invalidateCache()
        
        // Fire conversion event for tracking pixels
        if (pixelsLoaded) {
          const service = SERVICES.find(s => s.id === selectedService)
          fireConversionEvent('booking_completed', service?.amount || 0, 'USD')
        }
      }
    } catch (err: any) {
      console.error('Quick booking failed:', err)
      setError(getErrorMessage(err))
    } finally {
      setQuickBooking(false)
    }
  }

  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return

    setSubmitting(true)
    setError(null)

    try {
      const dateStr = formatDateForAPI(selectedDate)
      
      if (isAuthenticated) {
        // Authenticated user booking using standardized appointments API
        const appointmentData: AppointmentCreate = {
          date: dateStr,
          time: selectedTime,
          service: selectedService
        }
        const booking = await appointmentsAPI.create(appointmentData)
        setBookingId(booking.id)
        setStep(4)
        
        // Invalidate cache for the booked date since availability changed
        invalidateCache(dateStr)
        
        // Fire conversion event for tracking pixels
        if (pixelsLoaded) {
          const service = SERVICES.find(s => s.id === selectedService)
          fireConversionEvent('booking_completed', service?.amount || 0, 'USD')
        }
      } else {
        // Guest user booking
        if (!guestInfo.first_name || !guestInfo.last_name || !guestInfo.email || !guestInfo.phone) {
          setStep(3.5) // Guest info step
          return
        }
        
        const guestBooking = await createGuestBooking({
          date: dateStr,
          time: selectedTime,
          service: selectedService,
          guest_info: guestInfo,
          timezone: userTimezone
        })
        
        setGuestBookingResponse(guestBooking)
        setBookingId(guestBooking.id)
        setStep(4)
        
        // Invalidate cache for the booked date since availability changed
        invalidateCache(dateStr)
        
        // Fire conversion event for tracking pixels
        if (pixelsLoaded) {
          const service = SERVICES.find(s => s.id === selectedService)
          fireConversionEvent('booking_completed', service?.amount || 0, 'USD')
        }
      }
    } catch (err: any) {
      console.error('Booking failed:', err)
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const getErrorMessage = (err: any): string => {
    // Provide more user-friendly error messages
    if (err.message?.includes('past')) {
      return 'Cannot book appointments in the past. Please select a future date and time.'
    } else if (err.message?.includes('already booked') || err.message?.includes('not available')) {
      return 'This time slot is no longer available. Please refresh and select a different time.'
    } else if (err.message?.includes('Invalid service')) {
      return 'The selected service is not available. Please choose a different service.'
    } else if (err.message?.includes('lead time')) {
      return 'This time slot is too soon. Please select a time slot with more advance notice.'
    } else if (err.message?.includes('business hours')) {
      return 'This time slot is outside business hours. Please select a different time.'
    } else if (err.message?.includes('maximum advance')) {
      return 'This date is too far in advance. Please select a sooner date.'
    } else if (err.message) {
      return err.message
    }
    return 'Failed to create booking. Please try again or contact support if the problem persists.'
  }

  const handlePaymentSuccess = () => {
    if (isAuthenticated) {
      // Redirect to dashboard with success message
      router.push('/dashboard?booking=success&payment=complete')
    } else {
      // For guest users, show confirmation and option to create account
      setStep(5) // Success step for guests
    }
  }

  const handlePaymentError = (errorMsg: string) => {
    setError(errorMsg)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const formatTime = (time: string) => {
    // Use timezone-aware formatting
    return formatTimeWithTimezone(time, false)
  }

  // Convert time slots to appointment format for UnifiedCalendar
  const convertTimeSlotsToAppointments = () => {
    if (!selectedDate || !selectedService) return []
    
    // Create available slot indicators for UnifiedCalendar
    const availableSlots = timeSlots
      .filter(slot => slot.available)
      .map((slot, index) => {
        const [hours, minutes] = slot.time.split(':').map(Number)
        const startTime = new Date(selectedDate)
        startTime.setHours(hours, minutes, 0, 0)
        
        const endTime = new Date(startTime)
        endTime.setMinutes(endTime.getMinutes() + 30) // Default 30 min slots
        
        return {
          id: -1000 - index, // Negative IDs to distinguish from real appointments
          user_id: 1, // Required field for appointment interface
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          service_name: 'Available Slot',
          client_name: `Click to book ${selectedService}`,
          status: 'available',
          duration_minutes: 30,
          price: SERVICES.find(s => s.id === selectedService)?.amount || 0,
          created_at: new Date().toISOString(), // Required field
          // Custom properties
          isAvailableSlot: true,
          originalTime: slot.time,
          // Style as available
          barber_id: 1, // Dummy barber ID
          barber_name: 'Available'
        }
      })
    
    // Create booked slot indicators
    const bookedSlots = timeSlots
      .filter(slot => !slot.available)
      .map((slot, index) => {
        const [hours, minutes] = slot.time.split(':').map(Number)
        const startTime = new Date(selectedDate)
        startTime.setHours(hours, minutes, 0, 0)
        
        const endTime = new Date(startTime)
        endTime.setMinutes(endTime.getMinutes() + 30)
        
        return {
          id: -2000 - index,
          user_id: 1, // Required field
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          service_name: 'Booked',
          client_name: 'Not Available',
          status: 'confirmed',
          duration_minutes: 30,
          price: 0, // Required field
          created_at: new Date().toISOString(), // Required field
          barber_id: 1,
          barber_name: 'Booked',
          isAvailableSlot: false
        }
      })
    
    return [...availableSlots, ...bookedSlots]
  }

  // Combine errors from different sources
  const displayError = error || slotsError

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Cache Performance Indicator (development only) */}
        <CachePerformanceIndicator />
        
        {/* Performance indicator (dev only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 text-xs text-gray-500 text-center">
            Cache: {cacheMetrics.size} entries, {Math.round(cacheMetrics.hitRate * 100)}% hit rate
            {isDataStale && <span className="text-orange-500"> (stale)</span>}
            {refreshing && <span className="text-blue-500"> (refreshing...)</span>}
          </div>
        )}
        {/* Timezone indicator */}
        {userTimezone && (
          <div className="text-center mb-4">
            <TimezoneTooltip content="All appointment times are shown in your local timezone. The barber shop will expect you at this time in their local timezone.">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 cursor-help">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                All times shown in {userTimezone}
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </TimezoneTooltip>
          </div>
        )}

        {/* Barber Information Banner */}
        {selectedBarberId && selectedBarberName && (
          <div className="mb-6 max-w-2xl mx-auto">
            <Card className="border-l-4 border-l-primary-500 bg-gradient-to-r from-primary-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      Booking with {selectedBarberName}
                      {isPremiumTier && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          Premium
                        </span>
                      )}
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Availability-Aware
                      </span>
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      {barberExperience && (
                        <span className="capitalize">{barberExperience} Barber</span>
                      )}
                      {barberHourlyRate && (
                        <span>From ${barberHourlyRate}/hour</span>
                      )}
                      {barberSpecialties.length > 0 && (
                        <span className="hidden sm:inline">
                          Specializes in {barberSpecialties.slice(0, 2).join(', ')}
                          {barberSpecialties.length > 2 && ` +${barberSpecialties.length - 2} more`}
                        </span>
                      )}
                    </div>
                  </div>
                  {isPremiumTier && (
                    <div className="text-right text-sm">
                      <span className="text-gray-500">Six Figure Barber</span>
                      <div className="font-semibold text-primary-600">Premium Experience</div>
                    </div>
                  )}
                </div>
                {suggestedPrice && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Suggested service pricing:</span>
                      <span className="font-semibold text-green-600">${suggestedPrice}</span>
                    </div>
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-start gap-2 text-sm text-blue-700">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      Time slots shown are specifically available for {selectedBarberName}. 
                      Only slots when this barber is working and available will be displayed.
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className={`flex items-center ${step >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200'
                }`}>
                  1
                </div>
                <span className="ml-2 font-medium hidden sm:inline">Service</span>
              </div>
              
              <div className={`h-px w-8 md:w-16 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-300'}`} />
              
              <div className={`flex items-center ${step >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200'
                }`}>
                  2
                </div>
                <span className="ml-2 font-medium hidden sm:inline">Date & Time</span>
              </div>
              
              <div className={`h-px w-8 md:w-16 ${step >= 3 ? 'bg-primary-600' : 'bg-gray-300'}`} />
              
              <div className={`flex items-center ${step >= 3 ? 'text-primary-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-200'
                }`}>
                  3
                </div>
                <span className="ml-2 font-medium hidden sm:inline">{isAuthenticated === false ? 'Info' : 'Confirm'}</span>
              </div>
              
              {/* Show additional steps for guests */}
              {isAuthenticated === false && (
                <>
                  <div className={`h-px w-8 md:w-16 ${step >= 3.5 ? 'bg-primary-600' : 'bg-gray-300'}`} />
                  
                  <div className={`flex items-center ${step >= 3.5 ? 'text-primary-600' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step >= 3.5 ? 'bg-primary-600 text-white' : 'bg-gray-200'
                    }`}>
                      4
                    </div>
                    <span className="ml-2 font-medium hidden sm:inline">Confirm</span>
                  </div>
                </>
              )}
              
              <div className={`h-px w-8 md:w-16 ${step >= 4 ? 'bg-primary-600' : 'bg-gray-300'}`} />
              
              <div className={`flex items-center ${step >= 4 ? 'text-primary-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 4 ? 'bg-primary-600 text-white' : 'bg-gray-200'
                }`}>
                  {isAuthenticated === false ? '5' : '4'}
                </div>
                <span className="ml-2 font-medium hidden sm:inline">Payment</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Select Service */}
        {step === 1 && (
          <div>
            <h1 
              id="service-selection-heading"
              className="text-2xl font-bold text-center mb-8"
            >
              Select a Service
            </h1>
            
            {/* Next Available Quick Booking */}
            {nextAvailable && selectedService && (
              <div className="max-w-2xl mx-auto mb-8 p-4 bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-primary-800 mb-1">
                      ⚡ Next Available Slot
                    </h3>
                    <p className="text-primary-700">
                      {getFriendlyDateLabel(parseAPIDate(nextAvailable.date))} at {formatTimeWithTimezone(nextAvailable.time)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-primary-600 mb-2">Skip the wait!</p>
                    <Button
                      onClick={handleQuickBooking}
                      loading={quickBooking}
                      loadingText="Booking..."
                      variant="primary"
                      size="md"
                    >
                      Book Next Available
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <div 
              className="grid gap-4 max-w-2xl mx-auto"
              role="group"
              aria-labelledby="service-selection-heading"
              aria-describedby="service-selection-description"
            >
              <div id="service-selection-description" className="sr-only">
                Use arrow keys to navigate between services, Enter or Space to select
              </div>
              {SERVICES.map((service, index) => (
                <Card
                  key={service.id}
                  ref={(el) => { serviceCardRefs.current[index] = el; }}
                  variant="default"
                  interactive
                  selected={selectedService === service.id}
                  onClick={() => handleServiceSelect(service.id)}
                  onKeyDown={(e) => handleServiceKeyDown(e, index)}
                  ariaLabel={`${service.name}, ${service.price}, ${service.duration}. Press Enter to select.`}
                  className={`${
                    selectedService === service.id 
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                      : ''
                  }`}
                >
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 
                          className="text-lg font-semibold text-accent-800"
                          id={`service-${service.id}-name`}
                        >
                          {service.name}
                        </h3>
                        <p 
                          className="text-gray-600 text-sm mt-1"
                          id={`service-${service.id}-duration`}
                        >
                          {service.duration}
                        </p>
                      </div>
                      <div 
                        className="text-xl font-bold text-primary-600"
                        id={`service-${service.id}-price`}
                        aria-label={`Price: ${dynamicPricing[service.id]?.final_price ? `$${dynamicPricing[service.id].final_price}` : service.price}`}
                      >
                        {loadingPricing ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full"></div>
                            <span className="text-sm">Calculating...</span>
                          </div>
                        ) : dynamicPricing[service.id] ? (
                          <div className="text-right">
                            <div className="text-xl font-bold">
                              ${dynamicPricing[service.id].final_price}
                            </div>
                            {dynamicPricing[service.id].six_figure_insights?.is_premium_positioning && (
                              <div className="text-xs text-yellow-600 font-medium">
                                Premium
                              </div>
                            )}
                            {dynamicPricing[service.id].pricing_breakdown?.time_premium_reason && (
                              <div className="text-xs text-blue-600">
                                {dynamicPricing[service.id].pricing_breakdown.time_premium_reason}
                              </div>
                            )}
                          </div>
                        ) : (
                          service.price
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Six Figure Barber Pricing Insights */}
            {selectedBarberId && Object.keys(dynamicPricing).length > 0 && (
              <div className="max-w-2xl mx-auto mt-8">
                <Card className="border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-white">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          Six Figure Barber Premium Pricing
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Smart Pricing Active
                          </span>
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Prices are dynamically calculated based on barber expertise, service complexity, and optimal time slots to maximize value.
                        </p>
                        
                        {/* Show pricing factors for the first service with dynamic pricing */}
                        {(() => {
                          const firstServiceWithPricing = Object.values(dynamicPricing)[0]
                          if (!firstServiceWithPricing) return null
                          
                          return (
                            <div className="mt-3 text-xs text-gray-500 space-y-1">
                              <div className="flex justify-between">
                                <span>Barber Experience Level:</span>
                                <span className="font-medium capitalize">
                                  {firstServiceWithPricing.pricing_breakdown?.barber_experience_level || 'Mid'}
                                </span>
                              </div>
                              {firstServiceWithPricing.pricing_breakdown?.client_tier && (
                                <div className="flex justify-between">
                                  <span>Client Tier Bonus:</span>
                                  <span className="font-medium">
                                    {((firstServiceWithPricing.pricing_breakdown.client_tier_bonus - 1) * 100).toFixed(0)}%
                                  </span>
                                </div>
                              )}
                              {firstServiceWithPricing.pricing_breakdown?.time_premium > 1 && (
                                <div className="flex justify-between">
                                  <span>Premium Time Slot:</span>
                                  <span className="font-medium text-blue-600">
                                    +{((firstServiceWithPricing.pricing_breakdown.time_premium - 1) * 100).toFixed(0)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Date & Time */}
        {step === 2 && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <Button
                onClick={handleBack}
                variant="ghost"
                size="sm"
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                }
              >
                Back
              </Button>
              <h1 className="text-2xl font-bold">Select Date & Time</h1>
              <div className="w-16" /> {/* Spacer for centering */}
            </div>

            {/* View toggle */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                <button
                  onClick={() => setUseCalendarView(false)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    !useCalendarView
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Classic View
                </button>
                <button
                  onClick={() => setUseCalendarView(true)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    useCalendarView
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Calendar View
                </button>
              </div>
            </div>

            {!useCalendarView ? (
              // Classic view with separate calendar and time slots
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-lg font-semibold mb-4">Choose a Date</h2>
                  <Calendar
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                  />
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-4">
                    {selectedDate ? formatDate(selectedDate) : 'Select a date first'}
                  </h2>
                  {selectedDate && (
                    <>
                      {loadingSlots ? (
                        <TimeSlotsLoadingSkeleton />
                      ) : (
                        <TimeSlots
                          slots={timeSlots}
                          selectedTime={selectedTime}
                          onTimeSelect={handleTimeSelect}
                          loading={false}
                          showNextAvailableBadge={true}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              // New calendar day view
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {selectedDate ? formatDate(selectedDate) : 'Today'}
                  </h2>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setSelectedDate(new Date())}
                      variant="outline"
                      size="sm"
                    >
                      Today
                    </Button>
                    <Button
                      onClick={() => {
                        const tomorrow = new Date()
                        tomorrow.setDate(tomorrow.getDate() + 1)
                        setSelectedDate(tomorrow)
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Tomorrow
                    </Button>
                  </div>
                </div>
                
                {loadingSlots ? (
                  <div className="h-[600px] flex items-center justify-center bg-white rounded-lg border border-gray-200">
                    <TimeSlotsLoadingSkeleton />
                  </div>
                ) : (
                  <div className="h-[600px] bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <UnifiedCalendar
                      view="day"
                      appointments={convertTimeSlotsToAppointments()}
                      currentDate={selectedDate || new Date()}
                      onDateChange={(date) => {
                        setSelectedDate(date)
                        handleDateSelect(date)
                      }}
                      onAppointmentClick={(appointment: any) => {
                        // Only handle clicks on available slots
                        if (appointment.isAvailableSlot) {
                          handleTimeSelect(appointment.originalTime)
                        }
                      }}
                      onTimeSlotClick={(date) => {
                        // Extract time from the date
                        const hours = date.getHours().toString().padStart(2, '0')
                        const minutes = date.getMinutes().toString().padStart(2, '0')
                        const timeString = `${hours}:${minutes}`
                        
                        // Check if this time slot is available
                        const slot = timeSlots.find(s => s.time === timeString)
                        if (slot && slot.available) {
                          handleTimeSelect(timeString)
                        }
                      }}
                      selectedBarberId="all"
                      startHour={8}
                      endHour={20}
                      slotDuration={30}
                      className="h-full"
                    />
                  </div>
                )}
                
                {selectedTime && (
                  <div className="mt-4 p-4 bg-primary-50 border border-primary-200 rounded-lg">
                    <p className="text-sm text-primary-700">
                      Selected time: <span className="font-semibold">{formatTime(selectedTime)}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className={`mt-4 ${
                error.includes('Next available') 
                  ? 'text-center'
                  : ''
              }`}>
                {error.includes('Next available') ? (
                  <div className="p-4 border rounded-lg bg-primary-50 border-primary-200 text-primary-700 text-center">
                    {error}
                    {nextAvailable && (
                      <button
                        onClick={() => {
                          const nextDate = parseAPIDate(nextAvailable.date)
                          setSelectedDate(nextDate)
                          setStep(2)
                        }}
                        className="ml-2 px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 transition-colors"
                      >
                        Go to {parseAPIDate(nextAvailable.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </button>
                    )}
                  </div>
                ) : (
                  <ErrorDisplay 
                    error={error} 
                    onRetry={() => selectedDate && handleDateSelect(selectedDate)}
                    title="Failed to load time slots"
                  />
                )}
              </div>
            )}

            {/* Quick booking errors are handled in the main error state */}
          </div>
        )}

        {/* Step 3: Confirm Booking */}
        {step === 3 && (
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-8">
              <Button
                onClick={handleBack}
                variant="ghost"
                size="sm"
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                }
              >
                Back
              </Button>
              <h1 className="text-2xl font-bold">Confirm Booking</h1>
              <div className="w-16" /> {/* Spacer for centering */}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Booking Details</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium">{selectedService}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">
                    {selectedDate && formatDate(selectedDate)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">
                    {selectedTime && formatTimeWithTimezone(selectedTime)}
                  </span>
                </div>
                
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-bold text-lg">
                      {SERVICES.find(s => s.id === selectedService)?.price}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recurring appointment option */}
              <div className="mt-4 p-4 bg-primary-50 border border-primary-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-primary-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-primary-900">Want to make this recurring?</h3>
                    <p className="text-sm text-primary-700 mt-1">
                      Set up regular appointments at this time every week, bi-weekly, or monthly.
                    </p>
                    <Button
                      onClick={() => {
                        // Store the booking details in session storage
                        const service = SERVICES.find(s => s.id === selectedService)
                        sessionStorage.setItem('recurringBookingTemplate', JSON.stringify({
                          service_name: selectedService,
                          service_id: service ? SERVICES.indexOf(service) + 1 : 1, // Map to actual service ID
                          date: selectedDate?.toISOString(),
                          time: selectedTime,
                          day_of_week: selectedDate?.getDay()
                        }))
                        router.push('/recurring?mode=create')
                      }}
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-primary-700 hover:text-primary-800"
                    >
                      Set up recurring appointment →
                    </Button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4">
                  <ErrorDisplay 
                    error={error} 
                    onRetry={handleConfirmBooking}
                    title="Booking failed"
                  />
                </div>
              )}

              <Button
                onClick={handleConfirmBooking}
                loading={submitting}
                loadingText="Creating Booking..."
                variant="primary"
                size="lg"
                fullWidth
                className="mt-6"
              >
                Proceed to Payment
              </Button>
            </div>
          </div>
        )}

        {/* Step 3.5: Guest Information (for non-authenticated users) */}
        {step === 3.5 && isAuthenticated === false && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <Button
                onClick={() => setStep(3)}
                variant="ghost"
                size="sm"
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                }
              >
                Back
              </Button>
              <h1 className="text-2xl font-bold">Your Information</h1>
              <div className="w-16" /> {/* Spacer for centering */}
            </div>

            <ProgressiveGuestForm
              guestInfo={progressiveGuestInfo}
              onGuestInfoChange={(info) => {
                setProgressiveGuestInfo(info)
                // Convert ProgressiveGuestForm format to BookPageContent format
                const nameParts = info.name.split(' ')
                setGuestInfo({
                  first_name: nameParts[0] || '',
                  last_name: nameParts.slice(1).join(' ') || '',
                  email: info.email,
                  phone: info.phone
                })
              }}
              onSubmit={async () => {
                // Validate that all fields are filled
                if (!progressiveGuestInfo.name.trim() || !progressiveGuestInfo.email.trim() || !progressiveGuestInfo.phone.trim()) {
                  setError('Please complete all required fields')
                  return
                }
                
                const nameParts = progressiveGuestInfo.name.split(' ')
                if (nameParts.length < 2) {
                  setError('Please enter both first and last name')
                  return
                }
                
                setError(null)
                // For guest users, go back to create the booking
                if (quickBooking) {
                  await handleQuickBooking()
                } else {
                  await handleConfirmBooking()
                }
              }}
              onBack={() => setStep(3)}
              loading={submitting}
              error={error}
              className="w-full"
              showProgress={true}
            />
          </div>
        )}

        {/* Step 4: Payment */}
        {step === 4 && bookingId && (
          <div className="max-w-md mx-auto">
            <h1 className="text-2xl font-bold text-center mb-8">Complete Payment</h1>
            
            <PaymentForm
              bookingId={bookingId}
              amount={SERVICES.find(s => s.id === selectedService)?.amount || 0}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </div>
        )}

        {/* Step 5: Success (for guest users) */}
        {step === 5 && isAuthenticated === false && guestBookingResponse && (
          <div className="max-w-md mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
              <p className="text-gray-600 mb-6">Your appointment has been successfully booked.</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Booking Details</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium">{guestBookingResponse.service}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{new Date(guestBookingResponse.date).toLocaleDateString()}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">{guestBookingResponse.time}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{guestBookingResponse.guest_name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{guestBookingResponse.guest_email}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{guestBookingResponse.guest_phone}</span>
                </div>
                
                {guestBookingResponse.confirmation_code && (
                  <div className="flex justify-between border-t pt-3 mt-3">
                    <span className="text-gray-600">Confirmation Code:</span>
                    <span className="font-bold text-primary-600">{guestBookingResponse.confirmation_code}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-blue-900">What's Next?</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    You'll receive a confirmation email shortly. Please arrive 5-10 minutes early for your appointment.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => router.push('/register?email=' + encodeURIComponent(guestBookingResponse.guest_email))}
                variant="primary"
                size="lg"
                fullWidth
              >
                Create Account to Manage Bookings
              </Button>
              
              <Button
                onClick={() => router.push('/book')}
                variant="outline"
                size="lg"
                fullWidth
              >
                Book Another Appointment
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}