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
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
  hasRole: (role: string | string[]) => boolean
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

const PUBLIC_ROUTES = [
  '/login',
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
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient) {
      checkAuth()
    }
  }, [isClient])

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
      // Perform auth migration from localStorage to cookies
      authMigration.migrate()

      // Check if user is authenticated (has user data and CSRF token)
      if (authService.isAuthenticated()) {
        console.log('[AuthProvider] User is authenticated, fetching current user')
        try {
          const currentUser = await authService.getCurrentUser()
          setUser(currentUser)
        } catch (error) {
          console.error('Failed to get current user:', error)
          // Clear user data if fetching fails
          smartStorage.removeItem('user')
        }
      } else {
        // Check if we have stored user data but no CSRF token
        // This might happen after server restart or cookie expiration
        const storedUser = authService.getStoredUser()
        if (storedUser) {
          console.log('[AuthProvider] Found stored user but no valid session')
          smartStorage.removeItem('user')
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Auth check failed:', error)
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ username: email, password })
      setUser(response.user)

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
      throw error
    }
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
    router.push('/login')
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
    isAuthenticated: !!user,
    login,
    logout,
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
