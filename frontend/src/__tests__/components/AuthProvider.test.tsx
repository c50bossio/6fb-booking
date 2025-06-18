import React from 'react'
import { render, screen, renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, AuthContext } from '@/components/AuthProvider'
import { useRouter, usePathname } from 'next/navigation'

// Mock the API module
jest.mock('@/lib/api', () => ({
  authService: {
    getCurrentUser: jest.fn(),
    logout: jest.fn(),
    getStoredUser: jest.fn(),
    isAuthenticated: jest.fn(),
  }
}))

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    global.mockRouter.push.mockClear()
    // Reset pathname to default
    ;(usePathname as jest.Mock).mockReturnValue('/')
  })

  it('should render children', () => {
    render(
      <AuthProvider>
        <div>Test Child</div>
      </AuthProvider>
    )

    expect(screen.getByText('Test Child')).toBeInTheDocument()
  })

  it('should check authentication on mount', async () => {
    const { authService } = require('@/lib/api')
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'barber',
    }

    localStorage.setItem('access_token', 'test-token')
    authService.getCurrentUser.mockResolvedValueOnce(mockUser)

    render(
      <AuthProvider>
        <div>Test Child</div>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(authService.getCurrentUser).toHaveBeenCalled()
    })
  })

  it('should redirect to login on protected routes when not authenticated', async () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard')

    render(
      <AuthProvider>
        <div>Protected Content</div>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(global.mockRouter.push).toHaveBeenCalledWith('/login')
    })
  })

  it('should not redirect on public routes', async () => {
    (usePathname as jest.Mock).mockReturnValue('/login')

    render(
      <AuthProvider>
        <div>Login Page</div>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(global.mockRouter.push).not.toHaveBeenCalled()
    })
  })

  it('should handle authentication check failure', async () => {
    const { authService } = require('@/lib/api')
    
    localStorage.setItem('access_token', 'invalid-token')
    authService.getCurrentUser.mockRejectedValueOnce(new Error('Invalid token'))

    render(
      <AuthProvider>
        <div>Test Child</div>
      </AuthProvider>
    )

    await waitFor(() => {
      expect(localStorage.getItem('access_token')).toBeNull()
    })
  })

  it('should provide role checking functionality', async () => {
    const { authService } = require('@/lib/api')
    const mockUser = {
      id: 1,
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
    }

    localStorage.setItem('access_token', 'test-token')
    authService.getCurrentUser.mockResolvedValueOnce(mockUser)

    const TestComponent = () => {
      const { user } = React.useContext(AuthContext)
      return <div>{user?.role}</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument()
    })
  })
})