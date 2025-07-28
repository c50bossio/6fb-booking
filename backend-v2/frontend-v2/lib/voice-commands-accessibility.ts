/**
 * Voice Commands Accessibility System
 * Speech recognition and voice navigation for enhanced accessibility
 * Version: 1.0.0
 */

export interface VoiceCommandConfig {
  enabled: boolean
  language: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  confidenceThreshold: number
  autoStart: boolean
  visualFeedback: boolean
  audioFeedback: boolean
  wakeWord: string | null
  commandTimeout: number // milliseconds
  feedbackVolume: number // 0-1
}

export interface VoiceCommand {
  id: string
  patterns: string[]
  action: string
  parameters?: string[]
  description: string
  examples: string[]
  category: 'navigation' | 'booking' | 'form' | 'general'
  accessibility?: boolean
  confidence?: number
}

export interface VoiceRecognitionResult {
  transcript: string
  confidence: number
  isFinal: boolean
  alternatives: Array<{
    transcript: string
    confidence: number
  }>
  timestamp: number
}

export interface VoiceCommandMatch {
  command: VoiceCommand
  confidence: number
  parameters: Record<string, string>
  transcript: string
}

export interface VoiceAccessibilityState {
  isListening: boolean
  isSupported: boolean
  isEnabled: boolean
  hasPermission: boolean
  currentCommand: string | null
  lastResult: VoiceRecognitionResult | null
  error: string | null
  volume: number
  language: string
}

const DEFAULT_CONFIG: VoiceCommandConfig = {
  enabled: true,
  language: 'en-US',
  continuous: true,
  interimResults: true,
  maxAlternatives: 3,
  confidenceThreshold: 0.7,
  autoStart: false,
  visualFeedback: true,
  audioFeedback: true,
  wakeWord: 'hey barber',
  commandTimeout: 5000,
  feedbackVolume: 0.8
}

const DEFAULT_COMMANDS: VoiceCommand[] = [
  // Navigation Commands
  {
    id: 'next-step',
    patterns: ['next step', 'continue', 'go forward', 'next', 'proceed'],
    action: 'navigate:next',
    description: 'Move to the next step in the booking process',
    examples: ['Next step', 'Continue', 'Go forward'],
    category: 'navigation',
    accessibility: true
  },
  {
    id: 'previous-step',
    patterns: ['previous step', 'go back', 'back', 'previous', 'return'],
    action: 'navigate:previous',
    description: 'Return to the previous step',
    examples: ['Previous step', 'Go back', 'Back'],
    category: 'navigation',
    accessibility: true
  },
  {
    id: 'go-to-step',
    patterns: ['go to *', 'navigate to *', 'jump to *', 'show me *'],
    action: 'navigate:goto',
    parameters: ['step'],
    description: 'Navigate to a specific step by name',
    examples: ['Go to payment', 'Navigate to service selection', 'Show me confirmation'],
    category: 'navigation',
    accessibility: true
  },

  // Booking Commands
  {
    id: 'book-service',
    patterns: ['book *', 'I want *', 'schedule *', 'reserve *'],
    action: 'booking:select-service',
    parameters: ['service'],
    description: 'Select a service for booking',
    examples: ['Book a haircut', 'I want a beard trim', 'Schedule a full service'],
    category: 'booking'
  },
  {
    id: 'quick-booking',
    patterns: ['quick booking', 'fast booking', 'quick book', 'express booking'],
    action: 'booking:quick',
    description: 'Start quick booking flow',
    examples: ['Quick booking', 'Fast booking', 'Express booking'],
    category: 'booking'
  },
  {
    id: 'repeat-booking',
    patterns: ['repeat last booking', 'book again', 'same as last time', 'repeat appointment'],
    action: 'booking:repeat',
    description: 'Repeat the last booking',
    examples: ['Repeat last booking', 'Book again', 'Same as last time'],
    category: 'booking'
  },
  {
    id: 'select-barber',
    patterns: ['choose * barber', 'I want *', 'book with *', 'any barber'],
    action: 'booking:select-barber',
    parameters: ['barber'],
    description: 'Select a specific barber or any available',
    examples: ['Choose John', 'I want Mike', 'Any barber'],
    category: 'booking'
  },
  {
    id: 'select-time',
    patterns: ['book for *', 'schedule at *', 'I want * appointment', 'time *'],
    action: 'booking:select-time',
    parameters: ['time'],
    description: 'Select appointment time',
    examples: ['Book for 2 PM', 'Schedule at 10:30', 'Time 3 o\'clock'],
    category: 'booking'
  },

  // Form Input Commands
  {
    id: 'enter-name',
    patterns: ['my name is *', 'name *', 'I am *', 'call me *'],
    action: 'form:name',
    parameters: ['name'],
    description: 'Enter customer name',
    examples: ['My name is John Smith', 'Name John', 'I am Sarah'],
    category: 'form',
    accessibility: true
  },
  {
    id: 'enter-email',
    patterns: ['my email is *', 'email *', 'my email address is *'],
    action: 'form:email',
    parameters: ['email'],
    description: 'Enter email address',
    examples: ['My email is john@example.com', 'Email test@gmail.com'],
    category: 'form',
    accessibility: true
  },
  {
    id: 'enter-phone',
    patterns: ['my phone is *', 'phone *', 'my number is *', 'call me at *'],
    action: 'form:phone',
    parameters: ['phone'],
    description: 'Enter phone number',
    examples: ['My phone is 555-1234', 'Phone 555-5678', 'Call me at 555-9999'],
    category: 'form',
    accessibility: true
  },

  // General Commands
  {
    id: 'help',
    patterns: ['help', 'what can I say', 'voice commands', 'how to use', 'instructions'],
    action: 'general:help',
    description: 'Show available voice commands',
    examples: ['Help', 'What can I say', 'Voice commands'],
    category: 'general',
    accessibility: true
  },
  {
    id: 'cancel',
    patterns: ['cancel', 'stop', 'nevermind', 'abort', 'quit'],
    action: 'general:cancel',
    description: 'Cancel current action or booking',
    examples: ['Cancel', 'Stop', 'Nevermind'],
    category: 'general',
    accessibility: true
  },
  {
    id: 'start-over',
    patterns: ['start over', 'restart', 'begin again', 'reset'],
    action: 'general:reset',
    description: 'Restart the booking process',
    examples: ['Start over', 'Restart', 'Begin again'],
    category: 'general'
  },
  {
    id: 'confirm',
    patterns: ['yes', 'confirm', 'correct', 'that\'s right', 'ok', 'okay'],
    action: 'general:confirm',
    description: 'Confirm an action or input',
    examples: ['Yes', 'Confirm', 'That\'s right'],
    category: 'general',
    accessibility: true
  },
  {
    id: 'deny',
    patterns: ['no', 'incorrect', 'that\'s wrong', 'not right'],
    action: 'general:deny',
    description: 'Reject or correct an action',
    examples: ['No', 'Incorrect', 'That\'s wrong'],
    category: 'general',
    accessibility: true
  }
]

export class VoiceCommandsAccessibilitySystem {
  private config: VoiceCommandConfig
  private commands: VoiceCommand[]
  private recognition: SpeechRecognition | null = null
  private synthesis: SpeechSynthesis | null = null
  private state: VoiceAccessibilityState
  private listeners: Map<string, Function[]> = new Map()
  private isInitialized: boolean = false
  private wakePhraseDetected: boolean = false
  private lastCommandTime: number = 0

  constructor(config?: Partial<VoiceCommandConfig>, customCommands?: VoiceCommand[]) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.commands = [...DEFAULT_COMMANDS, ...(customCommands || [])]
    this.state = {
      isListening: false,
      isSupported: false,
      isEnabled: false,
      hasPermission: false,
      currentCommand: null,
      lastResult: null,
      error: null,
      volume: this.config.feedbackVolume,
      language: this.config.language
    }
    
    this.initializeSystem()
  }

  private async initializeSystem() {
    console.log('🎤 Initializing Voice Commands Accessibility System...')

    // Check for speech recognition support
    this.state.isSupported = this.checkSpeechSupport()
    
    if (!this.state.isSupported) {
      console.warn('Speech recognition not supported on this browser')
      return
    }

    try {
      // Setup speech recognition
      await this.setupSpeechRecognition()

      // Setup speech synthesis
      this.setupSpeechSynthesis()

      // Request microphone permission
      if (this.config.autoStart) {
        await this.requestMicrophonePermission()
      }

      this.isInitialized = true
      console.log('✅ Voice Commands Accessibility System initialized')

    } catch (error) {
      console.error('Failed to initialize voice commands:', error)
      this.state.error = error.message
    }
  }

  /**
   * Check if speech recognition is supported
   */
  private checkSpeechSupport(): boolean {
    return !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition
    )
  }

  /**
   * Setup speech recognition
   */
  private async setupSpeechRecognition(): Promise<void> {
    const SpeechRecognition = 
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition

    if (!SpeechRecognition) {
      throw new Error('Speech recognition not available')
    }

    this.recognition = new SpeechRecognition()
    
    // Configure recognition
    this.recognition.continuous = this.config.continuous
    this.recognition.interimResults = this.config.interimResults
    this.recognition.maxAlternatives = this.config.maxAlternatives
    this.recognition.lang = this.config.language

    // Setup event handlers
    this.recognition.onstart = () => {
      this.state.isListening = true
      this.state.error = null
      this.emit('listening:started')
    }

    this.recognition.onend = () => {
      this.state.isListening = false
      this.emit('listening:stopped')
    }

    this.recognition.onerror = (event) => {
      this.state.error = event.error
      this.state.isListening = false
      this.emit('recognition:error', { error: event.error })
    }

    this.recognition.onresult = (event) => {
      this.handleSpeechResult(event)
    }
  }

  /**
   * Setup speech synthesis
   */
  private setupSpeechSynthesis(): void {
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis
    }
  }

  /**
   * Request microphone permission
   */
  private async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      this.state.hasPermission = true
      return true
    } catch (error) {
      this.state.hasPermission = false
      this.state.error = 'Microphone permission denied'
      return false
    }
  }

  /**
   * Handle speech recognition results
   */
  private handleSpeechResult(event: SpeechRecognitionEvent): void {
    const result = event.results[event.results.length - 1]
    const transcript = result[0].transcript.toLowerCase().trim()
    const confidence = result[0].confidence

    const recognitionResult: VoiceRecognitionResult = {
      transcript,
      confidence,
      isFinal: result.isFinal,
      alternatives: Array.from(result).map(alt => ({
        transcript: alt.transcript.toLowerCase().trim(),
        confidence: alt.confidence
      })),
      timestamp: Date.now()
    }

    this.state.lastResult = recognitionResult
    this.emit('recognition:result', recognitionResult)

    // Only process final results or high-confidence interim results
    if (result.isFinal || confidence > this.config.confidenceThreshold) {
      this.processVoiceCommand(transcript, confidence)
    }
  }

  /**
   * Process voice command
   */
  private processVoiceCommand(transcript: string, confidence: number): void {
    // Check for wake phrase if configured
    if (this.config.wakeWord && !this.wakePhraseDetected) {
      if (transcript.includes(this.config.wakeWord)) {
        this.wakePhraseDetected = true
        this.speak('I\'m listening. What would you like to do?')
        this.emit('wake:detected')
        return
      } else {
        return // Ignore commands without wake phrase
      }
    }

    // Find matching command
    const match = this.findBestCommandMatch(transcript, confidence)
    
    if (match) {
      this.executeCommand(match)
    } else {
      this.handleUnrecognizedCommand(transcript)
    }

    // Reset wake phrase detection after successful command
    if (this.config.wakeWord) {
      setTimeout(() => {
        this.wakePhraseDetected = false
      }, this.config.commandTimeout)
    }
  }

  /**
   * Find best matching command
   */
  private findBestCommandMatch(transcript: string, confidence: number): VoiceCommandMatch | null {
    let bestMatch: VoiceCommandMatch | null = null
    let highestScore = 0

    for (const command of this.commands) {
      for (const pattern of command.patterns) {
        const match = this.matchPattern(pattern, transcript)
        
        if (match.isMatch) {
          const score = match.confidence * confidence
          
          if (score > highestScore && score >= this.config.confidenceThreshold) {
            highestScore = score
            bestMatch = {
              command,
              confidence: score,
              parameters: match.parameters,
              transcript
            }
          }
        }
      }
    }

    return bestMatch
  }

  /**
   * Match pattern against transcript
   */
  private matchPattern(pattern: string, transcript: string): {
    isMatch: boolean
    confidence: number
    parameters: Record<string, string>
  } {
    const parameters: Record<string, string> = {}
    
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '(.+?)')
      .replace(/\s+/g, '\\s+')
    
    const regex = new RegExp(`^${regexPattern}$`, 'i')
    const match = transcript.match(regex)
    
    if (!match) {
      return { isMatch: false, confidence: 0, parameters }
    }

    // Extract parameters from wildcards
    if (match.length > 1) {
      const command = this.commands.find(cmd => cmd.patterns.includes(pattern))
      if (command?.parameters) {
        command.parameters.forEach((param, index) => {
          if (match[index + 1]) {
            parameters[param] = match[index + 1].trim()
          }
        })
      }
    }

    // Calculate confidence based on exact match vs fuzzy match
    const confidence = this.calculateMatchConfidence(pattern, transcript)
    
    return { isMatch: true, confidence, parameters }
  }

  /**
   * Calculate match confidence
   */
  private calculateMatchConfidence(pattern: string, transcript: string): number {
    // Remove wildcards for comparison
    const cleanPattern = pattern.replace(/\*/g, '').trim()
    const words = cleanPattern.split(/\s+/)
    const transcriptWords = transcript.split(/\s+/)
    
    let matchCount = 0
    for (const word of words) {
      if (transcriptWords.some(tw => tw.includes(word) || word.includes(tw))) {
        matchCount++
      }
    }
    
    return matchCount / words.length
  }

  /**
   * Execute matched command
   */
  private executeCommand(match: VoiceCommandMatch): void {
    this.state.currentCommand = match.command.id
    this.lastCommandTime = Date.now()
    
    console.log(`Executing command: ${match.command.id}`, match.parameters)
    
    // Provide audio feedback
    if (this.config.audioFeedback) {
      this.speak(this.getCommandFeedback(match.command, match.parameters))
    }

    // Emit command event
    this.emit('command:executed', {
      command: match.command,
      parameters: match.parameters,
      confidence: match.confidence,
      transcript: match.transcript
    })

    // Clear current command after timeout
    setTimeout(() => {
      this.state.currentCommand = null
    }, 1000)
  }

  /**
   * Get feedback message for command
   */
  private getCommandFeedback(command: VoiceCommand, parameters: Record<string, string>): string {
    switch (command.action) {
      case 'navigate:next':
        return 'Moving to next step'
      case 'navigate:previous':
        return 'Going back'
      case 'navigate:goto':
        return `Navigating to ${parameters.step}`
      case 'booking:select-service':
        return `Selecting ${parameters.service}`
      case 'booking:quick':
        return 'Starting quick booking'
      case 'form:name':
        return `Setting name to ${parameters.name}`
      case 'form:email':
        return `Setting email to ${parameters.email}`
      case 'form:phone':
        return `Setting phone to ${parameters.phone}`
      case 'general:help':
        return 'Here are the available voice commands'
      case 'general:cancel':
        return 'Cancelled'
      case 'general:confirm':
        return 'Confirmed'
      case 'general:deny':
        return 'Understood, let me try again'
      default:
        return 'Command received'
    }
  }

  /**
   * Handle unrecognized command
   */
  private handleUnrecognizedCommand(transcript: string): void {
    const suggestions = this.getSimilarCommands(transcript)
    
    if (suggestions.length > 0) {
      const suggestion = suggestions[0]
      this.speak(`I didn't understand "${transcript}". Did you mean "${suggestion.examples[0]}"?`)
      
      this.emit('command:suggestion', {
        transcript,
        suggestion,
        alternatives: suggestions.slice(1, 3)
      })
    } else {
      this.speak('I didn\'t understand that command. Say "help" to hear available commands.')
      
      this.emit('command:unrecognized', { transcript })
    }
  }

  /**
   * Get similar commands for suggestions
   */
  private getSimilarCommands(transcript: string): VoiceCommand[] {
    const words = transcript.split(/\s+/)
    const commandScores: Array<{ command: VoiceCommand; score: number }> = []

    for (const command of this.commands) {
      let score = 0
      
      for (const pattern of command.patterns) {
        const patternWords = pattern.replace(/\*/g, '').split(/\s+/)
        
        for (const word of words) {
          for (const patternWord of patternWords) {
            if (word.includes(patternWord) || patternWord.includes(word)) {
              score += 1
            }
          }
        }
      }
      
      if (score > 0) {
        commandScores.push({ command, score })
      }
    }

    return commandScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.command)
  }

  /**
   * Speak text using speech synthesis
   */
  speak(text: string, options?: {
    rate?: number
    pitch?: number
    volume?: number
    voice?: SpeechSynthesisVoice
  }): void {
    if (!this.synthesis || !this.config.audioFeedback) return

    // Cancel any current speech
    this.synthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = this.config.language
    utterance.volume = options?.volume ?? this.config.feedbackVolume
    utterance.rate = options?.rate ?? 1
    utterance.pitch = options?.pitch ?? 1

    if (options?.voice) {
      utterance.voice = options.voice
    }

    this.synthesis.speak(utterance)
  }

  /**
   * Start listening for voice commands
   */
  async startListening(): Promise<boolean> {
    if (!this.isInitialized || !this.recognition) {
      return false
    }

    if (!this.state.hasPermission) {
      const hasPermission = await this.requestMicrophonePermission()
      if (!hasPermission) {
        return false
      }
    }

    try {
      this.recognition.start()
      this.state.isEnabled = true
      return true
    } catch (error) {
      this.state.error = error.message
      return false
    }
  }

  /**
   * Stop listening for voice commands
   */
  stopListening(): void {
    if (this.recognition && this.state.isListening) {
      this.recognition.stop()
    }
    this.state.isEnabled = false
  }

  /**
   * Toggle voice commands on/off
   */
  async toggle(): Promise<boolean> {
    if (this.state.isEnabled) {
      this.stopListening()
      return false
    } else {
      return await this.startListening()
    }
  }

  /**
   * Add custom command
   */
  addCommand(command: VoiceCommand): void {
    this.commands.push(command)
  }

  /**
   * Remove command
   */
  removeCommand(commandId: string): void {
    this.commands = this.commands.filter(cmd => cmd.id !== commandId)
  }

  /**
   * Get available commands
   */
  getCommands(category?: string): VoiceCommand[] {
    if (category) {
      return this.commands.filter(cmd => cmd.category === category)
    }
    return [...this.commands]
  }

  /**
   * Get accessibility commands only
   */
  getAccessibilityCommands(): VoiceCommand[] {
    return this.commands.filter(cmd => cmd.accessibility === true)
  }

  /**
   * Get system status
   */
  getStatus(): VoiceAccessibilityState {
    return { ...this.state }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<VoiceCommandConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Update recognition settings if available
    if (this.recognition) {
      this.recognition.lang = this.config.language
      this.recognition.continuous = this.config.continuous
      this.recognition.interimResults = this.config.interimResults
      this.recognition.maxAlternatives = this.config.maxAlternatives
    }

    // Save to localStorage
    localStorage.setItem('voice_commands_config', JSON.stringify(this.config))
  }

  /**
   * Event system
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      const index = eventListeners.indexOf(callback)
      if (index > -1) {
        eventListeners.splice(index, 1)
      }
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data))
    }
  }

  /**
   * Get help text for voice commands
   */
  getHelpText(): string {
    const categories = ['navigation', 'booking', 'form', 'general']
    let helpText = 'Available voice commands:\n\n'

    for (const category of categories) {
      const categoryCommands = this.getCommands(category)
      if (categoryCommands.length > 0) {
        helpText += `${category.toUpperCase()}:\n`
        for (const command of categoryCommands) {
          helpText += `• ${command.examples[0]} - ${command.description}\n`
        }
        helpText += '\n'
      }
    }

    return helpText
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.stopListening()
    
    if (this.synthesis) {
      this.synthesis.cancel()
    }

    this.listeners.clear()
    this.recognition = null
    this.synthesis = null
    this.isInitialized = false
  }
}

// Global voice commands instance
let globalVoiceCommands: VoiceCommandsAccessibilitySystem | null = null

/**
 * Get or create voice commands instance
 */
export function getVoiceCommandsSystem(
  config?: Partial<VoiceCommandConfig>,
  commands?: VoiceCommand[]
): VoiceCommandsAccessibilitySystem {
  if (!globalVoiceCommands) {
    globalVoiceCommands = new VoiceCommandsAccessibilitySystem(config, commands)
  }
  return globalVoiceCommands
}

/**
 * Create new voice commands instance
 */
export function createVoiceCommandsSystem(
  config?: Partial<VoiceCommandConfig>,
  commands?: VoiceCommand[]
): VoiceCommandsAccessibilitySystem {
  return new VoiceCommandsAccessibilitySystem(config, commands)
}

export default VoiceCommandsAccessibilitySystem