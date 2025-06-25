'use client'

import { useState } from 'react'

export default function TestLogin() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const testLogin = async () => {
    setLoading(true)
    setResult('🚀 Starting test...')

    try {
      const formData = new URLSearchParams()
      formData.append('username', 'admin@6fb.com')
      formData.append('password', 'admin123')

      setResult('📡 Making request...')

      const response = await fetch('https://sixfb-backend.onrender.com/api/v1/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: formData,
      })

      setResult(`📊 Status: ${response.status}`)

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setResult('✅ SUCCESS! Token stored. You can now go to /dashboard')
      } else {
        const error = await response.text()
        setResult(`❌ Failed: ${error}`)
      }
    } catch (error: any) {
      setResult(`💥 Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#000', color: '#fff', minHeight: '100vh' }}>
      <h1>🔧 Direct Login Test</h1>
      <p>This page has NO auth provider, NO redirects, NO complexity.</p>

      <button
        onClick={testLogin}
        disabled={loading}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.5 : 1
        }}
      >
        {loading ? 'Testing...' : '🚀 Test Login'}
      </button>

      {result && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#333',
          borderRadius: '5px',
          whiteSpace: 'pre-wrap'
        }}>
          {result}
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>If this works, the backend is fine and the issue is in the auth system.</p>
        <p>If this fails, we have a fundamental CORS/network issue.</p>
      </div>
    </div>
  )
}
