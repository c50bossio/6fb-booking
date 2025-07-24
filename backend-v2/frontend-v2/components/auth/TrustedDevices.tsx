'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Smartphone,
  Monitor,
  Shield,
  Trash2,
  AlertTriangle,
  Check,
  Info
} from 'lucide-react'
import {
  DeviceFingerprint,
  getTrustedDevicesList,
  untrustDevice,
  isCurrentDevice,
  generateDeviceFingerprint
} from '@/lib/device-fingerprint'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

interface TrustedDevicesProps {
  onDeviceRemoved?: () => void
}

export function TrustedDevices({ onDeviceRemoved }: TrustedDevicesProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [devices, setDevices] = useState<DeviceFingerprint[]>([])
  const [loading, setLoading] = useState(true)
  const [removingDevice, setRemovingDevice] = useState<string | null>(null)

  useEffect(() => {
    loadDevices()
  }, [user])

  const loadDevices = async () => {
    if (!user) return
    
    try {
      const deviceList = await getTrustedDevicesList(String(user.id))
      setDevices(deviceList)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to load devices',
        description: 'Unable to retrieve your trusted devices.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveDevice = async (deviceId: string) => {
    if (!user) return
    
    const device = devices.find(d => d.id === deviceId)
    if (!device) return
    
    if (device.isCurrent) {
      if (!confirm('This will sign you out from the current device. Continue?')) {
        return
      }
    }
    
    setRemovingDevice(deviceId)
    try {
      await untrustDevice(String(user.id), deviceId)
      setDevices(devices.filter(d => d.id !== deviceId))
      
      toast({
        title: 'Device removed',
        description: `${device.name} has been removed from trusted devices.`
      })
      
      if (device.isCurrent) {
        // Sign out if removing current device
        onDeviceRemoved?.()
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to remove device',
        description: 'Please try again later.'
      })
    } finally {
      setRemovingDevice(null)
    }
  }

  const getDeviceIcon = (device: DeviceFingerprint) => {
    if (device.name.includes('Mobile')) {
      return <Smartphone className="h-5 w-5" />
    }
    return <Monitor className="h-5 w-5" />
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center text-muted-foreground">
            Loading trusted devices...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-600" />
            <CardTitle>Trusted Devices</CardTitle>
          </div>
          <Badge variant="secondary">{devices.length} devices</Badge>
        </div>
        <CardDescription>
          Manage devices that can access your account without re-authentication
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {devices.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No trusted devices found. Enable "Remember me" when signing in to trust a device.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Trusted devices can access your account for 30 days without entering your password.
                Remove any devices you don't recognize.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
                      {getDeviceIcon(device)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{device.name}</p>
                        {device.isCurrent && (
                          <Badge variant="success" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Last active: {device.lastSeen.toLocaleDateString()}
                      </p>
                      {device.location && (
                        <p className="text-xs text-muted-foreground">
                          {device.location}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant={device.isCurrent ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => handleRemoveDevice(device.id)}
                    disabled={removingDevice === device.id}
                  >
                    {removingDevice === device.id ? (
                      'Removing...'
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
            
            {devices.some(d => !d.isCurrent) && (
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Remove any devices you don't recognize to keep your account secure.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}