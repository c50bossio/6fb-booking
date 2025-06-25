'use client'

import { useState } from 'react'

export default function BypassLogin() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const doLogin = async () => {
    setLoading(true)
    setResult('🚀 Starting completely bypassed login...')

    try {
      const formData = new URLSearchParams()
      formData.append('username', 'admin@6fb.com')
      formData.append('password', 'admin123')

      setResult('📡 Making direct fetch...')

      const response = await fetch('https://sixfb-backend.onrender.com/api/v1/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: formData,
      })

      setResult(`📊 Response: ${response.status} ${response.statusText}`)

      if (response.ok) {
        const data = await response.json()

        // IMPORTANT: Clear demo mode when performing actual admin login
        try {
          sessionStorage.removeItem('demo_mode')
          console.log('🔧 Bypass login: Cleared demo mode for admin login')
        } catch (e) {
          console.log('Cannot clear sessionStorage')
        }

        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('user', JSON.stringify(data.user))
        setResult('✅ SUCCESS! Token stored in localStorage. Demo mode cleared. Go to /dashboard')
      } else {
        const error = await response.text()
        setResult(`❌ Error: ${error}`)
      }
    } catch (error: any) {
      setResult(`💥 Exception: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'monospace',
      backgroundColor: '#000',
      color: '#fff',
      minHeight: '100vh',
      fontSize: '14px'
    }}>
      <h1 style={{ color: '#00ff00' }}>🔥 COMPLETE BYPASS LOGIN</h1>
      <p>This page has its own layout - NO AuthProvider, NO redirects!</p>

      <button
        onClick={doLogin}
        disabled={loading}
        style={{
          padding: '15px 30px',
          fontSize: '18px',
          backgroundColor: '#ff0000',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.5 : 1,
          fontWeight: 'bold'
        }}
      >
        {loading ? 'WORKING...' : '🔥 LOGIN NOW'}
      </button>

      {result && (
        <pre style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#333',
          borderRadius: '5px',
          border: '2px solid #00ff00',
          overflow: 'auto'
        }}>
          {result}
        </pre>
      )}

      <div style={{ marginTop: '20px', color: '#888', fontSize: '12px' }}>
        <p>🎯 This WILL work because it completely bypasses all Next.js providers</p>
        <p>🔧 If this fails, the issue is CORS/network, not auth system</p>
        <p>💾 Success = token stored, then manually go to /dashboard</p>
      </div>
    </div>
  )
}
