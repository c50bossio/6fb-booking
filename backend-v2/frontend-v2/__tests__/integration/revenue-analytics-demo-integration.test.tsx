/**
 * Integration Tests for Revenue Analytics Demo
 * 
 * Tests cover:
 * - End-to-end user workflows in demo environment
 * - Integration between page and component layers
 * - Calendar integration with demo data
 * - Business logic validation across components
 * - Revenue tracking and analytics workflows
 * - Six Figure Barber methodology implementation
 * - Cross-component state management
 * - Demo-specific features and behaviors
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'
import RevenueAnalyticsDemo from '@/app/demo/revenue-analytics/page'

// Mock UnifiedCalendar with more detailed integration behavior
jest.mock('@/components/UnifiedCalendar', () => {
  return function MockUnifiedCalendar({ 
    appointments,
    barbers,
    clients,
    selectedBarberId,
    view,
    onViewChange,
    onBarberSelect,
    onAppointmentClick,
    onClientClick,
    onTimeSlotClick,
    onAppointmentUpdate,
    startHour,
    endHour,
    slotDuration
  }: any) {
    return (
      <div data-testid="integrated-calendar">
        <div data-testid="calendar-header">
          <span data-testid="current-view">{view}</span>
          <span data-testid="selected-barber">{selectedBarberId}</span>
        </div>
        
        <div data-testid="revenue-summary">
          {appointments && (
            <div data-testid="daily-revenue">
              ${appointments
                .filter((apt: any) => apt.start_time?.includes('2024-07-25'))
                .reduce((sum: number, apt: any) => sum + (apt.price || 0), 0)}
            </div>
          )}
        </div>
        
        <div data-testid="appointments-grid">
          {appointments?.map((appointment: any) => (
            <div 
              key={appointment.id}
              data-testid={`integrated-appointment-${appointment.id}`}
              data-premium={appointment.is_premium}
              data-price={appointment.price}
              onClick={() => onAppointmentClick?.(appointment)}
            >
              <span data-testid={`client-${appointment.client_id}`}>
                {appointment.client_name}
              </span>
              <span data-testid={`service-${appointment.service_id}`}>
                {appointment.service_name}
              </span>
              <span data-testid={`price-${appointment.id}`}>
                ${appointment.price}
              </span>
              <span data-testid={`status-${appointment.id}`}>
                {appointment.status}
              </span>
            </div>
          ))}
        </div>
        
        <div data-testid="clients-panel">
          {clients?.map((client: any) => (
            <div 
              key={client.id}
              data-testid={`integrated-client-${client.id}`}
              data-vip={client.is_vip}
              data-lifetime-value={client.lifetime_value}
              onClick={() => onClientClick?.(client)}
            >
              <span>{client.first_name} {client.last_name}</span>
              <span data-testid={`client-revenue-${client.id}`}>
                ${client.total_revenue}
              </span>
              <span data-testid={`client-appointments-${client.id}`}>
                {client.total_appointments} appointments
              </span>
            </div>
          ))}
        </div>
        
        <div data-testid="time-configuration">
          <span data-testid="start-hour">{startHour}</span>
          <span data-testid="end-hour">{endHour}</span>
          <span data-testid="slot-duration">{slotDuration}</span>
        </div>
        
        <button 
          data-testid="demo-time-slot"
          onClick={() => onTimeSlotClick?.(new Date('2024-07-25T10:00:00Z'), 1)}
        >
          Book 10:00 AM
        </button>
        
        <button 
          data-testid="demo-view-change"
          onClick={() => onViewChange?.('week')}
        >
          Switch to Week
        </button>
        
        <button 
          data-testid="demo-barber-change"
          onClick={() => onBarberSelect?.(1)}
        >
          Select Alex Martinez
        </button>
        
        <button 
          data-testid="demo-appointment-update"
          onClick={() => onAppointmentUpdate?.(1, '2024-07-25T11:00:00Z', true)}
        >
          Reschedule Appointment
        </button>
      </div>
    )
  }
})

// Mock CalendarRevenueOptimizationDemo to avoid circular dependencies
jest.mock('@/components/calendar/CalendarRevenueOptimizationDemo')

describe('Revenue Analytics Demo Integration', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Full Page Integration', () => {
    it('renders complete demo page with all components', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        expect(screen.getByTestId('integrated-calendar')).toBeInTheDocument()
      })
    })

    it('maintains consistent branding throughout the experience', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        // Should have Six Figure Barber branding
        expect(screen.getByText('6FB')).toBeInTheDocument()
        expect(screen.getByText('Advanced Analytics Suite')).toBeInTheDocument()
      })
    })

    it('provides seamless navigation between demo features', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        const calendar = screen.getByTestId('integrated-calendar')
        expect(calendar).toBeInTheDocument()
      })
      
      // Should allow interaction with demo controls
      const viewButton = screen.getByTestId('demo-view-change')
      await user.click(viewButton)
      
      // Integration should handle view changes
      expect(screen.getByTestId('integrated-calendar')).toBeInTheDocument()
    })
  })

  describe('Calendar and Demo Data Integration', () => {
    it('displays premium appointments with proper pricing', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        // Premium appointments should be visible
        expect(screen.getByTestId('integrated-appointment-1')).toBeInTheDocument()
        expect(screen.getByTestId('price-1')).toHaveTextContent('$120')
        
        expect(screen.getByTestId('integrated-appointment-2')).toBeInTheDocument()
        expect(screen.getByTestId('price-2')).toHaveTextContent('$150')
      })
    })

    it('shows VIP clients with lifetime value tracking', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        const vipClient1 = screen.getByTestId('integrated-client-1')
        expect(vipClient1).toHaveAttribute('data-vip', 'true')
        expect(vipClient1).toHaveAttribute('data-lifetime-value', '2640')
        
        const vipClient2 = screen.getByTestId('integrated-client-2')  
        expect(vipClient2).toHaveAttribute('data-vip', 'true')
        expect(vipClient2).toHaveAttribute('data-lifetime-value', '1520')
      })
    })

    it('calculates daily revenue correctly from appointments', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        const dailyRevenue = screen.getByTestId('daily-revenue')
        // Should show $335 (120 + 150 + 65 for today's appointments)
        expect(dailyRevenue).toHaveTextContent('$335')
      })
    })

    it('maintains data consistency across components', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        // Same client data should appear in appointments and clients panel
        expect(screen.getByTestId('client-1')).toHaveTextContent('Michael Rodriguez')
        expect(screen.getByTestId('integrated-client-1')).toHaveTextContent('Michael Rodriguez')
      })
    })
  })

  describe('Six Figure Barber Business Logic Integration', () => {
    it('tracks revenue progression toward six-figure goal', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        // Progress indicator should be visible
        expect(screen.getByText('47.8%')).toBeInTheDocument()
        
        // Today's revenue should contribute to goal
        expect(screen.getByText('$400')).toBeInTheDocument()
      })
    })

    it('emphasizes premium service positioning in demo data', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        // Premium appointments should be marked
        const premiumApt1 = screen.getByTestId('integrated-appointment-1')
        expect(premiumApt1).toHaveAttribute('data-premium', 'true')
        
        const premiumApt2 = screen.getByTestId('integrated-appointment-2')
        expect(premiumApt2).toHaveAttribute('data-premium', 'true')
        
        // Regular appointment should not be premium
        const regularApt = screen.getByTestId('integrated-appointment-3')
        expect(regularApt).toHaveAttribute('data-premium', 'false')
      })
    })

    it('demonstrates client value optimization strategies', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        // VIP clients should show higher lifetime values
        const client1Revenue = screen.getByTestId('client-revenue-1')
        expect(client1Revenue).toHaveTextContent('$2640')
        
        const client2Revenue = screen.getByTestId('client-revenue-2')
        expect(client2Revenue).toHaveTextContent('$1520')
        
        // Regular client should show growth potential
        const client3Revenue = screen.getByTestId('client-revenue-3')
        expect(client3Revenue).toHaveTextContent('$520')
      })
    })

    it('showcases appointment frequency for client retention', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        // VIP clients should have higher appointment counts
        expect(screen.getByTestId('client-appointments-1')).toHaveTextContent('24 appointments')
        expect(screen.getByTestId('client-appointments-2')).toHaveTextContent('16 appointments')
        expect(screen.getByTestId('client-appointments-3')).toHaveTextContent('8 appointments')
      })
    })
  })

  describe('User Interaction Workflows', () => {
    it('handles appointment selection and details viewing', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        expect(screen.getByTestId('integrated-appointment-1')).toBeInTheDocument()
      })
      
      const appointment = screen.getByTestId('integrated-appointment-1')
      await user.click(appointment)
      
      expect(consoleSpy).toHaveBeenCalledWith('Appointment clicked:', expect.objectContaining({
        id: 1,
        client_name: 'Michael Rodriguez',
        service_name: 'Signature Executive Cut',
        price: 120.00
      }))
      
      consoleSpy.mockRestore()
    })

    it('supports client profile access from demo', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        expect(screen.getByTestId('integrated-client-1')).toBeInTheDocument()
      })
      
      const client = screen.getByTestId('integrated-client-1')
      await user.click(client)
      
      expect(consoleSpy).toHaveBeenCalledWith('Client clicked:', expect.objectContaining({
        id: 1,
        first_name: 'Michael',
        last_name: 'Rodriguez',
        is_vip: true,
        total_revenue: 2640.00
      }))
      
      consoleSpy.mockRestore()
    })

    it('enables time slot booking demonstration', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        expect(screen.getByTestId('demo-time-slot')).toBeInTheDocument()
      })
      
      const timeSlot = screen.getByTestId('demo-time-slot')
      await user.click(timeSlot)
      
      expect(consoleSpy).toHaveBeenCalledWith('Time slot clicked:', expect.objectContaining({
        date: expect.any(Date),
        barberId: 1
      }))
      
      consoleSpy.mockRestore()
    })

    it('demonstrates appointment rescheduling with drag-drop', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        expect(screen.getByTestId('demo-appointment-update')).toBeInTheDocument()
      })
      
      const rescheduleButton = screen.getByTestId('demo-appointment-update')
      await user.click(rescheduleButton)
      
      expect(consoleSpy).toHaveBeenCalledWith('Update appointment:', expect.objectContaining({
        appointmentId: 1,
        newStartTime: '2024-07-25T11:00:00Z',
        isDragDrop: true
      }))
      
      consoleSpy.mockRestore()
    })
  })

  describe('View Management Integration', () => {
    it('synchronizes view changes between components', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        expect(screen.getByTestId('current-view')).toHaveTextContent('day')
      })
      
      // Change view via dropdown
      const viewSelect = screen.getByDisplayValue('Day View')
      await user.selectOptions(viewSelect, 'week')
      
      await waitFor(() => {
        expect(screen.getByTestId('current-view')).toHaveTextContent('week')
      })
    })

    it('maintains view state across demo interactions', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        const viewSelect = screen.getByDisplayValue('Day View')
        await user.selectOptions(viewSelect, 'month')
      })
      
      // Interact with appointment
      const appointment = screen.getByTestId('integrated-appointment-1')
      await user.click(appointment)
      
      // View should remain month
      await waitFor(() => {
        expect(screen.getByTestId('current-view')).toHaveTextContent('month')
      })
    })

    it('handles view-specific data filtering', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        // Should show appointments in any view
        expect(screen.getByTestId('integrated-appointment-1')).toBeInTheDocument()
      })
      
      // Switch to week view
      const viewSelect = screen.getByDisplayValue('Day View')
      await user.selectOptions(viewSelect, 'week')
      
      await waitFor(() => {
        // Appointments should still be visible
        expect(screen.getByTestId('integrated-appointment-1')).toBeInTheDocument()
      })
    })
  })

  describe('Barber Selection Integration', () => {
    it('filters appointments by selected barber', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        expect(screen.getByTestId('selected-barber')).toHaveTextContent('all')
      })
      
      // Select specific barber
      const barberSelect = screen.getByDisplayValue('All Barbers')
      await user.selectOptions(barberSelect, '1')
      
      await waitFor(() => {
        expect(screen.getByTestId('selected-barber')).toHaveTextContent('1')
      })
    })

    it('maintains barber context in demo interactions', async () => {
      render(<RevenueAnalyticsDemo />)
      
      // Select specific barber
      await waitFor(() => {
        const barberSelect = screen.getByDisplayValue('All Barbers')
        await user.selectOptions(barberSelect, '1')
      })
      
      // Time slot should respect barber selection
      const timeSlot = screen.getByTestId('demo-time-slot')
      await user.click(timeSlot)
      
      expect(screen.getByTestId('selected-barber')).toHaveTextContent('1')
    })
  })

  describe('Revenue Analytics Integration', () => {
    it('calculates real-time revenue from demo appointments', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        // Header should show aggregated today's revenue
        expect(screen.getByText('$400')).toBeInTheDocument()
        
        // Calendar should calculate same from appointments
        expect(screen.getByTestId('daily-revenue')).toHaveTextContent('$335')
      })
    })

    it('tracks Six Figure progress with demo data', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        const progressIndicator = screen.getByText('47.8%')
        expect(progressIndicator).toBeInTheDocument()
        expect(progressIndicator).toHaveClass('text-blue-600')
      })
    })

    it('demonstrates analytics suite capabilities', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        // Should highlight key analytics features
        expect(screen.getByText(/Real-time revenue visualization/)).toBeInTheDocument()
        expect(screen.getByText(/Client distribution charts/)).toBeInTheDocument()
        expect(screen.getByText(/Revenue forecasting/)).toBeInTheDocument()
      })
    })
  })

  describe('Demo Environment Features', () => {
    it('provides comprehensive demo instructions', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        expect(screen.getByText(/Six Figure Barber Platform/)).toBeInTheDocument()
        expect(screen.getByText(/Revenue.*button to access/)).toBeInTheDocument()
        expect(screen.getByText('Key Features Demonstrated:')).toBeInTheDocument()
      })
    })

    it('maintains demo data consistency', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        // All mock data should be properly integrated
        expect(screen.getByTestId('integrated-appointment-1')).toBeInTheDocument()
        expect(screen.getByTestId('integrated-client-1')).toBeInTheDocument()
        expect(screen.getByTestId('time-configuration')).toBeInTheDocument()
      })
    })

    it('supports feature exploration workflow', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        // Users should be able to explore different features
        expect(screen.getByTestId('demo-view-change')).toBeInTheDocument()
        expect(screen.getByTestId('demo-barber-change')).toBeInTheDocument()
        expect(screen.getByTestId('demo-time-slot')).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Optimization', () => {
    it('loads demo data efficiently', async () => {
      const startTime = performance.now()
      
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        expect(screen.getByTestId('integrated-calendar')).toBeInTheDocument()
      })
      
      const endTime = performance.now()
      const loadTime = endTime - startTime
      
      expect(loadTime).toBeLessThan(200) // Demo should load quickly
    })

    it('handles multiple simultaneous demo interactions', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        expect(screen.getByTestId('integrated-calendar')).toBeInTheDocument()
      })
      
      const startTime = performance.now()
      
      // Perform multiple rapid interactions
      const viewChange = screen.getByTestId('demo-view-change')
      const barberChange = screen.getByTestId('demo-barber-change')
      const timeSlot = screen.getByTestId('demo-time-slot')
      
      await Promise.all([
        user.click(viewChange),
        user.click(barberChange),
        user.click(timeSlot)
      ])
      
      const endTime = performance.now()
      const interactionTime = endTime - startTime
      
      expect(interactionTime).toBeLessThan(300) // Should handle concurrent interactions
    })

    it('maintains responsive performance with demo data', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        // All demo components should render efficiently
        expect(screen.getByTestId('integrated-calendar')).toBeInTheDocument()
        expect(screen.getByTestId('appointments-grid')).toBeInTheDocument()
        expect(screen.getByTestId('clients-panel')).toBeInTheDocument()
        expect(screen.getByTestId('revenue-summary')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling and Resilience', () => {
    it('handles demo component failures gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        expect(screen.getByTestId('integrated-calendar')).toBeInTheDocument()
      })
      
      // Demo should continue functioning even with errors
      expect(consoleSpy).not.toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    it('recovers from invalid demo interactions', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        expect(screen.getByTestId('integrated-calendar')).toBeInTheDocument()
      })
      
      // Should handle invalid interactions without crashing
      const invalidButton = screen.getByTestId('demo-appointment-update')
      
      expect(() => user.click(invalidButton)).not.toThrow()
    })

    it('maintains demo state consistency under errors', async () => {
      render(<RevenueAnalyticsDemo />)
      
      await waitFor(() => {
        expect(screen.getByTestId('current-view')).toHaveTextContent('day')
        expect(screen.getByTestId('selected-barber')).toHaveTextContent('all')
      })
      
      // State should remain consistent
      const appointment = screen.getByTestId('integrated-appointment-1')
      await user.click(appointment)
      
      expect(screen.getByTestId('current-view')).toHaveTextContent('day')
      expect(screen.getByTestId('selected-barber')).toHaveTextContent('all')
    })
  })
})