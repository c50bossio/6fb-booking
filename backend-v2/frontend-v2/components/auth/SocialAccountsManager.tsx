'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Link as LinkIcon,
  Unlink,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react'
import {
  SocialProvider,
  getLinkedAccounts,
  unlinkSocialAccount,
  getOAuthUrl,
  isProviderConfigured,
  socialProviders
} from '@/lib/social-auth'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export function SocialAccountsManager() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [linkedAccounts, setLinkedAccounts] = useState<SocialProvider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [unlinkingProvider, setUnlinkingProvider] = useState<SocialProvider | null>(null)

  useEffect(() => {
    if (user) {
      loadLinkedAccounts()
    }
  }, [user])

  const loadLinkedAccounts = async () => {
    try {
      const accounts = await getLinkedAccounts()
      setLinkedAccounts(accounts)
    } catch (error) {
      console.error('Failed to load linked accounts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLinkAccount = (provider: SocialProvider) => {
    if (!isProviderConfigured(provider)) {
      toast({
        variant: 'destructive',
        title: 'Not available',
        description: `${socialProviders[provider].name} login is not configured.`
      })
      return
    }

    try {
      // Store linking state to handle callback
      sessionStorage.setItem('linking_social_account', 'true')
      const authUrl = getOAuthUrl(provider)
      window.location.href = authUrl
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to link account',
        description: 'Please try again later.'
      })
    }
  }

  const handleUnlinkAccount = async (provider: SocialProvider) => {
    // Check if this is the only auth method
    if (linkedAccounts.length === 1 && !user?.has_password) {
      toast({
        variant: 'destructive',
        title: 'Cannot unlink',
        description: 'You need at least one authentication method. Set a password first.'
      })
      return
    }

    if (!confirm(`Are you sure you want to unlink your ${socialProviders[provider].name} account?`)) {
      return
    }

    setUnlinkingProvider(provider)
    try {
      await unlinkSocialAccount(provider)
      setLinkedAccounts(linkedAccounts.filter(p => p !== provider))
      toast({
        title: 'Account unlinked',
        description: `Your ${socialProviders[provider].name} account has been unlinked.`
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to unlink account',
        description: 'Please try again later.'
      })
    } finally {
      setUnlinkingProvider(null)
    }
  }

  const getProviderIcon = (provider: SocialProvider) => {
    switch (provider) {
      case 'google':
        return (
          <svg className="h-5 w-5" viewBox="0 0 24 24">
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
        )
      case 'facebook':
        return (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        )
      case 'apple':
        return (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
        )
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Loading connected accounts...
          </div>
        </CardContent>
      </Card>
    )
  }

  const allProviders: SocialProvider[] = ['google', 'facebook', 'apple']

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-primary-600" />
          <CardTitle>Connected Accounts</CardTitle>
        </div>
        <CardDescription>
          Link your social accounts for easy sign-in
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!user?.has_password && linkedAccounts.length === 1 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You're using social login only. Consider setting a password to secure your account with multiple authentication methods.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {allProviders.map((provider) => {
            const isLinked = linkedAccounts.includes(provider)
            const providerInfo = socialProviders[provider]
            const isConfigured = isProviderConfigured(provider)

            return (
              <div
                key={provider}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    {getProviderIcon(provider)}
                  </div>
                  <div>
                    <p className="font-medium">{providerInfo.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {isLinked ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isLinked && (
                    <Badge variant="success">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Linked
                    </Badge>
                  )}
                  
                  {isLinked ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnlinkAccount(provider)}
                      disabled={unlinkingProvider === provider}
                    >
                      <Unlink className="h-4 w-4 mr-1" />
                      {unlinkingProvider === provider ? 'Unlinking...' : 'Unlink'}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLinkAccount(provider)}
                      disabled={!isConfigured}
                    >
                      <LinkIcon className="h-4 w-4 mr-1" />
                      Link
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Linking social accounts allows you to sign in quickly without remembering passwords. Your social profiles are never posted to without your permission.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}