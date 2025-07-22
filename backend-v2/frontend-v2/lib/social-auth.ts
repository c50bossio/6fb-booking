// Social authentication utilities
import { API_URL } from './api'

export type SocialProvider = 'google' | 'facebook' | 'apple'

interface SocialAuthResponse {
  access_token: string
  refresh_token: string
  user: {
    id: string
    email: string
    name: string
    avatar?: string
    provider: SocialProvider
  }
}

interface SocialAuthConfig {
  google?: {
    clientId: string
    redirectUri: string
    scope?: string
  }
  facebook?: {
    appId: string
    redirectUri: string
    scope?: string
  }
  apple?: {
    clientId: string
    redirectUri: string
    scope?: string
  }
}

// Get social auth configuration from environment
// Use a function to avoid accessing window at module level (SSR compatibility)
export function getSocialAuthConfig(): SocialAuthConfig {
  const origin = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  return {
    google: {
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      redirectUri: `${origin}/auth/google/callback`,
      scope: 'openid email profile'
    },
    facebook: {
      appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
      redirectUri: `${origin}/auth/facebook/callback`,
      scope: 'email,public_profile'
    },
    apple: {
      clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || '',
      redirectUri: `${origin}/auth/apple/callback`,
      scope: 'name email'
    }
  }
}

// For backwards compatibility, provide a getter that returns the config
export const socialAuthConfig = new Proxy({} as SocialAuthConfig, {
  get: (target, prop) => {
    const config = getSocialAuthConfig()
    return config[prop as keyof SocialAuthConfig]
  }
})

// Check if a provider is configured
export function isProviderConfigured(provider: SocialProvider): boolean {
  switch (provider) {
    case 'google':
      return !!socialAuthConfig.google?.clientId
    case 'facebook':
      return !!socialAuthConfig.facebook?.appId
    case 'apple':
      return !!socialAuthConfig.apple?.clientId
    default:
      return false
  }
}

// Get OAuth URL for a provider using our backend OAuth API
export async function getOAuthUrl(provider: SocialProvider): Promise<string> {
  try {
    // Use our backend OAuth API to get the authorization URL
    const response = await fetch(`${API_URL}/api/v2/oauth/initiate/${provider}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to initiate OAuth for ${provider}`)
    }

    const data = await response.json()
    
    // Store the state for verification
    localStorage.setItem('oauth_state', data.state)
    
    return data.authorization_url
  } catch (error) {
    console.error(`Error getting OAuth URL for ${provider}:`, error)
    throw error
  }
}

// Legacy synchronous function for backwards compatibility
// This is deprecated - use the async version above
export function getOAuthUrlSync(provider: SocialProvider): string {
  const state = generateState()
  localStorage.setItem('oauth_state', state)

  switch (provider) {
    case 'google':
      const googleParams = new URLSearchParams({
        client_id: socialAuthConfig.google!.clientId,
        redirect_uri: socialAuthConfig.google!.redirectUri,
        response_type: 'code',
        scope: socialAuthConfig.google!.scope || '',
        state,
        access_type: 'offline',
        prompt: 'consent'
      })
      return `https://accounts.google.com/o/oauth2/v2/auth?${googleParams}`

    case 'facebook':
      const fbParams = new URLSearchParams({
        client_id: socialAuthConfig.facebook!.appId,
        redirect_uri: socialAuthConfig.facebook!.redirectUri,
        response_type: 'code',
        scope: socialAuthConfig.facebook!.scope || '',
        state
      })
      return `https://www.facebook.com/v12.0/dialog/oauth?${fbParams}`

    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

// Handle OAuth callback
export async function handleOAuthCallback(
  provider: SocialProvider,
  code: string,
  state: string
): Promise<SocialAuthResponse> {
  // Verify state to prevent CSRF
  const savedState = localStorage.getItem('oauth_state')
  if (state !== savedState) {
    throw new Error('Invalid state parameter')
  }
  localStorage.removeItem('oauth_state')

  // Exchange code for tokens via backend
  const response = await fetch(`${API_URL}/api/v2/auth/social/${provider}/callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code, redirect_uri: getRedirectUri(provider) })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Social authentication failed')
  }

  const data = await response.json()
  
  // Store tokens
  localStorage.setItem('token', data.access_token)
  localStorage.setItem('refresh_token', data.refresh_token)
  
  return data
}

// Link social account to existing user
export async function linkSocialAccount(
  provider: SocialProvider,
  code: string
): Promise<void> {
  const response = await fetch(`${API_URL}/api/v2/auth/social/${provider}/link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ code, redirect_uri: getRedirectUri(provider) })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to link social account')
  }
}

// Unlink social account
export async function unlinkSocialAccount(provider: SocialProvider): Promise<void> {
  const response = await fetch(`${API_URL}/api/v2/auth/social/${provider}/unlink`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to unlink social account')
  }
}

// Get linked social accounts
export async function getLinkedAccounts(): Promise<SocialProvider[]> {
  const response = await fetch(`${API_URL}/api/v2/auth/social/linked`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })

  if (!response.ok) {
    throw new Error('Failed to get linked accounts')
  }

  const data = await response.json()
  return data.providers
}

// Helper functions
function generateState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

function getRedirectUri(provider: SocialProvider): string {
  const config = getSocialAuthConfig()
  switch (provider) {
    case 'google':
      return config.google!.redirectUri
    case 'facebook':
      return config.facebook!.redirectUri
    case 'apple':
      return config.apple!.redirectUri
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

// Social provider info
export const socialProviders = {
  google: {
    name: 'Google',
    icon: '/icons/google.svg',
    color: '#4285F4',
    textColor: 'white'
  },
  facebook: {
    name: 'Facebook',
    icon: '/icons/facebook.svg',
    color: '#1877F2',
    textColor: 'white'
  },
  apple: {
    name: 'Apple',
    icon: '/icons/apple.svg',
    color: '#000000',
    textColor: 'white'
  }
}