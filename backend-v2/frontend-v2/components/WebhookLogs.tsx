'use client'

import { useState, useEffect } from 'react'
import { webhooksAPI, WebhookEndpoint, WebhookLog } from '../lib/api'
import { format } from 'date-fns'

interface WebhookLogsProps {
  selectedWebhookId: string | null
  onWebhookSelect: (id: string | null) => void
}

export default function WebhookLogs({ selectedWebhookId, onWebhookSelect }: WebhookLogsProps) {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([])
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [loading, setLoading] = useState(true)
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [error, setError] = useState('')

  useEffect(() => {
    loadWebhooks()
  }, [])

  useEffect(() => {
    if (selectedWebhookId) {
      loadLogs()
    }
  }, [selectedWebhookId, statusFilter, eventTypeFilter])

  const loadWebhooks = async () => {
    try {
      const data = await webhooksAPI.list()
      setWebhooks(data)
      if (!selectedWebhookId && data.length > 0) {
        onWebhookSelect(data[0].id)
      }
    } catch (err: any) {
      setError('Failed to load webhooks')
    }
  }

  const loadLogs = async () => {
    if (!selectedWebhookId) return

    try {
      setLoading(true)
      const params: any = {}
      if (statusFilter !== 'all') params.status = statusFilter
      if (eventTypeFilter !== 'all') params.event_type = eventTypeFilter

      const data = await webhooksAPI.getLogs(selectedWebhookId, params)
      setLogs(data)
    } catch (err: any) {
      setError('Failed to load logs')
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = async (logId: string) => {
    if (!selectedWebhookId) return

    try {
      setRetryingIds(prev => new Set(prev).add(logId))
      await webhooksAPI.retryDelivery(selectedWebhookId, logId)
      await loadLogs() // Reload logs to show updated status
    } catch (err: any) {
      setError('Failed to retry webhook')
    } finally {
      setRetryingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(logId)
        return newSet
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      retrying: 'bg-blue-100 text-blue-800'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    )
  }

  const getStatusCodeBadge = (statusCode?: number) => {
    if (!statusCode) return null

    let colorClass = 'bg-gray-100 text-gray-800'
    if (statusCode >= 200 && statusCode < 300) {
      colorClass = 'bg-green-100 text-green-800'
    } else if (statusCode >= 400 && statusCode < 500) {
      colorClass = 'bg-orange-100 text-orange-800'
    } else if (statusCode >= 500) {
      colorClass = 'bg-red-100 text-red-800'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {statusCode}
      </span>
    )
  }

  const formatResponseTime = (ms?: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <div className="p-6">
      {/* Webhook Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Webhook
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

      {selectedWebhookId && (
        <>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
                <option value="retrying">Retrying</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Type
              </label>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Events</option>
                <option value="booking.created">Booking Created</option>
                <option value="booking.updated">Booking Updated</option>
                <option value="booking.cancelled">Booking Cancelled</option>
                <option value="payment.completed">Payment Completed</option>
                <option value="payment.failed">Payment Failed</option>
              </select>
            </div>

            <div className="ml-auto">
              <button
                onClick={loadLogs}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Logs Table */}
          {loading ? (
            <div className="text-center py-8">Loading logs...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">{error}</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No logs found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Response
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.event_type}
                        {log.event_id && (
                          <div className="text-xs text-gray-500">ID: {log.event_id}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusCodeBadge(log.status_code)}
                        {log.error_message && (
                          <div className="text-xs text-red-600 mt-1 max-w-xs truncate" title={log.error_message}>
                            {log.error_message}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatResponseTime(log.response_time_ms)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {(log.status === 'failed' || log.status === 'retrying') && (
                          <button
                            onClick={() => handleRetry(log.id)}
                            disabled={retryingIds.has(log.id)}
                            className="text-teal-600 hover:text-teal-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {retryingIds.has(log.id) ? 'Retrying...' : 'Retry'}
                          </button>
                        )}
                        <button
                          onClick={() => {/* TODO: Show details modal */}}
                          className="ml-3 text-gray-600 hover:text-gray-900"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}