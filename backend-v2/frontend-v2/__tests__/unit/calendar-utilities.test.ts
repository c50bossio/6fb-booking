/**
 * Comprehensive Unit Tests for Calendar Utilities and Edge Cases
 * 
 * Testing utility functions, edge cases, error handling, and boundary conditions
 * to achieve 95%+ test coverage for Phase 2 calendar system.
 */

import { 
  formatAppointmentTime,
  calculateAppointmentDuration,
  detectTimeConflicts,
  generateTimeSlots,
  isWithinBusinessHours,
  calculateOptimalViewport,
  debounceCalendarUpdates,
  memoizeCalendarData,
  validateAppointmentData,
  sanitizeCalendarInput,
  generateCalendarKey,
  mergeCalendarSettings,
  parseCalendarDate,
  formatCalendarRange,
  calculateScrollPosition,
  getVisibleTimeRange,
  optimizeRenderBatch,
  createCalendarGrid,
  findNearestTimeSlot,
  calculateAppointmentPosition,
  detectMobileGesture,
  validateCacheEntry,
  compressCalendarData,
  decompressCalendarData,
  calculateMemoryUsage,
  performanceOptimizer,
  accessibilityHelper,
  touchGestureHandler,
  calendarEventDispatcher
} from '@/lib/calendar-utilities'

import {
  isAppointmentConflict,
  findAvailableTimeSlots,
  calculateServiceDuration,
  generateRecurringAppointments,
  validateBusinessRules,
  optimizeSchedule,
  detectOverbooking,
  suggestAlternativeTimes,
  calculateBarberUtilization,
  predictAppointmentNo_shows,
  analyzeBookingPatterns,
  generateCapacityReport
} from '@/lib/appointment-utilities'

import {
  createTouchHandler,
  detectSwipeGesture,
  calculateVelocity,
  handlePinchZoom,
  optimizeTouchResponse,
  preventScrollBounce,
  enableMomentumScrolling,
  detectDoubleTap,
  createHapticFeedback,
  manageTouchState
} from '@/lib/touch-utilities'

import {
  createAnimationSequence,
  optimizeFrameRate,
  calculateEasing,
  manageAnimationQueue,
  detectReducedMotion,
  createMicroInteraction,
  handleViewTransition,
  optimizeStaggering,
  preventLayoutThrashing,
  measureAnimationPerformance
} from '@/lib/animation-utilities'

// Mock dependencies
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (date instanceof Date) {
      if (formatStr === 'HH:mm') return date.toTimeString().slice(0, 5)
      if (formatStr === 'yyyy-MM-dd') return date.toISOString().slice(0, 10)
      return date.toISOString()
    }
    return '2023-12-01T10:00:00.000Z'
  }),
  parseISO: jest.fn((str) => new Date(str)),
  differenceInMinutes: jest.fn(() => 60),
  isWithinInterval: jest.fn(() => true),
  addMinutes: jest.fn((date, minutes) => new Date(date.getTime() + minutes * 60000)),
  startOfDay: jest.fn((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())),
  endOfDay: jest.fn((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59))
}))

// Test data
const mockAppointment = {
  id: 1,
  start_time: '2023-12-01T10:00:00Z',
  end_time: '2023-12-01T11:00:00Z',
  client_name: 'John Doe',
  service_name: 'Haircut',
  barber_name: 'Jane Smith',
  status: 'confirmed' as const,
  duration_minutes: 60
}

const mockBusinessHours = {
  monday: { open: '09:00', close: '18:00' },
  tuesday: { open: '09:00', close: '18:00' },
  wednesday: { open: '09:00', close: '18:00' },
  thursday: { open: '09:00', close: '18:00' },
  friday: { open: '09:00', close: '18:00' },
  saturday: { open: '10:00', close: '16:00' },
  sunday: { closed: true }
}

describe('Calendar Utilities', () => {
  describe('formatAppointmentTime', () => {
    test('formats appointment time correctly', () => {
      const result = formatAppointmentTime(mockAppointment)
      expect(result).toMatch(/10:00.*11:00/)
    })

    test('handles invalid dates gracefully', () => {
      const invalidAppointment = {
        ...mockAppointment,
        start_time: 'invalid-date',
        end_time: 'invalid-date'
      }
      
      const result = formatAppointmentTime(invalidAppointment)
      expect(result).toBe('Invalid time')
    })

    test('formats different time zones', () => {
      const appointment = {
        ...mockAppointment,
        start_time: '2023-12-01T15:00:00-05:00',
        end_time: '2023-12-01T16:00:00-05:00'
      }
      
      const result = formatAppointmentTime(appointment)
      expect(result).toBeDefined()
    })

    test('handles 24-hour format', () => {
      const result = formatAppointmentTime(mockAppointment, { format24h: true })
      expect(result).toMatch(/\d{2}:\d{2}/)
    })

    test('handles 12-hour format with AM/PM', () => {
      const result = formatAppointmentTime(mockAppointment, { format24h: false })
      expect(result).toMatch(/(AM|PM)/)
    })
  })

  describe('calculateAppointmentDuration', () => {
    test('calculates duration in minutes', () => {
      const duration = calculateAppointmentDuration(mockAppointment)
      expect(duration).toBe(60)
    })

    test('handles zero duration', () => {
      const sameTimeAppointment = {
        ...mockAppointment,
        start_time: '2023-12-01T10:00:00Z',
        end_time: '2023-12-01T10:00:00Z'
      }
      
      const duration = calculateAppointmentDuration(sameTimeAppointment)
      expect(duration).toBe(0)
    })

    test('handles negative duration', () => {
      const invalidAppointment = {
        ...mockAppointment,
        start_time: '2023-12-01T11:00:00Z',
        end_time: '2023-12-01T10:00:00Z'
      }
      
      const duration = calculateAppointmentDuration(invalidAppointment)
      expect(duration).toBe(0) // Should normalize to 0 or handle gracefully
    })

    test('handles very long durations', () => {
      const longAppointment = {
        ...mockAppointment,
        start_time: '2023-12-01T10:00:00Z',
        end_time: '2023-12-02T10:00:00Z'
      }
      
      const duration = calculateAppointmentDuration(longAppointment)
      expect(duration).toBe(24 * 60) // 24 hours
    })
  })

  describe('detectTimeConflicts', () => {
    test('detects overlapping appointments', () => {
      const appointments = [
        mockAppointment,
        {
          ...mockAppointment,
          id: 2,
          start_time: '2023-12-01T10:30:00Z',
          end_time: '2023-12-01T11:30:00Z'
        }
      ]
      
      const conflicts = detectTimeConflicts(appointments)
      expect(conflicts).toHaveLength(1)
      expect(conflicts[0]).toHaveProperty('conflictingAppointments')
    })

    test('handles no conflicts', () => {
      const appointments = [
        mockAppointment,
        {
          ...mockAppointment,
          id: 2,
          start_time: '2023-12-01T12:00:00Z',
          end_time: '2023-12-01T13:00:00Z'
        }
      ]
      
      const conflicts = detectTimeConflicts(appointments)
      expect(conflicts).toHaveLength(0)
    })

    test('handles empty appointment list', () => {
      const conflicts = detectTimeConflicts([])
      expect(conflicts).toHaveLength(0)
    })

    test('detects edge case conflicts (touching times)', () => {
      const appointments = [
        mockAppointment,
        {
          ...mockAppointment,
          id: 2,
          start_time: '2023-12-01T11:00:00Z',
          end_time: '2023-12-01T12:00:00Z'
        }
      ]
      
      const conflicts = detectTimeConflicts(appointments)
      expect(conflicts).toHaveLength(0) // Touching times should not conflict
    })
  })

  describe('generateTimeSlots', () => {
    test('generates time slots for business hours', () => {
      const timeSlots = generateTimeSlots(
        new Date('2023-12-01T09:00:00Z'),
        new Date('2023-12-01T17:00:00Z'),
        30 // 30-minute intervals
      )
      
      expect(timeSlots).toHaveLength(16) // 8 hours * 2 slots per hour
      expect(timeSlots[0]).toHaveProperty('time')
      expect(timeSlots[0]).toHaveProperty('available')
    })

    test('handles different interval durations', () => {
      const slots15min = generateTimeSlots(
        new Date('2023-12-01T09:00:00Z'),
        new Date('2023-12-01T10:00:00Z'),
        15
      )
      
      const slots60min = generateTimeSlots(
        new Date('2023-12-01T09:00:00Z'),
        new Date('2023-12-01T10:00:00Z'),
        60
      )
      
      expect(slots15min).toHaveLength(4)
      expect(slots60min).toHaveLength(1)
    })

    test('marks unavailable slots', () => {
      const busyTimes = [
        { start: new Date('2023-12-01T10:00:00Z'), end: new Date('2023-12-01T11:00:00Z') }
      ]
      
      const timeSlots = generateTimeSlots(
        new Date('2023-12-01T09:00:00Z'),
        new Date('2023-12-01T12:00:00Z'),
        30,
        busyTimes
      )
      
      const unavailableSlots = timeSlots.filter(slot => !slot.available)
      expect(unavailableSlots.length).toBeGreaterThan(0)
    })

    test('handles invalid time range', () => {
      const timeSlots = generateTimeSlots(
        new Date('2023-12-01T17:00:00Z'),
        new Date('2023-12-01T09:00:00Z'),
        30
      )
      
      expect(timeSlots).toHaveLength(0)
    })
  })

  describe('isWithinBusinessHours', () => {
    test('validates appointment within business hours', () => {
      const isValid = isWithinBusinessHours(mockAppointment, mockBusinessHours)
      expect(isValid).toBe(true)
    })

    test('rejects appointment outside business hours', () => {
      const earlyAppointment = {
        ...mockAppointment,
        start_time: '2023-12-01T08:00:00Z',
        end_time: '2023-12-01T09:00:00Z'
      }
      
      const isValid = isWithinBusinessHours(earlyAppointment, mockBusinessHours)
      expect(isValid).toBe(false)
    })

    test('handles closed days', () => {
      const sundayAppointment = {
        ...mockAppointment,
        start_time: '2023-12-03T10:00:00Z', // Sunday
        end_time: '2023-12-03T11:00:00Z'
      }
      
      const isValid = isWithinBusinessHours(sundayAppointment, mockBusinessHours)
      expect(isValid).toBe(false)
    })

    test('handles different day formats', () => {
      const customBusinessHours = {
        0: { closed: true }, // Sunday
        1: { open: '09:00', close: '18:00' }, // Monday
        // ... etc
      }
      
      const isValid = isWithinBusinessHours(mockAppointment, customBusinessHours)
      expect(typeof isValid).toBe('boolean')
    })
  })

  describe('calculateOptimalViewport', () => {
    test('calculates viewport for appointments', () => {
      const appointments = [mockAppointment]
      const viewport = calculateOptimalViewport(appointments, 'week')
      
      expect(viewport).toHaveProperty('startDate')
      expect(viewport).toHaveProperty('endDate')
      expect(viewport).toHaveProperty('zoomLevel')
    })

    test('handles empty appointment list', () => {
      const viewport = calculateOptimalViewport([], 'month')
      
      expect(viewport.startDate).toBeInstanceOf(Date)
      expect(viewport.endDate).toBeInstanceOf(Date)
    })

    test('adjusts for different view types', () => {
      const dayViewport = calculateOptimalViewport([mockAppointment], 'day')
      const monthViewport = calculateOptimalViewport([mockAppointment], 'month')
      
      expect(dayViewport.zoomLevel).toBeGreaterThan(monthViewport.zoomLevel)
    })

    test('handles appointments spanning multiple days', () => {
      const multiDayAppointments = [
        mockAppointment,
        {
          ...mockAppointment,
          id: 2,
          start_time: '2023-12-05T10:00:00Z',
          end_time: '2023-12-05T11:00:00Z'
        }
      ]
      
      const viewport = calculateOptimalViewport(multiDayAppointments, 'week')
      expect(viewport.endDate.getTime() - viewport.startDate.getTime()).toBeGreaterThan(0)
    })
  })

  describe('debounceCalendarUpdates', () => {
    test('debounces rapid function calls', async () => {
      const mockFn = jest.fn()
      const debouncedFn = debounceCalendarUpdates(mockFn, 100)
      
      debouncedFn()
      debouncedFn()
      debouncedFn()
      
      expect(mockFn).not.toHaveBeenCalled()
      
      await new Promise(resolve => setTimeout(resolve, 150))
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    test('passes arguments correctly', async () => {
      const mockFn = jest.fn()
      const debouncedFn = debounceCalendarUpdates(mockFn, 50)
      
      debouncedFn('arg1', 'arg2')
      
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
    })

    test('handles immediate execution', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounceCalendarUpdates(mockFn, 100, true)
      
      debouncedFn()
      expect(mockFn).toHaveBeenCalledTimes(1)
      
      debouncedFn()
      expect(mockFn).toHaveBeenCalledTimes(1) // Should not call again immediately
    })
  })

  describe('memoizeCalendarData', () => {
    test('caches function results', () => {
      const expensiveFn = jest.fn((data) => ({ processed: data }))
      const memoizedFn = memoizeCalendarData(expensiveFn)
      
      const result1 = memoizedFn('test-data')
      const result2 = memoizedFn('test-data')
      
      expect(expensiveFn).toHaveBeenCalledTimes(1)
      expect(result1).toBe(result2)
    })

    test('handles different arguments', () => {
      const expensiveFn = jest.fn((data) => ({ processed: data }))
      const memoizedFn = memoizeCalendarData(expensiveFn)
      
      memoizedFn('data1')
      memoizedFn('data2')
      memoizedFn('data1')
      
      expect(expensiveFn).toHaveBeenCalledTimes(2)
    })

    test('respects cache size limit', () => {
      const expensiveFn = jest.fn((data) => ({ processed: data }))
      const memoizedFn = memoizeCalendarData(expensiveFn, { maxSize: 2 })
      
      memoizedFn('data1')
      memoizedFn('data2')
      memoizedFn('data3') // Should evict data1
      memoizedFn('data1') // Should call function again
      
      expect(expensiveFn).toHaveBeenCalledTimes(4)
    })
  })

  describe('validateAppointmentData', () => {
    test('validates correct appointment data', () => {
      const result = validateAppointmentData(mockAppointment)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('detects missing required fields', () => {
      const invalidAppointment = {
        id: 1,
        start_time: '2023-12-01T10:00:00Z'
        // Missing end_time, client_name, etc.
      }
      
      const result = validateAppointmentData(invalidAppointment)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    test('validates time format', () => {
      const invalidTimeAppointment = {
        ...mockAppointment,
        start_time: 'invalid-time-format'
      }
      
      const result = validateAppointmentData(invalidTimeAppointment)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid start_time format')
    })

    test('validates logical time order', () => {
      const illogicalAppointment = {
        ...mockAppointment,
        start_time: '2023-12-01T11:00:00Z',
        end_time: '2023-12-01T10:00:00Z'
      }
      
      const result = validateAppointmentData(illogicalAppointment)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('End time must be after start time')
    })

    test('validates duration limits', () => {
      const longAppointment = {
        ...mockAppointment,
        start_time: '2023-12-01T10:00:00Z',
        end_time: '2023-12-02T10:00:00Z' // 24 hours
      }
      
      const result = validateAppointmentData(longAppointment, { maxDurationHours: 8 })
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Duration exceeds maximum allowed')
    })
  })

  describe('sanitizeCalendarInput', () => {
    test('sanitizes malicious input', () => {
      const maliciousInput = {
        client_name: '<script>alert("xss")</script>John Doe',
        service_name: 'Haircut & <img src=x onerror=alert(1)>',
        notes: 'Regular notes'
      }
      
      const sanitized = sanitizeCalendarInput(maliciousInput)
      expect(sanitized.client_name).not.toContain('<script>')
      expect(sanitized.service_name).not.toContain('<img')
      expect(sanitized.notes).toBe('Regular notes')
    })

    test('preserves safe content', () => {
      const safeInput = {
        client_name: 'John Doe',
        service_name: 'Haircut & Styling',
        notes: 'Client prefers shorter style'
      }
      
      const sanitized = sanitizeCalendarInput(safeInput)
      expect(sanitized).toEqual(safeInput)
    })

    test('handles empty and null values', () => {
      const inputWithNulls = {
        client_name: null,
        service_name: '',
        notes: undefined
      }
      
      const sanitized = sanitizeCalendarInput(inputWithNulls)
      expect(sanitized.client_name).toBe('')
      expect(sanitized.service_name).toBe('')
      expect(sanitized.notes).toBe('')
    })

    test('limits input length', () => {
      const longInput = {
        client_name: 'A'.repeat(1000),
        notes: 'B'.repeat(2000)
      }
      
      const sanitized = sanitizeCalendarInput(longInput, { maxLength: 100 })
      expect(sanitized.client_name).toHaveLength(100)
      expect(sanitized.notes).toHaveLength(100)
    })
  })
})

describe('Performance Utilities', () => {
  describe('optimizeRenderBatch', () => {
    test('batches render operations', async () => {
      const mockRender = jest.fn()
      const batchedRender = optimizeRenderBatch(mockRender, { batchSize: 3, delay: 10 })
      
      batchedRender('item1')
      batchedRender('item2')
      batchedRender('item3')
      batchedRender('item4')
      
      expect(mockRender).toHaveBeenCalledTimes(1)
      expect(mockRender).toHaveBeenCalledWith(['item1', 'item2', 'item3'])
      
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(mockRender).toHaveBeenCalledTimes(2)
      expect(mockRender).toHaveBeenLastCalledWith(['item4'])
    })

    test('handles empty batches', async () => {
      const mockRender = jest.fn()
      const batchedRender = optimizeRenderBatch(mockRender)
      
      // Don't add any items
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(mockRender).not.toHaveBeenCalled()
    })

    test('flushes on demand', () => {
      const mockRender = jest.fn()
      const batchedRender = optimizeRenderBatch(mockRender)
      
      batchedRender('item1')
      batchedRender('item2')
      
      expect(mockRender).not.toHaveBeenCalled()
      
      batchedRender.flush()
      expect(mockRender).toHaveBeenCalledWith(['item1', 'item2'])
    })
  })

  describe('calculateMemoryUsage', () => {
    test('estimates memory usage', () => {
      const smallObject = { id: 1, name: 'test' }
      const largeObject = { 
        id: 1, 
        data: Array.from({ length: 1000 }, (_, i) => ({ index: i, value: `item-${i}` }))
      }
      
      const smallMemory = calculateMemoryUsage(smallObject)
      const largeMemory = calculateMemoryUsage(largeObject)
      
      expect(smallMemory).toBeGreaterThan(0)
      expect(largeMemory).toBeGreaterThan(smallMemory)
    })

    test('handles circular references', () => {
      const circular: any = { name: 'test' }
      circular.self = circular
      
      const memory = calculateMemoryUsage(circular)
      expect(memory).toBeGreaterThan(0)
    })

    test('handles null and undefined', () => {
      expect(calculateMemoryUsage(null)).toBe(0)
      expect(calculateMemoryUsage(undefined)).toBe(0)
    })
  })

  describe('performanceOptimizer', () => {
    test('provides optimization recommendations', () => {
      const performanceData = {
        fps: 45,
        memoryUsage: 150 * 1024 * 1024, // 150MB
        renderTime: 250,
        animationCount: 50
      }
      
      const recommendations = performanceOptimizer.analyze(performanceData)
      
      expect(recommendations).toHaveProperty('suggestions')
      expect(recommendations.suggestions.length).toBeGreaterThan(0)
      expect(recommendations).toHaveProperty('severity')
    })

    test('detects performance issues', () => {
      const poorPerformance = {
        fps: 20,
        memoryUsage: 500 * 1024 * 1024, // 500MB
        renderTime: 1000,
        animationCount: 200
      }
      
      const recommendations = performanceOptimizer.analyze(poorPerformance)
      
      expect(recommendations.severity).toBe('critical')
      expect(recommendations.suggestions).toContain('Reduce animation count')
    })

    test('optimizes based on device capabilities', () => {
      const mobileRecommendations = performanceOptimizer.getDeviceOptimizations('mobile')
      const desktopRecommendations = performanceOptimizer.getDeviceOptimizations('desktop')
      
      expect(mobileRecommendations.animationQuality).toBe('low')
      expect(desktopRecommendations.animationQuality).toBe('high')
    })
  })
})

describe('Touch Utilities', () => {
  describe('createTouchHandler', () => {
    test('creates touch event handlers', () => {
      const onTouch = jest.fn()
      const touchHandler = createTouchHandler({
        onStart: onTouch,
        onMove: onTouch,
        onEnd: onTouch
      })
      
      expect(touchHandler).toHaveProperty('onTouchStart')
      expect(touchHandler).toHaveProperty('onTouchMove')
      expect(touchHandler).toHaveProperty('onTouchEnd')
    })

    test('handles touch events with correct coordinates', () => {
      const onStart = jest.fn()
      const touchHandler = createTouchHandler({ onStart })
      
      const touchEvent = {
        touches: [{ clientX: 100, clientY: 200 }],
        preventDefault: jest.fn()
      }
      
      touchHandler.onTouchStart(touchEvent)
      expect(onStart).toHaveBeenCalledWith({ x: 100, y: 200 })
    })

    test('prevents default when configured', () => {
      const touchHandler = createTouchHandler({
        onStart: jest.fn(),
        preventDefault: true
      })
      
      const touchEvent = {
        touches: [{ clientX: 100, clientY: 200 }],
        preventDefault: jest.fn()
      }
      
      touchHandler.onTouchStart(touchEvent)
      expect(touchEvent.preventDefault).toHaveBeenCalled()
    })
  })

  describe('detectSwipeGesture', () => {
    test('detects left swipe', () => {
      const startPos = { x: 200, y: 100 }
      const endPos = { x: 50, y: 110 }
      const duration = 200
      
      const swipe = detectSwipeGesture(startPos, endPos, duration)
      
      expect(swipe.direction).toBe('left')
      expect(swipe.distance).toBeGreaterThan(100)
      expect(swipe.velocity).toBeGreaterThan(0)
    })

    test('detects right swipe', () => {
      const startPos = { x: 50, y: 100 }
      const endPos = { x: 200, y: 110 }
      const duration = 200
      
      const swipe = detectSwipeGesture(startPos, endPos, duration)
      
      expect(swipe.direction).toBe('right')
    })

    test('detects vertical swipes', () => {
      const upSwipe = detectSwipeGesture({ x: 100, y: 200 }, { x: 110, y: 50 }, 200)
      const downSwipe = detectSwipeGesture({ x: 100, y: 50 }, { x: 110, y: 200 }, 200)
      
      expect(upSwipe.direction).toBe('up')
      expect(downSwipe.direction).toBe('down')
    })

    test('rejects insufficient movement', () => {
      const startPos = { x: 100, y: 100 }
      const endPos = { x: 110, y: 105 } // Small movement
      const duration = 200
      
      const swipe = detectSwipeGesture(startPos, endPos, duration)
      
      expect(swipe).toBeNull()
    })

    test('rejects slow movements', () => {
      const startPos = { x: 100, y: 100 }
      const endPos = { x: 200, y: 100 }
      const duration = 2000 // Too slow
      
      const swipe = detectSwipeGesture(startPos, endPos, duration)
      
      expect(swipe).toBeNull()
    })
  })

  describe('calculateVelocity', () => {
    test('calculates velocity correctly', () => {
      const velocity = calculateVelocity(
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        200 // 200ms
      )
      
      expect(velocity.x).toBe(0.5) // 100px / 200ms = 0.5 px/ms
      expect(velocity.y).toBe(0)
      expect(velocity.magnitude).toBeCloseTo(0.5)
    })

    test('handles zero time', () => {
      const velocity = calculateVelocity(
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        0
      )
      
      expect(velocity.x).toBe(0)
      expect(velocity.y).toBe(0)
      expect(velocity.magnitude).toBe(0)
    })

    test('calculates diagonal velocity', () => {
      const velocity = calculateVelocity(
        { x: 0, y: 0 },
        { x: 100, y: 100 },
        200
      )
      
      expect(velocity.magnitude).toBeCloseTo(Math.sqrt(0.5 * 0.5 + 0.5 * 0.5))
    })
  })

  describe('detectDoubleTap', () => {
    test('detects double tap within time limit', () => {
      const doubleTapDetector = createDoubleTapDetector(300) // 300ms window
      
      const firstTap = doubleTapDetector.onTap({ x: 100, y: 100 })
      expect(firstTap).toBe(false)
      
      const secondTap = doubleTapDetector.onTap({ x: 105, y: 105 })
      expect(secondTap).toBe(true)
    })

    test('rejects taps outside time window', async () => {
      const doubleTapDetector = createDoubleTapDetector(100) // 100ms window
      
      doubleTapDetector.onTap({ x: 100, y: 100 })
      
      await new Promise(resolve => setTimeout(resolve, 150))
      
      const secondTap = doubleTapDetector.onTap({ x: 105, y: 105 })
      expect(secondTap).toBe(false)
    })

    test('rejects taps too far apart', () => {
      const doubleTapDetector = createDoubleTapDetector(300)
      
      doubleTapDetector.onTap({ x: 100, y: 100 })
      const secondTap = doubleTapDetector.onTap({ x: 200, y: 200 }) // Too far
      
      expect(secondTap).toBe(false)
    })
  })
})

describe('Animation Utilities', () => {
  describe('createAnimationSequence', () => {
    test('creates animation sequence', () => {
      const animations = [
        { duration: 200, easing: 'ease' },
        { duration: 300, easing: 'ease-in-out' }
      ]
      
      const sequence = createAnimationSequence(animations)
      
      expect(sequence).toHaveProperty('totalDuration')
      expect(sequence.totalDuration).toBe(500)
      expect(sequence.animations).toHaveLength(2)
    })

    test('handles parallel animations', () => {
      const animations = [
        { duration: 200, parallel: true },
        { duration: 300, parallel: true }
      ]
      
      const sequence = createAnimationSequence(animations)
      
      expect(sequence.totalDuration).toBe(300) // Longest parallel animation
    })

    test('combines sequential and parallel animations', () => {
      const animations = [
        { duration: 100 }, // Sequential
        { duration: 200, parallel: true },
        { duration: 150, parallel: true },
        { duration: 100 } // Sequential
      ]
      
      const sequence = createAnimationSequence(animations)
      
      expect(sequence.totalDuration).toBe(400) // 100 + max(200,150) + 100
    })
  })

  describe('optimizeFrameRate', () => {
    test('provides frame rate optimization suggestions', () => {
      const currentFPS = 45
      const targetFPS = 60
      
      const optimization = optimizeFrameRate(currentFPS, targetFPS)
      
      expect(optimization).toHaveProperty('suggestions')
      expect(optimization.suggestions.length).toBeGreaterThan(0)
      expect(optimization).toHaveProperty('priority')
    })

    test('handles already optimal frame rate', () => {
      const optimization = optimizeFrameRate(60, 60)
      
      expect(optimization.suggestions).toHaveLength(0)
      expect(optimization.priority).toBe('low')
    })

    test('prioritizes critical frame rate issues', () => {
      const optimization = optimizeFrameRate(15, 60) // Very low FPS
      
      expect(optimization.priority).toBe('critical')
      expect(optimization.suggestions).toContain('Reduce animation complexity')
    })
  })

  describe('detectReducedMotion', () => {
    test('detects reduced motion preference', () => {
      const mockMediaQuery = {
        matches: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }
      
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn(() => mockMediaQuery)
      })
      
      const isReduced = detectReducedMotion()
      expect(isReduced).toBe(true)
    })

    test('handles unsupported browsers', () => {
      Object.defineProperty(window, 'matchMedia', {
        value: undefined
      })
      
      const isReduced = detectReducedMotion()
      expect(isReduced).toBe(false) // Default to false
    })
  })

  describe('calculateEasing', () => {
    test('calculates cubic-bezier easing', () => {
      const easing = calculateEasing(0.5, [0.4, 0.0, 0.2, 1.0])
      
      expect(easing).toBeGreaterThanOrEqual(0)
      expect(easing).toBeLessThanOrEqual(1)
    })

    test('handles edge cases', () => {
      const startEasing = calculateEasing(0, [0.4, 0.0, 0.2, 1.0])
      const endEasing = calculateEasing(1, [0.4, 0.0, 0.2, 1.0])
      
      expect(startEasing).toBeCloseTo(0)
      expect(endEasing).toBeCloseTo(1)
    })

    test('validates bezier control points', () => {
      expect(() => {
        calculateEasing(0.5, [0.4, -0.5, 0.2, 1.0]) // Invalid control point
      }).toThrow('Invalid bezier control points')
    })
  })
})

describe('Error Handling and Edge Cases', () => {
  test('handles null and undefined inputs gracefully', () => {
    expect(() => formatAppointmentTime(null as any)).not.toThrow()
    expect(() => calculateAppointmentDuration(undefined as any)).not.toThrow()
    expect(() => detectTimeConflicts(null as any)).not.toThrow()
  })

  test('handles malformed date strings', () => {
    const badAppointment = {
      ...mockAppointment,
      start_time: 'not-a-date',
      end_time: 'also-not-a-date'
    }
    
    expect(() => formatAppointmentTime(badAppointment)).not.toThrow()
    expect(() => calculateAppointmentDuration(badAppointment)).not.toThrow()
  })

  test('handles extremely large datasets', () => {
    const largeAppointmentList = Array.from({ length: 10000 }, (_, i) => ({
      ...mockAppointment,
      id: i + 1
    }))
    
    expect(() => detectTimeConflicts(largeAppointmentList)).not.toThrow()
  })

  test('handles memory pressure gracefully', () => {
    // Simulate memory pressure
    const mockMemoryInfo = {
      usedJSHeapSize: 500 * 1024 * 1024, // 500MB
      totalJSHeapSize: 600 * 1024 * 1024 // 600MB
    }
    
    Object.defineProperty(performance, 'memory', {
      value: mockMemoryInfo
    })
    
    const memoryUsage = calculateMemoryUsage({ large: 'object' })
    expect(memoryUsage).toBeGreaterThan(0)
  })

  test('handles concurrent operations', async () => {
    const promises = Array.from({ length: 100 }, () => 
      Promise.resolve(formatAppointmentTime(mockAppointment))
    )
    
    const results = await Promise.all(promises)
    expect(results).toHaveLength(100)
    expect(results.every(result => typeof result === 'string')).toBe(true)
  })

  test('handles browser compatibility issues', () => {
    // Simulate older browser without modern APIs
    const originalRequestIdleCallback = window.requestIdleCallback
    delete (window as any).requestIdleCallback
    
    expect(() => optimizeRenderBatch(jest.fn())).not.toThrow()
    
    // Restore
    if (originalRequestIdleCallback) {
      window.requestIdleCallback = originalRequestIdleCallback
    }
  })

  test('handles touch events on non-touch devices', () => {
    // Simulate device without touch support
    const mockTouchEvent = {
      touches: undefined,
      preventDefault: jest.fn()
    }
    
    expect(() => {
      const handler = createTouchHandler({ onStart: jest.fn() })
      handler.onTouchStart(mockTouchEvent as any)
    }).not.toThrow()
  })

  test('handles rapid state changes', () => {
    const stateManager = createStateManager()
    
    // Rapidly change state
    for (let i = 0; i < 1000; i++) {
      stateManager.setState({ count: i })
    }
    
    expect(stateManager.getState().count).toBe(999)
  })
})