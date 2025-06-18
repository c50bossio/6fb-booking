import { authService } from '@/lib/api'

// Mock the API client
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  }
}))

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
  })

  describe('login', () => {
    it('should login successfully and store tokens', async () => {
      const mockResponse = {
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          token_type: 'bearer',
          user: {
            id: 1,
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
            role: 'barber',
          }
        }
      }

      const { apiClient } = require('@/lib/api/client')
      apiClient.post.mockResolvedValueOnce(mockResponse)

      const result = await authService.login({
        username: 'test@example.com',
        password: 'password123'
      })

      expect(apiClient.post).toHaveBeenCalledWith('/auth/token', expect.any(FormData))
      expect(localStorage.getItem('access_token')).toBe('test-access-token')
      expect(localStorage.getItem('refresh_token')).toBe('test-refresh-token')
      expect(localStorage.getItem('user')).toBe(JSON.stringify(mockResponse.data.user))
      expect(result).toEqual(mockResponse.data)
    })

    it('should handle login failure', async () => {
      const { apiClient } = require('@/lib/api/client')
      apiClient.post.mockRejectedValueOnce(new Error('Invalid credentials'))

      await expect(authService.login({
        username: 'test@example.com',
        password: 'wrong-password'
      })).rejects.toThrow('Invalid credentials')

      expect(localStorage.getItem('access_token')).toBeNull()
    })
  })

  describe('logout', () => {
    it('should clear all stored data on logout', () => {
      localStorage.setItem('access_token', 'test-token')
      localStorage.setItem('refresh_token', 'test-refresh')
      localStorage.setItem('user', JSON.stringify({ id: 1 }))

      authService.logout()

      expect(localStorage.getItem('access_token')).toBeNull()
      expect(localStorage.getItem('refresh_token')).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
    })
  })

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'barber',
      }

      const { apiClient } = require('@/lib/api/client')
      apiClient.get.mockResolvedValueOnce({ data: mockUser })

      const result = await authService.getCurrentUser()

      expect(apiClient.get).toHaveBeenCalledWith('/auth/me')
      expect(result).toEqual(mockUser)
    })
  })

  describe('isAuthenticated', () => {
    it('should return true when access token exists', () => {
      localStorage.setItem('access_token', 'test-token')
      expect(authService.isAuthenticated()).toBe(true)
    })

    it('should return false when no access token', () => {
      expect(authService.isAuthenticated()).toBe(false)
    })
  })

  describe('getStoredUser', () => {
    it('should return stored user', () => {
      const user = { id: 1, email: 'test@example.com' }
      localStorage.setItem('user', JSON.stringify(user))
      
      expect(authService.getStoredUser()).toEqual(user)
    })

    it('should return null when no user stored', () => {
      expect(authService.getStoredUser()).toBeNull()
    })
  })

  describe('hasRole', () => {
    it('should check single role correctly', () => {
      const user = { role: 'admin' }
      localStorage.setItem('user', JSON.stringify(user))

      expect(authService.hasRole('admin')).toBe(true)
      expect(authService.hasRole('barber')).toBe(false)
    })

    it('should check multiple roles correctly', () => {
      const user = { role: 'mentor' }
      localStorage.setItem('user', JSON.stringify(user))

      expect(authService.hasRole(['admin', 'mentor'])).toBe(true)
      expect(authService.hasRole(['admin', 'barber'])).toBe(false)
    })
  })

  describe('hasPermission', () => {
    it('should always return true for super_admin', () => {
      const user = { role: 'super_admin' }
      localStorage.setItem('user', JSON.stringify(user))

      expect(authService.hasPermission('any.permission')).toBe(true)
    })

    it('should check permissions for other roles', () => {
      const user = { role: 'barber', permissions: ['appointments.view', 'appointments.create'] }
      localStorage.setItem('user', JSON.stringify(user))

      expect(authService.hasPermission('appointments.view')).toBe(true)
      expect(authService.hasPermission('users.delete')).toBe(false)
    })
  })
})