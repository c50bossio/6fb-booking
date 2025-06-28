/**
 * JWT Token utilities for authentication
 */

export interface DecodedToken {
  exp: number // Expiration timestamp (seconds since epoch)
  iat: number // Issued at timestamp
  sub: string // Subject (user ID)
  email?: string
  role?: string
  [key: string]: any
}

/**
 * Decode JWT token without verification (client-side only)
 * WARNING: Never use this for authentication decisions on the backend
 */
export function decodeJWT(token: string): DecodedToken | null {
  try {
    // JWT has 3 parts separated by dots
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    // Decode the payload (second part)
    const payload = parts[1]

    // Add padding if needed
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4)

    // Decode from base64url
    const decodedPayload = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'))

    return JSON.parse(decodedPayload) as DecodedToken
  } catch (error) {
    console.warn('Failed to decode JWT token:', error)
    return null
  }
}

/**
 * Check if a JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeJWT(token)
  if (!decoded || !decoded.exp) {
    return true // Consider invalid tokens as expired
  }

  const currentTime = Math.floor(Date.now() / 1000) // Current time in seconds
  return decoded.exp <= currentTime
}

/**
 * Check if a JWT token expires within the specified time frame
 */
export function isTokenExpiringWithin(token: string, secondsFromNow: number): boolean {
  const decoded = decodeJWT(token)
  if (!decoded || !decoded.exp) {
    return true // Consider invalid tokens as expiring
  }

  const currentTime = Math.floor(Date.now() / 1000)
  const expirationThreshold = currentTime + secondsFromNow

  return decoded.exp <= expirationThreshold
}

/**
 * Get the expiration time of a JWT token as a Date object
 */
export function getTokenExpiration(token: string): Date | null {
  const decoded = decodeJWT(token)
  if (!decoded || !decoded.exp) {
    return null
  }

  return new Date(decoded.exp * 1000) // Convert seconds to milliseconds
}

/**
 * Get the time remaining until token expiration in seconds
 */
export function getTokenTimeRemaining(token: string): number {
  const decoded = decodeJWT(token)
  if (!decoded || !decoded.exp) {
    return 0
  }

  const currentTime = Math.floor(Date.now() / 1000)
  const timeRemaining = decoded.exp - currentTime

  return Math.max(0, timeRemaining) // Never return negative values
}

/**
 * Format time remaining as a human-readable string
 */
export function formatTokenTimeRemaining(token: string): string {
  const seconds = getTokenTimeRemaining(token)

  if (seconds <= 0) {
    return 'Expired'
  }

  if (seconds < 60) {
    return `${seconds}s`
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24

  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}

/**
 * Constants for token timing
 */
export const TOKEN_REFRESH_THRESHOLD = 5 * 60 // 5 minutes in seconds
export const TOKEN_VALIDATION_INTERVAL = 30 * 1000 // 30 seconds in milliseconds
