/**
 * Bulk Operations Workflow Integration Tests
 * 
 * Tests the complete bulk operations workflow including multi-select functionality,
 * batch operations, and integration with Phase 2 calendar components.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Import Phase 2 components
import { BulkOperationsManager } from '@/components/calendar/BulkOperationsManager'
import { TouchDragManager } from '@/components/calendar/TouchDragManager'
import { MobileCalendarControls } from '@/components/calendar/MobileCalendarControls'
import { ConflictResolutionEngine } from '@/components/calendar/ConflictResolutionEngine'
import UnifiedCalendar from '@/components/UnifiedCalendar'

// Mock API calls
const mockBulkUpdate = jest.fn()
const mockBulkCancel = jest.fn()
const mockBulkReschedule = jest.fn()
const mockBulkComplete = jest.fn()

jest.mock('@/lib/api', () => ({
  bulkUpdateAppointments: mockBulkUpdate,
  bulkCancelAppointments: mockBulkCancel,
  bulkRescheduleAppointments: mockBulkReschedule,
  bulkCompleteAppointments: mockBulkComplete,
  getAppointments: jest.fn(() => Promise.resolve({ data: [] }))
}))

// Test data
interface TestAppointment {
  id: number
  start_time: string
  end_time: string
  duration_minutes: number
  client_name: string
  client_id: number
  service_name: string
  service_id: number
  barber_name: string
  barber_id: number
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  location_id: number
  priority_level: 'normal' | 'high' | 'vip'
  can_reschedule: boolean
  can_cancel: boolean
}

const createTestAppointments = (): TestAppointment[] => [
  {
    id: 1,
    start_time: '2023-12-01T09:00:00Z',
    end_time: '2023-12-01T10:00:00Z',
    duration_minutes: 60,
    client_name: 'John Smith',
    client_id: 101,
    service_name: 'Haircut',
    service_id: 1,
    barber_name: 'Mike Johnson',
    barber_id: 1,
    status: 'scheduled',
    location_id: 1,
    priority_level: 'normal',
    can_reschedule: true,
    can_cancel: true
  },
  {
    id: 2,
    start_time: '2023-12-01T10:30:00Z',
    end_time: '2023-12-01T12:00:00Z',
    duration_minutes: 90,
    client_name: 'Jane Wilson',
    client_id: 102,
    service_name: 'Cut & Style',
    service_id: 2,
    barber_name: 'Sarah Davis',
    barber_id: 2,
    status: 'confirmed',
    location_id: 1,
    priority_level: 'high',
    can_reschedule: true,
    can_cancel: false
  },
  {
    id: 3,
    start_time: '2023-12-01T13:00:00Z',
    end_time: '2023-12-01T14:00:00Z',
    duration_minutes: 60,
    client_name: 'Robert Brown',
    client_id: 103,
    service_name: 'Beard Trim',
    service_id: 3,
    barber_name: 'Mike Johnson',
    barber_id: 1,
    status: 'in_progress',
    location_id: 1,
    priority_level: 'vip',
    can_reschedule: false,
    can_cancel: false
  },
  {
    id: 4,
    start_time: '2023-12-01T14:30:00Z',
    end_time: '2023-12-01T15:30:00Z',
    duration_minutes: 60,
    client_name: 'Emily Chen',
    client_id: 104,
    service_name: 'Styling',
    service_id: 4,
    barber_name: 'Sarah Davis',
    barber_id: 2,
    status: 'scheduled',
    location_id: 1,
    priority_level: 'normal',
    can_reschedule: true,
    can_cancel: true
  },
  {
    id: 5,
    start_time: '2023-12-01T16:00:00Z',
    end_time: '2023-12-01T17:00:00Z',
    duration_minutes: 60,
    client_name: 'David Martinez',
    client_id: 105,
    service_name: 'Haircut',
    service_id: 1,
    barber_name: 'Alex Thompson',
    barber_id: 3,
    status: 'scheduled',
    location_id: 1,
    priority_level: 'normal',
    can_reschedule: true,
    can_cancel: true
  }
]

const mockBarbers = [
  { id: 1, name: 'Mike Johnson', is_available: true },
  { id: 2, name: 'Sarah Davis', is_available: true },
  { id: 3, name: 'Alex Thompson', is_available: true }
]

describe('Bulk Operations Workflow Integration Tests', () => {
  let testAppointments: TestAppointment[]
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    testAppointments = createTestAppointments()
    user = userEvent.setup()
    
    // Reset all mocks
    mockBulkUpdate.mockClear()
    mockBulkCancel.mockClear()
    mockBulkReschedule.mockClear()
    mockBulkComplete.mockClear()
    
    // Setup default mock responses
    mockBulkUpdate.mockResolvedValue({ success: true, updated: [] })
    mockBulkCancel.mockResolvedValue({ success: true, cancelled: [] })
    mockBulkReschedule.mockResolvedValue({ success: true, rescheduled: [] })
    mockBulkComplete.mockResolvedValue({ success: true, completed: [] })
  })

  describe('Multi-Select Functionality', () => {
    test('enables multi-select mode with long press on mobile', async () => {
      const TestComponent = () => (
        <TouchDragManager
          enableMultiSelect={true}
          onMultiSelectStart={jest.fn()}
          onMultiSelectEnd={jest.fn()}
        >
          <BulkOperationsManager
            appointments={testAppointments}
            onBulkOperation={jest.fn()}
            enableMobileMultiSelect={true}
          >
            <UnifiedCalendar
              appointments={testAppointments}
              currentDate={new Date('2023-12-01')}
              view="day"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
            />
          </BulkOperationsManager>
        </TouchDragManager>
      )

      render(<TestComponent />)

      // Find first appointment
      const firstAppointment = screen.getByText('John Smith')

      // Long press to enable multi-select mode
      fireEvent.touchStart(firstAppointment, {
        touches: [{ clientX: 100, clientY: 100, identifier: 1 }]
      })
      
      // Wait for long press duration
      await new Promise(resolve => setTimeout(resolve, 600))
      
      fireEvent.touchEnd(firstAppointment)

      // Multi-select mode should be active
      await waitFor(() => {
        expect(screen.getByText(/Bulk Actions|Select/i)).toBeInTheDocument()
      })

      // Selection counter should appear
      expect(screen.getByText(/1 selected|1 of/i)).toBeInTheDocument()
    })

    test('selects multiple appointments with touch', async () => {
      const onBulkOperation = jest.fn()

      const TestComponent = () => (
        <BulkOperationsManager
          appointments={testAppointments}
          onBulkOperation={onBulkOperation}
          enableMobileMultiSelect={true}
          multiSelectActive={true}
        >
          <UnifiedCalendar
            appointments={testAppointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      )

      render(<TestComponent />)

      // Select first appointment
      const firstAppointment = screen.getByText('John Smith')
      await user.click(firstAppointment)

      // Select second appointment
      const secondAppointment = screen.getByText('Jane Wilson')
      await user.click(secondAppointment)

      // Select third appointment
      const thirdAppointment = screen.getByText('Robert Brown')
      await user.click(thirdAppointment)

      // Check selection count
      await waitFor(() => {
        expect(screen.getByText(/3 selected|3 of/i)).toBeInTheDocument()
      })
    })

    test('supports desktop multi-select with Ctrl+click', async () => {
      const TestComponent = () => (
        <BulkOperationsManager
          appointments={testAppointments}
          onBulkOperation={jest.fn()}
          enableDesktopMultiSelect={true}
        >
          <UnifiedCalendar
            appointments={testAppointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      )

      render(<TestComponent />)

      // Ctrl+click first appointment
      const firstAppointment = screen.getByText('John Smith')
      fireEvent.click(firstAppointment, { ctrlKey: true })

      // Ctrl+click second appointment
      const secondAppointment = screen.getByText('Jane Wilson')
      fireEvent.click(secondAppointment, { ctrlKey: true })

      // Check selection
      await waitFor(() => {
        expect(screen.getByText(/2 selected|2 of/i)).toBeInTheDocument()
      })
    })

    test('supports range selection with Shift+click', async () => {
      const TestComponent = () => (
        <BulkOperationsManager
          appointments={testAppointments}
          onBulkOperation={jest.fn()}
          enableDesktopMultiSelect={true}
        >
          <UnifiedCalendar
            appointments={testAppointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      )

      render(<TestComponent />)

      // Click first appointment
      const firstAppointment = screen.getByText('John Smith')
      fireEvent.click(firstAppointment)

      // Shift+click third appointment (should select range)
      const thirdAppointment = screen.getByText('Robert Brown')
      fireEvent.click(thirdAppointment, { shiftKey: true })

      // Should select appointments 1-3
      await waitFor(() => {
        expect(screen.getByText(/3 selected|3 of/i)).toBeInTheDocument()
      })
    })

    test('provides visual feedback for selected appointments', async () => {
      const TestComponent = () => (
        <BulkOperationsManager
          appointments={testAppointments}
          onBulkOperation={jest.fn()}
          multiSelectActive={true}
        >
          <UnifiedCalendar
            appointments={testAppointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      )

      render(<TestComponent />)

      const firstAppointment = screen.getByText('John Smith')
      await user.click(firstAppointment)

      // Check for selection visual indicators
      const appointmentElement = firstAppointment.closest('[data-appointment-id]')
      expect(appointmentElement).toHaveClass('selected')
      
      // Check for selection checkbox or indicator
      const selectionIndicator = within(appointmentElement!).getByRole('checkbox')
      expect(selectionIndicator).toBeChecked()
    })
  })

  describe('Bulk Operations Menu', () => {
    test('shows available bulk operations for selected appointments', async () => {
      const TestComponent = () => (
        <BulkOperationsManager
          appointments={testAppointments}
          selectedAppointmentIds={[1, 4, 5]}
          onBulkOperation={jest.fn()}
          multiSelectActive={true}
        >
          <UnifiedCalendar
            appointments={testAppointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      )

      render(<TestComponent />)

      // Open bulk operations menu
      const bulkActionsButton = screen.getByText(/Bulk Actions/i)
      await user.click(bulkActionsButton)

      // Check available operations
      await waitFor(() => {
        expect(screen.getByText('Reschedule Selected')).toBeInTheDocument()
        expect(screen.getByText('Cancel Selected')).toBeInTheDocument()
        expect(screen.getByText('Mark as Complete')).toBeInTheDocument()
        expect(screen.getByText('Change Status')).toBeInTheDocument()
      })
    })

    test('disables operations that cannot be performed on selected appointments', async () => {
      // Select appointments with mixed permissions
      const TestComponent = () => (
        <BulkOperationsManager
          appointments={testAppointments}
          selectedAppointmentIds={[2, 3]} // One non-cancellable, one non-reschedulable
          onBulkOperation={jest.fn()}
          multiSelectActive={true}
        >
          <UnifiedCalendar
            appointments={testAppointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      )

      render(<TestComponent />)

      const bulkActionsButton = screen.getByText(/Bulk Actions/i)
      await user.click(bulkActionsButton)

      await waitFor(() => {
        // Cancel should be disabled (appointment #2 can't be cancelled)
        const cancelButton = screen.getByText('Cancel Selected')
        expect(cancelButton).toBeDisabled()

        // Reschedule should be disabled (appointment #3 can't be rescheduled)
        const rescheduleButton = screen.getByText('Reschedule Selected')
        expect(rescheduleButton).toBeDisabled()
      })
    })

    test('shows permission warnings for mixed selections', async () => {
      const TestComponent = () => (
        <BulkOperationsManager
          appointments={testAppointments}
          selectedAppointmentIds={[1, 2, 3]}
          onBulkOperation={jest.fn()}
          multiSelectActive={true}
        >
          <UnifiedCalendar
            appointments={testAppointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      )

      render(<TestComponent />)

      const bulkActionsButton = screen.getByText(/Bulk Actions/i)
      await user.click(bulkActionsButton)

      // Should show warnings for restricted operations
      await waitFor(() => {
        expect(screen.getByText(/Some appointments cannot be cancelled/i)).toBeInTheDocument()
        expect(screen.getByText(/Some appointments cannot be rescheduled/i)).toBeInTheDocument()
      })
    })
  })

  describe('Bulk Reschedule Operations', () => {
    test('opens bulk reschedule modal with date/time picker', async () => {
      const onBulkOperation = jest.fn()

      const TestComponent = () => (
        <BulkOperationsManager
          appointments={testAppointments}
          selectedAppointmentIds={[1, 4, 5]}
          onBulkOperation={onBulkOperation}
          multiSelectActive={true}
        >
          <UnifiedCalendar
            appointments={testAppointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      )

      render(<TestComponent />)

      // Open bulk operations menu
      const bulkActionsButton = screen.getByText(/Bulk Actions/i)
      await user.click(bulkActionsButton)

      // Click reschedule
      const rescheduleButton = screen.getByText('Reschedule Selected')
      await user.click(rescheduleButton)

      // Reschedule modal should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Reschedule 3 Appointments')).toBeInTheDocument()
      })

      // Check for date/time controls
      expect(screen.getByLabelText(/New Date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/New Time/i)).toBeInTheDocument()
    })

    test('provides offset-based rescheduling options', async () => {
      const TestComponent = () => (
        <BulkOperationsManager
          appointments={testAppointments}
          selectedAppointmentIds={[1, 4, 5]}
          onBulkOperation={jest.fn()}
          multiSelectActive={true}
        >
          <UnifiedCalendar
            appointments={testAppointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      )

      render(<TestComponent />)

      const bulkActionsButton = screen.getByText(/Bulk Actions/i)
      await user.click(bulkActionsButton)

      const rescheduleButton = screen.getByText('Reschedule Selected')
      await user.click(rescheduleButton)

      await waitFor(() => {
        // Should have offset options
        expect(screen.getByText('+1 Hour')).toBeInTheDocument()
        expect(screen.getByText('+1 Day')).toBeInTheDocument()
        expect(screen.getByText('+1 Week')).toBeInTheDocument()
        expect(screen.getByText('Custom Offset')).toBeInTheDocument()
      })
    })

    test('validates bulk reschedule for conflicts', async () => {
      const conflictEngine = new ConflictResolutionEngine()
      
      const TestComponent = () => (
        <BulkOperationsManager
          appointments={testAppointments}
          selectedAppointmentIds={[1, 4]}
          onBulkOperation={jest.fn()}
          conflictEngine={conflictEngine}
          multiSelectActive={true}
        >
          <UnifiedCalendar
            appointments={testAppointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      )

      render(<TestComponent />)

      const bulkActionsButton = screen.getByText(/Bulk Actions/i)
      await user.click(bulkActionsButton)

      const rescheduleButton = screen.getByText('Reschedule Selected')
      await user.click(rescheduleButton)

      // Select a conflicting time
      await waitFor(() => {
        const timeInput = screen.getByLabelText(/New Time/i)
        fireEvent.change(timeInput, { target: { value: '10:00' } })
      })

      const confirmButton = screen.getByText('Confirm Reschedule')
      await user.click(confirmButton)

      // Should detect and show conflicts
      await waitFor(() => {
        expect(screen.getByText(/Scheduling conflicts detected/i)).toBeInTheDocument()
      })
    })

    test('executes bulk reschedule with API call', async () => {
      const onBulkOperation = jest.fn()

      const TestComponent = () => (
        <BulkOperationsManager
          appointments={testAppointments}
          selectedAppointmentIds={[1, 5]}
          onBulkOperation={onBulkOperation}
          multiSelectActive={true}
        >
          <UnifiedCalendar
            appointments={testAppointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      )

      render(<TestComponent />)

      const bulkActionsButton = screen.getByText(/Bulk Actions/i)
      await user.click(bulkActionsButton)

      const rescheduleButton = screen.getByText('Reschedule Selected')
      await user.click(rescheduleButton)

      // Set new date and time
      await waitFor(() => {
        const dateInput = screen.getByLabelText(/New Date/i)
        fireEvent.change(dateInput, { target: { value: '2023-12-02' } })

        const timeInput = screen.getByLabelText(/New Time/i)
        fireEvent.change(timeInput, { target: { value: '14:00' } })
      })

      const confirmButton = screen.getByText('Confirm Reschedule')
      await user.click(confirmButton)

      // Should call bulk reschedule API
      await waitFor(() => {
        expect(mockBulkReschedule).toHaveBeenCalledWith({
          appointmentIds: [1, 5],
          newDate: '2023-12-02',
          newTime: '14:00',
          rescheduleType: 'specific_time'
        })
      })
    })
  })

  describe('Bulk Cancel Operations', () => {
    test('shows confirmation dialog for bulk cancellation', async () => {
      const TestComponent = () => (
        <BulkOperationsManager
          appointments={testAppointments}
          selectedAppointmentIds={[1, 4, 5]}
          onBulkOperation={jest.fn()}
          multiSelectActive={true}
        >
          <UnifiedCalendar
            appointments={testAppointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      )

      render(<TestComponent />)

      const bulkActionsButton = screen.getByText(/Bulk Actions/i)
      await user.click(bulkActionsButton)

      const cancelButton = screen.getByText('Cancel Selected')
      await user.click(cancelButton)

      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Cancel 3 Appointments')).toBeInTheDocument()
        expect(screen.getByText(/Are you sure you want to cancel these appointments/i)).toBeInTheDocument()
      })

      // Should list affected appointments
      expect(screen.getByText('John Smith')).toBeInTheDocument()
      expect(screen.getByText('Emily Chen')).toBeInTheDocument()
      expect(screen.getByText('David Martinez')).toBeInTheDocument()
    })

    test('provides cancellation reason options', async () => {
      const TestComponent = () => (
        <BulkOperationsManager
          appointments={testAppointments}
          selectedAppointmentIds={[1, 5]}
          onBulkOperation={jest.fn()}
          multiSelectActive={true}
        >
          <UnifiedCalendar
            appointments={testAppointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      )

      render(<TestComponent />)

      const bulkActionsButton = screen.getByText(/Bulk Actions/i)
      await user.click(bulkActionsButton)

      const cancelButton = screen.getByText('Cancel Selected')
      await user.click(cancelButton)

      await waitFor(() => {
        // Should have reason options
        expect(screen.getByText('Client Request')).toBeInTheDocument()
        expect(screen.getByText('Schedule Conflict')).toBeInTheDocument()
        expect(screen.getByText('Staff Unavailable')).toBeInTheDocument()
        expect(screen.getByText('Other')).toBeInTheDocument()
      })
    })

    test('executes bulk cancellation with API call', async () => {
      const TestComponent = () => (
        <BulkOperationsManager
          appointments={testAppointments}
          selectedAppointmentIds={[1, 5]}
          onBulkOperation={jest.fn()}
          multiSelectActive={true}
        >
          <UnifiedCalendar
            appointments={testAppointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      )

      render(<TestComponent />)

      const bulkActionsButton = screen.getByText(/Bulk Actions/i)
      await user.click(bulkActionsButton)

      const cancelButton = screen.getByText('Cancel Selected')
      await user.click(cancelButton)

      // Select reason
      await waitFor(() => {
        const reasonButton = screen.getByText('Client Request')
        fireEvent.click(reasonButton)
      })

      const confirmButton = screen.getByText('Confirm Cancellation')
      await user.click(confirmButton)

      // Should call bulk cancel API
      await waitFor(() => {
        expect(mockBulkCancel).toHaveBeenCalledWith({
          appointmentIds: [1, 5],
          reason: 'Client Request',
          notifyClients: true
        })
      })
    })
  })

  describe('Bulk Status Update Operations', () => {
    test('allows bulk status changes', async () => {
      const TestComponent = () => (
        <BulkOperationsManager
          appointments={testAppointments}
          selectedAppointmentIds={[1, 4]}
          onBulkOperation={jest.fn()}
          multiSelectActive={true}
        >
          <UnifiedCalendar
            appointments={testAppointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      )

      render(<TestComponent />)

      const bulkActionsButton = screen.getByText(/Bulk Actions/i)
      await user.click(bulkActionsButton)

      const statusButton = screen.getByText('Change Status')
      await user.click(statusButton)

      await waitFor(() => {
        expect(screen.getByText('Scheduled')).toBeInTheDocument()
        expect(screen.getByText('Confirmed')).toBeInTheDocument()
        expect(screen.getByText('In Progress')).toBeInTheDocument()
        expect(screen.getByText('Completed')).toBeInTheDocument()
      })
    })

    test('executes bulk mark as complete', async () => {
      const TestComponent = () => (
        <BulkOperationsManager
          appointments={testAppointments}
          selectedAppointmentIds={[1, 4]}
          onBulkOperation={jest.fn()}
          multiSelectActive={true}
        >
          <UnifiedCalendar
            appointments={testAppointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      )

      render(<TestComponent />)

      const bulkActionsButton = screen.getByText(/Bulk Actions/i)
      await user.click(bulkActionsButton)

      const completeButton = screen.getByText('Mark as Complete')
      await user.click(completeButton)

      // Should call bulk complete API
      await waitFor(() => {
        expect(mockBulkComplete).toHaveBeenCalledWith({
          appointmentIds: [1, 4]
        })
      })
    })
  })

  describe('Mobile Bulk Operations UI', () => {
    test('provides touch-friendly bulk operations interface', async () => {
      const TestComponent = () => (
        <TouchDragManager>
          <BulkOperationsManager
            appointments={testAppointments}
            selectedAppointmentIds={[1, 2, 3]}
            onBulkOperation={jest.fn()}
            multiSelectActive={true}
            mobileOptimized={true}
          >
            <MobileCalendarControls
              currentDate={new Date('2023-12-01')}
              view="day"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
              onTodayClick={jest.fn()}
            />
            <UnifiedCalendar
              appointments={testAppointments}
              currentDate={new Date('2023-12-01')}
              view="day"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
            />
          </BulkOperationsManager>
        </TouchDragManager>
      )

      render(<TestComponent />)

      // Check for mobile-optimized controls
      const bulkActionsButton = screen.getByText(/Bulk Actions/i)
      expect(bulkActionsButton).toHaveClass('touch-friendly', 'mobile-button')

      await user.click(bulkActionsButton)

      // Mobile bulk operations menu should be touch-friendly
      await waitFor(() => {
        const mobileMenu = screen.getByRole('dialog')
        expect(mobileMenu).toHaveClass('mobile-menu')
        
        const actionButtons = screen.getAllByRole('button')
        actionButtons.forEach(button => {
          expect(button).toHaveAttribute('style', expect.stringContaining('min-height: 44px'))
        })
      })
    })

    test('supports swipe gestures to exit selection mode', async () => {
      const onMultiSelectEnd = jest.fn()

      const TestComponent = () => (
        <TouchDragManager
          onSwipe={(direction) => {
            if (direction === 'up') onMultiSelectEnd()
          }}
        >
          <BulkOperationsManager
            appointments={testAppointments}
            selectedAppointmentIds={[1, 2]}
            onBulkOperation={jest.fn()}
            multiSelectActive={true}
            onMultiSelectEnd={onMultiSelectEnd}
          >
            <UnifiedCalendar
              appointments={testAppointments}
              currentDate={new Date('2023-12-01')}
              view="day"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
            />
          </BulkOperationsManager>
        </TouchDragManager>
      )

      render(<TestComponent />)

      const calendar = screen.getByRole('application')

      // Swipe up to exit selection mode
      fireEvent.touchStart(calendar, {
        touches: [{ clientX: 200, clientY: 400, identifier: 1 }]
      })
      
      fireEvent.touchMove(calendar, {
        touches: [{ clientX: 200, clientY: 200, identifier: 1 }]
      })
      
      fireEvent.touchEnd(calendar)

      await waitFor(() => {
        expect(onMultiSelectEnd).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('handles API failures gracefully', async () => {
      mockBulkReschedule.mockRejectedValue(new Error('Network error'))

      const TestComponent = () => (
        <BulkOperationsManager
          appointments={testAppointments}
          selectedAppointmentIds={[1, 4]}
          onBulkOperation={jest.fn()}
          multiSelectActive={true}
        >
          <UnifiedCalendar
            appointments={testAppointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      )

      render(<TestComponent />)

      const bulkActionsButton = screen.getByText(/Bulk Actions/i)
      await user.click(bulkActionsButton)

      const rescheduleButton = screen.getByText('Reschedule Selected')
      await user.click(rescheduleButton)

      await waitFor(() => {
        const confirmButton = screen.getByText('Confirm Reschedule')
        fireEvent.click(confirmButton)
      })

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Failed to reschedule appointments/i)).toBeInTheDocument()
      })
    })

    test('handles empty selection gracefully', async () => {
      const TestComponent = () => (
        <BulkOperationsManager
          appointments={testAppointments}
          selectedAppointmentIds={[]}
          onBulkOperation={jest.fn()}
          multiSelectActive={false}
        >
          <UnifiedCalendar
            appointments={testAppointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      )

      render(<TestComponent />)

      // Bulk actions should not be available
      expect(screen.queryByText(/Bulk Actions/i)).not.toBeInTheDocument()
    })

    test('handles partial operation failures', async () => {
      mockBulkCancel.mockResolvedValue({
        success: false,
        cancelled: [1],
        failed: [{ id: 4, reason: 'Cannot cancel confirmed appointment' }]
      })

      const TestComponent = () => (
        <BulkOperationsManager
          appointments={testAppointments}
          selectedAppointmentIds={[1, 4]}
          onBulkOperation={jest.fn()}
          multiSelectActive={true}
        >
          <UnifiedCalendar
            appointments={testAppointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      )

      render(<TestComponent />)

      const bulkActionsButton = screen.getByText(/Bulk Actions/i)
      await user.click(bulkActionsButton)

      const cancelButton = screen.getByText('Cancel Selected')
      await user.click(cancelButton)

      await waitFor(() => {
        const confirmButton = screen.getByText('Confirm Cancellation')
        fireEvent.click(confirmButton)
      })

      // Should show partial success message
      await waitFor(() => {
        expect(screen.getByText(/1 appointment cancelled, 1 failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Performance with Large Selections', () => {
    test('handles large selections efficiently', async () => {
      const largeAppointmentSet = Array.from({ length: 100 }, (_, i) => ({
        ...testAppointments[0],
        id: i + 1,
        client_name: `Client ${i + 1}`
      }))

      const largeSelectionIds = Array.from({ length: 50 }, (_, i) => i + 1)

      const TestComponent = () => (
        <BulkOperationsManager
          appointments={largeAppointmentSet}
          selectedAppointmentIds={largeSelectionIds}
          onBulkOperation={jest.fn()}
          multiSelectActive={true}
        >
          <UnifiedCalendar
            appointments={largeAppointmentSet}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      )

      const startTime = performance.now()
      render(<TestComponent />)
      const endTime = performance.now()

      // Should render large selection quickly
      expect(endTime - startTime).toBeLessThan(200)

      // Should show correct selection count
      expect(screen.getByText(/50 selected/i)).toBeInTheDocument()
    })
  })
})

describe('Bulk Operations Integration with Other Phase 2 Components', () => {
  test('integrates with ConflictResolutionEngine', async () => {
    const conflictEngine = new ConflictResolutionEngine()
    const testAppointments = createTestAppointments()

    const TestComponent = () => (
      <BulkOperationsManager
        appointments={testAppointments}
        selectedAppointmentIds={[1, 2]}
        onBulkOperation={jest.fn()}
        conflictEngine={conflictEngine}
        multiSelectActive={true}
      >
        <UnifiedCalendar
          appointments={testAppointments}
          currentDate={new Date('2023-12-01')}
          view="day"
          onDateChange={jest.fn()}
          onViewChange={jest.fn()}
        />
      </BulkOperationsManager>
    )

    render(<TestComponent />)

    const bulkActionsButton = screen.getByText(/Bulk Actions/i)
    await userEvent.click(bulkActionsButton)

    const rescheduleButton = screen.getByText('Reschedule Selected')
    await userEvent.click(rescheduleButton)

    // Should show conflict detection
    await waitFor(() => {
      expect(screen.getByText(/Check for conflicts/i)).toBeInTheDocument()
    })
  })

  test('works with TouchDragManager for mobile gestures', async () => {
    const testAppointments = createTestAppointments()

    const TestComponent = () => (
      <TouchDragManager enableMultiSelect={true}>
        <BulkOperationsManager
          appointments={testAppointments}
          onBulkOperation={jest.fn()}
          enableMobileMultiSelect={true}
        >
          <UnifiedCalendar
            appointments={testAppointments}
            currentDate={new Date('2023-12-01')}
            view="day"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </BulkOperationsManager>
      </TouchDragManager>
    )

    render(<TestComponent />)

    // Should support touch-based multi-select
    const firstAppointment = screen.getByText('John Smith')
    
    // Long press to start multi-select
    fireEvent.touchStart(firstAppointment, {
      touches: [{ clientX: 100, clientY: 100, identifier: 1 }]
    })
    
    await new Promise(resolve => setTimeout(resolve, 600))
    fireEvent.touchEnd(firstAppointment)

    await waitFor(() => {
      expect(screen.getByText(/Bulk Actions|Select/i)).toBeInTheDocument()
    })
  })
})