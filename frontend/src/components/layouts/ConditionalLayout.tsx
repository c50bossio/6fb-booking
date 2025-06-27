'use client'

import React, { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { shouldShowSidebar, isDashboardRoute, isPublicRoute } from '@/utils/routeClassification'
import DashboardLayout from './DashboardLayout'
import { ErrorBoundary } from '../ErrorBoundary'

export interface ConditionalLayoutProps {
  children: React.ReactNode
  user?: {
    first_name: string
    last_name: string
    email: string
    role: string
  }
  onLogout?: () => void
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  breadcrumbs?: Array<{
    label: string
    href?: string
  }>
  className?: string
  // Optional props for dashboard layout customization
  dashboardLayoutProps?: {
    title?: string
    subtitle?: string
    actions?: React.ReactNode
    breadcrumbs?: Array<{
      label: string
      href?: string
    }>
    className?: string
  }
}

/**
 * LoadingFallback component for Suspense boundaries
 */
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  )
}

/**
 * ConditionalLayout component that intelligently applies layouts based on route type
 */
export default function ConditionalLayout({
  children,
  user,
  onLogout,
  title,
  subtitle,
  actions,
  breadcrumbs,
  className,
  dashboardLayoutProps = {}
}: ConditionalLayoutProps) {
  const pathname = usePathname()

  // Determine layout type based on route
  const showSidebar = shouldShowSidebar(pathname)
  const isDashboard = isDashboardRoute(pathname)
  const isPublic = isPublicRoute(pathname)

  // Merge dashboard layout props with default props
  const finalDashboardProps = {
    title: dashboardLayoutProps.title || title,
    subtitle: dashboardLayoutProps.subtitle || subtitle,
    actions: dashboardLayoutProps.actions || actions,
    breadcrumbs: dashboardLayoutProps.breadcrumbs || breadcrumbs,
    className: dashboardLayoutProps.className || className
  }

  // Debug information (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('ConditionalLayout:', {
      pathname,
      isDashboard,
      isPublic,
      showSidebar,
      routeType: isDashboard ? 'dashboard' : isPublic ? 'public' : 'unknown'
    })
  }

  return (
    <ErrorBoundary fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Layout Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Something went wrong with the page layout. Please try refreshing the page.
          </p>
        </div>
      </div>
    }>
      <Suspense fallback={<LoadingFallback />}>
        {showSidebar && isDashboard ? (
          <DashboardLayout
            user={user}
            onLogout={onLogout}
            {...finalDashboardProps}
          >
            {children}
          </DashboardLayout>
        ) : (
          // Public route or unknown route - render children without dashboard layout
          <div className="min-h-screen">
            {isPublic && (
              <PublicHeader
                title={title}
                actions={actions}
              />
            )}
            <main className={`${className || ''} ${isPublic ? 'pt-16' : ''}`}>
              {children}
            </main>
          </div>
        )}
      </Suspense>
    </ErrorBoundary>
  )
}

/**
 * Simple public header for public routes
 */
function PublicHeader({
  title,
  actions
}: {
  title?: string
  actions?: React.ReactNode
}) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title || 'BookBarber'}
            </h1>
          </div>
          {actions && (
            <div className="flex items-center space-x-4">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

/**
 * Hook for components that need to know about the current layout context
 */
export function useLayoutContext() {
  const pathname = usePathname()

  return {
    pathname,
    isDashboard: isDashboardRoute(pathname),
    isPublic: isPublicRoute(pathname),
    shouldShowSidebar: shouldShowSidebar(pathname),
    routeType: isDashboardRoute(pathname) ? 'dashboard' : isPublicRoute(pathname) ? 'public' : 'unknown'
  }
}

/**
 * Higher-order component for automatic layout detection
 */
export function withConditionalLayout<P extends object>(
  Component: React.ComponentType<P>,
  layoutProps?: Partial<ConditionalLayoutProps>
) {
  return function WrappedComponent(props: P) {
    return (
      <ConditionalLayout {...layoutProps}>
        <Component {...props} />
      </ConditionalLayout>
    )
  }
}
