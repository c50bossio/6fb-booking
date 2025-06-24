import type { Service, BarberProfile, Location } from './api'

export interface BookingState {
  // Step tracking
  currentStep: BookingStep

  // Selected data
  location: Location | null
  service: Service | null
  barber: BarberProfile | null
  date: string
  time: string

  // Client information
  clientInfo: {
    name: string
    email: string
    phone: string
    notes: string
  }

  // Payment information
  payment: {
    method: 'full' | 'deposit'
    amount: number
    details: any
  }

  // UI state
  loading: boolean
  error: string | null
}

export type BookingStep = 'service' | 'barber' | 'datetime' | 'details' | 'payment' | 'confirm'

export const initialBookingState: BookingState = {
  currentStep: 'service',
  location: null,
  service: null,
  barber: null,
  date: '',
  time: '',
  clientInfo: {
    name: '',
    email: '',
    phone: '',
    notes: ''
  },
  payment: {
    method: 'full',
    amount: 0,
    details: null
  },
  loading: false,
  error: null
}

export type BookingAction =
  | { type: 'SET_STEP'; step: BookingStep }
  | { type: 'SET_LOCATION'; location: Location }
  | { type: 'SET_SERVICE'; service: Service }
  | { type: 'SET_BARBER'; barber: BarberProfile }
  | { type: 'SET_DATETIME'; date: string; time: string }
  | { type: 'SET_CLIENT_INFO'; clientInfo: Partial<BookingState['clientInfo']> }
  | { type: 'SET_PAYMENT'; payment: Partial<BookingState['payment']> }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'RESET' }

export function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step }

    case 'SET_LOCATION':
      return { ...state, location: action.location }

    case 'SET_SERVICE':
      return {
        ...state,
        service: action.service,
        payment: {
          ...state.payment,
          amount: action.service.base_price
        }
      }

    case 'SET_BARBER':
      return { ...state, barber: action.barber }

    case 'SET_DATETIME':
      return { ...state, date: action.date, time: action.time }

    case 'SET_CLIENT_INFO':
      return {
        ...state,
        clientInfo: { ...state.clientInfo, ...action.clientInfo }
      }

    case 'SET_PAYMENT':
      return {
        ...state,
        payment: { ...state.payment, ...action.payment }
      }

    case 'SET_LOADING':
      return { ...state, loading: action.loading }

    case 'SET_ERROR':
      return { ...state, error: action.error }

    case 'RESET':
      return initialBookingState

    default:
      return state
  }
}

// Utility functions for booking flow
export const getStepIndex = (step: BookingStep): number => {
  const steps: BookingStep[] = ['service', 'barber', 'datetime', 'details', 'payment', 'confirm']
  return steps.indexOf(step)
}

export const getNextStep = (currentStep: BookingStep): BookingStep | null => {
  const steps: BookingStep[] = ['service', 'barber', 'datetime', 'details', 'payment', 'confirm']
  const currentIndex = steps.indexOf(currentStep)
  return currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null
}

export const getPreviousStep = (currentStep: BookingStep): BookingStep | null => {
  const steps: BookingStep[] = ['service', 'barber', 'datetime', 'details', 'payment', 'confirm']
  const currentIndex = steps.indexOf(currentStep)
  return currentIndex > 0 ? steps[currentIndex - 1] : null
}

export const canProceedToStep = (state: BookingState, step: BookingStep): boolean => {
  switch (step) {
    case 'service':
      return true

    case 'barber':
      return !!state.service

    case 'datetime':
      return !!state.service && !!state.barber

    case 'details':
      return !!state.service && !!state.barber && !!state.date && !!state.time

    case 'payment':
      return !!(
        state.service &&
        state.barber &&
        state.date &&
        state.time &&
        state.clientInfo.name &&
        state.clientInfo.email
      )

    case 'confirm':
      return !!(
        state.service &&
        state.barber &&
        state.date &&
        state.time &&
        state.clientInfo.name &&
        state.clientInfo.email &&
        state.payment.details
      )

    default:
      return false
  }
}

export const validateStep = (state: BookingState, step: BookingStep): string | null => {
  switch (step) {
    case 'service':
      return state.service ? null : 'Please select a service'

    case 'barber':
      return state.barber ? null : 'Please select a barber'

    case 'datetime':
      if (!state.date) return 'Please select a date'
      if (!state.time) return 'Please select a time'
      return null

    case 'details':
      if (!state.clientInfo.name) return 'Please enter your name'
      if (!state.clientInfo.email) return 'Please enter your email'
      if (state.clientInfo.email && !isValidEmail(state.clientInfo.email)) {
        return 'Please enter a valid email address'
      }
      return null

    case 'payment':
      return state.payment.details ? null : 'Please complete payment information'

    default:
      return null
  }
}

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const formatBookingForAPI = (state: BookingState) => {
  return {
    service_id: state.service?.id,
    barber_id: state.barber?.id,
    appointment_date: state.date,
    appointment_time: state.time,
    location_id: state.location?.id,
    client_info: {
      name: state.clientInfo.name,
      email: state.clientInfo.email,
      phone: state.clientInfo.phone
    },
    notes: state.clientInfo.notes,
    payment_method: state.payment.method,
    payment_details: state.payment.details
  }
}

// URL generation utilities
export const generateBookingUrl = (shopId: string, options?: {
  barber?: number
  service?: number
}): string => {
  const baseUrl = `/book/${shopId}/booking`
  const params = new URLSearchParams()

  if (options?.barber) params.append('barber', options.barber.toString())
  if (options?.service) params.append('service', options.service.toString())

  return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl
}

export const generateShareableBookingLink = (shopId: string, options?: {
  barber?: number
  service?: number
}): string => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  return baseUrl + generateBookingUrl(shopId, options)
}

// Time and date utilities
export const formatAppointmentDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export const formatAppointmentTime = (time: string): string => {
  const [hours, minutes] = time.split(':')
  const date = new Date()
  date.setHours(parseInt(hours), parseInt(minutes))
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price)
}

export const calculateDepositAmount = (service: Service): number => {
  if (!service.requires_deposit) return 0

  if (service.deposit_type === 'percentage') {
    return service.base_price * (service.deposit_amount || 0) / 100
  }

  return service.deposit_amount || 0
}

export const getBookingStepTitle = (step: BookingStep): string => {
  const titles: Record<BookingStep, string> = {
    service: 'Select Service',
    barber: 'Choose Barber',
    datetime: 'Pick Date & Time',
    details: 'Your Information',
    payment: 'Payment',
    confirm: 'Confirm Booking'
  }

  return titles[step]
}

export const getBookingStepDescription = (step: BookingStep): string => {
  const descriptions: Record<BookingStep, string> = {
    service: 'Choose the service you\'d like to book',
    barber: 'Select a barber for your appointment',
    datetime: 'Pick your preferred date and time',
    details: 'Please provide your contact information',
    payment: 'Choose your payment option',
    confirm: 'Review and confirm your booking'
  }

  return descriptions[step]
}
