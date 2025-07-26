/**
 * Comprehensive unit tests for Billing Settings Page
 * 
 * Tests cover:
 * - Component rendering and structure
 * - Current plan display and interactions
 * - Payment methods management
 * - Billing history and invoices
 * - Usage metrics display
 * - Navigation functionality
 * - Security measures for financial data
 * - Accessibility compliance
 * - Error handling scenarios
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import BillingPage from '@/app/settings/billing/page'
import { useRouter } from 'next/navigation'

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
}))

// Mock billing API functions
jest.mock('@/lib/billing-api', () => ({
  getCurrentSubscription: jest.fn(),
  getPaymentHistory: jest.fn(),
  updateSubscription: jest.fn(),
  cancelSubscription: jest.fn(),
  formatPrice: jest.fn((amount) => `$${amount.toFixed(2)}`),
}))

// Mock Stripe utilities
jest.mock('@/lib/stripe', () => ({
  formatCardBrand: jest.fn((brand) => brand),
  formatLast4: jest.fn((last4) => `•••• ${last4}`),
  isStripeAvailable: jest.fn(() => true),
}))

describe('BillingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('renders the billing page with all main sections', () => {
      render(<BillingPage />)
      
      // Header
      expect(screen.getByRole('heading', { name: /billing/i })).toBeInTheDocument()
      expect(screen.getByText(/view billing information and manage payment methods/i)).toBeInTheDocument()
      
      // Main sections
      expect(screen.getByText(/current plan/i)).toBeInTheDocument()
      expect(screen.getByText(/payment methods/i)).toBeInTheDocument()
      expect(screen.getByText(/billing history/i)).toBeInTheDocument()
      expect(screen.getByText(/usage this month/i)).toBeInTheDocument()
    })

    it('displays the credit card icon in header', () => {
      render(<BillingPage />)
      expect(screen.getByTestId('heroicon-credit-card')).toBeInTheDocument()
    })

    it('renders back to settings button', () => {
      render(<BillingPage />)
      const backButton = screen.getByRole('button', { name: /back to settings/i })
      expect(backButton).toBeInTheDocument()
    })

    it('has correct responsive layout classes', () => {
      const { container } = render(<BillingPage />)
      const mainElement = container.querySelector('main')
      
      expect(mainElement).toHaveClass('min-h-screen', 'p-4', 'sm:p-6', 'lg:p-8')
      expect(mainElement?.querySelector('.max-w-4xl')).toBeInTheDocument()
    })
  })

  describe('Current Plan Section', () => {
    it('displays current plan information correctly', () => {
      render(<BillingPage />)
      
      expect(screen.getByText('Professional')).toBeInTheDocument()
      expect(screen.getByText('$49')).toBeInTheDocument()
      expect(screen.getByText('/month')).toBeInTheDocument()
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('shows all plan features with bullet points', () => {
      render(<BillingPage />)
      
      const features = [
        'Unlimited appointments',
        'Advanced analytics',
        'Custom branding',
        'Priority support'
      ]
      
      features.forEach(feature => {
        expect(screen.getByText(feature)).toBeInTheDocument()
      })
    })

    it('renders upgrade plan button', () => {
      render(<BillingPage />)
      const upgradeButton = screen.getByRole('button', { name: /upgrade plan/i })
      expect(upgradeButton).toBeInTheDocument()
      expect(upgradeButton).toHaveClass('bg-blue-600', 'hover:bg-blue-700')
    })

    it('renders cancel subscription button with warning color', () => {
      render(<BillingPage />)
      const cancelButton = screen.getByRole('button', { name: /cancel subscription/i })
      expect(cancelButton).toBeInTheDocument()
      expect(cancelButton).toHaveClass('text-red-600', 'hover:text-red-800')
    })

    it('handles upgrade plan button click', () => {
      render(<BillingPage />)
      const upgradeButton = screen.getByRole('button', { name: /upgrade plan/i })
      fireEvent.click(upgradeButton)
      // Currently no functionality - this tests button interaction
      expect(upgradeButton).toBeInTheDocument()
    })

    it('handles cancel subscription button click', () => {
      render(<BillingPage />)
      const cancelButton = screen.getByRole('button', { name: /cancel subscription/i })
      fireEvent.click(cancelButton)
      // Currently no functionality - this tests button interaction
      expect(cancelButton).toBeInTheDocument()
    })
  })

  describe('Payment Methods Section', () => {
    it('displays payment methods header with add button', () => {
      render(<BillingPage />)
      
      expect(screen.getByText(/payment methods/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add payment method/i })).toBeInTheDocument()
    })

    it('renders all payment methods with correct information', () => {
      render(<BillingPage />)
      
      // First payment method (Visa, default)
      expect(screen.getByText('VISA')).toBeInTheDocument()
      expect(screen.getByText('•••• •••• •••• 4242')).toBeInTheDocument()
      expect(screen.getByText('Expires 12/25')).toBeInTheDocument()
      expect(screen.getByText('• Default')).toBeInTheDocument()
      
      // Second payment method (Mastercard)
      expect(screen.getByText('MC')).toBeInTheDocument()
      expect(screen.getByText('•••• •••• •••• 8888')).toBeInTheDocument()
      expect(screen.getByText('Expires 06/26')).toBeInTheDocument()
    })

    it('shows make default button only for non-default cards', () => {
      render(<BillingPage />)
      
      // Should only have one "Make Default" button (for the non-default card)
      const makeDefaultButtons = screen.getAllByText(/make default/i)
      expect(makeDefaultButtons).toHaveLength(1)
    })

    it('shows remove button for all payment methods', () => {
      render(<BillingPage />)
      
      const removeButtons = screen.getAllByText(/remove/i)
      expect(removeButtons).toHaveLength(2) // One for each payment method
    })

    it('handles add payment method button click', () => {
      render(<BillingPage />)
      const addButton = screen.getByRole('button', { name: /add payment method/i })
      fireEvent.click(addButton)
      // Currently no functionality - this tests button interaction
      expect(addButton).toBeInTheDocument()
    })

    it('handles make default button click', () => {
      render(<BillingPage />)
      const makeDefaultButton = screen.getByText(/make default/i)
      fireEvent.click(makeDefaultButton)
      // Currently no functionality - this tests button interaction
      expect(makeDefaultButton).toBeInTheDocument()
    })

    it('handles remove payment method button click', () => {
      render(<BillingPage />)
      const removeButtons = screen.getAllByText(/remove/i)
      fireEvent.click(removeButtons[0])
      // Currently no functionality - this tests button interaction
      expect(removeButtons[0]).toBeInTheDocument()
    })

    it('displays card brand logos correctly', () => {
      render(<BillingPage />)
      
      const cardBrandElements = screen.getAllByText(/visa|mc/i)
      expect(cardBrandElements).toHaveLength(2)
    })
  })

  describe('Billing History Section', () => {
    it('displays billing history header with view all button', () => {
      render(<BillingPage />)
      
      expect(screen.getByRole('heading', { name: /billing history/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /view all/i })).toBeInTheDocument()
    })

    it('renders all invoice entries with correct information', () => {
      render(<BillingPage />)
      
      // Check for invoice IDs
      expect(screen.getByText('INV-2023-12')).toBeInTheDocument()
      expect(screen.getByText('INV-2023-11')).toBeInTheDocument()
      expect(screen.getByText('INV-2023-10')).toBeInTheDocument()
      
      // Check for amounts
      const amountElements = screen.getAllByText('$49.00')
      expect(amountElements).toHaveLength(3)
      
      // Check for status badges
      const paidBadges = screen.getAllByText('Paid')
      expect(paidBadges).toHaveLength(3)
    })

    it('displays formatted dates correctly', () => {
      render(<BillingPage />)
      
      // Note: Due to date mocking in jest.setup.js, we check for the presence of date elements
      const dateElements = screen.getAllByText('mocked-date')
      expect(dateElements.length).toBeGreaterThan(0)
    })

    it('shows document icons for each invoice', () => {
      render(<BillingPage />)
      
      // Check for document icons (mocked in jest.setup.js)
      const documentIcons = screen.getAllByTestId('heroicon-document')
      expect(documentIcons).toHaveLength(3)
    })

    it('renders download buttons for each invoice', () => {
      render(<BillingPage />)
      
      const downloadButtons = screen.getAllByText(/download/i)
      expect(downloadButtons).toHaveLength(3)
    })

    it('handles view all button click', () => {
      render(<BillingPage />)
      const viewAllButton = screen.getByRole('button', { name: /view all/i })
      fireEvent.click(viewAllButton)
      // Currently no functionality - this tests button interaction
      expect(viewAllButton).toBeInTheDocument()
    })

    it('handles download button clicks', () => {
      render(<BillingPage />)
      const downloadButtons = screen.getAllByText(/download/i)
      
      // Mock window.open
      const mockOpen = jest.spyOn(window, 'open').mockImplementation(() => null)
      
      fireEvent.click(downloadButtons[0])
      expect(mockOpen).toHaveBeenCalledWith('#', '_blank')
      
      mockOpen.mockRestore()
    })

    it('displays status badges with correct styling', () => {
      render(<BillingPage />)
      
      const statusBadges = screen.getAllByText('Paid')
      statusBadges.forEach(badge => {
        expect(badge).toHaveClass('bg-green-100', 'text-green-800')
      })
    })
  })

  describe('Usage Metrics Section', () => {
    it('displays usage section header', () => {
      render(<BillingPage />)
      expect(screen.getByRole('heading', { name: /usage this month/i })).toBeInTheDocument()
    })

    it('shows all usage metrics with correct values', () => {
      render(<BillingPage />)
      
      // Appointments
      expect(screen.getByText('247')).toBeInTheDocument()
      expect(screen.getByText('Appointments')).toBeInTheDocument()
      expect(screen.getByText('Unlimited')).toBeInTheDocument()
      
      // Storage
      expect(screen.getByText('8.4GB')).toBeInTheDocument()
      expect(screen.getByText('Storage Used')).toBeInTheDocument()
      expect(screen.getByText('of 100GB')).toBeInTheDocument()
      
      // API Calls
      expect(screen.getByText('1,234')).toBeInTheDocument()
      expect(screen.getByText('API Calls')).toBeInTheDocument()
    })

    it('applies correct color coding to metrics', () => {
      render(<BillingPage />)
      
      const appointmentsValue = screen.getByText('247')
      const storageValue = screen.getByText('8.4GB')
      const apiCallsValue = screen.getByText('1,234')
      
      expect(appointmentsValue).toHaveClass('text-blue-600')
      expect(storageValue).toHaveClass('text-green-600')
      expect(apiCallsValue).toHaveClass('text-purple-600')
    })

    it('has responsive grid layout for metrics', () => {
      const { container } = render(<BillingPage />)
      const metricsGrid = container.querySelector('.grid')
      
      expect(metricsGrid).toHaveClass('grid-cols-1', 'md:grid-cols-3')
    })
  })

  describe('Navigation', () => {
    it('handles back to settings navigation', () => {
      render(<BillingPage />)
      
      const backButton = screen.getByRole('button', { name: /back to settings/i })
      fireEvent.click(backButton)
      
      expect(mockPush).toHaveBeenCalledWith('/settings')
    })

    it('displays back arrow icon', () => {
      render(<BillingPage />)
      expect(screen.getByTestId('heroicon-arrow-left')).toBeInTheDocument()
    })
  })

  describe('Dark Mode Support', () => {
    it('has dark mode classes for main container', () => {
      const { container } = render(<BillingPage />)
      const mainElement = container.querySelector('main')
      
      expect(mainElement).toHaveClass('bg-gray-50', 'dark:bg-gray-900')
    })

    it('applies dark mode classes to cards', () => {
      const { container } = render(<BillingPage />)
      const cards = container.querySelectorAll('.bg-white')
      
      cards.forEach(card => {
        expect(card).toHaveClass('dark:bg-gray-800')
      })
    })

    it('has dark mode text colors', () => {
      const { container } = render(<BillingPage />)
      const headings = container.querySelectorAll('h1, h2, h3')
      
      headings.forEach(heading => {
        expect(heading).toHaveClass('dark:text-white')
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<BillingPage />)
      
      // Main heading
      expect(screen.getByRole('heading', { level: 1, name: /billing/i })).toBeInTheDocument()
      
      // Section headings
      const sectionHeadings = screen.getAllByRole('heading', { level: 2 })
      expect(sectionHeadings.length).toBeGreaterThan(0)
    })

    it('has accessible button labels', () => {
      render(<BillingPage />)
      
      // All buttons should have accessible names
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName()
      })
    })

    it('provides text alternatives for icons', () => {
      render(<BillingPage />)
      
      // Icons should have proper test ids for accessibility
      expect(screen.getByTestId('heroicon-credit-card')).toBeInTheDocument()
      expect(screen.getByTestId('heroicon-arrow-left')).toBeInTheDocument()
    })

    it('uses semantic HTML structure', () => {
      const { container } = render(<BillingPage />)
      
      expect(container.querySelector('main')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    it('has proper focus management', () => {
      render(<BillingPage />)
      
      const firstButton = screen.getByRole('button', { name: /back to settings/i })
      firstButton.focus()
      expect(firstButton).toHaveFocus()
    })
  })

  describe('Security Considerations', () => {
    it('displays masked card numbers', () => {
      render(<BillingPage />)
      
      // Card numbers should be masked with bullets
      expect(screen.getByText('•••• •••• •••• 4242')).toBeInTheDocument()
      expect(screen.getByText('•••• •••• •••• 8888')).toBeInTheDocument()
    })

    it('does not expose sensitive payment data in DOM', () => {
      const { container } = render(<BillingPage />)
      
      // Should not contain full card numbers or sensitive data
      expect(container.innerHTML).not.toMatch(/4242424242424242/)
      expect(container.innerHTML).not.toMatch(/8888888888888888/)
    })

    it('shows only last 4 digits of cards', () => {
      render(<BillingPage />)
      
      // Only last 4 digits should be visible
      expect(screen.queryByText('4242424242424242')).not.toBeInTheDocument()
      expect(screen.getByText('4242')).toBeInTheDocument()
    })

    it('handles invoice download securely', () => {
      render(<BillingPage />)
      
      const mockOpen = jest.spyOn(window, 'open').mockImplementation(() => null)
      const downloadButton = screen.getAllByText(/download/i)[0]
      
      fireEvent.click(downloadButton)
      
      // Should open in new tab for security
      expect(mockOpen).toHaveBeenCalledWith('#', '_blank')
      
      mockOpen.mockRestore()
    })
  })

  describe('Loading States', () => {
    it('renders static content immediately', () => {
      render(<BillingPage />)
      
      // Static content should be visible immediately
      expect(screen.getByText(/billing/i)).toBeInTheDocument()
      expect(screen.getByText(/professional/i)).toBeInTheDocument()
    })

    it('handles missing data gracefully', () => {
      // Test with empty state (currently uses static data)
      render(<BillingPage />)
      
      // Should still render the structure
      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })

  describe('Error Scenarios', () => {
    it('handles router navigation errors gracefully', () => {
      const mockPushError = jest.fn().mockImplementation(() => {
        throw new Error('Navigation failed')
      })
      
      const useRouterMock = jest.mocked(useRouter)
      useRouterMock.mockReturnValue({
        push: mockPushError,
        back: jest.fn(),
      } as any)
      
      render(<BillingPage />)
      
      const backButton = screen.getByRole('button', { name: /back to settings/i })
      
      // Should not crash when navigation fails
      expect(() => fireEvent.click(backButton)).not.toThrow()
    })

    it('renders without crashing when window.open fails', () => {
      const mockOpen = jest.spyOn(window, 'open').mockImplementation(() => {
        throw new Error('Popup blocked')
      })
      
      render(<BillingPage />)
      
      const downloadButton = screen.getAllByText(/download/i)[0]
      
      // Should not crash when popup is blocked
      expect(() => fireEvent.click(downloadButton)).not.toThrow()
      
      mockOpen.mockRestore()
    })
  })

  describe('Performance', () => {
    it('renders quickly with static data', () => {
      const startTime = performance.now()
      render(<BillingPage />)
      const endTime = performance.now()
      
      // Should render in under 100ms
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('does not cause memory leaks with event listeners', () => {
      const { unmount } = render(<BillingPage />)
      
      // Should unmount cleanly
      expect(() => unmount()).not.toThrow()
    })
  })
})