/**
 * Advanced Haptic Feedback System for Calendar Interactions
 * Provides contextual haptic feedback for enhanced mobile UX
 * Version: 1.0.0
 */

export interface HapticPattern {
  pattern: number[]
  description: string
  intensity?: 'light' | 'medium' | 'heavy'
}

export interface HapticConfig {
  enabled: boolean
  respectSystemSettings: boolean
  fallbackToSound: boolean
  debugMode: boolean
}

export type CalendarInteraction = 
  | 'appointment_select'
  | 'appointment_deselect' 
  | 'time_slot_select'
  | 'date_navigation'
  | 'view_change'
  | 'drag_start'
  | 'drag_over_valid'
  | 'drag_over_invalid'
  | 'drag_success'
  | 'drag_cancel'
  | 'booking_success'
  | 'booking_error'
  | 'conflict_detected'
  | 'double_tap'
  | 'long_press'
  | 'swipe_navigation'
  | 'zoom_in'
  | 'zoom_out'

const HAPTIC_PATTERNS: Record<CalendarInteraction, HapticPattern> = {
  // Selection interactions
  appointment_select: {
    pattern: [30],
    description: 'Quick pulse for appointment selection',
    intensity: 'light'
  },
  appointment_deselect: {
    pattern: [15],
    description: 'Lighter pulse for deselection',
    intensity: 'light'
  },
  time_slot_select: {
    pattern: [25],
    description: 'Medium pulse for time slot selection',
    intensity: 'light'
  },
  
  // Navigation interactions
  date_navigation: {
    pattern: [40],
    description: 'Confident pulse for date changes',
    intensity: 'medium'
  },
  view_change: {
    pattern: [50, 25, 50],
    description: 'Triple pulse for view transitions',
    intensity: 'medium'
  },
  swipe_navigation: {
    pattern: [35],
    description: 'Smooth pulse for swipe navigation',
    intensity: 'light'
  },
  
  // Drag and drop interactions
  drag_start: {
    pattern: [60, 30, 30],
    description: 'Strong initial pulse with gentle follow-up',
    intensity: 'medium'
  },
  drag_over_valid: {
    pattern: [20],
    description: 'Gentle confirmation pulse',
    intensity: 'light'
  },
  drag_over_invalid: {
    pattern: [15, 15, 15],
    description: 'Warning pattern for invalid drop zones',
    intensity: 'light'
  },
  drag_success: {
    pattern: [100, 50, 100],
    description: 'Success celebration pattern',
    intensity: 'medium'
  },
  drag_cancel: {
    pattern: [80, 40, 80, 40, 80],
    description: 'Cancel pattern with rhythm',
    intensity: 'light'
  },
  
  // Booking interactions
  booking_success: {
    pattern: [120, 60, 120, 60, 200],
    description: 'Celebratory success pattern',
    intensity: 'heavy'
  },
  booking_error: {
    pattern: [200, 100, 200],
    description: 'Error notification pattern',
    intensity: 'heavy'
  },
  conflict_detected: {
    pattern: [100, 50, 100, 50, 100],
    description: 'Conflict warning pattern',
    intensity: 'medium'
  },
  
  // Gesture interactions
  double_tap: {
    pattern: [40, 30, 40],
    description: 'Double tap confirmation',
    intensity: 'medium'
  },
  long_press: {
    pattern: [80, 50, 80],
    description: 'Long press activation',
    intensity: 'medium'
  },
  
  // Zoom interactions
  zoom_in: {
    pattern: [30, 20, 40],
    description: 'Zoom in progression',
    intensity: 'light'
  },
  zoom_out: {
    pattern: [40, 20, 30],
    description: 'Zoom out progression',
    intensity: 'light'
  }
}

export class HapticFeedbackSystem {
  private config: HapticConfig
  private isSupported: boolean
  private lastFeedbackTime: number = 0
  private feedbackCooldown: number = 50 // Minimum time between feedback (ms)
  
  constructor(config: Partial<HapticConfig> = {}) {
    this.config = {
      enabled: true,
      respectSystemSettings: true,
      fallbackToSound: false,
      debugMode: false,
      ...config
    }
    
    this.isSupported = this.checkHapticSupport()
    
    if (this.config.debugMode) {
      console.log('Haptic Feedback System initialized:', {
        supported: this.isSupported,
        config: this.config
      })
    }
  }

  /**
   * Check if haptic feedback is supported on this device
   */
  private checkHapticSupport(): boolean {
    return 'vibrate' in navigator && typeof navigator.vibrate === 'function'
  }

  /**
   * Check if system-level haptic feedback is enabled
   */
  private async checkSystemSettings(): Promise<boolean> {
    if (!this.config.respectSystemSettings) return true
    
    // On iOS, we can check if vibration is disabled
    // This is a heuristic - there's no direct API
    if (this.isSupported) {
      try {
        // Test with a very short vibration
        navigator.vibrate(1)
        return true
      } catch (error) {
        return false
      }
    }
    
    return false
  }

  /**
   * Provide haptic feedback for a specific calendar interaction
   */
  async feedback(interaction: CalendarInteraction, options: {
    force?: boolean
    customPattern?: number[]
    intensity?: 'light' | 'medium' | 'heavy'
  } = {}): Promise<boolean> {
    
    if (!this.config.enabled && !options.force) {
      return false
    }

    if (!this.isSupported) {
      if (this.config.fallbackToSound) {
        this.playAudioFeedback(interaction)
      }
      return false
    }

    // Rate limiting to prevent feedback spam
    const now = Date.now()
    if (now - this.lastFeedbackTime < this.feedbackCooldown) {
      return false
    }

    // Check system settings
    if (this.config.respectSystemSettings) {
      const systemEnabled = await this.checkSystemSettings()
      if (!systemEnabled) {
        return false
      }
    }

    const pattern = options.customPattern || HAPTIC_PATTERNS[interaction]?.pattern
    if (!pattern) {
      if (this.config.debugMode) {
        console.warn(`No haptic pattern defined for interaction: ${interaction}`)
      }
      return false
    }

    try {
      // Apply intensity scaling if supported
      const scaledPattern = this.scalePatternForIntensity(
        pattern, 
        options.intensity || HAPTIC_PATTERNS[interaction]?.intensity || 'medium'
      )
      
      navigator.vibrate(scaledPattern)
      this.lastFeedbackTime = now
      
      if (this.config.debugMode) {
        console.log(`Haptic feedback triggered:`, {
          interaction,
          pattern: scaledPattern,
          description: HAPTIC_PATTERNS[interaction]?.description
        })
      }
      
      return true
    } catch (error) {
      if (this.config.debugMode) {
        console.error('Haptic feedback failed:', error)
      }
      return false
    }
  }

  /**
   * Scale haptic pattern based on intensity preference
   */
  private scalePatternForIntensity(pattern: number[], intensity: 'light' | 'medium' | 'heavy'): number[] {
    const scales = {
      light: 0.7,
      medium: 1.0,
      heavy: 1.3
    }
    
    const scale = scales[intensity]
    return pattern.map(duration => Math.round(duration * scale))
  }

  /**
   * Play audio feedback as fallback for devices without haptic support
   */
  private playAudioFeedback(interaction: CalendarInteraction): void {
    if (!this.config.fallbackToSound) return
    
    // Create a subtle audio cue using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Different frequencies for different interaction types
      const frequencies: Record<string, number> = {
        appointment_select: 800,
        drag_start: 600,
        booking_success: 1000,
        booking_error: 400,
        default: 700
      }
      
      oscillator.frequency.value = frequencies[interaction] || frequencies.default
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
      
    } catch (error) {
      if (this.config.debugMode) {
        console.error('Audio feedback failed:', error)
      }
    }
  }

  /**
   * Create a custom haptic pattern
   */
  createCustomPattern(durations: number[], description: string): HapticPattern {
    return {
      pattern: durations,
      description,
      intensity: 'medium'
    }
  }

  /**
   * Test haptic feedback with different patterns
   */
  async testFeedback(): Promise<void> {
    if (!this.isSupported) {
      console.log('Haptic feedback not supported on this device')
      return
    }

    console.log('Testing haptic feedback patterns...')
    
    const testInteractions: CalendarInteraction[] = [
      'appointment_select',
      'drag_start', 
      'drag_success',
      'booking_success'
    ]
    
    for (let i = 0; i < testInteractions.length; i++) {
      const interaction = testInteractions[i]
      console.log(`Testing: ${interaction}`)
      await this.feedback(interaction, { force: true })
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log('Haptic feedback test complete')
  }

  /**
   * Enable or disable haptic feedback
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
    
    if (this.config.debugMode) {
      console.log(`Haptic feedback ${enabled ? 'enabled' : 'disabled'}`)
    }
  }

  /**
   * Get system capabilities and settings
   */
  getCapabilities(): {
    supported: boolean
    enabled: boolean
    systemSettingsRespected: boolean
    fallbackEnabled: boolean
  } {
    return {
      supported: this.isSupported,
      enabled: this.config.enabled,
      systemSettingsRespected: this.config.respectSystemSettings,
      fallbackEnabled: this.config.fallbackToSound
    }
  }

  /**
   * Get available interaction patterns
   */
  getAvailablePatterns(): Record<CalendarInteraction, HapticPattern> {
    return { ...HAPTIC_PATTERNS }
  }
}

// Global haptic feedback instance
let globalHapticSystem: HapticFeedbackSystem | null = null

/**
 * Get or create the global haptic feedback system
 */
export function getHapticSystem(config?: Partial<HapticConfig>): HapticFeedbackSystem {
  if (!globalHapticSystem) {
    globalHapticSystem = new HapticFeedbackSystem(config)
  }
  return globalHapticSystem
}

/**
 * Convenience function for quick haptic feedback
 */
export async function hapticFeedback(
  interaction: CalendarInteraction, 
  options?: { force?: boolean; customPattern?: number[]; intensity?: 'light' | 'medium' | 'heavy' }
): Promise<boolean> {
  const system = getHapticSystem()
  return system.feedback(interaction, options)
}

/**
 * React hook for haptic feedback in components
 */
export function useHapticFeedback(config?: Partial<HapticConfig>) {
  const hapticSystem = getHapticSystem(config)
  
  return {
    feedback: hapticSystem.feedback.bind(hapticSystem),
    testFeedback: hapticSystem.testFeedback.bind(hapticSystem),
    setEnabled: hapticSystem.setEnabled.bind(hapticSystem),
    capabilities: hapticSystem.getCapabilities(),
    isSupported: hapticSystem.getCapabilities().supported
  }
}

export default HapticFeedbackSystem