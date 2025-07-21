'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Shield,
  Eye,
  EyeOff,
  Download,
  Trash2,
  AlertTriangle,
  Info,
  Save,
  ArrowRight,
  FileText,
  Database,
  UserX,
  Clock
} from 'lucide-react'

export default function PrivacyPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  const [settings, setSettings] = useState({
    profileVisibility: 'public',
    showBookingHistory: true,
    showReviews: true,
    allowAnalytics: true,
    allowMarketingCookies: false,
    allowPerformanceCookies: true,
    dataRetention: '2years',
    automaticDeletion: false,
    consentGiven: true,
    marketingEmails: false
  })

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // In a real app, this would save to the API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: 'Privacy settings saved',
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

  const handleDataExport = () => {
    toast({
      title: 'Data export requested',
      description: 'You will receive an email with your data within 30 days as required by GDPR.'
    })
  }

  const handleAccountDeletion = () => {
    toast({
      title: 'Account deletion requested',
      description: 'Please contact support to confirm account deletion. This action cannot be undone.',
      variant: 'destructive'
    })
  }

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Privacy Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Control your data privacy and GDPR compliance settings
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
        <AlertTitle className="text-teal-800 dark:text-teal-300">Enhanced Privacy Dashboard</AlertTitle>
        <AlertDescription className="text-teal-700 dark:text-teal-400">
          For comprehensive privacy management with audit logs, consent tracking, 
          and advanced GDPR compliance tools, access our enhanced privacy dashboard.
        </AlertDescription>
        <Button 
          className="mt-3 bg-teal-600 hover:bg-teal-700 text-white"
          onClick={() => window.open('/(auth)/settings/privacy', '_blank')}
        >
          Access Enhanced Dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Alert>

      {/* Profile Privacy */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary-600" />
            <CardTitle>Profile Visibility</CardTitle>
          </div>
          <CardDescription>
            Control who can see your profile and booking information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Show booking history</Label>
              <p className="text-sm text-muted-foreground">Allow clients to see past appointments</p>
            </div>
            <Switch
              checked={settings.showBookingHistory}
              onCheckedChange={(checked) => updateSetting('showBookingHistory', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Show reviews and ratings</Label>
              <p className="text-sm text-muted-foreground">Display client reviews publicly</p>
            </div>
            <Switch
              checked={settings.showReviews}
              onCheckedChange={(checked) => updateSetting('showReviews', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Cookie & Tracking Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary-600" />
            <CardTitle>Cookie & Tracking Preferences</CardTitle>
          </div>
          <CardDescription>
            Manage how we collect and use your data for analytics and marketing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Analytics cookies</Label>
              <p className="text-sm text-muted-foreground">Help us understand how you use the platform</p>
            </div>
            <Switch
              checked={settings.allowAnalytics}
              onCheckedChange={(checked) => updateSetting('allowAnalytics', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Performance cookies</Label>
              <p className="text-sm text-muted-foreground">Improve app performance and loading speed</p>
            </div>
            <Switch
              checked={settings.allowPerformanceCookies}
              onCheckedChange={(checked) => updateSetting('allowPerformanceCookies', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Marketing cookies</Label>
              <p className="text-sm text-muted-foreground">Personalize ads and marketing content</p>
            </div>
            <Switch
              checked={settings.allowMarketingCookies}
              onCheckedChange={(checked) => updateSetting('allowMarketingCookies', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary-600" />
            <CardTitle>Data Retention</CardTitle>
          </div>
          <CardDescription>
            Control how long we keep your personal data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Automatic data deletion</Label>
              <p className="text-sm text-muted-foreground">Automatically delete old data after retention period</p>
            </div>
            <Switch
              checked={settings.automaticDeletion}
              onCheckedChange={(checked) => updateSetting('automaticDeletion', checked)}
            />
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Current retention period</p>
            <Badge variant="outline" className="mb-2">
              2 years from last activity
            </Badge>
            <p className="text-xs text-muted-foreground">
              Data is automatically deleted after 2 years of inactivity as required by GDPR
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data Rights (GDPR) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-600" />
            <CardTitle>Your Data Rights (GDPR)</CardTitle>
          </div>
          <CardDescription>
            Exercise your rights under GDPR and other privacy regulations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={handleDataExport}
              className="h-auto p-4 flex flex-col items-start space-y-2"
            >
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                <span className="font-medium">Export My Data</span>
              </div>
              <p className="text-xs text-muted-foreground text-left">
                Download all your personal data in a portable format
              </p>
            </Button>

            <Button
              variant="outline"
              onClick={() => window.open('/support', '_blank')}
              className="h-auto p-4 flex flex-col items-start space-y-2"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="font-medium">Request Data Correction</span>
              </div>
              <p className="text-xs text-muted-foreground text-left">
                Update or correct your personal information
              </p>
            </Button>
          </div>

          <Alert variant="destructive" className="mt-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Delete Account</AlertTitle>
            <AlertDescription>
              Permanently delete your account and all associated data. This action cannot be undone.
            </AlertDescription>
            <Button
              variant="destructive"
              onClick={handleAccountDeletion}
              className="mt-3"
            >
              <UserX className="h-4 w-4 mr-2" />
              Request Account Deletion
            </Button>
          </Alert>
        </CardContent>
      </Card>

      {/* Compliance Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            <CardTitle>Compliance Status</CardTitle>
          </div>
          <CardDescription>
            Your current privacy and compliance status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">GDPR Compliance</span>
            <Badge variant="success">Compliant</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">CCPA Compliance</span>
            <Badge variant="success">Compliant</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Data Encryption</span>
            <Badge variant="success">Active</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Consent Status</span>
            <Badge variant={settings.consentGiven ? "success" : "destructive"}>
              {settings.consentGiven ? 'Given' : 'Pending'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Policy */}
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertTitle>Privacy Policy & Terms</AlertTitle>
        <AlertDescription>
          Review our privacy policy and terms of service to understand how we protect your data.
          Last updated: March 2024
        </AlertDescription>
        <div className="flex gap-2 mt-3">
          <Button variant="outline" size="sm" onClick={() => window.open('/privacy', '_blank')}>
            Privacy Policy
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open('/terms', '_blank')}>
            Terms of Service
          </Button>
        </div>
      </Alert>
    </div>
  )
}