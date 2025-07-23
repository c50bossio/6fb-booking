'use client'

import { memo } from 'react'
import { BellIcon, ChatBubbleLeftRightIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface NotificationPreferencesProps {
  sendSMS: boolean
  sendEmail: boolean
  onSMSChange: (value: boolean) => void
  onEmailChange: (value: boolean) => void
  className?: string
}

export const NotificationPreferences = memo(function NotificationPreferences({
  sendSMS,
  sendEmail,
  onSMSChange,
  onEmailChange,
  className = ''
}: NotificationPreferencesProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <BellIcon className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Notification Preferences
        </h3>
      </div>
      
      <div className="space-y-3 pl-6">
        <NotificationOption
          icon={<ChatBubbleLeftRightIcon className="w-4 h-4 text-gray-400" />}
          label="SMS Notification"
          description="Send confirmation via text message"
          checked={sendSMS}
          onChange={onSMSChange}
          id="sms-notification"
        />
        
        <NotificationOption
          icon={<EnvelopeIcon className="w-4 h-4 text-gray-400" />}
          label="Email Notification"
          description="Send confirmation via email"
          checked={sendEmail}
          onChange={onEmailChange}
          id="email-notification"
        />
      </div>
    </div>
  )
})

// Individual notification option
const NotificationOption = memo(function NotificationOption({
  icon,
  label,
  description,
  checked,
  onChange,
  id
}: {
  icon: React.ReactNode
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
  id: string
}) {
  return (
    <label 
      htmlFor={id}
      className="flex items-start gap-3 cursor-pointer group"
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
      />
      <div className="flex items-start gap-3 flex-1">
        {icon}
        <div className="flex-1">
          <span className="text-sm text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {label}
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
    </label>
  )
})

// Compact version for smaller modals
export const CompactNotificationPreferences = memo(function CompactNotificationPreferences({
  sendNotification,
  onNotificationChange,
  className = ''
}: {
  sendNotification: boolean
  onNotificationChange: (value: boolean) => void
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <input
        type="checkbox"
        id="sendNotification"
        checked={sendNotification}
        onChange={(e) => onNotificationChange(e.target.checked)}
        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
      />
      <label 
        htmlFor="sendNotification" 
        className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
      >
        Send confirmation notification to client
      </label>
    </div>
  )
})