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
import { NavigationItem as NavigationItemComponent } from './NavigationItem'
import { useClickDebounce } from '@/hooks/useDebounce'
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
  
  // Debounced toggle to prevent rapid clicking
  const { debouncedCallback: debouncedToggle, isDebouncing } = useClickDebounce(onToggleCollapse, 300)
  
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
    console.log('Sidebar: Toggling section', sectionName) // Debug log
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName)
    } else {
      newExpanded.add(sectionName)
    }
    setExpandedSections(newExpanded)
  }

  // Memoize navigation items and separate Settings from main navigation
  const { mainNavigationItems, settingsItem } = useMemo(() => {
    const allItems = filterNavigationByRole(navigationItems, user?.unified_role || user?.role)
    const settings = allItems.find(item => item.name === 'Settings')
    const mainItems = allItems.filter(item => item.name !== 'Settings')
    
    return {
      mainNavigationItems: mainItems,
      settingsItem: settings
    }
  }, [user?.unified_role, user?.role])

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/'
    }
    return pathname.startsWith(href)
  }

  const renderNavigationItem = (item: NavigationItem, level = 0, index = 0) => {
    return (
      <NavigationItemComponent
        key={`${item.name}-${level}-${index}`}
        item={item}
        level={level}
        index={index}
        isActive={isActive}
        expandedSections={expandedSections}
        toggleSection={toggleSection}
        collapsed={collapsed}
        renderNavigationItem={renderNavigationItem}
      />
    )
  }

  return (
    <aside className={`
      relative flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
      transition-all duration-300 ease-in-out
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
            console.log('Sidebar: Toggle collapse clicked')
            debouncedToggle()
          }}
          disabled={isDebouncing}
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`
            p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400
            hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200
            transition-all duration-300 ease-in-out
            ${collapsed ? 'absolute top-4 right-2' : 'ml-auto'}
            ${isDebouncing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            disabled:opacity-50 disabled:cursor-not-allowed
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

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto" role="navigation" aria-label="Main navigation">
        {mainNavigationItems.map((item, index) => 
          renderNavigationItem(item, 0, index)
        )}
      </nav>

      {/* Settings Section - Positioned at bottom */}
      {settingsItem && (
        <div className="px-4 pb-4">
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            {renderNavigationItem(settingsItem, 0, 0)}
          </div>
        </div>
      )}

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