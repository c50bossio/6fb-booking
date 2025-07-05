'use client'

import { useState, useEffect } from 'react'
import { Clock, Star, Shield, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEnhancedConversionTracking } from '@/hooks/useEnhancedConversionTracking'
import { useCustomerPixels } from '@/hooks/useCustomerPixels'

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
}

const PREMIUM_SERVICES: Service[] = [
  {
    id: 'haircut',
    name: 'Premium Haircut',
    duration: 30,
    price: 35,
    description: 'Expert cut with consultation and styling'
  },
  {
    id: 'shave',
    name: 'Traditional Shave',
    duration: 25,
    price: 30,
    description: 'Hot towel treatment with precision shave'
  },
  {
    id: 'combo',
    name: 'Cut & Shave Combo',
    duration: 50,
    price: 60,
    description: 'Complete grooming experience'
  }
]

const TIME_SLOTS: TimeSlot[] = [
  { time: '09:00', available: true },
  { time: '09:30', available: true },
  { time: '10:00', available: false },
  { time: '10:30', available: true },
  { time: '11:00', available: true },
  { time: '11:30', available: false },
  { time: '12:00', available: true },
  { time: '12:30', available: true },
  { time: '13:00', available: true },
  { time: '13:30', available: false },
  { time: '14:00', available: true },
  { time: '14:30', available: true },
  { time: '15:00', available: true },
  { time: '15:30', available: true },
  { time: '16:00', available: false },
  { time: '16:30', available: true },
  { time: '17:00', available: true }
]

const TRUST_SIGNALS = [
  { icon: Star, text: '4.9/5 Rating', subtext: '200+ Reviews' },
  { icon: Shield, text: 'Licensed Professional', subtext: '10+ Years Experience' },
  { icon: CheckCircle, text: 'Satisfaction Guaranteed', subtext: 'Or Money Back' }
]

export default function ConversionOptimizedBooking({
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
  const [selectedService, setSelectedService] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [urgencyTimer, setUrgencyTimer] = useState(15 * 60) // 15 minutes
  const [socialProofCount, setSocialProofCount] = useState(23)

  // Track page view on component mount
  useEffect(() => {
    trackPageView()
  }, [trackPageView])

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

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId)
    trackEvent('service_selected', { service_id: serviceId })
    setStep(2)
  }

  const handleDateTimeSelect = (date: string, time: string) => {
    setSelectedDate(date)
    setSelectedTime(time)
    trackEvent('datetime_selected', { date, time })
    setStep(3)
  }

  const handleCustomerInfoSubmit = () => {
    trackBeginCheckout()
    setStep(4)
  }

  const handlePaymentMethodSelect = () => {
    trackAddPaymentInfo()
    setStep(5)
  }

  const handleBookingComplete = () => {
    const selectedServiceData = selectedService ? PREMIUM_SERVICES.find(s => s.id === selectedService) : null
    
    trackPurchase({
      transaction_id: `booking_${Date.now()}`,
      value: selectedServiceData?.price || 0,
      currency: 'USD',
      items: [{
        item_id: selectedService,
        item_name: selectedServiceData?.name || 'Service',
        price: selectedServiceData?.price || 0,
        quantity: 1
      }]
    })
    
    // Show success message
    alert('Booking confirmed! You will receive a confirmation email shortly.')
  }

  const selectedServiceData = selectedService ? PREMIUM_SERVICES.find(s => s.id === selectedService) : null

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

                <div className="grid gap-4">
                  {PREMIUM_SERVICES.map((service) => (
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
                            {service.duration} minutes
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">${service.price}</div>
                          <div className="text-sm text-gray-500">starting from</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                        onClick={() => day.isAvailable && setSelectedDate(day.date)}
                        disabled={!day.isAvailable}
                        className={`p-3 rounded-lg text-center transition-colors ${
                          selectedDate === day.date
                            ? 'text-white'
                            : day.isAvailable
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
                      </button>
                    ))}
                  </div>

                  {selectedDate && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Available Times</h3>
                      <div className="grid grid-cols-4 gap-2">
                        {TIME_SLOTS.map((slot) => (
                          <button
                            key={slot.time}
                            onClick={() => slot.available && handleDateTimeSelect(selectedDate, slot.time)}
                            disabled={!slot.available}
                            className={`p-3 rounded-lg text-center transition-colors ${
                              selectedTime === slot.time
                                ? 'text-white'
                                : slot.available
                                ? 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                            }`}
                            style={{
                              backgroundColor: selectedTime === slot.time ? primaryColor : undefined
                            }}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>
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

                <div className="bg-white rounded-lg p-6 border">
                  <form onSubmit={(e) => { e.preventDefault(); handleCustomerInfoSubmit(); }} className="space-y-4">
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
                      className="w-full py-3 px-6 text-white font-semibold rounded-lg transition-colors"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Continue to Payment
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

                <div className="bg-white rounded-lg p-6 border">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full border-2 border-blue-500 bg-blue-500"></div>
                        <div>
                          <div className="font-medium">Credit/Debit Card</div>
                          <div className="text-sm text-gray-500">Visa, Mastercard, American Express</div>
                        </div>
                      </div>
                      <div className="text-sm text-green-600 font-medium">Most Popular</div>
                    </div>

                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Card Number"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="MM/YY"
                          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          placeholder="CVC"
                          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handlePaymentMethodSelect}
                      className="w-full py-3 px-6 text-white font-semibold rounded-lg transition-colors"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Continue to Review
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setStep(4)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Confirm Booking</h2>
                    <p className="text-gray-600">Review your details before confirming</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 border">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Booking Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Service:</span>
                          <span className="font-medium">{selectedServiceData?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Duration:</span>
                          <span className="font-medium">{selectedServiceData?.duration} minutes</span>
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
                        <div className="border-t pt-2 mt-2">
                          <div className="flex justify-between text-lg font-bold">
                            <span>Total:</span>
                            <span>${selectedServiceData?.price}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleBookingComplete}
                      className="w-full py-4 px-6 text-white font-semibold rounded-lg transition-colors text-lg"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Confirm Booking - ${selectedServiceData?.price}
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