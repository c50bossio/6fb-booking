'use client'

import React, { useState, useEffect } from 'react'
import {
  Settings,
  Link,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Key,
  Shield,
  Activity,
  Clock,
  Zap,
  Globe,
  Smartphone,
  Mail,
  MessageSquare,
  Calendar,
  DollarSign,
  Star,
  Users,
  BarChart3,
  Target,
  Eye,
  MousePointer,
  Code,
  Database,
  Cloud,
  Webhook,
  API
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Modal } from '@/components/ui/Modal'
import { Progress } from '@/components/ui/progress'

interface Integration {
  id: string
  name: string
  provider: string
  category: 'communication' | 'analytics' | 'payment' | 'marketing' | 'scheduling' | 'ai'
  status: 'connected' | 'disconnected' | 'error' | 'configuring'
  health_score: number
  last_sync: string
  description: string
  icon: React.ReactNode
  config: Record<string, any>
  features: string[]
  usage_stats: {
    api_calls_today: number
    api_calls_month: number
    data_synced: number
    error_rate: number
  }
  rate_limits: {
    current: number
    limit: number
    reset_time: string
  }
  webhook_url?: string
  auth_type: 'oauth' | 'api_key' | 'basic' | 'jwt'
  permissions: string[]
}

interface IntegrationTemplate {
  id: string
  name: string
  provider: string
  category: string
  description: string
  icon: React.ReactNode
  setup_complexity: 'easy' | 'medium' | 'advanced'
  pricing: string
  features: string[]
  benefits: string[]
}

interface IntegrationHubProps {
  isOpen: boolean
  onClose: () => void
}

export function IntegrationHub({ isOpen, onClose }: IntegrationHubProps) {
  const [loading, setLoading] = useState(false)
  const [activeIntegrations, setActiveIntegrations] = useState<Integration[]>([])
  const [availableIntegrations, setAvailableIntegrations] = useState<IntegrationTemplate[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showAddIntegration, setShowAddIntegration] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadIntegrations()
    }
  }, [isOpen])

  const loadIntegrations = async () => {
    try {
      setLoading(true)
      
      // Mock integration data
      const mockActiveIntegrations: Integration[] = [
        {
          id: 'twilio',
          name: 'Twilio SMS',
          provider: 'Twilio',
          category: 'communication',
          status: 'connected',
          health_score: 98,
          last_sync: new Date().toISOString(),
          description: 'SMS messaging and notifications',
          icon: <MessageSquare className="w-5 h-5" />,
          config: {
            account_sid: 'AC****',
            phone_number: '+1234567890'
          },
          features: ['SMS notifications', 'Two-way messaging', 'Delivery tracking'],
          usage_stats: {
            api_calls_today: 156,
            api_calls_month: 4280,
            data_synced: 1250,
            error_rate: 0.2
          },
          rate_limits: {
            current: 156,
            limit: 1000,
            reset_time: '2024-01-01T00:00:00Z'
          },
          auth_type: 'api_key',
          permissions: ['send_sms', 'receive_sms', 'read_logs']
        },
        {
          id: 'google-calendar',
          name: 'Google Calendar',
          provider: 'Google',
          category: 'scheduling',
          status: 'connected',
          health_score: 95,
          last_sync: new Date(Date.now() - 30000).toISOString(),
          description: 'Calendar synchronization and scheduling',
          icon: <Calendar className="w-5 h-5" />,
          config: {
            calendar_id: 'primary',
            sync_direction: 'bidirectional'
          },
          features: ['Two-way sync', 'Event creation', 'Availability checking'],
          usage_stats: {
            api_calls_today: 89,
            api_calls_month: 2340,
            data_synced: 450,
            error_rate: 0.5
          },
          rate_limits: {
            current: 89,
            limit: 10000,
            reset_time: '2024-01-01T00:00:00Z'
          },
          auth_type: 'oauth',
          permissions: ['calendar.events', 'calendar.readonly']
        },
        {
          id: 'stripe',
          name: 'Stripe Payments',
          provider: 'Stripe',
          category: 'payment',
          status: 'connected',
          health_score: 100,
          last_sync: new Date(Date.now() - 5000).toISOString(),
          description: 'Payment processing and invoicing',
          icon: <DollarSign className="w-5 h-5" />,
          config: {
            webhook_endpoint: 'https://api.bookedbarber.com/webhooks/stripe'
          },
          features: ['Payment processing', 'Refunds', 'Subscription billing'],
          usage_stats: {
            api_calls_today: 45,
            api_calls_month: 1280,
            data_synced: 180,
            error_rate: 0.0
          },
          rate_limits: {
            current: 45,
            limit: 100,
            reset_time: '2024-01-01T00:00:00Z'
          },
          webhook_url: 'https://api.bookedbarber.com/webhooks/stripe',
          auth_type: 'api_key',
          permissions: ['payments.read', 'payments.write', 'customers.read']
        },
        {
          id: 'sendgrid',
          name: 'SendGrid Email',
          provider: 'SendGrid',
          category: 'communication',
          status: 'error',
          health_score: 72,
          last_sync: new Date(Date.now() - 300000).toISOString(),
          description: 'Email delivery and marketing campaigns',
          icon: <Mail className="w-5 h-5" />,
          config: {
            api_key: 'SG.*****',
            from_email: 'noreply@bookedbarber.com'
          },
          features: ['Transactional emails', 'Marketing campaigns', 'Analytics'],
          usage_stats: {
            api_calls_today: 234,
            api_calls_month: 8950,
            data_synced: 680,
            error_rate: 2.8
          },
          rate_limits: {
            current: 234,
            limit: 40000,
            reset_time: '2024-01-01T00:00:00Z'
          },
          auth_type: 'api_key',
          permissions: ['mail.send', 'marketing.read', 'stats.read']
        },
        {
          id: 'google-analytics',
          name: 'Google Analytics',
          provider: 'Google',
          category: 'analytics',
          status: 'connected',
          health_score: 88,
          last_sync: new Date(Date.now() - 120000).toISOString(),
          description: 'Website and conversion tracking',
          icon: <BarChart3 className="w-5 h-5" />,
          config: {
            tracking_id: 'GA-*****',
            property_id: '12345'
          },
          features: ['Event tracking', 'Conversion analytics', 'Audience insights'],
          usage_stats: {
            api_calls_today: 67,
            api_calls_month: 1890,
            data_synced: 920,
            error_rate: 1.2
          },
          rate_limits: {
            current: 67,
            limit: 50000,
            reset_time: '2024-01-01T00:00:00Z'
          },
          auth_type: 'oauth',
          permissions: ['analytics.readonly', 'analytics.edit']
        }
      ]

      const mockAvailableIntegrations: IntegrationTemplate[] = [
        {
          id: 'facebook-ads',
          name: 'Facebook Ads',
          provider: 'Meta',
          category: 'marketing',
          description: 'Social media advertising and audience targeting',
          icon: <Target className="w-5 h-5" />,
          setup_complexity: 'medium',
          pricing: 'Free with ad spend',
          features: ['Campaign management', 'Audience targeting', 'ROI tracking'],
          benefits: ['Reach new customers', 'Retarget website visitors', 'Track conversions']
        },
        {
          id: 'google-my-business',
          name: 'Google My Business',
          provider: 'Google',
          category: 'marketing',
          description: 'Local business listing and review management',
          icon: <Star className="w-5 h-5" />,
          setup_complexity: 'easy',
          pricing: 'Free',
          features: ['Review management', 'Business info updates', 'Photo management'],
          benefits: ['Improve local SEO', 'Manage customer reviews', 'Update business hours']
        },
        {
          id: 'hubspot',
          name: 'HubSpot CRM',
          provider: 'HubSpot',
          category: 'marketing',
          description: 'Customer relationship management and marketing automation',
          icon: <Users className="w-5 h-5" />,
          setup_complexity: 'advanced',
          pricing: 'Free tier available',
          features: ['Contact management', 'Email automation', 'Sales pipeline'],
          benefits: ['Organize customer data', 'Automate follow-ups', 'Track sales funnel']
        },
        {
          id: 'slack',
          name: 'Slack',
          provider: 'Slack',
          category: 'communication',
          description: 'Team communication and notifications',
          icon: <MessageSquare className="w-5 h-5" />,
          setup_complexity: 'easy',
          pricing: 'Free tier available',
          features: ['Real-time notifications', 'Team channels', 'File sharing'],
          benefits: ['Instant team alerts', 'Centralized communication', 'Booking notifications']
        }
      ]

      setActiveIntegrations(mockActiveIntegrations)
      setAvailableIntegrations(mockAvailableIntegrations)
    } catch (error) {
      console.error('Failed to load integrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'configuring':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'configuring':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const getHealthColor = (score: number) => {
    if (score >= 95) return 'text-green-600'
    if (score >= 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'communication':
        return <MessageSquare className="w-4 h-4" />
      case 'analytics':
        return <BarChart3 className="w-4 h-4" />
      case 'payment':
        return <DollarSign className="w-4 h-4" />
      case 'marketing':
        return <Target className="w-4 h-4" />
      case 'scheduling':
        return <Calendar className="w-4 h-4" />
      case 'ai':
        return <Zap className="w-4 h-4" />
      default:
        return <Settings className="w-4 h-4" />
    }
  }

  const handleTestIntegration = async (integrationId: string) => {
    try {
      setLoading(true)
      // Mock API test
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setActiveIntegrations(prev => prev.map(integration => 
        integration.id === integrationId 
          ? { ...integration, status: 'connected' as const, health_score: 98 }
          : integration
      ))
    } catch (error) {
      console.error('Failed to test integration:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnectIntegration = async (integrationId: string) => {
    try {
      setLoading(true)
      // Mock disconnect
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setActiveIntegrations(prev => prev.filter(integration => integration.id !== integrationId))
    } catch (error) {
      console.error('Failed to disconnect integration:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredIntegrations = selectedCategory === 'all' 
    ? activeIntegrations 
    : activeIntegrations.filter(integration => integration.category === selectedCategory)

  const renderIntegrationCard = (integration: Integration) => (
    <Card key={integration.id} className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
            {integration.icon}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {integration.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {integration.description}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(integration.status)}>
            {getStatusIcon(integration.status)}
            <span className="ml-1">{integration.status}</span>
          </Badge>
        </div>
      </div>

      {/* Health and Usage Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Health Score</p>
          <p className={`text-lg font-bold ${getHealthColor(integration.health_score)}`}>
            {integration.health_score}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">API Calls Today</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {integration.usage_stats.api_calls_today.toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Error Rate</p>
          <p className={`text-lg font-bold ${integration.usage_stats.error_rate > 1 ? 'text-red-600' : 'text-green-600'}`}>
            {integration.usage_stats.error_rate.toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Last Sync</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {new Date(integration.last_sync).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Rate Limits */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">API Rate Limit</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {integration.rate_limits.current.toLocaleString()} / {integration.rate_limits.limit.toLocaleString()}
          </span>
        </div>
        <Progress 
          value={(integration.rate_limits.current / integration.rate_limits.limit) * 100} 
          className="h-2"
        />
      </div>

      {/* Features */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Features</h4>
        <div className="flex flex-wrap gap-1">
          {integration.features.map((feature, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {feature}
            </Badge>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleTestIntegration(integration.id)}
            disabled={loading}
          >
            <Activity className="w-4 h-4 mr-1" />
            Test
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedIntegration(integration)}
          >
            <Settings className="w-4 h-4 mr-1" />
            Configure
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDisconnectIntegration(integration.id)}
            className="text-red-600 hover:text-red-800"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )

  const renderAvailableIntegrations = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Available Integrations
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableIntegrations.map((template) => (
          <Card key={template.id} className="p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                {template.icon}
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {template.name}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {template.provider}
                </p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {template.description}
            </p>

            <div className="flex items-center justify-between mb-3">
              <Badge variant="outline" className="text-xs">
                {template.setup_complexity} setup
              </Badge>
              <span className="text-xs text-green-600 font-medium">
                {template.pricing}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              {template.benefits.slice(0, 2).map((benefit, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {benefit}
                  </span>
                </div>
              ))}
            </div>

            <Button size="sm" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Connect
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="large">
      <div className="p-6 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Integration Hub
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Manage all your third-party service connections in one place
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Integrations</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activeIntegrations.length}
                </p>
              </div>
              <Link className="w-8 h-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Connected</p>
                <p className="text-2xl font-bold text-green-600">
                  {activeIntegrations.filter(i => i.status === 'connected').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">API Calls Today</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activeIntegrations.reduce((sum, i) => sum + i.usage_stats.api_calls_today, 0).toLocaleString()}
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Health</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(activeIntegrations.reduce((sum, i) => sum + i.health_score, 0) / activeIntegrations.length)}%
                </p>
              </div>
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <option value="all">All Categories</option>
              <option value="communication">Communication</option>
              <option value="analytics">Analytics</option>
              <option value="payment">Payments</option>
              <option value="marketing">Marketing</option>
              <option value="scheduling">Scheduling</option>
              <option value="ai">AI Services</option>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh All
            </Button>
            <Button size="sm" onClick={() => setShowAddIntegration(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Integration
            </Button>
          </div>
        </div>

        {/* Active Integrations */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredIntegrations.map(renderIntegrationCard)}
            </div>

            {showAddIntegration && renderAvailableIntegrations()}
          </div>
        )}

        {/* Integration Configuration Modal */}
        {selectedIntegration && (
          <Modal 
            isOpen={!!selectedIntegration} 
            onClose={() => setSelectedIntegration(null)}
            size="medium"
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Configure {selectedIntegration.name}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label>Status</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    {getStatusIcon(selectedIntegration.status)}
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedIntegration.status}
                    </span>
                  </div>
                </div>

                <div>
                  <Label>Authentication Type</Label>
                  <Input value={selectedIntegration.auth_type} disabled className="mt-1" />
                </div>

                <div>
                  <Label>Permissions</Label>
                  <div className="mt-2 space-y-2">
                    {selectedIntegration.permissions.map((permission, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input type="checkbox" checked readOnly />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {permission}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedIntegration.webhook_url && (
                  <div>
                    <Label>Webhook URL</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input value={selectedIntegration.webhook_url} disabled />
                      <Button size="sm" variant="outline">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <Button variant="outline" onClick={() => setSelectedIntegration(null)}>
                  Close
                </Button>
                <Button>
                  Save Configuration
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Modal>
  )
}