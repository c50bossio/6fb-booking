/**
 * Authentication Hook for BookedBarber V2
 * Provides authentication state and actions throughout the app
 */

'use client'

import React, { useState, useEffect, useContext, createContext, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { authService, User, AuthState } from '@/lib/auth'

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (userData: {
    email: string
    password: string
    firstName: string
    lastName: string
    role?: 'barber' | 'shop_owner'
  }) => Promise<void>
  logout: () => void
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, newPassword: string) => Promise<void>
  error: string | null
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false
  })
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = () => {
      const user = authService.getCurrentUser()
      const isAuthenticated = authService.isAuthenticated()
      
      setAuthState({
        user,
        isLoading: false,
        isAuthenticated
      })
    }

    initializeAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setError(null)
      setAuthState(prev => ({ ...prev, isLoading: true }))
      
      const user = await authService.login(email, password)
      
      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true
      })
      
      // Redirect to dashboard after successful login
      router.push('/dashboard/welcome')
    } catch (err: any) {
      setError(err.message || 'Login failed')
      setAuthState(prev => ({ ...prev, isLoading: false }))
      throw err
    }
  }

  const register = async (userData: {
    email: string
    password: string
    firstName: string
    lastName: string
    role?: 'barber' | 'shop_owner'
  }) => {
    try {
      setError(null)
      setAuthState(prev => ({ ...prev, isLoading: true }))
      
      const user = await authService.register(userData)
      
      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true
      })
      
      // Redirect to dashboard after successful registration
      router.push('/dashboard/welcome')
    } catch (err: any) {
      setError(err.message || 'Registration failed')
      setAuthState(prev => ({ ...prev, isLoading: false }))
      throw err
    }
  }

  const logout = () => {
    authService.logout()
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false
    })
    setError(null)
    router.push('/')
  }

  const forgotPassword = async (email: string) => {
    try {
      setError(null)
      await authService.forgotPassword(email)
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email')
      throw err
    }
  }

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      setError(null)
      await authService.resetPassword(token, newPassword)
    } catch (err: any) {
      setError(err.message || 'Password reset failed')
      throw err
    }
  }

  const clearError = () => {
    setError(null)
  }

  const value: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    error,
    clearError
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook for checking if user is authenticated (can be used in server components)
export function useRequireAuth() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  return { user, isLoading, isAuthenticated }
}