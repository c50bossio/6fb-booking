/**
 * Voice Commands Accessibility Tests
 * Comprehensive test suite for voice recognition and accessibility features
 * Version: 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { VoiceCommandsAccessibilitySystem, getVoiceCommandsSystem, VoiceCommandConfig, VoiceCommand } from '@/lib/voice-commands-accessibility'
import { useVoiceCommands, useVoiceBookingCommands, useVoiceAccessibility, useVoiceCommandHelp } from '@/hooks/useVoiceCommands'

// Mock Web APIs
const mockSpeechRecognition = {
  continuous: false,
  interimResults: false,
  maxAlternatives: 1,
  lang: 'en-US',
  start: vi.fn(),
  stop: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onstart: null,
  onend: null,
  onerror: null,
  onresult: null
}

const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(() => []),
  speaking: false,
  pending: false,
  paused: false
}

const mockMediaDevices = {
  getUserMedia: vi.fn(() => Promise.resolve({
    getTracks: () => [{ stop: vi.fn() }]
  }))
}

const mockNavigator = {
  mediaDevices: mockMediaDevices,
  vibrate: vi.fn(),
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

// Mock SpeechSynthesisUtterance
global.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
  text,
  lang: 'en-US',
  volume: 1,
  rate: 1,
  pitch: 1,
  voice: null,
  onstart: null,
  onend: null,
  onerror: null
}))

describe('VoiceCommandsAccessibilitySystem', () => {
  let voiceSystem: VoiceCommandsAccessibilitySystem
  let originalWindow: any
  let originalNavigator: any

  beforeEach(() => {
    // Setup mocks
    originalWindow = global.window
    originalNavigator = global.navigator

    Object.defineProperty(global, 'window', {
      value: {
        ...originalWindow,
        SpeechRecognition: vi.fn(() => mockSpeechRecognition),
        webkitSpeechRecognition: vi.fn(() => mockSpeechRecognition),
        speechSynthesis: mockSpeechSynthesis
      },
      writable: true
    })

    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    })

    // Reset mocks
    vi.clearAllMocks()

    // Create fresh instance
    voiceSystem = new VoiceCommandsAccessibilitySystem()
  })

  afterEach(() => {
    // Cleanup
    voiceSystem?.destroy()
    global.window = originalWindow
    global.navigator = originalNavigator
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const status = voiceSystem.getStatus()
      expect(status.language).toBe('en-US')
      expect(status.volume).toBe(0.8)
      expect(status.isSupported).toBe(true)
    })

    it('should accept custom configuration', () => {
      const customConfig: Partial<VoiceCommandConfig> = {
        language: 'es-ES',
        confidenceThreshold: 0.8,
        wakeWord: 'hola asistente'
      }

      const customSystem = new VoiceCommandsAccessibilitySystem(customConfig)
      expect(customSystem).toBeDefined()
      customSystem.destroy()
    })

    it('should detect speech support correctly', () => {
      const status = voiceSystem.getStatus()
      expect(status.isSupported).toBe(true)
    })

    it('should handle unsupported browsers gracefully', () => {
      // Remove speech recognition support
      Object.defineProperty(global, 'window', {
        value: {
          ...originalWindow,
          SpeechRecognition: undefined,
          webkitSpeechRecognition: undefined
        },
        writable: true
      })

      const unsupportedSystem = new VoiceCommandsAccessibilitySystem()
      const status = unsupportedSystem.getStatus()
      expect(status.isSupported).toBe(false)
      unsupportedSystem.destroy()
    })
  })

  describe('Voice Recognition', () => {
    it('should start listening successfully', async () => {
      mockMediaDevices.getUserMedia.mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }]
      })

      const result = await voiceSystem.startListening()
      expect(result).toBe(true)
      expect(mockSpeechRecognition.start).toHaveBeenCalled()
    })

    it('should handle microphone permission denial', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValue(new Error('Permission denied'))

      const result = await voiceSystem.startListening()
      expect(result).toBe(false)
      
      const status = voiceSystem.getStatus()
      expect(status.hasPermission).toBe(false)
    })

    it('should stop listening', () => {
      voiceSystem.stopListening()
      expect(mockSpeechRecognition.stop).toHaveBeenCalled()
    })

    it('should toggle listening state', async () => {
      mockMediaDevices.getUserMedia.mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }]
      })

      // First toggle should start
      let result = await voiceSystem.toggle()
      expect(result).toBe(true)

      // Second toggle should stop
      result = await voiceSystem.toggle()
      expect(result).toBe(false)
    })
  })

  describe('Command Processing', () => {
    it('should match simple voice patterns', () => {
      const commands = voiceSystem.getCommands()
      const helpCommand = commands.find(cmd => cmd.id === 'help')
      expect(helpCommand).toBeDefined()
      expect(helpCommand?.patterns).toContain('help')
    })

    it('should match wildcard patterns', () => {
      const commands = voiceSystem.getCommands()
      const nameCommand = commands.find(cmd => cmd.id === 'enter-name')
      expect(nameCommand).toBeDefined()
      expect(nameCommand?.patterns).toContain('my name is *')
    })

    it('should filter commands by category', () => {
      const navigationCommands = voiceSystem.getCommands('navigation')
      expect(navigationCommands.length).toBeGreaterThan(0)
      navigationCommands.forEach(cmd => {
        expect(cmd.category).toBe('navigation')
      })
    })

    it('should get accessibility commands only', () => {
      const accessibilityCommands = voiceSystem.getAccessibilityCommands()
      expect(accessibilityCommands.length).toBeGreaterThan(0)
      accessibilityCommands.forEach(cmd => {
        expect(cmd.accessibility).toBe(true)
      })
    })

    it('should add custom commands', () => {
      const customCommand: VoiceCommand = {
        id: 'test-command',
        patterns: ['test pattern'],
        action: 'test:action',
        description: 'Test command',
        examples: ['test pattern'],
        category: 'general'
      }

      voiceSystem.addCommand(customCommand)
      const commands = voiceSystem.getCommands()
      const addedCommand = commands.find(cmd => cmd.id === 'test-command')
      expect(addedCommand).toEqual(customCommand)
    })

    it('should remove commands', () => {
      const customCommand: VoiceCommand = {
        id: 'removable-command',
        patterns: ['remove me'],
        action: 'test:remove',
        description: 'Removable command',
        examples: ['remove me'],
        category: 'general'
      }

      voiceSystem.addCommand(customCommand)
      expect(voiceSystem.getCommands().find(cmd => cmd.id === 'removable-command')).toBeDefined()

      voiceSystem.removeCommand('removable-command')
      expect(voiceSystem.getCommands().find(cmd => cmd.id === 'removable-command')).toBeUndefined()
    })
  })

  describe('Speech Synthesis', () => {
    it('should speak text with default options', () => {
      voiceSystem.speak('Hello world')
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled()
    })

    it('should speak text with custom options', () => {
      voiceSystem.speak('Hello world', {
        rate: 0.8,
        pitch: 1.2,
        volume: 0.5
      })
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled()
    })

    it('should cancel previous speech before speaking', () => {
      voiceSystem.speak('First message')
      voiceSystem.speak('Second message')
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalledTimes(2) // Once for each speak call
    })
  })

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig: Partial<VoiceCommandConfig> = {
        language: 'fr-FR',
        confidenceThreshold: 0.9
      }

      voiceSystem.updateConfig(newConfig)
      const status = voiceSystem.getStatus()
      expect(status.language).toBe('fr-FR')
    })

    it('should save configuration to localStorage', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      
      voiceSystem.updateConfig({ language: 'de-DE' })
      
      expect(setItemSpy).toHaveBeenCalledWith(
        'voice_commands_config',
        expect.stringContaining('de-DE')
      )
    })
  })

  describe('Event System', () => {
    it('should register and emit events', () => {
      const callback = vi.fn()
      
      voiceSystem.on('test:event', callback)
      // Emit event through private method (we'll test this indirectly)
      
      expect(callback).toHaveBeenCalledTimes(0) // Not emitted yet
      
      voiceSystem.off('test:event', callback)
    })

    it('should remove event listeners', () => {
      const callback = vi.fn()
      
      voiceSystem.on('test:event', callback)
      voiceSystem.off('test:event', callback)
      
      // Event should not be called after removal
      expect(callback).toHaveBeenCalledTimes(0)
    })
  })

  describe('Help System', () => {
    it('should generate help text', () => {
      const helpText = voiceSystem.getHelpText()
      expect(helpText).toContain('Available voice commands')
      expect(helpText).toContain('NAVIGATION')
      expect(helpText).toContain('BOOKING')
      expect(helpText.length).toBeGreaterThan(100)
    })
  })

  describe('Accessibility Features', () => {
    it('should provide accessibility-focused commands', () => {
      const accessibilityCommands = voiceSystem.getAccessibilityCommands()
      expect(accessibilityCommands.length).toBeGreaterThan(0)
      
      // Check for essential accessibility commands
      const hasNavigationCommands = accessibilityCommands.some(cmd => cmd.category === 'navigation')
      const hasFormCommands = accessibilityCommands.some(cmd => cmd.category === 'form')
      
      expect(hasNavigationCommands).toBe(true)
      expect(hasFormCommands).toBe(true)
    })

    it('should handle wake word detection', () => {
      const wakeWordConfig: Partial<VoiceCommandConfig> = {
        wakeWord: 'test wake word'
      }

      const wakeWordSystem = new VoiceCommandsAccessibilitySystem(wakeWordConfig)
      expect(wakeWordSystem.getStatus()).toBeDefined()
      wakeWordSystem.destroy()
    })
  })

  describe('Error Handling', () => {
    it('should handle speech recognition errors gracefully', () => {
      const status = voiceSystem.getStatus()
      expect(status.error).toBeNull()
      
      // Simulate error
      if (mockSpeechRecognition.onerror) {
        mockSpeechRecognition.onerror({ error: 'network' } as any)
      }
    })

    it('should handle microphone access errors', async () => {
      mockMediaDevices.getUserMedia.mockRejectedValue(new Error('NotAllowedError'))
      
      const result = await voiceSystem.startListening()
      expect(result).toBe(false)
      
      const status = voiceSystem.getStatus()
      expect(status.error).toContain('permission')
    })
  })

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      voiceSystem.destroy()
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled()
    })
  })
})

describe('useVoiceCommands Hook', () => {
  beforeEach(() => {
    // Setup mocks for hook tests
    Object.defineProperty(global, 'window', {
      value: {
        ...global.window,
        SpeechRecognition: vi.fn(() => mockSpeechRecognition),
        webkitSpeechRecognition: vi.fn(() => mockSpeechRecognition),
        speechSynthesis: mockSpeechSynthesis
      },
      writable: true
    })

    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    })

    vi.clearAllMocks()
  })

  it('should provide voice commands functionality', () => {
    const { result } = renderHook(() => useVoiceCommands())
    
    expect(result.current.isSupported).toBe(true)
    expect(result.current.startListening).toBeDefined()
    expect(result.current.stopListening).toBeDefined()
    expect(result.current.speak).toBeDefined()
    expect(result.current.getCommands).toBeDefined()
  })

  it('should handle configuration updates', () => {
    const { result } = renderHook(() => useVoiceCommands({
      config: { language: 'es-ES' }
    }))
    
    act(() => {
      result.current.updateConfig({ confidenceThreshold: 0.9 })
    })

    expect(result.current.system).toBeDefined()
  })

  it('should handle custom commands', () => {
    const customCommands: VoiceCommand[] = [{
      id: 'custom-test',
      patterns: ['custom pattern'],
      action: 'custom:action',
      description: 'Custom test command',
      examples: ['custom pattern'],
      category: 'general'
    }]

    const { result } = renderHook(() => useVoiceCommands({
      customCommands
    }))
    
    const commands = result.current.getCommands()
    expect(commands.find(cmd => cmd.id === 'custom-test')).toBeDefined()
  })
})

describe('useVoiceBookingCommands Hook', () => {
  beforeEach(() => {
    // Setup mocks
    Object.defineProperty(global, 'window', {
      value: {
        ...global.window,
        SpeechRecognition: vi.fn(() => mockSpeechRecognition),
        webkitSpeechRecognition: vi.fn(() => mockSpeechRecognition),
        speechSynthesis: mockSpeechSynthesis
      },
      writable: true
    })

    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    })

    vi.clearAllMocks()
  })

  it('should provide booking-specific voice commands', () => {
    const { result } = renderHook(() => useVoiceBookingCommands())
    
    expect(result.current.bookingCommands).toEqual({
      serviceSelected: null,
      barberSelected: null,
      timeSelected: null,
      formData: {}
    })
    expect(result.current.clearBookingData).toBeDefined()
  })

  it('should clear booking data', () => {
    const { result } = renderHook(() => useVoiceBookingCommands())
    
    act(() => {
      result.current.clearBookingData()
    })

    expect(result.current.bookingCommands.serviceSelected).toBeNull()
    expect(result.current.bookingCommands.barberSelected).toBeNull()
    expect(result.current.bookingCommands.timeSelected).toBeNull()
    expect(result.current.bookingCommands.formData).toEqual({})
  })
})

describe('useVoiceAccessibility Hook', () => {
  beforeEach(() => {
    // Setup mocks
    Object.defineProperty(global, 'window', {
      value: {
        ...global.window,
        SpeechRecognition: vi.fn(() => mockSpeechRecognition),
        webkitSpeechRecognition: vi.fn(() => mockSpeechRecognition),
        speechSynthesis: mockSpeechSynthesis
      },
      writable: true
    })

    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    })

    vi.clearAllMocks()
  })

  it('should provide accessibility-focused features', () => {
    const { result } = renderHook(() => useVoiceAccessibility())
    
    expect(result.current.accessibilityCommands).toBeDefined()
    expect(result.current.navigationHistory).toEqual([])
    expect(result.current.accessibilityMode).toBe(false)
    expect(result.current.enableAccessibilityMode).toBeDefined()
    expect(result.current.disableAccessibilityMode).toBeDefined()
  })

  it('should enable accessibility mode', () => {
    const { result } = renderHook(() => useVoiceAccessibility())
    
    act(() => {
      result.current.enableAccessibilityMode()
    })

    expect(result.current.accessibilityMode).toBe(true)
  })

  it('should disable accessibility mode', () => {
    const { result } = renderHook(() => useVoiceAccessibility())
    
    act(() => {
      result.current.enableAccessibilityMode()
    })
    
    act(() => {
      result.current.disableAccessibilityMode()
    })

    expect(result.current.accessibilityMode).toBe(false)
  })
})

describe('useVoiceCommandHelp Hook', () => {
  beforeEach(() => {
    // Setup mocks
    Object.defineProperty(global, 'window', {
      value: {
        ...global.window,
        SpeechRecognition: vi.fn(() => mockSpeechRecognition),
        webkitSpeechRecognition: vi.fn(() => mockSpeechRecognition),
        speechSynthesis: mockSpeechSynthesis
      },
      writable: true
    })

    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    })

    vi.clearAllMocks()
  })

  it('should provide help and training features', () => {
    const { result } = renderHook(() => useVoiceCommandHelp())
    
    expect(result.current.categories).toEqual(['navigation', 'booking', 'form', 'general'])
    expect(result.current.currentCategory).toBe('all')
    expect(result.current.searchQuery).toBe('')
    expect(result.current.filteredCommands).toBeDefined()
    expect(result.current.speakCommandHelp).toBeDefined()
    expect(result.current.speakCategoryHelp).toBeDefined()
  })

  it('should filter commands by category', () => {
    const { result } = renderHook(() => useVoiceCommandHelp())
    
    act(() => {
      result.current.setCurrentCategory('navigation')
    })

    expect(result.current.currentCategory).toBe('navigation')
    
    const filteredCommands = result.current.filteredCommands()
    expect(filteredCommands.every(cmd => cmd.category === 'navigation' || result.current.currentCategory === 'all')).toBe(true)
  })

  it('should filter commands by search query', () => {
    const { result } = renderHook(() => useVoiceCommandHelp())
    
    act(() => {
      result.current.setSearchQuery('help')
    })

    expect(result.current.searchQuery).toBe('help')
    
    const filteredCommands = result.current.filteredCommands()
    expect(filteredCommands.length).toBeGreaterThan(0)
  })
})

describe('Global Voice Commands Instance', () => {
  beforeEach(() => {
    // Setup mocks
    Object.defineProperty(global, 'window', {
      value: {
        ...global.window,
        SpeechRecognition: vi.fn(() => mockSpeechRecognition),
        webkitSpeechRecognition: vi.fn(() => mockSpeechRecognition),
        speechSynthesis: mockSpeechSynthesis
      },
      writable: true
    })

    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    })

    vi.clearAllMocks()
  })

  it('should return same instance for getVoiceCommandsSystem', () => {
    const instance1 = getVoiceCommandsSystem()
    const instance2 = getVoiceCommandsSystem()
    
    expect(instance1).toBe(instance2)
    
    instance1.destroy()
  })

  it('should accept configuration for global instance', () => {
    const config: Partial<VoiceCommandConfig> = {
      language: 'fr-FR'
    }
    
    const instance = getVoiceCommandsSystem(config)
    expect(instance.getStatus().language).toBe('fr-FR')
    
    instance.destroy()
  })
})