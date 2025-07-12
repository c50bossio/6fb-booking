'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Link2, 
  Settings, 
  Activity, 
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Zap,
  Globe,
  Mail,
  MessageSquare,
  Calendar,
  DollarSign,
  BarChart3,
  Users,
  Star,
  Camera,
  Smartphone,
  CreditCard,
  ShoppingBag,
  Code,
  Plus
} from 'lucide-react'
import { integrationsAPI, getAvailableIntegrations, getIntegrations, checkAllIntegrationsHealth } from '@/lib/api/integrations'
import type { IntegrationResponse, IntegrationHealthSummary } from '@/types/integration'
import { useToast } from '@/hooks/use-toast'
import { ReviewManagementPanel } from '@/components/integrations/ReviewManagementPanel'
import { ConversionTrackingSetup } from '@/components/integrations/ConversionTrackingSetup'

interface AvailableIntegration {
  type: string
  name: string
  description: string
  category: string
  icon: React.ComponentType<any>
  is_premium: boolean
  popular: boolean
  setup_difficulty: 'easy' | 'medium' | 'advanced'
  documentation_url?: string
}

const AVAILABLE_INTEGRATIONS: AvailableIntegration[] = [
  {
    type: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sync appointments with Google Calendar',
    category: 'Calendar',
    icon: Calendar,
    is_premium: false,
    popular: true,
    setup_difficulty: 'easy'
  },
  {
    type: 'google_my_business',
    name: 'Google My Business',
    description: 'Manage reviews and business information',
    category: 'Marketing',
    icon: Star,
    is_premium: false,
    popular: true,
    setup_difficulty: 'medium'
  },
  {
    type: 'stripe',
    name: 'Stripe',
    description: 'Accept online payments and manage billing',
    category: 'Payments',
    icon: CreditCard,
    is_premium: false,
    popular: true,
    setup_difficulty: 'easy'
  },
  {
    type: 'sendgrid',
    name: 'SendGrid',
    description: 'Send transactional and marketing emails',
    category: 'Communication',
    icon: Mail,
    is_premium: false,
    popular: true,
    setup_difficulty: 'easy'
  },
  {
    type: 'twilio',
    name: 'Twilio',
    description: 'Send SMS notifications and reminders',
    category: 'Communication',
    icon: MessageSquare,
    is_premium: false,
    popular: true,
    setup_difficulty: 'easy'
  },
  {
    type: 'meta_business',
    name: 'Meta Business',
    description: 'Facebook and Instagram marketing integration',
    category: 'Marketing',
    icon: Users,
    is_premium: true,
    popular: true,
    setup_difficulty: 'advanced'
  },
  {
    type: 'google_ads',
    name: 'Google Ads',
    description: 'Track conversions and optimize ad campaigns',
    category: 'Marketing',
    icon: BarChart3,
    is_premium: true,
    popular: false,
    setup_difficulty: 'advanced'
  },
  {
    type: 'square',
    name: 'Square',
    description: 'Point of sale and payment processing',
    category: 'Payments',
    icon: CreditCard,
    is_premium: false,
    popular: false,
    setup_difficulty: 'medium'
  },
  {
    type: 'shopify',
    name: 'Shopify',
    description: 'Sync products and manage e-commerce',
    category: 'E-commerce',
    icon: ShoppingBag,
    is_premium: true,
    popular: false,
    setup_difficulty: 'medium'
  },
  {
    type: 'custom',
    name: 'Custom Integration',
    description: 'Build your own integration with webhooks',
    category: 'Developer',
    icon: Code,
    is_premium: true,
    popular: false,
    setup_difficulty: 'advanced'
  }
]

export default function IntegrationsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [connectedIntegrations, setConnectedIntegrations] = useState<IntegrationResponse[]>([])
  const [healthSummary, setHealthSummary] = useState<IntegrationHealthSummary | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadIntegrationsData()
  }, [])

  const loadIntegrationsData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [integrations, health] = await Promise.all([
        getIntegrations(),
        checkAllIntegrationsHealth()
      ])

      setConnectedIntegrations(integrations)
      setHealthSummary(health)
    } catch (err) {
      console.error('Failed to load integrations:', err)
      setError('Failed to load integrations data')
      toast({
        title: 'Error',
        description: 'Failed to load integrations data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = async (integrationType: string) => {
    try {
      const result = await integrationsAPI.initiateOAuth({
        integration_type: integrationType as any,
        redirect_uri: `${window.location.origin}/dashboard/integrations/callback`
      })

      // Redirect to OAuth authorization URL
      window.location.href = result.authorization_url
    } catch (err) {
      console.error('Failed to initiate OAuth:', err)
      toast({
        title: 'Connection Failed',
        description: 'Failed to start connection process',
        variant: 'destructive'
      })
    }
  }

  const handleDisconnect = async (integrationId: number, name: string) => {
    if (!confirm(`Are you sure you want to disconnect ${name}?`)) return

    try {
      await integrationsAPI.disconnectIntegration(integrationId)
      toast({
        title: 'Disconnected',
        description: `${name} has been disconnected successfully`
      })
      loadIntegrationsData()
    } catch (err) {
      console.error('Failed to disconnect integration:', err)
      toast({
        title: 'Disconnection Failed',
        description: 'Failed to disconnect integration',
        variant: 'destructive'
      })
    }
  }

  const handleRefreshTokens = async (integrationId: number, name: string) => {
    try {
      await integrationsAPI.refreshTokens({ integration_id: integrationId })
      toast({
        title: 'Tokens Refreshed',
        description: `${name} tokens have been refreshed successfully`
      })
      loadIntegrationsData()
    } catch (err) {
      console.error('Failed to refresh tokens:', err)
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh authentication tokens',
        variant: 'destructive'
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />
      default: return <XCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getIntegrationIcon = (type: string) => {
    const integration = AVAILABLE_INTEGRATIONS.find(i => i.type === type)
    return integration?.icon || Globe
  }

  const categories = ['all', ...new Set(AVAILABLE_INTEGRATIONS.map(i => i.category))]
  const filteredIntegrations = selectedCategory === 'all' 
    ? AVAILABLE_INTEGRATIONS 
    : AVAILABLE_INTEGRATIONS.filter(i => i.category === selectedCategory)

  const connectedCount = connectedIntegrations.filter(i => i.status === 'connected').length
  const errorCount = connectedIntegrations.filter(i => i.status === 'error').length
  const healthyCount = healthSummary?.healthy_count || 0
  const totalConnected = connectedIntegrations.length

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Link2 className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
            <p className="text-muted-foreground">Loading integrations...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Link2 className="h-8 w-8 text-primary" />
            Integrations
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect your business with powerful third-party services
          </p>
        </div>
        <Button onClick={loadIntegrationsData} disabled={isLoading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectedCount}</div>
            <p className="text-xs text-muted-foreground">
              {totalConnected} total integrations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Healthy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{healthyCount}</div>
            <p className="text-xs text-muted-foreground">
              Working properly
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{errorCount}</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{AVAILABLE_INTEGRATIONS.length}</div>
            <p className="text-xs text-muted-foreground">
              Services to connect
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="connected" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="connected">Connected</TabsTrigger>
          <TabsTrigger value="available">Available</TabsTrigger>
          <TabsTrigger value="health">Health Status</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
        </TabsList>

        {/* Connected Integrations */}
        <TabsContent value="connected" className="space-y-6">
          {connectedIntegrations.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {connectedIntegrations.map((integration) => {
                const IconComponent = getIntegrationIcon(integration.integration_type)
                
                return (
                  <Card key={integration.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <IconComponent className="h-6 w-6" />
                          <div>
                            <CardTitle className="text-base">{integration.display_name}</CardTitle>
                            <CardDescription className="text-xs">
                              {integration.integration_type}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(integration.status)}
                          <Badge className={getStatusColor(integration.status)}>
                            {integration.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-xs text-muted-foreground space-y-1">
                        {integration.connected_at && (
                          <p>Connected: {new Date(integration.connected_at).toLocaleDateString()}</p>
                        )}
                        {integration.last_sync && (
                          <p>Last sync: {new Date(integration.last_sync).toLocaleDateString()}</p>
                        )}
                      </div>

                      {integration.status === 'error' && integration.error_message && (
                        <Alert variant="destructive">
                          <AlertDescription className="text-xs">
                            {integration.error_message}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRefreshTokens(integration.id, integration.display_name)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Refresh
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDisconnect(integration.id, integration.display_name)}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Disconnect
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Link2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Integrations Connected</h3>
                <p className="text-muted-foreground mb-6">
                  Connect your first integration to get started
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Integration
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Available Integrations */}
        <TabsContent value="available" className="space-y-6">
          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <Button
                key={category}
                size="sm"
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
              >
                {category === 'all' ? 'All' : category}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredIntegrations.map((integration) => {
              const IconComponent = integration.icon
              const isConnected = connectedIntegrations.some(
                ci => ci.integration_type === integration.type
              )
              
              return (
                <Card key={integration.type} className="relative">
                  {integration.popular && (
                    <Badge className="absolute -top-2 -right-2 bg-orange-500">
                      Popular
                    </Badge>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-6 w-6" />
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {integration.name}
                            {integration.is_premium && (
                              <Badge variant="outline" className="text-xs">
                                Pro
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {integration.category}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {integration.description}
                    </p>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {integration.setup_difficulty}
                      </Badge>
                      {integration.documentation_url && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={integration.documentation_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>

                    <Button
                      className="w-full"
                      disabled={isConnected}
                      onClick={() => handleConnect(integration.type)}
                    >
                      {isConnected ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Connected
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Connect
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Health Status */}
        <TabsContent value="health" className="space-y-6">
          {healthSummary && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Overall Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {healthSummary.overall_health_percentage}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    System health score
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {healthSummary.average_response_time_ms}ms
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Across all services
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {healthSummary.uptime_percentage?.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last 30 days
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {connectedIntegrations.length > 0 ? (
            <div className="space-y-4">
              {connectedIntegrations.map((integration) => {
                const IconComponent = getIntegrationIcon(integration.integration_type)
                
                return (
                  <Card key={integration.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <IconComponent className="h-5 w-5" />
                          <div>
                            <h4 className="font-medium">{integration.display_name}</h4>
                            <p className="text-xs text-muted-foreground">
                              Last checked: {integration.last_sync ? 
                                new Date(integration.last_sync).toLocaleString() : 
                                'Never'
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              {integration.status === 'connected' ? 'Healthy' : 'Issues'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Response time: N/A
                            </div>
                          </div>
                          {getStatusIcon(integration.status)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Health Data Available</h3>
                <p className="text-muted-foreground">
                  Connect integrations to monitor their health status
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-6">
          <ReviewManagementPanel />
        </TabsContent>

        {/* Tracking Tab */}
        <TabsContent value="tracking" className="space-y-6">
          <ConversionTrackingSetup />
        </TabsContent>
      </Tabs>
    </div>
  )
}