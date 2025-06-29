'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getProfile, type User } from '@/lib/api'
import { Card } from '@/components/ui/Card'
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
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Check if user has access to analytics
  const checkAnalyticsAccess = (userRole: string | undefined): boolean => {
    if (!userRole) return false
    
    const allowedRoles = ['enterprise_owner', 'location_manager', 'barber', 'admin', 'super_admin']
    return allowedRoles.includes(userRole)
  }

  // Filter navigation items based on user role
  const getFilteredNavigation = (userRole: string | undefined): NavigationItem[] => {
    if (!userRole) return []
    
    return navigationItems.filter(item => 
      item.allowedRoles.includes(userRole) || 
      ['admin', 'super_admin'].includes(userRole)
    )
  }

  // Generate breadcrumbs
  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs = [
      { label: 'Dashboard', href: '/dashboard', icon: HomeIcon }
    ]
    
    let currentPath = ''
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`
      
      if (segment === 'analytics') {
        breadcrumbs.push({
          label: 'Analytics',
          href: '/analytics',
          icon: ChartBarIcon
        })
      } else {
        const navItem = navigationItems.find(item => item.href.endsWith(segment))
        breadcrumbs.push({
          label: navItem?.name || segment.charAt(0).toUpperCase() + segment.slice(1),
          href: currentPath,
          icon: navItem?.icon || ChartBarIcon
        })
      }
    })
    
    return breadcrumbs
  }

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true)
        const userData = await getProfile()
        setUser(userData)
        
        // Check analytics access
        if (!checkAnalyticsAccess(userData.role)) {
          setAccessDenied(true)
          // Redirect customers to dashboard
          if (userData.role === 'customer') {
            router.replace('/dashboard')
            return
          }
        }
      } catch (error) {
        console.error('Failed to load user profile:', error)
        router.replace('/login')
      } finally {
        setLoading(false)
      }
    }

    loadUserProfile()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-surface-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-gray-800 dark:text-gray-200 text-sm">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (accessDenied || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-surface-100 flex items-center justify-center p-6">
        <Card variant="outlined" className="max-w-md w-full text-center">
          <div className="p-8">
            <div className="w-16 h-16 bg-error-100 dark:bg-error-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <ChartBarIcon className="w-8 h-8 text-error-600 dark:text-error-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You don't have permission to access analytics. Analytics are available for barbers, location managers, and enterprise owners.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const breadcrumbs = getBreadcrumbs()
  const filteredNavigation = getFilteredNavigation(user.role)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-surface-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.href}>
              {index > 0 && <ChevronRightIcon className="w-4 h-4" />}
              <Link
                href={crumb.href}
                className={`flex items-center space-x-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors ${
                  index === breadcrumbs.length - 1 
                    ? 'text-gray-900 dark:text-white font-medium' 
                    : ''
                }`}
              >
                <crumb.icon className="w-4 h-4" />
                <span>{crumb.label}</span>
              </Link>
            </React.Fragment>
          ))}
        </nav>

        {/* Analytics Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {user.role === 'enterprise_owner' && 'Comprehensive multi-location analytics and insights'}
            {user.role === 'location_manager' && 'Location-specific analytics and performance metrics'}
            {user.role === 'barber' && 'Personal performance analytics and client insights'}
            {(['admin', 'super_admin'].includes(user.role || '')) && 'System-wide analytics and administrative insights'}
          </p>
        </div>

        {/* Analytics Navigation */}
        {pathname === '/analytics' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {filteredNavigation.map((item) => (
              <Link key={item.href} href={item.href}>
                <Card 
                  variant="default" 
                  className="h-full hover:shadow-lg transition-all duration-200 cursor-pointer group"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg group-hover:bg-primary-200 dark:group-hover:bg-primary-800/40 transition-colors">
                        <item.icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.description}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 mb-6">
            {filteredNavigation.map((item) => (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-700 hover:text-gray-900 dark:hover:text-white'
                }`}>
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Page Content */}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  )
}