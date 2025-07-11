import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import LoginPage from '@/app/login/page'
import * as api from '@/lib/api'

// Mock the Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock the API module
jest.mock('@/lib/api', () => ({
  login: jest.fn(),
}))

// We'll use the real useAsyncOperation hook since it exists

// Mock the LoadingStates components
jest.mock('@/components/LoadingStates', () => ({
  LoadingButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  ErrorDisplay: ({ error, title }: any) => <div role="alert">{title}: {error}</div>,
  SuccessMessage: ({ message, onDismiss }: any) => (
    <div role="status">
      {message}
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  ),
}))

// Mock the Logo component to avoid theme provider issues
jest.mock('@/components/ui/Logo', () => ({
  Logo: ({ children, ...props }: any) => <div data-testid="logo">6FB Logo</div>,
}))

// Mock the Input component to simplify testing
jest.mock('@/components/ui/Input', () => ({
  Input: ({ label, ...props }: any) => (
    <div>
      <label htmlFor={props.id}>{label}</label>
      <input {...props} />
    </div>
  ),
}))

// Mock the Card components
jest.mock('@/components/ui/Card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

// Mock the Button component
jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, loading, loadingText, ...props }: any) => (
    <button {...props}>
      {loading ? loadingText || 'Loading...' : children}
    </button>
  ),
}))

describe('LoginPage', () => {
  const mockPush = jest.fn()
  const mockRouter = {
    push: mockPush,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
  }

  const mockSearchParams = {
    get: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
    mockSearchParams.get.mockReturnValue(null)
  })

  it('renders login form correctly', async () => {
    render(<LoginPage />)
    
    // Wait for the Suspense boundary to resolve
    await waitFor(() => {
      expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Sign in to manage your barbershop')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    
    // Check for links
    expect(screen.getByText('Forgot password?')).toBeInTheDocument()
    expect(screen.getByText('Create account')).toBeInTheDocument()
    expect(screen.getByText('Back to home')).toBeInTheDocument()
  })

  it('shows success message when registration is complete', async () => {
    mockSearchParams.get.mockImplementation((param) => {
      if (param === 'registered') return 'true'
      return null
    })
    
    render(<LoginPage />)
    
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Registration successful! Please sign in.'
      )
    })
  })

  it('shows success message when password reset is complete', async () => {
    mockSearchParams.get.mockImplementation((param) => {
      if (param === 'reset') return 'true'
      return null
    })
    
    render(<LoginPage />)
    
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Password reset successful! Please sign in with your new password.'
      )
    })
  })

  it('handles form submission with valid credentials', async () => {
    const mockLoginResponse = {
      access_token: 'fake-token',
      user: { id: 1, email: 'test@example.com' }
    }
    
    ;(api.login as jest.Mock).mockResolvedValue(mockLoginResponse)
    
    const user = userEvent.setup()
    
    render(<LoginPage />)
    
    await waitFor(() => {
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
    })
    
    // Fill in the form
    await user.type(screen.getByLabelText('Email'), 'test@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    
    // Submit the form
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    
    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    
    render(<LoginPage />)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    })
    
    // Try to submit without filling fields
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    
    // Check for HTML5 validation
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    
    expect(emailInput).toHaveAttribute('required')
    expect(passwordInput).toHaveAttribute('required')
    expect(emailInput).toHaveAttribute('type', 'email')
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('dismisses success message when close button is clicked', async () => {
    mockSearchParams.get.mockImplementation((param) => {
      if (param === 'registered') return 'true'
      return null
    })
    
    const user = userEvent.setup()
    
    render(<LoginPage />)
    
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument()
    })
    
    await user.click(screen.getByText('Dismiss'))
    
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })

  it('has proper accessibility structure', async () => {
    render(<LoginPage />)
    
    await waitFor(() => {
      expect(screen.getByRole('main')).toBeInTheDocument()
    })
    
    // Check for proper heading structure
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Welcome Back')
    
    // Check form structure - forms don't automatically have role="form", so we find it by element
    const form = screen.getByText('Sign in').closest('form')
    expect(form).toBeInTheDocument()
    
    // Check input labels are properly associated
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    
    expect(emailInput).toHaveAttribute('id')
    expect(passwordInput).toHaveAttribute('id')
  })

  it('navigates to correct pages when links are clicked', async () => {
    const user = userEvent.setup()
    
    render(<LoginPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Forgot password?')).toBeInTheDocument()
    })
    
    // Check link attributes (since these are Next.js Links, we check href)
    const forgotPasswordLink = screen.getByText('Forgot password?').closest('a')
    const registerLink = screen.getByText('Create account').closest('a')
    const homeLink = screen.getByText('Back to home').closest('a')
    
    expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password')
    expect(registerLink).toHaveAttribute('href', '/register')
    expect(homeLink).toHaveAttribute('href', '/')
  })
})