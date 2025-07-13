export type SocialProvider = 'google' | 'facebook' | 'github'

export interface SocialProviderInfo {
  name: string
  icon: string
  color: string
  textColor: string
}

export const socialProviders: Record<SocialProvider, SocialProviderInfo> = {
  google: {
    name: 'Google',
    icon: '🔍',
    color: 'bg-white',
    textColor: 'text-gray-900'
  },
  facebook: {
    name: 'Facebook',
    icon: '📘',
    color: 'bg-blue-600',
    textColor: 'text-white'
  },
  github: {
    name: 'GitHub',
    icon: '🐙',
    color: 'bg-gray-900',
    textColor: 'text-white'
  }
}

export function isProviderConfigured(provider: SocialProvider): boolean {
  // For now, return false as social auth is not configured
  // This can be updated when OAuth providers are configured
  return false
}

export function getOAuthUrl(provider: SocialProvider): string {
  // Return mock URL for now - to be implemented when OAuth is configured
  return `/api/auth/${provider}`
}

// Missing functions for OAuth callback handling
export async function handleOAuthCallback(provider: SocialProvider, code: string, state?: string) {
  // Placeholder implementation
  return { success: false, error: 'OAuth not implemented yet' }
}

export async function linkSocialAccount(provider: SocialProvider, userId: string, accessToken: string) {
  // Placeholder implementation  
  return { success: false, error: 'Social account linking not implemented yet' }
}
