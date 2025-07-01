'use client'

import { useState, useEffect } from 'react'
import { useDemoMode } from '@/components/demo/DemoModeProvider'
import DemoWrapper from '@/components/demo/DemoWrapper'
import Calendar from '@/components/Calendar'
import TimeSlots from '@/components/TimeSlots'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { 
  formatDateForAPI, 
  parseAPIDate, 
  formatTimeWithTimezone, 
  getTimezoneDisplayName,
  getFriendlyDateLabel,
  isToday as checkIsToday,
  isTomorrow as checkIsTomorrow
} from '@/lib/timezone'
import { addDays, format } from 'date-fns'

const DEMO_SERVICES = [
  { id: 'haircut', name: 'Haircut', duration: '30 min', price: '$45', amount: 45 },
  { id: 'shave', name: 'Beard Trim', duration: '20 min', price: '$25', amount: 25 },
  { id: 'combo', name: 'Haircut & Beard Trim', duration: '45 min', price: '$65', amount: 65 },
  { id: 'styling', name: 'Hair Styling', duration: '25 min', price: '$35', amount: 35 }
]

const DEMO_TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
]

export default function DemoBookPage() {
  const { mockData, user } = useDemoMode()
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [guestInfo, setGuestInfo] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  })
  const [bookingConfirmed, setBookingConfirmed] = useState(false)

  // Generate available dates (next 30 days, excluding past dates)
  const availableDates = []
  for (let i = 0; i < 30; i++) {
    const date = addDays(new Date(), i)
    // Skip weekends for demo (make it more realistic)
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      availableDates.push(date)
    }
  }

  // Mock available time slots based on selected date
  const getAvailableTimeSlots = (date: Date) => {
    if (!date) return []
    
    // Simulate some slots being taken
    const dayOfMonth = date.getDate()
    const takenSlots = DEMO_TIME_SLOTS.filter((_, index) => 
      (dayOfMonth + index) % 3 === 0 // Every 3rd slot is "taken"
    )
    
    return DEMO_TIME_SLOTS.filter(slot => !takenSlots.includes(slot))
  }

  const selectedServiceObj = DEMO_SERVICES.find(service => service.id === selectedService)
  const availableTimeSlots = selectedDate ? getAvailableTimeSlots(selectedDate) : []

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId)
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

  const handleBookingSubmit = () => {
    // Simulate booking confirmation
    setBookingConfirmed(true)
    setStep(4)
  }

  const handleNewBooking = () => {
    setStep(1)
    setSelectedService(null)
    setSelectedDate(null)
    setSelectedTime(null)
    setGuestInfo({ first_name: '', last_name: '', email: '', phone: '' })
    setBookingConfirmed(false)
  }

  const demoFeatures = [
    'Select from realistic service options with pricing',
    'Choose from available dates (weekends excluded for realism)',
    'See dynamic time slot availability',
    'Complete the full booking experience with form submission'
  ]

  if (bookingConfirmed) {
    return (
      <DemoWrapper
        title="Booking Confirmed!"
        description="Your appointment has been successfully scheduled"
        demoFeatures={[]}
      >
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardContent className="p-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Booking Confirmed!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your appointment has been successfully scheduled.
              </p>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6 text-left">
                <h3 className="font-semibold mb-4">Appointment Details:</h3>
                <div className="space-y-2">
                  <div><strong>Service:</strong> {selectedServiceObj?.name}</div>
                  <div><strong>Date:</strong> {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}</div>
                  <div><strong>Time:</strong> {selectedTime}</div>
                  <div><strong>Duration:</strong> {selectedServiceObj?.duration}</div>
                  <div><strong>Price:</strong> {selectedServiceObj?.price}</div>
                  <div><strong>Barber:</strong> {user.first_name} {user.last_name}</div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  📱 In a real booking system:
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-400 text-left space-y-1">
                  <li>• Confirmation email would be sent automatically</li>
                  <li>• SMS reminder 24 hours before appointment</li>
                  <li>• Calendar invitation with location details</li>
                  <li>• Payment processing integration</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={handleNewBooking} size="lg">
                  Book Another Appointment
                </Button>
                <Button variant="outline" size="lg" onClick={() => window.location.href = '/demo/calendar'}>
                  View Calendar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DemoWrapper>
    )
  }

  return (
    <DemoWrapper
      title="Book an Appointment"
      description="Experience our streamlined booking process"
      demoFeatures={demoFeatures}
    >
      <div className="max-w-4xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNum 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div className={`w-12 h-0.5 ${
                    step > stepNum ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {step === 1 && 'Choose Service'}
              {step === 2 && 'Select Date & Time'}
              {step === 3 && 'Your Information'}
            </div>
          </div>
        </div>

        {/* Step 1: Service Selection */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Service</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DEMO_SERVICES.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleServiceSelect(service.id)}
                    className={`p-6 border-2 rounded-lg text-left transition-all hover:border-primary-500 hover:shadow-lg ${
                      selectedService === service.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <h3 className="font-semibold text-lg mb-2">{service.name}</h3>
                    <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                      <span>Duration: {service.duration}</span>
                      <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                        {service.price}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Date & Time Selection */}
        {step === 2 && selectedServiceObj && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Date</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedServiceObj.name} • {selectedServiceObj.duration} • {selectedServiceObj.price}
                </p>
              </CardHeader>
              <CardContent>
                <Calendar
                  selectedDate={selectedDate}
                  onDateSelect={handleDateSelect}
                  bookingDates={availableDates}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Available Times</CardTitle>
                {selectedDate && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {!selectedDate ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    Please select a date to see available times
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {availableTimeSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => handleTimeSelect(time)}
                        className={`p-3 border rounded-lg text-center transition-all hover:border-primary-500 ${
                          selectedTime === time
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Guest Information */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedServiceObj?.name} on {selectedDate && format(selectedDate, 'MMM d, yyyy')} at {selectedTime}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={guestInfo.first_name}
                      onChange={(e) => setGuestInfo(prev => ({ ...prev, first_name: e.target.value }))}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={guestInfo.last_name}
                      onChange={(e) => setGuestInfo(prev => ({ ...prev, last_name: e.target.value }))}
                      placeholder="Enter your last name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={guestInfo.email}
                      onChange={(e) => setGuestInfo(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={guestInfo.phone}
                      onChange={(e) => setGuestInfo(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                  <h3 className="font-semibold mb-4">Appointment Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Service:</span>
                      <span>{selectedServiceObj?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date:</span>
                      <span>{selectedDate && format(selectedDate, 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time:</span>
                      <span>{selectedTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{selectedServiceObj?.duration}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-semibold">
                        <span>Total:</span>
                        <span>{selectedServiceObj?.price}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleBookingSubmit}
                    className="w-full mt-6"
                    size="lg"
                    disabled={!guestInfo.first_name || !guestInfo.last_name || !guestInfo.email}
                  >
                    Confirm Booking
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back Button */}
        {step > 1 && step < 4 && (
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          </div>
        )}
      </div>
    </DemoWrapper>
  )
}