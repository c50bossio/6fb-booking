'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  PaperAirplaneIcon,
  ClockIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
  PencilIcon,
  TrashIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline'

export interface Campaign {
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

interface CampaignCardProps {
  campaign: Campaign
  onEdit?: (campaign: Campaign) => void
  onDelete?: (campaign: Campaign) => void
  onViewAnalytics?: (campaign: Campaign) => void
}

export default function CampaignCard({ campaign, onEdit, onDelete, onViewAnalytics }: CampaignCardProps) {
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
      sending: <PaperAirplaneIcon className="w-3 h-3 animate-pulse" />
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

  return (
    <Card className="hover:shadow-lg transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              {campaign.name}
            </h3>
            <div className="flex items-center gap-2">
              {getTypeBadge(campaign.type)}
              {getStatusBadge(campaign.status)}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {campaign.status === 'sent' && onViewAnalytics && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onViewAnalytics(campaign)}
                title="View Analytics"
              >
                <ChartBarIcon className="w-4 h-4" />
              </Button>
            )}
            {campaign.status === 'draft' && onEdit && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onEdit(campaign)}
                title="Edit Campaign"
              >
                <PencilIcon className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                onClick={() => onDelete(campaign)}
                title="Delete Campaign"
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center justify-between">
            <span>Created</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {new Date(campaign.createdAt).toLocaleDateString()}
            </span>
          </div>

          {campaign.sentAt && (
            <div className="flex items-center justify-between">
              <span>Sent</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {new Date(campaign.sentAt).toLocaleDateString()}
              </span>
            </div>
          )}

          {campaign.scheduledFor && (
            <div className="flex items-center justify-between">
              <span>Scheduled for</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {new Date(campaign.scheduledFor).toLocaleDateString()}
              </span>
            </div>
          )}

          {campaign.recipients > 0 && (
            <div className="flex items-center justify-between">
              <span>Recipients</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {campaign.recipients.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {campaign.openRate !== undefined && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Open Rate</div>
                <div className="text-lg font-semibold text-teal-600 dark:text-teal-400">
                  {campaign.openRate}%
                </div>
              </div>
              {campaign.clickRate !== undefined && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Click Rate</div>
                  <div className="text-lg font-semibold text-teal-600 dark:text-teal-400">
                    {campaign.clickRate}%
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {campaign.status === 'draft' && (
          <div className="mt-4 flex gap-2">
            <Button size="sm" className="flex-1">
              <PencilIcon className="w-4 h-4 mr-1" />
              Continue Editing
            </Button>
            <Button size="sm" variant="outline">
              <PaperAirplaneIcon className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}