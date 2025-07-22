'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  ScissorsIcon,
  QuestionMarkCircleIcon,
  StarIcon,
  SparklesIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { type User, type UnifiedUserRole } from '@/lib/api'
import { useThemeStyles } from '@/hooks/useTheme'
import { filterNavigationByRole, navigationItems, type NavigationItem } from '@/lib/navigation'
import { Logo } from '@/components/ui/Logo'
import { UserPermissions, RoleMigrationHelper } from '@/lib/permissions'
import { useNavigationFavorites } from '@/hooks/useNavigationFavorites'
import { useNavigationTracking } from '@/hooks/useNavigationTracking'

interface SidebarProps {
  user: User | null
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ user, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()
  const { colors, isDark } = useThemeStyles()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set(['dashboard', 'calendar & scheduling']))
  const [showTooltip, setShowTooltip] = useState<string | null>(null)
  
  // Navigation intelligence hooks
  const favorites = useNavigationFavorites()
  const tracking = useNavigationTracking()
  
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

  // Memoize navigation items to prevent re-renders
  const filteredNavigationItems = useMemo(() => 
    filterNavigationByRole(navigationItems, user?.unified_role || user?.role), 
    [user?.unified_role, user?.role]
  )
  
  // Separate main navigation from settings and organize by usage
  const { mainNavItems, settingsNavItems, favoriteItems, recentItems } = useMemo(() => {
    const main = filteredNavigationItems.filter(item => item.name !== 'Settings')
    const settings = filteredNavigationItems.filter(item => item.name === 'Settings')
    
    // Get favorites and recent items if loaded
    const favoriteHrefs = new Set(favorites.favorites.map(f => f.href))
    const recentUsage = tracking.getRecentlyUsed()
    
    const favoriteItems = main.filter(item => favoriteHrefs.has(item.href))
    const recentItems = main.filter(item => 
      recentUsage.some(recent => recent.href === item.href) && 
      !favoriteHrefs.has(item.href)
    ).slice(0, 3)
    
    return { 
      mainNavItems: main, 
      settingsNavItems: settings,
      favoriteItems,
      recentItems
    }
  }, [filteredNavigationItems, favorites.favorites, tracking])

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/'
    }
    return pathname.startsWith(href)
  }
  
  // Handle navigation click with tracking
  const handleNavigationClick = (item: NavigationItem) => {
    if (tracking.isLoaded) {
      tracking.trackNavigation(item.href, item.name)
    }
  }
  
  // Enhanced tooltip component
  const renderTooltip = (item: NavigationItem) => {
    if (!collapsed || showTooltip !== item.href) return null
    
    const usageCount = tracking.getUsageCount(item.href)
    const isFrequent = tracking.isFrequentlyUsed(item.href)
    
    return (
      <div className="
        fixed z-50 ml-16 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900
        text-sm rounded-lg shadow-xl border border-gray-700 dark:border-gray-300
        whitespace-nowrap pointer-events-none
        animate-fade-in-up
      ">
        <div className="font-medium">{item.name}</div>
        {item.description && (
          <div className="text-gray-300 dark:text-gray-600 text-xs mt-1">
            {item.description}
          </div>
        )}
        {usageCount > 0 && (
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-400 dark:text-gray-500">
            <ClockIcon className="w-3 h-3" />
            Used {usageCount} times
            {isFrequent && <SparklesIcon className="w-3 h-3 text-yellow-500" />}
          </div>
        )}
      </div>
    )
  }

  const renderNavigationItem = (item: NavigationItem, level = 0, index = 0, showFavoriteButton = true) => {
    const active = isActive(item.href)
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedSections.has(item.name.toLowerCase())
    const IconComponent = item.icon
    const isFavorited = favorites.isFavorite(item.href)
    const isFrequent = tracking.isFrequentlyUsed(item.href)
    const usageCount = tracking.getUsageCount(item.href)

    const itemClasses = `
      group flex items-center w-full text-left px-3 py-2.5 text-sm font-medium rounded-ios-lg
      transition-all duration-200 ease-out cursor-pointer relative
      ${active 
        ? `bg-primary-100 dark:bg-primary-900/20 text-primary-800 dark:text-primary-200 shadow-ios-sm` 
        : `text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white`
      }
      ${level > 0 ? 'ml-6' : ''}
      ${isFavorited ? 'ring-1 ring-yellow-200 dark:ring-yellow-800/30' : ''}
    `

    const content = (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center flex-1 min-w-0">
          <div className="relative">
            <IconComponent 
              className={`
                flex-shrink-0 w-5 h-5 transition-colors duration-200
                ${active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}
                ${collapsed ? 'mr-0' : 'mr-3'}
              `} 
            />
            {/* Frequency indicator */}
            {isFrequent && !collapsed && (
              <SparklesIcon className="absolute -top-1 -right-1 w-3 h-3 text-yellow-500" />
            )}
            {/* Usage badge for collapsed state */}
            {collapsed && usageCount > 5 && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full" />
            )}
          </div>
          {!collapsed && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="truncate">{item.name}</span>
              {isFrequent && (
                <SparklesIcon className="w-3 h-3 text-yellow-500 flex-shrink-0" />
              )}
            </div>
          )}
        </div>
        
        {!collapsed && (
          <div className="flex items-center gap-1">
            {/* Favorite button */}
            {showFavoriteButton && level === 0 && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  favorites.toggleFavorite(item.href, item.name)
                }}
                className={`
                  p-1 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100
                  ${isFavorited ? 'opacity-100 text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-gray-600'}
                `}
                title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFavorited ? (
                  <StarIconSolid className="w-4 h-4" />
                ) : (
                  <StarIcon className="w-4 h-4" />
                )}
              </button>
            )}
            
            {hasChildren && (
              <ChevronRightIcon 
                className={`
                  w-4 h-4 text-gray-400 transition-transform duration-200
                  ${isExpanded ? 'rotate-90' : ''}
                `}
              />
            )}
            
            {(item.badge !== undefined) && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
                {item.badge}
              </span>
            )}
            
            {item.isNew && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                New
              </span>
            )}
          </div>
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
            onMouseEnter={() => collapsed && setShowTooltip(item.href)}
            onMouseLeave={() => collapsed && setShowTooltip(null)}
            className={itemClasses}
            title={collapsed ? item.name : undefined}
            type="button"
            aria-expanded={isExpanded}
            aria-label={`Toggle ${item.name} section`}
          >
            {content}
            {renderTooltip(item)}
          </button>
        ) : (
          <Link
            href={item.href}
            onClick={() => handleNavigationClick(item)}
            onMouseEnter={() => collapsed && setShowTooltip(item.href)}
            onMouseLeave={() => collapsed && setShowTooltip(null)}
            className={itemClasses}
            title={collapsed ? item.name : undefined}
            aria-label={item.name}
            role="menuitem"
          >
            {content}
            {renderTooltip(item)}
          </Link>
        )}
        
        {!collapsed && hasChildren && isExpanded && item.children && (
          <div className="mt-1 space-y-1">
            {item.children.map((child, index) => renderNavigationItem(child, level + 1, index, false))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className={`
      sticky top-0 left-0 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
      transition-all duration-300 ease-out
      ${collapsed ? 'w-16' : 'w-64'}
      h-screen overflow-hidden z-30
      shadow-sidebar-navigation
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

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto overflow-x-hidden nav-scroll-smooth" role="navigation" aria-label="Main navigation">
        {/* Favorites Section */}
        {!collapsed && favoriteItems.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <StarIcon className="w-3 h-3 text-yellow-500" />
              Favorites
            </div>
            <div className="space-y-1 mt-2">
              {favoriteItems.map((item, index) => renderNavigationItem(item, 0, `fav-${index}`))}
            </div>
          </div>
        )}
        
        {/* Recent Section */}
        {!collapsed && recentItems.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <ClockIcon className="w-3 h-3 text-gray-500" />
              Recent
            </div>
            <div className="space-y-1 mt-2">
              {recentItems.map((item, index) => renderNavigationItem(item, 0, `recent-${index}`))}
            </div>
          </div>
        )}
        
        {/* Add separator if we have favorites or recent items */}
        {!collapsed && (favoriteItems.length > 0 || recentItems.length > 0) && (
          <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
        )}
        
        <div className="space-y-1">
          {/* Core Business Navigation */}
          {mainNavItems.map((item, index) => renderNavigationItem(item, 0, index))}
        </div>
        
        {/* Settings Section - Moved to bottom with visual separation */}
        {settingsNavItems.length > 0 && (
          <div className="mt-auto pt-4">
            <div className="border-t border-gray-200 dark:border-gray-700 mb-4"></div>
            <div className="space-y-1">
              {settingsNavItems.map((item, index) => renderNavigationItem(item, 0, `settings-${index}`))}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
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