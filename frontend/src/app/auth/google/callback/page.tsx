'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import GoogleOAuthService from '@/lib/auth/google-oauth'

export default function GoogleOAuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string>('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const error = searchParams.get('error')

        if (error) {
          throw new Error(`OAuth error: ${error}`)
        }

        if (!code) {
          throw new Error('No authorization code received')
        }

        setStatus('loading')

        // Exchange code for tokens with our backend
        const authResponse = await GoogleOAuthService.handleCallback(code, state || undefined)

        // Store tokens and user data
        localStorage.setItem('access_token', authResponse.access_token)

        // Update auth context
        // Note: This is a simplified approach. In practice, you might want to 
        // update the AuthProvider to handle Google OAuth responses directly
        
        setStatus('success')
        
        // Redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard')
        }, 1000)

      } catch (error: any) {
        console.error('Google OAuth callback error:', error)
        setError(error.message || 'Authentication failed')
        setStatus('error')
        
        // Redirect to login with error after delay
        setTimeout(() => {
          router.push('/login?error=oauth_failed')
        }, 3000)
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center">
          {/* Logo */}
          <div className="flex items-center justify-center space-x-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
              <span className="text-white font-bold text-xl">6</span>
            </div>
            <span className="text-2xl font-bold text-white">6FB Platform</span>
          </div>

          {status === 'loading' && (
            <div className="space-y-6">
              <div className="w-16 h-16 mx-auto">
                <svg className="animate-spin w-16 h-16 text-teal-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Completing Sign In</h2>
                <p className="text-gray-400">
                  We're securely logging you in with Google...
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-6">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
                <p className="text-gray-400">
                  You're now signed in. Redirecting to your dashboard...
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Authentication Failed</h2>
                <p className="text-gray-400 mb-4">
                  {error || 'Something went wrong during sign in.'}
                </p>
                <button
                  onClick={() => router.push('/login')}
                  className="px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}