import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Calendar } from '@/components/ui/calendar'
import { format, addDays } from 'date-fns'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

describe('Calendar Accessibility Tests', () => {
  const mockOnSelect = jest.fn()
  const mockOnTimeSlotClick = jest.fn()
  const today = new Date()
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('WCAG Compliance', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <Calendar
          mode="single"
          selected={today}
          onSelect={mockOnSelect}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper ARIA roles', () => {
      render(
        <Calendar
          mode="single"
          selected={today}
          onSelect={mockOnSelect}
        />
      )

      expect(screen.getByRole('application')).toBeInTheDocument()
      expect(screen.getByRole('grid')).toBeInTheDocument()
      expect(screen.getAllByRole('columnheader')).toHaveLength(7)
    })

    it('should have descriptive labels', () => {
      render(
        <Calendar
          mode="single"
          selected={today}
          onSelect={mockOnSelect}
        />
      )

      expect(screen.getByLabelText('Calendar date picker')).toBeInTheDocument()
      expect(screen.getByLabelText(/Go to previous month/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Go to next month/)).toBeInTheDocument()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should navigate dates with arrow keys', async () => {
      const user = userEvent.setup()
      
      render(
        <Calendar
          mode="single"
          selected={today}
          onSelect={mockOnSelect}
        />
      )

      const todayButton = screen.getByRole('button', { name: /today/i })
      await user.click(todayButton)

      // Navigate right
      await user.keyboard('{ArrowRight}')
      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          getDate: expect.any(Function)
        })
      )

      // Navigate down (next week)
      await user.keyboard('{ArrowDown}')
      expect(mockOnSelect).toHaveBeenCalledTimes(2)
    })

    it('should navigate to month boundaries with Home/End', async () => {
      const user = userEvent.setup()
      
      render(
        <Calendar
          mode="single"
          selected={today}
          onSelect={mockOnSelect}
        />
      )

      const todayButton = screen.getByRole('button', { name: /today/i })
      await user.click(todayButton)

      // Go to start of week
      await user.keyboard('{Home}')
      expect(mockOnSelect).toHaveBeenCalled()

      // Go to end of week
      await user.keyboard('{End}')
      expect(mockOnSelect).toHaveBeenCalledTimes(2)
    })

    it('should change months with PageUp/PageDown', async () => {
      const user = userEvent.setup()
      
      render(
        <Calendar
          mode="single"
          selected={today}
          onSelect={mockOnSelect}
        />
      )

      const currentMonth = format(today, 'MMMM yyyy')
      expect(screen.getByText(currentMonth)).toBeInTheDocument()

      // Go to previous month
      await user.keyboard('{PageUp}')
      await waitFor(() => {
        const previousMonth = format(addDays(today, -30), 'MMMM yyyy')
        expect(screen.getByText(previousMonth)).toBeInTheDocument()
      })

      // Go to next month
      await user.keyboard('{PageDown}')
      await user.keyboard('{PageDown}')
      await waitFor(() => {
        const nextMonth = format(addDays(today, 30), 'MMMM yyyy')
        expect(screen.getByText(nextMonth)).toBeInTheDocument()
      })
    })

    it('should open time slot picker with Enter/Space', async () => {
      const user = userEvent.setup()
      
      render(
        <Calendar
          mode="single"
          selected={today}
          onSelect={mockOnSelect}
          onTimeSlotClick={mockOnTimeSlotClick}
        />
      )

      const todayButton = screen.getByRole('button', { name: /today/i })
      await user.click(todayButton)

      // Press Enter
      await user.keyboard('{Enter}')
      expect(mockOnTimeSlotClick).toHaveBeenCalledWith(expect.any(Date))

      // Press Space
      await user.keyboard(' ')
      expect(mockOnTimeSlotClick).toHaveBeenCalledTimes(2)
    })
  })

  describe('Screen Reader Support', () => {
    it('should announce date changes', async () => {
      const user = userEvent.setup()
      
      render(
        <Calendar
          mode="single"
          selected={today}
          onSelect={mockOnSelect}
        />
      )

      // Check for live region
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true')

      const todayButton = screen.getByRole('button', { name: /today/i })
      await user.click(todayButton)

      // Navigate and check announcements
      await user.keyboard('{ArrowRight}')
      await waitFor(() => {
        expect(liveRegion.textContent).toContain(format(addDays(today, 1), 'EEEE, MMMM d, yyyy'))
      })
    })

    it('should provide context for dates with appointments', () => {
      const bookingDate = addDays(today, 3)
      
      render(
        <Calendar
          mode="single"
          selected={today}
          onSelect={mockOnSelect}
        />
      )

      const dateWithAppointments = screen.getByRole('button', { 
        name: new RegExp(`${format(bookingDate, 'EEEE, MMMM d, yyyy')}.+2 appointments`, 'i')
      })
      
      expect(dateWithAppointments).toBeInTheDocument()
    })

    it('should indicate disabled dates', () => {
      const yesterday = addDays(today, -1)
      
      render(
        <Calendar
          mode="single"
          selected={today}
          onSelect={mockOnSelect}
        />
      )

      const yesterdayButton = screen.getByRole('button', { 
        name: new RegExp(`${format(yesterday, 'EEEE, MMMM d, yyyy')}.+Unavailable`, 'i')
      })
      
      expect(yesterdayButton).toBeDisabled()
      expect(yesterdayButton).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('Focus Management', () => {
    it('should maintain focus on keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <Calendar
          mode="single"
          selected={today}
          onSelect={mockOnSelect}
        />
      )

      const todayButton = screen.getByRole('button', { name: /today/i })
      await user.click(todayButton)
      expect(todayButton).toHaveFocus()

      // Navigate and check focus moves
      await user.keyboard('{ArrowRight}')
      const tomorrow = addDays(today, 1)
      const tomorrowButton = screen.getByRole('button', { 
        name: new RegExp(format(tomorrow, 'EEEE, MMMM d, yyyy'), 'i')
      })
      
      await waitFor(() => {
        expect(tomorrowButton).toHaveFocus()
      })
    })

    it('should have logical tab order', async () => {
      const user = userEvent.setup()
      
      render(
        <Calendar
          mode="single"
          selected={today}
          onSelect={mockOnSelect}
        />
      )

      // Tab through interactive elements
      await user.tab()
      expect(screen.getByLabelText(/Go to previous month/)).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/Go to next month/)).toHaveFocus()

      await user.tab()
      // Should focus on selected date or first focusable date
      const focusedElement = document.activeElement
      expect(focusedElement?.tagName).toBe('BUTTON')
      expect(focusedElement).toHaveAttribute('role', 'gridcell')
    })
  })

  describe('Visual Accessibility', () => {
    it('should have sufficient color contrast indicators', () => {
      render(
        <Calendar
          mode="single"
          selected={today}
          onSelect={mockOnSelect}
        />
      )

      // Check legend is present
      expect(screen.getByLabelText('Calendar legend')).toBeInTheDocument()
      expect(screen.getByText('Today')).toBeInTheDocument()
      expect(screen.getByText('Selected')).toBeInTheDocument()
      expect(screen.getByText('Has appointments')).toBeInTheDocument()
    })

    it('should support high contrast mode', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        })),
      })

      const { container } = render(
        <Calendar
          mode="single"
          selected={today}
          onSelect={mockOnSelect}
        />
      )

      // Check for high contrast styles
      const calendar = container.querySelector('[role="application"]')
      expect(calendar).toHaveClass('border-2')
    })
  })

  describe('Mobile Accessibility', () => {
    it('should have adequate touch targets', () => {
      render(
        <Calendar
          mode="single"
          selected={today}
          onSelect={mockOnSelect}
        />
      )

      const dayButtons = screen.getAllByRole('button', { name: /\d{1,2}/ })
      
      dayButtons.forEach(button => {
        const styles = window.getComputedStyle(button)
        // Check minimum size (should be at least 44x44px for touch targets)
        expect(parseInt(styles.minWidth)).toBeGreaterThanOrEqual(44)
        expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(44)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid date navigation gracefully', async () => {
      const user = userEvent.setup()
      const minDate = today
      const maxDate = addDays(today, 30)
      
      render(
        <Calendar
          mode="single"
          selected={today}
          onSelect={mockOnSelect}
          minDate={minDate}
          maxDate={maxDate}
        />
      )

      const todayButton = screen.getByRole('button', { name: /today/i })
      await user.click(todayButton)

      // Try to navigate to past (should be blocked)
      await user.keyboard('{ArrowLeft}')
      
      const liveRegion = screen.getByRole('status')
      await waitFor(() => {
        expect(liveRegion.textContent).toContain('Cannot navigate to dates in the past')
      })
    })
  })

  describe('Internationalization', () => {
    it('should use proper date formatting for screen readers', () => {
      render(
        <Calendar
          mode="single"
          selected={today}
          onSelect={mockOnSelect}
        />
      )

      // Check that full day names are available
      expect(screen.getByLabelText('Sunday')).toBeInTheDocument()
      expect(screen.getByLabelText('Monday')).toBeInTheDocument()
      
      // Check abbreviated names have title attributes
      const sundayAbbr = screen.getByText('Sun')
      expect(sundayAbbr).toHaveAttribute('title', 'Sunday')
    })
  })
})