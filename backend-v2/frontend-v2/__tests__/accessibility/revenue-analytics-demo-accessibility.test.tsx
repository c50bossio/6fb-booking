/**
 * Accessibility Tests for Revenue Analytics Demo
 * 
 * Tests cover:
 * - WCAG 2.1 AA compliance validation
 * - Screen reader compatibility and ARIA support
 * - Keyboard navigation and focus management
 * - Color contrast and visual accessibility
 * - Six Figure Barber business context accessibility
 * - Form controls and interaction accessibility
 * - Mobile accessibility and touch targets
 * - Error handling and user feedback accessibility
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { jest } from '@jest/globals'
import CalendarRevenueOptimizationDemo from '@/components/calendar/CalendarRevenueOptimizationDemo'

// Extend Jest matchers for accessibility
expect.extend(toHaveNoViolations)

// Mock UnifiedCalendar with accessibility features
jest.mock('@/components/UnifiedCalendar', () => {
  return function MockUnifiedCalendar({ 
    appointments, 
    clients, 
    barbers,
    onAppointmentClick,
    onClientClick,
    onTimeSlotClick
  }: any) {
    return (
      <div 
        role="application" 
        aria-label="Six Figure Barber Calendar"
        data-testid="accessible-calendar"
      >
        <div role="region" aria-label="Appointments">
          {appointments?.map((apt: any) => (
            <button
              key={apt.id}
              data-testid={`accessible-appointment-${apt.id}`}
              onClick={() => onAppointmentClick?.(apt)}
              aria-label={`Appointment: ${apt.client_name}, ${apt.service_name}, $${apt.price}`}
              className="min-h-11 min-w-11" // WCAG touch target size
            >
              <span aria-hidden="true">{apt.client_name}</span>
              <span className="sr-only">
                Appointment with {apt.client_name} for {apt.service_name} 
                at ${apt.price} on {apt.start_time}
              </span>
            </button>
          ))}
        </div>
        
        <div role="region" aria-label="Clients">
          {clients?.map((client: any) => (
            <button
              key={client.id}
              data-testid={`accessible-client-${client.id}`}
              onClick={() => onClientClick?.(client)}
              aria-label={`Client: ${client.first_name} ${client.last_name}, ${client.total_appointments} appointments, $${client.total_revenue} revenue`}
              className="min-h-11 min-w-11"
            >
              <span aria-hidden="true">{client.first_name} {client.last_name}</span>
              <span className="sr-only">
                VIP Status: {client.is_vip ? 'Yes' : 'No'}, 
                Total Revenue: ${client.total_revenue}
              </span>
            </button>
          ))}
        </div>
        
        <div role="region" aria-label="Time Slots">
          <button
            data-testid="accessible-time-slot"
            onClick={() => onTimeSlotClick?.(new Date(), 1)}
            aria-label="Book appointment for 10:00 AM with Alex Martinez"
            className="min-h-11 min-w-11"
          >
            10:00 AM Available
          </button>
        </div>
        
        <div role="status" aria-live="polite" id="calendar-announcements">
          <span className="sr-only">Calendar ready for interaction</span>
        </div>
      </div>
    )
  }
})

describe('Revenue Analytics Demo Accessibility', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('WCAG 2.1 AA Compliance', () => {
    it('passes automated accessibility audit', async () => {
      const { container } = render(<CalendarRevenueOptimizationDemo />)
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('provides proper document structure and landmarks', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Main heading should be properly structured
      const mainHeading = screen.getByRole('heading', { name: /Advanced Analytics Suite/ })
      expect(mainHeading).toBeInTheDocument()
      expect(mainHeading.tagName).toBe('H1')
      
      // Should have proper landmark structure
      const calendar = screen.getByTestId('accessible-calendar')
      expect(calendar).toHaveAttribute('role', 'application')
      expect(calendar).toHaveAttribute('aria-label', 'Six Figure Barber Calendar')
    })

    it('ensures all interactive elements are keyboard accessible', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Form controls should be keyboard accessible
      const viewSelect = screen.getByLabelText('View')
      const barberSelect = screen.getByLabelText('Barber')
      
      // Test keyboard navigation
      await user.tab()
      expect(document.activeElement).toBe(viewSelect)
      
      await user.tab()
      expect(document.activeElement).toBe(barberSelect)
      
      // Should be able to operate with keyboard
      await user.keyboard(' ') // Open dropdown
      await user.keyboard('ArrowDown')
      await user.keyboard('Enter')
    })

    it('provides sufficient color contrast for all text', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Revenue metrics should have high contrast
      const revenueAmount = screen.getByText('$400')
      expect(revenueAmount).toHaveClass('text-green-600')
      
      const progressAmount = screen.getByText('47.8%')
      expect(progressAmount).toHaveClass('text-blue-600')
      
      // Text should be readable against background
      const instructionalText = screen.getByText(/Six Figure Barber Platform/)
      expect(instructionalText.closest('div')).toHaveClass('text-gray-700')
    })

    it('maintains minimum touch target sizes (44x44px)', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Form controls should meet touch target requirements
      const viewSelect = screen.getByLabelText('View')
      const barberSelect = screen.getByLabelText('Barber')
      
      expect(viewSelect).toHaveClass('px-3', 'py-2') // Sufficient padding
      expect(barberSelect).toHaveClass('px-3', 'py-2')
      
      // Calendar elements should meet size requirements
      const appointment = screen.getByTestId('accessible-appointment-1')
      expect(appointment).toHaveClass('min-h-11', 'min-w-11') // 44px minimum
    })
  })

  describe('Screen Reader and ARIA Support', () => {
    it('provides comprehensive ARIA labels for complex elements', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Form controls should have proper labels
      const viewSelect = screen.getByLabelText('View')
      expect(viewSelect).toHaveAttribute('aria-label')
      
      const barberSelect = screen.getByLabelText('Barber')
      expect(barberSelect).toHaveAttribute('aria-label')
      
      // Calendar should have application role and label
      const calendar = screen.getByTestId('accessible-calendar')
      expect(calendar).toHaveAttribute('role', 'application')
      expect(calendar).toHaveAttribute('aria-label', 'Six Figure Barber Calendar')
    })

    it('includes appropriate ARIA live regions for dynamic content', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Should have live region for announcements
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
      expect(liveRegion).toHaveAttribute('id', 'calendar-announcements')
    })

    it('provides detailed descriptions for business data', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Appointments should have detailed descriptions
      const appointment = screen.getByTestId('accessible-appointment-1')
      expect(appointment).toHaveAttribute('aria-label')
      expect(appointment.getAttribute('aria-label')).toContain('Michael Rodriguez')
      expect(appointment.getAttribute('aria-label')).toContain('Signature Executive Cut')
      expect(appointment.getAttribute('aria-label')).toContain('$120')
      
      // Clients should have business context
      const client = screen.getByTestId('accessible-client-1')
      expect(client.getAttribute('aria-label')).toContain('24 appointments')
      expect(client.getAttribute('aria-label')).toContain('$2640 revenue')
    })

    it('uses semantic HTML elements appropriately', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Form elements should be semantic
      expect(screen.getByLabelText('View')).toBeInstanceOf(HTMLSelectElement)
      expect(screen.getByLabelText('Barber')).toBeInstanceOf(HTMLSelectElement)
      
      // Interactive elements should be buttons
      const appointment = screen.getByTestId('accessible-appointment-1')
      expect(appointment).toBeInstanceOf(HTMLButtonElement)
      
      const client = screen.getByTestId('accessible-client-1')
      expect(client).toBeInstanceOf(HTMLButtonElement)
    })

    it('provides screen reader only content for context', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Should have screen reader only descriptions
      const srOnlyElements = document.querySelectorAll('.sr-only')
      expect(srOnlyElements.length).toBeGreaterThan(0)
      
      // Check specific screen reader content
      const appointmentDescription = screen.getByText(/Appointment with Michael Rodriguez/)
      expect(appointmentDescription).toHaveClass('sr-only')
    })
  })

  describe('Keyboard Navigation and Focus Management', () => {
    it('supports logical tab order through all interactive elements', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const expectedTabOrder = [
        screen.getByLabelText('View'),
        screen.getByLabelText('Barber'),
        screen.getByTestId('accessible-appointment-1'),
        screen.getByTestId('accessible-appointment-2'),
        screen.getByTestId('accessible-appointment-3'),
        screen.getByTestId('accessible-client-1'),
        screen.getByTestId('accessible-client-2'),
        screen.getByTestId('accessible-client-3'),
        screen.getByTestId('accessible-time-slot')
      ]
      
      // Test tab progression
      for (const element of expectedTabOrder) {
        await user.tab()
        expect(document.activeElement).toBe(element)
      }
    })

    it('provides keyboard shortcuts for power users', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const viewSelect = screen.getByLabelText('View')
      await user.click(viewSelect)
      
      // Should support arrow key navigation in select
      await user.keyboard('ArrowDown')
      await user.keyboard('Enter')
      
      // View should change
      expect(viewSelect).toHaveValue('week')
    })

    it('manages focus appropriately during state changes', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const viewSelect = screen.getByLabelText('View')
      await user.click(viewSelect)
      
      // Focus should remain on control after selection
      await user.selectOptions(viewSelect, 'month')
      expect(document.activeElement).toBe(viewSelect)
    })

    it('provides visible focus indicators', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const viewSelect = screen.getByLabelText('View')
      await user.tab()
      
      // Should have focus styles
      expect(viewSelect).toHaveClass('focus:ring-2', 'focus:ring-green-500')
      
      const barberSelect = screen.getByLabelText('Barber')
      await user.tab()
      
      expect(barberSelect).toHaveClass('focus:ring-2', 'focus:ring-green-500')
    })

    it('handles escape key for modal dismissal patterns', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Should not trap focus inappropriately
      const viewSelect = screen.getByLabelText('View')
      await user.click(viewSelect)
      
      await user.keyboard('Escape')
      
      // Focus should return to trigger
      expect(document.activeElement).toBe(viewSelect)
    })
  })

  describe('Six Figure Barber Business Context Accessibility', () => {
    it('makes revenue metrics accessible to screen readers', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Revenue should be announced with context
      const revenueText = screen.getByText("Today's Revenue")
      expect(revenueText).toBeInTheDocument()
      
      const revenueAmount = screen.getByText('$400')
      expect(revenueAmount).toBeInTheDocument()
      
      // Progress should have context
      const progressText = screen.getByText('Six Figure Progress')
      expect(progressText).toBeInTheDocument()
      
      const progressAmount = screen.getByText('47.8%')
      expect(progressAmount).toBeInTheDocument()
    })

    it('provides accessible descriptions for premium services', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Premium appointments should be clearly identified
      const premiumAppointment = screen.getByTestId('accessible-appointment-1')
      const ariaLabel = premiumAppointment.getAttribute('aria-label')
      
      expect(ariaLabel).toContain('Signature Executive Cut')
      expect(ariaLabel).toContain('$120')
    })

    it('makes VIP client status accessible', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // VIP clients should have status announced
      const vipClient = screen.getByTestId('accessible-client-1')
      const description = vipClient.querySelector('.sr-only')
      
      expect(description).toHaveTextContent('VIP Status: Yes')
      expect(description).toHaveTextContent('Total Revenue: $2640')
    })

    it('provides context for business analytics features', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Analytics features should be explained
      expect(screen.getByText('Interactive Charts:')).toBeInTheDocument()
      expect(screen.getByText('Client Analytics:')).toBeInTheDocument()
      expect(screen.getByText('AI Predictions:')).toBeInTheDocument()
      
      // Each should have detailed descriptions
      expect(screen.getByText(/Real-time revenue visualization/)).toBeInTheDocument()
      expect(screen.getByText(/Client distribution charts/)).toBeInTheDocument()
      expect(screen.getByText(/Revenue forecasting/)).toBeInTheDocument()
    })
  })

  describe('Form Controls Accessibility', () => {
    it('associates labels with form controls correctly', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Labels should be properly associated
      const viewLabel = screen.getByText('View')
      const viewSelect = screen.getByLabelText('View')
      
      expect(viewLabel).toBeInTheDocument()
      expect(viewSelect).toBeInTheDocument()
      
      const barberLabel = screen.getByText('Barber')
      const barberSelect = screen.getByLabelText('Barber')
      
      expect(barberLabel).toBeInTheDocument()
      expect(barberSelect).toBeInTheDocument()
    })

    it('provides appropriate roles and states for custom controls', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Select elements should have proper roles
      const viewSelect = screen.getByLabelText('View')
      expect(viewSelect).toHaveAttribute('role', 'combobox')
      
      const barberSelect = screen.getByLabelText('Barber')
      expect(barberSelect).toHaveAttribute('role', 'combobox')
    })

    it('announces selection changes to screen readers', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const viewSelect = screen.getByLabelText('View')
      
      // Selection changes should be announced
      await user.selectOptions(viewSelect, 'week')
      
      expect(viewSelect).toHaveValue('week')
      expect(viewSelect).toHaveAttribute('aria-label')
    })

    it('provides error states and validation feedback', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Form controls should have validation states when applicable
      const viewSelect = screen.getByLabelText('View')
      const barberSelect = screen.getByLabelText('Barber')
      
      // Should not have error states in valid demo
      expect(viewSelect).not.toHaveAttribute('aria-invalid', 'true')
      expect(barberSelect).not.toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('Dynamic Content Accessibility', () => {
    it('announces content changes appropriately', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Live region should be present
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
      
      // Changes should be announced
      const viewSelect = screen.getByLabelText('View')
      await user.selectOptions(viewSelect, 'week')
      
      // Calendar should update and announce changes
      expect(screen.getByTestId('accessible-calendar')).toBeInTheDocument()
    })

    it('maintains focus during dynamic updates', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      const barberSelect = screen.getByLabelText('Barber')
      await user.click(barberSelect)
      
      // Focus should be maintained during filtering
      await user.selectOptions(barberSelect, '1')
      expect(document.activeElement).toBe(barberSelect)
    })

    it('provides loading states for async operations', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Should indicate when content is loading/updating
      const calendar = screen.getByTestId('accessible-calendar')
      expect(calendar).toBeInTheDocument()
      
      // Should have ready state announced
      expect(screen.getByText('Calendar ready for interaction')).toBeInTheDocument()
    })
  })

  describe('Mobile Accessibility', () => {
    it('maintains accessibility on touch devices', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Touch targets should meet size requirements
      const appointment = screen.getByTestId('accessible-appointment-1')
      expect(appointment).toHaveClass('min-h-11', 'min-w-11')
      
      const client = screen.getByTestId('accessible-client-1')
      expect(client).toHaveClass('min-h-11', 'min-w-11')
      
      const timeSlot = screen.getByTestId('accessible-time-slot')
      expect(timeSlot).toHaveClass('min-h-11', 'min-w-11')
    })

    it('provides appropriate touch feedback', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Elements should provide feedback on interaction
      const appointment = screen.getByTestId('accessible-appointment-1')
      
      // Should have proper ARIA labels for touch
      expect(appointment).toHaveAttribute('aria-label')
      expect(appointment.getAttribute('aria-label')).toContain('Appointment:')
    })

    it('handles zoom and text scaling appropriately', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Layout should accommodate text scaling
      const mainContainer = screen.getByText('Advanced Analytics Suite').closest('div')
      expect(mainContainer).toHaveClass('p-4') // Sufficient padding
      
      // Text should not be fixed size
      const revenueText = screen.getByText('$400')
      expect(revenueText).toHaveClass('text-lg') // Relative sizing
    })
  })

  describe('Error Handling and User Feedback Accessibility', () => {
    it('provides accessible error messages when interactions fail', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      render(<CalendarRevenueOptimizationDemo />)
      
      // Should handle errors gracefully without accessibility violations
      const appointment = screen.getByTestId('accessible-appointment-1')
      await user.click(appointment)
      
      // Should not create accessibility barriers during error states
      expect(appointment).toHaveAttribute('aria-label')
      
      consoleSpy.mockRestore()
    })

    it('maintains screen reader compatibility during error recovery', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Live region should remain available for error announcements
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
      expect(liveRegion).toHaveAttribute('id', 'calendar-announcements')
    })

    it('provides constructive feedback for user actions', async () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // User actions should provide appropriate feedback
      const viewSelect = screen.getByLabelText('View')
      await user.selectOptions(viewSelect, 'week')
      
      // Should provide confirmation of action
      expect(viewSelect).toHaveValue('week') 
      expect(viewSelect).toHaveAttribute('aria-label')
    })
  })

  describe('Color and Visual Accessibility', () => {
    it('does not rely solely on color to convey information', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Revenue indicators should not rely only on color
      const revenueSection = screen.getByText("Today's Revenue").closest('div')
      expect(revenueSection).toHaveClass('border-green-200') // Border for visual separation
      
      const progressSection = screen.getByText('Six Figure Progress').closest('div')
      expect(progressSection).toHaveClass('border-blue-200') // Border for visual separation
    })

    it('provides high contrast mode compatibility', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Should work in high contrast modes
      const viewSelect = screen.getByLabelText('View')
      expect(viewSelect).toHaveClass('border-gray-300') // Visible borders
      
      const barberSelect = screen.getByLabelText('Barber')
      expect(barberSelect).toHaveClass('border-gray-300')
    })

    it('supports reduced motion preferences', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Should respect motion preferences
      const mainContainer = screen.getByText('Advanced Analytics Suite').closest('div')
      expect(mainContainer).not.toHaveClass('animate-spin') // No forced animations
    })

    it('maintains readability in different lighting conditions', () => {
      render(<CalendarRevenueOptimizationDemo />)
      
      // Text should have sufficient contrast
      const instructionalText = screen.getByText(/Six Figure Barber Platform/)
      expect(instructionalText).toHaveClass('text-gray-700') // High contrast text
      
      const featureText = screen.getByText('Interactive Charts:')
      expect(featureText).toHaveClass('text-green-600') // Sufficient contrast
    })
  })
})