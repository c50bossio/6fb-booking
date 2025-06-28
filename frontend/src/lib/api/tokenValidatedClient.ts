/**
 * Token-validated API client for calendar operations
 * Ensures tokens are validated and refreshed before making API calls
 */

import apiClient from './client'
import { smartStorage } from '../utils/storage'
import {
  isTokenExpired,
  isTokenExpiringWithin,
  TOKEN_REFRESH_THRESHOLD
} from '../utils/tokenUtils'

export interface TokenValidatedRequestConfig {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  data?: any
  params?: any
  headers?: Record<string, string>
}

/**
 * Make an API request with proactive token validation
 * This ensures the token is valid before the request is made
 */
export async function makeTokenValidatedRequest<T = any>(
  config: TokenValidatedRequestConfig
): Promise<T> {
  // Check if we have a token
  const token = smartStorage.getItem('access_token')
  if (!token) {
    throw new Error('No authentication token available')
  }

  // Check token validity
  const isExpired = isTokenExpired(token)
  const isExpiring = isTokenExpiringWithin(token, TOKEN_REFRESH_THRESHOLD)

  if (isExpired) {
    throw new Error('Authentication token has expired. Please log in again.')
  }

  if (isExpiring) {
    console.log('[TokenValidatedClient] Token is expiring soon, will be refreshed by request interceptor')
  }

  // Make the request - the interceptor will handle token refresh if needed
  const response = await apiClient.request({
    url: config.url,
    method: config.method || 'GET',
    data: config.data,
    params: config.params,
    headers: config.headers
  })

  return response.data
}

/**
 * Calendar-specific API client methods with token validation
 */
export const calendarApiClient = {
  /**
   * Get calendar events with token validation
   */
  async getEvents(params: any) {
    return makeTokenValidatedRequest({
      url: '/calendar/events',
      method: 'GET',
      params
    })
  },

  /**
   * Create appointment with token validation
   */
  async createAppointment(data: any) {
    return makeTokenValidatedRequest({
      url: '/calendar/appointments',
      method: 'POST',
      data
    })
  },

  /**
   * Update appointment with token validation
   */
  async updateAppointment(id: number, data: any) {
    return makeTokenValidatedRequest({
      url: `/calendar/appointments/${id}`,
      method: 'PATCH',
      data
    })
  },

  /**
   * Delete appointment with token validation
   */
  async deleteAppointment(id: number, reason?: string) {
    return makeTokenValidatedRequest({
      url: `/calendar/appointments/${id}`,
      method: 'DELETE',
      data: { reason }
    })
  },

  /**
   * Get availability with token validation
   */
  async getAvailability(barberId: number, params: any) {
    return makeTokenValidatedRequest({
      url: `/calendar/barbers/${barberId}/availability`,
      method: 'GET',
      params
    })
  },

  /**
   * Get Google Calendar events with token validation
   */
  async getGoogleCalendarEvents(params: any) {
    return makeTokenValidatedRequest({
      url: '/google-calendar/events',
      method: 'GET',
      params
    })
  },

  /**
   * Get Google Calendar status with token validation
   */
  async getGoogleCalendarStatus() {
    return makeTokenValidatedRequest({
      url: '/google-calendar/status',
      method: 'GET'
    })
  },

  /**
   * Get calendar statistics with token validation
   */
  async getStats(params: any) {
    return makeTokenValidatedRequest({
      url: '/calendar/stats',
      method: 'GET',
      params
    })
  }
}

/**
 * Hook for using token-validated API calls in React components
 */
export function useTokenValidatedApi() {
  const checkTokenStatus = () => {
    const token = smartStorage.getItem('access_token')
    if (!token) {
      return { valid: false, expired: true, expiring: false }
    }

    const expired = isTokenExpired(token)
    const expiring = isTokenExpiringWithin(token, TOKEN_REFRESH_THRESHOLD)

    return { valid: !expired, expired, expiring }
  }

  return {
    calendarApi: calendarApiClient,
    checkTokenStatus,
    makeRequest: makeTokenValidatedRequest
  }
}
