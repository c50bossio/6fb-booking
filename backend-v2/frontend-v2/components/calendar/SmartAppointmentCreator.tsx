'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { format, addMinutes, parseISO } from 'date-fns'
import { 
  CheckIcon, 
  ClockIcon, 
  UserIcon, 
  TagIcon,
  CalendarIcon,
  BoltIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader } from '../ui/card'
import { 
  getSmartSuggestions, 
  getClientInsights,
  type SchedulingSuggestion,
  type ClientInsights 
} from '@/lib/calendar-ai'
import { useCalendarSecurity } from '@/hooks/useCalendarSecurity'
import { useCalendarHaptics } from '@/hooks/useCalendarHaptics'
import type { BookingResponse } from '@/lib/api'

interface AppointmentTemplate {
  id: string
  name: string
  serviceType: string
  duration: number
  price?: number
  description: string
  defaultNotes?: string
  isPopular: boolean
  category: string
}

interface SmartAppointmentCreatorProps {
  selectedDate: Date
  selectedTime?: string
  onCreateAppointment: (appointment: Partial<BookingResponse>) => Promise<void>
  onClose: () => void
  existingAppointments: BookingResponse[]
  isVisible: boolean
  defaultServiceType?: string
  defaultClientName?: string
}

/**
 * Smart appointment creator with AI suggestions and templates
 * Provides intelligent scheduling recommendations and pattern recognition
 */
export function SmartAppointmentCreator({
  selectedDate,
  selectedTime,
  onCreateAppointment,
  onClose,
  existingAppointments,
  isVisible,
  defaultServiceType = '',
  defaultClientName = ''
}: SmartAppointmentCreatorProps) {
  const [formData, setFormData] = useState({
    clientName: defaultClientName,
    clientEmail: '',
    clientPhone: '',
    serviceType: defaultServiceType,
    duration: 60,
    price: 0,
    notes: '',
    sendReminder: true
  })

  const [selectedTemplate, setSelectedTemplate] = useState<AppointmentTemplate | null>(null)
  const [suggestions, setSuggestions] = useState<SchedulingSuggestion[]>([])
  const [clientInsights, setClientInsights] = useState<ClientInsights | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'manual' | 'template' | 'smart'>('manual')
  const [selectedSuggestion, setSelectedSuggestion] = useState<SchedulingSuggestion | null>(null)

  const { secureFormSubmission, auditSecurityEvent } = useCalendarSecurity()
  const { smartHaptic } = useCalendarHaptics()

  // Predefined appointment templates
  const appointmentTemplates: AppointmentTemplate[] = [
    {
      id: 'haircut_basic',
      name: 'Basic Haircut',
      serviceType: 'Haircut',
      duration: 45,
      price: 35,
      description: 'Standard haircut and styling',
      isPopular: true,
      category: 'Hair Services'
    },
    {
      id: 'haircut_premium',
      name: 'Premium Cut & Style',
      serviceType: 'Premium Haircut',
      duration: 60,
      price: 50,
      description: 'Premium haircut with wash, cut, and styling',
      defaultNotes: 'Includes consultation and styling advice',
      isPopular: true,
      category: 'Hair Services'
    },
    {
      id: 'beard_trim',
      name: 'Beard Trim & Shape',
      serviceType: 'Beard Trim',
      duration: 30,
      price: 25,
      description: 'Professional beard trimming and shaping',
      isPopular: false,
      category: 'Grooming'
    },
    {
      id: 'full_service',
      name: 'Full Service Package',
      serviceType: 'Full Service',
      duration: 90,
      price: 80,
      description: 'Complete grooming package: cut, beard, wash, styling',
      defaultNotes: 'Premium full-service experience',
      isPopular: true,
      category: 'Packages'
    },
    {
      id: 'consultation',
      name: 'Style Consultation',
      serviceType: 'Consultation',
      duration: 30,
      price: 20,
      description: 'Professional styling consultation',
      isPopular: false,
      category: 'Consultation'
    },
    {
      id: 'touch_up',
      name: 'Touch-Up Service',
      serviceType: 'Touch-Up',
      duration: 20,
      price: 15,
      description: 'Quick trim and touch-up',
      isPopular: false,
      category: 'Maintenance'
    }
  ]

  // Load smart suggestions when form data changes
  useEffect(() => {
    if (formData.serviceType && formData.duration && isVisible) {
      setIsLoading(true)
      
      try {
        const smartSuggestions = getSmartSuggestions(
          selectedDate,
          formData.serviceType,
          formData.duration,
          formData.clientName || undefined
        )
        
        setSuggestions(smartSuggestions)
      } catch (error) {
        console.error('Error generating smart suggestions:', error)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }
  }, [selectedDate, formData.serviceType, formData.duration, formData.clientName, isVisible])

  // Load client insights when client name changes
  useEffect(() => {
    if (formData.clientName.trim()) {
      try {
        const insights = getClientInsights(formData.clientName.trim())
        setClientInsights(insights)
      } catch (error) {
        console.error('Error loading client insights:', error)
        setClientInsights(null)
      }
    } else {
      setClientInsights(null)
    }
  }, [formData.clientName])

  // Auto-select first suggestion if available
  useEffect(() => {
    if (suggestions.length > 0 && !selectedSuggestion) {
      setSelectedSuggestion(suggestions[0])
    }
  }, [suggestions, selectedSuggestion])

  // Handle template selection
  const handleTemplateSelect = useCallback((template: AppointmentTemplate) => {
    setSelectedTemplate(template)
    setFormData(prev => ({
      ...prev,
      serviceType: template.serviceType,
      duration: template.duration,
      price: template.price || 0,
      notes: template.defaultNotes || prev.notes
    }))
    setActiveTab('template')
    smartHaptic('select')
    
    auditSecurityEvent('Template Selected', {
      templateId: template.id,
      serviceType: template.serviceType
    })
  }, [smartHaptic, auditSecurityEvent])

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: SchedulingSuggestion) => {
    setSelectedSuggestion(suggestion)
    setActiveTab('smart')
    smartHaptic('select')
    
    auditSecurityEvent('Smart Suggestion Selected', {
      suggestionId: suggestion.id,
      confidence: suggestion.confidence,
      time: suggestion.time
    })
  }, [smartHaptic, auditSecurityEvent])

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    const result = await secureFormSubmission(
      {
        ...formData,
        date: selectedDate,
        time: selectedSuggestion?.time || selectedTime || '09:00',
        templateId: selectedTemplate?.id,
        suggestionId: selectedSuggestion?.id
      },
      async (data) => {
        const startTime = new Date(selectedDate)
        const [hours, minutes] = (selectedSuggestion?.time || selectedTime || '09:00').split(':')
        startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

        const endTime = addMinutes(startTime, data.duration)

        const appointment: Partial<BookingResponse> = {
          client_name: data.clientName,
          client_email: data.clientEmail || undefined,
          client_phone: data.clientPhone || undefined,
          service_name: data.serviceType,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration: data.duration,
          price: data.price || undefined,
          notes: data.notes || undefined,
          status: 'pending'
        }

        await onCreateAppointment(appointment)
        return { success: true }
      },
      'create_appointment'
    )

    if (result.success) {
      smartHaptic('success')
      onClose()
    } else {
      smartHaptic('error')
    }
  }, [
    secureFormSubmission, 
    formData, 
    selectedDate, 
    selectedSuggestion, 
    selectedTime, 
    selectedTemplate, 
    onCreateAppointment, 
    smartHaptic, 
    onClose
  ])

  // Handle input changes
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  // Get current time display
  const currentTime = selectedSuggestion?.time || selectedTime || '09:00'
  
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <SparklesIcon className="w-6 h-6 text-blue-600" />
              Smart Appointment Creator
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {currentTime}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Navigation Tabs */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'manual' 
                  ? 'bg-white dark:bg-gray-700 shadow-sm' 
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <UserIcon className="w-4 h-4 inline mr-2" />
              Manual Entry
            </button>
            <button
              onClick={() => setActiveTab('template')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'template' 
                  ? 'bg-white dark:bg-gray-700 shadow-sm' 
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <TagIcon className="w-4 h-4 inline mr-2" />
              Templates
            </button>
            <button
              onClick={() => setActiveTab('smart')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'smart' 
                  ? 'bg-white dark:bg-gray-700 shadow-sm' 
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <BoltIcon className="w-4 h-4 inline mr-2" />
              AI Suggestions
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Primary Interface */}
            <div className="lg:col-span-2 space-y-4">
              {/* Manual Entry Tab */}
              {activeTab === 'manual' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Client Information */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-lg">Client Information</h3>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Client Name *</label>
                      <input
                        type="text"
                        value={formData.clientName}
                        onChange={(e) => handleInputChange('clientName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                        placeholder="Enter client name"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                          type="email"
                          value={formData.clientEmail}
                          onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="client@example.com"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Phone</label>
                        <input
                          type="tel"
                          value={formData.clientPhone}
                          onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Service Information */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-lg">Service Details</h3>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Service Type *</label>
                      <input
                        type="text"
                        value={formData.serviceType}
                        onChange={(e) => handleInputChange('serviceType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                        placeholder="e.g., Haircut, Beard Trim"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Duration (minutes) *</label>
                        <input
                          type="number"
                          value={formData.duration}
                          onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 60)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="15"
                          max="240"
                          step="15"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Price ($)</label>
                        <input
                          type="number"
                          value={formData.price}
                          onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Additional notes or special requests"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="sendReminder"
                      checked={formData.sendReminder}
                      onChange={(e) => handleInputChange('sendReminder', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="sendReminder" className="text-sm">
                      Send appointment reminder
                    </label>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    <CheckIcon className="w-4 h-4 mr-2" />
                    Create Appointment
                  </Button>
                </form>
              )}

              {/* Template Selection Tab */}
              {activeTab === 'template' && (
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Choose a Template</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {appointmentTemplates.map((template) => (
                      <div
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        className={`
                          p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md
                          ${selectedTemplate?.id === template.id 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm">{template.name}</h4>
                          {template.isPopular && (
                            <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                              Popular
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {template.description}
                        </p>
                        
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center text-gray-500">
                            <ClockIcon className="w-4 h-4 mr-1" />
                            {template.duration} min
                          </div>
                          {template.price && (
                            <div className="font-medium text-green-600">
                              ${template.price}
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-2 text-xs text-gray-500">
                          {template.category}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedTemplate && (
                    <div className="mt-6">
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Client Name *</label>
                          <input
                            type="text"
                            value={formData.clientName}
                            onChange={(e) => handleInputChange('clientName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                            placeholder="Enter client name"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input
                              type="email"
                              value={formData.clientEmail}
                              onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="client@example.com"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Phone</label>
                            <input
                              type="tel"
                              value={formData.clientPhone}
                              onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="(555) 123-4567"
                            />
                          </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                          <CheckIcon className="w-4 h-4 mr-2" />
                          Create from Template
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* Smart Suggestions Tab */}
              {activeTab === 'smart' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-lg">AI Recommendations</h3>
                    {isLoading && (
                      <div className="flex items-center text-sm text-gray-500">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                        Analyzing...
                      </div>
                    )}
                  </div>

                  {suggestions.length > 0 ? (
                    <div className="space-y-3">
                      {suggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          onClick={() => handleSuggestionSelect(suggestion)}
                          className={`
                            p-4 border rounded-lg cursor-pointer transition-all duration-200
                            ${selectedSuggestion?.id === suggestion.id 
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                            }
                          `}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium">
                                {format(suggestion.date, 'h:mm a')} - {suggestion.time}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {suggestion.duration} minutes
                              </p>
                            </div>
                            <div className="flex items-center">
                              <div className={`
                                w-3 h-3 rounded-full mr-2
                                ${suggestion.confidence > 0.8 ? 'bg-green-500' :
                                  suggestion.confidence > 0.6 ? 'bg-yellow-500' :
                                  'bg-orange-500'}
                              `} />
                              <span className="text-sm font-medium">
                                {Math.round(suggestion.confidence * 100)}% match
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {suggestion.reasoning}
                          </p>
                          
                          {suggestion.conflictLevel !== 'none' && (
                            <div className={`
                              flex items-center text-xs px-2 py-1 rounded-full w-fit
                              ${suggestion.conflictLevel === 'high' ? 'bg-red-100 text-red-800' :
                                suggestion.conflictLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'}
                            `}>
                              <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                              {suggestion.conflictLevel} demand
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <BoltIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Enter service details to get AI recommendations</p>
                    </div>
                  )}

                  {selectedSuggestion && formData.serviceType && (
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Client Name *</label>
                        <input
                          type="text"
                          value={formData.clientName}
                          onChange={(e) => handleInputChange('clientName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                          placeholder="Enter client name"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Email</label>
                          <input
                            type="email"
                            value={formData.clientEmail}
                            onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="client@example.com"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Phone</label>
                          <input
                            type="tel"
                            value={formData.clientPhone}
                            onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="(555) 123-4567"
                          />
                        </div>
                      </div>

                      <Button type="submit" className="w-full" disabled={isLoading}>
                        <BoltIcon className="w-4 h-4 mr-2" />
                        Create with AI Suggestion
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Insights & Info */}
            <div className="space-y-4">
              {/* Client Insights */}
              {clientInsights && (
                <Card>
                  <CardHeader className="pb-3">
                    <h3 className="font-medium flex items-center">
                      <UserIcon className="w-4 h-4 mr-2" />
                      Client Insights
                    </h3>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Loyalty Score
                      </div>
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${clientInsights.loyaltyScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {clientInsights.loyaltyScore}/100
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Preferred Times
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {clientInsights.bookingPatterns.preferredTimes.slice(0, 3).map((time, index) => (
                          <span
                            key={index}
                            className="bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full"
                          >
                            {time.hour.toString().padStart(2, '0')}:00
                          </span>
                        ))}
                      </div>
                    </div>

                    {clientInsights.servicePreferences.length > 0 && (
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Preferred Services
                        </div>
                        <div className="space-y-1">
                          {clientInsights.servicePreferences.slice(0, 2).map((service, index) => (
                            <div key={index} className="flex justify-between text-xs">
                              <span>{service.serviceType}</span>
                              <span className="text-gray-500">
                                {Math.round(service.frequency * 100)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {clientInsights.recommendedActions.length > 0 && (
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Recommendations
                        </div>
                        <div className="space-y-1">
                          {clientInsights.recommendedActions.slice(0, 2).map((action, index) => (
                            <div key={index} className="flex items-start text-xs">
                              <InformationCircleIcon className="w-3 h-3 mr-1 mt-0.5 text-blue-500" />
                              <span>{action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Time Selection Info */}
              <Card>
                <CardHeader className="pb-3">
                  <h3 className="font-medium flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Appointment Details
                  </h3>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Date:</span>
                    <span className="font-medium">
                      {format(selectedDate, 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Time:</span>
                    <span className="font-medium">{currentTime}</span>
                  </div>
                  {formData.duration && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                      <span className="font-medium">{formData.duration} min</span>
                    </div>
                  )}
                  {formData.serviceType && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Service:</span>
                      <span className="font-medium">{formData.serviceType}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Tips */}
              <Card>
                <CardHeader className="pb-3">
                  <h3 className="font-medium flex items-center">
                    <SparklesIcon className="w-4 h-4 mr-2" />
                    Quick Tips
                  </h3>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>• Use templates for common services</p>
                    <p>• AI suggestions learn from your patterns</p>
                    <p>• Higher confidence = better time slot</p>
                    <p>• Client insights help with personalization</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SmartAppointmentCreator