import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/login/page'
import { useRouter } from 'next/navigation'

// Mock the API module
jest.mock('@/lib/api', () => ({
  authService: {
    login: jest.fn(),
  }
}))

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  BarChart3: () => <div data-testid="bar-chart-icon" />,
}))

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset the global mock
    global.mockRouter.push.mockClear()
  })

  it('should render login form', () => {
    render(<LoginPage />)

    expect(screen.getByText('6FB Platform')).toBeInTheDocument()
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should display demo credentials', () => {
    render(<LoginPage />)

    expect(screen.getByText('Demo Credentials:')).toBeInTheDocument()
    expect(screen.getByText('admin@6fb.com / password123')).toBeInTheDocument()
  })

  it('should handle form submission', async () => {
    const user = userEvent.setup()
    const { authService } = require('@/lib/api')

    authService.login.mockResolvedValueOnce({
      access_token: 'test-token',
      user: { id: 1, email: 'test@example.com' },
    })

    render(<LoginPage />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        username: 'test@example.com',
        password: 'password123',
      })
      expect(global.mockRouter.push).toHaveBeenCalledWith('/')
    })
  })

  it('should show loading state during submission', async () => {
    const user = userEvent.setup()
    const { authService } = require('@/lib/api')

    authService.login.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    render(<LoginPage />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('should display error message on login failure', async () => {
    const user = userEvent.setup()
    const { authService } = require('@/lib/api')

    authService.login.mockRejectedValueOnce({
      response: {
        data: {
          detail: 'Invalid email or password',
        },
      },
    })

    render(<LoginPage />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument()
    })
  })

  it('should prevent form submission with empty fields', async () => {
    const user = userEvent.setup()
    const { authService } = require('@/lib/api')

    render(<LoginPage />)

    const submitButton = screen.getByRole('button', { name: /sign in/i })

    // Try to submit without filling fields
    await user.click(submitButton)

    expect(authService.login).not.toHaveBeenCalled()
  })
})
