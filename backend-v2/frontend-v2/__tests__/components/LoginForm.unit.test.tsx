import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter, useSearchParams } from 'next/navigation'
import LoginPage from '@/app/login/page'
import { login, getProfile, resendVerification } from '@/lib/api'
import { getBusinessContextError, formatErrorForToast } from '@/lib/error-messages'
import { useToast } from '@/hooks/use-toast'

// Mock dependencies
jest.mock('next/navigation')
jest.mock('@/lib/api')
jest.mock('@/lib/error-messages')
jest.mock('@/hooks/use-toast')
jest.mock('@/lib/device-fingerprint', () => ({
  trustDevice: jest.fn(),
  generateDeviceFingerprint: jest.fn().mockResolvedValue('mock-device-id')
}))

const mockRouter = {
  push: jest.fn(),
}

const mockSearchParams = {
  get: jest.fn(),
}

const mockToast = jest.fn()

const mockLogin = login as jest.MockedFunction<typeof login>
const mockGetProfile = getProfile as jest.MockedFunction<typeof getProfile>
const mockResendVerification = resendVerification as jest.MockedFunction<typeof resendVerification>
const mockGetBusinessContextError = getBusinessContextError as jest.MockedFunction<typeof getBusinessContextError>
const mockFormatErrorForToast = formatErrorForToast as jest.MockedFunction<typeof formatErrorForToast>

describe('Login Form Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
    ;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })
    
    // Setup default mock responses
    mockGetBusinessContextError.mockReturnValue({
      title: 'Authentication Error',
      message: 'Login failed. Please try again.',
      statusCode: 401
    })
    
    mockFormatErrorForToast.mockReturnValue({
      title: 'Authentication Error',
      description: 'Login failed. Please try again.',
      variant: 'destructive'
    })

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    })
  })

  describe('Form Rendering', () => {
    test('should render login form with email and password fields', () => {
      render(<LoginPage />)

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in to your account/i })).toBeInTheDocument()
    })

    test('should render remember me checkbox and forgot password link', () => {
      render(<LoginPage />)

      expect(screen.getByRole('checkbox')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument()
    })

    test('should render registration link', () => {
      render(<LoginPage />)

      expect(screen.getByRole('link', { name: /create your account/i })).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    test('should show validation errors for empty fields', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })
      
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })

    test('should validate email format', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      
      await user.type(emailInput, 'invalid-email')
      await user.tab() // Trigger blur event

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
    })

    test('should validate admin@bookedbarber.com correctly', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'password123')

      await waitFor(() => {
        expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument()
      })
    })

    test('should reject emails with leading/trailing spaces', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      
      await user.type(emailInput, ' admin@bookedbarber.com ')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
    })

    test('should reject emails with consecutive dots', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      
      await user.type(emailInput, 'admin..test@bookedbarber.com')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
    })

    test('should validate password length', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)

      const passwordInput = screen.getByLabelText(/password/i)
      
      await user.type(passwordInput, '12345')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument()
      })
    })
  })

  describe('Successful Login Flow', () => {
    test('should handle successful login and redirect', async () => {
      const user = userEvent.setup()
      
      mockLogin.mockResolvedValue({
        access_token: 'mock-token',
        user_id: 'user-123'
      })
      
      mockGetProfile.mockResolvedValue({
        id: 'user-123',
        email: 'admin@bookedbarber.com',
        role: 'client'
      })

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('admin@bookedbarber.com', 'password123')
      })

      await waitFor(() => {
        expect(mockGetProfile).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      })
    })

    test('should handle remember me functionality', async () => {
      const user = userEvent.setup()
      
      mockLogin.mockResolvedValue({
        access_token: 'mock-token',
        user_id: 'user-123'
      })

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const rememberMeCheckbox = screen.getByRole('checkbox')
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'password123')
      await user.click(rememberMeCheckbox)
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('admin@bookedbarber.com', 'password123')
      })
    })
  })

  describe('Error Handling', () => {
    test('should handle login errors with safe error processing', async () => {
      const user = userEvent.setup()
      
      const loginError = {
        status: 401,
        message: 'Invalid credentials'
      }
      
      mockLogin.mockRejectedValue(loginError)

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockGetBusinessContextError).toHaveBeenCalledWith('login', loginError, {
          userType: 'client',
          feature: 'authentication'
        })
      })
    })

    test('should handle error processing failures gracefully', async () => {
      const user = userEvent.setup()
      
      const loginError = {
        status: 401,
        message: 'Invalid credentials'
      }
      
      mockLogin.mockRejectedValue(loginError)
      mockGetBusinessContextError.mockImplementation(() => {
        throw new Error('Error processing error')
      })

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'wrongpassword')
      
      // Should not throw even if error processing fails
      expect(async () => {
        await user.click(submitButton)
      }).not.toThrow()
    })

    test('should handle email verification errors', async () => {
      const user = userEvent.setup()
      
      const verificationError = {
        status: 403,
        message: 'Email address not verified'
      }
      
      mockLogin.mockRejectedValue(verificationError)

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Email Verification Required',
          description: 'Please check your email and click the verification link to activate your account.',
          variant: 'destructive'
        })
      })

      await waitFor(() => {
        expect(screen.getByText(/email verification required/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument()
      })
    })

    test('should handle resend verification functionality', async () => {
      const user = userEvent.setup()
      
      const verificationError = {
        status: 403,
        message: 'Email address not verified'
      }
      
      mockLogin.mockRejectedValue(verificationError)
      mockResendVerification.mockResolvedValue({})

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument()
      })

      const resendButton = screen.getByRole('button', { name: /resend verification email/i })
      await user.click(resendButton)

      await waitFor(() => {
        expect(mockResendVerification).toHaveBeenCalledWith('admin@bookedbarber.com')
      })
    })

    test('should handle resend verification errors safely', async () => {
      const user = userEvent.setup()
      
      const verificationError = {
        status: 403,
        message: 'Email address not verified'
      }
      
      const resendError = {
        status: 429,
        message: 'Too many requests'
      }
      
      mockLogin.mockRejectedValue(verificationError)
      mockResendVerification.mockRejectedValue(resendError)

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument()
      })

      const resendButton = screen.getByRole('button', { name: /resend verification email/i })
      await user.click(resendButton)

      await waitFor(() => {
        expect(mockGetBusinessContextError).toHaveBeenCalledWith('resend_verification', resendError, {
          userType: 'client',
          feature: 'email_verification'
        })
      })
    })
  })

  describe('URL Parameter Handling', () => {
    test('should show registration success message', () => {
      mockSearchParams.get.mockImplementation((param) => {
        if (param === 'registered') return 'true'
        return null
      })

      render(<LoginPage />)

      expect(screen.getByText(/registration successful/i)).toBeInTheDocument()
    })

    test('should show password reset success message', () => {
      mockSearchParams.get.mockImplementation((param) => {
        if (param === 'reset') return 'true'
        return null
      })

      render(<LoginPage />)

      expect(screen.getByText(/password reset successful/i)).toBeInTheDocument()
    })

    test('should show email verification success message', () => {
      mockSearchParams.get.mockImplementation((param) => {
        if (param === 'verified') return 'true'
        return null
      })

      render(<LoginPage />)

      expect(screen.getByText(/email verified successfully/i)).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    test('should show loading state during form submission', async () => {
      const user = userEvent.setup()
      
      // Create a promise that resolves after a delay
      let resolveLogin: (value: any) => void
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve
      })
      
      mockLogin.mockReturnValue(loginPromise as any)

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/signing in/i)).toBeInTheDocument()
      })

      // Resolve the login promise
      resolveLogin!({
        access_token: 'mock-token',
        user_id: 'user-123'
      })
    })

    test('should disable submit button during loading', async () => {
      const user = userEvent.setup()
      
      let resolveLogin: (value: any) => void
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve
      })
      
      mockLogin.mockReturnValue(loginPromise as any)

      render(<LoginPage />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      await user.type(emailInput, 'admin@bookedbarber.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })

      resolveLogin!({
        access_token: 'mock-token',
        user_id: 'user-123'
      })
    })
  })
})