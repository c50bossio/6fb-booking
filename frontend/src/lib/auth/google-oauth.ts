/**
 * Google OAuth Integration Service
 * Handles Google OAuth flow with 6FB backend authentication
 */

import apiClient from '@/lib/api/client'

export interface GoogleOAuthResponse {
  access_token: string
  token_type: string
  user: {
    id: number
    email: string
    full_name: string
    role: string
    permissions: string[]
    primary_location_id?: number
    profile_image_url?: string
    auth_provider: string
  }
}

export class GoogleOAuthService {
  private static readonly GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
  private static readonly BACKEND_CONNECT_URL = '/api/v1/auth/google/connect'
  private static readonly BACKEND_CALLBACK_URL = '/api/v1/auth/google/callback'

  /**
   * Initiate Google OAuth flow
   */
  static async initiateOAuth(): Promise<string> {
    try {
      const response = await apiClient.get(this.BACKEND_CONNECT_URL)
      return response.data.auth_url
    } catch (error) {
      console.error('Failed to initiate Google OAuth:', error)
      throw new Error('Failed to start Google authentication')
    }
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  static async handleCallback(code: string, state?: string): Promise<GoogleOAuthResponse> {
    try {
      const response = await apiClient.post(this.BACKEND_CALLBACK_URL, {
        code,
        state
      })
      
      return response.data
    } catch (error: any) {
      console.error('OAuth callback failed:', error)
      throw new Error(error.response?.data?.detail || 'Google authentication failed')
    }
  }

  /**
   * Generate OAuth URL manually (alternative to backend-generated URL)
   */
  static generateOAuthURL(redirectUri?: string): string {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      throw new Error('Google Client ID not configured')
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/auth/google/callback`,
      scope: 'openid email profile',
      response_type: 'code',
      access_type: 'online',
      prompt: 'select_account'
    })

    return `${this.GOOGLE_OAUTH_URL}?${params.toString()}`
  }

  /**
   * Redirect to Google OAuth
   */
  static redirectToGoogle(): void {
    this.initiateOAuth()
      .then(authUrl => {
        window.location.href = authUrl
      })
      .catch(error => {
        console.error('Failed to redirect to Google:', error)
        // Fallback to client-side URL generation
        const authUrl = this.generateOAuthURL()
        window.location.href = authUrl
      })
  }
}

export default GoogleOAuthService