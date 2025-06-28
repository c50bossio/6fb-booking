'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Calendar from '@/components/Calendar'
import TimeSlots from '@/components/TimeSlots'
import PaymentForm from '@/components/PaymentForm'
import { getAvailableSlots, createBooking, getMyBookings, getProfile } from '@/lib/api'

const SERVICES = [
  { id: 'Haircut', name: 'Haircut', duration: '30 min', price: '$30', amount: 30 },
  { id: 'Shave', name: 'Shave', duration: '20 min', price: '$20', amount: 20 },
  { id: 'Haircut & Shave', name: 'Haircut & Shave', duration: '45 min', price: '$45', amount: 45 }
]

export default function BookPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [timeSlots, setTimeSlots] = useState<any[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [bookingDates, setBookingDates] = useState<Date[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<number | null>(null)

  // Check authentication and fetch user's existing bookings on mount
  useEffect(() => {
    async function checkAuthAndFetchBookings() {
      try {
        // Check if user is authenticated
        await getProfile()
        
        // Fetch existing bookings
        const response = await getMyBookings()
        const dates = response.bookings.map((booking: any) => 
          new Date(booking.start_time)
        )
        setBookingDates(dates)
      } catch (err) {
        console.error('Authentication or booking fetch failed:', err)
        // Redirect to login if not authenticated
        router.push('/login')
      }
    }
    checkAuthAndFetchBookings()
  }, [router])

  // Fetch available slots when date is selected
  useEffect(() => {
    if (selectedDate) {
      fetchTimeSlots(selectedDate)
    }
  }, [selectedDate])

  const fetchTimeSlots = async (date: Date) => {
    setLoadingSlots(true)
    setError(null)
    try {
      const dateStr = date.toISOString().split('T')[0]
      const slots = await getAvailableSlots(dateStr)
      setTimeSlots(slots)
    } catch (err) {
      console.error('Failed to fetch slots:', err)
      setError('Failed to load available time slots')
      setTimeSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleServiceSelect = (service: string) => {
    setSelectedService(service)
    setStep(2)
  }

  const handleDateSelect = (date: Date) => {
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

  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return

    setSubmitting(true)
    setError(null)

    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      const booking = await createBooking(dateStr, selectedTime, selectedService)
      
      // Store booking ID and proceed to payment
      setBookingId(booking.id)
      setStep(4)
    } catch (err: any) {
      console.error('Booking failed:', err)
      setError(err.message || 'Failed to create booking. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePaymentSuccess = () => {
    // Redirect to dashboard with success message
    router.push('/dashboard?booking=success&payment=complete')
  }

  const handlePaymentError = (error: string) => {
    setError(error)
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
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}>
                  1
                </div>
                <span className="ml-2 font-medium hidden sm:inline">Service</span>
              </div>
              
              <div className={`h-px w-16 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              
              <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}>
                  2
                </div>
                <span className="ml-2 font-medium hidden sm:inline">Date & Time</span>
              </div>
              
              <div className={`h-px w-16 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              
              <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}>
                  3
                </div>
                <span className="ml-2 font-medium hidden sm:inline">Confirm</span>
              </div>
              
              <div className={`h-px w-16 ${step >= 4 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              
              <div className={`flex items-center ${step >= 4 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}>
                  4
                </div>
                <span className="ml-2 font-medium hidden sm:inline">Payment</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Select Service */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold text-center mb-8">Select a Service</h1>
            <div className="grid gap-4 max-w-2xl mx-auto">
              {SERVICES.map(service => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelect(service.id)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-left hover:border-blue-400 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-semibold">{service.name}</h3>
                      <p className="text-gray-600 text-sm mt-1">{service.duration}</p>
                    </div>
                    <div className="text-xl font-bold text-blue-600">{service.price}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Date & Time */}
        {step === 2 && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={handleBack}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h1 className="text-2xl font-bold">Select Date & Time</h1>
              <div className="w-16" /> {/* Spacer for centering */}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-lg font-semibold mb-4">Choose a Date</h2>
                <Calendar
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  bookingDates={bookingDates}
                />
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">
                  {selectedDate ? formatDate(selectedDate) : 'Select a date first'}
                </h2>
                {selectedDate && (
                  <TimeSlots
                    slots={timeSlots}
                    selectedTime={selectedTime}
                    onTimeSelect={handleTimeSelect}
                    loading={loadingSlots}
                  />
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Confirm Booking */}
        {step === 3 && (
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={handleBack}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
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
                    {selectedTime && formatTime(selectedTime)}
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

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleConfirmBooking}
                disabled={submitting}
                className={`
                  w-full mt-6 py-3 px-4 rounded-lg font-medium transition-all duration-200
                  ${submitting 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }
                `}
              >
                {submitting ? 'Creating Booking...' : 'Proceed to Payment'}
              </button>
            </div>
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
      </div>
    </div>
  )
}