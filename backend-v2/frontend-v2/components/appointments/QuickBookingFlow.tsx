'use client'

import { useState, useEffect } from 'react'
import { format, addDays } from 'date-fns'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/LoadingStates'
import { 
  appointmentsAPI,
  getServices,
  getPublicServices,
  getAvailableSlots,
  searchClients,
  type Service,
  type Client,
  type TimeSlot,
  type AppointmentCreate
} from '@/lib/api'
import { formatDateForAPI } from '@/lib/timezone'
import { 
  ClockIcon,
  CalendarIcon,
  UserIcon,
  CheckCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { useToast } from '@/hooks/use-toast'

interface QuickBookingFlowProps {
  preselectedClient?: Client
  preselectedService?: Service
  onSuccess?: (appointment: any) => void
  onCancel?: () => void
  isPublicBooking?: boolean
}

export default function QuickBookingFlow({
  preselectedClient,
  preselectedService,
  onSuccess,
  onCancel,
  isPublicBooking = false
}: QuickBookingFlowProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  
  // Step tracking
  const [currentStep, setCurrentStep] = useState<'service' | 'datetime' | 'confirm'>('service')
  
  // Selection state
  const [selectedService, setSelectedService] = useState<Service | null>(preselectedService || null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(preselectedClient || null)
  
  // Data state
  const [services, setServices] = useState<Service[]>([])
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  
  // Smart suggestions based on history
  const [frequentServices, setFrequentServices] = useState<Service[]>([])
  const [suggestedSlots, setSuggestedSlots] = useState<TimeSlot[]>([])
  
  // Quick date options
  const quickDates = [
    { label: 'Today', date: new Date() },
    { label: 'Tomorrow', date: addDays(new Date(), 1) },
    { label: 'In 2 days', date: addDays(new Date(), 2) },
    { label: 'Next week', date: addDays(new Date(), 7) }
  ]

  // Load services on mount
  useEffect(() => {
    loadServices()
    if (preselectedService) {
      setCurrentStep('datetime')
    }
  }, [preselectedService])

  // Load time slots when service and date change
  useEffect(() => {
    if (selectedService && selectedDate) {
      loadTimeSlots()
    }
  }, [selectedService, selectedDate])

  // Search clients
  useEffect(() => {
    const timer = setTimeout(() => {
      if (clientSearch && clientSearch.length >= 2) {
        searchClientsDebounced(clientSearch)
      } else {
        setClients([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [clientSearch])

  const loadServices = async () => {
    try {
      let response
      if (isPublicBooking) {
        response = await getPublicServices()
      } else {
        try {
          response = await getServices()
        } catch (authError: any) {
          if (authError.status === 401) {
            response = await getPublicServices()
          } else {
            throw authError
          }
        }
      }
      
      const servicesData = response as Service[]
      setServices(servicesData)
      
      // Mock frequent services (in real app, would come from analytics)
      if (servicesData.length > 0) {
        setFrequentServices(servicesData.slice(0, 3))
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to load services. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const loadTimeSlots = async () => {
    if (!selectedDate || !selectedService) return
    
    try {
      setLoadingSlots(true)
      const apiDate = formatDateForAPI(selectedDate)
      
      const response = await getAvailableSlots({
        date: apiDate,
        service_id: selectedService.id
      })
      
      const available = response.slots?.filter(slot => slot.available) || []
      setAvailableSlots(available)
      
      // Set suggested slots (first 3 available)
      setSuggestedSlots(available.slice(0, 3))
      
      // Auto-select if only one slot available
      if (available.length === 1) {
        setSelectedTime(available[0].time)
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to load available times.',
        variant: 'destructive',
      })
    } finally {
      setLoadingSlots(false)
    }
  }

  const searchClientsDebounced = async (searchTerm: string) => {
    try {
      setLoadingClients(true)
      const response = await searchClients(searchTerm)
      setClients(response.clients || [])
    } catch (err) {
      } finally {
      setLoadingClients(false)
    }
  }

  const handleQuickBook = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      toast({
        title: 'Missing Information',
        description: 'Please select all required fields.',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)
      
      const appointmentData: AppointmentCreate = {
        date: formatDateForAPI(selectedDate),
        time: selectedTime,
        service: selectedService.name,
        notes: `Quick booking for ${selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : 'walk-in'}`
      }

      const result = await appointmentsAPI.create(appointmentData)
      
      toast({
        title: 'Success!',
        description: 'Appointment booked successfully.',
      })
      
      onSuccess?.(result)
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to create appointment.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const renderServiceStep = () => (
    <div className="space-y-6">
      {/* Frequent Services */}
      {frequentServices.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <SparklesIcon className="w-4 h-4" />
            Frequently Booked
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {frequentServices.map((service) => (
              <button
                key={service.id}
                onClick={() => {
                  setSelectedService(service)
                  setCurrentStep('datetime')
                }}
                className="p-4 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg text-left transition-colors"
              >
                <div className="font-medium text-gray-900 dark:text-white">{service.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  ${service.base_price} • {service.duration_minutes} min
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* All Services */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">All Services</h3>
        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => {
                setSelectedService(service)
                setCurrentStep('datetime')
              }}
              className={`p-3 border rounded-lg text-left transition-colors ${
                selectedService?.id === service.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="font-medium text-gray-900 dark:text-white">{service.name}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                ${service.base_price} • {service.duration_minutes} min
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const renderDateTimeStep = () => (
    <div className="space-y-6">
      {/* Quick Date Selection */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select Date</h3>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {quickDates.map((option) => (
            <button
              key={option.label}
              onClick={() => setSelectedDate(option.date)}
              className={`p-3 rounded-lg text-center transition-colors ${
                format(selectedDate, 'yyyy-MM-dd') === format(option.date, 'yyyy-MM-dd')
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        
        {/* Date picker */}
        <input
          type="date"
          value={format(selectedDate, 'yyyy-MM-dd')}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          min={format(new Date(), 'yyyy-MM-dd')}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
        />
      </div>

      {/* Time Slots */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Available Times</h3>
        
        {loadingSlots ? (
          <div className="text-center py-8 text-gray-500">Loading available times...</div>
        ) : availableSlots.length > 0 ? (
          <>
            {/* Suggested Times */}
            {suggestedSlots.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Suggested times</p>
                <div className="grid grid-cols-3 gap-2">
                  {suggestedSlots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`p-2 rounded-lg text-center transition-colors ${
                        selectedTime === slot.time
                          ? 'bg-primary-600 text-white'
                          : 'bg-primary-100 dark:bg-primary-900/30 hover:bg-primary-200 dark:hover:bg-primary-900/40'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* All Times */}
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {availableSlots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => setSelectedTime(slot.time)}
                  className={`p-2 rounded text-sm transition-colors ${
                    selectedTime === slot.time
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">No available times for this date</div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep('service')}
        >
          Back
        </Button>
        <Button
          variant="primary"
          onClick={() => setCurrentStep('confirm')}
          disabled={!selectedTime}
        >
          Continue
        </Button>
      </div>
    </div>
  )

  const renderConfirmStep = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 space-y-4">
        <h3 className="font-medium text-gray-900 dark:text-white">Booking Summary</h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <UserIcon className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Client</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : 'Walk-in'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <ClockIcon className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Service</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {selectedService?.name} ({selectedService?.duration_minutes} min)
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Date & Time</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {selectedTime}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Client Search (if not preselected) */}
      {!preselectedClient && (
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Client (Optional)
          </label>
          <input
            type="text"
            placeholder="Search for client..."
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            className="w-full mt-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
          />
          
          {loadingClients && (
            <p className="text-sm text-gray-500 mt-2">Searching...</p>
          )}
          
          {clients.length > 0 && (
            <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg max-h-32 overflow-y-auto">
              {clients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => {
                    setSelectedClient(client)
                    setClientSearch('')
                    setClients([])
                  }}
                  className="w-full p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <p className="font-medium">{client.first_name} {client.last_name}</p>
                  <p className="text-sm text-gray-500">{client.email}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep('datetime')}
        >
          Back
        </Button>
        <LoadingButton
          loading={loading}
          onClick={handleQuickBook}
          className="bg-primary-600 hover:bg-primary-700 text-white"
        >
          <CheckCircleIcon className="w-5 h-5 mr-2" />
          Confirm Booking
        </LoadingButton>
      </div>
    </div>
  )

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Quick Booking</h2>
        <p className="text-gray-600 dark:text-gray-400">Book an appointment in seconds</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        <div className={`flex items-center ${currentStep === 'service' ? 'text-primary-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'service' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}>
            1
          </div>
          <span className="ml-2 text-sm font-medium">Service</span>
        </div>
        
        <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 mx-4" />
        
        <div className={`flex items-center ${currentStep === 'datetime' ? 'text-primary-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'datetime' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}>
            2
          </div>
          <span className="ml-2 text-sm font-medium">Date & Time</span>
        </div>
        
        <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 mx-4" />
        
        <div className={`flex items-center ${currentStep === 'confirm' ? 'text-primary-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep === 'confirm' ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
          }`}>
            3
          </div>
          <span className="ml-2 text-sm font-medium">Confirm</span>
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 'service' && renderServiceStep()}
      {currentStep === 'datetime' && renderDateTimeStep()}
      {currentStep === 'confirm' && renderConfirmStep()}

      {/* Cancel button */}
      {onCancel && (
        <div className="mt-6 text-center">
          <button
            onClick={onCancel}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}