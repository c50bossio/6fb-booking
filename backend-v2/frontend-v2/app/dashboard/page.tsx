'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getProfile, logout } from '@/lib/api'

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    async function fetchUser() {
      try {
        const userData = await getProfile()
        setUser(userData)
      } catch (error) {
        // Not authenticated, redirect to login
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()

    // Check for booking success
    if (searchParams.get('booking') === 'success') {
      setShowSuccess(true)
      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000)
    }
  }, [router, searchParams])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/book')}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Book Appointment
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Logout
            </button>
          </div>
        </div>

        {showSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">
              ✓ Booking confirmed successfully!
            </p>
          </div>
        )}

        {user && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Welcome back!</h2>
            <p className="text-gray-600 mb-6">
              Logged in as: {user.email}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Quick Actions</h3>
                <button
                  onClick={() => router.push('/book')}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Book a new appointment →
                </button>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Your Bookings</h3>
                <p className="text-gray-600 text-sm">
                  View and manage your appointments
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}