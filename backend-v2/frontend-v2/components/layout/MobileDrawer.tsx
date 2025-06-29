'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { 
  XMarkIcon, 
  MagnifyingGlassIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { useThemeStyles } from '@/hooks/useTheme'
import { navigation, type NavigationItem, type QuickAction } from '@/lib/navigation'
import { type User } from '@/lib/api'
import { Logo } from '@/components/ui/Logo'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
}

interface ExpandedSections {
  [key: string]: boolean
}

const SWIPE_THRESHOLD = 50

export function MobileDrawer({ isOpen, onClose, user }: MobileDrawerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { colors, isDark } = useThemeStyles()
  const drawerRef = useRef<HTMLDivElement>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({})
  const [touchStartX, setTouchStartX] = useState(0)
  const [touchCurrentX, setTouchCurrentX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  
  // Filter navigation items based on user role
  const filteredNavigation = navigation.filterByRole(navigation.items, user?.role)
  const quickActions = navigation.getQuickActions(user?.role)
  
  // Filter navigation based on search
  const searchFilteredNavigation = searchQuery
    ? filteredNavigation.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.children?.some(child => 
          child.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : filteredNavigation
  
  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // Add padding to compensate for scrollbar on desktop
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`
      }
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
    
    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [isOpen])
  
  // Handle touch events for swipe gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
    setTouchCurrentX(e.touches[0].clientX)
    setIsDragging(true)
  }
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    
    const currentX = e.touches[0].clientX
    setTouchCurrentX(currentX)
    
    const diff = currentX - touchStartX
    if (drawerRef.current && diff < 0) {
      const translateX = Math.max(diff, -280)
      drawerRef.current.style.transform = `translateX(${translateX}px)`
    }
  }
  
  const handleTouchEnd = () => {
    if (!isDragging) return
    
    const diff = touchCurrentX - touchStartX
    if (diff < -SWIPE_THRESHOLD) {
      onClose()
    } else if (drawerRef.current) {
      drawerRef.current.style.transform = 'translateX(0)'
    }
    
    setIsDragging(false)
  }
  
  // Toggle section expansion
  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }))
  }
  
  // Check if current path matches
  const isActive = (href: string) => pathname.startsWith(href)
  
  // Handle navigation
  const handleNavigate = (href: string) => {
    router.push(href)
    onClose()
  }
  
  // Handle sign out
  const handleSignOut = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' })
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    router.push('/login')
    onClose()
  }
  
  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedSections[item.name]
    const active = isActive(item.href)
    
    return (
      <div key={item.name} className="w-full">
        <button
          onClick={() => {
            if (hasChildren) {
              toggleSection(item.name)
            } else {
              handleNavigate(item.href)
            }
          }}
          className={`
            w-full flex items-center justify-between px-4 py-3 rounded-xl
            transition-all duration-200 ease-out
            ${level > 0 ? 'ml-4' : ''}
            ${active 
              ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400' 
              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300'
            }
          `}
        >
          <div className="flex items-center space-x-3">
            {item.icon && (
              <item.icon className={`
                w-5 h-5 
                ${active ? 'text-teal-500' : 'text-gray-400 dark:text-gray-500'}
              `} />
            )}
            <div className="text-left">
              <div className="font-medium">{item.name}</div>
              {item.description && level === 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {item.description}
                </div>
              )}
            </div>
            {item.isNew && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full">
                New
              </span>
            )}
          </div>
          {hasChildren && (
            <div
              className={`
                transition-transform duration-200
                ${isExpanded ? 'rotate-90' : ''}
              `}
            >
              <ChevronRightIcon className="w-4 h-4 text-gray-400" />
            </div>
          )}
        </button>
        
        {hasChildren && (
          <div
            className={`
              overflow-hidden transition-all duration-200
              ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
            `}
          >
            {item.children!.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }
  
  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/50 backdrop-blur-sm z-50
          transition-opacity duration-300
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div
        ref={drawerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`
          fixed top-0 left-0 h-full z-50 w-[280px]
          ${colors.background.card} 
          backdrop-blur-xl bg-white/95 dark:bg-gray-900/95
          shadow-2xl
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Header with user profile */}
          <div className="px-4 pt-safe-top pb-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <Logo size="sm" href="#" />
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* User info */}
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg">
                <span className="text-white font-semibold text-lg">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {user?.name || 'Guest'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {user?.role || 'User'}
                </div>
              </div>
            </div>
            
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`
                  w-full pl-10 pr-4 py-2 rounded-lg
                  ${colors.background.secondary} ${colors.border.default}
                  border text-gray-900 dark:text-white
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-teal-500/20
                  transition-all duration-200
                `}
              />
            </div>
          </div>
          
          {/* Quick actions */}
          {quickActions.length > 0 && !searchQuery && (
            <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Quick Actions
              </div>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.slice(0, 4).map((action) => (
                  <button
                    key={action.name}
                    onClick={() => handleNavigate(action.href)}
                    className={`
                      p-3 rounded-lg text-center
                      ${action.color === 'primary' 
                        ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400' 
                        : 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300'
                      }
                      hover:scale-95 active:scale-90 transition-transform duration-200
                    `}
                  >
                    {action.icon && (
                      <action.icon className="w-5 h-5 mx-auto mb-1" />
                    )}
                    <div className="text-xs font-medium">{action.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Navigation items */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="px-2 py-4 space-y-1">
              {searchFilteredNavigation.map(item => renderNavigationItem(item))}
            </div>
          </div>
          
          {/* Footer with sign out */}
          <div className="px-4 py-4 border-t border-gray-200/50 dark:border-gray-700/50 safe-area-inset-bottom">
            <button
              onClick={handleSignOut}
              className={`
                w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl
                bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300
                hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
              `}
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}