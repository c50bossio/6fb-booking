'use client'

import { CTAButton, CTAGroup } from './CTASystem'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

/**
 * Authentication-Aware Header CTAs
 * Shows login/register for guests, logout for authenticated users
 */
export function AuthHeaderCTAs({ className = '' }: { className?: string }) {
  const { isAuthenticated, isLoading, user, logout } = useAuth()

  // Show loading state
  if (isLoading) {
    return (
      <nav role="navigation" aria-label="Account actions" className={`flex items-center space-x-3 ${className}`}>
        <div className="h-9 w-16 bg-gray-200 animate-pulse rounded"></div>
        <div className="h-9 w-24 bg-gray-200 animate-pulse rounded"></div>
      </nav>
    )
  }

  // Guest state
  if (!isAuthenticated) {
    return (
      <nav role="navigation" aria-label="Account actions" className={`flex items-center space-x-3 ${className}`}>
        <Link href="/login">
          <CTAButton variant="ghost" size="sm">
            Login
          </CTAButton>
        </Link>
        <Link href="/register">
          <CTAButton variant="primary" size="sm">
            Get Started
          </CTAButton>
        </Link>
      </nav>
    )
  }

  // Authenticated state
  return (
    <nav role="navigation" aria-label="Account actions" className={`flex items-center space-x-3 ${className}`}>
      <span className="text-sm text-gray-600 hidden sm:block">
        Welcome, {user?.firstName}
      </span>
      <Link href="/dashboard">
        <CTAButton variant="ghost" size="sm">
          Dashboard
        </CTAButton>
      </Link>
      <CTAButton 
        variant="secondary" 
        size="sm"
        onClick={logout}
      >
        Logout
      </CTAButton>
    </nav>
  )
}

/**
 * Hero Section CTAs for landing page
 */
export function AuthHeroCTAs({ className = '' }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <Link href="/register">
        <CTAButton 
          variant="primary" 
          size="lg"
          className="bg-teal-500 text-white hover:bg-teal-600"
        >
          Start Free Trial
        </CTAButton>
      </Link>
    </div>
  )
}