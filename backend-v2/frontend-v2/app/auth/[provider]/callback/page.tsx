'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/Card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { handleOAuthCallback, linkSocialAccount, SocialProvider } from '@/lib/social-auth'
import { useAuth } from '@/hooks/useAuth'

export default function SocialAuthCallbackPage({
  params
}: {
  params: { provider: string }
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login: authLogin } = useAuth()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    handleCallback()
  }, [])

  const handleCallback = async () => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Check for OAuth errors
    if (error) {
      setStatus('error')
      setError(errorDescription || 'Authentication was cancelled or failed')
      return
    }

    if (!code || !state) {
      setStatus('error')
      setError('Invalid callback parameters')
      return
    }

    const provider = params.provider as SocialProvider
    const isLinking = sessionStorage.getItem('linking_social_account') === 'true'

    try {
      if (isLinking) {
        // Link account to existing user
        await linkSocialAccount(provider, code)
        sessionStorage.removeItem('linking_social_account')
        setStatus('success')
        setTimeout(() => {
          router.push('/settings/security')
        }, 1500)
      } else {
        // Login or register with social account
        const response = await handleOAuthCallback(provider, code, state)
        
        // Update auth context
        await authLogin(response.access_token, response.refresh_token)
        
        setStatus('success')
        
        // Redirect to dashboard or original destination
        const redirect = searchParams.get('redirect') || '/dashboard'
        setTimeout(() => {
          router.push(redirect)
        }, 1500)
      }
    } catch (err: any) {
      console.error('OAuth callback error:', err)
      setStatus('error')
      setError(err.message || 'Failed to complete authentication')
    }
  }

  const getProviderName = () => {
    switch (params.provider) {
      case 'google':
        return 'Google'
      case 'facebook':
        return 'Facebook'
      case 'apple':
        return 'Apple'
      default:
        return params.provider
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6">
          {status === 'processing' && (
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <h2 className="text-xl font-semibold">Completing sign in...</h2>
              <p className="text-muted-foreground">
                Please wait while we complete your {getProviderName()} authentication.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
              <h2 className="text-xl font-semibold">Success!</h2>
              <p className="text-muted-foreground">
                You've successfully signed in with {getProviderName()}.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting you now...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="text-center space-y-4">
                <h2 className="text-xl font-semibold">Authentication Failed</h2>
                <p className="text-muted-foreground">
                  We couldn't complete your sign in with {getProviderName()}.
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => router.push('/login')}
                    className="text-primary hover:underline"
                  >
                    Back to login
                  </button>
                  <span className="text-muted-foreground">or</span>
                  <button
                    onClick={() => router.push('/register')}
                    className="text-primary hover:underline"
                  >
                    Create account
                  </button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}