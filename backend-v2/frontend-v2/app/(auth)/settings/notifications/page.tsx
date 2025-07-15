'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from "@/components/ui/Label"
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/Button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/components/ui/use-toast'
import { getProfile, updateNotificationPreferences, type User } from '@/lib/api'
import { Loader2 } from 'lucide-react'

interface NotificationSettings {
  emailNotifications: boolean
  smsNotifications: boolean
  appointmentReminders: boolean
  marketingEmails: boolean
  reminderTiming: string
}

export default function NotificationsSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: true,
    appointmentReminders: true,
    marketingEmails: false,
    reminderTiming: '24'
  })

  useEffect(() => {
    loadUserSettings()
  }, [])

  const loadUserSettings = async () => {
    try {
      const profile = await getProfile()
      setUser(profile)
      
      // Load notification preferences from user profile
      // Note: notification_preferences will be loaded separately when backend is ready
      setSettings({
        emailNotifications: true,
        smsNotifications: true,
        appointmentReminders: true,
        marketingEmails: false,
        reminderTiming: '24'
      })
    } catch (error) {
      console.error('Failed to load notification settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load notification settings',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateNotificationPreferences({
        email_enabled: settings.emailNotifications,
        sms_enabled: settings.smsNotifications,
        email_appointment_reminder: settings.appointmentReminders,
        sms_appointment_reminder: settings.appointmentReminders,
        reminder_hours: [parseInt(settings.reminderTiming)]
      })
      
      toast({
        title: 'Success',
        description: 'Notification settings updated successfully'
      })
    } catch (error) {
      console.error('Failed to save notification settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to save notification settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notification Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage how you receive notifications and reminders
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Communication Preferences</CardTitle>
          <CardDescription>
            Choose how you want to be notified about appointments and updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, emailNotifications: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sms-notifications">SMS Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications via text message
              </p>
            </div>
            <Switch
              id="sms-notifications"
              checked={settings.smsNotifications}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, smsNotifications: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="appointment-reminders">Appointment Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Get reminded about upcoming appointments
              </p>
            </div>
            <Switch
              id="appointment-reminders"
              checked={settings.appointmentReminders}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, appointmentReminders: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="marketing-emails">Marketing Communications</Label>
              <p className="text-sm text-muted-foreground">
                Receive promotional offers and updates
              </p>
            </div>
            <Switch
              id="marketing-emails"
              checked={settings.marketingEmails}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, marketingEmails: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reminder Timing</CardTitle>
          <CardDescription>
            Choose when to receive appointment reminders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={settings.reminderTiming}
            onChange={(value) => 
              setSettings({ ...settings, reminderTiming: value })
            }
          >
            <RadioGroupItem value="1">1 hour before</RadioGroupItem>
            <RadioGroupItem value="2">2 hours before</RadioGroupItem>
            <RadioGroupItem value="24">24 hours before</RadioGroupItem>
            <RadioGroupItem value="48">48 hours before</RadioGroupItem>
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  )
}