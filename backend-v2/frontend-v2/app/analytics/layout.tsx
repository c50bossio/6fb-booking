import React from 'react'
import { Card } from "@/components/ui/Card"
import Link from 'next/link'
import { 
  ChartBarIcon,
  CurrencyDollarIcon,
  UsersIcon,
  TrophyIcon,
  HomeIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

interface AnalyticsLayoutProps {
  children: React.ReactNode
}

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  allowedRoles: string[]
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Overview',
    href: '/analytics/overview',
    icon: ChartBarIcon,
    description: 'Comprehensive analytics overview',
    allowedRoles: ['enterprise_owner', 'location_manager', 'barber']
  },
  {
    name: 'Revenue',
    href: '/analytics/revenue',
    icon: CurrencyDollarIcon,
    description: 'Revenue deep-dive analysis',
    allowedRoles: ['enterprise_owner', 'location_manager', 'barber']
  },
  {
    name: 'Clients',
    href: '/analytics/clients',
    icon: UsersIcon,
    description: 'Client analytics and insights',
    allowedRoles: ['enterprise_owner', 'location_manager', 'barber']
  },
  {
    name: 'Performance',
    href: '/analytics/performance',
    icon: TrophyIcon,
    description: 'Performance metrics and goals',
    allowedRoles: ['enterprise_owner', 'location_manager', 'barber']
  }
]

export default function AnalyticsLayout({ children }: AnalyticsLayoutProps) {
  // Simple layout without client-side logic
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-surface-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Analytics Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Analytics and insights for your business
          </p>
        </div>

        {/* Page Content */}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  )
}