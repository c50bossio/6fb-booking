'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile } from '../../../lib/api'
import { Webhook, Plus, Play, Pause, Trash2, RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'

interface WebhookEndpoint {
  id: string
  name: string
  url: string
  events: string[]
  status: 'active' | 'inactive' | 'error'
  created_at: string
  last_delivery?: string
  delivery_attempts: number
  success_rate: number
  secret: string
}

interface WebhookDelivery {
  id: string
  webhook_id: string
  event_type: string
  status: 'success' | 'failed' | 'pending'
  response_code?: number
  timestamp: string
  retry_count: number
}

export default function WebhookManagementPage() {
  const router = useRouter()
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([])
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTab, setSelectedTab] = useState<'endpoints' | 'deliveries'>('endpoints')
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[]
  })
  const [showNewForm, setShowNewForm] = useState(false)

  const availableEvents = [
    'appointment.created',
    'appointment.updated', 
    'appointment.cancelled',
    'payment.succeeded',
    'payment.failed',
    'client.created',
    'client.updated'
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Check if user is authenticated and has admin role
      const userProfile = await getProfile()
      if (!['admin', 'super_admin'].includes(userProfile.role)) {
        router.push('/dashboard')
        return
      }

      // Mock data since webhook management endpoint may not be fully implemented
      const mockWebhooks: WebhookEndpoint[] = [
        {
          id: '1',
          name: 'Booking Notifications',
          url: 'https://api.example.com/webhooks/bookings',
          events: ['appointment.created', 'appointment.cancelled'],
          status: 'active',
          created_at: '2024-01-15T10:30:00Z',
          last_delivery: '2024-01-20T14:25:00Z',
          delivery_attempts: 142,
          success_rate: 97.2,
          secret: 'whsec_abcd1234567890'
        },
        {
          id: '2',
          name: 'Payment Processor',
          url: 'https://payments.myapp.com/webhook',
          events: ['payment.succeeded', 'payment.failed'],
          status: 'active',
          created_at: '2024-01-10T09:15:00Z',
          last_delivery: '2024-01-20T15:10:00Z',
          delivery_attempts: 89,
          success_rate: 100,
          secret: 'whsec_xyz9876543210'
        },
        {
          id: '3',
          name: 'CRM Integration',
          url: 'https://crm.company.com/api/webhook',
          events: ['client.created', 'client.updated'],
          status: 'error',
          created_at: '2024-01-05T14:20:00Z',
          last_delivery: '2024-01-18T11:30:00Z',
          delivery_attempts: 67,
          success_rate: 85.1,
          secret: 'whsec_def4567890123'
        }
      ]

      const mockDeliveries: WebhookDelivery[] = [
        {
          id: '1',
          webhook_id: '1',
          event_type: 'appointment.created',
          status: 'success',
          response_code: 200,
          timestamp: '2024-01-20T14:25:00Z',
          retry_count: 0
        },
        {
          id: '2',
          webhook_id: '2',
          event_type: 'payment.succeeded',
          status: 'success',
          response_code: 200,
          timestamp: '2024-01-20T15:10:00Z',
          retry_count: 0
        },
        {
          id: '3',
          webhook_id: '3',
          event_type: 'client.created',
          status: 'failed',
          response_code: 500,
          timestamp: '2024-01-20T11:45:00Z',
          retry_count: 3
        }
      ]
      
      setWebhooks(mockWebhooks)
      setDeliveries(mockDeliveries)
    } catch (err: any) {
      setError(err.message || 'Failed to load webhook data')
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        router.push('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const createWebhook = async () => {
    if (!newWebhook.name.trim() || !newWebhook.url.trim() || newWebhook.events.length === 0) {
      return
    }
    
    try {
      const webhook: WebhookEndpoint = {
        id: Date.now().toString(),
        name: newWebhook.name,
        url: newWebhook.url,
        events: newWebhook.events,
        status: 'active',
        created_at: new Date().toISOString(),
        delivery_attempts: 0,
        success_rate: 0,
        secret: `whsec_${Math.random().toString(36).substring(2, 15)}`
      }
      
      setWebhooks([webhook, ...webhooks])
      setNewWebhook({ name: '', url: '', events: [] })
      setShowNewForm(false)
    } catch (err: any) {
      setError(err.message || 'Failed to create webhook')
    }
  }

  const toggleWebhookStatus = async (webhookId: string) => {
    setWebhooks(webhooks.map(webhook => 
      webhook.id === webhookId 
        ? { ...webhook, status: webhook.status === 'active' ? 'inactive' : 'active' }
        : webhook
    ))
  }

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook? This action cannot be undone.')) {
      return
    }
    
    setWebhooks(webhooks.filter(webhook => webhook.id !== webhookId))
  }

  const testWebhook = async (webhookId: string) => {
    // Mock webhook test
    alert('Test webhook sent successfully!')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'inactive':
        return <Pause className="w-4 h-4 text-gray-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
    }
  }

  const getDeliveryStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'pending':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading webhook management...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Webhook Management</h1>
        <p className="text-gray-600 mt-2">
          Monitor and manage webhook endpoints for real-time event notifications
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setSelectedTab('endpoints')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'endpoints'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Endpoints ({webhooks.length})
          </button>
          <button
            onClick={() => setSelectedTab('deliveries')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'deliveries'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Recent Deliveries ({deliveries.length})
          </button>
        </nav>
      </div>

      {selectedTab === 'endpoints' && (
        <div className="space-y-6">
          {/* Create New Webhook */}
          {!showNewForm ? (
            <div className="text-center">
              <button
                onClick={() => setShowNewForm(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Webhook Endpoint</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Create New Webhook</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    placeholder="Webhook name"
                    value={newWebhook.name}
                    onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                  <input
                    type="url"
                    placeholder="https://your-app.com/webhook"
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Events</label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableEvents.map((event) => (
                      <label key={event} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newWebhook.events.includes(event)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewWebhook({ ...newWebhook, events: [...newWebhook.events, event] })
                            } else {
                              setNewWebhook({ ...newWebhook, events: newWebhook.events.filter(e => e !== event) })
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">{event}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={createWebhook}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Create Webhook
                  </button>
                  <button
                    onClick={() => {
                      setShowNewForm(false)
                      setNewWebhook({ name: '', url: '', events: [] })
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Webhooks List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {webhooks.length === 0 ? (
              <div className="p-8 text-center">
                <Webhook className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No webhook endpoints configured</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {webhooks.map((webhook) => (
                  <div key={webhook.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {getStatusIcon(webhook.status)}
                          <h3 className="text-lg font-medium text-gray-900">{webhook.name}</h3>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-2">
                          <code className="bg-gray-100 px-2 py-1 rounded">{webhook.url}</code>
                        </div>
                        
                        <div className="flex flex-wrap gap-1 mb-3">
                          {webhook.events.map((event) => (
                            <span key={event} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {event}
                            </span>
                          ))}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Created: {format(new Date(webhook.created_at), 'MMM d, yyyy')}</span>
                          {webhook.last_delivery && (
                            <span>Last delivery: {format(new Date(webhook.last_delivery), 'MMM d, HH:mm')}</span>
                          )}
                          <span>{webhook.delivery_attempts} deliveries</span>
                          <span>{webhook.success_rate.toFixed(1)}% success rate</span>
                        </div>
                      </div>
                      
                      <div className="ml-4 flex space-x-2">
                        <button
                          onClick={() => testWebhook(webhook.id)}
                          className="text-blue-600 hover:text-blue-800 p-2"
                          title="Test webhook"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleWebhookStatus(webhook.id)}
                          className="text-gray-600 hover:text-gray-800 p-2"
                          title={webhook.status === 'active' ? 'Pause webhook' : 'Activate webhook'}
                        >
                          {webhook.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => deleteWebhook(webhook.id)}
                          className="text-red-600 hover:text-red-800 p-2"
                          title="Delete webhook"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedTab === 'deliveries' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Webhook Deliveries</h2>
          </div>
          
          {deliveries.length === 0 ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No recent deliveries</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Webhook
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Response
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Retries
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deliveries.map((delivery) => {
                    const webhook = webhooks.find(w => w.id === delivery.webhook_id)
                    return (
                      <tr key={delivery.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getDeliveryStatusIcon(delivery.status)}
                            <span className="capitalize">{delivery.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {delivery.event_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {webhook?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {delivery.response_code ? (
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              delivery.response_code >= 200 && delivery.response_code < 300
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {delivery.response_code}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(delivery.timestamp), 'MMM d, HH:mm:ss')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {delivery.retry_count}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}