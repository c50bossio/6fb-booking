'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/contexts/ThemeContext'
import {
  HomeIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ChartBarIcon,
  CreditCardIcon,
  BanknotesIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  SunIcon,
  MoonIcon
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
    description: 'Schedule Management'
  },
  {
    name: 'Appointments',
    href: '/dashboard/appointments',
    icon: ClipboardDocumentListIcon,
    description: 'Booking Management'
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
    href: '/barber-payments',
    icon: BanknotesIcon,
    description: 'Revenue Distribution'
  },
  {
    name: 'Clients',
    href: '/clients',
    icon: UsersIcon,
    description: 'Client Management'
  },
]

export default function DemoModernSidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  // Debug: Log when component mounts
  useEffect(() => {
    console.log('DemoModernSidebar mounted, theme:', theme)
  }, [theme])

  const demoUser = user || {
    first_name: 'Demo',
    last_name: 'User',
    email: 'demo@bookbarber.com',
    role: 'admin'
  }

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
  }

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const handleDemoLogout = () => {
    if (confirm('Exit demo mode and return to main site?')) {
      window.location.href = '/'
    }
  }

  return (
    <aside 
      className={`h-screen flex flex-col transition-all duration-300 flex-shrink-0 sticky top-0 left-0 ${
        isCollapsed ? 'w-20' : 'w-72'
      } ${theme === 'dark' ? 'sidebar-dark' : 'sidebar-light'}`}
      style={{ 
        minHeight: '100vh', 
        zIndex: 10,
        backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
        borderRight: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
        width: isCollapsed ? '5rem' : '18rem'
      }}>
      {/* Header */}
      <div className={`p-6 border-b ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BanknotesIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  BookBarber
                </h1>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Demo Mode
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-white/5 focus:ring-offset-slate-900'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:ring-offset-white'
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

      {/* Demo User Profile */}
      <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
            theme === 'dark'
              ? 'bg-violet-600 text-white'
              : 'bg-violet-100 text-violet-700'
          }`}>
            {getUserInitials(demoUser.first_name, demoUser.last_name)}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {demoUser.first_name} {demoUser.last_name}
              </p>
              <p className={`text-xs truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {formatRole(demoUser.role)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/app' && pathname.startsWith(item.href + '/'))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 group ${
                isActive
                  ? theme === 'dark'
                    ? 'bg-violet-600 text-white'
                    : 'bg-violet-100 text-violet-700'
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
                      ? theme === 'dark' ? 'text-violet-200' : 'text-violet-600'
                      : theme === 'dark' ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-500'
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
        {/* Theme Toggle - Prominent styling */}
        <button
          onClick={toggleTheme}
          className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 w-full border-2 ${
            theme === 'dark'
              ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-400/50'
              : 'text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-200 hover:border-purple-300'
          }`}
          title={isCollapsed ? 'Toggle Theme' : undefined}
        >
          {theme === 'dark' ? (
            <SunIcon className="h-5 w-5 flex-shrink-0" />
          ) : (
            <MoonIcon className="h-5 w-5 flex-shrink-0" />
          )}
          {!isCollapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="font-semibold">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </p>
              <p className={`text-xs ${theme === 'dark' ? 'text-yellow-300' : 'text-purple-500'}`}>
                Switch theme
              </p>
            </div>
          )}
        </button>

        {/* Notifications */}
        <button className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 w-full ${
          theme === 'dark'
            ? 'text-gray-300 hover:text-white hover:bg-white/5'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        }`} title={isCollapsed ? 'Notifications' : undefined}>
          <BellIcon className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="font-medium">Notifications</p>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Recent updates
              </p>
            </div>
          )}
          <div className="w-2 h-2 bg-violet-500 rounded-full flex-shrink-0"></div>
        </button>

        {/* Settings */}
        <Link
          href="/app/settings"
          className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 ${
            pathname === '/app/settings'
              ? theme === 'dark'
                ? 'bg-violet-600 text-white'
                : 'bg-violet-100 text-violet-700'
              : theme === 'dark'
                ? 'text-gray-300 hover:text-white hover:bg-white/5'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title={isCollapsed ? 'Settings' : undefined}
        >
          <Cog6ToothIcon className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-medium">Settings</p>
              <p className={`text-xs ${
                pathname === '/app/settings'
                  ? theme === 'dark' ? 'text-violet-200' : 'text-violet-600'
                  : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Configuration
              </p>
            </div>
          )}
        </Link>

        {/* Exit Demo */}
        <button
          onClick={handleDemoLogout}
          className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 w-full ${
            theme === 'dark'
              ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
              : 'text-red-600 hover:text-red-700 hover:bg-red-50'
          }`}
          title={isCollapsed ? 'Exit Demo' : undefined}
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="font-medium">Exit Demo</p>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Return to main site
              </p>
            </div>
          )}
        </button>
      </div>
    </aside>
  )
}
