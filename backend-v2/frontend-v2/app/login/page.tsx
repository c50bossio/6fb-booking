'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('admin@bookedbarber.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:8000/api/v2/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        // Store tokens in both localStorage and cookies for compatibility
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('token', data.access_token) // Legacy support
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token)
        }
        
        // Also set cookies to match middleware expectations
        document.cookie = `access_token=${data.access_token}; path=/; max-age=${15 * 60}; samesite=lax`
        if (data.refresh_token) {
          document.cookie = `refresh_token=${data.refresh_token}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`
        }
        
        // Redirect to dashboard
        window.location.href = '/dashboard'
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Login failed')
      }
    } catch (err) {
      setError('Connection failed - make sure backend is running')
    } finally {
      setLoading(false)
    }
  }

  const tryCommonPassword = (password: string) => {
    setPassword(password)
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '3rem 2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px',
      }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: 'bold', 
          color: '#1e293b',
          margin: '0 0 2rem 0',
          textAlign: 'center'
        }}>
          BOOKEDBARBER
        </h1>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              color: '#374151',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              color: '#374151',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#dc2626',
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loading ? '#9ca3af' : '#14b8a6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '1rem'
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{
          borderTop: '1px solid #e5e7eb',
          paddingTop: '1rem',
          marginTop: '1rem'
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: '0 0 0.5rem 0'
          }}>
            Try common passwords:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {['password123', 'admin123', 'bookedbarber123', 'admin', 'password'].map((pwd) => (
              <button
                key={pwd}
                type="button"
                onClick={() => tryCommonPassword(pwd)}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#374151'
                }}
              >
                {pwd}
              </button>
            ))}
          </div>
        </div>
        
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <a href="/" style={{ 
            color: '#64748b', 
            fontSize: '0.875rem', 
            textDecoration: 'none'
          }}>
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  )
}