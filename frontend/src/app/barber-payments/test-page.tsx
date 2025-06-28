'use client'

import { useState } from 'react'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

export default function BarberPaymentsTestPage() {
  const [loading, setLoading] = useState(false)

  const testAPI = async () => {
    setLoading(true)
    try {
      // Test the API endpoint without authentication first
      const response = await fetch('http://localhost:8000/api/v1/health')
      const data = await response.json()
      console.log('API Test Result:', data)
      alert(`API Health Check: ${data.status}`)
    } catch (error) {
      console.error('API Error:', error)
      alert('API connection failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <a
                href="/analytics"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </a>
              <Image
                src="/6fb-logo.png"
                alt="6FB Logo"
                width={60}
                height={60}
                className="rounded-full"
              />
              <div>
                <h1 className="text-xl font-bold text-white">Barber Payment Management Test</h1>
                <p className="text-xs text-gray-400">Testing Page - Component Loads Successfully</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">Test Results</h2>

          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <h3 className="text-green-400 font-semibold">✅ Component Loading</h3>
              <p className="text-gray-300">The barber-payments page component is loading successfully!</p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-blue-400 font-semibold">🔗 Routing</h3>
              <p className="text-gray-300">Next.js routing is working correctly for /barber-payments</p>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">🧪 API Test</h3>
              <button
                onClick={testAPI}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {loading ? 'Testing...' : 'Test Backend API'}
              </button>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <h3 className="text-yellow-400 font-semibold">⚠️ Next Steps</h3>
              <ul className="text-gray-300 list-disc list-inside space-y-1">
                <li>Test API authentication</li>
                <li>Check data loading functionality</li>
                <li>Verify all UI components render correctly</li>
                <li>Test backend endpoint responses</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
