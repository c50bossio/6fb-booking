import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs"
import { 
  BarChart3, 
  Target,
  Settings,
  TestTube,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Code,
  Eye,
  TrendingUp,
  DollarSign,
  Users,
  MousePointer,
  Smartphone,
  Globe
} from 'lucide-react'
import { trackingApi } from '@/lib/api/integrations'
import type { ConversionEvent } from '@/lib/api/integrations'
import { useToast } from '@/hooks/use-toast'

interface ConversionTrackingSetupProps {
  className?: string
}

export const ConversionTrackingSetup: React.FC<ConversionTrackingSetupProps> = ({
  className = ''
}) => {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [config, setConfig] = useState<{
    meta_pixel_id?: string
    google_analytics_id?: string
    gtm_container_id?: string
  }>({})
  const [conversionEvents, setConversionEvents] = useState<ConversionEvent[]>([])
  const [testResults, setTestResults] = useState<{
    meta: { is_working: boolean; error?: string } | null
    google: { is_working: boolean; error?: string } | null
  }>({ meta: null, google: null })
  const [isTesting, setIsTesting] = useState<{ meta: boolean; google: boolean }>({ 
    meta: false, 
    google: false 
  })
  const [configForm, setConfigForm] = useState<{
    meta_pixel_id: string
    google_analytics_id: string
    gtm_container_id: string
  }>({
    meta_pixel_id: '',
    google_analytics_id: '',
    gtm_container_id: ''
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTrackingData()
  }, [])

  const loadTrackingData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [configData, eventsData] = await Promise.all([
        trackingApi.getTrackingConfig(),
        trackingApi.getConversionEvents({
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        })
      ])

      setConfig(configData)
      setConfigForm({
        meta_pixel_id: configData.meta_pixel_id || '',
        google_analytics_id: configData.google_analytics_id || '',
        gtm_container_id: configData.gtm_container_id || ''
      })
      setConversionEvents(eventsData)
    } catch (err) {
      console.error('Failed to load tracking data:', err)
      setError('Failed to load tracking configuration')
      toast({
        title: 'Error',
        description: 'Failed to load tracking configuration',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateConfig = async () => {
    try {
      await trackingApi.updateTrackingConfig(configForm)
      setConfig(configForm)
      
      toast({
        title: 'Configuration Updated',
        description: 'Tracking configuration has been saved successfully'
      })
    } catch (err) {
      console.error('Failed to update config:', err)
      toast({
        title: 'Update Failed',
        description: 'Failed to update tracking configuration',
        variant: 'destructive'
      })
    }
  }

  const handleTestPixel = async (platform: 'meta' | 'google') => {
    try {
      setIsTesting(prev => ({ ...prev, [platform]: true }))
      const result = await trackingApi.testPixel(platform)
      setTestResults(prev => ({ ...prev, [platform]: result }))
      
      if (result.is_working) {
        toast({
          title: `${platform === 'meta' ? 'Meta' : 'Google'} Pixel Working`,
          description: 'Conversion tracking is functioning correctly'
        })
      } else {
        toast({
          title: `${platform === 'meta' ? 'Meta' : 'Google'} Pixel Issue`,
          description: result.error || 'Pixel test failed',
          variant: 'destructive'
        })
      }
    } catch (err) {
      console.error(`Failed to test ${platform} pixel:`, err)
      setTestResults(prev => ({ 
        ...prev, 
        [platform]: { is_working: false, error: 'Test failed' }
      }))
      toast({
        title: 'Test Failed',
        description: `Failed to test ${platform} pixel`,
        variant: 'destructive'
      })
    } finally {
      setIsTesting(prev => ({ ...prev, [platform]: false }))
    }
  }

  const getStatusIcon = (isWorking?: boolean) => {
    if (isWorking === undefined) return <Settings className="h-4 w-4 text-gray-500" />
    return isWorking 
      ? <CheckCircle className="h-4 w-4 text-green-500" />
      : <XCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusColor = (isWorking?: boolean) => {
    if (isWorking === undefined) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    return isWorking 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }

  const eventsByPlatform = conversionEvents.reduce((acc, event) => {
    if (!acc[event.platform]) acc[event.platform] = []
    acc[event.platform].push(event)
    return acc
  }, {} as Record<string, ConversionEvent[]>)

  const totalRevenue = conversionEvents
    .filter(e => e.value)
    .reduce((sum, e) => sum + (e.value || 0), 0)

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Conversion Tracking
            </CardTitle>
            <CardDescription>
              Set up and monitor conversion tracking for marketing campaigns
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="setup" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Setup Tab */}
          <TabsContent value="setup" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Meta Pixel Setup */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Meta Pixel
                    </CardTitle>
                    <Badge className={getStatusColor(testResults.meta?.is_working)}>
                      {testResults.meta?.is_working === undefined ? 'Not Tested' :
                       testResults.meta?.is_working ? 'Working' : 'Issues'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Pixel ID</label>
                    <input
                      type="text"
                      value={configForm.meta_pixel_id}
                      onChange={(e) => setConfigForm(prev => ({ 
                        ...prev, 
                        meta_pixel_id: e.target.value 
                      }))}
                      placeholder="123456789012345"
                      className="w-full mt-1 p-2 border rounded"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Find this in your Meta Business Manager
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleTestPixel('meta')}
                      disabled={!configForm.meta_pixel_id || isTesting.meta}
                    >
                      <TestTube className="h-3 w-3 mr-1" />
                      {isTesting.meta ? 'Testing...' : 'Test'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleUpdateConfig}
                    >
                      Save
                    </Button>
                  </div>

                  {testResults.meta?.error && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {testResults.meta.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Google Analytics Setup */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Google Analytics
                    </CardTitle>
                    <Badge className={getStatusColor(testResults.google?.is_working)}>
                      {testResults.google?.is_working === undefined ? 'Not Tested' :
                       testResults.google?.is_working ? 'Working' : 'Issues'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Measurement ID</label>
                    <input
                      type="text"
                      value={configForm.google_analytics_id}
                      onChange={(e) => setConfigForm(prev => ({ 
                        ...prev, 
                        google_analytics_id: e.target.value 
                      }))}
                      placeholder="G-XXXXXXXXXX"
                      className="w-full mt-1 p-2 border rounded"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      GA4 Measurement ID from Google Analytics
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">GTM Container ID (Optional)</label>
                    <input
                      type="text"
                      value={configForm.gtm_container_id}
                      onChange={(e) => setConfigForm(prev => ({ 
                        ...prev, 
                        gtm_container_id: e.target.value 
                      }))}
                      placeholder="GTM-XXXXXXX"
                      className="w-full mt-1 p-2 border rounded"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Google Tag Manager Container ID
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleTestPixel('google')}
                      disabled={!configForm.google_analytics_id || isTesting.google}
                    >
                      <TestTube className="h-3 w-3 mr-1" />
                      {isTesting.google ? 'Testing...' : 'Test'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleUpdateConfig}
                    >
                      Save
                    </Button>
                  </div>

                  {testResults.google?.error && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {testResults.google.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Implementation Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Implementation Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Conversion tracking is automatically implemented on your booking pages. 
                    The following events are tracked: appointment bookings, payment completions, 
                    form submissions, and page views.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="p-3 border rounded-lg">
                    <h5 className="font-medium text-sm mb-1">Tracked Events</h5>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Appointment bookings</li>
                      <li>• Payment completions</li>
                      <li>• Form submissions</li>
                      <li>• Page views</li>
                    </ul>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h5 className="font-medium text-sm mb-1">Attribution Data</h5>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Traffic source</li>
                      <li>• Campaign information</li>
                      <li>• Revenue attribution</li>
                      <li>• Customer journey</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Testing Tab */}
          <TabsContent value="testing" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Meta Pixel Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Connection Status</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(testResults.meta?.is_working)}
                      <span className="text-sm">
                        {testResults.meta?.is_working === undefined ? 'Unknown' :
                         testResults.meta?.is_working ? 'Connected' : 'Failed'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Pixel ID</span>
                    <span className="text-sm font-mono">
                      {config.meta_pixel_id || 'Not configured'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleTestPixel('meta')}
                    disabled={!config.meta_pixel_id || isTesting.meta}
                  >
                    <TestTube className="h-3 w-3 mr-1" />
                    {isTesting.meta ? 'Testing...' : 'Test Connection'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Google Analytics Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Connection Status</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(testResults.google?.is_working)}
                      <span className="text-sm">
                        {testResults.google?.is_working === undefined ? 'Unknown' :
                         testResults.google?.is_working ? 'Connected' : 'Failed'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Measurement ID</span>
                    <span className="text-sm font-mono">
                      {config.google_analytics_id || 'Not configured'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleTestPixel('google')}
                    disabled={!config.google_analytics_id || isTesting.google}
                  >
                    <TestTube className="h-3 w-3 mr-1" />
                    {isTesting.google ? 'Testing...' : 'Test Connection'}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Test Results */}
            {(testResults.meta || testResults.google) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Test Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {testResults.meta && (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">Meta Pixel</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(testResults.meta.is_working)}
                        <span className="text-sm">
                          {testResults.meta.is_working ? 'Working' : 'Failed'}
                        </span>
                      </div>
                    </div>
                  )}
                  {testResults.google && (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="h-4 w-4" />
                        <span className="text-sm">Google Analytics</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(testResults.google.is_working)}
                        <span className="text-sm">
                          {testResults.google.is_working ? 'Working' : 'Failed'}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{conversionEvents.length}</div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Revenue Tracked</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">From conversions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Platforms</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Object.keys(eventsByPlatform).length}</div>
                  <p className="text-xs text-muted-foreground">Active platforms</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg Event Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${conversionEvents.length > 0 ? (totalRevenue / conversionEvents.length).toFixed(2) : '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground">Per conversion</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Events */}
            {conversionEvents.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Conversion Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {conversionEvents.slice(0, 10).map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                          <div>
                            <span className="font-medium text-sm">{event.event_type}</span>
                            <div className="text-xs text-muted-foreground">
                              {event.attribution.source} / {event.attribution.medium}
                              {event.attribution.campaign && ` / ${event.attribution.campaign}`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {event.value && (
                            <div className="font-medium text-sm">
                              ${event.value.toFixed(2)}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {new Date(event.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Conversion Data</h3>
                  <p className="text-muted-foreground">
                    Complete the tracking setup to start collecting conversion data
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}