'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertTriangle,
  Link2,
  ArrowLeft
} from 'lucide-react'
import { integrationsAPI } from '@/lib/api/integrations'
import { useToast } from '@/hooks/use-toast'

export default function IntegrationsCallbackPage() {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [integrationName, setIntegrationName] = useState('')

  useEffect(() => {
    handleOAuthCallback()
  }, [])

  const handleOAuthCallback = async () => {
    try {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      const integrationType = searchParams.get('integration_type') || 'unknown'

      // Set integration name for display
      setIntegrationName(getIntegrationDisplayName(integrationType))

      if (error) {
        setStatus('error')
        setMessage(errorDescription || `Authorization was denied: ${error}`)
        toast({
          title: 'Connection Failed',
          description: errorDescription || 'Authorization was denied',
          variant: 'destructive'
        })
        return
      }

      if (!code || !state) {
        setStatus('error')
        setMessage('Missing required authorization parameters')
        toast({
          title: 'Connection Failed',
          description: 'Missing authorization parameters',
          variant: 'destructive'
        })
        return
      }

      // Handle the OAuth callback
      const result = await integrationsAPI.handleOAuthCallback(
        code,
        state,
        integrationType as any,
        error || undefined,
        errorDescription || undefined
      )

      if (result.success) {
        setStatus('success')
        setMessage(`${integrationName} has been connected successfully!`)
        toast({
          title: 'Connection Successful',
          description: `${integrationName} is now connected`,
          variant: 'default'
        })

        // Redirect to integrations page after 3 seconds
        setTimeout(() => {
          router.push('/dashboard/integrations')
        }, 3000)
      } else {
        setStatus('error')
        setMessage(result.error || 'Failed to complete integration setup')
        toast({
          title: 'Connection Failed',
          description: result.error || 'Setup could not be completed',
          variant: 'destructive'
        })
      }
    } catch (err) {
      console.error('OAuth callback error:', err)
      setStatus('error')
      setMessage('An unexpected error occurred during setup')
      toast({
        title: 'Connection Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive'
      })
    }
  }

  const getIntegrationDisplayName = (type: string): string => {
    const displayNames: Record<string, string> = {
      'google_calendar': 'Google Calendar',
      'google_my_business': 'Google My Business',
      'google_ads': 'Google Ads',
      'meta_business': 'Meta Business',
      'stripe': 'Stripe',
      'sendgrid': 'SendGrid',
      'twilio': 'Twilio',
      'square': 'Square',
      'shopify': 'Shopify',
      'acuity': 'Acuity Scheduling',
      'booksy': 'Booksy'
    }
    return displayNames[type] || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'loading': return <Loader2 className="h-16 w-16 animate-spin text-primary" />
      case 'success': return <CheckCircle className="h-16 w-16 text-green-500" />
      case 'error': return <XCircle className="h-16 w-16 text-red-500" />
    }
  }

  const getStatusTitle = () => {
    switch (status) {
      case 'loading': return 'Connecting Integration...'
      case 'success': return 'Connection Successful!'
      case 'error': return 'Connection Failed'
    }
  }

  const getStatusDescription = () => {
    switch (status) {
      case 'loading': return `Setting up your ${integrationName} integration`
      case 'success': return 'Your integration is now active and ready to use'
      case 'error': return 'There was a problem connecting your integration'
    }
  }

  return (
    <div className="container mx-auto py-12">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Link2 className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Integration Setup</CardTitle>
                <CardDescription>
                  {integrationName || 'Third-party service'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Display */}
            <div className="text-center py-8">
              {getStatusIcon()}
              <h2 className="text-xl font-semibold mt-4 mb-2">
                {getStatusTitle()}
              </h2>
              <p className="text-muted-foreground">
                {getStatusDescription()}
              </p>
            </div>

            {/* Message */}
            {message && (
              <Alert variant={status === 'error' ? 'destructive' : 'default'}>
                {status === 'error' ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {/* Loading State */}
            {status === 'loading' && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground text-center">
                  Please wait while we complete the setup...
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full animate-pulse w-3/4"></div>
                </div>
              </div>
            )}

            {/* Success State */}
            {status === 'success' && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Redirecting to integrations dashboard in 3 seconds...
                  </p>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => router.push('/dashboard/integrations')}
                >
                  Go to Integrations
                </Button>
              </div>
            )}

            {/* Error State */}
            {status === 'error' && (
              <div className="space-y-4">
                <div className="grid gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/dashboard/integrations')}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Integrations
                  </Button>
                  <Button onClick={handleOAuthCallback}>
                    Try Again
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p>If the problem persists:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Check that you granted all required permissions</li>
                    <li>Ensure your account has admin access if required</li>
                    <li>Try connecting from a different browser</li>
                    <li>Contact support if the issue continues</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debug Information (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm">Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs space-y-1 font-mono">
                <div>Code: {searchParams.get('code') ? 'Present' : 'Missing'}</div>
                <div>State: {searchParams.get('state') ? 'Present' : 'Missing'}</div>
                <div>Error: {searchParams.get('error') || 'None'}</div>
                <div>Type: {searchParams.get('integration_type') || 'Unknown'}</div>
                <div>Status: {status}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}