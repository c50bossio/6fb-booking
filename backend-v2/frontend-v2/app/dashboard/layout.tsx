'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  HomeIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ChartBarIcon,
  CogIcon,
  BuildingStorefrontIcon,
  ChatBubbleLeftEllipsisIcon,
  MegaphoneIcon,
  CreditCardIcon,
  DocumentChartBarIcon,
  ShieldCheckIcon,
  CircleStackIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

interface NavItem {
  name: string
  href?: string
  icon: React.ElementType
  children?: NavItem[]
  badge?: string
}

const navigationItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon
  },
  {
    name: 'Calendar & Scheduling',
    icon: CalendarDaysIcon,
    children: [
      { name: 'Calendar View', href: '/calendar', icon: CalendarDaysIcon },
      { name: 'My Bookings', href: '/bookings', icon: CalendarDaysIcon },
      { name: 'Availability', href: '/availability', icon: CalendarDaysIcon },
      { name: 'Recurring', href: '/recurring', icon: CalendarDaysIcon }
    ]
  },
  {
    name: 'Settings',
    icon: CogIcon,
    children: [
      { name: 'Profile', href: '/settings/profile', icon: CogIcon },
      { name: 'Calendar', href: '/settings/calendar', icon: CogIcon },
      { name: 'Landing Page', href: '/settings/landing-page', icon: CogIcon }
    ]
  },
  {
    name: 'Clients',
    href: '/clients',
    icon: UserGroupIcon
  },
  {
    name: 'Communication',
    href: '/communication',
    icon: ChatBubbleLeftEllipsisIcon
  },
  {
    name: 'Marketing Suite',
    href: '/marketing',
    icon: MegaphoneIcon,
    badge: 'New'
  },
  {
    name: 'Payments & Earnings',
    href: '/payments',
    icon: CreditCardIcon
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: ChartBarIcon
  },
  {
    name: 'Administration',
    icon: ShieldCheckIcon,
    children: [
      { name: 'Users', href: '/admin/users', icon: UserGroupIcon },
      { name: 'Services', href: '/admin/services', icon: CogIcon }
    ]
  },
  {
    name: 'Data Management',
    icon: CircleStackIcon,
    children: [
      { name: 'Export', href: '/export', icon: DocumentChartBarIcon },
      { name: 'Import', href: '/import', icon: DocumentChartBarIcon }
    ]
  }
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['Calendar & Scheduling'])
  )

  const toggleSection = (sectionName: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName)
    } else {
      newExpanded.add(sectionName)
    }
    setExpandedSections(newExpanded)
  }

  const isActive = (href?: string) => {
    if (!href) return false
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/dashboard/welcome'
    }
    return pathname.startsWith(href)
  }

  const renderNavItem = (item: NavItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedSections.has(item.name)
    const active = isActive(item.href)

    const itemClasses = `
      group flex items-center w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg
      transition-all duration-200 cursor-pointer
      ${active 
        ? 'bg-blue-100 text-blue-800' 
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      }
      ${level > 0 ? 'ml-6' : ''}
    `

    const content = (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center">
          <item.icon 
            className={`flex-shrink-0 w-5 h-5 mr-3 ${
              active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
            }`} 
          />
          <span className="truncate">{item.name}</span>
        </div>
        
        {hasChildren && (
          <ChevronRightIcon 
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
        )}
        
        {item.badge && (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {item.badge}
          </span>
        )}
      </div>
    )

    return (
      <div key={item.name}>
        {hasChildren ? (
          <button
            onClick={() => toggleSection(item.name)}
            className={itemClasses}
            type="button"
          >
            {content}
          </button>
        ) : (
          <Link href={item.href || '#'} className={itemClasses}>
            {content}
          </Link>
        )}
        
        {hasChildren && isExpanded && item.children && (
          <div className="mt-1 space-y-1">
            {item.children.map((child) => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">BB</span>
            </div>
            <div>
              <div className="font-bold text-lg text-black">BOOKEDBARBER</div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">OWN THE CHAIR. OWN THE BRAND.</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Search bookings, clients..."
              className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-white">AT</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Admin Test User</p>
              <p className="text-xs text-gray-500 truncate">Administrator</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => renderNavItem(item))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Theme toggle and other header items can go here */}
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-white">AT</span>
                </div>
                <div className="text-sm">
                  <div className="font-medium">Admin Test User</div>
                  <div className="text-gray-500 text-xs">Administrator</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}