/**
 * Comprehensive Unit Tests for Calendar Hooks
 * 
 * Testing all custom hooks used in Phase 2 calendar components
 * to achieve 95%+ test coverage for hook implementations.
 */

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Hook imports
import { useCalendarPerformance } from '@/hooks/useCalendarPerformance'
import { useCalendarAccessibility } from '@/hooks/useCalendarAccessibility'
import { useResponsive } from '@/hooks/useResponsive'
import { useDebounce } from '@/hooks/useDebounce'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useHoverIntent } from '@/hooks/useHoverIntent'
import { useControlledTooltip } from '@/hooks/useControlledTooltip'

// Mock dependencies
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useLayoutEffect: jest.fn((effect, deps) => {
    // Use useEffect instead of useLayoutEffect in tests
    React.useEffect(effect, deps)
  })
}))

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024
  }
}

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true
})

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Mock requestAnimationFrame and cancelAnimationFrame
let frameId = 0
global.requestAnimationFrame = jest.fn((callback) => {
  frameId++
  setTimeout(() => callback(Date.now()), 16)
  return frameId
})

global.cancelAnimationFrame = jest.fn()

describe('useCalendarPerformance Hook', () => {
  beforeEach(() => {
    mockPerformance.now.mockClear()
    mockPerformance.mark.mockClear()
    mockPerformance.measure.mockClear()
  })

  test('initializes with default metrics', () => {
    const { result } = renderHook(() => useCalendarPerformance())
    
    expect(result.current.metrics).toEqual({
      fps: 0,
      memoryUsage: 0,
      renderTime: 0,
      animationCount: 0,
      isTracking: false
    })
  })

  test('starts and stops performance tracking', () => {
    const { result } = renderHook(() => useCalendarPerformance())
    
    act(() => {
      result.current.startTracking()
    })
    
    expect(result.current.metrics.isTracking).toBe(true)
    
    act(() => {
      result.current.stopTracking()
    })
    
    expect(result.current.metrics.isTracking).toBe(false)
  })

  test('measures render time', () => {
    const { result } = renderHook(() => useCalendarPerformance())
    
    act(() => {
      result.current.measureRenderTime('test-component')
    })
    
    expect(mockPerformance.mark).toHaveBeenCalledWith('test-component-start')
    
    act(() => {
      result.current.endMeasureRenderTime('test-component')
    })
    
    expect(mockPerformance.mark).toHaveBeenCalledWith('test-component-end')
    expect(mockPerformance.measure).toHaveBeenCalledWith(
      'test-component-render',
      'test-component-start',
      'test-component-end'
    )
  })

  test('tracks memory usage', async () => {
    const { result } = renderHook(() => useCalendarPerformance())
    
    act(() => {
      result.current.startTracking()
    })
    
    await waitFor(() => {
      expect(result.current.metrics.memoryUsage).toBeGreaterThan(0)
    })
  })

  test('calculates frame rate', async () => {
    const { result } = renderHook(() => useCalendarPerformance())
    
    act(() => {
      result.current.startTracking()
    })
    
    // Simulate multiple frame updates
    await act(async () => {
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 16))
      }
    })
    
    await waitFor(() => {
      expect(result.current.metrics.fps).toBeGreaterThan(0)
    })
  })

  test('provides performance recommendations', () => {
    const { result } = renderHook(() => useCalendarPerformance())
    
    // Simulate poor performance
    act(() => {
      result.current.updateMetrics({
        fps: 20,
        memoryUsage: 200 * 1024 * 1024,
        renderTime: 500,
        animationCount: 100
      })
    })
    
    const recommendations = result.current.getRecommendations()
    
    expect(recommendations).toHaveProperty('suggestions')
    expect(recommendations.suggestions.length).toBeGreaterThan(0)
    expect(recommendations).toHaveProperty('severity')
  })

  test('detects performance thresholds', () => {
    const { result } = renderHook(() => 
      useCalendarPerformance({ 
        fpsThreshold: 50,
        memoryThreshold: 100 * 1024 * 1024 
      })
    )
    
    act(() => {
      result.current.updateMetrics({
        fps: 30,
        memoryUsage: 150 * 1024 * 1024
      })
    })
    
    const warnings = result.current.getPerformanceWarnings()
    
    expect(warnings).toContain('Low frame rate detected')
    expect(warnings).toContain('High memory usage detected')
  })

  test('cleans up tracking on unmount', () => {
    const { result, unmount } = renderHook(() => useCalendarPerformance())
    
    act(() => {
      result.current.startTracking()
    })
    
    expect(result.current.metrics.isTracking).toBe(true)
    
    unmount()
    
    // Should clean up tracking
    expect(global.cancelAnimationFrame).toHaveBeenCalled()
  })
})

describe('useCalendarAccessibility Hook', () => {
  beforeEach(() => {
    // Clear any existing ARIA live regions
    document.querySelectorAll('[aria-live]').forEach(el => el.remove())
  })

  test('initializes accessibility helpers', () => {
    const { result } = renderHook(() => useCalendarAccessibility())
    
    expect(result.current).toHaveProperty('announceToScreenReader')
    expect(result.current).toHaveProperty('setFocusedDate')
    expect(result.current).toHaveProperty('navigateCalendar')
    expect(result.current).toHaveProperty('getAriaLabel')
  })

  test('announces messages to screen readers', () => {
    const { result } = renderHook(() => useCalendarAccessibility())
    
    act(() => {
      result.current.announceToScreenReader('Date changed to December 1st, 2023')
    })
    
    const liveRegion = document.querySelector('[aria-live="polite"]')
    expect(liveRegion).toBeInTheDocument()
    expect(liveRegion).toHaveTextContent('Date changed to December 1st, 2023')
  })

  test('announces urgent messages', () => {
    const { result } = renderHook(() => useCalendarAccessibility())
    
    act(() => {
      result.current.announceToScreenReader('Error: Invalid date selected', 'assertive')
    })
    
    const urgentRegion = document.querySelector('[aria-live="assertive"]')
    expect(urgentRegion).toBeInTheDocument()
    expect(urgentRegion).toHaveTextContent('Error: Invalid date selected')
  })

  test('manages focused date state', () => {
    const { result } = renderHook(() => useCalendarAccessibility())
    
    const testDate = new Date('2023-12-01')
    
    act(() => {
      result.current.setFocusedDate(testDate)
    })
    
    expect(result.current.focusedDate).toEqual(testDate)
  })

  test('provides keyboard navigation', () => {
    const { result } = renderHook(() => useCalendarAccessibility())
    
    const initialDate = new Date('2023-12-01')
    
    act(() => {
      result.current.setFocusedDate(initialDate)
    })
    
    act(() => {
      result.current.navigateCalendar('ArrowRight')
    })
    
    expect(result.current.focusedDate?.getDate()).toBe(2) // Next day
  })

  test('handles different navigation keys', () => {
    const { result } = renderHook(() => useCalendarAccessibility())
    
    const initialDate = new Date('2023-12-15') // Middle of month
    
    act(() => {
      result.current.setFocusedDate(initialDate)
    })
    
    // Test different arrow keys
    act(() => {
      result.current.navigateCalendar('ArrowDown') // Next week
    })
    
    expect(result.current.focusedDate?.getDate()).toBe(22)
    
    act(() => {
      result.current.navigateCalendar('ArrowUp') // Previous week
    })
    
    expect(result.current.focusedDate?.getDate()).toBe(15)
    
    act(() => {
      result.current.navigateCalendar('ArrowLeft') // Previous day
    })
    
    expect(result.current.focusedDate?.getDate()).toBe(14)
  })

  test('handles Home and End keys', () => {
    const { result } = renderHook(() => useCalendarAccessibility())
    
    const initialDate = new Date('2023-12-15')
    
    act(() => {
      result.current.setFocusedDate(initialDate)
    })
    
    act(() => {
      result.current.navigateCalendar('Home')
    })
    
    expect(result.current.focusedDate?.getDate()).toBe(1) // Start of month
    
    act(() => {
      result.current.navigateCalendar('End')
    })
    
    expect(result.current.focusedDate?.getDate()).toBe(31) // End of month
  })

  test('generates appropriate ARIA labels', () => {
    const { result } = renderHook(() => useCalendarAccessibility())
    
    const appointment = {
      id: 1,
      start_time: '2023-12-01T10:00:00Z',
      end_time: '2023-12-01T11:00:00Z',
      client_name: 'John Doe',
      service_name: 'Haircut',
      status: 'confirmed' as const
    }
    
    const ariaLabel = result.current.getAriaLabel('appointment', appointment)
    
    expect(ariaLabel).toContain('John Doe')
    expect(ariaLabel).toContain('Haircut')
    expect(ariaLabel).toContain('confirmed')
  })

  test('generates ARIA labels for different element types', () => {
    const { result } = renderHook(() => useCalendarAccessibility())
    
    const timeSlotLabel = result.current.getAriaLabel('timeslot', { 
      time: '10:00 AM',
      available: true 
    })
    
    const dateLabel = result.current.getAriaLabel('date', new Date('2023-12-01'))
    
    expect(timeSlotLabel).toContain('10:00 AM')
    expect(timeSlotLabel).toContain('available')
    expect(dateLabel).toContain('December')
  })

  test('manages focus trap for modals', () => {
    const { result } = renderHook(() => useCalendarAccessibility())
    
    // Create a mock modal with focusable elements
    const modal = document.createElement('div')
    const button1 = document.createElement('button')
    const button2 = document.createElement('input')
    const button3 = document.createElement('button')
    
    modal.appendChild(button1)
    modal.appendChild(button2)
    modal.appendChild(button3)
    document.body.appendChild(modal)
    
    act(() => {
      result.current.createFocusTrap(modal)
    })
    
    expect(result.current.focusTrap).toBeDefined()
    
    act(() => {
      result.current.destroyFocusTrap()
    })
    
    expect(result.current.focusTrap).toBeNull()
    
    document.body.removeChild(modal)
  })

  test('cleans up ARIA live regions on unmount', () => {
    const { unmount } = renderHook(() => useCalendarAccessibility())
    
    const liveRegion = document.createElement('div')
    liveRegion.setAttribute('aria-live', 'polite')
    document.body.appendChild(liveRegion)
    
    unmount()
    
    // Should clean up live regions
    expect(document.querySelector('[aria-live]')).not.toBeInTheDocument()
  })
})

describe('useResponsive Hook', () => {
  beforeEach(() => {
    // Reset window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true })
  })

  test('detects mobile viewport', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375 })
    
    const { result } = renderHook(() => useResponsive())
    
    expect(result.current.isMobile).toBe(true)
    expect(result.current.isTablet).toBe(false)
    expect(result.current.isDesktop).toBe(false)
    expect(result.current.deviceType).toBe('mobile')
  })

  test('detects tablet viewport', () => {
    Object.defineProperty(window, 'innerWidth', { value: 768 })
    
    const { result } = renderHook(() => useResponsive())
    
    expect(result.current.isMobile).toBe(false)
    expect(result.current.isTablet).toBe(true)
    expect(result.current.isDesktop).toBe(false)
    expect(result.current.deviceType).toBe('tablet')
  })

  test('detects desktop viewport', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1200 })
    
    const { result } = renderHook(() => useResponsive())
    
    expect(result.current.isMobile).toBe(false)
    expect(result.current.isTablet).toBe(false)
    expect(result.current.isDesktop).toBe(true)
    expect(result.current.deviceType).toBe('desktop')
  })

  test('responds to window resize', () => {
    const { result } = renderHook(() => useResponsive())
    
    // Start with desktop
    expect(result.current.isDesktop).toBe(true)
    
    // Simulate resize to mobile
    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      window.dispatchEvent(new Event('resize'))
    })
    
    expect(result.current.isMobile).toBe(true)
    expect(result.current.isDesktop).toBe(false)
  })

  test('provides custom breakpoints', () => {
    const customBreakpoints = {
      mobile: 480,
      tablet: 960,
      desktop: 1200
    }
    
    Object.defineProperty(window, 'innerWidth', { value: 500 })
    
    const { result } = renderHook(() => useResponsive(customBreakpoints))
    
    expect(result.current.isMobile).toBe(false)
    expect(result.current.isTablet).toBe(true)
  })

  test('detects orientation changes', () => {
    const { result } = renderHook(() => useResponsive())
    
    expect(result.current.orientation).toBe('landscape') // 1024x768
    
    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 768 })
      Object.defineProperty(window, 'innerHeight', { value: 1024 })
      window.dispatchEvent(new Event('resize'))
    })
    
    expect(result.current.orientation).toBe('portrait')
  })

  test('provides viewport dimensions', () => {
    const { result } = renderHook(() => useResponsive())
    
    expect(result.current.viewport).toEqual({
      width: 1024,
      height: 768
    })
  })

  test('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
    
    const { unmount } = renderHook(() => useResponsive())
    
    unmount()
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    
    removeEventListenerSpy.mockRestore()
  })
})

describe('useDebounce Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('debounces value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )
    
    expect(result.current).toBe('initial')
    
    rerender({ value: 'updated', delay: 500 })
    
    // Should not update immediately
    expect(result.current).toBe('initial')
    
    act(() => {
      jest.advanceTimersByTime(500)
    })
    
    // Should update after delay
    expect(result.current).toBe('updated')
  })

  test('cancels previous timeout on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'first', delay: 500 } }
    )
    
    rerender({ value: 'second', delay: 500 })
    
    act(() => {
      jest.advanceTimersByTime(250)
    })
    
    rerender({ value: 'third', delay: 500 })
    
    act(() => {
      jest.advanceTimersByTime(500)
    })
    
    // Should only reflect the last change
    expect(result.current).toBe('third')
  })

  test('handles zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 0 } }
    )
    
    rerender({ value: 'immediate', delay: 0 })
    
    act(() => {
      jest.advanceTimersByTime(0)
    })
    
    expect(result.current).toBe('immediate')
  })

  test('handles object values', () => {
    const initialValue = { count: 0 }
    const updatedValue = { count: 1 }
    
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: initialValue, delay: 300 } }
    )
    
    expect(result.current).toBe(initialValue)
    
    rerender({ value: updatedValue, delay: 300 })
    
    act(() => {
      jest.advanceTimersByTime(300)
    })
    
    expect(result.current).toBe(updatedValue)
  })

  test('cleans up timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
    
    const { unmount } = renderHook(() => useDebounce('value', 500))
    
    unmount()
    
    expect(clearTimeoutSpy).toHaveBeenCalled()
    
    clearTimeoutSpy.mockRestore()
  })
})

describe('useLocalStorage Hook', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    mockLocalStorage.getItem.mockClear()
    mockLocalStorage.setItem.mockClear()
    mockLocalStorage.removeItem.mockClear()
  })

  test('initializes with default value', () => {
    const { result } = renderHook(() => 
      useLocalStorage('test-key', 'default-value')
    )
    
    expect(result.current[0]).toBe('default-value')
  })

  test('reads existing value from localStorage', () => {
    mockLocalStorage.setItem('existing-key', JSON.stringify('existing-value'))
    
    const { result } = renderHook(() => 
      useLocalStorage('existing-key', 'default-value')
    )
    
    expect(result.current[0]).toBe('existing-value')
  })

  test('stores value in localStorage', () => {
    const { result } = renderHook(() => 
      useLocalStorage('test-key', 'initial')
    )
    
    act(() => {
      result.current[1]('updated-value')
    })
    
    expect(result.current[0]).toBe('updated-value')
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'test-key', 
      JSON.stringify('updated-value')
    )
  })

  test('handles function updates', () => {
    const { result } = renderHook(() => 
      useLocalStorage('counter', 0)
    )
    
    act(() => {
      result.current[1](prev => prev + 1)
    })
    
    expect(result.current[0]).toBe(1)
  })

  test('handles complex objects', () => {
    const complexObject = {
      name: 'test',
      nested: { value: 42 },
      array: [1, 2, 3]
    }
    
    const { result } = renderHook(() => 
      useLocalStorage('complex', {})
    )
    
    act(() => {
      result.current[1](complexObject)
    })
    
    expect(result.current[0]).toEqual(complexObject)
  })

  test('handles JSON parse errors gracefully', () => {
    mockLocalStorage.getItem.mockReturnValue('invalid-json')
    
    const { result } = renderHook(() => 
      useLocalStorage('invalid-key', 'fallback')
    )
    
    expect(result.current[0]).toBe('fallback')
  })

  test('handles localStorage errors', () => {
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('Storage full')
    })
    
    const { result } = renderHook(() => 
      useLocalStorage('error-key', 'initial')
    )
    
    act(() => {
      result.current[1]('new-value')
    })
    
    // Should handle error gracefully
    expect(result.current[0]).toBe('new-value')
  })

  test('removes value when set to undefined', () => {
    const { result } = renderHook(() => 
      useLocalStorage('remove-key', 'initial')
    )
    
    act(() => {
      result.current[1](undefined)
    })
    
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('remove-key')
  })
})

describe('useHoverIntent Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('detects hover intent with delay', () => {
    const onHoverStart = jest.fn()
    const onHoverEnd = jest.fn()
    
    const { result } = renderHook(() => 
      useHoverIntent({ onHoverStart, onHoverEnd, delay: 300 })
    )
    
    act(() => {
      result.current.onMouseEnter()
    })
    
    expect(onHoverStart).not.toHaveBeenCalled()
    
    act(() => {
      jest.advanceTimersByTime(300)
    })
    
    expect(onHoverStart).toHaveBeenCalled()
  })

  test('cancels hover intent on quick mouse leave', () => {
    const onHoverStart = jest.fn()
    const onHoverEnd = jest.fn()
    
    const { result } = renderHook(() => 
      useHoverIntent({ onHoverStart, onHoverEnd, delay: 300 })
    )
    
    act(() => {
      result.current.onMouseEnter()
    })
    
    act(() => {
      jest.advanceTimersByTime(150)
    })
    
    act(() => {
      result.current.onMouseLeave()
    })
    
    act(() => {
      jest.advanceTimersByTime(300)
    })
    
    expect(onHoverStart).not.toHaveBeenCalled()
  })

  test('handles hover end after intent triggered', () => {
    const onHoverStart = jest.fn()
    const onHoverEnd = jest.fn()
    
    const { result } = renderHook(() => 
      useHoverIntent({ onHoverStart, onHoverEnd, delay: 200 })
    )
    
    act(() => {
      result.current.onMouseEnter()
    })
    
    act(() => {
      jest.advanceTimersByTime(200)
    })
    
    expect(onHoverStart).toHaveBeenCalled()
    
    act(() => {
      result.current.onMouseLeave()
    })
    
    expect(onHoverEnd).toHaveBeenCalled()
  })

  test('provides hover state', () => {
    const { result } = renderHook(() => 
      useHoverIntent({ delay: 200 })
    )
    
    expect(result.current.isHovering).toBe(false)
    
    act(() => {
      result.current.onMouseEnter()
    })
    
    act(() => {
      jest.advanceTimersByTime(200)
    })
    
    expect(result.current.isHovering).toBe(true)
    
    act(() => {
      result.current.onMouseLeave()
    })
    
    expect(result.current.isHovering).toBe(false)
  })

  test('handles rapid hover events', () => {
    const onHoverStart = jest.fn()
    
    const { result } = renderHook(() => 
      useHoverIntent({ onHoverStart, delay: 200 })
    )
    
    // Rapid enter/leave cycles
    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.onMouseEnter()
        jest.advanceTimersByTime(50)
        result.current.onMouseLeave()
        jest.advanceTimersByTime(50)
      })
    }
    
    expect(onHoverStart).not.toHaveBeenCalled()
  })

  test('cleans up timers on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
    
    const { result, unmount } = renderHook(() => 
      useHoverIntent({ delay: 300 })
    )
    
    act(() => {
      result.current.onMouseEnter()
    })
    
    unmount()
    
    expect(clearTimeoutSpy).toHaveBeenCalled()
    
    clearTimeoutSpy.mockRestore()
  })
})

describe('useControlledTooltip Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('manages tooltip visibility state', () => {
    const { result } = renderHook(() => useControlledTooltip())
    
    expect(result.current.isVisible).toBe(false)
    
    act(() => {
      result.current.show()
    })
    
    expect(result.current.isVisible).toBe(true)
    
    act(() => {
      result.current.hide()
    })
    
    expect(result.current.isVisible).toBe(false)
  })

  test('auto-hides tooltip after delay', () => {
    const { result } = renderHook(() => 
      useControlledTooltip({ autoHideDelay: 3000 })
    )
    
    act(() => {
      result.current.show()
    })
    
    expect(result.current.isVisible).toBe(true)
    
    act(() => {
      jest.advanceTimersByTime(3000)
    })
    
    expect(result.current.isVisible).toBe(false)
  })

  test('cancels auto-hide on manual hide', () => {
    const { result } = renderHook(() => 
      useControlledTooltip({ autoHideDelay: 3000 })
    )
    
    act(() => {
      result.current.show()
    })
    
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    
    act(() => {
      result.current.hide()
    })
    
    expect(result.current.isVisible).toBe(false)
    
    // Should not show again after remaining delay
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    
    expect(result.current.isVisible).toBe(false)
  })

  test('toggles tooltip visibility', () => {
    const { result } = renderHook(() => useControlledTooltip())
    
    act(() => {
      result.current.toggle()
    })
    
    expect(result.current.isVisible).toBe(true)
    
    act(() => {
      result.current.toggle()
    })
    
    expect(result.current.isVisible).toBe(false)
  })

  test('manages tooltip position', () => {
    const { result } = renderHook(() => useControlledTooltip())
    
    const position = { x: 100, y: 200 }
    
    act(() => {
      result.current.setPosition(position)
    })
    
    expect(result.current.position).toEqual(position)
  })

  test('updates tooltip content', () => {
    const { result } = renderHook(() => useControlledTooltip())
    
    act(() => {
      result.current.setContent('New tooltip content')
    })
    
    expect(result.current.content).toBe('New tooltip content')
  })

  test('provides hover handlers for easy integration', () => {
    const { result } = renderHook(() => useControlledTooltip())
    
    expect(result.current.hoverHandlers).toHaveProperty('onMouseEnter')
    expect(result.current.hoverHandlers).toHaveProperty('onMouseLeave')
    
    act(() => {
      result.current.hoverHandlers.onMouseEnter()
    })
    
    expect(result.current.isVisible).toBe(true)
    
    act(() => {
      result.current.hoverHandlers.onMouseLeave()
    })
    
    expect(result.current.isVisible).toBe(false)
  })

  test('handles disabled state', () => {
    const { result } = renderHook(() => 
      useControlledTooltip({ disabled: true })
    )
    
    act(() => {
      result.current.show()
    })
    
    expect(result.current.isVisible).toBe(false)
    
    act(() => {
      result.current.hoverHandlers.onMouseEnter()
    })
    
    expect(result.current.isVisible).toBe(false)
  })

  test('cleans up timers on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
    
    const { result, unmount } = renderHook(() => 
      useControlledTooltip({ autoHideDelay: 3000 })
    )
    
    act(() => {
      result.current.show()
    })
    
    unmount()
    
    expect(clearTimeoutSpy).toHaveBeenCalled()
    
    clearTimeoutSpy.mockRestore()
  })
})

describe('Hook Error Handling and Edge Cases', () => {
  test('handles invalid localStorage values', () => {
    mockLocalStorage.getItem.mockReturnValue('invalid-json{')
    
    const { result } = renderHook(() => 
      useLocalStorage('invalid', 'default')
    )
    
    expect(result.current[0]).toBe('default')
  })

  test('handles missing performance API', () => {
    const originalPerformance = window.performance
    delete (window as any).performance
    
    const { result } = renderHook(() => useCalendarPerformance())
    
    expect(result.current.metrics).toBeDefined()
    
    window.performance = originalPerformance
  })

  test('handles missing matchMedia API', () => {
    const originalMatchMedia = window.matchMedia
    delete (window as any).matchMedia
    
    const { result } = renderHook(() => useResponsive())
    
    expect(result.current.deviceType).toBeDefined()
    
    window.matchMedia = originalMatchMedia
  })

  test('handles resize event listener errors', () => {
    const originalAddEventListener = window.addEventListener
    window.addEventListener = jest.fn().mockImplementation(() => {
      throw new Error('Event listener error')
    })
    
    const { result } = renderHook(() => useResponsive())
    
    expect(result.current).toBeDefined()
    
    window.addEventListener = originalAddEventListener
  })

  test('handles concurrent state updates', () => {
    const { result } = renderHook(() => useLocalStorage('concurrent', 0))
    
    // Simulate rapid concurrent updates
    act(() => {
      for (let i = 0; i < 100; i++) {
        result.current[1](prev => prev + 1)
      }
    })
    
    expect(result.current[0]).toBe(100)
  })

  test('handles memory pressure in performance monitoring', () => {
    mockPerformance.memory = {
      usedJSHeapSize: 1.5 * 1024 * 1024 * 1024, // 1.5GB
      totalJSHeapSize: 2 * 1024 * 1024 * 1024,   // 2GB
      jsHeapSizeLimit: 2 * 1024 * 1024 * 1024    // 2GB
    }
    
    const { result } = renderHook(() => useCalendarPerformance())
    
    act(() => {
      result.current.startTracking()
    })
    
    const warnings = result.current.getPerformanceWarnings()
    expect(warnings).toContain('Critical memory usage detected')
  })
})