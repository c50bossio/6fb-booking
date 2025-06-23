'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react"

interface TrafftConnectProps {
  onConnectionSuccess?: () => void
}

export default function TrafftConnect({ onConnectionSuccess }: TrafftConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [successData, setSuccessData] = useState<any>(null)

  const [formData, setFormData] = useState({
    api_key: '',
    subdomain: '',
    business_name: '',
    owner_email: '',
    phone: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsConnecting(true)
    setConnectionStatus('idle')
    setErrorMessage('')

    try {
      const token = localStorage.getItem('auth_token')

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trafft/connect-trafft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setConnectionStatus('success')
        setSuccessData(data)
        onConnectionSuccess?.()
      } else {
        setConnectionStatus('error')
        setErrorMessage(data.detail || 'Connection failed')
      }
    } catch (error) {
      setConnectionStatus('error')
      setErrorMessage('Network error. Please try again.')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (connectionStatus === 'success' && successData) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <CardTitle className="text-green-700">Trafft Connected Successfully!</CardTitle>
          </div>
          <CardDescription>
            {successData.business_name} is now integrated with your 6FB Platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Locations Imported:</strong> {successData.locations_imported}
            </div>
            <div>
              <strong>Barbers Imported:</strong> {successData.barbers_imported}
            </div>
            <div>
              <strong>Services Found:</strong> {successData.services_found}
            </div>
            <div>
              <strong>Setup Status:</strong> Complete ✅
            </div>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Next Steps:</strong>
              <ul className="mt-2 space-y-1">
                {successData.next_steps?.map((step: string, index: number) => (
                  <li key={index}>• {step}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex space-x-2">
            <Button
              onClick={() => window.location.href = '/dashboard'}
              className="flex-1"
            >
              Go to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => setConnectionStatus('idle')}
              className="flex-1"
            >
              Connect Another Account
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <span>Connect Your Trafft Account</span>
        </CardTitle>
        <CardDescription>
          One-click integration to sync your barbershop data with 6FB Platform
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="api_key">Trafft API Key *</Label>
              <Input
                id="api_key"
                type="password"
                placeholder="sk_live_..."
                value={formData.api_key}
                onChange={(e) => handleInputChange('api_key', e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Find this in your Trafft admin panel → Settings → Integrations → API
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subdomain">Trafft Subdomain *</Label>
                <Input
                  id="subdomain"
                  placeholder="mybarbershop"
                  value={formData.subdomain}
                  onChange={(e) => handleInputChange('subdomain', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="business_name">Business Name *</Label>
                <Input
                  id="business_name"
                  placeholder="My Barbershop"
                  value={formData.business_name}
                  onChange={(e) => handleInputChange('business_name', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="owner_email">Owner Email</Label>
                <Input
                  id="owner_email"
                  type="email"
                  placeholder="owner@mybarbershop.com"
                  value={formData.owner_email}
                  onChange={(e) => handleInputChange('owner_email', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+1 (555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
            </div>
          </div>

          {connectionStatus === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">What happens when you connect?</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>✅ Your Trafft locations and barbers are imported</li>
              <li>✅ Real-time webhook sync is set up automatically</li>
              <li>✅ Historical appointment data (last 30 days) is synced</li>
              <li>✅ Your 6FB dashboard populates with live data</li>
              <li>✅ Revenue tracking and analytics become available</li>
            </ul>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isConnecting || !formData.api_key || !formData.business_name}
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting to Trafft...
              </>
            ) : (
              'Connect Trafft Account'
            )}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-gray-500 text-center">
            🔒 Your Trafft credentials are encrypted and stored securely.
            You can disconnect at any time from your dashboard settings.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
