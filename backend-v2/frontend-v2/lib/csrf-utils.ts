/**
 * CSRF Token Utilities for BookedBarber V2
 * 
 * Handles Cross-Site Request Forgery (CSRF) protection by managing
 * CSRF tokens for secure API requests.
 */

/**
 * Get CSRF token from cookies
 * @returns CSRF token string or null if not found
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  
  const cookies = document.cookie.split(';')
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'csrf_token') {
      return decodeURIComponent(value)
    }
  }
  return null
}

/**
 * Get CSRF headers for API requests
 * @returns Object with CSRF header or empty object
 */
export function getCsrfHeaders(): { [key: string]: string } {
  const csrfToken = getCsrfToken()
  if (!csrfToken) {
    console.warn('CSRF token not found - request may be rejected by server')
    return {}
  }
  
  return {
    'X-CSRF-Token': csrfToken
  }
}

/**
 * Check if CSRF token is available
 * @returns True if CSRF token exists, false otherwise
 */
export function hasCsrfToken(): boolean {
  return getCsrfToken() !== null
}

/**
 * Validate CSRF token format
 * @param token The token to validate
 * @returns True if token format is valid
 */
export function isValidCsrfToken(token: string | null): boolean {
  if (!token) return false
  
  // CSRF tokens should be URL-safe base64 strings, typically 32+ characters
  const csrfTokenRegex = /^[A-Za-z0-9_-]{32,}$/
  return csrfTokenRegex.test(token)
}

/**
 * Wait for CSRF token to be available (useful after login)
 * @param timeoutMs Maximum time to wait in milliseconds
 * @returns Promise that resolves when token is available or rejects on timeout
 */
export function waitForCsrfToken(timeoutMs: number = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    
    const checkToken = () => {
      const token = getCsrfToken()
      if (token && isValidCsrfToken(token)) {
        resolve(token)
        return
      }
      
      if (Date.now() - startTime >= timeoutMs) {
        reject(new Error('CSRF token not available within timeout'))
        return
      }
      
      // Check again in 100ms
      setTimeout(checkToken, 100)
    }
    
    checkToken()
  })
}