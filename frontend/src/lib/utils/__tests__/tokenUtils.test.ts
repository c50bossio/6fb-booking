/**
 * Tests for token utility functions
 */

import {
  decodeJWT,
  isTokenExpired,
  isTokenExpiringWithin,
  getTokenExpiration,
  getTokenTimeRemaining,
  formatTokenTimeRemaining,
  TOKEN_REFRESH_THRESHOLD
} from '../tokenUtils'

// Mock JWT tokens for testing
const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.Lp-38_n6aFkkSZdmWyVjFYzKieGEyGcFt4WzpJd0xhE'
const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE2MDAwMDAwMDB9.YGjxWoezj6eNmZP7nrQZGkUrp7NsXbw3C9U2EjYs8Dk'

// Create a token that expires in the near future
const createTokenWithExpiry = (secondsFromNow: number): string => {
  const exp = Math.floor(Date.now() / 1000) + secondsFromNow
  const payload = {
    sub: '1234567890',
    name: 'John Doe',
    iat: Math.floor(Date.now() / 1000),
    exp
  }

  // Create a simple JWT for testing (not secure, just for testing)
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payloadEncoded = btoa(JSON.stringify(payload))
  const signature = 'test-signature'

  return `${header}.${payloadEncoded}.${signature}`
}

describe('Token Utils', () => {
  describe('decodeJWT', () => {
    it('should decode a valid JWT token', () => {
      const decoded = decodeJWT(validToken)
      expect(decoded).toBeTruthy()
      expect(decoded?.sub).toBe('1234567890')
      expect(decoded?.name).toBe('John Doe')
    })

    it('should return null for invalid token', () => {
      const decoded = decodeJWT('invalid.token.here')
      expect(decoded).toBeNull()
    })

    it('should return null for malformed token', () => {
      const decoded = decodeJWT('not-a-jwt-token')
      expect(decoded).toBeNull()
    })
  })

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const isExpired = isTokenExpired(validToken)
      expect(isExpired).toBe(false)
    })

    it('should return true for expired token', () => {
      const isExpired = isTokenExpired(expiredToken)
      expect(isExpired).toBe(true)
    })

    it('should return true for invalid token', () => {
      const isExpired = isTokenExpired('invalid-token')
      expect(isExpired).toBe(true)
    })
  })

  describe('isTokenExpiringWithin', () => {
    it('should return false for token expiring far in future', () => {
      const token = createTokenWithExpiry(3600) // 1 hour from now
      const isExpiring = isTokenExpiringWithin(token, 300) // Check within 5 minutes
      expect(isExpiring).toBe(false)
    })

    it('should return true for token expiring soon', () => {
      const token = createTokenWithExpiry(120) // 2 minutes from now
      const isExpiring = isTokenExpiringWithin(token, TOKEN_REFRESH_THRESHOLD) // 5 minutes
      expect(isExpiring).toBe(true)
    })

    it('should return true for already expired token', () => {
      const isExpiring = isTokenExpiringWithin(expiredToken, TOKEN_REFRESH_THRESHOLD)
      expect(isExpiring).toBe(true)
    })
  })

  describe('getTokenExpiration', () => {
    it('should return correct expiration date', () => {
      const token = createTokenWithExpiry(3600) // 1 hour from now
      const expiration = getTokenExpiration(token)
      expect(expiration).toBeInstanceOf(Date)

      const expectedTime = Date.now() + (3600 * 1000)
      const actualTime = expiration?.getTime() || 0

      // Allow 1 second tolerance for test execution time
      expect(Math.abs(actualTime - expectedTime)).toBeLessThan(1000)
    })

    it('should return null for invalid token', () => {
      const expiration = getTokenExpiration('invalid-token')
      expect(expiration).toBeNull()
    })
  })

  describe('getTokenTimeRemaining', () => {
    it('should return correct time remaining', () => {
      const token = createTokenWithExpiry(300) // 5 minutes from now
      const timeRemaining = getTokenTimeRemaining(token)

      // Should be approximately 300 seconds (allow 2 second tolerance)
      expect(timeRemaining).toBeGreaterThan(298)
      expect(timeRemaining).toBeLessThanOrEqual(300)
    })

    it('should return 0 for expired token', () => {
      const timeRemaining = getTokenTimeRemaining(expiredToken)
      expect(timeRemaining).toBe(0)
    })

    it('should return 0 for invalid token', () => {
      const timeRemaining = getTokenTimeRemaining('invalid-token')
      expect(timeRemaining).toBe(0)
    })
  })

  describe('formatTokenTimeRemaining', () => {
    it('should format seconds correctly', () => {
      const token = createTokenWithExpiry(45)
      const formatted = formatTokenTimeRemaining(token)
      expect(formatted).toMatch(/\d+s/)
    })

    it('should format minutes correctly', () => {
      const token = createTokenWithExpiry(300) // 5 minutes
      const formatted = formatTokenTimeRemaining(token)
      expect(formatted).toMatch(/\d+m/)
    })

    it('should return "Expired" for expired token', () => {
      const formatted = formatTokenTimeRemaining(expiredToken)
      expect(formatted).toBe('Expired')
    })
  })

  describe('TOKEN_REFRESH_THRESHOLD', () => {
    it('should be set to 5 minutes', () => {
      expect(TOKEN_REFRESH_THRESHOLD).toBe(5 * 60) // 300 seconds
    })
  })
})
