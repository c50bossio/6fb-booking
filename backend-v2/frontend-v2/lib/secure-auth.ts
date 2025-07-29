/**
 * Secure Authentication Service
 * 
 * This service replaces localStorage-based JWT storage with secure HttpOnly cookies
 * to prevent XSS attacks. All authentication tokens are now handled server-side
 * with proper CSRF protection.
 * 
 * SECURITY IMPROVEMENTS:
 * - HttpOnly cookies prevent JavaScript access to tokens
 * - SameSite=Lax prevents CSRF attacks
 * - Secure flag ensures HTTPS-only transmission in production
 * - CSRF tokens provide additional protection for state-changing requests
 */

import { APIError } from './api';

interface LoginRequest {
  email: string;
  password: string;
}

interface RefreshTokenRequest {
  refresh_token?: string; // Optional - will use cookies if not provided
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  csrf_token?: string;
}

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  unified_role: string;
  is_active: boolean;
  email_verified: boolean;
}

class SecureAuthService {
  private baseURL: string;
  private csrfToken: string | null = null;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }

  /**
   * Get CSRF token from cookie
   */
  private getCSRFToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    const match = document.cookie.match(/csrf_token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  /**
   * Make authenticated API request with automatic CSRF protection
   */
  private async makeRequest(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Get CSRF token for state-changing requests
    const csrfToken = this.getCSRFToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add CSRF token for POST/PUT/DELETE requests
    if (csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method || 'GET')) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const requestOptions: RequestInit = {
      ...options,
      headers,
      credentials: 'include', // Always include cookies
    };

    const response = await fetch(url, requestOptions);

    // Handle authentication errors
    if (response.status === 401) {
      // Try to refresh token automatically
      if (endpoint !== '/api/v2/auth/refresh' && endpoint !== '/api/v2/auth/login') {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry the original request
          return this.makeRequest(endpoint, options);
        }
      }
      
      // If refresh fails or this is already a refresh request, redirect to login
      this.logout();
      throw new Error('Authentication failed');
    }

    // Handle CSRF errors
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.detail?.includes('CSRF')) {
        throw new Error('CSRF token validation failed. Please refresh the page.');
      }
    }

    return response;
  }

  /**
   * Login user with email and password
   * Returns user data on success, throws error on failure
   */
  async login(credentials: LoginRequest): Promise<User> {
    try {
      const response = await fetch(`${this.baseURL}/api/v2/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Login failed');
      }

      const data: TokenResponse = await response.json();
      
      // Store CSRF token for future requests (if provided)
      if (data.csrf_token) {
        this.csrfToken = data.csrf_token;
      }

      // Get user info after successful login
      return this.getCurrentUser();
      
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using HttpOnly refresh token cookie
   */
  async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/v2/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({}), // Empty body - refresh token comes from cookie
      });

      if (!response.ok) {
        return false;
      }

      const data: TokenResponse = await response.json();
      
      // Update CSRF token if provided
      if (data.csrf_token) {
        this.csrfToken = data.csrf_token;
      }

      return true;
      
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<User> {
    const response = await this.makeRequest('/api/v2/auth/me');
    
    if (!response.ok) {
      throw new Error('Failed to get user information');
    }

    return response.json();
  }

  /**
   * Logout user and clear all authentication data
   */
  async logout(): Promise<void> {
    try {
      // Use direct fetch to avoid auth retry loop
      await fetch(`${this.baseURL}/api/v2/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
    } catch (error) {
      // Continue with logout even if server request fails
      console.warn('Logout request failed:', error);
    }

    // Clear CSRF token
    this.csrfToken = null;

    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  /**
   * Change user password with CSRF protection
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await this.makeRequest('/api/v2/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Password change failed');
    }
  }

  /**
   * Check if user is authenticated by attempting to get user info
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Register new user (for barbers/shop owners)
   */
  async register(userData: any): Promise<User> {
    const response = await fetch(`${this.baseURL}/api/v2/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Registration failed');
    }

    const data = await response.json();
    return data.user;
  }

  /**
   * Get CSRF token for forms (read from cookie)
   */
  getCSRFTokenForForms(): string | null {
    return this.getCSRFToken();
  }
}

// Create singleton instance
export const secureAuth = new SecureAuthService();
export default secureAuth;

// Legacy function to help with migration - logs deprecation warning
export function getToken(): null {
  console.warn('⚠️ getToken() is deprecated for security reasons. Tokens are now handled securely via HttpOnly cookies.');
  return null;
}

// Helper function for backward compatibility
export function isLoggedIn(): Promise<boolean> {
  return secureAuth.isAuthenticated();
}