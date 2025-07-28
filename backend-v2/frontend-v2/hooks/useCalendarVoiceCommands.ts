/**
 * Calendar Voice Commands React Hook
 * React integration for calendar-specific voice commands
 * Version: 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getCalendarVoiceSystem,
  CalendarVoiceResult,
  CalendarContextState,
  CalendarVoiceAction
} from '@/lib/calendar-voice-commands'

interface UseCalendarVoiceCommandsOptions {
  autoStart?: boolean
  onVoiceCommand?: (result: CalendarVoiceResult) => void
  onNavigationChange?: (date: Date, view: string) => void
  onBookingAction?: (action: string, data: any) => void
  onSearchAction?: (query: string, type: string) => void
  enableFeedback?: boolean
  contextUpdates?: Partial<CalendarContextState>
}

interface UseCalendarVoiceCommandsResult {
  isListening: boolean
  isSupported: boolean
  context: CalendarContextState
  lastCommand: CalendarVoiceResult | null
  commandHistory: CalendarVoiceResult[]
  startListening: () => void
  stopListening: () => void
  toggle: () => void
  speak: (text: string) => void
  updateContext: (updates: Partial<CalendarContextState>) => void
  registerHandler: (action: string, handler: (params: any) => Promise<CalendarVoiceResult>) => void
  getVoiceCommands: () => any[]
  clearHistory: () => void
}

export function useCalendarVoiceCommands(
  options: UseCalendarVoiceCommandsOptions = {}
): UseCalendarVoiceCommandsResult {
  const {
    autoStart = false,
    onVoiceCommand,
    onNavigationChange,
    onBookingAction,
    onSearchAction,
    enableFeedback = true,
    contextUpdates
  } = options

  const voiceSystem = getCalendarVoiceSystem()
  
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const [context, setContext] = useState<CalendarContextState>(voiceSystem.getContext())
  const [lastCommand, setLastCommand] = useState<CalendarVoiceResult | null>(null)
  const [commandHistory, setCommandHistory] = useState<CalendarVoiceResult[]>([])
  
  const listenerRef = useRef<((result: CalendarVoiceResult) => void) | null>(null)

  // Initialize voice command listener
  useEffect(() => {
    const handleVoiceCommand = (result: CalendarVoiceResult) => {
      setLastCommand(result)
      setCommandHistory(prev => [result, ...prev.slice(0, 19)]) // Keep last 20 commands
      
      // Update context after successful commands
      if (result.success && result.data) {
        const contextUpdate: Partial<CalendarContextState> = {}
        
        if (result.data.date) contextUpdate.selectedDate = result.data.date
        if (result.data.view) contextUpdate.currentView = result.data.view
        if (result.data.bookingMode !== undefined) contextUpdate.isBookingMode = result.data.bookingMode
        if (result.data.searchQuery) contextUpdate.searchQuery = result.data.searchQuery
        
        if (Object.keys(contextUpdate).length > 0) {
          voiceSystem.updateContext(contextUpdate)
          setContext(voiceSystem.getContext())
        }
      }

      // Call specific handlers based on action type
      if (result.success && result.data) {
        const { action } = result
        
        if (action.type === 'navigation' && result.data.date && onNavigationChange) {
          onNavigationChange(result.data.date, result.data.view || context.currentView)
        }
        
        if (action.type === 'booking' && onBookingAction) {
          onBookingAction(action.action, result.data)
        }
        
        if (action.type === 'search' && result.data.searchQuery && onSearchAction) {
          onSearchAction(result.data.searchQuery, result.data.searchType || 'general')
        }
      }

      // Call general handler
      onVoiceCommand?.(result)
    }

    listenerRef.current = handleVoiceCommand
    voiceSystem.addListener(handleVoiceCommand)

    // Check if voice commands are supported
    setIsSupported('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)

    return () => {
      if (listenerRef.current) {
        voiceSystem.removeListener(listenerRef.current)
      }
    }
  }, [onVoiceCommand, onNavigationChange, onBookingAction, onSearchAction, context.currentView])

  // Update context when external updates are provided
  useEffect(() => {
    if (contextUpdates) {
      voiceSystem.updateContext(contextUpdates)
      setContext(voiceSystem.getContext())
    }
  }, [contextUpdates])

  // Auto-start listening
  useEffect(() => {
    if (autoStart && isSupported) {
      startListening()
    }
  }, [autoStart, isSupported])

  // Monitor listening state
  useEffect(() => {
    const checkListeningState = () => {
      setIsListening(voiceSystem.isListening())
    }

    const interval = setInterval(checkListeningState, 1000)
    return () => clearInterval(interval)
  }, [])

  const startListening = useCallback(() => {
    if (!isSupported) {
      console.warn('Voice commands not supported in this browser')
      return
    }

    try {
      voiceSystem.startListening()
      setIsListening(true)
      
      if (enableFeedback) {
        voiceSystem.speak('Voice commands activated. You can now control the calendar with your voice.')
      }
    } catch (error) {
      console.error('Failed to start voice listening:', error)
    }
  }, [isSupported, enableFeedback])

  const stopListening = useCallback(() => {
    try {
      voiceSystem.stopListening()
      setIsListening(false)
      
      if (enableFeedback) {
        voiceSystem.speak('Voice commands deactivated.')
      }
    } catch (error) {
      console.error('Failed to stop voice listening:', error)
    }
  }, [enableFeedback])

  const toggle = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  const speak = useCallback((text: string) => {
    voiceSystem.speak(text)
  }, [])

  const updateContext = useCallback((updates: Partial<CalendarContextState>) => {
    voiceSystem.updateContext(updates)
    setContext(voiceSystem.getContext())
  }, [])

  const registerHandler = useCallback((
    action: string, 
    handler: (params: any) => Promise<CalendarVoiceResult>
  ) => {
    voiceSystem.registerActionHandler(action, handler)
  }, [])

  const getVoiceCommands = useCallback(() => {
    return voiceSystem.getVoiceCommands()
  }, [])

  const clearHistory = useCallback(() => {
    setCommandHistory([])
    setLastCommand(null)
  }, [])

  return {
    isListening,
    isSupported,
    context,
    lastCommand,
    commandHistory,
    startListening,
    stopListening,
    toggle,
    speak,
    updateContext,
    registerHandler,
    getVoiceCommands,
    clearHistory
  }
}

interface UseCalendarNavigationVoiceOptions {
  onDateChange?: (date: Date) => void
  onViewChange?: (view: 'day' | 'week' | 'month') => void
  initialDate?: Date
  initialView?: 'day' | 'week' | 'month'
}

export function useCalendarNavigationVoice(options: UseCalendarNavigationVoiceOptions = {}) {
  const {
    onDateChange,
    onViewChange,
    initialDate = new Date(),
    initialView = 'week'
  } = options

  const [currentDate, setCurrentDate] = useState(initialDate)
  const [currentView, setCurrentView] = useState(initialView)

  const { registerHandler, updateContext } = useCalendarVoiceCommands({
    contextUpdates: {
      selectedDate: currentDate,
      currentView
    },
    onNavigationChange: (date, view) => {
      setCurrentDate(date)
      setCurrentView(view as any)
      onDateChange?.(date)
      onViewChange?.(view as any)
    }
  })

  // Register custom navigation handlers
  useEffect(() => {
    registerHandler('calendar:navigate:custom', async (params) => {
      // Custom navigation logic
      return {
        success: true,
        action: {
          type: 'navigation',
          action: 'custom',
          parameters: params,
          confidence: 0.9,
          timestamp: Date.now()
        },
        response: 'Custom navigation completed',
        data: { date: currentDate, view: currentView }
      }
    })
  }, [registerHandler, currentDate, currentView])

  const navigateToDate = useCallback((date: Date) => {
    setCurrentDate(date)
    updateContext({ selectedDate: date })
    onDateChange?.(date)
  }, [updateContext, onDateChange])

  const changeView = useCallback((view: 'day' | 'week' | 'month') => {
    setCurrentView(view)
    updateContext({ currentView: view })
    onViewChange?.(view)
  }, [updateContext, onViewChange])

  return {
    currentDate,
    currentView,
    navigateToDate,
    changeView
  }
}

interface UseCalendarBookingVoiceOptions {
  onBookingStart?: () => void
  onServiceSelected?: (service: string) => void
  onTimeSelected?: (time: Date) => void
  onBarberSelected?: (barber: string) => void
  onBookingComplete?: (bookingData: any) => void
}

export function useCalendarBookingVoice(options: UseCalendarBookingVoiceOptions = {}) {
  const {
    onBookingStart,
    onServiceSelected,
    onTimeSelected,
    onBarberSelected,
    onBookingComplete
  } = options

  const [bookingStep, setBookingStep] = useState<string | null>(null)
  const [bookingData, setBookingData] = useState<any>({})

  const { registerHandler, updateContext, speak } = useCalendarVoiceCommands({
    onBookingAction: (action, data) => {
      switch (action) {
        case 'new':
          setBookingStep('service')
          setBookingData({})
          updateContext({ isBookingMode: true })
          onBookingStart?.()
          break
        
        case 'service':
          setBookingStep('time')
          setBookingData(prev => ({ ...prev, service: data.service }))
          onServiceSelected?.(data.service)
          break
        
        case 'time':
          setBookingStep('barber')
          setBookingData(prev => ({ ...prev, time: data.appointmentTime }))
          onTimeSelected?.(data.appointmentTime)
          break
        
        case 'barber':
          setBookingStep('confirm')
          setBookingData(prev => ({ ...prev, barber: data.barber }))
          onBarberSelected?.(data.barber)
          break
      }
    }
  })

  // Register booking completion handler
  useEffect(() => {
    registerHandler('calendar:booking:confirm', async (params) => {
      const completedBooking = { ...bookingData, confirmed: true }
      onBookingComplete?.(completedBooking)
      
      setBookingStep(null)
      setBookingData({})
      updateContext({ isBookingMode: false })
      
      return {
        success: true,
        action: {
          type: 'booking',
          action: 'confirm',
          parameters: params,
          confidence: 0.9,
          timestamp: Date.now()
        },
        response: 'Booking confirmed successfully!',
        data: completedBooking
      }
    })
  }, [registerHandler, bookingData, onBookingComplete, updateContext])

  const cancelBooking = useCallback(() => {
    setBookingStep(null)
    setBookingData({})
    updateContext({ isBookingMode: false })
    speak('Booking cancelled')
  }, [updateContext, speak])

  const completeBooking = useCallback(() => {
    if (bookingData.service && bookingData.time && bookingData.barber) {
      const completedBooking = { ...bookingData, confirmed: true }
      onBookingComplete?.(completedBooking)
      
      setBookingStep(null)
      setBookingData({})
      updateContext({ isBookingMode: false })
      speak('Booking completed successfully!')
    } else {
      speak('Please complete all booking details first')
    }
  }, [bookingData, onBookingComplete, updateContext, speak])

  return {
    bookingStep,
    bookingData,
    isBooking: bookingStep !== null,
    cancelBooking,
    completeBooking
  }
}

interface UseCalendarSearchVoiceOptions {
  onSearch?: (query: string, type: string, results: any[]) => void
  searchFunction?: (query: string, type: string) => Promise<any[]>
}

export function useCalendarSearchVoice(options: UseCalendarSearchVoiceOptions = {}) {
  const { onSearch, searchFunction } = options
  
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const { speak } = useCalendarVoiceCommands({
    onSearchAction: async (query, type) => {
      setSearchQuery(query)
      setSearchType(type)
      setIsSearching(true)
      
      try {
        let results: any[] = []
        
        if (searchFunction) {
          results = await searchFunction(query, type)
        } else {
          // Default search simulation
          results = [
            { id: 1, type, name: query, relevance: 0.9 },
            { id: 2, type, name: `${query} (related)`, relevance: 0.7 }
          ]
        }
        
        setSearchResults(results)
        onSearch?.(query, type, results)
        
        const resultCount = results.length
        speak(`Found ${resultCount} ${resultCount === 1 ? 'result' : 'results'} for ${query}`)
        
      } catch (error) {
        speak(`Sorry, I couldn't search for ${query}. Please try again.`)
        console.error('Search error:', error)
      } finally {
        setIsSearching(false)
      }
    }
  })

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchType('')
    setSearchResults([])
  }, [])

  return {
    searchQuery,
    searchType,
    searchResults,
    isSearching,
    hasResults: searchResults.length > 0,
    clearSearch
  }
}