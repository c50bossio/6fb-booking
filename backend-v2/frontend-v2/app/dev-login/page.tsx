'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DevLoginPage() {
  const router = useRouter()

  useEffect(() => {
    // Only work in development mode
    if (process.env.NODE_ENV !== 'development') {
      router.push('/login')
      return
    }

    // Set up mock user data for development testing
    const mockUser = {
      id: 1,
      name: 'Dev User',
      email: 'dev@test.com',
      role: 'barber',
      unified_role: 'barber'
    }

    const mockToken = 'mock-dev-token-12345'

    // Store in localStorage
    localStorage.setItem('user', JSON.stringify(mockUser))
    localStorage.setItem('token', mockToken)

    console.log('🔧 DEV LOGIN: Set up mock user for development:', mockUser)

    // Redirect to dashboard
    router.push('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Development Login</h2>
          <p className="mt-2 text-sm text-gray-600">
            Setting up mock user for development testing...
          </p>
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    </div>
  )
}