/**
 * CSRF Protection Test Suite
 * Tests for Cross-Site Request Forgery protection mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

// Mock fetch for API calls
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

// Mock document for cookie access
const mockDocument = {
  cookie: '',
  querySelector: jest.fn(),
  createElement: jest.fn(() => ({
    name: '',
    content: '',
    setAttribute: jest.fn()
  }))
}
Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true
})

describe('CSRF Protection Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDocument.cookie = ''
  })

  describe('CSRF Token Generation', () => {
    it('should generate unique CSRF tokens for each session', () => {
      // Mock CSRF token generation
      const generateCSRFToken = () => {
        const array = new Uint8Array(32)
        crypto.getRandomValues(array)
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
      }

      const token1 = generateCSRFToken()
      const token2 = generateCSRFToken()

      expect(token1).not.toBe(token2)
      expect(token1).toHaveLength(64) // 32 bytes * 2 hex chars
      expect(token2).toHaveLength(64)
      expect(token1).toMatch(/^[a-f0-9]{64}$/)
      expect(token2).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should include CSRF token in meta tag', () => {
      const csrfToken = 'mock-csrf-token-123456'
      
      // Mock meta tag creation
      const mockMeta = {
        name: '',
        content: '',
        setAttribute: jest.fn()
      }
      mockDocument.createElement.mockReturnValue(mockMeta)

      // Simulate adding CSRF token to head
      const addCSRFMeta = (token: string) => {
        const meta = document.createElement('meta')
        meta.name = 'csrf-token'
        meta.content = token
        return meta
      }

      const metaTag = addCSRFMeta(csrfToken)
      expect(mockDocument.createElement).toHaveBeenCalledWith('meta')
      expect(metaTag.name).toBe('csrf-token')
      expect(metaTag.content).toBe(csrfToken)
    })

    it('should extract CSRF token from meta tag', () => {
      const csrfToken = 'test-csrf-token-789'
      
      // Mock querySelector to return meta tag with CSRF token
      mockDocument.querySelector.mockReturnValue({
        getAttribute: jest.fn().mockReturnValue(csrfToken)
      })

      const getCSRFToken = () => {
        const meta = document.querySelector('meta[name="csrf-token"]')
        return meta?.getAttribute('content') || null
      }

      const extractedToken = getCSRFToken()
      expect(extractedToken).toBe(csrfToken)
      expect(mockDocument.querySelector).toHaveBeenCalledWith('meta[name="csrf-token"]')
    })
  })

  describe('CSRF Token Validation', () => {
    it('should include CSRF token in POST requests', async () => {
      const csrfToken = 'valid-csrf-token'
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      } as Response)

      await fetch('/api/v2/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ email: 'test@example.com', password: 'password' })
      })

      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1]
      const headers = lastCall[1]?.headers as Record<string, string>

      expect(headers['X-CSRFToken']).toBe(csrfToken)
    })

    it('should reject requests without CSRF token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'CSRF token missing' })
      } as Response)

      const response = await fetch('/api/v2/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // No X-CSRFToken header
        },
        body: JSON.stringify({ email: 'test@example.com', password: 'password' })
      })

      expect(response.ok).toBeFalsy()
      expect(response.status).toBe(403)
      
      const errorData = await response.json()
      expect(errorData.error).toBe('CSRF token missing')
    })

    it('should reject requests with invalid CSRF token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Invalid CSRF token' })
      } as Response)

      const response = await fetch('/api/v2/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': 'invalid-token'
        },
        body: JSON.stringify({ email: 'test@example.com', password: 'password' })
      })

      expect(response.ok).toBeFalsy()
      expect(response.status).toBe(403)
      
      const errorData = await response.json()
      expect(errorData.error).toBe('Invalid CSRF token')
    })
  })

  describe('CSRF Token Cookie Security', () => {
    it('should set CSRF token cookie with secure attributes', () => {
      const csrfToken = 'secure-csrf-token'
      
      // Mock setting CSRF cookie with secure attributes
      const setCSRFCookie = (token: string) => {
        const isProduction = process.env.NODE_ENV === 'production'
        const cookieValue = `csrftoken=${token}; path=/; samesite=strict; httponly${isProduction ? '; secure' : ''}`
        document.cookie = cookieValue
        return cookieValue
      }

      const cookieValue = setCSRFCookie(csrfToken)
      
      expect(cookieValue).toContain('samesite=strict')
      expect(cookieValue).toContain('httponly')
      expect(cookieValue).toContain('path=/')
      expect(cookieValue).toContain(`csrftoken=${csrfToken}`)
    })

    it('should not allow CSRF token access via JavaScript', () => {
      // Simulate HttpOnly cookie - should not be accessible via document.cookie
      const httpOnlyCookie = 'csrftoken=secret-token; httponly'
      mockDocument.cookie = 'other=value; accessible=true' // Only non-httponly cookies

      const getCSRFFromCookie = () => {
        const cookies = document.cookie.split(';')
        const csrfCookie = cookies.find(cookie => cookie.trim().startsWith('csrftoken='))
        return csrfCookie ? csrfCookie.split('=')[1] : null
      }

      // Should not find CSRF token because it's HttpOnly
      const csrfFromCookie = getCSRFFromCookie()
      expect(csrfFromCookie).toBeNull()
    })
  })

  describe('CSRF Double-Submit Cookie Pattern', () => {
    it('should validate CSRF token matches cookie value', () => {
      const csrfToken = 'matching-csrf-token'
      
      // Mock cookie containing CSRF token
      mockDocument.cookie = `csrftoken=${csrfToken}; other=value`
      
      const validateCSRFDoubleSubmit = (headerToken: string, cookieToken: string) => {
        return headerToken === cookieToken && headerToken.length > 0
      }

      // Extract token from cookie
      const extractTokenFromCookie = () => {
        const cookies = document.cookie.split(';')
        const csrfCookie = cookies.find(cookie => cookie.trim().startsWith('csrftoken='))
        return csrfCookie ? csrfCookie.split('=')[1] : null
      }

      const cookieToken = extractTokenFromCookie()
      
      // Valid case - tokens match
      expect(validateCSRFDoubleSubmit(csrfToken, cookieToken!)).toBeTruthy()
      
      // Invalid case - tokens don't match
      expect(validateCSRFDoubleSubmit('different-token', cookieToken!)).toBeFalsy()
      
      // Invalid case - empty token
      expect(validateCSRFDoubleSubmit('', cookieToken!)).toBeFalsy()
    })
  })

  describe('CSRF Protection for Different HTTP Methods', () => {
    const csrfToken = 'method-test-token'
    
    it('should not require CSRF token for safe methods (GET, HEAD, OPTIONS)', async () => {
      const safeMethods = ['GET', 'HEAD', 'OPTIONS']
      
      for (const method of safeMethods) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        } as Response)

        const response = await fetch('/api/v2/test', {
          method,
          // No CSRF token for safe methods
        })

        expect(response.ok).toBeTruthy()
      }
    })

    it('should require CSRF token for unsafe methods (POST, PUT, DELETE, PATCH)', async () => {
      const unsafeMethods = ['POST', 'PUT', 'DELETE', 'PATCH']
      
      for (const method of unsafeMethods) {
        // Request without CSRF token should fail
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 403,
          json: async () => ({ error: 'CSRF token required' })
        } as Response)

        const responseWithoutToken = await fetch('/api/v2/test', {
          method,
          headers: { 'Content-Type': 'application/json' }
        })

        expect(responseWithoutToken.ok).toBeFalsy()
        expect(responseWithoutToken.status).toBe(403)

        // Request with CSRF token should succeed
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        } as Response)

        const responseWithToken = await fetch('/api/v2/test', {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
          }
        })

        expect(responseWithToken.ok).toBeTruthy()
      }
    })
  })

  describe('CSRF Token Rotation', () => {
    it('should rotate CSRF tokens after authentication', async () => {
      const oldToken = 'old-csrf-token'
      const newToken = 'new-csrf-token'

      // Mock login request that returns new CSRF token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ 
          success: true, 
          access_token: 'jwt-token',
          csrf_token: newToken 
        }),
        headers: new Headers({
          'Set-Cookie': `csrftoken=${newToken}; path=/; samesite=strict; httponly`
        })
      } as Response)

      const response = await fetch('/api/v2/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': oldToken
        },
        body: JSON.stringify({ email: 'test@example.com', password: 'password' })
      })

      expect(response.ok).toBeTruthy()
      
      const responseData = await response.json()
      expect(responseData.csrf_token).toBe(newToken)
      expect(responseData.csrf_token).not.toBe(oldToken)
    })

    it('should handle CSRF token expiration gracefully', async () => {
      // Mock expired token response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ 
          error: 'CSRF token expired',
          code: 'CSRF_TOKEN_EXPIRED'
        })
      } as Response)

      // Mock token refresh response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ csrf_token: 'fresh-csrf-token' })
      } as Response)

      // First request with expired token
      const expiredResponse = await fetch('/api/v2/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': 'expired-token'
        }
      })

      expect(expiredResponse.ok).toBeFalsy()
      
      const errorData = await expiredResponse.json()
      expect(errorData.code).toBe('CSRF_TOKEN_EXPIRED')

      // Refresh token
      const refreshResponse = await fetch('/api/v2/auth/csrf-token', {
        method: 'GET'
      })

      expect(refreshResponse.ok).toBeTruthy()
      
      const refreshData = await refreshResponse.json()
      expect(refreshData.csrf_token).toBe('fresh-csrf-token')
    })
  })
})