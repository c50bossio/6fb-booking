'use client'

import { useState, useEffect } from 'react'
import { CTAButton, CTAGroup } from './CTASystem'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

/**
 * Authentication-Aware Header CTAs
 * Shows login/register for guests, logout for authenticated users
 */
export function AuthHeaderCTAs({ className = '' }: { className?: string }) {
  const { isAuthenticated, isLoading, logout } = useAuth()
  const router = useRouter()

  // Handle logout functionality
  const handleLogout = async () => {
    try {
      await logout()
      // Redirect to homepage after logout (handled by useAuth)
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  // Show enhanced loading state with better UX
  if (isLoading) {
    return (
      <nav role="navigation" aria-label="Account actions" className={`flex items-center space-x-3 ${className}`}>
        <div className="h-9 w-16 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
        <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
        <span className="sr-only">Loading authentication state...</span>
      </nav>
    )
  }

  // Show different CTAs based on authentication state
  if (isAuthenticated) {
    // Authenticated users see logout button
    return (
      <nav role="navigation" aria-label="Account actions" className={`flex items-center space-x-3 ${className}`}>
        <CTAButton ctaId="logout" size="md" showIcon={true} onLogout={handleLogout} />
      </nav>
    )
  } else {
    // Unauthenticated users see login/register
    return (
      <nav role="navigation" aria-label="Account actions" className={`flex items-center space-x-3 ${className}`}>
        <CTAButton ctaId="login" size="md" showIcon={false} />
        <CTAButton ctaId="register" size="md" showIcon={true} />
      </nav>
    )
  }
}

/**
 * Authentication-Aware Hero CTAs
 * Shows appropriate content based on authentication state
 */
export function AuthHeroCTAs({ className = '' }: { className?: string }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  const [maxLoadingReached, setMaxLoadingReached] = useState(false)

  // Failsafe: If loading takes too long, show register button anyway
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        console.warn('Auth check taking too long, showing register button as fallback')
        setMaxLoadingReached(true)
      }, 3000) // 3 second max loading time

      return () => clearTimeout(timeout)
    } else {
      setMaxLoadingReached(false)
    }
  }, [isLoading])

  // Show enhanced loading state (but only for 3 seconds max)
  if (isLoading && !maxLoadingReached) {
    return (
      <div className={`flex justify-center ${className}`}>
        <div className="h-12 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
        <span className="sr-only">Loading authentication state...</span>
      </div>
    )
  }

  // Show different CTAs based on authentication state
  if (isAuthenticated && user) {
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
    // Unauthenticated users see the regular register button
    return (
      <div className={`flex justify-center ${className}`}>
        <CTAButton ctaId="register" size="xl" showIcon={true} />
      </div>
    )
  }
}