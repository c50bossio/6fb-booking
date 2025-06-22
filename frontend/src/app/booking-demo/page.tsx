'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BookingWidget } from '@/components/booking'
import { bookingService } from '@/lib/api/bookings'
import { MapPin, Clock, Star, User, Calendar, CheckCircle } from 'lucide-react'

interface DemoStep {
  id: string
  title: string
  description: string
  completed: boolean
}

const BookingDemoPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [barbers, setBarbers] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [selectedBarber, setSelectedBarber] = useState<any>(null)
  const [selectedService, setSelectedService] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bookingData, setBookingData] = useState<any>(null)

  const demoSteps: DemoStep[] = [
    {
      id: 'browse',
      title: 'Browse Barbers',
      description: 'View available barbers and their profiles',
      completed: false
    },
    {
      id: 'services',
      title: 'Select Service',
      description: 'Choose from available services and pricing',
      completed: false
    },
    {
      id: 'schedule',
      title: 'Pick Time Slot',
      description: 'Select your preferred date and time',
      completed: false
    },
    {
      id: 'details',
      title: 'Enter Details',
      description: 'Provide contact information',
      completed: false
    },
    {
      id: 'confirm',
      title: 'Confirm Booking',
      description: 'Review and confirm your appointment',
      completed: false
    }
  ]

  useEffect(() => {
    loadDemoData()
  }, [])

  const loadDemoData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load barbers for location 1 (test data)
      const barbersResponse = await bookingService.getBarbers(1)
      setBarbers(barbersResponse.data || [])

      // If we have barbers, load services for the first one
      if (barbersResponse.data && barbersResponse.data.length > 0) {
        const firstBarber = barbersResponse.data[0]
        setSelectedBarber(firstBarber)

        const servicesResponse = await bookingService.getServices({ barber_id: firstBarber.id })
        setServices(servicesResponse.data || [])
      }

    } catch (err: any) {
      console.error('Error loading demo data:', err)
      setError(err.response?.data?.detail || err.message || 'Failed to load demo data')
    } finally {
      setLoading(false)
    }
  }

  const handleStepComplete = (stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]))

    // Move to next step
    const currentIndex = demoSteps.findIndex(step => step.id === stepId)
    if (currentIndex < demoSteps.length - 1) {
      setCurrentStep(currentIndex + 1)
    }
  }

  const handleBookingComplete = (booking: any) => {
    setBookingData(booking)
    handleStepComplete('confirm')
  }

  const renderStepContent = () => {
    const step = demoSteps[currentStep]

    switch (step.id) {
      case 'browse':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Available Barbers</h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : barbers.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {barbers.map((barber) => (
                  <Card
                    key={barber.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedBarber?.id === barber.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => {
                      setSelectedBarber(barber)
                      handleStepComplete('browse')
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{barber.first_name} {barber.last_name}</h4>
                          {barber.business_name && (
                            <p className="text-sm text-gray-600">{barber.business_name}</p>
                          )}
                          <div className="flex items-center mt-1 space-x-2">
                            {barber.average_rating && (
                              <div className="flex items-center">
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                <span className="text-sm ml-1">{barber.average_rating}</span>
                              </div>
                            )}
                            <span className="text-sm text-gray-500">
                              {barber.total_reviews || 0} reviews
                            </span>
                          </div>
                          {barber.bio && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{barber.bio}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  No barbers available. Make sure the backend is running and test data is seeded.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )

      case 'services':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Available Services</h3>
            {selectedBarber && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  Services by {selectedBarber.first_name} {selectedBarber.last_name}
                </p>
              </div>
            )}
            {services.length > 0 ? (
              <div className="grid gap-4">
                {services.map((service) => (
                  <Card
                    key={service.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedService?.id === service.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => {
                      setSelectedService(service)
                      handleStepComplete('services')
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold">{service.name}</h4>
                          {service.description && (
                            <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                          )}
                          <div className="flex items-center mt-2 space-x-4">
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 text-gray-500 mr-1" />
                              <span className="text-sm">{service.duration_minutes} min</span>
                            </div>
                            {service.category_name && (
                              <Badge variant="secondary" className="text-xs">
                                {service.category_name}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">${service.base_price}</div>
                          {service.min_price && service.max_price && service.min_price !== service.max_price && (
                            <div className="text-sm text-gray-500">
                              ${service.min_price} - ${service.max_price}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  No services available for this barber.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )

      case 'schedule':
      case 'details':
      case 'confirm':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Complete Your Booking</h3>
            {selectedBarber && selectedService ? (
              <BookingWidget
                barberId={selectedBarber.id}
                locationId={1}
                serviceId={selectedService.id}
                onBookingComplete={handleBookingComplete}
                embedded={true}
                className="border-0 shadow-none"
              />
            ) : (
              <Alert>
                <AlertDescription>
                  Please select a barber and service first.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )

      default:
        return <div>Unknown step</div>
    }
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Demo Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={loadDemoData} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">6FB Booking System Demo</h1>
          <p className="text-gray-600">
            Experience the complete booking journey from browsing to confirmation
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {demoSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    completedSteps.has(step.id)
                      ? 'bg-green-500 text-white'
                      : index === currentStep
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {completedSteps.has(step.id) ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="ml-2 min-w-0">
                  <div className="text-sm font-medium">{step.title}</div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
                {index < demoSteps.length - 1 && (
                  <div className="w-16 h-px bg-gray-300 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Current Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{demoSteps[currentStep].title}</CardTitle>
            <CardDescription>{demoSteps[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Success Message */}
        {bookingData && (
          <Card className="mt-6 border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="text-lg font-semibold text-green-800">
                    Booking Completed Successfully!
                  </h3>
                  <p className="text-green-700">
                    Your appointment has been confirmed. Confirmation number: {bookingData.confirmation_number}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Development Info */}
        <Card className="mt-6 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">Development Notes</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Backend endpoints: /api/v1/booking-public/* and /api/v1/booking-auth/*</li>
              <li>• Test data includes 2 services and 1 barber for location 1</li>
              <li>• Components are connected to real API endpoints</li>
              <li>• Database migrations have been applied</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default BookingDemoPage
