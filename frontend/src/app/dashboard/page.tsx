'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
    } catch (err) {
      console.error('Failed to parse user data:', err)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">6FB Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                {user.first_name} {user.last_name}
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 p-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to 6FB Platform!
            </h2>
            <div className="space-y-2">
              <p className="text-gray-600">
                <span className="font-semibold">Email:</span> {user.email}
              </p>
              <p className="text-gray-600">
                <span className="font-semibold">Role:</span> {user.role}
              </p>
              <p className="text-gray-600">
                <span className="font-semibold">User ID:</span> {user.id}
              </p>
            </div>
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-2">Quick Links</h3>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <a
                  href="/analytics"
                  className="bg-blue-600 text-white px-4 py-2 rounded text-center hover:bg-blue-700"
                >
                  Analytics
                </a>
                <a
                  href="/communications"
                  className="bg-green-600 text-white px-4 py-2 rounded text-center hover:bg-green-700"
                >
                  Communications
                </a>
                <a
                  href="/payments"
                  className="bg-purple-600 text-white px-4 py-2 rounded text-center hover:bg-purple-700"
                >
                  Payments
                </a>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '')}/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-600 text-white px-4 py-2 rounded text-center hover:bg-gray-700"
                >
                  API Docs
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}