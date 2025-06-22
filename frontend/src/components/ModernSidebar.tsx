'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useNavigation } from './NavigationProvider'
import {
  HomeIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ChartBarIcon,
  CreditCardIcon,
  BanknotesIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UsersIcon,
  BuildingLibraryIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline'

interface SidebarProps {
  user?: {
    first_name: string
    last_name: string
    email: string
    role: string
  }
  onLogout?: () => void
}

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    description: 'Overview & Analytics'
  },
  {
    name: 'Calendar',
    href: '/dashboard/calendar',
    icon: CalendarDaysIcon,
    description: 'Calendar View'
  },
  {
    name: 'Appointments',
    href: '/appointments',
    icon: ClipboardDocumentListIcon,
    description: 'Schedule Management'
  },
  {
    name: 'Barbers',
    href: '/barbers',
    icon: UserGroupIcon,
    description: 'Team Management'
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: ChartBarIcon,
    description: 'Performance Insights'
  },
  {
    name: 'Payments',
    href: '/payments',
    icon: CreditCardIcon,
    description: 'Payment Processing'
  },
  {
    name: 'Payouts',
    href: '/payouts',
    icon: BanknotesIcon,
    description: 'Revenue Distribution'
  },
  {
    name: 'Clients',
    href: '/clients',
    icon: UsersIcon,
    description: 'Client Management'
  },
  {
    name: 'Notifications',
    href: '/notifications',
    icon: BellIcon,
    description: 'Messages & Notifications'
  },
  {
    name: 'Locations',
    href: '/locations',
    icon: BuildingLibraryIcon,
    description: 'Shop Management'
  },
]

const bottomItems = [
  {
    name: 'Settings',
    href: '/settings',
    icon: Cog6ToothIcon,
    description: 'System Configuration'
  }
]

export default function ModernSidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname()
  const { isCollapsed, setIsCollapsed } = useNavigation()

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
  }

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className={`sidebar-dark h-screen flex flex-col transition-all duration-300 flex-shrink-0 ${
      isCollapsed ? 'w-20' : 'w-72'
    }`}>
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BanknotesIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg">6FB Payouts</h1>
                <p className="text-gray-400 text-xs">Professional Platform</p>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors focus-ring"
          >
            {isCollapsed ? (
              <ChevronRightIcon className="h-5 w-5" />
            ) : (
              <ChevronLeftIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* User Profile */}
      {user && (
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="user-avatar">
              {getUserInitials(user.first_name, user.last_name)}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-gray-400 text-xs truncate">
                  {formatRole(user.role)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`sidebar-nav-item group ${isActive ? 'active' : ''}`}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 truncate group-hover:text-gray-300">
                    {item.description}
                  </p>
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="px-4 py-4 border-t border-white/10 space-y-2">
        {/* Notifications */}
        <button className="sidebar-nav-item w-full" title={isCollapsed ? 'Notifications' : undefined}>
          <BellIcon className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="font-medium">Notifications</p>
              <p className="text-xs text-gray-400">Recent updates</p>
            </div>
          )}
          <div className="w-2 h-2 bg-violet-500 rounded-full flex-shrink-0"></div>
        </button>

        {/* Settings */}
        {bottomItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.description}</p>
                </div>
              )}
            </Link>
          )
        })}

        {/* Logout */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="sidebar-nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
            title={isCollapsed ? 'Logout' : undefined}
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium">Logout</p>
                <p className="text-xs text-gray-400">Sign out</p>
              </div>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
