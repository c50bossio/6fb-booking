'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, CloudIcon, LinkIcon } from '@heroicons/react/24/outline'

export default function IntegrationsPage() {
  const router = useRouter()
  const [integrations, setIntegrations] = useState({
    googleCalendar: false,
    outlookCalendar: false,
    zapier: false,
    stripe: true,
    twilioSms: false
  })

  const handleToggle = (key: keyof typeof integrations) => {
    setIntegrations(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const integrationsList = [
    {
      name: 'Google Calendar',
      description: 'Sync appointments with your Google Calendar',
      key: 'googleCalendar' as const,
      icon: '📅',
      status: integrations.googleCalendar
    },
    {
      name: 'Outlook Calendar',
      description: 'Sync appointments with Microsoft Outlook',
      key: 'outlookCalendar' as const,
      icon: '📆',
      status: integrations.outlookCalendar
    },
    {
      name: 'Zapier',
      description: 'Connect with thousands of apps through Zapier',
      key: 'zapier' as const,
      icon: '⚡',
      status: integrations.zapier
    },
    {
      name: 'Stripe Payments',
      description: 'Process payments through Stripe',
      key: 'stripe' as const,
      icon: '💳',
      status: integrations.stripe
    },
    {
      name: 'Twilio SMS',
      description: 'Send SMS notifications to clients',
      key: 'twilioSms' as const,
      icon: '📱',
      status: integrations.twilioSms
    }
  ]

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <CloudIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Integrations</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Connect third-party services and manage API access</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/settings')}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors duration-200"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>Back to Settings</span>
          </button>
        </div>

        {/* Integrations List */}
        <div className="space-y-4">
          {integrationsList.map((integration) => (
            <div
              key={integration.key}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-3xl">{integration.icon}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {integration.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {integration.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    integration.status 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {integration.status ? 'Connected' : 'Disconnected'}
                  </span>
                  <button
                    onClick={() => handleToggle(integration.key)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                      integration.status
                        ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30'
                    }`}
                  >
                    {integration.status ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* API Keys Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <LinkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">API Keys</h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Manage your API keys for custom integrations
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Public API Key</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">pk_test_***************</p>
              </div>
              <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium">
                Regenerate
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Secret API Key</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">sk_test_***************</p>
              </div>
              <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium">
                Regenerate
              </button>
            </div>
          </div>
        </div>

        {/* Webhooks Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Webhooks</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Configure webhook endpoints for real-time updates
          </p>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="url"
                placeholder="https://your-domain.com/webhook"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200">
                Add Webhook
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}