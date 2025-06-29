'use client'

import { useState, useEffect } from 'react'
import { webhooksAPI, WebhookEndpoint, WebhookEvent, WebhookLog } from '../lib/api'
import { format } from 'date-fns'

interface WebhookTesterProps {
  selectedWebhookId: string | null
  onWebhookSelect: (id: string | null) => void
}

export default function WebhookTester({ selectedWebhookId, onWebhookSelect }: WebhookTesterProps) {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([])
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<WebhookLog | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadWebhooks()
    loadEvents()
  }, [])

  const loadWebhooks = async () => {
    try {
      const data = await webhooksAPI.list({ is_active: true })
      setWebhooks(data)
      if (!selectedWebhookId && data.length > 0) {
        onWebhookSelect(data[0].id)
      }
    } catch (err: any) {
      setError('Failed to load webhooks')
    }
  }

  const loadEvents = async () => {
    try {
      const data = await webhooksAPI.getEvents()
      setEvents(data)
      if (data.length > 0) {
        setSelectedEvent(data[0].value)
      }
    } catch (err: any) {
      setError('Failed to load events')
    }
  }

  const handleTest = async () => {
    if (!selectedWebhookId || !selectedEvent) return

    try {
      setTesting(true)
      setError('')
      setTestResult(null)
      
      const result = await webhooksAPI.test(selectedWebhookId, selectedEvent)
      setTestResult(result)
    } catch (err: any) {
      setError(err.message || 'Failed to test webhook')
    } finally {
      setTesting(false)
    }
  }

  const getSelectedWebhook = () => {
    return webhooks.find(w => w.id === selectedWebhookId)
  }

  const getEventsByCategory = () => {
    const categories: { [key: string]: WebhookEvent[] } = {}
    
    events.forEach(event => {
      if (!categories[event.category]) {
        categories[event.category] = []
      }
      categories[event.category].push(event)
    })
    
    return categories
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'failed':
        return (
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const selectedWebhook = getSelectedWebhook()

  return (
    <div className="p-6">
      {/* Webhook Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Webhook to Test
        </label>
        <select
          value={selectedWebhookId || ''}
          onChange={(e) => onWebhookSelect(e.target.value || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="">Select a webhook...</option>
          {webhooks.map((webhook) => (
            <option key={webhook.id} value={webhook.id}>
              {webhook.name} - {webhook.url}
            </option>
          ))}
        </select>
      </div>

      {selectedWebhook && (
        <>
          {/* Webhook Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Webhook Details</h3>
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-gray-500">URL:</span>{' '}
                <span className="font-mono text-gray-900">{selectedWebhook.url}</span>
              </div>
              <div>
                <span className="text-gray-500">Auth Type:</span>{' '}
                <span className="text-gray-900">{selectedWebhook.auth_type}</span>
              </div>
              <div>
                <span className="text-gray-500">Subscribed Events:</span>{' '}
                <span className="text-gray-900">{selectedWebhook.events.length} events</span>
              </div>
            </div>
          </div>

          {/* Event Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Event Type
            </label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              disabled={testing}
            >
              {Object.entries(getEventsByCategory()).map(([category, categoryEvents]) => (
                <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                  {categoryEvents.map((event) => (
                    <option key={event.value} value={event.value}>
                      {event.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {selectedEvent && events.find(e => e.value === selectedEvent) && (
              <p className="mt-2 text-sm text-gray-600">
                {events.find(e => e.value === selectedEvent)?.description}
              </p>
            )}
          </div>

          {/* Test Button */}
          <div className="mb-6">
            <button
              onClick={handleTest}
              disabled={testing || !selectedEvent}
              className="px-6 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? 'Testing...' : 'Send Test Webhook'}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <div className="border border-gray-200 rounded-lg">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Test Result</h3>
                  <div className="flex items-center">
                    {getStatusIcon(testResult.status)}
                    <span className="ml-2 text-sm text-gray-600">
                      {format(new Date(testResult.created_at), 'MMM d, HH:mm:ss')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Status and Response Code */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <p className={`text-lg font-medium ${
                      testResult.status === 'success' ? 'text-green-600' : 
                      testResult.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {testResult.status.charAt(0).toUpperCase() + testResult.status.slice(1)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Response Code</label>
                    <p className="text-lg font-medium text-gray-900">
                      {testResult.status_code || '-'}
                    </p>
                  </div>
                </div>

                {/* Response Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-500">Response Time</label>
                  <p className="text-lg font-medium text-gray-900">
                    {testResult.response_time_ms ? `${testResult.response_time_ms}ms` : '-'}
                  </p>
                </div>

                {/* Request Details */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Request</label>
                  <div className="bg-gray-50 rounded p-3 font-mono text-sm">
                    <div className="text-gray-600 mb-1">
                      {testResult.request_method} {testResult.request_url}
                    </div>
                    {testResult.request_headers && (
                      <div className="text-gray-600 mb-1">
                        Headers: {JSON.stringify(testResult.request_headers, null, 2)}
                      </div>
                    )}
                    {testResult.request_body && (
                      <pre className="text-gray-800 whitespace-pre-wrap">
                        {JSON.stringify(testResult.request_body, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>

                {/* Response Details */}
                {testResult.response_body && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Response</label>
                    <div className="bg-gray-50 rounded p-3 font-mono text-sm">
                      <pre className="text-gray-800 whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {testResult.response_body}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {testResult.error_message && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Error</label>
                    <div className="bg-red-50 rounded p-3 text-red-700">
                      {testResult.error_message}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}