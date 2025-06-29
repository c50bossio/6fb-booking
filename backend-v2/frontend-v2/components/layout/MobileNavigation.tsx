'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Bars3Icon
} from '@heroicons/react/24/outline'
import { 
  Bars3Icon as Bars3IconSolid
} from '@heroicons/react/24/solid'
import { type User } from '@/lib/api'
import { useThemeStyles } from '@/hooks/useTheme'
import { getMobileNavigationTabs, type MobileTabItem } from '@/lib/navigation'
import { MobileDrawer } from './MobileDrawer'

interface MobileNavigationProps {
  user: User | null
}

export function MobileNavigation({ user }: MobileNavigationProps) {
  const pathname = usePathname()
  const { colors, isDark } = useThemeStyles()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Get navigation tabs from centralized navigation
  const allNavigationTabs = getMobileNavigationTabs(user?.role)
  
  // Take first 4 tabs for the bottom bar, rest will be in the drawer
  const navigationTabs = allNavigationTabs.slice(0, 4)
  
  // Create the "More" tab
  const moreTab: MobileTabItem = {
    name: 'More',
    href: '#',
    icon: Bars3Icon,
    iconSolid: Bars3IconSolid,
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/'
    }
    return pathname.startsWith(href)
  }

  const handleTabClick = (tab: MobileTabItem) => {
    if (tab.name === 'More') {
      setIsDrawerOpen(true)
    }
  }

  // Combine navigation tabs with the More tab
  const allTabs = [...navigationTabs, moreTab]

  return (
    <>
      <nav className={`
        fixed bottom-0 left-0 right-0 z-50
        ${colors.background.card} border-t ${colors.border.default}
        backdrop-blur-ios bg-white/80 dark:bg-gray-900/80
        safe-area-inset-bottom
      `}>
        {/* iOS-style tab bar */}
        <div className="flex items-center justify-around px-2 py-1">
          {allTabs.map((tab, index) => {
            const active = tab.name !== 'More' && isActive(tab.href)
            const IconComponent = active ? tab.iconSolid : tab.icon
            const isMoreTab = tab.name === 'More'
            
            // Generate unique key - use href for regular tabs, special key for More tab
            const uniqueKey = isMoreTab ? 'more-tab' : (tab.href || `tab-${index}`)

            if (isMoreTab) {
              return (
                <button
                  key={uniqueKey}
                  onClick={() => handleTabClick(tab)}
                  className={`
                    flex flex-col items-center justify-center px-3 py-2 min-w-0 flex-1
                    transition-all duration-200 ease-out
                    ${isDrawerOpen ? 'transform scale-105' : 'hover:scale-102'}
                  `}
                >
                  {/* Icon */}
                  <div className="relative">
                    <IconComponent 
                      className={`
                        w-6 h-6 transition-all duration-200
                        ${isDrawerOpen 
                          ? 'text-primary-500 dark:text-primary-400' 
                          : 'text-gray-500 dark:text-gray-400'
                        }
                      `} 
                    />
                    
                    {/* Active indicator for More tab when drawer is open */}
                    {isDrawerOpen && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-500 dark:bg-primary-400 rounded-full" />
                    )}
                  </div>
                  
                  {/* Label */}
                  <span className={`
                    text-xs font-medium mt-1 transition-colors duration-200 leading-tight
                    ${isDrawerOpen 
                      ? 'text-primary-500 dark:text-primary-400' 
                      : 'text-gray-500 dark:text-gray-400'
                    }
                  `}>
                    {tab.name}
                  </span>
                </button>
              )
            }

            return (
              <Link
                key={uniqueKey}
                href={tab.href}
                className={`
                  flex flex-col items-center justify-center px-3 py-2 min-w-0 flex-1
                  transition-all duration-200 ease-out
                  ${active ? 'transform scale-105' : 'hover:scale-102'}
                `}
              >
                {/* Icon */}
                <div className="relative">
                  <IconComponent 
                    className={`
                      w-6 h-6 transition-all duration-200
                      ${active 
                        ? 'text-primary-500 dark:text-primary-400' 
                        : 'text-gray-500 dark:text-gray-400'
                      }
                    `} 
                  />
                  
                  {/* Badge */}
                  {tab.badge && (
                    <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-error-500 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                  
                  {/* Active indicator */}
                  {active && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-500 dark:bg-primary-400 rounded-full" />
                  )}
                </div>
                
                {/* Label */}
                <span className={`
                  text-xs font-medium mt-1 transition-colors duration-200 leading-tight
                  ${active 
                    ? 'text-primary-500 dark:text-primary-400' 
                    : 'text-gray-500 dark:text-gray-400'
                  }
                `}>
                  {tab.name}
                </span>
              </Link>
            )
          })}
        </div>
        
        {/* Safe area bottom padding for devices with home indicator */}
        <div className="h-safe-area-inset-bottom" />
      </nav>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={user}
      />
    </>
  )
}