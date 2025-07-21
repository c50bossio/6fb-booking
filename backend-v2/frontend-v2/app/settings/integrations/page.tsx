'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Link2, 
  Calendar, 
  CreditCard, 
  Mail, 
  MessageSquare, 
  BarChart3,
  Shield, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Settings,
  ArrowRight
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Integration {
  id: string
  name: string
  description: string
  icon: React.ElementType
  connected: boolean
  status: 'active' | 'inactive' | 'error'
  category: string
  lastSync?: string
  badge?: string
}

const integrations: Integration[] = [
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync appointments with your Google Calendar for seamless scheduling',
    icon: Calendar,
    connected: true,
    status: 'active',
    category: 'Calendar & Scheduling',
    lastSync: '2 minutes ago'
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Accept payments and manage financial transactions securely',
    icon: CreditCard,
    connected: true,
    status: 'active',
    category: 'Payments',
    lastSync: '1 hour ago'
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Send professional emails and marketing campaigns',
    icon: Mail,
    connected: false,
    status: 'inactive',
    category: 'Communications'
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'Send SMS notifications and reminders to clients',
    icon: MessageSquare,
    connected: true,
    status: 'error',
    category: 'Communications',
    lastSync: 'Failed 30 minutes ago',
    badge: 'Issue'
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Track website performance and user behavior',
    icon: BarChart3,
    connected: false,
    status: 'inactive',
    category: 'Analytics'
  }
]

export default function IntegrationsPage() {
  const { toast } = useToast()
  const [filter, setFilter] = useState('all')
  
  const filteredIntegrations = integrations.filter(integration => 
    filter === 'all' || 
    (filter === 'connected' && integration.connected) ||
    (filter === 'available' && !integration.connected)
  )

  const stats = {
    total: integrations.length,
    connected: integrations.filter(i => i.connected).length,
    active: integrations.filter(i => i.status === 'active').length,
    errors: integrations.filter(i => i.status === 'error').length
  }

  const handleConnect = (integrationId: string) => {
    toast({
      title: 'Integration Connection',
      description: 'This would open the OAuth flow for connecting the service.',
    })
  }

  const handleDisconnect = (integrationId: string) => {
    toast({
      title: 'Integration Disconnected',
      description: 'The service has been disconnected from your account.',
    })
  }

  const getStatusIcon = (status: Integration['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: Integration['status']) => {
    switch (status) {
      case 'active':
        return 'success'
      case 'error':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Integrations</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Connect third-party services to enhance your BookedBarber experience
          </p>
        </div>
        
        <Button
          onClick={() => window.location.href = 'mailto:support@bookedbarber.com?subject=Integration%20Request'}
          variant="outline"
        >
          <Settings className="w-4 h-4 mr-2" />
          Request Integration
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Available</CardTitle>
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
              <CardTitle className="text-sm font-medium">Connected</CardTitle>
              <Link2 className="w-4 h-4 text-teal-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">{stats.connected}</div>
            <p className="text-xs text-muted-foreground">services linked</p>
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
              <CardTitle className="text-sm font-medium">Issues</CardTitle>
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
            <p className="text-xs text-muted-foreground">need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          size="sm"
        >
          All Integrations
        </Button>
        <Button
          variant={filter === 'connected' ? 'default' : 'outline'}
          onClick={() => setFilter('connected')}
          size="sm"
        >
          Connected
        </Button>
        <Button
          variant={filter === 'available' ? 'default' : 'outline'}
          onClick={() => setFilter('available')}
          size="sm"
        >
          Available
        </Button>
      </div>

      {/* Enhanced Features Banner */}
      <Alert className="border-teal-200 bg-teal-50 dark:bg-teal-900/20">
        <Shield className="h-4 w-4 text-teal-600" />
        <AlertTitle className="text-teal-800 dark:text-teal-300">Enhanced Integration Management</AlertTitle>
        <AlertDescription className="text-teal-700 dark:text-teal-400">
          This page provides a simplified overview. For advanced integration management, health monitoring, 
          and detailed configuration options, visit our enhanced integrations dashboard.
        </AlertDescription>
        <Button 
          className="mt-3 bg-teal-600 hover:bg-teal-700 text-white"
          onClick={() => window.open('/(auth)/settings/integrations', '_blank')}
        >
          Access Enhanced Dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Alert>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.map((integration) => {
          const IconComponent = integration.icon
          return (
            <Card key={integration.id} className="group hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg group-hover:bg-teal-50 dark:group-hover:bg-teal-900/20 transition-colors">
                      <IconComponent className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-teal-600 dark:group-hover:text-teal-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-semibold">
                          {integration.name}
                        </CardTitle>
                        {integration.badge && (
                          <Badge variant="destructive" className="text-xs">
                            {integration.badge}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(integration.status)}
                        <Badge variant={getStatusColor(integration.status)} className="text-xs">
                          {integration.connected ? 'Connected' : 'Available'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-sm leading-relaxed">
                  {integration.description}
                </CardDescription>
                
                {integration.lastSync && (
                  <p className="text-xs text-muted-foreground">
                    Last sync: {integration.lastSync}
                  </p>
                )}
                
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-muted-foreground font-medium">
                    {integration.category}
                  </span>
                  
                  {integration.connected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(integration.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleConnect(integration.id)}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Security & Privacy</AlertTitle>
        <AlertDescription>
          Your integration credentials are encrypted and stored securely. We use industry-standard
          OAuth 2.0 authentication and encrypt all API keys at rest. You can disconnect any service at any time.
        </AlertDescription>
      </Alert>
    </div>
  )
}