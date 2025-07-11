'use client'

import { useState, useEffect } from 'react'
import { webhooksAPI, WebhookEndpoint, WebhookEvent } from '../lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface WebhookConfigurationProps {
  onWebhookSelect?: (id: string | null) => void
  onUpdate?: () => void
}

export default function WebhookConfiguration({ onWebhookSelect, onUpdate }: WebhookConfigurationProps) {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([])
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<WebhookEndpoint | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [webhookList, eventList] = await Promise.all([
        webhooksAPI.list(),
        webhooksAPI.getEvents()
      ])
      setWebhooks(webhookList)
      setEvents(eventList)
    } catch (err: any) {
      setError(err.message || 'Failed to load webhooks')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (webhook: WebhookEndpoint) => {
    try {
      await webhooksAPI.update(webhook.id, { is_active: !webhook.is_active })
      setSuccess(`Webhook ${webhook.is_active ? 'disabled' : 'enabled'} successfully`)
      await loadData()
      onUpdate?.()
    } catch (err: any) {
      setError(err.message || 'Failed to update webhook')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return
    
    try {
      await webhooksAPI.delete(id)
      setSuccess('Webhook deleted successfully')
      await loadData()
      onUpdate?.()
    } catch (err: any) {
      setError(err.message || 'Failed to delete webhook')
    }
  }

  if (loading) {
    return <div className="p-6 text-center">Loading webhooks...</div>
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Webhook Endpoints</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          Add Webhook
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Webhook List */}
      {webhooks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No webhooks configured yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            Create your first webhook →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <Card key={webhook.id} variant="default" className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-gray-900">{webhook.name}</h3>
                      <span
                        className={`ml-3 px-2 py-1 text-xs rounded-full ${
                          webhook.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {webhook.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1">{webhook.url}</p>
                    
                    {webhook.description && (
                      <p className="text-sm text-gray-500 mt-2">{webhook.description}</p>
                    )}
                    
                    <div className="mt-3 flex flex-wrap gap-2">
                      {webhook.events.slice(0, 3).map((event) => (
                        <span
                          key={event}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 dark:text-gray-300 rounded"
                        >
                          {event}
                        </span>
                      ))}
                      {webhook.events.length > 3 && (
                        <span className="px-2 py-1 text-xs text-gray-500">
                          +{webhook.events.length - 3} more
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-3 flex items-center text-sm text-gray-500 space-x-4">
                      <span>
                        Success rate: <strong>{webhook.success_rate.toFixed(1)}%</strong>
                      </span>
                      <span>
                        Deliveries: <strong>{webhook.total_deliveries}</strong>
                      </span>
                      {webhook.last_triggered_at && (
                        <span>
                          Last triggered: {new Date(webhook.last_triggered_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleToggleActive(webhook)}
                      className={`px-3 py-1 text-sm rounded-md ${
                        webhook.is_active
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                      }`}
                    >
                      {webhook.is_active ? 'Disable' : 'Enable'}
                    </button>
                    
                    <button
                      onClick={() => {
                        setEditingWebhook(webhook)
                        setShowCreateModal(true)
                      }}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200"
                    >
                      Edit
                    </button>
                    
                    <button
                      onClick={() => onWebhookSelect?.(webhook.id)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                    >
                      View Logs
                    </button>
                    
                    <button
                      onClick={() => handleDelete(webhook.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <WebhookModal
          webhook={editingWebhook}
          events={events}
          onClose={() => {
            setShowCreateModal(false)
            setEditingWebhook(null)
          }}
          onSave={async () => {
            await loadData()
            onUpdate?.()
            setShowCreateModal(false)
            setEditingWebhook(null)
          }}
        />
      )}
    </div>
  )
}

// Webhook Create/Edit Modal Component
interface WebhookModalProps {
  webhook: WebhookEndpoint | null
  events: WebhookEvent[]
  onClose: () => void
  onSave: () => void
}

function WebhookModal({ webhook, events, onClose, onSave }: WebhookModalProps) {
  const [formData, setFormData] = useState({
    url: webhook?.url || '',
    name: webhook?.name || '',
    description: webhook?.description || '',
    events: webhook?.events || [],
    auth_type: webhook?.auth_type || 'none',
    auth_config: webhook?.auth_config || {},
    headers: webhook?.headers || {},
    max_retries: webhook?.max_retries || 3,
    retry_delay_seconds: webhook?.retry_delay_seconds || 60,
    timeout_seconds: webhook?.timeout_seconds || 30,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Group events by category
  const eventsByCategory = events.reduce((acc, event) => {
    if (!acc[event.category]) {
      acc[event.category] = []
    }
    acc[event.category].push(event)
    return acc
  }, {} as Record<string, WebhookEvent[]>)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.url || !formData.name) {
      setError('URL and name are required')
      return
    }
    
    if (formData.events.length === 0) {
      setError('Please select at least one event')
      return
    }
    
    setSaving(true)
    setError('')
    
    try {
      if (webhook) {
        await webhooksAPI.update(webhook.id, formData)
      } else {
        await webhooksAPI.create(formData)
      }
      onSave()
    } catch (err: any) {
      setError(err.message || 'Failed to save webhook')
      setSaving(false)
    }
  }

  const toggleEvent = (eventValue: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventValue)
        ? prev.events.filter(e => e !== eventValue)
        : [...prev.events, eventValue]
    }))
  }

  const addHeader = () => {
    const key = prompt('Header name:')
    if (!key) return
    const value = prompt('Header value:')
    if (!value) return
    
    setFormData(prev => ({
      ...prev,
      headers: { ...prev.headers, [key]: value }
    }))
  }

  const removeHeader = (key: string) => {
    setFormData(prev => {
      const newHeaders = { ...prev.headers }
      delete newHeaders[key]
      return { ...prev, headers: newHeaders }
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {webhook ? 'Edit Webhook' : 'Create New Webhook'}
            </h3>
          </div>
          
          <div className="p-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700">{error}</p>
              </div>
            )}
            
            {/* Basic Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Webhook Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="My Integration Webhook"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Endpoint URL
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="https://example.com/webhook"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                rows={2}
                placeholder="Describe what this webhook is for..."
              />
            </div>
            
            {/* Event Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Events to Subscribe
              </label>
              <div className="space-y-4 border border-gray-200 rounded-md p-4 max-h-64 overflow-y-auto">
                {Object.entries(eventsByCategory).map(([category, categoryEvents]) => (
                  <div key={category}>
                    <h4 className="text-sm font-medium text-gray-900 mb-2 capitalize">
                      {category}
                    </h4>
                    <div className="space-y-2">
                      {categoryEvents.map((event) => (
                        <label key={event.value} className="flex items-start">
                          <input
                            type="checkbox"
                            checked={formData.events.includes(event.value)}
                            onChange={() => toggleEvent(event.value)}
                            className="mt-1 h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                          />
                          <div className="ml-3">
                            <span className="text-sm text-gray-900">{event.value}</span>
                            <p className="text-xs text-gray-500">{event.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Authentication */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Authentication Type
              </label>
              <select
                value={formData.auth_type}
                onChange={(e) => setFormData({ ...formData, auth_type: e.target.value as any })}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="none">None</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="api_key">API Key</option>
                <option value="hmac">HMAC Signature</option>
              </select>
            </div>
            
            {/* Auth Configuration */}
            {formData.auth_type === 'bearer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bearer Token
                </label>
                <input
                  type="password"
                  value={formData.auth_config.token || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    auth_config: { token: e.target.value }
                  })}
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Your bearer token"
                />
              </div>
            )}
            
            {formData.auth_type === 'basic' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.auth_config.username || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      auth_config: { ...formData.auth_config, username: e.target.value }
                    })}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.auth_config.password || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      auth_config: { ...formData.auth_config, password: e.target.value }
                    })}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}
            
            {formData.auth_type === 'api_key' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Header Name
                  </label>
                  <input
                    type="text"
                    value={formData.auth_config.key_name || 'X-API-Key'}
                    onChange={(e) => setFormData({
                      ...formData,
                      auth_config: { ...formData.auth_config, key_name: e.target.value }
                    })}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={formData.auth_config.key_value || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      auth_config: { ...formData.auth_config, key_value: e.target.value }
                    })}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}
            
            {/* Advanced Settings */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
              </button>
            </div>
            
            {showAdvanced && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-md">
                {/* Custom Headers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Custom Headers
                  </label>
                  {Object.entries(formData.headers).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2 mb-2">
                      <span className="text-sm text-gray-600">{key}:</span>
                      <span className="text-sm text-gray-900">{value}</span>
                      <button
                        type="button"
                        onClick={() => removeHeader(key)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addHeader}
                    className="text-sm text-teal-600 hover:text-teal-700"
                  >
                    + Add Header
                  </button>
                </div>
                
                {/* Retry Configuration */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Max Retries
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={formData.max_retries}
                      onChange={(e) => setFormData({
                        ...formData,
                        max_retries: parseInt(e.target.value)
                      })}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Retry Delay (seconds)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="3600"
                      value={formData.retry_delay_seconds}
                      onChange={(e) => setFormData({
                        ...formData,
                        retry_delay_seconds: parseInt(e.target.value)
                      })}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Timeout (seconds)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={formData.timeout_seconds}
                      onChange={(e) => setFormData({
                        ...formData,
                        timeout_seconds: parseInt(e.target.value)
                      })}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : webhook ? 'Update Webhook' : 'Create Webhook'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}