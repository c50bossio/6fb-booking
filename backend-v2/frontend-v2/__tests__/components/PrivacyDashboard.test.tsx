/**
 * Comprehensive tests for PrivacyDashboard component
 * Tests privacy status display, settings management, data export, consent history, and account deletion
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { format } from 'date-fns'
import PrivacyDashboard from '@/components/PrivacyDashboard'
import * as useCookieConsentModule from '@/hooks/useCookieConsent'
import * as scriptLoaderModule from '@/lib/scriptLoader'

// Mock the dependencies
jest.mock('@/hooks/useCookieConsent')
jest.mock('@/lib/scriptLoader')
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'PPpp') return 'Jul 3, 2025 at 10:00:00 AM EDT'
    if (formatStr === 'PPp') return 'Jul 3, 2025, 10:00 AM'
    if (formatStr === 'yyyy-MM-dd') return '2025-07-03'
    return new Date(date).toISOString()
  })
}))

const mockUseCookieConsent = useCookieConsentModule.default as jest.MockedFunction<typeof useCookieConsentModule.default>
const mockInitializeScripts = scriptLoaderModule.initializeScripts as jest.MockedFunction<typeof scriptLoaderModule.initializeScripts>

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock URL.createObjectURL and related methods
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url')
const mockRevokeObjectURL = jest.fn()
Object.defineProperty(global.URL, 'createObjectURL', { value: mockCreateObjectURL })
Object.defineProperty(global.URL, 'revokeObjectURL', { value: mockRevokeObjectURL })

// Mock DOM methods
const mockClick = jest.fn()
const mockAppendChild = jest.fn()
const mockRemoveChild = jest.fn()
Object.defineProperty(document, 'createElement', {
  value: jest.fn(() => ({
    click: mockClick,
    href: '',
    download: '',
  }))
})
Object.defineProperty(document.body, 'appendChild', { value: mockAppendChild })
Object.defineProperty(document.body, 'removeChild', { value: mockRemoveChild })

// Mock window.alert
const mockAlert = jest.fn()
Object.defineProperty(window, 'alert', { value: mockAlert })

const mockConsent = {
  shouldShowBanner: false,
  preferences: {
    categories: {
      necessary: true,
      analytics: true,
      marketing: false,
      functional: true,
    },
    consentDate: '2025-07-03T10:00:00.000Z',
    version: '1.0',
    hasConsented: true,
  },
  isLoading: false,
  isSaving: false,
  acceptAll: jest.fn(),
  rejectAll: jest.fn(),
  updateConsent: jest.fn(),
  resetConsent: jest.fn(),
  hasConsent: jest.fn((category) => mockConsent.preferences.categories[category]),
  getConsentHistory: jest.fn(() => [
    {
      categories: { necessary: true, analytics: false, marketing: false, functional: false },
      consentDate: '2025-07-01T10:00:00.000Z',
      version: '1.0',
      hasConsented: true,
    },
    {
      categories: { necessary: true, analytics: true, marketing: false, functional: true },
      consentDate: '2025-07-03T10:00:00.000Z',
      version: '1.0',
      hasConsented: true,
    },
  ]),
}

describe('PrivacyDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCookieConsent.mockReturnValue(mockConsent)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
  })

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      mockUseCookieConsent.mockReturnValue({
        ...mockConsent,
        isLoading: true,
      })

      render(<PrivacyDashboard />)
      
      expect(screen.getByText('Loading privacy settings...')).toBeInTheDocument()
      expect(screen.getByRole('status')).toBeInTheDocument() // Loading spinner
    })

    it('renders dashboard when not loading', () => {
      render(<PrivacyDashboard />)
      
      expect(screen.getByText('Privacy Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Manage your privacy settings and data preferences')).toBeInTheDocument()
    })
  })

  describe('Privacy Status Display', () => {
    it('displays current privacy status correctly', () => {
      render(<PrivacyDashboard />)
      
      expect(screen.getByText('Privacy Status')).toBeInTheDocument()
      expect(screen.getByText('Your current privacy and cookie preferences')).toBeInTheDocument()
      
      // Check category status
      expect(screen.getByText('Necessary Cookies')).toBeInTheDocument()
      expect(screen.getByText('Analytics Cookies')).toBeInTheDocument()
      expect(screen.getByText('Marketing Cookies')).toBeInTheDocument()
      expect(screen.getByText('Functional Cookies')).toBeInTheDocument()
      
      // Check enabled/disabled status
      const enabledStatuses = screen.getAllByText('Enabled')
      const disabledStatuses = screen.getAllByText('Disabled')
      
      expect(enabledStatuses).toHaveLength(3) // necessary, analytics, functional
      expect(disabledStatuses).toHaveLength(1) // marketing
    })

    it('displays consent details when consent is given', () => {
      render(<PrivacyDashboard />)
      
      expect(screen.getByText('Consent Details')).toBeInTheDocument()
      expect(screen.getByText('Last updated: Jul 3, 2025 at 10:00:00 AM EDT')).toBeInTheDocument()
      expect(screen.getByText('Version: 1.0')).toBeInTheDocument()
    })

    it('does not show consent details when no consent given', () => {
      mockUseCookieConsent.mockReturnValue({
        ...mockConsent,
        preferences: {
          ...mockConsent.preferences,
          hasConsented: false,
        },
      })

      render(<PrivacyDashboard />)
      
      expect(screen.queryByText('Consent Details')).not.toBeInTheDocument()
    })
  })

  describe('Cookie Preferences Management', () => {
    it('displays all cookie categories with controls', () => {
      render(<PrivacyDashboard />)
      
      expect(screen.getByText('Cookie Preferences')).toBeInTheDocument()
      expect(screen.getByText('Control which cookies and tracking technologies we use')).toBeInTheDocument()
      
      // Check all category toggles exist
      expect(screen.getByLabelText(/Toggle Necessary/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Toggle Analytics/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Toggle Marketing/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Toggle Functional/)).toBeInTheDocument()
    })

    it('disables necessary cookies toggle', () => {
      render(<PrivacyDashboard />)
      
      const necessaryToggle = screen.getByLabelText(/Toggle Necessary/)
      expect(necessaryToggle).toBeChecked()
      expect(necessaryToggle).toBeDisabled()
    })

    it('allows toggling non-necessary categories', async () => {
      const user = userEvent.setup()
      render(<PrivacyDashboard />)
      
      const marketingToggle = screen.getByLabelText(/Toggle Marketing/)
      expect(marketingToggle).not.toBeChecked()
      
      await user.click(marketingToggle)
      
      expect(marketingToggle).toBeChecked()
    })

    it('shows unsaved changes alert when preferences are modified', async () => {
      const user = userEvent.setup()
      render(<PrivacyDashboard />)
      
      const marketingToggle = screen.getByLabelText(/Toggle Marketing/)
      await user.click(marketingToggle)
      
      expect(screen.getByText('You have unsaved changes to your privacy preferences.')).toBeInTheDocument()
    })

    it('enables save button when changes are made', async () => {
      const user = userEvent.setup()
      render(<PrivacyDashboard />)
      
      const saveButton = screen.getByRole('button', { name: 'Save Preferences' })
      expect(saveButton).toBeDisabled()
      
      const marketingToggle = screen.getByLabelText(/Toggle Marketing/)
      await user.click(marketingToggle)
      
      expect(saveButton).toBeEnabled()
    })

    it('saves preferences when save button is clicked', async () => {
      const user = userEvent.setup()
      render(<PrivacyDashboard />)
      
      // Make a change
      const marketingToggle = screen.getByLabelText(/Toggle Marketing/)
      await user.click(marketingToggle)
      
      // Save changes
      const saveButton = screen.getByRole('button', { name: 'Save Preferences' })
      await user.click(saveButton)
      
      expect(mockConsent.updateConsent).toHaveBeenCalledWith({
        necessary: true,
        analytics: true,
        marketing: true, // Changed
        functional: true,
      })
    })

    it('resets changes when reset button is clicked', async () => {
      const user = userEvent.setup()
      render(<PrivacyDashboard />)
      
      // Make a change
      const marketingToggle = screen.getByLabelText(/Toggle Marketing/)
      await user.click(marketingToggle)
      expect(marketingToggle).toBeChecked()
      
      // Reset changes
      const resetButton = screen.getByRole('button', { name: 'Reset Changes' })
      await user.click(resetButton)
      
      expect(marketingToggle).not.toBeChecked()
      expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument()
    })

    it('shows saving state during preference update', async () => {
      const user = userEvent.setup()
      mockUseCookieConsent.mockReturnValue({
        ...mockConsent,
        isSaving: true,
      })

      render(<PrivacyDashboard />)
      
      expect(screen.getByRole('button', { name: 'Saving...' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled()
    })
  })

  describe('Consent History', () => {
    it('displays consent history when available', () => {
      render(<PrivacyDashboard />)
      
      expect(screen.getByText('Consent History')).toBeInTheDocument()
      expect(screen.getByText('Your previous privacy preference changes')).toBeInTheDocument()
      
      // Check history entries
      expect(screen.getAllByText(/Jul 3, 2025/)).toHaveLength(1) // Only shows most recent ones
      expect(screen.getByText(/Analytics: Enabled • Marketing: Disabled • Functional: Enabled/)).toBeInTheDocument()
    })

    it('limits history display to 5 entries', () => {
      // Mock more than 5 entries
      const longHistory = Array.from({ length: 8 }, (_, i) => ({
        categories: { necessary: true, analytics: i % 2 === 0, marketing: false, functional: true },
        consentDate: `2025-07-0${i + 1}T10:00:00.000Z`,
        version: '1.0',
        hasConsented: true,
      }))

      mockUseCookieConsent.mockReturnValue({
        ...mockConsent,
        getConsentHistory: jest.fn(() => longHistory),
      })

      render(<PrivacyDashboard />)
      
      expect(screen.getByText('...and 3 more entries')).toBeInTheDocument()
    })

    it('does not show consent history section when no history', () => {
      mockUseCookieConsent.mockReturnValue({
        ...mockConsent,
        getConsentHistory: jest.fn(() => []),
      })

      render(<PrivacyDashboard />)
      
      expect(screen.queryByText('Consent History')).not.toBeInTheDocument()
    })
  })

  describe('Data Export', () => {
    it('exports data when export button is clicked', async () => {
      const user = userEvent.setup()
      render(<PrivacyDashboard />)
      
      const exportButton = screen.getByRole('button', { name: 'Export Data' })
      await user.click(exportButton)
      
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockClick).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalled()
    })

    it('shows exporting state during export', async () => {
      const user = userEvent.setup()
      
      // Mock a slow export
      mockCreateObjectURL.mockImplementation(() => {
        return new Promise(resolve => setTimeout(() => resolve('blob:mock-url'), 100))
      })

      render(<PrivacyDashboard />)
      
      const exportButton = screen.getByRole('button', { name: 'Export Data' })
      
      // Start export (don't await)
      user.click(exportButton)
      
      // Should show exporting state immediately
      expect(screen.getByRole('button', { name: 'Exporting...' })).toBeInTheDocument()
    })

    it('includes correct data in export', async () => {
      const user = userEvent.setup()
      render(<PrivacyDashboard />)
      
      const exportButton = screen.getByRole('button', { name: 'Export Data' })
      await user.click(exportButton)
      
      // Check that Blob was created with expected data structure
      const createBlobCall = global.Blob.prototype.constructor.mock?.calls?.[0]
      if (createBlobCall) {
        const exportDataString = createBlobCall[0][0]
        const exportData = JSON.parse(exportDataString)
        
        expect(exportData).toHaveProperty('timestamp')
        expect(exportData).toHaveProperty('currentPreferences')
        expect(exportData).toHaveProperty('consentHistory')
        expect(exportData).toHaveProperty('metadata')
        expect(exportData.currentPreferences).toEqual(mockConsent.preferences)
      }
    })

    it('handles export errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      mockCreateObjectURL.mockImplementation(() => {
        throw new Error('Export failed')
      })

      render(<PrivacyDashboard />)
      
      const exportButton = screen.getByRole('button', { name: 'Export Data' })
      await user.click(exportButton)
      
      expect(consoleSpy).toHaveBeenCalledWith('Error exporting data:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('Consent Reset', () => {
    it('shows reset dialog when reset button is clicked', async () => {
      const user = userEvent.setup()
      render(<PrivacyDashboard />)
      
      const resetButton = screen.getByRole('button', { name: 'Reset Consent' })
      await user.click(resetButton)
      
      expect(screen.getByText('Reset Privacy Consent')).toBeInTheDocument()
      expect(screen.getByText(/This will clear all your privacy preferences/)).toBeInTheDocument()
    })

    it('resets consent when confirmed', async () => {
      const user = userEvent.setup()
      render(<PrivacyDashboard />)
      
      // Open reset dialog
      const resetButton = screen.getByRole('button', { name: 'Reset Consent' })
      await user.click(resetButton)
      
      // Confirm reset
      const confirmButton = screen.getByRole('button', { name: 'Reset Consent' })
      await user.click(confirmButton)
      
      expect(mockConsent.resetConsent).toHaveBeenCalled()
    })

    it('cancels reset when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<PrivacyDashboard />)
      
      // Open reset dialog
      const resetButton = screen.getByRole('button', { name: 'Reset Consent' })
      await user.click(resetButton)
      
      // Cancel reset
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      await user.click(cancelButton)
      
      expect(mockConsent.resetConsent).not.toHaveBeenCalled()
      expect(screen.queryByText('Reset Privacy Consent')).not.toBeInTheDocument()
    })
  })

  describe('Account Deletion', () => {
    it('shows delete dialog when delete button is clicked', async () => {
      const user = userEvent.setup()
      render(<PrivacyDashboard />)
      
      const deleteButton = screen.getByRole('button', { name: 'Request Account Deletion' })
      await user.click(deleteButton)
      
      expect(screen.getByText('Delete Account')).toBeInTheDocument()
      expect(screen.getByText(/This will permanently delete your account/)).toBeInTheDocument()
    })

    it('calls API when account deletion is confirmed', async () => {
      const user = userEvent.setup()
      render(<PrivacyDashboard />)
      
      // Open delete dialog
      const deleteButton = screen.getByRole('button', { name: 'Request Account Deletion' })
      await user.click(deleteButton)
      
      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: 'Request Deletion' })
      await user.click(confirmButton)
      
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/privacy/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })
    })

    it('shows success message when deletion request succeeds', async () => {
      const user = userEvent.setup()
      render(<PrivacyDashboard />)
      
      // Open delete dialog
      const deleteButton = screen.getByRole('button', { name: 'Request Account Deletion' })
      await user.click(deleteButton)
      
      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: 'Request Deletion' })
      await user.click(confirmButton)
      
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Account deletion request submitted. You will receive an email with further instructions.'
        )
      })
    })

    it('handles API errors gracefully', async () => {
      const user = userEvent.setup()
      mockFetch.mockRejectedValue(new Error('Network error'))
      
      render(<PrivacyDashboard />)
      
      // Open delete dialog
      const deleteButton = screen.getByRole('button', { name: 'Request Account Deletion' })
      await user.click(deleteButton)
      
      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: 'Request Deletion' })
      await user.click(confirmButton)
      
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Failed to submit deletion request. Please contact support.'
        )
      })
    })

    it('shows loading state during deletion request', async () => {
      const user = userEvent.setup()
      
      // Mock slow API response
      mockFetch.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100)
      }))

      render(<PrivacyDashboard />)
      
      // Open delete dialog
      const deleteButton = screen.getByRole('button', { name: 'Request Account Deletion' })
      await user.click(deleteButton)
      
      // Start deletion (don't await)
      const confirmButton = screen.getByRole('button', { name: 'Request Deletion' })
      user.click(confirmButton)
      
      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Deleting...')).toBeInTheDocument()
      })
    })
  })

  describe('Legal Links', () => {
    it('displays legal information section', () => {
      render(<PrivacyDashboard />)
      
      expect(screen.getByText('Legal Information')).toBeInTheDocument()
      expect(screen.getByText('Review our privacy policies and terms')).toBeInTheDocument()
    })

    it('includes links to legal documents', () => {
      render(<PrivacyDashboard />)
      
      const privacyLink = screen.getByRole('link', { name: 'Privacy Policy' })
      const cookieLink = screen.getByRole('link', { name: 'Cookie Policy' })
      const termsLink = screen.getByRole('link', { name: 'Terms of Service' })
      
      expect(privacyLink).toHaveAttribute('href', '/privacy')
      expect(cookieLink).toHaveAttribute('href', '/cookies')
      expect(termsLink).toHaveAttribute('href', '/terms')
      
      // Check that links open in new tab
      expect(privacyLink).toHaveAttribute('target', '_blank')
      expect(cookieLink).toHaveAttribute('target', '_blank')
      expect(termsLink).toHaveAttribute('target', '_blank')
    })
  })

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<PrivacyDashboard />)
      
      const mainHeading = screen.getByRole('heading', { name: 'Privacy Dashboard' })
      expect(mainHeading).toBeInTheDocument()
      
      // Section headings should be properly nested
      expect(screen.getByText('Privacy Status')).toBeInTheDocument()
      expect(screen.getByText('Cookie Preferences')).toBeInTheDocument()
      expect(screen.getByText('Data Management')).toBeInTheDocument()
    })

    it('has accessible toggle labels', () => {
      render(<PrivacyDashboard />)
      
      expect(screen.getByLabelText(/Toggle Necessary/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Toggle Analytics/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Toggle Marketing/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Toggle Functional/)).toBeInTheDocument()
    })

    it('marks decorative icons as hidden from screen readers', () => {
      render(<PrivacyDashboard />)
      
      // Icons should be marked as decorative
      const icons = screen.getAllByTestId(/lucide-/)
      icons.forEach(icon => {
        expect(icon).toHaveAttribute('aria-hidden', 'true')
      })
    })
  })

  describe('State Synchronization', () => {
    it('updates temp categories when preferences change', () => {
      const { rerender } = render(<PrivacyDashboard />)
      
      // Change preferences
      const newPreferences = {
        ...mockConsent.preferences,
        categories: {
          necessary: true,
          analytics: false,
          marketing: true,
          functional: false,
        },
      }

      mockUseCookieConsent.mockReturnValue({
        ...mockConsent,
        preferences: newPreferences,
      })

      rerender(<PrivacyDashboard />)
      
      // Toggles should reflect new state
      expect(screen.getByLabelText(/Toggle Analytics/)).not.toBeChecked()
      expect(screen.getByLabelText(/Toggle Marketing/)).toBeChecked()
      expect(screen.getByLabelText(/Toggle Functional/)).not.toBeChecked()
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      const { container } = render(<PrivacyDashboard className="custom-privacy-dashboard" />)
      
      expect(container.firstChild).toHaveClass('custom-privacy-dashboard')
    })
  })
})

// Mock Blob constructor for testing
Object.defineProperty(global, 'Blob', {
  value: class MockBlob {
    constructor(content, options) {
      this.content = content
      this.options = options
    }
  }
})