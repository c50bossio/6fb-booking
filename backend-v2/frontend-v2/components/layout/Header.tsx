'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ChevronRightIcon,
  Bars3Icon,
  UserCircleIcon,
  BellIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  ArrowRightOnRectangleIcon,
  LinkIcon,
  QrCodeIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline'
import { type User, logout } from '@/lib/api'
import { useThemeStyles } from '@/hooks/useTheme'
import { SimpleThemeToggle } from '@/components/ThemeToggle'
import { navigation, getUserMenuItems } from '@/lib/navigation'
import { Logo } from '@/components/ui/Logo'
import { Portal } from '@/components/ui/Portal'

interface HeaderProps {
  user: User | null
  breadcrumbs: Array<{
    label: string
    href: string
    isLast?: boolean
  }>
  onMenuToggle: () => void
  showMenuToggle?: boolean
}

export function Header({ user, breadcrumbs, onMenuToggle, showMenuToggle = false }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [notificationDropdownPosition, setNotificationDropdownPosition] = useState({ top: 0, left: 0 })
  const [shareDropdownPosition, setShareDropdownPosition] = useState({ top: 0, left: 0 })
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const shareMenuRef = useRef<HTMLDivElement>(null)
  const notificationButtonRef = useRef<HTMLButtonElement>(null)
  const shareButtonRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  const { colors, isDark } = useThemeStyles()

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // For user menu, check both the button ref and if target is inside the portal
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        // Also check if clicking inside the portal dropdown
        const portalDropdown = document.querySelector('[data-user-menu-portal]')
        if (!portalDropdown || !portalDropdown.contains(event.target as Node)) {
          setShowUserMenu(false)
        }
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        const portalShare = document.querySelector('[data-share-menu-portal]')
        if (!portalShare || !portalShare.contains(event.target as Node)) {
          setShowShareMenu(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      // Force redirect even if logout API fails
      router.push('/login')
    }
  }

  const getUserInitials = () => {
    if (!user?.name) return 'U'
    return user.name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleDisplayName = () => {
    if (!user?.role) return 'User'
    switch (user.role) {
      case 'admin':
        return 'Administrator'
      case 'barber':
        return 'Barber'
      default:
        return 'Client'
    }
  }

  const handleNotificationClick = () => {
    if (!showNotifications && notificationButtonRef.current) {
      const buttonRect = notificationButtonRef.current.getBoundingClientRect()
      const dropdownWidth = 320
      const gap = 8
      
      // Calculate position
      let top = buttonRect.bottom + gap
      let left = buttonRect.right - dropdownWidth
      
      // Ensure dropdown stays within viewport
      if (left < 8) {
        left = 8
      }
      
      // If dropdown would go below viewport, show it above the button
      const estimatedHeight = 400
      if (top + estimatedHeight > window.innerHeight - 8) {
        top = buttonRect.top - estimatedHeight - gap
      }
      
      setNotificationDropdownPosition({ top, left })
    }
    setShowNotifications(!showNotifications)
  }

  const handleShareClick = () => {
    if (!showShareMenu && shareButtonRef.current) {
      const buttonRect = shareButtonRef.current.getBoundingClientRect()
      const dropdownWidth = 320
      const gap = 8
      
      let top = buttonRect.bottom + gap
      let left = buttonRect.right - dropdownWidth
      
      if (left < 8) {
        left = 8
      }
      
      const estimatedHeight = 300
      if (top + estimatedHeight > window.innerHeight - 8) {
        top = buttonRect.top - estimatedHeight - gap
      }
      
      setShareDropdownPosition({ top, left })
    }
    setShowShareMenu(!showShareMenu)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could show a toast notification here
  }


  return (
    <header className={`
      sticky top-0 z-40 
      ${colors.background.card} border-b ${colors.border.default}
      backdrop-blur-ios bg-white/90 dark:bg-gray-900/90
      transition-colors duration-200
    `}>
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Toggle */}
          {showMenuToggle && (
            <button
              onClick={onMenuToggle}
              className={`
                p-2 rounded-ios-lg ${colors.background.hover} ${colors.text.secondary}
                hover:${colors.background.secondary} hover:${colors.text.primary}
                transition-colors duration-200 sm:hidden
              `}
            >
              <Bars3Icon className="w-5 h-5" />
            </button>
          )}

          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-sm">
            {breadcrumbs.map((breadcrumb, index) => (
              <div key={`${breadcrumb.href}-${index}`} className="flex items-center space-x-2">
                {index > 0 && (
                  <ChevronRightIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                )}
                {breadcrumb.isLast ? (
                  <span className="font-medium text-gray-900 dark:text-white truncate max-w-xs">
                    {breadcrumb.label}
                  </span>
                ) : (
                  <Link
                    href={breadcrumb.href}
                    className={`
                      ${colors.text.secondary} hover:${colors.text.primary}
                      transition-colors duration-200 truncate max-w-xs
                    `}
                  >
                    {breadcrumb.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Center Section - Search (Desktop) */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Search bookings, clients..."
              className={`
                block w-full pl-10 pr-3 py-2 border ${colors.border.default} rounded-ios-lg
                ${colors.background.primary} ${colors.text.primary}
                placeholder-gray-500 dark:placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                text-sm transition-colors duration-200
              `}
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          {/* Theme Toggle */}
          <SimpleThemeToggle className="hidden sm:block" />

          {/* Share/Booking Links Button - Only show for barbers and admins */}
          {user && (user.role === 'barber' || user.role === 'admin') && (
            <div className="relative" ref={shareMenuRef}>
              <button
                ref={shareButtonRef}
                onClick={handleShareClick}
                className={`
                  relative p-2 rounded-ios-lg ${colors.background.hover} ${colors.text.secondary}
                  hover:${colors.background.secondary} hover:${colors.text.primary}
                  transition-colors duration-200
                  ${showShareMenu ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : ''}
                `}
                title="Booking Links"
              >
                <LinkIcon className="w-5 h-5" />
              </button>

              {/* Share Menu Dropdown */}
              {showShareMenu && (
                <Portal>
                  <div 
                    data-share-menu-portal
                    className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700"
                    style={{ 
                      zIndex: 2147483647,
                      top: `${shareDropdownPosition.top}px`,
                      left: `${shareDropdownPosition.left}px`,
                      width: '320px',
                      maxWidth: 'calc(100vw - 40px)'
                    }}
                  >
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Quick Share Links
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Share your booking page
                      </p>
                    </div>
                    <div className="p-2">
                      {/* Main Booking Link */}
                      <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              Your Booking Page
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {window.location.origin}/book
                            </p>
                          </div>
                          <button
                            onClick={() => copyToClipboard(`${window.location.origin}/book`)}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                            title="Copy link"
                          >
                            <ClipboardDocumentIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                        </div>
                      </div>

                      {/* Popular Short Links */}
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Popular Links
                        </p>
                        <div className="mt-1">
                          <button
                            onClick={() => window.open(`${window.location.origin}/book/summer2025`, '_blank')}
                            className="w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  Summer Special
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  /book/summer2025 • 234 clicks
                                </p>
                              </div>
                              <QrCodeIcon className="w-4 h-4 text-gray-400" />
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Create New Link */}
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <Link
                          href="/marketing/booking-links"
                          onClick={() => setShowShareMenu(false)}
                          className="block w-full p-3 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg transition-colors text-center"
                        >
                          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                            Create Custom Link
                          </span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </Portal>
              )}
            </div>
          )}

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              ref={notificationButtonRef}
              onClick={handleNotificationClick}
              className={`
                relative p-2 rounded-ios-lg ${colors.background.hover} ${colors.text.secondary}
                hover:${colors.background.secondary} hover:${colors.text.primary}
                transition-colors duration-200
              `}
            >
              <BellIcon className="w-5 h-5" />
              {/* Notification badge */}
              <span className="absolute top-1 right-1 w-2 h-2 bg-error-500 rounded-full"></span>
            </button>

            {/* Notification Dropdown with Portal */}
            {showNotifications && (
              <Portal>
                <div 
                  className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700"
                  style={{ 
                    zIndex: 2147483647, // Maximum z-index value
                    top: `${notificationDropdownPosition.top}px`,
                    left: `${notificationDropdownPosition.left}px`,
                    width: '320px',
                    maxWidth: 'calc(100vw - 40px)'
                  }}
                >
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Notifications
                    </h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    <div className="p-4">
                      <div className="flex space-x-3">
                        <div className="flex-shrink-0">
                          <CalendarIcon className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            New booking request
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            John Doe requested a haircut for tomorrow at 2 PM
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 text-center text-gray-500">
                      <p className="text-sm">No more notifications</p>
                    </div>
                  </div>
                </div>
              </Portal>
            )}
          </div>


          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`
                relative flex items-center space-x-3 p-2 rounded-lg 
                bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600
                transition-all duration-200
                hover:scale-105 active:scale-95 cursor-pointer
                ${showUserMenu ? 'ring-2 ring-primary-500 ring-opacity-50' : ''}
              `}
              aria-label="User menu"
              aria-expanded={showUserMenu}
              aria-haspopup="true"
              type="button"
            >
              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow duration-200">
                    <span className="text-sm font-semibold text-white">
                      {getUserInitials()}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {getRoleDisplayName()}
                    </p>
                  </div>
                  {/* Dropdown indicator */}
                  <ChevronRightIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showUserMenu ? 'rotate-90' : ''}`} />
                </div>
              ) : (
                <UserCircleIcon className="w-8 h-8 text-gray-400" />
              )}
            </button>

            {/* User Menu Dropdown - Using Portal for proper rendering */}
            {showUserMenu && user && (
              <Portal>
                <div 
                  data-user-menu-portal
                  className="fixed bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700"
                  style={{ 
                    position: 'fixed',
                    top: '70px',
                    right: '20px',
                    width: '280px',
                    zIndex: 2147483647,
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}
                >
                  {/* User Info */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-white">
                          {getUserInitials()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.name || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user.email}
                        </p>
                        <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                          {getRoleDisplayName()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    {getUserMenuItems(user.role).map((item) => {
                      const Icon = item.icon
                      
                      // Handle Sign Out separately
                      if (item.name === 'Sign Out') {
                        return null
                      }
                      
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`
                            flex items-center px-4 py-2 text-sm ${colors.text.primary}
                            hover:${colors.background.hover} transition-colors duration-200
                          `}
                          onClick={() => setShowUserMenu(false)}
                          {...(item.isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        >
                          <Icon className="w-4 h-4 mr-3" />
                          {item.name}
                        </Link>
                      )
                    })}
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-200 dark:border-gray-700 py-2">
                    {(() => {
                      const signOutItem = getUserMenuItems(user.role).find(item => item.name === 'Sign Out')
                      const SignOutIcon = signOutItem?.icon || UserCircleIcon
                      
                      return (
                        <button
                          onClick={() => {
                            setShowUserMenu(false)
                            handleLogout()
                          }}
                          className={`
                            flex items-center w-full px-4 py-2 text-sm text-error-600 dark:text-error-400
                            hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors duration-200
                          `}
                        >
                          <SignOutIcon className="w-4 h-4 mr-3" />
                          Sign Out
                        </button>
                      )
                    })()}
                  </div>
                </div>
              </Portal>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}