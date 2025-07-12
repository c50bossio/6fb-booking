'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { 
  EnvelopeIcon,
  ChartBarIcon,
  UsersIcon,
  DocumentDuplicateIcon,
  CreditCardIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  LinkIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline'

interface MarketingStat {
  label: string
  value: string
  change: string
  changeType: 'increase' | 'decrease' | 'neutral'
  icon: React.ReactNode
}

interface RecentCampaign {
  id: string
  name: string
  status: 'draft' | 'scheduled' | 'sent' | 'sending'
  sentDate?: string
  scheduledDate?: string
  recipients: number
  openRate?: number
  clickRate?: number
}

export default function MarketingDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<MarketingStat[]>([])
  const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>([])

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setStats([
        {
          label: 'Total Campaigns',
          value: '24',
          change: '+3 this month',
          changeType: 'increase',
          icon: <EnvelopeIcon className="w-6 h-6" />
        },
        {
          label: 'Total Contacts',
          value: '1,247',
          change: '+156 this month',
          changeType: 'increase',
          icon: <UsersIcon className="w-6 h-6" />
        },
        {
          label: 'Avg Open Rate',
          value: '68.4%',
          change: '+5.2%',
          changeType: 'increase',
          icon: <ChartBarIcon className="w-6 h-6" />
        },
        {
          label: 'Credits Used',
          value: '3,450',
          change: '1,550 remaining',
          changeType: 'neutral',
          icon: <CreditCardIcon className="w-6 h-6" />
        }
      ])

      setRecentCampaigns([
        {
          id: '1',
          name: 'Holiday Special Promotion',
          status: 'sent',
          sentDate: '2024-12-20',
          recipients: 450,
          openRate: 72.3,
          clickRate: 15.8
        },
        {
          id: '2',
          name: 'New Year Services Update',
          status: 'scheduled',
          scheduledDate: '2025-01-02',
          recipients: 523
        },
        {
          id: '3',
          name: 'Client Re-engagement Campaign',
          status: 'draft',
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

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600 dark:text-green-400'
      case 'decrease':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-500 dark:text-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <Card variant="accent" className="text-center">
        <CardContent className="p-8">
          <div className="flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mx-auto mb-4">
            <EnvelopeIcon className="w-8 h-8 text-primary-700 dark:text-primary-300" />
          </div>
          <h2 className="text-2xl font-bold text-primary-900 dark:text-primary-100 mb-2">
            Marketing Suite
          </h2>
          <p className="text-primary-700 dark:text-primary-300 mb-6">
            Engage your clients with targeted email and SMS campaigns. Build lasting relationships.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/marketing/campaigns">
              <Button size="lg" className="w-full sm:w-auto">
                <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                Create Campaign
              </Button>
            </Link>
            <Link href="/marketing/templates">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                <DocumentDuplicateIcon className="w-5 h-5 mr-2" />
                Browse Templates
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} variant="default" className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg text-teal-600 dark:text-teal-400">
                  {stat.icon}
                </div>
                {stat.changeType === 'increase' && (
                  <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stat.value}
              </div>
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {stat.label}
              </div>
              <div className={`text-sm ${getChangeColor(stat.changeType)}`}>
                {stat.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Campaigns</CardTitle>
            <Link href="/marketing/campaigns">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentCampaigns.map((campaign) => (
              <div key={campaign.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-teal-300 dark:hover:border-teal-700 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{campaign.name}</h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {campaign.sentDate && (
                        <span>Sent {new Date(campaign.sentDate).toLocaleDateString()}</span>
                      )}
                      {campaign.scheduledDate && (
                        <span>Scheduled for {new Date(campaign.scheduledDate).toLocaleDateString()}</span>
                      )}
                      {campaign.recipients > 0 && (
                        <span>{campaign.recipients} recipients</span>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(campaign.status)}
                </div>
                {campaign.openRate !== undefined && (
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Open Rate</div>
                      <div className="text-lg font-semibold text-teal-600 dark:text-teal-400">{campaign.openRate}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Click Rate</div>
                      <div className="text-lg font-semibold text-teal-600 dark:text-teal-400">{campaign.clickRate}%</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/marketing/booking-links">
          <Card variant="default" className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer group">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-lg group-hover:bg-teal-200 dark:group-hover:bg-teal-800/40 transition-colors">
                  <LinkIcon className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Booking Links & QR Codes</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Create trackable booking URLs
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div>
                  <span>Custom short URLs</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div>
                  <span>QR code generation</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div>
                  <span>Click & conversion tracking</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </Link>
        <Link href="/marketing/contacts">
          <Card variant="default" className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer group">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-800/40 transition-colors">
                  <UsersIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Manage Contacts</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Organize and segment your client lists
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                  <span>Import/export contacts</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                  <span>Create custom segments</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                  <span>Manage preferences</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </Link>

        <Link href="/marketing/analytics">
          <Card variant="default" className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer group">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                  <ChartBarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Campaign Analytics</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Track performance and engagement
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>Open and click rates</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>Engagement trends</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>ROI tracking</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}