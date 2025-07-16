/**
 * Calendar Error Handling and Graceful Degradation Tests
 * 
 * Comprehensive testing of error scenarios, fallback mechanisms, and system resilience
 * for Phase 2 calendar components under various failure conditions.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Component imports
import UnifiedCalendar from '@/components/UnifiedCalendar'
import { VirtualizedCalendarGrid } from '@/components/calendar/VirtualizedCalendarGrid'
import { CalendarAnimationEngine } from '@/components/calendar/CalendarAnimationEngine'
import { CalendarCacheManager } from '@/components/calendar/CalendarCacheManager'
import { TouchDragManager } from '@/components/calendar/TouchDragManager'
import { ConflictResolutionEngine } from '@/components/calendar/ConflictResolutionEngine'
import { BulkOperationsManager } from '@/components/calendar/BulkOperationsManager'

// Error Boundary component for testing
class TestErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="error-fallback">
          <h2>Something went wrong</h2>
          <p>Error: {this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// Mock network failures
const createFailingFetch = (failureType: 'network' | 'timeout' | 'server' | 'cors' | 'json') => {
  return jest.fn().mockImplementation(() => {
    switch (failureType) {
      case 'network':
        return Promise.reject(new Error('Network request failed'))
      case 'timeout':
        return new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      case 'server':
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.reject(new Error('Failed to parse JSON'))
        })
      case 'cors':
        return Promise.reject(new Error('CORS policy blocked request'))
      case 'json':
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.reject(new Error('Unexpected token in JSON'))
        })
      default:
        return Promise.reject(new Error('Unknown error'))
    }
  })
}

// Test data
const mockAppointments = [
  {
    id: 1,
    start_time: '2023-12-01T10:00:00Z',
    end_time: '2023-12-01T11:00:00Z',
    client_name: 'John Doe',
    service_name: 'Haircut',
    barber_name: 'Jane Smith',
    status: 'confirmed' as const,
    duration_minutes: 60
  },
  {
    id: 2,
    start_time: '2023-12-01T14:00:00Z',
    end_time: '2023-12-01T15:00:00Z',
    client_name: 'Bob Wilson',
    service_name: 'Styling',
    barber_name: 'Alice Brown',
    status: 'scheduled' as const,
    duration_minutes: 60
  }
]

const corruptedAppointment = {
  id: 'invalid-id',
  start_time: 'not-a-date',
  end_time: null,
  client_name: null,
  service_name: undefined,
  barber_name: '',
  status: 'invalid-status' as any,
  duration_minutes: 'not-a-number' as any
}

describe('Calendar Error Handling Tests', () => {
  beforeEach(() => {
    // Reset console methods
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('API Failure Handling', () => {
    test('handles network failures gracefully', async () => {
      global.fetch = createFailingFetch('network')
      const onError = jest.fn()

      render(
        <TestErrorBoundary onError={onError}>
          <CalendarCacheManager
            apiEndpoint="http://localhost:8000/api/appointments"
            onError={onError}
          >
            <UnifiedCalendar
              appointments={[]}
              currentDate={new Date('2023-12-01')}
              view="month"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
            />
          </CalendarCacheManager>
        </TestErrorBoundary>
      )

      // Trigger API call that will fail
      const calendar = screen.getByRole('application')
      fireEvent.click(calendar)

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.objectContaining({
          message: expect.stringContaining('Network request failed')
        }))
      })

      // Calendar should still be functional with offline data
      expect(screen.getByRole('application')).toBeInTheDocument()
      expect(screen.getByText(/offline mode/i)).toBeInTheDocument()
    })

    test('handles timeout errors with retry mechanism', async () => {
      global.fetch = createFailingFetch('timeout')
      const onError = jest.fn()

      render(
        <CalendarCacheManager
          apiEndpoint="http://localhost:8000/api/appointments"
          onError={onError}
          cacheConfig={{ retryAttempts: 3, retryDelay: 100 }}
        >
          <UnifiedCalendar
            appointments={[]}
            currentDate={new Date('2023-12-01')}
            view="month"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </CalendarCacheManager>
      )

      // Should attempt retry after timeout
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3) // Initial + 2 retries
      }, { timeout: 1000 })
    })

    test('handles server errors with status codes', async () => {
      global.fetch = createFailingFetch('server')
      const onError = jest.fn()

      render(
        <CalendarCacheManager
          apiEndpoint="http://localhost:8000/api/appointments"
          onError={onError}
        >
          <UnifiedCalendar
            appointments={mockAppointments}
            currentDate={new Date('2023-12-01')}
            view="month"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </CalendarCacheManager>
      )

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('500')
          }),
          expect.any(Object)
        )
      })

      // Should display cached data while showing error notification
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText(/server error/i)).toBeInTheDocument()
    })

    test('handles CORS errors in development', async () => {
      global.fetch = createFailingFetch('cors')
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      render(
        <CalendarCacheManager
          apiEndpoint="http://localhost:8000/api/appointments"
          onError={jest.fn()}
        >
          <UnifiedCalendar
            appointments={[]}
            currentDate={new Date('2023-12-01')}
            view="month"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </CalendarCacheManager>
      )

      await waitFor(() => {
        expect(screen.getByText(/cors configuration/i)).toBeInTheDocument()
      })

      process.env.NODE_ENV = originalEnv
    })

    test('handles malformed JSON responses', async () => {
      global.fetch = createFailingFetch('json')
      const onError = jest.fn()

      render(
        <CalendarCacheManager
          apiEndpoint="http://localhost:8000/api/appointments"
          onError={onError}
        >
          <UnifiedCalendar
            appointments={[]}
            currentDate={new Date('2023-12-01')}
            view="month"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </CalendarCacheManager>
      )

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('JSON')
          }),
          expect.any(Object)
        )
      })
    })
  })

  describe('Data Corruption Handling', () => {
    test('sanitizes corrupted appointment data', () => {
      const appointments = [mockAppointments[0], corruptedAppointment, mockAppointments[1]]

      render(
        <VirtualizedCalendarGrid
          appointments={appointments}
          startDate={new Date('2023-12-01')}
          endDate={new Date('2023-12-31')}
          view="month"
          onAppointmentClick={jest.fn()}
          sanitizeData={true}
        />
      )

      // Should render valid appointments
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument()

      // Should not crash on corrupted data
      expect(screen.getByRole('application')).toBeInTheDocument()
    })

    test('handles missing required appointment fields', () => {
      const incompleteAppointment = {
        id: 3,
        start_time: '2023-12-01T16:00:00Z'
        // Missing end_time, client_name, etc.
      }

      render(
        <TestErrorBoundary>
          <VirtualizedCalendarGrid
            appointments={[incompleteAppointment] as any}
            startDate={new Date('2023-12-01')}
            endDate={new Date('2023-12-31')}
            view="month"
            onAppointmentClick={jest.fn()}
          />
        </TestErrorBoundary>
      )

      // Should not crash, should show placeholder or skip invalid entry
      expect(screen.getByRole('application')).toBeInTheDocument()
      expect(screen.queryByTestId('error-fallback')).not.toBeInTheDocument()
    })

    test('handles invalid date formats gracefully', () => {
      const invalidDateAppointment = {
        ...mockAppointments[0],
        start_time: 'invalid-date-format',
        end_time: '2023-13-45T25:70:00Z' // Invalid date
      }

      render(
        <VirtualizedCalendarGrid
          appointments={[invalidDateAppointment]}
          startDate={new Date('2023-12-01')}
          endDate={new Date('2023-12-31')}
          view="month"
          onAppointmentClick={jest.fn()}
        />
      )

      // Should handle gracefully, possibly with fallback display
      expect(screen.getByRole('application')).toBeInTheDocument()
      expect(screen.getByText(/invalid date/i)).toBeInTheDocument()
    })

    test('handles extremely large datasets without crashing', () => {
      const massiveDataset = Array.from({ length: 50000 }, (_, i) => ({
        id: i + 1,
        start_time: `2023-12-01T${String(9 + (i % 8)).padStart(2, '0')}:00:00Z`,
        end_time: `2023-12-01T${String(10 + (i % 8)).padStart(2, '0')}:00:00Z`,
        client_name: `Client ${i + 1}`,
        service_name: 'Service',
        barber_name: 'Barber',
        status: 'confirmed' as const,
        duration_minutes: 60
      }))

      const startTime = performance.now()

      render(
        <VirtualizedCalendarGrid
          appointments={massiveDataset}
          startDate={new Date('2023-12-01')}
          endDate={new Date('2023-12-31')}
          view="month"
          onAppointmentClick={jest.fn()}
          enableVirtualization={true}
        />
      )

      const renderTime = performance.now() - startTime

      // Should render without excessive delay
      expect(renderTime).toBeLessThan(1000) // Less than 1 second
      expect(screen.getByRole('application')).toBeInTheDocument()
    })
  })

  describe('Memory and Performance Degradation', () => {
    test('handles memory pressure gracefully', () => {
      // Simulate memory pressure
      const originalMemory = performance.memory
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 1.8 * 1024 * 1024 * 1024, // 1.8GB
          totalJSHeapSize: 2 * 1024 * 1024 * 1024,   // 2GB
          jsHeapSizeLimit: 2 * 1024 * 1024 * 1024    // 2GB
        }
      })

      render(
        <CalendarAnimationEngine performanceMode="low">
          <VirtualizedCalendarGrid
            appointments={mockAppointments}
            startDate={new Date('2023-12-01')}
            endDate={new Date('2023-12-31')}
            view="month"
            onAppointmentClick={jest.fn()}
          />
        </CalendarAnimationEngine>
      )

      // Should automatically switch to low performance mode
      expect(screen.getByText(/performance mode: low/i)).toBeInTheDocument()

      // Restore original memory
      if (originalMemory) {
        Object.defineProperty(performance, 'memory', { value: originalMemory })
      }
    })

    test('degrades animations gracefully on slow devices', () => {
      // Mock slow device (low frame rate)
      let frameCount = 0
      const slowFrameRate = jest.fn(() => {
        frameCount++
        return frameCount < 5 ? 30 : 60 // Simulate initially slow then improving
      })

      render(
        <CalendarAnimationEngine
          performanceMode="balanced"
          onPerformanceChange={slowFrameRate}
        >
          <VirtualizedCalendarGrid
            appointments={mockAppointments}
            startDate={new Date('2023-12-01')}
            endDate={new Date('2023-12-31')}
            view="month"
            onAppointmentClick={jest.fn()}
            enableAnimations={true}
          />
        </CalendarAnimationEngine>
      )

      // Should reduce animation complexity automatically
      expect(screen.getByRole('application')).toBeInTheDocument()
    })

    test('handles cache overflow gracefully', async () => {
      const smallCacheConfig = {
        maxSize: 0.001, // Very small cache
        maxEntries: 2
      }

      render(
        <CalendarCacheManager
          apiEndpoint="http://localhost:8000/api/appointments"
          cacheConfig={smallCacheConfig}
        >
          <UnifiedCalendar
            appointments={mockAppointments}
            currentDate={new Date('2023-12-01')}
            view="month"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </CalendarCacheManager>
      )

      // Trigger cache overflow by switching views rapidly
      const viewButtons = ['Week', 'Day', 'Month']
      
      for (const view of viewButtons) {
        const button = screen.getByText(view)
        fireEvent.click(button)
        await waitFor(() => {
          expect(screen.getByText(view)).toHaveClass('active')
        })
      }

      // Should handle cache eviction without errors
      expect(screen.getByRole('application')).toBeInTheDocument()
    })
  })

  describe('Touch and Gesture Error Handling', () => {
    test('handles touch events on non-touch devices', () => {
      // Mock device without touch support
      const originalTouchStart = HTMLElement.prototype.addEventListener
      HTMLElement.prototype.addEventListener = jest.fn((event, handler) => {
        if (event === 'touchstart') {
          throw new Error('Touch events not supported')
        }
        return originalTouchStart.call(this, event, handler)
      })

      render(
        <TouchDragManager
          onDragStart={jest.fn()}
          onDragMove={jest.fn()}
          onDragEnd={jest.fn()}
        >
          <div data-testid="touch-element">Touch content</div>
        </TouchDragManager>
      )

      // Should fall back to mouse events
      expect(screen.getByTestId('touch-element')).toBeInTheDocument()

      HTMLElement.prototype.addEventListener = originalTouchStart
    })

    test('handles malformed touch events', () => {
      const onError = jest.fn()

      render(
        <TestErrorBoundary onError={onError}>
          <TouchDragManager
            onDragStart={jest.fn()}
            onDragMove={jest.fn()}
            onDragEnd={jest.fn()}
          >
            <div data-testid="touch-element">Touch content</div>
          </TouchDragManager>
        </TestErrorBoundary>
      )

      const element = screen.getByTestId('touch-element')

      // Simulate malformed touch event
      const malformedEvent = {
        touches: null,
        preventDefault: jest.fn()
      }

      fireEvent(element, new TouchEvent('touchstart', malformedEvent as any))

      // Should not crash
      expect(screen.queryByTestId('error-fallback')).not.toBeInTheDocument()
    })

    test('handles rapid gesture sequences', async () => {
      const onDragStart = jest.fn()
      const onDragMove = jest.fn()
      const onDragEnd = jest.fn()

      render(
        <TouchDragManager
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragEnd={onDragEnd}
          debounceMs={50}
        >
          <div data-testid="touch-element">Touch content</div>
        </TouchDragManager>
      )

      const element = screen.getByTestId('touch-element')

      // Simulate rapid touch sequence
      for (let i = 0; i < 20; i++) {
        fireEvent.touchStart(element, {
          touches: [{ clientX: i * 10, clientY: i * 10 }]
        })
        fireEvent.touchMove(element, {
          touches: [{ clientX: i * 10 + 5, clientY: i * 10 + 5 }]
        })
        fireEvent.touchEnd(element)
      }

      // Should debounce and handle gracefully
      await waitFor(() => {
        expect(onDragStart).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Component Recovery and Resilience', () => {
    test('recovers from component crashes with error boundaries', () => {
      const CrashingComponent = () => {
        throw new Error('Component intentionally crashed')
      }

      const onError = jest.fn()

      render(
        <TestErrorBoundary onError={onError}>
          <UnifiedCalendar
            appointments={mockAppointments}
            currentDate={new Date('2023-12-01')}
            view="month"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          >
            <CrashingComponent />
          </UnifiedCalendar>
        </TestErrorBoundary>
      )

      expect(screen.getByTestId('error-fallback')).toBeInTheDocument()
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Component intentionally crashed'
        })
      )

      // Test recovery
      const retryButton = screen.getByText('Try Again')
      fireEvent.click(retryButton)

      // Should attempt to recover
      expect(screen.queryByTestId('error-fallback')).not.toBeInTheDocument()
    })

    test('handles missing dependencies gracefully', () => {
      // Mock missing animation library
      jest.doMock('framer-motion', () => {
        throw new Error('Module not found')
      })

      render(
        <CalendarAnimationEngine enableAnimations={false}>
          <UnifiedCalendar
            appointments={mockAppointments}
            currentDate={new Date('2023-12-01')}
            view="month"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </CalendarAnimationEngine>
      )

      // Should fall back to non-animated version
      expect(screen.getByRole('application')).toBeInTheDocument()
      expect(screen.getByText(/animations disabled/i)).toBeInTheDocument()
    })

    test('handles browser compatibility issues', () => {
      // Mock missing modern APIs
      const originalRequestIdleCallback = window.requestIdleCallback
      const originalIntersectionObserver = window.IntersectionObserver

      delete (window as any).requestIdleCallback
      delete (window as any).IntersectionObserver

      render(
        <VirtualizedCalendarGrid
          appointments={mockAppointments}
          startDate={new Date('2023-12-01')}
          endDate={new Date('2023-12-31')}
          view="month"
          onAppointmentClick={jest.fn()}
          enableVirtualization={true}
        />
      )

      // Should use fallbacks for missing APIs
      expect(screen.getByRole('application')).toBeInTheDocument()
      expect(screen.getByText(/compatibility mode/i)).toBeInTheDocument()

      // Restore APIs
      if (originalRequestIdleCallback) {
        window.requestIdleCallback = originalRequestIdleCallback
      }
      if (originalIntersectionObserver) {
        window.IntersectionObserver = originalIntersectionObserver
      }
    })
  })

  describe('Conflict Resolution Error Handling', () => {
    test('handles missing barber data in conflict resolution', () => {
      const conflictingAppointments = [
        {
          ...mockAppointments[0],
          barber_id: 999 // Non-existent barber
        },
        {
          ...mockAppointments[1],
          start_time: '2023-12-01T10:30:00Z',
          barber_id: 999
        }
      ]

      render(
        <ConflictResolutionEngine
          appointments={conflictingAppointments}
          barbers={[]} // Empty barber list
          onConflictResolved={jest.fn()}
        />
      )

      // Should handle missing barber data gracefully
      expect(screen.getByText(/conflicts detected/i)).toBeInTheDocument()
      expect(screen.getByText(/unknown barber/i)).toBeInTheDocument()
    })

    test('handles invalid conflict resolution data', () => {
      const invalidConflicts = [
        {
          id: null,
          start_time: undefined,
          end_time: 'invalid',
          barber_id: 'not-a-number'
        }
      ]

      render(
        <TestErrorBoundary>
          <ConflictResolutionEngine
            appointments={invalidConflicts as any}
            barbers={[]}
            onConflictResolved={jest.fn()}
          />
        </TestErrorBoundary>
      )

      // Should not crash
      expect(screen.queryByTestId('error-fallback')).not.toBeInTheDocument()
      expect(screen.getByText(/no valid conflicts/i)).toBeInTheDocument()
    })
  })

  describe('Bulk Operations Error Handling', () => {
    test('handles bulk operation failures gracefully', async () => {
      const failingBulkOperation = jest.fn().mockRejectedValue(
        new Error('Bulk operation failed')
      )

      const user = userEvent.setup()

      render(
        <BulkOperationsManager
          appointments={mockAppointments}
          onBulkOperation={failingBulkOperation}
          userRole="SHOP_OWNER"
          enableBulkActions={true}
        >
          <div>
            {mockAppointments.map(appointment => (
              <div key={appointment.id} data-testid={`appointment-${appointment.id}`}>
                {appointment.client_name}
              </div>
            ))}
          </div>
        </BulkOperationsManager>
      )

      // Select appointments
      const firstAppointment = screen.getByTestId('appointment-1')
      await user.click(firstAppointment, { ctrlKey: true })

      const bulkButton = screen.getByText(/bulk actions/i)
      await user.click(bulkButton)

      const cancelButton = screen.getByText(/cancel selected/i)
      await user.click(cancelButton)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/bulk operation failed/i)).toBeInTheDocument()
      })

      // Should allow retry
      expect(screen.getByText(/retry/i)).toBeInTheDocument()
    })

    test('handles partial bulk operation failures', async () => {
      const partiallyFailingOperation = jest.fn()
        .mockResolvedValueOnce({ success: true, failed: [] })
        .mockRejectedValueOnce(new Error('Second operation failed'))

      render(
        <BulkOperationsManager
          appointments={mockAppointments}
          onBulkOperation={partiallyFailingOperation}
          userRole="SHOP_OWNER"
          enableBulkActions={true}
        >
          <div>
            {mockAppointments.map(appointment => (
              <div key={appointment.id} data-testid={`appointment-${appointment.id}`}>
                {appointment.client_name}
              </div>
            ))}
          </div>
        </BulkOperationsManager>
      )

      // Should handle partial failures with appropriate messaging
      expect(screen.getByRole('application')).toBeInTheDocument()
    })
  })

  describe('Offline and Connectivity Handling', () => {
    test('detects offline state and switches to offline mode', () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      render(
        <CalendarCacheManager
          apiEndpoint="http://localhost:8000/api/appointments"
          enableOfflineMode={true}
        >
          <UnifiedCalendar
            appointments={mockAppointments}
            currentDate={new Date('2023-12-01')}
            view="month"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </CalendarCacheManager>
      )

      expect(screen.getByText(/offline mode/i)).toBeInTheDocument()
      expect(screen.getByText(/cached data/i)).toBeInTheDocument()

      // Restore online state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })
    })

    test('handles connectivity restoration', () => {
      render(
        <CalendarCacheManager
          apiEndpoint="http://localhost:8000/api/appointments"
          enableOfflineMode={true}
        >
          <UnifiedCalendar
            appointments={mockAppointments}
            currentDate={new Date('2023-12-01')}
            view="month"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </CalendarCacheManager>
      )

      // Simulate going offline then online
      Object.defineProperty(navigator, 'onLine', { value: false })
      window.dispatchEvent(new Event('offline'))

      expect(screen.getByText(/offline mode/i)).toBeInTheDocument()

      Object.defineProperty(navigator, 'onLine', { value: true })
      window.dispatchEvent(new Event('online'))

      expect(screen.getByText(/reconnected/i)).toBeInTheDocument()
    })
  })

  describe('Data Synchronization Errors', () => {
    test('handles concurrent modification conflicts', async () => {
      const conflictingUpdates = jest.fn()
        .mockRejectedValue(new Error('Appointment was modified by another user'))

      render(
        <UnifiedCalendar
          appointments={mockAppointments}
          currentDate={new Date('2023-12-01')}
          view="month"
          onDateChange={jest.fn()}
          onViewChange={jest.fn()}
          onAppointmentUpdate={conflictingUpdates}
        />
      )

      const appointment = screen.getByText('John Doe')
      fireEvent.click(appointment)

      await waitFor(() => {
        expect(screen.getByText(/conflict detected/i)).toBeInTheDocument()
        expect(screen.getByText(/reload data/i)).toBeInTheDocument()
      })
    })

    test('handles stale data scenarios', () => {
      const staleTimestamp = Date.now() - 30 * 60 * 1000 // 30 minutes ago
      
      const staleAppointments = mockAppointments.map(apt => ({
        ...apt,
        last_modified: staleTimestamp
      }))

      render(
        <UnifiedCalendar
          appointments={staleAppointments}
          currentDate={new Date('2023-12-01')}
          view="month"
          onDateChange={jest.fn()}
          onViewChange={jest.fn()}
          checkDataFreshness={true}
        />
      )

      expect(screen.getByText(/data may be outdated/i)).toBeInTheDocument()
      expect(screen.getByText(/refresh/i)).toBeInTheDocument()
    })
  })
})

describe('Graceful Degradation Scenarios', () => {
  test('functions without JavaScript enhancements', () => {
    // Mock disabled JavaScript environment
    const originalCreateElement = document.createElement
    document.createElement = jest.fn((tagName) => {
      const element = originalCreateElement.call(document, tagName)
      if (tagName === 'script') {
        throw new Error('Scripts disabled')
      }
      return element
    })

    render(
      <UnifiedCalendar
        appointments={mockAppointments}
        currentDate={new Date('2023-12-01')}
        view="month"
        onDateChange={jest.fn()}
        onViewChange={jest.fn()}
        enableFallbackMode={true}
      />
    )

    // Should render basic HTML structure
    expect(screen.getByRole('application')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()

    document.createElement = originalCreateElement
  })

  test('works with reduced animation capabilities', () => {
    const mockMediaQuery = {
      matches: true,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }

    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn(() => mockMediaQuery)
    })

    render(
      <CalendarAnimationEngine
        config={{ respectReducedMotion: true }}
        enableMicroInteractions={false}
      >
        <UnifiedCalendar
          appointments={mockAppointments}
          currentDate={new Date('2023-12-01')}
          view="month"
          onDateChange={jest.fn()}
          onViewChange={jest.fn()}
        />
      </CalendarAnimationEngine>
    )

    // Should render without animations
    expect(screen.getByRole('application')).toBeInTheDocument()
    expect(screen.queryByText(/animation/i)).not.toBeInTheDocument()
  })

  test('adapts to low bandwidth conditions', () => {
    // Mock slow connection
    Object.defineProperty(navigator, 'connection', {
      value: {
        effectiveType: '2g',
        downlink: 0.5,
        rtt: 300
      }
    })

    render(
      <CalendarCacheManager
        apiEndpoint="http://localhost:8000/api/appointments"
        adaptToBandwidth={true}
      >
        <UnifiedCalendar
          appointments={mockAppointments}
          currentDate={new Date('2023-12-01')}
          view="month"
          onDateChange={jest.fn()}
          onViewChange={jest.fn()}
        />
      </CalendarCacheManager>
    )

    // Should show low bandwidth optimizations
    expect(screen.getByText(/optimized for slow connection/i)).toBeInTheDocument()
  })

  test('maintains accessibility without advanced features', () => {
    // Mock missing modern accessibility APIs
    delete (window as any).ResizeObserver
    delete (window as any).MutationObserver

    render(
      <UnifiedCalendar
        appointments={mockAppointments}
        currentDate={new Date('2023-12-01')}
        view="month"
        onDateChange={jest.fn()}
        onViewChange={jest.fn()}
        enableFallbackAccessibility={true}
      />
    )

    // Should still be accessible
    const calendar = screen.getByRole('application')
    expect(calendar).toHaveAttribute('aria-label')
    expect(calendar).toHaveAttribute('tabIndex', '0')
  })
})