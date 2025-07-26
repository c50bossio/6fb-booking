'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Modal, ModalBody } from '../ui/Modal'
import { Button } from '../ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import {
  CogIcon,
  ArrowLeftIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  WrenchScrewdriverIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  PlusIcon,
  MinusIcon,
} from '@heroicons/react/24/outline'
import { BookingLinkGenerator, generateBookingURL } from '@/lib/booking-link-generator'
import { BookingLinkParams, ServiceInfo, BarberInfo, LocationInfo } from '@/types/booking-links'

interface LinkCustomizerProps {
  isOpen: boolean
  onClose: () => void
  onBack?: () => void
  businessName?: string
  services?: ServiceInfo[]
  barbers?: BarberInfo[]
  locations?: LocationInfo[]
  mode?: 'set-parameters' | 'quick'
}

interface FormErrors {
  [key: string]: string
}

const MOCK_SERVICES: ServiceInfo[] = [
  { id: 1, name: 'Haircut', slug: 'haircut', duration: 30, price: 30, category: 'hair', isActive: true },
  { id: 2, name: 'Shave', slug: 'shave', duration: 20, price: 20, category: 'shave', isActive: true },
  { id: 3, name: 'Haircut & Shave', slug: 'haircut-shave', duration: 45, price: 45, category: 'combo', isActive: true },
  { id: 4, name: 'Beard Trim', slug: 'beard-trim', duration: 15, price: 15, category: 'beard', isActive: true },
  { id: 5, name: 'Hair Wash', slug: 'hair-wash', duration: 10, price: 10, category: 'hair', isActive: true },
]

const MOCK_BARBERS: BarberInfo[] = [
  { id: 1, name: 'Marcus Johnson', slug: 'marcus', email: 'marcus@6fb.com', isActive: true, services: [1, 2, 3, 4], timezone: 'America/New_York', locationId: 1 },
  { id: 2, name: 'David Smith', slug: 'david', email: 'david@6fb.com', isActive: true, services: [1, 3, 5], timezone: 'America/New_York', locationId: 1 },
  { id: 3, name: 'James Wilson', slug: 'james', email: 'james@6fb.com', isActive: true, services: [1, 2, 4, 5], timezone: 'America/New_York', locationId: 2 },
]

const MOCK_LOCATIONS: LocationInfo[] = [
  { id: 1, name: 'Downtown Location', slug: 'downtown', address: '123 Main St', city: 'New York', state: 'NY', zipCode: '10001', phone: '(555) 123-4567', timezone: 'America/New_York', isActive: true, organizationId: 1 },
  { id: 2, name: 'Uptown Location', slug: 'uptown', address: '456 Broadway', city: 'New York', state: 'NY', zipCode: '10002', phone: '(555) 987-6543', timezone: 'America/New_York', isActive: true, organizationId: 1 },
  { id: 3, name: 'Brooklyn Location', slug: 'brooklyn', address: '789 Atlantic Ave', city: 'Brooklyn', state: 'NY', zipCode: '11201', phone: '(555) 555-1234', timezone: 'America/New_York', isActive: true, organizationId: 1 },
]

const LinkCustomizer: React.FC<LinkCustomizerProps> = ({
  isOpen,
  onClose,
  onBack,
  businessName = 'Your Business',
  services = MOCK_SERVICES,
  barbers = MOCK_BARBERS,
  locations = MOCK_LOCATIONS,
  mode = 'set-parameters'
}) => {
  // Form state
  const [linkParams, setLinkParams] = useState<BookingLinkParams>({})
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [selectedBarbers, setSelectedBarbers] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [timeRange, setTimeRange] = useState({ start: '', end: '' })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [urlGenerationError, setUrlGenerationError] = useState<string | null>(null)

  // URL generation
  const linkGenerator = useMemo(() => {
    const generator = new BookingLinkGenerator('https://book.6fb.com/your-business')
    generator.setServices(services)
    generator.setBarbers(barbers)
    generator.setLocations(locations)
    return generator
  }, [services, barbers, locations])

  // Generated URL
  const generatedUrl = useMemo(() => {
    const params: BookingLinkParams = {
      ...linkParams,
    }

    // Handle services properly
    if (selectedServices.length === 1) {
      params.service = selectedServices[0]
    } else if (selectedServices.length > 1) {
      params.service = selectedServices // This will be handled as array by the generator
    }

    // Handle barbers properly
    if (selectedBarbers.length === 1) {
      params.barber = selectedBarbers[0]
    } else if (selectedBarbers.length > 1) {
      params.barber = selectedBarbers // This will be handled as array by the generator
    }

    // Handle locations properly (single location or array)
    if (selectedLocations.length === 1) {
      params.location = selectedLocations[0]
    } else if (selectedLocations.length > 1) {
      params.locations = selectedLocations
    }

    // Handle date parameters - prefer specific date over range
    if (linkParams.date) {
      params.date = linkParams.date
      // Clear any conflicting date range
    } else if (dateRange.start && dateRange.end) {
      params.dateRange = `${dateRange.start},${dateRange.end}`
    }

    // Handle time parameters - prefer specific time over range
    if (linkParams.time) {
      params.time = linkParams.time
      // Clear any conflicting time range
    } else if (timeRange.start && timeRange.end) {
      params.timeRange = `${timeRange.start},${timeRange.end}`
    }

    // Remove undefined, null, and empty values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => {
        if (value === undefined || value === null || value === '') return false
        if (Array.isArray(value) && value.length === 0) return false
        return true
      })
    )

    try {
      const url = linkGenerator.generateURL(cleanParams)
      setUrlGenerationError(null) // Clear any previous errors
      return url
    } catch (error) {
      console.error('Failed to generate URL:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setUrlGenerationError(`URL generation failed: ${errorMessage}`)
      return 'https://book.6fb.com/your-business' // Fallback URL
    }
  }, [linkParams, selectedServices, selectedBarbers, selectedLocations, dateRange, timeRange, linkGenerator])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setLinkParams({})
      setSelectedServices([])
      setSelectedBarbers([])
      setSelectedLocations([])
      setDateRange({ start: '', end: '' })
      setTimeRange({ start: '', end: '' })
      setFormErrors({})
      setCopiedUrl(false)
      setUrlGenerationError(null)
      if (mode === 'quick') {
        setShowAdvanced(false)
      }
    }
  }, [isOpen, mode])

  // Handle parameter changes
  const updateParam = (key: keyof BookingLinkParams, value: any) => {
    setLinkParams(prev => {
      const newParams = { ...prev, [key]: value }
      
      // Clear conflicting date parameters
      if (key === 'date' && value) {
        // Clear date range when specific date is set
        setDateRange({ start: '', end: '' })
      }
      if (key === 'time' && value) {
        // Clear time range when specific time is set
        setTimeRange({ start: '', end: '' })
      }
      
      return newParams
    })
    
    // Clear related error
    if (formErrors[key]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[key]
        return newErrors
      })
    }
  }

  // Handle date range changes with conflict resolution
  const updateDateRange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
    
    // Clear specific date when date range is set
    if (value && linkParams.date) {
      setLinkParams(prev => ({ ...prev, date: undefined }))
    }
    
    // Trigger validation after state update
    setTimeout(() => validateForm(), 0)
  }

  // Handle time range changes with conflict resolution  
  const updateTimeRange = (field: 'start' | 'end', value: string) => {
    setTimeRange(prev => ({ ...prev, [field]: value }))
    
    // Clear specific time when time range is set
    if (value && linkParams.time) {
      setLinkParams(prev => ({ ...prev, time: undefined }))
    }
    
    // Trigger validation after state update
    setTimeout(() => validateForm(), 0)
  }

  // Handle service selection
  const toggleService = (serviceSlug: string) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceSlug)) {
        return prev.filter(s => s !== serviceSlug)
      }
      return [...prev, serviceSlug]
    })
  }

  // Handle barber selection
  const toggleBarber = (barberSlug: string) => {
    setSelectedBarbers(prev => {
      if (prev.includes(barberSlug)) {
        return prev.filter(b => b !== barberSlug)
      }
      return [...prev, barberSlug]
    })
  }

  // Handle location selection
  const toggleLocation = (locationSlug: string) => {
    setSelectedLocations(prev => {
      if (prev.includes(locationSlug)) {
        return prev.filter(l => l !== locationSlug)
      }
      return [...prev, locationSlug]
    })
  }

  // Copy URL to clipboard
  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  // Validate form
  const validateForm = (): boolean => {
    const errors: FormErrors = {}

    // Validate date range
    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start)
      const endDate = new Date(dateRange.end)
      
      if (startDate >= endDate) {
        errors.dateRange = 'Start date must be before end date'
      }
      
      // Check if dates are in the future
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Reset time for date comparison
      
      if (startDate < today) {
        errors.dateRange = 'Start date must be in the future'
      }
    }

    // Validate time range with proper time comparison
    if (timeRange.start && timeRange.end) {
      const [startHour, startMin] = timeRange.start.split(':').map(Number)
      const [endHour, endMin] = timeRange.end.split(':').map(Number)
      
      const startMinutes = startHour * 60 + startMin
      const endMinutes = endHour * 60 + endMin
      
      if (startMinutes >= endMinutes) {
        errors.timeRange = 'Start time must be before end time'
      }
      
      // Check for reasonable business hours (6 AM to 11 PM)
      if (startMinutes < 360 || endMinutes > 1380) {
        errors.timeRange = 'Please select reasonable business hours (6 AM - 11 PM)'
      }
    }

    // Validate specific date
    if (linkParams.date) {
      const selectedDate = new Date(linkParams.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (selectedDate < today) {
        errors.date = 'Date must be in the future'
      }
    }

    // Validate specific time (if date is today, time must be in future)
    if (linkParams.time && linkParams.date) {
      const selectedDate = new Date(linkParams.date)
      const today = new Date()
      
      if (selectedDate.toDateString() === today.toDateString()) {
        const [hour, min] = linkParams.time.split(':').map(Number)
        const selectedMinutes = hour * 60 + min
        const currentMinutes = today.getHours() * 60 + today.getMinutes()
        
        if (selectedMinutes <= currentMinutes) {
          errors.time = 'Time must be in the future for today\'s date'
        }
      }
    }

    // Validate numeric parameters
    if (linkParams.leadTime !== undefined) {
      if (linkParams.leadTime < 0) {
        errors.leadTime = 'Lead time cannot be negative'
      }
      if (linkParams.leadTime > 168) { // 1 week max
        errors.leadTime = 'Lead time cannot exceed 168 hours (1 week)'
      }
    }

    if (linkParams.maxAdvance !== undefined) {
      if (linkParams.maxAdvance < 1) {
        errors.maxAdvance = 'Max advance days must be at least 1'
      }
      if (linkParams.maxAdvance > 365) { // 1 year max
        errors.maxAdvance = 'Max advance cannot exceed 365 days'
      }
    }

    if (linkParams.duration !== undefined) {
      if (linkParams.duration < 5 || linkParams.duration > 480) {
        errors.duration = 'Duration must be between 5 and 480 minutes (8 hours)'
      }
    }

    // Check for conflicting parameters
    if ((dateRange.start || dateRange.end) && linkParams.date) {
      errors.conflictingDates = 'Cannot set both date range and specific date. Please choose one.'
    }

    if ((timeRange.start || timeRange.end) && linkParams.time) {
      errors.conflictingTimes = 'Cannot set both time range and specific time. Please choose one.'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Reset to defaults
  const resetToDefaults = () => {
    setLinkParams({})
    setSelectedServices([])
    setSelectedBarbers([])
    setSelectedLocations([])
    setDateRange({ start: '', end: '' })
    setTimeRange({ start: '', end: '' })
    setFormErrors({})
    setUrlGenerationError(null)
  }

  // Apply configuration
  const applyConfiguration = () => {
    if (validateForm()) {
      // Here you would typically save the configuration or trigger a callback
      console.log('Link configuration applied:', {
        params: linkParams,
        services: selectedServices,
        barbers: selectedBarbers,
        locations: selectedLocations,
        dateRange,
        timeRange,
        url: generatedUrl
      })
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'set-parameters' ? 'Set Appointment Parameters' : 'Generate Booking Link'}
      size="2xl"
      position="top"
      variant="default"
      className="max-w-3xl"
      adaptivePositioning={true}
      closeOnOverlayClick={true}
      closeOnEscape={true}
      zIndex={60}
    >
      <ModalBody className="pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          {onBack && (
            <Button
              onClick={onBack}
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeftIcon className="w-4 h-4" />}
            >
              Back
            </Button>
          )}
          <div className="flex-1 text-center">
            <p className="text-ios-body text-ios-gray-600 dark:text-ios-gray-400">
              {mode === 'set-parameters' 
                ? 'Configure specific parameters for your booking link to pre-fill customer selections.'
                : 'Generate a quick booking link with your current settings.'
              }
            </p>
          </div>
          <Button
            onClick={resetToDefaults}
            variant="ghost"
            size="sm"
            className="text-ios-gray-500 hover:text-accent-600"
          >
            Reset
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Service Selection */}
            <Card variant="elevated" padding="lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-ios bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <WrenchScrewdriverIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-ios-headline font-semibold text-accent-900 dark:text-white">
                  Select Services
                </h3>
              </div>
              <p className="text-ios-footnote text-ios-gray-600 dark:text-ios-gray-400 mb-4">
                Choose which services to pre-select in the booking form.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map(service => (
                  <div
                    key={service.id}
                    onClick={() => toggleService(service.slug)}
                    className={`p-3 rounded-ios-lg border-2 cursor-pointer transition-all duration-200 ${
                      selectedServices.includes(service.slug)
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-ios-gray-200 dark:border-ios-gray-700 hover:border-primary-300 dark:hover:border-primary-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-accent-900 dark:text-white">
                          {service.name}
                        </div>
                        <div className="text-ios-caption1 text-ios-gray-600 dark:text-ios-gray-400">
                          {service.duration} min • ${service.price}
                        </div>
                      </div>
                      {selectedServices.includes(service.slug) && (
                        <CheckIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Barber Selection */}
            <Card variant="elevated" padding="lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-ios bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-accent-600 dark:text-accent-400" />
                </div>
                <h3 className="text-ios-headline font-semibold text-accent-900 dark:text-white">
                  Select Barbers
                </h3>
              </div>
              <p className="text-ios-footnote text-ios-gray-600 dark:text-ios-gray-400 mb-4">
                Choose which barbers to show as available options.
              </p>
              <div className="grid grid-cols-1 gap-3">
                {barbers.map(barber => (
                  <div
                    key={barber.id}
                    onClick={() => toggleBarber(barber.slug)}
                    className={`p-3 rounded-ios-lg border-2 cursor-pointer transition-all duration-200 ${
                      selectedBarbers.includes(barber.slug)
                        ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
                        : 'border-ios-gray-200 dark:border-ios-gray-700 hover:border-accent-300 dark:hover:border-accent-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-accent-900 dark:text-white">
                          {barber.name}
                        </div>
                        <div className="text-ios-caption1 text-ios-gray-600 dark:text-ios-gray-400">
                          {barber.services.length} services available
                        </div>
                      </div>
                      {selectedBarbers.includes(barber.slug) && (
                        <CheckIcon className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Location Selection */}
            {locations.length > 0 && (
              <Card variant="elevated" padding="lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-ios bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
                    <CogIcon className="w-4 h-4 text-warning-600 dark:text-warning-400" />
                  </div>
                  <h3 className="text-ios-headline font-semibold text-accent-900 dark:text-white">
                    Select Locations
                  </h3>
                </div>
                <p className="text-ios-footnote text-ios-gray-600 dark:text-ios-gray-400 mb-4">
                  Choose which locations to include for multi-location businesses.
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {locations.map(location => (
                    <div
                      key={location.id}
                      onClick={() => toggleLocation(location.slug)}
                      className={`p-3 rounded-ios-lg border-2 cursor-pointer transition-all duration-200 ${
                        selectedLocations.includes(location.slug)
                          ? 'border-warning-500 bg-warning-50 dark:bg-warning-900/20'
                          : 'border-ios-gray-200 dark:border-ios-gray-700 hover:border-warning-300 dark:hover:border-warning-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-accent-900 dark:text-white">
                            {location.name}
                          </div>
                          <div className="text-ios-caption1 text-ios-gray-600 dark:text-ios-gray-400">
                            {location.address}, {location.city}, {location.state}
                          </div>
                        </div>
                        {selectedLocations.includes(location.slug) && (
                          <CheckIcon className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Date & Time Configuration */}
            {mode === 'set-parameters' && (
              <Card variant="elevated" padding="lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-ios bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                    <CalendarIcon className="w-4 h-4 text-success-600 dark:text-success-400" />
                  </div>
                  <h3 className="text-ios-headline font-semibold text-accent-900 dark:text-white">
                    Date & Time Constraints
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date Range */}
                  <div>
                    <label className="block text-ios-footnote font-medium text-ios-gray-700 dark:text-ios-gray-300 mb-2">
                      Date Range (Optional)
                    </label>
                    <div className="space-y-2">
                      <Input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => updateDateRange('start', e.target.value)}
                        placeholder="Start Date"
                        className="w-full"
                      />
                      <Input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => updateDateRange('end', e.target.value)}
                        placeholder="End Date"
                        className="w-full"
                      />
                    </div>
                    {formErrors.dateRange && (
                      <p className="text-error-500 text-ios-caption1 mt-1">{formErrors.dateRange}</p>
                    )}
                    {formErrors.conflictingDates && (
                      <p className="text-warning-500 text-ios-caption1 mt-1">{formErrors.conflictingDates}</p>
                    )}
                  </div>

                  {/* Time Range */}
                  <div>
                    <label className="block text-ios-footnote font-medium text-ios-gray-700 dark:text-ios-gray-300 mb-2">
                      Time Range (Optional)
                    </label>
                    <div className="space-y-2">
                      <Input
                        type="time"
                        value={timeRange.start}
                        onChange={(e) => updateTimeRange('start', e.target.value)}
                        placeholder="Start Time"
                        className="w-full"
                      />
                      <Input
                        type="time"
                        value={timeRange.end}
                        onChange={(e) => updateTimeRange('end', e.target.value)}
                        placeholder="End Time"
                        className="w-full"
                      />
                    </div>
                    {formErrors.timeRange && (
                      <p className="text-error-500 text-ios-caption1 mt-1">{formErrors.timeRange}</p>
                    )}
                    {formErrors.conflictingTimes && (
                      <p className="text-warning-500 text-ios-caption1 mt-1">{formErrors.conflictingTimes}</p>
                    )}
                  </div>
                </div>

                {/* Specific Date/Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-ios-footnote font-medium text-ios-gray-700 dark:text-ios-gray-300 mb-2">
                      Specific Date
                    </label>
                    <Input
                      type="date"
                      value={linkParams.date || ''}
                      onChange={(e) => updateParam('date', e.target.value)}
                      className="w-full"
                    />
                    {formErrors.date && (
                      <p className="text-error-500 text-ios-caption1 mt-1">{formErrors.date}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-ios-footnote font-medium text-ios-gray-700 dark:text-ios-gray-300 mb-2">
                      Specific Time
                    </label>
                    <Input
                      type="time"
                      value={linkParams.time || ''}
                      onChange={(e) => updateParam('time', e.target.value)}
                      className="w-full"
                    />
                    {formErrors.time && (
                      <p className="text-error-500 text-ios-caption1 mt-1">{formErrors.time}</p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Advanced Settings */}
            {mode === 'set-parameters' && (
              <Card variant="elevated" padding="lg">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-3 mb-4 w-full"
                >
                  <div className="w-8 h-8 rounded-ios bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
                    <CogIcon className="w-4 h-4 text-warning-600 dark:text-warning-400" />
                  </div>
                  <h3 className="text-ios-headline font-semibold text-accent-900 dark:text-white flex-1 text-left">
                    Advanced Settings
                  </h3>
                  {showAdvanced ? (
                    <ChevronUpIcon className="w-5 h-5 text-ios-gray-500" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-ios-gray-500" />
                  )}
                </button>

                {showAdvanced && (
                  <div className="space-y-4">
                    {/* Booking Constraints */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-ios-footnote font-medium text-ios-gray-700 dark:text-ios-gray-300 mb-2">
                          Lead Time (hours)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={linkParams.leadTime || ''}
                          onChange={(e) => updateParam('leadTime', parseInt(e.target.value) || undefined)}
                          placeholder="24"
                          className="w-full"
                        />
                        {formErrors.leadTime && (
                          <p className="text-error-500 text-ios-caption1 mt-1">{formErrors.leadTime}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-ios-footnote font-medium text-ios-gray-700 dark:text-ios-gray-300 mb-2">
                          Max Advance (days)
                        </label>
                        <Input
                          type="number"
                          min="1"
                          value={linkParams.maxAdvance || ''}
                          onChange={(e) => updateParam('maxAdvance', parseInt(e.target.value) || undefined)}
                          placeholder="30"
                          className="w-full"
                        />
                        {formErrors.maxAdvance && (
                          <p className="text-error-500 text-ios-caption1 mt-1">{formErrors.maxAdvance}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-ios-footnote font-medium text-ios-gray-700 dark:text-ios-gray-300 mb-2">
                          Duration (minutes)
                        </label>
                        <Input
                          type="number"
                          min="5"
                          max="480"
                          value={linkParams.duration || ''}
                          onChange={(e) => updateParam('duration', parseInt(e.target.value) || undefined)}
                          placeholder="30"
                          className="w-full"
                        />
                        {formErrors.duration && (
                          <p className="text-error-500 text-ios-caption1 mt-1">{formErrors.duration}</p>
                        )}
                      </div>
                    </div>

                    {/* Special Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="quickBook"
                          checked={linkParams.quickBook || false}
                          onChange={(e) => updateParam('quickBook', e.target.checked)}
                          className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <label htmlFor="quickBook" className="text-ios-footnote font-medium text-ios-gray-700 dark:text-ios-gray-300">
                          Enable Quick Booking
                        </label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="recurring"
                          checked={linkParams.recurring || false}
                          onChange={(e) => updateParam('recurring', e.target.checked)}
                          className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <label htmlFor="recurring" className="text-ios-footnote font-medium text-ios-gray-700 dark:text-ios-gray-300">
                          Enable Recurring Options
                        </label>
                      </div>
                    </div>

                    {/* Campaign Tracking */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-ios-footnote font-medium text-ios-gray-700 dark:text-ios-gray-300 mb-2">
                          Campaign Name
                        </label>
                        <Input
                          type="text"
                          value={linkParams.campaign || ''}
                          onChange={(e) => updateParam('campaign', e.target.value)}
                          placeholder="summer-promotion"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-ios-footnote font-medium text-ios-gray-700 dark:text-ios-gray-300 mb-2">
                          Source
                        </label>
                        <Input
                          type="text"
                          value={linkParams.source || ''}
                          onChange={(e) => updateParam('source', e.target.value)}
                          placeholder="instagram"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* URL Preview Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <Card variant="elevated" padding="lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-ios bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <LinkIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="text-ios-headline font-semibold text-accent-900 dark:text-white">
                    Generated Link
                  </h3>
                </div>

                {/* URL Display */}
                <div className="bg-ios-gray-50 dark:bg-dark-surface-100 rounded-ios-lg p-4 mb-4">
                  <div className="break-all text-ios-footnote font-mono text-primary-600 dark:text-primary-400">
                    {generatedUrl}
                  </div>
                  {urlGenerationError && (
                    <div className="mt-2 p-2 bg-error-50 dark:bg-error-950/20 border border-error-200 dark:border-error-800 rounded">
                      <p className="text-xs text-error-700 dark:text-error-300">{urlGenerationError}</p>
                    </div>
                  )}
                </div>

                {/* Copy Button */}
                <Button
                  onClick={copyUrl}
                  variant={copiedUrl ? "success" : "primary"}
                  size="md"
                  fullWidth
                  leftIcon={copiedUrl ? 
                    <CheckIcon className="w-4 h-4" /> : 
                    <ClipboardDocumentIcon className="w-4 h-4" />
                  }
                  className="mb-4"
                >
                  {copiedUrl ? 'Copied!' : 'Copy Link'}
                </Button>

                {/* Parameter Summary */}
                <div className="space-y-3">
                  <h4 className="text-ios-subheadline font-medium text-accent-900 dark:text-white">
                    Link Parameters
                  </h4>
                  
                  {selectedServices.length > 0 && (
                    <div>
                      <span className="text-ios-caption1 font-medium text-ios-gray-700 dark:text-ios-gray-300">
                        Services:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedServices.map(serviceSlug => {
                          const service = services.find(s => s.slug === serviceSlug)
                          return (
                            <span
                              key={serviceSlug}
                              className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-ios text-ios-caption2 font-medium"
                            >
                              {service?.name || serviceSlug}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {selectedBarbers.length > 0 && (
                    <div>
                      <span className="text-ios-caption1 font-medium text-ios-gray-700 dark:text-ios-gray-300">
                        Barbers:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedBarbers.map(barberSlug => {
                          const barber = barbers.find(b => b.slug === barberSlug)
                          return (
                            <span
                              key={barberSlug}
                              className="px-2 py-1 bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 rounded-ios text-ios-caption2 font-medium"
                            >
                              {barber?.name || barberSlug}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {selectedLocations.length > 0 && (
                    <div>
                      <span className="text-ios-caption1 font-medium text-ios-gray-700 dark:text-ios-gray-300">
                        Locations:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedLocations.map(locationSlug => {
                          const location = locations.find(l => l.slug === locationSlug)
                          return (
                            <span
                              key={locationSlug}
                              className="px-2 py-1 bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300 rounded-ios text-ios-caption2 font-medium"
                            >
                              {location?.name || locationSlug}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {(linkParams.date || dateRange.start || dateRange.end) && (
                    <div>
                      <span className="text-ios-caption1 font-medium text-ios-gray-700 dark:text-ios-gray-300">
                        Date:
                      </span>
                      <div className="text-ios-caption1 text-ios-gray-600 dark:text-ios-gray-400 mt-1">
                        {linkParams.date ? (
                          <span className="flex items-center gap-1">
                            <span>Specific: {linkParams.date}</span>
                            <span className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs">Active</span>
                          </span>
                        ) : dateRange.start && dateRange.end ? (
                          <span className="flex items-center gap-1">
                            <span>Range: {dateRange.start} to {dateRange.end}</span>
                            <span className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs">Active</span>
                          </span>
                        ) : dateRange.start ? (
                          <span className="text-warning-600 dark:text-warning-400">Incomplete range: {dateRange.start} to ?</span>
                        ) : dateRange.end ? (
                          <span className="text-warning-600 dark:text-warning-400">Incomplete range: ? to {dateRange.end}</span>
                        ) : (
                          'Any date'
                        )}
                      </div>
                    </div>
                  )}

                  {(linkParams.time || timeRange.start || timeRange.end) && (
                    <div>
                      <span className="text-ios-caption1 font-medium text-ios-gray-700 dark:text-ios-gray-300">
                        Time:
                      </span>
                      <div className="text-ios-caption1 text-ios-gray-600 dark:text-ios-gray-400 mt-1">
                        {linkParams.time ? (
                          <span className="flex items-center gap-1">
                            <span>Specific: {linkParams.time}</span>
                            <span className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs">Active</span>
                          </span>
                        ) : timeRange.start && timeRange.end ? (
                          <span className="flex items-center gap-1">
                            <span>Range: {timeRange.start} to {timeRange.end}</span>
                            <span className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs">Active</span>
                          </span>
                        ) : timeRange.start ? (
                          <span className="text-warning-600 dark:text-warning-400">Incomplete range: {timeRange.start} to ?</span>
                        ) : timeRange.end ? (
                          <span className="text-warning-600 dark:text-warning-400">Incomplete range: ? to {timeRange.end}</span>
                        ) : (
                          'Any time'
                        )}
                      </div>
                    </div>
                  )}

                  {Object.keys(linkParams).length === 0 && selectedServices.length === 0 && selectedBarbers.length === 0 && selectedLocations.length === 0 && (
                    <div className="text-ios-caption1 text-ios-gray-500 dark:text-ios-gray-500 text-center py-4">
                      No parameters set. This will generate a standard booking link.
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-6 space-y-3">
                  {mode === 'set-parameters' && (
                    <Button
                      onClick={applyConfiguration}
                      variant="primary"
                      size="md"
                      fullWidth
                    >
                      Apply Configuration
                    </Button>
                  )}
                  <Button
                    onClick={onClose}
                    variant="outline"
                    size="md"
                    fullWidth
                  >
                    {mode === 'set-parameters' ? 'Close' : 'Done'}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </ModalBody>
    </Modal>
  )
}

export default LinkCustomizer