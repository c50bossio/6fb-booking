/**
 * Authentication API Client
 * 
 * Provides comprehensive authentication functionality including:
 * - Login and registration
 * - JWT token management
 * - Password reset and email verification
 * - Multi-factor authentication support
 * - Device trust management
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ===============================
// TypeScript Interfaces
// ===============================

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  firstName: string
  lastName: string
  email: string
  password: string
  user_type: 'client' | 'barber' | 'barbershop'
}

export interface CompleteRegistrationData {
  // User account data
  firstName: string
  lastName: string
  email: string
  password: string
  user_type: 'client' | 'barber' | 'barbershop'
  
  // Business/Organization data
  businessName: string
  businessType: 'individual' | 'studio' | 'salon' | 'enterprise'
  address: {
    street: string
    city: string
    state: string
    zipCode: string
  }
  phone?: string
  website?: string
  chairCount: number
  barberCount: number
  description?: string
  
  // Pricing data
  pricingInfo?: {
    chairs: number
    monthlyTotal: number
    tier: string
  }
  
  // Consent data
  consent: {
    terms: boolean
    privacy: boolean
    marketing?: boolean
    testData?: boolean
  }
}

export interface AuthToken {
  access_token: string
  refresh_token?: string
  token_type: string
}

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  role: string
  unified_role?: string
  user_type: 'client' | 'barber' | 'barbershop'
  is_active: boolean
  email_verified: boolean
  created_at: string
  updated_at: string
  phone?: string
  avatar_url?: string
  timezone?: string
  location_id?: number
}

export interface OrganizationResponse {
  id: number
  name: string
  business_type: string
  address: Record<string, string>
  phone?: string
  website?: string
  chair_count: number
  barber_count: number
  description?: string
  created_at: string
  updated_at: string
}

export interface LoginResponse extends AuthToken {
  user?: User
}

export interface RegistrationResponse {
  message: string
  user: User
}

export interface CompleteRegistrationResponse {
  message: string
  user: User
  organization: OrganizationResponse
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirm {
  token: string
  new_password: string
}

export interface PasswordResetResponse {
  message: string
  detail?: string
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}

export interface ChangePasswordResponse {
  message: string
  detail?: string
}

export interface EmailVerificationRequest {
  email: string
}

export interface EmailVerificationResponse {
  message: string
  detail?: string
}

export interface EmailVerificationConfirm {
  token: string
}

export interface RefreshTokenRequest {
  refresh_token: string
}

export interface MFAVerificationRequest {
  user_id: number
  mfa_code: string
  device_fingerprint?: string
  trust_device?: boolean
}

export interface MFAVerificationResponse extends AuthToken {
  trust_token?: string
}

export interface PasswordValidationRequest {
  password: string
  user_data?: Record<string, any>
}

export interface PasswordValidationResponse {
  is_valid: boolean
  score: number
  feedback: string[]
  suggestions: string[]
}

export interface AuthError {
  detail: string
  status_code: number
  headers?: Record<string, string>
}

// ===============================
// Utility Functions
// ===============================

/**
 * Get authorization headers with current JWT token
 */
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

/**
 * Handle API response and extract data
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw {
      detail: errorData.detail || 'Request failed',
      status_code: response.status,
      headers: Object.fromEntries(response.headers.entries())
    } as AuthError
  }
  return response.json()
}

/**
 * Store authentication tokens securely
 */
function storeTokens(tokens: AuthToken): void {
  localStorage.setItem('access_token', tokens.access_token)
  if (tokens.refresh_token) {
    localStorage.setItem('refresh_token', tokens.refresh_token)
  }
}

/**
 * Clear stored authentication tokens
 */
function clearTokens(): void {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user_data')
}

// ===============================
// Authentication API Client
// ===============================

export const authApi = {
  /**
   * Test auth router connectivity
   */
  async testConnection(): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/test`)
    return handleResponse(response)
  },

  /**
   * Authenticate user with email and password
   * Supports MFA and device trust
   */
  async login(credentials: LoginCredentials, deviceFingerprint?: string): Promise<LoginResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    if (deviceFingerprint) {
      headers['X-Device-Fingerprint'] = deviceFingerprint
      
      // Add trust token if available
      const trustToken = localStorage.getItem('device_trust_token')
      if (trustToken) {
        headers['X-Trust-Token'] = trustToken
      }
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify(credentials)
    })

    // Handle special MFA required response
    if (response.status === 202) {
      const mfaHeaders = Object.fromEntries(response.headers.entries())
      throw {
        detail: 'MFA verification required',
        status_code: 202,
        headers: mfaHeaders
      } as AuthError
    }

    const data = await handleResponse<LoginResponse>(response)
    
    // Store tokens on successful login
    storeTokens(data)
    
    // Store user data if available
    if (data.user) {
      localStorage.setItem('user_data', JSON.stringify(data.user))
    }

    return data
  },

  /**
   * Verify MFA code and complete login
   */
  async verifyMFA(verification: MFAVerificationRequest): Promise<MFAVerificationResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify-mfa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(verification.device_fingerprint && { 'X-Device-Fingerprint': verification.device_fingerprint })
      },
      body: JSON.stringify(verification)
    })

    const data = await handleResponse<MFAVerificationResponse>(response)
    
    // Store tokens and trust token
    storeTokens(data)
    if (data.trust_token) {
      localStorage.setItem('device_trust_token', data.trust_token)
    }

    return data
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<AuthToken> {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      throw {
        detail: 'No refresh token available',
        status_code: 401
      } as AuthError
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    })

    const data = await handleResponse<AuthToken>(response)
    
    // Update stored access token
    localStorage.setItem('access_token', data.access_token)
    
    return data
  },

  /**
   * Register new user (basic registration)
   */
  async register(userData: RegisterData): Promise<RegistrationResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    })

    return handleResponse(response)
  },

  /**
   * Complete registration with organization setup
   */
  async completeRegistration(registrationData: CompleteRegistrationData): Promise<CompleteRegistrationResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/register-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registrationData)
    })

    const data = await handleResponse<CompleteRegistrationResponse>(response)
    
    // Store user data after successful registration
    localStorage.setItem('user_data', JSON.stringify(data.user))
    
    return data
  },

  /**
   * Request password reset email
   */
  async requestPasswordReset(request: PasswordResetRequest): Promise<PasswordResetResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })

    return handleResponse(response)
  },

  /**
   * Confirm password reset with token
   */
  async confirmPasswordReset(confirmation: PasswordResetConfirm): Promise<PasswordResetResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(confirmation)
    })

    return handleResponse(response)
  },

  /**
   * Change password for authenticated user
   */
  async changePassword(passwordChange: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(passwordChange)
    })

    return handleResponse(response)
  },

  /**
   * Verify email address with token
   */
  async verifyEmail(token: string): Promise<EmailVerificationResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`, {
      method: 'GET'
    })

    return handleResponse(response)
  },

  /**
   * Resend email verification
   */
  async resendEmailVerification(request: EmailVerificationRequest): Promise<EmailVerificationResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })

    return handleResponse(response)
  },

  /**
   * Validate password strength
   */
  async validatePassword(validation: PasswordValidationRequest): Promise<PasswordValidationResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/validate-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(validation)
    })

    return handleResponse(response)
  },

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders()
    })

    const user = await handleResponse<User>(response)
    
    // Update stored user data
    localStorage.setItem('user_data', JSON.stringify(user))
    
    return user
  },

  /**
   * Logout user and clear tokens
   */
  async logout(): Promise<void> {
    try {
      // Attempt to notify server of logout
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders()
      })
    } catch (error) {
      // Ignore logout API errors - always clear local tokens
      console.warn('Logout API call failed:', error)
    } finally {
      // Always clear local authentication data
      clearTokens()
    }
  },

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('access_token')
    return !!token
  },

  /**
   * Get stored user data
   */
  getStoredUser(): User | null {
    const userData = localStorage.getItem('user_data')
    return userData ? JSON.parse(userData) : null
  },

  /**
   * Clear all authentication data
   */
  clearAuth(): void {
    clearTokens()
  }
}

export default authApi