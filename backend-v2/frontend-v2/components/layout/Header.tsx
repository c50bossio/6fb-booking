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
  CalendarIcon
} from '@heroicons/react/24/outline'
import { type User, logout } from '@/lib/api'
import { useThemeStyles } from '@/hooks/useTheme'
import { SimpleThemeToggle } from '@/components/ThemeToggle'
import { navigation, getUserMenuItems } from '@/lib/navigation'
import { Logo } from '@/components/ui/Logo'

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
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { colors, isDark } = useThemeStyles()

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
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
          {/* Logo */}
          <Logo size="sm" className="hidden sm:block" />
          
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

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
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

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className={`
                absolute right-0 mt-2 w-80 ${colors.background.card} rounded-ios-xl shadow-ios-xl
                border ${colors.border.default} z-50
                animate-ios-slide-down
              `}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Notifications
                  </h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {/* Sample notifications */}
                  <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200">
                    <div className="flex space-x-3">
                      <div className="flex-shrink-0">
                        <CalendarIcon className="w-5 h-5 text-primary-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          New booking request
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          John Doe requested a haircut for tomorrow at 2 PM
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          5 minutes ago
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    <p className="text-sm">No more notifications</p>
                  </div>
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <Link
                    href="/notifications"
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                    onClick={() => setShowNotifications(false)}
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`
                flex items-center space-x-3 p-2 rounded-ios-lg ${colors.background.hover}
                hover:${colors.background.secondary} transition-colors duration-200
              `}
            >
              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
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
                </div>
              ) : (
                <UserCircleIcon className="w-8 h-8 text-gray-400" />
              )}
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && user && (
              <div className={`
                absolute right-0 mt-2 w-56 ${colors.background.card} rounded-ios-xl shadow-ios-xl
                border ${colors.border.default} z-50
                animate-ios-slide-down
              `}>
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
            )}
          </div>
        </div>
      </div>
    </header>
  )
}