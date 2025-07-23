'use client'

/**
 * Enhanced CreateAppointmentModal with Comprehensive Validation
 * 
 * Implements Six Figure Barber methodology with:
 * - Real-time validation as user types/selects
 * - Premium service standards enforcement
 * - Business rule validation and suggestions
 * - User-friendly error handling with specific guidance
 * - Upselling and revenue optimization suggestions
 * - Professional client experience optimization
 */

import { useState, useEffect, useRef, useCallback } from 'react'
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
  type Client,
  type Service,
  type User,
  type SlotsResponse,
  type TimeSlot,
  type AppointmentCreate
} from '@/lib/api'
import { formatDateForAPI } from '@/lib/timezone'
import { 
  validateBooking,
  validateField,
  showValidationErrors,
  getValidatedTimeSlots,
  type ValidationResult,
  type BookingData
} from '@/lib/booking-validation'
import { 
  ChevronDownIcon,
  CalendarDaysIcon,
  UserIcon,
  PlusIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LightBulbIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'

interface CreateAppointmentModalEnhancedProps {
  isOpen: boolean
  onClose: () => void
  preselectedDate?: Date
  preselectedTime?: string
  onSuccess?: () => void
  isPublicBooking?: boolean
}

export default function CreateAppointmentModalEnhanced({
  isOpen,
  onClose,
  preselectedDate,
  preselectedTime,
  onSuccess,
  isPublicBooking = false
}: CreateAppointmentModalEnhancedProps) {
  
  // Core booking state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (preselectedDate) return preselectedDate
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow
  })
  const [selectedTime, setSelectedTime] = useState<string | null>(preselectedTime || null)
  const [selectedBarber, setSelectedBarber] = useState<User | null>(null)
  const [notes, setNotes] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringPattern, setRecurringPattern] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly')
  const [sendNotification, setSendNotification] = useState(true)
  
  // UI state
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false)
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false)
  const [isBarberDropdownOpen, setIsBarberDropdownOpen] = useState(false)
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false)
  const [showCreateClient, setShowCreateClient] = useState(false)
  
  // Data loading state
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [barbers, setBarbers] = useState<User[]>([])
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  
  const [loadingClients, setLoadingClients] = useState(false)
  const [loadingServices, setLoadingServices] = useState(false)
  const [loadingBarbers, setLoadingBarbers] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  
  // Client search and creation
  const [clientSearch, setClientSearch] = useState('')
  const [newClientData, setNewClientData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  })
  
  // Validation state
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isValidating, setIsValidating] = useState(false)
  
  // General state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Refs for dropdown management
  const clientDropdownRef = useRef<HTMLDivElement>(null)
  const serviceDropdownRef = useRef<HTMLDivElement>(null)
  const timeDropdownRef = useRef<HTMLDivElement>(null)
  const barberDropdownRef = useRef<HTMLDivElement>(null)
  
  // Service cache for performance
  const servicesCacheRef = useRef<{ services: Service[], timestamp: number } | null>(null)
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  
  // Real-time validation with debouncing
  const validateBookingData = useCallback(async () => {
    if (!selectedDate || !selectedTime || !selectedService) {
      setValidationResult(null)
      return
    }
    
    setIsValidating(true)
    
    try {
      const bookingData: BookingData = {
        date: selectedDate,
        time: selectedTime,
        service: selectedService.name,
        clientInfo: selectedClient ? {
          firstName: selectedClient.first_name,
          lastName: selectedClient.last_name,
          email: selectedClient.email,
          phone: selectedClient.phone
        } : undefined,
        barberId: selectedBarber?.id,
        notes: notes,
        isRecurring: isRecurring,
        recurringPattern: recurringPattern
      }
      
      const result = validateBooking(bookingData)
      setValidationResult(result)
      
      // Update field-specific errors
      const newFieldErrors: Record<string, string> = {}
      result.errors.forEach(error => {
        if (error.field) {
          newFieldErrors[error.field] = error.message
        }
      })
      setFieldErrors(newFieldErrors)
      
    } catch (error) {
      console.error('Validation error:', error)
    } finally {
      setIsValidating(false)
    }
  }, [selectedDate, selectedTime, selectedService, selectedClient, selectedBarber, notes, isRecurring, recurringPattern])
  
  // Debounced validation
  useEffect(() => {
    const timer = setTimeout(() => {
      validateBookingData()
    }, 500)
    
    return () => clearTimeout(timer)
  }, [validateBookingData])
  
  // Real-time field validation
  const validateSingleField = (fieldName: string, value: any) => {
    const bookingData: Partial<BookingData> = {
      date: selectedDate || undefined,
      time: selectedTime || undefined,
      service: selectedService?.name || undefined,
    }
    
    const errors = validateField(fieldName, value, bookingData)
    
    setFieldErrors(prev => {
      const updated = { ...prev }
      if (errors.length > 0) {
        updated[fieldName] = errors[0].message
      } else {
        delete updated[fieldName]
      }
      return updated
    })
  }
  
  // Load initial data
  useEffect(() => {
    if (isOpen) {
      console.log('🚀 Enhanced CreateAppointmentModal opened', {
        isPublicBooking,
        hasToken: !!localStorage.getItem('token')
      })
      loadServices()
      loadBarbers()
    }
  }, [isOpen, isPublicBooking])
  
  // Load time slots when dependencies change
  useEffect(() => {
    if (selectedDate && selectedService) {
      loadTimeSlots()
    }
  }, [selectedDate, selectedService, selectedBarber])
  
  // Load services with caching
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
        response = await getPublicServices()
      } else {
        try {
          response = await getServices()
        } catch (authError: any) {
          if (authError.status === 401 || authError.message?.includes('401')) {
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
      
      toast.success('Services loaded successfully')
    } catch (err: any) {
      console.error('Failed to load services:', err)
      setError('Failed to load services. Please try again.')
      toast.error('Failed to load services. Please try again.')
    } finally {
      setLoadingServices(false)
    }
  }
  
  // Load barbers
  const loadBarbers = async () => {
    try {
      setLoadingBarbers(true)
      console.log('🔍 Loading barbers - isPublicBooking:', isPublicBooking)
      
      try {
        const barberUsers = await getAllUsers('barber')
        console.log('💼 Barber users from authenticated API:', barberUsers)
        setBarbers(barberUsers)
      } catch (authError: any) {
        if (authError.status === 401 || authError.status === 403) {
          console.log('🔓 Auth failed, using public barbers endpoint...')
          const publicBarbers = await getBarbers()
          console.log('💼 Public barbers from API:', publicBarbers)
          setBarbers(publicBarbers)
        } else {
          throw authError
        }
      }
    } catch (err: any) {
      console.error('❌ Failed to load barbers:', err)
      // Don't show error for barbers loading as it's not critical
    } finally {
      setLoadingBarbers(false)
    }
  }
  
  // Load time slots with validation
  const loadTimeSlots = async () => {
    if (!selectedDate || !selectedService) {
      return
    }
    
    try {
      setLoadingSlots(true)
      const apiDate = formatDateForAPI(selectedDate)
      
      const response = await getAvailableSlots({
        date: apiDate,
        service_id: selectedService.id,
        barber_id: selectedBarber?.id
      })
      
      // Filter available slots and validate them
      const availableSlots = response.slots?.filter(slot => slot.available) || []
      setAvailableSlots(availableSlots)
      
      if (availableSlots.length === 0) {
        toast.warning('No available time slots for the selected date and service')
      }
    } catch (err) {
      console.error('❌ Failed to load time slots:', err)
      setError('Failed to load available times')
      toast.error('Failed to load available times. Please try again.')
    } finally {
      setLoadingSlots(false)
    }
  }
  
  // Client search with debouncing
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
  
  const searchClientsDebounced = async (searchTerm: string) => {
    try {
      setLoadingClients(true)
      const response = await searchClients(searchTerm)
      setClients(response.clients || [])
    } catch (err) {
      console.error('Failed to search clients:', err)
      toast.error('Failed to search clients')
    } finally {
      setLoadingClients(false)
    }
  }
  
  // Create new client
  const handleCreateClient = async () => {
    // Validate client data
    const clientErrors: string[] = []
    
    if (!newClientData.first_name || newClientData.first_name.trim().length < 2) {
      clientErrors.push('First name is required')
    }
    if (!newClientData.last_name || newClientData.last_name.trim().length < 2) {
      clientErrors.push('Last name is required')
    }
    if (!newClientData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newClientData.email)) {
      clientErrors.push('Valid email address is required')
    }
    
    if (clientErrors.length > 0) {
      clientErrors.forEach(error => toast.error(error))
      return
    }
    
    try {
      setLoading(true)
      const response = await createClient(newClientData)
      setSelectedClient(response as Client)
      setShowCreateClient(false)
      setIsClientDropdownOpen(false)
      setNewClientData({ first_name: '', last_name: '', email: '', phone: '' })
      toast.success('Client created successfully')
    } catch (err: any) {
      console.error('Failed to create client:', err)
      toast.error('Failed to create client. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  // Handle appointment submission with comprehensive validation
  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      toast.error('Please fill in all required fields')
      return
    }
    
    // Run final validation
    setIsValidating(true)
    await validateBookingData()
    setIsValidating(false)
    
    // Check if validation passed
    if (validationResult && !validationResult.isValid) {
      showValidationErrors(validationResult)
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      // Show validation results (warnings and suggestions)
      if (validationResult) {
        // Show warnings as info toasts
        validationResult.warnings.forEach(warning => {
          if (warning.severity === 'warning') {
            toast.warning(warning.message, { duration: 4000 })
          } else {
            toast.info(warning.message, { duration: 3000 })
          }
        })
        
        // Show suggestions as success toasts with premium branding
        validationResult.suggestions.forEach(suggestion => {
          toast.success(suggestion, { 
            description: 'Six Figure Barber Experience',
            duration: 4000 
          })
        })
      }
      
      const appointmentData: AppointmentCreate = {
        date: formatDateForAPI(selectedDate),
        time: selectedTime,
        service: selectedService.name,
        notes: notes || undefined,
        barber_id: selectedBarber?.id
      }
      
      console.log('🚀 Creating appointment with enhanced validation:', appointmentData)
      const result = await appointmentsAPI.create(appointmentData)
      console.log('✅ Appointment created successfully:', result)
      
      // Show success message with premium experience messaging
      toast.success('Appointment booked successfully!', {
        description: 'You\'ll receive a confirmation with preparation details',
        duration: 5000
      })
      
      if (isRecurring) {
        toast.info(`Recurring ${recurringPattern} appointments will be scheduled automatically`, {
          duration: 6000
        })
      }
      
      onSuccess?.()
      onClose()
      resetModal()
      
    } catch (err: any) {
      console.error('Failed to create appointment:', err)
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to create appointment'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }
  
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
    setValidationResult(null)
    setFieldErrors({})
    setIsClientDropdownOpen(false)
    setIsServiceDropdownOpen(false)
    setIsBarberDropdownOpen(false)
    setIsTimeDropdownOpen(false)
  }
  
  // Handle field changes with validation
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value ? new Date(e.target.value) : null
    setSelectedDate(newDate)
    if (newDate) {
      validateSingleField('date', newDate)
    }
  }
  
  const handleTimeChange = (time: string) => {
    setSelectedTime(time)
    validateSingleField('time', time)
    setIsTimeDropdownOpen(false)
  }
  
  const handleServiceChange = (service: Service) => {
    setSelectedService(service)
    validateSingleField('service', service.name)
    setIsServiceDropdownOpen(false)
    
    // Show service-specific suggestions
    toast.info(`${service.name} - ${service.duration_minutes} minutes`, {
      description: `Professional ${service.name.toLowerCase()} service with premium techniques`,
      duration: 3000
    })
  }
  
  // Handle outside clicks for dropdowns
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
  
  const isFormValid = selectedService && selectedDate && selectedTime && (!validationResult || validationResult.isValid)
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetModal()
        onClose()
      }}
      title="Book Premium Appointment"
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
                if (!services.length) {
                  loadServices()
                }
              }} 
            />
          )}
          
          {/* Validation Status Indicator */}
          {validationResult && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                {validationResult.isValid ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                ) : (
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {validationResult.isValid 
                      ? 'Appointment details validated ✓' 
                      : `${validationResult.errors.length} validation issue${validationResult.errors.length !== 1 ? 's' : ''} found`
                    }
                  </p>
                  {validationResult.suggestions.length > 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {validationResult.suggestions[0]}
                    </p>
                  )}
                </div>
                {isValidating && (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
            </div>
          )}

          {/* Client Selection - Same as original but with validation feedback */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`text-sm font-semibold ${fieldErrors.client ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
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
            
            {fieldErrors.client && (
              <p className="text-red-600 text-xs">{fieldErrors.client}</p>
            )}
            
            {/* Client dropdown implementation - Same as original */}
            {showCreateClient ? (
              // New client form - Same as original but with enhanced validation feedback
              <div className="border-2 border-primary-200 dark:border-primary-800 rounded-lg p-6 bg-primary-50/50 dark:bg-primary-900/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New Client Details</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Premium service requires client information</p>
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
                        onChange={(e) => {
                          setNewClientData(prev => ({ ...prev, first_name: e.target.value }))
                          validateSingleField('firstName', e.target.value)
                        }}
                        className={`bg-white dark:bg-gray-700 ${fieldErrors.firstName ? 'border-red-500' : ''}`}
                        autoFocus
                      />
                      {fieldErrors.firstName && <p className="text-red-600 text-xs mt-1">{fieldErrors.firstName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Last name *
                      </label>
                      <Input
                        placeholder="Doe"
                        value={newClientData.last_name}
                        onChange={(e) => {
                          setNewClientData(prev => ({ ...prev, last_name: e.target.value }))
                          validateSingleField('lastName', e.target.value)
                        }}
                        className={`bg-white dark:bg-gray-700 ${fieldErrors.lastName ? 'border-red-500' : ''}`}
                      />
                      {fieldErrors.lastName && <p className="text-red-600 text-xs mt-1">{fieldErrors.lastName}</p>}
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
                      onChange={(e) => {
                        setNewClientData(prev => ({ ...prev, email: e.target.value }))
                        validateSingleField('email', e.target.value)
                      }}
                      className={`bg-white dark:bg-gray-800 ${fieldErrors.email ? 'border-red-500' : ''}`}
                    />
                    {fieldErrors.email && <p className="text-red-600 text-xs mt-1">{fieldErrors.email}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone (recommended)
                    </label>
                    <Input
                      placeholder="(555) 123-4567"
                      value={newClientData.phone}
                      onChange={(e) => {
                        setNewClientData(prev => ({ ...prev, phone: e.target.value }))
                        validateSingleField('phone', e.target.value)
                      }}
                      className={`bg-white dark:bg-gray-800 ${fieldErrors.phone ? 'border-red-500' : ''}`}
                    />
                    {fieldErrors.phone && <p className="text-red-600 text-xs mt-1">{fieldErrors.phone}</p>}
                    <p className="text-xs text-gray-500 mt-1">Used for appointment confirmations and premium service updates</p>
                  </div>
                  
                  <LoadingButton
                    onClick={handleCreateClient}
                    loading={loading}
                    disabled={!newClientData.first_name || !newClientData.last_name || !newClientData.email}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white"
                    size="lg"
                  >
                    Create Premium Client Profile
                  </LoadingButton>
                </div>
              </div>
            ) : (
              // Regular client dropdown - Same as original
              <div className="relative" ref={clientDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                  className={`w-full bg-white dark:bg-gray-700 border rounded-lg px-4 py-3 text-left flex items-center justify-between hover:border-gray-400 dark:hover:border-gray-500 transition-colors ${
                    fieldErrors.client ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-gray-400" />
                    <span className={selectedClient ? 'text-gray-900 dark:text-white' : 'text-gray-500'}>
                      {selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : 'Select or search client'}
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
                            toast.success(`Selected ${client.first_name} ${client.last_name}`)
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

          {/* Service Selection with Premium Branding */}
          <div className="space-y-2">
            <label className={`text-sm font-semibold ${fieldErrors.service ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
              Premium Service *
            </label>
            {fieldErrors.service && (
              <p className="text-red-600 text-xs">{fieldErrors.service}</p>
            )}
            <div className="relative" ref={serviceDropdownRef}>
              <button
                type="button"
                onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
                className={`w-full bg-white dark:bg-gray-800 border rounded-lg px-4 py-3 text-left flex items-center justify-between hover:border-gray-400 dark:hover:border-gray-500 transition-colors ${
                  fieldErrors.service ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <span className={selectedService ? 'text-gray-900 dark:text-white' : 'text-gray-500'}>
                  {selectedService ? selectedService.name : 'Select premium service'}
                </span>
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isServiceDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isServiceDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {loadingServices ? (
                    <div className="p-3 text-center text-gray-500">Loading premium services...</div>
                  ) : services.length > 0 ? (
                    services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => handleServiceChange(service)}
                        className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex flex-col"
                      >
                        <span className="font-medium text-gray-900 dark:text-white">{service.name}</span>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <CurrencyDollarIcon className="w-4 h-4" />
                          <span>${service.base_price}</span>
                          <span>•</span>
                          <span>{service.duration_minutes} min</span>
                          {service.category === 'premium' && (
                            <>
                              <span>•</span>
                              <span className="text-gold-600 font-medium">Premium Experience</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{service.description}</p>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-gray-500">No services available</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Rest of the form fields with similar validation enhancements */}
          {/* Date Selection */}
          <div className="space-y-2">
            <label className={`text-sm font-semibold ${fieldErrors.date ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
              Date *
            </label>
            {fieldErrors.date && (
              <p className="text-red-600 text-xs">{fieldErrors.date}</p>
            )}
            <div className="relative">
              <input
                type="date"
                value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                onChange={handleDateChange}
                min={format(new Date(), 'yyyy-MM-dd')}
                className={`w-full bg-white dark:bg-gray-700 border rounded-lg px-4 py-3 text-gray-900 dark:text-white ${
                  fieldErrors.date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              <CalendarDaysIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <label className={`text-sm font-semibold ${fieldErrors.time ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
              Time *
            </label>
            {fieldErrors.time && (
              <p className="text-red-600 text-xs">{fieldErrors.time}</p>
            )}
            <div className="relative" ref={timeDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  if (selectedDate && selectedService) {
                    setIsTimeDropdownOpen(!isTimeDropdownOpen)
                  } else {
                    toast.warning('Please select a date and service first')
                  }
                }}
                disabled={!selectedDate || !selectedService}
                className={`w-full bg-white dark:bg-gray-800 border rounded-lg px-4 py-3 text-left flex items-center justify-between hover:border-gray-400 dark:hover:border-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  fieldErrors.time ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <span className={selectedTime ? 'text-gray-900 dark:text-white' : 'text-gray-500'}>
                  {selectedTime || 'Select available time'}
                </span>
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isTimeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isTimeDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {loadingSlots ? (
                    <div className="p-3 text-center text-gray-500">Finding available times...</div>
                  ) : availableSlots.length > 0 ? (
                    availableSlots.map((slot, index) => (
                      <button
                        key={`${slot.time}-${index}`}
                        onClick={() => handleTimeChange(slot.time)}
                        className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white flex items-center justify-between"
                      >
                        <span>{slot.time}</span>
                        {slot.is_next_available && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            Next available
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-gray-500">
                      <p>No available times</p>
                      <p className="text-xs mt-1">Try selecting a different date</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Barber Selection - Enhanced */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900 dark:text-white">
              Preferred Barber {!isPublicBooking ? '(Optional)' : ''}
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
                      {/* Any available barber option */}
                      <button
                        onClick={() => {
                          setSelectedBarber(null)
                          setIsBarberDropdownOpen(false)
                          toast.info('We\'ll assign the best available barber for your service')
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
                                toast.success(`${barber.name} selected - they'll provide exceptional service`)
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
                                  {barber.name || 'Professional Barber'}
                                </span>
                                <span className="text-sm text-gray-500 capitalize">
                                  {barber.role} • Six Figure Barber Certified
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notes with Premium Guidance */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900 dark:text-white">
              Style Notes & Preferences
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Share your style goals, hair concerns, or special occasion details to ensure exceptional results..."
              rows={3}
              className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
            <p className="text-xs text-gray-500">Help us prepare for your premium Six Figure Barber experience</p>
          </div>

          {/* Recurring Options with Enhanced UX */}
          <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isRecurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
              />
              <label htmlFor="isRecurring" className="text-sm font-semibold text-gray-900 dark:text-white">
                Schedule recurring appointments
              </label>
              <LightBulbIcon className="w-4 h-4 text-blue-500" />
            </div>
            
            {isRecurring && (
              <div className="ml-7 space-y-3">
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Maintenance schedule for optimal results:
                </label>
                <div className="flex gap-3">
                  {[
                    { value: 'weekly', label: 'Weekly', description: 'Perfect for maintenance cuts' },
                    { value: 'biweekly', label: 'Every 2 weeks', description: 'Ideal for most styles' },
                    { value: 'monthly', label: 'Monthly', description: 'Premium service intervals' }
                  ].map(pattern => (
                    <button
                      key={pattern.value}
                      type="button"
                      onClick={() => setRecurringPattern(pattern.value as 'weekly' | 'biweekly' | 'monthly')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        recurringPattern === pattern.value 
                          ? 'bg-primary-600 text-white' 
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                      title={pattern.description}
                    >
                      {pattern.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Recurring appointments ensure consistent styling and preferred time slots.
                </p>
              </div>
            )}
          </div>

          {/* Notification Preferences */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="sendNotification"
              checked={sendNotification}
              onChange={(e) => setSendNotification(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="sendNotification" className="text-sm text-gray-700 dark:text-gray-300">
              Send appointment confirmation and premium experience preparation guide
            </label>
          </div>
        </div>

        {/* Fixed Footer with Enhanced Messaging */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-8 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/30">
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
              loading={loading || isValidating}
              disabled={!isFormValid}
              className="min-w-[200px] bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-700 hover:to-blue-700 text-white font-semibold px-8 py-3 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:transform-none disabled:shadow-none"
            >
              {loading ? 'Booking...' : isValidating ? 'Validating...' : 'Book Premium Appointment'}
            </LoadingButton>
          </div>
          {validationResult && validationResult.suggestions.length > 0 && (
            <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                💡 Six Figure Barber Experience: {validationResult.suggestions[0]}
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}