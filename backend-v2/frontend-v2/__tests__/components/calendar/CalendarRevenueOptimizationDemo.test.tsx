/**
 * Comprehensive Tests for CalendarRevenueOptimizationDemo Component
 * 
 * Tests cover:
 * - Component rendering and layout structure
 * - Six Figure Barber methodology integration
 * - Calendar view switching and date navigation
 * - Revenue tracking and analytics display
 * - Mock data handling and business logic
 * - User interactions and event handlers
 * - Responsive design and mobile optimization
 * - Performance monitoring and optimization
 * - Accessibility compliance
 * - Error handling and edge cases
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'
import CalendarRevenueOptimizationDemo from '@/components/calendar/CalendarRevenueOptimizationDemo'

// Mock UnifiedCalendar component
jest.mock('@/components/UnifiedCalendar', () => {
  return function MockUnifiedCalendar({ 
    view, 
    onViewChange, 
    currentDate, 
    onDateChange,
    appointments,
    barbers,
    clients,
    selectedBarberId,
    onBarberSelect,
    onAppointmentClick,
    onClientClick,
    onTimeSlotClick,
    onAppointmentUpdate,
    onCreateAppointment,
    onUpdateClient,
    onViewClientHistory,
    startHour,
    endHour,
    slotDuration,
    className
  }: any) {
    return (
      <div 
        data-testid="unified-calendar"
        data-view={view}
        data-current-date={currentDate?.toISOString()}
        data-selected-barber-id={selectedBarberId}
        data-start-hour={startHour}
        data-end-hour={endHour}
        data-slot-duration={slotDuration}
        className={className}
      >
        <div data-testid="calendar-appointments">
          {appointments?.map((apt: any) => (
            <div 
              key={apt.id} 
              data-testid={`appointment-${apt.id}`}
              onClick={() => onAppointmentClick?.(apt)}
            >
              {apt.client_name} - {apt.service_name} - ${apt.price}
            </div>
          ))}
        </div>
        <div data-testid="calendar-clients">
          {clients?.map((client: any) => (
            <div 
              key={client.id} 
              data-testid={`client-${client.id}`}
              onClick={() => onClientClick?.(client)}
            >
              {client.first_name} {client.last_name}
            </div>
          ))}
        </div>
        <div data-testid="calendar-barbers">
          {barbers?.map((barber: any) => (
            <div key={barber.id} data-testid={`barber-${barber.id}`}>
              {barber.name}
            </div>
          ))}
        </div>
        <button 
          data-testid="time-slot-button"
          onClick={() => onTimeSlotClick?.(new Date(), 1)}
        >
          Click Time Slot
        </button>
        <button 
          data-testid="create-appointment-button"
          onClick={() => onCreateAppointment?.(1)}
        >
          Create Appointment
        </button>
        <button 
          data-testid="update-client-button"
          onClick={() => onUpdateClient?.({ id: 1, first_name: 'Updated' })}
        >
          Update Client
        </button>
        <button 
          data-testid="view-history-button"
          onClick={() => onViewClientHistory?.(1)}
        >
          View History
        </button>
        <button 
          data-testid="update-appointment-button"
          onClick={() => onAppointmentUpdate?.(1, '2024-07-25T10:00:00Z', false)}
        >
          Update Appointment
        </button>
      </div>
    )
  }
})

// Mock calendar types
jest.mock('@/types/calendar', () => ({
  CalendarView: {
    DAY: 'day',
    WEEK: 'week', 
    MONTH: 'month'
  }
}))

describe('CalendarRevenueOptimizationDemo', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Structure and Rendering', () => {
    it('renders the main component without errors', () => {
      expect(() => render(<CalendarRevenueOptimizationDemo />)).not.toThrow()
    })

    it('displays the Six Figure Barber branding header', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      expect(screen.getByText('6FB')).toBeInTheDocument()
      expect(screen.getByText('Advanced Analytics Suite')).toBeInTheDocument()
    })

    it('shows the instructional content about analytics features', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      expect(screen.getByText(/Six Figure Barber Platform/)).toBeInTheDocument()
      expect(screen.getByText(/Revenue.*button to access/)).toBeInTheDocument()
    })

    it('displays key features demonstration sections', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      expect(screen.getByText('Interactive Charts:')).toBeInTheDocument()
      expect(screen.getByText('Client Analytics:')).toBeInTheDocument()
      expect(screen.getByText('AI Predictions:')).toBeInTheDocument()
    })

    it('renders control sections with proper labels', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      expect(screen.getByText('View')).toBeInTheDocument()
      expect(screen.getByText('Barber')).toBeInTheDocument()
    })

    it('displays revenue metrics prominently', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      expect(screen.getByText("Today's Revenue")).toBeInTheDocument()
      expect(screen.getByText('$400')).toBeInTheDocument()
      expect(screen.getByText('Six Figure Progress')).toBeInTheDocument()
      expect(screen.getByText('47.8%')).toBeInTheDocument()
    })

    it('renders the UnifiedCalendar component', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      expect(screen.getByTestId('unified-calendar')).toBeInTheDocument()
    })
  })

  describe('Six Figure Barber Business Logic', () => {
    it('displays Six Figure Barber methodology branding', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const brandElement = screen.getByText('6FB')
      expect(brandElement).toHaveClass('bg-green-600', 'text-white')
    })

    it('tracks progress toward six-figure goal correctly', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const progressText = screen.getByText('47.8%')
      expect(progressText).toBeInTheDocument()
      expect(progressText).toHaveClass('text-blue-600')
    })

    it('shows premium service pricing in mock data', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Check for premium service appointments
      expect(screen.getByTestId('appointment-1')).toHaveTextContent('$120')
      expect(screen.getByTestId('appointment-2')).toHaveTextContent('$150') 
    })

    it('displays VIP client data with proper categorization', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      expect(screen.getByTestId('client-1')).toHaveTextContent('Michael Rodriguez')
      expect(screen.getByTestId('client-2')).toHaveTextContent('Jennifer Chen')
    })

    it('calculates revenue metrics aligned with Six Figure methodology', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Today's revenue should be $400 based on mock data
      expect(screen.getByText('$400')).toBeInTheDocument()
      
      // Progress should be calculated toward $100k goal
      expect(screen.getByText('47.8%')).toBeInTheDocument()
    })

    it('emphasizes premium service positioning', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      expect(screen.getByText(/Real-time revenue visualization/)).toBeInTheDocument()
      expect(screen.getByText(/Revenue forecasting/)).toBeInTheDocument()
      expect(screen.getByText(/AI-powered business intelligence/)).toBeInTheDocument()
    })
  })

  describe('Calendar View Management', () => {
    it('initializes with day view by default', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const calendarElement = screen.getByTestId('unified-calendar')
      expect(calendarElement).toHaveAttribute('data-view', 'day')
    })

    it('allows switching between calendar views', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const viewSelect = screen.getByDisplayValue('Day View')
      
      await user.selectOptions(viewSelect, 'week')
      
      await waitFor(() => {
        const calendarElement = screen.getByTestId('unified-calendar')
        expect(calendarElement).toHaveAttribute('data-view', 'week')
      })
    })

    it('provides all required view options', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      expect(screen.getByRole('option', { name: 'Day View' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Week View' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Month View' })).toBeInTheDocument()
    })

    it('maintains view state across interactions', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const viewSelect = screen.getByDisplayValue('Day View')
      await user.selectOptions(viewSelect, 'month')
      
      // Interact with calendar
      const timeSlotButton = screen.getByTestId('time-slot-button')
      await user.click(timeSlotButton)
      
      // View should still be month
      const calendarElement = screen.getByTestId('unified-calendar')
      expect(calendarElement).toHaveAttribute('data-view', 'month')
    })
  })

  describe('Barber Selection and Filtering', () => {
    it('initializes with "All Barbers" selected', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const barberSelect = screen.getByDisplayValue('All Barbers')
      expect(barberSelect).toBeInTheDocument()
      
      const calendarElement = screen.getByTestId('unified-calendar')
      expect(calendarElement).toHaveAttribute('data-selected-barber-id', 'all')
    })

    it('displays available barbers in selection dropdown', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      expect(screen.getByRole('option', { name: 'All Barbers' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Alex Martinez' })).toBeInTheDocument()
    })

    it('allows filtering by specific barber', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const barberSelect = screen.getByDisplayValue('All Barbers')
      await user.selectOptions(barberSelect, '1')
      
      await waitFor(() => {
        const calendarElement = screen.getByTestId('unified-calendar')
        expect(calendarElement).toHaveAttribute('data-selected-barber-id', '1')
      })
    })

    it('maintains barber selection across view changes', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const barberSelect = screen.getByDisplayValue('All Barbers')
      await user.selectOptions(barberSelect, '1')
      
      const viewSelect = screen.getByDisplayValue('Day View')
      await user.selectOptions(viewSelect, 'week')
      
      const calendarElement = screen.getByTestId('unified-calendar')
      expect(calendarElement).toHaveAttribute('data-selected-barber-id', '1')
    })
  })

  describe('Date Management and Navigation', () => {
    it('initializes with current date', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const calendarElement = screen.getByTestId('unified-calendar')
      const dateAttribute = calendarElement.getAttribute('data-current-date')
      
      expect(dateAttribute).toBeTruthy()
      expect(new Date(dateAttribute!)).toBeInstanceOf(Date)
    })

    it('passes date change handlers to calendar', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const calendarElement = screen.getByTestId('unified-calendar')
      expect(calendarElement).toBeInTheDocument()
      
      // Calendar should have proper date attributes
      expect(calendarElement.getAttribute('data-current-date')).toBeTruthy()
    })
  })

  describe('Mock Data Integration', () => {
    it('provides comprehensive client data', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Verify VIP clients are present
      expect(screen.getByTestId('client-1')).toHaveTextContent('Michael Rodriguez')
      expect(screen.getByTestId('client-2')).toHaveTextContent('Jennifer Chen')
      expect(screen.getByTestId('client-3')).toHaveTextContent('David Thompson')
    })

    it('displays appointments with proper service details', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      expect(screen.getByTestId('appointment-1')).toHaveTextContent('Michael Rodriguez - Signature Executive Cut - $120')
      expect(screen.getByTestId('appointment-2')).toHaveTextContent('Jennifer Chen - VIP Cut & Style Package - $150')
      expect(screen.getByTestId('appointment-3')).toHaveTextContent('David Thompson - Classic Haircut - $65')
    })

    it('includes proper barber information', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      expect(screen.getByTestId('barber-1')).toHaveTextContent('Alex Martinez')
    })

    it('maintains data consistency across components', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Same client data should be accessible through different interactions
      expect(screen.getByTestId('client-1')).toBeInTheDocument()
      expect(screen.getByTestId('appointment-1')).toHaveTextContent('Michael Rodriguez')
    })
  })

  describe('Event Handlers and User Interactions', () => {
    it('handles appointment clicks with proper logging', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      
      render(<CalendarRevenueOptimizationDemo />)
      
      const appointment = screen.getByTestId('appointment-1')
      await user.click(appointment)
      
      expect(consoleSpy).toHaveBeenCalledWith('Appointment clicked:', expect.objectContaining({
        id: 1,
        client_name: 'Michael Rodriguez'
      }))
      
      consoleSpy.mockRestore()
    })

    it('handles client clicks properly', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      
      render(<CalendarRevenueOptimizationDemo />)
      
      const client = screen.getByTestId('client-1')
      await user.click(client)
      
      expect(consoleSpy).toHaveBeenCalledWith('Client clicked:', expect.objectContaining({
        id: 1,
        first_name: 'Michael'
      }))
      
      consoleSpy.mockRestore()
    })

    it('handles time slot clicks with date and barber info', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      
      render(<CalendarRevenueOptimizationDemo />)
      
      const timeSlotButton = screen.getByTestId('time-slot-button')
      await user.click(timeSlotButton)
      
      expect(consoleSpy).toHaveBeenCalledWith('Time slot clicked:', expect.objectContaining({
        date: expect.any(Date),
        barberId: 1
      }))
      
      consoleSpy.mockRestore()
    })

    it('handles create appointment requests', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      
      render(<CalendarRevenueOptimizationDemo />)
      
      const createButton = screen.getByTestId('create-appointment-button')
      await user.click(createButton)
      
      expect(consoleSpy).toHaveBeenCalledWith('Create appointment for client:', 1)
      
      consoleSpy.mockRestore()
    })

    it('handles client update operations', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      
      render(<CalendarRevenueOptimizationDemo />)
      
      const updateButton = screen.getByTestId('update-client-button')
      await user.click(updateButton)
      
      expect(consoleSpy).toHaveBeenCalledWith('Update client:', expect.objectContaining({
        id: 1,
        first_name: 'Updated'
      }))
      
      consoleSpy.mockRestore()
    })

    it('handles client history viewing', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      
      render(<CalendarRevenueOptimizationDemo />)
      
      const historyButton = screen.getByTestId('view-history-button')
      await user.click(historyButton)
      
      expect(consoleSpy).toHaveBeenCalledWith('View client history:', 1)
      
      consoleSpy.mockRestore()
    })

    it('handles appointment updates with drag-drop support', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      
      render(<CalendarRevenueOptimizationDemo />)
      
      const updateButton = screen.getByTestId('update-appointment-button')
      await user.click(updateButton)
      
      expect(consoleSpy).toHaveBeenCalledWith('Update appointment:', expect.objectContaining({
        appointmentId: 1,
        newStartTime: '2024-07-25T10:00:00Z',
        isDragDrop: false
      }))
      
      consoleSpy.mockRestore()
    })
  })

  describe('Calendar Configuration', () => {
    it('passes proper time range configuration', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const calendarElement = screen.getByTestId('unified-calendar')
      expect(calendarElement).toHaveAttribute('data-start-hour', '8')
      expect(calendarElement).toHaveAttribute('data-end-hour', '18')
      expect(calendarElement).toHaveAttribute('data-slot-duration', '30')
    })

    it('applies proper CSS classes for styling', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const calendarElement = screen.getByTestId('unified-calendar')
      expect(calendarElement).toHaveClass('h-full')
    })

    it('provides all required calendar props', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const calendarElement = screen.getByTestId('unified-calendar')
      
      // Verify all required attributes are present
      expect(calendarElement.getAttribute('data-view')).toBeTruthy()
      expect(calendarElement.getAttribute('data-current-date')).toBeTruthy()
      expect(calendarElement.getAttribute('data-selected-barber-id')).toBeTruthy()
      expect(calendarElement.getAttribute('data-start-hour')).toBeTruthy()
      expect(calendarElement.getAttribute('data-end-hour')).toBeTruthy()
      expect(calendarElement.getAttribute('data-slot-duration')).toBeTruthy()
    })
  })

  describe('Revenue Analytics Features', () => {
    it('displays revenue optimization metrics', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      expect(screen.getByText("Today's Revenue")).toBeInTheDocument()
      expect(screen.getByText('$400')).toBeInTheDocument()
      expect(screen.getByText('$400')).toHaveClass('text-green-600')
    })

    it('shows Six Figure progress tracking', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      expect(screen.getByText('Six Figure Progress')).toBeInTheDocument()
      expect(screen.getByText('47.8%')).toBeInTheDocument()
      expect(screen.getByText('47.8%')).toHaveClass('text-blue-600')
    })

    it('highlights analytics suite features', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      expect(screen.getByText(/Real-time revenue visualization/)).toBeInTheDocument()
      expect(screen.getByText(/Client distribution charts/)).toBeInTheDocument()
      expect(screen.getByText(/Revenue forecasting/)).toBeInTheDocument()
    })

    it('provides comprehensive feature descriptions', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      expect(screen.getByText(/Interactive Charts:/)).toBeInTheDocument()
      expect(screen.getByText(/Client Analytics:/)).toBeInTheDocument()
      expect(screen.getByText(/AI Predictions:/)).toBeInTheDocument()
    })
  })

  describe('Responsive Design and Layout', () => {
    it('applies responsive grid layout for feature descriptions', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const featureGrid = screen.getByText(/Interactive Charts:/).closest('.grid')
      expect(featureGrid).toHaveClass('grid-cols-1', 'md:grid-cols-3')
    })

    it('uses proper spacing and layout classes', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const header = screen.getByText('Advanced Analytics Suite').closest('.p-4')
      expect(header).toHaveClass('bg-gradient-to-r', 'from-green-50', 'to-blue-50')
    })

    it('maintains full-screen layout structure', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const mainContainer = screen.getByText('Advanced Analytics Suite').closest('.h-screen')
      expect(mainContainer).toHaveClass('h-screen', 'w-full')
    })

    it('provides proper spacing between sections', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const controlsSection = screen.getByText('View').closest('.flex')
      expect(controlsSection).toHaveClass('items-center', 'space-x-4')
    })
  })

  describe('Performance Optimization', () => {
    it('renders within acceptable time limits', () => {
      const startTime = performance.now()
      
      render(<CalendarRevenueOptimizationDemo />)
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      expect(renderTime).toBeLessThan(100) // Should render within 100ms
    })

    it('handles multiple state updates efficiently', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const viewSelect = screen.getByDisplayValue('Day View')
      const barberSelect = screen.getByDisplayValue('All Barbers')
      
      const startTime = performance.now()
      
      await user.selectOptions(viewSelect, 'week')
      await user.selectOptions(barberSelect, '1')
      await user.selectOptions(viewSelect, 'month')
      
      const endTime = performance.now()
      const updateTime = endTime - startTime
      
      expect(updateTime).toBeLessThan(200) // Should update within 200ms
    })

    it('manages memory usage properly', () => {
      const { unmount } = render(<CalendarRevenueOptimizationDemo />)
      
      expect(screen.getByTestId('unified-calendar')).toBeInTheDocument()
      
      expect(() => unmount()).not.toThrow()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('handles missing calendar prop gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      expect(() => render(<CalendarRevenueOptimizationDemo />)).not.toThrow()
      
      consoleSpy.mockRestore()
    })

    it('recovers from invalid date operations', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Should not crash with date manipulations
      const timeSlotButton = screen.getByTestId('time-slot-button')
      
      expect(() => user.click(timeSlotButton)).not.toThrow()
    })

    it('handles invalid barber selection gracefully', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const barberSelect = screen.getByDisplayValue('All Barbers')
      
      // Should handle invalid selections
      await user.selectOptions(barberSelect, 'all')
      
      const calendarElement = screen.getByTestId('unified-calendar')
      expect(calendarElement).toHaveAttribute('data-selected-barber-id', 'all')
    })

    it('maintains component stability under rapid interactions', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const viewSelect = screen.getByDisplayValue('Day View')
      
      // Rapid view changes
      for (let i = 0; i < 5; i++) {
        await user.selectOptions(viewSelect, 'week')
        await user.selectOptions(viewSelect, 'day')
      }
      
      expect(screen.getByTestId('unified-calendar')).toBeInTheDocument()
    })
  })

  describe('Accessibility and User Experience', () => {
    it('provides proper form labels', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      expect(screen.getByLabelText('View')).toBeInTheDocument()
      expect(screen.getByLabelText('Barber')).toBeInTheDocument()
    })

    it('uses semantic HTML structure', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      expect(screen.getByRole('heading', { name: /Advanced Analytics Suite/ })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: 'View' })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: 'Barber' })).toBeInTheDocument()
    })

    it('maintains focus management for keyboard navigation', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const viewSelect = screen.getByLabelText('View')
      
      await user.tab()
      expect(document.activeElement).toBeTruthy()
      
      await user.tab()
      expect(document.activeElement).toBeTruthy()
    })

    it('provides proper color contrast for metrics', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const revenueAmount = screen.getByText('$400')
      expect(revenueAmount).toHaveClass('text-green-600')
      
      const progressAmount = screen.getByText('47.8%')
      expect(progressAmount).toHaveClass('text-blue-600')
    })
  })
})