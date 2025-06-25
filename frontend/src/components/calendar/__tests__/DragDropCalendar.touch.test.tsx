import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import DragDropCalendar from '../DragDropCalendar'
import { CalendarAppointment } from '../PremiumCalendar'

// Mock the PremiumCalendar component since it's complex
jest.mock('../PremiumCalendar', () => {
  return {
    __esModule: true,
    default: ({ appointments, ...props }: any) => (
      <div data-testid="premium-calendar">
        {appointments.map((appointment: CalendarAppointment) => {
          const dragProps = appointment.__dragProps
          return (
            <div
              key={appointment.id}
              data-testid={`appointment-${appointment.id}`}
              onMouseDown={dragProps?.onMouseDown}
              onTouchStart={dragProps?.onTouchStart}
              style={{
                ...dragProps?.style,
                touchAction: dragProps?.style?.touchAction,
                cursor: dragProps?.style?.cursor,
                userSelect: dragProps?.style?.userSelect
              }}
            >
              {appointment.client} - {appointment.service}
            </div>
          )
        })}
      </div>
    ),
  }
})

// Mock the AppointmentMoveConfirmation modal
jest.mock('../../modals/AppointmentMoveConfirmation', () => {
  return {
    __esModule: true,
    default: ({ isOpen, onClose }: any) =>
      isOpen ? <div data-testid="move-confirmation-modal">Move Confirmation</div> : null,
  }
})

describe('DragDropCalendar Touch Events', () => {
  const mockAppointments: CalendarAppointment[] = [
    {
      id: '1',
      client: 'John Doe',
      clientPhone: '555-0123',
      clientEmail: 'john@example.com',
      service: 'Haircut',
      barber: 'Jane Smith',
      barberId: 'barber-1',
      date: '2025-06-25',
      startTime: '10:00',
      endTime: '11:00',
      duration: 60,
      price: 50,
      status: 'confirmed'
    }
  ]

  it('adds touch event handlers to appointments when drag and drop is enabled', () => {
    render(
      <DragDropCalendar
        appointments={mockAppointments}
        enableDragDrop={true}
        currentDate={new Date('2025-06-25')}
        workingHours={{ start: '09:00', end: '17:00' }}
      />
    )

    const appointment = screen.getByTestId('appointment-1')
    expect(appointment).toBeInTheDocument()

    // Check that the appointment has the correct styles
    const styles = getComputedStyle(appointment)
    expect(appointment.style.touchAction).toBe('none')
    expect(appointment.style.cursor).toBe('grab')
    expect(appointment.style.userSelect).toBe('none')
  })

  it('does not add touch event handlers when drag and drop is disabled', () => {
    render(
      <DragDropCalendar
        appointments={mockAppointments}
        enableDragDrop={false}
        currentDate={new Date('2025-06-25')}
        workingHours={{ start: '09:00', end: '17:00' }}
      />
    )

    const appointment = screen.getByTestId('appointment-1')
    expect(appointment).toBeInTheDocument()

    // Should not have drag-related styles when disabled
    expect(appointment).not.toHaveStyle('touch-action: none')
  })

  it('renders without crashing when appointments array is empty', () => {
    render(
      <DragDropCalendar
        appointments={[]}
        enableDragDrop={true}
        currentDate={new Date('2025-06-25')}
        workingHours={{ start: '09:00', end: '17:00' }}
      />
    )

    expect(screen.getByTestId('premium-calendar')).toBeInTheDocument()
  })
})
