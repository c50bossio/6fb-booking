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
import { TestDataIndicator } from '@/components/TestDataIndicator'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isMobile } = useResponsive()

  // Define public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password']
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/reset-password/')

  const [user, setUser] = useState<User | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loading, setLoading] = useState(!isPublicRoute) // Start without loading for public routes
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Simplified route protection - removed complex role checking

  // Set mounted state
  useEffect(() => {
    setMounted(true)
  }, [])

  // Simplified auth - only load user once, no complex route checking
  useEffect(() => {
    const loadUser = async () => {
      if (isPublicRoute) {
        setLoading(false)
        return
      }

      try {
        const userData = await getProfile()
        setUser(userData)
        setError(null)
      } catch (err: any) {
        // If auth fails, provide fallback user state for sidebar
        setUser({ id: 0, email: 'guest', role: 'user', name: 'Guest' } as User)
        setError(null)
        
        // Only redirect to login on 401/403 for protected routes
        if ((err.response?.status === 401 || err.response?.status === 403) && !isPublicRoute) {
          router.replace('/login')
        }
      } finally {
        setLoading(false)
      }
    }

    // Only run if mounted to prevent hydration issues
    if (mounted) {
      loadUser()
    }
  }, [isPublicRoute, router, mounted])

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (mounted && isMobile) {
      setSidebarCollapsed(true)
    }
  }, [mounted, isMobile])

  // Simple breadcrumb function
  const getBreadcrumbs = () => {
    // Return empty array for now - breadcrumbs are optional
    return []
  }

  if (loading) {
    return (
      <div 
        className="min-h-screen bg-gray-50 dark:bg-dark-surface-100 flex items-center justify-center"
        suppressHydrationWarning
      >
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
                breadcrumbs={[]}
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
        
        {/* Test Data Indicator - Shows when test data is active */}
        {!isPublicRoute && user && <TestDataIndicator />}
      </div>
    </ThemeProvider>
  )
}