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
            <main className={`${className || ''}`}>
              {children}
            </main>
          </div>
        )}
      </Suspense>
    </ErrorBoundary>
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
