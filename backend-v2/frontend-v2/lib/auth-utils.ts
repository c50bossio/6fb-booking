/**
 * Authentication utilities for handling both localStorage and cookies
 * This ensures middleware can validate authentication on server-side
 */

// Set authentication token in both localStorage and httpOnly cookie
export function setAuthToken(token: string, refreshToken?: string) {
  if (typeof window !== 'undefined') {
    // Store in localStorage for client-side access
    localStorage.setItem('token', token)
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken)
    }
    
    // Also set as cookie for middleware access
    // Note: HttpOnly cookies would be more secure but need backend to set them
    document.cookie = `token=${token}; path=/; SameSite=Lax; max-age=${7 * 24 * 60 * 60}` // 7 days
  }
}

// Clear authentication tokens from both localStorage and cookies
export function clearAuthTokens() {
  if (typeof window !== 'undefined') {
    // Clear localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    
    // Clear cookie
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  }
}

// Get token from localStorage (client-side only)
export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token')
  }
  return null
}

// Check if user is authenticated (client-side)
export function isAuthenticated(): boolean {
  return !!getAuthToken()
}