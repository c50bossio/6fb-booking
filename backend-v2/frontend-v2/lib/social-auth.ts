'use client'

/**
 * Social authentication utilities and providers
 */

export interface SocialProvider {
  id: string
  name: string
  icon: string
  color: string
  authUrl: string
}

export interface AuthConfig {
  clientId: string
  redirectUri: string
  scope: string
}

/**
 * Supported social authentication providers
 */
export const SOCIAL_PROVIDERS = {
  google: {
    id: 'google',
    name: 'Google',
    icon: 'google',
    color: '#4285f4',
    authUrl: 'https://accounts.google.com/oauth/authorize'
  },
  facebook: {
    id: 'facebook', 
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877f2',
    authUrl: 'https://www.facebook.com/dialog/oauth'
  },
  apple: {
    id: 'apple',
    name: 'Apple',
    icon: 'apple',
    color: '#000000',
    authUrl: 'https://appleid.apple.com/auth/authorize'
  }
} as const

/**
 * Generate OAuth authorization URL for a provider
 */
export function getOAuthUrl(
  provider: keyof typeof SOCIAL_PROVIDERS,
  config: AuthConfig
): string {
  const providerConfig = SOCIAL_PROVIDERS[provider]
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    response_type: 'code',
    state: generateStateToken()
  })

  return `${providerConfig.authUrl}?${params.toString()}`
}

/**
 * Generate a secure state token for OAuth
 */
export function generateStateToken(): string {
  const array = new Uint8Array(32)
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array)
  } else {
    // Fallback for server-side
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Check if a provider is configured
 */
export function isProviderConfigured(provider: keyof typeof SOCIAL_PROVIDERS): boolean {
  // In a real implementation, this would check if the provider has valid credentials
  const clientId = process.env[`NEXT_PUBLIC_${provider.toUpperCase()}_CLIENT_ID`]
  return !!clientId
}

/**
 * Get all configured providers
 */
export function getConfiguredProviders(): SocialProvider[] {
  return Object.entries(SOCIAL_PROVIDERS)
    .filter(([key]) => isProviderConfigured(key as keyof typeof SOCIAL_PROVIDERS))
    .map(([, provider]) => provider)
}

/**
 * Handle OAuth callback and extract code/state
 */
export function handleOAuthCallback(url: string): { code?: string; state?: string; error?: string } {
  try {
    const urlObj = new URL(url)
    const code = urlObj.searchParams.get('code')
    const state = urlObj.searchParams.get('state')
    const error = urlObj.searchParams.get('error')

    return { code: code || undefined, state: state || undefined, error: error || undefined }
  } catch (error) {
    return { error: 'Invalid callback URL' }
  }
}

/**
 * Exchange OAuth code for tokens
 */
export async function exchangeOAuthCode(
  provider: keyof typeof SOCIAL_PROVIDERS,
  code: string,
  state: string
): Promise<{ accessToken?: string; error?: string }> {
  try {
    const response = await fetch('/api/auth/oauth/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, code, state })
    })

    if (!response.ok) {
      throw new Error('OAuth exchange failed')
    }

    const data = await response.json()
    return { accessToken: data.accessToken }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'OAuth exchange failed' }
  }
}