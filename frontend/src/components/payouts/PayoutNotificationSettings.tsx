'use client'

import { useState } from 'react'
import {
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ChatBubbleLeftIcon,
  UserGroupIcon,
  CogIcon
} from '@heroicons/react/24/outline'

interface NotificationChannel {
  id: string
  name: string
  icon: any
  enabled: boolean
  description: string
}

interface NotificationTrigger {
  id: string
  name: string
  description: string
  channels: {
    email: boolean
    sms: boolean
    push: boolean
    inApp: boolean
  }
}

interface RecipientGroup {
  id: string
  name: string
  description: string
  count: number
  enabled: boolean
}

export default function PayoutNotificationSettings() {
  const [channels, setChannels] = useState<NotificationChannel[]>([
    {
      id: 'email',
      name: 'Email',
      icon: EnvelopeIcon,
      enabled: true,
      description: 'Send notifications via email'
    },
    {
      id: 'sms',
      name: 'SMS',
      icon: DevicePhoneMobileIcon,
      enabled: true,
      description: 'Send text messages for urgent updates'
    },
    {
      id: 'push',
      name: 'Push Notifications',
      icon: BellIcon,
      enabled: false,
      description: 'Mobile app push notifications'
    },
    {
      id: 'inApp',
      name: 'In-App',
      icon: ChatBubbleLeftIcon,
      enabled: true,
      description: 'Show notifications in the dashboard'
    }
  ])

  const [triggers, setTriggers] = useState<NotificationTrigger[]>([
    {
      id: 'payout_initiated',
      name: 'Payout Initiated',
      description: 'When a payout is started',
      channels: { email: true, sms: false, push: true, inApp: true }
    },
    {
      id: 'payout_completed',
      name: 'Payout Completed',
      description: 'When funds are successfully transferred',
      channels: { email: true, sms: true, push: true, inApp: true }
    },
    {
      id: 'payout_failed',
      name: 'Payout Failed',
      description: 'When a payout fails or is rejected',
      channels: { email: true, sms: true, push: true, inApp: true }
    },
    {
      id: 'weekly_summary',
      name: 'Weekly Summary',
      description: 'Weekly payout summary report',
      channels: { email: true, sms: false, push: false, inApp: true }
    },
    {
      id: 'threshold_reached',
      name: 'Threshold Reached',
      description: 'When pending amount reaches payout threshold',
      channels: { email: true, sms: false, push: true, inApp: true }
    }
  ])

  const [recipientGroups, setRecipientGroups] = useState<RecipientGroup[]>([
    {
      id: 'barbers',
      name: 'Barbers',
      description: 'All active barbers in the system',
      count: 4,
      enabled: true
    },
    {
      id: 'admins',
      name: 'Administrators',
      description: 'Shop owners and managers',
      count: 2,
      enabled: true
    },
    {
      id: 'accounting',
      name: 'Accounting',
      description: 'Financial team members',
      count: 1,
      enabled: false
    }
  ])

  const [saving, setSaving] = useState(false)

  const toggleChannel = (channelId: string) => {
    setChannels(channels.map(channel =>
      channel.id === channelId
        ? { ...channel, enabled: !channel.enabled }
        : channel
    ))
  }

  const toggleTriggerChannel = (triggerId: string, channelType: keyof NotificationTrigger['channels']) => {
    setTriggers(triggers.map(trigger =>
      trigger.id === triggerId
        ? {
            ...trigger,
            channels: {
              ...trigger.channels,
              [channelType]: !trigger.channels[channelType]
            }
          }
        : trigger
    ))
  }

  const toggleRecipientGroup = (groupId: string) => {
    setRecipientGroups(groups => groups.map(group =>
      group.id === groupId
        ? { ...group, enabled: !group.enabled }
        : group
    ))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // API call to save notification settings
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Saving notification settings...')
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <BellIcon className="h-5 w-5 mr-2 text-violet-600" />
            Payout Notification Settings
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Configure how and when payout notifications are sent
          </p>
        </div>

        {/* Notification Channels */}
        <div className="mb-8">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Notification Channels</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {channels.map((channel) => {
              const Icon = channel.icon
              return (
                <div
                  key={channel.id}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    channel.enabled
                      ? 'border-violet-600 bg-violet-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${
                        channel.enabled ? 'bg-violet-600' : 'bg-gray-300'
                      }`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{channel.name}</p>
                        <p className="text-sm text-gray-600 mt-1">{channel.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleChannel(channel.id)}
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                      style={{ backgroundColor: channel.enabled ? '#7c3aed' : '#d1d5db' }}
                    >
                      <span
                        className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                        style={{ transform: channel.enabled ? 'translateX(1.25rem)' : 'translateX(0.25rem)' }}
                      />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Notification Triggers */}
        <div className="mb-8">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Notification Triggers</h4>
          <div className="space-y-4">
            {triggers.map((trigger) => (
              <div key={trigger.id} className="border border-gray-200 rounded-lg p-4">
                <div className="mb-3">
                  <h5 className="font-medium text-gray-900">{trigger.name}</h5>
                  <p className="text-sm text-gray-600">{trigger.description}</p>
                </div>
                <div className="flex items-center space-x-6">
                  {Object.entries(trigger.channels).map(([channel, enabled]) => {
                    const channelConfig = channels.find(c => c.id === channel)
                    if (!channelConfig?.enabled) return null

                    return (
                      <label key={channel} className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => toggleTriggerChannel(trigger.id, channel as any)}
                          className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700 capitalize">
                          {channel === 'inApp' ? 'In-App' : channel}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recipient Groups */}
        <div className="mb-8">
          <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
            <UserGroupIcon className="h-4 w-4 mr-2" />
            Recipient Groups
          </h4>
          <div className="space-y-3">
            {recipientGroups.map((group) => (
              <div
                key={group.id}
                className={`p-4 border rounded-lg transition-all ${
                  group.enabled
                    ? 'border-violet-300 bg-violet-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{group.name}</p>
                    <p className="text-sm text-gray-600">
                      {group.description} ({group.count} recipients)
                    </p>
                  </div>
                  <button
                    onClick={() => toggleRecipientGroup(group.id)}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                    style={{ backgroundColor: group.enabled ? '#7c3aed' : '#d1d5db' }}
                  >
                    <span
                      className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                      style={{ transform: group.enabled ? 'translateX(1.25rem)' : 'translateX(0.25rem)' }}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Settings */}
        <div className="border-t pt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
            <CogIcon className="h-4 w-4 mr-2" />
            Additional Settings
          </h4>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Digest Mode</p>
                <p className="text-xs text-gray-500">Combine multiple notifications into a single message</p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
              />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Quiet Hours</p>
                <p className="text-xs text-gray-500">No notifications between 10 PM - 8 AM</p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
              />
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
