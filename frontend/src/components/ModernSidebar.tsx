'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useNavigation } from './NavigationProvider'
import { useTheme } from '@/contexts/ThemeContext'
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
  const { theme } = useTheme()

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
  }

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className={`h-screen flex flex-col transition-all duration-300 flex-shrink-0 ${
      isCollapsed ? 'w-20' : 'w-72'
    } ${theme === 'dark' ? 'sidebar-dark' : 'sidebar-light'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
              }`}>
                <BanknotesIcon className={`h-6 w-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`} />
              </div>
              <div>
                <h1 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>6FB Payouts</h1>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Professional Platform</p>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-2 rounded-lg transition-colors focus-ring ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-white/5'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
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
        <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
              theme === 'dark'
                ? 'bg-teal-600 text-white'
                : 'bg-teal-100 text-teal-700'
            }`}>
              {getUserInitials(user.first_name, user.last_name)}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {user.first_name} {user.last_name}
                </p>
                <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
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
              className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${
                isActive
                  ? theme === 'dark'
                    ? 'bg-teal-600 text-white'
                    : 'bg-teal-100 text-teal-700'
                  : theme === 'dark'
                    ? 'text-gray-300 hover:text-white hover:bg-white/5'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className={`text-xs truncate ${
                    isActive
                      ? theme === 'dark' ? 'text-teal-200' : 'text-teal-600'
                      : theme === 'dark' ? 'text-gray-300 group-hover:text-gray-200' : 'text-gray-600'
                  }`}>
                    {item.description}
                  </p>
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className={`px-4 py-4 border-t space-y-2 ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
        {/* Notifications */}
        <button className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 w-full ${
          theme === 'dark'
            ? 'text-gray-300 hover:text-white hover:bg-white/5'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`} title={isCollapsed ? 'Notifications' : undefined}>
          <BellIcon className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="font-medium">Notifications</p>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Recent updates</p>
            </div>
          )}
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${theme === 'dark' ? 'bg-teal-400' : 'bg-teal-500'}`}></div>
        </button>

        {/* Settings */}
        {bottomItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? theme === 'dark'
                    ? 'bg-teal-600 text-white'
                    : 'bg-teal-100 text-teal-700'
                  : theme === 'dark'
                    ? 'text-gray-300 hover:text-white hover:bg-white/5'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.name}</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{item.description}</p>
                </div>
              )}
            </Link>
          )
        })}

        {/* Logout */}
        {onLogout && (
          <button
            onClick={onLogout}
            className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 w-full ${
              theme === 'dark'
                ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                : 'text-red-600 hover:text-red-700 hover:bg-red-50'
            }`}
            title={isCollapsed ? 'Logout' : undefined}
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="font-medium">Logout</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Sign out</p>
              </div>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
