import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import LoginPage from '@/app/login/page'
import { useRouter, useSearchParams } from 'next/navigation'

// Mock Next.js hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock other dependencies
jest.mock('@/lib/device-fingerprint', () => ({
  trustDevice: jest.fn(),
  generateDeviceFingerprint: jest.fn().mockResolvedValue('mock-device-id')
}))

const mockRouter = {
  push: jest.fn(),
}

const mockSearchParams = {
  get: jest.fn().mockReturnValue(null),
}

// Setup MSW server for API mocking
const server = setupServer(
  // Mock successful login
  rest.post('/api/v2/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        access_token: 'mock-jwt-token-12345',
        token_type: 'bearer',
        user_id: 'user-123'
      })
    )
  }),
  
  // Mock user profile
  rest.get('/api/v2/auth/me', (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.includes('Bearer')) {
      return res(ctx.status(401), ctx.json({ detail: 'Unauthorized' }))
    }
    
    return res(
      ctx.json({
        id: 'user-123',
        email: 'admin@bookedbarber.com',
        first_name: 'Admin',
        last_name: 'User',
        role: 'client',
        is_verified: true
      })
    )
  }),
  
  // Mock resend verification
  rest.post('/api/v2/auth/resend-verification', (req, res, ctx) => {
    return res(
      ctx.json({ message: 'Verification email sent' })
    )
  })
)

describe('Authentication Integration Tests', () => {
  beforeAll(() => {
    server.listen()
  })

  afterEach(() => {
    server.resetHandlers()
    jest.clearAllMocks()
  })

  afterAll(() => {
    server.close()
  })

  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    })

    // Mock console methods to avoid noise
    jest.spyOn(console, 'error').mockImplementation()
    jest.spyOn(console, 'log').mockImplementation()
  })

  describe('Successful Login Flow', () => {
    test('should complete full login flow with admin@bookedbarber.com', async () => {
      const user = userEvent.setup()
      
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      // Fill out form
      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'Password123!')
      
      // Submit form
      await user.click(submitButton)

      // Wait for login request to complete
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      }, { timeout: 5000 })

      // Verify localStorage token was set
      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('token', 'mock-jwt-token-12345')
      })
    })

    test('should handle remember me functionality', async () => {
      const user = userEvent.setup()
      
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const rememberMeCheckbox = screen.getByRole('checkbox')
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'Password123!')
      await user.click(rememberMeCheckbox)
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      })
    })
  })

  describe('Error Scenarios', () => {
    test('should handle 401 unauthorized error', async () => {
      server.use(
        rest.post('/api/v2/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(401),
            ctx.json({ detail: 'Invalid credentials' })
          )
        })
      )

      const user = userEvent.setup()
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      // Should not redirect on error
      await waitFor(() => {
        expect(mockRouter.push).not.toHaveBeenCalled()
      })
    })

    test('should handle email verification required (403)', async () => {
      server.use(
        rest.post('/api/v2/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(403),
            ctx.json({ detail: 'Email address not verified' })
          )
        })
      )

      const user = userEvent.setup()
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'Password123!')
      await user.click(submitButton)

      // Should show verification error
      await waitFor(() => {
        expect(screen.getByText(/email verification required/i)).toBeInTheDocument()
      })

      // Should show resend button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument()
      })
    })

    test('should handle resend verification flow', async () => {
      server.use(
        rest.post('/api/v2/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(403),
            ctx.json({ detail: 'Email address not verified' })
          )
        })
      )

      const user = userEvent.setup()
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'Password123!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument()
      })

      const resendButton = screen.getByRole('button', { name: /resend verification email/i })
      await user.click(resendButton)

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/verification email sent/i)).toBeInTheDocument()
      })
    })

    test('should handle network errors gracefully', async () => {
      server.use(
        rest.post('/api/v2/auth/login', (req, res, ctx) => {
          return res.networkError('Network connection failed')
        })
      )

      const user = userEvent.setup()
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'Password123!')
      await user.click(submitButton)

      // Should handle network error gracefully without crashing
      await waitFor(() => {
        expect(mockRouter.push).not.toHaveBeenCalled()
      })
    })

    test('should handle server errors (500)', async () => {
      server.use(
        rest.post('/api/v2/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ detail: 'Internal server error' })
          )
        })
      )

      const user = userEvent.setup()
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'Password123!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockRouter.push).not.toHaveBeenCalled()
      })
    })
  })

  describe('API Request Validation', () => {
    test('should send correct login request format', async () => {
      let capturedRequest: any = null

      server.use(
        rest.post('/api/v2/auth/login', async (req, res, ctx) => {
          capturedRequest = await req.json()
          return res(
            ctx.json({
              access_token: 'mock-token',
              token_type: 'bearer',
              user_id: 'user-123'
            })
          )
        })
      )

      const user = userEvent.setup()
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'Password123!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(capturedRequest).toEqual({
          email: 'admin@bookedbarber.com',
          password: 'Password123!'
        })
      })
    })

    test('should include authorization header in profile request', async () => {
      let capturedHeaders: any = null

      server.use(
        rest.get('/api/v2/auth/me', (req, res, ctx) => {
          capturedHeaders = Object.fromEntries(req.headers.entries())
          return res(
            ctx.json({
              id: 'user-123',
              email: 'admin@bookedbarber.com',
              role: 'client'
            })
          )
        })
      )

      const user = userEvent.setup()
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'Password123!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(capturedHeaders?.authorization).toBe('Bearer mock-jwt-token-12345')
      })
    })
  })

  describe('Loading States Integration', () => {
    test('should show loading state during API call', async () => {
      // Add delay to login response
      server.use(
        rest.post('/api/v2/auth/login', (req, res, ctx) => {
          return res(
            ctx.delay(1000),
            ctx.json({
              access_token: 'mock-token',
              token_type: 'bearer',
              user_id: 'user-123'
            })
          )
        })
      )

      const user = userEvent.setup()
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'Password123!')
      await user.click(submitButton)

      // Should show loading state
      expect(screen.getByText(/signing in/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })

    test('should handle concurrent login attempts', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'Password123!')
      
      // Try to submit multiple times quickly
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      // Should only make one request (button should be disabled after first click)
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Email Validation Integration', () => {
    test('should validate email format before API call', async () => {
      let apiCalled = false

      server.use(
        rest.post('/api/v2/auth/login', (req, res, ctx) => {
          apiCalled = true
          return res(ctx.json({}))
        })
      )

      const user = userEvent.setup()
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      // Enter invalid email
      await user.type(emailInput, 'invalid-email')
      await user.type(passwordInput, 'Password123!')
      await user.click(submitButton)

      // API should not be called with invalid email
      await waitFor(() => {
        expect(apiCalled).toBe(false)
      })

      // Should show validation error
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })

    test('should handle edge case emails correctly', async () => {
      const edgeCaseEmails = [
        ' admin@bookedbarber.com ',  // spaces
        'admin..test@bookedbarber.com',  // consecutive dots
        'admin@bookedbarber..com'  // consecutive dots in domain
      ]

      for (const email of edgeCaseEmails) {
        let apiCalled = false

        server.use(
          rest.post('/api/v2/auth/login', (req, res, ctx) => {
            apiCalled = true
            return res(ctx.json({}))
          })
        )

        const user = userEvent.setup()
        render(<LoginPage />)

        const emailInput = screen.getByLabelText(/email address/i)
        const passwordInput = screen.getByLabelText(/password/i)
        const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

        await user.clear(emailInput)
        await user.type(emailInput, email)
        await user.type(passwordInput, 'Password123!')
        await user.click(submitButton)

        await waitFor(() => {
          expect(apiCalled).toBe(false)
        }, { timeout: 1000 })
      }
    })
  })

  describe('Token Management Integration', () => {
    test('should store token in localStorage on successful login', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'Password123!')
      await user.click(submitButton)

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('token', 'mock-jwt-token-12345')
      })
    })

    test('should handle profile fetch failure gracefully', async () => {
      server.use(
        rest.get('/api/v2/auth/me', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ detail: 'Server error' })
          )
        })
      )

      const user = userEvent.setup()
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'Password123!')
      await user.click(submitButton)

      // Should still redirect even if profile fetch fails
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      })
    })
  })
})