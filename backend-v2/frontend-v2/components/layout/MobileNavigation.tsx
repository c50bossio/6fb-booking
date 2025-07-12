'use client'

import React from 'react'
import { User } from '@/lib/api'

interface MobileNavigationProps {
  isOpen: boolean
  onClose: () => void
  user?: User
  children?: React.ReactNode
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  isOpen,
  onClose,
  user,
  children
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        <div className="p-4">
          <button
            onClick={onClose}
            className="mb-4 text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
          {children}
        </div>
      </div>
    </div>
  )
}