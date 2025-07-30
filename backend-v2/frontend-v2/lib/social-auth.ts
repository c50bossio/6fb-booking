/**
 * Social authentication providers configuration and utilities
 */

export type SocialProvider = 'google' | 'facebook' | 'apple'

export interface SocialProviderInfo {
  name: string
  authUrl: string
  clientId?: string
  scopes: string[]
  color: string
}

export const socialProviders: Record<SocialProvider, SocialProviderInfo> = {
  google: {
    name: 'Google',
    authUrl: 'https://accounts.google.com/oauth/authorize',
    scopes: ['openid', 'email', 'profile'],
    color: '#4285F4'
  },
  facebook: {
    name: 'Facebook',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    scopes: ['email', 'public_profile'],
    color: '#1877F2'
  },
  apple: {
    name: 'Apple',
    authUrl: 'https://appleid.apple.com/auth/authorize',
    scopes: ['name', 'email'],
    color: '#000000'
  }
}

/**
 * Check if a social provider is configured (has necessary environment variables)
 */
export function isProviderConfigured(provider: SocialProvider): boolean {
  switch (provider) {
    case 'google':
      return !!(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET)
    case 'facebook':
      return !!(process.env.NEXT_PUBLIC_FACEBOOK_APP_ID && process.env.NEXT_PUBLIC_FACEBOOK_APP_SECRET)
    case 'apple':
      return !!(process.env.NEXT_PUBLIC_APPLE_CLIENT_ID && process.env.NEXT_PUBLIC_APPLE_CLIENT_SECRET)
    default:
      return false
  }
}

/**
 * Generate OAuth URL for a specific provider
 */
export function getOAuthUrl(provider: SocialProvider): string {
  const providerInfo = socialProviders[provider]
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'
  const redirectUri = `${baseUrl}/api/auth/callback/${provider}`
  
  switch (provider) {
    case 'google': {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      if (!clientId) throw new Error('Google Client ID not configured')
      
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: providerInfo.scopes.join(' '),
        access_type: 'offline',
        prompt: 'consent'
      })
      
      return `${providerInfo.authUrl}?${params.toString()}`
    }
    
    case 'facebook': {
      const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
      if (!appId) throw new Error('Facebook App ID not configured')
      
      const params = new URLSearchParams({
        client_id: appId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: providerInfo.scopes.join(','),
        state: generateState()
      })
      
      return `${providerInfo.authUrl}?${params.toString()}`
    }
    
    case 'apple': {
      const clientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID
      if (!clientId) throw new Error('Apple Client ID not configured')
      
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        response_mode: 'form_post',
        scope: providerInfo.scopes.join(' '),
        state: generateState()
      })
      
      return `${providerInfo.authUrl}?${params.toString()}`
    }
    
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

/**
 * Generate a secure state parameter for OAuth flows
 */
function generateState(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Validate OAuth state parameter
 */
export function validateState(receivedState: string, expectedState: string): boolean {
  return receivedState === expectedState
}

/**
 * Get all configured social providers
 */
export function getConfiguredProviders(): SocialProvider[] {
  return Object.keys(socialProviders).filter(provider => 
    isProviderConfigured(provider as SocialProvider)
  ) as SocialProvider[]
}

/**
 * Get provider info by name
 */
export function getProviderInfo(provider: SocialProvider): SocialProviderInfo {
  return socialProviders[provider]
}