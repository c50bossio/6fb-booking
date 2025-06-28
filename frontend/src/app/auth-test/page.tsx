'use client'

import { useState } from 'react'

export default function AuthTestPage() {
  const [status, setStatus] = useState('Ready to test')
  const [loading, setLoading] = useState(false)

  const testDirectAuth = async () => {
    setLoading(true)
    setStatus('Testing direct backend connection...')

    try {
      // Test 1: Health check
      setStatus('🔍 Testing backend health...')
      const healthResponse = await fetch('https://sixfb-backend.onrender.com/health')
      setStatus(`✅ Health check: ${healthResponse.status}`)

      // Test 2: Direct login
      setStatus('🔑 Testing authentication...')
      const formData = new URLSearchParams()
      formData.append('username', 'admin@6fb.com')
      formData.append('password', 'admin123')

      const authResponse = await fetch('https://sixfb-backend.onrender.com/api/v1/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: formData,
      })

      if (authResponse.ok) {
        const data = await authResponse.json()
        setStatus(`✅ Authentication successful! Got token: ${data.access_token.substring(0, 20)}...`)
      } else {
        const errorText = await authResponse.text()
        setStatus(`❌ Authentication failed (${authResponse.status}): ${errorText}`)
      }

    } catch (error: any) {
      setStatus(`💥 Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const testProxyAuth = async () => {
    setLoading(true)
    setStatus('Testing proxy authentication...')

    try {
      const formData = new URLSearchParams()
      formData.append('username', 'admin@6fb.com')
      formData.append('password', 'admin123')

      const response = await fetch('/api/proxy/api/v1/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setStatus(`✅ Proxy auth successful! Got token: ${data.access_token.substring(0, 20)}...`)
      } else {
        const errorText = await response.text()
        setStatus(`❌ Proxy auth failed (${response.status}): ${errorText}`)
      }

    } catch (error: any) {
      setStatus(`💥 Proxy error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          🔍 Authentication Test Center
        </h1>

        <div className="space-y-4 mb-6">
          <button
            onClick={testDirectAuth}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Testing...' : '🌐 Test Direct Backend Auth'}
          </button>

          <button
            onClick={testProxyAuth}
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Testing...' : '🔄 Test Proxy Auth'}
          </button>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-2">Status:</h3>
          <div className="font-mono text-sm text-gray-600 whitespace-pre-wrap">
            {status}
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p><strong>Purpose:</strong> Test both direct backend connection and frontend proxy</p>
          <p><strong>Expected:</strong> Both should succeed with admin@6fb.com / admin123</p>
        </div>
      </div>
    </div>
  )
}
