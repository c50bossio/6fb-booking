'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authService } from '@/lib/api/auth'
import type { User } from '@/lib/api/client'
import { smartStorage } from '@/lib/utils/storage'

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
  '/customer', // Customer portal routes
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

// DEMO MODE: Automatically detect based on route or authentication state
const getDemoMode = (): boolean => {
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname
    const search = window.location.search

    // Demo mode on specific demo routes
    if (pathname.includes('/demo') || pathname.includes('/calendar-demo')) {
      return true
    }

    // Demo mode when coming from /app or with demo parameter
    if (pathname === '/app' || search.includes('demo=true')) {
      return true
    }

    // RESTRICTED: Only check sessionStorage demo mode for specific demo routes
    // This prevents demo mode from persisting globally after actual login
    const isDemoRoute = pathname.includes('/demo') || pathname.includes('/calendar-demo') || pathname === '/app'
    if (isDemoRoute) {
      try {
        const isDemoSession = sessionStorage.getItem('demo_mode') === 'true'
        if (isDemoSession) {
          console.log('[AuthProvider] Demo mode active from sessionStorage for demo route:', pathname)
          return true
        }
      } catch (e) {
        // SessionStorage blocked
      }
    }

    // Check URL parameters for demo flag
    if (search.includes('demo=true')) {
      console.log('[AuthProvider] Demo mode active from URL parameter for:', pathname)
      return true
    }
  }
  return false
}

// Demo user with full permissions for exploring the app
const DEMO_USER: User = {
  id: 1,
  email: 'demo@6fb.com',
  username: 'demo@6fb.com',
  first_name: 'Demo',
  last_name: 'User',
  full_name: 'Demo User',
  role: 'super_admin',
  is_active: true,
  is_verified: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  permissions: [
    'view_all',
    'edit_all',
    'delete_all',
    'manage_barbers',
    'manage_appointments',
    'manage_clients',
    'manage_payments',
    'manage_locations',
    'view_analytics',
    'manage_settings',
    'view_calendar',
    'create_appointments',
    'edit_appointments',
    'delete_appointments',
    'view_revenue',
    'manage_compensation',
    'access_booking',
    'access_dashboard',
    'access_payments'
  ],
  phone_number: '+1234567890',
  profile_image_url: null,
  location_id: 1,
  barber_id: 1
}

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
      // Ensure demo mode persists across navigation
      const currentDemoMode = getDemoMode()
      if (currentDemoMode) {
        try {
          sessionStorage.setItem('demo_mode', 'true')
        } catch (e) {
          console.log('Cannot set sessionStorage')
        }
      }
      checkAuth()
    }
  }, [isClient])

  useEffect(() => {
    // Re-check demo mode on pathname changes
    if (isClient) {
      const currentDemoMode = getDemoMode()
      if (currentDemoMode && !user) {
        console.log('[AuthProvider] Pathname changed, re-setting demo user for:', pathname)
        setUser(DEMO_USER)
        setLoading(false)
        return
      }
    }
  }, [pathname, isClient])

  useEffect(() => {
    // Skip redirection in demo mode or during SSR
    if (getDemoMode() || !isClient) return

    // CRITICAL: Never redirect from the landing page
    if (pathname === '/' || window.location.pathname === '/') {
      console.log('[AuthProvider] On landing page, skipping auth redirect')
      return
    }

    // Add extra safety: only redirect after a small delay to ensure hydration is complete
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

      // Debug logging for Railway deployment
      console.log('[AuthProvider] Route check:', {
        pathname: currentPath,
        isPublicRoute,
        loading,
        hasUser: !!user,
        windowPathname: window.location.pathname,
        publicRoutes: PUBLIC_ROUTES
      })

      // Extra safety: check if we're still on the same pathname
      // Only redirect if ALL conditions are met
      if (!loading && !user && !isPublicRoute && window.location.pathname === currentPath) {
        console.log('[AuthProvider] Redirecting to login from:', currentPath)
        router.push('/login')
      }
    }, 500) // Increased delay to ensure proper hydration

    return () => clearTimeout(timeoutId)
  }, [user, loading, pathname, router, isClient])

  const checkAuth = async () => {
    try {
      let token = null
      try {
        // Safely access localStorage with error handling for browser extension conflicts
        token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
      } catch (e) {
        console.warn('Unable to access localStorage (possibly blocked by extension):', e)
        // Continue without token - app will work in demo mode
      }

      // If we have a valid access token, prioritize real auth over demo mode
      // This ensures admin logins work even if demo mode sessionStorage exists
      if (token) {
        console.log('[AuthProvider] Found access token, attempting real authentication')
        const currentUser = await authService.getCurrentUser()
        setUser(currentUser)

        // Clear any stray demo mode if real auth succeeds
        try {
          sessionStorage.removeItem('demo_mode')
          console.log('[AuthProvider] Cleared demo mode after successful real auth')
        } catch (e) {
          console.log('Cannot clear sessionStorage')
        }

        setLoading(false)
        return
      }

      // Check for demo mode based on current route (only if no real auth token)
      const currentDemoMode = getDemoMode()

      // In demo mode, automatically set the demo user
      if (currentDemoMode) {
        console.log('[AuthProvider] No access token found, using demo mode')
        setUser(DEMO_USER)
        setLoading(false)
        return
      }

      // No token and no demo mode
      setLoading(false)
    } catch (error) {
      console.error('Auth check failed:', error)
      try {
        // Safely remove token if auth fails
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token')
        }
      } catch (e) {
        console.warn('Unable to clear localStorage:', e)
      }
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      // IMPORTANT: Clear demo mode when performing actual login
      try {
        sessionStorage.removeItem('demo_mode')
        console.log('[AuthProvider] Cleared demo mode for actual login')
      } catch (e) {
        console.log('Cannot clear sessionStorage')
      }

      const response = await authService.login({ username: email, password })
      setUser(response.user)
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const logout = async () => {
    // Clear demo mode on logout
    try {
      sessionStorage.removeItem('demo_mode')
      console.log('[AuthProvider] Cleared demo mode on logout')
    } catch (e) {
      console.log('Cannot clear sessionStorage')
    }

    // In demo mode, just clear the user and redirect
    const currentDemoMode = getDemoMode()
    if (currentDemoMode) {
      setUser(null)
      router.push('/login')
      return
    }

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
