/**
 * API client for integration management
 * Handles OAuth flows, health checks, and integration CRUD operations
 */

import { fetchAPI } from '../api'
import type {
  IntegrationType,
  IntegrationResponse,
  IntegrationCreate,
  IntegrationUpdate,
  OAuthInitiateRequest,
  OAuthCallbackResponse,
  IntegrationHealthCheck,
  IntegrationHealthSummary,
  IntegrationDisconnectResponse,
  IntegrationTokenRefreshRequest,
  IntegrationTokenRefreshResponse,
  IntegrationSyncRequest,
  IntegrationSyncResponse
} from '@/types/integration'

class IntegrationsAPI {
  private baseUrl = '/api/v1/integrations'

  /**
   * Initiate OAuth connection flow
   */
  async initiateOAuth(data: OAuthInitiateRequest): Promise<{ authorization_url: string; state: string }> {
    return fetchAPI(`${this.baseUrl}/connect`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  /**
   * Handle OAuth callback (usually not called directly from frontend)
   */
  async handleOAuthCallback(
    code: string,
    state: string,
    integration_type: IntegrationType,
    error?: string,
    error_description?: string
  ): Promise<OAuthCallbackResponse> {
    const params = new URLSearchParams({
      code,
      state,
      integration_type,
      ...(error && { error }),
      ...(error_description && { error_description })
    })

    return fetchAPI(`${this.baseUrl}/callback?${params.toString()}`)
  }

  /**
   * Get all integrations for the current user
   */
  async getIntegrations(type?: IntegrationType): Promise<IntegrationResponse[]> {
    const params = type ? `?integration_type=${type}` : ''
    return fetchAPI(`${this.baseUrl}/status${params}`)
  }

  /**
   * Get a specific integration
   */
  async getIntegration(integrationId: number): Promise<IntegrationResponse> {
    return fetchAPI(`${this.baseUrl}/${integrationId}`)
  }

  /**
   * Create a new integration (for non-OAuth integrations)
   */
  async createIntegration(data: IntegrationCreate): Promise<IntegrationResponse> {
    return fetchAPI(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  /**
   * Update an integration
   */
  async updateIntegration(integrationId: number, data: IntegrationUpdate): Promise<IntegrationResponse> {
    return fetchAPI(`${this.baseUrl}/${integrationId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  /**
   * Disconnect and delete an integration
   */
  async disconnectIntegration(integrationId: number): Promise<IntegrationDisconnectResponse> {
    return fetchAPI(`${this.baseUrl}/${integrationId}`, {
      method: 'DELETE'
    })
  }

  /**
   * Check health of all integrations
   */
  async checkAllIntegrationsHealth(): Promise<IntegrationHealthSummary> {
    return fetchAPI(`${this.baseUrl}/health/all`)
  }

  /**
   * Check health of a specific integration
   */
  async checkIntegrationHealth(integrationId: number): Promise<IntegrationHealthCheck> {
    return fetchAPI(`${this.baseUrl}/health/${integrationId}`)
  }

  /**
   * Refresh OAuth tokens for an integration
   */
  async refreshTokens(data: IntegrationTokenRefreshRequest): Promise<IntegrationTokenRefreshResponse> {
    return fetchAPI(`${this.baseUrl}/refresh-token`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  /**
   * Sync data from an integration
   */
  async syncIntegration(data: IntegrationSyncRequest): Promise<IntegrationSyncResponse> {
    return fetchAPI(`${this.baseUrl}/sync`, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  /**
   * Test integration connection (for non-OAuth integrations)
   */
  async testConnection(integrationId: number): Promise<{ success: boolean; message: string }> {
    return fetchAPI(`${this.baseUrl}/${integrationId}/test`, {
      method: 'POST'
    })
  }

  /**
   * Get available integration types and their metadata
   */
  async getAvailableIntegrations(): Promise<Record<string, any>> {
    return fetchAPI(`${this.baseUrl}/available`)
  }
}

// Export singleton instance
export const integrationsAPI = new IntegrationsAPI()

// Marketing API placeholder for template management
export const marketingApi = {
  async getEmailTemplates() {
    return []
  },
  async getSMSTemplates() {
    return []
  },
  async createEmailTemplate(template: any) {
    return template
  },
  async createSMSTemplate(template: any) {
    return template
  },
  async updateEmailTemplate(id: string, template: any) {
    return template
  },
  async updateSMSTemplate(id: string, template: any) {
    return template
  },
  async deleteEmailTemplate(id: string) {
    return { success: true }
  },
  async deleteSMSTemplate(id: string) {
    return { success: true }
  }
}

// Reviews API placeholder for review management
export const reviewsApi = {
  async getReviews(locationId?: string) {
    return []
  },
  async getReviewSummary(locationId?: string) {
    return { total: 0, average: 0, recent: [] }
  },
  async respondToReview(reviewId: string, response: string) {
    return { success: true }
  },
  async getResponseTemplates() {
    return []
  },
  async createResponseTemplate(template: any) {
    return template
  },
  async updateResponseTemplate(id: string, template: any) {
    return template
  },
  async deleteResponseTemplate(id: string) {
    return { success: true }
  },
  async syncReviews(locationId: string) {
    return { success: true, count: 0 }
  }
}

// Export commonly used methods directly
export const {
  initiateOAuth,
  getIntegrations,
  getIntegration,
  createIntegration,
  updateIntegration,
  disconnectIntegration,
  checkAllIntegrationsHealth,
  checkIntegrationHealth,
  refreshTokens,
  syncIntegration,
  testConnection,
  getAvailableIntegrations
} = integrationsAPI