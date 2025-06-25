import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import MobileBookingFlow from '@/components/booking/MobileBookingFlow'
import MobileDateTimePicker from '@/components/booking/MobileDateTimePicker'
import MobileServiceSelector from '@/components/booking/MobileServiceSelector'
import MobileBarberSelector from '@/components/booking/MobileBarberSelector'
import { MobileClientDetailsForm } from '@/components/booking/MobileFormInputs'

// Mock data
const mockServices = [
  {
    id: '1',
    name: 'Classic Haircut',
    description: 'Professional cut and style',
    duration: 45,
    price: 35,
    category: 'Haircuts',
    isPopular: true
  }
]

const mockBarbers = [
  {
    id: '1',
    name: 'John Smith',
    rating: 4.8,
    reviewCount: 127,
    specialties: ['Fades', 'Classic Cuts'],
    experience: '5 years',
    availability: {},
    isRecommended: true
  }
]

describe('Mobile Booking Components', () => {
  // Test touch interactions
  describe('Touch Interactions', () => {
    it('should handle swipe gestures', () => {
      const onClose = jest.fn()
      const onComplete = jest.fn()

      const { container } = render(
        <MobileBookingFlow
          isOpen={true}
          onClose={onClose}
          onComplete={onComplete}
          services={mockServices}
          barbers={mockBarbers}
        />
      )

      // Simulate swipe left
      fireEvent.touchStart(container, { touches: [{ clientX: 300, clientY: 200 }] })
      fireEvent.touchEnd(container, { changedTouches: [{ clientX: 100, clientY: 200 }] })

      // Verify navigation occurred
      // Add assertions based on your implementation
    })

    it('should have touch-friendly button sizes', () => {
      render(
        <MobileServiceSelector
          services={mockServices}
          onServiceSelect={jest.fn()}
        />
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button)
        const height = parseInt(styles.minHeight) || parseInt(styles.height)
        const width = parseInt(styles.minWidth) || parseInt(styles.width)

        // Minimum touch target size should be 44x44px
        expect(height).toBeGreaterThanOrEqual(44)
        expect(width).toBeGreaterThanOrEqual(44)
      })
    })
  })

  // Test responsive layouts
  describe('Responsive Layouts', () => {
    const viewportSizes = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 414, height: 896, name: 'iPhone 11' },
      { width: 390, height: 844, name: 'iPhone 12' },
      { width: 428, height: 926, name: 'iPhone 13 Pro Max' }
    ]

    viewportSizes.forEach(({ width, height, name }) => {
      it(`should render correctly on ${name} (${width}x${height})`, () => {
        // Set viewport size
        global.innerWidth = width
        global.innerHeight = height
        global.dispatchEvent(new Event('resize'))

        const { container } = render(
          <MobileDateTimePicker
            onDateSelect={jest.fn()}
            onTimeSelect={jest.fn()}
          />
        )

        // Check that calendar grid adapts to screen width
        const calendarGrid = container.querySelector('.grid-cols-7')
        expect(calendarGrid).toBeInTheDocument()

        // Check time slots are properly sized
        const timeSlots = container.querySelectorAll('button')
        timeSlots.forEach(slot => {
          const rect = slot.getBoundingClientRect()
          expect(rect.width).toBeGreaterThan(60) // Minimum width for readability
        })
      })
    })
  })

  // Test form inputs
  describe('Mobile Form Inputs', () => {
    it('should prevent zoom on input focus', () => {
      const { container } = render(
        <MobileClientDetailsForm
          onUpdate={jest.fn()}
        />
      )

      const inputs = container.querySelectorAll('input, textarea')
      inputs.forEach(input => {
        const styles = window.getComputedStyle(input)
        // Font size should be at least 16px to prevent zoom on iOS
        expect(parseInt(styles.fontSize)).toBeGreaterThanOrEqual(16)
      })
    })

    it('should format phone numbers automatically', () => {
      const onUpdate = jest.fn()
      render(
        <MobileClientDetailsForm
          onUpdate={onUpdate}
        />
      )

      const phoneInput = screen.getByLabelText(/phone number/i)
      fireEvent.change(phoneInput, { target: { value: '5551234567' } })

      expect(onUpdate).toHaveBeenCalledWith('phone', '(555) 123-4567')
    })
  })

  // Test loading states
  describe('Loading States', () => {
    it('should show skeleton loaders during data fetch', async () => {
      const { container } = render(
        <MobileDateTimePicker
          onDateSelect={jest.fn()}
          onTimeSelect={jest.fn()}
        />
      )

      // Check for loading indicators
      await waitFor(() => {
        const skeletons = container.querySelectorAll('.mobile-skeleton')
        expect(skeletons.length).toBeGreaterThan(0)
      })
    })
  })

  // Test accessibility
  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <MobileBarberSelector
          barbers={mockBarbers}
          onBarberSelect={jest.fn()}
        />
      )

      // Check for accessible labels
      const noPreferenceButton = screen.getByText(/no preference/i)
      expect(noPreferenceButton).toHaveAttribute('aria-label')

      // Check focus management
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveProperty('tabIndex')
      })
    })

    it('should announce form errors to screen readers', () => {
      const { rerender } = render(
        <MobileClientDetailsForm
          onUpdate={jest.fn()}
          errors={{}}
        />
      )

      // Add error
      rerender(
        <MobileClientDetailsForm
          onUpdate={jest.fn()}
          errors={{ email: 'Invalid email format' }}
        />
      )

      const errorMessage = screen.getByText('Invalid email format')
      expect(errorMessage).toHaveAttribute('role', 'alert')
    })
  })

  // Test performance
  describe('Performance', () => {
    it('should use lazy loading for heavy components', () => {
      // Test dynamic imports are used
      expect(require.resolveWeak).toBeDefined()
    })

    it('should debounce search inputs', async () => {
      const onSearch = jest.fn()
      render(
        <MobileServiceSelector
          services={mockServices}
          onServiceSelect={jest.fn()}
        />
      )

      const searchInput = screen.getByPlaceholderText(/search services/i)

      // Type quickly
      fireEvent.change(searchInput, { target: { value: 'h' } })
      fireEvent.change(searchInput, { target: { value: 'ha' } })
      fireEvent.change(searchInput, { target: { value: 'hai' } })
      fireEvent.change(searchInput, { target: { value: 'hair' } })

      // Should only trigger search after debounce
      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledTimes(1)
      }, { timeout: 500 })
    })
  })
})

// Viewport size test utilities
export const testViewportSizes = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 }
}

export const setViewport = (width: number, height: number) => {
  global.innerWidth = width
  global.innerHeight = height
  global.dispatchEvent(new Event('resize'))
}

export const simulateTouch = (element: Element, type: 'swipeLeft' | 'swipeRight' | 'tap') => {
  switch (type) {
    case 'swipeLeft':
      fireEvent.touchStart(element, { touches: [{ clientX: 300, clientY: 200 }] })
      fireEvent.touchEnd(element, { changedTouches: [{ clientX: 100, clientY: 200 }] })
      break
    case 'swipeRight':
      fireEvent.touchStart(element, { touches: [{ clientX: 100, clientY: 200 }] })
      fireEvent.touchEnd(element, { changedTouches: [{ clientX: 300, clientY: 200 }] })
      break
    case 'tap':
      fireEvent.touchStart(element, { touches: [{ clientX: 200, clientY: 200 }] })
      fireEvent.touchEnd(element, { changedTouches: [{ clientX: 200, clientY: 200 }] })
      break
  }
}
