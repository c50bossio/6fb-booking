'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useCustomerAuth } from './CustomerAuthProvider'

interface CustomerProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function CustomerProtectedRoute({
  children,
  fallback
}: CustomerProtectedRouteProps) {
  const { customer, isLoading } = useCustomerAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // If not loading and no customer, redirect to login
    if (!isLoading && !customer && pathname.startsWith('/customer') && !pathname.includes('/login') && !pathname.includes('/signup') && !pathname.includes('/reset-password')) {
      router.push('/customer/login')
    }
  }, [customer, isLoading, router, pathname])

  // Show loading state
  if (isLoading) {
    return fallback || (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If no customer and we're on a protected route, don't render children
  if (!customer && pathname.startsWith('/customer') && !pathname.includes('/login') && !pathname.includes('/signup') && !pathname.includes('/reset-password')) {
    return null
  }

  return <>{children}</>
}
