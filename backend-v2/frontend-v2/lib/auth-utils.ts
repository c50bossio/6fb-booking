/**
 * Authentication utilities for handling both localStorage and cookies
 * This ensures middleware can validate authentication on server-side
 * 
 * IMPORTANT: Cookie names must match backend (cookie_auth.py) and middleware expectations:
 * - access_token: Short-lived JWT access token
 * - refresh_token: Long-lived JWT refresh token  
 * - csrf_token: CSRF protection token
 */

// Set authentication token in both localStorage and cookies
export function setAuthToken(token: string, refreshToken?: string) {
  if (typeof window !== 'undefined') {
    // Store in localStorage for client-side access
    localStorage.setItem('access_token', token)
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken)
    }
    
    // Set cookies using correct names that match backend/middleware expectations
    // Note: Backend sets HttpOnly cookies, but for client-side compatibility we also set readable cookies
    document.cookie = `access_token=${token}; path=/; SameSite=Lax; max-age=${15 * 60}` // 15 minutes
    if (refreshToken) {
      document.cookie = `refresh_token=${refreshToken}; path=/; SameSite=Lax; max-age=${7 * 24 * 60 * 60}` // 7 days
    }
  }
}

// Clear authentication tokens from both localStorage and cookies
export function clearAuthTokens() {
  if (typeof window !== 'undefined') {
    // Clear localStorage
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('token') // Legacy cleanup
    
    // Clear cookies using correct names
    document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'csrf_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT' // Legacy cleanup
  }
}

// Get token from localStorage (client-side only)
export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    // Try new naming convention first, fall back to legacy
    return localStorage.getItem('access_token') || localStorage.getItem('token')
  }
  return null
}

// Check if user is authenticated (client-side)
export function isAuthenticated(): boolean {
  return !!getAuthToken()
}