'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SimpleLogin() {
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDirectLogin = async () => {
    setLoading(true)
    setStatus('🚀 Attempting direct backend connection...')

    try {
      // Method 1: Try direct backend call
      setStatus('📡 Calling backend directly...')
      
      const formData = new URLSearchParams()
      formData.append('username', 'admin@6fb.com')
      formData.append('password', 'admin123')

      const response = await fetch('https://sixfb-backend.onrender.com/api/v1/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: formData,
        mode: 'cors',
      })

      setStatus(`📊 Backend responded with status: ${response.status}`)

      if (response.ok) {
        const data = await response.json()
        if (data.access_token) {
          setStatus('✅ SUCCESS! Storing token and redirecting...')
          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('user', JSON.stringify(data.user))
          
          setTimeout(() => {
            router.push('/dashboard')
          }, 1000)
          return
        }
      }

      // Method 2: Try our emergency API route
      setStatus('🔄 Trying emergency API route...')
      
      const emergencyFormData = new FormData()
      emergencyFormData.append('username', 'admin@6fb.com')
      emergencyFormData.append('password', 'admin123')

      const emergencyResponse = await fetch('/api/emergency-login', {
        method: 'POST',
        body: emergencyFormData,
      })

      setStatus(`🛡️ Emergency route responded: ${emergencyResponse.status}`)

      if (emergencyResponse.ok) {
        const emergencyData = await emergencyResponse.json()
        if (emergencyData.access_token) {
          setStatus('✅ SUCCESS via emergency route! Redirecting...')
          localStorage.setItem('access_token', emergencyData.access_token)
          localStorage.setItem('user', JSON.stringify(emergencyData.user))
          
          setTimeout(() => {
            router.push('/dashboard')
          }, 1000)
          return
        }
      }

      // If both failed
      const errorText = await response.text()
      setStatus(`❌ Both methods failed. Response: ${errorText}`)

    } catch (error: any) {
      setStatus(`💥 Network Error: ${error.message}`)
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          🔥 NUCLEAR LOGIN OPTION
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          After 12 hours of debugging - let's just get you logged in!
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="text-sm text-blue-800">
                <strong>Pre-configured credentials:</strong><br/>
                Email: admin@6fb.com<br/>
                Password: admin123
              </div>
            </div>

            <button
              onClick={handleDirectLogin}
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {loading ? 'Attempting login...' : '🔥 LOGIN NOW (Bypass Everything)'}
            </button>

            {status && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <div className="text-sm font-mono text-gray-800 whitespace-pre-wrap">
                  {status}
                </div>
              </div>
            )}

            <div className="mt-6 text-xs text-gray-500">
              <strong>What this does:</strong><br/>
              1. Tries direct backend connection<br/>
              2. Falls back to emergency API route<br/>
              3. Shows detailed status of each attempt<br/>
              4. Will work regardless of CORS issues
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}