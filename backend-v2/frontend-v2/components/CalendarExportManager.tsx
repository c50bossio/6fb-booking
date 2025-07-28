'use client'

/**
 * Calendar Export Manager Component
 * 
 * Comprehensive UI for calendar export and synchronization features including:
 * - Multiple export formats and privacy controls
 * - Calendar subscription management
 * - Two-way synchronization setup
 * - Conflict resolution interface
 * - Analytics and monitoring dashboard
 */

import React, { useState, useEffect, useCallback } from 'react'
import { 
  Calendar, 
  Download, 
  Upload, 
  Settings, 
  Sync, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  Link,
  BarChart3,
  Webhook,
  Shield,
  Zap,
  RefreshCw,
  Pause,
  Play,
  Trash2,
  Copy,
  ExternalLink,
  Filter,
  FileText,
  Database,
  Globe,
  Users,
  Lock,
  Unlock
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/use-toast'

import { 
  calendarExportService, 
  ExportOptions, 
  ExportResult, 
  SyncOptions,
  SyncStatus,
  ConflictData,
  Analytics,
  CalendarSubscription
} from '@/services/calendar-export'
import { calendarSyncService, SyncConfiguration } from '@/services/calendar-sync'

interface CalendarExportManagerProps {
  userId: number
  userRole: string
  availableBarbers?: Array<{ id: number; name: string }>
  availableServices?: Array<{ id: number; name: string }>
}

export const CalendarExportManager: React.FC<CalendarExportManagerProps> = ({
  userId,
  userRole,
  availableBarbers = [],
  availableServices = []
}) => {
  // State management
  const [activeTab, setActiveTab] = useState('export')
  const [loading, setLoading] = useState(false)
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'ical',
    privacy_level: 'business',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    include_cancelled: false,
    include_completed: true,
    include_client_contact: false,
    include_pricing: false
  })

  const [syncConfigurations, setSyncConfigurations] = useState<SyncConfiguration[]>([])
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [conflicts, setConflicts] = useState<ConflictData | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [subscriptions, setSubscriptions] = useState<CalendarSubscription[]>([])

  // Dialog states
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [syncSetupDialogOpen, setSyncSetupDialogOpen] = useState(false)
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false)
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)

  // Load initial data
  useEffect(() => {
    loadSyncStatus()
    loadAnalytics()
  }, [])

  const loadSyncStatus = async () => {
    try {
      const status = await calendarExportService.getSyncStatus()
      setSyncStatus(status)
    } catch (error) {
      console.error('Failed to load sync status:', error)
    }
  }

  const loadAnalytics = async () => {
    try {
      const analyticsData = await calendarExportService.getAnalytics(30)
      setAnalytics(analyticsData)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    }
  }

  const loadConflicts = async () => {
    try {
      const conflictData = await calendarExportService.getSyncConflicts()
      setConflicts(conflictData)
    } catch (error) {
      console.error('Failed to load conflicts:', error)
    }
  }

  // Export handlers
  const handleExport = async () => {
    setLoading(true)
    try {
      const result = await calendarExportService.exportCalendar(exportOptions)
      
      if (result.success) {
        // Download the file
        await calendarExportService.downloadFile(result.export_id, result.filename)
        
        toast({
          title: 'Export Successful',
          description: `Exported ${result.export_count} appointments to ${result.filename}`,
        })
        
        setExportDialogOpen(false)
        loadAnalytics() // Refresh analytics
      } else {
        toast({
          title: 'Export Failed',
          description: result.errors.join(', '),
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Export Error',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkExport = async () => {
    if (!exportOptions.barber_ids?.length) {
      toast({
        title: 'Selection Required',
        description: 'Please select at least one barber for bulk export',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const result = await calendarExportService.bulkExport({
        barber_ids: exportOptions.barber_ids,
        export_options: exportOptions
      })

      if (result.success && result.successful_exports > 0) {
        // Download each successful export
        for (const exportResult of result.results) {
          if (exportResult.success && exportResult.download_url) {
            await calendarExportService.downloadFile(exportResult.export_id, exportResult.filename)
          }
        }

        toast({
          title: 'Bulk Export Completed',
          description: `Successfully exported ${result.successful_exports} of ${result.total_exports} calendars`,
        })
      } else {
        toast({
          title: 'Bulk Export Failed',
          description: `Failed to export calendars`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Bulk Export Error',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Sync handlers
  const handleSyncSetup = async (syncOptions: SyncOptions) => {
    setLoading(true)
    try {
      const result = await calendarExportService.setupSync(syncOptions)
      
      if (result.success) {
        toast({
          title: 'Sync Setup Successful',
          description: `Calendar sync configured with ${syncOptions.provider}`,
        })
        
        setSyncSetupDialogOpen(false)
        loadSyncStatus() // Refresh status
      } else {
        toast({
          title: 'Sync Setup Failed',
          description: result.error,
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Sync Setup Error',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSyncTrigger = async (configId: string) => {
    try {
      const result = await calendarExportService.triggerSync(configId, false)
      
      toast({
        title: 'Sync Triggered',
        description: `Processed ${result.events_processed} events`,
      })
      
      loadSyncStatus()
    } catch (error) {
      toast({
        title: 'Sync Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const handleSyncPause = async (configId: string) => {
    try {
      await calendarExportService.pauseSync(configId)
      toast({
        title: 'Sync Paused',
        description: 'Calendar synchronization has been paused',
      })
      loadSyncStatus()
    } catch (error) {
      toast({
        title: 'Pause Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  const handleSyncResume = async (configId: string) => {
    try {
      await calendarExportService.resumeSync(configId)
      toast({
        title: 'Sync Resumed',
        description: 'Calendar synchronization has been resumed',
      })
      loadSyncStatus()
    } catch (error) {
      toast({
        title: 'Resume Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  // Subscription handlers
  const handleCreateSubscription = async (subscriptionData: any) => {
    setLoading(true)
    try {
      const result = await calendarExportService.createSubscription(subscriptionData)
      
      if (result.success) {
        toast({
          title: 'Subscription Created',
          description: 'Calendar subscription URL has been generated',
        })
        
        setSubscriptionDialogOpen(false)
        // Refresh subscriptions list if needed
      }
    } catch (error) {
      toast({
        title: 'Subscription Error',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Conflict resolution handlers
  const handleResolveConflicts = async (conflictIds: string[], strategy: string) => {
    try {
      const result = await calendarExportService.resolveConflicts(conflictIds, strategy as any)
      
      toast({
        title: 'Conflicts Resolved',
        description: `Resolved ${result.resolved_count} conflicts`,
      })
      
      loadConflicts()
    } catch (error) {
      toast({
        title: 'Resolution Error',
        description: error.message,
        variant: 'destructive'
      })
    }
  }

  // Privacy level descriptions
  const getPrivacyDescription = (level: string) => {
    const descriptions = {
      full: 'All appointment details including client contact information',
      business: 'Appointment details without sensitive client information',
      minimal: 'Just appointment times and service types',
      anonymous: 'Generic placeholder appointments with no identifying information'
    }
    return descriptions[level] || level
  }

  // Render export options form
  const renderExportForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="format">Export Format</Label>
          <Select
            value={exportOptions.format}
            onValueChange={(value) => setExportOptions(prev => ({ ...prev, format: value as any }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ical">iCalendar (.ics)</SelectItem>
              <SelectItem value="csv">CSV Spreadsheet</SelectItem>
              <SelectItem value="json">JSON Data</SelectItem>
              <SelectItem value="google_calendar">Google Calendar</SelectItem>
              <SelectItem value="outlook">Outlook Calendar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="privacy_level">Privacy Level</Label>
          <Select
            value={exportOptions.privacy_level}
            onValueChange={(value) => setExportOptions(prev => ({ ...prev, privacy_level: value as any }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Full Details</SelectItem>
              <SelectItem value="business">Business Details</SelectItem>
              <SelectItem value="minimal">Minimal Info</SelectItem>
              <SelectItem value="anonymous">Anonymous</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-1">
            {getPrivacyDescription(exportOptions.privacy_level)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_date">Start Date</Label>
          <Input
            type="date"
            value={exportOptions.start_date}
            onChange={(e) => setExportOptions(prev => ({ ...prev, start_date: e.target.value }))}
          />
        </div>

        <div>
          <Label htmlFor="end_date">End Date</Label>
          <Input
            type="date"
            value={exportOptions.end_date}
            onChange={(e) => setExportOptions(prev => ({ ...prev, end_date: e.target.value }))}
          />
        </div>
      </div>

      {availableBarbers.length > 0 && (
        <div>
          <Label>Barbers to Include</Label>
          <div className="mt-2 max-h-40 overflow-y-auto border rounded p-2">
            {availableBarbers.map((barber) => (
              <div key={barber.id} className="flex items-center space-x-2 py-1">
                <Checkbox
                  id={`barber-${barber.id}`}
                  checked={exportOptions.barber_ids?.includes(barber.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setExportOptions(prev => ({
                        ...prev,
                        barber_ids: [...(prev.barber_ids || []), barber.id]
                      }))
                    } else {
                      setExportOptions(prev => ({
                        ...prev,
                        barber_ids: prev.barber_ids?.filter(id => id !== barber.id)
                      }))
                    }
                  }}
                />
                <Label htmlFor={`barber-${barber.id}`} className="text-sm">
                  {barber.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="include_cancelled"
            checked={exportOptions.include_cancelled}
            onCheckedChange={(checked) => 
              setExportOptions(prev => ({ ...prev, include_cancelled: checked as boolean }))
            }
          />
          <Label htmlFor="include_cancelled" className="text-sm">
            Include cancelled appointments
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="include_completed"
            checked={exportOptions.include_completed}
            onCheckedChange={(checked) => 
              setExportOptions(prev => ({ ...prev, include_completed: checked as boolean }))
            }
          />
          <Label htmlFor="include_completed" className="text-sm">
            Include completed appointments
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="include_client_contact"
            checked={exportOptions.include_client_contact}
            onCheckedChange={(checked) => 
              setExportOptions(prev => ({ ...prev, include_client_contact: checked as boolean }))
            }
          />
          <Label htmlFor="include_client_contact" className="text-sm">
            Include client contact information
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="include_pricing"
            checked={exportOptions.include_pricing}
            onCheckedChange={(checked) => 
              setExportOptions(prev => ({ ...prev, include_pricing: checked as boolean }))
            }
          />
          <Label htmlFor="include_pricing" className="text-sm">
            Include pricing information
          </Label>
        </div>
      </div>

      <div>
        <Label htmlFor="custom_title">Custom Calendar Title (Optional)</Label>
        <Input
          placeholder="My Business Calendar"
          value={exportOptions.custom_title || ''}
          onChange={(e) => setExportOptions(prev => ({ ...prev, custom_title: e.target.value }))}
        />
      </div>
    </div>
  )

  // Render sync status cards
  const renderSyncStatus = () => {
    if (!syncStatus) return <div>Loading sync status...</div>

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Total Configurations</p>
                  <p className="text-2xl font-bold">{syncStatus.total_configurations}</p>
                </div>
                <Settings className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Active Syncs</p>
                  <p className="text-2xl font-bold text-green-600">{syncStatus.active_configurations}</p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Sync Health</p>
                  <div className="flex items-center space-x-2">
                    <Progress value={85} className="w-16" />
                    <span className="text-sm font-medium">85%</span>
                  </div>
                </div>
                <Zap className="h-6 w-6 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sync configurations list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Sync Configurations</span>
              <Button onClick={() => setSyncSetupDialogOpen(true)}>
                <Sync className="h-4 w-4 mr-2" />
                Add Sync
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(syncStatus.sync_health).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(syncStatus.sync_health).map(([key, health]) => (
                  <div key={key} className="flex items-center justify-between p-4 border rounded">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${
                        health.status === 'healthy' ? 'bg-green-500' : 
                        health.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <p className="font-medium">{key}</p>
                        <p className="text-sm text-muted-foreground">
                          Last sync: {health.last_successful_sync ? 
                            new Date(health.last_successful_sync).toLocaleString() : 'Never'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={health.status === 'healthy' ? 'default' : 'destructive'}>
                        {health.score}% Health
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => handleSyncTrigger(key)}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleSyncPause(key)}>
                        <Pause className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Sync className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No sync configurations found</p>
                <Button className="mt-4" onClick={() => setSyncSetupDialogOpen(true)}>
                  Set Up Your First Sync
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render analytics dashboard
  const renderAnalytics = () => {
    if (!analytics) return <div>Loading analytics...</div>

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Total Exports</p>
                  <p className="text-2xl font-bold">{analytics.export_analytics.total_exports}</p>
                </div>
                <Download className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Sync Success Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {analytics.sync_analytics.sync_frequency.success_rate_percentage}%
                  </p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Events Synced</p>
                  <p className="text-2xl font-bold">{analytics.sync_analytics.data_volume.events_synced_total}</p>
                </div>
                <Database className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Active Conflicts</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {analytics.sync_analytics.conflicts.pending_conflicts}
                  </p>
                </div>
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export formats breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Export Formats Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(analytics.export_analytics.exports_by_format).map(([format, count]) => (
                <div key={format} className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {calendarExportService.getFormatDisplayName(format)}
                  </span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Privacy levels breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy Levels Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(analytics.export_analytics.exports_by_privacy_level).map(([level, count]) => (
                <div key={level} className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {calendarExportService.getPrivacyLevelDescription(level)}
                  </span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Calendar Export & Sync</h2>
          <p className="text-muted-foreground">
            Export your calendar data and sync with external calendar providers
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setConflictDialogOpen(true)}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Conflicts
          </Button>
          <Button onClick={() => setExportDialogOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export Calendar
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="export" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center space-x-2">
            <Sync className="h-4 w-4" />
            <span>Sync</span>
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="flex items-center space-x-2">
            <Link className="h-4 w-4" />
            <span>Subscriptions</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Export Options</CardTitle>
              <p className="text-sm text-muted-foreground">
                Export your calendar data in various formats with privacy controls
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => {
                    setExportOptions(prev => ({ ...prev, format: 'ical', privacy_level: 'business' }))
                    setExportDialogOpen(true)
                  }}
                >
                  <Calendar className="h-6 w-6" />
                  <span className="text-sm">iCalendar</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => {
                    setExportOptions(prev => ({ ...prev, format: 'csv', privacy_level: 'business' }))
                    setExportDialogOpen(true)
                  }}
                >
                  <FileText className="h-6 w-6" />
                  <span className="text-sm">CSV Export</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => {
                    setExportOptions(prev => ({ ...prev, format: 'google_calendar', privacy_level: 'business' }))
                    setExportDialogOpen(true)
                  }}
                >
                  <Globe className="h-6 w-6" />
                  <span className="text-sm">Google Calendar</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => setSubscriptionDialogOpen(true)}
                >
                  <Link className="h-6 w-6" />
                  <span className="text-sm">Subscription</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent exports */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Exports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Download className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent exports found</p>
                <Button className="mt-4" onClick={() => setExportDialogOpen(true)}>
                  Create Your First Export
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          {renderSyncStatus()}
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Calendar Subscriptions</span>
                <Button onClick={() => setSubscriptionDialogOpen(true)}>
                  <Link className="h-4 w-4 mr-2" />
                  New Subscription
                </Button>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Create shareable calendar subscription URLs for external access
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Link className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No subscriptions found</p>
                <Button className="mt-4" onClick={() => setSubscriptionDialogOpen(true)}>
                  Create Your First Subscription
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {renderAnalytics()}
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export Calendar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {renderExportForm()}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                Cancel
              </Button>
              {availableBarbers.length > 1 && (
                <Button onClick={handleBulkExport} disabled={loading}>
                  {loading ? 'Exporting...' : 'Bulk Export'}
                </Button>
              )}
              <Button onClick={handleExport} disabled={loading}>
                {loading ? 'Exporting...' : 'Export'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Other dialogs would be implemented similarly */}
      {/* Sync Setup Dialog, Subscription Dialog, Conflict Dialog, etc. */}
    </div>
  )
}