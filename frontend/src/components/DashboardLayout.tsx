'use client'

import { ReactNode, useState, useEffect } from 'react'
import ModernSidebar from './ModernSidebar'
import {
  BellIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

interface DashboardLayoutProps {
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
}

export default function DashboardLayout({
  children,
  title = 'Dashboard',
  subtitle,
  actions,
  user,
  onLogout,
  breadcrumbs,
  className = ''
}: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300" />
          <div className="fixed inset-y-0 left-0 z-50 w-72 mobile-sidebar transform transition-transform duration-300 ease-in-out">
            <ModernSidebar user={user} onLogout={onLogout} />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-72">
        <ModernSidebar user={user} onLogout={onLogout} />
      </div>

      {/* Main Content */}
      <div className="lg:ml-72 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 transition-all duration-300">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Left Section */}
              <div className="flex items-center space-x-4">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors mobile-menu-button"
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
                          <ChevronRightIcon className="h-4 w-4 text-gray-500 mx-2" />
                        )}
                        {breadcrumb.href ? (
                          <a
                            href={breadcrumb.href}
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            {breadcrumb.label}
                          </a>
                        ) : (
                          <span className="text-white font-medium">
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
                    <h1 className="text-xl font-semibold text-white">{title}</h1>
                    {subtitle && (
                      <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Center Section - Search */}
              <div className="flex-1 max-w-md mx-4 hidden md:block">
                <div className={`relative transition-all duration-300 ${
                  isSearchFocused ? 'scale-105' : ''
                }`}>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className={`h-5 w-5 transition-colors duration-200 ${
                      isSearchFocused ? 'text-violet-400' : 'text-gray-400'
                    }`} />
                  </div>
                  <input
                    type="text"
                    placeholder="Search appointments, barbers, clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    className={`block w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 transition-all duration-200 ${
                      isSearchFocused
                        ? 'bg-white/10 border-violet-500/50 ring-2 ring-violet-500/20'
                        : 'hover:bg-white/10 hover:border-white/20'
                    }`}
                  />
                </div>
              </div>

              {/* Right Section */}
              <div className="flex items-center space-x-3">
                {/* Search Button (Mobile) */}
                <button className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                  <MagnifyingGlassIcon className="h-5 w-5" />
                </button>

                {/* Notifications */}
                <button className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors group">
                  <BellIcon className="h-5 w-5" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-violet-500 rounded-full ring-2 ring-slate-900 animate-pulse"></div>
                  <span className="sr-only">View notifications</span>
                </button>

                {/* Custom Actions */}
                {actions && (
                  <div className="flex items-center space-x-2">
                    {actions}
                  </div>
                )}

                {/* User Avatar (Mobile) */}
                {user && (
                  <div className="lg:hidden">
                    <div className="user-avatar text-xs">
                      {user.first_name?.charAt(0) || ''}{user.last_name?.charAt(0) || ''}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Header (Mobile) */}
        <div className="sm:hidden px-4 py-4 border-b border-white/10">
          <h1 className="text-lg font-semibold text-white">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
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
      {searchQuery && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl mx-4">
            <div className="glass-card-dark p-6 rounded-xl shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Search Results for "{searchQuery}"
                </h3>
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-gray-300 text-sm">
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
