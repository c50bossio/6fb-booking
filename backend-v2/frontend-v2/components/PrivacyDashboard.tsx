'use client'

import React, { useState } from 'react'
import { format } from 'date-fns'
import { 
  Shield, 
  Download, 
  Trash2, 
  Settings, 
  Eye, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ConfirmationDialog } from '@/components/ui/dialog'
import useCookieConsent, { type CookieCategories, type ConsentPreferences } from '@/hooks/useCookieConsent'
import { initializeScripts } from '@/lib/scriptLoader'

interface PrivacyDashboardProps {
  className?: string
}

const PrivacyDashboard: React.FC<PrivacyDashboardProps> = ({ className }) => {
  const {
    preferences,
    isLoading,
    isSaving,
    updateConsent,
    resetConsent,
    getConsentHistory,
    hasConsent,
  } = useCookieConsent()

  const [tempCategories, setTempCategories] = useState<CookieCategories>(preferences.categories)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const consentHistory = getConsentHistory()

  const handleCategoryChange = (category: keyof CookieCategories, enabled: boolean) => {
    setTempCategories(prev => ({
      ...prev,
      [category]: category === 'necessary' ? true : enabled,
    }))
  }

  const handleSavePreferences = async () => {
    await updateConsent(tempCategories)
  }

  const handleResetConsent = async () => {
    resetConsent()
    setShowResetDialog(false)
  }

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      // Create data export
      const exportData = {
        timestamp: new Date().toISOString(),
        currentPreferences: preferences,
        consentHistory: consentHistory,
        metadata: {
          browser: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
        }
      }

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `privacy-data-${format(new Date(), 'yyyy-MM-dd')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting data:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      // Call backend API to initiate account deletion
      const response = await fetch('/api/v2/privacy/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (response.ok) {
        // Account deletion initiated
        alert('Account deletion request submitted. You will receive an email with further instructions.')
        setShowDeleteDialog(false)
      } else {
        throw new Error('Failed to submit deletion request')
      }
    } catch (error) {
      console.error('Error requesting account deletion:', error)
      alert('Failed to submit deletion request. Please contact support.')
    } finally {
      setIsDeleting(false)
    }
  }

  const categoryInfo = {
    necessary: {
      title: 'Necessary Cookies',
      description: 'Essential for the website to function properly',
      icon: Shield,
      canDisable: false,
    },
    analytics: {
      title: 'Analytics Cookies', 
      description: 'Help us understand how visitors use our website',
      icon: Eye,
      canDisable: true,
    },
    marketing: {
      title: 'Marketing Cookies',
      description: 'Used to show you relevant ads and measure campaigns',
      icon: RefreshCw,
      canDisable: true,
    },
    functional: {
      title: 'Functional Cookies',
      description: 'Enable enhanced functionality and personalization',
      icon: Settings,
      canDisable: true,
    },
  }

  const hasUnsavedChanges = JSON.stringify(tempCategories) !== JSON.stringify(preferences.categories)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading privacy settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Privacy Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage your privacy settings and data preferences
          </p>
        </div>

        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy Status
            </CardTitle>
            <CardDescription>
              Your current privacy and cookie preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Object.entries(categoryInfo).map(([key, info]) => {
                const Icon = info.icon
                const enabled = preferences.categories[key as keyof CookieCategories]
                
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{info.title}</div>
                      <div className={`text-xs flex items-center gap-1 ${enabled ? 'text-green-600' : 'text-gray-500'}`}>
                        {enabled ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Enabled
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            Disabled
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {preferences.hasConsented && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium text-foreground">Consent Details</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Last updated: {format(new Date(preferences.consentDate), 'PPpp')}
                </div>
                <div className="text-xs text-muted-foreground">
                  Version: {preferences.version}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cookie Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Cookie Preferences
            </CardTitle>
            <CardDescription>
              Control which cookies and tracking technologies we use
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(categoryInfo).map(([key, info]) => {
              const Icon = info.icon
              const enabled = tempCategories[key as keyof CookieCategories]
              
              return (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{info.title}</div>
                      <div className="text-sm text-muted-foreground">{info.description}</div>
                    </div>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => handleCategoryChange(key as keyof CookieCategories, checked)}
                    disabled={!info.canDisable}
                  />
                </div>
              )
            })}

            {hasUnsavedChanges && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You have unsaved changes to your privacy preferences.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleSavePreferences}
                disabled={!hasUnsavedChanges || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setTempCategories(preferences.categories)}
                disabled={!hasUnsavedChanges}
              >
                Reset Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Consent History */}
        {consentHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Consent History
              </CardTitle>
              <CardDescription>
                Your previous privacy preference changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {consentHistory.slice(0, 5).map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="text-sm font-medium">
                        {format(new Date(entry.consentDate), 'PPp')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Analytics: {entry.categories.analytics ? 'Enabled' : 'Disabled'} • 
                        Marketing: {entry.categories.marketing ? 'Enabled' : 'Disabled'} • 
                        Functional: {entry.categories.functional ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      v{entry.version}
                    </div>
                  </div>
                ))}
                
                {consentHistory.length > 5 && (
                  <div className="text-xs text-muted-foreground text-center">
                    ...and {consentHistory.length - 5} more entries
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Data Management
            </CardTitle>
            <CardDescription>
              Export or delete your personal data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Export Your Data</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Download a copy of your privacy preferences and consent history.
                </p>
                <Button
                  variant="outline"
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Exporting...' : 'Export Data'}
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Reset Consent</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Clear all your consent preferences and start fresh.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowResetDialog(true)}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Consent
                </Button>
              </div>
            </div>

            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <h4 className="font-medium mb-2 text-red-800">Delete Account</h4>
              <p className="text-sm text-red-700 mb-3">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Request Account Deletion
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Legal Links */}
        <Card>
          <CardHeader>
            <CardTitle>Legal Information</CardTitle>
            <CardDescription>
              Review our privacy policies and terms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-3">
              <Button variant="outline" asChild>
                <a href="/privacy" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/cookies" target="_blank" rel="noopener noreferrer">
                  Cookie Policy
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/terms" target="_blank" rel="noopener noreferrer">
                  Terms of Service
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reset Consent Dialog */}
      <ConfirmationDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        title="Reset Privacy Consent"
        description="This will clear all your privacy preferences and show the cookie banner again. You'll need to set your preferences from scratch."
        confirmText="Reset Consent"
        cancelText="Cancel"
        onConfirm={handleResetConsent}
        variant="default"
      />

      {/* Delete Account Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Account"
        description="This will permanently delete your account and all associated data. This action cannot be undone. You will receive an email with instructions to complete the deletion process."
        confirmText="Request Deletion"
        cancelText="Cancel"
        onConfirm={handleDeleteAccount}
        variant="destructive"
        loading={isDeleting}
      />
    </div>
  )
}

export default PrivacyDashboard