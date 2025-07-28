import { getBusinessContextError, formatErrorForToast } from '@/lib/error-messages'

// Mock console.error to prevent noise in test output
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

describe('Error Handling Unit Tests', () => {
  beforeEach(() => {
    consoleErrorSpy.mockClear()
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('getBusinessContextError Function', () => {
    test('should handle valid error objects correctly', () => {
      const error = {
        status: 401,
        message: 'Invalid credentials',
        response: { status: 401 }
      }

      const result = getBusinessContextError('login', error, {
        userType: 'client',
        feature: 'authentication'
      })

      expect(result).toHaveProperty('message')
      expect(result).toHaveProperty('title')
      expect(typeof result.message).toBe('string')
      expect(typeof result.title).toBe('string')
    })

    test('should handle undefined error properties safely', () => {
      const error = {}

      const result = getBusinessContextError('login', error, {
        userType: 'client',
        feature: 'authentication'
      })

      expect(result).toHaveProperty('message')
      expect(result).toHaveProperty('title')
      expect(typeof result.message).toBe('string')
      expect(typeof result.title).toBe('string')
    })

    test('should handle null/undefined error objects', () => {
      const nullResult = getBusinessContextError('login', null, {
        userType: 'client',
        feature: 'authentication'
      })

      const undefinedResult = getBusinessContextError('login', undefined, {
        userType: 'client',
        feature: 'authentication'
      })

      expect(nullResult).toHaveProperty('message')
      expect(undefinedResult).toHaveProperty('message')
    })

    test('should handle errors with nested response objects', () => {
      const error = {
        response: {
          status: 403,
          data: {
            message: 'Email not verified'
          }
        }
      }

      const result = getBusinessContextError('login', error, {
        userType: 'client',
        feature: 'authentication'
      })

      expect(result).toHaveProperty('message')
      expect(result).toHaveProperty('title')
    })

    test('should handle errors that throw during processing', () => {
      // Create an error object that throws when accessed
      const problematicError = {
        get status() {
          throw new Error('Property access error')
        },
        get message() {
          throw new Error('Message access error')
        }
      }

      // Should not throw and should return a fallback error
      expect(() => {
        const result = getBusinessContextError('login', problematicError, {
          userType: 'client',
          feature: 'authentication'
        })
        expect(result).toHaveProperty('message')
      }).not.toThrow()
    })

    test('should handle different operation types', () => {
      const error = { status: 500, message: 'Server error' }

      const loginResult = getBusinessContextError('login', error)
      const resendResult = getBusinessContextError('resend_verification', error)
      const socialResult = getBusinessContextError('social_login', error)

      expect(loginResult).toHaveProperty('message')
      expect(resendResult).toHaveProperty('message')
      expect(socialResult).toHaveProperty('message')
    })
  })

  describe('formatErrorForToast Function', () => {
    test('should format enhanced error messages correctly', () => {
      const enhancedError = {
        title: 'Authentication Error',
        message: 'Invalid credentials provided',
        statusCode: 401
      }

      const result = formatErrorForToast(enhancedError)

      expect(result).toEqual({
        title: 'Authentication Error',
        description: 'Invalid credentials provided',
        variant: 'destructive'
      })
    })

    test('should handle missing properties gracefully', () => {
      const incompleteError = {
        message: 'Error occurred'
      }

      const result = formatErrorForToast(incompleteError as any)

      expect(result).toHaveProperty('title')
      expect(result).toHaveProperty('description')
      expect(result.variant).toBe('destructive')
      expect(result.description).toBe('Error occurred')
    })

    test('should handle undefined/null enhanced error objects', () => {
      const nullResult = formatErrorForToast(null as any)
      const undefinedResult = formatErrorForToast(undefined as any)

      expect(nullResult).toHaveProperty('variant', 'destructive')
      expect(undefinedResult).toHaveProperty('variant', 'destructive')
    })

    test('should handle errors that throw during formatting', () => {
      const problematicError = {
        get title() {
          throw new Error('Title access error')
        },
        get message() {
          throw new Error('Message access error')
        }
      }

      expect(() => {
        const result = formatErrorForToast(problematicError as any)
        expect(result).toHaveProperty('variant', 'destructive')
      }).not.toThrow()
    })
  })

  describe('Safe Error Processing Integration', () => {
    test('should handle the complete error processing chain safely', () => {
      const originalError = {
        status: 403,
        message: 'Email address not verified'
      }

      // Simulate the safe error processing pattern from login component
      let enhancedError
      try {
        enhancedError = getBusinessContextError('login', originalError, {
          userType: 'client',
          feature: 'authentication'
        })
      } catch (errorProcessingError) {
        enhancedError = { message: 'Login failed. Please try again.' }
      }

      expect(enhancedError).toHaveProperty('message')

      // Then format for toast safely
      let toastConfig
      try {
        toastConfig = formatErrorForToast(enhancedError)
      } catch (toastError) {
        toastConfig = {
          title: 'Error',
          description: enhancedError.message || 'An error occurred. Please try again.',
          variant: 'destructive'
        }
      }

      expect(toastConfig).toHaveProperty('variant', 'destructive')
      expect(toastConfig).toHaveProperty('description')
    })

    test('should handle resend verification error processing chain', () => {
      const resendError = {
        status: 429,
        message: 'Too many requests'
      }

      let enhancedError
      try {
        enhancedError = getBusinessContextError('resend_verification', resendError, {
          userType: 'client',
          feature: 'email_verification'
        })
      } catch (errorProcessingError) {
        enhancedError = { message: 'Failed to send verification email. Please try again.' }
      }

      expect(enhancedError).toHaveProperty('message')

      let toastConfig
      try {
        toastConfig = formatErrorForToast(enhancedError)
      } catch (toastError) {
        toastConfig = {
          title: 'Error',
          description: enhancedError.message || 'An error occurred. Please try again.',
          variant: 'destructive'
        }
      }

      expect(toastConfig.variant).toBe('destructive')
    })
  })

  describe('Console Logging Safety', () => {
    test('should safely log errors with optional chaining patterns', () => {
      const errorWithoutMessage = { status: 500 }
      const errorWithoutStatus = { message: 'Test error' }
      const nullError = null
      const undefinedError = undefined

      // These should not throw when using optional chaining
      expect(() => {
        console.error('Error details:', errorWithoutMessage?.message)
        console.error('Error status:', errorWithoutStatus?.status)
        console.error('Null error:', nullError?.message)
        console.error('Undefined error:', undefinedError?.message)
      }).not.toThrow()
    })

    test('should handle nested property access safely', () => {
      const complexError = {
        response: {
          data: {
            details: {
              code: 'AUTH_FAILED'
            }
          }
        }
      }

      const incompleteError = {
        response: null
      }

      expect(() => {
        console.error('Complex error code:', complexError?.response?.data?.details?.code)
        console.error('Incomplete error:', incompleteError?.response?.data?.message)
      }).not.toThrow()
    })
  })
})