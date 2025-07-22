'use client'

import React, { useState, useEffect, Suspense, lazy } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getProfile, type User } from '@/lib/api'
import { handleAuthError, isProtectedRoute } from '@/lib/auth-error-handler'
import { ThemeProvider } from '@/lib/theme-provider'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { navigationItems } from '@/lib/navigation'
import { useKeyboardShortcuts, createNavigationShortcuts } from '@/hooks/useKeyboardShortcuts'

// Lazy load heavy components to reduce initial bundle size
const Sidebar = lazy(() => import('./Sidebar').then(m => ({ default: m.Sidebar })))
const MobileNavigation = lazy(() => import('./MobileNavigation').then(m => ({ default: m.MobileNavigation })))
const Header = lazy(() => import('./Header').then(m => ({ default: m.Header })))
const Footer = lazy(() => import('./Footer'))
const TestDataIndicator = lazy(() => import('@/components/TestDataIndicator'))
const SessionTimeoutWarning = lazy(() => import('@/components/auth/SessionTimeoutWarning'))
const CommandPalette = lazy(() => import('@/components/navigation/CommandPalette'))

// Conditionally load desktop interactions only on desktop
const useGlobalDesktopShortcuts = lazy(() => import('@/hooks/useDesktopInteractions').then(m => ({ default: m.useGlobalDesktopShortcuts })))

// Minimal loading skeleton for layout components
const LayoutSkeleton = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-dark-surface-100 animate-pulse">
    <div className="h-16 bg-gray-200 dark:bg-gray-700"></div>
    <div className="flex">
      <div className="w-64 h-screen bg-gray-200 dark:bg-gray-700 hidden lg:block"></div>
      <div className="flex-1 p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    </div>
  </div>
)

interface AppLayoutProps {
  children: React.ReactNode
}

// Hydration-safe responsive hook
function useIsClient() {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  return isClient
}

// Enhanced mobile detection with better device support
function useMobile() {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const isClient = useIsClient()
  
  useEffect(() => {
    if (!isClient) return
    
    const checkDevice = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      // Enhanced mobile detection
      setIsMobile(width <= 768)
      setIsTablet(width > 768 && width <= 1024)
      
      // Landscape mode optimization for tablets
      if (width > height && width <= 1024) {
        setIsMobile(false)
        setIsTablet(true)
      }
    }
    
    checkDevice()
    window.addEventListener('resize', checkDevice)
    window.addEventListener('orientationchange', checkDevice)
    
    return () => {
      window.removeEventListener('resize', checkDevice)
      window.removeEventListener('orientationchange', checkDevice)
    }
  }, [isClient])
  
  return { isMobile: isClient ? isMobile : false, isTablet: isClient ? isTablet : false, isClient }
}

export function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isMobile, isTablet, isClient } = useMobile()

  // Define public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register', '/check-email', '/verify-email', '/forgot-password', '/reset-password', '/terms', '/privacy', '/cookies', '/agents', '/book']
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/reset-password/') || pathname.startsWith('/agents/') || pathname.startsWith('/verify-email/') || pathname.startsWith('/book/')

  const [user, setUser] = useState<User | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [loading, setLoading] = useState(!isPublicRoute)
  const [error, setError] = useState<string | null>(null)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // Simplified auth loading - hydration safe
  useEffect(() => {
    const loadUser = async () => {
      const routeIsProtected = isProtectedRoute(pathname)
      
      if (!routeIsProtected) {
        setLoading(false)
        return
      }

      try {
        const userData = await getProfile()
        setUser(userData)
        setError(null)
      } catch (err: any) {
        console.log('AppLayout: Auth failed for protected route:', pathname)
        setUser(null)
        setError('Authentication required')
        
        // Use centralized auth error handling
        handleAuthError(err, router, { 
          clearTokens: true, 
          redirectToLogin: routeIsProtected,
          skipPublicRoutes: false 
        })
      } finally {
        setLoading(false)
      }
    }

    // Only run if client-side to prevent hydration issues
    if (isClient) {
      loadUser()
    }
  }, [pathname, isClient, router])

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isClient && isMobile) {
      setSidebarCollapsed(true)
    }
  }, [isClient, isMobile])

  // Enhanced keyboard shortcuts with desktop interactions
  const shortcuts = createNavigationShortcuts(
    () => setCommandPaletteOpen(true),
    (path: string) => router.push(path),
    {
      toggleSidebar: () => setSidebarCollapsed(!sidebarCollapsed),
      openQuickCreate: () => {
        // This would open a quick create modal or navigate to new booking
        router.push('/book')
      },
      openNotifications: () => {
        // This would open notifications panel
        console.log('Open notifications')
      },
      openBookingLinks: () => {
        // This would open booking links modal for barbers/admins
        if (user && (user.role === 'barber' || user.role === 'admin')) {
          console.log('Open booking links')
        }
      }
    }
  )
  const keyboardShortcuts = useKeyboardShortcuts(shortcuts, isClient && !isPublicRoute)
  
  // Conditionally load desktop shortcuts only on desktop
  useEffect(() => {
    if (isClient && !isMobile) {
      import('@/hooks/useDesktopInteractions').then(({ useGlobalDesktopShortcuts }) => {
        useGlobalDesktopShortcuts()
      })
    }
  }, [isClient, isMobile])

  // Generate breadcrumbs based on current path
  const getBreadcrumbs = () => {
    if (!pathname || pathname === '/' || pathname === '/dashboard' || pathname.includes('/login')) {
      return []
    }

    const paths = pathname.split('/').filter(Boolean)
    const breadcrumbs = [{ label: 'Dashboard', href: '/dashboard' }]

    
    // Find matching navigation items for better labels
    const findNavItem = (href: string) => {
      for (const item of navigationItems) {
        if (item.href === href) return item
        if (item.children) {
          for (const child of item.children) {
            if (child.href === href) return child
          }
        }
      }
      return null
    }

    let currentPath = ''
    paths.forEach((path, index) => {
      currentPath += `/${path}`
      const navItem = findNavItem(currentPath)
      
      const label = navItem?.name || path
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

  // Standardized error display component
  const ErrorDisplay = ({ error }: { error: string }) => (
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
  )

  // Loading display component
  const LoadingDisplay = () => (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-surface-100 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-gray-800 dark:text-gray-200 text-sm">Loading...</p>
      </div>
    </div>
  )

  // Main content with error boundary
  const MainContent = ({ children, error, className = "" }: { children: React.ReactNode, error: string | null, className?: string }) => (
    <main className={`flex-1 ${className}`}>
      {error && !isPublicRoute ? (
        <ErrorDisplay error={error} />
      ) : (
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      )}
    </main>
  )

  // Early return for loading state
  if (loading && !isPublicRoute) {
    return (
      <ThemeProvider defaultTheme="system" storageKey="6fb-theme">
        <LoadingDisplay />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="6fb-theme">
      <div className="min-h-screen bg-gray-50 dark:bg-dark-surface-100 transition-colors duration-200">
        
        {/* Public Route Layout */}
        {isPublicRoute ? (
          <div className="min-h-screen flex flex-col">
            <div className="flex-1">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
            {/* Show footer on legal pages */}
            {(pathname === '/terms' || pathname === '/privacy' || pathname === '/cookies') && (
              <Suspense fallback={<div className="h-16 bg-gray-200 dark:bg-gray-700 animate-pulse"></div>}>
                <Footer variant="minimal" />
              </Suspense>
            )}
          </div>
        ) : (
          /* Protected Route Layout */
          <>
            {/* Mobile Layout */}
            {isClient && isMobile ? (
              <Suspense fallback={<LayoutSkeleton />}>
                <div className="flex flex-col min-h-screen">
                  <Suspense fallback={<div className="h-16 bg-gray-200 dark:bg-gray-700 animate-pulse"></div>}>
                    <Header
                      user={user}
                      breadcrumbs={getBreadcrumbs()}
                      onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                      showMenuToggle={true}
                      onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                    />
                  </Suspense>
                  <MainContent error={error} className="pb-20">
                    {children}
                  </MainContent>
                  <Suspense fallback={<div className="h-16 bg-gray-200 dark:bg-gray-700 animate-pulse fixed bottom-0 left-0 right-0"></div>}>
                    <MobileNavigation user={user} />
                  </Suspense>
                </div>
              </Suspense>
            ) : (
              /* Desktop Layout (including SSR) - Enhanced Sticky Navigation */
              <Suspense fallback={<LayoutSkeleton />}>
                <div className="flex min-h-screen relative">
                  <Suspense fallback={<div className="w-64 bg-gray-200 dark:bg-gray-700 animate-pulse"></div>}>
                    <Sidebar
                      user={user}
                      collapsed={sidebarCollapsed}
                      onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                    />
                  </Suspense>
                  <div className="flex-1 flex flex-col min-w-0">
                    <Suspense fallback={<div className="h-16 bg-gray-200 dark:bg-gray-700 animate-pulse"></div>}>
                      <Header
                        user={user}
                        breadcrumbs={getBreadcrumbs()}
                        onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                        showMenuToggle={false}
                        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                      />
                    </Suspense>
                    <MainContent error={error} className="flex-1 overflow-auto">
                      {children}
                    </MainContent>
                  </div>
                </div>
              </Suspense>
            )}
          </>
        )}
        
        {/* Global Components - Only show for authenticated users on protected routes */}
        {!isPublicRoute && user && (
          <>
            <Suspense fallback={null}>
              <TestDataIndicator />
            </Suspense>
            <Suspense fallback={null}>
              <SessionTimeoutWarning 
                sessionDurationMinutes={30}
                warningMinutesBeforeTimeout={5}
                enabled={true}
              />
            </Suspense>
            <Suspense fallback={null}>
              <CommandPalette 
                isOpen={commandPaletteOpen}
                onClose={() => setCommandPaletteOpen(false)}
                user={user}
              />
            </Suspense>
          </>
        )}
      </div>
    </ThemeProvider>
  )
}