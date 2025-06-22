'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BookingWidget,
  ServiceSelector,
  AvailabilityCalendar,
  BarberProfile,
  BookingConfirmation
} from '@/components/booking'
import type { BookingDetails } from '@/components/booking'

// Mock data for demonstration
const mockBookingDetails: BookingDetails = {
  id: 'bk_1234567890',
  confirmationNumber: 'BK-2024-001',
  service: {
    name: 'Classic Haircut & Styling',
    duration: 45,
    price: 35
  },
  barber: {
    name: 'Marcus Johnson',
    email: 'marcus@6fbbarber.com',
    phone: '(555) 123-4567'
  },
  location: {
    name: '6FB Downtown',
    address: '123 Main Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    phone: '(555) 987-6543'
  },
  appointmentDate: '2024-07-15',
  appointmentTime: '14:30',
  status: 'confirmed',
  paymentStatus: 'paid',
  clientInfo: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '(555) 456-7890'
  },
  notes: 'First time customer - please take extra time to understand preferences',
  createdAt: '2024-07-10T10:30:00Z'
}

export default function BookingDemoPage() {
  const [activeDemo, setActiveDemo] = useState('widget')
  const [selectedService, setSelectedService] = useState<any>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const handleServiceSelect = (service: any) => {
    setSelectedService(service)
    console.log('Service selected:', service)
  }

  const handleDateTimeSelect = (date: Date, time: string, barber: any) => {
    console.log('Date/time selected:', { date, time, barber })
  }

  const handleBookingComplete = (bookingData: any) => {
    console.log('Booking completed:', bookingData)
    setShowConfirmation(true)
  }

  const handleBookService = (serviceId: number) => {
    console.log('Book service:', serviceId)
  }

  return (
    <div className="relative min-h-full">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-[10px] opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-violet-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
        </div>
      </div>

      <div className="relative z-10 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Booking System Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Interactive demonstration of the 6FB booking system components
          </p>
        </div>

      <Tabs value={activeDemo} onValueChange={setActiveDemo}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="widget">Booking Widget</TabsTrigger>
          <TabsTrigger value="services">Service Selector</TabsTrigger>
          <TabsTrigger value="calendar">Availability Calendar</TabsTrigger>
          <TabsTrigger value="profile">Barber Profile</TabsTrigger>
          <TabsTrigger value="confirmation">Confirmation</TabsTrigger>
        </TabsList>

        {/* Booking Widget Demo */}
        <TabsContent value="widget" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Complete Booking Widget</CardTitle>
              <p className="text-sm text-gray-600">
                Full booking flow with service selection, date/time picking, and confirmation
              </p>
            </CardHeader>
            <CardContent>
              {showConfirmation ? (
                <div className="space-y-4">
                  <BookingConfirmation
                    booking={mockBookingDetails}
                    onNewBooking={() => setShowConfirmation(false)}
                    onViewBookings={() => console.log('View bookings')}
                  />
                </div>
              ) : (
                <BookingWidget
                  onBookingComplete={handleBookingComplete}
                  locationId={1}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Selector Demo */}
        <TabsContent value="services" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Service Selector Component</CardTitle>
              <p className="text-sm text-gray-600">
                Browse and select services with filtering and search capabilities
              </p>
            </CardHeader>
            <CardContent>
              <ServiceSelector
                onServiceSelect={handleServiceSelect}
                selectedService={selectedService}
                locationId={1}
              />
              {selectedService && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <p className="text-green-800">
                    <strong>Selected:</strong> {selectedService.name} - ${selectedService.price} ({selectedService.duration} min)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Availability Calendar Demo */}
        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Availability Calendar</CardTitle>
              <p className="text-sm text-gray-600">
                Interactive calendar showing available time slots for selected services
              </p>
            </CardHeader>
            <CardContent>
              <AvailabilityCalendar
                service={{
                  id: 1,
                  name: 'Classic Haircut',
                  duration: 45,
                  price: 35
                }}
                onDateTimeSelect={handleDateTimeSelect}
                locationId={1}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Barber Profile Demo */}
        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Barber Profile</CardTitle>
              <p className="text-sm text-gray-600">
                Detailed barber information with services, availability, and reviews
              </p>
            </CardHeader>
            <CardContent>
              <BarberProfile
                barberId={1}
                onBookService={handleBookService}
                showBookingButton={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Booking Confirmation Demo */}
        <TabsContent value="confirmation" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking Confirmation</CardTitle>
              <p className="text-sm text-gray-600">
                Confirmation page with booking details and action buttons
              </p>
            </CardHeader>
            <CardContent>
              <BookingConfirmation
                booking={mockBookingDetails}
                onNewBooking={() => console.log('New booking')}
                onViewBookings={() => console.log('View bookings')}
                showAnimation={false}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Component Features */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm">Responsive design</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm">TypeScript support</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm">Loading & error states</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm">API integration ready</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-sm">Tailwind CSS styling</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-sm">Configurable props</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-sm">Event callbacks</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-sm">Embeddable widgets</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Integration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              <span className="text-sm">REST API endpoints</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              <span className="text-sm">Authentication support</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              <span className="text-sm">Error handling</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full" />
              <span className="text-sm">Calendar integration</span>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}
