'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface SettingCard {
  title: string
  description: string
  href: string
  icon: string
}

const settingsCards: SettingCard[] = [
  {
    title: 'Profile',
    description: 'Manage your personal information, password, and timezone settings',
    href: '/settings/profile',
    icon: '👤'
  },
  {
    title: 'Calendar Settings',
    description: 'Configure your calendar preferences and sync options',
    href: '/settings/calendar',
    icon: '📅'
  },
  {
    title: 'Notifications',
    description: 'Control how and when you receive notifications',
    href: '/settings/notifications',
    icon: '🔔'
  },
  {
    title: 'Preferences',
    description: 'Customize your app experience and display options',
    href: '/settings/preferences',
    icon: '⚙️'
  },
  {
    title: 'Integrations',
    description: 'Connect third-party services and manage API access',
    href: '/settings/integrations',
    icon: '🔗'
  },
  {
    title: 'Billing',
    description: 'View billing information and manage payment methods',
    href: '/settings/billing',
    icon: '💳'
  },
  {
    title: 'Test Data',
    description: 'Manage test data for exploring platform features',
    href: '/settings/test-data',
    icon: '🧪'
  },
  {
    title: 'Tracking Pixels',
    description: 'Manage conversion tracking pixels for your booking pages',
    href: '/settings/tracking-pixels',
    icon: '📊'
  }
]

export default function SettingsPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start space-x-4">
                <div className="text-3xl">{card.icon}</div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    {card.title}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {card.description}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center text-blue-600">
                <span className="text-sm font-medium">Manage</span>
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push('/settings/profile')}
              className="text-left p-4 bg-white rounded-md hover:bg-gray-50 transition-colors duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Update Profile</p>
                  <p className="text-sm text-gray-600">Change your name or email</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
            <button
              onClick={() => router.push('/settings/profile')}
              className="text-left p-4 bg-white rounded-md hover:bg-gray-50 transition-colors duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Change Password</p>
                  <p className="text-sm text-gray-600">Update your security settings</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}