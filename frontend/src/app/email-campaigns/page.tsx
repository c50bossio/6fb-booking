'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  EnvelopeIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { campaignAPI, templateAPI, analyticsAPI, EmailCampaign, EmailTemplate, OverallAnalytics, CAMPAIGN_TYPES, CAMPAIGN_STATUSES } from '@/lib/api/email-campaigns'

interface TabItem {
  id: string
  name: string
  count: number
}

export default function EmailCampaignsPage() {
  const [loading, setLoading] = useState(true)
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [analytics, setAnalytics] = useState<OverallAnalytics | null>(null)
  const [activeTab, setActiveTab] = useState('campaigns')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  const tabs: TabItem[] = [
    { id: 'campaigns', name: 'Campaigns', count: campaigns.length },
    { id: 'templates', name: 'Templates', count: templates.length },
    { id: 'analytics', name: 'Analytics', count: 0 },
    { id: 'settings', name: 'Settings', count: 0 }
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadCampaigns(),
        loadTemplates(),
        loadAnalytics()
      ])
    } catch (error) {
      console.error('Error loading email campaign data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCampaigns = async () => {
    try {
      const response = await campaignAPI.getCampaigns()
      if (response.success) {
        setCampaigns(response.campaigns)
      }
    } catch (error) {
      console.error('Error loading campaigns:', error)
    }
  }

  const loadTemplates = async () => {
    try {
      const response = await templateAPI.getTemplates()
      if (response.success) {
        setTemplates(response.templates)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  const loadAnalytics = async () => {
    try {
      const response = await analyticsAPI.getOverallAnalytics()
      if (response.success) {
        setAnalytics(response.analytics)
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleActivateCampaign = async (campaignId: string) => {
    try {
      await campaignAPI.activateCampaign(campaignId)
      await loadCampaigns()
    } catch (error) {
      console.error('Error activating campaign:', error)
    }
  }

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      await campaignAPI.pauseCampaign(campaignId)
      await loadCampaigns()
    } catch (error) {
      console.error('Error pausing campaign:', error)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        await templateAPI.deleteTemplate(templateId)
        await loadTemplates()
      } catch (error) {
        console.error('Error deleting template:', error)
      }
    }
  }

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter
    const matchesType = typeFilter === 'all' || campaign.campaign_type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.subject.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || template.campaign_type === typeFilter
    return matchesSearch && matchesType
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      active: 'bg-green-500/10 text-green-400 border-green-500/20',
      paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      completed: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      cancelled: 'bg-red-500/10 text-red-400 border-red-500/20'
    }

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'welcome': return <UserGroupIcon className="h-4 w-4" />
      case 'promotional': return <EnvelopeIcon className="h-4 w-4" />
      case 'reengagement': return <ArrowPathIcon className="h-4 w-4" />
      default: return <DocumentTextIcon className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading email campaigns...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Email Campaign Manager
              </h1>
              <p className="text-gray-700 dark:text-gray-300">
                Create, manage, and track your barbershop marketing campaigns
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50"
              >
                <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => router.push('/email-campaigns/create')}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg font-medium hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 shadow-lg"
              >
                <PlusIcon className="h-5 w-5" />
                <span>New Campaign</span>
              </button>
            </div>
          </div>

          {/* Analytics Summary */}
          {analytics && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl">
                    <EnvelopeIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Total Campaigns</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.total_campaigns}</p>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                    <UserGroupIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Total Sends</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.total_sends.toLocaleString()}</p>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                    <EyeIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Open Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{(analytics.overall_open_rate * 100).toFixed(1)}%</p>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                    <ChartBarIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm font-medium mb-1">Click Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{(analytics.overall_click_rate * 100).toFixed(1)}%</p>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                  {tab.count > 0 && (
                    <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-300">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Search and Filters */}
        {(activeTab === 'campaigns' || activeTab === 'templates') && (
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center space-x-3">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                {Object.entries(CAMPAIGN_TYPES).map(([key, value]) => (
                  <option key={value} value={value}>
                    {key.charAt(0) + key.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>

              {activeTab === 'campaigns' && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  {Object.entries(CAMPAIGN_STATUSES).map(([key, value]) => (
                    <option key={value} value={value}>
                      {key.charAt(0) + key.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            {filteredCampaigns.length === 0 ? (
              <div className="text-center py-12">
                <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No campaigns found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get started by creating your first email campaign.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => router.push('/email-campaigns/create')}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700"
                  >
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                    New Campaign
                  </button>
                </div>
              </div>
            ) : (
              filteredCampaigns.map((campaign) => (
                <div key={campaign.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg">
                          {getTypeIcon(campaign.campaign_type)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {campaign.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {campaign.description || 'No description provided'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                        <span>Type: {campaign.campaign_type}</span>
                        <span>Sends: {campaign.send_count}</span>
                        <span>Open Rate: {(campaign.open_rate * 100).toFixed(1)}%</span>
                        <span>Click Rate: {(campaign.click_rate * 100).toFixed(1)}%</span>
                        <span>Created: {formatDate(campaign.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {getStatusBadge(campaign.status)}

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => router.push(`/email-campaigns/${campaign.id}/analytics`)}
                          className="p-2 text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                          title="View Analytics"
                        >
                          <ChartBarIcon className="h-5 w-5" />
                        </button>

                        <button
                          onClick={() => router.push(`/email-campaigns/${campaign.id}`)}
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="View Campaign"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>

                        <button
                          onClick={() => router.push(`/email-campaigns/${campaign.id}/edit`)}
                          className="p-2 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                          title="Edit Campaign"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>

                        {campaign.status === 'draft' || campaign.status === 'paused' ? (
                          <button
                            onClick={() => handleActivateCampaign(campaign.id)}
                            className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                            title="Activate Campaign"
                          >
                            <PlayIcon className="h-5 w-5" />
                          </button>
                        ) : campaign.status === 'active' ? (
                          <button
                            onClick={() => handlePauseCampaign(campaign.id)}
                            className="p-2 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                            title="Pause Campaign"
                          >
                            <PauseIcon className="h-5 w-5" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-4">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No templates found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Create your first email template to get started.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => router.push('/email-campaigns/templates/create')}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700"
                  >
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                    New Template
                  </button>
                </div>
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <div key={template.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                          <DocumentTextIcon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {template.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {template.subject}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                        <span>Type: {template.campaign_type}</span>
                        <span>Fields: {template.personalization_fields.length}</span>
                        <span>Created: {formatDate(template.created_at)}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${template.is_active ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => router.push(`/email-campaigns/templates/${template.id}`)}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="View Template"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>

                      <button
                        onClick={() => router.push(`/email-campaigns/templates/${template.id}/edit`)}
                        className="p-2 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                        title="Edit Template"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>

                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete Template"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="text-center py-12">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Advanced Analytics Coming Soon</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Detailed campaign performance analytics and insights will be available here.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="text-center py-12">
              <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Campaign Settings Coming Soon</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Email campaign preferences and automation settings will be available here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
