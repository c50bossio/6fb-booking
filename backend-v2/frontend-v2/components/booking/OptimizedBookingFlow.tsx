'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AccessibleButton } from '@/components/ui/AccessibleButton'
import { AccessibleInput, FormField } from '@/components/ui/AccessibleForm'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Calendar, 
  Clock, 
  User, 
  CreditCard, 
  CheckCircle, 
  ChevronLeft,
  ChevronRight,
  Scissors,
  DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types
interface Service {
  id: string
  name: string
  duration: number
  price: number
  description?: string
}

interface BookingStep {
  id: number
  title: string
  icon: React.ReactNode
  completed: boolean
  current: boolean
}

interface OptimizedBookingFlowProps {
  services?: Service[]
  onComplete?: (bookingData: any) => void
  className?: string
}

const DEMO_SERVICES: Service[] = [
  {
    id: '1',
    name: 'Haircut',
    duration: 30,
    price: 30,
    description: 'Professional hair cutting and styling'
  },
  {
    id: '2', 
    name: 'Shave',
    duration: 20,
    price: 20,
    description: 'Traditional hot towel shave'
  },
  {
    id: '3',
    name: 'Haircut & Shave',
    duration: 45,
    price: 45,
    description: 'Complete grooming package'
  }
]

export function OptimizedBookingFlow({ 
  services = DEMO_SERVICES,
  onComplete,
  className 
}: OptimizedBookingFlowProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDateTime, setSelectedDateTime] = useState<string>('')
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [isLoading, setIsLoading] = useState(false)

  // Calculate progress percentage
  const progress = (currentStep / 5) * 100

  // Define steps with accessibility-friendly icons
  const steps: BookingStep[] = [
    {
      id: 1,
      title: 'Service',
      icon: <Scissors className="h-4 w-4" aria-hidden="true" />,
      completed: currentStep > 1,
      current: currentStep === 1
    },
    {
      id: 2,
      title: 'Date & Time',
      icon: <Calendar className="h-4 w-4" aria-hidden="true" />,
      completed: currentStep > 2,
      current: currentStep === 2
    },
    {
      id: 3,
      title: 'Your Info',
      icon: <User className="h-4 w-4" aria-hidden="true" />,
      completed: currentStep > 3,
      current: currentStep === 3
    },
    {
      id: 4,
      title: 'Confirm',
      icon: <CheckCircle className="h-4 w-4" aria-hidden="true" />,
      completed: currentStep > 4,
      current: currentStep === 4
    },
    {
      id: 5,
      title: 'Payment',
      icon: <CreditCard className="h-4 w-4" aria-hidden="true" />,
      completed: false,
      current: currentStep === 5
    }
  ]

  const handleNext = useCallback(() => {
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1)
    }
  }, [currentStep])

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const handleServiceSelect = useCallback((service: Service) => {
    setSelectedService(service)
    // Auto-advance after service selection
    setTimeout(() => handleNext(), 300)
  }, [handleNext])

  const handleComplete = useCallback(async () => {
    setIsLoading(true)
    try {
      const bookingData = {
        service: selectedService,
        dateTime: selectedDateTime,
        customer: customerInfo
      }
      
      await onComplete?.(bookingData)
      
      // Simulate completion
      setTimeout(() => {
        setIsLoading(false)
        setCurrentStep(5)
      }, 1500)
    } catch (error) {
      setIsLoading(false)
      console.error('Booking failed:', error)
    }
  }, [selectedService, selectedDateTime, customerInfo, onComplete])

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1: return selectedService !== null
      case 2: return selectedDateTime !== ''
      case 3: return customerInfo.name && customerInfo.email
      case 4: return true
      default: return false
    }
  }, [currentStep, selectedService, selectedDateTime, customerInfo])

  return (
    <div className={cn('max-w-4xl mx-auto p-4', className)}>
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Book Your Appointment
          </h1>
          <Badge variant="outline" className="text-sm">
            Step {currentStep} of 5
          </Badge>
        </div>
        
        <Progress 
          value={progress} 
          className="h-2 mb-4"
          aria-label={`Booking progress: ${progress}% complete`}
        />
        
        {/* Step Navigation */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors',
                  step.completed
                    ? 'bg-primary border-primary text-primary-foreground'
                    : step.current
                    ? 'border-primary text-primary bg-primary/10'
                    : 'border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400'
                )}
                aria-label={`Step ${step.id}: ${step.title}${step.completed ? ' - Completed' : step.current ? ' - Current' : ''}`}
              >
                {step.completed ? (
                  <CheckCircle className="h-5 w-5" aria-hidden="true" />
                ) : (
                  step.icon
                )}
              </div>
              
              <span 
                className={cn(
                  'ml-2 text-sm font-medium hidden sm:block',
                  step.current ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
                )}
              >
                {step.title}
              </span>
              
              {index < steps.length - 1 && (
                <div className="w-8 h-px bg-gray-300 dark:bg-gray-600 mx-4 hidden sm:block" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {steps[currentStep - 1]?.icon}
            {steps[currentStep - 1]?.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {/* Step 1: Service Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Choose the service you'd like to book
              </p>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => (
                  <Card
                    key={service.id}
                    className={cn(
                      'cursor-pointer transition-all duration-200 hover:shadow-md',
                      selectedService?.id === service.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-primary/50'
                    )}
                    onClick={() => handleServiceSelect(service)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select ${service.name} service, ${service.duration} minutes, $${service.price}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleServiceSelect(service)
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg">{service.name}</h3>
                        <div className="flex items-center gap-1 text-primary font-bold">
                          <DollarSign className="h-4 w-4" aria-hidden="true" />
                          {service.price}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                        <Clock className="h-4 w-4" aria-hidden="true" />
                        {service.duration} min
                      </div>
                      
                      {service.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {service.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Date & Time Selection */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Scissors className="h-5 w-5 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-medium">{selectedService?.name}</p>
                  <p className="text-sm text-gray-500">
                    {selectedService?.duration} min • ${selectedService?.price}
                  </p>
                </div>
              </div>
              
              <FormField>
                <AccessibleInput
                  type="datetime-local"
                  label="Preferred Date & Time"
                  value={selectedDateTime}
                  onChange={(e) => setSelectedDateTime(e.target.value)}
                  required
                  helperText="Select your preferred appointment time"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </FormField>
            </div>
          )}

          {/* Step 3: Customer Information */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField>
                  <AccessibleInput
                    label="Full Name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="Enter your full name"
                  />
                </FormField>
                
                <FormField>
                  <AccessibleInput
                    type="email"
                    label="Email Address"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                    required
                    placeholder="Enter your email"
                  />
                </FormField>
              </div>
              
              <FormField>
                <AccessibleInput
                  type="tel"
                  label="Phone Number"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter your phone number"
                  helperText="We'll use this to send appointment reminders"
                />
              </FormField>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">Review Your Booking</h3>
              
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Service</h4>
                  <p>{selectedService?.name}</p>
                  <p className="text-sm text-gray-500">
                    {selectedService?.duration} minutes • ${selectedService?.price}
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Date & Time</h4>
                  <p>{new Date(selectedDateTime).toLocaleString()}</p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Contact Information</h4>
                  <p>{customerInfo.name}</p>
                  <p className="text-sm text-gray-500">{customerInfo.email}</p>
                  {customerInfo.phone && (
                    <p className="text-sm text-gray-500">{customerInfo.phone}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Payment */}
          {currentStep === 5 && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h3 className="text-xl font-semibold">Booking Confirmed!</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your appointment has been successfully booked. You'll receive a confirmation email shortly.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      {currentStep < 5 && (
        <div className="flex justify-between items-center">
          <AccessibleButton
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            aria-label="Go to previous step"
          >
            <ChevronLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Previous
          </AccessibleButton>

          <AccessibleButton
            onClick={currentStep === 4 ? handleComplete : handleNext}
            disabled={!canProceed()}
            loading={isLoading}
            loadingText={currentStep === 4 ? 'Confirming booking...' : 'Loading...'}
            aria-label={currentStep === 4 ? 'Confirm booking' : 'Go to next step'}
          >
            {currentStep === 4 ? 'Confirm Booking' : 'Continue'}
            {currentStep !== 4 && (
              <ChevronRight className="h-4 w-4 ml-2" aria-hidden="true" />
            )}
          </AccessibleButton>
        </div>
      )}
    </div>
  )
}

export default OptimizedBookingFlow