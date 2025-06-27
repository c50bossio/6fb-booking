'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authService } from '@/lib/api/auth'
import type { User } from '@/lib/api/client'
import { smartStorage } from '@/lib/utils/storage'
import { authMigration } from '@/lib/utils/auth-migration'
import { debugAuthState, debugRedirect } from '@/lib/utils/auth-debug'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isDemoMode: boolean
  authError: string | null
  backendAvailable: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  enableDemoMode: (reason?: string) => void
  disableDemoMode: () => void
  clearAuthError: () => void
  hasPermission: (permission: string) => boolean
  hasRole: (role: string | string[]) => boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/register',
  '/emergency-login',
  '/simple-login',
  '/', // Landing page
  '/book', // Public booking pages
  '/demo', // Demo calendar pages
  '/booking-demo',
  '/calendar-demo',
  '/simple-calendar-demo',
  '/enhanced-calendar-demo',
  '/demo-google-calendar',
  '/contact',
  '/about',
  '/privacy',
  '/terms',
  '/security',
  '/test-public', // Test page for debugging
  '/landing' // Server-rendered landing page
]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [backendAvailable, setBackendAvailable] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    setIsClient(true)

    // Check if demo mode was previously enabled
    if (typeof window !== 'undefined') {
      const demoMode = sessionStorage.getItem('demo_mode') === 'true'
      setIsDemoMode(demoMode)
      if (demoMode) {
        setAuthError(null) // Clear errors in demo mode
      }
    }
  }, [])

  useEffect(() => {
    if (isClient) {
      checkAuth()
      setupEventListeners()
    }
  }, [isClient])

  // Setup event listeners for API error handling
  const setupEventListeners = () => {
    if (typeof window === 'undefined') return

    const handleAuthError = (event: CustomEvent) => {
      console.log('Auth error event received:', event.detail)
      setAuthError(event.detail.message)
      setUser(null)
      smartStorage.removeItem('user')
    }

    const handleBackendUnavailable = (event: CustomEvent) => {
      console.log('Backend unavailable event received:', event.detail)
      setBackendAvailable(false)
      setIsDemoMode(true)
      setAuthError('Backend service is unavailable. You are now in demo mode.')
      sessionStorage.setItem('demo_mode', 'true')
    }

    const handleServerError = (event: CustomEvent) => {
      console.log('Server error event received:', event.detail)
      setAuthError(`Server error: ${event.detail.message}`)
    }

    const handleDemoModeEnabled = (event: CustomEvent) => {
      console.log('Demo mode enabled event received:', event.detail)
      setIsDemoMode(true)
      setUser(null)
      setAuthError(event.detail.reason ? `Demo mode: ${event.detail.reason}` : 'Demo mode enabled')
    }

    window.addEventListener('auth-error', handleAuthError as EventListener)
    window.addEventListener('backend-unavailable', handleBackendUnavailable as EventListener)
    window.addEventListener('server-error', handleServerError as EventListener)
    window.addEventListener('demo-mode-enabled', handleDemoModeEnabled as EventListener)

    return () => {
      window.removeEventListener('auth-error', handleAuthError as EventListener)
      window.removeEventListener('backend-unavailable', handleBackendUnavailable as EventListener)
      window.removeEventListener('server-error', handleServerError as EventListener)
      window.removeEventListener('demo-mode-enabled', handleDemoModeEnabled as EventListener)
    }
  }

  useEffect(() => {
    // Skip redirection during SSR
    if (!isClient) return

    // CRITICAL: Never redirect from the landing page
    if (pathname === '/' || window.location.pathname === '/') {
      console.log('[AuthProvider] On landing page, skipping auth redirect')
      return
    }

    // CRITICAL: Skip customer routes - let CustomerAuthProvider handle them
    if (pathname?.startsWith('/customer')) {
      console.log('[AuthProvider] On customer route, skipping auth redirect:', pathname)
      return
    }

    // Add stability check to prevent redirect loops
    const timeoutId = setTimeout(() => {
      // Get the current pathname, with fallback
      const currentPath = pathname || window.location.pathname || '/'

      // Double-check we're not on the landing page
      if (currentPath === '/') {
        console.log('[AuthProvider] Detected landing page in timeout, skipping redirect')
        return
      }

      // Redirect to login if not authenticated and not on a public route
      const isPublicRoute = PUBLIC_ROUTES.some(route => {
        // Exact match
        if (currentPath === route) return true
        // Prefix match with trailing slash
        if (currentPath.startsWith(route + '/')) return true
        return false
      })

      // Debug logging for deployment
      console.log('[AuthProvider] Route check:', {
        pathname: currentPath,
        isPublicRoute,
        loading,
        hasUser: !!user,
        windowPathname: window.location.pathname,
        publicRoutes: PUBLIC_ROUTES
      })

      // Enhanced safety: check if we're still on the same pathname AND not in loading state
      // Only redirect if ALL conditions are met and we're not already redirecting
      if (!loading && !user && !isPublicRoute && window.location.pathname === currentPath && !window.location.pathname.includes('/login')) {
        console.log('[AuthProvider] Redirecting to login from:', currentPath)
        debugRedirect('AuthProvider', currentPath, '/login', 'User not authenticated on protected route')

        // Store redirect path for after login
        smartStorage.setItem('redirect_after_login', currentPath)
        router.push('/login')
      }
    }, 1000) // Delay to ensure proper hydration and stability

    return () => clearTimeout(timeoutId)
  }, [user, loading, pathname, router, isClient])

  const checkAuth = async () => {
    try {
      // Check if we're in demo mode first
      const demoMode = sessionStorage.getItem('demo_mode') === 'true'
      if (demoMode) {
        console.log('[AuthProvider] Demo mode active, skipping auth check')
        setIsDemoMode(true)
        setUser(null)
        setLoading(false)
        return
      }

      // Perform auth migration from localStorage to cookies
      authMigration.migrate()

      // Check backend health first
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const healthCheck = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/health`, {
          method: 'GET',
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!healthCheck.ok) {
          throw new Error('Backend health check failed')
        }
        setBackendAvailable(true)
      } catch (healthError) {
        console.warn('[AuthProvider] Backend health check failed:', healthError)
        setBackendAvailable(false)
        // Don't immediately enable demo mode, let user choose
        setAuthError('Backend service appears to be unavailable. Some features may be limited.')
      }

      // Check if user is authenticated (has user data and CSRF token)
      if (authService.isAuthenticated() && backendAvailable) {
        console.log('[AuthProvider] User is authenticated, fetching current user')
        try {
          const currentUser = await authService.getCurrentUser()
          setUser(currentUser)
          setAuthError(null) // Clear any previous errors
        } catch (error: any) {
          console.error('Failed to get current user:', error)

          // Check if it's a network/backend error
          if (!error.response || error.response.status >= 500) {
            setAuthError('Unable to verify authentication. Backend may be unavailable.')
            setBackendAvailable(false)
          } else {
            setAuthError('Authentication expired. Please log in again.')
          }

          // Clear user data if fetching fails
          smartStorage.removeItem('user')
          setUser(null)
        }
      } else {
        // Check if we have stored user data but no CSRF token
        // This might happen after server restart or cookie expiration
        const storedUser = authService.getStoredUser()
        if (storedUser) {
          console.log('[AuthProvider] Found stored user but no valid session')
          smartStorage.removeItem('user')
          setAuthError('Session expired. Please log in again.')
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Auth check failed:', error)
      setAuthError('Authentication check failed. You may continue in demo mode.')
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      setAuthError(null) // Clear previous errors
      const response = await authService.login({ username: email, password })
      setUser(response.user)
      setIsDemoMode(false) // Exit demo mode on successful login
      sessionStorage.removeItem('demo_mode')

      // Check for redirect after login
      const redirectPath = smartStorage.getItem('redirect_after_login')
      if (redirectPath) {
        smartStorage.removeItem('redirect_after_login')
        router.push(redirectPath)
      } else {
        router.push('/dashboard')
      }
    } catch (error: any) {
      console.error('Login failed:', error)

      // Provide helpful error messages
      if (!error.response) {
        setAuthError('Unable to connect to authentication service. Please check your connection or try demo mode.')
        setBackendAvailable(false)
      } else if (error.response.status === 401) {
        setAuthError('Invalid email or password. Please try again.')
      } else if (error.response.status >= 500) {
        setAuthError('Authentication service is temporarily unavailable. Please try again later or use demo mode.')
        setBackendAvailable(false)
      } else {
        setAuthError(error.response?.data?.detail || 'Login failed. Please try again.')
      }

      throw error
    }
  }

  const logout = async () => {
    try {
      if (backendAvailable && !isDemoMode) {
        await authService.logout()
      }
    } catch (error) {
      console.warn('Logout API call failed:', error)
      // Continue with local logout even if API fails
    }

    // Always clear local state
    setUser(null)
    setAuthError(null)
    setIsDemoMode(false)
    sessionStorage.removeItem('demo_mode')
    smartStorage.removeItem('user')
    smartStorage.removeItem('access_token')

    router.push('/login')
  }

  const enableDemoMode = (reason?: string) => {
    console.log('[AuthProvider] Enabling demo mode:', reason)
    setIsDemoMode(true)
    setUser(null)
    setAuthError(reason || 'Demo mode enabled')
    sessionStorage.setItem('demo_mode', 'true')
    if (reason) {
      sessionStorage.setItem('demo_mode_reason', reason)
    }
  }

  const disableDemoMode = () => {
    console.log('[AuthProvider] Disabling demo mode')
    setIsDemoMode(false)
    setAuthError(null)
    sessionStorage.removeItem('demo_mode')
    sessionStorage.removeItem('demo_mode_reason')
    // Trigger auth check
    checkAuth()
  }

  const clearAuthError = () => {
    setAuthError(null)
  }

  const hasRole = (role: string | string[]): boolean => {
    if (!user) return false
    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(user.role)
  }

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    if (user.role === 'super_admin') return true
    return user.permissions?.includes(permission) || false
  }

  const value = {
    user,
    isLoading: loading,
    isAuthenticated: !!user && !isDemoMode,
    isDemoMode,
    authError,
    backendAvailable,
    login,
    logout,
    enableDemoMode,
    disableDemoMode,
    clearAuthError,
    hasPermission,
    hasRole,
  }

  // Debug authentication state changes
  useEffect(() => {
    if (isClient) {
      debugAuthState('AuthProvider', {
        hasUser: !!user,
        isLoading: loading,
        pathname: pathname
      })
    }
  }, [user, loading, pathname, isClient])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
