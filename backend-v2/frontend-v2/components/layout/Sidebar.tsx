'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  ScissorsIcon,
  QuestionMarkCircleIcon,
  MagnifyingGlassIcon,
  XMarkIcon
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
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  
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
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName)
    } else {
      newExpanded.add(sectionName)
    }
    setExpandedSections(newExpanded)
  }

  // Memoize navigation items to prevent re-renders and group them
  const filteredNavigationItems = useMemo(() => 
    filterNavigationByRole(navigationItems, user?.unified_role || user?.role), 
    [user?.unified_role, user?.role]
  )


  // Search functionality
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    
    const query = searchQuery.toLowerCase()
    const results: NavigationItem[] = []
    
    const searchInItems = (items: NavigationItem[]) => {
      items.forEach(item => {
        // Search in item name and description
        if (item.name.toLowerCase().includes(query) || 
            item.description?.toLowerCase().includes(query)) {
          results.push(item)
        }
        // Search in children
        if (item.children) {
          searchInItems(item.children)
        }
      })
    }
    
    searchInItems(filteredNavigationItems)
    return results.slice(0, 8) // Limit to 8 results
  }, [searchQuery, filteredNavigationItems])

  // Group navigation items for better organization
  const groupedNavigation = useMemo(() => {
    const coreItems = filteredNavigationItems.filter(item => 
      ['Dashboard', 'Calendar & Scheduling', 'Clients'].includes(item.name)
    )
    
    const businessItems = filteredNavigationItems.filter(item => 
      ['Customer Management', 'Communication', 'Communications', 'Marketing Suite', 'Marketing', 'Reviews', 'Products', 'Services'].includes(item.name)
    )
    
    const automationItems = filteredNavigationItems.filter(item => 
      ['AI Agents', 'Business Automation'].includes(item.name)
    )
    
    const financeItems = filteredNavigationItems.filter(item => 
      ['Finance Hub', 'Finance', 'Analytics'].includes(item.name)
    )
    
    const adminItems = filteredNavigationItems.filter(item => 
      ['6FB Compliance', 'Enterprise', 'Administration', 'Business Tools'].includes(item.name)
    )
    
    const settingsItems = filteredNavigationItems.filter(item => 
      item.name === 'Settings'
    )
    
    return {
      core: coreItems,
      business: businessItems,
      automation: automationItems,
      finance: financeItems,
      admin: adminItems,
      settings: settingsItems
    }
  }, [filteredNavigationItems])

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    setShowSearchResults(value.trim().length > 0)
  }

  // Clear search
  const clearSearch = () => {
    setSearchQuery('')
    setShowSearchResults(false)
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/'
    }
    return pathname.startsWith(href)
  }

  // Render section header with separator
  const renderSectionHeader = (title: string, isSticky = false) => {
    if (collapsed) return null
    
    return (
      <div className={`${isSticky ? 'sticky top-0 bg-white dark:bg-gray-900 z-10 border-b border-gray-100 dark:border-gray-800' : ''} py-2`}>
        <div className="flex items-center px-3">
          <div className="w-0.5 h-4 bg-primary-500 rounded-full mr-2"></div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {title}
          </h3>
        </div>
      </div>
    )
  }

  // Render section separator
  const renderSectionSeparator = () => {
    if (collapsed) return null
    
    return (
      <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>
    )
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
        ? `bg-primary-100 dark:bg-primary-900/20 text-primary-800 dark:text-primary-200 shadow-ios-sm border-l-2 border-primary-500` 
        : `text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white hover:shadow-sm`
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
      sticky top-0 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
      transition-all duration-300 ease-out
      ${collapsed ? 'w-16' : 'w-64'}
      h-screen overflow-hidden z-10
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
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center shadow-sm">
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
            {/* Status indicator */}
            <div className="w-2 h-2 bg-green-400 rounded-full shadow-sm"></div>
          </div>
        </div>
      )}

      {/* Search */}
      {!collapsed && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Search navigation..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="block w-full pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-ios-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         placeholder-gray-500 dark:placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                         text-sm transition-all duration-200 shadow-sm focus:shadow-md"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Navigation - Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <nav className="flex-1 px-4 py-4 overflow-y-auto" role="navigation" aria-label="Main navigation">
          {showSearchResults ? (
            /* Search Results */
            <div className="space-y-1">
              {!collapsed && renderSectionHeader('Search Results')}
              {searchResults.length > 0 ? (
                searchResults.map((item, index) => (
                  <Link
                    key={`search-${item.href}-${index}`}
                    href={item.href}
                    onClick={clearSearch}
                    className={`
                      group flex items-center w-full text-left px-3 py-2 text-sm font-medium rounded-ios-lg
                      transition-all duration-200 ease-out cursor-pointer relative
                      ${isActive(item.href) 
                        ? `bg-primary-100 dark:bg-primary-900/20 text-primary-800 dark:text-primary-200 shadow-ios-sm` 
                        : `text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white`
                      }
                    `}
                    title={collapsed ? item.name : undefined}
                  >
                    <div className="flex items-center">
                      <item.icon className={`
                        flex-shrink-0 w-5 h-5 mr-3 transition-colors duration-200
                        ${isActive(item.href) ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}
                        ${collapsed ? 'mr-0' : 'mr-3'}
                      `} />
                      {!collapsed && (
                        <div>
                          <span className="truncate">{item.name}</span>
                          {item.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                ))
              ) : (
                <div className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                  <MagnifyingGlassIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No results found</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              )}
            </div>
          ) : (
            /* Normal Navigation */
            <>
              {/* Core Section */}
              {groupedNavigation.core.length > 0 && (
                <div className="space-y-1">
                  {!collapsed && renderSectionHeader('Core', true)}
                  {groupedNavigation.core.map((item, index) => renderNavigationItem(item, 0, index))}
                </div>
              )}


              {/* Business Section */}
              {groupedNavigation.business.length > 0 && (
                <>
                  {renderSectionSeparator()}
                  <div className="space-y-1">
                    {!collapsed && renderSectionHeader('Business')}
                    {groupedNavigation.business.map((item, index) => renderNavigationItem(item, 0, index))}
                  </div>
                </>
              )}

              {/* Business Automation Section */}
              {groupedNavigation.automation.length > 0 && (
                <>
                  {renderSectionSeparator()}
                  <div className="space-y-1">
                    {!collapsed && renderSectionHeader('Automation')}
                    {groupedNavigation.automation.map((item, index) => renderNavigationItem(item, 0, index))}
                  </div>
                </>
              )}

              {/* Finance & Analytics Section */}
              {groupedNavigation.finance.length > 0 && (
                <>
                  {renderSectionSeparator()}
                  <div className="space-y-1">
                    {!collapsed && renderSectionHeader('Finance & Analytics')}
                    {groupedNavigation.finance.map((item, index) => renderNavigationItem(item, 0, index))}
                  </div>
                </>
              )}

              {/* Administration Section */}
              {groupedNavigation.admin.length > 0 && (
                <>
                  {renderSectionSeparator()}
                  <div className="space-y-1">
                    {!collapsed && renderSectionHeader('Administration')}
                    {groupedNavigation.admin.map((item, index) => renderNavigationItem(item, 0, index))}
                  </div>
                </>
              )}
            </>
          )}
        </nav>

        {/* Settings Section - Sticky at bottom */}
        {groupedNavigation.settings.length > 0 && (
          <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="pt-4 space-y-1">
              {!collapsed && renderSectionHeader('Settings')}
              {groupedNavigation.settings.map((item, index) => renderNavigationItem(item, 0, index))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
        {!collapsed ? (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-1">
            <p className="font-medium">© 2024 Booked Barber</p>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-1 h-1 bg-green-400 rounded-full"></div>
              <p>v2.0.0</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <QuestionMarkCircleIcon className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200" />
          </div>
        )}
      </div>
    </aside>
  )
}