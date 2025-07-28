/**
 * Mobile Booking Widgets System
 * Touch-optimized booking components for mobile devices
 * Version: 1.0.0
 */

export interface MobileBookingConfig {
  enableSwipeNavigation: boolean
  enableHapticFeedback: boolean
  enableQuickBooking: boolean
  enableVoiceInput: boolean
  autoScrollToNext: boolean
  minimumTouchTarget: number // pixels
  swipeThreshold: number // pixels
  animationDuration: number // milliseconds
  enableGestures: boolean
  showProgressIndicator: boolean
}

export interface BookingStep {
  id: string
  title: string
  description?: string
  required: boolean
  completed: boolean
  skippable: boolean
  component: string
  validation?: (data: any) => boolean | string
  data?: any
}

export interface TouchGesture {
  type: 'swipe' | 'tap' | 'longpress' | 'pinch' | 'drag'
  direction?: 'up' | 'down' | 'left' | 'right'
  target: string
  action: string
  threshold?: number
}

export interface MobileBookingState {
  currentStep: number
  totalSteps: number
  isLoading: boolean
  canGoNext: boolean
  canGoPrevious: boolean
  formData: Record<string, any>
  errors: Record<string, string>
  touchPosition: { x: number; y: number } | null
  swipeDirection: string | null
  isValidating: boolean
}

const DEFAULT_CONFIG: MobileBookingConfig = {
  enableSwipeNavigation: true,
  enableHapticFeedback: true,
  enableQuickBooking: true,
  enableVoiceInput: false,
  autoScrollToNext: true,
  minimumTouchTarget: 44, // iOS standard
  swipeThreshold: 50,
  animationDuration: 300,
  enableGestures: true,
  showProgressIndicator: true
}

const DEFAULT_BOOKING_STEPS: BookingStep[] = [
  {
    id: 'service',
    title: 'Select Service',
    description: 'Choose the service you want to book',
    required: true,
    completed: false,
    skippable: false,
    component: 'ServiceSelector'
  },
  {
    id: 'barber',
    title: 'Choose Barber',
    description: 'Select your preferred barber',
    required: false,
    completed: false,
    skippable: true,
    component: 'BarberSelector'
  },
  {
    id: 'datetime',
    title: 'Pick Date & Time',
    description: 'Select when you want your appointment',
    required: true,
    completed: false,
    skippable: false,
    component: 'DateTimeSelector'
  },
  {
    id: 'details',
    title: 'Your Details',
    description: 'Provide your contact information',
    required: true,
    completed: false,
    skippable: false,
    component: 'CustomerDetails'
  },
  {
    id: 'payment',
    title: 'Payment',
    description: 'Complete your booking payment',
    required: true,
    completed: false,
    skippable: false,
    component: 'PaymentProcessor'
  },
  {
    id: 'confirmation',
    title: 'Confirmation',
    description: 'Your booking is confirmed',
    required: false,
    completed: false,
    skippable: false,
    component: 'BookingConfirmation'
  }
]

export class MobileBookingWidgetSystem {
  private config: MobileBookingConfig
  private steps: BookingStep[]
  private state: MobileBookingState
  private touchStartTime: number = 0
  private touchStartPosition: { x: number; y: number } | null = null
  private hapticSupported: boolean = false
  private listeners: Map<string, Function[]> = new Map()

  constructor(config?: Partial<MobileBookingConfig>, customSteps?: BookingStep[]) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.steps = customSteps || [...DEFAULT_BOOKING_STEPS]
    this.state = {
      currentStep: 0,
      totalSteps: this.steps.length,
      isLoading: false,
      canGoNext: false,
      canGoPrevious: false,
      formData: {},
      errors: {},
      touchPosition: null,
      swipeDirection: null,
      isValidating: false
    }
    
    this.initializeSystem()
  }

  private async initializeSystem() {
    console.log('📱 Initializing Mobile Booking Widget System...')

    // Check for haptic feedback support
    this.hapticSupported = this.checkHapticSupport()

    // Setup touch event listeners
    if (this.config.enableGestures) {
      this.setupTouchListeners()
    }

    // Initialize first step
    this.updateStepState()

    console.log('✅ Mobile Booking Widget System initialized')
  }

  /**
   * Check if haptic feedback is supported
   */
  private checkHapticSupport(): boolean {
    return !!(
      (navigator as any).vibrate ||
      (window as any).navigator?.vibrate ||
      (window as any).TapticEngine ||
      (window as any).Haptic
    )
  }

  /**
   * Setup touch event listeners for gestures
   */
  private setupTouchListeners() {
    if (typeof window === 'undefined') return

    const handleTouchStart = (e: TouchEvent) => {
      this.touchStartTime = Date.now()
      this.touchStartPosition = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!this.touchStartPosition) return

      const touchEndPosition = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY
      }

      const deltaX = touchEndPosition.x - this.touchStartPosition.x
      const deltaY = touchEndPosition.y - this.touchStartPosition.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      const duration = Date.now() - this.touchStartTime

      // Detect swipe gestures
      if (distance > this.config.swipeThreshold && duration < 500) {
        const direction = Math.abs(deltaX) > Math.abs(deltaY)
          ? (deltaX > 0 ? 'right' : 'left')
          : (deltaY > 0 ? 'down' : 'up')

        this.handleSwipeGesture(direction)
      }

      // Reset touch tracking
      this.touchStartPosition = null
      this.touchStartTime = 0
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
  }

  /**
   * Handle swipe gestures
   */
  private handleSwipeGesture(direction: string) {
    if (!this.config.enableSwipeNavigation) return

    this.state.swipeDirection = direction

    switch (direction) {
      case 'left':
        if (this.canGoNext()) {
          this.nextStep()
        }
        break
      case 'right':
        if (this.canGoPrevious()) {
          this.previousStep()
        }
        break
      case 'up':
        // Could be used for expanding sections or showing details
        this.emit('swipe:up')
        break
      case 'down':
        // Could be used for collapsing sections or going back
        this.emit('swipe:down')
        break
    }

    // Clear swipe direction after handling
    setTimeout(() => {
      this.state.swipeDirection = null
    }, this.config.animationDuration)
  }

  /**
   * Move to next step
   */
  async nextStep(): Promise<boolean> {
    if (!this.canGoNext()) return false

    // Validate current step
    const currentStep = this.getCurrentStep()
    if (currentStep.required && !await this.validateStep(this.state.currentStep)) {
      return false
    }

    // Mark current step as completed
    this.steps[this.state.currentStep].completed = true

    // Move to next step
    this.state.currentStep++
    this.updateStepState()

    // Trigger haptic feedback
    this.triggerHaptic('light')

    // Auto-scroll if enabled
    if (this.config.autoScrollToNext) {
      this.scrollToCurrentStep()
    }

    this.emit('step:changed', { step: this.state.currentStep, direction: 'next' })
    return true
  }

  /**
   * Move to previous step
   */
  async previousStep(): Promise<boolean> {
    if (!this.canGoPrevious()) return false

    // Move to previous step
    this.state.currentStep--
    this.updateStepState()

    // Trigger haptic feedback
    this.triggerHaptic('light')

    // Auto-scroll if enabled
    if (this.config.autoScrollToNext) {
      this.scrollToCurrentStep()
    }

    this.emit('step:changed', { step: this.state.currentStep, direction: 'previous' })
    return true
  }

  /**
   * Jump to specific step
   */
  async goToStep(stepIndex: number): Promise<boolean> {
    if (stepIndex < 0 || stepIndex >= this.steps.length) return false

    // Validate all required steps up to target
    for (let i = 0; i < stepIndex; i++) {
      const step = this.steps[i]
      if (step.required && !step.completed) {
        if (!await this.validateStep(i)) {
          return false
        }
        step.completed = true
      }
    }

    this.state.currentStep = stepIndex
    this.updateStepState()

    // Trigger haptic feedback
    this.triggerHaptic('medium')

    this.emit('step:changed', { step: stepIndex, direction: 'jump' })
    return true
  }

  /**
   * Validate current step
   */
  async validateStep(stepIndex: number): Promise<boolean> {
    const step = this.steps[stepIndex]
    if (!step.validation) return true

    this.state.isValidating = true
    this.emit('validation:started', { step: stepIndex })

    try {
      const result = await step.validation(this.state.formData)
      
      if (typeof result === 'string') {
        this.state.errors[step.id] = result
        this.state.isValidating = false
        this.emit('validation:failed', { step: stepIndex, error: result })
        return false
      }

      if (!result) {
        this.state.errors[step.id] = 'Please complete this step'
        this.state.isValidating = false
        this.emit('validation:failed', { step: stepIndex, error: 'Validation failed' })
        return false
      }

      // Clear any existing errors
      delete this.state.errors[step.id]
      this.state.isValidating = false
      this.emit('validation:success', { step: stepIndex })
      return true

    } catch (error) {
      this.state.errors[step.id] = 'Validation error occurred'
      this.state.isValidating = false
      this.emit('validation:failed', { step: stepIndex, error: error.message })
      return false
    }
  }

  /**
   * Update step navigation state
   */
  private updateStepState() {
    this.state.canGoNext = this.canGoNext()
    this.state.canGoPrevious = this.canGoPrevious()
    this.emit('state:updated', { ...this.state })
  }

  /**
   * Check if can go to next step
   */
  canGoNext(): boolean {
    return this.state.currentStep < this.steps.length - 1 && !this.state.isLoading
  }

  /**
   * Check if can go to previous step
   */
  canGoPrevious(): boolean {
    return this.state.currentStep > 0 && !this.state.isLoading
  }

  /**
   * Get current step
   */
  getCurrentStep(): BookingStep {
    return this.steps[this.state.currentStep]
  }

  /**
   * Get all steps
   */
  getSteps(): BookingStep[] {
    return [...this.steps]
  }

  /**
   * Get current state
   */
  getState(): MobileBookingState {
    return { ...this.state }
  }

  /**
   * Update form data for current step
   */
  updateFormData(stepId: string, data: Record<string, any>): void {
    this.state.formData[stepId] = { ...this.state.formData[stepId], ...data }
    
    // Clear errors for updated fields
    Object.keys(data).forEach(key => {
      delete this.state.errors[`${stepId}.${key}`]
    })

    this.emit('form:updated', { stepId, data, formData: this.state.formData })
  }

  /**
   * Get form data for specific step
   */
  getFormData(stepId?: string): any {
    if (stepId) {
      return this.state.formData[stepId] || {}
    }
    return { ...this.state.formData }
  }

  /**
   * Trigger haptic feedback
   */
  private triggerHaptic(intensity: 'light' | 'medium' | 'heavy' = 'light') {
    if (!this.config.enableHapticFeedback || !this.hapticSupported) return

    try {
      // iOS Haptic Feedback
      if ((window as any).TapticEngine) {
        const types = {
          light: 'impact:light',
          medium: 'impact:medium', 
          heavy: 'impact:heavy'
        }
        ;(window as any).TapticEngine.impact({ style: types[intensity] })
        return
      }

      // Web Vibration API
      if (navigator.vibrate) {
        const patterns = {
          light: [10],
          medium: [25],
          heavy: [50]
        }
        navigator.vibrate(patterns[intensity])
      }
    } catch (error) {
      console.warn('Haptic feedback not available:', error)
    }
  }

  /**
   * Scroll to current step
   */
  private scrollToCurrentStep() {
    const stepElement = document.querySelector(`[data-step="${this.state.currentStep}"]`)
    if (stepElement) {
      stepElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  }

  /**
   * Quick booking for returning customers
   */
  async quickBook(serviceId: string, preferences?: Record<string, any>): Promise<boolean> {
    if (!this.config.enableQuickBooking) return false

    try {
      this.state.isLoading = true
      this.emit('quick:booking:started')

      // Auto-fill form data based on preferences
      if (preferences) {
        this.state.formData = { ...this.state.formData, ...preferences }
      }

      // Set service
      this.updateFormData('service', { selectedService: serviceId })

      // Skip to datetime selection if other details are available
      const hasCustomerDetails = this.state.formData.details && 
        this.state.formData.details.name && 
        this.state.formData.details.email

      if (hasCustomerDetails) {
        await this.goToStep(2) // datetime step
      } else {
        await this.goToStep(3) // customer details step
      }

      this.state.isLoading = false
      this.emit('quick:booking:ready')
      return true

    } catch (error) {
      this.state.isLoading = false
      this.emit('quick:booking:failed', { error: error.message })
      return false
    }
  }

  /**
   * Add custom validation to step
   */
  addStepValidation(stepId: string, validation: (data: any) => boolean | string): void {
    const step = this.steps.find(s => s.id === stepId)
    if (step) {
      step.validation = validation
    }
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
   * Reset booking flow
   */
  reset(): void {
    this.state = {
      currentStep: 0,
      totalSteps: this.steps.length,
      isLoading: false,
      canGoNext: false,
      canGoPrevious: false,
      formData: {},
      errors: {},
      touchPosition: null,
      swipeDirection: null,
      isValidating: false
    }

    this.steps.forEach(step => {
      step.completed = false
    })

    this.updateStepState()
    this.emit('booking:reset')
  }

  /**
   * Complete booking process
   */
  async completeBooking(): Promise<boolean> {
    try {
      this.state.isLoading = true
      this.emit('booking:started')

      // Validate all required steps
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i]
        if (step.required && !await this.validateStep(i)) {
          this.state.isLoading = false
          await this.goToStep(i)
          return false
        }
      }

      // Process booking (would integrate with backend)
      await this.processBooking()

      // Mark all steps as completed
      this.steps.forEach(step => {
        step.completed = true
      })

      // Go to confirmation step
      await this.goToStep(this.steps.length - 1)

      this.state.isLoading = false
      this.triggerHaptic('heavy')
      this.emit('booking:completed', { formData: this.state.formData })
      
      return true

    } catch (error) {
      this.state.isLoading = false
      this.emit('booking:failed', { error: error.message })
      return false
    }
  }

  /**
   * Process booking (placeholder for backend integration)
   */
  private async processBooking(): Promise<void> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // In real implementation, this would call the booking API
    console.log('Processing booking with data:', this.state.formData)
  }

  /**
   * Export booking data
   */
  exportBookingData(): any {
    return {
      steps: this.steps.map(step => ({
        id: step.id,
        title: step.title,
        completed: step.completed,
        data: this.state.formData[step.id]
      })),
      formData: this.state.formData,
      currentStep: this.state.currentStep,
      timestamp: Date.now()
    }
  }
}

// Global booking widget instance
let globalBookingWidget: MobileBookingWidgetSystem | null = null

/**
 * Get or create booking widget instance
 */
export function getMobileBookingWidget(
  config?: Partial<MobileBookingConfig>, 
  steps?: BookingStep[]
): MobileBookingWidgetSystem {
  if (!globalBookingWidget) {
    globalBookingWidget = new MobileBookingWidgetSystem(config, steps)
  }
  return globalBookingWidget
}

/**
 * Create new booking widget instance
 */
export function createMobileBookingWidget(
  config?: Partial<MobileBookingConfig>, 
  steps?: BookingStep[]
): MobileBookingWidgetSystem {
  return new MobileBookingWidgetSystem(config, steps)
}

export default MobileBookingWidgetSystem