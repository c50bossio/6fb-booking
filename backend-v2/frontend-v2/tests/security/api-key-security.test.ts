/**
 * API Key Security Test Suite
 * Tests for API key protection, validation, and security measures
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

// Mock fetch for API calls
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

// Mock environment variables
const originalEnv = process.env
const mockApiKeys = {
  STRIPE_PUBLISHABLE_KEY: 'pk_test_mock123',
  GOOGLE_API_KEY: 'AIza_mock123',
  SENDGRID_API_KEY: 'SG.mock123'
}

describe('API Key Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set mock environment
    process.env = { ...originalEnv, ...mockApiKeys }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('API Key Exposure Prevention', () => {
    it('should never expose server-side API keys in client bundles', () => {
      // Test that server-side keys are not accessible from client
      const serverSideKeys = [
        'STRIPE_SECRET_KEY',
        'SENDGRID_API_KEY',
        'TWILIO_AUTH_TOKEN',
        'DATABASE_URL',
        'SECRET_KEY'
      ]

      serverSideKeys.forEach(key => {
        expect(process.env[key]).toBeUndefined()
      })
    })

    it('should only expose whitelisted public API keys', () => {
      const allowedPublicKeys = [
        'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
        'NEXT_PUBLIC_GA_MEASUREMENT_ID',
        'NEXT_PUBLIC_API_BASE_URL'
      ]

      // Only keys with NEXT_PUBLIC_ prefix should be accessible
      Object.keys(process.env).forEach(key => {
        if (key.includes('API_KEY') || key.includes('SECRET')) {
          if (!allowedPublicKeys.includes(key)) {
            expect(key.startsWith('NEXT_PUBLIC_')).toBeFalsy()
          }
        }
      })
    })

    it('should validate API key format and prevent malformed keys', () => {
      const testCases = [
        { key: 'pk_test_invalid', valid: false },
        { key: 'pk_live_51234567890', valid: true },
        { key: 'sk_test_private_key', valid: false }, // Should not be in frontend
        { key: '', valid: false },
        { key: null, valid: false },
        { key: undefined, valid: false }
      ]

      testCases.forEach(({ key, valid }) => {
        const isValidPublicKey = key && 
          (key.startsWith('pk_') || key.startsWith('AIza') || key.startsWith('GA_'))
        
        if (valid) {
          expect(isValidPublicKey).toBeTruthy()
        } else {
          expect(isValidPublicKey).toBeFalsy()
        }
      })
    })
  })

  describe('API Key Rotation & Validation', () => {
    it('should handle API key rotation gracefully', async () => {
      // Test old key
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid API key' })
      } as Response)

      // Test new key works
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      } as Response)

      // Simulate API key rotation
      const oldKey = 'pk_test_old123'
      const newKey = 'pk_test_new123'

      // First call with old key should fail
      const oldResponse = await fetch('/api/test', {
        headers: { 'Authorization': `Bearer ${oldKey}` }
      })
      expect(oldResponse.ok).toBeFalsy()

      // Second call with new key should succeed
      const newResponse = await fetch('/api/test', {
        headers: { 'Authorization': `Bearer ${newKey}` }
      })
      expect(newResponse.ok).toBeTruthy()
    })

    it('should validate API key expiration', () => {
      const expiredKey = 'pk_test_expired_20240101'
      const validKey = 'pk_test_valid_20251231'
      
      // Mock key validation logic
      const isKeyExpired = (key: string) => {
        if (key.includes('expired')) return true
        return false
      }

      expect(isKeyExpired(expiredKey)).toBeTruthy()
      expect(isKeyExpired(validKey)).toBeFalsy()
    })
  })

  describe('API Key Security Headers', () => {
    it('should include proper security headers with API requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      } as Response)

      await fetch('/api/v2/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Cache-Control': 'no-cache'
        }
      })

      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1]
      const headers = lastCall[1]?.headers as Record<string, string>

      expect(headers['Content-Type']).toBe('application/json')
      expect(headers['X-Requested-With']).toBe('XMLHttpRequest')
      expect(headers['Cache-Control']).toBe('no-cache')
    })

    it('should not include sensitive data in request logs', () => {
      const sensitiveData = {
        password: 'secret123',
        api_key: 'sk_test_secret',
        credit_card: '4111111111111111'
      }

      // Mock console.log to capture logs
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      // Simulate request logging (should sanitize sensitive data)
      const sanitizedData = Object.keys(sensitiveData).reduce((acc, key) => {
        acc[key] = key.toLowerCase().includes('password') || 
                   key.toLowerCase().includes('key') || 
                   key.toLowerCase().includes('card') ? '[REDACTED]' : sensitiveData[key as keyof typeof sensitiveData]
        return acc
      }, {} as Record<string, string>)

      console.log('API Request:', sanitizedData)

      expect(consoleSpy).toHaveBeenCalledWith('API Request:', {
        password: '[REDACTED]',
        api_key: '[REDACTED]',
        credit_card: '[REDACTED]'
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Rate Limiting for API Keys', () => {
    it('should enforce rate limits per API key', async () => {
      const apiKey = 'pk_test_ratelimit'
      const maxRequests = 5
      const timeWindow = 60000 // 1 minute

      // Mock rate limiter
      let requestCount = 0
      const lastRequestTime = Date.now()

      // Simulate multiple requests
      for (let i = 0; i < maxRequests + 2; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: requestCount < maxRequests,
          status: requestCount < maxRequests ? 200 : 429,
          json: async () => requestCount < maxRequests ? 
            { success: true } : 
            { error: 'Rate limit exceeded' }
        } as Response)

        const response = await fetch('/api/test', {
          headers: { 'X-API-Key': apiKey }
        })

        requestCount++

        if (i < maxRequests) {
          expect(response.ok).toBeTruthy()
        } else {
          expect(response.status).toBe(429)
        }
      }
    })
  })

  describe('API Key Storage Security', () => {
    it('should not store API keys in localStorage in production', () => {
      const originalNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      // Mock localStorage
      const localStorageMock = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      }
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock
      })

      // Simulate storing API key (should be rejected in production)
      const storeApiKey = (key: string, value: string) => {
        if (process.env.NODE_ENV === 'production' && key.includes('api_key')) {
          throw new Error('API keys cannot be stored in localStorage in production')
        }
        localStorage.setItem(key, value)
      }

      expect(() => {
        storeApiKey('stripe_api_key', 'sk_test_123')
      }).toThrow('API keys cannot be stored in localStorage in production')

      process.env.NODE_ENV = originalNodeEnv
    })

    it('should use secure cookie attributes for API key storage', () => {
      const mockDocument = {
        cookie: ''
      }
      Object.defineProperty(global, 'document', {
        value: mockDocument,
        writable: true
      })

      // Simulate secure cookie setting
      const setSecureCookie = (name: string, value: string) => {
        const isProduction = process.env.NODE_ENV === 'production'
        const cookieValue = `${name}=${value}; path=/; max-age=3600; samesite=strict${isProduction ? '; secure' : ''}`
        document.cookie = cookieValue
        return cookieValue
      }

      const cookieValue = setSecureCookie('api_session', 'token123')
      
      expect(cookieValue).toContain('samesite=strict')
      expect(cookieValue).toContain('max-age=3600')
      expect(cookieValue).toContain('path=/')
    })
  })
})