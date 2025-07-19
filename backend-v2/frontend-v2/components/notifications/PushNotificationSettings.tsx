'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Bell,
  BellOff,
  Calendar,
  DollarSign,
  Mail,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  Smartphone
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import {
  isPushNotificationSupported,
  getNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isSubscribedToPushNotifications,
  updateNotificationPreferences,
  getNotificationPreferences,
  showLocalNotification,
  notificationTemplates
} from '@/lib/push-notifications'

interface NotificationPreferences {
  appointments: boolean
  bookings: boolean
  payments: boolean
  marketing: boolean
  reminders: boolean
}

export function PushNotificationSettings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    appointments: true,
    bookings: true,
    payments: true,
    marketing: false,
    reminders: true
  })

  useEffect(() => {
    checkNotificationStatus()
  }, [user])

  const checkNotificationStatus = async () => {
    setIsLoading(true)
    try {
      // Check if supported
      const supported = isPushNotificationSupported()
      setIsSupported(supported)

      if (supported) {
        // Check permission
        const perm = getNotificationPermission()
        setPermission(perm)

        // Check subscription
        const subscribed = await isSubscribedToPushNotifications()
        setIsSubscribed(subscribed)

        // Load preferences if user is logged in
        if (user && subscribed) {
          const prefs = await getNotificationPreferences(user.id)
          setPreferences(prefs)
        }
      }
    } catch (error) {
      } finally {
      setIsLoading(false)
    }
  }

  const handleEnableNotifications = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication required',
        description: 'Please log in to enable push notifications.'
      })
      return
    }

    setIsLoading(true)
    try {
      const subscription = await subscribeToPushNotifications(user.id)
      if (subscription) {
        setIsSubscribed(true)
        setPermission('granted')
        toast({
          title: 'Notifications enabled',
          description: 'You will now receive push notifications.'
        })

        // Send test notification
        showLocalNotification({
          title: 'Welcome to BookedBarber!',
          body: 'Push notifications are now enabled. You\'ll receive updates about your appointments.',
          icon: '/icon?size=192'
        })
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to enable notifications',
        description: error.message || 'Please try again later.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisableNotifications = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      await unsubscribeFromPushNotifications(user.id)
      setIsSubscribed(false)
      toast({
        title: 'Notifications disabled',
        description: 'You will no longer receive push notifications.'
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to disable notifications',
        description: 'Please try again later.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePreferenceChange = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user) return

    const newPreferences = { ...preferences, [key]: value }
    setPreferences(newPreferences)

    setIsSaving(true)
    try {
      await updateNotificationPreferences(user.id, newPreferences)
      toast({
        title: 'Preferences updated',
        description: 'Your notification preferences have been saved.'
      })
    } catch (error) {
      // Revert on error
      setPreferences(preferences)
      toast({
        variant: 'destructive',
        title: 'Failed to update preferences',
        description: 'Please try again later.'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const sendTestNotification = () => {
    const testNotification = notificationTemplates.appointmentReminder(
      '2:00 PM',
      'John Doe'
    )
    showLocalNotification(testNotification)
    toast({
      title: 'Test notification sent',
      description: 'Check your notifications.'
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Loading notification settings...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
          <CardDescription>
            Real-time updates about your appointments and business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Push notifications are not supported in your browser. Try using a modern browser like Chrome, Firefox, or Safari.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary-600" />
            <CardTitle>Push Notifications</CardTitle>
          </div>
          <Badge variant={isSubscribed ? 'success' : 'secondary'}>
            {isSubscribed ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
        <CardDescription>
          Get instant updates about appointments, bookings, and payments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Section */}
        <div className="space-y-4">
          {permission === 'denied' ? (
            <Alert variant="destructive">
              <BellOff className="h-4 w-4" />
              <AlertDescription>
                Notifications are blocked in your browser. Please enable them in your browser settings to receive updates.
              </AlertDescription>
            </Alert>
          ) : isSubscribed ? (
            <>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Push notifications are active. You'll receive updates based on your preferences below.
                </AlertDescription>
              </Alert>
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={sendTestNotification}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Send Test Notification
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDisableNotifications}
                  disabled={isLoading}
                >
                  <BellOff className="h-4 w-4 mr-2" />
                  Disable Notifications
                </Button>
              </div>
            </>
          ) : (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Enable push notifications to receive instant updates about your appointments, new bookings, and payments.
                </AlertDescription>
              </Alert>
              <Button
                onClick={handleEnableNotifications}
                disabled={isLoading}
                className="w-full"
              >
                <Bell className="h-4 w-4 mr-2" />
                Enable Push Notifications
              </Button>
            </>
          )}
        </div>

        {/* Notification Preferences */}
        {isSubscribed && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium text-sm">Notification Preferences</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="appointments">Appointment Updates</Label>
                    <p className="text-xs text-muted-foreground">
                      New bookings, cancellations, and changes
                    </p>
                  </div>
                </div>
                <Switch
                  id="appointments"
                  checked={preferences.appointments}
                  onCheckedChange={(checked) => handlePreferenceChange('appointments', checked)}
                  disabled={isSaving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="reminders">Appointment Reminders</Label>
                    <p className="text-xs text-muted-foreground">
                      30 minutes before appointments
                    </p>
                  </div>
                </div>
                <Switch
                  id="reminders"
                  checked={preferences.reminders}
                  onCheckedChange={(checked) => handlePreferenceChange('reminders', checked)}
                  disabled={isSaving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="payments">Payment Notifications</Label>
                    <p className="text-xs text-muted-foreground">
                      Payment confirmations and payouts
                    </p>
                  </div>
                </div>
                <Switch
                  id="payments"
                  checked={preferences.payments}
                  onCheckedChange={(checked) => handlePreferenceChange('payments', checked)}
                  disabled={isSaving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="marketing">Marketing Updates</Label>
                    <p className="text-xs text-muted-foreground">
                      Promotions and special offers
                    </p>
                  </div>
                </div>
                <Switch
                  id="marketing"
                  checked={preferences.marketing}
                  onCheckedChange={(checked) => handlePreferenceChange('marketing', checked)}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>
        )}

        {/* Device Info */}
        {isSubscribed && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Smartphone className="h-4 w-4" />
              <span>Notifications enabled on this device</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}