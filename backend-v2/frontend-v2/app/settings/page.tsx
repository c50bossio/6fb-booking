'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  MagnifyingGlassIcon,
  UserIcon,
  CalendarIcon,
  BellIcon,
  CogIcon,
  CloudIcon,
  RectangleStackIcon,
  CreditCardIcon,
  BeakerIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'

interface SettingCard {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  category: 'account' | 'business' | 'system' | 'preferences'
  roles?: string[]
  keywords: string[]
}

const settingsCards: SettingCard[] = [
  // Account & Profile
  {
    title: 'Setup & Onboarding',
    description: 'Manage your account setup process and restart the welcome wizard',
    href: '/settings/onboarding',
    icon: '🚀'
  },
  {
    title: 'Profile',
    description: 'Manage your personal information, password, and timezone settings',
    href: '/settings/profile',
    icon: UserIcon,
    category: 'account',
    keywords: ['profile', 'personal', 'information', 'password', 'timezone', 'email', 'name']
  },
  {
    title: 'Security',
    description: 'Manage security settings, two-factor authentication, and trusted devices',
    href: '/settings/security',
    icon: ShieldCheckIcon,
    category: 'account',
    keywords: ['security', 'password', '2fa', 'authentication', 'trusted', 'devices', 'login']
  },
  {
    title: 'Notifications',
    description: 'Control how and when you receive notifications and alerts',
    href: '/settings/notifications',
    icon: BellIcon,
    category: 'account',
    keywords: ['notifications', 'alerts', 'email', 'sms', 'push', 'reminders']
  },

  // Business Tools
  {
    title: 'Calendar Settings',
    description: 'Configure your calendar preferences and sync options',
    href: '/settings/calendar',
    icon: CalendarIcon,
    category: 'business',
    keywords: ['calendar', 'sync', 'google', 'outlook', 'appointments', 'scheduling']
  },
  {
    title: 'Integrations',
    description: 'Connect third-party services and manage API access',
    href: '/settings/integrations',
    icon: CloudIcon,
    category: 'business',
    keywords: ['integrations', 'api', 'third-party', 'connect', 'services', 'oauth']
  },
  {
    title: 'Landing Page',
    description: 'Customize your organization\'s landing page and booking experience',
    href: '/settings/landing-page',
    icon: RectangleStackIcon,
    category: 'business',
    roles: ['admin', 'super_admin'],
    keywords: ['landing', 'page', 'booking', 'customize', 'branding', 'organization']
  },
  {
    title: 'Tracking Pixels',
    description: 'Manage conversion tracking pixels for your booking pages',
    href: '/settings/tracking-pixels',
    icon: ChartBarIcon,
    category: 'business',
    roles: ['admin', 'super_admin'],
    keywords: ['tracking', 'pixels', 'conversion', 'analytics', 'facebook', 'google']
  },

  // System & Data
  {
    title: 'Test Data',
    description: 'Manage test data for exploring platform features',
    href: '/settings/test-data',
    icon: BeakerIcon,
    category: 'system',
    roles: ['admin', 'super_admin'],
    keywords: ['test', 'data', 'sample', 'demo', 'explore', 'features']
  },
  {
    title: 'Privacy Settings',
    description: 'Privacy and data protection settings',
    href: '/settings/privacy',
    icon: ShieldCheckIcon,
    category: 'system',
    roles: ['admin', 'super_admin'],
    keywords: ['privacy', 'data', 'protection', 'gdpr', 'cookies', 'consent']
  },
  {
    title: 'PWA Settings',
    description: 'Progressive Web App configuration and mobile settings',
    href: '/settings/pwa',
    icon: DevicePhoneMobileIcon,
    category: 'system',
    roles: ['admin', 'super_admin'],
    keywords: ['pwa', 'progressive', 'web', 'app', 'mobile', 'install', 'offline']
  },

  // Preferences
  {
    title: 'General Preferences',
    description: 'Customize your app experience and display options',
    href: '/settings/preferences',
    icon: CogIcon,
    category: 'preferences',
    keywords: ['preferences', 'display', 'theme', 'language', 'timezone', 'customization']
  },
  {
    title: 'Billing',
    description: 'View billing information and manage payment methods',
    href: '/settings/billing',
    icon: CreditCardIcon,
    category: 'preferences',
    keywords: ['billing', 'payment', 'subscription', 'invoice', 'credit', 'card']
  }
]

const categoryNames = {
  account: 'Account & Profile',
  business: 'Business Tools',
  system: 'System & Data',
  preferences: 'Preferences'
}

const categoryDescriptions = {
  account: 'Personal settings and security',
  business: 'Tools for managing your business',
  system: 'Advanced system configurations',
  preferences: 'App preferences and billing'
}

export default function SettingsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

  // Filter settings based on user role and search query
  const filteredSettings = useMemo(() => {
    let filtered = settingsCards.filter(card => {
      // Role-based filtering
      if (card.roles && card.roles.length > 0) {
        if (!user?.role || !card.roles.includes(user.role)) {
          return false
        }
      }

      // Search filtering
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        return (
          card.title.toLowerCase().includes(query) ||
          card.description.toLowerCase().includes(query) ||
          card.keywords.some(keyword => keyword.toLowerCase().includes(query))
        )
      }

      return true
    })

    // Group by category
    const grouped: Record<string, SettingCard[]> = {}
    filtered.forEach(card => {
      if (!grouped[card.category]) {
        grouped[card.category] = []
      }
      grouped[card.category].push(card)
    })

    return grouped
  }, [user?.role, searchQuery])

  const hasSearchResults = Object.keys(filteredSettings).length > 0

  return (
    <main className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account settings and preferences</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors duration-200"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        </div>

        {/* Settings Categories */}
        {hasSearchResults ? (
          <div className="space-y-8">
            {Object.entries(filteredSettings).map(([category, cards]) => (
              <div key={category}>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {categoryNames[category as keyof typeof categoryNames]}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {categoryDescriptions[category as keyof typeof categoryDescriptions]}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cards.map((card) => {
                    const IconComponent = card.icon
                    return (
                      <Link
                        key={card.href}
                        href={card.href}
                        className="block p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md dark:hover:shadow-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 group"
                      >
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors duration-200">
                            <IconComponent className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-900 dark:group-hover:text-blue-100 transition-colors duration-200">
                              {card.title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                              {card.description}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                          <span className="text-sm font-medium">Configure</span>
                          <ChevronRightIcon className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No settings found</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Try adjusting your search terms or browse all categories above.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Quick Actions */}
        {!searchQuery && (
          <div className="mt-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => router.push('/settings/profile')}
                className="text-left p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <UserIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Update Profile</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Change your name or email</p>
                    </div>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-200" />
                </div>
              </button>
              <button
                onClick={() => router.push('/settings/security')}
                className="text-left p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <ShieldCheckIcon className="h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Security Settings</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Update your security settings</p>
                    </div>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all duration-200" />
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}