'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  User, 
  Calendar, 
  Bell, 
  Settings2, 
  Link2, 
  Palette, 
  Building, 
  CreditCard, 
  FlaskConical, 
  BarChart3, 
  Shield, 
  Smartphone,
  Globe,
  Eye,
  ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface SettingCard {
  title: string
  description: string
  href: string
  icon: React.ElementType
  badge?: string
}

interface SettingSection {
  title: string
  description: string
  cards: SettingCard[]
}

const settingSections: SettingSection[] = [
  {
    title: 'Account & Profile',
    description: 'Personal information and account security',
    cards: [
      {
        title: 'Profile',
        description: 'Manage your personal information, password, and timezone settings',
        href: '/settings/profile',
        icon: User
      },
      {
        title: 'Notifications',
        description: 'Control how and when you receive notifications',
        href: '/settings/notifications',
        icon: Bell
      },
      {
        title: 'Security',
        description: 'Two-factor authentication, trusted devices, and login history',
        href: '/settings/security',
        icon: Shield,
        badge: 'Enhanced'
      },
      {
        title: 'Privacy',
        description: 'Data privacy controls and GDPR compliance settings',
        href: '/settings/privacy',
        icon: Eye
      }
    ]
  },
  {
    title: 'Business Operations',
    description: 'Calendar, booking pages and business settings',
    cards: [
      {
        title: 'Calendar Settings',
        description: 'Configure your calendar preferences and sync options',
        href: '/settings/calendar',
        icon: Calendar
      },
      {
        title: 'Landing Page',
        description: 'Customize your organization\'s landing page and booking experience',
        href: '/settings/landing-page',
        icon: Palette
      },
      {
        title: 'Homepage Builder',
        description: 'Create a professional homepage with advanced section-based design',
        href: '/settings/homepage-builder',
        icon: Building,
        badge: 'Advanced'
      },
      {
        title: 'Progressive Web App',
        description: 'App installation, offline mode, and push notifications',
        href: '/settings/pwa',
        icon: Smartphone,
        badge: 'PWA'
      }
    ]
  },
  {
    title: 'Integrations & Analytics',
    description: 'Connect external services and track performance',
    cards: [
      {
        title: 'Integrations',
        description: 'Connect third-party services like Google Calendar, Stripe, and more',
        href: '/settings/integrations',
        icon: Link2,
        badge: 'Enhanced'
      },
      {
        title: 'Tracking Pixels',
        description: 'Manage conversion tracking pixels for Google Ads, Meta, and analytics',
        href: '/settings/tracking-pixels',
        icon: BarChart3
      },
      {
        title: 'Preferences',
        description: 'Customize your app experience and display options',
        href: '/settings/preferences',
        icon: Settings2
      }
    ]
  },
  {
    title: 'System & Billing',
    description: 'Payment settings and development tools',
    cards: [
      {
        title: 'Billing',
        description: 'View billing information and manage payment methods',
        href: '/billing/plans',
        icon: CreditCard
      },
      {
        title: 'Test Data',
        description: 'Manage test data for exploring platform features',
        href: '/settings/test-data',
        icon: FlaskConical,
        badge: 'Dev'
      }
    ]
  }
]

export default function SettingsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50/80 dark:bg-gray-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                Settings Overview
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
                Manage your account and preferences
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-12">
          {settingSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-6">
              {/* Section Header */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {section.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {section.description}
                </p>
              </div>

              {/* Section Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {section.cards.map((card) => {
                  const IconComponent = card.icon
                  return (
                    <Card key={card.href} className="group hover:shadow-lg transition-all duration-200 border-0 shadow-sm bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800">
                      <Link href={card.href}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg group-hover:bg-teal-100 dark:group-hover:bg-teal-900/30 transition-colors">
                                <IconComponent className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                              </div>
                              <div>
                                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                  {card.title}
                                </CardTitle>
                                {card.badge && (
                                  <div className="mt-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300">
                                      {card.badge}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <CardDescription className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            {card.description}
                          </CardDescription>
                        </CardContent>
                      </Link>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions Section */}
        <div className="mt-16 bg-gradient-to-br from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 rounded-xl p-8 border border-teal-100 dark:border-teal-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Quick Actions
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Frequently used settings and shortcuts
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/settings/profile"
              className="group flex items-center justify-between p-4 bg-white/80 dark:bg-gray-800/80 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 border border-white/50 dark:border-gray-700/50 hover:shadow-md"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Update Profile</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Change your name or email</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/settings/security"
              className="group flex items-center justify-between p-4 bg-white/80 dark:bg-gray-800/80 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 border border-white/50 dark:border-gray-700/50 hover:shadow-md"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <Shield className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Security Settings</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">2FA and login security</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              href="/settings/integrations"
              className="group flex items-center justify-between p-4 bg-white/80 dark:bg-gray-800/80 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 border border-white/50 dark:border-gray-700/50 hover:shadow-md"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Link2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Connect Services</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manage integrations</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}