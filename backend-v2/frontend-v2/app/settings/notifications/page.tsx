'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import {
  Bell,
  Mail,
  MessageSquare,
  Calendar,
  CreditCard,
  Save,
  Settings,
  Smartphone,
  Info,
  ArrowRight
} from 'lucide-react'

export default function NotificationsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    
    // Email preferences
    appointmentReminders: true,
    appointmentConfirmations: true,
    cancellations: true,
    newBookings: true,
    paymentConfirmations: true,
    marketingEmails: false,
    systemUpdates: true,
    
    // SMS preferences
    smsReminders: false,
    smsConfirmations: false,
    
    // Push preferences
    browserNotifications: true,
    desktopNotifications: true,
    
    // Timing
    reminderTiming: '24', // hours before
    quietHours: false,
    quietStart: '22:00',
    quietEnd: '08:00'
  })

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // In a real app, this would save to the API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: 'Notification settings saved',
        description: 'Your preferences have been updated successfully.'
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to save settings',
        description: 'Please try again later.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Control how and when you receive notifications
          </p>
        </div>
        <Button onClick={handleSave} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Enhanced Features Banner */}
      <Alert className="border-teal-200 bg-teal-50 dark:bg-teal-900/20">
        <Info className="h-4 w-4 text-teal-600" />
        <AlertDescription className="text-teal-700 dark:text-teal-400">
          For advanced notification management including custom templates, automation rules, 
          and detailed delivery tracking, visit our enhanced notifications dashboard.
        </AlertDescription>
        <Button 
          className="mt-3 bg-teal-600 hover:bg-teal-700 text-white"
          onClick={() => window.open('/(auth)/settings/notifications', '_blank')}
        >
          Access Enhanced Dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Alert>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary-600" />
            <CardTitle>Notification Channels</CardTitle>
          </div>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-blue-600" />
              <div>
                <Label className="font-medium">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications via email</p>
              </div>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-5 w-5 text-green-600" />
              <div>
                <Label className="font-medium">SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive text messages on your phone</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">Premium</Badge>
              <Switch
                checked={settings.smsNotifications}
                onCheckedChange={(checked) => updateSetting('smsNotifications', checked)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Smartphone className="h-5 w-5 text-purple-600" />
              <div>
                <Label className="font-medium">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Browser and desktop notifications</p>
              </div>
            </div>
            <Switch
              checked={settings.pushNotifications}
              onCheckedChange={(checked) => updateSetting('pushNotifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Preferences */}
      {settings.emailNotifications && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <CardTitle>Email Preferences</CardTitle>
            </div>
            <CardDescription>
              Choose which email notifications to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Appointment Reminders</Label>
                  <p className="text-sm text-muted-foreground">Before upcoming appointments</p>
                </div>
                <Switch
                  checked={settings.appointmentReminders}
                  onCheckedChange={(checked) => updateSetting('appointmentReminders', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Booking Confirmations</Label>
                  <p className="text-sm text-muted-foreground">When appointments are booked</p>
                </div>
                <Switch
                  checked={settings.appointmentConfirmations}
                  onCheckedChange={(checked) => updateSetting('appointmentConfirmations', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>New Bookings</Label>
                  <p className="text-sm text-muted-foreground">When clients book with you</p>
                </div>
                <Switch
                  checked={settings.newBookings}
                  onCheckedChange={(checked) => updateSetting('newBookings', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Cancellations</Label>
                  <p className="text-sm text-muted-foreground">When appointments are canceled</p>
                </div>
                <Switch
                  checked={settings.cancellations}
                  onCheckedChange={(checked) => updateSetting('cancellations', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Payment Confirmations</Label>
                  <p className="text-sm text-muted-foreground">When payments are processed</p>
                </div>
                <Switch
                  checked={settings.paymentConfirmations}
                  onCheckedChange={(checked) => updateSetting('paymentConfirmations', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>System Updates</Label>
                  <p className="text-sm text-muted-foreground">Important platform updates</p>
                </div>
                <Switch
                  checked={settings.systemUpdates}
                  onCheckedChange={(checked) => updateSetting('systemUpdates', checked)}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Marketing Emails</Label>
                  <p className="text-sm text-muted-foreground">Tips, features, and promotions</p>
                </div>
                <Switch
                  checked={settings.marketingEmails}
                  onCheckedChange={(checked) => updateSetting('marketingEmails', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timing Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary-600" />
            <CardTitle>Timing & Schedule</CardTitle>
          </div>
          <CardDescription>
            Configure when and how often you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Appointment reminder timing</Label>
            <Select
              value={settings.reminderTiming}
              onValueChange={(value) => updateSetting('reminderTiming', value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hour before</SelectItem>
                <SelectItem value="2">2 hours before</SelectItem>
                <SelectItem value="4">4 hours before</SelectItem>
                <SelectItem value="12">12 hours before</SelectItem>
                <SelectItem value="24">24 hours before</SelectItem>
                <SelectItem value="48">2 days before</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Quiet hours</Label>
              <p className="text-sm text-muted-foreground">
                Don't send notifications during specified hours
              </p>
            </div>
            <Switch
              checked={settings.quietHours}
              onCheckedChange={(checked) => updateSetting('quietHours', checked)}
            />
          </div>

          {settings.quietHours && (
            <div className="grid grid-cols-2 gap-4 pl-6">
              <div className="space-y-2">
                <Label>Quiet start</Label>
                <Select
                  value={settings.quietStart}
                  onValueChange={(value) => updateSetting('quietStart', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20:00">8:00 PM</SelectItem>
                    <SelectItem value="21:00">9:00 PM</SelectItem>
                    <SelectItem value="22:00">10:00 PM</SelectItem>
                    <SelectItem value="23:00">11:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quiet end</Label>
                <Select
                  value={settings.quietEnd}
                  onValueChange={(value) => updateSetting('quietEnd', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="06:00">6:00 AM</SelectItem>
                    <SelectItem value="07:00">7:00 AM</SelectItem>
                    <SelectItem value="08:00">8:00 AM</SelectItem>
                    <SelectItem value="09:00">9:00 AM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}