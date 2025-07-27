/**
 * Streamlined Booking Flow - Enterprise Booking Experience
 * Professional booking interface with AI-powered optimization
 * Built for Six Figure Barber methodology with conversion-focused UX
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  professionalTypography, 
  enterpriseAnimations, 
  dashboard,
  touchTargets 
} from '@/lib/design-tokens'
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  CreditCard,
  Check,
  ChevronRight,
  ChevronLeft,
  Star,
  MapPin,
  Sparkles,
  Zap,
  Heart,
  Gift,
  Shield,
  DollarSign,
  ArrowRight
} from 'lucide-react'

interface Service {
  id: string
  name: string
  description: string
  duration: number
  price: number
  category: 'signature' | 'premium' | 'classic'
  popularity: number
  image?: string
  benefits: string[]
  addOns?: ServiceAddOn[]
}

interface ServiceAddOn {
  id: string
  name: string
  price: number
  duration: number
  description: string
}

interface TimeSlot {
  id: string
  time: string
  available: boolean
  price?: number
  premium?: boolean
  recommended?: boolean
}

interface BookingData {
  service?: Service
  date?: Date
  time?: TimeSlot
  customer: {
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  addOns: ServiceAddOn[]
  totalPrice: number
  totalDuration: number
}

interface StreamlinedBookingFlowProps {
  className?: string
  onBookingComplete?: (booking: BookingData) => void
  showAIRecommendations?: boolean
  enablePremiumFeatures?: boolean
}

const SAMPLE_SERVICES: Service[] = [
  {
    id: 'signature-cut',
    name: 'Signature Executive Cut',
    description: 'Premium haircut with consultation, styling, and hot towel service',
    duration: 60,
    price: 75,
    category: 'signature',
    popularity: 95,
    benefits: ['Personal consultation', 'Hot towel service', 'Premium styling', 'Beard trim included'],
    addOns: [
      { id: 'scalp-massage', name: 'Scalp Massage', price: 15, duration: 10, description: 'Relaxing scalp treatment' },
      { id: 'beard-detail', name: 'Detailed Beard Styling', price: 20, duration: 15, description: 'Professional beard sculpting' }
    ]
  },
  {
    id: 'classic-cut',
    name: 'Classic Professional Cut',
    description: 'Traditional barbershop experience with modern styling',
    duration: 45,
    price: 55,
    category: 'classic',
    popularity: 80,
    benefits: ['Expert cutting', 'Style consultation', 'Finishing touches', 'Complimentary wash'],
    addOns: [
      { id: 'hot-towel', name: 'Hot Towel Finish', price: 10, duration: 5, description: 'Relaxing hot towel treatment' }
    ]
  },
  {
    id: 'premium-package',
    name: 'Six Figure Experience',
    description: 'Complete grooming experience with all premium services',
    duration: 90,
    price: 125,
    category: 'premium',
    popularity: 70,
    benefits: ['Complete makeover', 'Scalp treatment', 'Beard styling', 'Premium products', 'Photography session'],
    addOns: []
  }
]

export function StreamlinedBookingFlow({
  className = '',
  onBookingComplete,
  showAIRecommendations = true,
  enablePremiumFeatures = true
}: StreamlinedBookingFlowProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [bookingData, setBookingData] = useState<BookingData>({
    customer: {
      firstName: '',
      lastName: '',
      email: '',
      phone: ''
    },
    addOns: [],
    totalPrice: 0,
    totalDuration: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])

  const steps = [
    { number: 1, title: 'Choose Service', icon: <Sparkles className="w-5 h-5" /> },
    { number: 2, title: 'Select Date & Time', icon: <Calendar className="w-5 h-5" /> },
    { number: 3, title: 'Your Details', icon: <User className="w-5 h-5" /> },
    { number: 4, title: 'Confirmation', icon: <Check className="w-5 h-5" /> }
  ]

  useEffect(() => {
    if (bookingData.service) {
      const basePrice = bookingData.service.price
      const addOnPrice = bookingData.addOns.reduce((sum, addOn) => sum + addOn.price, 0)
      const baseDuration = bookingData.service.duration
      const addOnDuration = bookingData.addOns.reduce((sum, addOn) => sum + addOn.duration, 0)
      
      setBookingData(prev => ({
        ...prev,
        totalPrice: basePrice + addOnPrice,
        totalDuration: baseDuration + addOnDuration
      }))
    }
  }, [bookingData.service, bookingData.addOns])

  const handleServiceSelect = (service: Service) => {
    setBookingData(prev => ({ ...prev, service, addOns: [] }))
    setCurrentStep(2)
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    // Generate sample time slots
    const slots: TimeSlot[] = [
      { id: '9am', time: '9:00 AM', available: true, recommended: true },
      { id: '10am', time: '10:00 AM', available: true },
      { id: '11am', time: '11:00 AM', available: false },
      { id: '1pm', time: '1:00 PM', available: true, premium: true, price: bookingData.service?.price ? bookingData.service.price + 10 : 0 },
      { id: '2pm', time: '2:00 PM', available: true },
      { id: '3pm', time: '3:00 PM', available: true },
      { id: '4pm', time: '4:00 PM', available: true, premium: true, price: bookingData.service?.price ? bookingData.service.price + 10 : 0 },
    ]
    setAvailableSlots(slots)
  }

  const handleTimeSelect = (timeSlot: TimeSlot) => {
    setBookingData(prev => ({ 
      ...prev, 
      date: selectedDate || undefined, 
      time: timeSlot 
    }))
    setCurrentStep(3)
  }

  const handleAddOnToggle = (addOn: ServiceAddOn) => {
    setBookingData(prev => ({
      ...prev,
      addOns: prev.addOns.find(a => a.id === addOn.id)
        ? prev.addOns.filter(a => a.id !== addOn.id)
        : [...prev.addOns, addOn]
    }))
  }

  const handleCustomerDetailsSubmit = () => {
    if (bookingData.customer.firstName && bookingData.customer.email) {
      setCurrentStep(4)
    }
  }

  const handleBookingConfirm = async () => {
    setIsLoading(true)
    // Simulate booking process
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    if (onBookingComplete) {
      onBookingComplete(bookingData)
    }
    
    setIsLoading(false)
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'signature':
        return { bg: '#f0fdf4', border: '#22c55e', text: '#059669' }
      case 'premium':
        return { bg: '#fdf4ff', border: '#a855f7', text: '#7c3aed' }
      case 'classic':
        return { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8' }
      default:
        return { bg: '#f8fafc', border: '#64748b', text: '#475569' }
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className={`
            flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200
            ${currentStep >= step.number 
              ? 'bg-primary-500 border-primary-500 text-white' 
              : 'bg-white border-gray-300 text-gray-400'
            }
          `}>
            {currentStep > step.number ? (
              <Check className="w-5 h-5" />
            ) : (
              step.icon
            )}
          </div>
          {index < steps.length - 1 && (
            <div className={`
              w-12 h-0.5 mx-2 transition-all duration-200
              ${currentStep > step.number ? 'bg-primary-500' : 'bg-gray-300'}
            `} />
          )}
        </div>
      ))}
    </div>
  )

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 
          style={{ 
            fontSize: professionalTypography.executive.title[0],
            lineHeight: professionalTypography.executive.title[1].lineHeight,
            fontWeight: professionalTypography.executive.title[1].fontWeight,
          }}
          className="text-gray-900 dark:text-white"
        >
          Book Your Appointment
        </h1>
        <p 
          style={{
            fontSize: professionalTypography.executive.caption[0],
            lineHeight: professionalTypography.executive.caption[1].lineHeight,
          }}
          className="text-gray-600 dark:text-gray-300"
        >
          Experience the Six Figure Barber difference
        </p>
      </div>

      {/* Step Indicator */}
      {renderStepIndicator()}

      <AnimatePresence mode="wait">
        {/* Step 1: Choose Service */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Choose Your Service
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Select the perfect service for your needs
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SAMPLE_SERVICES.map((service) => {
                const categoryStyle = getCategoryColor(service.category)
                return (
                  <Card 
                    key={service.id}
                    className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105"
                    style={{ backgroundColor: categoryStyle.bg, borderColor: categoryStyle.border }}
                    onClick={() => handleServiceSelect(service)}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <Badge 
                          className="text-xs mb-3"
                          style={{ backgroundColor: categoryStyle.text, color: 'white' }}
                        >
                          {service.category.charAt(0).toUpperCase() + service.category.slice(1)}
                        </Badge>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm font-medium">{service.popularity}%</span>
                        </div>
                      </div>
                      
                      <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                        {service.name}
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {service.description}
                      </p>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1 text-sm text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>{service.duration} min</span>
                          </div>
                          <div className="flex items-center space-x-1 text-lg font-bold text-gray-900">
                            <DollarSign className="w-4 h-4" />
                            <span>{service.price}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-gray-700">Benefits:</h4>
                        <ul className="space-y-1">
                          {service.benefits.slice(0, 3).map((benefit, index) => (
                            <li key={index} className="flex items-center space-x-2 text-xs text-gray-600">
                              <Check className="w-3 h-3 text-green-500" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Button 
                        className="w-full"
                        style={{ backgroundColor: categoryStyle.text }}
                      >
                        Select Service
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {showAIRecommendations && (
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900">AI Recommendation</h3>
                  </div>
                  <p className="text-sm text-gray-700 mb-3">
                    Based on current trends and customer preferences, the <strong>Signature Executive Cut</strong> 
                    is our most popular choice, offering the best value and experience.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleServiceSelect(SAMPLE_SERVICES[0])}
                  >
                    Choose Recommended Service
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Step 2: Date & Time Selection */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Select Date & Time
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Choose your preferred appointment slot
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Date Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5" />
                    <span>Choose Date</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Simple date buttons for demo */}
                  <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 9 }, (_, i) => {
                      const date = new Date()
                      date.setDate(date.getDate() + i + 1)
                      const isSelected = selectedDate?.toDateString() === date.toDateString()
                      
                      return (
                        <Button
                          key={i}
                          variant={isSelected ? "default" : "outline"}
                          className="h-16 flex flex-col"
                          onClick={() => handleDateSelect(date)}
                        >
                          <span className="text-xs font-medium">
                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                          <span className="text-lg font-bold">
                            {date.getDate()}
                          </span>
                        </Button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Time Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="w-5 h-5" />
                    <span>Available Times</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDate ? (
                    <div className="space-y-3">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot.id}
                          variant={slot.available ? "outline" : "ghost"}
                          disabled={!slot.available}
                          className={`w-full justify-between h-12 ${
                            slot.recommended ? 'border-green-300 bg-green-50' : ''
                          }`}
                          onClick={() => slot.available && handleTimeSelect(slot)}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{slot.time}</span>
                            {slot.recommended && (
                              <Badge variant="success" className="text-xs">
                                Recommended
                              </Badge>
                            )}
                            {slot.premium && (
                              <Badge variant="secondary" className="text-xs">
                                Premium
                              </Badge>
                            )}
                          </div>
                          {slot.premium && slot.price && (
                            <span className="text-sm font-medium">
                              +${slot.price - (bookingData.service?.price || 0)}
                            </span>
                          )}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      Please select a date first
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Services
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Customer Details */}
        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Your Details
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                We need some information to confirm your booking
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Customer Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="First Name"
                      value={bookingData.customer.firstName}
                      onChange={(e) => setBookingData(prev => ({
                        ...prev,
                        customer: { ...prev.customer, firstName: e.target.value }
                      }))}
                    />
                    <Input
                      placeholder="Last Name"
                      value={bookingData.customer.lastName}
                      onChange={(e) => setBookingData(prev => ({
                        ...prev,
                        customer: { ...prev.customer, lastName: e.target.value }
                      }))}
                    />
                  </div>
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={bookingData.customer.email}
                    onChange={(e) => setBookingData(prev => ({
                      ...prev,
                      customer: { ...prev.customer, email: e.target.value }
                    }))}
                  />
                  <Input
                    type="tel"
                    placeholder="Phone Number"
                    value={bookingData.customer.phone}
                    onChange={(e) => setBookingData(prev => ({
                      ...prev,
                      customer: { ...prev.customer, phone: e.target.value }
                    }))}
                  />
                </CardContent>
              </Card>

              {/* Add-ons and Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Enhance Your Experience</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {bookingData.service?.addOns && bookingData.service.addOns.length > 0 && (
                    <div className="space-y-3">
                      {bookingData.service.addOns.map((addOn) => (
                        <div key={addOn.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={bookingData.addOns.some(a => a.id === addOn.id)}
                              onChange={() => handleAddOnToggle(addOn)}
                              className="w-4 h-4"
                            />
                            <div>
                              <p className="font-medium text-sm">{addOn.name}</p>
                              <p className="text-xs text-gray-500">{addOn.description}</p>
                            </div>
                          </div>
                          <div className="text-sm font-medium">
                            +${addOn.price}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Booking Summary */}
                  <div className="border-t pt-4 space-y-2">
                    <h4 className="font-semibold">Booking Summary</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>{bookingData.service?.name}</span>
                        <span>${bookingData.service?.price}</span>
                      </div>
                      {bookingData.addOns.map((addOn) => (
                        <div key={addOn.id} className="flex justify-between text-gray-600">
                          <span>{addOn.name}</span>
                          <span>+${addOn.price}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-semibold pt-2 border-t">
                        <span>Total</span>
                        <span>${bookingData.totalPrice}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Date & Time
              </Button>
              <Button 
                onClick={handleCustomerDetailsSubmit}
                disabled={!bookingData.customer.firstName || !bookingData.customer.email}
              >
                Continue to Confirmation
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Confirm Your Booking
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Review your appointment details
              </p>
            </div>

            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-8 space-y-6">
                {/* Appointment Details */}
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {bookingData.service?.name}
                    </h3>
                    <p className="text-gray-600">
                      {bookingData.date?.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })} at {bookingData.time?.time}
                    </p>
                  </div>
                </div>

                {/* Customer & Service Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Customer</h4>
                    <div className="space-y-2 text-sm">
                      <p>{bookingData.customer.firstName} {bookingData.customer.lastName}</p>
                      <p className="text-gray-600">{bookingData.customer.email}</p>
                      <p className="text-gray-600">{bookingData.customer.phone}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Service Details</h4>
                    <div className="space-y-2 text-sm">
                      <p>Duration: {bookingData.totalDuration} minutes</p>
                      <p>Total Price: <span className="font-semibold">${bookingData.totalPrice}</span></p>
                      {bookingData.addOns.length > 0 && (
                        <p>Add-ons: {bookingData.addOns.map(a => a.name).join(', ')}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Confirmation Button */}
                <div className="pt-6 border-t">
                  <Button 
                    className="w-full h-12 text-lg"
                    onClick={handleBookingConfirm}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Confirming Booking...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Shield className="w-5 h-5" />
                        <span>Confirm & Book Appointment</span>
                      </div>
                    )}
                  </Button>
                  
                  <p className="text-xs text-gray-500 text-center mt-3">
                    By confirming, you agree to our terms and cancellation policy
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setCurrentStep(3)}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Details
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default StreamlinedBookingFlow