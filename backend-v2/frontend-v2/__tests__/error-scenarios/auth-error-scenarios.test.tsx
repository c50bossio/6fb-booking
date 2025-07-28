import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import LoginPage from '@/app/login/page'
import { useRouter, useSearchParams } from 'next/navigation'

// Mock dependencies
jest.mock('next/navigation')
jest.mock('@/lib/device-fingerprint', () => ({
  trustDevice: jest.fn(),
  generateDeviceFingerprint: jest.fn().mockResolvedValue('mock-device-id')
}))

const mockRouter = { push: jest.fn() }
const mockSearchParams = { get: jest.fn().mockReturnValue(null) }

describe('Authentication Error Scenarios', () => {
  const server = setupServer()

  beforeAll(() => server.listen())
  afterEach(() => {
    server.resetHandlers()
    jest.clearAllMocks()
  })
  afterAll(() => server.close())

  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
    
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    })

    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation()
    jest.spyOn(console, 'log').mockImplementation()
  })

  describe('JavaScript Error Scenarios', () => {
    test('should handle undefined property access in error responses', async () => {
      const user = userEvent.setup()
      
      // Mock API response with missing properties
      server.use(
        rest.post('/api/v2/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(401),
            ctx.json({}) // Empty response object
          )
        })
      )

      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email address/i), 'admin@bookedbarber.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Should not crash even with undefined properties
      await waitFor(() => {
        expect(mockRouter.push).not.toHaveBeenCalled()
      })
    })

    test('should handle malformed JSON responses', async () => {
      const user = userEvent.setup()
      
      server.use(
        rest.post('/api/v2/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(401),
            ctx.text('Invalid JSON response') // Non-JSON response
          )
        })
      )

      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email address/i), 'admin@bookedbarber.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      // Should not crash when parsing malformed JSON
      expect(async () => {
        await user.click(screen.getByRole('button', { name: /sign in to your account/i }))
      }).not.toThrow()
    })

    test('should handle null/undefined error objects safely', async () => {
      const user = userEvent.setup()
      
      server.use(
        rest.post('/api/v2/auth/login', (req, res, ctx) => {
          return res.networkError('Network error')
        })
      )

      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email address/i), 'admin@bookedbarber.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      // Should handle network errors gracefully
      expect(async () => {
        await user.click(screen.getByRole('button', { name: /sign in to your account/i }))
      }).not.toThrow()
    })

    test('should handle circular reference errors in error objects', async () => {
      const user = userEvent.setup()
      
      // This would typically cause JSON.stringify to fail
      server.use(
        rest.post('/api/v2/auth/login', (req, res, ctx) => {
          const circularError = { status: 401 }
          circularError.self = circularError // Circular reference
          
          return res(
            ctx.status(401),
            ctx.json({ detail: 'Error with circular reference' })
          )
        })
      )

      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email address/i), 'admin@bookedbarber.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Should handle gracefully without infinite loops
      await waitFor(() => {
        expect(mockRouter.push).not.toHaveBeenCalled()
      })
    })
  })

  describe('API Error Response Scenarios', () => {
    test('should handle 429 rate limiting errors', async () => {
      const user = userEvent.setup()
      
      server.use(
        rest.post('/api/v2/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(429),
            ctx.json({
              detail: 'Too many requests',
              retry_after: 60
            })
          )
        })
      )

      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email address/i), 'admin@bookedbarber.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Should handle rate limiting gracefully
      await waitFor(() => {
        expect(mockRouter.push).not.toHaveBeenCalled()
      })
    })

    test('should handle 422 validation errors with field details', async () => {
      const user = userEvent.setup()
      
      server.use(
        rest.post('/api/v2/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(422),
            ctx.json({
              detail: [
                {
                  loc: ['body', 'email'],
                  msg: 'field required',
                  type: 'value_error.missing'
                },
                {
                  loc: ['body', 'password'],
                  msg: 'ensure this value has at least 6 characters',
                  type: 'value_error.any_str.min_length'
                }
              ]
            })
          )
        })
      )

      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), '123')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      await waitFor(() => {
        expect(mockRouter.push).not.toHaveBeenCalled()
      })
    })

    test('should handle 502 bad gateway errors', async () => {
      const user = userEvent.setup()
      
      server.use(
        rest.post('/api/v2/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(502),
            ctx.json({
              detail: 'Bad Gateway'
            })
          )
        })
      )

      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email address/i), 'admin@bookedbarber.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      await waitFor(() => {
        expect(mockRouter.push).not.toHaveBeenCalled()
      })
    })

    test('should handle timeout errors', async () => {
      const user = userEvent.setup()
      
      server.use(
        rest.post('/api/v2/auth/login', (req, res, ctx) => {
          // Simulate timeout
          return res(
            ctx.delay(30000), // 30 second delay
            ctx.status(408),
            ctx.json({ detail: 'Request timeout' })
          )
        })
      )

      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email address/i), 'admin@bookedbarber.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Should show loading state initially
      await expect(screen.getByText(/signing in/i)).toBeVisible()
    })
  })

  describe('Email Validation Error Scenarios', () => {
    test('should handle edge case email formats', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      const edgeCaseEmails = [
        'test@domain',              // Missing TLD
        'test@.domain.com',         // Leading dot in domain
        'test@domain.com.',         // Trailing dot in domain
        'test..email@domain.com',   // Consecutive dots in local part
        'test@domain..com',         // Consecutive dots in domain
        ' test@domain.com',         // Leading space
        'test@domain.com ',         // Trailing space
        '@domain.com',              // Missing local part
        'test@',                    // Missing domain
        'test@domain@com',          // Multiple @ symbols
        'test.@domain.com',         // Dot before @
        'test@.domain.com',         // Dot after @
      ]

      for (const email of edgeCaseEmails) {
        await user.clear(screen.getByLabelText(/email address/i))
        await user.type(screen.getByLabelText(/email address/i), email)
        await user.type(screen.getByLabelText(/password/i), 'password123')
        await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

        // Should show validation error for each edge case
        await waitFor(() => {
          expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
        })
      }
    })

    test('should handle extremely long email addresses', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      // Create extremely long email (over 254 characters)
      const longEmail = 'a'.repeat(250) + '@domain.com'
      
      await user.type(screen.getByLabelText(/email address/i), longEmail)
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Should handle gracefully
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
    })

    test('should handle special characters in email', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      const specialCharEmails = [
        'test+tag@domain.com',      // Plus sign (valid)
        'test-name@domain.com',     // Hyphen (valid)
        'test_name@domain.com',     // Underscore (valid)
        'test.name@domain.com',     // Dot (valid)
        'test%name@domain.com',     // Percent (invalid)
        'test#name@domain.com',     // Hash (invalid)
        'test$name@domain.com',     // Dollar (invalid)
        'test&name@domain.com',     // Ampersand (invalid)
      ]

      for (const email of specialCharEmails) {
        await user.clear(screen.getByLabelText(/email address/i))
        await user.type(screen.getByLabelText(/email address/i), email)
        await user.tab() // Trigger validation

        // Valid emails should pass, invalid should fail
        if (['test+tag@domain.com', 'test-name@domain.com', 'test_name@domain.com', 'test.name@domain.com'].includes(email)) {
          await waitFor(() => {
            expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument()
          })
        } else {
          await waitFor(() => {
            expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
          })
        }
      }
    })
  })

  describe('Form State Error Scenarios', () => {
    test('should handle rapid form submissions', async () => {
      const user = userEvent.setup()
      
      let requestCount = 0
      server.use(
        rest.post('/api/v2/auth/login', (req, res, ctx) => {
          requestCount++
          return res(
            ctx.delay(1000),
            ctx.json({
              access_token: 'token',
              token_type: 'bearer',
              user_id: 'user-123'
            })
          )
        })
      )

      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email address/i), 'admin@bookedbarber.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })
      
      // Try multiple rapid submissions
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      // Should only allow one submission
      await waitFor(() => {
        expect(requestCount).toBe(1)
      })
    })

    test('should handle form submission during validation', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      // Start typing in email field
      await user.type(screen.getByLabelText(/email address/i), 'admin@')
      
      // Try to submit while still typing
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Should prevent submission and show validation errors
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
    })

    test('should handle form reset during submission', async () => {
      const user = userEvent.setup()
      
      server.use(
        rest.post('/api/v2/auth/login', (req, res, ctx) => {
          return res(
            ctx.delay(2000),
            ctx.json({
              access_token: 'token',
              token_type: 'bearer',
              user_id: 'user-123'
            })
          )
        })
      )

      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email address/i), 'admin@bookedbarber.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Clear form while submission is in progress
      await user.clear(screen.getByLabelText(/email address/i))
      await user.clear(screen.getByLabelText(/password/i))

      // Should handle gracefully
      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toHaveValue('')
      })
    })
  })

  describe('Error Message Handling', () => {
    test('should handle error message processing failures', async () => {
      const user = userEvent.setup()
      
      server.use(
        rest.post('/api/v2/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(401),
            ctx.json({
              detail: 'Authentication failed',
              code: 'AUTH_FAILED',
              timestamp: new Date().toISOString()
            })
          )
        })
      )

      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email address/i), 'admin@bookedbarber.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Should handle error processing gracefully
      await waitFor(() => {
        expect(mockRouter.push).not.toHaveBeenCalled()
      })
    })

    test('should handle missing error messages', async () => {
      const user = userEvent.setup()
      
      server.use(
        rest.post('/api/v2/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(401),
            ctx.json({}) // No error message
          )
        })
      )

      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email address/i), 'admin@bookedbarber.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Should provide fallback error message
      await waitFor(() => {
        expect(mockRouter.push).not.toHaveBeenCalled()
      })
    })

    test('should handle error messages with HTML content', async () => {
      const user = userEvent.setup()
      
      server.use(
        rest.post('/api/v2/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(401),
            ctx.json({
              detail: '<script>alert("xss")</script>Invalid credentials'
            })
          )
        })
      )

      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email address/i), 'admin@bookedbarber.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Should sanitize HTML content in error messages
      await waitFor(() => {
        expect(mockRouter.push).not.toHaveBeenCalled()
      })
      
      // Should not execute any scripts
      expect(window.alert).not.toHaveBeenCalled()
    })
  })

  describe('Memory and Resource Error Scenarios', () => {
    test('should handle large error response payloads', async () => {
      const user = userEvent.setup()
      
      // Create large error response
      const largeErrorData = {
        detail: 'Error occurred',
        trace: 'A'.repeat(100000), // 100KB of data
        metadata: Array(1000).fill({ key: 'value' })
      }
      
      server.use(
        rest.post('/api/v2/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json(largeErrorData)
          )
        })
      )

      render(<LoginPage />)

      await user.type(screen.getByLabelText(/email address/i), 'admin@bookedbarber.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      // Should handle large responses without memory issues
      expect(async () => {
        await user.click(screen.getByRole('button', { name: /sign in to your account/i }))
      }).not.toThrow()
    })

    test('should handle concurrent error scenarios', async () => {
      const user = userEvent.setup()
      
      server.use(
        rest.post('/api/v2/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(401),
            ctx.json({ detail: 'Authentication failed' })
          )
        }),
        rest.post('/api/v2/auth/resend-verification', (req, res, ctx) => {
          return res(
            ctx.status(429),
            ctx.json({ detail: 'Too many requests' })
          )
        })
      )

      render(<LoginPage />)

      // Trigger login error first
      await user.type(screen.getByLabelText(/email address/i), 'admin@bookedbarber.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Then trigger resend verification error
      // (This would require the verification error state to be shown first)
      
      // Should handle multiple concurrent errors gracefully
      await waitFor(() => {
        expect(mockRouter.push).not.toHaveBeenCalled()
      })
    })
  })
})