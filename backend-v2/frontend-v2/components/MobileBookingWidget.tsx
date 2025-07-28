/**
 * Mobile Booking Widget Component
 * Touch-optimized booking flow for mobile devices
 * Version: 1.0.0
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { Checkbox } from './ui/checkbox'
import { useMobileBooking, useMobileBookingProgress } from '@/hooks/useMobileBooking'
import { BookingStep } from '@/lib/mobile-booking-widgets'

interface MobileBookingWidgetProps {
  className?: string
  onComplete?: (bookingData: any) => void
  onStepChange?: (step: number) => void
  customSteps?: BookingStep[]
  quickBookingEnabled?: boolean
  showProgressBar?: boolean
  enableSwipeNavigation?: boolean
}

export default function MobileBookingWidget({
  className = '',
  onComplete,
  onStepChange,
  customSteps,
  quickBookingEnabled = true,
  showProgressBar = true,
  enableSwipeNavigation = true
}: MobileBookingWidgetProps) {
  const {
    currentStep,
    steps,
    isLoading,
    errors,
    canGoNext,
    canGoPrevious,
    nextStep,
    previousStep,
    goToStep,
    updateFormData,
    getFormData,
    quickBook,
    completeBooking,
    reset,
    getCurrentStep
  } = useMobileBooking({
    customSteps,
    config: {
      enableSwipeNavigation,
      enableHapticFeedback: true,
      enableQuickBooking: quickBookingEnabled
    }
  })

  const { progress, getStepStatus, isStepAccessible } = useMobileBookingProgress()

  const [showQuickBooking, setShowQuickBooking] = useState(false)
  const [selectedService, setSelectedService] = useState('')

  useEffect(() => {
    onStepChange?.(currentStep)
  }, [currentStep, onStepChange])

  const handleNext = async () => {
    const success = await nextStep()
    if (success && currentStep === steps.length - 2) {
      // Moving to final step
      handleCompleteBooking()
    }
  }

  const handleCompleteBooking = async () => {
    const success = await completeBooking()
    if (success) {
      onComplete?.(getFormData())
    }
  }

  const handleQuickBook = async (serviceId: string) => {
    const preferences = getFormData()
    const success = await quickBook(serviceId, preferences)
    if (success) {
      setShowQuickBooking(false)
    }
  }

  const renderStepIndicator = () => {
    if (!showProgressBar) return null

    return (
      <div className="mb-6 space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Step {progress.current} of {progress.total}</span>
            <span>{progress.percentage}% Complete</span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
        </div>

        {/* Step Dots */}
        <div className="flex justify-center space-x-2">
          {steps.map((step, index) => {
            const status = getStepStatus(index)
            const accessible = isStepAccessible(index)
            
            return (
              <button
                key={step.id}
                onClick={() => accessible && goToStep(index)}
                disabled={!accessible}
                className={`w-8 h-8 rounded-full text-xs font-medium transition-all duration-200 ${
                  status === 'completed'
                    ? 'bg-green-500 text-white'
                    : status === 'current'
                    ? 'bg-blue-500 text-white ring-2 ring-blue-200'
                    : accessible
                    ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {status === 'completed' ? '✓' : index + 1}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const renderQuickBooking = () => {
    if (!quickBookingEnabled || !showQuickBooking) return null

    const services = [
      { id: 'haircut', name: 'Haircut', price: '$25' },
      { id: 'beard-trim', name: 'Beard Trim', price: '$15' },
      { id: 'full-service', name: 'Full Service', price: '$35' }
    ]

    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>⚡</span>
            <span>Quick Booking</span>
          </CardTitle>
          <CardDescription>
            Book your usual service in seconds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {services.map((service) => (
              <Button
                key={service.id}
                onClick={() => handleQuickBook(service.id)}
                variant={selectedService === service.id ? 'default' : 'outline'}
                className="justify-between h-12"
              >
                <div className="flex items-center space-x-2">
                  <span>{service.name}</span>
                </div>
                <span className="font-bold">{service.price}</span>
              </Button>
            ))}
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={() => setShowQuickBooking(false)}
              variant="ghost" 
              className="flex-1"
            >
              Manual Booking
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderStepContent = () => {
    const currentStepData = getCurrentStep()
    if (!currentStepData) return null

    switch (currentStepData.id) {
      case 'service':
        return <ServiceSelector />
      case 'barber':
        return <BarberSelector />
      case 'datetime':
        return <DateTimeSelector />
      case 'details':
        return <CustomerDetails />
      case 'payment':
        return <PaymentProcessor />
      case 'confirmation':
        return <BookingConfirmation />
      default:
        return <div>Unknown step: {currentStepData.id}</div>
    }
  }

  // Service Selector Component
  const ServiceSelector = () => {
    const stepData = getFormData('service')
    const services = [
      { id: 'haircut', name: 'Haircut', price: 25, duration: 30, description: 'Professional haircut and styling' },
      { id: 'beard-trim', name: 'Beard Trim', price: 15, duration: 15, description: 'Precision beard trimming and shaping' },
      { id: 'full-service', name: 'Full Service', price: 35, duration: 45, description: 'Haircut + beard trim + hot towel' },
      { id: 'shave', name: 'Hot Towel Shave', price: 20, duration: 20, description: 'Traditional hot towel shave' }
    ]

    const handleServiceSelect = (serviceId: string) => {
      const service = services.find(s => s.id === serviceId)
      updateFormData('service', {
        selectedService: serviceId,
        serviceName: service?.name,
        price: service?.price,
        duration: service?.duration
      })
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          {services.map((service) => (
            <div
              key={service.id}
              onClick={() => handleServiceSelect(service.id)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                stepData.selectedService === service.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="font-medium">{service.name}</div>
                  <div className="text-sm text-gray-600">{service.description}</div>
                  <div className="text-xs text-gray-500">{service.duration} minutes</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">${service.price}</div>
                  {stepData.selectedService === service.id && (
                    <Badge variant="default" className="mt-1">Selected</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Barber Selector Component
  const BarberSelector = () => {
    const stepData = getFormData('barber')
    const barbers = [
      { id: 'any', name: 'Any Available Barber', image: '👨‍💼', rating: 4.9, specialty: 'All services' },
      { id: 'john', name: 'John Smith', image: '👨‍🦲', rating: 4.8, specialty: 'Classic cuts' },
      { id: 'mike', name: 'Mike Johnson', image: '👨‍🦱', rating: 4.9, specialty: 'Modern styles' },
      { id: 'david', name: 'David Brown', image: '👨‍🦳', specialty: 'Beard specialist', rating: 4.7 }
    ]

    const handleBarberSelect = (barberId: string) => {
      const barber = barbers.find(b => b.id === barberId)
      updateFormData('barber', {
        selectedBarber: barberId,
        barberName: barber?.name
      })
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          {barbers.map((barber) => (
            <div
              key={barber.id}
              onClick={() => handleBarberSelect(barber.id)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                stepData.selectedBarber === barber.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{barber.image}</div>
                <div className="flex-1">
                  <div className="font-medium">{barber.name}</div>
                  <div className="text-sm text-gray-600">{barber.specialty}</div>
                  <div className="flex items-center space-x-1 mt-1">
                    <span className="text-yellow-500">⭐</span>
                    <span className="text-sm">{barber.rating}</span>
                  </div>
                </div>
                {stepData.selectedBarber === barber.id && (
                  <Badge variant="default">Selected</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // DateTime Selector Component
  const DateTimeSelector = () => {
    const stepData = getFormData('datetime')
    const [selectedDate, setSelectedDate] = useState(stepData.date || '')
    const [selectedTime, setSelectedTime] = useState(stepData.time || '')

    const timeSlots = [
      '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
      '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
      '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM'
    ]

    const handleDateChange = (date: string) => {
      setSelectedDate(date)
      updateFormData('datetime', { date, time: selectedTime })
    }

    const handleTimeChange = (time: string) => {
      setSelectedTime(time)
      updateFormData('datetime', { date: selectedDate, time })
    }

    return (
      <div className="space-y-6">
        {/* Date Picker */}
        <div className="space-y-2">
          <Label>Select Date</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="h-12 text-lg"
          />
        </div>

        {/* Time Slots */}
        {selectedDate && (
          <div className="space-y-2">
            <Label>Select Time</Label>
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map((time) => (
                <Button
                  key={time}
                  onClick={() => handleTimeChange(time)}
                  variant={selectedTime === time ? 'default' : 'outline'}
                  className="h-12"
                >
                  {time}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Customer Details Component
  const CustomerDetails = () => {
    const stepData = getFormData('details')

    const handleFieldChange = (field: string, value: string) => {
      updateFormData('details', { ...stepData, [field]: value })
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              type="text"
              value={stepData.name || ''}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="Enter your full name"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={stepData.email || ''}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              placeholder="your@email.com"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={stepData.phone || ''}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              placeholder="(555) 123-4567"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Special Requests</Label>
            <Textarea
              id="notes"
              value={stepData.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Any special requests or notes..."
              className="min-h-[100px]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="notifications"
              checked={stepData.notifications || false}
              onCheckedChange={(checked) => handleFieldChange('notifications', checked.toString())}
            />
            <Label htmlFor="notifications" className="text-sm">
              Send me appointment reminders via SMS
            </Label>
          </div>
        </div>
      </div>
    )
  }

  // Payment Processor Component
  const PaymentProcessor = () => {
    const serviceData = getFormData('service')
    const [paymentMethod, setPaymentMethod] = useState('card')

    return (
      <div className="space-y-6">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{serviceData.serviceName}</span>
                <span>${serviceData.price}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax</span>
                <span>${(serviceData.price * 0.08).toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span>${(serviceData.price * 1.08).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <div className="space-y-4">
          <Label>Payment Method</Label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => setPaymentMethod('card')}
              variant={paymentMethod === 'card' ? 'default' : 'outline'}
              className="h-12"
            >
              💳 Credit Card
            </Button>
            <Button
              onClick={() => setPaymentMethod('cash')}
              variant={paymentMethod === 'cash' ? 'default' : 'outline'}
              className="h-12"
            >
              💵 Pay at Shop
            </Button>
          </div>
        </div>

        {paymentMethod === 'card' && (
          <div className="space-y-4">
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-600">
              🔒 Secure payment form would appear here
              <div className="text-sm mt-2">
                Integration with Stripe or other payment processor
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Booking Confirmation Component
  const BookingConfirmation = () => {
    const allData = getFormData()

    return (
      <div className="space-y-6 text-center">
        <div className="text-6xl">🎉</div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-green-600">Booking Confirmed!</h2>
          <p className="text-gray-600">Your appointment has been successfully booked</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">Service</div>
                <div className="text-gray-600">{allData.service?.serviceName}</div>
              </div>
              <div>
                <div className="font-medium">Date & Time</div>
                <div className="text-gray-600">{allData.datetime?.date} at {allData.datetime?.time}</div>
              </div>
              <div>
                <div className="font-medium">Barber</div>
                <div className="text-gray-600">{allData.barber?.barberName || 'Any Available'}</div>
              </div>
              <div>
                <div className="font-medium">Total</div>
                <div className="text-gray-600 font-bold">${(allData.service?.price * 1.08).toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Button onClick={reset} variant="outline" className="w-full">
            Book Another Appointment
          </Button>
          <div className="text-sm text-gray-600">
            Confirmation details sent to {allData.details?.email}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`max-w-lg mx-auto ${className}`} data-step={currentStep}>
      {/* Quick Booking */}
      {quickBookingEnabled && currentStep === 0 && !showQuickBooking && (
        <div className="mb-6">
          <Button
            onClick={() => setShowQuickBooking(true)}
            className="w-full h-12 flex items-center space-x-2"
            variant="outline"
          >
            <span>⚡</span>
            <span>Quick Booking</span>
          </Button>
        </div>
      )}

      {renderQuickBooking()}

      {!showQuickBooking && (
        <>
          {/* Progress Indicator */}
          {renderStepIndicator()}

          {/* Current Step */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{getCurrentStep()?.title}</span>
                <Badge variant="outline">
                  {currentStep + 1}/{steps.length}
                </Badge>
              </CardTitle>
              {getCurrentStep()?.description && (
                <CardDescription>
                  {getCurrentStep()?.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {renderStepContent()}
            </CardContent>
          </Card>

          {/* Errors */}
          {Object.keys(errors).length > 0 && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertDescription>
                {Object.values(errors)[0]}
              </AlertDescription>
            </Alert>
          )}

          {/* Navigation */}
          <div className="flex space-x-3">
            {canGoPrevious && (
              <Button
                onClick={previousStep}
                disabled={isLoading}
                variant="outline"
                className="flex-1 h-12"
              >
                ← Previous
              </Button>
            )}
            
            {canGoNext && currentStep < steps.length - 1 && (
              <Button
                onClick={handleNext}
                disabled={isLoading}
                className="flex-1 h-12"
              >
                {isLoading ? 'Loading...' : 'Next →'}
              </Button>
            )}

            {currentStep === steps.length - 2 && (
              <Button
                onClick={handleCompleteBooking}
                disabled={isLoading}
                className="flex-1 h-12"
              >
                {isLoading ? 'Processing...' : 'Complete Booking'}
              </Button>
            )}
          </div>

          {/* Swipe Hint */}
          {enableSwipeNavigation && currentStep === 0 && (
            <div className="mt-4 text-center text-sm text-gray-500">
              💡 Swipe left/right to navigate between steps
            </div>
          )}
        </>
      )}
    </div>
  )
}