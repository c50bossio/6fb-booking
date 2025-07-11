'use client'

import { CTAButton, CTAGroup } from './CTASystem'
import Link from 'next/link'

/**
 * Authentication-Aware Header CTAs
 * Shows login/register for guests, logout for authenticated users
 */
export function AuthHeaderCTAs({ className = '' }: { className?: string }) {
  // For now, show guest state - we'll add authentication later
  const isAuthenticated = false
  const isLoading = false

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
      <Link href="/dashboard">
        <CTAButton variant="ghost" size="sm">
          Dashboard
        </CTAButton>
      </Link>
      <CTAButton 
        variant="secondary" 
        size="sm"
        onClick={() => {
          // Handle logout
          console.log('Logout clicked')
        }}
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
    <div className={`flex flex-col sm:flex-row gap-4 justify-center ${className}`}>
      <Link href="/register">
        <CTAButton 
          variant="primary" 
          size="lg"
          className="bg-yellow-400 text-black hover:bg-yellow-300"
        >
          Start Free Trial
        </CTAButton>
      </Link>
      <Link href="/book">
        <CTAButton 
          variant="secondary" 
          size="lg"
          className="text-white border-white hover:bg-white hover:text-black"
        >
          Book a Demo
        </CTAButton>
      </Link>
    </div>
  )
}