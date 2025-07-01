'use client'

import { useState, useEffect, useRef } from 'react'
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
  ScissorsIcon,
  EnvelopeIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'
import ThemeDropdown from './ThemeDropdown'

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
    description: 'Calendar & Recurring'
  },
  {
    name: 'Schedule Management',
    href: '/appointments',
    icon: ClipboardDocumentListIcon,
    description: 'Appointment Booking'
  },
  {
    name: 'Services',
    href: '/dashboard/services',
    icon: ScissorsIcon,
    description: 'Service Catalog'
  },
  {
    name: 'Barbers',
    href: '/barbers',
    icon: UserGroupIcon,
    description: 'Team Management'
  },
  {
    name: 'Clients',
    href: '/clients',
    icon: UsersIcon,
    description: 'Client Management'
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: ChartBarIcon,
    description: 'AI Insights'
  },
  {
    name: 'Email Campaigns',
    href: '/email-campaigns',
    icon: EnvelopeIcon,
    description: 'Marketing Automation'
  },
  {
    name: 'Local SEO',
    href: '/local-seo',
    icon: MapPinIcon,
    description: 'Search Optimization'
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
]

export default function DemoModernSidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname()
  const { theme, cycleTheme } = useTheme()
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Ripple effect handler
  const createRipple = (event: React.MouseEvent, element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const ripple = document.createElement('span')
    ripple.className = 'ripple-effect'
    ripple.style.left = x + 'px'
    ripple.style.top = y + 'px'
    ripple.style.width = '10px'
    ripple.style.height = '10px'

    element.appendChild(ripple)

    setTimeout(() => {
      ripple.remove()
    }, 600)
  }

  // Get theme-specific CSS variables
  const getThemeVariables = () => {
    switch (theme) {
      case 'light':
        return {
          '--accent-color': '#0d9488',
          '--accent-color-light': '#14b8a6',
          '--glass-bg': 'rgba(255, 255, 255, 0.1)',
          '--shadow-color': 'rgba(0, 0, 0, 0.1)'
        }
      case 'soft-light':
        return {
          '--accent-color': '#7c9885',
          '--accent-color-light': '#8da591',
          '--glass-bg': 'rgba(245, 245, 240, 0.2)',
          '--shadow-color': 'rgba(124, 152, 133, 0.2)'
        }
      case 'dark':
        return {
          '--accent-color': '#0d9488',
          '--accent-color-light': '#14b8a6',
          '--glass-bg': 'rgba(0, 0, 0, 0.2)',
          '--shadow-color': 'rgba(13, 148, 136, 0.3)'
        }
      case 'charcoal':
        return {
          '--accent-color': '#6b7280',
          '--accent-color-light': '#9ca3af',
          '--glass-bg': 'rgba(26, 26, 26, 0.3)',
          '--shadow-color': 'rgba(107, 114, 128, 0.2)'
        }
      default:
        return {
          '--accent-color': '#0d9488',
          '--accent-color-light': '#14b8a6',
          '--glass-bg': 'rgba(255, 255, 255, 0.1)',
          '--shadow-color': 'rgba(0, 0, 0, 0.1)'
        }
    }
  }

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
      } ${theme === 'dark' ? 'sidebar-dark' : theme === 'charcoal' ? 'sidebar-charcoal' : 'sidebar-light'}`}
      style={{
        ...getThemeVariables(),
        minHeight: '100vh',
        zIndex: 10,
        backgroundColor: theme === 'dark' ? '#0f172a' : theme === 'charcoal' ? '#1a1a1a' : '#ffffff',
        borderRight: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : theme === 'charcoal' ? '1px solid #2a2a2a' : '1px solid rgba(0, 0, 0, 0.1)',
        width: isCollapsed ? '5rem' : '18rem'
      }}>
      {/* Header */}
      <div className={`p-6 border-b ${theme === 'dark' ? 'border-white/10' : theme === 'charcoal' ? 'border-[#2a2a2a]' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                theme === 'soft-light'
                  ? 'bg-gradient-to-br from-[#7c9885] to-[#6a8574]'
                  : theme === 'charcoal'
                  ? 'bg-gradient-to-br from-gray-600 to-gray-700'
                  : 'bg-gradient-to-br from-teal-600 to-teal-700'
              }`}>
                <BanknotesIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className={`font-bold text-lg ${theme === 'dark' || theme === 'charcoal' ? 'text-white' : 'text-gray-900'}`}>
                  BookedBarber
                </h1>
                <p className={`text-xs ${theme === 'dark' || theme === 'charcoal' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Professional Platform
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              theme === 'dark'
                ? 'text-gray-400 hover:text-white hover:bg-white/5 focus:ring-teal-600 focus:ring-offset-slate-900'
                : theme === 'soft-light'
                ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:ring-[#7c9885] focus:ring-offset-white'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 focus:ring-teal-600 focus:ring-offset-white'
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
      <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-white/10' : theme === 'charcoal' ? 'border-[#2a2a2a]' : 'border-gray-200'}`}>
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
            theme === 'dark'
              ? 'bg-teal-600 text-white'
              : theme === 'soft-light'
              ? 'bg-[#7c9885] text-white'
              : theme === 'charcoal'
              ? 'bg-gray-600 text-white'
              : 'bg-teal-100 text-teal-700'
          }`}>
            {getUserInitials(demoUser.first_name, demoUser.last_name)}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm truncate ${theme === 'dark' || theme === 'charcoal' ? 'text-white' : 'text-gray-900'}`}>
                {demoUser.first_name} {demoUser.last_name}
              </p>
              <p className={`text-xs truncate ${theme === 'dark' || theme === 'charcoal' ? 'text-gray-400' : 'text-gray-500'}`}>
                {formatRole(demoUser.role)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navigationItems.map((item, index) => {
          const Icon = item.icon
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && item.href !== '/app' && pathname.startsWith(item.href + '/'))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                sidebar-menu-item sidebar-fade-in sidebar-stagger-${index + 1}
                flex items-center space-x-3 px-3 py-3 rounded-xl
                transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) group
                ${isActive ? 'active' : ''}
                ${
                  isActive
                    ? theme === 'dark'
                      ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-500/25 glass-effect'
                      : theme === 'soft-light'
                      ? 'bg-gradient-to-r from-[#7c9885] to-[#8da591] text-white shadow-lg shadow-[#7c9885]/25 glass-effect'
                      : theme === 'charcoal'
                      ? 'bg-gradient-to-r from-gray-600 to-gray-500 text-white shadow-lg shadow-gray-500/25 glass-effect'
                      : 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-500/25 glass-effect'
                    : theme === 'dark'
                    ? 'text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-white/5 hover:to-white/10'
                    : theme === 'soft-light'
                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gradient-to-r hover:from-[#f5f5f0] hover:to-white/50'
                    : theme === 'charcoal'
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gradient-to-r hover:from-[#2a2a2a] hover:to-[#1f1f1f]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100'
                }
              `}
              title={isCollapsed ? item.name : undefined}
              onClick={(e) => createRipple(e, e.currentTarget)}
            >
              <Icon className="h-5 w-5 flex-shrink-0 icon" />
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate tracking-wide">{item.name}</p>
                  <p className={`text-xs truncate mt-0.5 ${
                    isActive
                      ? theme === 'dark' ? 'text-teal-100/90' :
                        theme === 'soft-light' ? 'text-white/90' :
                        theme === 'charcoal' ? 'text-gray-200/90' : 'text-teal-100/90'
                      : theme === 'dark' || theme === 'charcoal' ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-500 group-hover:text-gray-600'
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
      <div className={`px-4 py-4 border-t space-y-2 ${theme === 'dark' ? 'border-white/10' : theme === 'charcoal' ? 'border-[#2a2a2a]' : 'border-gray-200'}`}>
        {/* Theme Dropdown */}
        <div className={`${isCollapsed ? 'px-2' : 'px-3'} py-2`}>
          <ThemeDropdown isCollapsed={isCollapsed} />
        </div>

        {/* Notifications */}
        <button
          className={`
            sidebar-menu-item flex items-center space-x-3 px-3 py-3 rounded-xl
            transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) w-full group
            ${theme === 'dark'
              ? 'text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-white/5 hover:to-white/10'
              : theme === 'soft-light'
              ? 'text-gray-600 hover:text-gray-900 hover:bg-gradient-to-r hover:from-[#f5f5f0] hover:to-white/50'
              : theme === 'charcoal'
              ? 'text-gray-400 hover:text-gray-200 hover:bg-gradient-to-r hover:from-[#2a2a2a] hover:to-[#1f1f1f]'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100'
            }
          `}
          title={isCollapsed ? 'Notifications' : undefined}
          onClick={(e) => createRipple(e, e.currentTarget)}
        >
          <BellIcon className="h-5 w-5 flex-shrink-0 icon" />
          {!isCollapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="font-medium tracking-wide">Notifications</p>
              <p className={`text-xs mt-0.5 ${theme === 'dark' || theme === 'charcoal' ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-500 group-hover:text-gray-600'}`}>
                Recent updates
              </p>
            </div>
          )}
          <div className={`w-2 h-2 rounded-full flex-shrink-0 notification-badge ${
            theme === 'soft-light' ? 'bg-[#7c9885]' :
            theme === 'charcoal' ? 'bg-gray-500' : 'bg-teal-500'
          }`}></div>
        </button>

        {/* Settings */}
        <Link
          href="/settings"
          className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 ${
            pathname === '/settings'
              ? theme === 'dark'
                ? 'bg-teal-600 text-white'
                : theme === 'soft-light'
                ? 'bg-[#7c9885] text-white'
                : theme === 'charcoal'
                ? 'bg-gray-600 text-white'
                : 'bg-teal-100 text-teal-700'
              : theme === 'dark'
                ? 'text-gray-300 hover:text-white hover:bg-white/5'
                : theme === 'charcoal'
                ? 'text-gray-400 hover:text-gray-200 hover:bg-[#2a2a2a]'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title={isCollapsed ? 'Settings' : undefined}
        >
          <Cog6ToothIcon className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-medium">Settings</p>
              <p className={`text-xs ${
                pathname === '/settings'
                  ? theme === 'dark' ? 'text-violet-200' :
                    theme === 'charcoal' ? 'text-gray-300' : 'text-violet-600'
                  : theme === 'dark' || theme === 'charcoal' ? 'text-gray-400' : 'text-gray-500'
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
              <p className={`text-xs ${theme === 'dark' || theme === 'charcoal' ? 'text-gray-400' : 'text-gray-500'}`}>
                Return to main site
              </p>
            </div>
          )}
        </button>
      </div>
    </aside>
  )
}
