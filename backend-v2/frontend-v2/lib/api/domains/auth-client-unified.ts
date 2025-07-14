/**
 * Unified Authentication Client
 * 
 * Domain-specific client for authentication operations using the unified base client
 */

import { UnifiedAPIClient } from '../unified-client'
import { RETRY_PRESETS } from '../types/common'

// Import types from existing auth client for compatibility
import type {
  LoginCredentials,
  RegisterData,
  CompleteRegistrationData,
  AuthToken,
  User,
  LoginResponse,
  RegistrationResponse,
  CompleteRegistrationResponse,
  PasswordResetRequest,
  PasswordResetConfirm,
  PasswordResetResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  EmailVerificationRequest,
  EmailVerificationResponse,
  MFAVerificationRequest,
  MFAVerificationResponse,
  PasswordValidationRequest,
  PasswordValidationResponse
} from '../auth'

export class UnifiedAuthClient extends UnifiedAPIClient {
  constructor() {
    super({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      retry: RETRY_PRESETS.auth,
      timeout: 30000,
      feature: 'auth',
      monitoring: {
        enabled: true,
        logRequests: true,
        logResponses: false,
        logErrors: true,
        performanceTracking: true,
        slowRequestThreshold: 2000
      }
    })

    // Set up custom token refresh function
    this.setupTokenRefresh()
  }

  /**
   * Set up automatic token refresh
   */
  private setupTokenRefresh(): void {
    this.setTokenRefreshFunction(async (refreshToken: string) => {
      const response = await this.post<AuthToken>('/api/v1/auth/refresh', {
        refresh_token: refreshToken
      }, {
        retryConfig: RETRY_PRESETS.critical,
        tags: { 'auth.action': 'token_refresh' }
      })

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || refreshToken,
        tokenType: response.data.token_type || 'Bearer',
        expiresAt: response.data.expires_at ? new Date(response.data.expires_at).getTime() / 1000 : undefined
      }
    })
  }

  // ===============================
  // Authentication Methods
  // ===============================

  /**
   * Test auth router connectivity
   */
  async testConnection(): Promise<{ status: string; message: string }> {
    const response = await this.get('/api/v1/auth/test', {
      tags: { 'auth.action': 'test_connection' }
    })
    return response.data
  }

  /**
   * Authenticate user with email and password
   */
  async login(credentials: LoginCredentials, deviceFingerprint?: string): Promise<LoginResponse> {
    const headers: Record<string, string> = {}
    
    if (deviceFingerprint) {
      headers['X-Device-Fingerprint'] = deviceFingerprint
      
      // Add trust token if available
      const trustToken = localStorage.getItem('device_trust_token')
      if (trustToken) {
        headers['X-Trust-Token'] = trustToken
      }
    }

    try {
      const response = await this.post<LoginResponse>('/api/v1/auth/login', credentials, {
        headers,
        retryConfig: RETRY_PRESETS.none, // Don't retry login attempts
        tags: { 'auth.action': 'login' }
      })

      // Store tokens and user data
      const authManager = this.getAuthManager()
      authManager.setTokens({
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        tokenType: response.data.token_type || 'Bearer'
      })

      if (response.data.user) {
        authManager.setUser(response.data.user)
      }

      return response.data

    } catch (error: any) {
      // Handle MFA required response (status 202)
      if (error.status === 202) {
        throw error // Re-throw for MFA handling
      }
      throw error
    }
  }

  /**
   * Verify MFA code and complete login
   */
  async verifyMFA(verification: MFAVerificationRequest): Promise<MFAVerificationResponse> {
    const headers: Record<string, string> = {}
    
    if (verification.device_fingerprint) {
      headers['X-Device-Fingerprint'] = verification.device_fingerprint
    }

    const response = await this.post<MFAVerificationResponse>('/api/v1/auth/verify-mfa', verification, {
      headers,
      retryConfig: RETRY_PRESETS.none,
      tags: { 'auth.action': 'verify_mfa' }
    })

    // Store tokens and trust token
    const authManager = this.getAuthManager()
    authManager.setTokens({
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      tokenType: response.data.token_type || 'Bearer'
    })

    if (response.data.trust_token) {
      localStorage.setItem('device_trust_token', response.data.trust_token)
    }

    return response.data
  }

  /**
   * Register new user (basic registration)
   */
  async register(userData: RegisterData): Promise<RegistrationResponse> {
    const response = await this.post<RegistrationResponse>('/api/v1/auth/register', userData, {
      retryConfig: RETRY_PRESETS.none, // Don't retry registration
      tags: { 'auth.action': 'register' }
    })

    return response.data
  }

  /**
   * Complete registration with organization setup
   */
  async completeRegistration(registrationData: CompleteRegistrationData): Promise<CompleteRegistrationResponse> {
    const response = await this.post<CompleteRegistrationResponse>('/api/v1/auth/register-complete', registrationData, {
      retryConfig: RETRY_PRESETS.standard,
      timeout: 45000, // Longer timeout for complex registration
      tags: { 'auth.action': 'register_complete' }
    })

    // Store user data after successful registration
    const authManager = this.getAuthManager()
    authManager.setUser(response.data.user)

    return response.data
  }

  // ===============================
  // Password Management
  // ===============================

  /**
   * Request password reset email
   */
  async requestPasswordReset(request: PasswordResetRequest): Promise<PasswordResetResponse> {
    const response = await this.post<PasswordResetResponse>('/api/v1/auth/forgot-password', request, {
      retryConfig: RETRY_PRESETS.standard,
      tags: { 'auth.action': 'request_password_reset' }
    })

    return response.data
  }

  /**
   * Confirm password reset with token
   */
  async confirmPasswordReset(confirmation: PasswordResetConfirm): Promise<PasswordResetResponse> {
    const response = await this.post<PasswordResetResponse>('/api/v1/auth/reset-password', confirmation, {
      retryConfig: RETRY_PRESETS.none, // Don't retry password reset confirmation
      tags: { 'auth.action': 'confirm_password_reset' }
    })

    return response.data
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(passwordChange: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    const response = await this.post<ChangePasswordResponse>('/api/v1/auth/change-password', passwordChange, {
      retryConfig: RETRY_PRESETS.none, // Don't retry password changes
      tags: { 'auth.action': 'change_password' }
    })

    return response.data
  }

  /**
   * Validate password strength
   */
  async validatePassword(validation: PasswordValidationRequest): Promise<PasswordValidationResponse> {
    const response = await this.post<PasswordValidationResponse>('/api/v1/auth/validate-password', validation, {
      retryConfig: RETRY_PRESETS.realtime,
      tags: { 'auth.action': 'validate_password' }
    })

    return response.data
  }

  // ===============================
  // Email Verification
  // ===============================

  /**
   * Verify email address with token
   */
  async verifyEmail(token: string): Promise<EmailVerificationResponse> {
    const response = await this.get<EmailVerificationResponse>(`/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`, {
      retryConfig: RETRY_PRESETS.standard,
      tags: { 'auth.action': 'verify_email' }
    })

    return response.data
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(request: EmailVerificationRequest): Promise<EmailVerificationResponse> {
    const response = await this.post<EmailVerificationResponse>('/api/v1/auth/resend-verification', request, {
      retryConfig: RETRY_PRESETS.standard,
      tags: { 'auth.action': 'resend_verification' }
    })

    return response.data
  }

  // ===============================
  // User Management
  // ===============================

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    const response = await this.get<User>('/api/v1/auth/me', {
      retryConfig: RETRY_PRESETS.standard,
      tags: { 'auth.action': 'get_current_user' }
    })

    // Update stored user data
    const authManager = this.getAuthManager()
    authManager.setUser(response.data)

    return response.data
  }

  /**
   * Logout user and clear tokens
   */
  async logout(): Promise<void> {
    try {
      // Attempt to notify server of logout
      await this.post('/api/v1/auth/logout', undefined, {
        retryConfig: RETRY_PRESETS.none,
        tags: { 'auth.action': 'logout' }
      })
    } catch (error) {
      // Ignore logout API errors - always clear local tokens
      console.warn('Logout API call failed:', error)
    } finally {
      // Always clear local authentication data
      const authManager = this.getAuthManager()
      authManager.clearTokens()
    }
  }

  // ===============================
  // Convenience Methods
  // ===============================

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return this.getAuthManager().isAuthenticated()
  }

  /**
   * Get stored user data
   */
  getStoredUser(): User | null {
    return this.getAuthManager().getUser()
  }

  /**
   * Clear all authentication data
   */
  clearAuth(): void {
    this.getAuthManager().clearTokens()
  }

  /**
   * Get authentication state
   */
  getAuthState() {
    return this.getAuthManager().getState()
  }
}

// Export singleton instance
export const authClient = new UnifiedAuthClient()

// Export class for type checking and custom instances
export { UnifiedAuthClient }

// Export for backward compatibility
export default authClient