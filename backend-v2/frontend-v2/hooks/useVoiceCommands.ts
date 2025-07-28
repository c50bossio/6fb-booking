/**
 * Voice Commands Hook
 * React hook for voice command accessibility integration
 * Version: 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getVoiceCommandsSystem, VoiceCommandConfig, VoiceCommand, VoiceAccessibilityState, VoiceCommandMatch } from '@/lib/voice-commands-accessibility'
import type VoiceCommandsAccessibilitySystem from '@/lib/voice-commands-accessibility'

interface UseVoiceCommandsOptions {
  config?: Partial<VoiceCommandConfig>
  customCommands?: VoiceCommand[]
  autoInit?: boolean
  onCommand?: (match: VoiceCommandMatch) => void
  onUnrecognized?: (transcript: string) => void
  onError?: (error: string) => void
}

interface UseVoiceCommandsReturn {
  // State
  isListening: boolean
  isSupported: boolean
  isEnabled: boolean
  hasPermission: boolean
  currentCommand: string | null
  error: string | null
  confidence: number | null
  lastTranscript: string | null
  
  // Actions
  startListening: () => Promise<boolean>
  stopListening: () => void
  toggle: () => Promise<boolean>
  speak: (text: string, options?: any) => void
  
  // Commands
  addCommand: (command: VoiceCommand) => void
  removeCommand: (commandId: string) => void
  getCommands: (category?: string) => VoiceCommand[]
  getHelpText: () => string
  
  // Configuration
  updateConfig: (config: Partial<VoiceCommandConfig>) => void
  
  // System
  system: VoiceCommandsAccessibilitySystem | null
}

/**
 * Main voice commands hook
 */
export function useVoiceCommands(options: UseVoiceCommandsOptions = {}): UseVoiceCommandsReturn {
  const {
    config,
    customCommands,
    autoInit = true,
    onCommand,
    onUnrecognized,
    onError
  } = options

  const [system, setSystem] = useState<VoiceCommandsAccessibilitySystem | null>(null)
  const [state, setState] = useState<VoiceAccessibilityState>({
    isListening: false,
    isSupported: false,
    isEnabled: false,
    hasPermission: false,
    currentCommand: null,
    lastResult: null,
    error: null,
    volume: 0.8,
    language: 'en-US'
  })
  
  const [confidence, setConfidence] = useState<number | null>(null)
  const [lastTranscript, setLastTranscript] = useState<string | null>(null)
  
  const stateRef = useRef(state)
  stateRef.current = state

  // Initialize voice commands system
  useEffect(() => {
    if (!autoInit) return

    const voiceSystem = getVoiceCommandsSystem(config, customCommands)
    setSystem(voiceSystem)

    // Setup event listeners
    const handleStateUpdate = () => {
      const currentState = voiceSystem.getStatus()
      setState(currentState)
    }

    const handleCommand = (data: {
      command: VoiceCommand
      parameters: Record<string, string>
      confidence: number
      transcript: string
    }) => {
      setConfidence(data.confidence)
      setLastTranscript(data.transcript)
      onCommand?.(data)
    }

    const handleUnrecognized = (data: { transcript: string }) => {
      setLastTranscript(data.transcript)
      onUnrecognized?.(data.transcript)
    }

    const handleError = (data: { error: string }) => {
      onError?.(data.error)
    }

    const handleResult = (result: any) => {
      setLastTranscript(result.transcript)
      setConfidence(result.confidence)
    }

    voiceSystem.on('command:executed', handleCommand)
    voiceSystem.on('command:unrecognized', handleUnrecognized)
    voiceSystem.on('recognition:error', handleError)
    voiceSystem.on('recognition:result', handleResult)
    voiceSystem.on('listening:started', handleStateUpdate)
    voiceSystem.on('listening:stopped', handleStateUpdate)

    // Initial state sync
    handleStateUpdate()

    return () => {
      voiceSystem.off('command:executed', handleCommand)
      voiceSystem.off('command:unrecognized', handleUnrecognized)
      voiceSystem.off('recognition:error', handleError)
      voiceSystem.off('recognition:result', handleResult)
      voiceSystem.off('listening:started', handleStateUpdate)
      voiceSystem.off('listening:stopped', handleStateUpdate)
    }
  }, [autoInit, config, customCommands, onCommand, onUnrecognized, onError])

  // Voice control actions
  const startListening = useCallback(async (): Promise<boolean> => {
    if (!system) return false
    const success = await system.startListening()
    setState(system.getStatus())
    return success
  }, [system])

  const stopListening = useCallback(() => {
    if (!system) return
    system.stopListening()
    setState(system.getStatus())
  }, [system])

  const toggle = useCallback(async (): Promise<boolean> => {
    if (!system) return false
    const isEnabled = await system.toggle()
    setState(system.getStatus())
    return isEnabled
  }, [system])

  const speak = useCallback((text: string, options?: any) => {
    if (!system) return
    system.speak(text, options)
  }, [system])

  // Command management
  const addCommand = useCallback((command: VoiceCommand) => {
    if (!system) return
    system.addCommand(command)
  }, [system])

  const removeCommand = useCallback((commandId: string) => {
    if (!system) return
    system.removeCommand(commandId)
  }, [system])

  const getCommands = useCallback((category?: string) => {
    if (!system) return []
    return system.getCommands(category)
  }, [system])

  const getHelpText = useCallback(() => {
    if (!system) return ''
    return system.getHelpText()
  }, [system])

  // Configuration
  const updateConfig = useCallback((newConfig: Partial<VoiceCommandConfig>) => {
    if (!system) return
    system.updateConfig(newConfig)
    setState(system.getStatus())
  }, [system])

  return {
    // State
    isListening: state.isListening,
    isSupported: state.isSupported,
    isEnabled: state.isEnabled,
    hasPermission: state.hasPermission,
    currentCommand: state.currentCommand,
    error: state.error,
    confidence,
    lastTranscript,

    // Actions
    startListening,
    stopListening,
    toggle,
    speak,

    // Commands
    addCommand,
    removeCommand,
    getCommands,
    getHelpText,

    // Configuration
    updateConfig,

    // System
    system
  }
}

/**
 * Hook for booking-specific voice commands
 */
export function useVoiceBookingCommands() {
  const voiceCommands = useVoiceCommands({
    config: {
      wakeWord: 'hey barber',
      autoStart: false,
      visualFeedback: true,
      audioFeedback: true
    }
  })

  const [bookingCommands, setBookingCommands] = useState<{
    serviceSelected: string | null
    barberSelected: string | null
    timeSelected: string | null
    formData: Record<string, string>
  }>({
    serviceSelected: null,
    barberSelected: null,
    timeSelected: null,
    formData: {}
  })

  // Handle booking-specific commands
  useEffect(() => {
    if (!voiceCommands.system) return

    const handleBookingCommand = (match: VoiceCommandMatch) => {
      const { command, parameters } = match

      switch (command.action) {
        case 'booking:select-service':
          setBookingCommands(prev => ({
            ...prev,
            serviceSelected: parameters.service
          }))
          break

        case 'booking:select-barber':
          setBookingCommands(prev => ({
            ...prev,
            barberSelected: parameters.barber
          }))
          break

        case 'booking:select-time':
          setBookingCommands(prev => ({
            ...prev,
            timeSelected: parameters.time
          }))
          break

        case 'form:name':
        case 'form:email':
        case 'form:phone':
          const field = command.action.split(':')[1]
          setBookingCommands(prev => ({
            ...prev,
            formData: {
              ...prev.formData,
              [field]: parameters[field]
            }
          }))
          break
      }
    }

    voiceCommands.system.on('command:executed', handleBookingCommand)

    return () => {
      voiceCommands.system?.off('command:executed', handleBookingCommand)
    }
  }, [voiceCommands.system])

  const clearBookingData = useCallback(() => {
    setBookingCommands({
      serviceSelected: null,
      barberSelected: null,
      timeSelected: null,
      formData: {}
    })
  }, [])

  return {
    ...voiceCommands,
    bookingCommands,
    clearBookingData
  }
}

/**
 * Hook for accessibility-focused voice commands
 */
export function useVoiceAccessibility() {
  const voiceCommands = useVoiceCommands({
    config: {
      continuous: true,
      interimResults: false,
      confidenceThreshold: 0.6,
      audioFeedback: true,
      visualFeedback: true
    }
  })

  const [navigationHistory, setNavigationHistory] = useState<string[]>([])
  const [accessibilityMode, setAccessibilityMode] = useState(false)

  // Get only accessibility commands
  const accessibilityCommands = useCallback(() => {
    return voiceCommands.getCommands().filter(cmd => cmd.accessibility === true)
  }, [voiceCommands])

  // Handle navigation commands
  useEffect(() => {
    if (!voiceCommands.system) return

    const handleNavigationCommand = (match: VoiceCommandMatch) => {
      const { command } = match

      if (command.category === 'navigation') {
        setNavigationHistory(prev => [
          ...prev.slice(-9), // Keep last 9 items
          command.action
        ])
      }
    }

    voiceCommands.system.on('command:executed', handleNavigationCommand)

    return () => {
      voiceCommands.system?.off('command:executed', handleNavigationCommand)
    }
  }, [voiceCommands.system])

  const enableAccessibilityMode = useCallback(() => {
    setAccessibilityMode(true)
    voiceCommands.updateConfig({
      audioFeedback: true,
      visualFeedback: true,
      continuous: true,
      wakeWord: null // Remove wake word for accessibility
    })
    voiceCommands.speak('Accessibility mode enabled. Voice commands are now active.')
  }, [voiceCommands])

  const disableAccessibilityMode = useCallback(() => {
    setAccessibilityMode(false)
    voiceCommands.stopListening()
    voiceCommands.speak('Accessibility mode disabled.')
  }, [voiceCommands])

  return {
    ...voiceCommands,
    accessibilityCommands,
    navigationHistory,
    accessibilityMode,
    enableAccessibilityMode,
    disableAccessibilityMode
  }
}

/**
 * Hook for voice command help and training
 */
export function useVoiceCommandHelp() {
  const voiceCommands = useVoiceCommands()
  const [currentCategory, setCurrentCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const categories = ['navigation', 'booking', 'form', 'general']

  const filteredCommands = useCallback(() => {
    let commands = currentCategory === 'all' 
      ? voiceCommands.getCommands()
      : voiceCommands.getCommands(currentCategory)

    if (searchQuery) {
      commands = commands.filter(cmd =>
        cmd.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cmd.examples.some(example => 
          example.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    }

    return commands
  }, [voiceCommands, currentCategory, searchQuery])

  const speakCommandHelp = useCallback((command: VoiceCommand) => {
    const helpText = `${command.description}. Example: ${command.examples[0]}`
    voiceCommands.speak(helpText)
  }, [voiceCommands])

  const speakCategoryHelp = useCallback((category: string) => {
    const commands = voiceCommands.getCommands(category)
    const helpText = `${category} commands: ${commands.map(cmd => cmd.examples[0]).join(', ')}`
    voiceCommands.speak(helpText)
  }, [voiceCommands])

  return {
    ...voiceCommands,
    categories,
    currentCategory,
    setCurrentCategory,
    searchQuery,
    setSearchQuery,
    filteredCommands,
    speakCommandHelp,
    speakCategoryHelp
  }
}

/**
 * Hook for voice command analytics and usage tracking
 */
export function useVoiceCommandAnalytics() {
  const voiceCommands = useVoiceCommands()
  const [analytics, setAnalytics] = useState({
    totalCommands: 0,
    successfulCommands: 0,
    failedCommands: 0,
    averageConfidence: 0,
    mostUsedCommands: [] as Array<{ command: string; count: number }>,
    sessionStartTime: Date.now()
  })

  // Track command usage
  useEffect(() => {
    if (!voiceCommands.system) return

    const handleCommandExecuted = (data: VoiceCommandMatch) => {
      setAnalytics(prev => ({
        ...prev,
        totalCommands: prev.totalCommands + 1,
        successfulCommands: prev.successfulCommands + 1,
        averageConfidence: (prev.averageConfidence + data.confidence) / 2
      }))
    }

    const handleCommandUnrecognized = () => {
      setAnalytics(prev => ({
        ...prev,
        totalCommands: prev.totalCommands + 1,
        failedCommands: prev.failedCommands + 1
      }))
    }

    voiceCommands.system.on('command:executed', handleCommandExecuted)
    voiceCommands.system.on('command:unrecognized', handleCommandUnrecognized)

    return () => {
      voiceCommands.system?.off('command:executed', handleCommandExecuted)
      voiceCommands.system?.off('command:unrecognized', handleCommandUnrecognized)
    }
  }, [voiceCommands.system])

  const getSuccessRate = useCallback(() => {
    if (analytics.totalCommands === 0) return 0
    return (analytics.successfulCommands / analytics.totalCommands) * 100
  }, [analytics])

  const getSessionDuration = useCallback(() => {
    return Math.round((Date.now() - analytics.sessionStartTime) / 1000 / 60) // minutes
  }, [analytics.sessionStartTime])

  const resetAnalytics = useCallback(() => {
    setAnalytics({
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      averageConfidence: 0,
      mostUsedCommands: [],
      sessionStartTime: Date.now()
    })
  }, [])

  return {
    ...voiceCommands,
    analytics,
    getSuccessRate,
    getSessionDuration,
    resetAnalytics
  }
}

export default useVoiceCommands