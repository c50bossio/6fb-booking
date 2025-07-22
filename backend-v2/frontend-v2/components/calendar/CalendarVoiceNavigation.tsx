'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  MicrophoneIcon, 
  SpeakerWaveIcon, 
  StopIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { useCalendarInteraction } from '@/hooks/useCalendarInteraction'
import { useCalendarCore } from '@/hooks/useCalendarCore'

interface VoiceCommand {
  pattern: RegExp
  action: string
  description: string
  parameters?: string[]
  examples: string[]
}

interface VoiceNavigationProps {
  onNavigateToday?: () => void
  onNavigateDate?: (date: Date) => void
  onChangeView?: (view: 'day' | 'week' | 'month') => void
  onCreateAppointment?: (date?: Date) => void
  onSearchAppointments?: (query: string) => void
  currentDate: Date
  currentView: 'day' | 'week' | 'month'
  enabled?: boolean
}

/**
 * Advanced voice navigation system for calendar accessibility
 * Supports natural language commands and voice feedback
 */
export function CalendarVoiceNavigation({
  onNavigateToday,
  onNavigateDate,
  onChangeView,
  onCreateAppointment,
  onSearchAppointments,
  currentDate,
  currentView,
  enabled = true
}: VoiceNavigationProps) {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastCommand, setLastCommand] = useState<string>('')
  const [feedback, setFeedback] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [showCommands, setShowCommands] = useState(false)
  
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const speechSynthRef = useRef<SpeechSynthesis | null>(null)
  const commandTimeoutRef = useRef<NodeJS.Timeout>()

  const { announceToScreenReader } = useCalendarInteraction({
    announceChanges: true
  })

  // Voice commands configuration
  const voiceCommands: VoiceCommand[] = [
    // Navigation commands
    {
      pattern: /^(go to today|navigate to today|today)$/i,
      action: 'navigate_today',
      description: 'Navigate to today',
      examples: ['Go to today', 'Today', 'Navigate to today']
    },
    {
      pattern: /^(next|go forward|forward)$/i,
      action: 'navigate_next',
      description: 'Navigate to next period',
      examples: ['Next', 'Go forward', 'Forward']
    },
    {
      pattern: /^(previous|go back|back)$/i,
      action: 'navigate_previous',
      description: 'Navigate to previous period',
      examples: ['Previous', 'Go back', 'Back']
    },
    
    // View commands
    {
      pattern: /^(day view|show day|daily view)$/i,
      action: 'view_day',
      description: 'Switch to day view',
      examples: ['Day view', 'Show day', 'Daily view']
    },
    {
      pattern: /^(week view|show week|weekly view)$/i,
      action: 'view_week',
      description: 'Switch to week view',
      examples: ['Week view', 'Show week', 'Weekly view']
    },
    {
      pattern: /^(month view|show month|monthly view)$/i,
      action: 'view_month',
      description: 'Switch to month view',
      examples: ['Month view', 'Show month', 'Monthly view']
    },
    
    // Appointment commands
    {
      pattern: /^(create appointment|new appointment|book appointment|add appointment)$/i,
      action: 'create_appointment',
      description: 'Create new appointment',
      examples: ['Create appointment', 'New appointment', 'Book appointment']
    },
    {
      pattern: /^search for (.+)$/i,
      action: 'search_appointments',
      description: 'Search appointments',
      parameters: ['query'],
      examples: ['Search for haircut', 'Search for John Smith']
    },
    
    // Date navigation
    {
      pattern: /^go to (.+)$/i,
      action: 'navigate_to_date',
      description: 'Navigate to specific date',
      parameters: ['date'],
      examples: ['Go to tomorrow', 'Go to next Monday', 'Go to December 25th']
    },
    
    // Help and utility commands
    {
      pattern: /^(help|what can I say|commands)$/i,
      action: 'show_help',
      description: 'Show available commands',
      examples: ['Help', 'What can I say', 'Commands']
    },
    {
      pattern: /^(where am I|what day|current date)$/i,
      action: 'current_status',
      description: 'Announce current date and view',
      examples: ['Where am I', 'What day', 'Current date']
    }
  ]

  // Initialize speech recognition
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const speechSynthesis = window.speechSynthesis

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'
      recognition.maxAlternatives = 3

      recognition.onstart = () => {
        setIsListening(true)
        setError('')
        announceToScreenReader('Voice recognition started. Speak your command.')
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.onerror = (event: any) => {
        setIsListening(false)
        setError(`Recognition error: ${event.error}`)
        announceToScreenReader(`Voice recognition error: ${event.error}`)
      }

      recognition.onresult = (event: any) => {
        const command = event.results[0][0].transcript.trim()
        setLastCommand(command)
        processVoiceCommand(command)
      }

      recognitionRef.current = recognition
    }

    if (speechSynthesis) {
      speechSynthRef.current = speechSynthesis
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (commandTimeoutRef.current) {
        clearTimeout(commandTimeoutRef.current)
      }
    }
  }, [enabled])

  // Process voice command
  const processVoiceCommand = useCallback(async (command: string) => {
    setIsProcessing(true)
    setError('')

    try {
      // Find matching command
      const matchedCommand = voiceCommands.find(cmd => cmd.pattern.test(command))

      if (!matchedCommand) {
        setError('Command not recognized. Say "help" for available commands.')
        speakFeedback('Command not recognized. Say help for available commands.')
        return
      }

      const match = command.match(matchedCommand.pattern)
      const parameters = match?.slice(1) || []

      // Execute command
      let success = false
      let feedbackMessage = ''

      switch (matchedCommand.action) {
        case 'navigate_today':
          onNavigateToday?.()
          feedbackMessage = 'Navigated to today'
          success = true
          break

        case 'navigate_next':
          // Implementation depends on current view
          if (currentView === 'day') {
            const nextDay = new Date(currentDate)
            nextDay.setDate(nextDay.getDate() + 1)
            onNavigateDate?.(nextDay)
            feedbackMessage = `Navigated to ${nextDay.toLocaleDateString()}`
          } else if (currentView === 'week') {
            const nextWeek = new Date(currentDate)
            nextWeek.setDate(nextWeek.getDate() + 7)
            onNavigateDate?.(nextWeek)
            feedbackMessage = 'Navigated to next week'
          } else {
            const nextMonth = new Date(currentDate)
            nextMonth.setMonth(nextMonth.getMonth() + 1)
            onNavigateDate?.(nextMonth)
            feedbackMessage = 'Navigated to next month'
          }
          success = true
          break

        case 'navigate_previous':
          if (currentView === 'day') {
            const prevDay = new Date(currentDate)
            prevDay.setDate(prevDay.getDate() - 1)
            onNavigateDate?.(prevDay)
            feedbackMessage = `Navigated to ${prevDay.toLocaleDateString()}`
          } else if (currentView === 'week') {
            const prevWeek = new Date(currentDate)
            prevWeek.setDate(prevWeek.getDate() - 7)
            onNavigateDate?.(prevWeek)
            feedbackMessage = 'Navigated to previous week'
          } else {
            const prevMonth = new Date(currentDate)
            prevMonth.setMonth(prevMonth.getMonth() - 1)
            onNavigateDate?.(prevMonth)
            feedbackMessage = 'Navigated to previous month'
          }
          success = true
          break

        case 'view_day':
          onChangeView?.('day')
          feedbackMessage = 'Switched to day view'
          success = true
          break

        case 'view_week':
          onChangeView?.('week')
          feedbackMessage = 'Switched to week view'
          success = true
          break

        case 'view_month':
          onChangeView?.('month')
          feedbackMessage = 'Switched to month view'
          success = true
          break

        case 'create_appointment':
          onCreateAppointment?.()
          feedbackMessage = 'Opening appointment creation'
          success = true
          break

        case 'search_appointments':
          if (parameters[0]) {
            onSearchAppointments?.(parameters[0])
            feedbackMessage = `Searching for ${parameters[0]}`
            success = true
          }
          break

        case 'navigate_to_date':
          if (parameters[0]) {
            const parsedDate = parseNaturalDate(parameters[0])
            if (parsedDate) {
              onNavigateDate?.(parsedDate)
              feedbackMessage = `Navigated to ${parsedDate.toLocaleDateString()}`
              success = true
            } else {
              feedbackMessage = 'Could not understand the date'
            }
          }
          break

        case 'show_help':
          setShowCommands(true)
          feedbackMessage = 'Showing available voice commands'
          success = true
          break

        case 'current_status':
          feedbackMessage = `Currently viewing ${currentView} view for ${currentDate.toLocaleDateString()}`
          success = true
          break

        default:
          feedbackMessage = 'Command not implemented yet'
      }

      setFeedback(feedbackMessage)
      speakFeedback(feedbackMessage)
      announceToScreenReader(feedbackMessage)

      if (success) {
        // Clear feedback after 3 seconds
        commandTimeoutRef.current = setTimeout(() => {
          setFeedback('')
        }, 3000)
      }

    } catch (error: any) {
      const errorMessage = `Error processing command: ${error.message}`
      setError(errorMessage)
      speakFeedback(errorMessage)
      announceToScreenReader(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }, [voiceCommands, currentDate, currentView, onNavigateToday, onNavigateDate, onChangeView, onCreateAppointment, onSearchAppointments, announceToScreenReader])

  // Speak feedback using text-to-speech
  const speakFeedback = useCallback((text: string) => {
    if (!speechSynthRef.current) return

    // Cancel any ongoing speech
    speechSynthRef.current.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1
    utterance.pitch = 1
    utterance.volume = 0.8

    speechSynthRef.current.speak(utterance)
  }, [])

  // Parse natural language dates
  const parseNaturalDate = useCallback((dateString: string): Date | null => {
    const today = new Date()
    const lower = dateString.toLowerCase()

    // Simple date parsing - in production, use a proper date parsing library
    if (lower.includes('tomorrow')) {
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow
    }

    if (lower.includes('yesterday')) {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return yesterday
    }

    if (lower.includes('next week')) {
      const nextWeek = new Date(today)
      nextWeek.setDate(nextWeek.getDate() + 7)
      return nextWeek
    }

    if (lower.includes('next month')) {
      const nextMonth = new Date(today)
      nextMonth.setMonth(nextMonth.getMonth() + 1)
      return nextMonth
    }

    // Try to parse as a regular date
    const parsed = new Date(dateString)
    return isNaN(parsed.getTime()) ? null : parsed
  }, [])

  // Start/stop voice recognition
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition not supported in this browser')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
    } else {
      recognitionRef.current.start()
    }
  }, [isListening])

  if (!enabled) return null

  return (
    <>
      {/* Voice Control Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={toggleListening}
          className={`rounded-full w-14 h-14 shadow-lg transition-all duration-200 ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
          disabled={isProcessing}
        >
          {isListening ? (
            <StopIcon className="w-6 h-6" />
          ) : (
            <MicrophoneIcon className="w-6 h-6" />
          )}
        </Button>
      </div>

      {/* Status Display */}
      {(isListening || isProcessing || feedback || error) && (
        <div className="fixed bottom-20 right-4 z-50 max-w-sm">
          <Card className="shadow-lg border-2">
            <CardContent className="p-4">
              {isListening && (
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Listening...</span>
                </div>
              )}

              {isProcessing && (
                <div className="flex items-center gap-2 text-orange-600">
                  <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium">Processing...</span>
                </div>
              )}

              {feedback && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span className="text-sm">{feedback}</span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-red-600">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {lastCommand && (
                <div className="mt-2 pt-2 border-t">
                  <div className="text-xs text-gray-500">
                    Last command: "{lastCommand}"
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Command Help Modal */}
      {showCommands && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Voice Commands</h2>
                <Button
                  variant="ghost"
                  onClick={() => setShowCommands(false)}
                  className="rounded-full"
                >
                  ×
                </Button>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You can use these voice commands to navigate the calendar:
                </p>

                {voiceCommands.map((cmd, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <h3 className="font-medium text-sm">{cmd.description}</h3>
                    <div className="mt-1">
                      <span className="text-xs text-gray-500">Examples:</span>
                      <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {cmd.examples.map((example, i) => (
                          <li key={i} className="ml-2">• "{example}"</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}

                <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h3 className="font-medium text-sm text-blue-800 dark:text-blue-200">
                    Tips for better recognition:
                  </h3>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                    <li>• Speak clearly and at normal pace</li>
                    <li>• Use the exact phrases shown above</li>
                    <li>• Ensure microphone permissions are granted</li>
                    <li>• Use in a quiet environment</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}