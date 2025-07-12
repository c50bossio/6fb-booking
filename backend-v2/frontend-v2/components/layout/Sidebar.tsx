'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type User } from '@/lib/api'
import { navigationItems } from '@/lib/navigation'

interface SidebarProps {
  user: User | null
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ user, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <div className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              BookedBarber
            </h1>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <span className="sr-only">Toggle sidebar</span>
            {collapsed ? '→' : '←'}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const active = isActive(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <span className={`${collapsed ? 'text-center w-full' : ''}`}>
                {collapsed ? item.name.charAt(0) : item.name}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      {user && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className={`${collapsed ? 'text-center' : 'flex items-center'}`}>
            {!collapsed && (
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user.first_name || user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user.role}
                </p>
              </div>
            )}
            {collapsed && (
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {(user.first_name || user.name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}