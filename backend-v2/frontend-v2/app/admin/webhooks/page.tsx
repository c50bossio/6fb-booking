'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { webhooksAPI, getProfile, WebhookStats } from '../../../lib/api'
import WebhookConfiguration from '../../../components/WebhookConfiguration'
import WebhookLogs from '../../../components/WebhookLogs'
import WebhookTester from '../../../components/WebhookTester'
import WebhookDocumentation from '../../../components/WebhookDocumentation'
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card'

type TabType = 'configuration' | 'logs' | 'testing' | 'documentation'

export default function WebhooksPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('configuration')
  const [stats, setStats] = useState<WebhookStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      
      // Check if user is authenticated and is admin
      const userProfile = await getProfile()
      if (userProfile.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      // Load webhook statistics
      const webhookStats = await webhooksAPI.getStats()
      setStats(webhookStats)
    } catch (err: any) {
      setError(err.message || 'Failed to load webhook data')
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        router.push('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const refreshStats = async () => {
    try {
      const webhookStats = await webhooksAPI.getStats()
      setStats(webhookStats)
    } catch (err: any) {
      console.error('Failed to refresh stats:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading webhook management...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Webhook Management</h1>
            <p className="text-gray-600 mt-2">Configure and monitor webhook integrations</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50"
          >
            Back to Admin
          </button>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-gray-900">{stats.total_endpoints}</div>
                <p className="text-sm text-gray-600 mt-1">Total Endpoints</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-teal-600">{stats.active_endpoints}</div>
                <p className="text-sm text-gray-600 mt-1">Active Endpoints</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-gray-900">
                  {stats.last_24h.total_deliveries}
                </div>
                <p className="text-sm text-gray-600 mt-1">Deliveries (24h)</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.last_24h.success_rate.toFixed(1)}%
                  </div>
                  {stats.last_24h.failed_deliveries > 0 && (
                    <span className="ml-2 text-xs text-red-600">
                      ({stats.last_24h.failed_deliveries} failed)
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">Success Rate (24h)</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Failures Alert */}
        {stats && stats.recent_failures.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-sm font-medium text-red-800 mb-2">Recent Failures</h3>
            <div className="space-y-1">
              {stats.recent_failures.slice(0, 3).map((failure) => (
                <div key={failure.id} className="text-sm text-red-600">
                  {failure.event_type} - {failure.error_message || 'Unknown error'}
                </div>
              ))}
            </div>
            <button
              onClick={() => setActiveTab('logs')}
              className="mt-2 text-sm text-red-700 hover:text-red-800 font-medium"
            >
              View all failures →
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white shadow-sm rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('configuration')}
                className={`py-2 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'configuration'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Configuration
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`py-2 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'logs'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Logs
              </button>
              <button
                onClick={() => setActiveTab('testing')}
                className={`py-2 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'testing'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Testing
              </button>
              <button
                onClick={() => setActiveTab('documentation')}
                className={`py-2 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'documentation'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Documentation
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white shadow-sm rounded-lg">
          {activeTab === 'configuration' && (
            <WebhookConfiguration
              onWebhookSelect={setSelectedWebhookId}
              onUpdate={refreshStats}
            />
          )}
          
          {activeTab === 'logs' && (
            <WebhookLogs
              selectedWebhookId={selectedWebhookId}
              onWebhookSelect={setSelectedWebhookId}
            />
          )}
          
          {activeTab === 'testing' && (
            <WebhookTester
              selectedWebhookId={selectedWebhookId}
              onWebhookSelect={setSelectedWebhookId}
            />
          )}
          
          {activeTab === 'documentation' && <WebhookDocumentation />}
        </div>
      </div>
    </div>
  )
}