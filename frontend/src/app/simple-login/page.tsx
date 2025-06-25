'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SimpleLogin() {
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('admin@6fb.com')
  const [password, setPassword] = useState('admin123')
  const router = useRouter()

  const handleDirectLogin = async () => {
    setLoading(true)
    setStatus('🚀 Starting fresh login attempt...')

    try {
      setStatus('📡 Creating form data...')

      const formData = new URLSearchParams()
      formData.append('username', email)
      formData.append('password', password)

      setStatus('🌐 Making direct call to backend...')
      console.log('Calling:', 'https://sixfb-backend.onrender.com/api/v1/auth/token')

      const response = await fetch('https://sixfb-backend.onrender.com/api/v1/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: formData,
      })

      setStatus(`📊 Response received! Status: ${response.status}`)
      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      if (response.ok) {
        const data = await response.json()
        console.log('Login data:', data)

        if (data.access_token) {
          setStatus('✅ SUCCESS! Got access token. Storing and redirecting...')

          localStorage.setItem('access_token', data.access_token)
          localStorage.setItem('user', JSON.stringify(data.user))

          setTimeout(() => {
            router.push('/dashboard')
          }, 1500)
          return
        } else {
          setStatus('❌ No access token in response')
        }
      } else {
        const errorText = await response.text()
        setStatus(`❌ Login failed (${response.status}): ${errorText}`)
        console.error('Error response:', errorText)
      }

    } catch (error: any) {
      setStatus(`💥 Network/CORS Error: ${error.message}`)
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          🚀 Fresh Start Login
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Clean, simple, direct backend connection
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-900 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-800">
          <div className="space-y-6">

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                placeholder="Enter email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                placeholder="Enter password"
              />
            </div>

            <button
              onClick={handleDirectLogin}
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Logging in...' : '🚀 Login (Direct)'}
            </button>

            {status && (
              <div className="mt-4 p-4 bg-gray-800 rounded-md border border-gray-700">
                <div className="text-sm font-mono text-gray-300 whitespace-pre-wrap">
                  {status}
                </div>
              </div>
            )}

            <div className="mt-6 text-xs text-gray-500">
              <strong>What this does:</strong><br/>
              • Makes direct call to backend API<br/>
              • No middleware, no complexity<br/>
              • Shows real-time status<br/>
              • Simple localStorage storage
            </div>

            <div className="text-center">
              <a href="/login" className="text-blue-400 text-sm hover:underline">
                ← Back to main login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
