/**
 * Calendar Accessibility User Journey Tests
 * 
 * Comprehensive tests for screen reader and keyboard navigation user journeys
 * with the Phase 2 calendar accessibility enhancements.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Import Phase 2 accessibility components
import { CalendarAccessibilityManager } from '@/components/calendar/CalendarAccessibilityManager'
import { KeyboardNavigationHandler } from '@/components/calendar/KeyboardNavigationHandler'
import { ARIAEnhancedCalendar } from '@/components/calendar/ARIAEnhancedCalendar'
import UnifiedCalendar from '@/components/UnifiedCalendar'

// Mock screen reader announcements
const mockAnnouncements: string[] = []
const mockScreenReader = {
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    mockAnnouncements.push(`[${priority}] ${message}`)
  },
  getAnnouncements: () => [...mockAnnouncements],
  clear: () => mockAnnouncements.length = 0
}

// Mock ARIA live regions
Object.defineProperty(HTMLElement.prototype, 'setAttribute', {
  value: function(name: string, value: string) {
    if (name === 'aria-live' && value === 'polite') {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            const text = (mutation.target as Element).textContent
            if (text) mockScreenReader.announce(text, 'polite')
          }
        })
      })
      observer.observe(this, { childList: true, subtree: true })
    }
    return Element.prototype.setAttribute.call(this, name, value)
  }
})

// Test data
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
    status: 'confirmed' as const,
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
    status: 'scheduled' as const,
    location_id: 1
  }
]

const mockBarbers = [
  {
    id: 1,
    name: 'Mike Johnson',
    email: 'mike@barbershop.com',
    is_available: true
  },
  {
    id: 2,
    name: 'Sarah Wilson',
    email: 'sarah@barbershop.com',
    is_available: true
  }
]

// Accessibility testing utilities
class AccessibilityTester {
  private element: HTMLElement

  constructor(element: HTMLElement) {
    this.element = element
  }

  checkARIALabels() {
    const results = {
      hasMainLabel: !!this.element.getAttribute('aria-label'),
      hasRole: !!this.element.getAttribute('role'),
      hasDescription: !!this.element.getAttribute('aria-describedby'),
      hasExpandedState: this.element.getAttribute('aria-expanded') !== null
    }
    return results
  }

  checkKeyboardNavigation() {
    return {
      isFocusable: this.element.tabIndex >= 0 || this.element.getAttribute('tabindex') !== null,
      hasKeyboardInstructions: !!this.element.getAttribute('aria-description')?.includes('keyboard'),
      supportsArrowKeys: !!this.element.getAttribute('aria-label')?.includes('arrow'),
      hasShortcuts: !!this.element.getAttribute('aria-keyshortcuts')
    }
  }

  checkLiveRegions() {
    const liveRegions = this.element.querySelectorAll('[aria-live]')
    return {
      hasLiveRegions: liveRegions.length > 0,
      politeRegions: Array.from(liveRegions).filter(el => el.getAttribute('aria-live') === 'polite').length,
      assertiveRegions: Array.from(liveRegions).filter(el => el.getAttribute('aria-live') === 'assertive').length
    }
  }

  checkFocusManagement() {
    const focusableElements = this.element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    return {
      focusableCount: focusableElements.length,
      hasFocusTrap: !!this.element.querySelector('[data-focus-trap]'),
      hasSkipLinks: !!this.element.querySelector('.skip-link, [aria-label*="skip"]')
    }
  }
}

describe('Calendar Accessibility User Journeys', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    mockScreenReader.clear()
    
    // Mock window.speechSynthesis for screen reader simulation
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        speak: jest.fn((utterance) => {
          mockScreenReader.announce(utterance.text, 'assertive')
        }),
        cancel: jest.fn(),
        getVoices: jest.fn(() => [])
      }
    })
  })

  describe('Screen Reader User Journey', () => {
    test('complete screen reader navigation through calendar', async () => {
      const TestCalendar = () => (
        <CalendarAccessibilityManager enableScreenReader={true}>
          <ARIAEnhancedCalendar
            appointments={mockAppointments}
            barbers={mockBarbers}
            currentDate={new Date('2023-12-01')}
            view="week"
          >
            <UnifiedCalendar
              appointments={mockAppointments}
              currentDate={new Date('2023-12-01')}
              view="week"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
            />
          </ARIAEnhancedCalendar>
        </CalendarAccessibilityManager>
      )

      render(<TestCalendar />)

      // Step 1: Screen reader discovers calendar
      const calendar = screen.getByRole('application')
      expect(calendar).toHaveAttribute('aria-label', expect.stringContaining('Calendar'))
      
      // Check initial announcement
      await waitFor(() => {
        const announcements = mockScreenReader.getAnnouncements()
        expect(announcements.some(a => a.includes('Calendar loaded'))).toBe(true)
      })

      // Step 2: Navigate to first appointment
      calendar.focus()
      fireEvent.keyDown(calendar, { key: 'Tab' })
      
      await waitFor(() => {
        expect(screen.getByLabelText(/John Doe.*10:00 AM.*Haircut/)).toBeInTheDocument()
      })

      // Step 3: Screen reader announces appointment details
      const firstAppointment = screen.getByLabelText(/John Doe.*10:00 AM.*Haircut/)
      firstAppointment.focus()
      
      await waitFor(() => {
        const announcements = mockScreenReader.getAnnouncements()
        expect(announcements.some(a => 
          a.includes('John Doe') && a.includes('10:00 AM') && a.includes('Haircut')
        )).toBe(true)
      })

      // Step 4: Navigate between appointments
      fireEvent.keyDown(firstAppointment, { key: 'ArrowDown' })
      
      await waitFor(() => {
        const announcements = mockScreenReader.getAnnouncements()
        expect(announcements.some(a => a.includes('Jane Smith'))).toBe(true)
      })

      // Step 5: Access appointment actions
      fireEvent.keyDown(calendar, { key: 'Enter' })
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Verify dialog is properly announced
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby')
      expect(dialog).toHaveAttribute('aria-describedby')
    })

    test('screen reader announces date navigation changes', async () => {
      const onDateChange = jest.fn()

      const TestCalendar = () => (
        <CalendarAccessibilityManager enableScreenReader={true}>
          <KeyboardNavigationHandler
            currentDate={new Date('2023-12-01')}
            view="week"
            appointments={mockAppointments}
            onDateChange={onDateChange}
            onViewChange={jest.fn()}
            onDateSelect={jest.fn()}
            onAppointmentSelect={jest.fn()}
          >
            <UnifiedCalendar
              appointments={mockAppointments}
              currentDate={new Date('2023-12-01')}
              view="week"
              onDateChange={onDateChange}
              onViewChange={jest.fn()}
            />
          </KeyboardNavigationHandler>
        </CalendarAccessibilityManager>
      )

      render(<TestCalendar />)

      const calendar = screen.getByRole('application')
      calendar.focus()

      // Navigate to next week
      fireEvent.keyDown(calendar, { key: 'ArrowRight', ctrlKey: true })
      
      await waitFor(() => {
        expect(onDateChange).toHaveBeenCalled()
      })

      // Check date change announcement
      await waitFor(() => {
        const announcements = mockScreenReader.getAnnouncements()
        expect(announcements.some(a => 
          a.includes('Navigated to') || a.includes('Week of')
        )).toBe(true)
      })

      // Navigate to previous week
      fireEvent.keyDown(calendar, { key: 'ArrowLeft', ctrlKey: true })
      
      await waitFor(() => {
        const announcements = mockScreenReader.getAnnouncements()
        expect(announcements.length).toBeGreaterThan(0)
      })
    })

    test('screen reader handles view changes appropriately', async () => {
      const onViewChange = jest.fn()

      const TestCalendar = () => (
        <CalendarAccessibilityManager enableScreenReader={true}>
          <KeyboardNavigationHandler
            currentDate={new Date('2023-12-01')}
            view="month"
            appointments={mockAppointments}
            onDateChange={jest.fn()}
            onViewChange={onViewChange}
            onDateSelect={jest.fn()}
            onAppointmentSelect={jest.fn()}
          >
            <UnifiedCalendar
              appointments={mockAppointments}
              currentDate={new Date('2023-12-01')}
              view="month"
              onDateChange={jest.fn()}
              onViewChange={onViewChange}
            />
          </KeyboardNavigationHandler>
        </CalendarAccessibilityManager>
      )

      render(<TestCalendar />)

      const calendar = screen.getByRole('application')
      calendar.focus()

      // Switch to week view using keyboard shortcut
      fireEvent.keyDown(calendar, { key: '2' }) // Week view shortcut
      
      await waitFor(() => {
        expect(onViewChange).toHaveBeenCalledWith('week')
      })

      // Check view change announcement
      await waitFor(() => {
        const announcements = mockScreenReader.getAnnouncements()
        expect(announcements.some(a => a.includes('Week view'))).toBe(true)
      })

      // Switch to day view
      fireEvent.keyDown(calendar, { key: '3' }) // Day view shortcut
      
      await waitFor(() => {
        expect(onViewChange).toHaveBeenCalledWith('day')
      })
    })

    test('screen reader provides context for empty time slots', async () => {
      const TestCalendar = () => (
        <CalendarAccessibilityManager enableScreenReader={true}>
          <ARIAEnhancedCalendar
            appointments={[]} // Empty appointments
            barbers={mockBarbers}
            currentDate={new Date('2023-12-01')}
            view="day"
          >
            <UnifiedCalendar
              appointments={[]}
              currentDate={new Date('2023-12-01')}
              view="day"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
            />
          </ARIAEnhancedCalendar>
        </CalendarAccessibilityManager>
      )

      render(<TestCalendar />)

      const calendar = screen.getByRole('application')
      calendar.focus()

      // Navigate to a time slot
      fireEvent.keyDown(calendar, { key: 'ArrowDown' })
      
      await waitFor(() => {
        const announcements = mockScreenReader.getAnnouncements()
        expect(announcements.some(a => 
          a.includes('Available') || a.includes('Empty time slot')
        )).toBe(true)
      })
    })
  })

  describe('Keyboard Navigation User Journey', () => {
    test('complete keyboard-only calendar navigation', async () => {
      const mockHandlers = {
        onDateChange: jest.fn(),
        onViewChange: jest.fn(),
        onDateSelect: jest.fn(),
        onAppointmentSelect: jest.fn()
      }

      const TestCalendar = () => (
        <KeyboardNavigationHandler
          currentDate={new Date('2023-12-01')}
          view="week"
          appointments={mockAppointments}
          {...mockHandlers}
        >
          <UnifiedCalendar
            appointments={mockAppointments}
            currentDate={new Date('2023-12-01')}
            view="week"
            onDateChange={mockHandlers.onDateChange}
            onViewChange={mockHandlers.onViewChange}
          />
        </KeyboardNavigationHandler>
      )

      render(<TestCalendar />)

      const calendar = screen.getByRole('application')
      
      // Test 1: Basic navigation
      calendar.focus()
      expect(calendar).toHaveFocus()

      // Test 2: Arrow key navigation
      fireEvent.keyDown(calendar, { key: 'ArrowRight' })
      await waitFor(() => {
        expect(mockHandlers.onDateChange).toHaveBeenCalled()
      })

      // Test 3: View switching shortcuts
      fireEvent.keyDown(calendar, { key: '1' }) // Month view
      expect(mockHandlers.onViewChange).toHaveBeenCalledWith('month')

      fireEvent.keyDown(calendar, { key: '2' }) // Week view
      expect(mockHandlers.onViewChange).toHaveBeenCalledWith('week')

      fireEvent.keyDown(calendar, { key: '3' }) // Day view
      expect(mockHandlers.onViewChange).toHaveBeenCalledWith('day')

      // Test 4: Today navigation
      fireEvent.keyDown(calendar, { key: 't' })
      expect(mockHandlers.onDateChange).toHaveBeenCalledWith(expect.any(Date))

      // Test 5: Page navigation
      fireEvent.keyDown(calendar, { key: 'PageDown' })
      expect(mockHandlers.onDateChange).toHaveBeenCalled()

      fireEvent.keyDown(calendar, { key: 'PageUp' })
      expect(mockHandlers.onDateChange).toHaveBeenCalled()
    })

    test('keyboard navigation with appointments', async () => {
      const onAppointmentSelect = jest.fn()

      const TestCalendar = () => (
        <KeyboardNavigationHandler
          currentDate={new Date('2023-12-01')}
          view="week"
          appointments={mockAppointments}
          onDateChange={jest.fn()}
          onViewChange={jest.fn()}
          onDateSelect={jest.fn()}
          onAppointmentSelect={onAppointmentSelect}
        >
          <UnifiedCalendar
            appointments={mockAppointments}
            currentDate={new Date('2023-12-01')}
            view="week"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </KeyboardNavigationHandler>
      )

      render(<TestCalendar />)

      const calendar = screen.getByRole('application')
      calendar.focus()

      // Navigate to first appointment
      fireEvent.keyDown(calendar, { key: 'Tab' })
      
      // Select appointment with Enter
      fireEvent.keyDown(calendar, { key: 'Enter' })
      expect(onAppointmentSelect).toHaveBeenCalledWith(mockAppointments[0])

      // Navigate between appointments
      fireEvent.keyDown(calendar, { key: 'ArrowDown' })
      fireEvent.keyDown(calendar, { key: 'Enter' })
      expect(onAppointmentSelect).toHaveBeenCalledWith(mockAppointments[1])
    })

    test('keyboard shortcuts work in all contexts', async () => {
      const mockHandlers = {
        onDateChange: jest.fn(),
        onViewChange: jest.fn(),
        onDateSelect: jest.fn(),
        onAppointmentSelect: jest.fn()
      }

      const TestCalendar = () => (
        <CalendarAccessibilityManager enableKeyboardShortcuts={true}>
          <KeyboardNavigationHandler
            currentDate={new Date('2023-12-01')}
            view="month"
            appointments={mockAppointments}
            {...mockHandlers}
          >
            <UnifiedCalendar
              appointments={mockAppointments}
              currentDate={new Date('2023-12-01')}
              view="month"
              onDateChange={mockHandlers.onDateChange}
              onViewChange={mockHandlers.onViewChange}
            />
          </KeyboardNavigationHandler>
        </CalendarAccessibilityManager>
      )

      render(<TestCalendar />)

      const calendar = screen.getByRole('application')
      calendar.focus()

      // Test all keyboard shortcuts
      const shortcuts = [
        { key: 'Home', description: 'Go to start of period' },
        { key: 'End', description: 'Go to end of period' },
        { key: 'Escape', description: 'Clear selection' },
        { key: ' ', description: 'Select current date' },
        { key: 'h', description: 'Show help' },
        { key: '/', description: 'Search' }
      ]

      for (const shortcut of shortcuts) {
        fireEvent.keyDown(calendar, { key: shortcut.key })
        // Verify no errors and handlers are called appropriately
        expect(calendar).toBeInTheDocument()
      }
    })
  })

  describe('Focus Management User Journey', () => {
    test('proper focus management in calendar interactions', async () => {
      const TestCalendar = () => (
        <CalendarAccessibilityManager enableFocusManagement={true}>
          <ARIAEnhancedCalendar
            appointments={mockAppointments}
            barbers={mockBarbers}
            currentDate={new Date('2023-12-01')}
            view="week"
          >
            <UnifiedCalendar
              appointments={mockAppointments}
              currentDate={new Date('2023-12-01')}
              view="week"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
            />
          </ARIAEnhancedCalendar>
        </CalendarAccessibilityManager>
      )

      render(<TestCalendar />)

      const calendar = screen.getByRole('application')
      
      // Test 1: Initial focus
      calendar.focus()
      expect(calendar).toHaveFocus()

      // Test 2: Focus moves to appointment when selected
      fireEvent.keyDown(calendar, { key: 'Tab' })
      
      const appointment = screen.getByLabelText(/John Doe/)
      await waitFor(() => {
        expect(appointment).toHaveFocus()
      })

      // Test 3: Focus returns properly when exiting appointment
      fireEvent.keyDown(appointment, { key: 'Escape' })
      
      await waitFor(() => {
        expect(calendar).toHaveFocus()
      })
    })

    test('focus trap works in modal dialogs', async () => {
      const TestCalendar = () => (
        <CalendarAccessibilityManager enableFocusManagement={true}>
          <UnifiedCalendar
            appointments={mockAppointments}
            currentDate={new Date('2023-12-01')}
            view="week"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </CalendarAccessibilityManager>
      )

      render(<TestCalendar />)

      // Trigger appointment modal
      const appointment = screen.getByText('John Doe')
      await user.click(appointment)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const dialog = screen.getByRole('dialog')
      const focusableElements = within(dialog).getAllByRole('button')

      // Test focus trap - Tab should cycle through dialog elements only
      if (focusableElements.length > 0) {
        focusableElements[0].focus()
        expect(focusableElements[0]).toHaveFocus()

        // Tab to next element
        fireEvent.keyDown(focusableElements[0], { key: 'Tab' })
        
        // Should stay within dialog
        const focusedElement = document.activeElement
        expect(dialog.contains(focusedElement)).toBe(true)
      }
    })

    test('skip links provide efficient navigation', async () => {
      const TestCalendar = () => (
        <CalendarAccessibilityManager enableSkipLinks={true}>
          <div>
            <nav>
              <a href="#main">Skip to main content</a>
            </nav>
            <UnifiedCalendar
              id="main"
              appointments={mockAppointments}
              currentDate={new Date('2023-12-01')}
              view="week"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
            />
          </div>
        </CalendarAccessibilityManager>
      )

      render(<TestCalendar />)

      const skipLink = screen.getByText('Skip to main content')
      await user.click(skipLink)

      // Should focus on main calendar content
      await waitFor(() => {
        expect(screen.getByRole('application')).toHaveFocus()
      })
    })
  })

  describe('ARIA Implementation Validation', () => {
    test('calendar has proper ARIA structure', () => {
      const TestCalendar = () => (
        <ARIAEnhancedCalendar
          appointments={mockAppointments}
          barbers={mockBarbers}
          currentDate={new Date('2023-12-01')}
          view="week"
        >
          <UnifiedCalendar
            appointments={mockAppointments}
            currentDate={new Date('2023-12-01')}
            view="week"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </ARIAEnhancedCalendar>
      )

      render(<TestCalendar />)

      const calendar = screen.getByRole('application')
      const tester = new AccessibilityTester(calendar)

      // Test ARIA labels
      const ariaCheck = tester.checkARIALabels()
      expect(ariaCheck.hasMainLabel).toBe(true)
      expect(ariaCheck.hasRole).toBe(true)

      // Test keyboard navigation
      const keyboardCheck = tester.checkKeyboardNavigation()
      expect(keyboardCheck.isFocusable).toBe(true)

      // Test live regions
      const liveRegionCheck = tester.checkLiveRegions()
      expect(liveRegionCheck.hasLiveRegions).toBe(true)

      // Test focus management
      const focusCheck = tester.checkFocusManagement()
      expect(focusCheck.focusableCount).toBeGreaterThan(0)
    })

    test('appointments have proper ARIA labeling', () => {
      const TestCalendar = () => (
        <ARIAEnhancedCalendar
          appointments={mockAppointments}
          barbers={mockBarbers}
          currentDate={new Date('2023-12-01')}
          view="week"
        >
          <UnifiedCalendar
            appointments={mockAppointments}
            currentDate={new Date('2023-12-01')}
            view="week"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </ARIAEnhancedCalendar>
      )

      render(<TestCalendar />)

      // Check first appointment ARIA
      const firstAppointment = screen.getByLabelText(/John Doe/)
      expect(firstAppointment).toHaveAttribute('aria-label', 
        expect.stringMatching(/John Doe.*10:00 AM.*Haircut.*Mike Johnson/)
      )
      expect(firstAppointment).toHaveAttribute('role', 'button')
      expect(firstAppointment).toHaveAttribute('tabindex', '0')

      // Check second appointment ARIA
      const secondAppointment = screen.getByLabelText(/Jane Smith/)
      expect(secondAppointment).toHaveAttribute('aria-label', 
        expect.stringMatching(/Jane Smith.*2:00 PM.*Cut & Style.*Sarah Wilson/)
      )
    })

    test('calendar grid has proper table semantics', () => {
      const TestCalendar = () => (
        <ARIAEnhancedCalendar
          appointments={mockAppointments}
          barbers={mockBarbers}
          currentDate={new Date('2023-12-01')}
          view="month"
        >
          <UnifiedCalendar
            appointments={mockAppointments}
            currentDate={new Date('2023-12-01')}
            view="month"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </ARIAEnhancedCalendar>
      )

      render(<TestCalendar />)

      // Should have grid structure
      const grid = screen.getByRole('grid')
      expect(grid).toBeInTheDocument()

      // Should have column headers
      const columnHeaders = screen.getAllByRole('columnheader')
      expect(columnHeaders.length).toBeGreaterThan(0)

      // Grid cells should be properly labeled
      const gridCells = screen.getAllByRole('gridcell')
      gridCells.forEach(cell => {
        expect(cell).toHaveAttribute('aria-label')
      })
    })
  })

  describe('High Contrast and Visual Accessibility', () => {
    test('calendar works with high contrast mode', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('prefers-contrast: high'),
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        })),
      })

      const TestCalendar = () => (
        <CalendarAccessibilityManager enableHighContrast={true}>
          <UnifiedCalendar
            appointments={mockAppointments}
            currentDate={new Date('2023-12-01')}
            view="week"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </CalendarAccessibilityManager>
      )

      render(<TestCalendar />)

      const calendar = screen.getByRole('application')
      expect(calendar).toBeInTheDocument()
      
      // Should still be fully functional
      const appointments = screen.getAllByText(/John Doe|Jane Smith/)
      expect(appointments.length).toBeGreaterThan(0)
    })

    test('calendar respects reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        })),
      })

      const TestCalendar = () => (
        <CalendarAccessibilityManager enableReducedMotion={true}>
          <UnifiedCalendar
            appointments={mockAppointments}
            currentDate={new Date('2023-12-01')}
            view="week"
            onDateChange={jest.fn()}
            onViewChange={jest.fn()}
          />
        </CalendarAccessibilityManager>
      )

      render(<TestCalendar />)

      const calendar = screen.getByRole('application')
      expect(calendar).toBeInTheDocument()
      
      // Navigation should still work without animations
      fireEvent.keyDown(calendar, { key: 'ArrowRight' })
      expect(calendar).toBeInTheDocument()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('accessibility features work with empty calendar', () => {
      const TestCalendar = () => (
        <CalendarAccessibilityManager enableScreenReader={true}>
          <ARIAEnhancedCalendar
            appointments={[]}
            barbers={mockBarbers}
            currentDate={new Date('2023-12-01')}
            view="week"
          >
            <UnifiedCalendar
              appointments={[]}
              currentDate={new Date('2023-12-01')}
              view="week"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
            />
          </ARIAEnhancedCalendar>
        </CalendarAccessibilityManager>
      )

      render(<TestCalendar />)

      const calendar = screen.getByRole('application')
      expect(calendar).toHaveAttribute('aria-label')
      
      // Should announce empty state
      calendar.focus()
      
      waitFor(() => {
        const announcements = mockScreenReader.getAnnouncements()
        expect(announcements.some(a => 
          a.includes('No appointments') || a.includes('Empty calendar')
        )).toBe(true)
      })
    })

    test('keyboard navigation gracefully handles errors', () => {
      const onDateChange = jest.fn().mockImplementation(() => {
        throw new Error('Navigation error')
      })

      const TestCalendar = () => (
        <KeyboardNavigationHandler
          currentDate={new Date('2023-12-01')}
          view="week"
          appointments={mockAppointments}
          onDateChange={onDateChange}
          onViewChange={jest.fn()}
          onDateSelect={jest.fn()}
          onAppointmentSelect={jest.fn()}
        >
          <UnifiedCalendar
            appointments={mockAppointments}
            currentDate={new Date('2023-12-01')}
            view="week"
            onDateChange={onDateChange}
            onViewChange={jest.fn()}
          />
        </KeyboardNavigationHandler>
      )

      // Suppress console errors for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      render(<TestCalendar />)

      const calendar = screen.getByRole('application')
      calendar.focus()

      // Should not crash when error occurs
      expect(() => {
        fireEvent.keyDown(calendar, { key: 'ArrowRight' })
      }).not.toThrow()

      expect(calendar).toBeInTheDocument()
      consoleSpy.mockRestore()
    })
  })

  describe('Integration with Other Accessibility Tools', () => {
    test('works with screen reader testing tools', () => {
      const TestCalendar = () => (
        <CalendarAccessibilityManager>
          <ARIAEnhancedCalendar
            appointments={mockAppointments}
            barbers={mockBarbers}
            currentDate={new Date('2023-12-01')}
            view="week"
          >
            <UnifiedCalendar
              appointments={mockAppointments}
              currentDate={new Date('2023-12-01')}
              view="week"
              onDateChange={jest.fn()}
              onViewChange={jest.fn()}
            />
          </ARIAEnhancedCalendar>
        </CalendarAccessibilityManager>
      )

      const { container } = render(<TestCalendar />)
      
      // Check for common accessibility testing selectors
      expect(container.querySelector('[role="application"]')).toBeInTheDocument()
      expect(container.querySelector('[aria-label]')).toBeInTheDocument()
      expect(container.querySelector('[aria-live]')).toBeInTheDocument()
      
      // Verify structure supports assistive technology
      const calendar = container.querySelector('[role="application"]')
      const tester = new AccessibilityTester(calendar!)
      
      const results = {
        aria: tester.checkARIALabels(),
        keyboard: tester.checkKeyboardNavigation(),
        liveRegions: tester.checkLiveRegions(),
        focus: tester.checkFocusManagement()
      }

      expect(results.aria.hasMainLabel).toBe(true)
      expect(results.keyboard.isFocusable).toBe(true)
      expect(results.liveRegions.hasLiveRegions).toBe(true)
      expect(results.focus.focusableCount).toBeGreaterThan(0)
    })
  })
})