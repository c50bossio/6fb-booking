'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
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
import { BookingProgressIndicator, ProgressBar } from '@/components/ui/ProgressIndicator';
import { CalendarA11yProvider } from '@/components/calendar/CalendarAccessibility';

export default function AccessibilityDemoPage() {
  // Temporarily disabled for deployment
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Accessibility Demo
        </h1>
        <p className="text-gray-600">
          Demo temporarily disabled for deployment. Coming soon!
        </p>
      </div>
    </div>
  );
  
  // Original code disabled
  /*
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [focusedServiceIndex, setFocusedServiceIndex] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const { announce, LiveRegion } = useScreenReader();

  const services = [
    { id: 'haircut', name: 'Classic Haircut', price: '$35', duration: '30 min' },
    { id: 'beard', name: 'Beard Trim', price: '$25', duration: '20 min' },
    { id: 'combo', name: 'Haircut + Beard', price: '$55', duration: '45 min' },
    { id: 'wash', name: 'Wash & Style', price: '$30', duration: '25 min' }
  ];

  const timeSlots = [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', 
    '11:00 AM', '11:30 AM', '2:00 PM', '2:30 PM'
  ];

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    const service = services.find(s => s.id === serviceId);
    announce(`Selected service: ${service?.name}`);
    
    setTimeout(() => {
      setCurrentStep(2);
    }, 500);
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
    
    setTimeout(() => {
      setCurrentStep(3);
    }, 500);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    announce(`Selected time: ${time}`);
    
    setTimeout(() => {
      setCurrentStep(4);
    }, 500);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && phone) {
      setCurrentStep(5);
      announce('Booking form completed successfully');
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
              BookedBarber V2 - Accessibility Demo
            </h1>
            <p className="text-lg text-gray-600">
              Experience our fully accessible booking system
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
                  
                  <div 
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
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
                        className="p-4 cursor-pointer transition-all duration-200"
                        onClick={() => handleServiceSelect(service.id)}
                        onKeyDown={(e) => handleServiceKeyDown(e, index, service.id)}
                        tabIndex={index === focusedServiceIndex ? 0 : -1}
                        role="button"
                        aria-pressed={selectedService === service.id}
                        aria-label={`${service.name}, ${service.price}, ${service.duration}`}
                      >
                        <div className="text-center">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {service.name}
                          </h3>
                          <p className="text-2xl font-bold text-primary-600 mb-1">
                            {service.price}
                          </p>
                          <p className="text-sm text-gray-500">
                            {service.duration}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </ServiceSelection>
            )}

            {/* Step 2: Calendar (Simplified Demo) */}
            {currentStep >= 2 && (
              <CalendarSection className="mb-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                    Select Your Date
                  </h2>
                  
                  <div className="grid grid-cols-7 gap-2 max-w-md mx-auto">
                    {Array.from({ length: 14 }, (_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() + i + 1);
                      const isSelected = selectedDate?.toDateString() === date.toDateString();
                      
                      return (
                        <button
                          key={i}
                          onClick={() => handleDateSelect(date)}
                          className={`
                            p-3 text-sm rounded-lg border transition-all duration-200
                            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                            ${isSelected 
                              ? 'bg-primary-600 text-white border-primary-600' 
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }
                          `}
                          aria-label={`${date.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric' 
                          })}${isSelected ? ', selected' : ', available'}`}
                          aria-pressed={isSelected}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CalendarSection>
            )}

            {/* Step 3: Time Slots */}
            {currentStep >= 3 && (
              <TimeSlots className="mb-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                    Choose Your Time
                  </h2>
                  
                  <div 
                    className="grid grid-cols-2 md:grid-cols-4 gap-3"
                    role="group"
                    aria-labelledby="time-slots-heading"
                  >
                    {timeSlots.map((time) => {
                      const isSelected = selectedTime === time;
                      
                      return (
                        <AccessibleButton
                          key={time}
                          variant={isSelected ? 'primary' : 'secondary'}
                          onClick={() => handleTimeSelect(time)}
                          className="py-3"
                          aria-pressed={isSelected}
                        >
                          {time}
                        </AccessibleButton>
                      );
                    })}
                  </div>
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
                    
                    <div className="pt-4">
                      <AccessibleButton
                        type="submit"
                        variant="primary"
                        className="w-full py-3"
                      >
                        Continue to Summary
                      </AccessibleButton>
                    </div>
                  </form>
                </div>
              </BookingForm>
            )}

            {/* Step 5: Booking Summary */}
            {currentStep >= 5 && (
              <BookingSummary className="mb-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                    Booking Summary
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="border-b pb-4">
                      <h3 className="font-medium text-gray-900">Service</h3>
                      <p className="text-gray-600">
                        {services.find(s => s.id === selectedService)?.name}
                      </p>
                    </div>
                    
                    <div className="border-b pb-4">
                      <h3 className="font-medium text-gray-900">Date & Time</h3>
                      <p className="text-gray-600">
                        {selectedDate?.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric' 
                        })} at {selectedTime}
                      </p>
                    </div>
                    
                    <div className="border-b pb-4">
                      <h3 className="font-medium text-gray-900">Contact Information</h3>
                      <p className="text-gray-600">{name}</p>
                      <p className="text-gray-600">{email}</p>
                      <p className="text-gray-600">{phone}</p>
                    </div>
                    
                    <div className="pt-4">
                      <AccessibleButton
                        variant="primary"
                        className="w-full py-3"
                        onClick={() => {
                          screenReaderHelpers.announce('Booking confirmed successfully!', 'assertive');
                        }}
                      >
                        Confirm Booking
                      </AccessibleButton>
                    </div>
                  </div>
                </div>
              </BookingSummary>
            )}

            {/* Demo Controls */}
            <div className="bg-blue-50 rounded-lg p-6 mt-8">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">
                🎯 Accessibility Demo Controls
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">Keyboard Navigation</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Tab/Shift+Tab: Navigate between elements</li>
                    <li>• Arrow keys: Navigate service cards</li>
                    <li>• Enter/Space: Select items</li>
                    <li>• Home/End: Jump to first/last item</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">Skip Links</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Press Tab to see skip links</li>
                    <li>• Alt+1-6: Quick navigation shortcuts</li>
                    <li>• Click sections in progress indicator</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <AccessibleButton
                  variant="secondary"
                  onClick={() => {
                    announce('Screen reader test: This announcement demonstrates live region functionality');
                  }}
                >
                  Test Screen Reader
                </AccessibleButton>
                
                <AccessibleButton
                  variant="secondary"
                  onClick={() => setCurrentStep(1)}
                >
                  Reset Demo
                </AccessibleButton>
              </div>
              
              <ProgressBar
                current={currentStep}
                total={5}
                label="Demo Progress"
                showPercentage
                className="mt-4"
              />
            </div>
          </MainContent>
        </div>
      </div>
    </CalendarA11yProvider>
  );
  */
}