/**
 * Mobile Biometric Authentication Demo Page
 * Demonstrates fingerprint, face, and voice authentication
 * Version: 1.0.0
 */

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import BiometricAuthManager from '@/components/BiometricAuthManager'
import BiometricLoginPrompt, { BiometricLoginButton } from '@/components/BiometricLoginPrompt'
import { useBiometricLogin, useBiometricSetup } from '@/hooks/useBiometricLogin'
import type { BiometricAuthResult } from '@/lib/mobile-biometric-auth'

export default function MobileBiometricAuthDemo() {
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [authResult, setAuthResult] = useState<BiometricAuthResult | null>(null)
  const [setupResult, setSetupResult] = useState<string | null>(null)

  const { 
    isSupported, 
    isEnabled, 
    hasCredentials, 
    availableMethods,
    error: authError 
  } = useBiometricLogin()

  const {
    startSetup,
    isSetupAvailable,
    isSetupInProgress,
    setupStep,
    error: setupError
  } = useBiometricSetup()

  const handleAuthSuccess = (result: BiometricAuthResult) => {
    setAuthResult(result)
    setShowLoginPrompt(false)
  }

  const handleSetupDemo = async () => {
    const success = await startSetup('demo_user_' + Date.now())
    if (success) {
      setSetupResult('Biometric authentication setup completed successfully!')
    } else {
      setSetupResult('Setup failed. Please try again.')
    }
  }

  const getStatusBadge = () => {
    if (!isSupported) return <Badge variant="secondary">Not Supported</Badge>
    if (!isEnabled) return <Badge variant="secondary">Disabled</Badge>
    if (!hasCredentials) return <Badge variant="outline">Setup Required</Badge>
    return <Badge variant="default">Active</Badge>
  }

  const getAvailableMethodsText = () => {
    if (availableMethods.length === 0) return 'None detected'
    return availableMethods.map(m => m.name).join(', ')
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Mobile Biometric Authentication</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Secure, fast, and convenient authentication using fingerprint, face recognition, or voice commands
        </p>
        <div className="flex items-center justify-center space-x-4">
          <span className="text-sm text-gray-500">Status:</span>
          {getStatusBadge()}
        </div>
      </div>

      {/* Quick Demo Actions */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🚀</span>
            <span>Quick Demo</span>
          </CardTitle>
          <CardDescription>
            Try the biometric authentication system with these interactive demos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={() => setShowLoginPrompt(true)}
              disabled={!isSupported}
              className="flex items-center space-x-2"
            >
              <span>🔐</span>
              <span>Login Prompt Demo</span>
            </Button>

            <BiometricLoginButton
              onSuccess={() => setAuthResult({ success: true, timestamp: Date.now() })}
              onError={(error) => setAuthResult({ success: false, error, timestamp: Date.now() })}
              className="w-full"
            />

            <Button 
              onClick={handleSetupDemo}
              disabled={!isSetupAvailable || isSetupInProgress}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <span>⚙️</span>
              <span>{isSetupInProgress ? 'Setting up...' : 'Setup Demo'}</span>
            </Button>
          </div>

          {/* Demo Results */}
          {authResult && (
            <Alert className={authResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertDescription>
                {authResult.success 
                  ? `✅ Authentication successful using ${authResult.method?.name || 'biometric method'}`
                  : `❌ Authentication failed: ${authResult.error}`
                }
              </AlertDescription>
            </Alert>
          )}

          {setupResult && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription>
                ℹ️ {setupResult}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Current device capabilities and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="font-medium">Platform Support</div>
              <div className="text-sm">
                {isSupported ? (
                  <div className="flex items-center space-x-1">
                    <span className="text-green-600">✅</span>
                    <span>Supported</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <span className="text-red-600">❌</span>
                    <span>Not Supported</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-medium">Available Methods</div>
              <div className="text-sm text-gray-600">
                {getAvailableMethodsText()}
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-medium">Device Type</div>
              <div className="text-sm text-gray-600">
                {/Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'Mobile Device' : 'Desktop/Laptop'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-medium">Browser</div>
              <div className="text-sm text-gray-600">
                {navigator.userAgent.includes('Chrome') ? 'Chrome' :
                 navigator.userAgent.includes('Safari') ? 'Safari' :
                 navigator.userAgent.includes('Firefox') ? 'Firefox' : 'Other'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Demos */}
      <Tabs defaultValue="manager" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manager">Authentication Manager</TabsTrigger>
          <TabsTrigger value="integration">Integration Examples</TabsTrigger>
          <TabsTrigger value="security">Security Features</TabsTrigger>
        </TabsList>

        <TabsContent value="manager" className="space-y-6">
          <BiometricAuthManager
            onAuthSuccess={handleAuthSuccess}
            onRegistrationComplete={(method) => setSetupResult(`${method} authentication registered successfully!`)}
          />
        </TabsContent>

        <TabsContent value="integration" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Login Form Integration */}
            <Card>
              <CardHeader>
                <CardTitle>Login Form Integration</CardTitle>
                <CardDescription>How biometric auth integrates with existing login forms</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input 
                      type="email" 
                      className="w-full p-2 border rounded-md" 
                      placeholder="your@email.com"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <input 
                      type="password" 
                      className="w-full p-2 border rounded-md" 
                      placeholder="••••••••"
                      disabled
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="w-full h-px bg-gray-300"></div>
                    <span className="text-sm text-gray-500 px-2">OR</span>
                    <div className="w-full h-px bg-gray-300"></div>
                  </div>

                  <BiometricLoginButton
                    onSuccess={() => setAuthResult({ success: true, timestamp: Date.now() })}
                    onError={(error) => setAuthResult({ success: false, error, timestamp: Date.now() })}
                    className="w-full"
                    size="lg"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Mobile App Integration */}
            <Card>
              <CardHeader>
                <CardTitle>Mobile App Integration</CardTitle>
                <CardDescription>Biometric authentication in mobile app contexts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">BookedBarber</div>
                    <Badge variant="outline">PWA</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">Welcome back, John!</div>
                    <div className="text-xs text-gray-500">Last login: 2 hours ago</div>
                  </div>

                  <Button 
                    onClick={() => setShowLoginPrompt(true)}
                    className="w-full flex items-center space-x-2"
                    disabled={!isSupported}
                  >
                    <span>👆</span>
                    <span>Quick Login</span>
                  </Button>
                  
                  <div className="text-center">
                    <button className="text-sm text-blue-600 hover:underline">
                      Use different account
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Security Features */}
            <Card>
              <CardHeader>
                <CardTitle>Security Features</CardTitle>
                <CardDescription>Built-in security measures and protections</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-green-600">🔒</span>
                    <div>
                      <div className="font-medium">Local Biometric Storage</div>
                      <div className="text-sm text-gray-600">Biometric data never leaves your device</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className="text-green-600">🛡️</span>
                    <div>
                      <div className="font-medium">Secure Element Integration</div>
                      <div className="text-sm text-gray-600">Uses hardware security features when available</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className="text-green-600">⚡</span>
                    <div>
                      <div className="font-medium">Anti-Spoofing Protection</div>
                      <div className="text-sm text-gray-600">Liveness detection for face recognition</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className="text-green-600">🔄</span>
                    <div>
                      <div className="font-medium">Automatic Fallback</div>
                      <div className="text-sm text-gray-600">Password login if biometric fails</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Privacy Information */}
            <Card>
              <CardHeader>
                <CardTitle>Privacy & Compliance</CardTitle>
                <CardDescription>How we protect your biometric data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="font-medium text-blue-900">📱 Device-Only Storage</div>
                    <div className="text-sm text-blue-700 mt-1">
                      Your fingerprint and face data is stored only on your device and never transmitted to our servers.
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="font-medium text-green-900">🔐 WebAuthn Standard</div>
                    <div className="text-sm text-green-700 mt-1">
                      Uses W3C WebAuthentication standard for maximum security and compatibility.
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="font-medium text-purple-900">🛡️ GDPR Compliant</div>
                    <div className="text-sm text-purple-700 mt-1">
                      Meets all privacy regulations with user consent and data minimization.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Error States */}
      {(authError || setupError) && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription>
            ❌ Error: {authError || setupError}
          </AlertDescription>
        </Alert>
      )}

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <BiometricLoginPrompt
          onSuccess={handleAuthSuccess}
          onFallback={() => {
            setShowLoginPrompt(false)
            setAuthResult({ success: false, error: 'User chose password fallback', timestamp: Date.now() })
          }}
          onCancel={() => setShowLoginPrompt(false)}
          title="Demo Login"
          subtitle="This is a demonstration of the biometric login prompt"
        />
      )}
    </div>
  )
}