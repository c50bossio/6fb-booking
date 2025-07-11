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
import { BookingLinkParams, ServiceInfo, BarberInfo } from '@/types/booking-links'

interface LinkCustomizerProps {
  isOpen: boolean
  onClose: () => void
  onBack?: () => void
  businessName?: string
  services?: ServiceInfo[]
  barbers?: BarberInfo[]
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
  { id: 1, name: 'Marcus Johnson', slug: 'marcus', email: 'marcus@6fb.com', isActive: true, services: [1, 2, 3, 4], timezone: 'America/New_York' },
  { id: 2, name: 'David Smith', slug: 'david', email: 'david@6fb.com', isActive: true, services: [1, 3, 5], timezone: 'America/New_York' },
  { id: 3, name: 'James Wilson', slug: 'james', email: 'james@6fb.com', isActive: true, services: [1, 2, 4, 5], timezone: 'America/New_York' },
]

const LinkCustomizer: React.FC<LinkCustomizerProps> = ({
  isOpen,
  onClose,
  onBack,
  businessName = 'Your Business',
  services = MOCK_SERVICES,
  barbers = MOCK_BARBERS,
  mode = 'set-parameters'
}) => {
  // Form state
  const [linkParams, setLinkParams] = useState<BookingLinkParams>({})
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [selectedBarbers, setSelectedBarbers] = useState<string[]>([])
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [timeRange, setTimeRange] = useState({ start: '', end: '' })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [copiedUrl, setCopiedUrl] = useState(false)

  // URL generation
  const linkGenerator = useMemo(() => {
    const generator = new BookingLinkGenerator('https://book.6fb.com/your-business')
    generator.setServices(services)
    generator.setBarbers(barbers)
    return generator
  }, [services, barbers])

  // Generated URL
  const generatedUrl = useMemo(() => {
    const params: BookingLinkParams = {
      ...linkParams,
      service: selectedServices.length === 1 ? selectedServices[0] : selectedServices.length > 1 ? selectedServices : undefined,
      barber: selectedBarbers.length === 1 ? selectedBarbers[0] : selectedBarbers.length > 1 ? selectedBarbers : undefined,
      dateRange: dateRange.start && dateRange.end ? `${dateRange.start},${dateRange.end}` : undefined,
      timeRange: timeRange.start && timeRange.end ? `${timeRange.start},${timeRange.end}` : undefined,
    }

    // Remove undefined values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined && value !== '' && value !== null)
    )

    try {
      return linkGenerator.generateURL(cleanParams)
    } catch (error) {
      console.error('Failed to generate URL:', error)
      return 'https://book.6fb.com/your-business'
    }
  }, [linkParams, selectedServices, selectedBarbers, dateRange, timeRange, linkGenerator])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setLinkParams({})
      setSelectedServices([])
      setSelectedBarbers([])
      setDateRange({ start: '', end: '' })
      setTimeRange({ start: '', end: '' })
      setFormErrors({})
      setCopiedUrl(false)
      if (mode === 'quick') {
        setShowAdvanced(false)
      }
    }
  }, [isOpen, mode])

  // Handle parameter changes
  const updateParam = (key: keyof BookingLinkParams, value: any) => {
    setLinkParams(prev => ({
      ...prev,
      [key]: value
    }))
    // Clear related error
    if (formErrors[key]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[key]
        return newErrors
      })
    }
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

    if (dateRange.start && dateRange.end) {
      if (new Date(dateRange.start) >= new Date(dateRange.end)) {
        errors.dateRange = 'Start date must be before end date'
      }
    }

    if (timeRange.start && timeRange.end) {
      if (timeRange.start >= timeRange.end) {
        errors.timeRange = 'Start time must be before end time'
      }
    }

    if (linkParams.leadTime && linkParams.leadTime < 0) {
      errors.leadTime = 'Lead time cannot be negative'
    }

    if (linkParams.maxAdvance && linkParams.maxAdvance < 1) {
      errors.maxAdvance = 'Max advance days must be at least 1'
    }

    if (linkParams.duration && (linkParams.duration < 5 || linkParams.duration > 480)) {
      errors.duration = 'Duration must be between 5 and 480 minutes'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Reset to defaults
  const resetToDefaults = () => {
    setLinkParams({})
    setSelectedServices([])
    setSelectedBarbers([])
    setDateRange({ start: '', end: '' })
    setTimeRange({ start: '', end: '' })
    setFormErrors({})
  }

  // Apply configuration
  const applyConfiguration = () => {
    if (validateForm()) {
      // Here you would typically save the configuration or trigger a callback
      console.log('Applying configuration:', {
        params: linkParams,
        services: selectedServices,
        barbers: selectedBarbers,
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
      size="3xl"
      position="center"
      variant="default"
      className="max-w-4xl"
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
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        placeholder="Start Date"
                        className="w-full"
                      />
                      <Input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        placeholder="End Date"
                        className="w-full"
                      />
                    </div>
                    {formErrors.dateRange && (
                      <p className="text-error-500 text-ios-caption1 mt-1">{formErrors.dateRange}</p>
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
                        onChange={(e) => setTimeRange(prev => ({ ...prev, start: e.target.value }))}
                        placeholder="Start Time"
                        className="w-full"
                      />
                      <Input
                        type="time"
                        value={timeRange.end}
                        onChange={(e) => setTimeRange(prev => ({ ...prev, end: e.target.value }))}
                        placeholder="End Time"
                        className="w-full"
                      />
                    </div>
                    {formErrors.timeRange && (
                      <p className="text-error-500 text-ios-caption1 mt-1">{formErrors.timeRange}</p>
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

                  {(dateRange.start || dateRange.end || linkParams.date) && (
                    <div>
                      <span className="text-ios-caption1 font-medium text-ios-gray-700 dark:text-ios-gray-300">
                        Date:
                      </span>
                      <div className="text-ios-caption1 text-ios-gray-600 dark:text-ios-gray-400 mt-1">
                        {linkParams.date ? (
                          `Specific: ${linkParams.date}`
                        ) : dateRange.start && dateRange.end ? (
                          `Range: ${dateRange.start} to ${dateRange.end}`
                        ) : (
                          'Any date'
                        )}
                      </div>
                    </div>
                  )}

                  {(timeRange.start || timeRange.end || linkParams.time) && (
                    <div>
                      <span className="text-ios-caption1 font-medium text-ios-gray-700 dark:text-ios-gray-300">
                        Time:
                      </span>
                      <div className="text-ios-caption1 text-ios-gray-600 dark:text-ios-gray-400 mt-1">
                        {linkParams.time ? (
                          `Specific: ${linkParams.time}`
                        ) : timeRange.start && timeRange.end ? (
                          `Range: ${timeRange.start} to ${timeRange.end}`
                        ) : (
                          'Any time'
                        )}
                      </div>
                    </div>
                  )}

                  {Object.keys(linkParams).length === 0 && selectedServices.length === 0 && selectedBarbers.length === 0 && (
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