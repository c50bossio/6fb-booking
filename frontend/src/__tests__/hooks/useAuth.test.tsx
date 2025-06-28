import { renderHook, act } from '@testing-library/react'
import { useAuth } from '@/hooks/useAuth'
import { AuthProvider } from '@/components/AuthProvider'

// Mock the API module
jest.mock('@/lib/api', () => ({
  authService: {
    login: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
    getStoredUser: jest.fn(),
    isAuthenticated: jest.fn(),
    hasRole: jest.fn(),
    hasPermission: jest.fn(),
  }
}))

describe('useAuth Hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  )

  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
  })

  it('should provide authentication context', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current).toHaveProperty('user')
    expect(result.current).toHaveProperty('isLoading')
    expect(result.current).toHaveProperty('isAuthenticated')
    expect(result.current).toHaveProperty('login')
    expect(result.current).toHaveProperty('logout')
    expect(result.current).toHaveProperty('hasRole')
    expect(result.current).toHaveProperty('hasPermission')
  })

  it('should start with no user and not authenticated', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle login', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'barber',
      is_active: true,
    }

    const { authService } = require('@/lib/api')
    authService.login.mockResolvedValueOnce({
      access_token: 'test-token',
      user: mockUser,
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.login('test@example.com', 'password123')
    })

    expect(authService.login).toHaveBeenCalledWith({
      username: 'test@example.com',
      password: 'password123',
    })
    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('should handle logout', async () => {
    const { authService } = require('@/lib/api')

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.logout()
    })

    expect(authService.logout).toHaveBeenCalled()
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should check user roles correctly', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    // Without user
    expect(result.current.hasRole('admin')).toBe(false)
    expect(result.current.hasRole(['admin', 'barber'])).toBe(false)
  })

  it('should check permissions correctly', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    // Without user
    expect(result.current.hasPermission('users.create')).toBe(false)
  })
})
