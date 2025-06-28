'use client'

import { useState } from 'react'

export default function GoogleTestPage() {
  const [status, setStatus] = useState('Ready to test Google Calendar integration')

  const startGoogleAuth = () => {
    setStatus('🚀 Starting Google OAuth flow...')

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
    const scopes = process.env.NEXT_PUBLIC_GOOGLE_SCOPES || 'https://www.googleapis.com/auth/calendar'

    if (!clientId || clientId === 'your_google_client_id_from_console') {
      setStatus('❌ Error: Google Client ID not configured. Please update .env.local')
      return
    }

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri!)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')

    setStatus('🔄 Redirecting to Google...')

    // Redirect to Google OAuth
    window.location.href = authUrl.toString()
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          📅 Google Calendar Integration Test
        </h1>

        <div className="space-y-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Current Configuration:</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Client ID:</strong> {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.substring(0, 20)}...</p>
              <p><strong>Redirect URI:</strong> {process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI}</p>
              <p><strong>Scopes:</strong> {process.env.NEXT_PUBLIC_GOOGLE_SCOPES}</p>
            </div>
          </div>

          <button
            onClick={startGoogleAuth}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Connect Google Calendar
          </button>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-2">Status:</h3>
          <div className="font-mono text-sm text-gray-600">
            {status}
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p><strong>Next Steps:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Set up Google Cloud Console project</li>
            <li>Enable Google Calendar API</li>
            <li>Create OAuth 2.0 credentials</li>
            <li>Update your .env.local file with real credentials</li>
            <li>Test this OAuth flow</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
