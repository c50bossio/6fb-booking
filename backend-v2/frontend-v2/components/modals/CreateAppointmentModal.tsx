'use client'

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { LoadingButton, ErrorDisplay } from '@/components/LoadingStates'
import { Input } from '@/components/ui/input'
import { 
  searchClients,
  createClient,
  getServices,
  getPublicServices,
  getUsers,
  getAllUsers,
  getBarbers,
  getAvailableSlots,
  appointmentsAPI,
  createRecurringPattern,
  type Client,
  type Service,
  type User,
  type SlotsResponse,
  type TimeSlot,
  type AppointmentCreate
} from '@/lib/api'
import { formatDateForAPI } from '@/lib/timezone'
import { 
  ChevronDownIcon,
  CalendarDaysIcon,
  UserIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
// Demo mode imports removed - not needed for production

interface CreateAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  preselectedDate?: Date
  preselectedTime?: string
  onSuccess?: () => void
  isPublicBooking?: boolean  // Flag to indicate if this is a public/guest booking
}

export default function CreateAppointmentModal({
  isOpen,
  onClose,
  preselectedDate,
  preselectedTime,
  onSuccess,
  isPublicBooking = false
}: CreateAppointmentModalProps) {
  // Production mode - no demo mode support
  
  // State
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (preselectedDate) return preselectedDate
    // Default to tomorrow since today often has no available slots
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow
  })
  const [selectedTime, setSelectedTime] = useState<string | null>(preselectedTime || null)
  const [sendNotification, setSendNotification] = useState(true)
  const [notes, setNotes] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringPattern, setRecurringPattern] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly')
  
  // Client search/create state
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [showCreateClient, setShowCreateClient] = useState(false)
  
  // Service state
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [loadingServices, setLoadingServices] = useState(false)
  
  // Barber state
  const [selectedBarber, setSelectedBarber] = useState<User | null>(null)
  const [isBarberDropdownOpen, setIsBarberDropdownOpen] = useState(false)
  const [barbers, setBarbers] = useState<User[]>([])
  const [loadingBarbers, setLoadingBarbers] = useState(false)
  
  // Service cache reference (stored in module scope for persistence)
  const servicesCacheRef = useRef<{ services: Service[], timestamp: number } | null>(null)
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  
  // Time slots state
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  
  // New client form
  const [newClientData, setNewClientData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  })
  
  // General state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Refs for dropdown management
  const clientDropdownRef = useRef<HTMLDivElement>(null)
  const serviceDropdownRef = useRef<HTMLDivElement>(null)
  const timeDropdownRef = useRef<HTMLDivElement>(null)
  const barberDropdownRef = useRef<HTMLDivElement>(null)

  // Reset modal state
  const resetModal = () => {
    setSelectedClient(null)
    setSelectedService(null)
    setSelectedBarber(null)
    setSelectedDate(preselectedDate || (() => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow
    })())
    setSelectedTime(preselectedTime || null)
    setSendNotification(true)
    setNotes('')
    setIsRecurring(false)
    setRecurringPattern('weekly')
    setClientSearch('')
    setClients([])
    setBarbers([])
    setShowCreateClient(false)
    setNewClientData({ first_name: '', last_name: '', email: '', phone: '' })
    setError(null)
    setIsClientDropdownOpen(false)
    setIsServiceDropdownOpen(false)
    setIsBarberDropdownOpen(false)
    setIsTimeDropdownOpen(false)
  }
  
  // Clear services cache (useful when services might have changed)
  const clearServicesCache = () => {
    servicesCacheRef.current = null
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setIsClientDropdownOpen(false)
      }
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
        setIsServiceDropdownOpen(false)
      }
      if (barberDropdownRef.current && !barberDropdownRef.current.contains(event.target as Node)) {
        setIsBarberDropdownOpen(false)
      }
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target as Node)) {
        setIsTimeDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load services and barbers on mount
  useEffect(() => {
    if (isOpen) {
      console.log('📱 CreateAppointmentModal opened', {
        isPublicBooking,
        hasToken: !!localStorage.getItem('token')
      })
      loadServices()
      loadBarbers()
    }
  }, [isOpen, isPublicBooking])

  // Load time slots when date, service, or barber changes
  useEffect(() => {
    console.log('🔄 CreateAppointmentModal - Time slots useEffect triggered', {
      selectedDate,
      selectedService,
      selectedBarber,
      condition: selectedDate && selectedService
    })
    
    if (selectedDate && selectedService) {
      console.log('✅ Both date and service selected, loading time slots...')
      loadTimeSlots()
    } else {
      console.log('❌ Missing required selection:', {
        hasDate: !!selectedDate,
        hasService: !!selectedService
      })
    }
  }, [selectedDate, selectedService, selectedBarber])

  // Update preselected values when props change
  useEffect(() => {
    setSelectedDate(preselectedDate || (() => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow
    })())
    setSelectedTime(preselectedTime || null)
  }, [preselectedDate, preselectedTime])

  const loadServices = async () => {
    // Check cache first
    if (servicesCacheRef.current) {
      const { services: cachedServices, timestamp } = servicesCacheRef.current
      const now = Date.now()
      if (now - timestamp < CACHE_DURATION) {
        console.log('📦 Using cached services')
        setServices(cachedServices)
        return
      }
    }
    
    try {
      setLoadingServices(true)
      let response
      
      if (isPublicBooking) {
        // For public booking, always use public endpoint
        response = await getPublicServices()
      } else {
        // Try authenticated endpoint first
        try {
          response = await getServices()
        } catch (authError: any) {
          // If authentication fails, try public endpoint
          if (authError.status === 401 || authError.message?.includes('401') || authError.message?.includes('Authentication failed')) {
            console.log('Auth failed, trying public services endpoint...')
            response = await getPublicServices()
          } else {
            throw authError
          }
        }
      }
      
      const servicesData = response as Service[]
      setServices(servicesData)
      
      // Cache the services
      servicesCacheRef.current = {
        services: servicesData,
        timestamp: Date.now()
      }
    } catch (err: any) {
      console.error('Failed to load services:', err)
      
      // Provide more specific error messages
      if (err.message?.includes('Network') || err.message?.includes('Failed to connect')) {
        setError('Unable to connect to server. Please check your connection and try again.')
      } else if (err.response?.status === 404) {
        setError('Services endpoint not found. Please contact support.')
      } else {
        setError('Failed to load services. Please try again.')
      }
    } finally {
      setLoadingServices(false)
    }
  }

  const loadBarbers = async () => {
    try {
      setLoadingBarbers(true)
      console.log('🔍 loadBarbers called - isPublicBooking:', isPublicBooking)
      
      {
        console.log('🌐 Production mode: Fetching barbers from API...')
        // Try authenticated endpoint first (for calendar consistency)
        try {
          const barberUsers = await getAllUsers('barber')
          console.log('💼 Barber users from authenticated API:', barberUsers)
          setBarbers(barberUsers)
        } catch (authError: any) {
          // If authentication fails, fall back to public barbers endpoint
          if (authError.status === 401 || authError.status === 403 || authError.message?.includes('401') || authError.message?.includes('403')) {
            console.log('🔓 Auth failed, using public barbers endpoint...')
            const publicBarbers = await getBarbers()
            console.log('💼 Public barbers from API:', publicBarbers)
            setBarbers(publicBarbers)
          } else {
            throw authError
          }
        }
      }
    } catch (err: any) {
      console.error('❌ Failed to load barbers:', err)
      console.error('Error details:', {
        message: err.message,
        status: err.status,
        response: err.response?.data
      })
      // Don't show error for barbers loading as it's not critical
      // The appointment can still be created without barber selection
    } finally {
      setLoadingBarbers(false)
    }
  }

  const loadTimeSlots = async () => {
    console.log('📍 loadTimeSlots called', {
      selectedDate,
      selectedService,
      selectedBarber,
      serviceName: selectedService?.name,
      serviceId: selectedService?.id,
      barberId: selectedBarber?.id,
      barberName: selectedBarber?.name
    })
    
    if (!selectedDate || !selectedService) {
      console.log('⚠️ Early return from loadTimeSlots - missing date or service')
      return
    }
    
    try {
      setLoadingSlots(true)
      const apiDate = formatDateForAPI(selectedDate)
      console.log('🔍 Calling getAvailableSlots API with params:', {
        date: apiDate,
        service_id: selectedService.id,
        barber_id: selectedBarber?.id,
        // Production mode
      })
      
      const response = await getAvailableSlots({
        date: apiDate,
        service_id: selectedService.id,
        barber_id: selectedBarber?.id
      })
      
      console.log('📦 API Response:', {
        hasSlots: !!response.slots,
        slotsCount: response.slots?.length || 0,
        nextAvailable: response.next_available,
        businessHours: response.business_hours,
        slotDuration: response.slot_duration_minutes
      })
      
      // Filter only available slots and extract the available TimeSlot objects
      const availableSlots = response.slots?.filter(slot => slot.available) || []
      
      console.log('✨ Available slots after filtering:', {
        count: availableSlots.length,
        slots: availableSlots.map(s => ({ time: s.time, isNextAvailable: s.is_next_available }))
      })
      
      // If no slots are marked as available but we have slots returned,
      // this might be a backend issue. Log for debugging.
      if (availableSlots.length === 0 && response.slots?.length > 0) {
        console.warn('⚠️ Backend returned slots but none are marked available. This might be a barber filtering issue.')
        console.log('All slots returned:', response.slots)
      }
      
      setAvailableSlots(availableSlots)
    } catch (err) {
      console.error('❌ Failed to load time slots:', err)
      setError('Failed to load available times')
    } finally {
      setLoadingSlots(false)
    }
  }

  const searchClientsDebounced = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setClients([])
      return
    }

    try {
      setLoadingClients(true)
      const response = await searchClients(searchTerm)
      setClients(response.clients || [])
    } catch (err) {
      console.error('Failed to search clients:', err)
    } finally {
      setLoadingClients(false)
    }
  }

  // Debounce client search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (clientSearch) {
        searchClientsDebounced(clientSearch)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [clientSearch])

  const handleCreateClient = async () => {
    try {
      setLoading(true)
      const response = await createClient(newClientData)
      setSelectedClient(response as Client)
      setShowCreateClient(false)
      setIsClientDropdownOpen(false)
      setNewClientData({ first_name: '', last_name: '', email: '', phone: '' })
    } catch (err) {
      console.error('Failed to create client:', err)
      setError('Failed to create client')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      setError('Please fill in all required fields')
      return
    }
    
    // Client selection is only required for admin/barber users creating appointments for clients
    // Regular users and public bookings book for themselves
    if (!isPublicBooking && !selectedClient) {
      console.log('No client selected - user is booking for themselves')
    }

    try {
      setLoading(true)
      setError(null)

      // Use standardized appointment API that matches backend schema
      const appointmentData: AppointmentCreate = {
        date: formatDateForAPI(selectedDate),
        time: selectedTime,
        service: selectedService.name,
        notes: notes || undefined,
        barber_id: selectedBarber?.id
      }

      console.log('🚀 Creating appointment with data:', appointmentData)
      const result = await appointmentsAPI.create(appointmentData)
      console.log('✅ Appointment created successfully:', result)

      // Create recurring pattern if enabled
      if (isRecurring) {
        console.log('Creating recurring pattern:', recurringPattern)
        
        try {
          const recurringData: import('@/lib/api').RecurringPatternCreate = {
            pattern_type: recurringPattern,
            preferred_time: time.format('HH:mm'),
            duration_minutes: selectedService?.duration || 30,
            start_date: selectedDate.toISOString().split('T')[0],
            end_date: undefined, // Could add UI for end date later
            occurrences: 10, // Default to 10 occurrences, could make this configurable
            days_of_week: recurringPattern === 'weekly' || recurringPattern === 'biweekly' ? 
              [selectedDate.getDay()] : undefined,
            barber_id: selectedBarber?.id,
            service_id: selectedService?.id
          }
          
          const pattern = await createRecurringPattern(recurringData)
          console.log('✅ Recurring pattern created successfully:', pattern)
          
          // Optional: Generate appointments from the pattern
          // await generateAppointmentsFromPattern(pattern.id, { count: 5 })
          
        } catch (error) {
          console.error('❌ Failed to create recurring pattern:', error)
          // Don't fail the whole operation if recurring creation fails
          // The user still gets their single appointment
        }
      }

      onSuccess?.()
      onClose()
      resetModal()
    } catch (err: any) {
      console.error('Failed to create appointment:', err)
      setError(err.response?.data?.detail || err.message || 'Failed to create appointment')
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = selectedService && selectedDate && selectedTime

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetModal()
        onClose()
      }}
      title="Add appointment"
      size="2xl"
      variant="default"
      position="center"
      className="max-h-[95vh] min-h-[700px] w-full max-w-3xl"
    >
      <div className="flex flex-col max-h-[85vh]">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {error && (
            <ErrorDisplay 
              error={error} 
              onRetry={() => {
                setError(null)
                if (!services.length && loadingServices === false) {
                  loadServices()
                }
              }} 
            />
          )}

          {/* Client Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-900 dark:text-white">
                Client *
              </label>
              <Button
                type="button"
                onClick={() => {
                  setIsClientDropdownOpen(true)
                  setShowCreateClient(true)
                }}
                variant="primary"
                size="lg"
                className="px-8 py-3 text-base font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 min-w-[160px]"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                New Client
              </Button>
            </div>
            
            {/* Show either the dropdown or the new client form */}
            {showCreateClient ? (
              // Expanded New Client Form
              <div className="border-2 border-primary-200 dark:border-primary-800 rounded-lg p-6 bg-primary-50/50 dark:bg-primary-900/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New Client Details</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Fill in the information below</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateClient(false)
                      setNewClientData({ first_name: '', last_name: '', email: '', phone: '' })
                    }}
                    className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        First name *
                      </label>
                      <Input
                        placeholder="John"
                        value={newClientData.first_name}
                        onChange={(e) => setNewClientData(prev => ({ ...prev, first_name: e.target.value }))}
                        className="bg-white dark:bg-gray-700"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Last name *
                      </label>
                      <Input
                        placeholder="Doe"
                        value={newClientData.last_name}
                        onChange={(e) => setNewClientData(prev => ({ ...prev, last_name: e.target.value }))}
                        className="bg-white dark:bg-gray-700"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email *
                    </label>
                    <Input
                      placeholder="john.doe@example.com"
                      type="email"
                      value={newClientData.email}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone (optional)
                    </label>
                    <Input
                      placeholder="(555) 123-4567"
                      value={newClientData.phone}
                      onChange={(e) => setNewClientData(prev => ({ ...prev, phone: e.target.value }))}
                      className="bg-white dark:bg-gray-800"
                    />
                  </div>
                  
                  <LoadingButton
                    onClick={handleCreateClient}
                    loading={loading}
                    disabled={!newClientData.first_name || !newClientData.last_name || !newClientData.email}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white"
                    size="lg"
                  >
                    Add Client
                  </LoadingButton>
                </div>
              </div>
            ) : (
              // Regular client dropdown
              <div className="relative" ref={clientDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                  className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-left flex items-center justify-between hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-gray-400" />
                    <span className={selectedClient ? 'text-gray-900 dark:text-white' : 'text-gray-500'}>
                      {selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : 'Select client'}
                    </span>
                  </div>
                  <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isClientDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isClientDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {/* Search */}
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                      <Input
                        placeholder="Search existing clients..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        autoFocus
                      />
                    </div>

                    {/* Client list */}
                    {loadingClients ? (
                      <div className="p-3 text-center text-gray-500">Searching...</div>
                    ) : clients.length > 0 ? (
                      clients.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => {
                            setSelectedClient(client)
                            setIsClientDropdownOpen(false)
                          }}
                          className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 flex flex-col"
                        >
                          <span className="font-medium text-gray-900 dark:text-white">
                            {client.first_name} {client.last_name}
                          </span>
                          <span className="text-sm text-gray-500">
                            {client.email} {client.phone && `• ${client.phone}`}
                          </span>
                        </button>
                      ))
                    ) : clientSearch ? (
                      <div className="p-3 text-center text-gray-500">No clients found</div>
                    ) : (
                      <div className="p-3 text-center text-gray-500">Start typing to search clients</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Service Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900 dark:text-white">
              Service *
            </label>
            <div className="relative" ref={serviceDropdownRef}>
              <button
                type="button"
                onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-left flex items-center justify-between hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              >
                <span className={selectedService ? 'text-gray-900 dark:text-white' : 'text-gray-500'}>
                  {selectedService ? selectedService.name : 'Select service'}
                </span>
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isServiceDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isServiceDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {loadingServices ? (
                    <div className="p-3 text-center text-gray-500">Loading services...</div>
                  ) : services.length > 0 ? (
                    services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => {
                          console.log('🎯 Service selected:', {
                            id: service.id,
                            name: service.name,
                            price: service.base_price,
                            duration: service.duration_minutes
                          })
                          setSelectedService(service)
                          setIsServiceDropdownOpen(false)
                        }}
                        className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex flex-col"
                      >
                        <span className="font-medium text-gray-900 dark:text-white">{service.name}</span>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>${service.base_price}</span>
                          <span>•</span>
                          <span>{service.duration_minutes} min</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-gray-500">No services available</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Barber Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900 dark:text-white">
              Barber {!isPublicBooking ? '(Optional)' : ''}
            </label>
            <div className="relative" ref={barberDropdownRef}>
              <button
                type="button"
                onClick={() => setIsBarberDropdownOpen(!isBarberDropdownOpen)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-left flex items-center justify-between hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-gray-400" />
                  <span className={selectedBarber ? 'text-gray-900 dark:text-white' : 'text-gray-500'}>
                    {selectedBarber ? selectedBarber.name : 'Any available barber'}
                  </span>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isBarberDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isBarberDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {loadingBarbers ? (
                    <div className="p-3 text-center text-gray-500">Loading barbers...</div>
                  ) : (
                    <>
                      {/* Debug logging */}
                      {console.log('🔧 Rendering barber dropdown:', {
                        barbersLength: barbers.length,
                        barbers: barbers,
                        loadingBarbers,
                        isBarberDropdownOpen
                      })}
                      
                      {/* Any available barber option */}
                      <button
                        onClick={() => {
                          setSelectedBarber(null)
                          setIsBarberDropdownOpen(false)
                        }}
                        className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2"
                      >
                        <UserIcon className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          Any available barber
                        </span>
                      </button>
                      
                      {barbers.length > 0 && (
                        <div className="border-t border-gray-200 dark:border-gray-700">
                          {barbers.map((barber) => (
                            <button
                              key={barber.id}
                              onClick={() => {
                                setSelectedBarber(barber)
                                setIsBarberDropdownOpen(false)
                              }}
                              className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-3"
                            >
                              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                                  {barber.name?.charAt(0).toUpperCase() || '?'}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {barber.name || 'Unknown Barber'}
                                </span>
                                <span className="text-sm text-gray-500 capitalize">
                                  {barber.role}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {barbers.length === 0 && (
                        <div className="p-3 text-center text-gray-500">
                          No barbers available (Debug: loadingBarbers={loadingBarbers.toString()}, barbersArray={JSON.stringify(barbers)})
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900 dark:text-white">
              Date *
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const newDate = e.target.value ? new Date(e.target.value) : null
                  console.log('📅 Date selected:', {
                    value: e.target.value,
                    date: newDate,
                    formatted: newDate ? format(newDate, 'yyyy-MM-dd') : null
                  })
                  setSelectedDate(newDate)
                }}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
              />
              <CalendarDaysIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900 dark:text-white">
              Time *
            </label>
            <div className="relative" ref={timeDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  console.log('⏰ Time dropdown clicked:', {
                    hasDate: !!selectedDate,
                    hasService: !!selectedService,
                    date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
                    service: selectedService?.name,
                    availableSlotsCount: availableSlots.length,
                    isDropdownOpen: isTimeDropdownOpen
                  })
                  
                  if (selectedDate && selectedService) {
                    setIsTimeDropdownOpen(!isTimeDropdownOpen)
                  } else {
                    console.log('❌ Cannot open time dropdown - missing date or service')
                  }
                }}
                disabled={!selectedDate || !selectedService}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-left flex items-center justify-between hover:border-gray-400 dark:hover:border-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className={selectedTime ? 'text-gray-900 dark:text-white' : 'text-gray-500'}>
                  {selectedTime || 'Select time'}
                </span>
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isTimeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isTimeDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {loadingSlots ? (
                    <div className="p-3 text-center text-gray-500">Loading available times...</div>
                  ) : availableSlots.length > 0 ? (
                    availableSlots.map((slot, index) => (
                      <button
                        key={`${slot.time}-${index}`}
                        onClick={() => {
                          setSelectedTime(slot.time)
                          setIsTimeDropdownOpen(false)
                        }}
                        className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                      >
                        {slot.time}
                        {slot.is_next_available && (
                          <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">
                            Next available
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-gray-500">No available times</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notes/Comments */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900 dark:text-white">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special instructions or notes for this appointment..."
              rows={3}
              className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>

          {/* Recurring Appointment Option */}
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isRecurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
              />
              <label htmlFor="isRecurring" className="text-sm font-semibold text-gray-900 dark:text-white">
                Make this a recurring appointment
              </label>
            </div>
            
            {isRecurring && (
              <div className="ml-7 space-y-3">
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Repeat pattern:
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRecurringPattern('weekly')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      recurringPattern === 'weekly' 
                        ? 'bg-primary-600 text-white' 
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecurringPattern('biweekly')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      recurringPattern === 'biweekly' 
                        ? 'bg-primary-600 text-white' 
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    Bi-weekly
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecurringPattern('monthly')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      recurringPattern === 'monthly' 
                        ? 'bg-primary-600 text-white' 
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Appointments will be automatically scheduled at the same time each {recurringPattern === 'weekly' ? 'week' : recurringPattern === 'biweekly' ? 'two weeks' : 'month'}.
                </p>
              </div>
            )}
          </div>

          {/* Notification Option */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="sendNotification"
              checked={sendNotification}
              onChange={(e) => setSendNotification(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="sendNotification" className="text-sm text-gray-700 dark:text-gray-300">
              Send confirmation notification to client
            </label>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-8 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => {
                resetModal()
                onClose()
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <LoadingButton
              onClick={handleSubmit}
              loading={loading}
              disabled={!isFormValid}
              className="min-w-[180px] bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:transform-none disabled:shadow-none"
            >
              Create Appointment
            </LoadingButton>
          </div>
        </div>
      </div>
    </Modal>
  )
}