/**
 * Tests for individual appointment selection improvements
 * Verifies that users can select individual appointments even when multiple exist on same day
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Mock calendar component with enhanced selection features
const MockCalendarWithSelection = ({ appointments, onAppointmentClick }: any) => {
  const [hoveredAppointment, setHoveredAppointment] = React.useState<number | null>(null)
  
  return (
    <div data-testid="calendar-with-selection">
      {appointments.map((appointment: any, idx: number) => (
        <div
          key={appointment.id}
          data-testid={`appointment-${appointment.id}`}
          className={`appointment ${hoveredAppointment === appointment.id ? 'hovered' : ''}`}
          style={{
            zIndex: hoveredAppointment === appointment.id ? 50 : 10 + idx,
            position: 'relative'
          }}
          onClick={(e) => {
            e.stopPropagation()
            onAppointmentClick?.(appointment)
          }}
          onMouseEnter={() => setHoveredAppointment(appointment.id)}
          onMouseLeave={() => setHoveredAppointment(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
              onAppointmentClick?.(appointment)
            }
          }}
          tabIndex={0}
          role="button"
          aria-label={`Appointment: ${appointment.client_name} at ${appointment.start_time} for ${appointment.service_name}`}
        >
          <span className="time">{appointment.start_time}</span>
          <span className="client">{appointment.client_name}</span>
          <span className="service">{appointment.service_name}</span>
        </div>
      ))}
    </div>
  )
}

// We need to mock React since it's used in the component
const React = require('react')

describe('Individual Appointment Selection', () => {
  const crowdedDayAppointments = [
    {
      id: 1,
      user_id: 123,
      service_name: 'Haircut',
      start_time: '10:00 AM',
      end_time: '10:30 AM',
      client_name: 'John Doe',
      barber_name: 'Mike Smith',
      duration_minutes: 30,
      price: 25,
      status: 'confirmed',
      created_at: '2024-01-10T10:00:00Z'
    },
    {
      id: 2,
      user_id: 123,
      service_name: 'Beard Trim',
      start_time: '10:15 AM',
      end_time: '10:30 AM',
      client_name: 'Jane Smith',
      barber_name: 'Sarah Johnson',
      duration_minutes: 15,
      price: 15,
      status: 'pending',
      created_at: '2024-01-10T14:00:00Z'
    },
    {
      id: 3,
      user_id: 123,
      service_name: 'Shampoo',
      start_time: '10:45 AM',
      end_time: '11:05 AM',
      client_name: 'Bob Wilson',
      barber_name: 'Mike Smith',
      duration_minutes: 20,
      price: 10,
      status: 'confirmed',
      created_at: '2024-01-10T16:00:00Z'
    }
  ]

  let mockOnAppointmentClick: jest.Mock

  beforeEach(() => {
    mockOnAppointmentClick = jest.fn()
  })

  test('should render multiple appointments on same day', () => {
    render(
      <MockCalendarWithSelection
        appointments={crowdedDayAppointments}
        onAppointmentClick={mockOnAppointmentClick}
      />
    )

    expect(screen.getByTestId('appointment-1')).toBeInTheDocument()
    expect(screen.getByTestId('appointment-2')).toBeInTheDocument()
    expect(screen.getByTestId('appointment-3')).toBeInTheDocument()
  })

  test('should handle individual appointment clicks', async () => {
    const user = userEvent.setup()
    
    render(
      <MockCalendarWithSelection
        appointments={crowdedDayAppointments}
        onAppointmentClick={mockOnAppointmentClick}
      />
    )

    // Click on specific appointment
    const appointment2 = screen.getByTestId('appointment-2')
    await user.click(appointment2)

    expect(mockOnAppointmentClick).toHaveBeenCalledWith(crowdedDayAppointments[1])
  })

  test('should handle keyboard navigation for accessibility', async () => {
    const user = userEvent.setup()
    
    render(
      <MockCalendarWithSelection
        appointments={crowdedDayAppointments}
        onAppointmentClick={mockOnAppointmentClick}
      />
    )

    // Focus and activate with Enter key
    const appointment1 = screen.getByTestId('appointment-1')
    appointment1.focus()
    await user.keyboard('{Enter}')

    expect(mockOnAppointmentClick).toHaveBeenCalledWith(crowdedDayAppointments[0])
  })

  test('should handle space key activation', async () => {
    const user = userEvent.setup()
    
    render(
      <MockCalendarWithSelection
        appointments={crowdedDayAppointments}
        onAppointmentClick={mockOnAppointmentClick}
      />
    )

    // Focus and activate with Space key
    const appointment3 = screen.getByTestId('appointment-3')
    appointment3.focus()
    await user.keyboard(' ')

    expect(mockOnAppointmentClick).toHaveBeenCalledWith(crowdedDayAppointments[2])
  })

  test('should apply proper z-index stacking for overlapping appointments', () => {
    render(
      <MockCalendarWithSelection
        appointments={crowdedDayAppointments}
        onAppointmentClick={mockOnAppointmentClick}
      />
    )

    const appointment1 = screen.getByTestId('appointment-1')
    const appointment2 = screen.getByTestId('appointment-2')
    const appointment3 = screen.getByTestId('appointment-3')

    // Initial z-index should be based on order
    expect(appointment1).toHaveStyle('z-index: 10')
    expect(appointment2).toHaveStyle('z-index: 11')
    expect(appointment3).toHaveStyle('z-index: 12')
  })

  test('should increase z-index on hover for better visibility', async () => {
    const user = userEvent.setup()
    
    render(
      <MockCalendarWithSelection
        appointments={crowdedDayAppointments}
        onAppointmentClick={mockOnAppointmentClick}
      />
    )

    const appointment2 = screen.getByTestId('appointment-2')
    
    // Hover over appointment
    await user.hover(appointment2)
    
    await waitFor(() => {
      expect(appointment2).toHaveStyle('z-index: 50')
      expect(appointment2).toHaveClass('hovered')
    })
  })

  test('should reset z-index when hover ends', async () => {
    const user = userEvent.setup()
    
    render(
      <MockCalendarWithSelection
        appointments={crowdedDayAppointments}
        onAppointmentClick={mockOnAppointmentClick}
      />
    )

    const appointment2 = screen.getByTestId('appointment-2')
    
    // Hover and then unhover
    await user.hover(appointment2)
    await user.unhover(appointment2)
    
    await waitFor(() => {
      expect(appointment2).toHaveStyle('z-index: 11') // Back to original
      expect(appointment2).not.toHaveClass('hovered')
    })
  })

  test('should prevent event bubbling on appointment click', async () => {
    const user = userEvent.setup()
    const mockParentClick = jest.fn()
    
    const ParentComponent = () => (
      <div onClick={mockParentClick} data-testid="parent">
        <MockCalendarWithSelection
          appointments={crowdedDayAppointments}
          onAppointmentClick={mockOnAppointmentClick}
        />
      </div>
    )

    render(<ParentComponent />)

    const appointment1 = screen.getByTestId('appointment-1')
    await user.click(appointment1)

    // Appointment click should not bubble to parent
    expect(mockOnAppointmentClick).toHaveBeenCalledWith(crowdedDayAppointments[0])
    expect(mockParentClick).not.toHaveBeenCalled()
  })

  test('should have proper ARIA labels for accessibility', () => {
    render(
      <MockCalendarWithSelection
        appointments={crowdedDayAppointments}
        onAppointmentClick={mockOnAppointmentClick}
      />
    )

    const appointment1 = screen.getByTestId('appointment-1')
    
    expect(appointment1).toHaveAttribute('role', 'button')
    expect(appointment1).toHaveAttribute('tabIndex', '0')
    expect(appointment1).toHaveAttribute('aria-label', 'Appointment: John Doe at 10:00 AM for Haircut')
  })
})

describe('Calendar Day with Many Appointments', () => {
  test('should handle performance with many appointments', () => {
    // Create 20 appointments for stress testing
    const manyAppointments = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      user_id: 123,
      service_name: `Service ${i + 1}`,
      start_time: `${10 + Math.floor(i / 4)}:${(i % 4) * 15} AM`,
      end_time: `${10 + Math.floor(i / 4)}:${((i % 4) * 15) + 15} AM`,
      client_name: `Client ${i + 1}`,
      barber_name: 'Test Barber',
      duration_minutes: 15,
      price: 15,
      status: 'confirmed',
      created_at: '2024-01-10T10:00:00Z'
    }))

    const startTime = performance.now()
    
    render(
      <MockCalendarWithSelection
        appointments={manyAppointments}
        onAppointmentClick={jest.fn()}
      />
    )

    const endTime = performance.now()
    const renderTime = endTime - startTime

    // Should render in reasonable time (less than 100ms)
    expect(renderTime).toBeLessThan(100)
    
    // All appointments should be present
    expect(screen.getByTestId('appointment-1')).toBeInTheDocument()
    expect(screen.getByTestId('appointment-20')).toBeInTheDocument()
  })
})