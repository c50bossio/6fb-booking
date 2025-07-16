/**
 * Token Manager Utility
 * 
 * Centralized token management with automatic refresh, retry logic,
 * and race condition prevention for authentication
 */

// ===============================
// Types and Interfaces
// ===============================

export interface TokenData {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
}

export interface TokenInfo {
  token: string
  expiresAt: number
  isValid: boolean
  needsRefresh: boolean
}

export interface RefreshOptions {
  retryAttempts?: number
  retryDelay?: number
  onRefreshSuccess?: (tokens: TokenData) => void
  onRefreshFailure?: (error: Error) => void
}

// ===============================
// Constants
// ===============================

const TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const REFRESH_BUFFER_MINUTES = 5 // Refresh 5 minutes before expiry
const DEFAULT_RETRY_ATTEMPTS = 3
const DEFAULT_RETRY_DELAY = 1000 // 1 second

// ===============================
// Global State Management
// ===============================

class TokenManager {
  private static instance: TokenManager
  private refreshPromise: Promise<boolean> | null = null
  private refreshTimer: NodeJS.Timeout | null = null
  private eventListeners: Array<(event: string, data?: any) => void> = []

  private constructor() {
    // Bind methods to preserve context
    this.refreshToken = this.refreshToken.bind(this)
    this.scheduleRefresh = this.scheduleRefresh.bind(this)
  }

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager()
    }
    return TokenManager.instance
  }

  // ===============================
  // Event System
  // ===============================

  addEventListener(listener: (event: string, data?: any) => void): void {
    this.eventListeners.push(listener)
  }

  removeEventListener(listener: (event: string, data?: any) => void): void {
    this.eventListeners = this.eventListeners.filter(l => l !== listener)
  }

  private emit(event: string, data?: any): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event, data)
      } catch (error) {
        console.error('Error in token manager event listener:', error)
      }
    })
  }

  // ===============================
  // Token Storage
  // ===============================

  setTokens(tokens: TokenData): void {
    if (typeof window === 'undefined') return

    localStorage.setItem(TOKEN_KEY, tokens.access_token)
    
    if (tokens.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
    }

    // Set HTTP cookie for middleware
    const maxAge = tokens.expires_in ? tokens.expires_in : 7 * 24 * 60 * 60 // Default 7 days
    document.cookie = `token=${tokens.access_token}; path=/; max-age=${maxAge}; samesite=strict`

    this.scheduleRefresh()
    this.emit('tokens_updated', tokens)
    
    console.log('✅ Tokens stored successfully')
  }

  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TOKEN_KEY)
  }

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  }

  clearTokens(): void {
    if (typeof window === 'undefined') return

    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem('user')
    sessionStorage.clear()

    // Clear cookie
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; samesite=strict'

    this.clearRefreshTimer()
    this.emit('tokens_cleared')
    
    console.log('🧹 All tokens cleared')
  }

  // ===============================
  // Token Validation
  // ===============================

  getTokenInfo(): TokenInfo | null {
    const token = this.getAccessToken()
    if (!token) return null

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const expiresAt = payload.exp * 1000 // Convert to milliseconds
      const now = Date.now()
      
      // Token is valid if it hasn't expired
      const isValid = expiresAt > now
      
      // Token needs refresh if it expires within the buffer time
      const needsRefresh = expiresAt - now < (REFRESH_BUFFER_MINUTES * 60 * 1000)

      return {
        token,
        expiresAt,
        isValid,
        needsRefresh
      }
    } catch (error) {
      console.error('Invalid token format:', error)
      return null
    }
  }

  isTokenValid(): boolean {
    const tokenInfo = this.getTokenInfo()
    return tokenInfo?.isValid ?? false
  }

  needsRefresh(): boolean {
    const tokenInfo = this.getTokenInfo()
    return tokenInfo?.needsRefresh ?? false
  }

  getTimeUntilExpiry(): number {
    const tokenInfo = this.getTokenInfo()
    if (!tokenInfo) return 0
    
    return Math.max(0, tokenInfo.expiresAt - Date.now())
  }

  // ===============================
  // Token Refresh Logic
  // ===============================

  async refreshToken(options: RefreshOptions = {}): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      console.log('🔄 Token refresh already in progress, waiting...')
      return this.refreshPromise
    }

    const {
      retryAttempts = DEFAULT_RETRY_ATTEMPTS,
      retryDelay = DEFAULT_RETRY_DELAY,
      onRefreshSuccess,
      onRefreshFailure
    } = options

    this.refreshPromise = this._performRefresh(retryAttempts, retryDelay)

    try {
      const success = await this.refreshPromise
      
      if (success) {
        this.emit('refresh_success')
        onRefreshSuccess?.(this.getStoredTokenData())
      } else {
        this.emit('refresh_failure', new Error('Token refresh failed'))
        onRefreshFailure?.(new Error('Token refresh failed'))
      }

      return success
    } finally {
      this.refreshPromise = null
    }
  }

  private async _performRefresh(retryAttempts: number, retryDelay: number): Promise<boolean> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      // Don't log warning for first-time visitors - this is normal
      return false
    }

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        console.log(`🔄 Token refresh attempt ${attempt}/${retryAttempts}`)
        
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshToken}`
          }
        })

        if (response.ok) {
          const tokenData: TokenData = await response.json()
          this.setTokens(tokenData)
          console.log('✅ Token refresh successful')
          return true
        } else {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
          lastError = new Error(errorData.detail || `Refresh failed with status ${response.status}`)
          
          // Don't retry on 401/403 errors (invalid refresh token)
          if (response.status === 401 || response.status === 403) {
            console.warn('Refresh token is invalid, stopping retries')
            break
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Network error during token refresh')
        console.warn(`Token refresh attempt ${attempt} failed:`, lastError.message)
      }

      // Wait before next retry (except on last attempt)
      if (attempt < retryAttempts) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
      }
    }

    console.error('🚨 All token refresh attempts failed:', lastError)
    
    // Clear tokens on refresh failure
    this.clearTokens()
    return false
  }

  // ===============================
  // Automatic Refresh Scheduling
  // ===============================

  scheduleRefresh(): void {
    this.clearRefreshTimer()

    const tokenInfo = this.getTokenInfo()
    if (!tokenInfo) return

    const timeUntilRefresh = tokenInfo.expiresAt - Date.now() - (REFRESH_BUFFER_MINUTES * 60 * 1000)
    
    if (timeUntilRefresh <= 0) {
      // Token needs immediate refresh
      console.log('🔄 Token needs immediate refresh')
      this.refreshToken()
      return
    }

    this.refreshTimer = setTimeout(() => {
      console.log('⏰ Scheduled token refresh triggered')
      this.refreshToken()
    }, timeUntilRefresh)

    console.log(`⏰ Token refresh scheduled in ${Math.round(timeUntilRefresh / 1000)}s`)
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  // ===============================
  // Request Interceptor
  // ===============================

  async getValidToken(): Promise<string | null> {
    const tokenInfo = this.getTokenInfo()
    
    if (!tokenInfo) {
      return null
    }

    if (!tokenInfo.isValid) {
      const refreshToken = this.getRefreshToken()
      if (!refreshToken) {
        // No refresh token available, can't refresh
        this.clearTokens()
        return null
      }
      
      console.log('Token expired, attempting refresh')
      const refreshSuccess = await this.refreshToken()
      
      if (!refreshSuccess) {
        console.error('Failed to refresh expired token')
        return null
      }

      return this.getAccessToken()
    }

    if (tokenInfo.needsRefresh) {
      const refreshToken = this.getRefreshToken()
      if (refreshToken) {
        console.log('Token needs refresh, refreshing in background')
        // Don't wait for refresh, return current token and refresh in background
        this.refreshToken()
      }
    }

    return tokenInfo.token
  }

  // ===============================
  // Utility Methods
  // ===============================

  private getStoredTokenData(): TokenData {
    return {
      access_token: this.getAccessToken() || '',
      refresh_token: this.getRefreshToken() || undefined
    }
  }

  getStatus(): {
    hasToken: boolean
    isValid: boolean
    needsRefresh: boolean
    expiresIn: number
    isRefreshing: boolean
  } {
    const tokenInfo = this.getTokenInfo()
    
    return {
      hasToken: !!tokenInfo,
      isValid: tokenInfo?.isValid ?? false,
      needsRefresh: tokenInfo?.needsRefresh ?? false,
      expiresIn: this.getTimeUntilExpiry(),
      isRefreshing: !!this.refreshPromise
    }
  }

  // Clean up when no longer needed
  destroy(): void {
    this.clearRefreshTimer()
    this.refreshPromise = null
    this.eventListeners = []
  }
}

// ===============================
// Exported Functions
// ===============================

export const tokenManager = TokenManager.getInstance()

/**
 * Set authentication tokens
 */
export function setTokens(tokens: TokenData): void {
  tokenManager.setTokens(tokens)
}

/**
 * Get current access token
 */
export function getAccessToken(): string | null {
  return tokenManager.getAccessToken()
}

/**
 * Get current refresh token
 */
export function getRefreshToken(): string | null {
  return tokenManager.getRefreshToken()
}

/**
 * Clear all authentication tokens
 */
export function clearTokens(): void {
  tokenManager.clearTokens()
}

/**
 * Check if current token is valid
 */
export function isTokenValid(): boolean {
  return tokenManager.isTokenValid()
}

/**
 * Get a valid token (with automatic refresh if needed)
 */
export async function getValidToken(): Promise<string | null> {
  return tokenManager.getValidToken()
}

/**
 * Manually refresh the access token
 */
export async function refreshToken(options?: RefreshOptions): Promise<boolean> {
  return tokenManager.refreshToken(options)
}

/**
 * Get token status information
 */
export function getTokenStatus() {
  return tokenManager.getStatus()
}

/**
 * Add event listener for token events
 */
export function addTokenEventListener(listener: (event: string, data?: any) => void): void {
  tokenManager.addEventListener(listener)
}

/**
 * Remove event listener for token events
 */
export function removeTokenEventListener(listener: (event: string, data?: any) => void): void {
  tokenManager.removeEventListener(listener)
}

// ===============================
// HTTP Request Interceptor
// ===============================

/**
 * Enhanced fetch wrapper with automatic token management
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getValidToken()
  
  if (!token) {
    throw new Error('No valid authentication token available')
  }

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  }

  const response = await fetch(url, config)

  // Handle token expiry during request
  if (response.status === 401) {
    console.log('Received 401, attempting token refresh')
    const refreshSuccess = await refreshToken()
    
    if (refreshSuccess) {
      const newToken = await getValidToken()
      if (newToken) {
        // Retry the request with new token
        const retryConfig: RequestInit = {
          ...config,
          headers: {
            ...config.headers,
            'Authorization': `Bearer ${newToken}`,
          },
        }
        return fetch(url, retryConfig)
      }
    }
    
    // If refresh failed, clear tokens and throw
    clearTokens()
    throw new Error('Authentication failed and token refresh unsuccessful')
  }

  return response
}

// ===============================
// Initialization
// ===============================

// Auto-schedule refresh on module load if token exists
if (typeof window !== 'undefined') {
  const tokenInfo = tokenManager.getTokenInfo()
  if (tokenInfo?.isValid) {
    tokenManager.scheduleRefresh()
  }
}

export default tokenManager