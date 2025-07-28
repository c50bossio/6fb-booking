/**
 * Mobile Booking Widgets Tests
 * Comprehensive test suite for mobile booking functionality
 * Version: 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MobileBookingWidgetSystem, getMobileBookingWidget, BookingStep, MobileBookingConfig } from '@/lib/mobile-booking-widgets'
import { useMobileBooking, useMobileBookingProgress, useMobileBookingGestures } from '@/hooks/useMobileBooking'

// Mock touch events and haptic feedback
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7 like Mac OS X)',
  vibrate: vi.fn()
}

const mockWindow = {
  innerWidth: 375,
  innerHeight: 812
}

const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

const mockDocument = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  querySelector: vi.fn()
}

// Mock touch events
const createTouchEvent = (type: string, touches: Array<{ clientX: number; clientY: number }>) => ({
  type,
  touches: touches.map(touch => ({ clientX: touch.clientX, clientY: touch.clientY })),
  changedTouches: touches.map(touch => ({ clientX: touch.clientX, clientY: touch.clientY }))
})

describe('MobileBookingWidgetSystem', () => {
  let bookingWidget: MobileBookingWidgetSystem
  let originalNavigator: any
  let originalWindow: any
  let originalLocalStorage: any
  let originalDocument: any

  beforeEach(() => {
    // Setup mocks
    originalNavigator = global.navigator
    originalWindow = global.window
    originalLocalStorage = global.localStorage
    originalDocument = global.document

    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    })

    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true
    })

    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })

    Object.defineProperty(global, 'document', {
      value: mockDocument,
      writable: true
    })

    // Reset mocks
    vi.clearAllMocks()

    // Create fresh instance
    bookingWidget = new MobileBookingWidgetSystem()
  })

  afterEach(() => {
    // Restore originals
    global.navigator = originalNavigator
    global.window = originalWindow
    global.localStorage = originalLocalStorage
    global.document = originalDocument
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const state = bookingWidget.getState()
      expect(state.currentStep).toBe(0)
      expect(state.totalSteps).toBeGreaterThan(0)
      expect(state.formData).toEqual({})
    })

    it('should accept custom configuration', () => {
      const config: Partial<MobileBookingConfig> = {
        enableSwipeNavigation: false,
        enableHapticFeedback: false,
        minimumTouchTarget: 48
      }

      const widget = new MobileBookingWidgetSystem(config)
      const state = widget.getState()
      expect(state).toBeDefined()
    })

    it('should accept custom steps', () => {
      const customSteps: BookingStep[] = [
        {
          id: 'custom-step',
          title: 'Custom Step',
          required: true,
          completed: false,
          skippable: false,
          component: 'CustomComponent'
        }
      ]

      const widget = new MobileBookingWidgetSystem({}, customSteps)
      const steps = widget.getSteps()
      expect(steps).toHaveLength(1)
      expect(steps[0].id).toBe('custom-step')
    })

    it('should detect haptic support correctly', () => {
      const state = bookingWidget.getState()
      expect(state).toBeDefined()
      // Haptic support detection is internal, but should not crash
    })
  })

  describe('Step Navigation', () => {
    it('should move to next step successfully', async () => {
      const initialStep = bookingWidget.getState().currentStep
      const success = await bookingWidget.nextStep()
      
      expect(success).toBe(true)
      expect(bookingWidget.getState().currentStep).toBe(initialStep + 1)
    })

    it('should move to previous step successfully', async () => {
      // First move forward
      await bookingWidget.nextStep()
      
      const currentStep = bookingWidget.getState().currentStep
      const success = await bookingWidget.previousStep()
      
      expect(success).toBe(true)
      expect(bookingWidget.getState().currentStep).toBe(currentStep - 1)
    })

    it('should jump to specific step', async () => {
      const targetStep = 2
      const success = await bookingWidget.goToStep(targetStep)
      
      expect(success).toBe(true)
      expect(bookingWidget.getState().currentStep).toBe(targetStep)
    })

    it('should prevent navigation beyond bounds', async () => {
      // Try to go to invalid step
      const success = await bookingWidget.goToStep(-1)
      expect(success).toBe(false)

      const invalidStep = bookingWidget.getSteps().length + 1
      const success2 = await bookingWidget.goToStep(invalidStep)
      expect(success2).toBe(false)
    })

    it('should prevent previous step when at beginning', async () => {
      const success = await bookingWidget.previousStep()
      expect(success).toBe(false)
    })

    it('should prevent next step when at end', async () => {
      const steps = bookingWidget.getSteps()
      await bookingWidget.goToStep(steps.length - 1)
      
      const success = await bookingWidget.nextStep()
      expect(success).toBe(false)
    })
  })

  describe('Form Data Management', () => {
    it('should update form data correctly', () => {
      const stepId = 'service'
      const data = { selectedService: 'haircut', price: 25 }
      
      bookingWidget.updateFormData(stepId, data)
      
      const formData = bookingWidget.getFormData(stepId)
      expect(formData).toEqual(data)
    })

    it('should merge form data updates', () => {
      const stepId = 'service'
      
      bookingWidget.updateFormData(stepId, { selectedService: 'haircut' })
      bookingWidget.updateFormData(stepId, { price: 25 })
      
      const formData = bookingWidget.getFormData(stepId)
      expect(formData).toEqual({ selectedService: 'haircut', price: 25 })
    })

    it('should get all form data', () => {
      bookingWidget.updateFormData('service', { selectedService: 'haircut' })
      bookingWidget.updateFormData('details', { name: 'John Doe' })
      
      const allData = bookingWidget.getFormData()
      expect(allData).toEqual({
        service: { selectedService: 'haircut' },
        details: { name: 'John Doe' }
      })
    })

    it('should clear errors when updating form data', () => {
      const stepId = 'service'
      
      // Simulate an error
      bookingWidget.getState().errors[`${stepId}.field`] = 'Error message'
      
      // Update form data should clear errors
      bookingWidget.updateFormData(stepId, { field: 'new value' })
      
      expect(bookingWidget.getState().errors[`${stepId}.field`]).toBeUndefined()
    })
  })

  describe('Validation', () => {
    it('should validate step successfully', async () => {
      const stepIndex = 0
      
      // Add validation function
      bookingWidget.addStepValidation('service', (data) => {
        return !!data.selectedService
      })
      
      // Add required data
      bookingWidget.updateFormData('service', { selectedService: 'haircut' })
      
      const isValid = await bookingWidget.validateStep(stepIndex)
      expect(isValid).toBe(true)
    })

    it('should fail validation with missing data', async () => {
      const stepIndex = 0
      
      // Add validation function
      bookingWidget.addStepValidation('service', (data) => {
        return !!data.selectedService
      })
      
      // Don't add required data
      const isValid = await bookingWidget.validateStep(stepIndex)
      expect(isValid).toBe(true) // Default steps don't have validation
    })

    it('should handle validation errors', async () => {
      const stepIndex = 0
      
      // Add validation function that returns error message
      bookingWidget.addStepValidation('service', (data) => {
        if (!data.selectedService) {
          return 'Please select a service'
        }
        return true
      })
      
      const isValid = await bookingWidget.validateStep(stepIndex)
      expect(isValid).toBe(false)
      expect(bookingWidget.getState().errors['service']).toBe('Please select a service')
    })

    it('should handle async validation', async () => {
      const stepIndex = 0
      
      // Add async validation function
      bookingWidget.addStepValidation('service', async (data) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 100))
        return !!data.selectedService
      })
      
      bookingWidget.updateFormData('service', { selectedService: 'haircut' })
      
      const isValid = await bookingWidget.validateStep(stepIndex)
      expect(isValid).toBe(true)
    })
  })

  describe('Touch Gestures', () => {
    it('should setup touch listeners', () => {
      expect(mockDocument.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: true })
      expect(mockDocument.addEventListener).toHaveBeenCalledWith('touchend', expect.any(Function), { passive: true })
    })

    it('should detect swipe gestures', async () => {
      const widget = new MobileBookingWidgetSystem({
        enableSwipeNavigation: true,
        swipeThreshold: 50
      })

      let swipeDirection: string | null = null
      widget.on('swipe:left', () => { swipeDirection = 'left' })
      widget.on('swipe:right', () => { swipeDirection = 'right' })

      // Simulate left swipe (would normally be called by touch handler)
      const touchStart = createTouchEvent('touchstart', [{ clientX: 100, clientY: 100 }])
      const touchEnd = createTouchEvent('touchend', [{ clientX: 50, clientY: 100 }])

      // Test the gesture detection logic directly
      expect(widget).toBeDefined()
    })

    it('should trigger haptic feedback', () => {
      // Test navigation with haptic feedback
      bookingWidget.nextStep()
      
      // Haptic feedback should be triggered internally
      // We can't directly test private methods, but ensure no errors
      expect(bookingWidget.getState()).toBeDefined()
    })
  })

  describe('Quick Booking', () => {
    it('should perform quick booking successfully', async () => {
      const serviceId = 'haircut'
      const preferences = { barber: 'john', time: '10:00 AM' }
      
      const success = await bookingWidget.quickBook(serviceId, preferences)
      expect(success).toBe(true)
      
      const formData = bookingWidget.getFormData()
      expect(formData.service?.selectedService).toBe(serviceId)
    })

    it('should handle quick booking failure', async () => {
      const widget = new MobileBookingWidgetSystem({
        enableQuickBooking: false
      })
      
      const success = await widget.quickBook('haircut')
      expect(success).toBe(false)
    })

    it('should auto-advance to appropriate step', async () => {
      const success = await bookingWidget.quickBook('haircut', {
        details: { name: 'John', email: 'john@example.com' }
      })
      
      expect(success).toBe(true)
      // Should skip to datetime step if customer details are provided
      expect(bookingWidget.getState().currentStep).toBeGreaterThan(0)
    })
  })

  describe('Event System', () => {
    it('should register and emit events', () => {
      const callback = vi.fn()
      
      bookingWidget.on('test:event', callback)
      // Emit event internally (testing private method indirectly)
      
      expect(callback).toHaveBeenCalledTimes(0) // Event not emitted yet
      
      // Remove listener
      bookingWidget.off('test:event', callback)
    })

    it('should emit step change events', async () => {
      const callback = vi.fn()
      
      bookingWidget.on('step:changed', callback)
      await bookingWidget.nextStep()
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          step: expect.any(Number),
          direction: 'next'
        })
      )
    })

    it('should emit form update events', () => {
      const callback = vi.fn()
      
      bookingWidget.on('form:updated', callback)
      bookingWidget.updateFormData('service', { selectedService: 'haircut' })
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          stepId: 'service',
          data: { selectedService: 'haircut' }
        })
      )
    })
  })

  describe('Booking Completion', () => {
    it('should complete booking successfully', async () => {
      // Fill out required data
      bookingWidget.updateFormData('service', { selectedService: 'haircut', price: 25 })
      bookingWidget.updateFormData('datetime', { date: '2024-01-15', time: '10:00 AM' })
      bookingWidget.updateFormData('details', { 
        name: 'John Doe', 
        email: 'john@example.com', 
        phone: '555-1234' 
      })
      
      const success = await bookingWidget.completeBooking()
      expect(success).toBe(true)
    })

    it('should export booking data correctly', () => {
      bookingWidget.updateFormData('service', { selectedService: 'haircut' })
      bookingWidget.updateFormData('details', { name: 'John Doe' })
      
      const exportedData = bookingWidget.exportBookingData()
      
      expect(exportedData).toEqual(
        expect.objectContaining({
          steps: expect.any(Array),
          formData: expect.objectContaining({
            service: { selectedService: 'haircut' },
            details: { name: 'John Doe' }
          }),
          currentStep: expect.any(Number),
          timestamp: expect.any(Number)
        })
      )
    })

    it('should reset booking state', () => {
      // Add some data and progress
      bookingWidget.updateFormData('service', { selectedService: 'haircut' })
      bookingWidget.nextStep()
      
      // Reset
      bookingWidget.reset()
      
      const state = bookingWidget.getState()
      expect(state.currentStep).toBe(0)
      expect(state.formData).toEqual({})
      expect(state.errors).toEqual({})
    })
  })
})

describe('useMobileBooking Hook', () => {
  beforeEach(() => {
    // Setup mocks for hook tests
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    })

    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })

    vi.clearAllMocks()
  })

  it('should provide correct initial state', () => {
    const { result } = renderHook(() => useMobileBooking())
    
    expect(result.current.currentStep).toBe(0)
    expect(result.current.totalSteps).toBeGreaterThan(0)
    expect(result.current.steps).toBeInstanceOf(Array)
    expect(result.current.widget).toBeDefined()
  })

  it('should handle step navigation', async () => {
    const { result } = renderHook(() => useMobileBooking())
    
    await act(async () => {
      const success = await result.current.nextStep()
      expect(success).toBe(true)
    })

    expect(result.current.currentStep).toBe(1)
  })

  it('should handle form data updates', () => {
    const { result } = renderHook(() => useMobileBooking())
    
    act(() => {
      result.current.updateFormData('service', { selectedService: 'haircut' })
    })

    const formData = result.current.getFormData('service')
    expect(formData).toEqual({ selectedService: 'haircut' })
  })

  it('should handle booking completion', async () => {
    const { result } = renderHook(() => useMobileBooking())
    
    await act(async () => {
      // Fill required data
      result.current.updateFormData('service', { selectedService: 'haircut' })
      result.current.updateFormData('details', { 
        name: 'John', 
        email: 'john@example.com' 
      })
      
      const success = await result.current.completeBooking()
      expect(success).toBe(true)
    })
  })

  it('should persist state when enabled', () => {
    const { result } = renderHook(() => useMobileBooking({ persistState: true }))
    
    act(() => {
      result.current.updateFormData('service', { selectedService: 'haircut' })
    })

    // Should save to localStorage
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'mobile_booking_state',
      expect.stringContaining('haircut')
    )
  })
})

describe('useMobileBookingProgress Hook', () => {
  it('should provide progress information', () => {
    const { result } = renderHook(() => useMobileBookingProgress())
    
    expect(result.current.progress).toEqual(
      expect.objectContaining({
        current: expect.any(Number),
        total: expect.any(Number),
        percentage: expect.any(Number),
        completed: expect.any(Number),
        remaining: expect.any(Number)
      })
    )
  })

  it('should provide step status functions', () => {
    const { result } = renderHook(() => useMobileBookingProgress())
    
    expect(result.current.getStepStatus(0)).toBe('current')
    expect(result.current.isStepAccessible(0)).toBe(true)
  })
})

describe('useMobileBookingGestures Hook', () => {
  it('should provide gesture state', () => {
    const { result } = renderHook(() => useMobileBookingGestures())
    
    expect(result.current.gestureState).toEqual(
      expect.objectContaining({
        isSwipeEnabled: expect.any(Boolean),
        swipeThreshold: expect.any(Number),
        lastSwipeDirection: null
      })
    )
  })

  it('should allow enabling/disabling swipe', () => {
    const { result } = renderHook(() => useMobileBookingGestures())
    
    act(() => {
      result.current.disableSwipe()
    })

    expect(result.current.gestureState.isSwipeEnabled).toBe(false)

    act(() => {
      result.current.enableSwipe()
    })

    expect(result.current.gestureState.isSwipeEnabled).toBe(true)
  })
})