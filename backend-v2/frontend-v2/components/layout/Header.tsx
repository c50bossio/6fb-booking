'use client'

import React from 'react'
import { User } from '@/lib/api'

interface HeaderProps {
  user?: User
  onMenuClick?: () => void
  className?: string
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onMenuClick,
  className = ''
}) => {
  return (
    <header className={`bg-white shadow-sm border-b ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-900 ml-2">
              BookedBarber
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {user && (
              <div className="text-sm text-gray-700">
                Welcome, {user.first_name || user.name}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}