/**
 * Authentication Manager
 * 
 * Centralized authentication token management with automatic refresh
 */

import { AuthConfig, AuthenticationError } from './types/common'

export interface AuthTokens {
  accessToken: string
  refreshToken?: string
  tokenType?: string
  expiresAt?: number
}

export interface AuthState {
  isAuthenticated: boolean
  tokens?: AuthTokens
  user?: any
  lastRefresh?: number
}

export class AuthManager {
  private config: AuthConfig
  private state: AuthState = { isAuthenticated: false }
  private refreshPromise: Promise<AuthTokens> | null = null

  constructor(config: AuthConfig) {
    this.config = config
    this.loadStoredTokens()
  }

  /**
   * Get authorization headers for API requests
   */
  async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {}

    if (this.isAuthenticated()) {
      const tokens = await this.getValidTokens()
      if (tokens) {
        headers.Authorization = `${tokens.tokenType || 'Bearer'} ${tokens.accessToken}`
      }
    }

    return headers
  }

  /**
   * Set authentication tokens
   */
  setTokens(tokens: AuthTokens): void {
    this.state.tokens = tokens
    this.state.isAuthenticated = true
    this.state.lastRefresh = Date.now()
    this.storeTokens(tokens)
  }

  /**
   * Get current tokens, refreshing if necessary
   */
  async getValidTokens(): Promise<AuthTokens | null> {
    if (!this.state.tokens) {
      return null
    }

    // Check if token needs refresh
    if (this.needsRefresh()) {
      try {
        const refreshedTokens = await this.refreshTokens()
        return refreshedTokens
      } catch (error) {
        // Refresh failed, clear tokens
        this.clearTokens()
        throw new AuthenticationError('Token refresh failed', {
          endpoint: '/auth/refresh',
          method: 'POST',
          requestId: `refresh_${Date.now()}`,
          timestamp: new Date().toISOString()
        })
      }
    }

    return this.state.tokens
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return this.state.tokens?.refreshToken || null
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.state.isAuthenticated && !!this.state.tokens?.accessToken
  }

  /**
   * Check if token needs refresh
   */
  needsRefresh(): boolean {
    if (!this.config.autoRefresh || !this.state.tokens?.expiresAt) {
      return false
    }

    const now = Date.now() / 1000 // Convert to seconds
    const expiresAt = this.state.tokens.expiresAt
    const threshold = this.config.refreshThreshold

    return (expiresAt - now) <= threshold
  }

  /**
   * Refresh authentication tokens
   */
  async refreshTokens(): Promise<AuthTokens> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    if (!this.state.tokens?.refreshToken) {
      throw new Error('No refresh token available')
    }

    this.refreshPromise = this.performTokenRefresh()

    try {
      const newTokens = await this.refreshPromise
      this.setTokens(newTokens)
      return newTokens
    } finally {
      this.refreshPromise = null
    }
  }

  /**
   * Perform the actual token refresh API call
   * This should be overridden by subclasses or injected as a dependency
   */
  private async performTokenRefresh(): Promise<AuthTokens> {
    const refreshToken = this.state.tokens?.refreshToken
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    // This is a placeholder - in real implementation, this would call the auth API
    // The actual refresh logic should be injected or configured
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    })

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      tokenType: data.token_type || 'Bearer',
      expiresAt: data.expires_at ? new Date(data.expires_at).getTime() / 1000 : undefined
    }
  }

  /**
   * Set custom refresh function
   */
  setRefreshFunction(refreshFn: (refreshToken: string) => Promise<AuthTokens>): void {
    this.performTokenRefresh = async () => {
      const refreshToken = this.state.tokens?.refreshToken
      if (!refreshToken) {
        throw new Error('No refresh token available')
      }
      return refreshFn(refreshToken)
    }
  }

  /**
   * Clear authentication tokens
   */
  clearTokens(): void {
    this.state = { isAuthenticated: false }
    this.clearStoredTokens()
  }

  /**
   * Set user information
   */
  setUser(user: any): void {
    this.state.user = user
    this.storeUser(user)
  }

  /**
   * Get current user
   */
  getUser(): any {
    return this.state.user
  }

  /**
   * Get current authentication state
   */
  getState(): AuthState {
    return { ...this.state }
  }

  /**
   * Load tokens from storage
   */
  private loadStoredTokens(): void {
    try {
      const storage = this.getStorage()
      const accessToken = storage.getItem('access_token')
      const refreshToken = storage.getItem('refresh_token')
      const tokenType = storage.getItem('token_type')
      const expiresAt = storage.getItem('token_expires_at')
      const userData = storage.getItem('user_data')

      if (accessToken) {
        this.state.tokens = {
          accessToken,
          refreshToken: refreshToken || undefined,
          tokenType: tokenType || 'Bearer',
          expiresAt: expiresAt ? parseInt(expiresAt) : undefined
        }
        this.state.isAuthenticated = true
      }

      if (userData) {
        try {
          this.state.user = JSON.parse(userData)
        } catch (error) {
          console.warn('Failed to parse stored user data:', error)
        }
      }
    } catch (error) {
      console.warn('Failed to load stored tokens:', error)
    }
  }

  /**
   * Store tokens in configured storage
   */
  private storeTokens(tokens: AuthTokens): void {
    try {
      const storage = this.getStorage()
      
      storage.setItem('access_token', tokens.accessToken)
      
      if (tokens.refreshToken) {
        storage.setItem('refresh_token', tokens.refreshToken)
      }
      
      if (tokens.tokenType) {
        storage.setItem('token_type', tokens.tokenType)
      }
      
      if (tokens.expiresAt) {
        storage.setItem('token_expires_at', tokens.expiresAt.toString())
      }
    } catch (error) {
      console.warn('Failed to store tokens:', error)
    }
  }

  /**
   * Store user data in configured storage
   */
  private storeUser(user: any): void {
    try {
      const storage = this.getStorage()
      storage.setItem('user_data', JSON.stringify(user))
    } catch (error) {
      console.warn('Failed to store user data:', error)
    }
  }

  /**
   * Clear stored tokens
   */
  private clearStoredTokens(): void {
    try {
      const storage = this.getStorage()
      storage.removeItem('access_token')
      storage.removeItem('refresh_token')
      storage.removeItem('token_type')
      storage.removeItem('token_expires_at')
      storage.removeItem('user_data')
    } catch (error) {
      console.warn('Failed to clear stored tokens:', error)
    }
  }

  /**
   * Get storage instance based on configuration
   */
  private getStorage(): Storage {
    if (typeof window === 'undefined') {
      // Server-side rendering - return mock storage
      return {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        length: 0,
        key: () => null
      }
    }

    switch (this.config.tokenStorage) {
      case 'sessionStorage':
        return window.sessionStorage
      case 'localStorage':
        return window.localStorage
      case 'memory':
        // Return a simple in-memory storage implementation
        const memoryStorage: Record<string, string> = {}
        return {
          getItem: (key: string) => memoryStorage[key] || null,
          setItem: (key: string, value: string) => { memoryStorage[key] = value },
          removeItem: (key: string) => { delete memoryStorage[key] },
          clear: () => { Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]) },
          length: Object.keys(memoryStorage).length,
          key: (index: number) => Object.keys(memoryStorage)[index] || null
        }
      default:
        return window.localStorage
    }
  }

  /**
   * Create an auth manager with specific configuration
   */
  static create(config: Partial<AuthConfig> = {}): AuthManager {
    const defaultConfig: AuthConfig = {
      tokenStorage: 'localStorage',
      refreshThreshold: 300, // 5 minutes
      autoRefresh: true
    }

    return new AuthManager({ ...defaultConfig, ...config })
  }
}