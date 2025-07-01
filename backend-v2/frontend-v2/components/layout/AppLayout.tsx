'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getProfile, type User } from '@/lib/api'
import { ThemeProvider } from '@/lib/theme-provider'
import { Sidebar } from './Sidebar'
import { MobileNavigation } from './MobileNavigation'
import { Header } from './Header'
import { useResponsive } from '@/hooks/useResponsive'
import { ErrorBoundary } from '@/components/ErrorBoundary'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [user, setUser] = useState<User | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  
  const router = useRouter()
  const pathname = usePathname()
  const { isMobile } = useResponsive()

  // Define public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password']
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/reset-password/')

  // Define role-based route protection
  const checkRoutePermission = (pathname: string, user: User | null) => {
    if (isPublicRoute) return { allowed: true }
    if (!user) return { allowed: false, redirectTo: '/login' }

    const userRole = user.role || 'user'
    
    // Admin-only routes
    if (pathname.startsWith('/admin')) {
      if (userRole !== 'admin' && userRole !== 'super_admin') {
        return { allowed: false, redirectTo: '/dashboard' }
      }
    }
    
    // Barber/Admin routes (analytics now integrated into dashboard)
    const staffRoutes = ['/clients', '/notifications', '/payouts', '/barber-availability', '/barber', '/import', '/export', '/sms']
    if (staffRoutes.some(route => pathname.startsWith(route))) {
      if (!['barber', 'admin', 'super_admin'].includes(userRole)) {
        return { allowed: false, redirectTo: '/dashboard' }
      }
    }

    return { allowed: true }
  }

  // Set mounted state
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load user profile and check route permissions
  useEffect(() => {
    const loadUserProfile = async () => {
      // Skip loading user profile on public routes
      if (isPublicRoute) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        console.log('AppLayout: Fetching user profile...')
        const userData = await getProfile()
        console.log('AppLayout: User data received:', userData)
        setUser(userData)
        setError(null)
        
        // Check route permission after user is loaded
        const permission = checkRoutePermission(pathname, userData)
        if (!permission.allowed && permission.redirectTo) {
          console.log(`Access denied to ${pathname}, redirecting to ${permission.redirectTo}`)
          router.replace(permission.redirectTo)
        }
      } catch (err: any) {
        console.error('AppLayout: Failed to load user profile:', err)
        console.log('AppLayout: Error details:', err.response?.status, err.message)
        
        // Only show error for actual network errors, not authentication errors
        if (err.response?.status === 401 || err.response?.status === 403) {
          console.log('AppLayout: Auth error detected, isPublicRoute:', isPublicRoute)
          // User is not authenticated, redirect to login for protected routes
          setUser(null)
          setError(null)
          if (!isPublicRoute) {
            console.log('AppLayout: Redirecting to login')
            router.replace('/login')
          }
        } else {
          // Show error only for actual network/server errors
          setError('Unable to connect to server. Please try again later.')
        }
      } finally {
        setLoading(false)
      }
    }

    loadUserProfile()
  }, [isPublicRoute, pathname, router])

  // Check permissions when pathname changes
  useEffect(() => {
    if (!loading && user) {
      const permission = checkRoutePermission(pathname, user)
      if (!permission.allowed && permission.redirectTo) {
        console.log(`Access denied to ${pathname}, redirecting to ${permission.redirectTo}`)
        router.replace(permission.redirectTo)
      }
    }
  }, [pathname, user, loading, router])

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (mounted && isMobile) {
      setSidebarCollapsed(true)
    }
  }, [mounted, isMobile])

  // Get breadcrumbs from pathname
  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs = [{ label: 'Home', href: '/dashboard' }]
    
    let currentPath = ''
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      
      breadcrumbs.push({
        label,
        href: currentPath
      })
    })
    
    return breadcrumbs
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-surface-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-gray-800 dark:text-gray-200 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="6fb-theme">
      <div className="min-h-screen bg-gray-50 dark:bg-dark-surface-100 transition-colors duration-200">
        {/* Desktop Layout */}
        {mounted && !isMobile && !isPublicRoute && (
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <Sidebar
              user={user}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <Header
                user={user}
                breadcrumbs={getBreadcrumbs()}
                onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                showMenuToggle={isMobile}
              />
              
              {/* Page Content */}
              <main className="flex-1 overflow-auto">
                <div className="h-full">
                  {error && !isPublicRoute ? (
                    <div className="p-6">
                      <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-ios-lg p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-warning-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-warning-800 dark:text-warning-200">
                              Connection Issue
                            </h3>
                            <div className="mt-2 text-sm text-warning-700 dark:text-warning-300">
                              <p>{error}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ErrorBoundary>
                      {children}
                    </ErrorBoundary>
                  )}
                </div>
              </main>
            </div>
          </div>
        )}

        {/* Mobile Layout */}
        {mounted && isMobile && !isPublicRoute && (
          <div className="flex flex-col h-screen">
            {/* Header */}
            <Header
              user={user}
              breadcrumbs={getBreadcrumbs()}
              onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
              showMenuToggle={true}
            />
            
            {/* Page Content */}
            <main className="flex-1 overflow-auto pb-20">
              {error && !isPublicRoute ? (
                <div className="p-4">
                  <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-ios-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-warning-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-warning-800 dark:text-warning-200">
                          Connection Issue
                        </h3>
                        <div className="mt-2 text-sm text-warning-700 dark:text-warning-300">
                          <p>{error}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                children
              )}
            </main>
            
            {/* Mobile Navigation */}
            <MobileNavigation user={user} />
          </div>
        )}

        {/* Default layout during SSR/initial load - shows desktop layout */}
        {!mounted && !isPublicRoute && (
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <Sidebar
              user={user}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <Header
                user={user}
                breadcrumbs={getBreadcrumbs()}
                onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                showMenuToggle={false}
              />
              
              {/* Page Content */}
              <main className="flex-1 overflow-auto">
                <div className="h-full">
                  {error && !isPublicRoute ? (
                    <div className="p-6">
                      <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-ios-lg p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-warning-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-warning-800 dark:text-warning-200">
                              Connection Issue
                            </h3>
                            <div className="mt-2 text-sm text-warning-700 dark:text-warning-300">
                              <p>{error}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ErrorBoundary>
                      {children}
                    </ErrorBoundary>
                  )}
                </div>
              </main>
            </div>
          </div>
        )}

        {/* Public Route Layout - Simple layout for login, register, etc. */}
        {isPublicRoute && (
          <div className="min-h-screen">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        )}
      </div>
    </ThemeProvider>
  )
}