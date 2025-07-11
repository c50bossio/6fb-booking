'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  DocumentDuplicateIcon,
  PaperAirplaneIcon,
  ClockIcon,
  CheckCircleIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline'

interface Campaign {
  id: string
  name: string
  type: 'email' | 'sms'
  status: 'draft' | 'scheduled' | 'sent' | 'sending'
  createdAt: string
  sentAt?: string
  scheduledFor?: string
  recipients: number
  openRate?: number
  clickRate?: number
  template?: string
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    // Simulate loading campaigns
    setTimeout(() => {
      setCampaigns([
        {
          id: '1',
          name: 'Holiday Special Promotion',
          type: 'email',
          status: 'sent',
          createdAt: '2024-12-15',
          sentAt: '2024-12-20',
          recipients: 450,
          openRate: 72.3,
          clickRate: 15.8,
          template: 'holiday-promo'
        },
        {
          id: '2',
          name: 'New Year Services Update',
          type: 'email',
          status: 'scheduled',
          createdAt: '2024-12-28',
          scheduledFor: '2025-01-02',
          recipients: 523,
          template: 'service-update'
        },
        {
          id: '3',
          name: 'Appointment Reminder Blast',
          type: 'sms',
          status: 'sent',
          createdAt: '2024-12-20',
          sentAt: '2024-12-22',
          recipients: 127,
          openRate: 95.2
        },
        {
          id: '4',
          name: 'Client Re-engagement Campaign',
          type: 'email',
          status: 'draft',
          createdAt: '2024-12-29',
          recipients: 0,
          template: 're-engagement'
        },
        {
          id: '5',
          name: 'Flash Sale Alert',
          type: 'sms',
          status: 'draft',
          createdAt: '2024-12-30',
          recipients: 0
        }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      sent: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      sending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    }

    const icons = {
      draft: <DocumentDuplicateIcon className="w-3 h-3" />,
      scheduled: <ClockIcon className="w-3 h-3" />,
      sent: <CheckCircleIcon className="w-3 h-3" />,
      sending: <PaperAirplaneIcon className="w-3 h-3" />
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getTypeBadge = (type: string) => {
    const styles = {
      email: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      sms: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    }

    const icons = {
      email: <EnvelopeIcon className="w-3 h-3" />,
      sms: <DevicePhoneMobileIcon className="w-3 h-3" />
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[type as keyof typeof styles]}`}>
        {icons[type as keyof typeof icons]}
        {type.toUpperCase()}
      </span>
    )
  }

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesStatus = filterStatus === 'all' || campaign.status === filterStatus
    const matchesType = filterType === 'all' || campaign.type === filterType
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesType && matchesSearch
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Create and manage your marketing campaigns</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2">
                <FunnelIcon className="w-5 h-5 text-gray-500" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="sent">Sent</option>
                </select>
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">All Types</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-primary-900 dark:text-primary-100">
              {campaigns.length}
            </div>
            <div className="text-sm text-primary-700 dark:text-primary-300">Total Campaigns</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {campaigns.filter(c => c.status === 'draft').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Drafts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {campaigns.filter(c => c.status === 'scheduled').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Scheduled</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {campaigns.filter(c => c.status === 'sent').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Sent</div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card>
        <CardContent className="p-0">
          {filteredCampaigns.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-500 dark:text-gray-400">No campaigns found</div>
              <Button variant="outline" className="mt-4" onClick={() => setShowCreateModal(true)}>
                <PlusIcon className="w-5 h-5 mr-2" />
                Create Your First Campaign
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCampaigns.map((campaign) => (
                <div key={campaign.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {campaign.name}
                        </h3>
                        {getTypeBadge(campaign.type)}
                        {getStatusBadge(campaign.status)}
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                        <span>Created {new Date(campaign.createdAt).toLocaleDateString()}</span>
                        {campaign.sentAt && (
                          <span>Sent {new Date(campaign.sentAt).toLocaleDateString()}</span>
                        )}
                        {campaign.scheduledFor && (
                          <span>Scheduled for {new Date(campaign.scheduledFor).toLocaleDateString()}</span>
                        )}
                        {campaign.recipients > 0 && (
                          <span>{campaign.recipients} recipients</span>
                        )}
                      </div>
                      {campaign.openRate !== undefined && (
                        <div className="mt-3 flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Open Rate:</span>
                            <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">
                              {campaign.openRate}%
                            </span>
                          </div>
                          {campaign.clickRate !== undefined && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500 dark:text-gray-400">Click Rate:</span>
                              <span className="text-sm font-semibold text-teal-600 dark:text-teal-400">
                                {campaign.clickRate}%
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {campaign.status === 'sent' && (
                        <Button variant="ghost" size="sm">
                          <ChartBarIcon className="w-4 h-4" />
                        </Button>
                      )}
                      {campaign.status === 'draft' && (
                        <Button variant="ghost" size="sm">
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Campaign Modal (placeholder) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <CardTitle>Create New Campaign</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Campaign creation form would go here...
              </p>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowCreateModal(false)}>
                  Create Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}