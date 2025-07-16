'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useHoverIntent } from '@/hooks/useHoverIntent'
import type { NavigationItem as NavigationItemType } from '@/lib/navigation'

interface NavigationItemProps {
  item: NavigationItemType
  level: number
  index: number
  isActive: (href: string) => boolean
  expandedSections: Set<string>
  toggleSection: (section: string) => void
  collapsed: boolean
  renderNavigationItem: (item: NavigationItemType, level: number, index: number) => React.ReactNode
}

export function NavigationItem({
  item,
  level,
  index,
  isActive,
  expandedSections,
  toggleSection,
  collapsed,
  renderNavigationItem,
}: NavigationItemProps) {
  const router = useRouter()
  const active = isActive(item.href)
  const hasChildren = item.children && item.children.length > 0
  const isExpanded = expandedSections.has(item.name.toLowerCase())
  const IconComponent = item.icon
  
  // Hover intent detection for better UX
  const { isHovered, hoverProps } = useHoverIntent({ 
    delay: 150, // Wait 150ms before showing hover state
    exitDelay: 50 // Quick exit to feel responsive
  })

  const itemClasses = `
    group flex items-center w-full text-left px-3 py-2.5 text-sm font-medium rounded-ios-lg
    transition-all duration-300 ease-in-out cursor-pointer relative
    ${active 
      ? `bg-primary-100 dark:bg-primary-900/20 text-primary-800 dark:text-primary-200 shadow-ios-sm` 
      : `text-gray-700 dark:text-gray-300 ${isHovered ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : ''}`
    }
    ${level > 0 ? 'ml-6' : ''}
  `

  const handleClick = () => {
    if (hasChildren) {
      toggleSection(item.name.toLowerCase())
    } else if (item.href) {
      router.push(item.href)
    }
  }

  return (
    <div key={`${item.name}-${level}-${index}`}>
      <button
        onClick={handleClick}
        className={itemClasses}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-current={active ? 'page' : undefined}
        title={collapsed && level === 0 ? item.name : undefined}
        {...hoverProps}
      >
        {/* Icon */}
        {IconComponent && (
          <span className={`
            flex-shrink-0 w-5 h-5 mr-3 transition-colors duration-200
            ${active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}
          `}>
            <IconComponent />
          </span>
        )}

        {/* Text content - hidden when collapsed at top level */}
        {(!collapsed || level > 0) && (
          <>
            <span className="flex-1 text-left truncate">
              {item.name}
            </span>

            {/* Badge */}
            {item.badge && (
              <span className={`
                ml-2 px-2 py-0.5 text-xs font-medium rounded-full
                ${active 
                  ? 'bg-primary-200 dark:bg-primary-800 text-primary-800 dark:text-primary-200' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }
              `}>
                {item.badge}
              </span>
            )}

            {/* Chevron for expandable items */}
            {hasChildren && (
              <span className={`
                ml-2 transition-transform duration-200 text-gray-400 dark:text-gray-500
                ${isExpanded ? 'rotate-90' : ''}
              `}>
                <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </>
        )}

        {/* Active indicator */}
        {active && (
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-primary-800 dark:bg-primary-300 rounded-r-full" />
        )}
      </button>

      {/* Render children if expanded */}
      {hasChildren && isExpanded && (!collapsed || level > 0) && (
        <div className="mt-1 space-y-1">
          {item.children?.map((childItem, childIndex) => 
            renderNavigationItem(childItem, level + 1, childIndex)
          )}
        </div>
      )}
    </div>
  )
}