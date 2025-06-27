'use client'

import React, { ReactNode, useState, useEffect, useCallback } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import DemoModernSidebar from '../DemoModernSidebar'
import {
  BellIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

export interface DashboardLayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
  actions?: ReactNode
  user?: {
    first_name: string
    last_name: string
    email: string
    role: string
  }
  onLogout?: () => void
  breadcrumbs?: Array<{
    label: string
    href?: string
  }>
  className?: string
  /**
   * Whether to show the header search bar
   */
  showSearch?: boolean
  /**
   * Whether to show notifications in header
   */
  showNotifications?: boolean
  /**
   * Custom search placeholder text
   */
  searchPlaceholder?: string
  /**
   * Search handler function
   */
  onSearch?: (query: string) => void
  /**
   * Notification handler function
   */
  onNotificationClick?: () => void
}

/**
 * Enhanced DashboardLayout component that wraps the existing DemoModernSidebar
 * with improved responsive design and theme integration
 */
export default function DashboardLayout({
  children,
  title = 'Dashboard',
  subtitle,
  actions,
  user,
  onLogout,
  breadcrumbs,
  className = '',
  showSearch = true,
  showNotifications = true,
  searchPlaceholder = 'Search appointments, barbers, clients...',
  onSearch,
  onNotificationClick
}: DashboardLayoutProps) {
  const { theme } = useTheme()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mounted, setMounted] = useState(false)

  // Handle mounting state for SSR compatibility
  useEffect(() => {
    setMounted(true)
  }, [])

  // Close mobile menu when screen size changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (isMobileMenuOpen && !target.closest('.mobile-sidebar') && !target.closest('.mobile-menu-button')) {
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMobileMenuOpen])

  // Handle search input changes
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    if (onSearch) {
      onSearch(query)
    }
  }, [onSearch])

  // Handle search clear
  const handleSearchClear = useCallback(() => {
    setSearchQuery('')
    if (onSearch) {
      onSearch('')
    }
  }, [onSearch])

  // Handle notification click
  const handleNotificationClick = useCallback(() => {
    if (onNotificationClick) {
      onNotificationClick()
    }
  }, [onNotificationClick])

  // Get theme-specific styles
  const getThemeStyles = () => {
    switch (theme) {
      case 'dark':
        return {
          background: 'min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800',
          header: 'bg-slate-900/95 backdrop-blur-xl border-b border-white/10',
          mobileHeader: 'border-b border-white/10',
          searchBg: 'bg-white/5 border-white/10',
          searchFocused: 'bg-white/10 border-violet-500/50 ring-2 ring-violet-500/20',
          searchHover: 'hover:bg-white/10 hover:border-white/20',
          text: {
            primary: 'text-white',
            secondary: 'text-gray-400',
            tertiary: 'text-gray-300'
          }
        }
      case 'light':
        return {
          background: 'min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100',
          header: 'bg-white/95 backdrop-blur-xl border-b border-gray-200',
          mobileHeader: 'border-b border-gray-200',
          searchBg: 'bg-gray-50 border-gray-200',
          searchFocused: 'bg-white border-teal-500/50 ring-2 ring-teal-500/20',
          searchHover: 'hover:bg-gray-100 hover:border-gray-300',
          text: {
            primary: 'text-gray-900',
            secondary: 'text-gray-600',
            tertiary: 'text-gray-700'
          }
        }
      case 'soft-light':
        return {
          background: 'min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-stone-100',
          header: 'bg-stone-50/95 backdrop-blur-xl border-b border-stone-200',
          mobileHeader: 'border-b border-stone-200',
          searchBg: 'bg-stone-100 border-stone-200',
          searchFocused: 'bg-white border-amber-500/50 ring-2 ring-amber-500/20',
          searchHover: 'hover:bg-stone-200 hover:border-stone-300',
          text: {
            primary: 'text-stone-900',
            secondary: 'text-stone-600',
            tertiary: 'text-stone-700'
          }
        }
      case 'charcoal':
        return {
          background: 'min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900',
          header: 'bg-gray-900/95 backdrop-blur-xl border-b border-gray-700',
          mobileHeader: 'border-b border-gray-700',
          searchBg: 'bg-gray-800 border-gray-700',
          searchFocused: 'bg-gray-700 border-gray-500/50 ring-2 ring-gray-500/20',
          searchHover: 'hover:bg-gray-700 hover:border-gray-600',
          text: {
            primary: 'text-white',
            secondary: 'text-gray-400',
            tertiary: 'text-gray-300'
          }
        }
      default:
        return {
          background: 'min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100',
          header: 'bg-white/95 backdrop-blur-xl border-b border-gray-200',
          mobileHeader: 'border-b border-gray-200',
          searchBg: 'bg-gray-50 border-gray-200',
          searchFocused: 'bg-white border-teal-500/50 ring-2 ring-teal-500/20',
          searchHover: 'hover:bg-gray-100 hover:border-gray-300',
          text: {
            primary: 'text-gray-900',
            secondary: 'text-gray-600',
            tertiary: 'text-gray-700'
          }
        }
    }
  }

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  const styles = getThemeStyles()

  return (
    <div className={styles.background}>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300" />
          <div className="fixed inset-y-0 left-0 z-50 w-72 mobile-sidebar transform transition-transform duration-300 ease-in-out">
            <DemoModernSidebar user={user} onLogout={onLogout} />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-72">
        <DemoModernSidebar user={user} onLogout={onLogout} />
      </div>

      {/* Main Content */}
      <div className="lg:ml-72 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className={`sticky top-0 z-30 ${styles.header} transition-all duration-300`}>
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Left Section */}
              <div className="flex items-center space-x-4">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className={`lg:hidden p-2 rounded-lg ${styles.text.secondary} hover:${styles.text.primary} hover:bg-black/5 transition-colors mobile-menu-button`}
                  aria-label="Open sidebar"
                >
                  {isMobileMenuOpen ? (
                    <XMarkIcon className="h-6 w-6" />
                  ) : (
                    <Bars3Icon className="h-6 w-6" />
                  )}
                </button>

                {/* Breadcrumbs */}
                {breadcrumbs && breadcrumbs.length > 0 && (
                  <nav className="hidden sm:flex items-center space-x-2 text-sm">
                    {breadcrumbs.map((breadcrumb, index) => (
                      <div key={index} className="flex items-center">
                        {index > 0 && (
                          <ChevronRightIcon className={`h-4 w-4 ${styles.text.secondary} mx-2`} />
                        )}
                        {breadcrumb.href ? (
                          <a
                            href={breadcrumb.href}
                            className={`${styles.text.secondary} hover:${styles.text.primary} transition-colors`}
                          >
                            {breadcrumb.label}
                          </a>
                        ) : (
                          <span className={`${styles.text.primary} font-medium`}>
                            {breadcrumb.label}
                          </span>
                        )}
                      </div>
                    ))}
                  </nav>
                )}

                {/* Page Title (when no breadcrumbs) */}
                {(!breadcrumbs || breadcrumbs.length === 0) && (
                  <div className="hidden sm:block">
                    <h1 className={`text-xl font-semibold ${styles.text.primary}`}>{title}</h1>
                    {subtitle && (
                      <p className={`text-sm ${styles.text.secondary} mt-1`}>{subtitle}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Center Section - Search */}
              {showSearch && (
                <div className="flex-1 max-w-md mx-4 hidden md:block">
                  <div className={`relative transition-all duration-300 ${
                    isSearchFocused ? 'scale-105' : ''
                  }`}>
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className={`h-5 w-5 transition-colors duration-200 ${
                        isSearchFocused ? 'text-teal-400' : styles.text.secondary
                      }`} />
                    </div>
                    <input
                      type="text"
                      placeholder={searchPlaceholder}
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setIsSearchFocused(false)}
                      className={`block w-full pl-10 pr-4 py-2 ${styles.searchBg} border rounded-lg ${styles.text.primary} placeholder-${styles.text.secondary} transition-all duration-200 ${
                        isSearchFocused
                          ? styles.searchFocused
                          : styles.searchHover
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Right Section */}
              <div className="flex items-center space-x-3">
                {/* Search Button (Mobile) */}
                {showSearch && (
                  <button className={`md:hidden p-2 rounded-lg ${styles.text.secondary} hover:${styles.text.primary} hover:bg-black/5 transition-colors`}>
                    <MagnifyingGlassIcon className="h-5 w-5" />
                  </button>
                )}

                {/* Notifications */}
                {showNotifications && (
                  <button
                    onClick={handleNotificationClick}
                    className={`relative p-2 rounded-lg ${styles.text.secondary} hover:${styles.text.primary} hover:bg-black/5 transition-colors group`}
                  >
                    <BellIcon className="h-5 w-5" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 rounded-full ring-2 ring-current animate-pulse"></div>
                    <span className="sr-only">View notifications</span>
                  </button>
                )}

                {/* Custom Actions */}
                {actions && (
                  <div className="flex items-center space-x-2">
                    {actions}
                  </div>
                )}

                {/* User Avatar (Mobile) */}
                {user && (
                  <div className="lg:hidden">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      theme === 'dark' ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-700'
                    }`}>
                      {user.first_name?.charAt(0) || ''}{user.last_name?.charAt(0) || ''}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Header (Mobile) */}
        <div className={`sm:hidden px-4 py-4 ${styles.mobileHeader}`}>
          <h1 className={`text-lg font-semibold ${styles.text.primary}`}>{title}</h1>
          {subtitle && (
            <p className={`text-sm ${styles.text.secondary} mt-1`}>{subtitle}</p>
          )}
        </div>

        {/* Main Content Area */}
        <main className={`flex-1 transition-all duration-300 ${className}`}>
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Search Results Overlay (when search is active) */}
      {showSearch && searchQuery && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl mx-4">
            <div className={`p-6 rounded-xl shadow-2xl ${
              theme === 'dark' ? 'bg-slate-800 border border-white/10' : 'bg-white border border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${styles.text.primary}`}>
                  Search Results for "{searchQuery}"
                </h3>
                <button
                  onClick={handleSearchClear}
                  className={`p-2 rounded-lg ${styles.text.secondary} hover:${styles.text.primary} hover:bg-black/5 transition-colors`}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${
                  theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'
                }`}>
                  <p className={`${styles.text.secondary} text-sm`}>
                    Search functionality coming soon...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
