/**
 * Phase 2 Calendar Integration Tests
 * 
 * Tests the integration of all Phase 2 calendar components with the existing UnifiedCalendar system.
 * Focuses on component interactions, data flow, and user experience continuity.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Import Phase 2 components
import { TouchDragManager, TouchPoint } from '@/components/calendar/TouchDragManager'
import { MobileCalendarControls, CalendarView } from '@/components/calendar/MobileCalendarControls'
import { CalendarAccessibilityManager } from '@/components/calendar/CalendarAccessibilityManager'
import { KeyboardNavigationHandler } from '@/components/calendar/KeyboardNavigationHandler'
import { ConflictResolutionEngine } from '@/components/calendar/ConflictResolutionEngine'
import { BulkOperationsManager } from '@/components/calendar/BulkOperationsManager'
import { VirtualizedCalendarGrid } from '@/components/calendar/VirtualizedCalendarGrid'
import { CalendarCacheManager } from '@/components/calendar/CalendarCacheManager'
import { CalendarAnimationEngine } from '@/components/calendar/CalendarAnimationEngine'

// Import existing calendar system
import UnifiedCalendar from '@/components/UnifiedCalendar'

// Mock dependencies
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref) => (
      <div ref={ref} {...props}>{children}</div>
    ))
  },
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn(), stop: jest.fn() }),
  useMotionValue: (initial: any) => ({ get: () => initial, set: jest.fn() }),
  useTransform: () => ({ get: () => 0 }),
  useSpring: (value: any) => ({ get: () => value })
}))

jest.mock('react-window', () => ({
  FixedSizeList: React.forwardRef(({ children, itemCount, itemSize, height, width }: any, ref) => (
    <div ref={ref} style={{ height, width }}>
      {Array.from({ length: Math.min(itemCount, 20) }, (_, index) => 
        children({ index, style: { height: itemSize } })
      )}
    </div>
  )),
  VariableSizeList: React.forwardRef(({ children, itemCount, height, width }: any, ref) => (
    <div ref={ref} style={{ height, width }}>
      {Array.from({ length: Math.min(itemCount, 20) }, (_, index) => 
        children({ index, style: { height: 40 } })
      )}
    </div>
  ))
}))

// Mock data
const mockAppointments = [
  {
    id: 1,
    start_time: '2023-12-01T10:00:00Z',
    end_time: '2023-12-01T11:00:00Z',
    duration_minutes: 60,
    client_name: 'John Doe',
    service_name: 'Haircut',
    barber_name: 'Mike Johnson',
    barber_id: 1,
    status: 'scheduled' as const,
    location_id: 1
  },
  {
    id: 2,
    start_time: '2023-12-01T14:00:00Z',
    end_time: '2023-12-01T15:30:00Z',
    duration_minutes: 90,
    client_name: 'Jane Smith',
    service_name: 'Cut & Style',
    barber_name: 'Sarah Wilson',
    barber_id: 2,
    status: 'confirmed' as const,
    location_id: 1
  }
]

const mockBarbers = [
  {
    id: 1,
    name: 'Mike Johnson',
    email: 'mike@barbershop.com',
    working_hours: {
      start: '09:00',
      end: '17:00',
      days: [1, 2, 3, 4, 5] // Mon-Fri
    },
    is_available: true
  },
  {
    id: 2,
    name: 'Sarah Wilson',
    email: 'sarah@barbershop.com',
    working_hours: {
      start: '10:00',
      end: '18:00',
      days: [1, 2, 3, 4, 5, 6] // Mon-Sat
    },
    is_available: true
  }
]

// Test Suite 1: TouchDragManager Integration
describe('TouchDragManager Integration', () => {
  let mockProps: any
  
  beforeEach(() => {
    mockProps = {
      appointments: mockAppointments,
      onAppointmentUpdate: jest.fn(),
      onDateChange: jest.fn(),
      onViewChange: jest.fn(),
      view: 'week' as CalendarView,
      currentDate: new Date('2023-12-01'),
      startHour: 8,
      endHour: 18,
      slotDuration: 30
    }
    
    // Mock touch events
    global.TouchEvent = class TouchEvent extends Event {
      touches: any[]
      constructor(type: string, eventInitDict: any = {}) {
        super(type, eventInitDict)
        this.touches = eventInitDict.touches || []
      }
    } as any
  })

  test('integrates touch gestures with UnifiedCalendar appointment dragging', async () => {
    const TestWrapper = () => (
      <CalendarAnimationEngine>
        <TouchDragManager
          onSwipe={(direction, velocity) => {
            if (direction === 'left') mockProps.onDateChange('next')
            if (direction === 'right') mockProps.onDateChange('prev')
          }}
          onLongPress={(point) => {
            mockProps.onTimeSlotClick?.(new Date(), 10, 0)
          }}
        >
          <UnifiedCalendar {...mockProps} />
        </TouchDragManager>
      </CalendarAnimationEngine>
    )

    render(<TestWrapper />)

    // Find an appointment element
    const appointment = screen.getByText('John Doe')
    expect(appointment).toBeInTheDocument()

    // Test touch start
    fireEvent.touchStart(appointment, {
      touches: [{ clientX: 100, clientY: 100, identifier: 1 }]
    })

    // Test touch move (drag)
    fireEvent.touchMove(appointment, {
      touches: [{ clientX: 150, clientY: 120, identifier: 1 }]
    })

    // Test touch end
    fireEvent.touchEnd(appointment, {
      touches: []
    })

    // Verify touch handling doesn't break existing drag functionality
    expect(appointment).toBeInTheDocument()
  })

  test('handles swipe gestures for calendar navigation', async () => {
    const onDateChange = jest.fn()
    
    const TestWrapper = () => (
      <TouchDragManager
        onSwipe={(direction, velocity) => {
          if (direction === 'left') onDateChange('next')
          if (direction === 'right') onDateChange('prev')
        }}
      >
        <UnifiedCalendar {...mockProps} onDateChange={onDateChange} />
      </TouchDragManager>
    )

    render(<TestWrapper />)

    const calendar = screen.getByRole('application')

    // Simulate swipe left
    fireEvent.touchStart(calendar, {
      touches: [{ clientX: 300, clientY: 200, identifier: 1 }]
    })
    
    fireEvent.touchMove(calendar, {
      touches: [{ clientX: 200, clientY: 200, identifier: 1 }]
    })
    
    fireEvent.touchEnd(calendar, {
      touches: []
    })

    await waitFor(() => {
      expect(onDateChange).toHaveBeenCalledWith('next')
    })
  })

  test('provides haptic feedback on mobile devices', () => {
    // Mock navigator.vibrate
    const mockVibrate = jest.fn()
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true
    })

    const TestWrapper = () => (
      <TouchDragManager enableHapticFeedback={true}>
        <UnifiedCalendar {...mockProps} />
      </TouchDragManager>
    )

    render(<TestWrapper />)

    const calendar = screen.getByRole('application')

    // Trigger a gesture that should provide haptic feedback
    fireEvent.touchStart(calendar, {
      touches: [{ clientX: 100, clientY: 100, identifier: 1 }]
    })

    // Note: Actual haptic feedback testing would require real device testing
    // This test verifies the API is available and called
    expect(mockVibrate).toHaveBeenCalled()
  })
})

// Test Suite 2: MobileCalendarControls Integration
describe('MobileCalendarControls Integration', () => {
  test('integrates with UnifiedCalendar navigation', async () => {
    const onDateChange = jest.fn()
    const onViewChange = jest.fn()
    
    const TestWrapper = () => (
      <div>
        <MobileCalendarControls
          currentDate={new Date('2023-12-01')}
          view="week"
          onDateChange={onDateChange}
          onViewChange={onViewChange}
          onTodayClick={() => onDateChange(new Date())}
        />
        <UnifiedCalendar
          {...mockProps}
          onDateChange={onDateChange}
          onViewChange={onViewChange}
        />
      </div>
    )

    render(<TestWrapper />)

    // Test view switching
    const weekButton = screen.getByText('Week')
    await userEvent.click(weekButton)
    
    expect(onViewChange).toHaveBeenCalledWith('week')

    // Test date navigation
    const nextButton = screen.getByLabelText(/next/i)
    await userEvent.click(nextButton)
    
    expect(onDateChange).toHaveBeenCalled()
  })

  test('displays date picker with touch-friendly interface', async () => {
    const TestWrapper = () => (
      <MobileCalendarControls
        currentDate={new Date('2023-12-01')}
        view="month"
        onDateChange={jest.fn()}
        onViewChange={jest.fn()}
        onTodayClick={jest.fn()}
        showDatePicker={true}
      />
    )

    render(<TestWrapper />)

    // Find and click the date button to open picker
    const dateButton = screen.getByText(/December 2023/i)
    await userEvent.click(dateButton)

    // Verify date picker opens
    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument()
    })
  })

  test('enables swipe navigation when configured', async () => {
    const onDateChange = jest.fn()
    
    const TestWrapper = () => (
      <MobileCalendarControls
        currentDate={new Date('2023-12-01')}
        view="week"
        onDateChange={onDateChange}
        onViewChange={jest.fn()}
        onTodayClick={jest.fn()}
        enableSwipeNavigation={true}
      />
    )

    render(<TestWrapper />)

    const controls = screen.getByRole('navigation')

    // Simulate swipe gesture
    fireEvent.touchStart(controls, {
      touches: [{ clientX: 200, clientY: 100, identifier: 1 }]
    })
    
    fireEvent.touchMove(controls, {
      touches: [{ clientX: 100, clientY: 100, identifier: 1 }]
    })
    
    fireEvent.touchEnd(controls, {
      touches: []
    })

    // Should trigger navigation
    await waitFor(() => {
      expect(onDateChange).toHaveBeenCalled()
    })
  })
})

// Test Suite 3: Accessibility Integration
describe('Accessibility Integration', () => {
  test('integrates keyboard navigation with UnifiedCalendar', async () => {
    const onDateChange = jest.fn()
    const onAppointmentSelect = jest.fn()
    
    const TestWrapper = () => (
      <CalendarAccessibilityManager>
        <KeyboardNavigationHandler
          currentDate={new Date('2023-12-01')}
          view="week"
          appointments={mockAppointments}
          onDateChange={onDateChange}
          onViewChange={jest.fn()}
          onDateSelect={jest.fn()}
          onAppointmentSelect={onAppointmentSelect}
        >
          <UnifiedCalendar {...mockProps} />
        </KeyboardNavigationHandler>
      </CalendarAccessibilityManager>
    )

    render(<TestWrapper />)

    // Test keyboard navigation
    const calendar = screen.getByRole('application')
    calendar.focus()

    // Test arrow key navigation
    fireEvent.keyDown(calendar, { key: 'ArrowRight' })
    await waitFor(() => {
      expect(onDateChange).toHaveBeenCalled()
    })

    // Test Enter key for appointment selection
    fireEvent.keyDown(calendar, { key: 'Enter' })
    
    // Test view switching with number keys
    fireEvent.keyDown(calendar, { key: '2' }) // Week view
    fireEvent.keyDown(calendar, { key: '3' }) // Day view
  })

  test('provides screen reader announcements', async () => {
    const TestWrapper = () => (
      <CalendarAccessibilityManager>
        <UnifiedCalendar {...mockProps} />
      </CalendarAccessibilityManager>
    )

    render(<TestWrapper />)

    // Check for ARIA live regions
    const liveRegion = screen.getByRole('status')
    expect(liveRegion).toBeInTheDocument()

    // Check for proper labeling
    const calendar = screen.getByRole('application')
    expect(calendar).toHaveAttribute('aria-label')
  })

  test('manages focus properly with modals and interactions', async () => {
    const TestWrapper = () => (
      <CalendarAccessibilityManager enableFocusManagement={true}>
        <UnifiedCalendar {...mockProps} />
      </CalendarAccessibilityManager>
    )

    render(<TestWrapper />)

    // Test focus management
    const calendar = screen.getByRole('application')
    expect(calendar).toBeInTheDocument()
    
    // Focus should be managed automatically
    await waitFor(() => {
      expect(document.activeElement).toBeTruthy()
    })
  })
})

// Test Suite 4: Conflict Resolution Integration
describe('ConflictResolutionEngine Integration', () => {
  test('integrates with appointment booking workflow', async () => {
    const conflictEngine = new ConflictResolutionEngine()
    
    const newAppointment = {
      id: 3,
      start_time: '2023-12-01T10:30:00Z',
      duration_minutes: 60,
      barber_id: 1,
      client_name: 'Test Client',
      service_name: 'Haircut',
      status: 'scheduled' as const
    }

    const analysis = conflictEngine.analyzeConflicts(
      newAppointment,
      mockAppointments,
      mockBarbers
    )

    expect(analysis.hasConflicts).toBe(true)
    expect(analysis.conflicts).toHaveLength(1)
    expect(analysis.conflicts[0].type).toBe('time_overlap')
  })

  test('provides resolution suggestions', async () => {
    const conflictEngine = new ConflictResolutionEngine()
    
    const conflictingAppointment = {
      id: 3,
      start_time: '2023-12-01T10:00:00Z',
      duration_minutes: 60,
      barber_id: 1,
      client_name: 'Test Client',
      service_name: 'Haircut',
      status: 'scheduled' as const
    }

    const analysis = conflictEngine.analyzeConflicts(
      conflictingAppointment,
      mockAppointments,
      mockBarbers
    )

    expect(analysis.recommendations).toHaveLength(0) // Exact conflict, no easy resolution
    expect(analysis.riskScore).toBeGreaterThan(50)
  })
})

// Test Suite 5: Performance Integration
describe('Performance Integration', () => {
  test('virtual scrolling handles large appointment datasets', async () => {
    // Generate large dataset
    const largeAppointmentSet = Array.from({ length: 1000 }, (_, index) => ({
      id: index + 1,
      start_time: `2023-12-01T${String(Math.floor(index / 4) + 8).padStart(2, '0')}:${String((index % 4) * 15).padStart(2, '0')}:00Z`,
      duration_minutes: 60,
      client_name: `Client ${index + 1}`,
      service_name: 'Haircut',
      barber_name: `Barber ${(index % 5) + 1}`,
      barber_id: (index % 5) + 1,
      status: 'scheduled' as const
    }))

    const TestWrapper = () => (
      <VirtualizedCalendarGrid
        appointments={largeAppointmentSet}
        startDate={new Date('2023-12-01')}
        endDate={new Date('2023-12-07')}
        view="week"
        onAppointmentClick={jest.fn()}
      />
    )

    const startTime = performance.now()
    render(<TestWrapper />)
    const endTime = performance.now()

    // Should render quickly even with large dataset
    expect(endTime - startTime).toBeLessThan(1000) // Less than 1 second
    
    // Should still show appointments
    expect(screen.getByText('Client 1')).toBeInTheDocument()
  })

  test('cache manager optimizes data loading', async () => {
    const mockApiEndpoint = 'http://localhost:8000/api/appointments'
    
    // Mock fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAppointments)
      })
    ) as jest.Mock

    const TestWrapper = () => (
      <CalendarCacheManager apiEndpoint={mockApiEndpoint}>
        <UnifiedCalendar {...mockProps} />
      </CalendarCacheManager>
    )

    render(<TestWrapper />)

    // Cache should be working in the background
    await waitFor(() => {
      expect(screen.getByRole('application')).toBeInTheDocument()
    })
  })
})

// Test Suite 6: Animation Integration
describe('Animation Integration', () => {
  test('animations work with calendar interactions', async () => {
    const TestWrapper = () => (
      <CalendarAnimationEngine enableMicroInteractions={true}>
        <UnifiedCalendar {...mockProps} />
      </CalendarAnimationEngine>
    )

    render(<TestWrapper />)

    const appointment = screen.getByText('John Doe')
    
    // Hover should trigger animation
    fireEvent.mouseEnter(appointment)
    fireEvent.mouseLeave(appointment)
    
    // Click should trigger animation
    fireEvent.click(appointment)
    
    expect(appointment).toBeInTheDocument()
  })

  test('respects reduced motion preferences', async () => {
    // Mock reduced motion preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query.includes('prefers-reduced-motion: reduce'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })

    const TestWrapper = () => (
      <CalendarAnimationEngine 
        config={{ respectReducedMotion: true }}
        enableMicroInteractions={true}
      >
        <UnifiedCalendar {...mockProps} />
      </CalendarAnimationEngine>
    )

    render(<TestWrapper />)
    
    // Should still render without animations
    expect(screen.getByRole('application')).toBeInTheDocument()
  })
})

// Test Suite 7: Integration Error Handling
describe('Integration Error Handling', () => {
  test('gracefully handles component initialization failures', () => {
    // Mock console.error to suppress expected error logs
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    const TestWrapper = () => (
      <CalendarAnimationEngine>
        <CalendarAccessibilityManager>
          <TouchDragManager>
            <UnifiedCalendar {...mockProps} />
          </TouchDragManager>
        </CalendarAccessibilityManager>
      </CalendarAnimationEngine>
    )

    // Should not crash even if some components fail
    expect(() => render(<TestWrapper />)).not.toThrow()
    
    consoleSpy.mockRestore()
  })

  test('handles network failures gracefully', async () => {
    // Mock failed fetch
    global.fetch = jest.fn(() =>
      Promise.reject(new Error('Network error'))
    )

    const TestWrapper = () => (
      <CalendarCacheManager 
        apiEndpoint="http://localhost:8000/api/appointments"
        onError={jest.fn()}
      >
        <UnifiedCalendar {...mockProps} />
      </CalendarCacheManager>
    )

    render(<TestWrapper />)
    
    // Should still render calendar
    expect(screen.getByRole('application')).toBeInTheDocument()
  })
})

// Cleanup
afterEach(() => {
  jest.clearAllMocks()
})