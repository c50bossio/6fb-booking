/**
 * Biometric Authentication Manager Component
 * UI for managing fingerprint, face, and voice authentication
 * Version: 1.0.0
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { Switch } from './ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Progress } from './ui/progress'
import { useBiometricAuth } from '@/lib/mobile-biometric-auth'
import type { BiometricMethod, BiometricAuthResult } from '@/lib/mobile-biometric-auth'

interface BiometricAuthManagerProps {
  className?: string
  onAuthSuccess?: (result: BiometricAuthResult) => void
  onRegistrationComplete?: (method: string) => void
}

export default function BiometricAuthManager({ 
  className, 
  onAuthSuccess,
  onRegistrationComplete 
}: BiometricAuthManagerProps) {
  const { authenticate, register, getStatus, getAvailableMethods, updateConfig } = useBiometricAuth()
  
  const [status, setStatus] = useState({
    supported: false,
    enabled: false,
    methods: [] as BiometricMethod[],
    hasCredentials: false
  })
  
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [authResult, setAuthResult] = useState<BiometricAuthResult | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [showSetup, setShowSetup] = useState(false)

  // Configuration state
  const [config, setConfig] = useState({
    enabled: true,
    fallbackToPassword: true,
    secureBiometricOnly: true,
    maxRetries: 3,
    timeout: 30000
  })

  // Load status and configuration on mount
  useEffect(() => {
    loadBiometricStatus()
    loadConfiguration()
  }, [])

  const loadBiometricStatus = () => {
    try {
      const currentStatus = getStatus()
      setStatus(currentStatus)
      
      const availableMethods = getAvailableMethods()
      if (availableMethods.length > 0 && !selectedMethod) {
        setSelectedMethod(availableMethods[0].type)
      }
    } catch (error) {
      console.error('Failed to load biometric status:', error)
    }
  }

  const loadConfiguration = () => {
    try {
      const saved = localStorage.getItem('biometric_auth_config')
      if (saved) {
        const savedConfig = JSON.parse(saved)
        setConfig(savedConfig)
      }
    } catch (error) {
      console.error('Failed to load biometric configuration:', error)
    }
  }

  const handleAuthenticate = async (preferredMethod?: string) => {
    if (!status.supported || isAuthenticating) return

    setIsAuthenticating(true)
    setAuthResult(null)

    try {
      const result = await authenticate({
        preferredMethod: preferredMethod as any,
        allowFallback: config.fallbackToPassword
      })

      setAuthResult(result)
      
      if (result.success) {
        onAuthSuccess?.(result)
      }
    } catch (error) {
      console.error('Authentication failed:', error)
      setAuthResult({
        success: false,
        error: error.message,
        timestamp: Date.now()
      })
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleRegisterBiometric = async () => {
    if (!status.supported || isRegistering) return

    setIsRegistering(true)

    try {
      const userId = `user_${Date.now()}` // In real app, get from auth context
      const credential = await register(userId)
      
      loadBiometricStatus() // Refresh status
      setShowSetup(false)
      onRegistrationComplete?.(credential.type)
      
      setAuthResult({
        success: true,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Biometric registration failed:', error)
      setAuthResult({
        success: false,
        error: error.message,
        timestamp: Date.now()
      })
    } finally {
      setIsRegistering(false)
    }
  }

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value }
    setConfig(newConfig)
    updateConfig(newConfig)
    localStorage.setItem('biometric_auth_config', JSON.stringify(newConfig))
  }

  const getBiometricIcon = (type: string) => {
    switch (type) {
      case 'fingerprint': return '👆'
      case 'face': return '👤'
      case 'voice': return '🎤'
      case 'iris': return '👁️'
      default: return '🔐'
    }
  }

  const getSecurityLevel = (method: BiometricMethod) => {
    if (method.secure) {
      return method.type === 'face' ? 'Very High' : 'High'
    }
    return method.type === 'voice' ? 'Medium' : 'Low'
  }

  const getSecurityColor = (level: string) => {
    switch (level) {
      case 'Very High': return 'text-green-600'
      case 'High': return 'text-blue-600'
      case 'Medium': return 'text-yellow-600'
      default: return 'text-red-600'
    }
  }

  if (!status.supported) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Alert>
          <AlertDescription className="flex items-center space-x-2">
            <span>🔐</span>
            <span>Biometric authentication is not supported on this device. For enhanced security, consider using a device with fingerprint or face recognition capabilities.</span>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Main Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>🔐</span>
              <span>Biometric Authentication</span>
            </div>
            <Badge variant={status.enabled && status.hasCredentials ? 'default' : 'secondary'}>
              {status.enabled && status.hasCredentials ? 'Active' : 'Inactive'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Use your fingerprint, face, or voice to securely access BookedBarber
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Auth Section */}
          {status.hasCredentials && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Quick Authentication</div>
                  <div className="text-sm text-gray-600">Use your registered biometric to sign in</div>
                </div>
                <Button 
                  onClick={() => handleAuthenticate(selectedMethod)}
                  disabled={!status.enabled || isAuthenticating}
                  className="flex items-center space-x-2"
                >
                  {isAuthenticating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>{getBiometricIcon(selectedMethod)}</span>
                      <span>Authenticate</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Method Selection */}
              {status.methods.length > 1 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Preferred Method</div>
                  <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {status.methods.filter(m => m.available && m.enrolled).map((method) => (
                        <SelectItem key={method.type} value={method.type}>
                          <div className="flex items-center space-x-2">
                            <span>{getBiometricIcon(method.type)}</span>
                            <span>{method.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Setup Section */}
          {!status.hasCredentials && (
            <div className="text-center py-6">
              <div className="text-4xl mb-2">🔐</div>
              <div className="font-medium mb-2">Biometric Authentication Not Set Up</div>
              <div className="text-sm text-gray-600 mb-4">
                Enable biometric authentication for faster, more secure access
              </div>
              <Button onClick={() => setShowSetup(true)}>
                Set Up Biometric Auth
              </Button>
            </div>
          )}

          {/* Authentication Result */}
          {authResult && (
            <Alert className={authResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertDescription className="flex items-center space-x-2">
                <span>{authResult.success ? '✅' : '❌'}</span>
                <span>
                  {authResult.success 
                    ? `Authentication successful using ${authResult.method?.name || 'biometric method'}`
                    : `Authentication failed: ${authResult.error}`
                  }
                </span>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Available Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Available Methods</CardTitle>
          <CardDescription>Biometric authentication methods on this device</CardDescription>
        </CardHeader>
        <CardContent>
          {status.methods.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🔍</div>
              <div>No biometric methods detected</div>
              <div className="text-sm mt-2">Check device settings to enable biometric features</div>
            </div>
          ) : (
            <div className="space-y-3">
              {status.methods.map((method) => (
                <div key={method.type} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{getBiometricIcon(method.type)}</div>
                    <div>
                      <div className="font-medium flex items-center space-x-2">
                        <span>{method.name}</span>
                        {!method.available && <Badge variant="outline" className="text-xs">Unavailable</Badge>}
                        {!method.enrolled && method.available && <Badge variant="outline" className="text-xs">Not Enrolled</Badge>}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center space-x-4">
                        <span className={`${getSecurityColor(getSecurityLevel(method))}`}>
                          Security: {getSecurityLevel(method)}
                        </span>
                        <span>•</span>
                        <span>{method.available ? 'Available' : 'Unavailable'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant={method.available && method.enrolled ? 'default' : 'secondary'}>
                      {method.available && method.enrolled ? 'Ready' : 'Setup Required'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>Configure biometric authentication behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable Biometric Authentication</div>
              <div className="text-sm text-gray-600">Allow biometric login to your account</div>
            </div>
            <Switch 
              checked={config.enabled}
              onCheckedChange={(checked) => handleConfigChange('enabled', checked)}
            />
          </div>

          {/* Password Fallback */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Password Fallback</div>
              <div className="text-sm text-gray-600">Allow password login if biometric fails</div>
            </div>
            <Switch 
              checked={config.fallbackToPassword}
              onCheckedChange={(checked) => handleConfigChange('fallbackToPassword', checked)}
              disabled={!config.enabled}
            />
          </div>

          {/* Secure Biometrics Only */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Secure Biometrics Only</div>
              <div className="text-sm text-gray-600">Only allow high-security methods (fingerprint, face)</div>
            </div>
            <Switch 
              checked={config.secureBiometricOnly}
              onCheckedChange={(checked) => handleConfigChange('secureBiometricOnly', checked)}
              disabled={!config.enabled}
            />
          </div>

          {/* Max Retries */}
          <div className="space-y-2">
            <div className="font-medium">Maximum Retry Attempts</div>
            <Select 
              value={config.maxRetries.toString()}
              onValueChange={(value) => handleConfigChange('maxRetries', parseInt(value))}
              disabled={!config.enabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 attempt</SelectItem>
                <SelectItem value="3">3 attempts</SelectItem>
                <SelectItem value="5">5 attempts</SelectItem>
                <SelectItem value="10">10 attempts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Timeout */}
          <div className="space-y-2">
            <div className="font-medium">Authentication Timeout</div>
            <Select 
              value={(config.timeout / 1000).toString()}
              onValueChange={(value) => handleConfigChange('timeout', parseInt(value) * 1000)}
              disabled={!config.enabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 seconds</SelectItem>
                <SelectItem value="30">30 seconds</SelectItem>
                <SelectItem value="60">1 minute</SelectItem>
                <SelectItem value="120">2 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Setup Modal/Dialog */}
      {showSetup && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>🚀</span>
              <span>Set Up Biometric Authentication</span>
            </CardTitle>
            <CardDescription>
              Register your biometric for secure, convenient access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span>🔒</span>
                <span className="text-sm">Your biometric data stays on your device</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>⚡</span>
                <span className="text-sm">Sign in faster with biometric authentication</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>🛡️</span>
                <span className="text-sm">Enhanced security for your barbershop account</span>
              </div>
            </div>

            {isRegistering && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Setting up biometric authentication...</div>
                <Progress value={60} className="w-full" />
                <div className="text-xs text-gray-600">Follow the prompts on your device</div>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <Button 
                onClick={handleRegisterBiometric}
                disabled={isRegistering}
                className="flex-1"
              >
                {isRegistering ? 'Registering...' : 'Register Biometric'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowSetup(false)}
                disabled={isRegistering}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help & Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Help & Troubleshooting</CardTitle>
          <CardDescription>Common issues and solutions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <details className="cursor-pointer">
            <summary className="font-medium">Biometric authentication not working?</summary>
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              <div>• Ensure your device has biometric features enabled</div>
              <div>• Check that you've enrolled fingerprints or face data in device settings</div>
              <div>• Try refreshing the page and attempting authentication again</div>
              <div>• Make sure BookedBarber has permission to use biometric features</div>
            </div>
          </details>
          
          <details className="cursor-pointer">
            <summary className="font-medium">Fingerprint not recognized?</summary>
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              <div>• Clean your finger and the sensor</div>
              <div>• Try using a different registered finger</div>
              <div>• Ensure your finger completely covers the sensor</div>
              <div>• Re-register fingerprints in device settings if issues persist</div>
            </div>
          </details>
          
          <details className="cursor-pointer">
            <summary className="font-medium">Face ID not working?</summary>
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              <div>• Ensure good lighting and look directly at the camera</div>
              <div>• Remove any obstructions (sunglasses, masks when possible)</div>
              <div>• Hold device at normal viewing distance</div>
              <div>• Reset Face ID in device settings if needed</div>
            </div>
          </details>

          <details className="cursor-pointer">
            <summary className="font-medium">Want to remove biometric access?</summary>
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              <div>• Disable biometric authentication in settings above</div>
              <div>• Contact support to remove biometric credentials from your account</div>
              <div>• You can always re-enable biometric access later</div>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  )
}