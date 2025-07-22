"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Icons } from '@/components/ui/icons'
import { useToast } from '@/hooks/use-toast'

interface OAuthProvider {
  name: string
  display_name: string
  configured: boolean
}

interface OAuthButtonsProps {
  mode?: 'login' | 'register' | 'link'
  onSuccess?: (provider: string) => void
  onError?: (error: string, provider: string) => void
  className?: string
}

export function OAuthButtons({ 
  mode = 'login', 
  onSuccess, 
  onError,
  className = ""
}: OAuthButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [providers, setProviders] = useState<OAuthProvider[]>([])
  const [providersLoaded, setProvidersLoaded] = useState(false)
  const { toast } = useToast()

  // Load providers on component mount
  React.useEffect(() => {
    loadOAuthProviders()
  }, [])

  const loadOAuthProviders = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/v1/oauth/providers`)
      
      if (response.ok) {
        const data = await response.json()
        setProviders(data.filter((p: OAuthProvider) => p.configured))
      } else {
        console.warn('Failed to load OAuth providers')
        setProviders([])
      }
    } catch (error) {
      console.warn('OAuth providers not available:', error)
      setProviders([])
    } finally {
      setProvidersLoaded(true)
    }
  }

  const handleOAuthLogin = async (provider: string) => {
    setLoading(provider)
    
    try {
      // Initiate OAuth flow
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/v1/oauth/initiate/${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || `${provider} authentication failed`)
      }

      const data = await response.json()
      
      // Redirect to OAuth provider
      window.location.href = data.authorization_url
      
      // Call success callback
      onSuccess?.(provider)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
      
      toast({
        title: "Authentication Error",
        description: errorMessage,
        variant: "destructive"
      })
      
      onError?.(errorMessage, provider)
    } finally {
      setLoading(null)
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return <Icons.google className="h-4 w-4" />
      case 'facebook':
        return <Icons.facebook className="h-4 w-4" />
      default:
        return null
    }
  }

  const getButtonText = (provider: string) => {
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1)
    
    switch (mode) {
      case 'register':
        return `Sign up with ${providerName}`
      case 'link':
        return `Link ${providerName} account`
      default:
        return `Continue with ${providerName}`
    }
  }

  // Don't render anything if no providers are configured
  if (providersLoaded && providers.length === 0) {
    return null
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {providers.map((provider) => (
        <Button
          key={provider.name}
          variant="outline"
          onClick={() => handleOAuthLogin(provider.name)}
          disabled={loading === provider.name}
          className="w-full"
        >
          {loading === provider.name ? (
            <Icons.spinner className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <span className="mr-2">
              {getProviderIcon(provider.name)}
            </span>
          )}
          {getButtonText(provider.name)}
        </Button>
      ))}
      
      {providers.length > 0 && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// OAuth Success Handler Component
export function OAuthSuccessHandler() {
  const { toast } = useToast()

  React.useEffect(() => {
    // Check if we have OAuth tokens in cookies
    const hasAccessToken = document.cookie.includes('access_token=')
    
    if (hasAccessToken) {
      toast({
        title: "Login Successful",
        description: "You have been signed in successfully.",
        variant: "default"
      })
      
      // Redirect to dashboard or intended page
      const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/dashboard'
      window.location.href = redirectTo
    }
  }, [toast])

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="text-center">
        <Icons.spinner className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">
          Completing authentication...
        </p>
      </div>
    </div>
  )
}

// OAuth Error Handler Component
export function OAuthErrorHandler() {
  const [error, setError] = useState<string>('')
  const [provider, setProvider] = useState<string>('')

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    setError(urlParams.get('error') || 'Unknown error')
    setProvider(urlParams.get('provider') || 'OAuth provider')
  }, [])

  return (
    <div className="max-w-md mx-auto mt-8 p-6 border border-destructive/20 rounded-lg bg-destructive/5">
      <div className="text-center">
        <Icons.alertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-destructive mb-2">
          Authentication Failed
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          There was a problem signing in with {provider}.
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          Error: {error}
        </p>
        <Button
          onClick={() => window.location.href = '/auth/login'}
          variant="outline"
        >
          Try Again
        </Button>
      </div>
    </div>
  )
}