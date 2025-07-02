/**
 * Comprehensive test suite for IntegrationCard component.
 * Tests rendering, user interactions, OAuth flows, and error handling.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { toast } from '@/hooks/use-toast'
import { integrationsAPI } from '@/lib/api/integrations'
import IntegrationCard from './IntegrationCard'
import { IntegrationType, IntegrationStatus } from '@/types/integration'
import type { IntegrationResponse, IntegrationMetadata } from '@/types/integration'

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}))

vi.mock('@/lib/api/integrations', () => ({
  integrationsAPI: {
    initiateOAuth: vi.fn(),
    createIntegration: vi.fn(),
    updateIntegration: vi.fn(),
    disconnectIntegration: vi.fn(),
    testConnection: vi.fn()
  }
}))

// Mock Heroicons
vi.mock('@heroicons/react/24/outline', () => ({
  CalendarIcon: ({ className }: { className: string }) => <div className={className} data-testid="calendar-icon" />,
  CreditCardIcon: ({ className }: { className: string }) => <div className={className} data-testid="credit-card-icon" />,
  EnvelopeIcon: ({ className }: { className: string }) => <div className={className} data-testid="envelope-icon" />,
  PhoneIcon: ({ className }: { className: string }) => <div className={className} data-testid="phone-icon" />,
  CogIcon: ({ className }: { className: string }) => <div className={className} data-testid="cog-icon" />,
  CheckCircle: ({ className }: { className: string }) => <div className={className} data-testid="check-circle" />,
  XCircle: ({ className }: { className: string }) => <div className={className} data-testid="x-circle" />,
  AlertCircle: ({ className }: { className: string }) => <div className={className} data-testid="alert-circle" />,
  RefreshCw: ({ className }: { className: string }) => <div className={className} data-testid="refresh-cw" />,
  ExternalLink: ({ className }: { className: string }) => <div className={className} data-testid="external-link" />,
  Loader2: ({ className }: { className: string }) => <div className={className} data-testid="loader-2" />
}))

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

// Test data
const mockGoogleCalendarMetadata: IntegrationMetadata = {
  type: IntegrationType.GOOGLE_CALENDAR,
  name: 'google_calendar',
  displayName: 'Google Calendar',
  description: 'Sync appointments with Google Calendar for seamless scheduling',
  icon: 'CalendarIcon',
  color: '#4285F4',
  requiresOAuth: true,
  features: [
    'Two-way appointment sync',
    'Automatic availability updates',
    'Event reminders',
    'Multi-calendar support'
  ],
  helpUrl: 'https://support.bookedbarber.com/integrations/google-calendar'
}

const mockSendGridMetadata: IntegrationMetadata = {
  type: IntegrationType.SENDGRID,
  name: 'sendgrid',
  displayName: 'SendGrid',
  description: 'Send transactional and marketing emails',
  icon: 'EnvelopeIcon',
  color: '#1A82E2',
  requiresOAuth: false,
  requiredFields: ['api_key'],
  features: [
    'Automated appointment reminders',
    'Marketing campaigns',
    'Email analytics',
    'Custom templates'
  ],
  helpUrl: 'https://support.bookedbarber.com/integrations/sendgrid'
}

const mockActiveIntegration: IntegrationResponse = {
  id: 1,
  user_id: 1,
  name: 'My Google Calendar',
  integration_type: IntegrationType.GOOGLE_CALENDAR,
  status: IntegrationStatus.ACTIVE,
  scopes: ['https://www.googleapis.com/auth/calendar'],
  is_active: true,
  is_connected: true,
  config: {},
  error_count: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  last_sync_at: '2024-01-01T12:00:00Z'
}

const mockErrorIntegration: IntegrationResponse = {
  ...mockActiveIntegration,
  id: 2,
  status: IntegrationStatus.ERROR,
  is_connected: false,
  last_error: 'Authentication failed. Please reconnect your account.'
}

describe('IntegrationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Rendering', () => {
    it('renders integration card without existing integration', () => {
      render(
        <IntegrationCard
          metadata={mockGoogleCalendarMetadata}
        />
      )

      expect(screen.getByText('Google Calendar')).toBeInTheDocument()
      expect(screen.getByText('Sync appointments with Google Calendar for seamless scheduling')).toBeInTheDocument()
      expect(screen.getByText('Two-way appointment sync')).toBeInTheDocument()
      expect(screen.getByText('Connect Google Calendar')).toBeInTheDocument()
      expect(screen.getByTestId('calendar-icon')).toBeInTheDocument()
    })

    it('renders integration card with active integration', () => {
      render(
        <IntegrationCard
          integration={mockActiveIntegration}
          metadata={mockGoogleCalendarMetadata}
        />
      )

      expect(screen.getByText('active')).toBeInTheDocument()
      expect(screen.getByText('Enabled')).toBeInTheDocument()
      expect(screen.getByText('Disconnect')).toBeInTheDocument()
      expect(screen.getByTestId('check-circle')).toBeInTheDocument()
    })

    it('renders integration card with error status', () => {
      render(
        <IntegrationCard
          integration={mockErrorIntegration}
          metadata={mockGoogleCalendarMetadata}
        />
      )

      expect(screen.getByText('error')).toBeInTheDocument()
      expect(screen.getByText('Authentication failed. Please reconnect your account.')).toBeInTheDocument()
      expect(screen.getByTestId('alert-circle')).toBeInTheDocument()
    })

    it('renders last sync information when available', () => {
      render(
        <IntegrationCard
          integration={mockActiveIntegration}
          metadata={mockGoogleCalendarMetadata}
        />
      )

      expect(screen.getByText('Last synced')).toBeInTheDocument()
      expect(screen.getByText('1/1/2024, 12:00:00 PM')).toBeInTheDocument()
    })

    it('renders features list correctly', () => {
      render(
        <IntegrationCard
          metadata={mockGoogleCalendarMetadata}
        />
      )

      mockGoogleCalendarMetadata.features.slice(0, 3).forEach(feature => {
        expect(screen.getByText(feature)).toBeInTheDocument()
      })
    })

    it('applies correct status colors', () => {
      const { rerender } = render(
        <IntegrationCard
          integration={mockActiveIntegration}
          metadata={mockGoogleCalendarMetadata}
        />
      )

      // Check for active status badge
      expect(screen.getByText('active')).toHaveClass('bg-green-100', 'text-green-800')

      // Rerender with error status
      rerender(
        <IntegrationCard
          integration={mockErrorIntegration}
          metadata={mockGoogleCalendarMetadata}
        />
      )

      expect(screen.getByText('error')).toHaveClass('bg-red-100', 'text-red-800')
    })
  })

  describe('OAuth Flow', () => {
    it('initiates OAuth flow for OAuth integrations', async () => {
      const mockOAuthResponse = {
        authorization_url: 'https://accounts.google.com/oauth2/auth?client_id=test',
        state: 'test_state'
      }

      ;(integrationsAPI.initiateOAuth as any).mockResolvedValue(mockOAuthResponse)

      // Mock window.location.href
      const originalLocation = window.location
      delete (window as any).location
      window.location = { ...originalLocation, href: '' }

      render(
        <IntegrationCard
          metadata={mockGoogleCalendarMetadata}
        />
      )

      const connectButton = screen.getByText('Connect Google Calendar')
      fireEvent.click(connectButton)

      await waitFor(() => {
        expect(integrationsAPI.initiateOAuth).toHaveBeenCalledWith({
          integration_type: IntegrationType.GOOGLE_CALENDAR
        })
      })

      await waitFor(() => {
        expect(window.location.href).toBe(mockOAuthResponse.authorization_url)
      })

      // Restore window.location
      window.location = originalLocation
    })

    it('handles OAuth initiation errors', async () => {
      ;(integrationsAPI.initiateOAuth as any).mockRejectedValue(new Error('OAuth failed'))

      render(
        <IntegrationCard
          metadata={mockGoogleCalendarMetadata}
        />
      )

      const connectButton = screen.getByText('Connect Google Calendar')
      fireEvent.click(connectButton)

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: 'Connection Error',
          description: 'Failed to connect Google Calendar. Please try again.',
          variant: 'destructive'
        })
      })
    })

    it('shows loading state during OAuth initiation', async () => {
      ;(integrationsAPI.initiateOAuth as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )

      render(
        <IntegrationCard
          metadata={mockGoogleCalendarMetadata}
        />
      )

      const connectButton = screen.getByText('Connect Google Calendar')
      fireEvent.click(connectButton)

      expect(screen.getByText('Connecting...')).toBeInTheDocument()
      expect(screen.getByTestId('loader-2')).toBeInTheDocument()
    })
  })

  describe('Non-OAuth Integration Configuration', () => {
    it('opens configuration dialog for non-OAuth integrations', () => {
      render(
        <IntegrationCard
          metadata={mockSendGridMetadata}
        />
      )

      const connectButton = screen.getByText('Connect SendGrid')
      fireEvent.click(connectButton)

      expect(screen.getByText('Configure SendGrid')).toBeInTheDocument()
      expect(screen.getByText('Enter your API credentials to connect SendGrid.')).toBeInTheDocument()
      expect(screen.getByLabelText('Api Key *')).toBeInTheDocument()
    })

    it('validates required fields in configuration dialog', async () => {
      render(
        <IntegrationCard
          metadata={mockSendGridMetadata}
        />
      )

      // Open dialog
      fireEvent.click(screen.getByText('Connect SendGrid'))

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: 'Connect' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: 'Missing Required Fields',
          description: 'Please fill in all required fields: api_key',
          variant: 'destructive'
        })
      })
    })

    it('creates integration with API credentials', async () => {
      const mockIntegrationResponse = {
        ...mockActiveIntegration,
        id: 3,
        integration_type: IntegrationType.SENDGRID,
        name: 'SendGrid'
      }

      ;(integrationsAPI.createIntegration as any).mockResolvedValue(mockIntegrationResponse)

      const mockOnUpdate = vi.fn()

      render(
        <IntegrationCard
          metadata={mockSendGridMetadata}
          onUpdate={mockOnUpdate}
        />
      )

      // Open dialog and fill form
      fireEvent.click(screen.getByText('Connect SendGrid'))
      
      const apiKeyInput = screen.getByLabelText('Api Key *')
      fireEvent.change(apiKeyInput, { target: { value: 'test_api_key_123' } })

      // Submit form
      const submitButton = screen.getByRole('button', { name: 'Connect' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(integrationsAPI.createIntegration).toHaveBeenCalledWith({
          name: 'SendGrid',
          integration_type: IntegrationType.SENDGRID,
          is_active: true,
          api_key: 'test_api_key_123'
        })
      })

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: 'Integration Connected',
          description: 'SendGrid has been connected successfully.'
        })
      })

      expect(mockOnUpdate).toHaveBeenCalledWith(mockIntegrationResponse)
    })

    it('handles configuration errors', async () => {
      ;(integrationsAPI.createIntegration as any).mockRejectedValue(new Error('Invalid API key'))

      render(
        <IntegrationCard
          metadata={mockSendGridMetadata}
        />
      )

      // Open dialog and fill form
      fireEvent.click(screen.getByText('Connect SendGrid'))
      
      const apiKeyInput = screen.getByLabelText('Api Key *')
      fireEvent.change(apiKeyInput, { target: { value: 'invalid_key' } })

      // Submit form
      const submitButton = screen.getByRole('button', { name: 'Connect' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: 'Connection Error',
          description: 'Failed to connect SendGrid. Please check your credentials and try again.',
          variant: 'destructive'
        })
      })
    })
  })

  describe('Integration Management', () => {
    it('toggles integration active status', async () => {
      const mockUpdatedIntegration = {
        ...mockActiveIntegration,
        is_active: false
      }

      ;(integrationsAPI.updateIntegration as any).mockResolvedValue(mockUpdatedIntegration)

      const mockOnUpdate = vi.fn()

      render(
        <IntegrationCard
          integration={mockActiveIntegration}
          metadata={mockGoogleCalendarMetadata}
          onUpdate={mockOnUpdate}
        />
      )

      const toggleSwitch = screen.getByRole('switch')
      fireEvent.click(toggleSwitch)

      await waitFor(() => {
        expect(integrationsAPI.updateIntegration).toHaveBeenCalledWith(1, {
          is_active: false
        })
      })

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: 'Integration Disabled',
          description: 'Google Calendar has been disabled.'
        })
      })

      expect(mockOnUpdate).toHaveBeenCalledWith(mockUpdatedIntegration)
    })

    it('disconnects integration', async () => {
      ;(integrationsAPI.disconnectIntegration as any).mockResolvedValue({
        success: true,
        message: 'Integration disconnected',
        integration_id: 1
      })

      const mockOnDisconnect = vi.fn()

      render(
        <IntegrationCard
          integration={mockActiveIntegration}
          metadata={mockGoogleCalendarMetadata}
          onDisconnect={mockOnDisconnect}
        />
      )

      const disconnectButton = screen.getByText('Disconnect')
      fireEvent.click(disconnectButton)

      await waitFor(() => {
        expect(integrationsAPI.disconnectIntegration).toHaveBeenCalledWith(1)
      })

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: 'Integration Disconnected',
          description: 'Google Calendar has been disconnected.'
        })
      })

      expect(mockOnDisconnect).toHaveBeenCalledWith(1)
    })

    it('tests connection for non-OAuth integrations', async () => {
      const sendGridIntegration = {
        ...mockActiveIntegration,
        integration_type: IntegrationType.SENDGRID
      }

      ;(integrationsAPI.testConnection as any).mockResolvedValue({
        success: true,
        message: 'Connection successful'
      })

      const mockOnHealthCheck = vi.fn()

      render(
        <IntegrationCard
          integration={sendGridIntegration}
          metadata={mockSendGridMetadata}
          onHealthCheck={mockOnHealthCheck}
        />
      )

      const testButton = screen.getByText('Test')
      fireEvent.click(testButton)

      await waitFor(() => {
        expect(integrationsAPI.testConnection).toHaveBeenCalledWith(1)
      })

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: 'Connection Successful',
          description: 'Connection successful',
          variant: 'default'
        })
      })

      expect(mockOnHealthCheck).toHaveBeenCalledWith(1)
    })

    it('handles connection test failures', async () => {
      const sendGridIntegration = {
        ...mockActiveIntegration,
        integration_type: IntegrationType.SENDGRID
      }

      ;(integrationsAPI.testConnection as any).mockResolvedValue({
        success: false,
        message: 'Invalid API key'
      })

      render(
        <IntegrationCard
          integration={sendGridIntegration}
          metadata={mockSendGridMetadata}
        />
      )

      const testButton = screen.getByText('Test')
      fireEvent.click(testButton)

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: 'Connection Failed',
          description: 'Invalid API key',
          variant: 'destructive'
        })
      })
    })

    it('disables test button for inactive integrations', () => {
      const inactiveIntegration = {
        ...mockActiveIntegration,
        integration_type: IntegrationType.SENDGRID,
        is_active: false
      }

      render(
        <IntegrationCard
          integration={inactiveIntegration}
          metadata={mockSendGridMetadata}
        />
      )

      const testButton = screen.getByText('Test')
      expect(testButton).toBeDisabled()
    })
  })

  describe('UI States and Loading', () => {
    it('shows loading states during operations', async () => {
      ;(integrationsAPI.updateIntegration as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )

      render(
        <IntegrationCard
          integration={mockActiveIntegration}
          metadata={mockGoogleCalendarMetadata}
        />
      )

      const toggleSwitch = screen.getByRole('switch')
      fireEvent.click(toggleSwitch)

      // Should show loading state
      expect(toggleSwitch).toBeDisabled()
    })

    it('shows testing state during connection test', async () => {
      const sendGridIntegration = {
        ...mockActiveIntegration,
        integration_type: IntegrationType.SENDGRID
      }

      ;(integrationsAPI.testConnection as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )

      render(
        <IntegrationCard
          integration={sendGridIntegration}
          metadata={mockSendGridMetadata}
        />
      )

      const testButton = screen.getByText('Test')
      fireEvent.click(testButton)

      expect(screen.getByTestId('loader-2')).toBeInTheDocument()
    })

    it('opens help URL in new tab', () => {
      const mockOpen = vi.fn()
      window.open = mockOpen

      render(
        <IntegrationCard
          integration={mockActiveIntegration}
          metadata={mockGoogleCalendarMetadata}
        />
      )

      const helpButton = screen.getByText('Help')
      fireEvent.click(helpButton)

      expect(mockOpen).toHaveBeenCalledWith(
        mockGoogleCalendarMetadata.helpUrl,
        '_blank'
      )
    })

    it('handles missing metadata gracefully', () => {
      const incompleteMetadata = {
        ...mockGoogleCalendarMetadata,
        features: []
      }

      render(
        <IntegrationCard
          metadata={incompleteMetadata}
        />
      )

      expect(screen.getByText('Google Calendar')).toBeInTheDocument()
      // Should not crash with empty features array
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(
        <IntegrationCard
          integration={mockActiveIntegration}
          metadata={mockGoogleCalendarMetadata}
        />
      )

      expect(screen.getByRole('switch')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument()
    })

    it('provides keyboard navigation support', () => {
      render(
        <IntegrationCard
          metadata={mockGoogleCalendarMetadata}
        />
      )

      const connectButton = screen.getByText('Connect Google Calendar')
      expect(connectButton).toBeInTheDocument()
      
      // Button should be focusable
      connectButton.focus()
      expect(document.activeElement).toBe(connectButton)
    })
  })

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      ;(integrationsAPI.disconnectIntegration as any).mockRejectedValue(
        new Error('Network error')
      )

      render(
        <IntegrationCard
          integration={mockActiveIntegration}
          metadata={mockGoogleCalendarMetadata}
        />
      )

      const disconnectButton = screen.getByText('Disconnect')
      fireEvent.click(disconnectButton)

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: 'Disconnection Error',
          description: 'Failed to disconnect Google Calendar. Please try again.',
          variant: 'destructive'
        })
      })
    })

    it('shows appropriate error messages for different operations', async () => {
      ;(integrationsAPI.updateIntegration as any).mockRejectedValue(
        new Error('Update failed')
      )

      render(
        <IntegrationCard
          integration={mockActiveIntegration}
          metadata={mockGoogleCalendarMetadata}
        />
      )

      const toggleSwitch = screen.getByRole('switch')
      fireEvent.click(toggleSwitch)

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: 'Update Error',
          description: 'Failed to update integration status. Please try again.',
          variant: 'destructive'
        })
      })
    })
  })
})