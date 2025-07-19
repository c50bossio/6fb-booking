'use client'

import { useState, useEffect } from 'react'
import { format, addDays, setHours, setMinutes } from 'date-fns'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/LoadingStates'
import { Input } from '@/components/ui/input'
import { 
  appointmentsAPI,
  getServices,
  getPublicServices,
  getAllUsers,
  getBarbers,
  getAvailableSlots,
  searchClients,
  createClient,
  type Service,
  type Client,
  type User,
  type TimeSlot,
  type AppointmentCreate,
  type ClientCreate
} from '@/lib/api'
import { formatDateForAPI } from '@/lib/timezone'
import { 
  UserIcon,
  ClockIcon,
  CalendarIcon,
  DocumentTextIcon,
  CheckIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  PlusIcon,
  InformationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useToast } from '@/hooks/use-toast'

interface AppointmentWizardProps {
  onSuccess?: (appointment: any) => void
  onCancel?: () => void
  isPublicBooking?: boolean
}

type WizardStep = 'client' | 'service' | 'barber' | 'datetime' | 'details' | 'review'

interface StepConfig {
  id: WizardStep
  title: string
  description: string
  icon: React.ElementType
  required: boolean
}

const steps: StepConfig[] = [
  {
    id: 'client',
    title: 'Client',
    description: 'Who is this appointment for?',
    icon: UserIcon,
    required: true
  },
  {
    id: 'service',
    title: 'Service',
    description: 'What service would you like?',
    icon: ClockIcon,
    required: true
  },
  {
    id: 'barber',
    title: 'Barber',
    description: 'Choose your preferred barber',
    icon: UserIcon,
    required: false
  },
  {
    id: 'datetime',
    title: 'Date & Time',
    description: 'When would you like to come in?',
    icon: CalendarIcon,
    required: true
  },
  {
    id: 'details',
    title: 'Details',
    description: 'Any special requests or notes?',
    icon: DocumentTextIcon,
    required: false
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Confirm your appointment details',
    icon: CheckIcon,
    required: true
  }
]

export default function AppointmentWizard({
  onSuccess,
  onCancel,
  isPublicBooking = false
}: AppointmentWizardProps) {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState<WizardStep>('client')
  const [loading, setLoading] = useState(false)
  
  // Wizard state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedBarber, setSelectedBarber] = useState<User | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1))
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [sendReminder, setSendReminder] = useState(true)
  
  // Data loading states
  const [services, setServices] = useState<Service[]>([])
  const [barbers, setBarbers] = useState<User[]>([])
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loadingServices, setLoadingServices] = useState(false)
  const [loadingBarbers, setLoadingBarbers] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  
  // Client management
  const [clientSearch, setClientSearch] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [newClientData, setNewClientData] = useState<ClientCreate>({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  })
  
  // Smart suggestions
  const [recentClients, setRecentClients] = useState<Client[]>([])
  const [popularServices, setPopularServices] = useState<Service[]>([])
  const [preferredBarber, setPreferredBarber] = useState<User | null>(null)

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)
  const currentStepConfig = steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1

  // Load initial data
  useEffect(() => {
    loadServices()
    loadBarbers()
    // In a real app, load recent clients and preferences from API
  }, [])

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

  // Load time slots when dependencies change
  useEffect(() => {
    if (selectedService && selectedDate) {
      loadTimeSlots()
    }
  }, [selectedService, selectedDate, selectedBarber])

  const loadServices = async () => {
    try {
      setLoadingServices(true)
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
      
      // Set popular services (mock - would come from analytics)
      if (servicesData.length > 0) {
        setPopularServices(servicesData.slice(0, 3))
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to load services.',
        variant: 'destructive',
      })
    } finally {
      setLoadingServices(false)
    }
  }

  const loadBarbers = async () => {
    try {
      setLoadingBarbers(true)
      const barberUsers = await getBarbers()
      setBarbers(barberUsers)
    } catch (err) {
      // Don't show error for barbers as it's optional
    } finally {
      setLoadingBarbers(false)
    }
  }

  const loadTimeSlots = async () => {
    if (!selectedDate || !selectedService) return
    
    try {
      setLoadingSlots(true)
      const apiDate = formatDateForAPI(selectedDate)
      
      const response = await getAvailableSlots({
        date: apiDate,
        service_id: selectedService.id,
        barber_id: selectedBarber?.id
      })
      
      const available = response.slots?.filter(slot => slot.available) || []
      setAvailableSlots(available)
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

  const handleCreateClient = async () => {
    try {
      setLoading(true)
      const response = await createClient(newClientData)
      setSelectedClient(response as Client)
      setShowNewClientForm(false)
      setNewClientData({ first_name: '', last_name: '', email: '', phone: '' })
      handleNext()
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create client.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id)
    }
  }

  const handlePrevious = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 'client':
        return selectedClient !== null || isPublicBooking
      case 'service':
        return selectedService !== null
      case 'barber':
        return true // Optional step
      case 'datetime':
        return selectedDate !== null && selectedTime !== null
      case 'details':
        return true // Optional step
      case 'review':
        return true
      default:
        return false
    }
  }

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      toast({
        title: 'Missing Information',
        description: 'Please complete all required fields.',
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
        notes: notes || undefined,
        barber_id: selectedBarber?.id
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 'client':
        return renderClientStep()
      case 'service':
        return renderServiceStep()
      case 'barber':
        return renderBarberStep()
      case 'datetime':
        return renderDateTimeStep()
      case 'details':
        return renderDetailsStep()
      case 'review':
        return renderReviewStep()
      default:
        return null
    }
  }

  const renderClientStep = () => (
    <div className="space-y-6">
      {/* Recent Clients */}
      {recentClients.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Recent Clients</h3>
          <div className="grid grid-cols-1 gap-2">
            {recentClients.map((client) => (
              <button
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className={`p-3 rounded-lg text-left transition-colors ${
                  selectedClient?.id === client.id
                    ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-500'
                    : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                } border`}
              >
                <div className="font-medium">{client.first_name} {client.last_name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{client.email}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Client Search */}
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Search Client</label>
        <Input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={clientSearch}
          onChange={(e) => setClientSearch(e.target.value)}
          className="mt-1"
        />
        
        {loadingClients && (
          <p className="text-sm text-gray-500 mt-2">Searching...</p>
        )}
        
        {clients.length > 0 && (
          <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto">
            {clients.map((client) => (
              <button
                key={client.id}
                onClick={() => {
                  setSelectedClient(client)
                  setClientSearch('')
                  setClients([])
                }}
                className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 border-b last:border-b-0"
              >
                <p className="font-medium">{client.first_name} {client.last_name}</p>
                <p className="text-sm text-gray-500">{client.email} • {client.phone}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New Client Option */}
      <div>
        <Button
          variant={showNewClientForm ? 'outline' : 'primary'}
          onClick={() => setShowNewClientForm(!showNewClientForm)}
          className="w-full"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          {showNewClientForm ? 'Cancel New Client' : 'Create New Client'}
        </Button>
      </div>

      {/* New Client Form */}
      {showNewClientForm && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <h4 className="font-medium">New Client Information</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="First name"
              value={newClientData.first_name}
              onChange={(e) => setNewClientData(prev => ({ ...prev, first_name: e.target.value }))}
            />
            <Input
              placeholder="Last name"
              value={newClientData.last_name}
              onChange={(e) => setNewClientData(prev => ({ ...prev, last_name: e.target.value }))}
            />
          </div>
          
          <Input
            type="email"
            placeholder="Email"
            value={newClientData.email}
            onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))}
          />
          
          <Input
            type="tel"
            placeholder="Phone (optional)"
            value={newClientData.phone || ''}
            onChange={(e) => setNewClientData(prev => ({ ...prev, phone: e.target.value }))}
          />
          
          <LoadingButton
            loading={loading}
            onClick={handleCreateClient}
            disabled={!newClientData.first_name || !newClientData.last_name || !newClientData.email}
            className="w-full"
          >
            Create Client & Continue
          </LoadingButton>
        </div>
      )}
    </div>
  )

  const renderServiceStep = () => (
    <div className="space-y-6">
      {/* Popular Services */}
      {popularServices.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Popular Services</h3>
          <div className="grid grid-cols-1 gap-2">
            {popularServices.map((service) => (
              <button
                key={service.id}
                onClick={() => setSelectedService(service)}
                className={`p-4 rounded-lg text-left transition-colors ${
                  selectedService?.id === service.id
                    ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-500'
                    : 'bg-primary-50 dark:bg-primary-900/10 hover:bg-primary-100 dark:hover:bg-primary-900/20'
                } border`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{service.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {service.description || 'Professional service'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${service.base_price}</div>
                    <div className="text-sm text-gray-500">{service.duration_minutes} min</div>
                  </div>
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
          {loadingServices ? (
            <div className="text-center py-8 text-gray-500">Loading services...</div>
          ) : (
            services.map((service) => (
              <button
                key={service.id}
                onClick={() => setSelectedService(service)}
                className={`p-3 rounded-lg text-left transition-colors ${
                  selectedService?.id === service.id
                    ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-500'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                } border`}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{service.name}</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    ${service.base_price} • {service.duration_minutes} min
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )

  const renderBarberStep = () => (
    <div className="space-y-6">
      {/* Any Available Option */}
      <button
        onClick={() => {
          setSelectedBarber(null)
          handleNext()
        }}
        className={`w-full p-4 rounded-lg text-left transition-colors ${
          selectedBarber === null
            ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-500'
            : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
        } border`}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-gray-500" />
          </div>
          <div>
            <div className="font-medium">Any Available Barber</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              First available appointment
            </div>
          </div>
        </div>
      </button>

      {/* Preferred Barber */}
      {preferredBarber && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Your Preferred Barber</h3>
          <button
            onClick={() => setSelectedBarber(preferredBarber)}
            className={`w-full p-4 rounded-lg text-left transition-colors ${
              selectedBarber?.id === preferredBarber.id
                ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-500'
                : 'bg-primary-50 dark:bg-primary-900/10 hover:bg-primary-100 dark:hover:bg-primary-900/20'
            } border`}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <span className="text-lg font-medium text-primary-600 dark:text-primary-400">
                  {preferredBarber.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="font-medium">{preferredBarber.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Your regular barber</div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* All Barbers */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">All Barbers</h3>
        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
          {loadingBarbers ? (
            <div className="text-center py-8 text-gray-500">Loading barbers...</div>
          ) : barbers.length > 0 ? (
            barbers.map((barber) => (
              <button
                key={barber.id}
                onClick={() => setSelectedBarber(barber)}
                className={`p-3 rounded-lg text-left transition-colors ${
                  selectedBarber?.id === barber.id
                    ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-500'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                } border`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="font-medium text-gray-600 dark:text-gray-400">
                      {barber.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{barber.name}</div>
                    <div className="text-sm text-gray-500 capitalize">{barber.role}</div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">No barbers available</div>
          )}
        </div>
      </div>
    </div>
  )

  const renderDateTimeStep = () => (
    <div className="space-y-6">
      {/* Date Selection */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select Date</h3>
        
        {/* Quick date options */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[0, 1, 2, 3, 7, 14].map((days) => {
            const date = addDays(new Date(), days)
            const label = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : format(date, 'EEE, MMM d')
            
            return (
              <button
                key={days}
                onClick={() => setSelectedDate(date)}
                className={`p-2 rounded-lg text-center transition-colors ${
                  format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
        
        {/* Custom date picker */}
        <input
          type="date"
          value={format(selectedDate, 'yyyy-MM-dd')}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          min={format(new Date(), 'yyyy-MM-dd')}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
        />
      </div>

      {/* Time Selection */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Available Times</h3>
        
        {loadingSlots ? (
          <div className="text-center py-8 text-gray-500">
            <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading available times...
          </div>
        ) : availableSlots.length > 0 ? (
          <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {availableSlots.map((slot) => (
              <button
                key={slot.time}
                onClick={() => setSelectedTime(slot.time)}
                className={`p-2 rounded-lg text-center transition-colors ${
                  selectedTime === slot.time
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {slot.time}
                {slot.is_next_available && (
                  <span className="block text-xs mt-1">Next available</span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <InformationCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No available times for this date</p>
            <p className="text-sm text-gray-400 mt-1">Try selecting a different date</p>
          </div>
        )}
      </div>
    </div>
  )

  const renderDetailsStep = () => (
    <div className="space-y-6">
      {/* Notes */}
      <div>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Special Requests or Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any allergies, preferences, or special instructions..."
          rows={4}
          className="w-full mt-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none"
        />
      </div>

      {/* Reminder Preferences */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Reminder Preferences</h3>
        
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={sendReminder}
            onChange={(e) => setSendReminder(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Send appointment reminders
          </span>
        </label>
        
        {sendReminder && (
          <p className="text-xs text-gray-500 ml-7">
            You'll receive reminders 24 hours and 2 hours before your appointment
          </p>
        )}
      </div>

      {/* Helpful Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Tips for your visit</h4>
        <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
          <li>• Arrive 5 minutes early to check in</li>
          <li>• Bring a photo if you want a specific style</li>
          <li>• Let us know about any allergies or sensitivities</li>
          <li>• Cash and card payments accepted</li>
        </ul>
      </div>
    </div>
  )

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-lg">Appointment Summary</h3>
        
        <div className="space-y-3">
          {/* Client */}
          <div className="flex items-start gap-3">
            <UserIcon className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Client</p>
              <p className="font-medium">
                {selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : 'Walk-in'}
              </p>
              {selectedClient?.email && (
                <p className="text-sm text-gray-500">{selectedClient.email}</p>
              )}
            </div>
          </div>
          
          {/* Service */}
          <div className="flex items-start gap-3">
            <ClockIcon className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Service</p>
              <p className="font-medium">{selectedService?.name}</p>
              <p className="text-sm text-gray-500">
                ${selectedService?.base_price} • {selectedService?.duration_minutes} minutes
              </p>
            </div>
          </div>
          
          {/* Barber */}
          <div className="flex items-start gap-3">
            <UserIcon className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Barber</p>
              <p className="font-medium">
                {selectedBarber ? selectedBarber.name : 'Any available barber'}
              </p>
            </div>
          </div>
          
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <CalendarIcon className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Date & Time</p>
              <p className="font-medium">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </p>
              <p className="text-sm text-gray-500">{selectedTime}</p>
            </div>
          </div>
          
          {/* Notes */}
          {notes && (
            <div className="flex items-start gap-3">
              <DocumentTextIcon className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Notes</p>
                <p className="text-sm">{notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Message */}
      <div className="text-center">
        <CheckIcon className="w-12 h-12 text-green-500 mx-auto mb-2" />
        <p className="text-gray-600 dark:text-gray-400">
          Ready to confirm your appointment?
        </p>
      </div>
    </div>
  )

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Book an Appointment</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Follow the steps to book your appointment</p>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isActive = currentStepIndex === index
            const isCompleted = currentStepIndex > index
            
            return (
              <div key={step.id} className="flex items-center">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-primary-600 text-white' :
                    isCompleted ? 'bg-green-500 text-white' :
                    'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}>
                    {isCompleted ? (
                      <CheckIcon className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    isActive ? 'text-primary-600' :
                    isCompleted ? 'text-green-600' :
                    'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                </div>
                
                {index < steps.length - 1 && (
                  <div className={`w-12 lg:w-20 h-1 mx-2 ${
                    currentStepIndex > index ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <currentStepConfig.icon className="w-5 h-5" />
            {currentStepConfig.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {currentStepConfig.description}
          </p>
        </div>

        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            {!isFirstStep && (
              <Button
                variant="outline"
                onClick={handlePrevious}
              >
                <ChevronLeftIcon className="w-5 h-5 mr-1" />
                Previous
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
            
            {isLastStep ? (
              <LoadingButton
                loading={loading}
                onClick={handleSubmit}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                <CheckIcon className="w-5 h-5 mr-2" />
                Confirm Booking
              </LoadingButton>
            ) : (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Next
                <ChevronRightIcon className="w-5 h-5 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}