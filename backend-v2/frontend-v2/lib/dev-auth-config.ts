/**
 * Development Authentication Configuration
 * 
 * Automatically sets up authentication bypass tokens for development environment
 * to eliminate 403 errors and enable seamless API access during development.
 */

'use client'

/**
 * Check if we're in development environment
 */
export const isDevelopment = process.env.NODE_ENV === 'development' || 
  process.env.NEXT_PUBLIC_ENVIRONMENT === 'development' ||
  typeof window !== 'undefined' && window.location.hostname === 'localhost'

/**
 * Development bypass token that automatically authenticates as dev user
 */
export const DEV_BYPASS_TOKEN = 'dev-token-bypass'

/**
 * Initialize development authentication bypass
 * This function should be called on app startup in development mode
 */
export function initDevAuth(): void {
  if (!isDevelopment || typeof window === 'undefined') {
    return
  }

  // Check if we already have auth tokens
  const existingToken = localStorage.getItem('access_token') || 
                       localStorage.getItem('token') ||
                       localStorage.getItem('refresh_token')

  // If no existing auth, set up dev bypass
  if (!existingToken) {
    console.log('🔧 Development Mode: Setting up auth bypass token')
    localStorage.setItem('access_token', DEV_BYPASS_TOKEN)
    localStorage.setItem('token', DEV_BYPASS_TOKEN) // Legacy support
    
    console.log('✅ Development auth bypass enabled')
    console.log('   • API endpoints will now be accessible')
    console.log('   • Dev user: dev@bookedbarber.com')
    console.log('   • To disable: localStorage.clear()')
  }
}

/**
 * Get the current auth token with dev bypass support
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const token = localStorage.getItem('access_token') || localStorage.getItem('token')
  
  // In development, if no token exists, return bypass token
  if (!token && isDevelopment) {
    return DEV_BYPASS_TOKEN
  }
  
  return token
}

/**
 * Clear development auth (useful for testing)
 */
export function clearDevAuth(): void {
  if (typeof window === 'undefined') {
    return
  }
  
  localStorage.removeItem('access_token')
  localStorage.removeItem('token')
  localStorage.removeItem('refresh_token')
  console.log('🧹 Development auth cleared')
}

/**
 * Force set development auth bypass
 */
export function forceDevAuth(): void {
  if (!isDevelopment || typeof window === 'undefined') {
    return
  }
  
  localStorage.setItem('access_token', DEV_BYPASS_TOKEN)
  localStorage.setItem('token', DEV_BYPASS_TOKEN)
  console.log('🔧 Development auth bypass forced')
}

/**
 * Check if dev auth is active
 */
export function isDevAuthActive(): boolean {
  if (!isDevelopment || typeof window === 'undefined') {
    return false
  }
  
  const token = localStorage.getItem('access_token') || localStorage.getItem('token')
  return token === DEV_BYPASS_TOKEN
}

/**
 * Dev auth status for debugging
 */
export function getDevAuthStatus(): {
  isDevelopment: boolean
  hasToken: boolean
  isDevBypass: boolean
  token: string | null
} {
  const token = getAuthToken()
  
  return {
    isDevelopment,
    hasToken: !!token,
    isDevBypass: token === DEV_BYPASS_TOKEN,
    token: token ? `${token.substring(0, 10)}...` : null
  }
}

// Auto-initialize in development
if (isDevelopment && typeof window !== 'undefined') {
  // Small delay to ensure DOM is ready
  setTimeout(initDevAuth, 100)
}