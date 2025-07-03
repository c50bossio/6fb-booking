'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw, Shield, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import IntegrationCard from '@/components/integrations/IntegrationCard'
import { integrationsAPI } from '@/lib/api/integrations'
import { INTEGRATION_METADATA, IntegrationType, IntegrationResponse } from '@/types/integration'
import { useToast } from '@/hooks/use-toast'

export default function IntegrationsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedTab, setSelectedTab] = useState('all')

  // Fetch integrations
  const { data: integrations = [], isLoading, error, refetch } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationsAPI.getIntegrations(),
    refetchInterval: 30000 // Refetch every 30 seconds
  })

  // Health check mutation
  const healthCheckMutation = useMutation({
    mutationFn: () => integrationsAPI.checkAllIntegrationsHealth(),
    onSuccess: (data) => {
      // Update integration statuses based on health check
      queryClient.invalidateQueries({ queryKey: ['integrations'] })
      
      toast({
        title: 'Health Check Complete',
        description: `${data.healthy_count} of ${data.total_integrations} integrations are healthy.`
      })
    },
    onError: () => {
      toast({
        title: 'Health Check Failed',
        description: 'Unable to check integration health. Please try again.',
        variant: 'destructive'
      })
    }
  })

  // Group integrations by category
  const groupedIntegrations = React.useMemo(() => {
    const groups: Record<string, typeof INTEGRATION_METADATA[IntegrationType.GOOGLE_CALENDAR][]> = {
      'Calendar & Scheduling': [],
      'Payments': [],
      'Communications': [],
      'Data Import': [],
      'Other': []
    }

    Object.values(INTEGRATION_METADATA).forEach(metadata => {
      switch (metadata.type) {
        case IntegrationType.GOOGLE_CALENDAR:
        case IntegrationType.ACUITY:
        case IntegrationType.BOOKSY:
          groups['Calendar & Scheduling'].push(metadata)
          break
        case IntegrationType.STRIPE:
        case IntegrationType.SQUARE:
          groups['Payments'].push(metadata)
          break
        case IntegrationType.SENDGRID:
        case IntegrationType.TWILIO:
          groups['Communications'].push(metadata)
          break
        case IntegrationType.SHOPIFY:
          groups['Payments'].push(metadata) // Group Shopify with payments/commerce
          break
        case IntegrationType.CUSTOM:
          groups['Other'].push(metadata)
          break
      }
    })

    return groups
  }, [])

  // Get connected integrations map
  const connectedIntegrationsMap = React.useMemo(() => {
    const map: Record<string, IntegrationResponse> = {}
    integrations.forEach(integration => {
      map[integration.integration_type] = integration
    })
    return map
  }, [integrations])

  // Calculate stats
  const stats = React.useMemo(() => {
    const total = integrations.length
    const active = integrations.filter(i => i.is_active && i.is_connected).length
    const errors = integrations.filter(i => i.status === 'error').length
    const inactive = integrations.filter(i => !i.is_active).length

    return { total, active, errors, inactive }
  }, [integrations])

  const handleConnect = (type: IntegrationType) => {
    // The IntegrationCard component handles the connection flow
  }

  const handleDisconnect = (integrationId: number) => {
    // Refresh the integrations list after disconnection
    refetch()
  }

  const handleUpdate = (integration: IntegrationResponse) => {
    // Update the integration in the cache
    queryClient.setQueryData(['integrations'], (old: IntegrationResponse[] = []) => {
      return old.map(i => i.id === integration.id ? integration : i)
    })
  }

  const handleHealthCheck = async (integrationId?: number) => {
    if (integrationId) {
      try {
        await integrationsAPI.checkIntegrationHealth(integrationId)
        refetch()
      } catch (error) {
        toast({
          title: 'Health Check Failed',
          description: 'Unable to check integration health.',
          variant: 'destructive'
        })
      }
    } else {
      healthCheckMutation.mutate()
    }
  }

  if (error) {
    return (
      <div className="container max-w-6xl py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load integrations. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground mt-2">
            Connect third-party services to enhance your BookedBarber experience
          </p>
        </div>
        
        <Button
          onClick={() => handleHealthCheck()}
          disabled={healthCheckMutation.isPending}
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${healthCheckMutation.isPending ? 'animate-spin' : ''}`} />
          Check All Health
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Connected</CardTitle>
              <Shield className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">integrations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">working properly</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Errors</CardTitle>
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
            <p className="text-xs text-muted-foreground">need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Inactive</CardTitle>
              <AlertCircle className="w-4 h-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inactive}</div>
            <p className="text-xs text-muted-foreground">disabled</p>
          </CardContent>
        </Card>
      </div>

      {/* Integrations Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="all">All Integrations</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
              categoryIntegrations.length > 0 && (
                <div key={category}>
                  <h2 className="text-xl font-semibold mb-4">{category}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryIntegrations.map((metadata) => (
                      <IntegrationCard
                        key={metadata.type}
                        integration={connectedIntegrationsMap[metadata.type]}
                        metadata={metadata}
                        onConnect={() => handleConnect(metadata.type)}
                        onDisconnect={handleDisconnect}
                        onUpdate={handleUpdate}
                        onHealthCheck={handleHealthCheck}
                      />
                    ))}
                  </div>
                </div>
              )
            ))
          )}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedIntegrations['Calendar & Scheduling'].map((metadata) => (
              <IntegrationCard
                key={metadata.type}
                integration={connectedIntegrationsMap[metadata.type]}
                metadata={metadata}
                onConnect={() => handleConnect(metadata.type)}
                onDisconnect={handleDisconnect}
                onUpdate={handleUpdate}
                onHealthCheck={handleHealthCheck}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedIntegrations['Payments'].map((metadata) => (
              <IntegrationCard
                key={metadata.type}
                integration={connectedIntegrationsMap[metadata.type]}
                metadata={metadata}
                onConnect={() => handleConnect(metadata.type)}
                onDisconnect={handleDisconnect}
                onUpdate={handleUpdate}
                onHealthCheck={handleHealthCheck}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="communications" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedIntegrations['Communications'].map((metadata) => (
              <IntegrationCard
                key={metadata.type}
                integration={connectedIntegrationsMap[metadata.type]}
                metadata={metadata}
                onConnect={() => handleConnect(metadata.type)}
                onDisconnect={handleDisconnect}
                onUpdate={handleUpdate}
                onHealthCheck={handleHealthCheck}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="other" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedIntegrations['Other'].map((metadata) => (
              <IntegrationCard
                key={metadata.type}
                integration={connectedIntegrationsMap[metadata.type]}
                metadata={metadata}
                onConnect={() => handleConnect(metadata.type)}
                onDisconnect={handleDisconnect}
                onUpdate={handleUpdate}
                onHealthCheck={handleHealthCheck}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Security Notice</AlertTitle>
        <AlertDescription>
          Your integration credentials are encrypted and stored securely. We use industry-standard
          OAuth 2.0 for supported integrations and encrypt all API keys at rest.
        </AlertDescription>
      </Alert>
    </div>
  )
}