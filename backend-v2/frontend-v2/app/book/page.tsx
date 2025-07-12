'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  BookingSkipNavigation, 
  MainContent, 
  ServiceSelection, 
  CalendarSection, 
  TimeSlots, 
  BookingForm, 
  BookingSummary 
} from '@/components/ui/SkipNavigation';
import { 
  AccessibleButton, 
  AccessibleInput, 
  screenReaderHelpers, 
  keyboardHelpers,
  useScreenReader,
  generateId 
} from '@/lib/accessibility-helpers';
import { BookingProgressIndicator } from '@/components/ui/ProgressIndicator';
import { CalendarA11yProvider } from '@/components/calendar/CalendarAccessibility';
import { enhancedMockAPI, Service, TimeSlot, BookingConfirmation } from '@/lib/enhanced-mock-api';
import { format, addDays } from 'date-fns';

// Loading states
interface LoadingStates {
  services: boolean;
  slots: boolean;
  booking: boolean;
}

export default function BookPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [focusedServiceIndex, setFocusedServiceIndex] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  
  // Enhanced state for realistic booking
  const [services, setServices] = useState<Service[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [nextAvailable, setNextAvailable] = useState<{date: string, time: string} | null>(null);
  const [businessHours, setBusinessHours] = useState<any>(null);
  const [bookingConfirmation, setBookingConfirmation] = useState<BookingConfirmation | null>(null);
  const [loading, setLoading] = useState<LoadingStates>({
    services: true,
    slots: false,
    booking: false
  });
  const [error, setError] = useState<string | null>(null);

  const { announce, LiveRegion } = useScreenReader();

  // Load services on component mount
  useEffect(() => {
    loadServices();
  }, []);

  // Load slots when date or service changes
  useEffect(() => {
    if (selectedDate && selectedService) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedService]);

  const loadServices = async () => {
    try {
      setLoading(prev => ({ ...prev, services: true }));
      const servicesData = await enhancedMockAPI.getServices();
      setServices(servicesData);
      setError(null);
    } catch (err) {
      setError('Failed to load services. Please try again.');
      console.error('Failed to load services:', err);
    } finally {
      setLoading(prev => ({ ...prev, services: false }));
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedDate || !selectedService) return;
    
    try {
      setLoading(prev => ({ ...prev, slots: true }));
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const slotsData = await enhancedMockAPI.getAvailableSlots(dateStr, selectedService);
      
      setAvailableSlots(slotsData.slots);
      setNextAvailable(slotsData.next_available || null);
      setBusinessHours(slotsData.business_hours);
      setError(null);
      
      // Announce availability
      const availableCount = slotsData.slots.filter(slot => slot.available).length;
      if (availableCount === 0) {
        announce(`No available slots on ${format(selectedDate, 'EEEE, MMMM d')}. ${slotsData.next_available ? `Next available is ${format(new Date(slotsData.next_available.date), 'EEEE, MMMM d')} at ${slotsData.next_available.time}` : 'Please try another date.'}`);
      } else {
        announce(`${availableCount} time slots available on ${format(selectedDate, 'EEEE, MMMM d')}`);
      }
    } catch (err) {
      setError('Failed to load available times. Please try again.');
      console.error('Failed to load slots:', err);
    } finally {
      setLoading(prev => ({ ...prev, slots: false }));
    }
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    const service = services.find(s => s.id === serviceId);
    announce(`Selected service: ${service?.name}`);
    
    // Clear previous slots when service changes
    setAvailableSlots([]);
    setSelectedTime(null);
    
    setTimeout(() => setCurrentStep(2), 500);
  };

  const handleServiceKeyDown = (e: React.KeyboardEvent, index: number, serviceId: string) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        const nextIndex = (index + 1) % services.length;
        setFocusedServiceIndex(nextIndex);
        document.getElementById(`service-${services[nextIndex].id}`)?.focus();
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        const prevIndex = (index - 1 + services.length) % services.length;
        setFocusedServiceIndex(prevIndex);
        document.getElementById(`service-${services[prevIndex].id}`)?.focus();
        break;
      case 'Home':
        e.preventDefault();
        setFocusedServiceIndex(0);
        document.getElementById(`service-${services[0].id}`)?.focus();
        break;
      case 'End':
        e.preventDefault();
        const lastIndex = services.length - 1;
        setFocusedServiceIndex(lastIndex);
        document.getElementById(`service-${services[lastIndex].id}`)?.focus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleServiceSelect(serviceId);
        break;
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    announce(`Selected date: ${date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    })}`);
    setTimeout(() => setCurrentStep(3), 500);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    announce(`Selected time: ${time}`);
    setTimeout(() => setCurrentStep(4), 500);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && phone && selectedService && selectedDate && selectedTime) {
      try {
        setLoading(prev => ({ ...prev, booking: true }));
        
        const bookingData = {
          service_id: selectedService,
          date: format(selectedDate, 'yyyy-MM-dd'),
          time: selectedTime,
          client_info: {
            first_name: name.split(' ')[0] || name,
            last_name: name.split(' ').slice(1).join(' ') || '',
            email,
            phone,
            notes: notes || undefined
          }
        };

        const confirmation = await enhancedMockAPI.createBooking(bookingData);
        setBookingConfirmation(confirmation);
        setCurrentStep(5);
        announce('Booking confirmed successfully! You will receive a confirmation email shortly.');
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to create booking. Please try again.');
        screenReaderHelpers.announce('Booking failed. Please try again.', 'assertive');
      } finally {
        setLoading(prev => ({ ...prev, booking: false }));
      }
    } else {
      screenReaderHelpers.announce('Please fill in all required fields', 'assertive');
    }
  };

  const handleStepClick = (step: number) => {
    if (step <= currentStep) {
      setCurrentStep(step);
      announce(`Navigated to step ${step}`);
    }
  };

  const generateCalendarDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  return (
    <CalendarA11yProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Skip Navigation */}
        <BookingSkipNavigation />

        {/* Live Region for Announcements */}
        <LiveRegion />

        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Book Your Appointment
            </h1>
            <p className="text-lg text-gray-600">
              Own the Chair. Own the Brand.
            </p>
          </header>

          {/* Progress Indicator */}
          <BookingProgressIndicator 
            currentStep={currentStep}
            onStepClick={handleStepClick}
          />

          <MainContent className="max-w-4xl mx-auto">
            {/* Step 1: Service Selection */}
            {currentStep >= 1 && (
              <ServiceSelection className="mb-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                    Choose Your Service
                  </h2>
                  
                  {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-800">{error}</p>
                      <AccessibleButton 
                        variant="secondary" 
                        size="sm" 
                        onClick={loadServices}
                        className="mt-2"
                      >
                        Try Again
                      </AccessibleButton>
                    </div>
                  )}
                  
                  {loading.services ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                      <span className="ml-3 text-gray-600">Loading services...</span>
                    </div>
                  ) : (
                    <div 
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4"
                      role="group"
                      aria-labelledby="service-selection-heading"
                      aria-describedby="service-instructions"
                    >
                      <div id="service-instructions" className="sr-only">
                        Use arrow keys to navigate between services. Press Enter or Space to select.
                      </div>
                      
                      {services.map((service, index) => (
                        <Card
                          key={service.id}
                          id={`service-${service.id}`}
                          interactive
                          selected={selectedService === service.id}
                          className="p-4 cursor-pointer transition-all duration-200 hover:shadow-lg focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                          onClick={() => handleServiceSelect(service.id)}
                          onKeyDown={(e) => handleServiceKeyDown(e, index, service.id)}
                          tabIndex={index === focusedServiceIndex ? 0 : -1}
                          role="button"
                          aria-pressed={selectedService === service.id}
                          aria-label={`${service.name}, $${service.price}, ${service.duration} minutes`}
                        >
                          <CardContent className="text-center p-0">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              {service.name}
                            </h3>
                            <p className="text-2xl font-bold text-primary-600 mb-1">
                              ${service.price}
                            </p>
                            <p className="text-sm text-gray-500">
                              {service.duration} minutes
                            </p>
                            <p className="text-sm text-gray-600 mt-2">
                              {service.description}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </ServiceSelection>
            )}

            {/* Step 2: Date Selection */}
            {currentStep >= 2 && (
              <CalendarSection className="mb-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                    Select Your Date
                  </h2>
                  
                  <div className="grid grid-cols-7 gap-1 sm:gap-2 max-w-2xl mx-auto">
                    {generateCalendarDates().slice(0, 21).map((date, index) => {
                      const isSelected = selectedDate?.toDateString() === date.toDateString();
                      
                      return (
                        <AccessibleButton
                          key={index}
                          variant={isSelected ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => handleDateSelect(date)}
                          className="aspect-square p-1 sm:p-2 text-xs sm:text-sm"
                          aria-pressed={isSelected}
                          aria-label={`${date.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric' 
                          })}${isSelected ? ', selected' : ', available'}`}
                        >
                          {date.getDate()}
                        </AccessibleButton>
                      );
                    })}
                  </div>
                </div>
              </CalendarSection>
            )}

            {/* Step 3: Time Selection */}
            {currentStep >= 3 && (
              <TimeSlots className="mb-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                    Choose Your Time
                  </h2>
                  
                  {selectedDate && businessHours && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>{format(selectedDate, 'EEEE, MMMM d')}</strong> - 
                        Business hours: {businessHours.open} - {businessHours.close}
                        {businessHours.closed && <span className="text-red-600 ml-2">(Closed)</span>}
                      </p>
                    </div>
                  )}
                  
                  {loading.slots ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                      <span className="ml-3 text-gray-600">Loading available times...</span>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 mb-4">No available slots for this date.</p>
                      {nextAvailable && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                          <p className="text-sm text-yellow-800 mb-2">
                            Next available appointment:
                          </p>
                          <AccessibleButton
                            variant="primary"
                            onClick={() => {
                              const nextDate = new Date(nextAvailable.date);
                              setSelectedDate(nextDate);
                              handleDateSelect(nextDate);
                            }}
                          >
                            {format(new Date(nextAvailable.date), 'EEEE, MMM d')} at {nextAvailable.time}
                          </AccessibleButton>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div 
                      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3"
                      role="group"
                      aria-labelledby="time-slots-heading"
                    >
                      {availableSlots.map((slot) => {
                        const isSelected = selectedTime === slot.time;
                        const isDisabled = !slot.available;
                        
                        return (
                          <AccessibleButton
                            key={slot.time}
                            variant={isSelected ? 'primary' : 'secondary'}
                            onClick={() => !isDisabled && handleTimeSelect(slot.time)}
                            className={`py-2 sm:py-3 text-sm ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            aria-pressed={isSelected}
                            disabled={isDisabled}
                            aria-label={`${slot.time}${isDisabled ? ` - ${slot.reason}` : ', available'}`}
                          >
                            {slot.time}
                            {isDisabled && (
                              <span className="block text-xs mt-1 text-gray-500">
                                {slot.reason === 'booked' ? 'Booked' : 
                                 slot.reason === 'break' ? 'Break' : 
                                 slot.reason === 'closed' ? 'Closed' : 'Unavailable'}
                              </span>
                            )}
                            {slot.barber_name && slot.available && (
                              <span className="block text-xs mt-1 text-gray-600">
                                {slot.barber_name}
                              </span>
                            )}
                          </AccessibleButton>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TimeSlots>
            )}

            {/* Step 4: Booking Form */}
            {currentStep >= 4 && (
              <BookingForm className="mb-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                    Your Information
                  </h2>
                  
                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <AccessibleInput
                      label="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      isRequired
                      hint="Enter your first and last name"
                      error={!name && currentStep > 4 ? 'Name is required' : undefined}
                    />
                    
                    <AccessibleInput
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      isRequired
                      hint="We'll send your booking confirmation here"
                      error={!email && currentStep > 4 ? 'Email is required' : undefined}
                    />
                    
                    <AccessibleInput
                      label="Phone Number"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      isRequired
                      hint="For appointment reminders and updates"
                      error={!phone && currentStep > 4 ? 'Phone number is required' : undefined}
                    />
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Special Notes (Optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Any special requests or notes for your barber"
                        aria-describedby="notes-hint"
                      />
                      <p id="notes-hint" className="mt-1 text-sm text-gray-500">
                        Any special requests or notes for your barber
                      </p>
                    </div>
                    
                    <div className="pt-4">
                      <AccessibleButton
                        type="submit"
                        variant="primary"
                        className="w-full py-3"
                        disabled={loading.booking}
                      >
                        {loading.booking ? (
                          <div className="flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Creating Booking...
                          </div>
                        ) : (
                          'Continue to Summary'
                        )}
                      </AccessibleButton>
                    </div>
                  </form>
                </div>
              </BookingForm>
            )}

            {/* Step 5: Booking Summary */}
            {currentStep >= 5 && bookingConfirmation && (
              <BookingSummary className="mb-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      Booking Confirmed!
                    </h2>
                    <p className="text-gray-600">
                      Your appointment has been successfully booked
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
                      <h3 className="font-medium text-green-800 mb-2">Confirmation Details</h3>
                      <p className="text-sm text-green-700">
                        <strong>Confirmation Number:</strong> {bookingConfirmation.confirmation_number}
                      </p>
                      <p className="text-sm text-green-700">
                        <strong>Booking ID:</strong> {bookingConfirmation.id}
                      </p>
                    </div>

                    <div className="border-b pb-4">
                      <h3 className="font-medium text-gray-900">Service</h3>
                      <p className="text-gray-600">
                        {bookingConfirmation.service.name} - ${bookingConfirmation.service.price}
                      </p>
                      <p className="text-sm text-gray-500">
                        Duration: {bookingConfirmation.service.duration} minutes
                      </p>
                      <p className="text-sm text-gray-500">
                        {bookingConfirmation.service.description}
                      </p>
                    </div>
                    
                    <div className="border-b pb-4">
                      <h3 className="font-medium text-gray-900">Date & Time</h3>
                      <p className="text-gray-600">
                        {format(new Date(bookingConfirmation.date), 'EEEE, MMMM d, yyyy')} 
                        <br />
                        {bookingConfirmation.time} - {bookingConfirmation.end_time}
                      </p>
                    </div>
                    
                    <div className="border-b pb-4">
                      <h3 className="font-medium text-gray-900">Barber</h3>
                      <p className="text-gray-600">{bookingConfirmation.barber.name}</p>
                      <p className="text-sm text-gray-500">
                        Rating: {bookingConfirmation.barber.rating}/5.0
                      </p>
                      <p className="text-sm text-gray-500">
                        Specialties: {bookingConfirmation.barber.specialties.join(', ')}
                      </p>
                    </div>
                    
                    <div className="border-b pb-4">
                      <h3 className="font-medium text-gray-900">Contact Information</h3>
                      <p className="text-gray-600">
                        {bookingConfirmation.client_info.first_name} {bookingConfirmation.client_info.last_name}
                      </p>
                      <p className="text-gray-600">{bookingConfirmation.client_info.email}</p>
                      <p className="text-gray-600">{bookingConfirmation.client_info.phone}</p>
                      {bookingConfirmation.client_info.notes && (
                        <p className="text-sm text-gray-500 mt-2">
                          <strong>Notes:</strong> {bookingConfirmation.client_info.notes}
                        </p>
                      )}
                    </div>
                    
                    <div className="border-b pb-4">
                      <h3 className="font-medium text-gray-900">Total</h3>
                      <p className="text-2xl font-bold text-green-600">
                        ${bookingConfirmation.total_price}
                      </p>
                    </div>
                    
                    <div className="pt-4 space-y-3">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <h4 className="font-medium text-blue-800 mb-2">What's Next?</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• You'll receive a confirmation email shortly</li>
                          <li>• We'll send you a reminder 24 hours before your appointment</li>
                          <li>• Arrive 5-10 minutes early to check in</li>
                          <li>• Bring a valid ID and payment method</li>
                        </ul>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <AccessibleButton
                          variant="primary"
                          onClick={() => {
                            // In a real app, this would navigate to calendar or booking management
                            alert('Calendar integration would open here');
                          }}
                          className="w-full"
                        >
                          Add to Calendar
                        </AccessibleButton>
                        
                        <AccessibleButton
                          variant="secondary"
                          onClick={() => {
                            // Reset form for new booking
                            setCurrentStep(1);
                            setSelectedService(null);
                            setSelectedDate(null);
                            setSelectedTime(null);
                            setName('');
                            setEmail('');
                            setPhone('');
                            setNotes('');
                            setBookingConfirmation(null);
                            announce('Starting new booking process');
                          }}
                          className="w-full"
                        >
                          Book Another Appointment
                        </AccessibleButton>
                      </div>
                    </div>
                  </div>
                </div>
              </BookingSummary>
            )}
          </MainContent>
        </div>
      </div>
    </CalendarA11yProvider>
  );
}