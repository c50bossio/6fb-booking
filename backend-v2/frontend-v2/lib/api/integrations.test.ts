/**
 * Comprehensive test suite for integrations API client.
 * Tests all API methods, error handling, and request formatting.
 */

// Mock the fetchAPI function BEFORE any imports
const mockFetchAPI = jest.fn()

jest.mock('../api', () => ({
  fetchAPI: mockFetchAPI
}))

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { integrationsAPI } from './integrations'
import { IntegrationType, IntegrationStatus } from '@/types/integration'
import type {
  IntegrationResponse,
  IntegrationCreate,
  IntegrationUpdate,
  OAuthInitiateRequest,
  OAuthCallbackResponse,
  IntegrationHealthCheck,
  IntegrationHealthSummary,
  IntegrationDisconnectResponse,
  IntegrationTokenRefreshRequest,
  IntegrationTokenRefreshResponse
} from '@/types/integration'

// Test data
const mockIntegration: IntegrationResponse = {
  id: 1,
  user_id: 1,
  name: 'Test Google Calendar',
  integration_type: IntegrationType.GOOGLE_CALENDAR,
  status: IntegrationStatus.ACTIVE,
  scopes: ['https://www.googleapis.com/auth/calendar'],
  is_active: true,
  is_connected: true,
  config: { calendar_id: 'primary' },
  error_count: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  last_sync_at: '2024-01-01T12:00:00Z'
}

const mockOAuthResponse = {
  authorization_url: 'https://accounts.google.com/oauth2/auth?client_id=test&state=abc123',
  state: 'abc123'
}

const mockHealthCheck: IntegrationHealthCheck = {
  integration_id: 1,
  integration_type: IntegrationType.GOOGLE_CALENDAR,
  name: 'Test Integration',
  status: IntegrationStatus.ACTIVE,
  healthy: true,
  last_check: '2024-01-01T12:00:00Z',
  details: { message: 'Connection successful' }
}

describe('IntegrationsAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('OAuth Flow Methods', () => {
    describe('initiateOAuth', () => {
      it('initiates OAuth flow with required parameters', async () => {
        mockFetchAPI.mockResolvedValue(mockOAuthResponse)

        const request: OAuthInitiateRequest = {
          integration_type: IntegrationType.GOOGLE_CALENDAR
        }

        const result = await integrationsAPI.initiateOAuth(request)

        expect(mockFetchAPI).toHaveBeenCalledWith('/api/v1/integrations/connect', {
          method: 'POST',
          body: JSON.stringify(request)
        })
        expect(result).toEqual(mockOAuthResponse)
      })

      it('initiates OAuth flow with optional parameters', async () => {
        mockFetchAPI.mockResolvedValue(mockOAuthResponse)

        const request: OAuthInitiateRequest = {
          integration_type: IntegrationType.GOOGLE_CALENDAR,
          redirect_uri: 'https://example.com/callback',
          scopes: ['https://www.googleapis.com/auth/calendar.readonly']
        }

        await integrationsAPI.initiateOAuth(request)

        expect(mockFetchAPI).toHaveBeenCalledWith('/api/v1/integrations/connect', {
          method: 'POST',
          body: JSON.stringify(request)
        })
      })

      it('handles OAuth initiation errors', async () => {
        const error = new Error('OAuth service unavailable')
        mockFetchAPI.mockRejectedValue(error)

        const request: OAuthInitiateRequest = {
          integration_type: IntegrationType.GOOGLE_CALENDAR
        }

        await expect(integrationsAPI.initiateOAuth(request)).rejects.toThrow('OAuth service unavailable')
      })
    })

    describe('handleOAuthCallback', () => {
      it('handles OAuth callback with success', async () => {
        const mockCallbackResponse: OAuthCallbackResponse = {
          success: true,
          integration_id: 1,
          message: 'Integration connected successfully',
          redirect_url: '/integrations/1/success'
        }

        mockFetchAPI.mockResolvedValue(mockCallbackResponse)

        const result = await integrationsAPI.handleOAuthCallback(
          'auth_code_123',
          'state_abc',
          IntegrationType.GOOGLE_CALENDAR
        )

        const expectedUrl = '/api/v1/integrations/callback?code=auth_code_123&state=state_abc&integration_type=google_calendar'
        expect(mockFetchAPI).toHaveBeenCalledWith(expectedUrl)
        expect(result).toEqual(mockCallbackResponse)
      })

      it('handles OAuth callback with error', async () => {
        const mockCallbackResponse: OAuthCallbackResponse = {
          success: false,
          message: 'OAuth authorization failed: access_denied'
        }

        mockFetchAPI.mockResolvedValue(mockCallbackResponse)

        const result = await integrationsAPI.handleOAuthCallback(
          'auth_code_123',
          'state_abc',
          IntegrationType.GOOGLE_CALENDAR,
          'access_denied',
          'User denied access'
        )

        const expectedUrl = '/api/v1/integrations/callback?code=auth_code_123&state=state_abc&integration_type=google_calendar&error=access_denied&error_description=User+denied+access'
        expect(mockFetchAPI).toHaveBeenCalledWith(expectedUrl)
        expect(result.success).toBe(false)
      })

      it('properly encodes URL parameters', async () => {
        mockFetchAPI.mockResolvedValue({ success: true, message: 'Success' })

        await integrationsAPI.handleOAuthCallback(
          'code with spaces',
          'state/with/slashes',
          IntegrationType.GOOGLE_CALENDAR
        )

        const expectedUrl = '/api/v1/integrations/callback?code=code+with+spaces&state=state%2Fwith%2Fslashes&integration_type=google_calendar'
        expect(mockFetchAPI).toHaveBeenCalledWith(expectedUrl)
      })
    })
  })

  describe('Integration CRUD Methods', () => {
    describe('getIntegrations', () => {
      it('gets all integrations without filter', async () => {
        const mockIntegrations = [mockIntegration]
        mockFetchAPI.mockResolvedValue(mockIntegrations)

        const result = await integrationsAPI.getIntegrations()

        expect(mockFetchAPI).toHaveBeenCalledWith('/api/v1/integrations/status')
        expect(result).toEqual(mockIntegrations)
      })

      it('gets integrations filtered by type', async () => {
        const mockIntegrations = [mockIntegration]
        mockFetchAPI.mockResolvedValue(mockIntegrations)

        const result = await integrationsAPI.getIntegrations(IntegrationType.GOOGLE_CALENDAR)

        expect(mockFetchAPI).toHaveBeenCalledWith('/api/v1/integrations/status?integration_type=google_calendar')
        expect(result).toEqual(mockIntegrations)
      })

      it('handles empty integrations list', async () => {
        mockFetchAPI.mockResolvedValue([])

        const result = await integrationsAPI.getIntegrations()

        expect(result).toEqual([])
      })
    })

    describe('getIntegration', () => {
      it('gets specific integration by ID', async () => {
        mockFetchAPI.mockResolvedValue(mockIntegration)

        const result = await integrationsAPI.getIntegration(1)

        expect(mockFetchAPI).toHaveBeenCalledWith('/api/v1/integrations/1')
        expect(result).toEqual(mockIntegration)
      })

      it('handles integration not found', async () => {
        const error = new Error('Integration not found')
        mockFetchAPI.mockRejectedValue(error)

        await expect(integrationsAPI.getIntegration(999)).rejects.toThrow('Integration not found')
      })
    })

    describe('createIntegration', () => {
      it('creates new integration with OAuth', async () => {
        const createData: IntegrationCreate = {
          name: 'My Google Calendar',
          integration_type: IntegrationType.GOOGLE_CALENDAR,
          is_active: true,
          config: { calendar_id: 'primary' }
        }

        mockFetchAPI.mockResolvedValue(mockIntegration)

        const result = await integrationsAPI.createIntegration(createData)

        expect(mockFetchAPI).toHaveBeenCalledWith('/api/v1/integrations', {
          method: 'POST',
          body: JSON.stringify(createData)
        })
        expect(result).toEqual(mockIntegration)
      })

      it('creates new integration with API key', async () => {
        const createData: IntegrationCreate = {
          name: 'SendGrid Email',
          integration_type: IntegrationType.SENDGRID,
          is_active: true,
          api_key: 'sg_test_key_123'
        }

        const mockSendGridIntegration = {
          ...mockIntegration,
          id: 2,
          name: 'SendGrid Email',
          integration_type: IntegrationType.SENDGRID
        }

        mockFetchAPI.mockResolvedValue(mockSendGridIntegration)

        const result = await integrationsAPI.createIntegration(createData)

        expect(mockFetchAPI).toHaveBeenCalledWith('/api/v1/integrations', {
          method: 'POST',
          body: JSON.stringify(createData)
        })
        expect(result).toEqual(mockSendGridIntegration)
      })

      it('creates integration with webhook URL', async () => {
        const createData: IntegrationCreate = {
          name: 'Custom Webhook',
          integration_type: IntegrationType.CUSTOM,
          is_active: true,
          webhook_url: 'https://example.com/webhook'
        }

        mockFetchAPI.mockResolvedValue(mockIntegration)

        await integrationsAPI.createIntegration(createData)

        expect(mockFetchAPI).toHaveBeenCalledWith('/api/v1/integrations', {
          method: 'POST',
          body: JSON.stringify(createData)
        })
      })

      it('handles creation validation errors', async () => {
        const error = new Error('Missing required fields')
        mockFetchAPI.mockRejectedValue(error)

        const createData: IntegrationCreate = {
          name: '',
          integration_type: IntegrationType.SENDGRID,
          is_active: true
        }

        await expect(integrationsAPI.createIntegration(createData)).rejects.toThrow('Missing required fields')
      })
    })

    describe('updateIntegration', () => {
      it('updates integration configuration', async () => {
        const updateData: IntegrationUpdate = {
          name: 'Updated Calendar',
          is_active: false,
          config: { calendar_id: 'secondary' }
        }

        const updatedIntegration = {
          ...mockIntegration,
          name: 'Updated Calendar',
          is_active: false,
          config: { calendar_id: 'secondary' }
        }

        mockFetchAPI.mockResolvedValue(updatedIntegration)

        const result = await integrationsAPI.updateIntegration(1, updateData)

        expect(mockFetchAPI).toHaveBeenCalledWith('/api/v1/integrations/1', {
          method: 'PUT',
          body: JSON.stringify(updateData)
        })
        expect(result).toEqual(updatedIntegration)
      })

      it('updates partial integration data', async () => {
        const updateData: IntegrationUpdate = {
          is_active: false
        }

        const updatedIntegration = {
          ...mockIntegration,
          is_active: false
        }

        mockFetchAPI.mockResolvedValue(updatedIntegration)

        const result = await integrationsAPI.updateIntegration(1, updateData)

        expect(mockFetchAPI).toHaveBeenCalledWith('/api/v1/integrations/1', {
          method: 'PUT',
          body: JSON.stringify(updateData)
        })
        expect(result.is_active).toBe(false)
      })

      it('handles update validation errors', async () => {
        const error = new Error('Invalid configuration')
        mockFetchAPI.mockRejectedValue(error)

        const updateData: IntegrationUpdate = {
          config: { invalid: 'data' }
        }

        await expect(integrationsAPI.updateIntegration(1, updateData)).rejects.toThrow('Invalid configuration')
      })
    })

    describe('disconnectIntegration', () => {
      it('disconnects integration successfully', async () => {
        const mockDisconnectResponse: IntegrationDisconnectResponse = {
          success: true,
          message: 'Integration disconnected successfully',
          integration_id: 1
        }

        mockFetchAPI.mockResolvedValue(mockDisconnectResponse)

        const result = await integrationsAPI.disconnectIntegration(1)

        expect(mockFetchAPI).toHaveBeenCalledWith('/api/v1/integrations/1', {
          method: 'DELETE'
        })
        expect(result).toEqual(mockDisconnectResponse)
      })

      it('handles disconnection errors', async () => {
        const error = new Error('Integration not found')
        mockFetchAPI.mockRejectedValue(error)

        await expect(integrationsAPI.disconnectIntegration(999)).rejects.toThrow('Integration not found')
      })
    })
  })

  describe('Health Check Methods', () => {
    describe('checkAllIntegrationsHealth', () => {
      it('checks health of all integrations', async () => {
        const mockHealthSummary: IntegrationHealthSummary = {
          total_integrations: 2,
          healthy_count: 1,
          error_count: 1,
          inactive_count: 0,
          integrations: [
            mockHealthCheck,
            {
              ...mockHealthCheck,
              integration_id: 2,
              healthy: false,
              error: 'Connection timeout'
            }
          ],
          checked_at: '2024-01-01T12:00:00Z'
        }

        mockFetchAPI.mockResolvedValue(mockHealthSummary)

        const result = await integrationsAPI.checkAllIntegrationsHealth()

        expect(mockFetchAPI).toHaveBeenCalledWith('/api/v1/integrations/health/all')
        expect(result).toEqual(mockHealthSummary)
        expect(result.total_integrations).toBe(2)
        expect(result.healthy_count).toBe(1)
        expect(result.error_count).toBe(1)
      })

      it('handles empty health check results', async () => {
        const emptyHealthSummary: IntegrationHealthSummary = {
          total_integrations: 0,
          healthy_count: 0,
          error_count: 0,
          inactive_count: 0,
          integrations: [],
          checked_at: '2024-01-01T12:00:00Z'
        }

        mockFetchAPI.mockResolvedValue(emptyHealthSummary)

        const result = await integrationsAPI.checkAllIntegrationsHealth()

        expect(result.total_integrations).toBe(0)
        expect(result.integrations).toEqual([])
      })
    })

    describe('checkIntegrationHealth', () => {
      it('checks health of specific integration', async () => {
        mockFetchAPI.mockResolvedValue(mockHealthCheck)

        const result = await integrationsAPI.checkIntegrationHealth(1)

        expect(mockFetchAPI).toHaveBeenCalledWith('/api/v1/integrations/health/1')
        expect(result).toEqual(mockHealthCheck)
        expect(result.healthy).toBe(true)
      })

      it('handles unhealthy integration check', async () => {
        const unhealthyCheck: IntegrationHealthCheck = {
          ...mockHealthCheck,
          healthy: false,
          error: 'Authentication failed'
        }

        mockFetchAPI.mockResolvedValue(unhealthyCheck)

        const result = await integrationsAPI.checkIntegrationHealth(1)

        expect(result.healthy).toBe(false)
        expect(result.error).toBe('Authentication failed')
      })

      it('handles health check API errors', async () => {
        const error = new Error('Health check service unavailable')
        mockFetchAPI.mockRejectedValue(error)

        await expect(integrationsAPI.checkIntegrationHealth(1)).rejects.toThrow('Health check service unavailable')
      })
    })
  })

  describe('Token Management Methods', () => {
    describe('refreshTokens', () => {
      it('refreshes tokens successfully', async () => {
        const refreshRequest: IntegrationTokenRefreshRequest = {
          integration_id: 1,
          force: true
        }

        const mockRefreshResponse: IntegrationTokenRefreshResponse = {
          success: true,
          message: 'Token refreshed successfully',
          expires_at: '2024-01-01T13:00:00Z'
        }

        mockFetchAPI.mockResolvedValue(mockRefreshResponse)

        const result = await integrationsAPI.refreshTokens(refreshRequest)

        expect(mockFetchAPI).toHaveBeenCalledWith('/api/v1/integrations/refresh-token', {
          method: 'POST',
          body: JSON.stringify(refreshRequest)
        })
        expect(result).toEqual(mockRefreshResponse)
      })

      it('handles token refresh when not needed', async () => {
        const refreshRequest: IntegrationTokenRefreshRequest = {
          integration_id: 1,
          force: false
        }

        const mockRefreshResponse: IntegrationTokenRefreshResponse = {
          success: true,
          message: 'Token is still valid',
          expires_at: '2024-01-01T14:00:00Z'
        }

        mockFetchAPI.mockResolvedValue(mockRefreshResponse)

        const result = await integrationsAPI.refreshTokens(refreshRequest)

        expect(result.success).toBe(true)
        expect(result.message).toContain('still valid')
      })

      it('handles token refresh failures', async () => {
        const refreshRequest: IntegrationTokenRefreshRequest = {
          integration_id: 1,
          force: true
        }

        const mockRefreshResponse: IntegrationTokenRefreshResponse = {
          success: false,
          message: 'No refresh token available'
        }

        mockFetchAPI.mockResolvedValue(mockRefreshResponse)

        const result = await integrationsAPI.refreshTokens(refreshRequest)

        expect(result.success).toBe(false)
        expect(result.message).toContain('No refresh token available')
      })
    })
  })

  describe('Testing and Utility Methods', () => {
    describe('testConnection', () => {
      it('tests connection successfully', async () => {
        const mockTestResponse = {
          success: true,
          message: 'Connection test passed'
        }

        mockFetchAPI.mockResolvedValue(mockTestResponse)

        const result = await integrationsAPI.testConnection(1)

        expect(mockFetchAPI).toHaveBeenCalledWith('/api/v1/integrations/1/test', {
          method: 'POST'
        })
        expect(result).toEqual(mockTestResponse)
      })

      it('handles connection test failures', async () => {
        const mockTestResponse = {
          success: false,
          message: 'Invalid API credentials'
        }

        mockFetchAPI.mockResolvedValue(mockTestResponse)

        const result = await integrationsAPI.testConnection(1)

        expect(result.success).toBe(false)
        expect(result.message).toBe('Invalid API credentials')
      })

      it('handles connection test API errors', async () => {
        const error = new Error('Test service unavailable')
        mockFetchAPI.mockRejectedValue(error)

        await expect(integrationsAPI.testConnection(1)).rejects.toThrow('Test service unavailable')
      })
    })

    describe('getAvailableIntegrations', () => {
      it('gets available integration metadata', async () => {
        const mockAvailableIntegrations = {
          google_calendar: {
            name: 'Google Calendar',
            description: 'Sync appointments',
            requiresOAuth: true
          },
          sendgrid: {
            name: 'SendGrid',
            description: 'Email service',
            requiresOAuth: false
          }
        }

        mockFetchAPI.mockResolvedValue(mockAvailableIntegrations)

        const result = await integrationsAPI.getAvailableIntegrations()

        expect(mockFetchAPI).toHaveBeenCalledWith('/api/v1/integrations/available')
        expect(result).toEqual(mockAvailableIntegrations)
      })

      it('handles empty available integrations', async () => {
        mockFetchAPI.mockResolvedValue({})

        const result = await integrationsAPI.getAvailableIntegrations()

        expect(result).toEqual({})
      })
    })
  })

  describe('Error Handling', () => {
    it('propagates network errors', async () => {
      const networkError = new Error('Network request failed')
      mockFetchAPI.mockRejectedValue(networkError)

      await expect(integrationsAPI.getIntegrations()).rejects.toThrow('Network request failed')
    })

    it('propagates API validation errors', async () => {
      const validationError = new Error('Validation failed')
      mockFetchAPI.mockRejectedValue(validationError)

      const createData: IntegrationCreate = {
        name: '',
        integration_type: IntegrationType.GOOGLE_CALENDAR,
        is_active: true
      }

      await expect(integrationsAPI.createIntegration(createData)).rejects.toThrow('Validation failed')
    })

    it('propagates authentication errors', async () => {
      const authError = new Error('Unauthorized')
      mockFetchAPI.mockRejectedValue(authError)

      await expect(integrationsAPI.getIntegrations()).rejects.toThrow('Unauthorized')
    })

    it('propagates server errors', async () => {
      const serverError = new Error('Internal server error')
      mockFetchAPI.mockRejectedValue(serverError)

      await expect(integrationsAPI.checkAllIntegrationsHealth()).rejects.toThrow('Internal server error')
    })
  })

  describe('Request Formatting', () => {
    it('properly formats JSON request bodies', async () => {
      const createData: IntegrationCreate = {
        name: 'Test Integration',
        integration_type: IntegrationType.STRIPE,
        is_active: true,
        config: { webhook_endpoint: 'https://example.com/stripe' }
      }

      mockFetchAPI.mockResolvedValue(mockIntegration)

      await integrationsAPI.createIntegration(createData)

      expect(mockFetchAPI).toHaveBeenCalledWith('/api/v1/integrations', {
        method: 'POST',
        body: JSON.stringify(createData)
      })
    })

    it('properly formats URL query parameters', async () => {
      mockFetchAPI.mockResolvedValue([])

      await integrationsAPI.getIntegrations(IntegrationType.GOOGLE_MY_BUSINESS)

      expect(mockFetchAPI).toHaveBeenCalledWith('/api/v1/integrations/status?integration_type=google_my_business')
    })

    it('handles special characters in URLs', async () => {
      mockFetchAPI.mockResolvedValue({ success: true, message: 'Success' })

      await integrationsAPI.handleOAuthCallback(
        'code+with/special&chars',
        'state=with&equals',
        IntegrationType.GOOGLE_CALENDAR
      )

      const expectedUrl = '/api/v1/integrations/callback?code=code%2Bwith%2Fspecial%26chars&state=state%3Dwith%26equals&integration_type=google_calendar'
      expect(mockFetchAPI).toHaveBeenCalledWith(expectedUrl)
    })
  })
})