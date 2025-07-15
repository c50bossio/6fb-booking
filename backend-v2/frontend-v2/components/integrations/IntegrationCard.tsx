'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Switch } from '@/components/ui/switch'
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Settings, ExternalLink, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { integrationsAPI } from '@/lib/api/integrations'
import type { IntegrationResponse, IntegrationMetadata, IntegrationStatus } from '@/types/integration'
import { IntegrationType } from '@/types/integration'
import * as Icons from '@heroicons/react/24/outline'

interface IntegrationCardProps {
  integration?: IntegrationResponse
  metadata: IntegrationMetadata
  onConnect?: () => void
  onDisconnect?: (integrationId: number) => void
  onUpdate?: (integration: IntegrationResponse) => void
  onHealthCheck?: (integrationId: number) => void
}

export default function IntegrationCard({
  integration,
  metadata,
  onConnect,
  onDisconnect,
  onUpdate,
  onHealthCheck
}: IntegrationCardProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [configData, setConfigData] = useState<Record<string, string>>({})
  const [isTestingConnection, setIsTestingConnection] = useState(false)

  // Get the icon component
  const IconComponent = Icons[metadata.icon as keyof typeof Icons] || Icons.CogIcon

  // Get status badge color
  const getStatusColor = (status?: IntegrationStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'expired':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  // Get status icon
  const getStatusIcon = (status?: IntegrationStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />
      case 'error':
      case 'expired':
        return <XCircle className="w-4 h-4" />
      case 'pending':
        return <RefreshCw className="w-4 h-4 animate-spin" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const handleConnect = async () => {
    if (metadata.requiresOAuth) {
      // OAuth flow
      setIsLoading(true)
      try {
        const response = await integrationsAPI.initiateOAuth({
          integration_type: metadata.type
        })
        
        // Redirect to OAuth provider
        window.location.href = response.authorization_url
      } catch (error) {
        toast({
          title: 'Connection Error',
          description: `Failed to connect ${metadata.displayName}. Please try again.`,
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    } else {
      // Show configuration dialog for non-OAuth integrations
      setShowConfig(true)
    }
  }

  const handleSaveConfig = async () => {
    setIsLoading(true)
    try {
      // Validate required fields
      const missingFields = metadata.requiredFields?.filter(field => !configData[field])
      if (missingFields?.length) {
        toast({
          title: 'Missing Required Fields',
          description: `Please fill in all required fields: ${missingFields.join(', ')}`,
          variant: 'destructive'
        })
        setIsLoading(false)
        return
      }

      // Create integration with API credentials
      const response = await integrationsAPI.createIntegration({
        name: metadata.displayName,
        integration_type: metadata.type,
        is_active: true,
        ...configData
      })

      toast({
        title: 'Integration Connected',
        description: `${metadata.displayName} has been connected successfully.`
      })

      onUpdate?.(response)
      setShowConfig(false)
      setConfigData({})
    } catch (error) {
      toast({
        title: 'Connection Error',
        description: `Failed to connect ${metadata.displayName}. Please check your credentials and try again.`,
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!integration) return

    setIsLoading(true)
    try {
      await integrationsAPI.disconnectIntegration(integration.id)
      
      toast({
        title: 'Integration Disconnected',
        description: `${metadata.displayName} has been disconnected.`
      })

      onDisconnect?.(integration.id)
    } catch (error) {
      toast({
        title: 'Disconnection Error',
        description: `Failed to disconnect ${metadata.displayName}. Please try again.`,
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestConnection = async () => {
    if (!integration) return

    setIsTestingConnection(true)
    try {
      const result = await integrationsAPI.testConnection(integration.id)
      
      toast({
        title: result.success ? 'Connection Successful' : 'Connection Failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive'
      })

      // Trigger health check to update status
      onHealthCheck?.(integration.id)
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: 'Failed to test connection. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleToggleActive = async () => {
    if (!integration) return

    setIsLoading(true)
    try {
      const updated = await integrationsAPI.updateIntegration(integration.id, {
        is_active: !integration.is_active
      })

      toast({
        title: updated.is_active ? 'Integration Enabled' : 'Integration Disabled',
        description: `${metadata.displayName} has been ${updated.is_active ? 'enabled' : 'disabled'}.`
      })

      onUpdate?.(updated)
    } catch (error) {
      toast({
        title: 'Update Error',
        description: 'Failed to update integration status. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Card className="relative overflow-hidden">
        {/* Status indicator bar */}
        <div 
          className={`absolute top-0 left-0 right-0 h-1 ${
            integration?.is_connected 
              ? 'bg-green-500' 
              : integration 
                ? 'bg-gray-300 dark:bg-gray-700' 
                : 'bg-transparent'
          }`} 
        />

        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${metadata.color}20` }}
              >
                <IconComponent 
                  className="w-6 h-6"
                  style={{ color: metadata.color }}
                />
              </div>
              <div>
                <CardTitle className="text-lg">{metadata.displayName}</CardTitle>
                <CardDescription className="mt-1">{metadata.description}</CardDescription>
              </div>
            </div>
            
            {integration && (
              <Badge className={getStatusColor(integration.status)}>
                <span className="flex items-center gap-1">
                  {getStatusIcon(integration.status)}
                  {integration.status}
                </span>
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Features list */}
            <div>
              <h4 className="text-sm font-medium mb-2">Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {metadata.features.slice(0, 3).map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Integration details if connected */}
            {integration && (
              <div className="pt-2 border-t space-y-2 text-sm">
                {integration.last_sync_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last synced</span>
                    <span>{new Date(integration.last_sync_at).toLocaleString()}</span>
                  </div>
                )}
                {integration.last_error && (
                  <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                    <span className="text-sm text-red-700 dark:text-red-300">{integration.last_error}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between">
          {integration ? (
            <>
              <div className="flex items-center gap-2">
                <Switch
                  checked={integration.is_active}
                  onCheckedChange={handleToggleActive}
                  disabled={isLoading}
                />
                <Label className="text-sm">
                  {integration.is_active ? 'Enabled' : 'Disabled'}
                </Label>
              </div>
              
              <div className="flex gap-2">
                {!metadata.requiresOAuth && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={!integration.is_active || isTestingConnection}
                  >
                    {isTestingConnection ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Test
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(metadata.helpUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                  Help
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={isLoading}
                >
                  Disconnect
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                onClick={handleConnect}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>Connect {metadata.displayName}</>
                )}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>

      {/* Configuration dialog for non-OAuth integrations */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure {metadata.displayName}</DialogTitle>
            <DialogDescription>
              Enter your API credentials to connect {metadata.displayName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {metadata.requiredFields?.map((field) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={field}>
                  {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id={field}
                  type={field.includes('secret') || field.includes('key') ? 'password' : 'text'}
                  value={configData[field] || ''}
                  onChange={(e) => setConfigData({ ...configData, [field]: e.target.value })}
                  placeholder={`Enter your ${field.replace(/_/g, ' ')}`}
                />
              </div>
            ))}
            
            {metadata.type === IntegrationType.CUSTOM && (
              <div className="space-y-2">
                <Label htmlFor="webhook_url">
                  Webhook URL
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="webhook_url"
                  type="url"
                  value={configData.webhook_url || ''}
                  onChange={(e) => setConfigData({ ...configData, webhook_url: e.target.value })}
                  placeholder="https://your-webhook-url.com"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfig(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfig} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}