'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'

function DebugDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading user data
    setUser({ id: 1, email: 'admin@bookedbarber.com', role: 'admin' })
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading debug dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Debug Dashboard</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">User Information</h2>
          <p>Email: {user?.email}</p>
          <p>Role: {user?.role}</p>
          <p>Status: Successfully loaded without component errors</p>
          
          <div className="mt-6">
            <button 
              onClick={() => router.push('/login')}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DebugDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    }>
      <DebugDashboard />
    </Suspense>
  )
}