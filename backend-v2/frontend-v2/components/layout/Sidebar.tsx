'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  ScissorsIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline'
import { type User } from '@/lib/api'
import { useThemeStyles } from '@/hooks/useTheme'
import { filterNavigationByRole, navigationItems, type NavigationItem } from '@/lib/navigation'
import { Logo } from '@/components/ui/Logo'

interface SidebarProps {
  user: User | null
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ user, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const { colors, isDark } = useThemeStyles()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['dashboard']))

  const toggleSection = (sectionName: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName)
    } else {
      newExpanded.add(sectionName)
    }
    setExpandedSections(newExpanded)
  }

  // Get navigation items filtered by user role
  const filteredNavigationItems = filterNavigationByRole(navigationItems, user?.role)

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/'
    }
    return pathname.startsWith(href)
  }

  const renderNavigationItem = (item: NavigationItem, level = 0, index = 0) => {
    const active = isActive(item.href)
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedSections.has(item.name.toLowerCase())
    const IconComponent = item.icon

    const itemClasses = `
      group flex items-center w-full text-left px-3 py-2.5 text-sm font-medium rounded-ios-lg
      transition-all duration-200 ease-out
      ${active 
        ? `${colors.background.accent} ${colors.text.accent} shadow-ios-sm` 
        : `${colors.text.secondary} hover:${colors.background.hover} hover:${colors.text.primary}`
      }
      ${level > 0 ? 'ml-6' : ''}
    `

    const content = (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center">
          <IconComponent 
            className={`
              flex-shrink-0 w-5 h-5 mr-3 transition-colors duration-200
              ${active ? colors.text.accent : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}
              ${collapsed ? 'mr-0' : 'mr-3'}
            `} 
          />
          {!collapsed && (
            <span className="truncate">{item.name}</span>
          )}
        </div>
        
        {!collapsed && hasChildren && (
          <ChevronRightIcon 
            className={`
              w-4 h-4 text-gray-400 transition-transform duration-200
              ${isExpanded ? 'rotate-90' : ''}
            `}
          />
        )}
        
        {!collapsed && (item.badge !== undefined) && (
          <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
            {item.badge}
          </span>
        )}
        
        {!collapsed && item.isNew && (
          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
            New
          </span>
        )}
      </div>
    )

    // Generate unique key using href or fallback to name with level and index
    const uniqueKey = item.href || `${item.name}-level-${level}-${index}`
    
    return (
      <div key={uniqueKey}>
        {hasChildren ? (
          <button
            onClick={() => toggleSection(item.name.toLowerCase())}
            className={itemClasses}
            title={collapsed ? item.name : undefined}
          >
            {content}
          </button>
        ) : (
          <Link
            href={item.href}
            className={itemClasses}
            title={collapsed ? item.name : undefined}
          >
            {content}
          </Link>
        )}
        
        {!collapsed && hasChildren && isExpanded && item.children && (
          <div className="mt-1 space-y-1">
            {item.children.map((child, index) => renderNavigationItem(child, level + 1, index))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className={`
      relative flex flex-col ${colors.background.card} border-r ${colors.border.default}
      transition-all duration-300 ease-out
      ${collapsed ? 'w-16' : 'w-64'}
      h-full overflow-hidden
    `}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {collapsed ? (
          <Logo size="xs" className="mx-auto" />
        ) : (
          <Logo size="md" />
        )}
        
        <button
          onClick={onToggleCollapse}
          className={`
            p-1.5 rounded-lg ${colors.background.hover} ${colors.text.secondary}
            hover:${colors.background.secondary} hover:${colors.text.primary}
            transition-colors duration-200
            ${collapsed ? 'absolute top-4 right-2' : 'ml-auto'}
          `}
        >
          {collapsed ? (
            <ChevronRightIcon className="w-4 h-4" />
          ) : (
            <ChevronLeftIcon className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* User Info */}
      {!collapsed && user && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-white">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.role === 'admin' ? 'Administrator' : 
                 user.role === 'barber' ? 'Barber' : 'Client'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {filteredNavigationItems.map((item, index) => renderNavigationItem(item, 0, index))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {!collapsed ? (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            <p>© 2024 Booked Barber</p>
            <p>v2.0.0</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <QuestionMarkCircleIcon className="w-5 h-5 text-gray-400" />
          </div>
        )}
      </div>
    </aside>
  )
}