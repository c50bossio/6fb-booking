'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
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

// Enhanced haptic feedback simulation for web
const simulateHapticFeedback = (type: 'light' | 'medium' | 'heavy' | 'selection' = 'light') => {
  // Vibration API for supported devices
  if ('vibrate' in navigator) {
    const patterns = {
      light: [5],
      medium: [10],
      heavy: [20],
      selection: [3]
    }
    navigator.vibrate(patterns[type])
  }
  
  // Visual feedback through micro-animations
  const tapTarget = document.activeElement as HTMLElement
  if (tapTarget && tapTarget.classList) {
    tapTarget.style.transform = 'scale(0.97)'
    tapTarget.style.opacity = '0.8'
    requestAnimationFrame(() => {
      tapTarget.style.transform = ''
      tapTarget.style.opacity = ''
    })
  }
}

// Enhanced touch gesture detection
const useTouchGestures = () => {
  const [isLongPress, setIsLongPress] = useState(false)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  const handleTouchStart = useCallback((callback?: () => void) => {
    setIsLongPress(false)
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPress(true)
      simulateHapticFeedback('medium')
      callback?.()
    }, 500) // 500ms for long press
  }, [])
  
  const handleTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    setIsLongPress(false)
  }, [])
  
  return { isLongPress, handleTouchStart, handleTouchEnd }
}

export function MobileNavigation({ user }: MobileNavigationProps) {
  const pathname = usePathname()
  const { colors, isDark } = useThemeStyles()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [activeTabAnimation, setActiveTabAnimation] = useState<string | null>(null)
  const touchGestures = useTouchGestures()
  const navRef = useRef<HTMLElement>(null)

  // Get navigation tabs from centralized navigation
  const allNavigationTabs = getMobileNavigationTabs(user?.role)
  
  // Take first 4 tabs for the bottom bar, rest will be in the drawer
  const navigationTabs = allNavigationTabs.slice(0, 4)
  
  // Enhanced scroll-based visibility control
  useEffect(() => {
    let ticking = false
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentScrollY = window.scrollY
          
          // Show/hide based on scroll direction with improved logic
          if (currentScrollY < 10) {
            // Always show at top
            setIsVisible(true)
          } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
            // Hide when scrolling down (after 100px)
            setIsVisible(false)
          } else if (currentScrollY < lastScrollY - 10) {
            // Show when scrolling up with some threshold
            setIsVisible(true)
          }
          
          setLastScrollY(currentScrollY)
          ticking = false
        })
        ticking = true
      }
    }
    
    // Add passive listener for better performance
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])
  
  // Enhanced tab interaction animations
  const handleTabInteraction = useCallback((tabName: string, isActive: boolean) => {
    simulateHapticFeedback(isActive ? 'selection' : 'light')
    
    // Animate active state
    if (isActive) {
      setActiveTabAnimation(tabName)
      setTimeout(() => setActiveTabAnimation(null), 200)
    }
  }, [])
  
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

  const handleTabClick = useCallback((tab: MobileTabItem) => {
    if (tab.name === 'More') {
      simulateHapticFeedback('medium')
      setIsDrawerOpen(true)
    } else {
      handleTabInteraction(tab.name, isActive(tab.href))
    }
  }, [handleTabInteraction])
  
  // Enhanced drawer control with gestures
  const handleDrawerToggle = useCallback(() => {
    simulateHapticFeedback('medium')
    setIsDrawerOpen(prev => !prev)
  }, [])

  // Combine navigation tabs with the More tab
  const allTabs = [...navigationTabs, moreTab]

  return (
    <>
      <nav 
        ref={navRef}
        className={`
          fixed bottom-0 left-0 right-0 z-50
          ${colors.background.card} border-t ${colors.border.default}
          backdrop-blur-ios bg-white/95 dark:bg-gray-900/95
          safe-area-inset-bottom
          transition-all duration-300 ease-out
          ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
          supports-[backdrop-filter]:backdrop-blur-xl
        `}
        style={{
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
          boxShadow: isVisible ? '0 -2px 8px rgba(0, 0, 0, 0.1)' : 'none'
        }}
      >
        {/* Enhanced iOS-style tab bar with better touch targets */}
        <div className="flex items-center justify-around px-1 py-2">
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
                  onTouchStart={() => touchGestures.handleTouchStart()}
                  onTouchEnd={touchGestures.handleTouchEnd}
                  className={`
                    flex flex-col items-center justify-center px-3 py-3 min-w-0 flex-1
                    transition-all duration-200 ease-out touch-target
                    active:scale-95 hover:scale-102
                    ${isDrawerOpen ? 'transform scale-105 bg-primary-50 dark:bg-primary-900/20' : ''}
                    ${activeTabAnimation === tab.name ? 'animate-pulse' : ''}
                    focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-2 rounded-xl
                  `}
                  aria-label={`Open ${tab.name} menu`}
                  role="button"
                >
                  {/* Enhanced icon with micro-animations */}
                  <div className="relative">
                    <IconComponent 
                      className={`
                        w-6 h-6 transition-all duration-200
                        ${isDrawerOpen 
                          ? 'text-primary-500 dark:text-primary-400 scale-110' 
                          : 'text-gray-500 dark:text-gray-400'
                        }
                        ${touchGestures.isLongPress ? 'animate-bounce' : ''}
                      `} 
                    />
                    
                    {/* Enhanced active indicator with animation */}
                    {isDrawerOpen && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-primary-500 dark:bg-primary-400 rounded-full animate-ping" />
                    )}
                    
                    {/* Subtle shadow for depth */}
                    <div className={`
                      absolute inset-0 rounded-full transition-all duration-200
                      ${isDrawerOpen ? 'shadow-lg shadow-primary-500/25' : ''}
                    `} />
                  </div>
                  
                  {/* Enhanced label with better typography */}
                  <span className={`
                    text-xs font-medium mt-1.5 transition-all duration-200 leading-tight
                    ${isDrawerOpen 
                      ? 'text-primary-500 dark:text-primary-400 font-semibold' 
                      : 'text-gray-500 dark:text-gray-400'
                    }
                    max-w-full truncate
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
                onClick={() => handleTabInteraction(tab.name, active)}
                onTouchStart={() => touchGestures.handleTouchStart()}
                onTouchEnd={touchGestures.handleTouchEnd}
                className={`
                  flex flex-col items-center justify-center px-3 py-3 min-w-0 flex-1
                  transition-all duration-200 ease-out touch-target
                  active:scale-95 hover:scale-102
                  ${active ? 'transform scale-105 bg-primary-50 dark:bg-primary-900/20' : ''}
                  ${activeTabAnimation === tab.name ? 'animate-pulse' : ''}
                  focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-2 rounded-xl
                `}
                aria-label={`Navigate to ${tab.name}`}
                role="link"
              >
                {/* Enhanced icon with micro-animations */}
                <div className="relative">
                  <IconComponent 
                    className={`
                      w-6 h-6 transition-all duration-200
                      ${active 
                        ? 'text-primary-500 dark:text-primary-400 scale-110' 
                        : 'text-gray-500 dark:text-gray-400'
                      }
                      ${touchGestures.isLongPress ? 'animate-bounce' : ''}
                    `} 
                  />
                  
                  {/* Enhanced badge with animation */}
                  {tab.badge && (
                    <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-error-500 rounded-full animate-pulse shadow-lg">
                      {tab.badge}
                    </span>
                  )}
                  
                  {/* Enhanced active indicator */}
                  {active && (
                    <>
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-primary-500 dark:bg-primary-400 rounded-full" />
                      <div className="absolute inset-0 rounded-full shadow-lg shadow-primary-500/25" />
                    </>
                  )}
                </div>
                
                {/* Enhanced label */}
                <span className={`
                  text-xs font-medium mt-1.5 transition-all duration-200 leading-tight
                  ${active 
                    ? 'text-primary-500 dark:text-primary-400 font-semibold' 
                    : 'text-gray-500 dark:text-gray-400'
                  }
                  max-w-full truncate
                `}>
                  {tab.name}
                </span>
              </Link>
            )
          })}
        </div>
        
        {/* Enhanced safe area with better spacing */}
        <div className="h-safe-area-inset-bottom pb-1" />
      </nav>

      {/* Enhanced Mobile Drawer with gesture support */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={handleDrawerToggle}
        user={user}
      />
    </>
  )
}

// Enhanced responsive hook for better mobile detection
export const useMobileNavigation = () => {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const aspectRatio = width / height
      
      // Enhanced mobile detection
      setIsMobile(width <= 768)
      setIsTablet(width > 768 && width <= 1024)
      
      // Landscape mode optimization
      if (width > height && width <= 1024) {
        setIsMobile(false)
        setIsTablet(true)
      }
    }
    
    checkDevice()
    window.addEventListener('resize', checkDevice)
    window.addEventListener('orientationchange', checkDevice)
    
    return () => {
      window.removeEventListener('resize', checkDevice)
      window.removeEventListener('orientationchange', checkDevice)
    }
  }, [])
  
  return { isMobile, isTablet }
}