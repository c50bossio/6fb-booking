'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

// Google Identity Services types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: () => void
          renderButton: (element: HTMLElement, config: any) => void
          disableAutoSelect: () => void
        }
      }
    }
    handleCredentialResponse?: (response: any) => void
  }
}

interface GoogleOAuthProps {
  onSuccess?: (userData: any) => void
  onError?: (error: Error) => void
  disabled?: boolean
  text?: string
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

export function GoogleOAuth({
  onSuccess,
  onError,
  disabled = false,
  text = "Continue with Google",
  variant = "outline",
  size = "default",
  className = ""
}: GoogleOAuthProps) {
  const [loading, setLoading] = useState(false)
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)

  useEffect(() => {
    const loadGoogleScript = () => {
      if (window.google) {
        setIsGoogleLoaded(true)
        return
      }

      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => setIsGoogleLoaded(true)
      script.onerror = () => {
        console.error('Failed to load Google Identity Services')
        if (onError) {
          onError(new Error('Failed to load Google services'))
        }
      }
      document.head.appendChild(script)
    }

    loadGoogleScript()
  }, [onError])

  useEffect(() => {
    if (!isGoogleLoaded || !window.google) return

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId || clientId === 'your_google_client_id_here') {
      console.warn('Google OAuth not configured - add NEXT_PUBLIC_GOOGLE_CLIENT_ID')
      return
    }

    // Define the credential response handler
    window.handleCredentialResponse = async (response: any) => {
      setLoading(true)
      try {
        // Decode the JWT token (in production, verify this on your backend)
        const credential = response.credential
        const payload = JSON.parse(atob(credential.split('.')[1]))
        
        console.log('Google OAuth success:', payload)
        
        // Extract user data
        const userData = {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          given_name: payload.given_name,
          family_name: payload.family_name,
          picture: payload.picture,
          email_verified: payload.email_verified
        }

        if (onSuccess) {
          onSuccess(userData)
        }
      } catch (error) {
        console.error('Error processing Google credential:', error)
        if (onError) {
          onError(new Error('Failed to process Google authentication'))
        }
      } finally {
        setLoading(false)
      }
    }

    // Initialize Google OAuth
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: window.handleCredentialResponse,
      auto_select: false
    })
  }, [isGoogleLoaded, onSuccess, onError])

  const handleGoogleSignIn = async () => {
    if (disabled || loading || !isGoogleLoaded || !window.google) return

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId || clientId === 'your_google_client_id_here') {
      if (onError) {
        onError(new Error('Google OAuth is not configured. Please add your Google Client ID to environment variables.'))
      }
      return
    }

    setLoading(true)

    try {
      // Trigger the Google One Tap prompt
      window.google.accounts.id.prompt()
    } catch (error) {
      console.error('Google OAuth error:', error)
      if (onError) {
        onError(error as Error)
      }
      setLoading(false)
    }
  }

  return (
    <Button
      variant={variant === 'default' ? 'primary' : variant}
      size={size === 'default' ? 'md' : size}
      onClick={handleGoogleSignIn}
      disabled={disabled || loading || !isGoogleLoaded}
      className={`${className} transition-all duration-200 hover:scale-105`}
    >
      {loading ? (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent mr-3"></div>
          Connecting...
        </div>
      ) : !isGoogleLoaded ? (
        <div className="flex items-center">
          <div className="w-5 h-5 mr-3 bg-gray-600 dark:bg-gray-400 rounded animate-pulse"></div>
          Loading...
        </div>
      ) : (
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {text}
        </div>
      )}
    </Button>
  )
}

// Hook for Google OAuth configuration and utilities
export function useGoogleOAuth() {
  const [isLoaded, setIsLoaded] = useState(false)
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const isConfigured = !!(clientId && clientId !== 'your_google_client_id_here')
  
  useEffect(() => {
    if (window.google) {
      setIsLoaded(true)
    }
  }, [])
  
  return {
    isConfigured,
    isLoaded,
    clientId: isConfigured ? clientId : null,
    
    // Configuration status helpers
    getConfigurationStatus: () => {
      if (!clientId) return 'missing'
      if (clientId === 'your_google_client_id_here') return 'placeholder'
      return 'configured'
    }
  }
}