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

// Enhanced haptic feedback for drawer interactions
const simulateDrawerHaptic = (type: 'open' | 'close' | 'swipe' | 'bounce' = 'open') => {
  if ('vibrate' in navigator) {
    const patterns = {
      open: [10, 5, 10],
      close: [5, 5, 5],
      swipe: [3],
      bounce: [15, 10, 15]
    }
    navigator.vibrate(patterns[type])
  }
}

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
}

interface ExpandedSections {
  [key: string]: boolean
}

const SWIPE_THRESHOLD = 50
const VELOCITY_THRESHOLD = 0.3 // pixels per ms
const BOUNCE_THRESHOLD = 30
const MAX_DRAG_DISTANCE = 280

export function MobileDrawer({ isOpen, onClose, user }: MobileDrawerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { colors, isDark } = useThemeStyles()
  const drawerRef = useRef<HTMLDivElement>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({})
  const [touchStartX, setTouchStartX] = useState(0)
  const [touchCurrentX, setTouchCurrentX] = useState(0)
  const [touchStartTime, setTouchStartTime] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isClosing, setIsClosing] = useState(false)
  
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
  
  // Enhanced body scroll lock with iOS support
  useEffect(() => {
    if (isOpen) {
      // Enhanced scroll lock for iOS
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.height = '100%'
      
      // Prevent zoom on iOS when focusing inputs
      const viewport = document.querySelector('meta[name=viewport]')
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
      }
      
      // Add padding to compensate for scrollbar
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`
      }
      
      simulateDrawerHaptic('open')
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.height = ''
      document.body.style.paddingRight = ''
      
      // Restore viewport
      const viewport = document.querySelector('meta[name=viewport]')
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0')
      }
    }
    
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.height = ''
      document.body.style.paddingRight = ''
    }
  }, [isOpen])
  
  // Enhanced touch events with velocity tracking
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStartX(touch.clientX)
    setTouchCurrentX(touch.clientX)
    setTouchStartTime(Date.now())
    setIsDragging(true)
    setDragOffset(0)
    
    // Prevent elastic scrolling on iOS
    e.preventDefault()
  }, [])
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    
    const touch = e.touches[0]
    const currentX = touch.clientX
    setTouchCurrentX(currentX)
    
    const diff = currentX - touchStartX
    const newOffset = Math.max(Math.min(diff, 0), -MAX_DRAG_DISTANCE)
    setDragOffset(newOffset)
    
    if (drawerRef.current) {
      // Apply transform with elastic resistance
      const resistance = Math.abs(newOffset) > MAX_DRAG_DISTANCE * 0.8 ? 0.3 : 1
      const translateX = newOffset * resistance
      
      drawerRef.current.style.transform = `translateX(${translateX}px)`
      drawerRef.current.style.transition = 'none'
      
      // Visual feedback for resistance
      if (Math.abs(newOffset) > MAX_DRAG_DISTANCE * 0.7) {
        simulateDrawerHaptic('swipe')
      }
    }
    
    e.preventDefault()
  }, [isDragging, touchStartX])
  
  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return
    
    const diff = touchCurrentX - touchStartX
    const timeElapsed = Date.now() - touchStartTime
    const velocity = Math.abs(diff) / timeElapsed // pixels per ms
    
    const shouldClose = diff < -SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD
    
    if (drawerRef.current) {
      drawerRef.current.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      
      if (shouldClose) {
        setIsClosing(true)
        simulateDrawerHaptic('close')
        drawerRef.current.style.transform = 'translateX(-100%)'
        setTimeout(() => {
          onClose()
          setIsClosing(false)
        }, 300)
      } else {
        // Bounce back with haptic feedback
        if (Math.abs(diff) > BOUNCE_THRESHOLD) {
          simulateDrawerHaptic('bounce')
        }
        drawerRef.current.style.transform = 'translateX(0)'
      }
    }
    
    setIsDragging(false)
    setDragOffset(0)
  }, [isDragging, touchCurrentX, touchStartX, touchStartTime, onClose])
  
  // Toggle section expansion
  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }))
  }
  
  // Check if current path matches
  const isActive = (href: string) => pathname.startsWith(href)
  
  // Enhanced navigation with haptic feedback
  const handleNavigate = useCallback((href: string) => {
    simulateDrawerHaptic('swipe')
    setIsClosing(true)
    
    // Smooth close animation before navigation
    if (drawerRef.current) {
      drawerRef.current.style.transform = 'translateX(-100%)'
    }
    
    setTimeout(() => {
      router.push(href)
      onClose()
      setIsClosing(false)
    }, 200)
  }, [router, onClose])
  
  // Enhanced sign out with feedback
  const handleSignOut = useCallback(async () => {
    simulateDrawerHaptic('close')
    setIsClosing(true)
    
    try {
      await fetch('/api/v2/auth/logout', { method: 'POST' })
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      
      // Smooth transition
      if (drawerRef.current) {
        drawerRef.current.style.transform = 'translateX(-100%)'
      }
      
      setTimeout(() => {
        router.push('/login')
        onClose()
        setIsClosing(false)
      }, 200)
    } catch (error) {
      console.error('Logout error:', error)
      // Still redirect on error
      router.push('/login')
      onClose()
      setIsClosing(false)
    }
  }, [router, onClose])
  
  const renderNavigationItem = useCallback((item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedSections[item.name]
    const active = isActive(item.href)
    
    return (
      <div key={item.name} className="w-full">
        <button
          onClick={() => {
            if (hasChildren) {
              simulateDrawerHaptic('swipe')
              toggleSection(item.name)
            } else {
              handleNavigate(item.href)
            }
          }}
          disabled={isClosing}
          className={`
            w-full flex items-center justify-between px-4 py-3 rounded-xl
            transition-all duration-200 ease-out transform-gpu will-change-transform
            ${level > 0 ? 'ml-6 mr-2' : ''}
            ${active 
              ? 'bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20 text-primary-600 dark:text-primary-400 shadow-sm ring-1 ring-primary-200/50 dark:ring-primary-800/30' 
              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300'
            }
            active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500/30
            ${isClosing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <div className="flex items-center space-x-3 flex-1">
            {item.icon && (
              <div className={`
                p-2 rounded-lg transition-all duration-200
                ${active ? 'bg-primary-100 dark:bg-primary-900/20' : 'bg-gray-100/50 dark:bg-gray-800/30'}
              `}>
                <item.icon className={`
                  w-5 h-5 transition-colors duration-200
                  ${active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}
                `} />
              </div>
            )}
            <div className="text-left flex-1 min-w-0">
              <div className={`font-medium transition-colors duration-200 ${active ? 'text-primary-700 dark:text-primary-300' : ''}`}>
                {item.name}
              </div>
              {item.description && level === 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  {item.description}
                </div>
              )}
            </div>
            {item.isNew && (
              <span className="ml-2 px-2 py-1 text-xs font-bold bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/20 text-green-700 dark:text-green-400 rounded-full shadow-sm animate-pulse">
                New
              </span>
            )}
          </div>
          {hasChildren && (
            <div
              className={`
                p-1 rounded-full transition-all duration-200
                ${isExpanded ? 'rotate-90 bg-primary-100 dark:bg-primary-900/20' : ''}
              `}
            >
              <ChevronRightIcon className={`
                w-4 h-4 transition-colors duration-200
                ${isExpanded ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}
              `} />
            </div>
          )}
        </button>
        
        {hasChildren && (
          <div
            className={`
              overflow-hidden transition-all duration-300 ease-out
              ${isExpanded ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'}
            `}
          >
            <div className="pl-2 space-y-1">
              {item.children!.map((child, index) => (
                <div
                  key={child.name}
                  style={{
                    animationDelay: isExpanded ? `${index * 50}ms` : '0ms'
                  }}
                  className={isExpanded ? 'animate-fade-in-up' : ''}
                >
                  {renderNavigationItem(child, level + 1)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }, [expandedSections, isActive, handleNavigate, toggleSection, isClosing])
  
  return (
    <>
      {/* Enhanced backdrop with better blur */}
      <div
        className={`
          fixed inset-0 bg-black/60 backdrop-blur-md z-50
          transition-all duration-300 ease-out
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
          supports-[backdrop-filter]:backdrop-blur-xl
        `}
        onClick={onClose}
        style={{
          backdropFilter: isOpen ? 'blur(8px) saturate(1.2)' : 'blur(0px)',
          WebkitBackdropFilter: isOpen ? 'blur(8px) saturate(1.2)' : 'blur(0px)'
        }}
      />
      
      {/* Enhanced drawer with better performance */}
      <div
        ref={drawerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`
          fixed top-0 left-0 h-full z-50 w-[280px]
          ${colors.background.card} 
          backdrop-blur-xl bg-white/97 dark:bg-gray-900/97
          shadow-2xl border-r border-gray-200/20 dark:border-gray-700/20
          transition-transform duration-300 cubic-bezier(0.25, 0.46, 0.45, 0.94)
          ${isOpen && !isDragging ? 'translate-x-0' : ''}
          ${!isOpen && !isDragging ? '-translate-x-full' : ''}
          ${isClosing ? 'pointer-events-none' : ''}
          will-change-transform
          supports-[backdrop-filter]:backdrop-blur-2xl
        `}
        style={{
          transform: !isDragging && isOpen ? 'translateX(0)' : undefined,
          backdropFilter: 'blur(20px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.8)'
        }}
      >
        <div className="h-full flex flex-col">
          {/* Enhanced header with better spacing */}
          <div className="px-4 pt-safe-top pb-4 border-b border-gray-200/60 dark:border-gray-700/60 bg-gradient-to-b from-white/10 to-transparent dark:from-gray-900/10">
            <div className="flex items-center justify-between mb-4">
              <Logo size="sm" href="#" />
              <button
                onClick={onClose}
                className={`
                  p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 
                  transition-all duration-200 active:scale-95
                  focus:outline-none focus:ring-2 focus:ring-primary-500/30
                  ${isClosing ? 'opacity-50' : ''}
                `}
                disabled={isClosing}
                aria-label="Close drawer"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500 transition-transform duration-200 hover:rotate-90" />
              </button>
            </div>
            
            {/* Enhanced user info */}
            <div className="flex items-center space-x-3 mb-4 p-3 rounded-xl bg-gradient-to-br from-primary-50/50 to-primary-100/30 dark:from-primary-900/20 dark:to-primary-800/10">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg ring-2 ring-white/20">
                <span className="text-white font-semibold text-lg">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900 dark:text-white text-base">
                  {user?.name || 'Guest'}
                </div>
                <div className="text-sm text-primary-600 dark:text-primary-400 capitalize font-medium">
                  {user?.role || 'User'}
                </div>
              </div>
            </div>
            
            {/* Enhanced search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors duration-200" />
              <input
                type="text"
                placeholder="Search features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`
                  w-full pl-10 pr-4 py-3 rounded-xl
                  ${colors.background.secondary} ${colors.border.default}
                  border text-gray-900 dark:text-white
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-300
                  transition-all duration-200 text-sm
                  backdrop-blur-sm bg-white/60 dark:bg-gray-800/60
                `}
                style={{
                  fontSize: '16px' // Prevent zoom on iOS
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Clear search"
                >
                  <XMarkIcon className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>
          
          {/* Enhanced quick actions */}
          {quickActions.length > 0 && !searchQuery && (
            <div className="px-4 py-4 border-b border-gray-200/60 dark:border-gray-700/60">
              <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Quick Actions
              </div>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.slice(0, 4).map((action, index) => (
                  <button
                    key={action.name}
                    onClick={() => handleNavigate(action.href)}
                    className={`
                      p-4 rounded-xl text-center transition-all duration-200
                      ${action.color === 'primary' 
                        ? 'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20 text-primary-600 dark:text-primary-400 shadow-sm' 
                        : 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300'
                      }
                      hover:scale-95 active:scale-90 focus:outline-none focus:ring-2 focus:ring-primary-500/30
                      transform-gpu will-change-transform
                    `}
                    style={{
                      animationDelay: `${index * 50}ms`
                    }}
                    disabled={isClosing}
                  >
                    {action.icon && (
                      <action.icon className="w-6 h-6 mx-auto mb-2 transition-transform duration-200 group-hover:scale-110" />
                    )}
                    <div className="text-xs font-medium leading-tight">{action.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Enhanced navigation items */}
          <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="px-2 py-4 space-y-2">
              {searchFilteredNavigation.length > 0 ? (
                searchFilteredNavigation.map((item, index) => (
                  <div
                    key={item.name}
                    style={{
                      animationDelay: `${index * 30}ms`
                    }}
                    className="animate-fade-in-up"
                  >
                    {renderNavigationItem(item)}
                  </div>
                ))
              ) : searchQuery ? (
                <div className="text-center py-8">
                  <MagnifyingGlassIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No features found matching "{searchQuery}"
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No navigation items available
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Enhanced footer with sign out */}
          <div className="px-4 py-4 border-t border-gray-200/60 dark:border-gray-700/60 safe-area-inset-bottom bg-gradient-to-t from-gray-50/30 to-transparent dark:from-gray-900/30">
            <button
              onClick={handleSignOut}
              disabled={isClosing}
              className={`
                w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl
                bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/10
                text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-800/30
                hover:from-red-100 hover:to-red-200 dark:hover:from-red-900/30 dark:hover:to-red-800/20
                active:scale-95 transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-red-500/30
                ${isClosing ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
              <span className="font-medium">{isClosing ? 'Signing Out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}