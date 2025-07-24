'use client'

import { CTAButton, CTAGroup } from './CTASystem'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { ErrorBoundary } from 'react-error-boundary'

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
 */
function StaticHeroCTAs({ className = '' }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <CTAButton ctaId="register" size="xl" showIcon={true} />
    </div>
  )
}

/**
 * Authentication-Aware Header CTAs with Error Boundary
 * Shows login/register for guests, logout for authenticated users
 * Falls back to static CTAs if auth fails
 */
function AuthHeaderCTAsInternal({ className = '' }: { className?: string }) {
  const { isAuthenticated, isLoading, logout, error } = useAuth()
  const router = useRouter()

  // console.log('🔗 AuthHeaderCTAs: Rendering with state - authenticated:', isAuthenticated, 'loading:', isLoading, 'error:', error)

  // Handle logout functionality
  const handleLogout = async () => {
    try {
      // console.log('🔗 AuthHeaderCTAs: User clicked logout button')
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
    // console.log('🔗 AuthHeaderCTAs: Showing loading state')
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
    // console.log('🔗 AuthHeaderCTAs: Showing authenticated user logout button')
    // Authenticated users see logout button
    return (
      <nav role="navigation" aria-label="Account actions" className={`flex items-center space-x-3 ${className}`}>
        <CTAButton ctaId="logout" size="md" showIcon={true} onLogout={handleLogout} />
      </nav>
    )
  } else {
    // console.log('🔗 AuthHeaderCTAs: Showing unauthenticated user login/register buttons')
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

  // console.log('🎯 AuthHeroCTAs: Rendering with state - authenticated:', isAuthenticated, 'loading:', isLoading, 'error:', error, 'user:', user?.name || 'none')

  // If there's an auth error, show static fallback
  if (error) {
    console.warn('🎯 AuthHeroCTAs: Auth error detected, showing static fallback:', error)
    return <StaticHeroCTAs className={className} />
  }

  // Show brief loading state, but fallback quickly
  if (isLoading) {
    // console.log('🎯 AuthHeroCTAs: Showing loading state')
    return (
      <div className={`flex justify-center ${className}`}>
        <div className="h-12 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
        <span className="sr-only">Loading...</span>
      </div>
    )
  }

  // Show different CTAs based on authentication state
  if (isAuthenticated && user) {
    // console.log('🎯 AuthHeroCTAs: Showing authenticated user dashboard link for:', user.name)
    // Authenticated users see personalized message and dashboard link
    return (
      <div className={`text-center ${className}`}>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
          Welcome back, {user.name}!
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Go to Dashboard
        </button>
      </div>
    )
  } else {
    // console.log('🎯 AuthHeroCTAs: Showing unauthenticated user register button')
    // Unauthenticated users see the regular register button
    return (
      <div className={`flex justify-center ${className}`}>
        <CTAButton ctaId="register" size="xl" showIcon={true} />
      </div>
    )
  }
}

export function AuthHeroCTAs({ className = '' }: { className?: string }) {
  return (
    <ErrorBoundary fallback={<StaticHeroCTAs className={className} />}>
      <AuthHeroCTAsInternal className={className} />
    </ErrorBoundary>
  )
}