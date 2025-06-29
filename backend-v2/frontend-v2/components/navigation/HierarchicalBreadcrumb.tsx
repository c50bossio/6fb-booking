'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline'
import { useThemeStyles } from '@/hooks/useTheme'

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
  isHome?: boolean
}

interface HierarchicalBreadcrumbProps {
  items: BreadcrumbItem[]
  maxItems?: number
  className?: string
  separator?: React.ReactNode
  showHome?: boolean
}

export function HierarchicalBreadcrumb({
  items,
  maxItems = 4,
  className = '',
  separator,
  showHome = true
}: HierarchicalBreadcrumbProps) {
  const { colors } = useThemeStyles()
  
  // Prepare breadcrumb items with home if needed
  const allItems = React.useMemo(() => {
    const processedItems = [...items]
    if (showHome && processedItems.length > 0 && !processedItems[0].isHome) {
      processedItems.unshift({
        label: 'Home',
        href: '/',
        icon: <HomeIcon className="w-4 h-4" />,
        isHome: true
      })
    }
    return processedItems
  }, [items, showHome])

  // Collapse middle items if too many
  const displayItems = React.useMemo(() => {
    if (allItems.length <= maxItems) return allItems
    
    const firstItem = allItems[0]
    const lastItems = allItems.slice(-(maxItems - 2))
    
    return [
      firstItem,
      { label: '...', href: undefined },
      ...lastItems
    ]
  }, [allItems, maxItems])

  const separatorElement = separator || (
    <ChevronRightIcon className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
  )

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center space-x-2 text-sm overflow-x-auto scrollbar-hide ${className}`}
    >
      {displayItems.map((item, index) => {
        const isLast = index === displayItems.length - 1
        const isEllipsis = item.label === '...'
        
        return (
          <div
            key={`${item.label}-${index}`}
            className="flex items-center space-x-2 min-w-0"
          >
            {index > 0 && separatorElement}
            
            {isEllipsis ? (
              <span className="text-gray-400 dark:text-gray-500 px-1">
                {item.label}
              </span>
            ) : isLast || !item.href ? (
              <span
                className={`
                  flex items-center space-x-1.5 font-medium truncate
                  ${isLast 
                    ? 'text-gray-900 dark:text-white' 
                    : 'text-gray-500 dark:text-gray-400'
                  }
                `}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </span>
            ) : (
              <Link
                href={item.href}
                className={`
                  flex items-center space-x-1.5 min-w-0
                  ${colors.text.secondary} hover:${colors.text.primary}
                  transition-colors duration-200 truncate
                  hover:bg-gray-100 dark:hover:bg-gray-800
                  px-2 py-1 -mx-2 -my-1 rounded-ios
                `}
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}

// Responsive breadcrumb that shows fewer items on mobile
export function ResponsiveBreadcrumb({
  items,
  ...props
}: HierarchicalBreadcrumbProps) {
  return (
    <>
      {/* Mobile: Show only first and last item */}
      <div className="sm:hidden">
        <HierarchicalBreadcrumb
          items={items}
          maxItems={2}
          {...props}
        />
      </div>
      
      {/* Desktop: Show more items */}
      <div className="hidden sm:block">
        <HierarchicalBreadcrumb
          items={items}
          maxItems={4}
          {...props}
        />
      </div>
    </>
  )
}

// Helper component for enterprise hierarchy
interface EnterpriseBreadcrumbProps {
  enterprise?: { id: string; name: string }
  location?: { id: string; name: string }
  barber?: { id: string; name: string }
  currentPage?: string
  baseHref?: string
}

export function EnterpriseBreadcrumb({
  enterprise,
  location,
  barber,
  currentPage,
  baseHref = '/dashboard'
}: EnterpriseBreadcrumbProps) {
  const items: BreadcrumbItem[] = []
  
  // Build the breadcrumb path based on hierarchy
  if (enterprise) {
    items.push({
      label: enterprise.name,
      href: `${baseHref}/enterprise/${enterprise.id}`
    })
  }
  
  if (location) {
    items.push({
      label: location.name,
      href: enterprise 
        ? `${baseHref}/enterprise/${enterprise.id}/location/${location.id}`
        : `${baseHref}/location/${location.id}`
    })
  }
  
  if (barber) {
    items.push({
      label: barber.name,
      href: location
        ? `${baseHref}/location/${location.id}/barber/${barber.id}`
        : `${baseHref}/barber/${barber.id}`
    })
  }
  
  if (currentPage) {
    items.push({
      label: currentPage
    })
  }
  
  return <ResponsiveBreadcrumb items={items} />
}