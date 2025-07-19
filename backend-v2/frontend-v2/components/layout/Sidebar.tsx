'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  ScissorsIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline'
import { type User, type UnifiedUserRole } from '@/lib/api'
import { useThemeStyles } from '@/hooks/useTheme'
import { filterNavigationByRole, navigationItems, type NavigationItem } from '@/lib/navigation'
import { Logo } from '@/components/ui/Logo'
import { UserPermissions, RoleMigrationHelper } from '@/lib/permissions'

interface SidebarProps {
  user: User | null
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ user, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const { colors, isDark } = useThemeStyles()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set(['dashboard', 'calendar & scheduling']))
  
  // Helper function to get role display name
  const getRoleDisplayName = (user: User): string => {
    if (user.unified_role) {
      return UserPermissions.getRoleDisplayName(user.unified_role)
    }
    // Fallback for legacy roles
    if (user.role === 'admin') return 'Administrator'
    if (user.role === 'barber') return 'Barber'
    return 'Client'
  }

  const toggleSection = (sectionName: string) => {
    // Debug log
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName)
    } else {
      newExpanded.add(sectionName)
    }
    setExpandedSections(newExpanded)
  }

  // Memoize navigation items to prevent re-renders
  const filteredNavigationItems = useMemo(() => 
    filterNavigationByRole(navigationItems, user?.unified_role || user?.role), 
    [user?.unified_role, user?.role]
  )

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
      transition-all duration-200 ease-out cursor-pointer relative
      ${active 
        ? `bg-primary-100 dark:bg-primary-900/20 text-primary-800 dark:text-primary-200 shadow-ios-sm` 
        : `text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white`
      }
      ${level > 0 ? 'ml-6' : ''}
    `

    const content = (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center">
          <IconComponent 
            className={`
              flex-shrink-0 w-5 h-5 mr-3 transition-colors duration-200
              ${active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}
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
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleSection(item.name.toLowerCase())
            }}
            className={itemClasses}
            title={collapsed ? item.name : undefined}
            type="button"
            aria-expanded={isExpanded}
            aria-label={`Toggle ${item.name} section`}
          >
            {content}
          </button>
        ) : (
          <Link
            href={item.href}
            className={itemClasses}
            title={collapsed ? item.name : undefined}
            aria-label={item.name}
            role="menuitem"
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
      relative flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
      transition-all duration-300 ease-out
      ${collapsed ? 'w-16' : 'w-64'}
      h-full overflow-hidden z-10
    `}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {collapsed ? (
          <div className="mx-auto w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">BB</span>
          </div>
        ) : (
          <Logo size="md" />
        )}
        
        <button
          onClick={() => {
            onToggleCollapse()
          }}
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`
            p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400
            hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200
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
                {getRoleDisplayName(user)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1" role="navigation" aria-label="Main navigation">
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