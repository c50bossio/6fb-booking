'use client'

import { CTAButton, CTAGroup } from './CTASystem'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { ErrorBoundary } from 'react-error-boundary'
import { ChartBarIcon } from '@heroicons/react/24/outline'

/**
 * Static fallback CTAs for header when auth fails
 */
function StaticHeaderCTAs({ className = '' }: { className?: string }) {
  return (
    <nav role="navigation" aria-label="Account actions" className={`flex items-center space-x-3 ${className}`}>
      <CTAButton ctaId="login" size="md" showIcon={false} />
      <CTAButton ctaId="register" size="md" showIcon={true} />
    </nav>
  )
}

/**
 * Static fallback CTAs for hero when auth fails
 * Updated to prevent duplicate "Start Free Trial" buttons
 */
function StaticHeroCTAs({ className = '' }: { className?: string }) {
  // Don't show duplicate register button - it's already in the header
  return null
}

/**
 * Authentication-Aware Header CTAs with Error Boundary
 * Shows login/register for guests, logout for authenticated users
 * Falls back to static CTAs if auth fails
 */
function AuthHeaderCTAsInternal({ className = '' }: { className?: string }) {
  const { isAuthenticated, isLoading, logout, error } = useAuth()
  const router = useRouter()

  console.log('🔗 AuthHeaderCTAs: Rendering with state - authenticated:', isAuthenticated, 'loading:', isLoading, 'error:', error)

  // Handle logout functionality
  const handleLogout = async () => {
    try {
      console.log('🔗 AuthHeaderCTAs: User clicked logout button')
      await logout()
      // Redirect to homepage after logout (handled by useAuth)
    } catch (error) {
      console.error('🔗 AuthHeaderCTAs: Logout failed:', error)
    }
  }

  // If there's an auth error, show static fallback
  if (error) {
    console.warn('🔗 AuthHeaderCTAs: Auth error detected, showing static fallback:', error)
    return <StaticHeaderCTAs className={className} />
  }

  // Show brief loading state, but fallback quickly
  if (isLoading) {
    console.log('🔗 AuthHeaderCTAs: Showing loading state')
    return (
      <nav role="navigation" aria-label="Account actions" className={`flex items-center space-x-3 ${className}`}>
        <div className="h-9 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
        <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
        <span className="sr-only">Loading...</span>
      </nav>
    )
  }

  // Show different CTAs based on authentication state
  if (isAuthenticated) {
    console.log('🔗 AuthHeaderCTAs: Showing authenticated user logout button')
    // Authenticated users see logout button
    return (
      <nav role="navigation" aria-label="Account actions" className={`flex items-center space-x-3 ${className}`}>
        <CTAButton ctaId="logout" size="md" showIcon={true} onLogout={handleLogout} />
      </nav>
    )
  } else {
    console.log('🔗 AuthHeaderCTAs: Showing unauthenticated user login/register buttons')
    // Unauthenticated users see login/register
    return (
      <nav role="navigation" aria-label="Account actions" className={`flex items-center space-x-3 ${className}`}>
        <CTAButton ctaId="login" size="md" showIcon={false} />
        <CTAButton ctaId="register" size="md" showIcon={true} />
      </nav>
    )
  }
}

export function AuthHeaderCTAs({ className = '' }: { className?: string }) {
  return (
    <ErrorBoundary fallback={<StaticHeaderCTAs className={className} />}>
      <AuthHeaderCTAsInternal className={className} />
    </ErrorBoundary>
  )
}

/**
 * Authentication-Aware Hero CTAs with Error Boundary
 * Shows appropriate content based on authentication state
 * Falls back to static CTAs if auth fails
 */
function AuthHeroCTAsInternal({ className = '' }: { className?: string }) {
  const { isAuthenticated, isLoading, user, error } = useAuth()
  const router = useRouter()

  console.log('🎯 AuthHeroCTAs: Rendering with state - authenticated:', isAuthenticated, 'loading:', isLoading, 'error:', error, 'user:', user?.name || 'none')

  // If there's an auth error, show static fallback
  if (error) {
    console.warn('🎯 AuthHeroCTAs: Auth error detected, showing static fallback:', error)
    return <StaticHeroCTAs className={className} />
  }

  // Show brief loading state, but fallback quickly
  if (isLoading) {
    console.log('🎯 AuthHeroCTAs: Showing loading state')
    return (
      <div className={`flex justify-center ${className}`}>
        <div className="h-12 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
        <span className="sr-only">Loading...</span>
      </div>
    )
  }

  // Show different CTAs based on authentication state
  if (isAuthenticated && user) {
    console.log('🎯 AuthHeroCTAs: Showing authenticated user dashboard link for:', user.name)
    // Authenticated users see personalized message and dashboard link with premium styling
    return (
      <section className={`py-12 lg:py-16 relative ${className}`}>
        {/* Premium Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
        
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          {/* Welcome Message */}
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Welcome back, {user.name}!
            </h2>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Ready to manage your business and grow your revenue?
            </p>
          </div>

          {/* Premium Dashboard Button */}
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold text-lg rounded-xl transition-all duration-500 ease-out hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ChartBarIcon className="w-6 h-6 mr-3" />
            Enter Dashboard
          </button>
          
          {/* Subtle separator */}
          <div className="mt-12 mb-8">
            <div className="max-w-md mx-auto">
              <div className="flex items-center">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent" />
                <span className="px-4 text-sm text-slate-500 dark:text-slate-400 font-medium">or explore below</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  } else {
    console.log('🎯 AuthHeroCTAs: Not showing duplicate register button for unauthenticated users (removed to prevent duplicate CTAs)')
    // Unauthenticated users don't need a duplicate register button here
    // The main register CTA is already available in the header navigation
    return null
  }
}

export function AuthHeroCTAs({ className = '' }: { className?: string }) {
  return (
    <ErrorBoundary fallback={<StaticHeroCTAs className={className} />}>
      <AuthHeroCTAsInternal className={className} />
    </ErrorBoundary>
  )
}