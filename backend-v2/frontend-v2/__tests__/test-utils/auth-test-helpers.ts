import { rest } from 'msw'
import { setupServer } from 'msw/node'

// Test data factories for authentication testing
export const AuthTestData = {
  validUser: {
    id: 'user-123',
    email: 'admin@bookedbarber.com',
    first_name: 'Admin',
    last_name: 'User',
    role: 'client',
    is_verified: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },

  unverifiedUser: {
    id: 'user-456',
    email: 'unverified@bookedbarber.com',
    first_name: 'Unverified',
    last_name: 'User',
    role: 'client',
    is_verified: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },

  validCredentials: {
    email: 'admin@bookedbarber.com',
    password: 'Password123!'
  },

  invalidCredentials: {
    email: 'admin@bookedbarber.com',
    password: 'wrongpassword'
  },

  successfulLoginResponse: {
    access_token: 'mock-jwt-token-12345',
    token_type: 'bearer',
    user_id: 'user-123',
    expires_in: 3600
  },

  edgeCaseEmails: [
    // Valid emails
    { email: 'test@example.com', valid: true },
    { email: 'user.name@domain.co.uk', valid: true },
    { email: 'user+tag@domain.com', valid: true },
    { email: 'user123@test-domain.org', valid: true },
    
    // Invalid emails (edge cases fixed in validation)
    { email: ' admin@bookedbarber.com', valid: false },
    { email: 'admin@bookedbarber.com ', valid: false },
    { email: 'user..name@domain.com', valid: false },
    { email: '.user@domain.com', valid: false },
    { email: 'user.@domain.com', valid: false },
    { email: 'user@.domain.com', valid: false },
    { email: 'user@domain.com.', valid: false },
    { email: 'user@domain..com', valid: false },
    { email: 'plainaddress', valid: false },
    { email: '@domain.com', valid: false },
    { email: 'user@', valid: false },
    { email: '', valid: false }
  ],

  errorResponses: {
    invalidCredentials: {
      status: 401,
      body: { detail: 'Invalid credentials' }
    },
    emailNotVerified: {
      status: 403,
      body: { detail: 'Email address not verified' }
    },
    userNotFound: {
      status: 401,
      body: { detail: 'Invalid credentials' } // Don't reveal user doesn't exist
    },
    rateLimited: {
      status: 429,
      body: { detail: 'Too many requests', retry_after: 60 }
    },
    serverError: {
      status: 500,
      body: { detail: 'Internal server error' }
    },
    badGateway: {
      status: 502,
      body: { detail: 'Bad Gateway' }
    },
    validationError: {
      status: 422,
      body: {
        detail: [
          {
            loc: ['body', 'email'],
            msg: 'field required',
            type: 'value_error.missing'
          }
        ]
      }
    },
    malformedJson: {
      status: 400,
      body: 'Invalid JSON'
    }
  }
}

// Mock server setup helpers
export const AuthMockServer = {
  createSuccessfulLoginFlow() {
    return setupServer(
      rest.post('/api/v2/auth/login', (req, res, ctx) => {
        return res(
          ctx.json(AuthTestData.successfulLoginResponse)
        )
      }),
      rest.get('/api/v2/auth/me', (req, res, ctx) => {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader?.includes('Bearer')) {
          return res(ctx.status(401), ctx.json({ detail: 'Unauthorized' }))
        }
        return res(ctx.json(AuthTestData.validUser))
      }),
      rest.post('/api/v2/auth/resend-verification', (req, res, ctx) => {
        return res(ctx.json({ message: 'Verification email sent' }))
      })
    )
  },

  createFailedLoginFlow(errorType: keyof typeof AuthTestData.errorResponses) {
    const error = AuthTestData.errorResponses[errorType]
    return setupServer(
      rest.post('/api/v2/auth/login', (req, res, ctx) => {
        return res(
          ctx.status(error.status),
          ctx.json(error.body)
        )
      })
    )
  },

  createNetworkErrorFlow() {
    return setupServer(
      rest.post('/api/v2/auth/login', (req, res, ctx) => {
        return res.networkError('Network connection failed')
      })
    )
  },

  createDelayedResponseFlow(delayMs: number = 1000) {
    return setupServer(
      rest.post('/api/v2/auth/login', (req, res, ctx) => {
        return res(
          ctx.delay(delayMs),
          ctx.json(AuthTestData.successfulLoginResponse)
        )
      })
    )
  },

  createEmailVerificationRequiredFlow() {
    return setupServer(
      rest.post('/api/v2/auth/login', (req, res, ctx) => {
        return res(
          ctx.status(403),
          ctx.json({ detail: 'Email address not verified' })
        )
      }),
      rest.post('/api/v2/auth/resend-verification', (req, res, ctx) => {
        return res(ctx.json({ message: 'Verification email sent' }))
      })
    )
  }
}

// Test helper utilities
export const AuthTestHelpers = {
  // Wait for form validation to complete
  async waitForValidation() {
    return new Promise(resolve => setTimeout(resolve, 100))
  },

  // Mock localStorage for token storage
  mockLocalStorage() {
    const store: Record<string, string> = {}
    return {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key]
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key])
      })
    }
  },

  // Mock Next.js router
  mockRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
      pathname: '/login',
      query: {},
      asPath: '/login'
    }
  },

  // Mock search params
  mockSearchParams(params: Record<string, string> = {}) {
    return {
      get: jest.fn((key: string) => params[key] || null),
      has: jest.fn((key: string) => key in params),
      toString: jest.fn(() => new URLSearchParams(params).toString())
    }
  },

  // Mock toast notifications
  mockToast() {
    return {
      toast: jest.fn(),
      dismiss: jest.fn()
    }
  },

  // Create form data for testing
  createFormData(email: string = AuthTestData.validCredentials.email, password: string = AuthTestData.validCredentials.password) {
    return { email, password }
  },

  // Simulate user typing with realistic delays
  async simulateTyping(element: HTMLElement, text: string, userEvent: any) {
    for (const char of text) {
      await userEvent.type(element, char)
      await new Promise(resolve => setTimeout(resolve, 10)) // Small delay between keystrokes
    }
  },

  // Check for accessibility violations
  async checkAccessibility(container: HTMLElement) {
    // This would integrate with @axe-core/react or similar
    // For now, check basic accessibility requirements
    const form = container.querySelector('form')
    const emailInput = container.querySelector('input[type="email"]')
    const passwordInput = container.querySelector('input[type="password"]')
    const submitButton = container.querySelector('button[type="submit"]')

    return {
      hasForm: !!form,
      emailHasLabel: !!emailInput?.getAttribute('aria-label') || !!container.querySelector('label[for="email"]'),
      passwordHasLabel: !!passwordInput?.getAttribute('aria-label') || !!container.querySelector('label[for="password"]'),
      submitHasLabel: !!submitButton?.getAttribute('aria-label'),
      hasLiveRegion: !!container.querySelector('[aria-live]') || !!container.querySelector('[role="alert"]')
    }
  },

  // Validate error message safety (no XSS)
  validateErrorMessageSafety(errorMessage: string) {
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ]

    return !dangerousPatterns.some(pattern => pattern.test(errorMessage))
  },

  // Performance testing helpers
  measureLoginPerformance: {
    start: () => performance.now(),
    end: (startTime: number) => performance.now() - startTime,
    isWithinBounds: (duration: number, maxMs: number = 5000) => duration <= maxMs
  },

  // Memory leak detection helpers
  checkForMemoryLeaks() {
    // Basic check for common memory leak indicators
    const eventListeners = (window as any).getEventListeners?.(document) || {}
    const numListeners = Object.values(eventListeners).flat().length
    
    return {
      eventListenerCount: numListeners,
      possibleLeak: numListeners > 100 // Arbitrary threshold
    }
  }
}

// Test assertion helpers
export const AuthAssertions = {
  // Verify successful login flow
  async assertSuccessfulLogin(mockRouter: any, localStorage: any) {
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
    expect(localStorage.setItem).toHaveBeenCalledWith('token', AuthTestData.successfulLoginResponse.access_token)
  },

  // Verify login failure
  async assertLoginFailure(mockRouter: any) {
    expect(mockRouter.push).not.toHaveBeenCalled()
  },

  // Verify validation error display
  async assertValidationError(container: HTMLElement, expectedError: string) {
    const errorElement = container.querySelector(`[data-testid*="error"], .error, [role="alert"]`)
    expect(errorElement).toBeInTheDocument()
    expect(errorElement).toHaveTextContent(expectedError)
  },

  // Verify loading state
  async assertLoadingState(container: HTMLElement) {
    const loadingIndicator = container.querySelector('[data-testid*="loading"], .loading, [aria-busy="true"]')
    const submitButton = container.querySelector('button[type="submit"]')
    
    expect(loadingIndicator || submitButton?.textContent?.includes('Signing in')).toBeTruthy()
    expect(submitButton).toBeDisabled()
  },

  // Verify email verification flow
  async assertEmailVerificationFlow(container: HTMLElement) {
    expect(container.querySelector('[data-testid*="verification"], [role="alert"]')).toBeInTheDocument()
    expect(container.querySelector('button[data-testid*="resend"], button:has-text("Resend")')).toBeInTheDocument()
  },

  // Verify error handling safety
  async assertSafeErrorHandling(consoleSpy: jest.SpyInstance) {
    // Should log errors but not throw unhandled exceptions
    expect(consoleSpy).toHaveBeenCalled()
    // No unhandled promise rejections should occur during testing
  }
}

// Mock data generators
export const AuthDataGenerators = {
  // Generate random valid email
  generateValidEmail(domain: string = 'bookedbarber.com') {
    const username = Math.random().toString(36).substring(2, 8)
    return `${username}@${domain}`
  },

  // Generate random invalid email
  generateInvalidEmail() {
    const invalidPatterns = [
      'plaintext',
      '@domain.com',
      'user@',
      'user..double@domain.com',
      'user@domain..com',
      ' spaceduser@domain.com',
      'user@domain.com '
    ]
    return invalidPatterns[Math.floor(Math.random() * invalidPatterns.length)]
  },

  // Generate strong password
  generateStrongPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  },

  // Generate weak password  
  generateWeakPassword() {
    const weakPasswords = ['password', '123456', 'qwerty', 'admin', 'password123']
    return weakPasswords[Math.floor(Math.random() * weakPasswords.length)]
  },

  // Generate JWT token for testing
  generateMockJWT() {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({ 
      sub: 'user-123',
      email: 'admin@bookedbarber.com',
      exp: Date.now() / 1000 + 3600
    }))
    const signature = 'mock-signature'
    return `${header}.${payload}.${signature}`
  }
}

// Environment setup helpers
export const AuthTestEnvironment = {
  // Setup test environment
  setup() {
    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'log').mockImplementation(() => {})

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/login',
        pathname: '/login',
        search: '',
        hash: ''
      },
      writable: true
    })

    // Mock performance API
    if (!global.performance) {
      global.performance = {
        now: jest.fn(() => Date.now())
      } as any
    }
  },

  // Cleanup test environment
  cleanup() {
    jest.restoreAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  }
}

export default {
  AuthTestData,
  AuthMockServer,
  AuthTestHelpers,
  AuthAssertions,
  AuthDataGenerators,
  AuthTestEnvironment
}