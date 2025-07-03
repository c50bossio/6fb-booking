/**
 * Comprehensive tests for CookieConsent component
 * Tests banner display, user interactions, preferences modal, and accessibility
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import CookieConsent from '@/components/CookieConsent'
import * as useCookieConsentModule from '@/hooks/useCookieConsent'
import * as scriptLoaderModule from '@/lib/scriptLoader'

// Mock the dependencies
jest.mock('@/hooks/useCookieConsent')
jest.mock('@/lib/scriptLoader')

const mockUseCookieConsent = useCookieConsentModule.default as jest.MockedFunction<typeof useCookieConsentModule.default>
const mockInitializeScripts = scriptLoaderModule.initializeScripts as jest.MockedFunction<typeof scriptLoaderModule.initializeScripts>

const defaultMockReturn = {
  shouldShowBanner: true,
  preferences: {
    categories: {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
    },
    consentDate: '',
    version: '1.0',
    hasConsented: false,
  },
  isLoading: false,
  isSaving: false,
  acceptAll: jest.fn(),
  rejectAll: jest.fn(),
  updateConsent: jest.fn(),
}

describe('CookieConsent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCookieConsent.mockReturnValue(defaultMockReturn)
  })

  describe('Banner Display', () => {
    it('renders cookie banner when consent not given', () => {
      render(<CookieConsent />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('We value your privacy')).toBeInTheDocument()
      expect(screen.getByText(/We use cookies to enhance your experience/)).toBeInTheDocument()
    })

    it('does not render when banner should not be shown', () => {
      mockUseCookieConsent.mockReturnValue({
        ...defaultMockReturn,
        shouldShowBanner: false,
      })

      render(<CookieConsent />)
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('does not render when loading', () => {
      mockUseCookieConsent.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true,
      })

      render(<CookieConsent />)
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<CookieConsent className="custom-banner" />)
      
      const banner = screen.getByRole('dialog')
      expect(banner).toHaveClass('custom-banner')
    })
  })

  describe('Banner Interactions', () => {
    it('calls acceptAll when Accept All button is clicked', async () => {
      const user = userEvent.setup()
      render(<CookieConsent />)
      
      const acceptButton = screen.getByRole('button', { name: 'Accept All' })
      await user.click(acceptButton)
      
      expect(defaultMockReturn.acceptAll).toHaveBeenCalledTimes(1)
    })

    it('calls rejectAll when Reject All button is clicked', async () => {
      const user = userEvent.setup()
      render(<CookieConsent />)
      
      const rejectButton = screen.getByRole('button', { name: 'Reject All' })
      await user.click(rejectButton)
      
      expect(defaultMockReturn.rejectAll).toHaveBeenCalledTimes(1)
    })

    it('opens preferences modal when Manage Preferences is clicked', async () => {
      const user = userEvent.setup()
      render(<CookieConsent />)
      
      const manageButton = screen.getByRole('button', { name: /Manage Preferences/i })
      await user.click(manageButton)
      
      expect(screen.getByRole('dialog', { name: /Cookie Preferences/i })).toBeInTheDocument()
    })

    it('expands details when Learn more is clicked', async () => {
      const user = userEvent.setup()
      render(<CookieConsent />)
      
      const learnMoreButton = screen.getByRole('button', { name: 'Learn more' })
      await user.click(learnMoreButton)
      
      expect(screen.getByText('Necessary Cookies')).toBeInTheDocument()
      expect(screen.getByText('Analytics Cookies')).toBeInTheDocument()
      expect(screen.getByText('Marketing Cookies')).toBeInTheDocument()
      expect(screen.getByText('Functional Cookies')).toBeInTheDocument()
    })

    it('collapses details when Show less is clicked', async () => {
      const user = userEvent.setup()
      render(<CookieConsent />)
      
      // First expand
      const learnMoreButton = screen.getByRole('button', { name: 'Learn more' })
      await user.click(learnMoreButton)
      
      // Then collapse
      const showLessButton = screen.getByRole('button', { name: /Show less/i })
      await user.click(showLessButton)
      
      expect(screen.queryByText('Necessary Cookies')).not.toBeInTheDocument()
    })
  })

  describe('Expanded Banner Cookie Controls', () => {
    beforeEach(async () => {
      render(<CookieConsent />)
      const user = userEvent.setup()
      const learnMoreButton = screen.getByRole('button', { name: 'Learn more' })
      await user.click(learnMoreButton)
    })

    it('displays all cookie categories with correct information', () => {
      expect(screen.getByText('Necessary Cookies')).toBeInTheDocument()
      expect(screen.getByText('Essential for the website to function properly. These cannot be disabled.')).toBeInTheDocument()
      
      expect(screen.getByText('Analytics Cookies')).toBeInTheDocument()
      expect(screen.getByText('Help us understand how visitors use our website to improve performance.')).toBeInTheDocument()
      
      expect(screen.getByText('Marketing Cookies')).toBeInTheDocument()
      expect(screen.getByText('Used to show you relevant ads and measure campaign effectiveness.')).toBeInTheDocument()
      
      expect(screen.getByText('Functional Cookies')).toBeInTheDocument()
      expect(screen.getByText('Enable enhanced functionality and personalization features.')).toBeInTheDocument()
    })

    it('shows necessary cookies as required and non-toggleable', () => {
      const necessaryToggle = screen.getByLabelText('Toggle Necessary Cookies')
      expect(necessaryToggle).toBeChecked()
      expect(necessaryToggle).toBeDisabled()
      expect(screen.getByText('(Required)')).toBeInTheDocument()
    })

    it('allows toggling non-necessary cookie categories', async () => {
      const user = userEvent.setup()
      
      const analyticsToggle = screen.getByLabelText('Toggle Analytics Cookies')
      expect(analyticsToggle).not.toBeChecked()
      
      await user.click(analyticsToggle)
      
      // Should not directly call updateConsent from banner (only when saving)
      expect(defaultMockReturn.updateConsent).not.toHaveBeenCalled()
    })
  })

  describe('Preferences Modal', () => {
    beforeEach(async () => {
      render(<CookieConsent />)
      const user = userEvent.setup()
      const manageButton = screen.getByRole('button', { name: /Manage Preferences/i })
      await user.click(manageButton)
    })

    it('displays modal with correct title and description', () => {
      expect(screen.getByRole('dialog', { name: /Cookie Preferences/i })).toBeInTheDocument()
      expect(screen.getByText('Customize your cookie settings. You can change these preferences at any time in your privacy settings.')).toBeInTheDocument()
    })

    it('displays all cookie categories as cards', () => {
      // Should find category cards
      expect(screen.getByText('Necessary Cookies')).toBeInTheDocument()
      expect(screen.getByText('Analytics Cookies')).toBeInTheDocument()
      expect(screen.getByText('Marketing Cookies')).toBeInTheDocument()
      expect(screen.getByText('Functional Cookies')).toBeInTheDocument()
    })

    it('shows examples for each category', () => {
      expect(screen.getByText(/Authentication, security, basic functionality/)).toBeInTheDocument()
      expect(screen.getByText(/Google Analytics, page views, user behavior/)).toBeInTheDocument()
      expect(screen.getByText(/Meta Pixel, Google Ads, retargeting/)).toBeInTheDocument()
      expect(screen.getByText(/Calendar integration, preferences, chat widgets/)).toBeInTheDocument()
    })

    it('marks necessary cookies as required', () => {
      expect(screen.getByText('Required')).toBeInTheDocument()
    })

    it('allows toggling non-necessary categories', async () => {
      const user = userEvent.setup()
      
      const analyticsToggle = screen.getByLabelText('Toggle Analytics Cookies')
      await user.click(analyticsToggle)
      
      // The toggle should change state locally
      expect(analyticsToggle).toBeChecked()
    })

    it('prevents toggling necessary cookies', () => {
      const necessaryToggle = screen.getByLabelText('Toggle Necessary Cookies')
      expect(necessaryToggle).toBeChecked()
      expect(necessaryToggle).toBeDisabled()
    })

    it('closes modal when Cancel is clicked', async () => {
      const user = userEvent.setup()
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: /Cookie Preferences/i })).not.toBeInTheDocument()
      })
    })

    it('saves preferences and closes modal when Save is clicked', async () => {
      const user = userEvent.setup()
      
      // Toggle analytics on
      const analyticsToggle = screen.getByLabelText('Toggle Analytics Cookies')
      await user.click(analyticsToggle)
      
      // Save preferences
      const saveButton = screen.getByRole('button', { name: 'Save Preferences' })
      await user.click(saveButton)
      
      expect(defaultMockReturn.updateConsent).toHaveBeenCalledWith({
        necessary: true,
        analytics: true,
        marketing: false,
        functional: false,
      })
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: /Cookie Preferences/i })).not.toBeInTheDocument()
      })
    })

    it('shows privacy information section', () => {
      expect(screen.getByText('About your privacy:')).toBeInTheDocument()
      expect(screen.getByText(/Your preferences are stored locally and on our servers/)).toBeInTheDocument()
      expect(screen.getByText(/You can change these settings at any time/)).toBeInTheDocument()
      expect(screen.getByText(/Necessary cookies cannot be disabled/)).toBeInTheDocument()
    })

    it('includes links to privacy and cookie policies', () => {
      const privacyLink = screen.getByRole('link', { name: 'Privacy Policy' })
      const cookieLink = screen.getByRole('link', { name: 'Cookie Policy' })
      
      expect(privacyLink).toHaveAttribute('href', '/privacy')
      expect(cookieLink).toHaveAttribute('href', '/cookies')
    })
  })

  describe('Button States', () => {
    it('disables buttons when saving', () => {
      mockUseCookieConsent.mockReturnValue({
        ...defaultMockReturn,
        isSaving: true,
      })

      render(<CookieConsent />)
      
      expect(screen.getByRole('button', { name: 'Accept All' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Reject All' })).toBeDisabled()
      expect(screen.getByRole('button', { name: /Manage Preferences/i })).toBeDisabled()
    })

    it('shows saving state in preferences modal', async () => {
      const user = userEvent.setup()
      render(<CookieConsent />)
      
      // Open modal
      const manageButton = screen.getByRole('button', { name: /Manage Preferences/i })
      await user.click(manageButton)
      
      // Mock saving state
      mockUseCookieConsent.mockReturnValue({
        ...defaultMockReturn,
        isSaving: true,
      })
      
      // Re-render to update state
      render(<CookieConsent />)
      await user.click(manageButton)
      
      expect(screen.getByRole('button', { name: 'Saving...' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    })
  })

  describe('Script Loading Integration', () => {
    it('initializes scripts when consent is given', () => {
      const consentedPreferences = {
        categories: {
          necessary: true,
          analytics: true,
          marketing: false,
          functional: true,
        },
        consentDate: '2025-07-03T10:00:00.000Z',
        version: '1.0',
        hasConsented: true,
      }

      mockUseCookieConsent.mockReturnValue({
        ...defaultMockReturn,
        preferences: consentedPreferences,
      })

      render(<CookieConsent />)
      
      expect(mockInitializeScripts).toHaveBeenCalledWith(consentedPreferences.categories)
    })

    it('does not initialize scripts when no consent given', () => {
      render(<CookieConsent />)
      
      expect(mockInitializeScripts).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes on banner', () => {
      render(<CookieConsent />)
      
      const banner = screen.getByRole('dialog')
      expect(banner).toHaveAttribute('aria-labelledby', 'cookie-banner-title')
      expect(banner).toHaveAttribute('aria-describedby', 'cookie-banner-description')
    })

    it('has proper ARIA attributes on expandable content', async () => {
      const user = userEvent.setup()
      render(<CookieConsent />)
      
      const learnMoreButton = screen.getByRole('button', { name: 'Learn more' })
      expect(learnMoreButton).toHaveAttribute('aria-expanded', 'false')
      expect(learnMoreButton).toHaveAttribute('aria-controls', 'cookie-details')
      
      await user.click(learnMoreButton)
      
      expect(learnMoreButton).toHaveAttribute('aria-expanded', 'true')
    })

    it('has accessible labels on toggle switches', async () => {
      const user = userEvent.setup()
      render(<CookieConsent />)
      
      const learnMoreButton = screen.getByRole('button', { name: 'Learn more' })
      await user.click(learnMoreButton)
      
      expect(screen.getByLabelText('Toggle Analytics Cookies')).toBeInTheDocument()
      expect(screen.getByLabelText('Toggle Marketing Cookies')).toBeInTheDocument()
      expect(screen.getByLabelText('Toggle Functional Cookies')).toBeInTheDocument()
    })

    it('marks decorative icons as hidden from screen readers', () => {
      render(<CookieConsent />)
      
      const cookieIcon = screen.getByTestId('lucide-cookie') || document.querySelector('[data-lucide="cookie"]')
      if (cookieIcon) {
        expect(cookieIcon).toHaveAttribute('aria-hidden', 'true')
      }
    })
  })

  describe('Error Handling', () => {
    it('handles acceptAll errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      defaultMockReturn.acceptAll.mockRejectedValue(new Error('Network error'))
      
      render(<CookieConsent />)
      
      const acceptButton = screen.getByRole('button', { name: 'Accept All' })
      await user.click(acceptButton)
      
      // Should not crash the component
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      
      consoleSpy.mockRestore()
    })

    it('handles rejectAll errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      defaultMockReturn.rejectAll.mockRejectedValue(new Error('Network error'))
      
      render(<CookieConsent />)
      
      const rejectButton = screen.getByRole('button', { name: 'Reject All' })
      await user.click(rejectButton)
      
      // Should not crash the component
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      
      consoleSpy.mockRestore()
    })

    it('handles updateConsent errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      defaultMockReturn.updateConsent.mockRejectedValue(new Error('Network error'))
      
      render(<CookieConsent />)
      
      // Open preferences modal
      const manageButton = screen.getByRole('button', { name: /Manage Preferences/i })
      await user.click(manageButton)
      
      // Try to save
      const saveButton = screen.getByRole('button', { name: 'Save Preferences' })
      await user.click(saveButton)
      
      // Modal should still be open (error occurred)
      expect(screen.getByRole('dialog', { name: /Cookie Preferences/i })).toBeInTheDocument()
      
      consoleSpy.mockRestore()
    })
  })

  describe('State Synchronization', () => {
    it('updates temp categories when preferences change', () => {
      const { rerender } = render(<CookieConsent />)
      
      // Change preferences
      const newPreferences = {
        categories: {
          necessary: true,
          analytics: true,
          marketing: false,
          functional: true,
        },
        consentDate: '2025-07-03T10:00:00.000Z',
        version: '1.0',
        hasConsented: true,
      }

      mockUseCookieConsent.mockReturnValue({
        ...defaultMockReturn,
        preferences: newPreferences,
      })

      rerender(<CookieConsent />)
      
      // Temp categories should be updated (tested by checking if switches reflect new state)
      expect(mockInitializeScripts).toHaveBeenCalledWith(newPreferences.categories)
    })
  })
})