'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  Smartphone,
  Mail,
  Key,
  AlertTriangle,
  CheckCircle,
  Lock,
  Settings,
  ChevronRight
} from 'lucide-react'
import { TwoFactorAuth, TwoFactorSetup } from '@/components/auth/TwoFactorAuth'
import { TrustedDevices } from '@/components/auth/TrustedDevices'
import { SocialAccountsManager } from '@/components/auth/SocialAccountsManager'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

export default function SecuritySettingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [showSetup, setShowSetup] = useState(false)
  const [show2FAVerification, setShow2FAVerification] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<'sms' | 'email' | 'totp'>('sms')
  const [isUpdating, setIsUpdating] = useState(false)

  // Mock data - in a real app, this would come from the API
  const securitySettings = {
    twoFactorEnabled,
    twoFactorMethod: selectedMethod,
    lastPasswordChange: '2024-01-15',
    activeSessions: 3,
    trustedDevices: 2,
    loginHistory: [
      { date: '2024-03-20 10:30 AM', location: 'New York, US', device: 'Chrome on MacOS' },
      { date: '2024-03-19 2:15 PM', location: 'New York, US', device: 'Safari on iPhone' },
      { date: '2024-03-18 9:00 AM', location: 'Boston, US', device: 'Chrome on Windows' }
    ]
  }

  const handleEnable2FA = async (method: string, data?: any) => {
    setIsUpdating(true)
    try {
      // In a real app, this would call the API to setup 2FA
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSelectedMethod(method as any)
      setShow2FAVerification(true)
      setShowSetup(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Setup failed',
        description: 'Failed to enable two-factor authentication.'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleVerify2FA = async (code: string) => {
    // In a real app, this would verify the code with the API
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (code === '123456') { // Mock verification
      setTwoFactorEnabled(true)
      setShow2FAVerification(false)
      toast({
        title: 'Two-factor authentication enabled',
        description: 'Your account is now more secure with 2FA enabled.'
      })
    } else {
      throw new Error('Invalid verification code')
    }
  }

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return
    }

    setIsUpdating(true)
    try {
      // In a real app, this would call the API
      await new Promise(resolve => setTimeout(resolve, 1000))
      setTwoFactorEnabled(false)
      toast({
        title: 'Two-factor authentication disabled',
        description: 'Your account security has been updated.'
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to disable 2FA',
        description: 'Please try again later.'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Security Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your account security and authentication preferences
        </p>
      </div>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary-600" />
              <CardTitle>Two-Factor Authentication</CardTitle>
            </div>
            <Badge variant={twoFactorEnabled ? 'success' : 'secondary'}>
              {twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <CardDescription>
            Add an extra layer of security to your account by requiring a verification code in addition to your password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {twoFactorEnabled ? (
            <>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Two-factor authentication is enabled using {selectedMethod === 'sms' ? 'SMS' : selectedMethod === 'email' ? 'Email' : 'Authenticator app'}
                </AlertDescription>
              </Alert>
              <div className="flex items-center justify-between">
                <Label htmlFor="2fa-toggle">Two-factor authentication</Label>
                <Switch
                  id="2fa-toggle"
                  checked={twoFactorEnabled}
                  onCheckedChange={checked => {
                    if (!checked) handleDisable2FA()
                  }}
                  disabled={isUpdating}
                />
              </div>
            </>
          ) : (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Your account is not protected by two-factor authentication. We strongly recommend enabling it.
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => setShowSetup(true)}
                className="w-full sm:w-auto"
              >
                <Shield className="h-4 w-4 mr-2" />
                Enable Two-Factor Authentication
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary-600" />
            <CardTitle>Password</CardTitle>
          </div>
          <CardDescription>
            Ensure your account stays secure by using a strong password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Last changed</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(securitySettings.lastPasswordChange).toLocaleDateString()}
                </p>
              </div>
              <Button variant="outline">
                Change Password
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary-600" />
            <CardTitle>Active Sessions</CardTitle>
          </div>
          <CardDescription>
            Manage devices and locations where you're signed in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Active sessions</p>
                <p className="text-sm text-muted-foreground">
                  {securitySettings.activeSessions} devices
                </p>
              </div>
              <Button variant="outline" size="sm">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Trusted devices</p>
                <p className="text-sm text-muted-foreground">
                  {securitySettings.trustedDevices} devices
                </p>
              </div>
              <Button variant="outline" size="sm">
                Manage
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Accounts */}
      <SocialAccountsManager />

      {/* Trusted Devices */}
      <TrustedDevices 
        onDeviceRemoved={() => {
          // If current device is removed, redirect to login
          router.push('/login')
        }}
      />

      {/* Login History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary-600" />
            <CardTitle>Recent Login Activity</CardTitle>
          </div>
          <CardDescription>
            Review recent sign-ins to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {securitySettings.loginHistory.map((login, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{login.device}</p>
                  <p className="text-xs text-muted-foreground">{login.location}</p>
                </div>
                <p className="text-xs text-muted-foreground">{login.date}</p>
              </div>
            ))}
            <Button variant="link" className="p-0 h-auto">
              View full history
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Setup Modal */}
      {showSetup && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <CardContent className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <TwoFactorSetup
              onSetup={handleEnable2FA}
              onCancel={() => setShowSetup(false)}
              availableMethods={['sms', 'email', 'totp']}
            />
          </CardContent>
        </Card>
      )}

      {/* Verification Modal */}
      <TwoFactorAuth
        isOpen={show2FAVerification}
        onClose={() => setShow2FAVerification(false)}
        onVerify={handleVerify2FA}
        method={selectedMethod}
        phoneNumber="+1 (555) ***-**67"
        email="user@example.com"
        onResend={async () => {
          // Mock resend
          }}
      />
    </div>
  )
}