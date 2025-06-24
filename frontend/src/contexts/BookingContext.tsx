'use client'

import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import {
  BookingState,
  BookingAction,
  bookingReducer,
  initialBookingState,
  BookingStep,
  getNextStep,
  getPreviousStep,
  canProceedToStep,
  validateStep
} from '@/lib/booking-utils'
import type { Service, BarberProfile, Location } from '@/lib/api'

interface BookingContextType {
  state: BookingState
  dispatch: React.Dispatch<BookingAction>

  // Action helpers
  setStep: (step: BookingStep) => void
  setLocation: (location: Location) => void
  setService: (service: Service) => void
  setBarber: (barber: BarberProfile) => void
  setDateTime: (date: string, time: string) => void
  setClientInfo: (info: Partial<BookingState['clientInfo']>) => void
  setPayment: (payment: Partial<BookingState['payment']>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void

  // Navigation helpers
  goToNextStep: () => boolean
  goToPreviousStep: () => boolean
  canProceed: (step?: BookingStep) => boolean
  validate: (step?: BookingStep) => string | null
}

const BookingContext = createContext<BookingContextType | undefined>(undefined)

interface BookingProviderProps {
  children: ReactNode
  initialState?: Partial<BookingState>
}

export function BookingProvider({ children, initialState }: BookingProviderProps) {
  const [state, dispatch] = useReducer(
    bookingReducer,
    { ...initialBookingState, ...initialState }
  )

  // Action helpers
  const setStep = (step: BookingStep) => {
    dispatch({ type: 'SET_STEP', step })
  }

  const setLocation = (location: Location) => {
    dispatch({ type: 'SET_LOCATION', location })
  }

  const setService = (service: Service) => {
    dispatch({ type: 'SET_SERVICE', service })
  }

  const setBarber = (barber: BarberProfile) => {
    dispatch({ type: 'SET_BARBER', barber })
  }

  const setDateTime = (date: string, time: string) => {
    dispatch({ type: 'SET_DATETIME', date, time })
  }

  const setClientInfo = (info: Partial<BookingState['clientInfo']>) => {
    dispatch({ type: 'SET_CLIENT_INFO', clientInfo: info })
  }

  const setPayment = (payment: Partial<BookingState['payment']>) => {
    dispatch({ type: 'SET_PAYMENT', payment })
  }

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', loading })
  }

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', error })
  }

  const reset = () => {
    dispatch({ type: 'RESET' })
  }

  // Navigation helpers
  const goToNextStep = (): boolean => {
    const nextStep = getNextStep(state.currentStep)
    if (nextStep && canProceedToStep(state, nextStep)) {
      setStep(nextStep)
      return true
    }
    return false
  }

  const goToPreviousStep = (): boolean => {
    const prevStep = getPreviousStep(state.currentStep)
    if (prevStep) {
      setStep(prevStep)
      return true
    }
    return false
  }

  const canProceed = (step?: BookingStep): boolean => {
    return canProceedToStep(state, step || state.currentStep)
  }

  const validate = (step?: BookingStep): string | null => {
    return validateStep(state, step || state.currentStep)
  }

  const value: BookingContextType = {
    state,
    dispatch,
    setStep,
    setLocation,
    setService,
    setBarber,
    setDateTime,
    setClientInfo,
    setPayment,
    setLoading,
    setError,
    reset,
    goToNextStep,
    goToPreviousStep,
    canProceed,
    validate
  }

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  )
}

export function useBooking(): BookingContextType {
  const context = useContext(BookingContext)
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider')
  }
  return context
}

// Custom hooks for specific booking state
export function useBookingStep() {
  const { state, setStep, goToNextStep, goToPreviousStep } = useBooking()
  return {
    currentStep: state.currentStep,
    setStep,
    goToNextStep,
    goToPreviousStep
  }
}

export function useBookingSelection() {
  const { state, setService, setBarber, setDateTime } = useBooking()
  return {
    service: state.service,
    barber: state.barber,
    date: state.date,
    time: state.time,
    setService,
    setBarber,
    setDateTime
  }
}

export function useBookingClient() {
  const { state, setClientInfo } = useBooking()
  return {
    clientInfo: state.clientInfo,
    setClientInfo
  }
}

export function useBookingPayment() {
  const { state, setPayment } = useBooking()
  return {
    payment: state.payment,
    setPayment
  }
}

export function useBookingValidation() {
  const { validate, canProceed } = useBooking()
  return {
    validate,
    canProceed
  }
}
